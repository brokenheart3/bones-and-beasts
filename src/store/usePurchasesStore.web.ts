import { create } from "zustand";
import i18n from "../i18n";
import { SERVER_URL } from "../net/colyseusClient";
import { useAuthStore } from "./useAuthStore";

// The game server's own domain also hosts the Stripe billing endpoints —
// same Railway service, just a plain REST route alongside the Colyseus
// WebSocket one. Metro picks this file instead of usePurchasesStore.ts when
// bundling for web, since react-native-purchases has no web support and
// RevenueCat's web billing is a separate Stripe-based product we're not
// using — we talk to our own server's Stripe integration directly instead.
const HTTP_SERVER_URL = SERVER_URL.replace(/^ws/, "http");

export interface WebPackage {
  identifier: string;
  packageType: "MONTHLY" | "ANNUAL" | "LIFETIME";
  product: { title: string; priceString: string };
}

interface WebOffering {
  availablePackages: WebPackage[];
}

interface PurchasesState {
  isReady: boolean;
  isPro: boolean;
  offering: WebOffering | null;
  busy: boolean;
  error: string | null;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: WebPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  clearError: () => void;
}

async function fetchEntitlement(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${HTTP_SERVER_URL}/billing/entitlement/${uid}`);
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.isPro;
  } catch {
    return false;
  }
}

// Right after a Checkout redirect, the Stripe webhook that actually grants
// entitlement can lag a second or two behind the browser landing back here
// — poll briefly instead of trusting a single immediate check.
function pollEntitlement(uid: string, attemptsLeft = 6) {
  fetchEntitlement(uid).then((isPro) => {
    usePurchasesStore.setState({ isPro });
    if (!isPro && attemptsLeft > 1) {
      setTimeout(() => pollEntitlement(uid, attemptsLeft - 1), 1500);
    }
  });
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  isReady: true,
  isPro: false,
  offering: null,
  busy: false,
  error: null,

  fetchOfferings: async () => {
    set({ busy: true, error: null });
    try {
      const res = await fetch(`${HTTP_SERVER_URL}/billing/plans`);
      const data = await res.json();
      set({ offering: { availablePackages: data.plans ?? [] } });
    } catch {
      set({ error: i18n.t("purchaseErrors.loadOfferingsFailed") });
    } finally {
      set({ busy: false });
    }
  },

  purchasePackage: async (pkg) => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      set({ error: i18n.t("purchaseErrors.notSignedIn") });
      throw new Error(i18n.t("purchaseErrors.notSignedIn"));
    }
    set({ busy: true, error: null });
    try {
      const res = await fetch(`${HTTP_SERVER_URL}/billing/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, priceId: pkg.identifier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? i18n.t("purchaseErrors.checkoutFailed"));
      // Full-page redirect to Stripe's hosted Checkout — simplest
      // integration, no Stripe.js needed on this side.
      window.location.href = data.url;
    } catch (err) {
      set({ error: (err as Error).message ?? i18n.t("purchaseErrors.purchaseFailed") });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  restorePurchases: async () => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) {
      set({ error: i18n.t("purchaseErrors.notSignedIn") });
      throw new Error(i18n.t("purchaseErrors.notSignedIn"));
    }
    set({ busy: true, error: null });
    try {
      set({ isPro: await fetchEntitlement(uid) });
    } catch {
      set({ error: i18n.t("purchaseErrors.restoreFailed") });
      throw new Error(i18n.t("purchaseErrors.restoreFailed"));
    } finally {
      set({ busy: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// The first entitlement check after a Checkout redirect should poll (the
// webhook can lag) — every other trigger (sign-in, sign-out, initial load)
// just checks once. This flag is consumed by whichever fires first below.
let pendingCheckoutCheck = window.location.search.includes("checkout=success");
if (pendingCheckoutCheck) {
  window.history.replaceState({}, "", window.location.pathname);
}

function syncEntitlementForUid(uid: string) {
  if (pendingCheckoutCheck) {
    pendingCheckoutCheck = false;
    pollEntitlement(uid);
  } else {
    fetchEntitlement(uid).then((isPro) => usePurchasesStore.setState({ isPro }));
  }
}

// Keep isPro in sync with whichever account is signed in — including the
// initial async resolution of Firebase's session on page load.
useAuthStore.subscribe((state, prevState) => {
  if (state.user?.uid === prevState.user?.uid) return;
  if (state.user?.uid) {
    syncEntitlementForUid(state.user.uid);
  } else {
    usePurchasesStore.setState({ isPro: false });
  }
});

const initialUid = useAuthStore.getState().user?.uid;
if (initialUid) {
  syncEntitlementForUid(initialUid);
}
