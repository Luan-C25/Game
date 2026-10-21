import { computeTotals, nextInvoiceNumber, validateInvoice, type InvoiceInput, type InvoiceLine, type Issue, type PlanType, type Unit } from "../shared/invoice.ts";
import { formatAud, parseDollars, parseQuantity } from "../shared/money.ts";
import { addDays } from "../shared/dates.ts";
import { formatAbn, isValidAbn } from "../shared/validate.ts";
import { captureAttribution, track } from "./track.ts";
import { $, downloadBytes, localToday, showIssues } from "./dom.ts";

const STORE = "shiftbill.generator.v1";

interface LineDraft {
  date: string;
  itemNumber: string;
  description: string;
  quantity: string;
  unit: Unit;
  rate: string;
  gstFree: boolean;
}

interface Saved {
  fields: Record<string, string>;
  lines: LineDraft[];
  lastNumber?: string;
}

const form = $<HTMLFormElement>("#invoice-form");
const mode = form.dataset.mode === "general" ? "general" : "ndis";
const linesEl = $("#lines");
let lines: LineDraft[] = [];

// Fields that are remembered between invoices. Line items and dates are per invoice.
const PERSISTENT = [
  "provider.name", "provider.abn", "provider.email", "provider.phone", "provider.address", "provider.gstRegistered",
  "provider.ndisProviderNumber", "participant.name", "participant.ndisNumber", "participant.planType", "billTo.name",
  "billTo.email", "billTo.abn", "billTo.address", "payment.accountName", "payment.bsb", "payment.accountNumber",
  "payment.payId", "payment.payLink", "terms", "notes",
];

function load(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "null") as Saved | null;
  } catch {
    return null;
  }
}

function save(extra: Partial<Saved> = {}): void {
  try {
    const prev = load();
    const fields: Record<string, string> = {};
    for (const name of [...PERSISTENT, "number", "issueDate", "dueDate"]) fields[name] = getValue(name);
    localStorage.setItem(STORE, JSON.stringify({ fields, lines, lastNumber: prev?.lastNumber, ...extra }));
  } catch {
    /* storage full or blocked: the form still works */
  }
}

function getValue(name: string): string {
  const els = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
  if (els.length === 0) return "";
  const first = els[0]!;
  if (first.type === "radio") return [...els].find((e) => e.checked)?.value ?? "";
  return first.value;
}

function setValue(name: string, value: string): void {
  const els = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
  els.forEach((el) => {
    if (el.type === "radio") el.checked = el.value === value;
    else el.value = value;
  });
}

function blankLine(unit: Unit = "hour"): LineDraft {
  const prev = lines[lines.length - 1];
  return {
    date: prev?.date ?? localToday(),
    itemNumber: unit === "km" ? "" : (prev?.itemNumber ?? ""),
    description: unit === "km" ? "Travel with or for participant" : (prev?.unit === "hour" ? prev.description : ""),
    quantity: "",
    unit,
    rate: unit === "km" ? "" : (prev?.unit === "hour" ? prev.rate : ""),
    gstFree: mode === "ndis",
  };
}

function gstRegistered(): boolean {
  return getValue("provider.gstRegistered") === "yes";
}

function renderLines(): void {
  const showGst = gstRegistered();
  linesEl.innerHTML = "";
  lines.forEach((line, i) => {
    const row = document.createElement("div");
    row.className = "line";
    row.dataset.index = String(i);
    const id = (k: string) => `l${i}-${k}`;
    row.innerHTML = `
      <div class="line-head"><strong>Line ${i + 1}</strong>
        <button type="button" class="quiet" data-remove aria-label="Remove line ${i + 1}">Remove</button></div>
      <div class="line-grid${mode === "ndis" ? "" : " general"}">
        <div class="field"><label for="${id("date")}">Date</label><input id="${id("date")}" type="date" data-k="date"></div>
        ${mode === "ndis" ? `<div class="field"><label for="${id("item")}">Support item number</label><input id="${id("item")}" type="text" list="common-items" data-k="itemNumber" autocomplete="off" spellcheck="false"></div>` : ""}
        <div class="field span-2"><label for="${id("desc")}">Description</label><input id="${id("desc")}" type="text" data-k="description" maxlength="200"></div>
        <div class="field"><label for="${id("qty")}">${line.unit === "km" ? "Kilometres" : line.unit === "hour" ? "Hours" : "Quantity"}</label><input id="${id("qty")}" type="text" inputmode="decimal" data-k="quantity" placeholder="${line.unit === "hour" ? "e.g. 2.5" : ""}"></div>
        <div class="field"><label for="${id("rate")}">Rate ($ per ${line.unit === "km" ? "km" : line.unit === "hour" ? "hour" : "item"})</label><input id="${id("rate")}" type="text" inputmode="decimal" data-k="rate"></div>
      </div>
      <div class="btn-row">
        <label class="inline-choices"><span class="visually-hidden">Unit for line ${i + 1}</span>
          <select data-k="unit" aria-label="Unit for line ${i + 1}">
            <option value="hour">Hours</option><option value="km">Kilometres</option><option value="each">Each</option>
          </select></label>
        <label class="inline-choices${showGst ? "" : " hidden"}"><input type="checkbox" data-k="gstFree"> GST-free</label>
        <span class="line-amount" data-amount></span>
      </div>
      <span class="field-msg" data-msg aria-live="polite"></span>`;
    for (const el of row.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-k]")) {
      const k = el.dataset.k as keyof LineDraft;
      if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = Boolean(line[k]);
      else el.value = String(line[k] ?? "");
    }
    linesEl.appendChild(row);
  });
  updateTotals();
}

