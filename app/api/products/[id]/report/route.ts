import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendIssueReportEmail } from '@/lib/email';
import { planFor, PLANS } from '@/lib/plans';
import { SITE } from '@/lib/site';

const REASONS: Record<string, string> = {
  not_found: "Price isn't being found",
  wrong_price: 'Price is wrong',
  wrong_stock: 'Stock is wrong',
  other: 'Something else',
};

// One report per product every 6 hours, and at most 10 a day per customer.
const PRODUCT_WINDOW_MS = 6 * 3600 * 1000;
const DAILY_LIMIT = 10;

// "Report a problem" on a tracked product: saved, then emailed to support
// with the product's latest checks so it can be investigated straight away.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' && Object.hasOwn(REASONS, body.reason) ? body.reason : null;
  if (!reason) return NextResponse.json({ error: 'Choose what the problem is.' }, { status: 400 });
  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

  // Row-level security means this only finds the customer's own product.
  const { data: product } = await supabase
    .from('tracked_products')
    .select('id, title, source_url')
    .eq('id', id)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const admin = createAdminClient();

  const { count: recentForProduct } = await admin
    .from('issue_reports')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .gte('created_at', new Date(Date.now() - PRODUCT_WINDOW_MS).toISOString());
  if ((recentForProduct ?? 0) > 0) {
    return NextResponse.json({ ok: true, alreadyReported: true });
  }

  const { count: today } = await admin
    .from('issue_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((today ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `You've sent a lot of reports today. Email ${SITE.supportEmail} and we'll help.` },
      { status: 429 }
    );
  }

  const { data: report, error } = await admin
    .from('issue_reports')
    .insert({ user_id: user.id, product_id: id, source_url: product.source_url, reason, note })
    .select('id')
    .single();
  if (error || !report) {
    Sentry.captureException(error ?? new Error('issue report insert returned nothing'), { extra: { productId: id } });
    return NextResponse.json({ error: 'Your report could not be sent. Try again in a minute.' }, { status: 500 });
  }

  const [{ data: profile }, { data: checks }] = await Promise.all([
    admin.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    admin
      .from('snapshots')
      .select('checked_at, price, currency, in_stock, raw_status')
      .eq('tracked_product_id', id)
      .order('checked_at', { ascending: false })
      .limit(5),
  ]);

  const sent = await sendIssueReportEmail({
    reportId: report.id,
    customerEmail: user.email,
    plan: PLANS[planFor(profile?.plan)].name,
    reason: REASONS[reason],
    note,
    productTitle: product.title,
    productUrl: product.source_url,
    recentChecks: checks ?? [],
  });
  // The report is saved either way; make sure a failed email is noticed.
  if (!sent) Sentry.captureMessage(`Problem report #${report.id} saved but the email failed`, 'error');

  return NextResponse.json({ ok: true });
}
