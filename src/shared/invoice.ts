import { divRoundHalfUp, lineAmount, type Cents } from "./money.ts";
import { isIsoDate, isValidAbn, looksLikeNdisNumber, looksLikeSupportItem, payIdKind, isValidBsb, isHttpsUrl, isValidEmail } from "./validate.ts";

export type InvoiceMode = "ndis" | "general";
export type PlanType = "self" | "plan" | "ndia";
export type Unit = "hour" | "km" | "each";

export interface Provider {
  name: string;
  abn: string;
  gstRegistered: boolean;
  ndisProviderNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface BillTo {
  /** Plan manager, participant, nominee, or business customer. */
  name: string;
  email?: string;
  abn?: string;
  address?: string;
}

export interface Participant {
  name: string;
  ndisNumber: string;
  planType: PlanType;
}

export interface PaymentDetails {
  accountName?: string;
  bsb?: string;
  accountNumber?: string;
  payId?: string;
  /** Optional https link (for example a card payment link) shown as a QR code. */
  payLink?: string;
}

export interface InvoiceLine {
  date: string;
  itemNumber?: string;
  description: string;
  /** Hundredths: 150 = 1.5 hours or 1.5 km. */
  quantity: number;
  unit: Unit;
  rateCents: Cents;
  /** Only relevant when the provider is registered for GST. */
  gstFree: boolean;
}

export interface InvoiceInput {
  mode: InvoiceMode;
  number: string;
  issueDate: string;
  dueDate: string;
  provider: Provider;
  billTo: BillTo;
  participant?: Participant;
  lines: InvoiceLine[];
  payment: PaymentDetails;
  notes?: string;
}

export interface ComputedLine extends InvoiceLine {
  amountCents: Cents;
}

export interface InvoiceTotals {
  lines: ComputedLine[];
  subtotalCents: Cents;
  taxableCents: Cents;
  gstCents: Cents;
  totalCents: Cents;
}

export const PLAN_LABELS: Record<PlanType, string> = {
  self: "Self-managed",
  plan: "Plan-managed",
  ndia: "NDIA-managed",
};

export const GST_RATE_DENOMINATOR = 10; // GST is 1/10 of the GST-exclusive price.
export const MAX_LINES = 100;

/** Prices are entered GST-exclusive. GST is only added when the provider says they are registered. */
export function computeTotals(input: Pick<InvoiceInput, "lines" | "provider">): InvoiceTotals {
  const lines = input.lines.map((l) => ({ ...l, amountCents: lineAmount(l.quantity, l.rateCents) }));
  const subtotalCents = lines.reduce((s, l) => s + l.amountCents, 0);
  const taxableCents = input.provider.gstRegistered ? lines.filter((l) => !l.gstFree).reduce((s, l) => s + l.amountCents, 0) : 0;
  const gstCents = taxableCents > 0 ? divRoundHalfUp(taxableCents, GST_RATE_DENOMINATOR) : 0;
  return { lines, subtotalCents, taxableCents, gstCents, totalCents: subtotalCents + gstCents };
}

/** ATO: only a GST-registered seller may issue a "tax invoice". */
export function documentTitle(provider: Provider): string {
  return provider.gstRegistered ? "Tax invoice" : "Invoice";
}

/** "INV-0009" -> "INV-0010", "2026-99" -> "2026-100", "ABC" -> "ABC-1". */
export function nextInvoiceNumber(previous: string | null | undefined, prefix = "INV-"): string {
  if (!previous) return `${prefix}0001`;
  const match = /^(.*?)(\d+)$/.exec(previous.trim());
  if (!match) return `${previous.trim()}-1`;
  const [, head = "", digits = "0"] = match;
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return `${head}${next}`;
}

export function servicePeriod(lines: InvoiceLine[]): { from: string; to: string } | null {
  const dates = lines.map((l) => l.date).filter(isIsoDate).sort();
  if (dates.length === 0) return null;
  return { from: dates[0]!, to: dates[dates.length - 1]! };
}

export interface Issue {
  field: string;
  message: string;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

export function validateInvoice(inv: InvoiceInput): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (field: string, message: string) => errors.push({ field, message });
  const warn = (field: string, message: string) => warnings.push({ field, message });

