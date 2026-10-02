import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { planFor, PLANS } from '@/lib/plans';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = planFor(profile?.plan);

  return NextResponse.json({
    email: user.email,
    plan,
    limit: PLANS[plan].productLimit,
  });
}
