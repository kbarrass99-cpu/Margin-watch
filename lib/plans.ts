export type PlanId = 'free' | 'starter' | 'pro';
export type PaidPlanId = Exclude<PlanId, 'free'>;
export type BillingInterval = 'month' | 'year';

// Prices are in USD. Yearly is ten months' price: two months free.
export const PLANS: Record<
  PlanId,
  { name: string; monthlyPrice: number; yearlyPrice: number; productLimit: number }
> = {
  free: { name: 'Free', monthlyPrice: 0, yearlyPrice: 0, productLimit: 1 },
  starter: { name: 'Starter', monthlyPrice: 9, yearlyPrice: 90, productLimit: 5 },
  pro: { name: 'Pro', monthlyPrice: 19, yearlyPrice: 190, productLimit: 50 },
};

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro'];

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === 'starter' || value === 'pro';
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'month' || value === 'year';
}

export function planFor(value: string | null | undefined): PlanId {
  return value === 'starter' || value === 'pro' ? value : 'free';
}

// 9 -> "$9", 7.5 -> "$7.50", 15.8333 -> "$15.83".
export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function yearlySaving(plan: PaidPlanId): number {
  return PLANS[plan].monthlyPrice * 12 - PLANS[plan].yearlyPrice;
}
