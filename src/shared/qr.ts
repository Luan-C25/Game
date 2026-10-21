import qrcode from "qrcode-generator";
import { formatAud, type Cents } from "./money.ts";
import type { PaymentDetails } from "./invoice.ts";

export function qrGrid(text: string): boolean[][] {
  const ascii = text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e\n]/g, "?");
  const qr = qrcode(0, "M");
  qr.addData(ascii);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => qr.isDark(r, c)));
}

/**
 * What the QR code on an invoice holds, and how it is labelled.
 * Australian banking apps do not share one "scan to pay a PayID" standard, so we
 * never claim a QR pays the invoice unless it points to a real payment link.
 */
export function paymentQr(payment: PaymentDetails, invoiceNumber: string, totalCents: Cents): { text: string; label: string } | null {
  if (payment.payLink) return { text: payment.payLink.trim(), label: "Scan to open the payment link" };
  if (payment.payId) {
    const lines = [`PayID: ${payment.payId.trim()}`];
    if (payment.accountName) lines.push(`Name: ${payment.accountName.trim()}`);
    lines.push(`Amount: ${formatAud(totalCents)}`, `Reference: ${invoiceNumber}`);
    return { text: lines.join("\n"), label: "Scan to copy the PayID and reference" };
  }
  return null;
}
