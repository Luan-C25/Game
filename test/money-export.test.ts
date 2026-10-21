import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv } from "./helpers/env.ts";
import { signedUp, setUpWorker, shiftBody, makePaid } from "./helpers/client.ts";
import { fyRange } from "../src/worker/money.ts";

async function paidWorkerWithInvoices() {
  const env = makeEnv();
  const c = await signedUp(env);
  await makePaid(env, c);
  const { participantId } = await setUpWorker(c);
  const a = await c.post("/api/shifts", shiftBody(participantId, { date: "2026-08-04", km: 1000, description: '=HYPERLINK("x")' }));
  const b = await c.post("/api/shifts", shiftBody(participantId, { date: "2026-08-05" }));
  const old = await c.post("/api/shifts", shiftBody(participantId, { date: "2026-05-05" }));
  const inv1 = await c.post("/api/invoices", { participantId, shiftIds: [a.data.id], issueDate: "2026-08-06" });
  const inv2 = await c.post("/api/invoices", { participantId, shiftIds: [b.data.id], issueDate: "2026-08-06" });
  const inv3 = await c.post("/api/invoices", { participantId, shiftIds: [old.data.id], issueDate: "2026-05-06" });
  await c.post(`/api/invoices/${inv1.data.id}/status`, { status: "paid", paidAt: "2026-08-20" });
  await c.post(`/api/invoices/${inv2.data.id}/status`, { status: "paid", paidAt: "2026-08-21", paidCents: 10000 });
  await c.post(`/api/invoices/${inv3.data.id}/status`, { status: "paid", paidAt: "2026-05-20" });
  return { env, c };
}

test("financial year ranges", () => {
  assert.deepEqual(fyRange("2026-27"), ["2026-07-01", "2027-06-30"]);
});

test("set-aside summary covers payments received in the financial year", async () => {
  const { c } = await paidWorkerWithInvoices();
  const r = await c.get("/api/money?fy=2026-27");
  assert.equal(r.status, 200);
  // 220.74 + 10.00 km = 230.74 paid in full, plus a part payment of 100.00.
  assert.equal(r.data.receivedCents, 23074 + 10000);
  assert.equal(r.data.gstCents, 0);
  assert.equal(r.data.incomeTaxCents, 5769 + 2500); // 25%, rounded per payment
  assert.equal(r.data.keepCents, 33074 - 8269);
  assert.equal(r.data.invoices.length, 2);
  const prev = await c.get("/api/money?fy=2025-26");
  assert.equal(prev.data.receivedCents, 22074);
  assert.equal((await c.get("/api/money?fy=garbage")).status, 400);
});

test("CSV exports for the accountant", async () => {
  const { c } = await paidWorkerWithInvoices();
  const inv = await c.get("/api/export/invoices.csv?fy=2026-27");
  assert.equal(inv.status, 200);
  assert.match(inv.res.headers.get("content-disposition") ?? "", /shiftbill-invoices-2026-27\.csv/);
  const lines = String(inv.data).trim().split("\r\n");
  assert.equal(lines[0], "Invoice number,Invoice date,Due date,Status,Participant or customer,Subtotal,GST,Total,Date paid,Amount paid,Set-aside estimate");
  assert.equal(lines.length, 3);
  assert.equal(lines[1], "INV-0001,2026-08-06,2026-08-13,paid,Alex Participant,230.74,0.00,230.74,2026-08-20,230.74,57.69");
  assert.ok(!String(inv.data).includes("431234567"), "no NDIS numbers in exports");

  const shifts = await c.get("/api/export/shifts.csv?fy=2026-27");
  const sl = String(shifts.data).trim().split("\r\n");
  assert.equal(sl.length, 3);
  assert.match(sl[1]!, /^2026-08-04,09:00,12:00,0,3,Alex Participant,01_011_0107_1_1,"'=HYPERLINK\(""x""\)",73\.58,10,1\.00,230\.74,INV-0001$/);
});

test("money and exports are paid features", async () => {
  const env = makeEnv();
  const c = await signedUp(env);
  assert.equal((await c.get("/api/money")).status, 402);
  assert.equal((await c.get("/api/export/invoices.csv")).status, 402);
  assert.equal((await c.get("/api/export/shifts.csv")).status, 402);
});
