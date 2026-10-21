import { h } from "./h.ts";

// Filled in by step 4 (Stripe Checkout and Customer Portal).
export async function billingView(shell: (active: string, ...content: (Node | null)[]) => void, _params: URLSearchParams): Promise<void> {
  shell("#/settings", h("h1", {}, "Billing"), h("p", {}, "Coming soon."));
}
