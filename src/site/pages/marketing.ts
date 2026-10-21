import { PRICES, FREE_LIMITS, PRODUCT } from "../../shared/config.ts";
import { faq, breadcrumbs, esc, type Page, type SiteContext } from "../layout.ts";

export function pricingPage(ctx: SiteContext): Page {
  const f = faq([
    ["Can I cancel any time?", "Yes. Cancel from Billing in your account. You keep paid features until the end of the period you paid for, then the account becomes a free account. Nothing is deleted."],
    ["Is there a free trial?", `A free account lets you try everything with up to ${FREE_LIMITS.participants} participants, ${FREE_LIMITS.invoices} invoices and ${FREE_LIMITS.shifts} shifts. There is no card needed until you upgrade.`],
    ["Do prices include GST?", "ShiftBill is not registered for GST, so no GST is charged."],
    ["How do I pay?", "By card through Stripe. We never see or store your card number."],
    ["What happens to my data if I stop paying?", "It stays in your account. You can export invoices and shifts to CSV, or delete your account and everything in it."],
  ]);
  return {
    path: "/pricing/",
    title: `Pricing: free invoice template, A$${PRICES.monthlyAud} a month for the shift log | ShiftBill`,
    description: `The NDIS invoice template is free. The paid plan adds the shift log, reminders, tax set-aside and CSV export for A$${PRICES.monthlyAud} a month or A$${PRICES.yearlyAud} a year.`,
    priority: 0.8,
    scripts: ["site"],
    jsonLd: [f.jsonLd, breadcrumbs(ctx, [["Home", "/"], ["Pricing", "/pricing/"]])],
    body: `<div class="wrap">
  <h1>Pricing</h1>
  <p class="lead">Start free. Pay only if the shift log saves you time.</p>
  <div class="cards">
    <div class="card">
      <h2>Free template</h2>
      <p class="price">A$0</p>
      <ul>
        <li>NDIS and general invoice templates</li>
        <li>PDF made in your browser, no account</li>
        <li>ABN check, GST settings, PayID and QR</li>
        <li>Unlimited invoices</li>
      </ul>
      <a class="btn secondary" href="/ndis-invoice-template/">Make an invoice</a>
    </div>
    <div class="card">
      <h2>Free account</h2>
      <p class="price">A$0</p>
      <ul>
        <li>Everything in the free template</li>
        <li>Save up to ${FREE_LIMITS.participants} participants and ${FREE_LIMITS.invoices} invoices</li>
        <li>Try the shift log with ${FREE_LIMITS.shifts} shifts</li>
      </ul>
      <a class="btn secondary" href="/app/#/signup">Create a free account</a>
    </div>
    <div class="card">
      <h2>Paid</h2>
      <p class="price">A$${PRICES.monthlyAud} <span class="small">a month</span></p>
      <p>or A$${PRICES.yearlyAud} a year (about A$${(PRICES.yearlyAud / 12).toFixed(2)} a month)</p>
      <ul>
        <li>Shift log with kilometres, one tap to invoice</li>
        <li>Unlimited participants, saved rates, repeat invoices</li>
        <li>Overdue list and ready-to-send reminders</li>
        <li>Tax set-aside tracker and CSV export</li>
        <li>ABN lookup, no footer credit on PDFs</li>
      </ul>
      <a class="btn" href="/app/#/billing">Upgrade</a>
    </div>
  </div>
  <p class="small">Prices in Australian dollars. Billed by Stripe. Cancel any time from your account.</p>
  <div class="wrap narrow">${f.html}</div>
</div>`,
  };
}

