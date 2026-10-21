import { h } from "./h.ts";

// Filled in by step 6 (tax set-aside tracker and CSV export).
export async function moneyView(shell: (active: string, ...content: (Node | null)[]) => void): Promise<void> {
  shell("#/money", h("h1", {}, "Money"), h("p", {}, "Coming soon."));
}
