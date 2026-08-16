import Stripe from "stripe";

// Test-mode secret key while Stripe web billing is being validated — swap
// for a live key (and re-point the Railway env var) once ready to charge
// real cards.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
