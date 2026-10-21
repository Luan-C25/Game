import { minutesOfDay, formatDate, weekday } from "./dates.ts";
import { divRoundHalfUp, formatQuantity, type Cents } from "./money.ts";
import type { InvoiceLine } from "./invoice.ts";

export interface Shift {
  id: string;
  participantId: string;
  date: string;
  start: string;
  end: string;
  breakMinutes: number;
  itemNumber: string;
  description: string;
  rateCents: Cents;
  /** Kilometres in hundredths (12.5 km = 1250). 0 when no travel was claimed. */
  km: number;
  kmRateCents: Cents;
  kmItemNumber: string;
  invoiceId?: string | null;
}

/** Worked minutes, allowing for shifts that cross midnight. */
export function shiftMinutes(start: string, end: string, breakMinutes = 0): number {
  let mins = minutesOfDay(end) - minutesOfDay(start);
  if (mins <= 0) mins += 24 * 60;
  return Math.max(0, mins - Math.max(0, breakMinutes));
}

/** Minutes -> hours in hundredths, rounded half up to the nearest 0.01 hour. */
export function minutesToHoursHundredths(minutes: number): number {
  return divRoundHalfUp(minutes * 100, 60);
}

export function shiftHours(s: Pick<Shift, "start" | "end" | "breakMinutes">): number {
  return minutesToHoursHundredths(shiftMinutes(s.start, s.end, s.breakMinutes));
}

/**
 * One tap: a shift becomes one support line, plus a travel line when km were logged.
 * NDIS supports are GST-free by default; the user can change that per line.
 */
export function shiftToLines(s: Shift): InvoiceLine[] {
  const hours = shiftHours(s);
  const lines: InvoiceLine[] = [
    {
      date: s.date,
      itemNumber: s.itemNumber.trim(),
      description: (s.description.trim() || "Support") + ` (${s.start} to ${s.end}${s.breakMinutes ? `, ${s.breakMinutes} min break` : ""})`,
      quantity: hours,
      unit: "hour",
      rateCents: s.rateCents,
      gstFree: true,
    },
  ];
  if (s.km > 0 && s.kmRateCents > 0) {
    lines.push({
      date: s.date,
      itemNumber: s.kmItemNumber.trim(),
      description: `Travel with or for participant, ${formatQuantity(s.km)} km`,
      quantity: s.km,
      unit: "km",
      rateCents: s.kmRateCents,
      gstFree: true,
    });
  }
  return lines;
}

/** Shifts sorted by date and start time, converted to invoice lines in order. */
export function shiftsToLines(shifts: Shift[]): InvoiceLine[] {
  return [...shifts].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).flatMap(shiftToLines);
}

export function describeShift(s: Shift): string {
  return `${weekday(s.date)} ${formatDate(s.date)}, ${s.start} to ${s.end}, ${formatQuantity(shiftHours(s))} h`;
}
