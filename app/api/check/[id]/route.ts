import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOneProduct } from '@/lib/checkProduct';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: product, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const result = await checkOneProduct(supabase, product);
  return NextResponse.json(result);
}
