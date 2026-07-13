import "server-only";
import Stripe from "stripe";

export function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
