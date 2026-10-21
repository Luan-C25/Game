import type { InvoiceInput } from "./invoice.ts";
import { formatAud, type Cents } from "./money.ts";
import { formatDate } from "./dates.ts";
import { formatBsb } from "./validate.ts";

/** Polite, plain reminder text. Used for the mail-app link and for automatic emails. */
export function reminderMessage(input: InvoiceInput, totalCents: Cents, reminderNumber: number): { subject: string; body: string } {
  const who = input.participant?.name ? ` (${input.participant.name})` : "";
  const subject = `${reminderNumber > 1 ? "Second reminder" : "Reminder"}: invoice ${input.number}${who}, ${formatAud(totalCents)}`;
  const pay = input.payment;
  const payLines = [
    pay.payId ? `PayID: ${pay.payId}` : "",
    pay.bsb || pay.accountNumber ? `BSB ${pay.bsb ? formatBsb(pay.bsb) : ""}, account ${pay.accountNumber ?? ""}${pay.accountName ? ` (${pay.accountName})` : ""}` : "",
    pay.payLink ? `Pay online: ${pay.payLink}` : "",
    `Reference: ${input.number}`,
  ].filter(Boolean);
  const greeting = input.billTo.name ? `Hi ${input.billTo.name.split(" ")[0]},` : "Hi,";
  const body = [
    greeting,
    "",
    `This is a friendly reminder that invoice ${input.number} for ${formatAud(totalCents)} was due on ${formatDate(input.dueDate)}.`,
    "",
    "Payment details:",
    ...payLines,
    "",
    "If it has already been paid, thank you, and please ignore this. If anything on the invoice needs changing, just reply and let me know.",
    "",
    "Thanks,",
    input.provider.name,
    input.provider.phone ?? "",
  ]
    .join("\n")
    .trim();
  return { subject, body };
}

export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
