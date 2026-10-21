import type { Env } from "./env.ts";
import { HttpError, json, readJson, assertSameOrigin } from "./http.ts";
import { rateLimit } from "./ratelimit.ts";
import { requireUser } from "./auth.ts";
import * as db from "./db.ts";
import { buildInvoice, cleanLines, formatInvoiceNumber } from "./invoicing.ts";
import { sanitiseSettings, type UserSettings } from "../shared/settings.ts";
import { computeTotals, validateInvoice, type InvoiceInput, type PlanType } from "../shared/invoice.ts";
import { cleanText, isIsoDate, isTime, isValidAbn, isValidEmail, normaliseDigits } from "../shared/validate.ts";
import { FREE_LIMITS, FAIR_USE } from "../shared/config.ts";
import { addDays, daysBetween, todayIn } from "../shared/dates.ts";
import { setAsideFor, gstShareOfPayment } from "../shared/tax.ts";

type Params = Record<string, string>;

/** Signed-in user plus their entitlements, loaded once per request. */
export async function session(request: Request, env: Env) {
  const user = await requireUser(request, env);
  await rateLimit(env.RL_API, `api:${user.id}`);
  const sub = await db.getSubscription(env, user.id);
  return { user, sub, paid: db.isPaid(sub) };
}

type Kind = keyof typeof FREE_LIMITS;

async function assertCanAdd(env: Env, userId: string, paid: boolean, kind: Kind): Promise<void> {
  const c = await db.counts(env, userId);
  if (!paid && c[kind] >= FREE_LIMITS[kind]) {
    throw new HttpError(402, "upgrade_required", `Free accounts can save up to ${FREE_LIMITS[kind]} ${kind}. Upgrade to add more.`);
  }
  if (paid && c[kind] >= FAIR_USE[kind]) throw new HttpError(403, "fair_use", `You have reached the fair-use limit of ${FAIR_USE[kind]} ${kind}. Contact us and we will raise it.`);
}

function requirePaid(paid: boolean, feature: string): void {
  if (!paid) throw new HttpError(402, "upgrade_required", `${feature} is part of the paid plan.`);
}

const toCents = (v: unknown) => Math.max(0, Math.min(10_000_000, Math.round(Number(v) || 0)));

// ------------------------------------------------------------------ me and settings

export async function getMe(request: Request, env: Env): Promise<Response> {
  const { user, sub, paid } = await session(request, env);
  const [settings, counts] = await Promise.all([db.readSettings(env, user), db.counts(env, user.id)]);
  return json({
    email: user.email,
    settings,
    paid,
    subscription: sub ? { status: sub.status, currentPeriodEnd: sub.current_period_end, cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end), priceId: sub.price_id } : null,
    counts,
    limits: paid ? FAIR_USE : FREE_LIMITS,
    nextInvoiceNumber: formatInvoiceNumber(settings.invoicePrefix, user.next_invoice_seq),
    today: todayIn(settings.timeZone),
    features: { email: env.EMAIL_PROVIDER === "resend" && Boolean(env.RESEND_API_KEY), abnLookup: Boolean(env.ABR_GUID), billing: Boolean(env.STRIPE_SECRET_KEY) },
  });
}

export async function putSettings(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const { user } = await session(request, env);
  const { settings, errors } = sanitiseSettings(await readJson(request));
  if (Object.keys(errors).length) return json({ error: { code: "invalid", message: "Check the highlighted fields.", fields: errors } }, 400);
  await db.writeSettings(env, user.id, settings);
  return json({ ok: true, settings });
}

// ------------------------------------------------------------------ participants

