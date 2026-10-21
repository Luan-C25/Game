// The signed-in app: shift log, invoices, participants and settings.
// Hash routes keep it a single static page (no server rendering, no extra Worker requests).

import { h, field, setFieldError, toast } from "./h.ts";
import { api, ApiError } from "./apiClient.ts";
import { captureAttribution, getAttribution } from "./track.ts";
import { downloadBytes } from "./dom.ts";
import { formatAud, parseDollars, parseQuantity, centsToInput, formatQuantity } from "../shared/money.ts";
import { formatDate, weekday, AU_TIME_ZONES, daysBetween } from "../shared/dates.ts";
import { shiftHours, shiftToLines, type Shift } from "../shared/shifts.ts";
import { computeTotals, PLAN_LABELS, type InvoiceInput, type PlanType } from "../shared/invoice.ts";
import { COMMON_ITEMS, FREE_LIMITS, PRICES, PRICE_GUIDE_NOTE } from "../shared/config.ts";
import type { UserSettings } from "../shared/settings.ts";
import { moneyView } from "./money.ts";
import { billingView } from "./billing.ts";
import { reminderControls } from "./reminders.ts";

// ------------------------------------------------------------------ types and state

export interface Me {
  email: string;
  settings: UserSettings;
  paid: boolean;
  subscription: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; priceId: string | null } | null;
  counts: { participants: number; invoices: number; shifts: number };
  limits: { participants: number; invoices: number; shifts: number };
  nextInvoiceNumber: string;
  today: string;
  features: { email: boolean; abnLookup: boolean; billing: boolean };
}

export interface Participant {
  id: string;
  name: string;
  ndisNumber: string;
  planType: PlanType;
  billToName: string;
  billToEmail: string;
  billToAbn: string;
  itemNumber: string;
  description: string;
  rateCents: number;
  kmItemNumber: string;
  kmRateCents: number;
}

export interface ShiftRecord extends Shift {
  invoiceId: string | null;
}

export interface InvoiceSummary {
  id: string;
  participantId: string | null;
  number: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "void";
  billToLabel: string;
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  sentAt: string | null;
  paidAt: string | null;
  paidCents: number | null;
  setAsideCents: number | null;
  reminderCount: number;
  lastReminderAt: string | null;
}

const root = document.getElementById("app")!;
// The last shift's date and times, so logging several past shifts in a row is quick.
let lastShift: { date: string; start: string; end: string; breakMinutes: string } | null = null;
export let me: Me | null = null;

export async function refreshMe(): Promise<Me> {
  me = await api<Me>("GET", "/api/me");
  return me;
}

export function isOverdue(inv: InvoiceSummary, today: string): boolean {
  return (inv.status === "sent" || inv.status === "draft") && inv.dueDate < today;
}

export function statusPill(inv: InvoiceSummary, today: string): HTMLElement {
  if (isOverdue(inv, today)) return h("span", { class: "pill overdue" }, `Overdue ${daysBetween(inv.dueDate, today)} days`);
  const label = { draft: "Draft", sent: "Sent", paid: "Paid", void: "Void" }[inv.status];
  return h("span", { class: `pill ${inv.status}` }, label);
}

// ------------------------------------------------------------------ layout

const TABS: [string, string][] = [
  ["#/shifts", "Shifts"],
  ["#/invoices", "Invoices"],
  ["#/participants", "Clients"],
  ["#/money", "Money"],
  ["#/settings", "Settings"],
];

