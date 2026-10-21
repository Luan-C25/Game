import { h, toast } from "./h.ts";
import { api } from "./apiClient.ts";
import { me, upgradePrompt, errorBox } from "./app.ts";
import { downloadBytes } from "./dom.ts";
import { formatAud } from "../shared/money.ts";
import { formatDate } from "../shared/dates.ts";
import { financialYear } from "../shared/tax.ts";

type Shell = (active: string, ...content: (Node | null)[]) => void;

interface Summary {
  fy: string;
  percent: number;
  gstRegistered: boolean;
  receivedCents: number;
  gstCents: number;
  incomeTaxCents: number;
  setAsideCents: number;
  keepCents: number;
  outstandingCents: number;
  invoices: { id: string; number: string; billToLabel: string; paidAt: string; paidCents: number; setAsideCents: number }[];
}

let selectedFy: string | null = null;

async function downloadCsv(path: string, filename: string, out: HTMLElement): Promise<void> {
  try {
    const res = await fetch(path, { credentials: "same-origin" });
    if (!res.ok) throw new Error("The export could not be made. Please try again.");
    downloadBytes(await res.text(), filename, "text/csv");
    toast("Downloaded");
  } catch (err) {
    out.replaceChildren(errorBox(err));
  }
}

export async function moneyView(shell: Shell): Promise<void> {
  const m = me!;
  if (!m.paid) {
    shell(
      "#/money",
      h("h1", {}, "Money"),
      h("p", {}, "When you mark an invoice as paid, ShiftBill estimates how much to put aside for tax and GST, and keeps a running total for the financial year."),
      upgradePrompt("The tax set-aside tracker and CSV export for your accountant are part of the paid plan."),
    );
    return;
  }
  const current = financialYear(m.today);
  const fy = selectedFy ?? current;
  const data = await api<Summary>("GET", `/api/money?fy=${fy}`);
  const startYear = Number(current.slice(0, 4));
  const years = [0, 1, 2].map((n) => `${startYear - n}-${String((startYear - n + 1) % 100).padStart(2, "0")}`);
  const fySelect = h("select", { id: "fy", "aria-label": "Financial year" }, years.map((y) => h("option", { value: y, selected: y === fy }, `${y} financial year`)));
  fySelect.addEventListener("change", () => {
    selectedFy = fySelect.value;
    void moneyView(shell);
  });
  const out = h("div", { "aria-live": "polite" });
  shell(
    "#/money",
    h("h1", {}, "Money"),
    h("div", { class: "btn-row" }, fySelect),
    h(
      "div",
      { class: "stat-grid" },
      h("div", { class: "stat" }, h("b", {}, formatAud(data.receivedCents)), "Received"),
      h("div", { class: "stat" }, h("b", {}, formatAud(data.setAsideCents)), "Put aside (estimate)"),
      h("div", { class: "stat" }, h("b", {}, formatAud(data.keepCents)), "Yours to spend"),
      h("div", { class: "stat" }, h("b", {}, formatAud(data.outstandingCents)), "Still to be paid"),
    ),
    h(
      "p",
      { class: "note" },
      `Estimate: ${data.percent}% of each payment for income tax`,
      data.gstRegistered ? `, plus all GST collected (${formatAud(data.gstCents)})` : "",
      ". Change the percentage in ",
      h("a", { href: "#/settings" }, "Settings"),
      ". This is a budgeting aid, not tax advice. An accountant can tell you the right figure.",
    ),
    h("h2", {}, "Payments received"),
    data.invoices.length
      ? h("ul", { class: "list" }, data.invoices.map((i) => h("li", {}, h("div", {}, h("a", { href: `#/invoices/${i.id}` }, h("strong", {}, i.number)), h("div", { class: "meta" }, `${i.billToLabel} | paid ${formatDate(i.paidAt)}`)), h("div", {}, h("strong", {}, formatAud(i.paidCents)), h("div", { class: "meta" }, `put aside ${formatAud(i.setAsideCents)}`)))))
      : h("p", {}, "No payments marked as received in this financial year yet."),
    h("h2", {}, "For your accountant"),
    h(
      "div",
      { class: "btn-row" },
      h("button", { type: "button", class: "secondary", onclick: () => downloadCsv(`/api/export/invoices.csv?fy=${fy}`, `shiftbill-invoices-${fy}.csv`, out) }, "Invoices CSV"),
      h("button", { type: "button", class: "secondary", onclick: () => downloadCsv(`/api/export/shifts.csv?fy=${fy}`, `shiftbill-shifts-${fy}.csv`, out) }, "Shifts and km CSV"),
    ),
    out,
  );
}
