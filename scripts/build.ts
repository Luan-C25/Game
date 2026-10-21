// Static site build: bundles the browser scripts with esbuild, renders every page
// to HTML, and writes sitemap, robots, llms.txt and security headers into dist/.
// Run with: npm run build (env: SITE_URL, SUPPORT_EMAIL, CF_BEACON_TOKEN, OPERATOR_NAME, OPERATOR_ABN).

import { build, transform } from "esbuild";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { renderPage, type SiteContext } from "../src/site/layout.ts";
import { allPages } from "../src/site/pages/index.ts";
import { siteExtras } from "../src/site/extras.ts";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const dist = join(root, "dist");
const siteUrl = (process.env.SITE_URL || "http://localhost:8787").replace(/\/$/, "");
const supportEmail = process.env.SUPPORT_EMAIL || "hello@shiftbill.example";
const beaconToken = process.env.CF_BEACON_TOKEN || "";
const operatorName = process.env.OPERATOR_NAME || "[operator name to be added before launch]";
const operatorAbn = process.env.OPERATOR_ABN || "";

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });

// 1. Browser scripts. Splitting keeps the PDF writer out of the first load.
const entries = ["site", "generator", "app", "admin", "pack"];
const result = await build({
  entryPoints: Object.fromEntries(entries.map((e) => [e, join(root, "src/client", `${e}.ts`)])),
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  sourcemap: false,
  target: ["es2020", "safari15"],
  outdir: join(dist, "assets"),
  entryNames: "[name]-[hash]",
  chunkNames: "chunk-[hash]",
  metafile: true,
  legalComments: "none",
  logLevel: "warning",
});
const assets: Record<string, string> = {};
for (const [out, meta] of Object.entries(result.metafile.outputs)) {
  if (!meta.entryPoint) continue;
  const name = entries.find((e) => meta.entryPoint!.endsWith(`src/client/${e}.ts`));
  if (name) assets[name] = "/" + relative(dist, join(root, out)).replace(/\\/g, "/");
}

// 2. Stylesheet, minified and content-hashed.
const css = (await transform(readFileSync(join(root, "src/site/styles.css"), "utf8"), { loader: "css", minify: true })).code;
const cssName = `styles-${createHash("sha256").update(css).digest("hex").slice(0, 10)}.css`;
writeFileSync(join(dist, "assets", cssName), css);
assets["styles.css"] = `/assets/${cssName}`;

// 3. Pages.
const ctx: SiteContext = { siteUrl, supportEmail, beaconToken, operatorName, operatorAbn, assets };
const pages = allPages(ctx);
for (const page of pages) {
  const file = page.path.endsWith(".html") ? join(dist, page.path) : join(dist, page.path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderPage(page, ctx));
}

// 4. sitemap.xml, robots.txt, llms.txt, _headers.
for (const [name, body] of Object.entries(siteExtras(ctx, pages))) writeFileSync(join(dist, name), body);

// 5. Public files (favicon).
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), dist, { recursive: true });

// 6. Paid template pack, bundled into the Worker (never into public assets).
await import("./gen-pack.ts");

const count = readdirSync(join(dist, "assets")).length;
console.log(`Built ${pages.length} pages and ${count} assets for ${siteUrl}`);
