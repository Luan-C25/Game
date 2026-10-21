# Launch checklist

Everything here needs your accounts, your money or your sign-off, so only you can do it. Work top to bottom. Each part says how long it takes.

Never paste a secret into a chat, an issue or a commit. Secrets only go into GitHub's **Secrets** page and your password manager.

Dashboards change their wording from time to time. If a button has a slightly different name, look for the closest match.

---

## Part 1: Decisions only you can make (10 minutes)

- [ ] **Business name.** In Australia, trading under a name that is not your own legal name usually needs an ASIC business name registration (about A$45 for 1 year). Until there is revenue, the site says it is "operated by" you in your own name, and ShiftBill is the product's name. Decide whether you are comfortable with that or want to register the name now. If unsure, ask ASIC Connect or a lawyer.
- [ ] **ABN for yourself.** You will be selling as a sole trader. Getting an ABN is free (abr.gov.au, "Apply for an ABN"). Stripe asks for business details when you activate live payments.
- [ ] **Support email.** Make a free Gmail just for this, for example `shiftbill.help@gmail.com`. It goes on every page.
- [ ] **Legal review.** The privacy policy and terms (`/privacy/`, `/terms/`) are drafts written to follow the Australian Privacy Principles. **Have a lawyer review them before taking real payments at scale.** Test mode and the free template are fine without it.

## Part 2: Cloudflare account (20 minutes)

1. [ ] Go to `dash.cloudflare.com/sign-up`, sign up with your support email, verify it. Choose the **Free** plan. **Do not add a card.**
2. [ ] **Pick your workers.dev address.** In the left menu click **Workers & Pages** (under Compute). The first time, it asks you to choose a subdomain. Try `shiftbill`. Your site will be `https://shiftbill.<your-subdomain>.workers.dev`. Write the full address down: this is your `SITE_URL`.
3. [ ] **Create the database.** Left menu: **Storage & databases** > **D1 SQL database** > **Create database**. Name: `shiftbill`. Location: **Oceania**. Click **Create**. Copy the **Database ID** (a long code with dashes).
4. [ ] **Copy your Account ID.** Open **Workers & Pages**. The Account ID is in the right-hand column. Copy it.
5. [ ] **Create an API token for deploys.** Click the person icon (top right) > **Profile** > **API Tokens** > **Create Token** > **Edit Cloudflare Workers** > **Use template**. Under Permissions click **+ Add more** and add **Account** > **D1** > **Edit**. Under Account Resources choose your account. Click **Continue to summary** > **Create Token**. Copy the token (it is shown once).
6. [ ] **Web Analytics.** Left menu: **Analytics & Logs** > **Web Analytics** > **Add a site**. Enter your workers.dev address from step 2. Choose the manual (JavaScript snippet) option. In the snippet, copy only the token value after `"token": "`. This is your `CF_BEACON_TOKEN`.

## Part 3: Make four random secrets (5 minutes)

Use a password manager (Bitwarden is free). Generate four separate random passwords, **48 characters long**, and save each one in the password manager with these names:

- [ ] `DATA_KEY`: encrypts NDIS numbers, bank details and invoices. **If you lose it, saved data cannot be read. Never change it after launch.**
- [ ] `PASSWORD_PEPPER`: protects passwords. **Never change it after launch** (everyone would need their recovery code).
- [ ] `SIGNING_KEY`: signs template pack download links.
- [ ] `ADMIN_TOKEN`: your password for the `/admin/` report.

## Part 4: GitHub settings (15 minutes)

Open the repository on GitHub > **Settings** > **Secrets and variables** > **Actions**.

**Secrets tab** > **New repository secret**, one at a time:

| Name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token from Part 2 step 5 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from Part 2 step 4 |
| `D1_DATABASE_ID` | Database ID from Part 2 step 3 |
| `DATA_KEY` | From your password manager |
| `PASSWORD_PEPPER` | From your password manager |
| `SIGNING_KEY` | From your password manager |
| `ADMIN_TOKEN` | From your password manager |

**Variables tab** > **New repository variable**:

| Name | Value |
| --- | --- |
| `SITE_URL` | `https://shiftbill.<your-subdomain>.workers.dev` (no slash at the end) |
| `SUPPORT_EMAIL` | Your support Gmail |
| `OPERATOR_NAME` | Your full legal name |
| `OPERATOR_ABN` | Your ABN, or leave it out for now |
| `CF_BEACON_TOKEN` | From Part 2 step 6 |

## Part 5: Go live, free features only (10 minutes)

1. [ ] On GitHub open **Pull requests** > "ShiftBill: NDIS invoicing and shift log (first release)" > **Ready for review** > **Merge pull request**.
2. [ ] Open the **Actions** tab. The **Deploy** workflow starts. Wait for the green tick (about 3 minutes). If it is red, open it: the first failing step says which setting is missing. Fix it, then **Actions** > **Deploy** > **Run workflow**.
3. [ ] On your phone, open `SITE_URL/ndis-invoice-template/`. Make a test invoice with made-up details and download the PDF.
4. [ ] Open `SITE_URL/app/`, create an account, save the recovery code, add a made-up participant, log two shifts, invoice them, download the PDF.
5. [ ] Open `SITE_URL/admin/`, paste your `ADMIN_TOKEN`. You should see your test template download and sign-up.
6. [ ] Open `SITE_URL/api/health`. It should say `"ok":true`.

The free template, accounts and shift log are now live. Paid plans show "not on sale yet" until Part 6.

## Part 6: Stripe in test mode (30 minutes)

