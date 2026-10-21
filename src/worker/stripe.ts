// Stripe without the SDK: Checkout for subscriptions and the template pack, the
// Customer Portal for everything else, and a signed, idempotent webhook.
// Billing screens are Stripe's; we only store status.

import type { Env } from "./env.ts";
import { HttpError, json, readJson, assertSameOrigin } from "./http.ts";
import { hmacHex, timingSafeEqualStr, newId } from "./crypto.ts";
import { requireUser } from "./auth.ts";
import { getSubscription, isPaid } from "./db.ts";
import { cleanAttribution, recordEvent } from "./events.ts";
import { log } from "./log.ts";
import { rateLimit } from "./ratelimit.ts";
import { clientIp } from "./http.ts";

const API = "https://api.stripe.com/v1";
export const SIGNATURE_TOLERANCE_SECONDS = 300;

function siteUrl(env: Env, request: Request): string {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

/** Live payments stay off until Luan explicitly allows them (see LAUNCH_CHECKLIST.md). */
function stripeKey(env: Env): string {
  const key = env.STRIPE_SECRET_KEY ?? "";
  if (!key) throw new HttpError(503, "billing_off", "Billing is not set up yet.");
  if (key.startsWith("sk_live_") && env.ALLOW_LIVE_PAYMENTS !== "yes") {
    throw new HttpError(503, "billing_off", "Live payments are not switched on yet.");
  }
  return key;
}

/** Stripe wants form encoding with bracketed keys for nested values. */
export function formEncode(data: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") parts.push(formEncode(v as Record<string, unknown>, key));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.filter(Boolean).join("&");
}

export async function stripeRequest<T = Record<string, unknown>>(env: Env, method: "GET" | "POST" | "DELETE", path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = { authorization: `Bearer ${stripeKey(env)}` };
  if (body) headers["content-type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? formEncode(body) : undefined });
  const data = (await res.json()) as T & { error?: { message?: string; type?: string } };
  if (!res.ok) {
    log("error", "stripe_api", { path, status: res.status, type: data.error?.type ?? "" });
    throw new HttpError(502, "stripe_error", "The payment service had a problem. Please try again.");
  }
  return data;
}

// ------------------------------------------------------------------ checkout and portal

/** POST /api/billing/checkout { plan: "monthly" | "yearly" } -> { url } */
export async function createCheckout(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const user = await requireUser(request, env);
  await rateLimit(env.RL_AUTH, `checkout:${user.id}`);
  const body = await readJson(request, 1024);
  const price = body.plan === "yearly" ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;
  if (!price) throw new HttpError(503, "billing_off", "Billing is not set up yet.");
  const sub = await getSubscription(env, user.id);
  if (isPaid(sub)) throw new HttpError(409, "already_paid", "You already have the paid plan. Use Manage billing to change it.");
  const base = siteUrl(env, request);
  const session = await stripeRequest<{ id: string; url: string }>(env, "POST", "/checkout/sessions", {
    mode: "subscription",
    line_items: { 0: { price, quantity: 1 } },
    client_reference_id: user.id,
    ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: user.email }),
    subscription_data: { metadata: { user_id: user.id } },
    metadata: { user_id: user.id, product: "subscription" },
    allow_promotion_codes: "true",
    success_url: `${base}/app/#/billing?success=1`,
    cancel_url: `${base}/app/#/billing?cancelled=1`,
  });
  await recordEvent(env, "checkout_started", user.id, { utm_source: user.utm_source });
  return json({ url: session.url });
}

/** POST /api/billing/portal -> { url } */
export async function createPortal(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const user = await requireUser(request, env);
  const sub = await getSubscription(env, user.id);
  if (!sub) throw new HttpError(404, "no_customer", "There is no billing account yet.");
  const portal = await stripeRequest<{ url: string }>(env, "POST", "/billing_portal/sessions", {
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl(env, request)}/app/#/billing`,
  });
  return json({ url: portal.url });
}

/** Cancel straight away (used when an account is deleted). */
export async function cancelCustomerSubscriptions(env: Env, customerId: string): Promise<void> {
  const subs = await stripeRequest<{ data: { id: string; status: string }[] }>(env, "GET", `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`);
  for (const s of subs.data) {
    if (["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status)) await stripeRequest(env, "DELETE", `/subscriptions/${s.id}`);
  }
}

/** POST /api/pack/checkout -> { url } (no account needed) */
export async function createPackCheckout(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  await rateLimit(env.RL_PUBLIC, `pack:${clientIp(request)}`);
  if (!env.STRIPE_PRICE_PACK) throw new HttpError(503, "billing_off", "The template pack is not on sale yet.");
  const body = await readJson(request, 2048);
  const a = cleanAttribution((body.attribution ?? {}) as Record<string, unknown>);
  const base = siteUrl(env, request);
  const session = await stripeRequest<{ url: string }>(env, "POST", "/checkout/sessions", {
    mode: "payment",
    line_items: { 0: { price: env.STRIPE_PRICE_PACK, quantity: 1 } },
    metadata: { product: "template_pack", utm_source: a.utm_source ?? "" },
    success_url: `${base}/templates/thanks/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/templates/`,
  });
  return json({ url: session.url });
}

// ------------------------------------------------------------------ webhook

/** Verify Stripe's "t=...,v1=..." signature over "<t>.<raw body>". */
export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!t || !/^\d+$/.test(t) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(t)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return signatures.some((s) => timingSafeEqualStr(s, expected));
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number; price?: { id?: string } }[] };
  metadata?: Record<string, string>;
}

