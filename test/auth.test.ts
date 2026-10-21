import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv } from "./helpers/env.ts";
import { Client, signedUp } from "./helpers/client.ts";
import { hashPassword, verifyPassword, encryptText, decryptText, newRecoveryCode } from "../src/worker/crypto.ts";

test("password hashing uses the pepper", async () => {
  const a = await hashPassword("hunter2hunter2", "pepper-one", 1000);
  assert.equal(await verifyPassword("hunter2hunter2", "pepper-one", a), true);
  assert.equal(await verifyPassword("hunter2hunter3", "pepper-one", a), false);
  assert.equal(await verifyPassword("hunter2hunter2", "pepper-two", a), false);
});

test("field encryption round-trips and is not deterministic", async () => {
  const key = Buffer.alloc(32, 1).toString("base64");
  const a = await encryptText(key, "431234567");
  const b = await encryptText(key, "431234567");
  assert.notEqual(a, b);
  assert.ok(!a.includes("431234567"));
  assert.equal(await decryptText(key, a), "431234567");
  await assert.rejects(decryptText(Buffer.alloc(32, 2).toString("base64"), a));
});

test("recovery codes look right", () => {
  assert.match(newRecoveryCode(), /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

test("sign up, me, log out, log in", async () => {
  const env = makeEnv();
  const c = await signedUp(env, "Worker@Example.com");
  assert.match(c.recoveryCode, /^[A-Z2-9-]{19}$/);
  const me = await c.get("/api/me");
  assert.equal(me.status, 200);
  assert.equal(me.data.email, "worker@example.com");
  assert.equal(me.data.paid, false);
  assert.equal(me.data.nextInvoiceNumber, "INV-0001");

  assert.equal((await c.post("/api/auth/logout")).status, 200);
  assert.equal((await c.get("/api/me")).status, 401);
  assert.equal((await c.post("/api/auth/login", { email: "worker@example.com", password: "wrong password!" })).status, 401);
  assert.equal((await c.post("/api/auth/login", { email: "WORKER@example.com", password: "correct horse battery" })).status, 200);
  assert.equal((await c.get("/api/me")).status, 200);

  const user = await env.DB.prepare("SELECT utm_source, pw_hash FROM users").first<{ utm_source: string; pw_hash: string }>();
  assert.equal(user?.utm_source, "tiktok");
  assert.ok(!user?.pw_hash.includes("correct"));
});

test("sign-up validation", async () => {
  const env = makeEnv();
  const c = new Client(env);
  assert.equal((await c.post("/api/auth/signup", { email: "bad", password: "correct horse battery", acceptTerms: true })).status, 400);
  assert.equal((await c.post("/api/auth/signup", { email: "a@b.co", password: "short", acceptTerms: true })).status, 400);
  assert.equal((await c.post("/api/auth/signup", { email: "a@b.co", password: "correct horse battery" })).status, 400);
  await signedUp(env, "dupe@example.com");
  assert.equal((await c.post("/api/auth/signup", { email: "dupe@example.com", password: "correct horse battery", acceptTerms: true })).status, 409);
});

test("recovery code resets the password and is replaced", async () => {
  const env = makeEnv();
  const c = await signedUp(env, "r@example.com");
  const other = new Client(env);
  assert.equal((await other.post("/api/auth/recover", { email: "r@example.com", recoveryCode: "AAAA-AAAA-AAAA-AAAA", password: "brand new password" })).status, 401);
  const ok = await other.post("/api/auth/recover", { email: "r@example.com", recoveryCode: c.recoveryCode.toLowerCase(), password: "brand new password" });
  assert.equal(ok.status, 200);
  assert.notEqual(ok.data.recoveryCode, c.recoveryCode);
  // Old sessions are signed out, the old code no longer works, the new password does.
  assert.equal((await c.get("/api/me")).status, 401);
  assert.equal((await other.post("/api/auth/recover", { email: "r@example.com", recoveryCode: c.recoveryCode, password: "another password" })).status, 401);
  assert.equal((await new Client(env).post("/api/auth/login", { email: "r@example.com", password: "brand new password" })).status, 200);
});

test("state-changing requests need the CSRF header", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const worker = (await import("../src/worker/index.ts")).default;
  const { ctx } = await import("./helpers/env.ts");
  const res = await worker.fetch!(
    new Request("https://shiftbill.test/api/settings", { method: "PUT", headers: { cookie: c.cookie, "content-type": "application/json" }, body: "{}" }) as never,
    env,
    ctx,
  );
  assert.equal(res.status, 403);
  const cross = await worker.fetch!(
    new Request("https://shiftbill.test/api/settings", { method: "PUT", headers: { cookie: c.cookie, "x-shiftbill": "1", origin: "https://evil.example" }, body: "{}" }) as never,
    env,
    ctx,
  );
  assert.equal(cross.status, 403);
});

test("session cookies are HttpOnly, SameSite and Secure on https", async () => {
  const env = makeEnv();
  const c = new Client(env);
  const r = await c.post("/api/auth/signup", { email: "c@example.com", password: "correct horse battery", acceptTerms: true });
  const cookie = r.res.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^__Host-sb_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
});

test("deleting the account removes everything", async () => {
  const env = makeEnv();
  const c = await signedUp(env, "del@example.com");
  await c.post("/api/participants", { name: "P", planType: "self" });
  assert.equal((await c.del("/api/account", { password: "nope" })).status, 401);
  assert.equal((await c.del("/api/account", { password: "correct horse battery" })).status, 200);
  for (const table of ["users", "sessions", "participants"]) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
    assert.equal(row?.n, 0, table);
  }
});