  if (!inv.provider.name.trim()) err("provider.name", "Add your name or business name.");
  if (!inv.provider.abn.trim()) {
    warn("provider.abn", "No ABN entered. Plan managers and businesses usually need your ABN, and without one they may have to withhold tax.");
  } else if (!isValidAbn(inv.provider.abn)) {
    err("provider.abn", "That ABN does not pass the ATO check digit test. Check for a typo.");
  }
  if (inv.provider.email && !isValidEmail(inv.provider.email)) err("provider.email", "Your email address looks incomplete.");
  if (!inv.number.trim()) err("number", "Add an invoice number.");
  if (!isIsoDate(inv.issueDate)) err("issueDate", "Add the invoice date.");
  if (!isIsoDate(inv.dueDate)) err("dueDate", "Add a due date.");
  else if (isIsoDate(inv.issueDate) && inv.dueDate < inv.issueDate) err("dueDate", "The due date is before the invoice date.");
  if (!inv.billTo.name.trim()) err("billTo.name", "Add who the invoice is going to.");
  if (inv.billTo.email && !isValidEmail(inv.billTo.email)) err("billTo.email", "The billing email address looks incomplete.");
  if (inv.billTo.abn && !isValidAbn(inv.billTo.abn)) warn("billTo.abn", "The customer ABN does not pass the ATO check digit test.");

  if (inv.mode === "ndis") {
    const p = inv.participant;
    if (!p || !p.name.trim()) err("participant.name", "Add the participant's name.");
    if (!p || !p.ndisNumber.trim()) warn("participant.ndisNumber", "Plan managers usually need the participant's NDIS number on the invoice.");
    else if (!looksLikeNdisNumber(p.ndisNumber)) warn("participant.ndisNumber", "NDIS numbers are usually 9 digits. Check this one.");
    if (p?.planType === "ndia") {
      warn(
        "participant.planType",
        "NDIA-managed supports are not invoiced. Registered providers claim them through the NDIS provider portal, and unregistered providers cannot be paid from NDIA-managed funds.",
      );
    }
  }

  if (inv.lines.length === 0) err("lines", "Add at least one line.");
  if (inv.lines.length > MAX_LINES) err("lines", `An invoice can have at most ${MAX_LINES} lines. Split it into two invoices.`);
  inv.lines.forEach((l, i) => {
    const f = (name: string) => `lines.${i}.${name}`;
    if (!isIsoDate(l.date)) err(f("date"), `Line ${i + 1}: add the date of service.`);
    if (!l.description.trim() && !(l.itemNumber ?? "").trim()) err(f("description"), `Line ${i + 1}: add a description.`);
    if (!(l.quantity > 0)) err(f("quantity"), `Line ${i + 1}: hours or quantity must be more than zero.`);
    if (!(l.rateCents > 0)) err(f("rateCents"), `Line ${i + 1}: add a rate.`);
    if (inv.mode === "ndis") {
      if (!(l.itemNumber ?? "").trim()) warn(f("itemNumber"), `Line ${i + 1}: plan managers usually need the support item number.`);
      else if (!looksLikeSupportItem(l.itemNumber ?? "")) warn(f("itemNumber"), `Line ${i + 1}: support item numbers usually look like 01_011_0107_1_1.`);
    }
  });

  const pay = inv.payment;
  if (pay.bsb && !isValidBsb(pay.bsb)) err("payment.bsb", "A BSB has 6 digits.");
  if (pay.accountNumber && !/^\d{4,10}$/.test(pay.accountNumber.replace(/[\s-]/g, ""))) err("payment.accountNumber", "Account numbers are 4 to 10 digits.");
  if (pay.payId && !payIdKind(pay.payId)) warn("payment.payId", "A PayID is usually an email address, mobile number or ABN.");
  if (pay.payLink && !isHttpsUrl(pay.payLink)) err("payment.payLink", "Payment links must start with https://");
  if (!pay.bsb && !pay.accountNumber && !pay.payId && !pay.payLink) warn("payment", "Add bank details or a PayID so you can be paid.");

  return { errors, warnings };
}
