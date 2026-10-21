import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv } from "./helpers/env.ts";
import { signedUp, setUpWorker, shiftBody, makePaid } from "./helpers/client.ts";
import { FREE_LIMITS } from "../src/shared/config.ts";

test("selected shifts become one invoice with correct lines and totals", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const { participantId } = await setUpWorker(c);
  const s1 = await c.post("/api/shifts", shiftBody(participantId, { km: 1250 }));
  const s2 = await c.post("/api/shifts", shiftBody(participantId, { date: "2026-10-16", start: "13:00", end: "15:30" }));
  assert.equal(s1.status, 201);

  const res = await c.post("/api/invoices", { participantId, shiftIds: [s2.data.id, s1.data.id], issueDate: "2026-10-21" });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(res.data.number, "INV-0001");

  const inv = (await c.get(`/api/invoices/${res.data.id}`)).data;
  assert.equal(inv.input.participant.ndisNumber, "431234567");
  assert.equal(inv.input.billTo.name, "Example Plan Management");
  assert.equal(inv.input.dueDate, "2026-10-28");
  assert.deepEqual(inv.input.lines.map((l: { unit: string; quantity: number }) => [l.unit, l.quantity]), [["hour", 300], ["km", 1250], ["hour", 250]]);
  assert.equal(inv.summary.totalCents, 22074 + 1250 + 18395);
  assert.equal(inv.footerCredit, true);

  // Invoiced shifts cannot be invoiced, edited or deleted again.
  assert.equal((await c.post("/api/invoices", { participantId, shiftIds: [s1.data.id] })).status, 409);
  assert.equal((await c.put(`/api/shifts/${s1.data.id}`, shiftBody(participantId))).status, 404);
  assert.equal((await c.del(`/api/shifts/${s1.data.id}`)).status, 404);
  assert.equal((await c.get("/api/shifts?uninvoiced=1")).data.shifts.length, 0);

  // Numbers are sequential.
  const s3 = await c.post("/api/shifts", shiftBody(participantId, { date: "2026-10-20" }));
  assert.equal((await c.post("/api/invoices", { participantId, shiftIds: [s3.data.id] })).data.number, "INV-0002");
  assert.equal((await c.get("/api/me")).data.nextInvoiceNumber, "INV-0003");

  // Deleting an invoice frees its shifts.
  assert.equal((await c.del(`/api/invoices/${res.data.id}`)).status, 200);
  assert.equal((await c.get("/api/shifts?uninvoiced=1")).data.shifts.length, 2);
});

test("an invoice without an ABN or provider name is refused with reasons", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const p = await c.post("/api/participants", { name: "Alex", planType: "plan", billToName: "PM" });
  const s = await c.post("/api/shifts", shiftBody(p.data.id));
  const res = await c.post("/api/invoices", { participantId: p.data.id, shiftIds: [s.data.id] });
  assert.equal(res.status, 400);
  assert.ok(res.data.error.issues.some((i: { field: string }) => i.field === "provider.name"));
});

test("shifts for a different participant cannot be mixed", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const { participantId } = await setUpWorker(c);
  const other = await c.post("/api/participants", { name: "Other", planType: "self" });
  const s1 = await c.post("/api/shifts", shiftBody(participantId));
  const s2 = await c.post("/api/shifts", shiftBody(other.data.id));
  assert.equal((await c.post("/api/invoices", { participantId, shiftIds: [s1.data.id, s2.data.id] })).status, 400);
});

test("free limits apply, and paid accounts are not limited", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const { participantId } = await setUpWorker(c);
  await c.post("/api/participants", { name: "Second", planType: "self" });
  const third = await c.post("/api/participants", { name: "Third", planType: "self" });
  assert.equal(FREE_LIMITS.participants, 2);
  assert.equal(third.status, 402);
  assert.equal(third.data.error.code, "upgrade_required");
  for (let i = 0; i < FREE_LIMITS.shifts; i++) assert.equal((await c.post("/api/shifts", shiftBody(participantId))).status, 201);
  assert.equal((await c.post("/api/shifts", shiftBody(participantId))).status, 402);
  await makePaid(env, c);
  assert.equal((await c.post("/api/shifts", shiftBody(participantId))).status, 201);
  assert.equal((await c.post("/api/participants", { name: "Third", planType: "self" })).status, 201);
  assert.equal((await c.get("/api/me")).data.paid, true);
});

test("marking paid records a tax set-aside estimate", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const { participantId } = await setUpWorker(c);
  const s = await c.post("/api/shifts", shiftBody(participantId));
  const inv = await c.post("/api/invoices", { participantId, shiftIds: [s.data.id] });
  const paid = await c.post(`/api/invoices/${inv.data.id}/status`, { status: "paid", paidAt: "2026-10-25" });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.setAside.totalCents, 5519); // 25% of 220.74, rounded
  const list = (await c.get("/api/invoices")).data.invoices;
  assert.equal(list[0].status, "paid");
  assert.equal(list[0].paidCents, 22074);
  assert.equal(list[0].setAsideCents, 5519);
});

test("repeat invoice moves line dates forward and takes the next number", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const { participantId } = await setUpWorker(c);
  const s = await c.post("/api/shifts", shiftBody(participantId, { date: "2026-10-14" }));
  const inv = await c.post("/api/invoices", { participantId, shiftIds: [s.data.id], issueDate: "2026-10-14" });
  const rep = await c.post(`/api/invoices/${inv.data.id}/repeat`);
  assert.equal(rep.status, 201);
  assert.equal(rep.data.number, "INV-0002");
  const repeated = (await c.get(`/api/invoices/${rep.data.id}`)).data;
  const today = (await c.get("/api/me")).data.today;
  assert.equal(repeated.input.issueDate, today);
  assert.equal(repeated.input.lines[0].date, today);
});

test("settings are validated and saved", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  const bad = await c.put("/api/settings", { provider: { name: "Sam", abn: "12 345 678 901" } });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.error.fields["provider.abn"]);
  const ok = await c.put("/api/settings", { provider: { name: "Sam", abn: "51824753556" }, invoicePrefix: "SN-", taxPercent: 30 });
  assert.equal(ok.status, 200);
  const me = (await c.get("/api/me")).data;
  assert.equal(me.settings.taxPercent, 30);
  assert.equal(me.nextInvoiceNumber, "SN-0001");
});

test("ABN lookup is a paid feature", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  assert.equal((await c.get("/api/abn/51824753556")).status, 402);
  await makePaid(env, c);
  assert.equal((await c.get("/api/abn/12345678901")).status, 400);
  const r = await c.get("/api/abn/51824753556");
  assert.equal(r.status, 200);
  assert.equal(r.data.available, false); // no ABR_GUID configured in tests
});
