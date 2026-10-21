// Product settings that the site, the app and the Worker all read.
// To change the price: create a new Price in Stripe, put its ID in the Worker
// secrets (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY / STRIPE_PRICE_PACK), then
// update the display amounts here and redeploy. See README "Changing prices".

export const PRODUCT = {
  name: "ShiftBill",
  tagline: "Invoices and shift logs for independent NDIS support workers",
} as const;

export const PRICES = {
  monthlyAud: 7,
  yearlyAud: 59,
  packAud: 19,
} as const;

/** What a free account can store. Paid accounts have no caps beyond fair use. */
export const FREE_LIMITS = {
  participants: 2,
  invoices: 10,
  shifts: 10,
} as const;

/** Fair-use caps that protect the free hosting tier from one runaway account. */
export const FAIR_USE = {
  participants: 200,
  invoices: 5000,
  shifts: 20000,
} as const;

/**
 * Common support items, offered as suggestions only. Item numbers and price
 * limits change (usually each July), so we never prefill a rate. Checked against
 * the 2026-27 NDIS Pricing Schedule on 21 October 2026.
 */
export const COMMON_ITEMS: { number: string; name: string }[] = [
  { number: "01_011_0107_1_1", name: "Assistance With Self-Care Activities - Standard - Weekday Daytime" },
  { number: "01_799_0107_1_1", name: "Provider travel - non-labour costs (self-care)" },
  { number: "04_104_0125_6_1", name: "Access Community Social and Rec Activities - Standard - Weekday Daytime" },
  { number: "04_590_0125_6_1", name: "Activity Based Transport" },
  { number: "04_799_0125_6_1", name: "Provider travel - non-labour costs (community access)" },
];

export const PRICE_GUIDE_NOTE =
  "Check item numbers and price limits against the current NDIS Pricing Arrangements and Price Limits (or Pricing Schedule) before you invoice. They usually change each July.";

export const DISCLAIMER =
  "ShiftBill is an independent tool. It is not affiliated with or endorsed by the NDIS, the NDIA, the NDIS Quality and Safeguards Commission or the ATO. It is not tax, legal or NDIS compliance advice.";
