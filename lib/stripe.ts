import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * The site is designed to work without Stripe: with no key configured, rooms
 * still show their real availability and guests send an enquiry instead of
 * paying online. So this returns null rather than throwing.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, { typescript: true });
  }
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