export function comparePage(ctx: SiteContext): Page {
  return {
    path: "/compare/",
    title: "ShiftBill compared with free templates and NDIS apps | ShiftBill",
    description: "An honest comparison of ShiftBill with free invoice templates, NDIS apps for sole traders and general invoicing apps, including when another tool suits you better.",
    priority: 0.6,
    scripts: ["site"],
    jsonLd: [breadcrumbs(ctx, [["Home", "/"], ["Compare", "/compare/"]])],
    body: `<div class="wrap narrow">
  <h1>How ShiftBill compares</h1>
  <p class="lead">There are plenty of ways to invoice as a support worker, and several are free. Here is where ShiftBill fits, and when you would be better off with something else.</p>
  <p class="small">Competitor details are from their public websites and reviews in October 2026. Prices change, so check their sites before deciding.</p>
</div>
<div class="wrap">
  <div class="table-scroll">
  <table class="compare stack">
    <thead><tr><th scope="col">Option</th><th scope="col">Cost</th><th scope="col">Good for</th><th scope="col">Trade-offs</th></tr></thead>
    <tbody>
      <tr><th scope="row">A Word or Excel template</th><td data-label="Cost">Free</td><td data-label="Good for">Occasional invoices</td><td data-label="Trade-offs">Manual totals and numbering, easy to make mistakes, nothing to remind you about late payments.</td></tr>
      <tr><th scope="row">Free online NDIS invoice generators (several providers offer one)</th><td data-label="Cost">Free</td><td data-label="Good for">One-off NDIS invoices</td><td data-label="Trade-offs">Usually a lead-in to that company's paid software. Fields and quality vary.</td></tr>
      <tr><th scope="row">General invoicing apps such as Zoho Invoice or Square Invoices</th><td data-label="Cost">Free plans available</td><td data-label="Good for">General small business invoicing, card payments</td><td data-label="Trade-offs">Not built around NDIS item numbers, participants or plan managers.</td></tr>
      <tr><th scope="row">NDIS apps for sole traders such as Simplo Solo, NoteReady, Sparks Scribe or Bugal</th><td data-label="Cost">Roughly $9 to $15+ a month, some with limited free plans</td><td data-label="Good for">Shift notes, progress notes, NDIS-coded invoicing, some with price guide lookups</td><td data-label="Trade-offs">More features than some people need. Notes and compliance tools cost more.</td></tr>
      <tr><th scope="row">Accounting software such as MYOB Solo or Xero</th><td data-label="Cost">Paid</td><td data-label="Good for">Full bookkeeping, BAS, bank feeds</td><td data-label="Trade-offs">More than most support workers need for invoicing alone. Often what your accountant prefers.</td></tr>
      <tr><th scope="row"><strong>ShiftBill</strong></th><td data-label="Cost">Free template. A$${PRICES.monthlyAud} a month or A$${PRICES.yearlyAud} a year for the shift log</td><td data-label="Good for">Independent support workers who want to log shifts quickly and invoice in one tap</td><td data-label="Trade-offs">No progress notes, rostering, bank feeds or BAS. New product with a small team.</td></tr>
    </tbody>
  </table>
  </div>
</div>
<div class="wrap narrow">
  <h2>When another tool is a better fit</h2>
  <ul>
    <li><strong>All your work comes through Mable or Hireup.</strong> Those platforms handle invoicing for work booked through them.</li>
    <li><strong>You need detailed shift or progress notes</strong> for participants or support coordinators. A notes-focused NDIS app will suit you better.</li>
    <li><strong>You run a team</strong> with rosters, multiple workers and payroll. Use provider software.</li>
    <li><strong>You want full bookkeeping</strong> with bank feeds and BAS. Use accounting software, and maybe keep ShiftBill's free template for quick invoices.</li>
  </ul>
  <h2>Where ShiftBill is different</h2>
  <ul>
    <li>The invoice template is free, unlimited and needs no account. Your details stay in your browser.</li>
    <li>Logging a shift on your phone takes a few seconds, and selected shifts become invoice lines in one tap, including kilometres.</li>
    <li>Each payment shows an estimate of what to put aside for tax, at a percentage you choose.</li>
    <li>PayID details and a QR code are printed on every invoice, free.</li>
    <li>It costs less than most dedicated NDIS apps.</li>
  </ul>
  <p><a class="btn" href="/ndis-invoice-template/">Try the free template</a></p>
</div>`,
  };
}

export interface LegalInfo {
  operatorName: string;
  operatorAbn: string;
}

