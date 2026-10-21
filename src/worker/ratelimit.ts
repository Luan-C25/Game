import { HttpError } from "./http.ts";

/** Throws 429 when the Workers Rate Limiting binding says no. Missing bindings allow the request. */
export async function rateLimit(binding: RateLimit | undefined, key: string): Promise<void> {
  if (!binding) return;
  const { success } = await binding.limit({ key });
  if (!success) throw new HttpError(429, "rate_limited", "Too many requests. Wait a minute and try again.");
}
