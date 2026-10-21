// Field checks. "Hard" checks block saving; "soft" checks only warn, because
// formats published by the NDIA and ATO change and we must not reject a valid
// value just because our pattern is out of date.

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export function normaliseDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** ATO ABN checksum: subtract 1 from the first digit, weight, sum, mod 89. */
export function isValidAbn(value: string): boolean {
  const digits = normaliseDigits(value);
  if (digits.length !== 11) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let d = Number(digits[i]);
    if (i === 0) d -= 1;
    sum += d * (ABN_WEIGHTS[i] ?? 0);
  }
  return sum % 89 === 0;
}

export function formatAbn(value: string): string {
  const d = normaliseDigits(value);
  if (d.length !== 11) return value.trim();
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

/** NDIS participant numbers are nine digits. Soft check only. */
export function looksLikeNdisNumber(value: string): boolean {
  return /^\d{9}$/.test(value.replace(/\s/g, ""));
}

/** Support item numbers look like 01_011_0107_1_1. Soft check only. */
export function looksLikeSupportItem(value: string): boolean {
  return /^\d{2}_\d{3}_\d{4}_\d_\d(_[A-Z])?$/.test(value.trim());
}

export function isValidBsb(value: string): boolean {
  return normaliseDigits(value).length === 6;
}

export function formatBsb(value: string): string {
  const d = normaliseDigits(value);
  return d.length === 6 ? `${d.slice(0, 3)}-${d.slice(3)}` : value.trim();
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** A PayID can be an email, an Australian mobile number, or an ABN. */
export function payIdKind(value: string): "email" | "phone" | "abn" | null {
  const v = value.trim();
  if (v === "") return null;
  if (isValidEmail(v)) return "email";
  const d = normaliseDigits(v);
  if ((d.length === 10 && d.startsWith("04")) || (d.length === 11 && d.startsWith("614"))) return "phone";
  if (isValidAbn(v)) return "abn";
  return null;
}

export function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Trim and cap free text so nothing unbounded reaches storage or the PDF. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
}
