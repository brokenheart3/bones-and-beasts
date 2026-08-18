// Shared shape both usePurchasesStore.ts (RevenueCat) and .web.ts (Stripe)
// populate, so SubscriptionScreen can stay platform-agnostic like the rest
// of the purchases store's public interface.
export interface SubscriptionInfo {
  // Raw store product id — set on native (RevenueCat), null on web where
  // the server already resolves a friendly plan key instead.
  productIdentifier: string | null;
  plan: "monthly" | "yearly" | "lifetime" | null;
  // Unix ms; null for Lifetime (no renewal) or while not yet known.
  currentPeriodEnd: number | null;
  willRenew: boolean | null;
  startDate: number | null;
  store: "APP_STORE" | "PLAY_STORE" | "STRIPE" | string | null;
}
