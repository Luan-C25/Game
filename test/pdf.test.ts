import { test } from "node:test";
import assert from "node:assert/strict";
import { PdfDocument, textWidth, toWinAnsi, wrapText } from "../src/shared/pdf.ts";
import { renderInvoicePdf } from "../src/shared/invoicePdf.ts";
import type { InvoiceInput } from "../src/shared/invoice.ts";

const decoder = new TextDecoder("latin1");

function invoice(lineCount: number): InvoiceInput {
  return {
    mode: "ndis",
    number: "INV-0042",
    issueDate: "2026-10-21",
    dueDate: "2026-10-28",
    provider: { name: "Sam Carer (Café)", abn: "51824753556", gstRegistered: false, email: "sam@example.com" },
    billTo: { name: "Example Plan Management", email: "accounts@example.com" },
    participant: { name: "Alex Participant", ndisNumber: "431234567", planType: "plan" },
    lines: Array.from({ length: lineCount }, (_, i) => ({
      date: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`,
      itemNumber: "01_011_0107_1_1",
      description: "Self-care support (09:00 to 12:00) with a longer description that needs to wrap onto a second line",
      quantity: 300,
      unit: "hour" as const,
      rateCents: 7358,
      gstFree: true,
    })),
    payment: { accountName: "Sam Carer", bsb: "062000", accountNumber: "12345678", payId: "sam@example.com" },
    notes: "Thanks. Questions about this invoice: sam@example.com",
  };
}

test("text metrics", () => {
  assert.equal(textWidth("A", 10), 6.67);
  assert.ok(textWidth("W", 10, "bold") > textWidth("i", 10, "bold"));
  assert.deepEqual(toWinAnsi("é’"), [0xe9, 0x92]);
  assert.deepEqual(toWinAnsi("😀"), [63]);
  for (const line of wrapText("one two three four five six seven", 10, 50)) assert.ok(textWidth(line, 10) <= 50);
});

test("xref offsets point at each object", () => {
  const doc = new PdfDocument();
  doc.addPage().text(10, 10, "Hello (world) \\ test");
  const pdf = decoder.decode(doc.toBytes());
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.ok(pdf.trimEnd().endsWith("%%EOF"));
  const startxref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
  assert.equal(pdf.slice(startxref, startxref + 4), "xref");
  const entries = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  entries.forEach((offset, i) => assert.equal(pdf.slice(offset, offset + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  assert.ok(pdf.includes("(Hello \\(world\\) \\\\ test) Tj"));
});

test("an invoice PDF renders and paginates long invoices", () => {
  const one = decoder.decode(renderInvoicePdf(invoice(3)));
  assert.match(one, /\/Count 1 >>/);
  assert.ok(one.includes("(INV-0042) Tj"));
  assert.ok(one.includes("(Invoice) Tj"));
  assert.ok(one.includes("(Alex Participant) Tj"));
  assert.ok(one.includes("No GST has been charged"));
  const many = decoder.decode(renderInvoicePdf(invoice(40)));
  const count = Number(/\/Count (\d+) >>/.exec(many)![1]);
  assert.ok(count >= 3, `expected 3+ pages, got ${count}`);
  assert.ok(many.includes(`Page ${count} of ${count}`));
});

test("a GST-registered invoice is titled tax invoice", () => {
  const inv = invoice(1);
  inv.provider.gstRegistered = true;
  const pdf = decoder.decode(renderInvoicePdf(inv));
  assert.ok(pdf.includes("(Tax invoice) Tj"));
  assert.ok(pdf.includes("All items on this invoice are GST-free."));
});

test("service period formatting is compact", async () => {
  const { formatPeriod } = await import("../src/shared/invoicePdf.ts");
  assert.equal(formatPeriod("2026-10-13", "2026-10-13"), "13 Oct 2026");
  assert.equal(formatPeriod("2026-10-13", "2026-10-17"), "13 to 17 Oct 2026");
  assert.equal(formatPeriod("2026-10-28", "2026-11-03"), "28 Oct to 3 Nov 2026");
  assert.equal(formatPeriod("2026-12-28", "2027-01-03"), "28 Dec 2026 to 3 Jan 2027");
});
