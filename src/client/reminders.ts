import { h } from "./h.ts";
import type { InvoiceInput } from "../shared/invoice.ts";

// Filled in by step 5 (overdue reminders).
export function reminderControls(_inv: { id: string }, _input: InvoiceInput, _refresh: () => Promise<void>): HTMLElement {
  return h("p", { class: "warn" }, "This invoice is overdue.");
}
