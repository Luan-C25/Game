// Web Crypto helpers: ids, tokens, hashing, HMAC signing, field encryption and
// password hashing. Everything runs on the Workers runtime with no libraries.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function newId(): string {
  return crypto.randomUUID();
}

export function randomToken(bytes = 32): string {
  return b64url(randomBytes(bytes));
}

export async function sha256Hex(value: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  return hex(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(message)));
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const ea = enc.encode(a);
  const eb = enc.encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

// ---- Field encryption (AES-256-GCM). Format: "v1.<iv>.<ciphertext>" in base64url. ----

const keyCache = new Map<string, Promise<CryptoKey>>();

/** The AES-256 key is the SHA-256 of DATA_KEY, so any long random string works as the secret. */
function dataKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    if (!secret || secret.length < 32) throw new Error("DATA_KEY must be a random string of at least 32 characters");
    key = crypto.subtle.digest("SHA-256", enc.encode(secret)).then((raw) => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]));
    keyCache.set(secret, key);
  }
  return key;
}

export async function encryptText(secret: string, plaintext: string): Promise<string> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await dataKey(secret), enc.encode(plaintext));
  return `v1.${b64url(iv)}.${b64url(new Uint8Array(ct))}`;
}

export async function decryptText(secret: string, value: string): Promise<string> {
  const [version, iv, ct] = value.split(".");
  if (version !== "v1" || !iv || !ct) throw new Error("Unknown ciphertext format");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64url(iv) }, await dataKey(secret), fromB64url(ct));
  return dec.decode(pt);
}

export async function encryptJson(secret: string, value: unknown): Promise<string> {
  return encryptText(secret, JSON.stringify(value));
}

export async function decryptJson<T>(secret: string, value: string): Promise<T> {
  return JSON.parse(await decryptText(secret, value)) as T;
}

// ---- Passwords ----
// PBKDF2-SHA256 over HMAC(pepper, password). The pepper lives in a Worker secret,
// so a copy of the database alone is not enough to test password guesses.
// Iterations are limited by the 10 ms CPU budget on Workers Free; see SECURITY.md.

export async function hashPassword(password: string, pepper: string, iterations: number, saltB64?: string): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt = saltB64 ? fromB64url(saltB64) : randomBytes(16);
  const peppered = await crypto.subtle.sign("HMAC", await hmacKey(pepper), enc.encode(password.normalize("NFKC")));
  const material = await crypto.subtle.importKey("raw", peppered, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256);
  return { hash: b64url(new Uint8Array(bits)), salt: b64url(salt), iterations };
}

export async function verifyPassword(password: string, pepper: string, stored: { hash: string; salt: string; iterations: number }): Promise<boolean> {
  const { hash } = await hashPassword(password, pepper, stored.iterations, stored.salt);
  return timingSafeEqualStr(hash, stored.hash);
}

// ---- Recovery codes: 80 random bits shown once, as XXXX-XXXX-XXXX-XXXX ----

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O, 1/I/L, U

export function newRecoveryCode(): string {
  const bytes = randomBytes(16);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

export function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