function periodEnd(s: StripeSubscription): string | null {
  // Newer API versions moved current_period_end onto the subscription items.
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function userIdForCustomer(env: Env, customerId: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?").bind(customerId).first<{ user_id: string }>();
  return row?.user_id ?? null;
}

async function upsertSubscription(env: Env, userId: string, s: StripeSubscription): Promise<void> {
  const before = await getSubscription(env, userId);
  await env.DB.prepare(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, cancel_at_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id,
       status = excluded.status, price_id = excluded.price_id, current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end, updated_at = excluded.updated_at`,
  )
    .bind(userId, s.customer, s.id, s.status, s.items?.data?.[0]?.price?.id ?? null, periodEnd(s), s.cancel_at_period_end ? 1 : 0, new Date().toISOString())
    .run();
  const after = await getSubscription(env, userId);
  if (!isPaid(before) && isPaid(after)) {
    const user = await env.DB.prepare("SELECT utm_source, utm_medium, utm_campaign FROM users WHERE id = ?").bind(userId).first<Record<string, string | null>>();
    await recordEvent(env, "subscribed", userId, { utm_source: user?.utm_source, utm_medium: user?.utm_medium, utm_campaign: user?.utm_campaign });
  }
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export async function processEvent(env: Env, event: StripeEvent): Promise<void> {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const metadata = (obj.metadata ?? {}) as Record<string, string>;
      if (obj.mode === "subscription" && typeof obj.customer === "string") {
        const userId = (obj.client_reference_id as string | null) ?? metadata.user_id;
        if (!userId || !(await env.DB.prepare("SELECT 1 AS x FROM users WHERE id = ?").bind(userId).first())) return;
        // Link the customer now; the subscription event fills in the status.
        await env.DB.prepare(
          `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, updated_at) VALUES (?, ?, ?, 'incomplete', ?)
           ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id)`,
        )
          .bind(userId, obj.customer, (obj.subscription as string | null) ?? null, new Date().toISOString())
          .run();
        if (typeof obj.subscription === "string") {
          const sub = await stripeRequest<StripeSubscription>(env, "GET", `/subscriptions/${obj.subscription}`);
          await upsertSubscription(env, userId, sub);
        }
      } else if (obj.mode === "payment" && metadata.product === "template_pack" && obj.payment_status === "paid") {
        await env.DB.prepare(
          "INSERT INTO purchases (id, stripe_session_id, product, amount_cents, utm_source, created_at) VALUES (?, ?, 'template_pack', ?, ?, ?) ON CONFLICT(stripe_session_id) DO NOTHING",
        )
          .bind(newId(), String(obj.id), Number(obj.amount_total ?? 0), metadata.utm_source || null, new Date().toISOString())
          .run();
        await recordEvent(env, "pack_purchased", null, { utm_source: metadata.utm_source || null });
      }
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const s = obj as unknown as StripeSubscription;
      const userId = s.metadata?.user_id ?? (await userIdForCustomer(env, s.customer));
      if (!userId || !(await env.DB.prepare("SELECT 1 AS x FROM users WHERE id = ?").bind(userId).first())) {
        log("warn", "stripe_unknown_customer", { type: event.type });
        return;
      }
      await upsertSubscription(env, userId, event.type === "customer.subscription.deleted" ? { ...s, status: "canceled" } : s);
      return;
    }
    default:
      return; // Other events are acknowledged and ignored.
  }
}

/** POST /api/stripe/webhook */
export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();
  if (raw.length > 512 * 1024) throw new HttpError(413, "too_large", "Too large.");
  if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET ?? ""))) {
    log("warn", "stripe_bad_signature", {});
    throw new HttpError(400, "bad_signature", "Invalid signature.");
  }
  const event = JSON.parse(raw) as StripeEvent;
  if (await env.DB.prepare("SELECT 1 AS x FROM stripe_events WHERE id = ?").bind(event.id).first()) {
    return json({ received: true, duplicate: true });
  }
  await processEvent(env, event);
  // Recorded after processing, so a failure makes Stripe retry. Handlers are upserts, so a retry is safe.
  await env.DB.prepare("INSERT INTO stripe_events (id, type, received_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(event.id, event.type, new Date().toISOString()).run();
  log("info", "stripe_event", { type: event.type });
  return json({ received: true });
}
