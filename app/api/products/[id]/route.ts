import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const updates: { sell_price?: number | null; margin_alert_percent?: number } = {};

  if ('sell_price' in body) {
    const sellPrice = body.sell_price === '' || body.sell_price == null ? null : Number(body.sell_price);
    if (sellPrice !== null && (!Number.isFinite(sellPrice) || sellPrice < 0)) {
      return NextResponse.json({ error: 'Sell price must be a positive number' }, { status: 400 });
    }
    updates.sell_price = sellPrice;
  }

  if ('margin_alert_percent' in body) {
    const marginAlertPercent = Number(body.margin_alert_percent);
    if (!Number.isFinite(marginAlertPercent) || marginAlertPercent < 0 || marginAlertPercent > 100) {
      return NextResponse.json(
        { error: 'Margin alert threshold must be between 0 and 100' },
        { status: 400 }
      );
    }
    updates.margin_alert_percent = marginAlertPercent;
  }

  const { data: product, error } = await supabase
    .from('tracked_products')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ product });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await supabase
    .from('tracked_products')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
