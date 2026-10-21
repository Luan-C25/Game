import type { Env } from "./env.ts";
import { HttpError, json, readJson, getCookie, sessionCookie, clientIp, assertSameOrigin } from "./http.ts";
import { rateLimit } from "./ratelimit.ts";
import { hashPassword, verifyPassword, randomToken, sha256Hex, newId, newRecoveryCode, normaliseRecoveryCode, hmacHex, timingSafeEqualStr } from "./crypto.ts";
import { getUserByEmail, getUserById, deleteUser, type UserRow } from "./db.ts";
import { cleanAttribution, recordEvent } from "./events.ts";
import { isValidEmail } from "../shared/validate.ts";
import { log } from "./log.ts";

const SESSION_DAYS = 30;
const MIN_PASSWORD = 10;

function cookieName(request: Request): string {
  // __Host- cookies must be Secure, so plain-http local development uses a plain name.
  return new URL(request.url).protocol === "https:" ? "__Host-sb_session" : "sb_session";
}

function iterations(env: Env): number {
  return Math.min(1_000_000, Math.max(1000, Number(env.PBKDF2_ITERATIONS) || 10_000));
}

async function recoveryHash(env: Env, code: string): Promise<string> {
  return hmacHex(env.PASSWORD_PEPPER, `recovery:${normaliseRecoveryCode(code)}`);
}

async function createSession(env: Env, request: Request, userId: string): Promise<string> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), userId, new Date().toISOString(), expires)
    .run();
  return sessionCookie(cookieName(request), token, SESSION_DAYS * 86_400, new URL(request.url).protocol === "https:");
}

/** The signed-in user for this request, or null. */
export async function currentUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = getCookie(request, cookieName(request));
  if (!token || token.length > 100) return null;
  const row = await env.DB.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
  )
    .bind(await sha256Hex(token), new Date().toISOString())
    .first<UserRow>();
  return row ?? null;
}

export async function requireUser(request: Request, env: Env): Promise<UserRow> {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, "signed_out", "Please log in.");
  return user;
}

function validateCredentials(body: Record<string, unknown>): { email: string; password: string } {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!isValidEmail(email)) throw new HttpError(400, "bad_email", "Enter a valid email address.");
  if (password.length > 200) throw new HttpError(400, "bad_password", "That password is too long.");
  return { email, password };
}

