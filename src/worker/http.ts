// Request and response helpers shared by every API route.

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const API_HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
};

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers({ "content-type": "application/json; charset=utf-8", ...API_HEADERS });
  new Headers(headers).forEach((v, k) => h.append(k, v));
  return new Response(JSON.stringify(data), { status, headers: h });
}

export function errorResponse(status: number, code: string, message: string, headers: HeadersInit = {}): Response {
  return json({ error: { code, message } }, status, headers);
}

export function noContent(headers: HeadersInit = {}): Response {
  const h = new Headers(API_HEADERS);
  new Headers(headers).forEach((v, k) => h.append(k, v));
  return new Response(null, { status: 204, headers: h });
}

/** Read a JSON body with a size cap. */
export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maxBytes) throw new HttpError(413, "too_large", "Request is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large", "Request is too large.");
  try {
    const value = JSON.parse(text) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
    return value as T;
  } catch {
    throw new HttpError(400, "bad_json", "Request body must be a JSON object.");
  }
}

/**
 * CSRF protection for cookie-authenticated, state-changing requests:
 * the browser must send our custom header (which a cross-site form cannot set
 * without a CORS preflight we never approve) and, when present, a same-origin Origin.
 */
export function assertSameOrigin(request: Request): void {
  if (request.headers.get("x-shiftbill") !== "1") throw new HttpError(403, "csrf", "Missing request header.");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "csrf", "Cross-site request blocked.");
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function sessionCookie(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
