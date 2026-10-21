import type { Env } from "./env.ts";
import { HttpError, errorResponse, json } from "./http.ts";
import { log, errorFields } from "./log.ts";
import { handlePublicEvent, handleAdminStats } from "./events.ts";

export type { Env };

type Handler = (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => Promise<Response>;

const routes: [string, RegExp, Handler][] = [];
function route(method: string, pattern: string, handler: Handler): void {
  routes.push([method, new RegExp(`^${pattern.replace(/:(\w+)/g, "(?<$1>[\\w-]+)")}$`), handler]);
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
      return errorResponse(err.status, err.code, err.message, err.status === 429 ? { "retry-after": "60" } : {});
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
} satisfies ExportedHandler<Env>;
