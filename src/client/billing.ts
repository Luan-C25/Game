import { h, toast } from "./h.ts";
import { api } from "./apiClient.ts";
import { me, refreshMe, errorBox } from "./app.ts";
import { PRICES, FREE_LIMITS } from "../shared/config.ts";
import { formatDate } from "../shared/dates.ts";

type Shell = (active: string, ...content: (Node | null)[]) => void;

async function go(path: string, body: unknown, button: HTMLButtonElement, out: HTMLElement): Promise<void> {
  button.disabled = true;
  try {
    const { url } = await api<{ url: string }>("POST", path, body);
    location.href = url;
  } catch (err) {
    out.replaceChildren(errorBox(err));
    button.disabled = false;
  }
}

/** Stripe's webhook can land a moment after the redirect back, so check a few times. */
async function waitForPaid(): Promise<boolean> {
  for (let i = 0; i < 6; i++) {
    if ((await refreshMe()).paid) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export async function billingView(shell: Shell, params: URLSearchParams): Promise<void> {
  const out = h("div", { "aria-live": "polite" });
  if (params.get("success") === "1" && !me!.paid) {
    shell("#/settings", h("h1", {}, "Billing"), h("p", {}, "Payment received. Switching on the paid plan..."));
    const ok = await waitForPaid();
    if (ok) toast("The paid plan is on. Thank you.");
  }
  const m = me!;
  if (!m.features.billing) {
    shell("#/settings", h("h1", {}, "Billing"), h("p", {}, "Paid plans are not on sale yet. Everything in the free account still works."));
    return;
  }

  if (m.paid) {
    const sub = m.subscription!;
    const manage = h("button", { type: "button" }, "Manage billing");
    manage.addEventListener("click", () => go("/api/billing/portal", {}, manage, out));
    shell(
      "#/settings",
      h("h1", {}, "Billing"),
      h("div", { class: "ok-box" }, "You are on the paid plan."),
      sub.currentPeriodEnd ? h("p", {}, sub.cancelAtPeriodEnd ? `Your plan ends on ${formatDate(sub.currentPeriodEnd.slice(0, 10))}. You will keep your data.` : `Renews on ${formatDate(sub.currentPeriodEnd.slice(0, 10))}.`) : null,
      sub.status === "past_due" ? h("p", { class: "warn" }, "Your last payment did not go through. Update your card in Manage billing to keep the paid plan.") : null,
      h("p", {}, "Change plan, update your card, download receipts or cancel in Stripe's secure billing page."),
      h("div", { class: "btn-row" }, manage),
      out,
    );
    return;
  }

  const monthly = h("button", { type: "button" }, `A$${PRICES.monthlyAud} a month`);
  const yearly = h("button", { type: "button", class: "secondary" }, `A$${PRICES.yearlyAud} a year`);
  monthly.addEventListener("click", () => go("/api/billing/checkout", { plan: "monthly" }, monthly, out));
  yearly.addEventListener("click", () => go("/api/billing/checkout", { plan: "yearly" }, yearly, out));
  shell(
    "#/settings",
    h("h1", {}, "Upgrade"),
    params.get("cancelled") === "1" ? h("p", { class: "note" }, "No payment was taken.") : null,
    h(
      "ul",
      { class: "checklist" },
      h("li", {}, "Unlimited shift log with kilometres"),
      h("li", {}, "Unlimited participants and invoices"),
      h("li", {}, "Overdue list and ready-to-send reminders"),
      h("li", {}, "Tax set-aside tracker and CSV export for your accountant"),
      h("li", {}, "ABN lookup, and no footer credit on your PDFs"),
    ),
    h("p", {}, `You have used ${m.counts.shifts} of ${FREE_LIMITS.shifts} free shifts and ${m.counts.invoices} of ${FREE_LIMITS.invoices} free invoices.`),
    h("div", { class: "btn-row" }, monthly, yearly),
    h("p", { class: "small" }, "Payment is handled by Stripe. Cancel any time from this page. No GST is charged."),
    out,
  );
}
