import Stripe from 'stripe';

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });
}

export const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 50,
};
