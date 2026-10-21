// CSV for accountants. Text cells that start with a formula character are
// prefixed with an apostrophe so spreadsheet apps do not execute them.

export type CsvValue = string | number | null | undefined;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? String(value) : value;
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