linesEl.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  const row = el.closest<HTMLElement>(".line");
  if (!row || !el.dataset.k) return;
  const line = lines[Number(row.dataset.index)];
  if (!line) return;
  const k = el.dataset.k as keyof LineDraft;
  if (el instanceof HTMLInputElement && el.type === "checkbox") (line as unknown as Record<string, unknown>)[k] = el.checked;
  else (line as unknown as Record<string, unknown>)[k] = el.value;
  if (k === "unit") renderLines();
  else updateTotals();
  save();
});

linesEl.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-remove]");
  if (!btn) return;
  const row = btn.closest<HTMLElement>(".line");
  lines.splice(Number(row?.dataset.index), 1);
  if (lines.length === 0) lines.push(blankLine());
  renderLines();
  save();
});

function toLines(): InvoiceLine[] {
  return lines.map((l) => ({
    date: l.date,
    itemNumber: l.itemNumber.trim(),
    description: l.description.trim(),
    quantity: parseQuantity(l.quantity) ?? 0,
    unit: l.unit,
    rateCents: parseDollars(l.rate) ?? 0,
    gstFree: gstRegistered() ? l.gstFree : true,
  }));
}

function buildInput(): InvoiceInput {
  const v = getValue;
  const opt = (name: string) => v(name).trim() || undefined;
  return {
    mode,
    number: v("number").trim(),
    issueDate: v("issueDate"),
    dueDate: v("dueDate"),
    provider: {
      name: v("provider.name").trim(),
      abn: v("provider.abn").trim() ? formatAbn(v("provider.abn")) : "",
      gstRegistered: gstRegistered(),
      ndisProviderNumber: opt("provider.ndisProviderNumber"),
      address: opt("provider.address"),
      email: opt("provider.email"),
      phone: opt("provider.phone"),
    },
    billTo: { name: v("billTo.name").trim(), email: opt("billTo.email"), abn: opt("billTo.abn"), address: opt("billTo.address") },
    participant: mode === "ndis" ? { name: v("participant.name").trim(), ndisNumber: v("participant.ndisNumber").replace(/\s/g, ""), planType: (v("participant.planType") || "plan") as PlanType } : undefined,
    lines: toLines(),
    payment: { accountName: opt("payment.accountName"), bsb: opt("payment.bsb"), accountNumber: opt("payment.accountNumber"), payId: opt("payment.payId"), payLink: opt("payment.payLink") },
    notes: opt("notes"),
  };
}

function updateTotals(): void {
  const input = buildInput();
  const totals = computeTotals(input);
  $("#total").textContent = formatAud(totals.totalCents);
  linesEl.querySelectorAll<HTMLElement>(".line").forEach((row, i) => {
    const amount = totals.lines[i]?.amountCents ?? 0;
    row.querySelector("[data-amount]")!.textContent = amount ? `Line total ${formatAud(amount)}` : "";
  });
}

function updateDueDate(): void {
  const issue = getValue("issueDate");
  const days = Number(getValue("terms"));
  if (issue) setValue("dueDate", addDays(issue, days));
}

