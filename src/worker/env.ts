export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RL_AUTH?: RateLimit;
  RL_PUBLIC?: RateLimit;
  RL_API?: RateLimit;

  APP_ENV: string; // "development" | "production"
  /** Public base URL, e.g. https://shiftbill.example.workers.dev (used in emails and Stripe redirects). */
  SITE_URL?: string;

  // Secrets (wrangler secret put ...). See .dev.vars.example.
  DATA_KEY: string; // random string, 32+ characters. Encrypts NDIS numbers, bank details and invoices.
  PASSWORD_PEPPER: string; // random string, mixed into password hashes.
  SIGNING_KEY: string; // random string, signs download links.
  ADMIN_TOKEN?: string; // bearer token for /api/admin/stats.
  PBKDF2_ITERATIONS?: string;

  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_MONTHLY?: string;
  STRIPE_PRICE_YEARLY?: string;
  STRIPE_PRICE_PACK?: string;
  /** Must be "yes" before an sk_live_ key is accepted. Test mode until Luan confirms go-live. */
  ALLOW_LIVE_PAYMENTS?: string;

  EMAIL_PROVIDER?: string; // "none" (default) | "resend"
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string; // e.g. "ShiftBill <reminders@yourdomain.com.au>"
  EMAIL_DAILY_CAP?: string; // default 90 (Resend free: 100 a day)
  EMAIL_MONTHLY_CAP?: string; // default 2900 (Resend free: 3,000 a month)

  ABR_GUID?: string; // optional ABN Lookup web services GUID
}
