import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import type Stripe from 'stripe';

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

  const supabase = createAdminClient();

  switch (event.type) {
    // Fires the moment someone completes checkout - upgrade them to Pro.
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id || session.client_reference_id;
      if (userId) {
        await supabase
          .from('profiles')
          .update({
            plan: 'pro',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
      break;
    }

    // Fires on renewals, plan changes, and cancellations taking effect.
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';

      if (userId) {
        await supabase
          .from('profiles')
          .update({
            plan: isActive ? 'pro' : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } else {
        // Fallback: match by Stripe customer ID if metadata wasn't set.
        await supabase
          .from('profiles')
          .update({
            plan: isActive ? 'pro' : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer as string);
      }
      break;
    }

    default:
      // Ignore every other event type.
      break;
  }

  return NextResponse.json({ received: true });
}
