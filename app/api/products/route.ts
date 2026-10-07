import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkOneProduct } from '@/lib/checkProduct';
import { planFor, PLANS } from '@/lib/plans';
import { assertPublicHttpUrl, normalizeHttpUrl } from '@/lib/urlSafety';

function limitMessage(plan: ReturnType<typeof planFor>) {
  const limit = PLANS[plan].productLimit;
  return `The ${PLANS[plan].name} plan is limited to ${limit} tracked product${limit === 1 ? '' : 's'}.${
    plan === 'pro' ? '' : ' Upgrade to track more.'
  }`;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: products, error } = await supabase
    .from('tracked_products')
    .select('*, snapshots(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Loading products failed', error);
    return NextResponse.json({ error: 'Your products could not be loaded. Refresh the page to try again.' }, { status: 500 });
  }

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Alerts go to the account email, so it must be one the user has proved they own.
  if (!user.email || !user.email_confirmed_at) {
    return NextResponse.json(
      { error: 'Confirm your email address first (check your inbox for the link), then add products.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const rawUrl: string = typeof body.source_url === 'string' ? body.source_url.trim() : '';
  const sellPrice =
    body.sell_price === '' || body.sell_price == null ? null : Number(body.sell_price);

  if (!rawUrl || !rawUrl.startsWith('http') || rawUrl.length > 2048) {
    return NextResponse.json({ error: 'Please provide a valid product URL' }, { status: 400 });
  }

  if (sellPrice !== null && (!Number.isFinite(sellPrice) || sellPrice < 0)) {
    return NextResponse.json({ error: 'Sell price must be a positive number' }, { status: 400 });
  }

  const extraCost =
    body.extra_cost === '' || body.extra_cost == null ? null : Number(body.extra_cost);
  if (extraCost !== null && (!Number.isFinite(extraCost) || extraCost < 0)) {
    return NextResponse.json({ error: 'Shipping and fees must be zero or more' }, { status: 400 });
  }

  const marginAlert =
    body.margin_alert_percent === '' || body.margin_alert_percent == null ? 20 : Number(body.margin_alert_percent);
  if (!Number.isFinite(marginAlert) || marginAlert < 0 || marginAlert > 100) {
    return NextResponse.json({ error: 'Alert threshold must be between 0 and 100%' }, { status: 400 });
  }

  let sourceUrl: string;
  try {
    await assertPublicHttpUrl(rawUrl);
    sourceUrl = normalizeHttpUrl(rawUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = planFor(profile?.plan);
  const limit = PLANS[plan].productLimit;

  const { count } = await supabase
    .from('tracked_products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: limitMessage(plan), limitReached: true }, { status: 403 });
  }

  // The database also enforces the limit (and the recipient address) itself,
  // so parallel requests or direct API calls can't get past it.
  const { data: inserted, error } = await supabase
    .from('tracked_products')
    .insert({
      user_id: user.id,
      user_email: user.email,
      source_url: sourceUrl,
      sell_price: sellPrice,
      extra_cost: extraCost,
      margin_alert_percent: marginAlert,
    })
    .select()
    .single();

  if (error?.message?.includes('product limit reached')) {
    return NextResponse.json({ error: limitMessage(plan), limitReached: true }, { status: 403 });
  }
  if (error) {
    console.error('Adding product failed', error);
    return NextResponse.json({ error: 'That product could not be added. Try again in a minute.' }, { status: 500 });
  }

  // Run the first check immediately so the user sees real data right away
  // instead of an empty card until the next scheduled run.
  await checkOneProduct(createAdminClient(), inserted);

  return NextResponse.json({ product: inserted });
}
