// The only module that touches user-owned tables. D1 has no row level security,
// so every function here takes the signed-in user's id and every SELECT, UPDATE
// and DELETE includes "user_id = ?" in its WHERE clause. Route handlers never
// write SQL themselves. test/isolation.test.ts checks this holds.

import type { Env } from "./env.ts";
import { decryptJson, decryptText, encryptJson, encryptText, newId } from "./crypto.ts";
import { DEFAULT_SETTINGS, type UserSettings } from "../shared/settings.ts";
import type { InvoiceInput, PlanType } from "../shared/invoice.ts";

const now = () => new Date().toISOString();

// ---------------------------------------------------------------- users

export interface UserRow {
  id: string;
  email: string;
  pw_hash: string;
  pw_salt: string;
  pw_iterations: number;
  recovery_hash: string;
  settings_enc: string;
  next_invoice_seq: number;
  utm_source: string | null;
  created_at: string;
}

export async function getUserById(env: Env, userId: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
}

export async function getUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.trim().toLowerCase()).first<UserRow>();
}

export async function readSettings(env: Env, user: Pick<UserRow, "settings_enc">): Promise<UserSettings> {
  if (!user.settings_enc) return structuredClone(DEFAULT_SETTINGS);
  const saved = await decryptJson<Partial<UserSettings>>(env.DATA_KEY, user.settings_enc);
  return { ...structuredClone(DEFAULT_SETTINGS), ...saved };
}

export async function writeSettings(env: Env, userId: string, settings: UserSettings): Promise<void> {
  await env.DB.prepare("UPDATE users SET settings_enc = ? WHERE id = ?").bind(await encryptJson(env.DATA_KEY, settings), userId).run();
}

/** Reserve the next invoice sequence number atomically. */
export async function takeInvoiceSeq(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare("UPDATE users SET next_invoice_seq = next_invoice_seq + 1 WHERE id = ? RETURNING next_invoice_seq - 1 AS seq")
    .bind(userId)
    .first<{ seq: number }>();
  if (!row) throw new Error("user not found");
  return row.seq;
}

export async function deleteUser(env: Env, userId: string): Promise<void> {
  // ON DELETE CASCADE removes sessions, participants, shifts, invoices and the subscription row.
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
}

// ---------------------------------------------------------------- counts and entitlements

export interface Counts {
  participants: number;
  invoices: number;
  shifts: number;
}