function parseParticipant(body: Record<string, unknown>): Omit<db.Participant, "id"> {
  const planType = (["self", "plan", "ndia"].includes(String(body.planType)) ? body.planType : "plan") as PlanType;
  const p = {
    name: cleanText(body.name, 120),
    ndisNumber: normaliseDigits(cleanText(body.ndisNumber, 20)),
    planType,
    billToName: cleanText(body.billToName, 120),
    billToEmail: cleanText(body.billToEmail, 254).toLowerCase(),
    billToAbn: cleanText(body.billToAbn, 20),
    itemNumber: cleanText(body.itemNumber, 30),
    description: cleanText(body.description, 200),
    rateCents: toCents(body.rateCents),
    kmItemNumber: cleanText(body.kmItemNumber, 30),
    kmRateCents: toCents(body.kmRateCents),
  };
  const fields: Record<string, string> = {};
  if (!p.name) fields.name = "Add the participant's name.";
  if (p.billToEmail && !isValidEmail(p.billToEmail)) fields.billToEmail = "Check this email address.";
  if (p.billToAbn && !isValidAbn(p.billToAbn)) fields.billToAbn = "That ABN does not pass the ATO check digit test.";
  if (Object.keys(fields).length) throw Object.assign(new HttpError(400, "invalid", "Check the highlighted fields."), { fields });
  return p;
}

export async function listParticipants(request: Request, env: Env): Promise<Response> {
  const { user } = await session(request, env);
  return json({ participants: await db.listParticipants(env, user.id) });
}

export async function createParticipant(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const { user, paid } = await session(request, env);
  const p = parseParticipant(await readJson(request));
  await assertCanAdd(env, user.id, paid, "participants");
  const id = await db.saveParticipant(env, user.id, p);
  return json({ id }, 201);
}

export async function updateParticipant(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  assertSameOrigin(request);
  const { user } = await session(request, env);
  await db.saveParticipant(env, user.id, { ...parseParticipant(await readJson(request)), id: params.id! });
  return json({ id: params.id });
}

export async function deleteParticipant(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  assertSameOrigin(request);
  const { user } = await session(request, env);
  await db.archiveParticipant(env, user.id, params.id!);
  return json({ ok: true });
}

// ------------------------------------------------------------------ shifts

function parseShift(body: Record<string, unknown>): Omit<db.ShiftRecord, "id" | "invoiceId"> {
  const s = {
    participantId: cleanText(body.participantId, 64),
    date: String(body.date ?? ""),
    start: String(body.start ?? ""),
    end: String(body.end ?? ""),
    breakMinutes: Math.max(0, Math.min(720, Math.round(Number(body.breakMinutes) || 0))),
    itemNumber: cleanText(body.itemNumber, 30),
    description: cleanText(body.description, 200),
    rateCents: toCents(body.rateCents),
    km: Math.max(0, Math.min(500_000, Math.round(Number(body.km) || 0))),
    kmRateCents: toCents(body.kmRateCents),
    kmItemNumber: cleanText(body.kmItemNumber, 30),
  };
  const fields: Record<string, string> = {};
  if (!s.participantId) fields.participantId = "Choose a participant.";
  if (!isIsoDate(s.date)) fields.date = "Add the date.";
  if (!isTime(s.start)) fields.start = "Add a start time.";
  if (!isTime(s.end)) fields.end = "Add an end time.";
  if (!s.rateCents) fields.rateCents = "Add the hourly rate.";
  if (Object.keys(fields).length) throw Object.assign(new HttpError(400, "invalid", "Check the highlighted fields."), { fields });
  return s;
}

export async function listShifts(request: Request, env: Env): Promise<Response> {
  const { user } = await session(request, env);
  const uninvoiced = new URL(request.url).searchParams.get("uninvoiced") === "1";
  return json({ shifts: await db.listShifts(env, user.id, { uninvoicedOnly: uninvoiced, limit: 300 }) });
}

export async function createShift(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const { user, paid } = await session(request, env);
  const s = parseShift(await readJson(request));
  await assertCanAdd(env, user.id, paid, "shifts");
  return json({ id: await db.saveShift(env, user.id, s) }, 201);
}