/** POST /api/auth/signup */
export async function signup(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  await rateLimit(env.RL_AUTH, `signup:${clientIp(request)}`);
  const body = await readJson(request, 4096);
  const { email, password } = validateCredentials(body);
  if (password.length < MIN_PASSWORD) throw new HttpError(400, "weak_password", `Use at least ${MIN_PASSWORD} characters. A short phrase is easiest to remember.`);
  if (body.acceptTerms !== true) throw new HttpError(400, "terms", "Please accept the terms and privacy policy.");
  if (await getUserByEmail(env, email)) throw new HttpError(409, "email_taken", "There is already an account with that email. Try logging in.");

  const pw = await hashPassword(password, env.PASSWORD_PEPPER, iterations(env));
  const recoveryCode = newRecoveryCode();
  const id = newId();
  const a = cleanAttribution((body.attribution ?? {}) as Record<string, unknown>);
  await env.DB.prepare(
    `INSERT INTO users (id, email, pw_hash, pw_salt, pw_iterations, recovery_hash, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer_host, landing_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, email, pw.hash, pw.salt, pw.iterations, await recoveryHash(env, recoveryCode), a.utm_source, a.utm_medium, a.utm_campaign, a.utm_content, a.utm_term, a.referrer_host, a.landing_path, new Date().toISOString())
    .run();
  await recordEvent(env, "signup", id, a);
  log("info", "signup", { source: a.utm_source ?? "(direct)" });
  const cookie = await createSession(env, request, id);
  return json({ ok: true, recoveryCode }, 201, { "set-cookie": cookie });
}

/** POST /api/auth/login */
export async function login(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const body = await readJson(request, 4096);
  const { email, password } = validateCredentials(body);
  await rateLimit(env.RL_AUTH, `login:${clientIp(request)}`);
  await rateLimit(env.RL_AUTH, `login-email:${await sha256Hex(email)}`);
  const user = await getUserByEmail(env, email);
  const ok = user ? await verifyPassword(password, env.PASSWORD_PEPPER, { hash: user.pw_hash, salt: user.pw_salt, iterations: user.pw_iterations }) : false;
  if (!user || !ok) throw new HttpError(401, "bad_login", "Email or password is not right.");
  // Upgrade the hash if the iteration setting has been raised since it was made.
  if (user.pw_iterations < iterations(env)) {
    const pw = await hashPassword(password, env.PASSWORD_PEPPER, iterations(env));
    await env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iterations = ? WHERE id = ?").bind(pw.hash, pw.salt, pw.iterations, user.id).run();
  }
  await env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(new Date().toISOString(), user.id).run();
  // Housekeeping: drop this user's expired sessions.
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?").bind(user.id, new Date().toISOString()).run();
  return json({ ok: true }, 200, { "set-cookie": await createSession(env, request, user.id) });
}

/** POST /api/auth/logout */
export async function logout(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const token = getCookie(request, cookieName(request));
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(cookieName(request), "", 0, new URL(request.url).protocol === "https:") });
}

/** POST /api/auth/recover: email + recovery code + new password. Issues a new recovery code. */
export async function recover(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  await rateLimit(env.RL_AUTH, `recover:${clientIp(request)}`);
  const body = await readJson(request, 4096);
  const { email, password } = validateCredentials(body);
  const code = typeof body.recoveryCode === "string" ? body.recoveryCode : "";
  if (password.length < MIN_PASSWORD) throw new HttpError(400, "weak_password", `Use at least ${MIN_PASSWORD} characters.`);
  const user = await getUserByEmail(env, email);
  if (!user || !code || !timingSafeEqualStr(await recoveryHash(env, code), user.recovery_hash)) {
    throw new HttpError(401, "bad_recovery", "That email and recovery code do not match.");
  }
  const pw = await hashPassword(password, env.PASSWORD_PEPPER, iterations(env));
  const newCode = newRecoveryCode();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iterations = ?, recovery_hash = ? WHERE id = ?").bind(pw.hash, pw.salt, pw.iterations, await recoveryHash(env, newCode), user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
  ]);
  log("info", "password_recovered", {});
  return json({ ok: true, recoveryCode: newCode }, 200, { "set-cookie": await createSession(env, request, user.id) });
}

/** POST /api/account/password: change password while signed in. Logs out other devices. */
export async function changePassword(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const user = await requireUser(request, env);
  await rateLimit(env.RL_AUTH, `pw:${user.id}`);
  const body = await readJson(request, 4096);
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!(await verifyPassword(current, env.PASSWORD_PEPPER, { hash: user.pw_hash, salt: user.pw_salt, iterations: user.pw_iterations }))) {
    throw new HttpError(401, "bad_password", "Your current password is not right.");
  }
  if (next.length < MIN_PASSWORD || next.length > 200) throw new HttpError(400, "weak_password", `Use at least ${MIN_PASSWORD} characters.`);
  const pw = await hashPassword(next, env.PASSWORD_PEPPER, iterations(env));
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iterations = ? WHERE id = ?").bind(pw.hash, pw.salt, pw.iterations, user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
  ]);
  return json({ ok: true }, 200, { "set-cookie": await createSession(env, request, user.id) });
}

/** POST /api/account/recovery-code: replace the recovery code (needs the password). */
export async function newRecovery(request: Request, env: Env): Promise<Response> {
  assertSameOrigin(request);
  const user = await requireUser(request, env);
  await rateLimit(env.RL_AUTH, `rc:${user.id}`);
  const body = await readJson(request, 4096);
  const pw = typeof body.password === "string" ? body.password : "";
  if (!(await verifyPassword(pw, env.PASSWORD_PEPPER, { hash: user.pw_hash, salt: user.pw_salt, iterations: user.pw_iterations }))) {
    throw new HttpError(401, "bad_password", "Your password is not right.");
  }
  const code = newRecoveryCode();
  await env.DB.prepare("UPDATE users SET recovery_hash = ? WHERE id = ?").bind(await recoveryHash(env, code), user.id).run();
  return json({ ok: true, recoveryCode: code });
}

/** DELETE /api/account: delete the account and every record in it (needs the password). */
export async function deleteAccount(request: Request, env: Env, cancelStripe: (customerId: string) => Promise<void>): Promise<Response> {
  assertSameOrigin(request);
  const user = await requireUser(request, env);
  const body = await readJson(request, 4096);
  const pw = typeof body.password === "string" ? body.password : "";
  if (!(await verifyPassword(pw, env.PASSWORD_PEPPER, { hash: user.pw_hash, salt: user.pw_salt, iterations: user.pw_iterations }))) {
    throw new HttpError(401, "bad_password", "Your password is not right.");
  }
  const sub = await env.DB.prepare("SELECT stripe_customer_id, status FROM subscriptions WHERE user_id = ?").bind(user.id).first<{ stripe_customer_id: string; status: string }>();
  if (sub && ["active", "trialing", "past_due"].includes(sub.status)) await cancelStripe(sub.stripe_customer_id);
  await deleteUser(env, user.id);
  log("info", "account_deleted", {});
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(cookieName(request), "", 0, new URL(request.url).protocol === "https:") });
}

export { getUserById };
