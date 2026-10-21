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
  DATA_KEY: string; // base64, 32 bytes. Encrypts NDIS numbers and invoice snapshots.
  PASSWORD_PEPPER: string; // random string, mixed into password hashes.
  SIGNING_KEY: string; // random string, signs download links.
  ADMIN_TOKEN?: string; // bearer token for /api/admin/stats.
  PBKDF2_ITERATIONS: string;

  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_MONTHLY?: string;
  STRIPE_PRICE_YEARLY?: string;
  STRIPE_PRICE_PACK?: string;
  /** Must be "yes" before an sk_live_ key is accepted. Test mode until Luan confirms go-live. */
  ALLOW_LIVE_PAYMENTS?: string;

  EMAIL_PROVIDER: string; // "none" | "resend"
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string; // e.g. "ShiftBill <reminders@yourdomain.com.au>"
  EMAIL_DAILY_CAP: string;
  EMAIL_MONTHLY_CAP: string;

  ABR_GUID?: string; // optional ABN Lookup web services GUID
}
