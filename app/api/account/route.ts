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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single();

  if (profile?.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
        await stripe.subscriptions.cancel(sub.id);
      }
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
