import { create } from "zustand";
import { Linking, Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import i18n from "../i18n";
import { SubscriptionInfo } from "../types/subscription";

// Native (iOS/Android) implementation — Metro picks usePurchasesStore.web.ts
// instead on web, since react-native-purchases has no web support at all.
const IOS_API_KEY = "appl_jBqZdpXMZcyvgzaMzCBBayfMRqN";
const ANDROID_API_KEY = "goog_EKAuFExuBwBCGWyALvAMuCAzFJC";
const ANDROID_PACKAGE_NAME = "com.ckayssar1.bonesandbeasts";

// Matches the "Identifier" of the entitlement created in the RevenueCat
// dashboard — this is what a purchase of any of the three products
// (monthly/yearly/lifetime) grants, regardless of which one was bought.
const ENTITLEMENT_ID = "Bones & Beasts Pro";

Purchases.configure({
  apiKey: Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY,
});

interface PurchasesState {
  isReady: boolean;
  isPro: boolean;
  subscriptionInfo: SubscriptionInfo | null;
  offering: PurchasesOffering | null;
  busy: boolean;
  error: string | null;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  manageSubscription: () => Promise<void>;
  clearError: () => void;
}

function toIsPro(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] != null;
}

function toSubscriptionInfo(info: CustomerInfo): SubscriptionInfo | null {
  const e = info.entitlements.active[ENTITLEMENT_ID];
  if (!e) return null;
  return {
    productIdentifier: e.productIdentifier,
    // Resolved lazily in the UI by cross-referencing `offering` against
    // productIdentifier — RevenueCat's packageType abstraction (which maps
    // cleanly to "monthly"/"yearly"/"lifetime") only lives on the offering's
    // packages, not on entitlement info itself.
    plan: null,
    currentPeriodEnd: e.expirationDateMillis,
    willRenew: e.willRenew,
    startDate: e.originalPurchaseDateMillis,
    store: e.store,
  };
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  isReady: false,
  isPro: false,
  subscriptionInfo: null,
  offering: null,
  busy: false,
  error: null,

  fetchOfferings: async () => {
    set({ busy: true, error: null });
    try {
      const offerings = await Purchases.getOfferings();
      set({ offering: offerings.current });
    } catch (err) {
      set({ error: (err as Error).message ?? i18n.t("purchaseErrors.loadOfferingsFailed") });
    } finally {
      set({ busy: false });
    }
  },

  purchasePackage: async (pkg) => {
    set({ busy: true, error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      set({ isPro: toIsPro(customerInfo), subscriptionInfo: toSubscriptionInfo(customerInfo) });
    } catch (err) {
      const userCancelled = (err as { userCancelled?: boolean })?.userCancelled;
      if (!userCancelled) {
        set({ error: (err as Error).message ?? i18n.t("purchaseErrors.purchaseFailed") });
      }
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  restorePurchases: async () => {
    set({ busy: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      set({ isPro: toIsPro(customerInfo), subscriptionInfo: toSubscriptionInfo(customerInfo) });
    } catch (err) {
      set({ error: (err as Error).message ?? i18n.t("purchaseErrors.restoreFailed") });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  // Cancellation itself can only happen on Apple's/Google's own subscription
  // pages — this just opens the right one. Matches the web store's Stripe
  // Customer Portal redirect in spirit (same action name, same purpose).
  manageSubscription: async () => {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE_NAME}`;
    await Linking.openURL(url);
  },

  clearError: () => set({ error: null }),
}));

Purchases.getCustomerInfo()
  .then((info) =>
    usePurchasesStore.setState({
      isPro: toIsPro(info),
      subscriptionInfo: toSubscriptionInfo(info),
      isReady: true,
    })
  )
  .catch(() => usePurchasesStore.setState({ isReady: true }));

Purchases.addCustomerInfoUpdateListener((info) => {
  usePurchasesStore.setState({ isPro: toIsPro(info), subscriptionInfo: toSubscriptionInfo(info) });
});
