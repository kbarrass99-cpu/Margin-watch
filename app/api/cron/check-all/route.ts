import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkOneProduct } from '@/lib/checkProduct';

// Allow this function up to 60 seconds to run through everyone's products.
export const maxDuration = 60;

async function handle(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: products, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('is_active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: string; ok: boolean; alertSent?: boolean; error?: string }[] = [];

  for (const product of products || []) {
    try {
      const result = await checkOneProduct(supabase, product);
      results.push({ id: product.id, ok: true, alertSent: result.alertSent });
    } catch (err: any) {
      results.push({ id: product.id, ok: false, error: err?.message });
    }
    // Small pause between requests so we're a polite, low-volume caller.
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({ checked: results.length, results });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
