import type { SupabaseClient } from '@supabase/supabase-js';
import { sendServiceEmail } from './email';
import { PLANS, TRIAL_DAYS, formatPrice, type PlanId } from './plans';
import { SITE } from './site';

// Account emails that help a new user get value and know what they'll pay.
// Each is sent at most once per user: the email_log row is claimed first, so
// two requests at the same moment can't both send it. If sending fails the
// claim is released, so it's tried again next time.
async function sendOnce(
  admin: SupabaseClient,
  userId: string,
  kind: string,
  send: () => Promise<boolean>
): Promise<void> {
  const { error } = await admin.from('email_log').insert({ user_id: userId, kind });
  if (error) {
    // 23505 = already sent. Anything else: skip quietly, it's not critical.
    if (error.code !== '23505') console.error(`email_log insert failed for ${kind}`, error);
    return;
  }
  const sent = await send();
  if (!sent) await admin.from('email_log').delete().eq('user_id', userId).eq('kind', kind);
}

const DASHBOARD = `${SITE.url}/dashboard`;
const REASON = `You're receiving this because you have a ${SITE.name} account.`;

function trialLine(trialEligible: boolean): string {
  return trialEligible ? ` Your first ${TRIAL_DAYS} days on a paid plan are free.` : '';
}

export function sendWelcomeEmail(admin: SupabaseClient, userId: string, to: string) {
  return sendOnce(admin, userId, 'welcome', () =>
    sendServiceEmail({
      to,
      subject: `Welcome to ${SITE.name}`,
      heading: "You're all set",
      paragraphs: [
        `Thanks for signing up. Getting your first alert takes about a minute:`,
        `1. Copy the link to a product on your supplier's site. AliExpress, CJdropshipping, Alibaba and most Shopify stores all work.`,
        `2. Paste it into your dashboard, with the price you sell it for.`,
        `3. We check it every 6 hours and email you if the price or stock changes, or your margin drops below the level you set.`,
        `Any questions, just reply to this email.`,
      ],
      cta: { label: 'Add your first product', url: DASHBOARD },
      reason: REASON,
    })
  );
}

export function sendFirstProductEmail(
  admin: SupabaseClient,
  userId: string,
  to: string,
  opts: { plan: PlanId; trialEligible: boolean }
) {
  const upsell =
    opts.plan === 'free'
      ? `Most sellers watch every product they sell. Starter covers ${PLANS.starter.productLimit} products and Pro covers ${PLANS.pro.productLimit}.${trialLine(opts.trialEligible)}`
      : null;
  return sendOnce(admin, userId, 'first_product', () =>
    sendServiceEmail({
      to,
      subject: `${SITE.name} is watching your first product`,
      heading: "We're on it",
      paragraphs: [
        `Your first product is being tracked. We'll email you if the supplier changes the price or runs out of stock, or if your margin falls below the level you set.`,
        `There's nothing more to do. Until something changes, you won't hear from us.`,
        ...(upsell ? [upsell] : []),
      ],
      cta: { label: 'Open your dashboard', url: DASHBOARD },
      reason: REASON,
    })
  );
}

export function sendLimitReachedEmail(
  admin: SupabaseClient,
  userId: string,
  to: string,
  opts: { plan: PlanId; trialEligible: boolean }
) {
  if (opts.plan === 'pro') return Promise.resolve();
  const limit = PLANS[opts.plan].productLimit;
  const options =
    opts.plan === 'free'
      ? `Starter (${PLANS.starter.productLimit} products, from ${formatPrice(PLANS.starter.yearlyPrice / 12)}/month) or Pro (${PLANS.pro.productLimit} products)`
      : `Pro (${PLANS.pro.productLimit} products, from ${formatPrice(PLANS.pro.yearlyPrice / 12)}/month)`;
  return sendOnce(admin, userId, `limit_reached_${opts.plan}`, () =>
    sendServiceEmail({
      to,
      subject: `You're now tracking ${limit} of ${limit} products`,
      heading: 'Your plan is full',
      paragraphs: [
        `Your ${PLANS[opts.plan].name} plan covers ${limit} product${limit === 1 ? '' : 's'}, and ${limit === 1 ? "it's" : "they're all"} now in use.`,
        `To watch more of your catalogue, move to ${options}.${trialLine(opts.trialEligible)}`,
      ],
      cta: { label: 'See plans', url: DASHBOARD },
      reason: REASON,
    })
  );
}

export function sendTrialEndingEmail(
  admin: SupabaseClient,
  userId: string,
  to: string,
  opts: { subscriptionId: string; plan: PlanId; trialEnd: Date; amount: string; interval: 'month' | 'year' }
) {
  const date = opts.trialEnd.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return sendOnce(admin, userId, `trial_ending_${opts.subscriptionId}`, () =>
    sendServiceEmail({
      to,
      subject: `Your ${SITE.name} trial ends on ${date}`,
      heading: 'Your free trial ends soon',
      paragraphs: [
        `Your free trial of ${PLANS[opts.plan].name} ends on ${date}. After that we'll charge ${opts.amount} for your ${opts.interval === 'year' ? 'yearly' : 'monthly'} plan, and it renews automatically until you cancel.`,
        `Want to keep it? There's nothing to do.`,
        `Don't want it? Cancel before ${date} from Billing in your dashboard and you won't be charged.`,
      ],
      cta: { label: 'Manage billing', url: DASHBOARD },
      reason: `You're receiving this because you started a free trial on ${SITE.name}.`,
    })
  );
}