export function privacyPage(ctx: SiteContext, legal: LegalInfo): Page {
  return {
    path: "/privacy/",
    title: "Privacy policy | ShiftBill",
    description: "How ShiftBill collects, uses, stores and protects personal information, written to follow the Australian Privacy Principles.",
    priority: 0.2,
    body: `<article class="wrap narrow">
  <h1>Privacy policy</h1>
  <p class="small">Draft for review. Last updated 21 October 2026.</p>
  <p>${esc(PRODUCT.name)} is operated by ${esc(legal.operatorName)}${legal.operatorAbn ? ` (ABN ${esc(legal.operatorAbn)})` : ""} ("we"). We follow the Australian Privacy Principles in the Privacy Act 1988 (Cth). This policy explains what we collect and why, in plain English.</p>

  <h2>The short version</h2>
  <ul>
    <li>The free invoice template keeps everything in your own browser. We do not receive what you type into it.</li>
    <li>If you create an account, we store what you need to invoice: your details, participants' names and NDIS numbers, shifts, invoices and payments. NDIS numbers are encrypted before they are stored.</li>
    <li>We do not collect health, diagnosis or disability details, and we ask you not to enter them.</li>
    <li>We do not sell personal information or use it for advertising.</li>
  </ul>

  <h2>What we collect</h2>
  <ul>
    <li><strong>Account details:</strong> your email address and a scrambled (hashed) version of your password.</li>
    <li><strong>Your business details:</strong> name, ABN, contact details, bank details and PayID, which appear on your invoices.</li>
    <li><strong>Participant details you enter:</strong> participant name, NDIS number, plan management type, and the name and email address of the person or plan manager you invoice.</li>
    <li><strong>Work records:</strong> shift dates and times, support item numbers, rates, kilometres, invoices and payment dates.</li>
    <li><strong>Billing:</strong> Stripe processes card payments. We receive your subscription status and a Stripe customer reference, not your card number.</li>
    <li><strong>Usage and marketing data:</strong> anonymous page statistics from Cloudflare Web Analytics (no cookies), and the campaign source of your first visit (for example "tiktok") stored with your account so we know which channels work. We do not use third-party advertising trackers.</li>
  </ul>

  <h2>Participants' information</h2>
  <p>When you enter a participant's details, you are giving us information about another person. You should only enter what is needed for invoicing, and you should tell participants that you use an invoicing service. We use participant information only to produce your invoices and records. We never contact participants or plan managers, except to send a reminder email that you have asked us to send.</p>

  <h2>How we use it</h2>
  <ul>
    <li>To provide the service: saving your records, making invoices, sending reminders you request, and showing estimates.</li>
    <li>To run billing and prevent abuse.</li>
    <li>To answer support requests.</li>
    <li>To understand, in aggregate, which pages and channels bring people to the product.</li>
  </ul>

  <h2>Where it is stored and who we share it with</h2>
  <p>We use these service providers, which may store or process data outside Australia:</p>
  <ul>
    <li><strong>Cloudflare</strong> (hosting, database and analytics). The database is created with an Oceania location preference.</li>
    <li><strong>Stripe</strong> (payments).</li>
    <li><strong>An email provider</strong> (only once automatic reminder emails are switched on).</li>
  </ul>
  <p>We take reasonable steps to make sure these providers protect personal information. We disclose information to authorities only when the law requires it.</p>

  <h2>Security</h2>
  <p>Data is sent over HTTPS. NDIS numbers and saved invoices are encrypted in the database with a key kept separately. Passwords are hashed. Each account can only see its own records. No system is perfectly secure, so if a data breach is likely to cause serious harm, we will notify you and the Office of the Australian Information Commissioner as required.</p>

  <h2>How long we keep it</h2>
  <p>We keep your records while your account is open so you have them for tax purposes. When you delete your account, we delete your records from the live database straight away. Backups roll over within 30 days.</p>

  <h2>Access, correction and deletion</h2>
  <p>You can view, correct, export (CSV) and delete your data in the app. You can also email us at <a href="mailto:${esc(ctx.supportEmail)}">${esc(ctx.supportEmail)}</a>. If a participant asks about information you hold about them, you can export it or delete it from your account.</p>

  <h2>Complaints</h2>
  <p>Email us first and we will respond within 30 days. If you are not satisfied, you can contact the Office of the Australian Information Commissioner at oaic.gov.au.</p>
</article>`,
  };
}

