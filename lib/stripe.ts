import Stripe from 'stripe';
import type { BillingInterval, PaidPlanId } from './plans';

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });
}

// Prices are found by Stripe lookup key rather than hard-coded IDs, so test
// and live mode only need prices with the same keys (and changing a price
// means moving the key to a new price in Stripe, no redeploy).
const LOOKUP_KEYS: Record<PaidPlanId, Record<BillingInterval, string>> = {
  starter: { month: 'starter_monthly_usd', year: 'starter_yearly_usd' },
  pro: { month: 'pro_monthly_usd', year: 'pro_yearly_usd' },
};

export async function priceIdForPlan(
  stripe: Stripe,
  plan: PaidPlanId,
  interval: BillingInterval
): Promise<string | undefined> {
  const { data } = await stripe.prices.list({ lookup_keys: [LOOKUP_KEYS[plan][interval]], active: true, limit: 1 });
  return data[0]?.id;
}

// Recognises a plan by lookup key, then metadata.plan, then the legacy
// STRIPE_PRICE_ID_* env vars (kept so nothing breaks if a key is missing).
export function planForPrice(price: Stripe.Price | undefined): PaidPlanId | null {
  if (!price) return null;
  for (const plan of ['starter', 'pro'] as const) {
    if (price.lookup_key && Object.values(LOOKUP_KEYS[plan]).includes(price.lookup_key)) return plan;
  }
  if (price.metadata?.plan === 'starter' || price.metadata?.plan === 'pro') return price.metadata.plan;
  if (price.id === process.env.STRIPE_PRICE_ID_STARTER) return 'starter';
  if (price.id === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  return null;
}