function shell(active: string, ...content: (Node | null)[]): void {
  const nav = h(
    "nav",
    { class: "app-tabs", "aria-label": "App" },
    TABS.map(([href, label]) => h("a", { href, "aria-current": active === href ? "page" : null }, label)),
  );
  const banner = me && !me.paid ? h("p", { class: "small" }, "Free account. ", h("a", { href: "#/billing" }, "See the paid plan")) : null;
  root.replaceChildren(h("div", { class: "wrap narrow" }, nav, banner, ...content));
  const heading = root.querySelector("h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

export function upgradePrompt(message: string): HTMLElement {
  return h("div", { class: "note" }, h("p", {}, message), h("a", { class: "btn", href: "#/billing" }, "See the paid plan"));
}

export function errorBox(err: unknown): HTMLElement {
  if (err instanceof ApiError && err.code === "upgrade_required") return upgradePrompt(err.message);
  const message = err instanceof Error ? err.message : "Something went wrong.";
  const issues = err instanceof ApiError ? err.issues : [];
  return h("div", { class: "error-box", role: "alert" }, h("p", {}, message), issues.length ? h("ul", {}, issues.map((i) => h("li", {}, i.message))) : null);
}

function showFieldErrors(form: HTMLElement, err: unknown): void {
  form.querySelectorAll<HTMLElement>("[aria-invalid]").forEach((el) => setFieldError(el, ""));
  if (!(err instanceof ApiError)) return;
  for (const [name, message] of Object.entries(err.fields)) {
    const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
    if (el) setFieldError(el, message);
  }
}

function input(name: string, attrs: Record<string, string | number | boolean | null | undefined> = {}): HTMLInputElement {
  return h("input", { name, type: "text", ...attrs });
}

function select(name: string, options: [string, string][], value: string): HTMLSelectElement {
  return h("select", { name }, options.map(([v, label]) => h("option", { value: v, selected: v === value }, label)));
}

function formValues(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((v, k) => (out[k] = String(v)));
  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]').forEach((c) => (out[c.name] = c.checked ? "yes" : "no"));
  return out;
}

async function busy<T>(button: HTMLButtonElement, label: string, work: () => Promise<T>): Promise<T> {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    return await work();
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}

// ------------------------------------------------------------------ auth screens

function authLayout(title: string, ...content: Node[]): void {
  root.replaceChildren(h("div", { class: "wrap narrow" }, h("h1", {}, title), ...content));
}

function loginView(): void {
  const email = input("email", { type: "email", autocomplete: "email", required: true });
  const password = input("password", { type: "password", autocomplete: "current-password", required: true });
  const out = h("div", { "aria-live": "polite" });
  const submit = h("button", { type: "submit" }, "Log in");
  const form = h(
    "form",
    {
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault();
        out.replaceChildren();
        try {
          await busy(submit, "Logging in...", () => api("POST", "/api/auth/login", { email: email.value, password: password.value }));
          await refreshMe();
          location.hash = "#/shifts";
        } catch (err) {
          out.replaceChildren(errorBox(err));
        }
      },
    },
    field("Email", email),
    field("Password", password),
    out,
    h("div", { class: "btn-row" }, submit, h("a", { href: "#/signup" }, "Create a free account")),
    h("p", { class: "small" }, h("a", { href: "#/recover" }, "Forgotten your password?")),
  );
  authLayout("Log in", form);
}

function signupView(): void {
  const email = input("email", { type: "email", autocomplete: "email", required: true });
  const password = input("password", { type: "password", autocomplete: "new-password", minlength: 10, required: true });
  const terms = h("input", { type: "checkbox", name: "acceptTerms", id: "accept-terms" });
  const out = h("div", { "aria-live": "polite" });
  const submit = h("button", { type: "submit" }, "Create free account");
  const form = h(
    "form",
    {
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault();
        out.replaceChildren();
        try {
          const res = await busy(submit, "Creating...", () =>
            api<{ recoveryCode: string }>("POST", "/api/auth/signup", { email: email.value, password: password.value, acceptTerms: terms.checked, attribution: getAttribution() }),
          );
          recoveryCodeView(res.recoveryCode, "#/settings?welcome=1");
        } catch (err) {
          out.replaceChildren(errorBox(err));
        }
      },
    },
    h("p", {}, `Free accounts can save ${FREE_LIMITS.participants} participants, ${FREE_LIMITS.invoices} invoices and ${FREE_LIMITS.shifts} shifts. No card needed.`),
    field("Email", email),
    field("Password", password, "At least 10 characters. A short phrase is easiest to remember."),
    h("div", { class: "field" }, h("label", { class: "inline-choices", for: "accept-terms" }, terms, h("span", {}, "I agree to the ", h("a", { href: "/terms/", target: "_blank" }, "terms"), " and ", h("a", { href: "/privacy/", target: "_blank" }, "privacy policy"), "."))),
    out,
    h("div", { class: "btn-row" }, submit, h("a", { href: "#/login" }, "I already have an account")),
  );
  authLayout("Create a free account", form);
}

function recoveryCodeView(code: string, next: string): void {
  authLayout(
    "Save your recovery code",
    h("p", {}, "We do not send password reset emails. If you forget your password, this code is the only way back into your account. Save it in your password manager or take a screenshot."),
    h("p", { class: "band" }, h("strong", { class: "price" }, code)),
    h("div", { class: "btn-row" }, h("button", { type: "button", onclick: () => navigator.clipboard?.writeText(code).then(() => toast("Copied")) }, "Copy code"), h("a", { class: "btn secondary", href: next }, "I have saved it")),
  );
}

function recoverView(): void {
  const email = input("email", { type: "email", autocomplete: "email" });
  const code = input("recoveryCode", { autocomplete: "off", spellcheck: "false" });
  const password = input("password", { type: "password", autocomplete: "new-password" });
  const out = h("div", { "aria-live": "polite" });
  const submit = h("button", { type: "submit" }, "Reset password");
  authLayout(
    "Reset your password",
    h(
      "form",
      {
        novalidate: true,
        onsubmit: async (e: Event) => {
          e.preventDefault();
          try {
            const res = await busy(submit, "Checking...", () => api<{ recoveryCode: string }>("POST", "/api/auth/recover", { email: email.value, recoveryCode: code.value, password: password.value }));
            recoveryCodeView(res.recoveryCode, "#/shifts");
          } catch (err) {
            out.replaceChildren(errorBox(err));
          }
        },
      },
      field("Email", email),
      field("Recovery code", code, "The code you saved when you created your account, like ABCD-EFGH-JKMN-PQRS."),
      field("New password", password, "At least 10 characters."),
      out,
      h("div", { class: "btn-row" }, submit, h("a", { href: "#/login" }, "Back to log in")),
      h("p", { class: "small" }, "Lost your code as well? Email us from the address on your account and we will help."),
    ),
  );
}

