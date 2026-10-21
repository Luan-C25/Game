// Tiny element builder. Strings always become text nodes, never HTML, so user
// data cannot inject markup.

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = String(v);
    else if (k === "value" && "value" in el) (el as HTMLInputElement).value = String(v);
    else if (k === "checked" && "checked" in el) (el as HTMLInputElement).checked = Boolean(v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
}

let fieldSeq = 0;

/** Label + control + hint + message, wired for screen readers. */
export function field(label: string, control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, hint?: string): HTMLDivElement {
  const id = control.id || `fld-${++fieldSeq}`;
  control.id = id;
  const msg = h("span", { class: "field-msg", id: `${id}-msg`, "aria-live": "polite" });
  const describedBy = [hint ? `${id}-hint` : "", `${id}-msg`].filter(Boolean).join(" ");
  control.setAttribute("aria-describedby", describedBy);
  return h("div", { class: "field" }, h("label", { for: id }, label), control, hint ? h("span", { class: "hint", id: `${id}-hint` }, hint) : null, msg);
}

export function setFieldError(control: HTMLElement, message: string): void {
  const msg = document.getElementById(`${control.id}-msg`);
  if (msg) {
    msg.textContent = message;
    msg.className = message ? "field-msg error" : "field-msg";
  }
  if (message) control.setAttribute("aria-invalid", "true");
  else control.removeAttribute("aria-invalid");
}

export function toast(message: string, kind: "ok" | "error" = "ok"): void {
  document.querySelector(".toast")?.remove();
  const t = h("div", { class: `toast ${kind === "ok" ? "ok-box" : "error-box"}`, role: "status" }, message);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
