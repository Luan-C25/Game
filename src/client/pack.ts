// Template pack: buy button on /templates/ and the download on /templates/thanks/.
import { captureAttribution, getAttribution, track } from "./track.ts";

captureAttribution();

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-shiftbill": "1" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "Something went wrong. Please try again.");
  return data;
}

const buy = document.getElementById("buy-pack") as HTMLButtonElement | null;
const status = document.getElementById("pack-status");
if (buy && status) {
  track("pack_view");
  buy.addEventListener("click", async () => {
    buy.disabled = true;
    status.textContent = "Opening secure checkout...";
    try {
      const { url } = await post<{ url: string }>("/api/pack/checkout", { attribution: getAttribution() });
      location.href = url;
    } catch (err) {
      status.textContent = (err as Error).message;
      buy.disabled = false;
    }
  });
}

const claim = document.getElementById("pack-claim");
if (claim) {
  const sessionId = new URLSearchParams(location.search).get("session_id") ?? "";
  (async () => {
    try {
      const { url, expiresAt } = await post<{ url: string; expiresAt: string }>("/api/pack/claim", { sessionId });
      const link = document.createElement("a");
      link.href = url;
      link.className = "btn";
      link.textContent = "Download the template pack (.zip)";
      const note = document.createElement("p");
      note.className = "small";
      note.textContent = `This link works until ${new Date(expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}. Bookmark this page to download again.`;
      claim.replaceChildren(link, note);
    } catch (err) {
      claim.textContent = (err as Error).message;
      claim.className = "error-box";
    }
  })();
}