export function termsPage(ctx: SiteContext, legal: LegalInfo): Page {
  return {
    path: "/terms/",
    title: "Terms of use | ShiftBill",
    description: "The terms for using ShiftBill, including subscriptions, the template pack, acceptable use and the limits of what the tool does.",
    priority: 0.2,
    body: `<article class="wrap narrow">
  <h1>Terms of use</h1>
  <p class="small">Draft for review. Last updated 21 October 2026.</p>
  <p>These terms apply to your use of ${esc(PRODUCT.name)}, operated by ${esc(legal.operatorName)}${legal.operatorAbn ? ` (ABN ${esc(legal.operatorAbn)})` : ""}. By using the site or app you agree to them.</p>

  <h2>What ShiftBill is, and is not</h2>
  <p>ShiftBill is a tool for making invoices and keeping work records. It is not tax, legal, financial or NDIS compliance advice. You are responsible for the accuracy of your invoices, including item numbers, rates, GST treatment and whether a support can be claimed. Tax set-aside figures are estimates to help you budget. ShiftBill is not affiliated with the NDIS, the NDIA, the NDIS Quality and Safeguards Commission or the ATO.</p>

  <h2>Your account</h2>
  <p>Keep your password and recovery code safe. You are responsible for what happens in your account. Only enter information you are entitled to use, and do not enter health or diagnosis details.</p>

  <h2>Subscriptions</h2>
  <ul>
    <li>Paid plans are billed in advance, monthly or yearly, through Stripe, and renew automatically until cancelled.</li>
    <li>You can cancel any time from Billing in the app. Paid features continue until the end of the period you paid for.</li>
    <li>We will give at least 30 days' notice of a price change by email or in the app, and it applies from your next renewal.</li>
  </ul>

  <h2>Template pack</h2>
  <p>The template pack is a one-off digital download. The templates are starting points that you should adapt to your situation and, where it matters, have checked by a professional. You may use them in your own business but not resell them.</p>

  <h2>Refunds and consumer law</h2>
  <p>Our services come with guarantees that cannot be excluded under the Australian Consumer Law. If something does not work as described, email us and we will fix it or refund you. Apart from that, we do not usually refund part periods.</p>

  <h2>Acceptable use</h2>
  <p>Do not misuse the service: no attempts to access other people's data, overload the service, send spam through reminders, or use it for anything unlawful. We may suspend accounts that do.</p>

  <h2>Availability</h2>
  <p>We run on free and low-cost infrastructure and aim for the service to be available all the time, but it may occasionally be unavailable or at capacity. Keep your own copies of invoices you send.</p>

  <h2>Liability</h2>
  <p>To the extent the law allows, our liability for any claim about the service is limited to resupplying the service or refunding what you paid in the previous 12 months. We are not liable for indirect losses, such as a rejected or late invoice payment.</p>

  <h2>Changes and law</h2>
  <p>We may update these terms and will tell you about important changes. These terms are governed by the laws of Queensland, Australia.</p>
  <p>Contact: <a href="mailto:${esc(ctx.supportEmail)}">${esc(ctx.supportEmail)}</a></p>
</article>`,
  };
}

export function capacityPage(): Page {
  return {
    path: "/capacity/",
    title: "Temporarily at capacity | ShiftBill",
    description: "ShiftBill is temporarily at capacity.",
    noindex: true,
    body: `<div class="wrap narrow">
  <h1>ShiftBill is busy right now</h1>
  <p>We have reached today's limit on our hosting plan. Saved data is safe. Things reset at 10 or 11 am (Australian eastern time), depending on daylight saving.</p>
  <p>In the meantime, the <a href="/ndis-invoice-template/">free invoice template</a> still works, because it runs entirely in your browser.</p>
</div>`,
  };
}

export function adminPage(): Page {
  return {
    path: "/admin/",
    title: "Admin | ShiftBill",
    description: "Owner reports.",
    noindex: true,
    scripts: ["admin"],
    body: `<div class="wrap">
  <h1>Funnel by source</h1>
  <form id="admin-form" class="btn-row">
    <label class="visually-hidden" for="token">Admin token</label>
    <input id="token" type="password" autocomplete="off" placeholder="Admin token">
    <label class="visually-hidden" for="days">Period</label>
    <select id="days"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select>
    <button type="submit">Show</button>
  </form>
  <div id="report" class="table-scroll" aria-live="polite"></div>
</div>`,
  };
}

export function appPage(): Page {
  return {
    path: "/app/",
    title: "ShiftBill",
    description: "Your ShiftBill shift log and invoices.",
    noindex: true,
    scripts: ["app"],
    body: `<div id="app" aria-live="polite"><div class="wrap narrow"><p>Loading...</p></div></div>
<noscript><div class="wrap narrow"><p class="warn">ShiftBill needs JavaScript turned on.</p></div></noscript>`,
  };
}
