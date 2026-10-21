import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { makeEnv } from "./helpers/env.ts";
import { signedUp, setUpWorker, shiftBody, makePaid } from "./helpers/client.ts";
import { sendEmail } from "../src/worker/email.ts";
import { runDailyJobs, MAX_AUTO_REMINDERS } from "../src/worker/reminders.ts";
import { reminderMessage, mailtoLink } from "../src/shared/reminder.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockResend(): { sent: { to: string[]; subject: string; reply_to?: string }[] } {
  const sent: { to: string[]; subject: string; reply_to?: string }[] = [];
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(url), "https://api.resend.com/emails");
    sent.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ id: `em_${sent.length}` }), { status: 200 });
  }) as typeof fetch;
  return { sent };
}

const emailEnv = () => makeEnv({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test", EMAIL_FROM: "ShiftBill <reminders@example.com>" });

test("email is off unless a provider, key and sender are all set", async () => {
  const r = await sendEmail(makeEnv(), { to: "a@example.com", subject: "s", text: "t" });
  assert.deepEqual(r, { sent: false, reason: "off" });
});

test("daily and monthly caps are hard limits", async () => {
  const env = emailEnv(); // test caps: 3 a day, 5 a month
  const { sent } = mockResend();
  const day1 = new Date("2026-10-21T00:00:00Z");
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await sendEmail(env, { to: "a@example.com", subject: "s", text: "t" }, day1));
  assert.deepEqual(results.map((r) => r.sent), [true, true, true, false, false]);
  const day2 = new Date("2026-10-22T00:00:00Z");
  for (let i = 0; i < 3; i++) results.push(await sendEmail(env, { to: "a@example.com", subject: "s", text: "t" }, day2));
  assert.deepEqual(results.slice(5).map((r) => r.sent), [true, true, false], "monthly cap of 5 stops the 6th");
  assert.equal(sent.length, 5);
  const counters = await env.DB.prepare("SELECT period, count FROM email_counters ORDER BY period").all<{ period: string; count: number }>();
  assert.deepEqual(counters.results.map((r) => [r.period, r.count]), [["d:2026-10-21", 3], ["d:2026-10-22", 2], ["m:2026-10", 5]]);
});

async function overdueInvoice(env: ReturnType<typeof makeEnv>, paid = true) {
  const c = await signedUp(env);
  if (paid) await makePaid(env, c);
  const { participantId } = await setUpWorker(c);
  const s = await c.post("/api/shifts", shiftBody(participantId));
  const inv = await c.post("/api/invoices", { participantId, shiftIds: [s.data.id], issueDate: "2026-10-01" });
  await c.post(`/api/invoices/${inv.data.id}/status`, { status: "sent" });
  return { c, invoiceId: inv.data.id as string };
}

test("cron emails overdue invoices of paying users, with cadence and a maximum", async () => {
  const env = emailEnv();
  env.EMAIL_DAILY_CAP = "50";
  env.EMAIL_MONTHLY_CAP = "50";
  const { sent } = mockResend();
  const { c, invoiceId } = await overdueInvoice(env, true);
  await overdueInvoice(env, false); // free user: no automatic reminders

  const r1 = await runDailyJobs(env, new Date("2026-10-21T21:30:00Z"));
  assert.equal(r1.emailed, 1);
  assert.deepEqual(sent[0]!.to, ["invoices@example.com"]);
  assert.equal(sent[0]!.reply_to, "sam@example.com");
  assert.match(sent[0]!.subject, /^Reminder: invoice INV-0001 \(Alex Participant\), \$220\.74$/);

  // Next day: too soon for another.
  assert.equal((await runDailyJobs(env, new Date("2026-10-22T21:30:00Z"))).emailed, 0);
  // A week later: second reminder.
  const r3 = await runDailyJobs(env, new Date("2026-10-29T21:30:00Z"));
  assert.equal(r3.emailed, 1);
  assert.match(sent[1]!.subject, /^Second reminder/);
  await runDailyJobs(env, new Date("2026-11-05T21:30:00Z"));
  assert.equal((await runDailyJobs(env, new Date("2026-11-12T21:30:00Z"))).emailed, 0, `stops after ${MAX_AUTO_REMINDERS}`);
  assert.equal(sent.length, MAX_AUTO_REMINDERS);

  // Paid invoices are never chased.
  const env2 = emailEnv();
  const o = await overdueInvoice(env2, true);
  await o.c.post(`/api/invoices/${o.invoiceId}/status`, { status: "paid" });
  assert.equal((await runDailyJobs(env2, new Date("2026-10-21T21:30:00Z"))).emailed, 0);
  assert.ok(c);
});

test("cron respects the user's reminder setting and does nothing when email is off", async () => {
  const off = makeEnv();
  await overdueInvoice(off, true);
  const r = await runDailyJobs(off, new Date("2026-10-21T21:30:00Z"));
  assert.equal(r.emailed, 0);
  assert.equal(r.checked, 0);

  const env = emailEnv();
  mockResend();
  const { c } = await overdueInvoice(env, true);
  const me = (await c.get("/api/me")).data;
  await c.put("/api/settings", { ...me.settings, reminders: { enabled: false } });
  const r2 = await runDailyJobs(env, new Date("2026-10-21T21:30:00Z"));
  assert.equal(r2.emailed, 0);
  assert.equal(r2.skipped, 1);
});

test("cron removes expired sessions", async () => {
  const env = makeEnv();
  await signedUp(env);
  const r = await runDailyJobs(env, new Date(Date.now() + 40 * 86_400_000));
  assert.equal(r.sessionsDeleted, 1);
});

test("manual reminders are recorded; emailed ones need email switched on", async () => {
  const env = makeEnv();
  const { c, invoiceId } = await overdueInvoice(env, true);
  assert.equal((await c.post(`/api/invoices/${invoiceId}/reminder`, { send: true })).status, 503);
  assert.equal((await c.post(`/api/invoices/${invoiceId}/reminder`, { send: false })).status, 200);
  const inv = (await c.get(`/api/invoices/${invoiceId}`)).data.summary;
  assert.equal(inv.reminderCount, 1);

  const free = await overdueInvoice(makeEnv(), false);
  assert.equal((await free.c.post(`/api/invoices/${free.invoiceId}/reminder`, { send: false })).status, 402);
});

test("reminder wording and mailto link", () => {
  const msg = reminderMessage(
    {
      mode: "ndis",
      number: "INV-0007",
      issueDate: "2026-10-01",
      dueDate: "2026-10-08",
      provider: { name: "Sam Nguyen", abn: "", gstRegistered: false, phone: "0412 345 678" },
      billTo: { name: "Pat Manager", email: "pm@example.com" },
      participant: { name: "Alex", ndisNumber: "431234567", planType: "plan" },
      lines: [],
      payment: { payId: "0412345678", bsb: "062000", accountNumber: "1234", accountName: "Sam Nguyen" },
    },
    22074,
    1,
  );
  assert.equal(msg.subject, "Reminder: invoice INV-0007 (Alex), $220.74");
  assert.match(msg.body, /^Hi Pat,/);
  assert.match(msg.body, /was due on 8 Oct 2026/);
  assert.match(msg.body, /BSB 062-000, account 1234 \(Sam Nguyen\)/);
  assert.ok(!msg.body.includes("431234567"), "NDIS number is not repeated in emails");
  assert.ok(!/\u2014/.test(msg.body), "no em dashes");
  assert.match(mailtoLink("pm@example.com", "a b", "c&d"), /^mailto:pm%40example\.com\?subject=a%20b&body=c%26d$/);
});
