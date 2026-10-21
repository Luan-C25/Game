// Funnel report for the owner. The admin token is kept only in this tab's session storage.
import { $ } from "./dom.ts";

const KEY = "shiftbill.admin";
const COLUMNS = ["generator_complete", "signups", "checkout_started", "paying", "packs"] as const;

async function load(): Promise<void> {
  const token = sessionStorage.getItem(KEY) ?? "";
  const days = $<HTMLSelectElement>("#days").value;
  const out = $("#report");
  out.textContent = "Loading...";
  const res = await fetch(`/api/admin/stats?days=${days}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    out.textContent = res.status === 401 ? "Wrong admin token." : `Error ${res.status}`;
    return;
  }
  const data = (await res.json()) as { bySource: Record<string, Record<string, number>>; totals: Record<string, number> };
  const table = document.createElement("table");
  table.className = "compare";
  const head = table.createTHead().insertRow();
  for (const h of ["Source", "Template PDFs", "Sign-ups", "Checkouts started", "Paying now", "Packs sold"]) {
    const th = document.createElement("th");
    th.textContent = h;
    head.appendChild(th);
  }
  const body = table.createTBody();
  const rows = Object.entries(data.bySource).sort((a, b) => (b[1].paying ?? 0) - (a[1].paying ?? 0) || (b[1].signups ?? 0) - (a[1].signups ?? 0));
  for (const [source, counts] of rows) {
    const tr = body.insertRow();
    tr.insertCell().textContent = source;
    for (const c of COLUMNS) tr.insertCell().textContent = String(counts[c] ?? 0);
  }
  const totals = document.createElement("p");
  totals.textContent = `All time: ${data.totals.users ?? 0} accounts, ${data.totals.paying ?? 0} paying, ${data.totals.packs ?? 0} packs sold. Visits are in Cloudflare Web Analytics.`;
  out.replaceChildren(totals, table);
}

$("#admin-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $<HTMLInputElement>("#token").value.trim();
  if (t) sessionStorage.setItem(KEY, t);
  void load();
});
if (sessionStorage.getItem(KEY)) void load();
