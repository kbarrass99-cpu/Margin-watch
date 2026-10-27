import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendFeedbackEmail } from '@/lib/email';
import { FEEDBACK_MAX_LENGTH, FEEDBACK_QUESTIONS, RECOMMEND_OPTIONS, type FeedbackField } from '@/lib/feedback';
import { planFor, PLANS } from '@/lib/plans';
import { SITE } from '@/lib/site';

const DAILY_LIMIT = 5;

// The feedback form: saved, then emailed to support so it's read straight away.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = (await request.json().catch(() => null)) ?? {};
  const recommend = RECOMMEND_OPTIONS.find((o) => o.id === body.recommend) ?? null;
  const answers = Object.fromEntries(
    FEEDBACK_QUESTIONS.map((q) => {
      const value = body[q.id];
      return [q.id, typeof value === 'string' && value.trim() ? value.trim().slice(0, FEEDBACK_MAX_LENGTH) : null];
    })
  ) as Record<FeedbackField, string | null>;

  if (!Object.values(answers).some(Boolean)) {
    return NextResponse.json({ error: 'Answer at least one question before sending.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { count: today } = await admin
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((today ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `You've sent a lot of feedback today. Email ${SITE.supportEmail} and we'll pick it up there.` },
      { status: 429 }
    );
  }

  const { data: saved, error } = await admin
    .from('feedback')
    .insert({ user_id: user.id, recommend: recommend?.id ?? null, ...answers })
    .select('id')
    .single();
  if (error || !saved) {
    Sentry.captureException(error ?? new Error('feedback insert returned nothing'));
    return NextResponse.json({ error: 'Your feedback could not be sent. Try again in a minute.' }, { status: 500 });
  }

  const [{ data: profile }, { count: productCount }] = await Promise.all([
    admin.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    admin.from('tracked_products').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const sent = await sendFeedbackEmail({
    feedbackId: saved.id,
    customerEmail: user.email,
    plan: PLANS[planFor(profile?.plan)].name,
    productCount: productCount ?? 0,
    recommend: recommend?.label ?? null,
    answers: FEEDBACK_QUESTIONS.map((q) => ({ question: q.question, answer: answers[q.id] })),
  });
  // The feedback is saved either way; make sure a failed email is noticed.
  if (!sent) Sentry.captureMessage(`Feedback #${saved.id} saved but the email failed`, 'error');

  return NextResponse.json({ ok: true });
}
