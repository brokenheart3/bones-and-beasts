import { create } from "zustand";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import i18n from "../i18n";

// Native (iOS/Android) implementation — Metro picks usePurchasesStore.web.ts
// instead on web, since react-native-purchases has no web support at all.
const IOS_API_KEY = "appl_jBqZdpXMZcyvgzaMzCBBayfMRqN";
const ANDROID_API_KEY = "goog_EKAuFExuBwBCGWyALvAMuCAzFJC";

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
  offering: PurchasesOffering | null;
  busy: boolean;
  error: string | null;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  clearError: () => void;
}

function toIsPro(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] != null;
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  isReady: false,
  isPro: false,
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
      set({ isPro: toIsPro(customerInfo) });
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
      set({ isPro: toIsPro(customerInfo) });
    } catch (err) {
      set({ error: (err as Error).message ?? i18n.t("purchaseErrors.restoreFailed") });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  clearError: () => set({ error: null }),
}));

Purchases.getCustomerInfo()
  .then((info) => usePurchasesStore.setState({ isPro: toIsPro(info), isReady: true }))
  .catch(() => usePurchasesStore.setState({ isReady: true }));

Purchases.addCustomerInfoUpdateListener((info) => {
  usePurchasesStore.setState({ isPro: toIsPro(info) });
});
