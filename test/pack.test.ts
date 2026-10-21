import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker/index.ts";
import { makeEnv, ctx, req } from "./helpers/env.ts";
import { signDownload, MAX_DOWNLOADS } from "../src/worker/pack.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const env = () => makeEnv({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PACK: "price_pack" });
const call = (e: ReturnType<typeof makeEnv>, r: Request) => worker.fetch!(r as never, e, ctx);

function mockSession(session: object) {
  globalThis.fetch = (async () => new Response(JSON.stringify(session), { status: 200 })) as typeof fetch;
}

test("a paid Checkout Session can be claimed for a signed link, even before the webhook", async () => {
  const e = env();
  mockSession({ payment_status: "paid", amount_total: 1900, metadata: { product: "template_pack", utm_source: "tiktok" } });
  const res = await call(e, req("/api/pack/claim", { method: "POST", json: { sessionId: "cs_test_abcdefghijkl" } }));
  assert.equal(res.status, 200);
  const { url } = (await res.json()) as { url: string };
  assert.match(url, /^\/api\/pack\/download\?p=.+&exp=\d+&sig=[0-9a-f]{64}$/);

  // Claiming again reuses the same purchase.
  await call(e, req("/api/pack/claim", { method: "POST", json: { sessionId: "cs_test_abcdefghijkl" } }));
  const rows = await e.DB.prepare("SELECT COUNT(*) AS n FROM purchases").first<{ n: number }>();
  assert.equal(rows?.n, 1);

  const dl = await call(e, req(url));
  assert.equal(dl.status, 200);
  assert.equal(dl.headers.get("content-type"), "application/zip");
  const bytes = new Uint8Array(await dl.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 2)], [0x50, 0x4b], "zip magic number");
  assert.ok(bytes.length > 5000);
});

test("unpaid or malformed sessions are refused", async () => {
  const e = env();
  mockSession({ payment_status: "unpaid", metadata: { product: "template_pack" } });
  assert.equal((await call(e, req("/api/pack/claim", { method: "POST", json: { sessionId: "cs_test_abcdefghijkl" } }))).status, 402);
  assert.equal((await call(e, req("/api/pack/claim", { method: "POST", json: { sessionId: "../../etc" } }))).status, 400);
});

test("download links must be signed, unexpired and under the download limit", async () => {
  const e = env();
  await e.DB.prepare("INSERT INTO purchases (id, stripe_session_id, product, amount_cents, created_at) VALUES ('p1', 'cs_test_1', 'template_pack', 1900, 'x')").run();
  const future = Math.floor(Date.now() / 1000) + 3600;
  const good = await signDownload(e, "p1", future);
  assert.equal((await call(e, req(good.replace(/sig=[0-9a-f]{4}/, "sig=0000")))).status, 403, "tampered signature");
  assert.equal((await call(e, req(good.replace(`exp=${future}`, `exp=${future + 1}`)))).status, 403, "tampered expiry");
  assert.equal((await call(e, req(await signDownload(e, "p1", Math.floor(Date.now() / 1000) - 1)))).status, 410, "expired");
  for (let i = 0; i < MAX_DOWNLOADS; i++) assert.equal((await call(e, req(good))).status, 200);
  assert.equal((await call(e, req(good))).status, 429, "limit reached");
});
