import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "./stripe";
import { setEntitlement, findUidByStripeCustomerId } from "./firebaseAdmin";
import { planByPriceId } from "./plans";

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export async function billingWebhookHandler(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature as string,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
    return;
  }

  try {
    switch (event.type) {
      // Fires right after a successful Checkout — for the one-time Lifetime
      // purchase this is the only signal we get, so grant entitlement here
      // directly. For subscriptions, the customer.subscription.created
      // event below carries the authoritative status, so just record the
      // Stripe customer id now and let that event grant the entitlement.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.client_reference_id ?? session.metadata?.uid;
        const custId = customerId(session.customer);
        if (uid) {
          if (session.mode === "payment") {
            await setEntitlement(uid, { isPro: true, plan: "lifetime", stripeCustomerId: custId });
          } else if (custId) {
            await setEntitlement(uid, { stripeCustomerId: custId });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const custId = customerId(subscription.customer);
        const uid = subscription.metadata?.uid ?? (custId ? await findUidByStripeCustomerId(custId) : null);
        if (uid) {
          const isPro = subscription.status === "active" || subscription.status === "trialing";
          const priceId = subscription.items.data[0]?.price?.id;
          await setEntitlement(uid, {
            isPro,
            plan: planByPriceId(priceId)?.planKey ?? null,
            stripeCustomerId: custId,
          });
        }
        break;
      }

      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
