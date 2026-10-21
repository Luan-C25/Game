import { PRICES, FREE_LIMITS, PRICE_GUIDE_NOTE, PRODUCT } from "../../shared/config.ts";
import { faq, breadcrumbs, type Page, type SiteContext } from "../layout.ts";
import { generatorForm } from "./generator.ts";

export function homePage(ctx: SiteContext): Page {
  const f = faq([
    ["Is the invoice template really free?", "Yes. The invoice maker needs no account and has no limit on invoices. Paid plans add the shift log, saved participants, overdue reminders and the tax set-aside tracker."],
    ["Who is ShiftBill for?", "Independent NDIS support workers and other sole traders in Australia who bill by the hour and have an ABN."],
    ["Does ShiftBill submit claims to the NDIS?", "No. It makes invoices you send to plan managers or self-managed participants. NDIA-managed supports are claimed by registered providers through the NDIS provider portal, not by invoice."],
    ["Where is my data kept?", "The free invoice maker keeps everything in your browser. If you create an account, your saved details are stored on Cloudflare, and NDIS numbers are encrypted before they are saved."],
    ["Is this tax or NDIS advice?", "No. ShiftBill is a tool. Check item numbers and price limits against the current NDIS pricing documents, and ask an accountant about tax."],
  ]);
  return {
    path: "/",
    title: `${PRODUCT.name}: free NDIS invoice template and shift log for support workers`,
    description: "Make an NDIS invoice PDF in your browser for free, with no sign-up. Paid plans turn logged shifts into invoice lines in one tap and track tax to set aside.",
    priority: 1,
    scripts: ["site"],
    jsonLd: [
      f.jsonLd,
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: PRODUCT.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: ctx.siteUrl,
        offers: [
          { "@type": "Offer", price: "0", priceCurrency: "AUD", name: "Free invoice template" },
          { "@type": "Offer", price: String(PRICES.monthlyAud), priceCurrency: "AUD", name: "Monthly plan" },
          { "@type": "Offer", price: String(PRICES.yearlyAud), priceCurrency: "AUD", name: "Yearly plan" },
        ],
      },
    ],
    body: `
<section class="hero wrap narrow">
  <h1>NDIS invoices in a few minutes. Shifts to invoice lines in one tap.</h1>
  <p class="lead">${PRODUCT.name} is a simple invoice maker for independent NDIS support workers. Make a clean PDF invoice for a plan manager or self-managed participant, free and without signing up.</p>
  <div class="btn-row">
    <a class="btn" href="/ndis-invoice-template/">Make a free NDIS invoice</a>
    <a class="btn secondary" href="/pricing/">See what the paid plan adds</a>
  </div>
  <p class="small">Not for NDIS work? Use the <a href="/invoice-template-australia/">general invoice template for Australian sole traders</a>.</p>
</section>

<section class="wrap">
  <h2>What you get for free</h2>
  <div class="cards">
    <div class="card"><h3>The fields plan managers ask for</h3><p>Participant name, NDIS number, support item numbers, dates of service, hours, rates and your ABN, laid out so they are easy to process.</p></div>
    <div class="card"><h3>A correct GST setting</h3><p>GST is off unless you say you are registered. If you are registered, the PDF becomes a tax invoice and you can mark GST-free supports.</p></div>
    <div class="card"><h3>PayID and bank details</h3><p>Your BSB, account and PayID are printed clearly with the invoice number as the reference, plus a QR code that copies the PayID details.</p></div>
  </div>
  <p class="small">${PRICE_GUIDE_NOTE}</p>
</section>

<section class="wrap">
  <h2>What the paid plan adds</h2>
  <p>A$${PRICES.monthlyAud} a month or A$${PRICES.yearlyAud} a year. Cancel any time from your account.</p>
  <div class="cards">
    <div class="card"><h3>Shift log</h3><p>Log a shift and kilometres on your phone when you finish. When it is time to invoice, tick the shifts and they become invoice lines.</p></div>
    <div class="card"><h3>Overdue reminders</h3><p>See which invoices are overdue and send a polite reminder, with the invoice details filled in.</p></div>
    <div class="card"><h3>Tax set-aside tracker</h3><p>Mark an invoice as paid and see an estimate of what to put aside for tax and GST, at a percentage you choose.</p></div>
  </div>
  <p>Free accounts can save up to ${FREE_LIMITS.participants} participants, ${FREE_LIMITS.invoices} invoices and ${FREE_LIMITS.shifts} shifts, so you can try the shift log before paying.</p>
</section>

<section class="wrap narrow">
  <h2>Is ${PRODUCT.name} the right tool for you?</h2>
  <p>There are other good tools for support workers, including free invoice templates and apps with shift notes and rostering. We have written an <a href="/compare/">honest comparison</a>, including when you would be better off with something else.</p>
  ${f.html}
</section>`,
  };
}