export async function updateShift(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  assertSameOrigin(request);
  const { user } = await session(request, env);
  return json({ id: await db.saveShift(env, user.id, { ...parseShift(await readJson(request)), id: params.id! }) });
}

export async function deleteShift(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  assertSameOrigin(request);
  const { user } = await session(request, env);
  await db.deleteShift(env, user.id, params.id!);
  return json({ ok: true });
}

// ------------------------------------------------------------------ invoices

export async function listInvoices(request: Request, env: Env): Promise<Response> {
  const { user } = await session(request, env);
  return json({ invoices: await db.listInvoices(env, user.id) });
}

export async function getInvoice(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  const { user, paid } = await session(request, env);
  const inv = await db.getInvoice(env, user.id, params.id!);
  if (!inv) throw new HttpError(404, "not_found", "Invoice not found.");
  return json({ ...inv, footerCredit: !paid });
}

async function nextNumber(env: Env, userId: string, settings: UserSettings): Promise<string> {
  // Skip any number the user already used by hand.
  for (let i = 0; i < 20; i++) {
    const n = formatInvoiceNumber(settings.invoicePrefix, await db.takeInvoiceSeq(env, userId));
    if (!(await db.invoiceNumberTaken(env, userId, n))) return n;
  }
  throw new HttpError(409, "numbering", "Could not find a free invoice number. Check your invoice prefix in Settings.");
}

async function saveNewInvoice(env: Env, userId: string, participantId: string | null, input: InvoiceInput, shiftIds: string[]): Promise<Response> {
  const result = validateInvoice(input);
  if (result.errors.length) {
    return json({ error: { code: "invalid_invoice", message: "This invoice is missing something.", issues: result.errors }, warnings: result.warnings }, 400);
  }
  const totals = computeTotals(input);
  const id = await db.createInvoice(env, userId, { participantId, input, totals, shiftIds });
  return json({ id, number: input.number, warnings: result.warnings }, 201);
}

/** POST /api/invoices: { participantId, shiftIds[], extraLines[], issueDate?, notes? } */
export async function createInvoice(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const { user, paid } = await session(request, env);
  const body = await readJson(request, 128 * 1024);
  const settings = await db.readSettings(env, user);
  const participant = await db.getParticipant(env, user.id, cleanText(body.participantId, 64));
  if (!participant) throw new HttpError(404, "not_found", "Choose a participant.");
  const shiftIds = Array.isArray(body.shiftIds) ? [...new Set(body.shiftIds.map(String))].slice(0, 100) : [];
  const shifts = await db.getShiftsByIds(env, user.id, shiftIds);
  if (shifts.length !== shiftIds.length) throw new HttpError(404, "not_found", "Some of those shifts no longer exist.");
  if (shifts.some((s) => s.invoiceId)) throw new HttpError(409, "already_invoiced", "Some of those shifts are already on an invoice.");
  if (shifts.some((s) => s.participantId !== participant.id)) throw new HttpError(400, "mixed", "All shifts on an invoice must be for the same participant.");
  const extraLines = cleanLines(body.extraLines);
  if (shifts.length === 0 && extraLines.length === 0) throw new HttpError(400, "empty", "Choose at least one shift or add a line.");
  await assertCanAdd(env, user.id, paid, "invoices");

  const issueDate = isIsoDate(String(body.issueDate)) ? String(body.issueDate) : todayIn(settings.timeZone);
  const input = buildInvoice({
    settings,
    participant,
    shifts,
    extraLines,
    number: await nextNumber(env, user.id, settings),
    issueDate,
    notes: typeof body.notes === "string" ? cleanText(body.notes, 600) : undefined,
  });
  return saveNewInvoice(env, user.id, participant.id, input, shifts.map((s) => s.id));
}

