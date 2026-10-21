import { PdfDocument, type PdfPage, type Rgb, wrapText, textWidth } from "./pdf.ts";
import { computeTotals, documentTitle, servicePeriod, PLAN_LABELS, type InvoiceInput } from "./invoice.ts";
import { formatAud, formatQuantity } from "./money.ts";
import { formatDate } from "./dates.ts";
import { formatAbn, formatBsb } from "./validate.ts";
import { paymentQr, qrGrid } from "./qr.ts";

const MARGIN = 40;
const INK: Rgb = [0.1, 0.12, 0.16];
const MUTED: Rgb = [0.38, 0.42, 0.48];
const RULE: Rgb = [0.82, 0.84, 0.87];
const BAND: Rgb = [0.95, 0.96, 0.97];


export interface PdfOptions {
  /** Small footer credit on free invoices. */
  footerCredit?: boolean;
}

interface Column {
  key: "date" | "item" | "desc" | "qty" | "rate" | "amount";
  label: string;
  width: number;
  align: "left" | "right";
}

export function renderInvoicePdf(inv: InvoiceInput, opts: PdfOptions = {}): Uint8Array {
  const doc = new PdfDocument();
  doc.title = `${documentTitle(inv.provider)} ${inv.number}`;
  const totals = computeTotals(inv);
  const ndis = inv.mode === "ndis";

  let page = doc.addPage();
  const right = page.width - MARGIN;
  const contentWidth = page.width - MARGIN * 2;
  let y = MARGIN;

  // Title and invoice meta.
  page.text(MARGIN, y, documentTitle(inv.provider), { size: 22, font: "bold", color: INK });
  const meta: [string, string][] = [
    ["Invoice number", inv.number],
    ["Invoice date", formatDate(inv.issueDate)],
    ["Due date", formatDate(inv.dueDate)],
  ];
  meta.forEach(([k, v], i) => {
    page.text(right - 110, y + i * 14, k, { size: 9, color: MUTED, align: "right" });
    page.text(right, y + i * 14, v, { size: 9, font: "bold", color: INK, align: "right" });
  });
  y += 52;

  // From and bill-to blocks.
  const colW = (contentWidth - 20) / 2;
  const fromLines = [
    inv.provider.abn ? `ABN ${formatAbn(inv.provider.abn)}` : "",
    inv.provider.ndisProviderNumber ? `NDIS provider no. ${inv.provider.ndisProviderNumber}` : "",
    inv.provider.address ?? "",
    inv.provider.email ?? "",
    inv.provider.phone ?? "",
    inv.provider.gstRegistered ? "" : "Not registered for GST",
  ].filter(Boolean);
  const billLines = [inv.billTo.abn ? `ABN ${formatAbn(inv.billTo.abn)}` : "", inv.billTo.address ?? "", inv.billTo.email ?? ""].filter(Boolean);
  const blockHeight = Math.max(
    drawBlock(page, MARGIN, y, colW, "From", inv.provider.name, fromLines),
    drawBlock(page, MARGIN + colW + 20, y, colW, "Bill to", inv.billTo.name, billLines),
  );
  y += blockHeight + 12;

  // NDIS participant details.
  if (ndis && inv.participant) {
    const period = servicePeriod(inv.lines);
    const facts: [string, string][] = [
      ["Participant", inv.participant.name],
      ["NDIS number", inv.participant.ndisNumber],
      ["Plan management", PLAN_LABELS[inv.participant.planType]],
      ["Service period", period ? formatPeriod(period.from, period.to) : ""],
    ];
    page.rect(MARGIN, y, contentWidth, 40, BAND);
    const shares = [0.3, 0.18, 0.2, 0.32];
    let cellX = MARGIN;
    facts.forEach(([k, v], i) => {
      const cell = contentWidth * shares[i]!;
      page.text(cellX + 8, y + 7, k, { size: 8, color: MUTED });
      page.text(cellX + 8, y + 20, fit(v, 9.5, cell - 14, "bold"), { size: 9.5, font: "bold", color: INK });
      cellX += cell;
    });
    y += 52;
  }

  // Line items.
  const columns: Column[] = [
    { key: "date", label: "Date", width: 62, align: "left" },
    { key: "item", label: ndis ? "Support item" : "Item", width: ndis ? 92 : 0, align: "left" },
    { key: "desc", label: "Description", width: 0, align: "left" },
    { key: "qty", label: "Qty", width: 46, align: "right" },
    { key: "rate", label: "Rate", width: 60, align: "right" },
    { key: "amount", label: "Amount", width: 66, align: "right" },
  ].filter((c) => c.key !== "item" || ndis) as Column[];
  const fixed = columns.reduce((s, c) => s + c.width, 0);
  const desc = columns.find((c) => c.key === "desc")!;
  desc.width = contentWidth - fixed;
  const colX = (key: Column["key"]) => {
    let x = MARGIN;
    for (const c of columns) {
      if (c.key === key) return c.align === "right" ? x + c.width - 6 : x + 6;
      x += c.width;
    }
    return x;
  };

  const drawHeader = (p: PdfPage, top: number) => {
    p.rect(MARGIN, top, contentWidth, 20, INK);
    for (const c of columns) p.text(colX(c.key), top + 6, c.label, { size: 8.5, font: "bold", color: [1, 1, 1], align: c.align });
    return top + 24;
  };

  const bottomLimit = page.height - MARGIN - 30;
  y = drawHeader(page, y);
  const showGstFlag = inv.provider.gstRegistered;
  for (const line of totals.lines) {
    const description = line.description + (showGstFlag && line.gstFree ? " (GST-free)" : "");
    const wrapped = wrapText(description, 9, desc.width - 12);
    const rowHeight = Math.max(1, wrapped.length) * 11 + 8;
    if (y + rowHeight > bottomLimit) {
      page = doc.addPage();
      y = drawHeader(page, MARGIN);
    }
    page.text(colX("date"), y, formatDate(line.date), { size: 9, color: INK });
    if (ndis) page.text(colX("item"), y, fit(line.itemNumber ?? "", 8.5, 86), { size: 8.5, color: INK });
    wrapped.forEach((t, i) => page.text(colX("desc"), y + i * 11, t, { size: 9, color: INK }));
    const unit = line.unit === "hour" ? " h" : line.unit === "km" ? " km" : "";
    page.text(colX("qty"), y, formatQuantity(line.quantity) + unit, { size: 9, color: INK, align: "right" });
    page.text(colX("rate"), y, formatAud(line.rateCents), { size: 9, color: INK, align: "right" });
    page.text(colX("amount"), y, formatAud(line.amountCents), { size: 9, color: INK, align: "right" });
    y += rowHeight;
    page.line(MARGIN, y - 4, right, y - 4, RULE, 0.5);
  }

  // Totals, payment details and notes must fit together; start a new page if they will not.
  const qr = paymentQr(inv.payment, inv.number, totals.totalCents);
  const payRows = paymentRows(inv);
  const noteLines = inv.notes ? wrapText(inv.notes, 9, contentWidth) : [];
  const needed = 70 + Math.max(payRows.length * 13 + 30, qr ? 120 : 0) + (noteLines.length ? noteLines.length * 11 + 24 : 0);
  if (y + needed > page.height - MARGIN - 20) {
    page = doc.addPage();
    y = MARGIN;
  }

  y += 6;
  const labelX = right - 150;
  const totalRows: [string, string, boolean][] = [["Subtotal", formatAud(totals.subtotalCents), false]];
  if (inv.provider.gstRegistered) totalRows.push(["GST", formatAud(totals.gstCents), false]);
  totalRows.push([inv.provider.gstRegistered ? "Total (incl. GST)" : "Total", formatAud(totals.totalCents), true]);
  totalRows.forEach(([k, v, strong]) => {
    if (strong) {
      page.rect(labelX - 10, y - 4, right - labelX + 10, 22, BAND);
      y += 2;
    }
    page.text(labelX, y, k, { size: strong ? 11 : 9.5, font: strong ? "bold" : "regular", color: strong ? INK : MUTED });
    page.text(right - 6, y, v, { size: strong ? 11 : 9.5, font: strong ? "bold" : "regular", color: INK, align: "right" });
    y += strong ? 24 : 15;
  });
  const gstNote = !inv.provider.gstRegistered
    ? "No GST has been charged. The supplier is not registered for GST."
    : totals.gstCents === 0
      ? "All items on this invoice are GST-free."
      : "";
  if (gstNote) {
    page.text(right - 6, y, gstNote, { size: 8, color: MUTED, align: "right" });
    y += 14;
  }
  y += 10;

  // Payment details with optional QR.
  if (payRows.length || qr) {
    const boxTop = y;
    const boxHeight = Math.max(payRows.length * 13 + 30, qr ? 118 : 0);
    page.rect(MARGIN, boxTop, contentWidth, boxHeight, BAND);
    page.text(MARGIN + 12, boxTop + 10, "How to pay", { size: 10.5, font: "bold", color: INK });
    payRows.forEach(([k, v], i) => {
      page.text(MARGIN + 12, boxTop + 28 + i * 13, k, { size: 9, color: MUTED });
      page.text(MARGIN + 112, boxTop + 28 + i * 13, fit(v, 9, contentWidth - 250, "bold"), { size: 9, font: "bold", color: INK });
    });
    if (qr) {
      const grid = qrGrid(qr.text);
      const size = 84;
      const cell = size / grid.length;
      const qx = right - size - 14;
      page.rect(qx - 4, boxTop + 8, size + 8, size + 8, [1, 1, 1]);
      page.modules(qx, boxTop + 12, grid, cell, INK);
      page.text(right - 10, boxTop + size + 20, qr.label, { size: 7, color: MUTED, align: "right" });
    }
    y = boxTop + boxHeight + 14;
  }

  if (noteLines.length) {
    page.text(MARGIN, y, "Notes", { size: 9.5, font: "bold", color: INK });
    y += 14;
    noteLines.forEach((t) => {
      page.text(MARGIN, y, t, { size: 9, color: INK });
      y += 11;
    });
  }

  // Footer on every page.
  doc.pages.forEach((p, i) => {
    const footY = p.height - MARGIN + 6;
    p.text(MARGIN, footY, `${inv.number}  |  Page ${i + 1} of ${doc.pages.length}`, { size: 7.5, color: MUTED });
    if (opts.footerCredit) p.text(right, footY, "Made with ShiftBill", { size: 7.5, color: MUTED, align: "right" });
  });

  return doc.toBytes();
}

