import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker/index.ts";
import { makeEnv, ctx } from "./helpers/env.ts";
import { signedUp, setUpWorker, shiftBody } from "./helpers/client.ts";
import { verifyStripeSignature, formEncode } from "../src/worker/stripe.ts";
import { hmacHex } from "../src/worker/crypto.ts";

const SECRET = "whsec_test_secret";
const stripeEnv = () => makeEnv({ STRIPE_SECRET_KEY: "sk_test_123", STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_PRICE_MONTHLY: "price_m", STRIPE_PRICE_YEARLY: "price_y", STRIPE_PRICE_PACK: "price_pack" });

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Record calls to api.stripe.com and answer with canned objects. */
function mockStripe(responses: Record<string, unknown>): { calls: { method: string; url: string; body: string }[] } {
  const calls: { method: string; url: string; body: string }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ method: init?.method ?? "GET", url, body: String(init?.body ?? "") });
    const key = Object.keys(responses).find((k) => url.includes(k));
    return new Response(JSON.stringify(key ? responses[key] : {}), { status: key ? 200 : 404 });
  }) as typeof fetch;
  return { calls };
}

async function signedWebhook(env: ReturnType<typeof makeEnv>, event: object, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(event);
  const sig = await hmacHex(secret, `${t}.${body}`);
  return worker.fetch!(new Request("https://shiftbill.test/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": `t=${t},v1=${sig}` } }) as never, env, ctx);
}

function subEvent(id: string, type: string, userId: string, status: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    type,
    data: { object: { id: "sub_1", customer: "cus_1", status, metadata: { user_id: userId }, items: { data: [{ current_period_end: 1_900_000_000, price: { id: "price_m" } }] }, ...extra } },
  };
}

async function userId(env: ReturnType<typeof makeEnv>, email: string): Promise<string> {
  return (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>())!.id;
}

test("signature verification", async () => {
  const body = '{"id":"evt_1"}';
  const t = 1_800_000_000;
  const sig = await hmacHex(SECRET, `${t}.${body}`);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${sig}`, SECRET, t), true);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=bad,v1=${sig}`, SECRET, t), true, "any v1 may match");
  assert.equal(await verifyStripeSignature(body + " ", `t=${t},v1=${sig}`, SECRET, t), false, "body tampered");
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${sig}`, "whsec_other", t), false, "wrong secret");
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${sig}`, SECRET, t + 301), false, "too old");
  assert.equal(await verifyStripeSignature(body, null, SECRET, t), false);
  assert.equal(await verifyStripeSignature(body, "garbage", SECRET, t), false);
});

test("webhook rejects bad signatures", async () => {
  const env = stripeEnv();
  const res = await signedWebhook(env, { id: "evt_x", type: "customer.subscription.updated", data: { object: {} } }, "whsec_wrong");
  assert.equal(res.status, 400);
});

test("subscription events unlock and lock paid features, idempotently", async () => {
  const env = stripeEnv();
  const c = await signedUp(env, "pay@example.com");
  const uid = await userId(env, "pay@example.com");
  const { participantId } = await setUpWorker(c);
  for (let i = 0; i < 10; i++) await c.post("/api/shifts", shiftBody(participantId));
  assert.equal((await c.post("/api/shifts", shiftBody(participantId))).status, 402, "shift log capped before paying");

  const created = subEvent("evt_1", "customer.subscription.created", uid, "active");
  assert.equal((await signedWebhook(env, created)).status, 200);
  const me = (await c.get("/api/me")).data;
  assert.equal(me.paid, true);
  assert.equal(me.subscription.currentPeriodEnd, new Date(1_900_000_000 * 1000).toISOString());
  assert.equal((await c.post("/api/shifts", shiftBody(participantId))).status, 201, "shift log unlocked");

  // The same event delivered twice is processed once.
  const again = await signedWebhook(env, created);
  assert.equal(((await again.json()) as { duplicate?: boolean }).duplicate, true);
  const events = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type = 'subscribed'").first<{ n: number }>();
  assert.equal(events?.n, 1);
  const subscribed = await env.DB.prepare("SELECT utm_source FROM events WHERE type = 'subscribed'").first<{ utm_source: string }>();
  assert.equal(subscribed?.utm_source, "tiktok", "paid conversion is attributed to the sign-up source");

  await signedWebhook(env, subEvent("evt_2", "customer.subscription.updated", uid, "active", { cancel_at_period_end: true }));
  assert.equal((await c.get("/api/me")).data.subscription.cancelAtPeriodEnd, true);

  await signedWebhook(env, subEvent("evt_3", "customer.subscription.deleted", uid, "active"));
  assert.equal((await c.get("/api/me")).data.paid, false);
  assert.equal((await c.post("/api/shifts", shiftBody(participantId))).status, 402);
});