// ------------------------------------------------------------------ shifts

async function shiftsView(): Promise<void> {
  const [{ participants }, { shifts }] = await Promise.all([
    api<{ participants: Participant[] }>("GET", "/api/participants"),
    api<{ shifts: ShiftRecord[] }>("GET", "/api/shifts?uninvoiced=1"),
  ]);
  const m = me!;
  const setupNeeded = !m.settings.provider.name || !m.settings.provider.abn;
  const setup = setupNeeded ? h("div", { class: "warn" }, "Add your name and ABN in ", h("a", { href: "#/settings" }, "Settings"), " before you make invoices.") : null;

  if (participants.length === 0) {
    shell("#/shifts", h("h1", {}, "Shift log"), setup, h("div", { class: "note" }, h("p", {}, "Add a participant first. Their usual item number and rate fill in each shift for you."), h("a", { class: "btn", href: "#/participants/new" }, "Add a participant")));
    return;
  }

  const byId = new Map(participants.map((p) => [p.id, p]));
  const lastUsed = localStorage.getItem("shiftbill.lastParticipant");
  const pSelect = select("participantId", participants.map((p) => [p.id, p.name]), lastUsed && byId.has(lastUsed) ? lastUsed : participants[0]!.id);
  const date = input("date", { type: "date", value: lastShift?.date ?? m.today });
  const start = input("start", { type: "time", value: lastShift?.start ?? "09:00" });
  const end = input("end", { type: "time", value: lastShift?.end ?? "12:00" });
  const brk = select("breakMinutes", [["0", "No break"], ["15", "15 min"], ["30", "30 min"], ["45", "45 min"], ["60", "1 hour"]], lastShift?.breakMinutes ?? "0");
  const km = input("km", { inputmode: "decimal", placeholder: "0" });
  const item = input("itemNumber", { list: "common-items", autocomplete: "off", spellcheck: "false" });
  const desc = input("description", { maxlength: 200 });
  const rate = input("rate", { inputmode: "decimal" });
  const kmRate = input("kmRate", { inputmode: "decimal" });
  const kmItem = input("kmItemNumber", { list: "common-items", autocomplete: "off", spellcheck: "false" });
  const preview = h("p", { class: "line-amount", "aria-live": "polite" });

  const fillFromParticipant = () => {
    const p = byId.get(pSelect.value);
    if (!p) return;
    item.value = p.itemNumber;
    desc.value = p.description;
    rate.value = p.rateCents ? centsToInput(p.rateCents) : "";
    kmRate.value = p.kmRateCents ? centsToInput(p.kmRateCents) : "";
    kmItem.value = p.kmItemNumber;
    updatePreview();
  };
  const draftShift = (): Shift => ({
    id: "",
    participantId: pSelect.value,
    date: date.value,
    start: start.value,
    end: end.value,
    breakMinutes: Number(brk.value),
    itemNumber: item.value,
    description: desc.value,
    rateCents: parseDollars(rate.value) ?? 0,
    km: parseQuantity(km.value) ?? 0,
    kmRateCents: parseDollars(kmRate.value) ?? 0,
    kmItemNumber: kmItem.value,
  });
  const updatePreview = () => {
    const s = draftShift();
    if (!s.start || !s.end) return;
    const total = computeTotals({ provider: m.settings.provider, lines: shiftToLines(s) }).totalCents;
    preview.textContent = `${formatQuantity(shiftHours(s))} hours${s.km ? `, ${formatQuantity(s.km)} km` : ""}: ${formatAud(total)}`;
  };

  const out = h("div", { "aria-live": "polite" });
  const save = h("button", { type: "submit" }, "Save shift");
  const details = h(
    "details",
    {},
    h("summary", {}, "Item number and rates"),
    h("div", { class: "grid-2" }, field("Support item number", item), field("Description", desc), field("Hourly rate ($)", rate), field("Travel item number", kmItem), field("Rate per km ($)", kmRate)),
    h("p", { class: "small" }, PRICE_GUIDE_NOTE),
  );
  const form = h(
    "form",
    {
      novalidate: true,
      oninput: updatePreview,
      onsubmit: async (e: Event) => {
        e.preventDefault();
        out.replaceChildren();
        try {
          const s = draftShift();
          await busy(save, "Saving...", () => api("POST", "/api/shifts", s));
          localStorage.setItem("shiftbill.lastParticipant", s.participantId);
          lastShift = { date: s.date, start: s.start, end: s.end, breakMinutes: String(s.breakMinutes) };
          await refreshMe();
          await shiftsView();
          toast(`Shift saved: ${weekday(s.date)} ${formatDate(s.date)}, ${formatQuantity(shiftHours(s))} h`);
        } catch (err) {
          showFieldErrors(form, err);
          out.replaceChildren(errorBox(err));
        }
      },
    },
    h("fieldset", {}, h("legend", {}, "Log a shift"), field("Participant", pSelect), h("div", { class: "grid-2" }, field("Date", date), field("Break", brk), field("Start", start), field("Finish", end)), field("Kilometres", km, "Travel with or for the participant during the shift."), details, preview, out, h("div", { class: "btn-row" }, save)),
  );
  pSelect.addEventListener("change", fillFromParticipant);
  fillFromParticipant();

  // Uninvoiced shifts, grouped by participant, ready to invoice.
  const groups = new Map<string, ShiftRecord[]>();
  for (const s of shifts) groups.set(s.participantId, [...(groups.get(s.participantId) ?? []), s]);
  const lists = [...groups.entries()].map(([pid, list]) => uninvoicedGroup(byId.get(pid), list.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))));

  shell(
    "#/shifts",
    h("h1", {}, "Shift log"),
    setup,
    form,
    h("datalist", { id: "common-items" }, COMMON_ITEMS.map((i) => h("option", { value: i.number }, i.name))),
    h("h2", {}, "Not invoiced yet"),
    lists.length ? h("div", {}, lists) : h("p", { class: "small" }, "Shifts you log appear here until you invoice them."),
    !m.paid ? h("p", { class: "small" }, `Free account: ${m.counts.shifts} of ${m.limits.shifts} shifts used.`) : null,
  );
}

