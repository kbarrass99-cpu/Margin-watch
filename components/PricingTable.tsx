'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from '@phosphor-icons/react';
import {
  PLANS,
  formatGBP,
  yearlySaving,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from '@/lib/plans';

const SHARED_FEATURES = ['Price, stock and margin alerts by email', 'Checked automatically every 6 hours'];

const FIT: Record<PlanId, string> = {
  free: 'Try it on your best seller.',
  starter: 'A small catalogue of proven products.',
  pro: 'A whole store, every supplier watched.',
};

// Each paid card has its own Yearly / Monthly switch. Yearly is shown first.
function IntervalSwitch({
  plan,
  value,
  onChange,
  dark,
}: {
  plan: PaidPlanId;
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  dark: boolean;
}) {
  const track = dark ? 'bg-white/10' : 'bg-zinc-100';
  const on = dark ? 'bg-white text-zinc-900' : 'bg-white text-zinc-900 shadow-sm';
  const off = dark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900';
  return (
    <div role="group" aria-label={`${PLANS[plan].name} billing period`} className={`inline-flex rounded-lg p-0.5 text-xs font-medium ${track}`}>
      {(['year', 'month'] as const).map((interval) => (
        <button
          key={interval}
          type="button"
          aria-pressed={value === interval}
          onClick={() => onChange(interval)}
          className={`rounded-md px-2.5 py-1 transition-colors duration-200 ${value === interval ? on : off}`}
        >
          {interval === 'year' ? 'Yearly' : 'Monthly'}
        </button>
      ))}
    </div>
  );
}

function priceLines(plan: PaidPlanId, interval: BillingInterval) {
  const p = PLANS[plan];
  if (interval === 'year') {
    return {
      amount: formatGBP(p.yearlyPrice / 12),
      detail: `${formatGBP(p.yearlyPrice)} billed yearly. Save ${formatGBP(yearlySaving(plan))}.`,
    };
  }
  return { amount: formatGBP(p.monthlyPrice), detail: 'Billed monthly. Cancel any time.' };
}

// With onChoose (dashboard) paid plans start checkout; without it (landing
// page) every plan links to signup.
export default function PricingTable({
  currentPlan,
  onChoose,
  busy = false,
}: {
  currentPlan?: PlanId;
  onChoose?: (plan: PaidPlanId, interval: BillingInterval) => void;
  busy?: boolean;
}) {
  const [intervals, setIntervals] = useState<Record<PaidPlanId, BillingInterval>>({ starter: 'year', pro: 'year' });
  const setInterval = (plan: PaidPlanId) => (interval: BillingInterval) =>
    setIntervals((prev) => ({ ...prev, [plan]: interval }));

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
      return <span className="block text-center text-sm text-zinc-400 py-2.5">Your current plan</span>;
    }
    const interval = intervals[id];
    return (
      <button type="button" onClick={() => onChoose(id, interval)} disabled={busy} className={`${base} ${style}`}>
        {busy ? 'Opening checkout…' : `Choose ${PLANS[id].name} ${interval === 'year' ? 'yearly' : 'monthly'}`}
      </button>
    );
  }

  const pro = PLANS.pro;
  const proPrice = priceLines('pro', intervals.pro);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-4">
      <div className="rounded-[2rem] bg-zinc-900 text-white p-8 md:p-10 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight">{pro.name}</h3>
          <IntervalSwitch plan="pro" value={intervals.pro} onChange={setInterval('pro')} dark />
        </div>
        <p className="mt-6 flex items-baseline gap-1">
          <span className="text-5xl font-semibold tracking-tighter tabular-nums">{proPrice.amount}</span>
          <span className="text-sm text-zinc-400">/month</span>
        </p>
        <p className="mt-2 text-sm text-zinc-300">
          {proPrice.detail}
          {intervals.pro === 'year' && (
            <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
              2 months free
            </span>
          )}
        </p>
        <p className="mt-4 text-zinc-400 text-sm">{FIT.pro}</p>
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
          const price = id === 'starter' ? priceLines('starter', intervals.starter) : null;
          return (
            <div key={id} className="rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold tracking-tight">{plan.name}</h3>
                {id === 'starter' && (
                  <IntervalSwitch plan="starter" value={intervals.starter} onChange={setInterval('starter')} dark={false} />
                )}
              </div>
              <div>
                <p className="flex items-baseline gap-1">
                  <span className="font-mono text-2xl tracking-tight">{price ? price.amount : formatGBP(0)}</span>
                  <span className="text-xs text-zinc-500">/month</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {price ? price.detail : 'Free forever. No card needed.'}
                  {id === 'starter' && intervals.starter === 'year' && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">2 months free</span>
                  )}
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
