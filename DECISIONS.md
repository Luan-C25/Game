# Decisions

A running record of what was decided, why, and what was checked. Newest decisions are added at the end of each section. All research below was done on **21 October 2026**.

## 1. Research findings that change the brief

These are the places where the brief's assumptions turned out to be wrong or incomplete. Each one has a decision attached.

### 1.1 The NDIS support worker niche is not open

The brief says nothing large owns this niche. That is true, but it is crowded with small, focused apps, all priced above us:

| Product | What it is | Price found (21 Oct 2026, vendor pages and reviews) |
| --- | --- | --- |
| Simplo Solo | NDIS invoicing app for sole traders, voice notes, built-in price guide | from $14 a month, 30-day trial |
| NoteReady | Notes, invoicing and client management for sole traders | $9 starter (capped at 5 invoices a month), $19, $39 a month |
| Sparks Scribe | Shift notes and NDIS-coded invoices | from $15 a month incl. GST |
| Bugal | NDIS codes and shift notes | free plan capped at 2 invoices |
| ShiftCare, Astalty, Brevity | Provider and agency software | per-seat pricing, overkill for one worker |
| Teiro, Carevo, Superjack, Enerpize, ShiftCare guides | Free NDIS invoice templates and generators | free, used as SEO lead magnets |
| Mable, Hireup | Platforms that invoice for the worker | no separate invoicing needed for work found there |

What this means:
- **Do not claim the market is empty.** Our copy never does.
- Workers who get all their work through Mable or Hireup do not need us. Our market is workers with private, plan-managed and self-managed clients.
- "NDIS invoice template" already has strong free competitors with established domains. Our site launches on a `workers.dev` subdomain with no authority, so **search traffic will be slow for the first few months**. TikTok and Reddit matter more early on. See `content/WEEK_ONE.md`.
- **Our reason to switch:** the cheapest dedicated tool (A$7 a month or A$59 a year against $9 to $15+), an unlimited free template with no account, a shift log that turns shifts into invoice lines in one tap, and a tax set-aside estimate that the others do not lead with.

### 1.2 Free email needs a domain we have not bought yet

- **Cloudflare Email Sending** to arbitrary recipients needs the Workers Paid plan (US$5 a month). Not $0.
- **Resend free plan**: 3,000 emails a month, 100 a day, one domain, and sending to real recipients needs a **verified domain**.
- **Brevo free plan**: 300 a day, but if the sender domain is not authenticated with DKIM it rewrites the sender to `@brevosend.com`, and a Gmail sender cannot be authenticated. Poor deliverability for reminders that must look trustworthy.

**Decision:** launch with email switched off (`EMAIL_PROVIDER=none`). Overdue reminders still work: the app shows overdue invoices and prepares a reminder the user sends from their own email app in one tap. This is arguably better for support workers anyway, because plan managers recognise the sender. Account recovery uses a one-time recovery code shown at sign-up, so no email is needed.

When revenue covers a domain (about A$15 to A$25 a year, so 3 monthly subscribers), buy one, verify it in Resend, set `EMAIL_PROVIDER=resend` and the key, and automatic reminder emails start. The code, caps and cron job are already built and tested. Steps are in `LAUNCH_CHECKLIST.md`.

### 1.3 "PayID QR" is not a real scan-to-pay standard

The NPP published a QR code standard in 2019, but bank uptake has been slow and Australian banking apps do not share one scan-to-pay format for PayIDs.

**Decision:** the QR code on the invoice either opens a real payment link (if the user has one, for example a card payment link) or holds the PayID, amount and reference so the payer can copy them. The label says exactly that: "Scan to copy the PayID and reference". We never say "scan to pay" unless it is a payment link.

### 1.4 Cloudflare Pages is no longer the right default

Cloudflare still supports Pages, but its guidance for new projects is Workers with static assets, and Cron Triggers are a Workers feature. **Decision:** one Worker serves the static site and the API, and runs the daily cron. Static files are free and unlimited and do not count towards the 100,000 Worker requests a day. The free URL is `shiftbill.<your-subdomain>.workers.dev` rather than `*.pages.dev`.

### 1.5 The 10 ms CPU limit shapes password hashing