function uninvoicedGroup(p: Participant | undefined, list: ShiftRecord[]): HTMLElement {
  const m = me!;
  const total = h("span", { class: "line-amount" });
  const button = h("button", { type: "button" }, "Invoice selected");
  const boxes: [HTMLInputElement, ShiftRecord][] = [];
  const recalc = () => {
    const chosen = boxes.filter(([b]) => b.checked).map(([, s]) => s);
    const t = computeTotals({ provider: m.settings.provider, lines: chosen.flatMap(shiftToLines) }).totalCents;
    total.textContent = `${chosen.length} selected: ${formatAud(t)}`;
    button.disabled = chosen.length === 0;
  };
  const items = list.map((s) => {
    const box = h("input", { type: "checkbox", checked: true, "aria-label": `Include ${formatDate(s.date)} shift`, onchange: recalc });
    boxes.push([box, s]);
    const amount = computeTotals({ provider: m.settings.provider, lines: shiftToLines(s) }).totalCents;
    return h(
      "li",
      {},
      h("label", { class: "inline-choices" }, box, h("span", {}, h("strong", {}, `${weekday(s.date)} ${formatDate(s.date)}`), h("span", { class: "meta" }, ` ${s.start} to ${s.end}, ${formatQuantity(shiftHours(s))} h${s.km ? `, ${formatQuantity(s.km)} km` : ""}`))),
      h(
        "span",
        {},
        h("strong", {}, formatAud(amount)),
        " ",
        h(
          "button",
          {
            type: "button",
            class: "quiet",
            "aria-label": `Delete shift on ${formatDate(s.date)}`,
            onclick: async () => {
              if (!confirm("Delete this shift?")) return;
              await api("DELETE", `/api/shifts/${s.id}`);
              await refreshMe();
              await shiftsView();
            },
          },
          "Delete",
        ),
      ),
    );
  });
  button.addEventListener("click", async () => {
    const shiftIds = boxes.filter(([b]) => b.checked).map(([, s]) => s.id);
    try {
      const res = await busy(button, "Making invoice...", () => api<{ id: string; warnings: { message: string }[] }>("POST", "/api/invoices", { participantId: list[0]!.participantId, shiftIds }));
      await refreshMe();
      location.hash = `#/invoices/${res.id}`;
      if (res.warnings.length) toast(res.warnings[0]!.message);
    } catch (err) {
      button.after(errorBox(err));
    }
  });
  recalc();
  return h("section", { class: "band" }, h("h3", {}, p?.name ?? "Participant"), h("ul", { class: "list" }, items), h("div", { class: "btn-row" }, button, total));
}

// ------------------------------------------------------------------ invoices

async function invoicesView(): Promise<void> {
  const { invoices } = await api<{ invoices: InvoiceSummary[] }>("GET", "/api/invoices");
  const today = me!.today;
  const overdue = invoices.filter((i) => isOverdue(i, today));
  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "draft").reduce((s, i) => s + i.totalCents, 0);
  shell(
    "#/invoices",
    h("h1", {}, "Invoices"),
    h("div", { class: "stat-grid" }, h("div", { class: "stat" }, h("b", {}, formatAud(outstanding)), "Not paid yet"), h("div", { class: "stat" }, h("b", {}, String(overdue.length)), "Overdue")),
    invoices.length
      ? h(
          "ul",
          { class: "list" },
          invoices.map((inv) =>
            h(
              "li",
              {},
              h("div", {}, h("a", { href: `#/invoices/${inv.id}` }, h("strong", {}, inv.number)), h("div", { class: "meta" }, `${inv.billToLabel} | ${formatDate(inv.issueDate)}`)),
              h("div", {}, h("strong", {}, formatAud(inv.totalCents)), " ", statusPill(inv, today)),
            ),
          ),
        )
      : h("p", {}, "No invoices yet. Log shifts, then tap Invoice selected on the Shifts tab."),
  );
}

