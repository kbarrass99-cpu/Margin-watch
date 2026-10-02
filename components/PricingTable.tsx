'use client';

import Link from 'next/link';
import { PLANS, PLAN_ORDER, type PaidPlanId, type PlanId } from '@/lib/plans';

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
  return (
    <div className="grid sm:grid-cols-3 gap-5">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        const featured = id === 'pro';

        let action: React.ReactNode;
        if (!onChoose) {
          action = (
            <Link
              href="/signup"
              className={`block w-full text-center rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                featured
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'border border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              {id === 'free' ? 'Start free' : `Get ${plan.name}`}
            </Link>
          );
        } else if (id === 'free') {
          action = currentPlan === 'free' && (
            <div className="w-full text-center text-sm text-slate-400 py-2.5">Your current plan</div>
          );
        } else {
          action = (
            <button
              onClick={() => onChoose(id)}
              disabled={busy}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                featured
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'border border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              {busy ? 'Loading…' : `Choose ${plan.name}`}
            </button>
          );
        }

        return (
          <div
            key={id}
            className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col ${
              featured ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'
            }`}
          >
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-2">
              <span className="text-3xl font-bold">${plan.monthlyPrice}</span>
              <span className="text-sm text-slate-500">/month</span>
            </p>
            <ul className="text-sm text-slate-600 mt-4 space-y-1.5 flex-1">
              <li>
                Track up to <strong>{plan.productLimit}</strong> product
                {plan.productLimit === 1 ? '' : 's'}
              </li>
              <li>Price, stock and margin alerts by email</li>
              <li>Checked automatically every 6 hours</li>
            </ul>
            <div className="mt-6">{action}</div>
          </div>
        );
      })}
    </div>
  );
}
