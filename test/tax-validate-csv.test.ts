import { test } from "node:test";
import assert from "node:assert/strict";
import { setAsideFor, gstShareOfPayment, financialYear } from "../src/shared/tax.ts";
import { isValidAbn, formatAbn, looksLikeNdisNumber, looksLikeSupportItem, payIdKind, isIsoDate, isTime, cleanText, formatBsb } from "../src/shared/validate.ts";
import { csvCell, toCsv } from "../src/shared/csv.ts";
import { addDays, daysBetween, formatDate, todayIn } from "../src/shared/dates.ts";

test("set-aside without GST", () => {
  const s = setAsideFor(100000, 0, 20);
  assert.deepEqual(s, { gstCents: 0, incomeTaxCents: 20000, totalCents: 20000, keepCents: 80000 });
});

test("set-aside with GST puts all GST aside plus a share of the rest", () => {
  const s = setAsideFor(110000, 10000, 25);
  assert.equal(s.gstCents, 10000);
  assert.equal(s.incomeTaxCents, 25000);
  assert.equal(s.keepCents, 75000);
});

test("set-aside clamps the percentage", () => {
  assert.equal(setAsideFor(1000, 0, 500).incomeTaxCents, 600);
  assert.equal(setAsideFor(1000, 0, -3).incomeTaxCents, 0);
});

test("GST share of a part payment is proportional", () => {
  assert.equal(gstShareOfPayment(55000, 110000, 10000), 5000);
  assert.equal(gstShareOfPayment(110000, 110000, 10000), 10000);
  assert.equal(gstShareOfPayment(500, 1000, 0), 0);
});

test("financial year", () => {
  assert.equal(financialYear("2026-10-21"), "2026-27");
  assert.equal(financialYear("2026-06-30"), "2025-26");
  assert.equal(financialYear("2026-07-01"), "2026-27");
  assert.equal(financialYear("2099-12-01"), "2099-00");
});

test("ABN checksum", () => {
  assert.equal(isValidAbn("51 824 753 556"), true);
  assert.equal(isValidAbn("51824753556"), true);
  assert.equal(isValidAbn("51 824 753 557"), false);
  assert.equal(isValidAbn("1234"), false);
  assert.equal(formatAbn("51824753556"), "51 824 753 556");
});

test("soft NDIS formats", () => {
  assert.equal(looksLikeNdisNumber("431 234 567"), true);
  assert.equal(looksLikeNdisNumber("43123456"), false);
  assert.equal(looksLikeNdisNumber("43123456a"), false);
  assert.equal(looksLikeSupportItem("01_011_0107_1_1"), true);
  assert.equal(looksLikeSupportItem("04_104_0125_6_1"), true);
  assert.equal(looksLikeSupportItem("01-011-0107"), false);
});

test("PayID kinds", () => {
  assert.equal(payIdKind("sam@example.com"), "email");
  assert.equal(payIdKind("0412 345 678"), "phone");
  assert.equal(payIdKind("+61 412 345 678"), "phone");
  assert.equal(payIdKind("51 824 753 556"), "abn");
  assert.equal(payIdKind("hello"), null);
});

test("dates and times", () => {
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2028-02-29"), true);
  assert.equal(isTime("23:59"), true);
  assert.equal(isTime("24:00"), false);
  assert.equal(addDays("2026-10-28", 7), "2026-11-04");
  assert.equal(daysBetween("2026-10-21", "2026-11-04"), 14);
  assert.equal(formatDate("2026-10-21"), "21 Oct 2026");
  assert.equal(todayIn("Australia/Sydney", new Date("2026-10-21T15:00:00Z")), "2026-10-22");
  assert.equal(formatBsb("062000"), "062-000");
});

test("cleanText strips control characters and caps length", () => {
  assert.equal(cleanText("  a\u0000b  ", 10), "ab");
  assert.equal(cleanText("abcdef", 3), "abc");
  assert.equal(cleanText(42, 3), "");
});

test("CSV escaping and formula injection guard", () => {
  assert.equal(csvCell('He said "hi", then left'), '"He said ""hi"", then left"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("-5"), "'-5");
  assert.equal(csvCell(-5), "-5");
  assert.equal(csvCell(null), "");
  assert.equal(toCsv(["a", "b"], [[1, "x"]]), "a,b\r\n1,x\r\n");
});
