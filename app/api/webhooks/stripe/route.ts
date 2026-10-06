import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';
import { getStripe, planForPrice } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanId } from '@/lib/plans';

// past_due keeps the paid plan so Stripe's automatic retries have time to
// recover a failed renewal before the customer loses access.
const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due'];

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const subscriptionId = subscriptionIdFor(event);
    if (subscriptionId) await syncSubscription(stripe, subscriptionId);
  } catch (err) {
    // A non-2xx response makes Stripe retry the event, so a transient
    // database error can't silently leave a paying customer on Free.
    Sentry.captureException(err, { extra: { eventId: event.id, eventType: event.type } });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

function subscriptionIdFor(event: Stripe.Event): string | null {
  switch (event.type) {
    case 'checkout.session.completed':
      return idOf((event.data.object as Stripe.Checkout.Session).subscription);
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return (event.data.object as Stripe.Subscription).id;
    case 'invoice.paid':
    case 'invoice.payment_failed':
      return idOf((event.data.object as Stripe.Invoice).subscription);
    default:
      return null;
  }
}

// Events can arrive late, retried, or out of order, so rather than trusting
// the event payload this re-reads the subscription's current state from
// Stripe and writes that.
async function syncSubscription(stripe: Stripe, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = idOf(subscription.customer)!;
  const userId = subscription.metadata?.supabase_user_id;
  const isActive = ACTIVE_STATUSES.includes(subscription.status);

  let plan: PlanId = 'free';
  if (isActive) {
    const price = subscription.items.data[0]?.price;
    const paidPlan = planForPrice(price);
    if (!paidPlan) {
      // Don't under-serve a paying customer over a config mismatch - give
      // them the top tier and flag it so the price's lookup key gets fixed.
      Sentry.captureMessage(`Unrecognised Stripe price ${price?.id} on ${subscription.id}`, 'warning');
    }
    plan = paidPlan ?? 'pro';
  }

  const supabase = createAdminClient();
  let query = supabase
    .from('profiles')
    .update({
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    });

  query = userId ? query.eq('id', userId) : query.eq('stripe_customer_id', customerId);

  // Only downgrade if this is the subscription the profile currently points
  // at - otherwise a late event for an old, cancelled subscription could
  // wipe out a newer active one.
  if (!isActive) query = query.eq('stripe_subscription_id', subscription.id);

  const { error } = await query;
  if (error) throw error;
}
