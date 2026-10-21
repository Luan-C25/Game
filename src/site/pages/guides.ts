import { PRICE_GUIDE_NOTE } from "../../shared/config.ts";
import { faq, breadcrumbs, type Page, type SiteContext } from "../layout.ts";

interface Guide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  updated: string;
  body: string;
  faq: [string, string][];
}

const UPDATED = "21 October 2026";

const GUIDES: Guide[] = [
  {
    slug: "how-to-invoice-an-ndis-participant",
    title: "How to invoice an NDIS participant: a guide for support workers",
    h1: "How to invoice an NDIS participant",
    description: "A plain guide for independent support workers: who to send the invoice to, what to put on it, support item numbers, travel, GST and the mistakes that get invoices rejected.",
    updated: UPDATED,
    body: `
<p>If you work directly for NDIS participants rather than through an agency or a platform, you need to invoice for your work. This guide covers what plan managers and self-managed participants usually need from you. It is general information, not NDIS compliance advice.</p>

<h2>1. Work out how the participant's plan is managed</h2>
<p>This decides who you send the invoice to.</p>
<ul>
  <li><strong>Plan-managed:</strong> send the invoice to the participant's plan manager. The plan manager pays you from the participant's NDIS funds. Ask the participant for the plan manager's name and invoice email address.</li>
  <li><strong>Self-managed:</strong> send the invoice to the participant or their nominee. They pay you, then claim the money from the NDIS, and they need to keep your invoice as evidence.</li>
  <li><strong>NDIA-managed (agency-managed):</strong> these supports are not invoiced. Registered providers make a payment request through the NDIS provider portal. If you are not a registered provider, you cannot be paid from NDIA-managed funds.</li>
</ul>
<p>Plan-managed and self-managed participants can use unregistered providers, which is how most independent support workers operate.</p>

<h2>2. What to put on the invoice</h2>
<p>To claim from a plan, the NDIS needs the participant's name, their NDIS number, the dates of support, the support item number and the price. Plan managers also need to know who to pay. So a good NDIS invoice includes:</p>
<ul class="checklist">
  <li>Your name or business name, and your ABN</li>
  <li>An invoice number (each one different, usually in sequence) and the invoice date</li>
  <li>The participant's full name and NDIS number</li>
  <li>For each support: the date, the support item number, a short description, the hours or quantity, the rate and the line total</li>
  <li>Any travel, as a separate line in kilometres if you have agreed to charge for it</li>
  <li>The total, and whether GST applies (see below)</li>
  <li>Your bank details or PayID, the due date, and the invoice number as the payment reference</li>
</ul>
<p>If you do not have an ABN, plan managers will usually ask for a "statement by a supplier" form from the ATO. Most support workers get an ABN, which is free.</p>
<p>Some plan managers have their own extra requirements. If an invoice comes back, ask them exactly what they need and add it to your template.</p>

<h2>3. Support item numbers and price limits</h2>
<p>Every NDIS support has an item number, such as 01_011_0107_1_1 for self-care support on a weekday during the day. The item numbers and their price limits are published by the NDIA. For 2026-27 they are in the NDIS Pricing Schedule, and they usually change each July.</p>
<p>${PRICE_GUIDE_NOTE} Which item to use depends on the time of day, the day of the week, the type of support and what you have agreed with the participant in your service agreement.</p>
<p>For plan-managed participants, your rate cannot be above the price limit for that item. If it is, the plan manager will reject or short-pay the invoice.</p>

<h2>4. Travel</h2>
<p>There are two different kinds of travel to keep separate:</p>
<ul>
  <li><strong>Travel with or for the participant</strong> during a support, such as driving them to an activity. This is often claimed per kilometre under an activity-based transport or non-labour cost item.</li>
  <li><strong>Your travel to get to the participant</strong> (provider travel). The Pricing Arrangements set out when this can be claimed and the limits that apply.</li>
</ul>
<p>Either way, agree travel charges with the participant before you start, write them into your service agreement, and show kilometres as their own line on the invoice.</p>

<h2>5. GST</h2>
<p>If you are not registered for GST, do not add GST and do not call the document a tax invoice. Most sole traders earning under $75,000 a year are not registered.</p>
<p>If you are registered, many NDIS supports are GST-free when the conditions in the GST law are met, such as having a written agreement with the participant. Ask your accountant which of your supports are GST-free.</p>

<h2>6. Mistakes that get NDIS invoices rejected</h2>
<ul>
  <li>Missing or wrong ABN</li>
  <li>Wrong or missing NDIS number, or a misspelt participant name</li>
  <li>Item numbers that do not match the support, the time of day or the participant's plan budget</li>
  <li>A rate above the current price limit for a plan-managed participant</li>
  <li>Service dates outside the participant's current plan</li>
  <li>The same invoice number used twice</li>
  <li>No bank details, or details that do not match your name</li>
</ul>

<h2>7. Keep good records</h2>
<p>Keep a record of each shift: date, start and end time, what support you gave, and kilometres. Plan managers and the NDIA can ask for evidence. Keep invoice notes free of health or diagnosis details; the invoice only needs the support, date, hours and amount.</p>
<p>The <a href="/ndis-invoice-template/">free NDIS invoice template</a> has all of the fields above and checks your ABN as you type.</p>`,
    faq: [
      ["Do I need to be a registered NDIS provider to invoice?", "No. Plan-managed and self-managed participants can use unregistered providers. NDIA-managed participants must use registered providers, who claim through the provider portal."],
      ["How quickly should I send an NDIS invoice?", "Send it soon after the support, for example weekly or fortnightly. Funds are tied to the participant's plan dates, so late invoices can cause problems if the plan has ended or the budget has been used."],
      ["Can I charge more than the NDIS price limit?", "Not for plan-managed participants. Self-managed participants have more flexibility, but most still pay within the limits. Check the current NDIS pricing documents and agree your rate in writing."],
      ["Should I put shift notes on the invoice?", "No. Keep shift notes separately. The invoice needs the date, support item, hours, rate and amount, not care details."],
    ],
  },
  {
    slug: "sole-trader-invoice-requirements-australia",
    title: "Sole trader invoice requirements in Australia (plain English)",
    h1: "Sole trader invoice requirements in Australia",
    description: "What a sole trader needs on an invoice in Australia, whether you are registered for GST or not, with a checklist and a free template.",
    updated: UPDATED,
    body: `
<p>As a sole trader you can design your invoice however you like, as long as it gives your customer the information they need to pay you and keep their records. The rules get stricter when you are registered for GST. This guide is general information, not tax advice.</p>

<h2>If you are not registered for GST</h2>
<p>You issue an ordinary invoice. It should include:</p>
<ul class="checklist">
  <li>Your name or business name</li>
  <li>Your ABN</li>
  <li>The date of the invoice and a unique invoice number</li>
  <li>The customer's name</li>
  <li>A description of what you did or sold, with quantities (such as hours) and prices</li>
  <li>The total amount</li>
  <li>How and when to pay you</li>
</ul>
<p>Do not call it a tax invoice and do not show any GST. Adding GST when you are not registered is a mistake the ATO takes seriously. A short line such as "Not registered for GST" helps the customer.</p>

<h2>Why the ABN matters</h2>
<p>If you supply goods or services to a business and do not quote your ABN, the business may have to withhold tax from your payment at the top marginal rate and send it to the ATO. Put your ABN on every invoice. Getting an ABN is free on the Australian Business Register.</p>

<h2>If you are registered for GST</h2>
<p>You must give a tax invoice when a customer asks for one, and the ATO lists what it must include. See the <a href="/guides/tax-invoice-requirements-abn-gst/">tax invoice requirements guide</a>.</p>

<h2>When do you need to register for GST?</h2>
<p>You must register when your GST turnover is $75,000 or more a year. You can choose to register below that. Some supports, including many NDIS supports, are GST-free when the conditions are met. Talk to an accountant before registering, because it changes your prices and your reporting.</p>

<h2>Good habits that get you paid faster</h2>
<ul>
  <li>Number invoices in sequence (INV-0001, INV-0002) so nothing gets lost.</li>
  <li>Use the invoice number as the payment reference.</li>
  <li>Set clear terms, such as 7 or 14 days, and show the due date.</li>
  <li>Add a PayID if you have one. It is easier for many customers than a BSB and account number.</li>
  <li>Keep copies of every invoice for at least five years for tax records.</li>
</ul>
<p>The <a href="/invoice-template-australia/">free invoice template for sole traders</a> covers all of this and makes a PDF in your browser.</p>`,
    faq: [
      ["Can a sole trader invoice without an ABN?", "You can, but a business customer may have to withhold tax at the top rate from your payment. An ABN is free and worth getting."],
      ["Do I need a business name to invoice?", "No. You can invoice in your own name. If you trade under another name, it must be registered with ASIC."],
      ["How long should I keep invoices?", "The ATO generally expects business records to be kept for five years."],
    ],
  },
  {
    slug: "tax-invoice-requirements-abn-gst",
    title: "Tax invoice requirements in Australia: ABN, GST and what to include",
    h1: "Tax invoice requirements: ABN, GST and what to include",
    description: "When you must issue a tax invoice, the details it needs under and over $1,000, how GST-free items are shown, and what to do if you are not registered.",
    updated: UPDATED,
    body: `
<p>A tax invoice is a specific document under the GST law. Only a seller registered for GST can issue one. This guide summarises the ATO's rules as at ${UPDATED}. Check the ATO's tax invoice page for the current version.</p>

<h2>Who issues tax invoices</h2>
<ul>
  <li><strong>Registered for GST:</strong> you must provide a tax invoice within 28 days if a customer asks for one, unless the sale is $82.50 or less including GST.</li>
  <li><strong>Not registered:</strong> you issue an ordinary invoice with no GST and must not call it a tax invoice.</li>
</ul>

<h2>What a tax invoice must show (sales under $1,000)</h2>
<p>The ATO says the invoice must contain enough information to clearly work out these seven things:</p>
<ol>
  <li>That the document is intended to be a tax invoice</li>
  <li>The seller's identity</li>
  <li>The seller's ABN</li>
  <li>The date the invoice was issued</li>
  <li>A brief description of the items sold, including the quantity and price</li>
  <li>The GST amount (if any) payable, or a statement that the total price includes GST</li>
  <li>The extent to which each sale on the invoice is a taxable sale</li>
</ol>

<h2>Sales of $1,000 or more</h2>
<p>For sales of $1,000 or more, the tax invoice must also show the buyer's identity or ABN.</p>

<h2>Showing GST-free items</h2>
<p>If an invoice has a mix of taxable and GST-free items, make it clear which is which. A common way is to mark GST-free lines and show GST only on the taxable total. Many NDIS supports are GST-free when the conditions are met.</p>

<h2>Calculating GST</h2>
<p>GST is 10% of the GST-exclusive price, or one eleventh of a GST-inclusive price. Round to the nearest cent. On an invoice with several taxable items you can calculate GST on the total of those items.</p>

<h2>ABN and withholding</h2>
<p>If you do not quote an ABN to a business customer, they may need to withhold tax from your payment at the top marginal rate. This applies whether or not you are registered for GST.</p>

<p>Our <a href="/invoice-template-australia/">invoice template</a> switches to a tax invoice, adds GST and lets you mark GST-free lines only when you tell it you are registered. If you are not registered, it never shows GST.</p>`,
    faq: [
      ["Can I issue a tax invoice if I am not registered for GST?", "No. Only GST-registered sellers can issue tax invoices. Issue an ordinary invoice and do not show GST."],
      ["Is the word 'Tax invoice' required?", "The document must make it clear that it is intended to be a tax invoice. Putting 'Tax invoice' at the top is the simplest way."],
      ["Do I include GST on NDIS supports?", "Many NDIS supports are GST-free when the conditions in the GST law are met. If you are registered for GST, check with your accountant which of your supports qualify."],
    ],
  },
  {
    slug: "chasing-unpaid-ndis-invoices",
    title: "How long to wait before chasing an unpaid NDIS invoice",
    h1: "How long to wait before chasing an unpaid NDIS invoice",
    description: "A simple routine for following up late invoices with plan managers and self-managed participants, with reminder wording you can copy.",
    updated: UPDATED,
    body: `
<p>Most late payments are not deliberate. The invoice went to the wrong address, something on it did not match the plan, or it is sitting in a queue. A calm routine gets you paid without damaging the relationship.</p>

<h2>A routine that works</h2>
<ol>
  <li><strong>When you send it:</strong> check it went to the right address. For plan-managed participants that is the plan manager's invoice email, not the participant.</li>
  <li><strong>The day after the due date:</strong> send a short, friendly reminder with the invoice attached.</li>
  <li><strong>7 days overdue:</strong> send a second reminder and ask whether anything on the invoice needs fixing.</li>
  <li><strong>14 days overdue:</strong> phone the plan manager or participant. Problems are usually sorted faster by phone.</li>
</ol>

<h2>Reminder wording you can copy</h2>
<div class="band"><p>Hi [name],</p><p>Just a reminder that invoice [number] for [amount] was due on [date]. I have attached it again. Could you let me know if anything on it needs changing?</p><p>Thanks,<br>[your name]</p></div>

<h2>Check these before you chase</h2>
<ul>
  <li>Is your ABN correct and active?</li>
  <li>Are the participant's name and NDIS number exactly right?</li>
  <li>Do the support item numbers match the support and time of day?</li>
  <li>Is your rate within the current price limit (for plan-managed participants)?</li>
  <li>Are the dates inside the participant's current plan?</li>
</ul>

<h2>If the participant's plan has run out</h2>
<p>If the plan manager says there are no funds left in that budget, talk to the participant. You may need to agree a payment plan with them directly. This is one reason to invoice promptly and keep an eye on how much support you have delivered.</p>

<p>ShiftBill's paid plan lists overdue invoices and prepares a reminder with the details filled in, so it takes one tap to send.</p>`,
    faq: [
      ["How long do plan managers take to pay?", "It varies between plan managers. Many pay within a couple of weeks. If you are regularly waiting longer, ask the plan manager about their processing times."],
      ["Can I charge a late fee on NDIS invoices?", "Only if it is in your written service agreement, and even then it may not be payable from the participant's NDIS funds. Most support workers rely on reminders instead."],
    ],
  },
  {
    slug: "setting-aside-tax-support-worker",
    title: "How much tax to set aside as an independent support worker",
    h1: "How much tax to set aside as an independent support worker",
    description: "Sole trader support workers are paid without tax taken out. How to set aside money for income tax, the Medicare levy and GST, and how PAYG instalments work.",
    updated: UPDATED,
    body: `
<p>When you work for an agency, tax comes out of each pay. As a sole trader, every invoice is paid in full and the tax bill arrives later, after your tax return. Setting some money aside from every payment avoids a nasty surprise. This is general information, not tax advice.</p>

<h2>What you will owe</h2>
<ul>
  <li><strong>Income tax</strong> on your taxable income for the financial year (1 July to 30 June), at the normal individual rates, after your deductions.</li>
  <li><strong>The Medicare levy</strong>, usually 2% of taxable income.</li>
  <li><strong>GST</strong>, only if you are registered for GST and some of your supports are taxable. GST you collect belongs to the ATO.</li>
</ul>

<h2>A simple habit</h2>
<p>When a payment lands, move a fixed percentage into a separate savings account and do not touch it. Many sole traders use somewhere between 20% and 30%, but the right number depends on your total income, your deductions and any other job you have. Ask an accountant for a figure based on your situation, then adjust after your first tax return.</p>
<p>If you are registered for GST, also set aside all the GST you collected, on top of the percentage.</p>

<h2>PAYG instalments</h2>
<p>After your first year or so, the ATO may put you into PAYG instalments. You then pay towards next year's tax each quarter instead of all at once. The ATO does this automatically once your business income and tax reach certain amounts. Setting money aside makes the instalments easy to pay.</p>

<h2>Super</h2>
<p>Nobody pays super for you as a sole trader. You can make your own contributions, and they may be tax-deductible. It is worth asking your accountant about.</p>

<h2>Keep records as you go</h2>
<p>Keep every invoice, receipts for work expenses, and a log of work kilometres. A spreadsheet export at the end of the year makes the accountant's job quicker and cheaper.</p>

<p>ShiftBill's paid plan shows an estimate of what to put aside each time you mark an invoice as paid, using a percentage you choose. It is an estimate to help you budget, not tax advice.</p>`,
    faq: [
      ["What percentage should I save for tax?", "It depends on your total income and deductions. Many sole traders save 20% to 30% of each payment. An accountant can give you a figure for your situation."],
      ["Do I have to pay tax every quarter?", "Not at first. The ATO may put you into PAYG instalments once your business income and tax payable reach certain levels."],
    ],
  },
  {
    slug: "kilometres-support-workers-forget-to-claim",
    title: "Kilometres support workers forget to claim",
    h1: "Kilometres support workers forget to claim",
    description: "The two kinds of kilometres independent support workers can lose track of: travel you can invoice the participant for, and work travel you may claim at tax time.",
    updated: UPDATED,
    body: `
<p>Kilometres add up fast in support work, and they are easy to forget when you are tired at the end of a shift. There are two separate places where they matter.</p>

<h2>1. Kilometres you can invoice</h2>
<p>If your service agreement says so, you can charge for travel during a support, such as driving the participant to the shops or an appointment, and in some cases for your travel to reach the participant. These go on the invoice as their own line, in kilometres, using the item number you have agreed. Check the current NDIS pricing documents for the rules and limits.</p>
<p>The kilometres people most often forget to invoice:</p>
<ul>
  <li>Short trips during a shift, like a run to the chemist</li>
  <li>The drive home from an outing when you dropped the participant off</li>
  <li>Extra kilometres when a planned trip changed on the day</li>
</ul>

<h2>2. Work travel at tax time</h2>
<p>Separately, you may be able to claim car expenses for work travel in your tax return, for example using the ATO's cents per kilometre method (which has a set rate each year and a cap of 5,000 km). Trips between two work places, such as from one participant to the next, are usually work travel. The drive from home to your first participant is often treated as private travel. Kilometres you have already invoiced to the participant also need care. Ask your accountant how the rules apply to you.</p>

<h2>The fix: log them when the shift ends</h2>
<p>Write down kilometres before you start the car to go home. A note on your phone works. ShiftBill's shift log has a kilometres field on every shift, so the travel line is added to the invoice automatically.</p>`,
    faq: [
      ["Can I charge a participant for driving to their house?", "Sometimes. Provider travel can be claimed in some situations under the NDIS pricing rules, with limits. It must also be agreed with the participant in advance."],
      ["Do I need a logbook?", "For the cents per kilometre method you do not need a logbook, but you need to be able to show how you worked out your kilometres. A shift log with kilometres is good evidence."],
    ],
  },
];