/** POST /api/invoices/:id/repeat: same lines, moved forward to start from today. */
export async function repeatInvoice(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  assertSameOrigin(request);
  const { user, paid } = await session(request, env);
  const original = await db.getInvoice(env, user.id, params.id!);
  if (!original) throw new HttpError(404, "not_found", "Invoice not found.");
  await assertCanAdd(env, user.id, paid, "invoices");
  const settings = await db.readSettings(env, user);
  const today = todayIn(settings.timeZone);
  const shift = daysBetween(original.input.issueDate, today);
  const input: InvoiceInput = {
    ...original.input,
    provider: settings.provider,
    payment: settings.payment,
    number: await nextNumber(env, user.id, settings),
    issueDate: today,
    dueDate: addDays(today, settings.termsDays),
    lines: original.input.lines.map((l) => ({ ...l, date: addDays(l.date, shift) })),
  };
  return saveNewInvoice(env, user.id, original.summary.participantId, input, []);
}

/** POST /api/invoices/:id/status: { status, paidCents?, paidAt? } */
export async function setInvoiceStatus(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  assertSameOrigin(request);
  const { user } = await session(request, env);
  const body = await readJson(request);
  const status = String(body.status);
  if (!["draft", "sent", "paid", "void"].includes(status)) throw new HttpError(400, "bad_status", "Unknown status.");
  const inv = await db.getInvoice(env, user.id, params.id!);
  if (!inv) throw new HttpError(404, "not_found", "Invoice not found.");
  if (status !== "paid") {
    await db.updateInvoiceStatus(env, user.id, inv.summary.id, { status: status as db.InvoiceStatus });
    return json({ ok: true });
  }
  const settings = await db.readSettings(env, user);
  const paidCents = body.paidCents === undefined ? inv.summary.totalCents : toCents(body.paidCents);
  const paidAt = isIsoDate(String(body.paidAt)) ? String(body.paidAt) : todayIn(settings.timeZone);
  const gst = gstShareOfPayment(paidCents, inv.summary.totalCents, inv.summary.gstCents);
  const aside = setAsideFor(paidCents, gst, settings.taxPercent);
  await db.updateInvoiceStatus(env, user.id, inv.summary.id, { status: "paid", paidAt, paidCents, setAsideCents: aside.totalCents });
  return json({ ok: true, setAside: aside });
}

export async function deleteInvoice(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  assertSameOrigin(request);
  const { user } = await session(request, env);
  await db.deleteInvoice(env, user.id, params.id!);
  return json({ ok: true });
}

// ------------------------------------------------------------------ ABN lookup (paid)

/** GET /api/abn/:abn: business name from the ABN Lookup web services, when a GUID is configured. */
export async function abnLookup(request: Request, env: Env, _ctx: ExecutionContext, params: Params): Promise<Response> {
  const { paid } = await session(request, env);
  requirePaid(paid, "ABN lookup");
  const abn = normaliseDigits(params.abn ?? "");
  if (!isValidAbn(abn)) throw new HttpError(400, "bad_abn", "That ABN does not pass the ATO check digit test.");
  if (!env.ABR_GUID) return json({ abn, available: false });
  const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${encodeURIComponent(env.ABR_GUID)}&callback=cb`;
  const res = await fetch(url, { cf: { cacheTtl: 86_400 } } as RequestInit);
  if (!res.ok) throw new HttpError(502, "abr_unavailable", "ABN Lookup is not responding. Try again later.");
  // The ABR returns JSONP: cb({...}).
  const text = await res.text();
  const data = JSON.parse(text.replace(/^[^(]*\(/, "").replace(/\)\s*;?\s*$/, "")) as Record<string, unknown>;
  const businessName = Array.isArray(data.BusinessName) && data.BusinessName.length ? String(data.BusinessName[0]) : "";
  return json({
    abn,
    available: true,
    entityName: cleanText(data.EntityName, 200),
    businessName: cleanText(businessName, 200),
    status: cleanText(data.AbnStatus, 40),
    gstRegistered: Boolean(data.Gst),
    message: cleanText(data.Message, 200),
  });
}

export { requirePaid };
