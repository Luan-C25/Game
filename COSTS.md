# Costs

**Fixed monthly cost today: A$0.** Every service below is on a free plan, and nothing has a card attached. Prices were checked on 21 October 2026. US-dollar prices are converted at roughly A$1.55 to US$1; check the rate when you pay.

The rule: we only start paying for something once paying users already cover it. Every fee that grows with use is per transaction (Stripe) or only starts after a free limit that a handful of subscribers would pay for many times over.

## Net revenue per sale (after Stripe fees)

Stripe charges 1.65% + A$0.30 per domestic card payment (from 1 October 2026), plus Stripe Billing on subscriptions (about 0.7% of the amount; confirm on stripe.com/au/pricing before go-live). International cards cost more.

| Product | Price | Stripe fees (approx.) | You keep |
| --- | --- | --- | --- |
| Monthly plan | A$7.00 | A$0.46 | **A$6.54** a month |
| Yearly plan | A$59.00 | A$1.69 | **A$57.31** a year (A$4.78 a month) |
| Template pack | A$19.00 | A$0.61 | **A$18.39** once |

## Services

| Service | Used for | Free limit | Starts costing when | Cost then | Paying users to cover it |
| --- | --- | --- | --- | --- | --- |
| Cloudflare Workers (Free) | Website, app, API, daily cron | 100,000 Worker requests a day; static pages are free and unlimited; 10 ms CPU per request; 5 cron triggers | Roughly 2,000 to 3,000 people using the app every day, or we want stronger password hashing (more CPU) | Workers Paid: US$5 (about A$8) a month, includes 10 million requests | **2 monthly subscribers** |
| Cloudflare D1 (Free) | Database | 5 million rows read and 100,000 rows written a day, 5 GB storage | Same scale as above. When a daily limit is hit, queries fail until midnight UTC and the site shows "temporarily at capacity". It never bills. | Included in Workers Paid (25 billion reads a month) | Covered by the line above |
| Cloudflare Web Analytics | Page views | Free | n/a | n/a | n/a |
| Workers Rate Limiting | Abuse protection | Free | n/a | n/a | n/a |
| GitHub (Free) | Code, CI, deploys | Unlimited repos; 2,000 Actions minutes a month for private repos | Over about 1,000 deploys or CI runs a month | Usually just make the repo public, or US$4 a month | n/a |
| Stripe | Payments | No monthly fee | Every sale | See the table above | Paid out of each sale |
| Domain name | Real address, and required for email | Not bought yet. The site runs on `*.workers.dev` | When we want automatic reminder emails or a nicer address | About A$15 to A$25 a year | **1 month of 3 monthly subscribers** |
| Resend (Free) | Reminder emails | 3,000 emails a month, 100 a day. Needs a verified domain. Our caps: 2,900 a month, 90 a day | Above about 100 reminder emails a day | Resend Pro: US$20 (about A$31) a month for 50,000 | **5 monthly subscribers**. Not needed until well past 100 paying users. |
| ABN Lookup web services | Business name lookup | Free with a registered GUID | n/a | n/a | n/a |

## In order, what we would pay for first

1. **Domain, about A$20 a year**, once there are 3 paying subscribers. It switches on automatic reminder emails (Resend's free plan needs a domain) and gives a better address for search and trust. Steps are in `LAUNCH_CHECKLIST.md`.
2. **Workers Paid, US$5 a month**, only if we hit the daily request or database limits (the admin report and Cloudflare will show this), or if we want to raise password hashing strength. Two monthly subscribers cover it.
3. **Resend Pro, US$20 a month**, only past about 100 reminder emails a day, which means hundreds of paying users.

## Hard caps already in place

- Email: at most 90 a day and 2,900 a month, enforced in the database before any email is sent. At the cap, reminders wait until the next day and the app tells the user.
- The cron job sends at most 40 emails per run.
- Rate limits: 10 sign-ups or logins per minute per IP, 30 public events per minute per IP, 120 API calls per minute per user.
- Fair-use caps per paid account: 200 participants, 5,000 invoices, 20,000 shifts.
- D1 over its free daily limit fails safe with a capacity page, not a bill. No provider has a card on file, so nothing can be charged.

**Never** switch on a pay-as-you-go plan or add a card to Cloudflare, Resend or GitHub without deciding it together first.
