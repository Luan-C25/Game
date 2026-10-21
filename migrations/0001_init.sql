-- ShiftBill schema. D1 (SQLite). Every user-owned table has user_id and every
-- query in src/worker/db.ts filters by it. Money is integer cents; quantities
-- (hours, km) are integer hundredths.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pw_iterations INTEGER NOT NULL,
  recovery_hash TEXT NOT NULL,
  -- Business details, bank details and preferences as encrypted JSON (AES-GCM).
  settings_enc TEXT NOT NULL DEFAULT '',
  next_invoice_seq INTEGER NOT NULL DEFAULT 1,
  -- First-touch attribution copied from the browser at sign-up.
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  referrer_host TEXT, landing_path TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ndis_number_enc TEXT,            -- AES-GCM ciphertext, never plaintext
  plan_type TEXT NOT NULL CHECK (plan_type IN ('self', 'plan', 'ndia')),
  bill_to_name TEXT NOT NULL DEFAULT '',
  bill_to_email TEXT NOT NULL DEFAULT '',
  bill_to_abn TEXT NOT NULL DEFAULT '',
  item_number TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  rate_cents INTEGER NOT NULL DEFAULT 0,
  km_item_number TEXT NOT NULL DEFAULT '',
  km_rate_cents INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX participants_user ON participants(user_id, archived);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  -- Full InvoiceInput as encrypted JSON (it contains the NDIS number).
  snapshot_enc TEXT NOT NULL,
  bill_to_label TEXT NOT NULL DEFAULT '',   -- display only, e.g. plan manager name
  subtotal_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  sent_at TEXT,
  paid_at TEXT,
  paid_cents INTEGER,
  set_aside_cents INTEGER,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, number)
);
CREATE INDEX invoices_user_date ON invoices(user_id, issue_date);
CREATE INDEX invoices_due ON invoices(status, due_date);

CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  item_number TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  rate_cents INTEGER NOT NULL,
  km INTEGER NOT NULL DEFAULT 0,
  km_rate_cents INTEGER NOT NULL DEFAULT 0,
  km_item_number TEXT NOT NULL DEFAULT '',
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX shifts_user_date ON shifts(user_id, date);
CREATE INDEX shifts_invoice ON shifts(invoice_id);

CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  price_id TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX subscriptions_customer ON subscriptions(stripe_customer_id);

-- Webhook idempotency: an event id is processed at most once.
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL
);

-- Template pack purchases. No buyer details are stored; Stripe holds those.
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  utm_source TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Funnel events. No personal information: type, campaign fields and an optional user id.
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  user_id TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT,
  referrer_host TEXT, landing_path TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX events_type_date ON events(type, created_at);

-- Email send counters so we never pass the provider's free limits.
CREATE TABLE email_counters (
  period TEXT PRIMARY KEY,   -- 'd:2026-10-21' or 'm:2026-10'
  count INTEGER NOT NULL
);
