# ShiftBill

Invoices and a shift log for independent NDIS support workers in Australia.

- **Free:** an NDIS invoice template and a general Australian invoice template that make a PDF in the browser, with no account. Data stays in the browser.
- **Paid (A$7 a month or A$59 a year):** a phone-friendly shift log where ticked shifts become invoice lines in one tap, saved participants and rates, repeat invoices, overdue reminders, a tax set-aside estimate, CSV export and ABN lookup.
- **One-off (A$19):** a template pack with a service agreement, a shift note and an onboarding checklist.

It runs on Cloudflare's free plan for A$0 a month until people pay. See `COSTS.md`.

## Where things are

| Document | What it covers |
| --- | --- |
| `LAUNCH_CHECKLIST.md` | Everything Luan needs to do to go live, click by click |
| `DECISIONS.md` | Research findings, sources and every product and technical decision |
| `COSTS.md` | Each service, its free limit, when it would cost money, and how many paying users cover it |
| `SECURITY.md` | Threat note, controls and known gaps |
| `content/` | TikTok scripts, Reddit posts, UTM links, week one plan, example images |

## How it is built

One Cloudflare Worker serves the static site and the API, and runs a daily cron. Static pages are free and do not count towards the Worker's daily request limit; only `/api/*` runs Worker code.

```
src/
  shared/    Code used by the browser, the Worker and the tests:
             money (integer cents), invoice maths and validation, shifts,
             tax set-aside, PDF writer, QR, CSV, settings, reminder wording
  client/    Browser code: the free template, the app (hash routes), admin report, pack page
  site/      Page content and layout, rendered to static HTML at build time
  worker/    API: auth, scoped data access (db.ts), invoices, Stripe, reminders, money, pack
migrations/  D1 schema
scripts/     Static site build, template pack (DOCX and ZIP writer), JS size budget check
test/        Node test runner tests, with a D1 stand-in backed by node:sqlite
```

Dependencies: one at runtime (`qrcode-generator`). Build and test: TypeScript, esbuild, wrangler.

## Run it locally

Needs Node 22.

```sh
npm install
cp .dev.vars.example .dev.vars   # then fill in long random strings
npm run db:migrate:local
npm run dev                      # http://localhost:8787
```

## Checks

```sh
npm run typecheck   # browser and Worker code, separately
npm test            # 89 tests: invoice maths, GST, rounding, numbering, shifts, PDF,
                    # auth, CSRF, cross-user isolation, encryption, Stripe webhooks,
                    # reminders and email caps, money, CSV, template pack
npm run build       # writes dist/
npm run check       # all of the above plus the 100 KB first-load JS budget
```

CI runs these on every pull request. Merging to `main` deploys (`.github/workflows/deploy.yml`).

## Changing prices

1. In Stripe, add a new price to the product (prices cannot be edited, only replaced).
2. Put the new price ID in the GitHub secret (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` or `STRIPE_PRICE_PACK`).
3. Change the display amount in `src/shared/config.ts` (`PRICES`).
4. Merge to `main`. Existing subscribers stay on their old price unless you move them in Stripe.

Free account limits are in the same file (`FREE_LIMITS`).

## Each July

NDIS item numbers and price limits usually change on 1 July. The app never hardcodes rates, but check `COMMON_ITEMS` in `src/shared/config.ts` (suggested item numbers only, no prices) and the guide pages against the new NDIS Pricing Schedule, and update the "checked on" dates.

## Observability

- `GET /api/health` reports whether the Worker and database are working.
- Workers Logs (Cloudflare dashboard) has one structured JSON line per API request, plus cron and Stripe events, with no personal data.
- `/admin/` shows the funnel by traffic source (needs `ADMIN_TOKEN`).
- `/capacity/` is shown if the free database limits are reached for the day.
