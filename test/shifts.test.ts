import { test } from "node:test";
import assert from "node:assert/strict";
import { shiftMinutes, minutesToHoursHundredths, shiftHours, shiftToLines, shiftsToLines, type Shift } from "../src/shared/shifts.ts";
import { computeTotals } from "../src/shared/invoice.ts";

function shift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: "s1",
    participantId: "p1",
    date: "2026-10-14",
    start: "09:00",
    end: "12:00",
    breakMinutes: 0,
    itemNumber: "01_011_0107_1_1",
    description: "Self-care support",
    rateCents: 7358,
    km: 0,
    kmRateCents: 0,
    kmItemNumber: "",
    ...overrides,
  };
}

test("shift minutes, including breaks and overnight shifts", () => {
  assert.equal(shiftMinutes("09:00", "12:00"), 180);
  assert.equal(shiftMinutes("09:00", "12:00", 30), 150);
  assert.equal(shiftMinutes("22:00", "06:00"), 480);
  assert.equal(shiftMinutes("09:00", "09:00"), 1440);
  assert.equal(shiftMinutes("09:00", "09:10", 30), 0);
});

test("minutes convert to hours rounded to 0.01", () => {
  assert.equal(minutesToHoursHundredths(60), 100);
  assert.equal(minutesToHoursHundredths(90), 150);
  assert.equal(minutesToHoursHundredths(20), 33); // 0.333 -> 0.33
  assert.equal(minutesToHoursHundredths(50), 83); // 0.8333 -> 0.83
  assert.equal(minutesToHoursHundredths(1), 2); // 0.01666 -> 0.02
  assert.equal(shiftHours({ start: "09:15", end: "11:45", breakMinutes: 0 }), 250);
});

test("a shift becomes one support line", () => {
  const lines = shiftToLines(shift());
  assert.equal(lines.length, 1);
  assert.equal(lines[0]!.quantity, 300);
  assert.equal(lines[0]!.rateCents, 7358);
  assert.equal(lines[0]!.unit, "hour");
  assert.equal(lines[0]!.itemNumber, "01_011_0107_1_1");
  assert.equal(lines[0]!.gstFree, true);
  assert.match(lines[0]!.description, /09:00 to 12:00/);
});

test("a shift with kilometres adds a travel line", () => {
  const lines = shiftToLines(shift({ km: 1250, kmRateCents: 100, kmItemNumber: "01_799_0107_1_1" }));
  assert.equal(lines.length, 2);
  assert.equal(lines[1]!.unit, "km");
  assert.equal(lines[1]!.quantity, 1250);
  assert.equal(lines[1]!.itemNumber, "01_799_0107_1_1");
});

test("kilometres without a rate are not invoiced", () => {
  assert.equal(shiftToLines(shift({ km: 1250, kmRateCents: 0 })).length, 1);
});

test("several shifts are ordered by date and time and total correctly", () => {
  const lines = shiftsToLines([
    shift({ id: "b", date: "2026-10-15", start: "13:00", end: "15:30" }),
    shift({ id: "a", date: "2026-10-14", start: "09:00", end: "12:00", km: 800, kmRateCents: 100, kmItemNumber: "01_799_0107_1_1" }),
  ]);
  assert.deepEqual(lines.map((l) => l.date), ["2026-10-14", "2026-10-14", "2026-10-15"]);
  const t = computeTotals({ provider: { name: "x", abn: "", gstRegistered: false }, lines });
  assert.equal(t.totalCents, 22074 + 800 + 18395);
});