async function invoiceDetailView(id: string): Promise<void> {
  const data = await api<{ summary: InvoiceSummary; input: InvoiceInput; footerCredit: boolean }>("GET", `/api/invoices/${id}`);
  const { summary: inv, input } = data;
  const today = me!.today;
  const totals = computeTotals(input);
  const out = h("div", { "aria-live": "polite" });

  const download = h("button", { type: "button" }, "Download PDF");
  download.addEventListener("click", async () => {
    const { renderInvoicePdf } = await import("../shared/invoicePdf.ts");
    downloadBytes(renderInvoicePdf(input, { footerCredit: data.footerCredit }), `${inv.number}.pdf`, "application/pdf");
    if (inv.status === "draft") {
      await api("POST", `/api/invoices/${inv.id}/status`, { status: "sent" });
      toast("Downloaded and marked as sent");
      await invoiceDetailView(id);
    }
  });

  const setStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    try {
      const res = await api<{ setAside?: { totalCents: number; gstCents: number; incomeTaxCents: number } }>("POST", `/api/invoices/${inv.id}/status`, { status, ...extra });
      if (res.setAside && me!.paid) toast(`Marked paid. Put aside about ${formatAud(res.setAside.totalCents)} for tax.`);
      else toast("Saved");
      await invoiceDetailView(id);
    } catch (err) {
      out.replaceChildren(errorBox(err));
    }
  };

  const paidAmount = input_("paidAmount", { inputmode: "decimal", value: centsToInput(inv.totalCents) });
  const paidDate = input_("paidAt", { type: "date", value: today });
  const payForm =
    inv.status !== "paid" && inv.status !== "void"
      ? h(
          "details",
          { class: "band" },
          h("summary", {}, "Mark as paid"),
          h("div", { class: "grid-2" }, field("Amount received ($)", paidAmount), field("Date received", paidDate)),
          h("button", { type: "button", onclick: () => setStatus("paid", { paidCents: parseDollars(paidAmount.value) ?? inv.totalCents, paidAt: paidDate.value }) }, "Save payment"),
        )
      : null;

  shell(
    "#/invoices",
    h("p", { class: "small" }, h("a", { href: "#/invoices" }, "All invoices")),
    h("h1", {}, `Invoice ${inv.number}`),
    h("p", {}, statusPill(inv, today), " ", `${input.participant?.name ?? input.billTo.name} | ${PLAN_LABELS[input.participant?.planType ?? "plan"]}`),
    h("div", { class: "stat-grid" }, h("div", { class: "stat" }, h("b", {}, formatAud(totals.totalCents)), "Total"), h("div", { class: "stat" }, h("b", {}, formatDate(inv.dueDate)), "Due"), inv.paidAt ? h("div", { class: "stat" }, h("b", {}, formatAud(inv.paidCents ?? 0)), `Paid ${formatDate(inv.paidAt)}`) : null, inv.paidAt && me!.paid && inv.setAsideCents !== null ? h("div", { class: "stat" }, h("b", {}, formatAud(inv.setAsideCents)), "Tax set-aside (estimate)") : null),
    h("div", { class: "btn-row" }, download, inv.status === "draft" ? h("button", { type: "button", class: "secondary", onclick: () => setStatus("sent") }, "Mark as sent") : null),
    isOverdue(inv, today) ? reminderControls(inv, input, () => invoiceDetailView(id)) : null,
    payForm,
    out,
    h("h2", {}, "Lines"),
    h(
      "ul",
      { class: "list" },
      totals.lines.map((l) => h("li", {}, h("div", {}, h("strong", {}, `${formatDate(l.date)} `), l.itemNumber ? h("span", { class: "meta" }, `${l.itemNumber} `) : null, h("div", { class: "meta" }, l.description)), h("div", {}, `${formatQuantity(l.quantity)} ${l.unit === "hour" ? "h" : l.unit === "km" ? "km" : ""} x ${formatAud(l.rateCents)} = `, h("strong", {}, formatAud(l.amountCents))))),
    ),
    h(
      "div",
      { class: "btn-row" },
      h(
        "button",
        {
          type: "button",
          class: "secondary",
          onclick: async () => {
            try {
              const res = await api<{ id: string }>("POST", `/api/invoices/${inv.id}/repeat`);
              await refreshMe();
              toast("Repeated with dates moved forward. Check the dates before sending.");
              location.hash = `#/invoices/${res.id}`;
            } catch (err) {
              out.replaceChildren(errorBox(err));
            }
          },
        },
        "Repeat this invoice",
      ),
      inv.status === "paid" ? h("button", { type: "button", class: "quiet", onclick: () => setStatus("sent") }, "Undo paid") : null,
      h(
        "button",
        {
          type: "button",
          class: "danger",
          onclick: async () => {
            if (!confirm(`Delete invoice ${inv.number}? Its shifts go back to the shift log.`)) return;
            await api("DELETE", `/api/invoices/${inv.id}`);
            await refreshMe();
            location.hash = "#/invoices";
          },
        },
        "Delete",
      ),
    ),
  );
}

