import { Router } from "express";
import { stripe } from "./stripe";
import { getEntitlement } from "./firebaseAdmin";
import { PLANS, planByPriceId } from "./plans";

export const billingRouter = Router();

// The web PaywallScreen renders whatever this returns as if it were a
// RevenueCat PurchasesOffering — same field names (identifier, packageType,
// product.priceString) — so the shared UI code doesn't need to know which
// platform it's running on.
billingRouter.get("/plans", (_req, res) => {
  res.json({ plans: PLANS.filter((p) => p.identifier) });
});

billingRouter.get("/entitlement/:uid", async (req, res) => {
  const entitlement = await getEntitlement(req.params.uid);
  res.json({
    isPro: entitlement.isPro,
    plan: entitlement.plan,
    currentPeriodEnd: entitlement.currentPeriodEnd,
    willRenew: entitlement.willRenew,
    startDate: entitlement.startDate,
  });
});

// Stripe's hosted Customer Portal is the web equivalent of Apple/Google's
// native subscription-management screens — cancellation itself has to
// happen there, not in our own UI, same as the mobile deep-links do.
billingRouter.post("/portal-session", async (req, res) => {
  const { uid } = req.body as { uid?: string };
  if (!uid) {
    res.status(400).json({ error: "uid is required." });
    return;
  }
  const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:19006";
  try {
    const entitlement = await getEntitlement(uid);
    if (!entitlement.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer on file for this account." });
      return;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: entitlement.stripeCustomerId,
      return_url: webAppUrl,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Couldn't open the billing portal." });
  }
});

billingRouter.post("/create-checkout-session", async (req, res) => {
  const { uid, priceId } = req.body as { uid?: string; priceId?: string };
  if (!uid || !priceId) {
    res.status(400).json({ error: "uid and priceId are required." });
    return;
  }
  const plan = planByPriceId(priceId);
  if (!plan) {
    res.status(400).json({ error: "Unknown priceId." });
    return;
  }

  const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:19006";

  try {
    const existing = await getEntitlement(uid);
    const session = await stripe.checkout.sessions.create({
      mode: plan.mode,
      customer: existing.stripeCustomerId ?? undefined,
      client_reference_id: uid,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${webAppUrl}/?checkout=success`,
      cancel_url: `${webAppUrl}/?checkout=cancel`,
      metadata: { uid },
      ...(plan.mode === "subscription" ? { subscription_data: { metadata: { uid } } } : {}),
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Couldn't start checkout." });
  }
});