export async function counts(env: Env, userId: string): Promise<Counts> {
  const row = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM participants WHERE user_id = ?1 AND archived = 0) AS participants,
            (SELECT COUNT(*) FROM invoices WHERE user_id = ?1) AS invoices,
            (SELECT COUNT(*) FROM shifts WHERE user_id = ?1) AS shifts`,
  )
    .bind(userId)
    .first<Counts>();
  return row ?? { participants: 0, invoices: 0, shifts: 0 };
}

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
}

export async function getSubscription(env: Env, userId: string): Promise<SubscriptionRow | null> {
  return env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(userId).first<SubscriptionRow>();
}

/** Paid features are on while Stripe says active or trialing, and for 7 days of past_due grace. */
export function isPaid(sub: SubscriptionRow | null, at: Date = new Date()): boolean {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "trialing") return true;
  if (sub.status === "past_due" && sub.current_period_end) {
    return at.getTime() < Date.parse(sub.current_period_end) + 7 * 86_400_000;
  }
  return false;
}

// ---------------------------------------------------------------- participants

export interface Participant {
  id: string;
  name: string;
  ndisNumber: string;
  planType: PlanType;
  billToName: string;
  billToEmail: string;
  billToAbn: string;
  itemNumber: string;
  description: string;
  rateCents: number;
  kmItemNumber: string;
  kmRateCents: number;
}

interface ParticipantRow {
  id: string;
  name: string;
  ndis_number_enc: string | null;
  plan_type: PlanType;
  bill_to_name: string;
  bill_to_email: string;
  bill_to_abn: string;
  item_number: string;
  description: string;
  rate_cents: number;
  km_item_number: string;
  km_rate_cents: number;
}

async function toParticipant(env: Env, r: ParticipantRow): Promise<Participant> {
  return {
    id: r.id,
    name: r.name,
    ndisNumber: r.ndis_number_enc ? await decryptText(env.DATA_KEY, r.ndis_number_enc) : "",
    planType: r.plan_type,
    billToName: r.bill_to_name,
    billToEmail: r.bill_to_email,
    billToAbn: r.bill_to_abn,
    itemNumber: r.item_number,
    description: r.description,
    rateCents: r.rate_cents,
    kmItemNumber: r.km_item_number,
    kmRateCents: r.km_rate_cents,
  };
}

export async function listParticipants(env: Env, userId: string): Promise<Participant[]> {
  const { results } = await env.DB.prepare("SELECT * FROM participants WHERE user_id = ? AND archived = 0 ORDER BY name COLLATE NOCASE").bind(userId).all<ParticipantRow>();
  return Promise.all(results.map((r) => toParticipant(env, r)));
}

export async function getParticipant(env: Env, userId: string, id: string): Promise<Participant | null> {
  const r = await env.DB.prepare("SELECT * FROM participants WHERE id = ? AND user_id = ?").bind(id, userId).first<ParticipantRow>();
  return r ? toParticipant(env, r) : null;
}

export async function saveParticipant(env: Env, userId: string, p: Omit<Participant, "id"> & { id?: string }): Promise<string> {
  const ndisEnc = p.ndisNumber ? await encryptText(env.DATA_KEY, p.ndisNumber) : null;
  const values = [p.name, ndisEnc, p.planType, p.billToName, p.billToEmail, p.billToAbn, p.itemNumber, p.description, p.rateCents, p.kmItemNumber, p.kmRateCents];
  if (p.id) {
    const res = await env.DB.prepare(
      `UPDATE participants SET name = ?, ndis_number_enc = ?, plan_type = ?, bill_to_name = ?, bill_to_email = ?, bill_to_abn = ?,
       item_number = ?, description = ?, rate_cents = ?, km_item_number = ?, km_rate_cents = ? WHERE id = ? AND user_id = ?`,
    )
      .bind(...values, p.id, userId)
      .run();
    if (!res.meta.changes) throw new NotFound();
    return p.id;
  }
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO participants (id, user_id, name, ndis_number_enc, plan_type, bill_to_name, bill_to_email, bill_to_abn,
     item_number, description, rate_cents, km_item_number, km_rate_cents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, userId, ...values, now())
    .run();
  return id;
}

/** Archive rather than delete, so past invoices keep their participant link. */
export async function archiveParticipant(env: Env, userId: string, id: string): Promise<void> {
  const res = await env.DB.prepare("UPDATE participants SET archived = 1 WHERE id = ? AND user_id = ?").bind(id, userId).run();
  if (!res.meta.changes) throw new NotFound();
}

// ---------------------------------------------------------------- shifts

export interface ShiftRecord {
  id: string;
  participantId: string;
  date: string;
  start: string;
  end: string;
  breakMinutes: number;
  itemNumber: string;
  description: string;
  rateCents: number;
  km: number;
  kmRateCents: number;
  kmItemNumber: string;
  invoiceId: string | null;
}

interface ShiftRow {
  id: string;
  participant_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  item_number: string;
  description: string;
  rate_cents: number;
  km: number;
  km_rate_cents: number;
  km_item_number: string;
  invoice_id: string | null;
}

const toShift = (r: ShiftRow): ShiftRecord => ({
  id: r.id,
  participantId: r.participant_id,
  date: r.date,
  start: r.start_time,
  end: r.end_time,
  breakMinutes: r.break_minutes,
  itemNumber: r.item_number,
  description: r.description,
  rateCents: r.rate_cents,
  km: r.km,
  kmRateCents: r.km_rate_cents,
  kmItemNumber: r.km_item_number,
  invoiceId: r.invoice_id,
});

export async function listShifts(env: Env, userId: string, opts: { uninvoicedOnly?: boolean; limit?: number } = {}): Promise<ShiftRecord[]> {
  const sql = `SELECT * FROM shifts WHERE user_id = ? ${opts.uninvoicedOnly ? "AND invoice_id IS NULL" : ""} ORDER BY date DESC, start_time DESC LIMIT ?`;
  const { results } = await env.DB.prepare(sql).bind(userId, Math.min(opts.limit ?? 200, 1000)).all<ShiftRow>();
  return results.map(toShift);
}

export async function getShiftsByIds(env: Env, userId: string, ids: string[]): Promise<ShiftRecord[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(`SELECT * FROM shifts WHERE user_id = ? AND id IN (${placeholders})`).bind(userId, ...ids).all<ShiftRow>();
  return results.map(toShift);
}

export async function saveShift(env: Env, userId: string, s: Omit<ShiftRecord, "id" | "invoiceId"> & { id?: string }): Promise<string> {
  // The participant must belong to this user.
  const owner = await env.DB.prepare("SELECT 1 AS ok FROM participants WHERE id = ? AND user_id = ?").bind(s.participantId, userId).first();
  if (!owner) throw new NotFound();
  const values = [s.participantId, s.date, s.start, s.end, s.breakMinutes, s.itemNumber, s.description, s.rateCents, s.km, s.kmRateCents, s.kmItemNumber];
  if (s.id) {
    const res = await env.DB.prepare(
      `UPDATE shifts SET participant_id = ?, date = ?, start_time = ?, end_time = ?, break_minutes = ?, item_number = ?, description = ?,
       rate_cents = ?, km = ?, km_rate_cents = ?, km_item_number = ? WHERE id = ? AND user_id = ? AND invoice_id IS NULL`,
    )
      .bind(...values, s.id, userId)
      .run();
    if (!res.meta.changes) throw new NotFound("That shift is already on an invoice, or does not exist.");
    return s.id;
  }
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO shifts (id, user_id, participant_id, date, start_time, end_time, break_minutes, item_number, description, rate_cents,
     km, km_rate_cents, km_item_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, userId, ...values, now())
    .run();
  return id;
}

export async function deleteShift(env: Env, userId: string, id: string): Promise<void> {
  const res = await env.DB.prepare("DELETE FROM shifts WHERE id = ? AND user_id = ? AND invoice_id IS NULL").bind(id, userId).run();
  if (!res.meta.changes) throw new NotFound("That shift is already on an invoice, or does not exist.");
}

// ---------------------------------------------------------------- invoices

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface InvoiceSummary {
  id: string;
  participantId: string | null;
  number: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  billToLabel: string;
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  sentAt: string | null;
  paidAt: string | null;
  paidCents: number | null;
  setAsideCents: number | null;
  reminderCount: number;
  lastReminderAt: string | null;
}

interface InvoiceRow {
  id: string;
  participant_id: string | null;
  number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  snapshot_enc: string;
  bill_to_label: string;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  sent_at: string | null;
  paid_at: string | null;
  paid_cents: number | null;
  set_aside_cents: number | null;
  reminder_count: number;
  last_reminder_at: string | null;
}

const toSummary = (r: InvoiceRow): InvoiceSummary => ({
  id: r.id,
  participantId: r.participant_id,
  number: r.number,
  issueDate: r.issue_date,
  dueDate: r.due_date,
  status: r.status,
  billToLabel: r.bill_to_label,
  subtotalCents: r.subtotal_cents,
  gstCents: r.gst_cents,
  totalCents: r.total_cents,
  sentAt: r.sent_at,
  paidAt: r.paid_at,
  paidCents: r.paid_cents,
  setAsideCents: r.set_aside_cents,
  reminderCount: r.reminder_count,
  lastReminderAt: r.last_reminder_at,
});

export async function listInvoices(env: Env, userId: string, limit = 200): Promise<InvoiceSummary[]> {
  const { results } = await env.DB.prepare(
    "SELECT id, participant_id, number, issue_date, due_date, status, '' AS snapshot_enc, bill_to_label, subtotal_cents, gst_cents, total_cents, sent_at, paid_at, paid_cents, set_aside_cents, reminder_count, last_reminder_at FROM invoices WHERE user_id = ? ORDER BY issue_date DESC, created_at DESC LIMIT ?",
  )
    .bind(userId, Math.min(limit, 2000))
    .all<InvoiceRow>();
  return results.map(toSummary);
}

export async function getInvoice(env: Env, userId: string, id: string): Promise<{ summary: InvoiceSummary; input: InvoiceInput } | null> {
  const r = await env.DB.prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?").bind(id, userId).first<InvoiceRow>();
  if (!r) return null;
  return { summary: toSummary(r), input: await decryptJson<InvoiceInput>(env.DATA_KEY, r.snapshot_enc) };
}

export async function invoiceNumberTaken(env: Env, userId: string, number: string): Promise<boolean> {
  return Boolean(await env.DB.prepare("SELECT 1 AS x FROM invoices WHERE user_id = ? AND number = ?").bind(userId, number).first());
}

/** Insert an invoice and attach its shifts in one transaction. */
export async function createInvoice(
  env: Env,
  userId: string,
  data: { participantId: string | null; input: InvoiceInput; totals: { subtotalCents: number; gstCents: number; totalCents: number }; shiftIds: string[] },
): Promise<string> {
  const id = newId();
  const statements = [
    env.DB.prepare(
      `INSERT INTO invoices (id, user_id, participant_id, number, issue_date, due_date, status, snapshot_enc, bill_to_label, subtotal_cents, gst_cents, total_cents, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      userId,
      data.participantId,
      data.input.number,
      data.input.issueDate,
      data.input.dueDate,
      await encryptJson(env.DATA_KEY, data.input),
      data.input.participant?.name || data.input.billTo.name,
      data.totals.subtotalCents,
      data.totals.gstCents,
      data.totals.totalCents,
      now(),
    ),
    ...data.shiftIds.map((sid) => env.DB.prepare("UPDATE shifts SET invoice_id = ? WHERE id = ? AND user_id = ? AND invoice_id IS NULL").bind(id, sid, userId)),
  ];
  await env.DB.batch(statements);
  return id;
}

