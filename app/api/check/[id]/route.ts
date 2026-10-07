import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkOneProduct } from '@/lib/checkProduct';
import { planFor, PLANS } from '@/lib/plans';

// Each check fetches the supplier page (and may use a paid Firecrawl call),
// so a product can be checked by hand at most this often.
const COOLDOWN_MS = 60_000;

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

  // Only the products the current plan covers (oldest first) can be checked,
  // so a downgraded account keeps its data but not paid-tier checks.
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
  const plan = planFor(profile?.plan);
  const { data: covered } = await supabase
    .from('tracked_products')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(PLANS[plan].productLimit);

  if (!covered?.some((p) => p.id === product.id)) {
    return NextResponse.json(
      {
        error: `The ${PLANS[plan].name} plan covers ${PLANS[plan].productLimit} tracked product${
          PLANS[plan].productLimit === 1 ? '' : 's'
        }. Upgrade to check this one.`,
        limitReached: true,
      },
      { status: 403 }
    );
  }

  // Claim the check atomically, so parallel requests can't all get through.
  // last_checked_at is written only by the server, so users can't reset it.
  const admin = createAdminClient();
  const now = Date.now();
  const { data: claimed } = await admin
    .from('tracked_products')
    .update({ last_checked_at: new Date(now).toISOString() })
    .eq('id', product.id)
    .or(`last_checked_at.is.null,last_checked_at.lt.${new Date(now - COOLDOWN_MS).toISOString()}`)
    .select('id');

  if (!claimed?.length) {
    const lastChecked = product.last_checked_at ? new Date(product.last_checked_at).getTime() : now;
    const waitSeconds = Math.max(1, Math.ceil((lastChecked + COOLDOWN_MS - now) / 1000));
    return NextResponse.json(
      { error: `This product was just checked. Try again in ${waitSeconds} seconds.` },
      { status: 429 }
    );
  }

  const result = await checkOneProduct(admin, product);
  return NextResponse.json(result);
}
