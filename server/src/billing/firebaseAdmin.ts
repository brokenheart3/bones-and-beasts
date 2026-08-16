import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Reuses the same Firebase project already used for Auth, so entitlement
// records live next to the accounts they belong to instead of standing up a
// separate database just for one boolean.
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Railway env vars can't hold literal newlines, so the private key is
      // stored with escaped "\n" sequences and unescaped here.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

export type Plan = "monthly" | "yearly" | "lifetime" | null;

export interface Entitlement {
  isPro: boolean;
  plan: Plan;
  stripeCustomerId: string | null;
  updatedAt: number;
}

export async function getEntitlement(uid: string): Promise<Entitlement> {
  const snap = await db.collection("entitlements").doc(uid).get();
  const data = snap.data();
  return {
    isPro: data?.isPro ?? false,
    plan: data?.plan ?? null,
    stripeCustomerId: data?.stripeCustomerId ?? null,
    updatedAt: data?.updatedAt ?? 0,
  };
}

export async function setEntitlement(
  uid: string,
  patch: Partial<Omit<Entitlement, "updatedAt">>
): Promise<void> {
  await db
    .collection("entitlements")
    .doc(uid)
    .set({ ...patch, updatedAt: Date.now() }, { merge: true });
}

export async function findUidByStripeCustomerId(customerId: string): Promise<string | null> {
  const snap = await db
    .collection("entitlements")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}