const input_ = input;

// ------------------------------------------------------------------ participants

async function participantsView(): Promise<void> {
  const { participants } = await api<{ participants: Participant[] }>("GET", "/api/participants");
  const m = me!;
  shell(
    "#/participants",
    h("h1", {}, "Participants"),
    h("div", { class: "btn-row" }, h("a", { class: "btn", href: "#/participants/new" }, "Add a participant")),
    participants.length
      ? h("ul", { class: "list" }, participants.map((p) => h("li", {}, h("div", {}, h("a", { href: `#/participants/${p.id}` }, h("strong", {}, p.name)), h("div", { class: "meta" }, `${PLAN_LABELS[p.planType]}${p.billToName ? ` | invoices to ${p.billToName}` : ""}`)), h("span", { class: "meta" }, p.rateCents ? `${formatAud(p.rateCents)}/h` : ""))))
      : h("p", {}, "No participants yet."),
    !m.paid ? h("p", { class: "small" }, `Free account: ${m.counts.participants} of ${m.limits.participants} participants.`) : null,
    h("p", { class: "small" }, "Only enter what you need for invoices. Do not add health or diagnosis details."),
  );
}

async function participantFormView(id: string | null): Promise<void> {
  const existing = id ? (await api<{ participants: Participant[] }>("GET", "/api/participants")).participants.find((p) => p.id === id) : undefined;
  if (id && !existing) {
    shell("#/participants", h("h1", {}, "Participant not found"));
    return;
  }
  const p: Partial<Participant> = existing ?? { planType: "plan" };
  const name = input("name", { value: p.name ?? "", autocomplete: "off" });
  const ndis = input("ndisNumber", { value: p.ndisNumber ?? "", inputmode: "numeric", autocomplete: "off" });
  const plan = select("planType", [["plan", "Plan-managed"], ["self", "Self-managed"], ["ndia", "NDIA-managed"]], p.planType ?? "plan");
  const billName = input("billToName", { value: p.billToName ?? "" });
  const billEmail = input("billToEmail", { type: "email", value: p.billToEmail ?? "" });
  const billAbn = input("billToAbn", { value: p.billToAbn ?? "", inputmode: "numeric" });
  const item = input("itemNumber", { value: p.itemNumber ?? "", list: "common-items", spellcheck: "false", autocomplete: "off" });
  const desc = input("description", { value: p.description ?? "", maxlength: 200 });
  const rate = input("rateCents", { value: p.rateCents ? centsToInput(p.rateCents) : "", inputmode: "decimal" });
  const kmItem = input("kmItemNumber", { value: p.kmItemNumber ?? "", list: "common-items", spellcheck: "false", autocomplete: "off" });
  const kmRate = input("kmRateCents", { value: p.kmRateCents ? centsToInput(p.kmRateCents) : "", inputmode: "decimal" });
  const out = h("div", { "aria-live": "polite" });
  const save = h("button", { type: "submit" }, "Save participant");

  const abnButton = h("button", { type: "button", class: "quiet" }, "Look up ABN");
  abnButton.addEventListener("click", async () => {
    if (!me!.paid) {
      out.replaceChildren(upgradePrompt("ABN lookup fills in the business name from the Australian Business Register. It is part of the paid plan."));
      return;
    }
    try {
      const r = await api<{ available: boolean; entityName: string; businessName: string; status: string }>("GET", `/api/abn/${billAbn.value.replace(/\D/g, "")}`);
      if (!r.available) {
        out.replaceChildren(h("p", { class: "note" }, "ABN lookup is not switched on yet. Check the ABN at abr.business.gov.au."));
        return;
      }
      if (!billName.value) billName.value = r.businessName || r.entityName;
      out.replaceChildren(h("p", { class: "ok-box" }, `${r.businessName || r.entityName} (${r.status})`));
    } catch (err) {
      out.replaceChildren(errorBox(err));
    }
  });

  const form = h(
    "form",
    {
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault();
        out.replaceChildren();
        const body = {
          name: name.value,
          ndisNumber: ndis.value,
          planType: plan.value,
          billToName: billName.value,
          billToEmail: billEmail.value,
          billToAbn: billAbn.value,
          itemNumber: item.value,
          description: desc.value,
          rateCents: parseDollars(rate.value) ?? 0,
          kmItemNumber: kmItem.value,
          kmRateCents: parseDollars(kmRate.value) ?? 0,
        };
        try {
          await busy(save, "Saving...", () => (id ? api("PUT", `/api/participants/${id}`, body) : api("POST", "/api/participants", body)));
          await refreshMe();
          toast("Participant saved");
          location.hash = "#/participants";
        } catch (err) {
          showFieldErrors(form, err);
          out.replaceChildren(errorBox(err));
        }
      },
    },
    h("fieldset", {}, h("legend", {}, "Participant"), field("Name", name), field("NDIS number", ndis, "Printed on invoices. Encrypted when saved."), field("How the plan is managed", plan)),
    h("fieldset", {}, h("legend", {}, "Send invoices to"), field("Name (plan manager, participant or nominee)", billName), field("Email for invoices", billEmail), field("ABN (plan managers)", billAbn), abnButton),
    h("fieldset", {}, h("legend", {}, "Usual support and rates"), h("p", { class: "small" }, PRICE_GUIDE_NOTE), h("div", { class: "grid-2" }, field("Support item number", item), field("Description", desc), field("Hourly rate ($)", rate), field("Travel item number", kmItem), field("Rate per km ($)", kmRate))),
    h("datalist", { id: "common-items" }, COMMON_ITEMS.map((i) => h("option", { value: i.number }, i.name))),
    out,
    h(
      "div",
      { class: "btn-row" },
      save,
      id
        ? h(
            "button",
            {
              type: "button",
              class: "danger",
              onclick: async () => {
                if (!confirm("Remove this participant? Past invoices are kept.")) return;
                await api("DELETE", `/api/participants/${id}`);
                await refreshMe();
                location.hash = "#/participants";
              },
            },
            "Remove",
          )
        : null,
    ),
  );
  plan.addEventListener("change", () => {
    if (plan.value === "ndia") out.replaceChildren(h("p", { class: "warn" }, "NDIA-managed supports are not invoiced. Registered providers claim them in the NDIS provider portal."));
  });
  shell("#/participants", h("p", { class: "small" }, h("a", { href: "#/participants" }, "All participants")), h("h1", {}, existing ? existing.name : "Add a participant"), form);
}

