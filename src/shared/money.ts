// All money is held as integer cents. Quantities (hours, km) are held as
// integer hundredths so that line maths stays exact until the final rounding.

export type Cents = number;

/** Parse a user-entered dollar amount ("70.23", "$1,200", "15") into cents. */
export function parseDollars(input: string): Cents | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = "0", frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Parse a quantity with up to two decimal places ("1.5", "2.25") into hundredths. */
export function parseQuantity(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = "0", frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Integer division of a non-negative numerator, rounding half up. */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  if (numerator < 0 || denominator <= 0) throw new RangeError("divRoundHalfUp expects non-negative values");
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
}

/** quantity (hundredths) x unit rate (cents) -> cents, rounded half up. */
export function lineAmount(quantityHundredths: number, rateCents: Cents): Cents {
  return divRoundHalfUp(quantityHundredths * rateCents, 100);
}

export function formatAud(cents: Cents): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-AU");
  const rest = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars}.${rest}`;
}

export function formatQuantity(hundredths: number): string {
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}

/** Cents to a plain "70.23" string for form inputs and CSV. */
export function centsToInput(cents: Cents): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
