// First-party attribution. UTM parameters from the first visit are kept in this
// browser and sent with a few funnel events (generator completed, sign-up), so we
// can see which channel produces paying users. Nothing here identifies a person.

const KEY = "shiftbill.attr.v1";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_host?: string;
  landing_path?: string;
}

function clean(v: string | null): string | undefined {
  if (!v) return undefined;
  const s = v.trim().toLowerCase().replace(/[^a-z0-9._\-]/g, "").slice(0, 60);
  return s || undefined;
}

export function captureAttribution(): void {
  try {
    if (localStorage.getItem(KEY)) return;
    const params = new URLSearchParams(location.search);
    const attr: Attribution = {};
    for (const f of FIELDS) attr[f] = clean(params.get(f));
    try {
      const ref = document.referrer ? new URL(document.referrer).hostname : "";
      if (ref && ref !== location.hostname) attr.referrer_host = clean(ref);
    } catch {
      /* ignore bad referrers */
    }
    attr.landing_path = location.pathname.slice(0, 100);
    localStorage.setItem(KEY, JSON.stringify(attr));
  } catch {
    /* storage blocked: attribution is optional */
  }
}

export function getAttribution(): Attribution {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Attribution;
  } catch {
    return {};
  }
}

export function track(type: "generator_complete" | "pack_view" | "pricing_view"): void {
  try {
    const body = JSON.stringify({ type, ...getAttribution() });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/event", blob)) {
      void fetch("/api/event", { method: "POST", body, headers: { "content-type": "application/json", "x-shiftbill": "1" }, keepalive: true });
    }
  } catch {
    /* tracking must never break the page */
  }
}