// ------------------------------------------------------------------ settings

function settingsView(welcome: boolean): void {
  const s = me!.settings;
  const v = (x: string | undefined) => x ?? "";
  const fields = {
    "provider.name": input("provider.name", { value: s.provider.name, autocomplete: "name" }),
    "provider.abn": input("provider.abn", { value: s.provider.abn, inputmode: "numeric" }),
    "provider.email": input("provider.email", { type: "email", value: v(s.provider.email) }),
    "provider.phone": input("provider.phone", { type: "tel", value: v(s.provider.phone) }),
    "provider.address": input("provider.address", { value: v(s.provider.address) }),
    "provider.ndisProviderNumber": input("provider.ndisProviderNumber", { value: v(s.provider.ndisProviderNumber) }),
    "payment.accountName": input("payment.accountName", { value: v(s.payment.accountName) }),
    "payment.bsb": input("payment.bsb", { value: v(s.payment.bsb), inputmode: "numeric" }),
    "payment.accountNumber": input("payment.accountNumber", { value: v(s.payment.accountNumber), inputmode: "numeric" }),
    "payment.payId": input("payment.payId", { value: v(s.payment.payId) }),
    "payment.payLink": input("payment.payLink", { type: "url", value: v(s.payment.payLink), placeholder: "https://" }),
    invoicePrefix: input("invoicePrefix", { value: s.invoicePrefix }),
    taxPercent: input("taxPercent", { type: "number", min: 0, max: 60, value: s.taxPercent }),
  };
  const gst = select("provider.gstRegistered", [["no", "No"], ["yes", "Yes"]], s.provider.gstRegistered ? "yes" : "no");
  const terms = select("termsDays", [["7", "7 days"], ["14", "14 days"], ["30", "30 days"], ["0", "Due on receipt"]], String(s.termsDays));
  const tz = select("timeZone", AU_TIME_ZONES.map((z) => [z, z.replace("Australia/", "")]), s.timeZone);
  const notes = h("textarea", { name: "invoiceNotes", maxlength: 600 }, s.invoiceNotes);
  const out = h("div", { "aria-live": "polite" });
  const save = h("button", { type: "submit" }, "Save settings");

  const form = h(
    "form",
    {
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault();
        const f = formValues(form);
        const body: UserSettings = {
          provider: { name: f["provider.name"] ?? "", abn: f["provider.abn"] ?? "", gstRegistered: f["provider.gstRegistered"] === "yes", email: f["provider.email"], phone: f["provider.phone"], address: f["provider.address"], ndisProviderNumber: f["provider.ndisProviderNumber"] },
          payment: { accountName: f["payment.accountName"], bsb: f["payment.bsb"], accountNumber: f["payment.accountNumber"], payId: f["payment.payId"], payLink: f["payment.payLink"] },
          invoicePrefix: f.invoicePrefix ?? "INV-",
          termsDays: Number(f.termsDays),
          taxPercent: Number(f.taxPercent),
          timeZone: f.timeZone ?? "Australia/Sydney",
          reminders: s.reminders,
          invoiceNotes: f.invoiceNotes ?? "",
        };
        try {
          await busy(save, "Saving...", () => api("PUT", "/api/settings", body));
          await refreshMe();
          toast("Settings saved");
          out.replaceChildren();
        } catch (err) {
          showFieldErrors(form, err);
          out.replaceChildren(errorBox(err));
        }
      },
    },
    welcome ? h("div", { class: "note" }, "Welcome. Add your details once and every invoice is filled in from here.") : null,
    h(
      "fieldset",
      {},
      h("legend", {}, "Your details"),
      field("Name or business name", fields["provider.name"]),
      field("ABN", fields["provider.abn"]),
      field("Registered for GST?", gst, "If No, invoices never show GST."),
      h("div", { class: "grid-2" }, field("Email", fields["provider.email"]), field("Phone", fields["provider.phone"])),
      field("Address (optional)", fields["provider.address"]),
      field("NDIS registration number (registered providers only)", fields["provider.ndisProviderNumber"]),
    ),
    h("fieldset", {}, h("legend", {}, "How you get paid"), h("div", { class: "grid-2" }, field("Account name", fields["payment.accountName"]), field("BSB", fields["payment.bsb"]), field("Account number", fields["payment.accountNumber"]), field("PayID", fields["payment.payId"])), field("Payment link (optional)", fields["payment.payLink"])),
    h(
      "fieldset",
      {},
      h("legend", {}, "Invoices"),
      h("div", { class: "grid-2" }, field("Invoice number prefix", fields.invoicePrefix, `Next: ${me!.nextInvoiceNumber}`), field("Payment terms", terms), field("Tax set-aside (%)", fields.taxPercent, "An estimate to budget with, not tax advice."), field("Time zone", tz)),
      field("Note on every invoice (optional)", notes),
    ),
    out,
    h("div", { class: "btn-row" }, save),
  );
  shell("#/settings", h("h1", {}, "Settings"), form, accountSection());
}

