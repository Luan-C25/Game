// Tax set-aside summary and CSV exports for the user's accountant (paid features).

import type { Env } from "./env.ts";
import { HttpError, json } from "./http.ts";
import { session, requirePaid } from "./api.ts";
import * as db from "./db.ts";
import { setAsideFor, gstShareOfPayment, financialYear } from "../shared/tax.ts";
import { toCsv } from "../shared/csv.ts";
import { centsToInput, formatQuantity } from "../shared/money.ts";
import { shiftHours, shiftToLines } from "../shared/shifts.ts";
import { computeTotals } from "../shared/invoice.ts";
import { todayIn } from "../shared/dates.ts";

/** "2026-27" -> ["2026-07-01", "2027-06-30"] */
export function fyRange(fy: string): [string, string] {
  const start = Number(fy.slice(0, 4));
  return [`${start}-07-01`, `${start + 1}-06-30`];
}

function pickFy(request: Request, today: string): string {
  const fy = new URL(request.url).searchParams.get("fy") ?? "";
  if (/^\d{4}-\d{2}$/.test(fy) && (Number(fy.slice(0, 4)) + 1) % 100 === Number(fy.slice(5))) return fy;
  if (fy) throw new HttpError(400, "bad_fy", "Unknown financial year.");
  return financialYear(today);
}

/** GET /api/money?fy=2026-27 */
export async function moneySummary(request: Request, env: Env): Promise<Response> {
  const { user, paid } = await session(request, env);
  requirePaid(paid, "The tax set-aside tracker");
  const settings = await db.readSettings(env, user);
  const fy = pickFy(request, todayIn(settings.timeZone));
  const [from, to] = fyRange(fy);
  const invoices = await db.listInvoices(env, user.id, 2000);
  const paidInFy = invoices.filter((i) => i.status === "paid" && i.paidAt && i.paidAt >= from && i.paidAt <= to);
  let received = 0, gst = 0, incomeTax = 0;
  const rows = paidInFy.map((i) => {
    const g = gstShareOfPayment(i.paidCents ?? 0, i.totalCents, i.gstCents);
    const a = setAsideFor(i.paidCents ?? 0, g, settings.taxPercent);
    received += i.paidCents ?? 0;
    gst += a.gstCents;
    incomeTax += a.incomeTaxCents;
    return { id: i.id, number: i.number, billToLabel: i.billToLabel, paidAt: i.paidAt, paidCents: i.paidCents, setAsideCents: a.totalCents };
  });
  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "draft").reduce((s, i) => s + i.totalCents, 0);
  return json({
    fy,
    percent: settings.taxPercent,
    gstRegistered: settings.provider.gstRegistered,
    receivedCents: received,
    gstCents: gst,
    incomeTaxCents: incomeTax,
    setAsideCents: gst + incomeTax,
    keepCents: received - gst - incomeTax,
    outstandingCents: outstanding,
    invoices: rows,
  });
}

function csvResponse(name: string, body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/** GET /api/export/invoices.csv?fy= */
export async function exportInvoices(request: Request, env: Env): Promise<Response> {
  const { user, paid } = await session(request, env);
  requirePaid(paid, "CSV export");
  const settings = await db.readSettings(env, user);
  const fy = pickFy(request, todayIn(settings.timeZone));
  const [from, to] = fyRange(fy);
  const invoices = (await db.listInvoices(env, user.id, 2000)).filter((i) => i.issueDate >= from && i.issueDate <= to).reverse();
  const rows = invoices.map((i) => {
    const g = i.paidCents ? gstShareOfPayment(i.paidCents, i.totalCents, i.gstCents) : 0;
    const aside = i.paidCents ? setAsideFor(i.paidCents, g, settings.taxPercent).totalCents : 0;
    return [i.number, i.issueDate, i.dueDate, i.status, i.billToLabel, centsToInput(i.subtotalCents), centsToInput(i.gstCents), centsToInput(i.totalCents), i.paidAt ?? "", i.paidCents !== null ? centsToInput(i.paidCents) : "", i.paidCents ? centsToInput(aside) : ""];
  });
  const csv = toCsv(["Invoice number", "Invoice date", "Due date", "Status", "Participant or customer", "Subtotal", "GST", "Total", "Date paid", "Amount paid", "Set-aside estimate"], rows);
  return csvResponse(`shiftbill-invoices-${fy}.csv`, csv);
}

/** GET /api/export/shifts.csv?fy= */
export async function exportShifts(request: Request, env: Env): Promise<Response> {
  const { user, paid } = await session(request, env);
  requirePaid(paid, "CSV export");
  const settings = await db.readSettings(env, user);
  const fy = pickFy(request, todayIn(settings.timeZone));
  const [from, to] = fyRange(fy);
  const [shifts, participants, invoices] = await Promise.all([db.listShifts(env, user.id, { limit: 1000 }), db.listParticipants(env, user.id), db.listInvoices(env, user.id, 2000)]);
  const names = new Map(participants.map((p) => [p.id, p.name]));
  const numbers = new Map(invoices.map((i) => [i.id, i.number]));
  const rows = shifts
    .filter((s) => s.date >= from && s.date <= to)
    .reverse()
    .map((s) => {
      const total = computeTotals({ provider: settings.provider, lines: shiftToLines(s) }).subtotalCents;
      return [s.date, s.start, s.end, s.breakMinutes, formatQuantity(shiftHours(s)), names.get(s.participantId) ?? "", s.itemNumber, s.description, centsToInput(s.rateCents), formatQuantity(s.km), centsToInput(s.kmRateCents), centsToInput(total), s.invoiceId ? (numbers.get(s.invoiceId) ?? "") : ""];
    });
  const csv = toCsv(["Date", "Start", "End", "Break (min)", "Hours", "Participant", "Support item", "Description", "Hourly rate", "Km", "Rate per km", "Amount (ex GST)", "Invoice number"], rows);
  return csvResponse(`shiftbill-shifts-${fy}.csv`, csv);
}
