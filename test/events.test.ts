import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker/index.ts";
import { cleanAttribution } from "../src/worker/events.ts";
import { makeEnv, ctx, req } from "./helpers/env.ts";

const call = (env: ReturnType<typeof makeEnv>, r: Request) => worker.fetch!(r as never, env, ctx);

test("health reports the database", async () => {
  const env = makeEnv();
  const res = await call(env, req("/api/health"));
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { db: string }).db, "ok");
});

test("public events are stored with cleaned attribution", async () => {
  const env = makeEnv();
  const res = await call(env, req("/api/event", { method: "POST", json: { type: "generator_complete", utm_source: "TikTok<script>", utm_campaign: "launch week", landing_path: "/ndis-invoice-template/" } }));
  assert.equal(res.status, 204);
  const row = await env.DB.prepare("SELECT * FROM events").first<Record<string, string>>();
  assert.equal(row?.type, "generator_complete");
  assert.equal(row?.utm_source, "tiktokscript");
  assert.equal(row?.utm_campaign, "launchweek");
});

test("unknown or server-only event types are rejected", async () => {
  const env = makeEnv();
  assert.equal((await call(env, req("/api/event", { method: "POST", json: { type: "subscribed" } }))).status, 400);
  assert.equal((await call(env, req("/api/event", { method: "POST", json: { type: "x" } }))).status, 400);
  assert.equal((await call(env, req("/api/event", { method: "POST", body: "not json" }))).status, 400);
});

test("admin stats need the admin token and group by source", async () => {
  const env = makeEnv();
  await call(env, req("/api/event", { method: "POST", json: { type: "generator_complete", utm_source: "tiktok" } }));
  await call(env, req("/api/event", { method: "POST", json: { type: "generator_complete", utm_source: "tiktok" } }));
  await call(env, req("/api/event", { method: "POST", json: { type: "generator_complete" } }));
  assert.equal((await call(env, req("/api/admin/stats"))).status, 401);
  assert.equal((await call(env, req("/api/admin/stats", { headers: { authorization: "Bearer wrong" } }))).status, 401);
  const res = await call(env, req("/api/admin/stats", { headers: { authorization: `Bearer ${env.ADMIN_TOKEN}` } }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { bySource: Record<string, Record<string, number>> };
  assert.equal(body.bySource.tiktok?.generator_complete, 2);
  assert.equal(body.bySource["(direct)"]?.generator_complete, 1);
});

test("unknown API paths 404 and wrong methods 405", async () => {
  const env = makeEnv();
  assert.equal((await call(env, req("/api/nope"))).status, 404);
  assert.equal((await call(env, req("/api/health", { method: "POST" }))).status, 405);
});

test("rate limiting returns 429", async () => {
  const env = makeEnv({ RL_PUBLIC: { limit: async () => ({ success: false }) } as unknown as RateLimit });
  const res = await call(env, req("/api/event", { method: "POST", json: { type: "generator_complete" } }));
  assert.equal(res.status, 429);
});

test("D1 daily limit errors become a 503 capacity response", async () => {
  const env = makeEnv();
  (env as { DB: unknown }).DB = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error("Your account has exceeded D1's free tier daily row write limit."); } }) }) };
  const res = await call(env, req("/api/event", { method: "POST", json: { type: "generator_complete" } }));
  assert.equal(res.status, 503);
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, "capacity");
});

test("cleanAttribution drops junk", () => {
  const a = cleanAttribution({ utm_source: 42, landing_path: "javascript:alert(1)" });
  assert.equal(a.utm_source, null);
  assert.equal(a.landing_path, null);
});
