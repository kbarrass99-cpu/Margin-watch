import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWelcomeEmail } from '@/lib/lifecycleEmails';
import { planFor, PLANS, trialEligible } from '@/lib/plans';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_customer_id')
    .eq('id', user.id)
    .single();

  const plan = planFor(profile?.plan);

  // Sent once, after the response, the first time a confirmed user opens the dashboard.
  if (user.email && user.email_confirmed_at) {
    const { id, email } = user;
    after(() => sendWelcomeEmail(createAdminClient(), id, email));
  }

  return NextResponse.json({
    email: user.email,
    plan,
    limit: PLANS[plan].productLimit,
    trialEligible: trialEligible(profile?.stripe_customer_id),
  });
}
