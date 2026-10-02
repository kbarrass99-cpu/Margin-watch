export type PlanId = 'free' | 'starter' | 'pro';
export type PaidPlanId = Exclude<PlanId, 'free'>;

export const PLANS: Record<PlanId, { name: string; monthlyPrice: number; productLimit: number }> = {
  free: { name: 'Free', monthlyPrice: 0, productLimit: 1 },
  starter: { name: 'Starter', monthlyPrice: 9, productLimit: 5 },
  pro: { name: 'Pro', monthlyPrice: 19, productLimit: 50 },
};

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro'];

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === 'starter' || value === 'pro';
}

export function planFor(value: string | null | undefined): PlanId {
  return value === 'starter' || value === 'pro' ? value : 'free';
}
