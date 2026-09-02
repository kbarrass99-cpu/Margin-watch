import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOneProduct } from '@/lib/checkProduct';

const FREE_PLAN_LIMIT = 5;

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

  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Please provide a valid product URL' }, { status: 400 });
  }

  const { count } = await supabase
    .from('tracked_products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if ((count ?? 0) >= FREE_PLAN_LIMIT) {
    return NextResponse.json(
      { error: `Free plan is limited to ${FREE_PLAN_LIMIT} tracked products.` },
      { status: 403 }
    );
  }

  const { data: inserted, error } = await supabase
    .from('tracked_products')
    .insert({
      user_id: user.id,
      user_email: user.email,
      source_url: sourceUrl,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Run the first check immediately so the user sees real data right away
  // instead of an empty card until the next scheduled run.
  await checkOneProduct(supabase, inserted);

  return NextResponse.json({ product: inserted });
}