function updatePlanType(): void {
  const label = form.querySelector("[data-billto-label]");
  const plan = getValue("participant.planType");
  if (label) label.textContent = plan === "self" ? "Participant or nominee name" : "Plan manager name";
  const msg = document.getElementById("m-participant.planType");
  if (msg) {
    msg.className = "field-msg warning";
    msg.textContent =
      plan === "ndia"
        ? "NDIA-managed supports are not invoiced. Registered providers claim through the NDIS provider portal, and unregistered providers cannot be paid from NDIA-managed funds."
        : "";
  }
}

function checkAbn(): void {
  const abn = getValue("provider.abn");
  const msg = document.getElementById("m-provider.abn")!;
  if (!abn.trim()) {
    msg.textContent = "";
    return;
  }
  const ok = isValidAbn(abn);
  msg.className = `field-msg ${ok ? "" : "error"}`;
  msg.textContent = ok ? "ABN format checks out." : "This ABN does not pass the ATO check. Check for a typo.";
}

form.addEventListener("input", (e) => {
  const name = (e.target as HTMLInputElement).name;
  if (!name) return;
  if (name === "issueDate" || name === "terms") updateDueDate();
  if (name === "participant.planType") updatePlanType();
  if (name === "provider.abn") checkAbn();
  if (name === "provider.gstRegistered") renderLines();
  updateTotals();
  save();
});

$("#add-line").addEventListener("click", () => {
  lines.push(blankLine("hour"));
  renderLines();
  focusLastLine();
});

$("#add-km").addEventListener("click", () => {
  lines.push(blankLine("km"));
  renderLines();
  focusLastLine();
});

function focusLastLine(): void {
  linesEl.querySelector<HTMLInputElement>(".line:last-child input[data-k='quantity']")?.focus();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = buildInput();
  const result = validateInvoice(input);
  const doneBox = $("#form-done");
  doneBox.classList.add("hidden");
  showIssues(form, result.errors, result.warnings, lineMessage);
  if (result.errors.length) return;
  const button = $<HTMLButtonElement>("#download");
  button.disabled = true;
  button.textContent = "Making PDF...";
  try {
    const { renderInvoicePdf } = await import("../shared/invoicePdf.ts");
    downloadBytes(renderInvoicePdf(input, { footerCredit: true }), `${input.number.replace(/[^\w.-]+/g, "-")}.pdf`, "application/pdf");
    save({ lastNumber: input.number });
    track("generator_complete");
    doneBox.innerHTML = `<strong>Your invoice ${escapeHtml(input.number)} has downloaded.</strong>
      <p>Next time, start from <em>Start the next invoice</em> and your details will already be filled in.</p>
      <p>If you invoice every week or fortnight, the <a href="/pricing/">shift log</a> turns each logged shift into an invoice line in one tap. You can try it with a free account.</p>`;
    doneBox.classList.remove("hidden");
    doneBox.focus();
  } catch (err) {
    console.error(err);
    showIssues(form, [{ field: "form", message: "Sorry, the PDF could not be made in this browser. Try another browser, or email us." }], [], lineMessage);
  } finally {
    button.disabled = false;
    button.textContent = "Download PDF";
  }
});

function lineMessage(issue: Issue): HTMLElement | null {
  const m = /^lines\.(\d+)\./.exec(issue.field);
  if (!m) return null;
  return linesEl.querySelector<HTMLElement>(`.line[data-index="${m[1]}"] [data-msg]`);
}

$("#new-invoice").addEventListener("click", () => {
  const saved = load();
  setValue("number", nextInvoiceNumber(saved?.lastNumber ?? getValue("number")));
  setValue("issueDate", localToday());
  updateDueDate();
  lines = [blankLine()];
  lines[0]!.quantity = "";
  renderLines();
  save();
  $("#form-done").classList.add("hidden");
  form.querySelector<HTMLInputElement>(".line input[data-k='date']")?.focus();
});

$("#clear-data").addEventListener("click", () => {
  if (!confirm("Clear all details saved in this browser, including bank details and the participant's NDIS number?")) return;
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* ignore */
  }
  form.reset();
  init();
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function init(): void {
  const saved = load();
  if (saved) for (const [k, v] of Object.entries(saved.fields)) setValue(k, v);
  if (!getValue("number")) setValue("number", nextInvoiceNumber(saved?.lastNumber));
  if (!getValue("issueDate")) setValue("issueDate", localToday());
  if (!getValue("terms")) setValue("terms", "7");
  if (!getValue("dueDate")) updateDueDate();
  lines = saved?.lines?.length ? saved.lines : [blankLine()];
  renderLines();
  updatePlanType();
  checkAbn();
}

captureAttribution();
init();
