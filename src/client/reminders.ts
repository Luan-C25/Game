import { h, toast } from "./h.ts";
import { api } from "./apiClient.ts";
import { me, errorBox, upgradePrompt, type InvoiceSummary } from "./app.ts";
import type { InvoiceInput } from "../shared/invoice.ts";
import { reminderMessage, mailtoLink } from "../shared/reminder.ts";
import { daysBetween, formatDate } from "../shared/dates.ts";

/** Shown on an overdue invoice: send a reminder from your own email app, or have ShiftBill email it. */
export function reminderControls(inv: InvoiceSummary, input: InvoiceInput, refresh: () => Promise<void>): HTMLElement {
  const m = me!;
  const days = daysBetween(inv.dueDate, m.today);
  const heading = h("p", {}, h("strong", {}, `Overdue by ${days} day${days === 1 ? "" : "s"}.`), inv.reminderCount ? ` ${inv.reminderCount} reminder${inv.reminderCount === 1 ? "" : "s"} sent, last on ${formatDate((inv.lastReminderAt ?? "").slice(0, 10))}.` : "");
  if (!m.paid) return h("div", { class: "warn" }, heading, upgradePrompt("Reminders with the invoice details filled in are part of the paid plan."));

  const out = h("div", { "aria-live": "polite" });
  const msg = reminderMessage(input, inv.totalCents, inv.reminderCount + 1);
  const to = input.billTo.email ?? "";
  const record = async (send: boolean) => {
    try {
      await api("POST", `/api/invoices/${inv.id}/reminder`, { send });
      toast(send ? "Reminder emailed" : "Reminder noted");
      await refresh();
    } catch (err) {
      out.replaceChildren(errorBox(err));
    }
  };
  const mailApp = h("a", { class: "btn", href: mailtoLink(to, msg.subject, msg.body) }, "Send from my email");
  mailApp.addEventListener("click", () => setTimeout(() => void record(false), 500));
  const autoSend = m.features.email && to ? h("button", { type: "button", class: "secondary", onclick: () => record(true) }, "Email it for me") : null;
  return h(
    "div",
    { class: "warn" },
    heading,
    h("p", {}, to ? `The reminder goes to ${to}. Attach the PDF if your email app lets you.` : "Add an invoice email address for this participant to send reminders."),
    h("div", { class: "btn-row" }, to ? mailApp : null, autoSend),
    !m.features.email ? h("p", { class: "small" }, "Automatic reminder emails switch on soon. Until then, reminders open in your own email app, which plan managers often prefer anyway.") : h("p", { class: "small" }, "ShiftBill also emails overdue invoices automatically every 7 days, up to 3 times, if reminders are on in Settings."),
    out,
  );
}
