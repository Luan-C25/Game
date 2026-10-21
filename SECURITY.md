# Security

A short threat note: what we protect, from whom, how, and the gaps we know about.

## What we hold

| Data | Where | Protection |
| --- | --- | --- |
| Free template entries (including NDIS numbers and bank details) | The visitor's own browser (localStorage) only | Never sent to us. "Clear my saved details" removes it. |
| Account email, password hash, recovery code hash | D1 | PBKDF2-SHA256 with a secret pepper (see below). Recovery code stored as an HMAC. |
| Business and bank details (settings) | D1 | AES-256-GCM encrypted with a key held in a Worker secret. |
| Participant name, plan type, bill-to details, rates | D1 | Scoped to the owner. |
| Participant NDIS number | D1 | AES-256-GCM encrypted. Never logged, never in URLs, analytics, CSV exports or reminder emails. |
| Invoice snapshots (contain the NDIS number) | D1 | AES-256-GCM encrypted. Totals and dates are stored in plain columns for lists and reminders. |
| Shifts | D1 | Scoped to the owner. No care notes or health details are collected. |
| Payment cards | Stripe only | We never see card numbers. We store a Stripe customer id and subscription status. |
| Funnel events | D1 | Event type and campaign source only. No names, emails or IP addresses. |

## Threats and controls

- **One user reading another's data.** D1 has no row level security, so every user-owned query lives in `src/worker/db.ts` and filters by the signed-in user's id. Route handlers never write SQL. `test/isolation.test.ts` signs up two users and checks that the second cannot list, read, edit, delete, invoice or repeat anything of the first, by id or otherwise. A shift can only be logged against your own participant.
- **Stolen session cookie.** Sessions are random 256-bit tokens, stored only as SHA-256 hashes. Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` and `__Host-` prefixed on HTTPS, and expire after 30 days. Changing the password or using the recovery code logs out every device.
- **Cross-site request forgery.** Every state-changing API call needs the `X-ShiftBill: 1` header (a cross-site form cannot send it without a CORS preflight, which we never approve) and, when the browser sends one, a same-origin `Origin` header. Plus `SameSite=Lax` cookies.
- **Cross-site scripting.** A strict Content Security Policy (`script-src 'self'` plus the Cloudflare analytics host, no inline scripts, `frame-ancestors 'none'`). The app builds the page with `textContent`, never `innerHTML` with user data. JSON-LD blocks escape `<`.
- **Password guessing.** Rate limits on sign-up, login and recovery (10 a minute per IP, and per email for login). Generic "email or password is not right" on login.
- **Database leak.** Passwords use PBKDF2 over an HMAC with a pepper kept in a Worker secret, so a database copy alone does not allow offline guessing. NDIS numbers, bank details and invoices need the separate `DATA_KEY` secret.
- **Forged Stripe webhooks.** Signatures are checked with HMAC-SHA256 against the webhook secret, with a 5-minute timestamp tolerance and a constant-time compare. Each event id is processed once, and handlers are upserts so a retry is harmless.
- **Accidental live charges.** `sk_live_` keys are refused unless `ALLOW_LIVE_PAYMENTS=yes` is set.
- **Template pack sharing.** The zip is bundled into the Worker, not public files. Download links are HMAC-signed, expire after 7 days, and work 20 times.
- **Spreadsheet formula injection.** CSV text cells starting with `= + - @` are prefixed with an apostrophe.
- **Input abuse.** Request bodies are size-capped and every field is trimmed, length-capped and validated on the server, regardless of what the browser checks.
- **Surprise bills.** See `COSTS.md`: free plans with no card on file, hard email caps, rate limits and fair-use caps.
- **Secrets.** Only in GitHub repository secrets and Cloudflare Worker secrets. `.dev.vars` is git-ignored; `.dev.vars.example` and `.env.example` contain placeholders only. Logs whitelist fields and never include request bodies or personal data.

## Known trade-offs and gaps

- **Password hashing strength.** OWASP recommends 600,000 PBKDF2 iterations. Workers Free allows 10 ms of CPU per request, so we use 10,000 iterations plus the pepper. Hashes record their iteration count and are upgraded at next login, so raising `PBKDF2_ITERATIONS` after moving to Workers Paid needs no migration.
- **No email verification or two-factor login.** Sign-up does not prove the email address belongs to the user, because there is no email sending yet. Recovery is by a one-time code shown at sign-up. Add email verification when email is switched on.
- **Rate limits are per Cloudflare location** and approximate by design. Good enough for abuse control, not for exact quotas.
- **Cloudflare Web Analytics script** loads from Cloudflare's CDN without a Subresource Integrity hash, because Cloudflare updates it in place. CSP limits scripts to that host.
- **Legal review.** The privacy policy and terms are drafts. A lawyer must review them before taking payments at scale (see `LAUNCH_CHECKLIST.md`).

## Reporting a problem

Email the support address on the website. Please do not test against other people's accounts.
