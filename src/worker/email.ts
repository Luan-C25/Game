// Outbound email with hard caps. Every send first reserves a slot in today's and
// this month's counters; if either is full, nothing is sent. The caps sit below
// the provider's free limits (Resend free: 100 a day, 3,000 a month).

import type { Env } from "./env.ts";
import { log } from "./log.ts";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export type SendResult = { sent: true; id: string } | { sent: false; reason: "off" | "cap_reached" | "provider_error" };

export function emailEnabled(env: Env): boolean {
  return env.EMAIL_PROVIDER === "resend" && Boolean(env.RESEND_API_KEY) && Boolean(env.EMAIL_FROM);
}

async function reserve(env: Env, period: string, cap: number): Promise<boolean> {
  if (cap <= 0) return false;
  const res = await env.DB.prepare(
    "INSERT INTO email_counters (period, count) VALUES (?, 1) ON CONFLICT(period) DO UPDATE SET count = count + 1 WHERE count < ?",
  )
    .bind(period, cap)
    .run();
  // A fresh insert or a successful increment both report one change; a full counter reports none.
  return Boolean(res.meta.changes);
}

async function release(env: Env, period: string): Promise<void> {
  await env.DB.prepare("UPDATE email_counters SET count = count - 1 WHERE period = ? AND count > 0").bind(period).run();
}

export async function sendEmail(env: Env, msg: EmailMessage, now: Date = new Date()): Promise<SendResult> {
  if (!emailEnabled(env)) return { sent: false, reason: "off" };
  const day = `d:${now.toISOString().slice(0, 10)}`;
  const month = `m:${now.toISOString().slice(0, 7)}`;
  const dailyCap = Number(env.EMAIL_DAILY_CAP ?? 90);
  const monthlyCap = Number(env.EMAIL_MONTHLY_CAP ?? 2900);
  if (!(await reserve(env, day, dailyCap))) {
    log("warn", "email_cap", { period: "day" });
    return { sent: false, reason: "cap_reached" };
  }
  if (!(await reserve(env, month, monthlyCap))) {
    await release(env, day);
    log("warn", "email_cap", { period: "month" });
    return { sent: false, reason: "cap_reached" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text, reply_to: msg.replyTo || undefined }),
  });
  if (!res.ok) {
    // The slot stays used: a failed call may still have been counted by the provider.
    log("error", "email_failed", { status: res.status });
    return { sent: false, reason: "provider_error" };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { sent: true, id: data.id ?? "" };
}