Workers Free allows 10 ms of CPU per request. PBKDF2 at the OWASP-recommended 600,000 iterations would take well over 100 ms. Measured locally: 10,000 iterations take about 6.5 ms, 100,000 about 54 ms.

**Decision:** PBKDF2-SHA256 at 10,000 iterations (configurable) **plus a secret pepper** held in a Worker secret, not the database. A database leak alone is not enough to crack passwords offline. Iterations are stored per user, so when we move to Workers Paid (5 minutes CPU) we raise `PBKDF2_ITERATIONS` and each user's hash is upgraded at their next login. Recorded as a known trade-off in `SECURITY.md`.

## 2. Free tiers and commercial use (verified 21 Oct 2026)

| Service | Free limit | Commercial use | Notes |
| --- | --- | --- | --- |
| Cloudflare Workers Free | 100,000 requests a day, 10 ms CPU per request, 5 cron triggers per account, 20,000 static files | Allowed under the Self-Serve Subscription Agreement (no personal-use clause). Luan to confirm when creating the account | Over the daily limit, Cloudflare returns error 1027 or fails open. It does not bill. |
| Cloudflare D1 | 5 million rows read a day, 100,000 rows written a day, 5 GB total | As above | Since 1 Sep 2026 queries **fail** when the daily limit is hit (reset at midnight UTC). No surprise bill. We show a "temporarily at capacity" page. |
| Workers Rate Limiting binding | Included | As above | Per-location counters, good enough for abuse control. |
| Cloudflare Web Analytics | Free | Yes | Cookieless. |
| Stripe | No monthly fee | Yes | Australian domestic cards 1.65% + A$0.30 from 1 Oct 2026. Stripe Billing adds a percentage on subscription volume (check `stripe.com/au/pricing` at go-live). |
| Resend | 3,000 a month, 100 a day | Yes | Needs a verified domain (see 1.2). |
| GitHub Free | Unlimited public and private repos, 2,000 Actions minutes a month for private repos | Yes | CI uses about 1 to 2 minutes a run. |
| ABN Lookup web services (ABR) | Free with a registered GUID | Must accept the ABR web services agreement at registration | Optional. Without a GUID the app falls back to the ATO check-digit test and a link to abr.business.gov.au. |
| **Vercel Hobby** | n/a | **Not allowed.** Non-commercial personal use only, taking payments counts as commercial | Not used. |
| Supabase free | 2 projects | Allowed | Not used: free projects pause after inactivity and D1 keeps everything in one account. |

## 3. NDIS and tax requirements (sources checked 21 Oct 2026)

What the official sources say, and how the product follows it:

- **Plan-managed:** invoices go to the plan manager. The invoice must include a valid ABN unless the provider is exempt, in which case a "statement by a supplier" form is needed. (NDIS, Guide to getting paid.)
- **Details a claim needs:** participant name, participant NDIS number, dates of support, support item reference number, support item price. (NDIS, Guide to getting paid.) The template makes all of these fields prominent. We do not invent extra "mandatory" fields; third-party lists of "13 mandatory fields" were not confirmed on ndis.gov.au.
- **Self-managed:** the participant pays the provider and must keep invoices as evidence. (NDIS, self-management evidence requirements, 14 Oct 2024.)
- **NDIA-managed:** not invoiced. Registered providers make payment requests in the provider portal. Unregistered providers cannot be paid from NDIA-managed funds. The template warns when NDIA-managed is selected.
- **Pricing 2026-27:** the NDIA published a Pricing Schedule (prices only) rather than an updated Pricing Arrangements and Price Limits document. Example: 01_011_0107_1_1 (self-care, weekday daytime) has a national price limit of $73.58 an hour from 1 July 2026. Differentiated pricing for unregistered providers is under consultation, recommended from 1 January 2027.
  - **Decision:** never hardcode rates. The app suggests a few common item numbers only (no prices) and shows "check against the current NDIS price guide" next to them.