test("past_due keeps access for a 7-day grace period", async () => {
  const env = stripeEnv();
  const c = await signedUp(env, "late@example.com");
  const uid = await userId(env, "late@example.com");
  const soon = Math.floor(Date.now() / 1000) - 86_400; // period ended yesterday
  await signedWebhook(env, subEvent("evt_pd", "customer.subscription.updated", uid, "past_due", { items: { data: [{ current_period_end: soon }] } }));
  assert.equal((await c.get("/api/me")).data.paid, true);
  const old = Math.floor(Date.now() / 1000) - 10 * 86_400;
  await signedWebhook(env, subEvent("evt_pd2", "customer.subscription.updated", uid, "past_due", { items: { data: [{ current_period_end: old }] } }));
  assert.equal((await c.get("/api/me")).data.paid, false);
});

test("checkout.session.completed links the customer and fetches the subscription", async () => {
  const env = stripeEnv();
  const c = await signedUp(env, "co@example.com");
  const uid = await userId(env, "co@example.com");
  const { calls } = mockStripe({ "/subscriptions/sub_9": { id: "sub_9", customer: "cus_9", status: "active", items: { data: [{ current_period_end: 1_900_000_000 }] } } });
  const res = await signedWebhook(env, { id: "evt_cs", type: "checkout.session.completed", data: { object: { id: "cs_1", mode: "subscription", customer: "cus_9", subscription: "sub_9", client_reference_id: uid, metadata: {} } } });
  assert.equal(res.status, 200);
  assert.ok(calls.some((x) => x.url.endsWith("/subscriptions/sub_9")));
  assert.equal((await c.get("/api/me")).data.paid, true);
  // Later subscription events find the user by customer id even without metadata.
  await signedWebhook(env, { id: "evt_del", type: "customer.subscription.deleted", data: { object: { id: "sub_9", customer: "cus_9", status: "canceled" } } });
  assert.equal((await c.get("/api/me")).data.paid, false);
});

test("pack purchases are recorded once", async () => {
  const env = stripeEnv();
  const ev = { id: "evt_pack", type: "checkout.session.completed", data: { object: { id: "cs_pack", mode: "payment", payment_status: "paid", amount_total: 1900, metadata: { product: "template_pack", utm_source: "reddit" } } } };
  await signedWebhook(env, ev);
  await signedWebhook(env, { ...ev, id: "evt_pack_retry" });
  const row = await env.DB.prepare("SELECT COUNT(*) AS n, MAX(amount_cents) AS a, MAX(utm_source) AS s FROM purchases").first<{ n: number; a: number; s: string }>();
  assert.deepEqual([row?.n, row?.a, row?.s], [1, 1900, "reddit"]);
});

test("checkout creates a Stripe session for the chosen plan", async () => {
  const env = stripeEnv();
  const c = await signedUp(env, "buy@example.com");
  const { calls } = mockStripe({ "/checkout/sessions": { id: "cs_new", url: "https://checkout.stripe.com/c/pay/cs_new" } });
  const res = await c.post("/api/billing/checkout", { plan: "yearly" });
  assert.equal(res.status, 200);
  assert.equal(res.data.url, "https://checkout.stripe.com/c/pay/cs_new");
  const body = decodeURIComponent(calls[0]!.body);
  assert.match(body, /mode=subscription/);
  assert.match(body, /line_items\[0\]\[price\]=price_y/);
  assert.match(body, /customer_email=buy@example.com/);
  assert.match(body, /subscription_data\[metadata\]\[user_id\]=/);
});

test("live keys are refused until go-live is confirmed", async () => {
  const env = makeEnv({ STRIPE_SECRET_KEY: "sk_live_abc", STRIPE_PRICE_MONTHLY: "price_m" });
  const c = await signedUp(env);
  mockStripe({});
  const res = await c.post("/api/billing/checkout", { plan: "monthly" });
  assert.equal(res.status, 503);
  assert.equal(res.data.error.code, "billing_off");
});

test("billing is off cleanly when Stripe is not configured", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  assert.equal((await c.post("/api/billing/checkout", { plan: "monthly" })).status, 503);
  assert.equal((await c.post("/api/billing/portal")).status, 404);
});

test("form encoding nests like Stripe expects", () => {
  assert.equal(formEncode({ a: 1, b: { c: "x y", d: { 0: "z" } }, e: undefined }), "a=1&b%5Bc%5D=x%20y&b%5Bd%5D%5B0%5D=z");
});
