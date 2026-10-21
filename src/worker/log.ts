// Structured JSON logs (visible in Workers Logs). Only whitelisted, non-personal
// fields are ever logged: never request bodies, emails, names or NDIS numbers.

type Level = "info" | "warn" | "error";
type Safe = string | number | boolean | null | undefined;

export function log(level: Level, event: string, fields: Record<string, Safe> = {}): void {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function errorFields(err: unknown): Record<string, Safe> {
  if (err instanceof Error) return { error: err.name, message: err.message.slice(0, 300) };
  return { error: String(err).slice(0, 300) };
}
