// Mirrors the three RevenueCat/App Store/Play Console products already set
// up for mobile — same prices, same three tiers — just sold through Stripe
// Checkout instead since neither store's IAP exists on the web.
export interface Plan {
  identifier: string;
  packageType: "MONTHLY" | "ANNUAL" | "LIFETIME";
  mode: "subscription" | "payment";
  planKey: "monthly" | "yearly" | "lifetime";
  product: { title: string; priceString: string };
}

export const PLANS: Plan[] = [
  {
    identifier: process.env.STRIPE_PRICE_MONTHLY ?? "",
    packageType: "MONTHLY",
    mode: "subscription",
    planKey: "monthly",
    product: { title: "Monthly", priceString: "$4.99/mo" },
  },
  {
    identifier: process.env.STRIPE_PRICE_YEARLY ?? "",
    packageType: "ANNUAL",
    mode: "subscription",
    planKey: "yearly",
    product: { title: "Yearly", priceString: "$45.99/yr" },
  },
  {
    identifier: process.env.STRIPE_PRICE_LIFETIME ?? "",
    packageType: "LIFETIME",
    mode: "payment",
    planKey: "lifetime",
    product: { title: "Lifetime", priceString: "$99.99" },
  },
];

export function planByPriceId(priceId: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.identifier === priceId);
}
