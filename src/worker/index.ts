import type { Env } from "./env.ts";
import { HttpError, errorResponse, json } from "./http.ts";
import { log, errorFields } from "./log.ts";
import { handlePublicEvent, handleAdminStats } from "./events.ts";
import * as auth from "./auth.ts";
import * as api from "./api.ts";
import { NotFound } from "./db.ts";
import * as stripe from "./stripe.ts";
import { handleReminder, runDailyJobs } from "./reminders.ts";
import * as money from "./money.ts";
import { claimPack, downloadPack } from "./pack.ts";

export type { Env };

type Handler = (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => Promise<Response>;

const routes: [string, RegExp, Handler][] = [];
function route(method: string, pattern: string, handler: Handler): void {
  routes.push([method, new RegExp(`^${pattern.replace(/\./g, "\\.").replace(/:(\w+)/g, "(?<$1>[\\w-]+)")}$`), handler]);
}

route("GET", "/api/health", async (_req, env) => {
  // Cheap liveness check plus one tiny query so a D1 problem shows up here.
  let db = "ok";
  try {
    await env.DB.prepare("SELECT 1").first();
  } catch (err) {
    db = isCapacityError(err) ? "at_capacity" : "error";
  }
  return json({ ok: db === "ok", db, env: env.APP_ENV, time: new Date().toISOString() }, db === "ok" ? 200 : 503);
});
route("POST", "/api/event", (req, env) => handlePublicEvent(req, env));
route("GET", "/api/admin/stats", (req, env) => handleAdminStats(req, env));

route("POST", "/api/auth/signup", (req, env) => auth.signup(req, env));
route("POST", "/api/auth/login", (req, env) => auth.login(req, env));
route("POST", "/api/auth/logout", (req, env) => auth.logout(req, env));
route("POST", "/api/auth/recover", (req, env) => auth.recover(req, env));
route("POST", "/api/account/password", (req, env) => auth.changePassword(req, env));
route("POST", "/api/account/recovery-code", (req, env) => auth.newRecovery(req, env));
route("DELETE", "/api/account", (req, env) => auth.deleteAccount(req, env, (customerId) => stripe.cancelCustomerSubscriptions(env, customerId)));
route("POST", "/api/billing/checkout", (req, env) => stripe.createCheckout(req, env));
route("POST", "/api/billing/portal", (req, env) => stripe.createPortal(req, env));
route("POST", "/api/stripe/webhook", (req, env) => stripe.handleWebhook(req, env));
route("POST", "/api/pack/checkout", (req, env) => stripe.createPackCheckout(req, env));
route("POST", "/api/pack/claim", (req, env) => claimPack(req, env));
route("GET", "/api/pack/download", (req, env) => downloadPack(req, env));

route("GET", "/api/me", api.getMe);
route("PUT", "/api/settings", api.putSettings);
route("GET", "/api/participants", api.listParticipants);
route("POST", "/api/participants", api.createParticipant);
route("PUT", "/api/participants/:id", api.updateParticipant);
route("DELETE", "/api/participants/:id", api.deleteParticipant);
route("GET", "/api/shifts", api.listShifts);
route("POST", "/api/shifts", api.createShift);
route("PUT", "/api/shifts/:id", api.updateShift);
route("DELETE", "/api/shifts/:id", api.deleteShift);
route("GET", "/api/invoices", api.listInvoices);
route("POST", "/api/invoices", api.createInvoice);
route("GET", "/api/invoices/:id", api.getInvoice);
route("DELETE", "/api/invoices/:id", api.deleteInvoice);
route("POST", "/api/invoices/:id/status", api.setInvoiceStatus);
route("POST", "/api/invoices/:id/repeat", api.repeatInvoice);
route("GET", "/api/abn/:abn", api.abnLookup);
route("POST", "/api/invoices/:id/reminder", handleReminder);
route("GET", "/api/money", money.moneySummary);
route("GET", "/api/export/invoices.csv", money.exportInvoices);
route("GET", "/api/export/shifts.csv", money.exportShifts);

/** D1 returns these when the free plan's daily read or write allowance is used up. */
export function isCapacityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /exceeded D1's free tier daily|daily row (read|write) limit|Error 1027/i.test(msg);
}

export async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const started = Date.now();
  let status = 500;
  try {
    let pathMatched = false;
    for (const [method, re, handler] of routes) {
      const m = re.exec(url.pathname);
      if (!m) continue;
      pathMatched = true;
      if (method !== request.method) continue;
      const res = await handler(request, env, ctx, m.groups ?? {});
      status = res.status;
      return res;
    }
    status = pathMatched ? 405 : 404;
    return errorResponse(status, pathMatched ? "method_not_allowed" : "not_found", pathMatched ? "Method not allowed." : "Not found.");
  } catch (err) {
    if (err instanceof HttpError) {
      status = err.status;
      const fields = (err as HttpError & { fields?: Record<string, string> }).fields;
      if (fields) return json({ error: { code: err.code, message: err.message, fields } }, err.status);
      return errorResponse(err.status, err.code, err.message, err.status === 429 ? { "retry-after": "60" } : {});
    }
    if (err instanceof NotFound) {
      status = 404;
      return errorResponse(404, "not_found", err.message);
    }
    if (isCapacityError(err)) {
      status = 503;
      log("warn", "capacity", { path: url.pathname });
      return errorResponse(503, "capacity", "ShiftBill is temporarily at capacity. Your data is safe. Please try again later.", { "retry-after": "3600" });
    }
    status = 500;
    log("error", "unhandled", { path: url.pathname, method: request.method, ...errorFields(err) });
    return errorResponse(500, "server_error", "Something went wrong on our side. Please try again.");
  } finally {
    log("info", "request", { method: request.method, path: url.pathname, status, ms: Date.now() - started });
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(
      runDailyJobs(env).catch((err) => {
        if (isCapacityError(err)) log("warn", "cron_capacity", {});
        else log("error", "cron_failed", errorFields(err));
      }),
    );
  },
} satisfies ExportedHandler<Env>;
