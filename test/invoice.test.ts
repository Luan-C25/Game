import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, documentTitle, nextInvoiceNumber, validateInvoice, servicePeriod, type InvoiceInput } from "../src/shared/invoice.ts";

// 51 824 753 556 is the example ABN used in ATO documentation and passes the checksum.
const VALID_ABN = "51 824 753 556";

function sample(overrides: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    mode: "ndis",
    number: "INV-0001",
    issueDate: "2026-10-21",
    dueDate: "2026-10-28",
    provider: { name: "Sam Carer", abn: VALID_ABN, gstRegistered: false, email: "sam@example.com" },
    billTo: { name: "Example Plan Management", email: "accounts@example.com" },
    participant: { name: "Alex Participant", ndisNumber: "431234567", planType: "plan" },
    lines: [
      { date: "2026-10-14", itemNumber: "01_011_0107_1_1", description: "Self-care support", quantity: 300, unit: "hour", rateCents: 7358, gstFree: true },
      { date: "2026-10-14", itemNumber: "01_799_0107_1_1", description: "Travel, 12.5 km", quantity: 1250, unit: "km", rateCents: 100, gstFree: true },
    ],
    payment: { accountName: "Sam Carer", bsb: "062000", accountNumber: "12345678", payId: "sam@example.com" },
    ...overrides,
  };
}

test("totals without GST registration never include GST", () => {
  const t = computeTotals(sample({ lines: [{ date: "2026-10-14", description: "Support", quantity: 200, unit: "hour", rateCents: 5000, gstFree: false }] }));
  assert.equal(t.subtotalCents, 10000);
  assert.equal(t.gstCents, 0);
  assert.equal(t.totalCents, 10000);
});

test("totals sum lines exactly", () => {
  const t = computeTotals(sample());
  assert.equal(t.lines[0]!.amountCents, 22074); // 3 h x 73.58
  assert.equal(t.lines[1]!.amountCents, 1250); // 12.5 km x 1.00
  assert.equal(t.subtotalCents, 23324);
  assert.equal(t.totalCents, 23324);
});

test("GST is 10% of taxable lines only, when registered", () => {
  const inv = sample({
    provider: { name: "Sam", abn: VALID_ABN, gstRegistered: true },
    lines: [
      { date: "2026-10-14", description: "GST-free NDIS support", quantity: 100, unit: "hour", rateCents: 7358, gstFree: true },
      { date: "2026-10-14", description: "Taxable item", quantity: 100, unit: "each", rateCents: 3333, gstFree: false },
    ],
  });
  const t = computeTotals(inv);
  assert.equal(t.taxableCents, 3333);
  assert.equal(t.gstCents, 333); // 333.3 -> 333
  assert.equal(t.totalCents, 7358 + 3333 + 333);
});

test("GST rounds half up at invoice level", () => {
  const t = computeTotals({
    provider: { name: "x", abn: "", gstRegistered: true },
    lines: [{ date: "2026-10-14", description: "x", quantity: 100, unit: "each", rateCents: 1005, gstFree: false }],
  });
  assert.equal(t.gstCents, 101); // 100.5 -> 101
});

test("only GST-registered providers get a tax invoice title", () => {
  assert.equal(documentTitle({ name: "a", abn: "", gstRegistered: false }), "Invoice");
  assert.equal(documentTitle({ name: "a", abn: "", gstRegistered: true }), "Tax invoice");
});

test("sequential numbering keeps the prefix and padding", () => {
  assert.equal(nextInvoiceNumber(null), "INV-0001");
  assert.equal(nextInvoiceNumber("INV-0001"), "INV-0002");
  assert.equal(nextInvoiceNumber("INV-0009"), "INV-0010");
  assert.equal(nextInvoiceNumber("INV-9999"), "INV-10000");
  assert.equal(nextInvoiceNumber("2026-099"), "2026-100");
  assert.equal(nextInvoiceNumber("42"), "43");
  assert.equal(nextInvoiceNumber("ABC"), "ABC-1");
  assert.equal(nextInvoiceNumber(undefined, "SB-"), "SB-0001");
});

test("a complete NDIS invoice validates without errors", () => {
  const r = validateInvoice(sample());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("validation catches the mistakes plan managers reject", () => {
  const r = validateInvoice(
    sample({
      provider: { name: "", abn: "12 345 678 901", gstRegistered: false },
      dueDate: "2026-10-01",
      lines: [{ date: "", description: "", quantity: 0, unit: "hour", rateCents: 0, gstFree: true }],
    }),
  );
  const fields = r.errors.map((e) => e.field);
  assert.ok(fields.includes("provider.name"));
  assert.ok(fields.includes("provider.abn"));
  assert.ok(fields.includes("dueDate"));
  assert.ok(fields.includes("lines.0.date"));
  assert.ok(fields.includes("lines.0.quantity"));
  assert.ok(fields.includes("lines.0.rateCents"));
});

test("NDIA-managed and odd NDIS numbers produce warnings, not errors", () => {
  const r = validateInvoice(sample({ participant: { name: "A", ndisNumber: "1234", planType: "ndia" } }));
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.field === "participant.planType"));
  assert.ok(r.warnings.some((w) => w.field === "participant.ndisNumber"));
});

test("general mode does not ask for NDIS details", () => {
  const r = validateInvoice(sample({ mode: "general", participant: undefined, lines: [{ date: "2026-10-14", description: "Cleaning", quantity: 200, unit: "hour", rateCents: 4500, gstFree: false }] }));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("service period spans the line dates", () => {
  assert.deepEqual(servicePeriod(sample().lines), { from: "2026-10-14", to: "2026-10-14" });
  assert.equal(servicePeriod([]), null);
});
