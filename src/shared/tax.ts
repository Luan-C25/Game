import { divRoundHalfUp, type Cents } from "./money.ts";

// Estimates only. This is a budgeting aid, not tax advice.

export interface SetAside {
  /** GST collected on this payment, which belongs to the ATO at BAS time. */
  gstCents: Cents;
  /** Income tax estimate on the GST-exclusive amount at the user's chosen percentage. */
  incomeTaxCents: Cents;
  totalCents: Cents;
  /** What is left to spend after the set-aside. */
  keepCents: Cents;
}

/**
 * paymentCents: amount received. gstCents: GST included in that payment (0 if not registered).
 * percent: whole-number percentage the user chose to put aside for income tax (0 to 60).
 */
export function setAsideFor(paymentCents: Cents, gstCents: Cents, percent: number): SetAside {
  const pct = Math.min(60, Math.max(0, Math.round(percent)));
  const gst = Math.min(Math.max(0, gstCents), paymentCents);
  const incomeTaxCents = divRoundHalfUp((paymentCents - gst) * pct, 100);
  const totalCents = gst + incomeTaxCents;
  return { gstCents: gst, incomeTaxCents, totalCents, keepCents: paymentCents - totalCents };
}

/** GST share of a partial payment, in proportion to the invoice's GST. */
export function gstShareOfPayment(paymentCents: Cents, invoiceTotalCents: Cents, invoiceGstCents: Cents): Cents {
  if (invoiceTotalCents <= 0 || invoiceGstCents <= 0) return 0;
  if (paymentCents >= invoiceTotalCents) return invoiceGstCents;
  return divRoundHalfUp(paymentCents * invoiceGstCents, invoiceTotalCents);
}

/** Australian financial year label for a date, e.g. 2026-10-21 -> "2026-27". */
export function financialYear(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const start = m >= 7 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
