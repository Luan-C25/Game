// Fails the build if the landing or generator pages ship more than 100 KB of JS
// on first load (lazy chunks such as the PDF writer are reported separately).
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");
const BUDGET = 100 * 1024;
let failed = false;

function initialScripts(html: string): string[] {
  return [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((m) => m[1]!);
}

function staticImports(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  const code = readFileSync(join(dist, file), "utf8");
  for (const m of code.matchAll(/(?:^|[;}\n])import\s*(?:[^"'()]*?from\s*)?["'](\.\/chunk-[^"']+)["']/g)) staticImports(`/assets/${m[1]!.slice(2)}`, seen);
  return seen;
}

for (const page of ["index.html", "ndis-invoice-template/index.html", "invoice-template-australia/index.html"]) {
  const html = readFileSync(join(dist, page), "utf8");
  const files = new Set<string>();
  for (const s of initialScripts(html)) for (const f of staticImports(s)) files.add(f);
  let raw = 0;
  let gz = 0;
  for (const f of files) {
    const buf = readFileSync(join(dist, f));
    raw += buf.length;
    gz += gzipSync(buf).length;
  }
  const ok = raw <= BUDGET;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} /${page.replace("index.html", "")}: ${(raw / 1024).toFixed(1)} KB JS on first load (${(gz / 1024).toFixed(1)} KB gzipped)`);
}

const lazy = readdirSync(join(dist, "assets")).filter((f) => f.startsWith("chunk-"));
for (const f of lazy) console.log(`     lazy chunk ${f}: ${(readFileSync(join(dist, "assets", f)).length / 1024).toFixed(1)} KB`);
if (failed) process.exit(1);
