import worker from "../../src/worker/index.ts";
import { makeEnv, ctx, req } from "./env.ts";

export type TestEnv = ReturnType<typeof makeEnv>;

/** A tiny API client that keeps a session cookie, like a browser would. */
export class Client {
  cookie = "";
  readonly env: TestEnv;
  constructor(env: TestEnv) {
    this.env = env;
  }
  async call(method: string, path: string, body?: unknown): Promise<{ status: number; data: any; res: Response }> {
    const res = await worker.fetch!(req(path, { method, json: body, cookie: this.cookie }) as never, this.env, ctx);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0]!;
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, res };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b?: unknown) => this.call("POST", p, b ?? {});
  put = (p: string, b?: unknown) => this.call("PUT", p, b ?? {});
  del = (p: string, b?: unknown) => this.call("DELETE", p, b ?? {});
}

export async function signedUp(env: TestEnv, email = `w${Math.random().toString(36).slice(2)}@example.com`): Promise<Client & { recoveryCode: string; email: string }> {
  const c = new Client(env) as Client & { recoveryCode: string; email: string };
  const r = await c.post("/api/auth/signup", { email, password: "correct horse battery", acceptTerms: true, attribution: { utm_source: "tiktok" } });
  if (r.status !== 201) throw new Error(`signup failed ${r.status} ${JSON.stringify(r.data)}`);
  c.recoveryCode = r.data.recoveryCode;
  c.email = email;
  return c;
}

export async function makePaid(env: TestEnv, client: Client): Promise<void> {
  const me = await client.get("/api/me");
  const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(me.data.email).first<{ id: string }>();
  await env.DB.prepare("INSERT INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES (?, ?, 'active', ?)")
    .bind(user!.id, `cus_${user!.id.slice(0, 8)}`, new Date().toISOString())
    .run();
}

export const VALID_ABN = "51 824 753 556";

export async function setUpWorker(client: Client): Promise<{ participantId: string }> {
  await client.put("/api/settings", {
    provider: { name: "Sam Nguyen", abn: VALID_ABN, gstRegistered: false, email: "sam@example.com" },
    payment: { accountName: "Sam Nguyen", bsb: "062000", accountNumber: "12345678", payId: "sam@example.com" },
    termsDays: 7,
    taxPercent: 25,
  });
  const p = await client.post("/api/participants", {
    name: "Alex Participant",
    ndisNumber: "431 234 567",
    planType: "plan",
    billToName: "Example Plan Management",
    billToEmail: "invoices@example.com",
    itemNumber: "01_011_0107_1_1",
    description: "Assistance with self-care",
    rateCents: 7358,
    kmItemNumber: "01_799_0107_1_1",
    kmRateCents: 100,
  });
  if (p.status !== 201) throw new Error(`participant failed ${JSON.stringify(p.data)}`);
  return { participantId: p.data.id };
}

export function shiftBody(participantId: string, overrides: Record<string, unknown> = {}) {
  return { participantId, date: "2026-10-14", start: "09:00", end: "12:00", breakMinutes: 0, itemNumber: "01_011_0107_1_1", description: "Self-care", rateCents: 7358, km: 0, kmRateCents: 100, kmItemNumber: "01_799_0107_1_1", ...overrides };
}
