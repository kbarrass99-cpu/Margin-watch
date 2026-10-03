'use client';

import Link from 'next/link';
import { Check } from '@phosphor-icons/react';
import { PLANS, type PaidPlanId, type PlanId } from '@/lib/plans';

const SHARED_FEATURES = ['Price, stock and margin alerts by email', 'Checked automatically every 6 hours'];

const FIT: Record<PlanId, string> = {
  free: 'Try it on your best seller.',
  starter: 'A small catalogue of proven products.',
  pro: 'A whole store, every supplier watched.',
};

// With onChoose (dashboard) paid plans start checkout; without it (landing
// page) every plan links to signup.
export default function PricingTable({
  currentPlan,
  onChoose,
  busy = false,
}: {
  currentPlan?: PlanId;
  onChoose?: (plan: PaidPlanId) => void;
  busy?: boolean;
}) {
  function action(id: PlanId, featured: boolean) {
    const base =
      'inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50';
    const style = featured
      ? 'bg-white text-zinc-900 hover:bg-zinc-100'
      : 'border border-zinc-300 text-zinc-800 hover:border-zinc-400 bg-white';

    if (!onChoose) {
      return (
        <Link href="/signup" className={`${base} ${style}`}>
          {id === 'free' ? 'Start free' : `Get ${PLANS[id].name}`}
        </Link>
      );
    }
    if (id === 'free') {
      return currentPlan === 'free' ? (
        <span className="block text-center text-sm text-zinc-400 py-2.5">Your current plan</span>
      ) : null;
    }
    if (currentPlan === id) {
      return (
        <span className="block text-center text-sm text-zinc-400 py-2.5">
          Your current plan
        </span>
      );
    }
    return (
      <button type="button" onClick={() => onChoose(id)} disabled={busy} className={`${base} ${style}`}>
        {busy ? 'Opening checkout…' : `Choose ${PLANS[id].name}`}
      </button>
    );
  }

  const pro = PLANS.pro;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-4">
      <div className="rounded-[2rem] bg-zinc-900 text-white p-8 md:p-10 flex flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-lg font-semibold tracking-tight">{pro.name}</h3>
          <span className="text-xs font-medium text-zinc-400">Best value per product</span>
        </div>
        <p className="mt-6 flex items-baseline gap-1">
          <span className="text-5xl font-semibold tracking-tighter tabular-nums">${pro.monthlyPrice}</span>
          <span className="text-sm text-zinc-400">/month</span>
        </p>
        <p className="mt-2 text-zinc-400 text-sm">{FIT.pro}</p>
        <ul className="mt-8 space-y-2.5 text-sm text-zinc-200 flex-1">
          <li className="flex gap-2.5">
            <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-emerald-400" />
            Track up to <span className="font-mono">{pro.productLimit}</span> products
          </li>
          {SHARED_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5">
              <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-emerald-400" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-8 md:max-w-xs">{action('pro', true)}</div>
      </div>

      <div className="grid grid-rows-2 gap-4">
        {(['starter', 'free'] as const).map((id) => {
          const plan = PLANS[id];
          return (
            <div key={id} className="rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-semibold tracking-tight">{plan.name}</h3>
                <p className="flex items-baseline gap-1">
                  <span className="font-mono text-2xl tracking-tight">${plan.monthlyPrice}</span>
                  <span className="text-xs text-zinc-500">/month</span>
                </p>
              </div>
              <p className="text-sm text-zinc-600">
                {FIT[id]} Up to <span className="font-mono">{plan.productLimit}</span> product
                {plan.productLimit === 1 ? '' : 's'}, same alerts as Pro.
              </p>
              <div className="mt-auto">{action(id, false)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
