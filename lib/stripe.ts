import Stripe from 'stripe';
import type { PaidPlanId } from './plans';

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });
}

export function priceIdForPlan(plan: PaidPlanId): string | undefined {
  return plan === 'starter' ? process.env.STRIPE_PRICE_ID_STARTER : process.env.STRIPE_PRICE_ID_PRO;
}

export function planForPriceId(priceId: string | undefined): PaidPlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  return null;
}
