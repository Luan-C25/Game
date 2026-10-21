// Overdue reminders. The daily cron emails a reminder for overdue invoices of
// paying users who have reminders switched on, at most 3 per invoice and at
// least 7 days apart, within the email caps. With email off, the in-app list and
// the mail-app link do the job instead.

import type { Env } from "./env.ts";
import { HttpError, json, readJson, assertSameOrigin } from "./http.ts";
import { session, requirePaid } from "./api.ts";
import * as db from "./db.ts";
import { emailEnabled, sendEmail } from "./email.ts";
import { reminderMessage } from "../shared/reminder.ts";
import { todayIn, daysBetween } from "../shared/dates.ts";
import { log } from "./log.ts";
import { decryptJson } from "./crypto.ts";
import type { InvoiceInput } from "../shared/invoice.ts";

export const MAX_AUTO_REMINDERS = 3;
export const DAYS_BETWEEN_REMINDERS = 7;
/** Free plan Workers can make 50 external requests per run; stay well under. */
export const MAX_EMAILS_PER_RUN = 40;

/** POST /api/invoices/:id/reminder { send: boolean }: email it, or record that the user sent it themselves. */
export async function handleReminder(request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>): Promise<Response> {
  assertSameOrigin(request);
  const { user, paid } = await session(request, env);
  requirePaid(paid, "Reminders");
  const body = await readJson(request, 1024);
  const inv = await db.getInvoice(env, user.id, params.id!);
  if (!inv) throw new HttpError(404, "not_found", "Invoice not found.");
  if (inv.summary.status === "paid" || inv.summary.status === "void") throw new HttpError(409, "not_due", "This invoice does not need a reminder.");
  if (body.send === true) {
    if (!emailEnabled(env)) throw new HttpError(503, "email_off", "Automatic email is not switched on yet. Use Send from my email instead.");
    const to = inv.input.billTo.email;
    if (!to) throw new HttpError(400, "no_email", "Add an invoice email address for this participant first.");
    const msg = reminderMessage(inv.input, inv.summary.totalCents, inv.summary.reminderCount + 1);
    const result = await sendEmail(env, { to, subject: msg.subject, text: msg.body, replyTo: inv.input.provider.email });
    if (!result.sent) {
      throw new HttpError(503, result.reason, result.reason === "cap_reached" ? "We have reached today's email limit. Use Send from my email, or try tomorrow." : "The email could not be sent. Use Send from my email instead.");
    }
  }
  await db.recordReminder(env, user.id, inv.summary.id);
  return json({ ok: true, emailed: body.send === true });
}

interface DueRow {
  id: string;
  user_id: string;
  due_date: string;
  total_cents: number;
  reminder_count: number;
  last_reminder_at: string | null;
  snapshot_enc: string;
  settings_enc: string;
}

/** The daily cron job. Returns counts for logs and tests. */
export async function runDailyJobs(env: Env, now: Date = new Date()): Promise<{ checked: number; emailed: number; skipped: number; sessionsDeleted: number }> {
  const sessions = await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now.toISOString()).run();
  const result = { checked: 0, emailed: 0, skipped: 0, sessionsDeleted: sessions.meta.changes ?? 0 };
  if (!emailEnabled(env)) {
    log("info", "cron", { ...result, email: "off" });
    return result;
  }
  // Earliest Australian date is enough to find candidates; each one is re-checked in the user's own time zone.
  const roughToday = todayIn("Australia/Perth", now);
  const cutoff = new Date(now.getTime() - DAYS_BETWEEN_REMINDERS * 86_400_000).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT i.id, i.user_id, i.due_date, i.total_cents, i.reminder_count, i.last_reminder_at, i.snapshot_enc, u.settings_enc
     FROM invoices i
     JOIN users u ON u.id = i.user_id
     JOIN subscriptions s ON s.user_id = i.user_id
     WHERE i.status = 'sent' AND i.due_date < ? AND i.reminder_count < ?
       AND (i.last_reminder_at IS NULL OR i.last_reminder_at <= ?)
       AND (s.status IN ('active', 'trialing') OR (s.status = 'past_due' AND s.current_period_end > ?))
     ORDER BY i.due_date LIMIT ?`,
  )
    .bind(roughToday, MAX_AUTO_REMINDERS, cutoff, new Date(now.getTime() - 7 * 86_400_000).toISOString(), MAX_EMAILS_PER_RUN)
    .all<DueRow>();

  for (const row of results) {
    result.checked++;
    const settings = await db.readSettings(env, { settings_enc: row.settings_enc });
    const today = todayIn(settings.timeZone, now);
    const input = await decryptJson<InvoiceInput>(env.DATA_KEY, row.snapshot_enc);
    if (!settings.reminders.enabled || !input.billTo.email || daysBetween(row.due_date, today) < 1) {
      result.skipped++;
      continue;
    }
    const msg = reminderMessage(input, row.total_cents, row.reminder_count + 1);
    const sent = await sendEmail(env, { to: input.billTo.email, subject: msg.subject, text: msg.body, replyTo: input.provider.email }, now);
    if (!sent.sent) {
      result.skipped++;
      if (sent.reason === "cap_reached") break;
      continue;
    }
    await db.recordReminder(env, row.user_id, row.id);
    result.emailed++;
  }
  log("info", "cron", result);
  return result;
}
