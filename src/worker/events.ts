import type { Env } from "./env.ts";
import { HttpError, json, noContent, readJson, clientIp } from "./http.ts";
import { rateLimit } from "./ratelimit.ts";

export const EVENT_TYPES = ["generator_complete", "signup", "checkout_started", "subscribed", "pack_purchased", "pricing_view", "pack_view"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface Attribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer_host?: string | null;
  landing_path?: string | null;
}

/** Campaign values are short lowercase tokens; anything else is dropped. */
export function cleanToken(value: unknown, max = 60): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase().replace(/[^a-z0-9._\-]/g, "").slice(0, max);
  return s || null;
}

export function cleanAttribution(body: Record<string, unknown>): Required<Attribution> {
  const path = typeof body.landing_path === "string" && body.landing_path.startsWith("/") ? body.landing_path.replace(/[^\w\-/.]/g, "").slice(0, 100) : null;
  return {
    utm_source: cleanToken(body.utm_source),
    utm_medium: cleanToken(body.utm_medium),
    utm_campaign: cleanToken(body.utm_campaign),
    utm_content: cleanToken(body.utm_content),
    utm_term: cleanToken(body.utm_term),
    referrer_host: cleanToken(body.referrer_host, 100),
    landing_path: path,
  };
}

export async function recordEvent(env: Env, type: EventType, userId: string | null, a: Attribution): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO events (type, user_id, utm_source, utm_medium, utm_campaign, utm_content, referrer_host, landing_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(type, userId, a.utm_source ?? null, a.utm_medium ?? null, a.utm_campaign ?? null, a.utm_content ?? null, a.referrer_host ?? null, a.landing_path ?? null, new Date().toISOString())
    .run();
}

/** POST /api/event: anonymous funnel events from public pages. */
export async function handlePublicEvent(request: Request, env: Env): Promise<Response> {
  await rateLimit(env.RL_PUBLIC, `event:${clientIp(request)}`);
  const body = await readJson(request, 2048);
  const type = body.type;
  // Only events that browsers may report anonymously. Sign-ups and payments are recorded server-side.
  if (type !== "generator_complete" && type !== "pricing_view" && type !== "pack_view") throw new HttpError(400, "bad_event", "Unknown event.");
  await recordEvent(env, type, null, cleanAttribution(body));
  return noContent();
}

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export function assertAdmin(request: Request, env: Env): void {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24 || !timingSafeEqual(token, env.ADMIN_TOKEN)) {
    throw new HttpError(401, "unauthorised", "Admin token required.");
  }
}

/**
 * GET /api/admin/stats?days=30: the funnel by first-touch source.
 * Visits come from Cloudflare Web Analytics; everything after that is here.
 */
export async function handleAdminStats(request: Request, env: Env): Promise<Response> {
  assertAdmin(request, env);
  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? "30") || 30));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const src = "COALESCE(utm_source, CASE WHEN referrer_host IS NOT NULL THEN 'ref:' || referrer_host ELSE '(direct)' END)";
  const [events, signups, paid, packs, totals] = await env.DB.batch([
    env.DB.prepare(`SELECT ${src} AS source, type, COUNT(*) AS n FROM events WHERE created_at >= ? GROUP BY source, type`).bind(since),
    env.DB.prepare(`SELECT ${src} AS source, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY source`).bind(since),
    env.DB.prepare(
      `SELECT ${src} AS source, COUNT(*) AS n FROM users u JOIN subscriptions s ON s.user_id = u.id
       WHERE s.status IN ('active', 'trialing', 'past_due') AND u.created_at >= ? GROUP BY source`,
    ).bind(since),
    env.DB.prepare(`SELECT COALESCE(utm_source, '(direct)') AS source, COUNT(*) AS n, SUM(amount_cents) AS cents FROM purchases WHERE created_at >= ? GROUP BY source`).bind(since),
    env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM users) AS users,
              (SELECT COUNT(*) FROM subscriptions WHERE status IN ('active', 'trialing', 'past_due')) AS paying,
              (SELECT COUNT(*) FROM purchases) AS packs`,
    ),
  ]);
  type Row = Record<string, string | number | null>;
  const bySource: Record<string, Record<string, number>> = {};
  const add = (source: unknown, key: string, n: unknown) => {
    const s = String(source ?? "(direct)");
    bySource[s] ??= {};
    bySource[s][key] = (bySource[s][key] ?? 0) + Number(n ?? 0);
  };
  for (const r of (events!.results ?? []) as Row[]) add(r.source, String(r.type), r.n);
  for (const r of (signups!.results ?? []) as Row[]) add(r.source, "signups", r.n);
  for (const r of (paid!.results ?? []) as Row[]) add(r.source, "paying", r.n);
  for (const r of (packs!.results ?? []) as Row[]) add(r.source, "packs", r.n);
  return json({ days, since, bySource, totals: (totals!.results ?? [])[0] ?? {} });
}
