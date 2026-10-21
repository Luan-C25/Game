// The ShiftBill template pack: three editable Word documents and a read-me, zipped.
// Content is general and must be adapted by the buyer. Reviewed 21 October 2026.

import { docx, zip, type Block } from "./docx.ts";

const FOOTER = "ShiftBill template pack (October 2026). A starting point only, not legal, tax or NDIS compliance advice.";

const serviceAgreement: Block[] = [
  { type: "title", text: "Service agreement" },
  { type: "small", text: "Template for an independent support worker and an NDIS participant. Replace everything in [square brackets], delete what does not apply, and keep a signed copy each. The NDIS recommends a written service agreement, and a written agreement is one of the conditions for many supports to be GST-free. Have it checked by a lawyer if your situation is unusual." },

  { type: "h1", text: "1. The parties" },
  { type: "table", header: ["", "Details"], widths: [3000, 6600], rows: [
    ["Participant", "[Full name]"],
    ["NDIS number", "[9 digits]"],
    ["Participant's representative (if any)", "[Name, relationship, contact details]"],
    ["Support worker", "[Your full name or business name]"],
    ["ABN", "[Your ABN]"],
    ["Contact details", "[Phone and email]"],
  ] },

  { type: "h1", text: "2. How the plan is managed and who pays" },
  { type: "p", text: "The participant's NDIS plan is [plan-managed / self-managed]." },
  { type: "p", text: "Invoices will be sent to [plan manager name and invoice email address / the participant or their nominee at email address]." },
  { type: "p", text: "Plan dates: [start date] to [end date]. This agreement covers supports delivered within the plan dates unless both parties agree otherwise in writing." },

  { type: "h1", text: "3. Supports to be provided" },
  { type: "p", text: "The support worker will provide the following supports. Rates will not be more than the NDIS price limit for the item at the time the support is delivered (for plan-managed participants)." },
  { type: "table", header: ["Support", "Support item number", "Rate", "How often / hours"], widths: [3000, 2400, 1700, 2500], rows: [
    ["[for example: Assistance with self-care, weekday daytime]", "[item number]", "$[ ] per hour", "[for example: Tue and Thu, 9am to 12pm]"],
    ["[ ]", "[ ]", "$[ ]", "[ ]"],
    ["[ ]", "[ ]", "$[ ]", "[ ]"],
  ] },
  { type: "p", text: "Item numbers and price limits change, usually each July. If a price limit changes, the rate will change to [the new price limit / the rate in this table, if it is still within the limit] from the date it takes effect. The support worker will tell the participant in writing before any change." },

  { type: "h1", text: "4. Travel" },
  { type: "bullet", text: "Travel with or for the participant during a support (for example, driving to an appointment) will be charged at $[ ] per kilometre under item [ ]." },
  { type: "bullet", text: "Travel to and from the participant: [not charged / charged as allowed by the current NDIS pricing arrangements, at $[ ] per hour and $[ ] per kilometre]." },
  { type: "bullet", text: "Kilometres will be shown as a separate line on each invoice." },

  { type: "h1", text: "5. Cancellations" },
  { type: "p", text: "If the participant cancels with less than [the notice period allowed by the current NDIS pricing arrangements, for example 7 clear days] notice, the support worker may charge [up to 100% / an agreed percentage] of the agreed fee for that support, as allowed by the current NDIS pricing arrangements. If the support worker cancels, they will give as much notice as possible and will not charge." },

  { type: "h1", text: "6. Invoices and payment" },
  { type: "bullet", text: "Invoices will be sent [weekly / fortnightly / monthly] and will show the date, support item number, hours and rate for each support." },
  { type: "bullet", text: "Payment terms: [7 / 14] days from the invoice date." },
  { type: "bullet", text: "The support worker [is / is not] registered for GST. [If registered: supports under this agreement are intended to be GST-free supplies where the conditions in the GST law are met.]" },

  { type: "h1", text: "7. What each party agrees to" },
  { type: "h2", text: "The support worker will" },
  { type: "bullet", text: "provide supports safely, respectfully and as agreed, following the NDIS Code of Conduct" },
  { type: "bullet", text: "hold a current NDIS Worker Screening Check and [first aid certificate / public liability insurance]" },
  { type: "bullet", text: "keep the participant's information private and use it only to provide and invoice supports" },
  { type: "bullet", text: "keep records of supports delivered (shift notes) and share them with the participant on request" },
  { type: "bullet", text: "tell the participant as early as possible if they cannot attend" },
  { type: "h2", text: "The participant (or representative) will" },
  { type: "bullet", text: "treat the support worker with respect and provide a safe place to work" },
  { type: "bullet", text: "give the agreed notice when cancelling" },
  { type: "bullet", text: "tell the support worker about changes to the plan, plan management or funding that affect this agreement" },
  { type: "bullet", text: "make sure invoices are paid, or passed to the plan manager, on time" },

  { type: "h1", text: "8. Privacy and consent" },
  { type: "p", text: "The participant agrees that the support worker may share the information needed for invoicing (name, NDIS number, dates, supports and amounts) with [the plan manager] and with the invoicing software the support worker uses. Other information will only be shared with the participant's consent or where the law requires it." },

  { type: "h1", text: "9. Feedback and complaints" },
  { type: "p", text: "The participant can raise any concern with the support worker directly, by phone or email. If the participant is not happy with the response, they can contact the NDIS Quality and Safeguards Commission on 1800 035 544 or at ndiscommission.gov.au." },

  { type: "h1", text: "10. Changing or ending this agreement" },
  { type: "p", text: "Changes must be agreed in writing by both parties. Either party can end this agreement by giving [14 days] written notice, or straight away if there is a serious breach or a risk to safety." },
  { type: "p", text: "This agreement starts on [date] and continues until [date / the end of the participant's current plan], unless ended earlier." },

  { type: "h1", text: "11. Signatures" },
  { type: "fill", label: "Participant or representative: name, signature and date", lines: 2 },
  { type: "fill", label: "Support worker: name, signature and date", lines: 2 },
];