export function guidePages(ctx: SiteContext): Page[] {
  const pages: Page[] = GUIDES.map((g) => {
    const f = faq(g.faq);
    const path = `/guides/${g.slug}/`;
    return {
      path,
      title: g.title,
      description: g.description,
      priority: 0.7,
      scripts: ["site"],
      jsonLd: [
        f.jsonLd,
        breadcrumbs(ctx, [["Home", "/"], ["Guides", "/guides/"], [g.h1, path]]),
        { "@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.description, dateModified: "2026-10-21", author: { "@type": "Organization", name: "ShiftBill" } },
      ],
      body: `<article class="wrap narrow">
  <p class="small"><a href="/guides/">Guides</a> / Updated ${g.updated}</p>
  <h1>${g.h1}</h1>
  ${g.body}
  <div class="note"><p><strong>Make your next invoice in a few minutes.</strong> The <a href="/ndis-invoice-template/">free NDIS invoice template</a> has every field above, checks your ABN and makes a PDF in your browser. No sign-up.</p></div>
  ${f.html}
  <p class="small">This guide is general information, not tax, legal or NDIS compliance advice.</p>
</article>`,
    };
  });

  pages.push({
    path: "/guides/",
    title: "Guides for independent NDIS support workers | ShiftBill",
    description: "Plain-English guides on invoicing NDIS participants, invoice and tax invoice requirements, chasing late payments, setting aside tax and claiming kilometres.",
    priority: 0.6,
    scripts: ["site"],
    body: `<div class="wrap narrow">
  <h1>Guides</h1>
  <p class="lead">Short, plain-English guides for support workers and sole traders who invoice for their own work.</p>
  <ul class="list">
    ${GUIDES.map((g) => `<li><div><a href="/guides/${g.slug}/"><strong>${g.h1}</strong></a><div class="meta">${g.description}</div></div></li>`).join("")}
  </ul>
</div>`,
  });
  return pages;
}

export const GUIDE_SLUGS = GUIDES.map((g) => g.slug);