function accountSection(): HTMLElement {
  const out = h("div", { "aria-live": "polite" });
  const pwPrompt = (label: string) => prompt(label) ?? "";
  return h(
    "section",
    {},
    h("h2", {}, "Account"),
    h("p", {}, `Signed in as ${me!.email}. `, h("a", { href: "#/billing" }, me!.paid ? "Manage billing" : "Upgrade")),
    h(
      "div",
      { class: "btn-row" },
      h("button", { type: "button", class: "secondary", onclick: async () => { await api("POST", "/api/auth/logout"); me = null; location.hash = "#/login"; } }, "Log out"),
      h(
        "button",
        {
          type: "button",
          class: "quiet",
          onclick: async () => {
            const currentPassword = pwPrompt("Current password");
            const newPassword = pwPrompt("New password (at least 10 characters)");
            if (!currentPassword || !newPassword) return;
            try {
              await api("POST", "/api/account/password", { currentPassword, newPassword });
              toast("Password changed. Other devices are logged out.");
            } catch (err) {
              out.replaceChildren(errorBox(err));
            }
          },
        },
        "Change password",
      ),
      h(
        "button",
        {
          type: "button",
          class: "quiet",
          onclick: async () => {
            const password = pwPrompt("Enter your password to get a new recovery code");
            if (!password) return;
            try {
              const r = await api<{ recoveryCode: string }>("POST", "/api/account/recovery-code", { password });
              recoveryCodeView(r.recoveryCode, "#/settings");
            } catch (err) {
              out.replaceChildren(errorBox(err));
            }
          },
        },
        "New recovery code",
      ),
    ),
    h("p", { class: "small" }, "Export your records from the Money tab. "),
    h(
      "button",
      {
        type: "button",
        class: "danger",
        onclick: async () => {
          const password = pwPrompt("This deletes your account, participants, shifts and invoices, and cancels any subscription. Enter your password to confirm.");
          if (!password) return;
          try {
            await api("DELETE", "/api/account", { password });
            me = null;
            location.href = "/";
          } catch (err) {
            out.replaceChildren(errorBox(err));
          }
        },
      },
      "Delete my account",
    ),
    out,
  );
}

// ------------------------------------------------------------------ router

async function route(): Promise<void> {
  const [path = "", query = ""] = location.hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  if (path === "/signup") return signupView();
  if (path === "/login") return loginView();
  if (path === "/recover") return recoverView();
  try {
    if (!me) await refreshMe();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      location.hash = "#/login";
      return;
    }
    throw err;
  }
  const parts = path.split("/").filter(Boolean);
  switch (parts[0]) {
    case "invoices":
      return parts[1] ? invoiceDetailView(parts[1]) : invoicesView();
    case "participants":
      return parts[1] === "new" ? participantFormView(null) : parts[1] ? participantFormView(parts[1]) : participantsView();
    case "settings":
      return settingsView(params.get("welcome") === "1");
    case "money":
      return moneyView(shell);
    case "billing":
      return billingView(shell, params);
    default:
      return shiftsView();
  }
}

async function render(): Promise<void> {
  try {
    await route();
  } catch (err) {
    console.error(err);
    root.replaceChildren(h("div", { class: "wrap narrow" }, h("h1", {}, "Something went wrong"), errorBox(err), h("p", {}, h("a", { href: "#/shifts" }, "Back to the shift log"))));
  }
}

captureAttribution();
window.addEventListener("hashchange", () => void render());
void render();