function paymentRows(inv: InvoiceInput): [string, string][] {
  const p = inv.payment;
  const rows: [string, string][] = [];
  if (p.accountName) rows.push(["Account name", p.accountName]);
  if (p.bsb) rows.push(["BSB", formatBsb(p.bsb)]);
  if (p.accountNumber) rows.push(["Account number", p.accountNumber]);
  if (p.payId) rows.push(["PayID", p.payId]);
  if (p.payLink) rows.push(["Pay online", p.payLink]);
  if (rows.length) {
    rows.push(["Reference", inv.number]);
    rows.push(["Please pay by", formatDate(inv.dueDate)]);
  }
  return rows;
}

function drawBlock(page: PdfPage, x: number, top: number, width: number, heading: string, name: string, lines: string[]): number {
  page.text(x, top, heading.toUpperCase(), { size: 7.5, font: "bold", color: MUTED });
  let y = top + 13;
  for (const t of wrapText(name || " ", 11, width, "bold")) {
    page.text(x, y, t, { size: 11, font: "bold", color: INK });
    y += 14;
  }
  for (const line of lines) {
    for (const t of wrapText(line, 9, width)) {
      page.text(x, y, t, { size: 9, color: INK });
      y += 12;
    }
  }
  return y - top;
}

/** "13 to 17 Oct 2026", "28 Oct to 3 Nov 2026" or "28 Dec 2026 to 3 Jan 2027". */
export function formatPeriod(from: string, to: string): string {
  if (from === to) return formatDate(from);
  const [a, b] = [formatDate(from).split(" "), formatDate(to).split(" ")];
  if (a[2] === b[2] && a[1] === b[1]) return `${a[0]} to ${formatDate(to)}`;
  if (a[2] === b[2]) return `${a[0]} ${a[1]} to ${formatDate(to)}`;
  return `${formatDate(from)} to ${formatDate(to)}`;
}

/** Truncate with an ellipsis so a value never runs into the next column. */
function fit(text: string, size: number, maxWidth: number, font: "regular" | "bold" = "regular"): string {
  if (textWidth(text, size, font) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && textWidth(t + "…", size, font) > maxWidth) t = t.slice(0, -1);
  return t + "…";
}
