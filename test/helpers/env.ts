import type { Env } from "../../src/worker/env.ts";
import { TestD1 } from "./d1.ts";

export function makeEnv(overrides: Partial<Env> = {}): Env & { DB: D1Database } {
  const key = Buffer.alloc(32, 7).toString("base64");
  return {
    ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
    DB: new TestD1() as unknown as D1Database,
    APP_ENV: "test",
    SITE_URL: "https://shiftbill.test",
    DATA_KEY: key,
    PASSWORD_PEPPER: "test-pepper-test-pepper-test-pepper",
    SIGNING_KEY: "test-signing-key-test-signing-key",
    ADMIN_TOKEN: "admin-token-admin-token-admin-token",
    PBKDF2_ITERATIONS: "1000",
    EMAIL_PROVIDER: "none",
    EMAIL_DAILY_CAP: "3",
    EMAIL_MONTHLY_CAP: "5",
    ...overrides,
  };
}

export const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;

export function req(path: string, init: RequestInit & { json?: unknown; cookie?: string } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.method && init.method !== "GET" && !headers.has("x-shiftbill")) headers.set("x-shiftbill", "1");
  return new Request(`https://shiftbill.test${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
}