1. [ ] Sign up at `dashboard.stripe.com/register`, country **Australia**. Stay in **test mode** (the "Test mode" or "Sandbox" switch). You do not need to verify your identity yet.
2. [ ] **Products.** **Product catalogue** > **Add product**:
   - Name `ShiftBill`, price **A$7.00**, **Recurring**, **Monthly**. Save. Then on the same product **Add another price**: **A$59.00**, **Recurring**, **Yearly**.
   - Name `ShiftBill template pack`, price **A$19.00**, **One-off**.
   - Open each price and copy its ID (starts `price_`).
3. [ ] **API key.** **Developers** > **API keys** > copy the **Secret key** (starts `sk_test_`).
4. [ ] **Webhook.** **Developers** > **Webhooks** > **Add endpoint**. URL: `SITE_URL/api/stripe/webhook`. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Save, then reveal and copy the **Signing secret** (starts `whsec_`).
5. [ ] **Customer portal.** **Settings** > **Billing** > **Customer portal**. Turn on: cancel subscriptions, update payment methods, invoice history, and switch plans (add the ShiftBill product's two prices). Save.
6. [ ] Add GitHub **secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_PACK`.
7. [ ] **Actions** > **Deploy** > **Run workflow**.
8. [ ] **Test it.** In the app go to **Settings** > **Upgrade** > **A$7 a month**. Pay with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode. You come back to the app on the paid plan, and the shift log is unlimited. Then **Manage billing** > cancel. Then buy the template pack on `SITE_URL/templates/` with the same test card and download the zip.

## Part 7: Search and social (20 minutes)

- [ ] **Google Search Console** (`search.google.com/search-console`): **Add property** > **URL prefix** > your `SITE_URL`. Choose **HTML tag**, copy only the `content="..."` value, and add it as a GitHub **variable** named `GOOGLE_SITE_VERIFICATION`. Run **Deploy**, then click **Verify**. Then **Sitemaps** > submit `sitemap.xml`.
- [ ] **Bing Webmaster Tools**: sign in and choose **Import from Google Search Console**.
- [ ] **TikTok**: create an account for ShiftBill. Switch it to a free Business account if you need it to add a website to the bio. Use the bio link from `content/LINKS.md`.
- [ ] **Reddit**: use your own account. Read `content/REDDIT_POSTS.md` and check each subreddit's rules on the day.

## Part 8: Optional, ABN lookup (10 minutes)

- [ ] Register at `abr.business.gov.au/Tools/WebServices` (**Register for web services**). Read and accept the web services agreement. The GUID arrives by email. Add it as a GitHub secret `ABR_GUID` and run **Deploy**. Without it, the app still checks ABNs with the ATO check-digit rule.

## Part 9: Going live with real payments (when you are ready)

Tell me before you start this part and I will check everything first.

1. [ ] Lawyer review of the privacy policy and terms is done (Part 1).
2. [ ] In Stripe, click **Activate payments** and complete identity verification, your ABN or individual details, and your bank account. Only you can do this.
3. [ ] Switch Stripe to **live mode** and repeat Part 6 steps 2 to 5 (live products, live webhook endpoint, live portal settings).
4. [ ] Replace the five Stripe GitHub secrets with the live values (`sk_live_...`, the live `whsec_...`, live price IDs).
5. [ ] Add a GitHub secret `ALLOW_LIVE_PAYMENTS` with the value `yes`. Without it, live keys are refused on purpose.
6. [ ] Run **Deploy**. Make one real A$7 purchase with your own card, check it unlocks, then refund it in Stripe.

## Part 10: Later, once 3 people pay monthly (about A$20 a year)

This is the first thing that costs money. It switches on automatic reminder emails.

1. [ ] **Buy a domain.** Recommended: **Cloudflare Registrar** (sells at cost with no mark-up, and the domain sits in the same account as the site). In Cloudflare: **Domain Registration** > **Register Domains**, search, buy. This needs a card: only do it once revenue covers it. If you want a `.com.au`, check whether Cloudflare offers it at the time; if not, use an Australian registrar such as VentraIP and point the nameservers to Cloudflare.
2. [ ] **Connect it.** **Workers & Pages** > `shiftbill` > **Settings** > **Domains & Routes** > **Add** > **Custom domain** > your domain.
3. [ ] Update the GitHub variable `SITE_URL` to the new address, change the Stripe webhook URL to match, add the new address in Web Analytics, and run **Deploy**.
4. [ ] **Resend.** Sign up at `resend.com` (free plan, no card). **Domains** > **Add domain** (for example `mail.yourdomain.com.au`), add the DNS records it shows in Cloudflare **DNS**, and wait for **Verified**. **API Keys** > **Create API key** with sending access only.
5. [ ] GitHub secrets: `EMAIL_PROVIDER` = `resend`, `RESEND_API_KEY` = the key, `EMAIL_FROM` = `ShiftBill reminders <reminders@mail.yourdomain.com.au>`. Run **Deploy**. Automatic reminders start at the next daily run (7:30 am Brisbane time, 8:30 am in Sydney during daylight saving), capped at 90 a day.

## If something goes wrong

- **Site down or errors**: Cloudflare > **Workers & Pages** > `shiftbill` > **Logs**. Each request is logged as JSON with no personal data. `SITE_URL/api/health` shows whether the database is reachable.
- **"Temporarily at capacity"**: the free daily database limit was reached. It resets at 10 or 11 am east coast time. If it happens often, see `COSTS.md` (Workers Paid, US$5 a month).
- **A user lost their password and recovery code**: they email you from their account address. Check it matches, then ask me to help reset it.
