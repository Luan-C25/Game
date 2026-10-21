// Template pack delivery. After Stripe Checkout, the thanks page exchanges the
// Checkout Session id for a signed download link that expires after 7 days and
// works up to 20 times. The zip is bundled into the Worker, not public assets.

import type { Env } from "./env.ts";
import { HttpError, json, readJson, assertSameOrigin, clientIp } from "./http.ts";
import { rateLimit } from "./ratelimit.ts";
import { hmacHex, timingSafeEqualStr, newId, fromB64url } from "./crypto.ts";
import { stripeRequest } from "./stripe.ts";
import { recordEvent } from "./events.ts";
import { PACK_ZIP_BASE64 } from "./generated/pack.ts";

export const LINK_DAYS = 7;
export const MAX_DOWNLOADS = 20;

export async function signDownload(env: Env, purchaseId: string, expires: number): Promise<string> {
  const sig = await hmacHex(env.SIGNING_KEY, `pack:${purchaseId}:${expires}`);
  return `/api/pack/download?p=${encodeURIComponent(purchaseId)}&exp=${expires}&sig=${sig}`;
}

/** POST /api/pack/claim { sessionId } -> { url } */
export async function claimPack(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  await rateLimit(env.RL_AUTH, `claim:${clientIp(request)}`);
  const body = await readJson(request, 1024);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) throw new HttpError(400, "bad_session", "That purchase link is not valid.");
  let purchase = await env.DB.prepare("SELECT id FROM purchases WHERE stripe_session_id = ?").bind(sessionId).first<{ id: string }>();
  if (!purchase) {
    // The webhook may not have arrived yet, so ask Stripe directly.
    const session = await stripeRequest<{ payment_status?: string; amount_total?: number; metadata?: Record<string, string> }>(env, "GET", `/checkout/sessions/${sessionId}`);
    if (session.payment_status !== "paid" || session.metadata?.product !== "template_pack") throw new HttpError(402, "not_paid", "We could not find a completed payment for this link.");
    const id = newId();
    const inserted = await env.DB.prepare(
      "INSERT INTO purchases (id, stripe_session_id, product, amount_cents, utm_source, created_at) VALUES (?, ?, 'template_pack', ?, ?, ?) ON CONFLICT(stripe_session_id) DO NOTHING",
    )
      .bind(id, sessionId, session.amount_total ?? 0, session.metadata?.utm_source || null, new Date().toISOString())
      .run();
    if (inserted.meta.changes) await recordEvent(env, "pack_purchased", null, { utm_source: session.metadata?.utm_source || null });
    purchase = await env.DB.prepare("SELECT id FROM purchases WHERE stripe_session_id = ?").bind(sessionId).first<{ id: string }>();
  }
  const expires = Math.floor(Date.now() / 1000) + LINK_DAYS * 86_400;
  return json({ url: await signDownload(env, purchase!.id, expires), expiresAt: new Date(expires * 1000).toISOString() });
}

/** GET /api/pack/download?p=&exp=&sig= */
export async function downloadPack(request: Request, env: Env): Promise<Response> {
  await rateLimit(env.RL_PUBLIC, `dl:${clientIp(request)}`);
  const url = new URL(request.url);
  const p = url.searchParams.get("p") ?? "";
  const exp = Number(url.searchParams.get("exp") ?? "0");
  const sig = url.searchParams.get("sig") ?? "";
  const expected = await hmacHex(env.SIGNING_KEY, `pack:${p}:${exp}`);
  if (!p || !timingSafeEqualStr(sig, expected)) throw new HttpError(403, "bad_link", "This download link is not valid.");
  if (exp < Date.now() / 1000) throw new HttpError(410, "expired", "This download link has expired. Open the link in your receipt email again, or contact us.");
  const updated = await env.DB.prepare("UPDATE purchases SET downloads = downloads + 1 WHERE id = ? AND downloads < ?").bind(p, MAX_DOWNLOADS).run();
  if (!updated.meta.changes) throw new HttpError(429, "download_limit", "This link has been used too many times. Contact us and we will help.");
  return new Response(fromB64url(PACK_ZIP_BASE64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="ShiftBill template pack.zip"',
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
