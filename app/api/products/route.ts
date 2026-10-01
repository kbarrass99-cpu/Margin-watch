import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOneProduct } from '@/lib/checkProduct';
import { PLAN_LIMITS } from '@/lib/stripe';
import { assertPublicHttpUrl } from '@/lib/urlSafety';

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const sourceUrl: string = (body.source_url || '').trim();
  const sellPrice =
    body.sell_price === '' || body.sell_price == null ? null : Number(body.sell_price);

  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Please provide a valid product URL' }, { status: 400 });
  }

  if (sellPrice !== null && (!Number.isFinite(sellPrice) || sellPrice < 0)) {
    return NextResponse.json({ error: 'Sell price must be a positive number' }, { status: 400 });
  }

  try {
    await assertPublicHttpUrl(sourceUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan || 'free';
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const { count } = await supabase
    .from('tracked_products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      {
        error:
          plan === 'free'
            ? `Free plan is limited to ${limit} tracked products. Upgrade to Pro for more.`
            : `Pro plan is limited to ${limit} tracked products.`,
        limitReached: true,
      },
      { status: 403 }
    );
  }

  const { data: inserted, error } = await supabase
    .from('tracked_products')
    .insert({
      user_id: user.id,
      user_email: user.email,
      source_url: sourceUrl,
      sell_price: sellPrice,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Run the first check immediately so the user sees real data right away
  // instead of an empty card until the next scheduled run.
  await checkOneProduct(supabase, inserted);

  return NextResponse.json({ product: inserted });
}
