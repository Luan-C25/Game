// Fetch wrapper for the ShiftBill API. Sends the CSRF header, parses errors,
// sends signed-out users to the login screen and handles the capacity page.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  readonly issues: { field: string; message: string }[];
  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}, issues: { field: string; message: string }[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.issues = issues;
  }
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { "x-shiftbill": "1", ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "offline", "Could not reach ShiftBill. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as any;
  if (res.ok) return data as T;
  const err = data?.error ?? {};
  if (res.status === 503 && err.code === "capacity") location.href = "/capacity/";
  throw new ApiError(res.status, err.code ?? "error", err.message ?? `Something went wrong (${res.status}).`, err.fields ?? {}, err.issues ?? []);
}
