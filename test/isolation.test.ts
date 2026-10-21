import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv } from "./helpers/env.ts";
import { signedUp, setUpWorker, shiftBody, makePaid } from "./helpers/client.ts";

// D1 has no row level security, so this is the test that stands in for it:
// user B must not be able to see or change anything that belongs to user A.

test("one user cannot read or change another user's records", async () => {
  const env = makeEnv();
  const a = await signedUp(env, "a@example.com");
  const b = await signedUp(env, "b@example.com");
  await makePaid(env, b); // even a paying user gets nothing extra
  const { participantId } = await setUpWorker(a);
  const shift = await a.post("/api/shifts", shiftBody(participantId));
  const inv = await a.post("/api/invoices", { participantId, shiftIds: [shift.data.id] });
  assert.equal(inv.status, 201);

  // Lists are empty for B.
  assert.deepEqual((await b.get("/api/participants")).data.participants, []);
  assert.deepEqual((await b.get("/api/shifts")).data.shifts, []);
  assert.deepEqual((await b.get("/api/invoices")).data.invoices, []);

  // Direct access by id fails.
  assert.equal((await b.get(`/api/invoices/${inv.data.id}`)).status, 404);
  assert.equal((await b.put(`/api/participants/${participantId}`, { name: "Hacked", planType: "plan" })).status, 404);
  assert.equal((await b.del(`/api/participants/${participantId}`)).status, 404);
  assert.equal((await b.del(`/api/invoices/${inv.data.id}`)).status, 404);
  assert.equal((await b.post(`/api/invoices/${inv.data.id}/status`, { status: "void" })).status, 404);
  assert.equal((await b.post(`/api/invoices/${inv.data.id}/repeat`)).status, 404);

  // B cannot log a shift against A's participant, or invoice A's shift.
  const { participantId: bParticipant } = await setUpWorker(b);
  assert.equal((await b.post("/api/shifts", shiftBody(participantId))).status, 404);
  const s2 = await a.post("/api/shifts", shiftBody(participantId, { date: "2026-10-15" }));
  assert.equal((await b.post("/api/invoices", { participantId: bParticipant, shiftIds: [s2.data.id] })).status, 404);
  assert.equal((await b.put(`/api/shifts/${s2.data.id}`, shiftBody(bParticipant))).status, 404);
  assert.equal((await b.del(`/api/shifts/${s2.data.id}`)).status, 404);

  // A's data is untouched.
  const parts = (await a.get("/api/participants")).data.participants;
  assert.equal(parts[0].name, "Alex Participant");
  assert.equal((await a.get(`/api/invoices/${inv.data.id}`)).data.summary.status, "draft");
});

test("NDIS numbers are encrypted at rest and returned to the owner", async () => {
  const env = makeEnv();
  const a = await signedUp(env);
  const { participantId } = await setUpWorker(a);
  const row = await env.DB.prepare("SELECT ndis_number_enc FROM participants WHERE id = ?").bind(participantId).first<{ ndis_number_enc: string }>();
  assert.ok(row?.ndis_number_enc.startsWith("v1."));
  assert.ok(!row?.ndis_number_enc.includes("431234567"));
  const user = await env.DB.prepare("SELECT settings_enc FROM users").first<{ settings_enc: string }>();
  assert.ok(!user?.settings_enc.includes("12345678"), "bank details are encrypted too");
  const p = (await a.get("/api/participants")).data.participants[0];
  assert.equal(p.ndisNumber, "431234567");
});
