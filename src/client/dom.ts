import type { Issue } from "../shared/invoice.ts";

export function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

/** Today's date in the browser's own time zone, as YYYY-MM-DD. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function downloadBytes(bytes: Uint8Array | string, filename: string, type: string): void {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Show validation results next to fields (by id "m-<field>") and in a summary box.
 * Errors block; warnings are advice. Focus moves to the summary so screen readers hear it.
 */
export function showIssues(form: HTMLElement, errors: Issue[], warnings: Issue[], extraTarget?: (i: Issue) => HTMLElement | null): void {
  form.querySelectorAll<HTMLElement>(".field-msg").forEach((m) => {
    if (m.id !== "m-provider.abn" && m.id !== "m-participant.planType") {
      m.textContent = "";
      m.className = "field-msg";
    }
  });
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  const place = (issue: Issue, kind: "error" | "warning") => {
    const target = document.getElementById(`m-${issue.field}`) ?? extraTarget?.(issue) ?? null;
    if (target) {
      target.className = `field-msg ${kind}`;
      target.textContent = target.textContent ? `${target.textContent} ${issue.message}` : issue.message;
    }
    if (kind === "error") document.getElementById(`f-${issue.field}`)?.setAttribute("aria-invalid", "true");
  };
  warnings.forEach((w) => place(w, "warning"));
  errors.forEach((e) => place(e, "error"));
  const box = form.querySelector<HTMLElement>("#form-errors");
  if (!box) return;
  if (errors.length === 0) {
    box.classList.add("hidden");
    return;
  }
  box.innerHTML = "";
  const h = document.createElement("strong");
  h.textContent = errors.length === 1 ? "Fix this before downloading:" : `Fix these ${errors.length} things before downloading:`;
  const ul = document.createElement("ul");
  for (const e of errors) {
    const li = document.createElement("li");
    li.textContent = e.message;
    ul.appendChild(li);
  }
  box.append(h, ul);
  box.classList.remove("hidden");
  box.focus();
}
