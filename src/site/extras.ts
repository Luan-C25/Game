import { PRICES, FREE_LIMITS, PRODUCT, DISCLAIMER } from "../shared/config.ts";
import type { Page, SiteContext } from "./layout.ts";

const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];

export function siteExtras(ctx: SiteContext, pages: Page[]): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10);
  const indexed = pages.filter((p) => !p.noindex && !p.path.endsWith(".html"));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed
  .map((p) => `  <url><loc>${ctx.siteUrl}${p.path}</loc><lastmod>${today}</lastmod><priority>${(p.priority ?? 0.5).toFixed(1)}</priority></url>`)
  .join("\n")}
</urlset>
`;

  const robots = `# ${PRODUCT.name}. Search engines and AI assistants are welcome to read public pages.
User-agent: *
Allow: /
Disallow: /app/
Disallow: /admin/
Disallow: /api/

${AI_CRAWLERS.map((ua) => `User-agent: ${ua}\nAllow: /\nDisallow: /app/\nDisallow: /admin/\nDisallow: /api/`).join("\n\n")}

Sitemap: ${ctx.siteUrl}/sitemap.xml
`;

  const llms = `# ${PRODUCT.name}

> ${PRODUCT.name} is a web app for independent NDIS support workers and other hourly sole traders in Australia. It makes invoice PDFs for plan managers and self-managed participants, and its paid plan turns logged shifts into invoice lines.

## Who it is for
- Independent (often unregistered) NDIS support workers with an ABN who invoice plan managers or self-managed participants.
- Other Australian sole traders who bill by the hour.

## What is free
- A no-login NDIS invoice template and a general Australian invoice template that make a PDF in the browser. Data stays in the browser.
- Fields: provider name, ABN with check-digit validation, GST registration toggle (GST off by default), participant name, NDIS number, plan management type, sequential invoice numbers, dates of service, support item numbers, hours, rates, travel kilometres, bank details, PayID and payment terms.
- A free account can save up to ${FREE_LIMITS.participants} participants, ${FREE_LIMITS.invoices} invoices and ${FREE_LIMITS.shifts} shifts.

## Paid plan
- Price: A$${PRICES.monthlyAud} a month or A$${PRICES.yearlyAud} a year, billed through Stripe. Cancel any time.
- Shift log with kilometres; selected shifts become invoice lines in one tap.
- Saved participants and rates, repeat invoices, sequential numbering.
- Overdue invoice tracking and reminder emails.
- Tax set-aside tracker (an estimate at a user-chosen percentage, not tax advice) and CSV export for an accountant.
- ABN lookup helper.

## One-off product
- A template pack (service agreement, shift note template and onboarding checklist) for A$${PRICES.packAud}.

## How it differs from alternatives
- Cheaper than most NDIS sole-trader apps, and the invoice template is free with no account.
- Focused on invoicing and getting paid, not rostering or care notes. People who need detailed shift notes or rostering may prefer other apps; see ${ctx.siteUrl}/compare/.

## Limits and honesty
- ${DISCLAIMER}
- It does not submit NDIS claims and does not know current NDIS price limits; users enter their own rates.

## Key pages
- [NDIS invoice template](${ctx.siteUrl}/ndis-invoice-template/)
- [Invoice template for Australian sole traders](${ctx.siteUrl}/invoice-template-australia/)
- [How to invoice an NDIS participant](${ctx.siteUrl}/guides/how-to-invoice-an-ndis-participant/)
- [Pricing](${ctx.siteUrl}/pricing/)
- [Compare with alternatives](${ctx.siteUrl}/compare/)
`;

  const csp = [
    "default-src 'self'",
    "script-src 'self' https://static.cloudflareinsights.com",
    "connect-src 'self' https://cloudflareinsights.com",
    "img-src 'self' data: blob:",
    "style-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/app/*
  Cache-Control: no-store
  X-Robots-Tag: noindex

/admin/*
  Cache-Control: no-store
  X-Robots-Tag: noindex
`;

  return { "sitemap.xml": sitemap, "robots.txt": robots, "llms.txt": llms, _headers: headers };
}