export async function updateInvoiceStatus(
  env: Env,
  userId: string,
  id: string,
  change: { status: InvoiceStatus; paidAt?: string | null; paidCents?: number | null; setAsideCents?: number | null },
): Promise<void> {
  const ts = now();
  const res = await env.DB.prepare(
    `UPDATE invoices SET status = ?,
       sent_at = CASE WHEN ? = 'sent' AND sent_at IS NULL THEN ? ELSE sent_at END,
       paid_at = ?, paid_cents = ?, set_aside_cents = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(change.status, change.status, ts, change.paidAt ?? null, change.paidCents ?? null, change.setAsideCents ?? null, id, userId)
    .run();
  if (!res.meta.changes) throw new NotFound();
}

export async function recordReminder(env: Env, userId: string, id: string): Promise<void> {
  await env.DB.prepare("UPDATE invoices SET reminder_count = reminder_count + 1, last_reminder_at = ? WHERE id = ? AND user_id = ?").bind(now(), id, userId).run();
}

/** Delete an invoice and free its shifts so they can be invoiced again. */
export async function deleteInvoice(env: Env, userId: string, id: string): Promise<void> {
  const [, del] = await env.DB.batch([
    env.DB.prepare("UPDATE shifts SET invoice_id = NULL WHERE invoice_id = ? AND user_id = ?").bind(id, userId),
    env.DB.prepare("DELETE FROM invoices WHERE id = ? AND user_id = ?").bind(id, userId),
  ]);
  if (!(del as D1Result).meta.changes) throw new NotFound();
}

export class NotFound extends Error {
  constructor(message = "Not found.") {
    super(message);
  }
}
