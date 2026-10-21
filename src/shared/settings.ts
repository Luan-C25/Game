import type { PaymentDetails, Provider } from "./invoice.ts";
import { cleanText, isValidAbn, isValidBsb, isHttpsUrl, isValidEmail } from "./validate.ts";
import { AU_TIME_ZONES } from "./dates.ts";

export interface UserSettings {
  provider: Provider;
  payment: PaymentDetails;
  invoicePrefix: string;
  termsDays: number;
  /** Whole-number percentage of each payment to set aside for income tax. */
  taxPercent: number;
  timeZone: string;
  reminders: { enabled: boolean };
  invoiceNotes: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  provider: { name: "", abn: "", gstRegistered: false, ndisProviderNumber: "", address: "", email: "", phone: "" },
  payment: { accountName: "", bsb: "", accountNumber: "", payId: "", payLink: "" },
  invoicePrefix: "INV-",
  termsDays: 7,
  taxPercent: 25,
  timeZone: "Australia/Sydney",
  reminders: { enabled: true },
  invoiceNotes: "",
};

/** Accepts untrusted input and returns clean settings plus field errors. */
export function sanitiseSettings(input: unknown): { settings: UserSettings; errors: Record<string, string> } {
  const src = (typeof input === "object" && input ? input : {}) as Record<string, unknown>;
  const p = (typeof src.provider === "object" && src.provider ? src.provider : {}) as Record<string, unknown>;
  const pay = (typeof src.payment === "object" && src.payment ? src.payment : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const settings: UserSettings = {
    provider: {
      name: cleanText(p.name, 120),
      abn: cleanText(p.abn, 20),
      gstRegistered: p.gstRegistered === true,
      ndisProviderNumber: cleanText(p.ndisProviderNumber, 30),
      address: cleanText(p.address, 200),
      email: cleanText(p.email, 254),
      phone: cleanText(p.phone, 30),
    },
    payment: {
      accountName: cleanText(pay.accountName, 120),
      bsb: cleanText(pay.bsb, 10),
      accountNumber: cleanText(pay.accountNumber, 20),
      payId: cleanText(pay.payId, 254),
      payLink: cleanText(pay.payLink, 300),
    },
    invoicePrefix: cleanText(src.invoicePrefix, 12).replace(/[^\w\-/]/g, "") || "INV-",
    termsDays: [0, 7, 14, 30].includes(Number(src.termsDays)) ? Number(src.termsDays) : 7,
    taxPercent: Math.min(60, Math.max(0, Math.round(Number(src.taxPercent ?? 25)) || 0)),
    timeZone: (AU_TIME_ZONES as readonly string[]).includes(String(src.timeZone)) ? String(src.timeZone) : "Australia/Sydney",
    reminders: { enabled: (src.reminders as { enabled?: unknown } | undefined)?.enabled !== false },
    invoiceNotes: cleanText(src.invoiceNotes, 600),
  };
  if (settings.provider.abn && !isValidAbn(settings.provider.abn)) errors["provider.abn"] = "That ABN does not pass the ATO check digit test.";
  if (settings.provider.email && !isValidEmail(settings.provider.email)) errors["provider.email"] = "Check your email address.";
  if (settings.payment.bsb && !isValidBsb(settings.payment.bsb)) errors["payment.bsb"] = "A BSB has 6 digits.";
  if (settings.payment.payLink && !isHttpsUrl(settings.payment.payLink)) errors["payment.payLink"] = "Payment links must start with https://";
  return { settings, errors };
}