- **Registration changes 2026:** mandatory registration is being introduced for SIL and platform providers, not for most independent support workers. Plan-managed and self-managed participants can still use unregistered providers. (Secondary sources, to re-check each July.)
- **GST:** only a GST-registered seller issues a "tax invoice". Unregistered sellers issue an invoice with no GST. (ATO, Tax invoices.) Many NDIS supports are GST-free when conditions are met.
  - **Decision:** GST is off by default. When the user says they are registered, the title becomes "Tax invoice", lines default to GST-free in NDIS mode, and the user can untick that per line.
- **ABN:** without an ABN, a business customer may have to withhold tax at the top rate. The template warns when the ABN is missing and blocks an ABN that fails the ATO check-digit test.

Sources:
- NDIS, Guide to getting paid: https://www.ndis.gov.au/providers/pricing-and-payments/payments/guide-getting-paid
- NDIS, Information about self-management evidence requirements: https://ndis.gov.au/news/10440-information-about-self-management-evidence-requirements
- NDIS, New price limits set for NDIS supports: https://ndis.gov.au/news/11701-new-price-limits-set-ndis-supports
- NDIS Pricing Schedule 2026-27 (item 01_011_0107_1_1): https://ndis.gov.au/media/8841/download
- ATO, Tax invoices: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/tax-invoices
- ABR web services: https://abr.business.gov.au/Tools/WebServices
- Cloudflare Workers limits and pricing, D1 pricing and the 1 Sep 2026 enforcement changelog, Email Service pricing: developers.cloudflare.com (read through Cloudflare's documentation search)
- Resend sending limits: https://resend.com/docs/knowledge-base/resend-sending-limits
- Stripe, Updates to card pricing in Australia from October 2026: https://support.stripe.com/questions/updates-to-card-pricing-in-australia-from-october-2026
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- NPP QR code standard (2019) and bank uptake: https://azupay.com.au/blog/does-australia-have-a-qr-code-problem/

## 4. Product decisions

- **Name:** ShiftBill. No invoicing product with that name turned up in searches. Before buying a domain, check ASIC business names and `.com.au` availability.
- **Price:** A$7 a month or A$59 a year, set in `src/shared/config.ts` and Stripe. Luan is under the A$75,000 GST threshold, so prices carry no GST. If that changes, prices must be shown GST-inclusive.
- **Free vs paid:** the brief put PayID and QR details in the paid tier. Moved them to free: they cost nothing to run, they are one of the few visible gaps in free competitors, and they make the free template worth sharing. The paid tier is the shift log, unlimited saved participants and invoices, overdue reminders, tax set-aside, CSV export and ABN lookup.
- **Free account limits:** 2 participants, 10 invoices, 10 shifts. Enough to try the shift log properly.
- **Small "Made with ShiftBill" footer** on free PDFs. It is the main word-of-mouth channel to plan managers. Paid PDFs have no footer.
- **No health data:** no notes field on participants, and the invoice notes field tells users not to include health or diagnosis details.

## 5. Engineering decisions

- **No framework.** A small TypeScript static-site build (`scripts/build.ts`) renders pages from template functions, and esbuild bundles the browser code. Astro was considered but adds a large dependency for little gain here.
- **Own PDF writer** (`src/shared/pdf.ts`, about 200 lines) using the built-in Helvetica fonts instead of pdf-lib or jsPDF. It keeps the generator page at about 17 KB of JS on first load (7 KB gzipped). The PDF code (about 36 KB with the QR encoder) loads only when the user taps Download.
- **One dependency at runtime:** `qrcode-generator` (MIT, no dependencies).
- **Tests use Node's built-in test runner** (`node:test`). Vitest 4 and 5 failed to install with npm 10.9 (an npm peer-resolution bug), and the built-in runner removes a dependency.
- **D1 has no row level security.** Every query goes through `src/worker/db.ts`, where each function takes the signed-in user's id and includes it in the `WHERE` clause. Tests check that one user cannot read or change another user's rows. See `SECURITY.md`.
- **NDIS numbers are encrypted** with AES-GCM using a key held in a Worker secret before they are written to D1 (D1 also encrypts at rest). Invoice snapshots, which contain the NDIS number, are encrypted the same way.
- **Attribution:** first-touch UTM parameters are kept in the visitor's browser and sent only with funnel events (template completed, sign-up). Paid conversions inherit the sign-up's source. No cookies, no third-party trackers.