const shiftNote: Block[] = [
  { type: "title", text: "Shift note" },
  { type: "small", text: "One note per shift. Write what happened, in plain, factual and respectful language, as if the participant will read it (they may). Do not diagnose or give opinions on health. Store notes securely." },
  { type: "table", header: ["", ""], widths: [3000, 6600], rows: [
    ["Participant", ""],
    ["Date", ""],
    ["Start and finish time", ""],
    ["Breaks", ""],
    ["Support item number", ""],
    ["Kilometres with or for the participant", ""],
  ] },
  { type: "fill", label: "Supports provided (what you did together)", lines: 4 },
  { type: "fill", label: "Goals worked on and progress (in the participant's words where possible)", lines: 3 },
  { type: "fill", label: "Things the participant asked for or wants to change", lines: 2 },
  { type: "fill", label: "Observations (facts only, for example 'ate a full lunch', 'said they were tired')", lines: 3 },
  { type: "h2", text: "Incidents" },
  { type: "check", text: "No incidents" },
  { type: "check", text: "Incident or near miss: describe what happened, what you did, and who you told. Follow your incident process and any reporting obligations." },
  { type: "fill", label: "Details", lines: 3 },
  { type: "fill", label: "Support worker name and signature", lines: 1 },
  { type: "h2", text: "Good shift notes" },
  { type: "bullet", text: "Write them at the end of the shift, while you remember." },
  { type: "bullet", text: "Use facts you saw or heard, not guesses or labels." },
  { type: "bullet", text: "Keep invoices separate: invoices need dates, items, hours and amounts, not care details." },
];

const onboarding: Block[] = [
  { type: "title", text: "Onboarding checklist for independent support workers" },
  { type: "small", text: "A list of things to sort out before and after you start with a new participant. Requirements depend on your situation and change over time, so check each item with the source named." },
  { type: "h1", text: "Before you start work as a sole trader" },
  { type: "check", text: "ABN (free from the Australian Business Register)" },
  { type: "check", text: "NDIS Worker Screening Check (apply through your state or territory screening unit)" },
  { type: "check", text: "NDIS Worker Orientation Module 'Quality, Safety and You' completed (free, from the NDIS Commission)" },
  { type: "check", text: "First aid and CPR certificates, if you or your participants need them" },
  { type: "check", text: "Insurance: public liability and professional indemnity, if needed for your work (ask a broker)" },
  { type: "check", text: "Decide whether to register for GST (required at $75,000 turnover a year; ask an accountant)" },
  { type: "check", text: "Separate bank account for tax savings, and a percentage to set aside from each payment" },
  { type: "check", text: "PayID set up with your bank" },
  { type: "check", text: "Invoice template or software with sequential invoice numbers" },
  { type: "check", text: "Understand the NDIS Code of Conduct" },
  { type: "h1", text: "With each new participant" },
  { type: "check", text: "First meeting: what supports they want, goals, days and times, and any risks" },
  { type: "check", text: "How their plan is managed (plan-managed, self-managed or NDIA-managed)" },
  { type: "check", text: "Plan manager's name and invoice email address, or the participant's for self-managed" },
  { type: "check", text: "Plan start and end dates" },
  { type: "check", text: "Support item numbers and rates agreed, checked against the current NDIS price limits" },
  { type: "check", text: "Travel and kilometre charges agreed" },
  { type: "check", text: "Cancellation terms agreed" },
  { type: "check", text: "Service agreement signed and a copy given to the participant" },
  { type: "check", text: "Consent to share invoicing information with the plan manager" },
  { type: "check", text: "Emergency contacts and any important safety information" },
  { type: "check", text: "How the participant prefers to be contacted" },
  { type: "h1", text: "Every week or fortnight" },
  { type: "check", text: "Shift notes written for every shift" },
  { type: "check", text: "Kilometres logged" },
  { type: "check", text: "Invoice sent" },
  { type: "check", text: "Overdue invoices followed up" },
  { type: "check", text: "Tax set-aside moved to savings" },
  { type: "h1", text: "Each July" },
  { type: "check", text: "Check the new NDIS price limits and item numbers, and update your rates and service agreements" },
  { type: "check", text: "Tax return, or send records to your accountant" },
  { type: "check", text: "Renew insurance and certificates that expire" },
];

const README = `ShiftBill template pack
=======================

Thank you for buying the pack.

Files:
- Service agreement.docx
- Shift note.docx
- Onboarding checklist.docx

They open in Microsoft Word, Google Docs (upload, then open with Google Docs),
Apple Pages and LibreOffice. Replace everything in [square brackets].

These templates are a starting point. They are not legal, tax or NDIS
compliance advice. NDIS rules and price limits change, usually each July.

You may use and edit these templates in your own work. Please do not resell
or share the pack.

Questions: reply to your Stripe receipt or use the contact address on the
ShiftBill website.
`;

export function buildPack(): Uint8Array {
  return zip([
    ["ShiftBill template pack/Service agreement.docx", docx(serviceAgreement, FOOTER)],
    ["ShiftBill template pack/Shift note.docx", docx(shiftNote, FOOTER)],
    ["ShiftBill template pack/Onboarding checklist.docx", docx(onboarding, FOOTER)],
    ["ShiftBill template pack/README.txt", README.replace(/\n/g, "\r\n")],
  ]);
}
