import { COMMON_ITEMS, PRICE_GUIDE_NOTE } from "../../shared/config.ts";
import { esc } from "../layout.ts";

/** The free, no-login invoice form. Used by the NDIS and general template pages. */
export function generatorForm(mode: "ndis" | "general"): string {
  const ndis = mode === "ndis";
  const field = (name: string, label: string, opts: { type?: string; hint?: string; autocomplete?: string; inputmode?: string; required?: boolean; placeholder?: string } = {}) => `
    <div class="field">
      <label for="f-${name}">${label}${opts.required ? "" : ' <span class="small">(optional)</span>'}</label>
      <input id="f-${name}" name="${name}" type="${opts.type ?? "text"}"${opts.autocomplete ? ` autocomplete="${opts.autocomplete}"` : ""}${opts.inputmode ? ` inputmode="${opts.inputmode}"` : ""}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ""} aria-describedby="m-${name}${opts.hint ? ` h-${name}` : ""}">
      ${opts.hint ? `<span class="hint" id="h-${name}">${opts.hint}</span>` : ""}
      <span class="field-msg" id="m-${name}" aria-live="polite"></span>
    </div>`;

  return `
<form id="invoice-form" class="generator" data-mode="${mode}" novalidate>
  <noscript><p class="warn">The invoice maker needs JavaScript to build the PDF in your browser.</p></noscript>
  <p class="note">No sign-up. Everything you type stays in this browser on this device. The PDF is made on your phone or computer, not on our servers.</p>

  <fieldset>
    <legend>Your details</legend>
    <div class="grid-2">
      ${field("provider.name", "Your name or business name", { autocomplete: "name", required: true })}
      ${field("provider.abn", "ABN", { inputmode: "numeric", hint: "11 digits. We check it against the ATO check-digit rule.", required: true })}
      ${field("provider.email", "Email", { type: "email", autocomplete: "email" })}
      ${field("provider.phone", "Phone", { type: "tel", autocomplete: "tel" })}
    </div>
    ${field("provider.address", "Business address", { autocomplete: "street-address" })}
    <div class="field">
      <span class="label" id="gst-label">Are you registered for GST?</span>
      <div class="inline-choices" role="radiogroup" aria-labelledby="gst-label">
        <label><input type="radio" name="provider.gstRegistered" value="no" checked> No</label>
        <label><input type="radio" name="provider.gstRegistered" value="yes"> Yes</label>
      </div>
      <span class="hint">Most sole traders earning under $75,000 a year are not registered. If you are not registered, the invoice will not show GST.</span>
    </div>
    ${ndis ? field("provider.ndisProviderNumber", "NDIS registration number", { hint: "Only if you are a registered NDIS provider." }) : ""}
  </fieldset>

  ${
    ndis
      ? `<fieldset>
    <legend>Participant</legend>
    <div class="grid-2">
      ${field("participant.name", "Participant name", { required: true })}
      ${field("participant.ndisNumber", "NDIS number", { inputmode: "numeric", hint: "Usually 9 digits. It is printed on the invoice and kept only in this browser.", required: true })}
    </div>
    <div class="field">
      <span class="label" id="plan-label">How is the plan managed?</span>
      <div class="inline-choices" role="radiogroup" aria-labelledby="plan-label">
        <label><input type="radio" name="participant.planType" value="plan" checked> Plan-managed</label>
        <label><input type="radio" name="participant.planType" value="self"> Self-managed</label>
        <label><input type="radio" name="participant.planType" value="ndia"> NDIA-managed</label>
      </div>
      <span class="field-msg" id="m-participant.planType" aria-live="polite"></span>
    </div>
  </fieldset>`
      : ""
  }

  <fieldset>
    <legend>${ndis ? "Send the invoice to" : "Bill to"}</legend>
    <div class="grid-2">
      ${field("billTo.name", ndis ? '<span data-billto-label>Plan manager name</span>' : "Customer name", { required: true })}
      ${field("billTo.email", ndis ? "Invoice email address" : "Customer email", { type: "email" })}
      ${ndis ? "" : field("billTo.abn", "Customer ABN", { inputmode: "numeric" })}
      ${ndis ? "" : field("billTo.address", "Customer address")}
    </div>
  </fieldset>

  <fieldset>
    <legend>Invoice</legend>
    <div class="grid-2">
      ${field("number", "Invoice number", { required: true, hint: "Numbers go up by one each time you download." })}
      ${field("issueDate", "Invoice date", { type: "date", required: true })}
      <div class="field">
        <label for="f-terms">Payment terms</label>
        <select id="f-terms" name="terms">
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
          <option value="0">Due on receipt</option>
        </select>
      </div>
      ${field("dueDate", "Due date", { type: "date", required: true })}
    </div>
  </fieldset>

  <fieldset>
    <legend>${ndis ? "Supports delivered" : "Work done"}</legend>
    ${ndis ? `<p class="small">${esc(PRICE_GUIDE_NOTE)}</p>` : ""}
    <div id="lines" aria-live="polite"></div>
    <div class="btn-row">
      <button type="button" class="secondary" id="add-line">Add a line</button>
      <button type="button" class="secondary" id="add-km">Add travel (km)</button>
    </div>
    <span class="field-msg" id="m-lines" aria-live="polite"></span>
    <datalist id="common-items">
      ${COMMON_ITEMS.map((i) => `<option value="${i.number}">${esc(i.name)}</option>`).join("")}
    </datalist>
  </fieldset>

  <fieldset>
    <legend>How you get paid</legend>
    <div class="grid-2">
      ${field("payment.accountName", "Account name")}
      ${field("payment.bsb", "BSB", { inputmode: "numeric" })}
      ${field("payment.accountNumber", "Account number", { inputmode: "numeric" })}
      ${field("payment.payId", "PayID", { hint: "Email, mobile or ABN registered as a PayID with your bank." })}
    </div>
    ${field("payment.payLink", "Payment link", { type: "url", placeholder: "https://", hint: "A card payment link if you have one. It becomes a QR code on the invoice." })}
    <span class="field-msg" id="m-payment" aria-live="polite"></span>
  </fieldset>

  <fieldset>
    <legend>Notes</legend>
    <div class="field">
      <label for="f-notes">Notes on the invoice <span class="small">(optional)</span></label>
      <textarea id="f-notes" name="notes" maxlength="600" aria-describedby="h-notes"></textarea>
      <span class="hint" id="h-notes">Do not include health or diagnosis details. Invoices only need the support, date, hours and amount.</span>
    </div>
  </fieldset>

  <div id="form-errors" class="error-box hidden" role="alert" tabindex="-1"></div>
  <div id="form-done" class="ok-box hidden" role="status" tabindex="-1"></div>

  <div class="sticky-bar">
    <div class="wrap">
      <div><span class="total-label">Total</span><span class="total-value" id="total">$0.00</span></div>
      <button type="submit" id="download">Download PDF</button>
    </div>
  </div>
  <div class="btn-row">
    <button type="button" class="quiet" id="new-invoice">Start the next invoice</button>
    <button type="button" class="quiet" id="clear-data">Clear my saved details</button>
  </div>
</form>`;
}
