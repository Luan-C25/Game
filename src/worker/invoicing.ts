import type { InvoiceInput, InvoiceLine, Unit } from "../shared/invoice.ts";
import type { UserSettings } from "../shared/settings.ts";
import { shiftsToLines } from "../shared/shifts.ts";
import { addDays } from "../shared/dates.ts";
import { cleanText, isIsoDate, formatAbn } from "../shared/validate.ts";
import type { Participant, ShiftRecord } from "./db.ts";

export function formatInvoiceNumber(prefix: string, seq: number): string {
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/** Turn untrusted extra lines from the client into clean invoice lines. */
export function cleanLines(raw: unknown, max = 50): InvoiceLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((r) => {
    const l = (typeof r === "object" && r ? r : {}) as Record<string, unknown>;
    const unit: Unit = l.unit === "km" || l.unit === "each" ? l.unit : "hour";
    return {
      date: isIsoDate(String(l.date)) ? String(l.date) : "",
      itemNumber: cleanText(l.itemNumber, 30),
      description: cleanText(l.description, 200),
      quantity: Math.max(0, Math.min(1_000_000, Math.round(Number(l.quantity) || 0))),
      unit,
      rateCents: Math.max(0, Math.min(10_000_000, Math.round(Number(l.rateCents) || 0))),
      gstFree: l.gstFree !== false,
    };
  });
}

/**
 * Build the full invoice from the user's saved details, one participant and the
 * selected shifts (plus any extra lines). The result is validated by the caller.
 */
export function buildInvoice(args: {
  settings: UserSettings;
  participant: Participant;
  shifts: ShiftRecord[];
  extraLines: InvoiceLine[];
  number: string;
  issueDate: string;
  notes?: string;
}): InvoiceInput {
  const { settings, participant } = args;
  const shiftLines = shiftsToLines(args.shifts);
  // NDIS supports default to GST-free; if not registered for GST the flag is ignored anyway.
  return {
    mode: "ndis",
    number: args.number,
    issueDate: args.issueDate,
    dueDate: addDays(args.issueDate, settings.termsDays),
    provider: { ...settings.provider, abn: settings.provider.abn ? formatAbn(settings.provider.abn) : "" },
    billTo: {
      name: participant.billToName || participant.name,
      email: participant.billToEmail || undefined,
      abn: participant.billToAbn || undefined,
    },
    participant: { name: participant.name, ndisNumber: participant.ndisNumber, planType: participant.planType },
    lines: [...shiftLines, ...args.extraLines].sort((a, b) => a.date.localeCompare(b.date)),
    payment: settings.payment,
    notes: (args.notes ?? settings.invoiceNotes) || undefined,
  };
}
