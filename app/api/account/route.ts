import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

// Permanently deletes the signed-in user's account (UK GDPR right to
// erasure). Cancels any Stripe subscription first so they're never billed
// again, then deletes the auth user - profiles, tracked products, snapshots
// and alerts all cascade from auth.users. Stripe keeps its own invoice
// records, which we're required to retain for HMRC.
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single();

  if (profile?.stripe_customer_id || profile?.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      // Every live subscription on the customer, not just the one we have
      // stored: a second checkout or a not-yet-synced webhook can leave others.
      const ids = new Set<string>();
      if (profile.stripe_customer_id) {
        for await (const sub of stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'all', limit: 100 })) {
          if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') ids.add(sub.id);
        }
      }
      if (profile.stripe_subscription_id) {
        const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') ids.add(sub.id);
      }
      for (const id of ids) await stripe.subscriptions.cancel(id);
    } catch (err) {
      // Don't delete the account if we couldn't stop billing - they'd keep
      // being charged with no way to log in and cancel.
      Sentry.captureException(err, { tags: { route: 'account-delete' } });
      return NextResponse.json(
        { error: `We couldn't cancel your subscription, so your account wasn't deleted. Please try again or email us.` },
        { status: 502 }
      );
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    Sentry.captureException(error, { tags: { route: 'account-delete' } });
    return NextResponse.json({ error: 'Your account could not be deleted. Please try again.' }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
