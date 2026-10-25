import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { getStripe, priceIdForPlan } from '@/lib/stripe';
import { isBillingInterval, isPaidPlan, PLANS, TRIAL_DAYS, trialEligible } from '@/lib/plans';
import { SITE } from '@/lib/site';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!isPaidPlan(body.plan)) {
    return NextResponse.json({ error: 'Please choose a plan.' }, { status: 400 });
  }
  // Yearly is the default the pricing table shows, so a missing interval means yearly.
  const interval = isBillingInterval(body.interval) ? body.interval : 'year';

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Reuse an existing Stripe customer if we already made one for this user,
  // otherwise Stripe creates a fresh one during checkout.
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_customer_id')
    .eq('id', user.id)
    .single();

  // Switching between paid plans goes through the billing portal, which
  // updates the existing subscription instead of starting a second one.
  if (isPaidPlan(profile?.plan)) {
    return NextResponse.json(
      {
        error: `You're already on ${PLANS[profile.plan].name}. Use "Manage billing" to switch plans or cancel.`,
      },
      { status: 409 }
    );
  }

  const withTrial = trialEligible(profile?.stripe_customer_id);
  const trialEnds = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  try {
    const priceId = await priceIdForPlan(stripe, body.plan, interval);
    if (!priceId) {
      Sentry.captureMessage(`No active Stripe price for ${body.plan}/${interval}`, 'error');
      return NextResponse.json(
        { error: "We couldn't open checkout right now. Please try again in a minute." },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=1&plan=${body.plan}&interval=${interval}${withTrial ? '&trial=1' : ''}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard`,
      // This is how the webhook knows which Supabase user just paid.
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        ...(withTrial ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      // Launch offers and partner codes (created in the Stripe dashboard).
      allow_promotion_codes: true,
      // Shown above the pay button, so the customer sees what they agree to
      // at the moment they pay.
      custom_text: {
        submit: {
          message: withTrial
            ? `Your ${TRIAL_DAYS}-day free trial starts today and you won't be charged until ${trialEnds}. Cancel before then from Billing in your dashboard and you won't pay anything. After the trial your plan renews automatically until you cancel. You're subscribing for your business and agree to the ${SITE.name} Terms (${SITE.url}/terms).`
            : `You're subscribing for your business and agree to the ${SITE.name} Terms (${SITE.url}/terms). Your plan renews automatically until you cancel, which you can do at any time from Billing in your dashboard.`,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    Sentry.captureException(err, { extra: { userId: user.id } });
    return NextResponse.json(
      { error: "We couldn't open checkout right now. Please try again in a minute." },
      { status: 502 }
    );
  }
}