export function ndisTemplatePage(ctx: SiteContext): Page {
  const f = faq([
    ["What needs to be on an NDIS invoice?", "Plan managers generally ask for your name or business name, ABN, the participant's name and NDIS number, the date of each support, the support item number, the hours or quantity, the rate, the total, and how to pay you. Check your plan manager's own requirements too."],
    ["Do I charge GST on NDIS supports?", "Only if you are registered for GST, and many NDIS supports are GST-free when the conditions in the GST law are met. If you are not registered, do not show GST and do not call the document a tax invoice."],
    ["Where do I send the invoice?", "For plan-managed participants, send it to the plan manager. For self-managed participants, send it to the participant or their nominee. NDIA-managed supports are not invoiced."],
    ["Is my information saved?", "Your details are saved in this browser so the next invoice is quicker. Nothing is sent to us. Use Clear my saved details on a shared device."],
    ["Can I use this if I am not registered with the NDIS?", "Yes. Plan-managed and self-managed participants can use unregistered providers. NDIA-managed participants must use registered providers."],
  ]);
  return {
    path: "/ndis-invoice-template/",
    title: "Free NDIS invoice template (PDF, no sign-up) | ShiftBill",
    description: "Fill in a free NDIS invoice template and download a PDF for a plan manager or self-managed participant. Includes support item numbers, NDIS number, ABN check and PayID.",
    priority: 0.9,
    scripts: ["generator"],
    jsonLd: [f.jsonLd, breadcrumbs(ctx, [["Home", "/"], ["NDIS invoice template", "/ndis-invoice-template/"]])],
    body: `
<div class="wrap narrow">
  <h1>Free NDIS invoice template</h1>
  <p class="lead">Fill in the form and download a PDF invoice for a plan manager or self-managed participant. It takes a few minutes the first time and less after that, because your details are remembered in this browser.</p>
</div>
<div class="wrap narrow">${generatorForm("ndis")}</div>
<div class="wrap narrow">
  <h2>What this template includes</h2>
  <ul class="checklist">
    <li>Your name, ABN (checked against the ATO check-digit rule) and contact details</li>
    <li>Participant name, NDIS number and how the plan is managed</li>
    <li>A line for each support: date, support item number, description, hours and rate</li>
    <li>Travel lines in kilometres</li>
    <li>Sequential invoice numbers and a due date from your payment terms</li>
    <li>Bank details, PayID and the invoice number as the payment reference</li>
  </ul>
  <p>Want the detail? Read <a href="/guides/how-to-invoice-an-ndis-participant/">how to invoice an NDIS participant</a>.</p>
  ${f.html}
</div>`,
  };
}

export function generalTemplatePage(ctx: SiteContext): Page {
  const f = faq([
    ["What must a sole trader invoice include in Australia?", "If you are not registered for GST, a clear invoice usually shows your name, ABN, the date, a description of the work, the amount and how to pay. Do not call it a tax invoice. If you are registered for GST, the ATO lists extra details a tax invoice must include."],
    ["Do I need an ABN on my invoice?", "If you supply goods or services to a business and do not quote an ABN, the business may have to withhold tax from the payment at the top rate. Include your ABN."],
    ["When is an invoice a tax invoice?", "Only a seller registered for GST issues tax invoices. This template switches the title to Tax invoice and adds GST when you say you are registered."],
    ["Is this template free?", "Yes. No account, no watermark beyond a small credit line in the footer, and no limit."],
  ]);
  return {
    path: "/invoice-template-australia/",
    title: "Free invoice template for Australian sole traders (PDF) | ShiftBill",
    description: "Free invoice template for Australian sole traders. Add your ABN, hours or items, GST only if registered, and bank or PayID details, then download a PDF.",
    priority: 0.8,
    scripts: ["generator"],
    jsonLd: [f.jsonLd, breadcrumbs(ctx, [["Home", "/"], ["Invoice template Australia", "/invoice-template-australia/"]])],
    body: `
<div class="wrap narrow">
  <h1>Free invoice template for Australian sole traders</h1>
  <p class="lead">For hourly work and small jobs. Add your ABN, what you did and how to pay you, then download a PDF. No sign-up, and your details stay in this browser.</p>
  <p class="small">Invoicing an NDIS participant or plan manager? Use the <a href="/ndis-invoice-template/">NDIS invoice template</a> instead.</p>
</div>
<div class="wrap narrow">${generatorForm("general")}</div>
<div class="wrap narrow">
  <h2>Before you send it</h2>
  <p>Read the plain-English guides on <a href="/guides/sole-trader-invoice-requirements-australia/">sole trader invoice requirements</a> and <a href="/guides/tax-invoice-requirements-abn-gst/">tax invoices, ABN and GST</a>.</p>
  ${f.html}
</div>`,
  };
}

export function notFoundPage(): Page {
  return {
    path: "/404.html",
    title: "Page not found | ShiftBill",
    description: "This page does not exist.",
    noindex: true,
    body: `<div class="wrap narrow"><h1>Page not found</h1><p>The page you asked for is not here. Try the <a href="/ndis-invoice-template/">NDIS invoice template</a> or go to the <a href="/">home page</a>.</p></div>`,
  };
}
