import { DISCLAIMER, PRODUCT } from "../shared/config.ts";

export interface SiteContext {
  siteUrl: string;
  supportEmail: string;
  beaconToken: string;
  operatorName: string;
  operatorAbn: string;
  assets: Record<string, string>; // logical name -> hashed file path
}

export interface Page {
  path: string; // "/" or "/guides/foo/"
  title: string;
  description: string;
  body: string;
  scripts?: string[]; // logical script names
  jsonLd?: object[];
  noindex?: boolean;
  /** Included in sitemap.xml with this priority. */
  priority?: number;
}

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const NAV = [
  ["/ndis-invoice-template/", "Invoice template"],
  ["/guides/", "Guides"],
  ["/pricing/", "Pricing"],
  ["/app/", "Log in"],
] as const;

export function renderPage(page: Page, ctx: SiteContext): string {
  const canonical = ctx.siteUrl.replace(/\/$/, "") + page.path;
  const scripts = (page.scripts ?? []).map((s) => `<script type="module" src="${ctx.assets[s]}"></script>`).join("\n");
  const beacon = ctx.beaconToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${esc(JSON.stringify({ token: ctx.beaconToken }))}'></script>`
    : "";
  const jsonLd = (page.jsonLd ?? []).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  const nav = NAV.map(([href, label]) => `<a href="${href}"${page.path.startsWith(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${esc(canonical)}">
${page.noindex ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${PRODUCT.name}">
<meta name="theme-color" content="#0b5753">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${ctx.assets["styles.css"]}">
${jsonLd}
${scripts}
${beacon}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="/" aria-label="${PRODUCT.name} home"><span class="logo-mark" aria-hidden="true">SB</span>${PRODUCT.name}</a>
    <nav aria-label="Main">${nav}</nav>
  </div>
</header>
<main id="main">
${page.body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <nav aria-label="Footer" class="footer-links">
      <a href="/ndis-invoice-template/">NDIS invoice template</a>
      <a href="/invoice-template-australia/">Invoice template (Australia)</a>
      <a href="/guides/">Guides</a>
      <a href="/compare/">Compare</a>
      <a href="/pricing/">Pricing</a>
      <a href="/templates/">Template pack</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
    </nav>
    <p class="small">${esc(DISCLAIMER)}</p>
    <p class="small">Questions or problems: <a href="mailto:${esc(ctx.supportEmail)}">${esc(ctx.supportEmail)}</a></p>
  </div>
</footer>
</body>
</html>
`;
}

/** FAQ block plus matching FAQPage JSON-LD. */
export function faq(items: [string, string][]): { html: string; jsonLd: object } {
  const html = `<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">Questions</h2>${items
    .map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`)
    .join("")}</section>`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return { html, jsonLd };
}

export function breadcrumbs(ctx: SiteContext, trail: [string, string][]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: ctx.siteUrl.replace(/\/$/, "") + path })),
  };
}
