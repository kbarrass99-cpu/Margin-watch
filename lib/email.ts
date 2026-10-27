import { Resend } from 'resend';
import { SITE, companyFooterLine } from './site';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only http(s) links, in their canonical encoded form; anything else points
// at the dashboard instead.
function safeLink(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
  } catch {}
  return `${SITE.url}/dashboard`;
}

// Internal: a customer used "Report a problem" on a product. Goes to the
// support inbox; replying answers the customer directly.
export async function sendIssueReportEmail(opts: {
  reportId: number;
  customerEmail: string;
  plan: string;
  reason: string;
  note: string | null;
  productTitle: string | null;
  productUrl: string;
  recentChecks: { checked_at: string; price: number | null; currency: string | null; in_stock: boolean | null; raw_status: string }[];
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email send');
    return false;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev';
  const title = (opts.productTitle || opts.productUrl).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 100);
  const cell = 'padding:4px 8px; border-bottom:1px solid #e4e4e7; font-size:13px; vertical-align:top;';
  const checks = opts.recentChecks.length
    ? opts.recentChecks
        .map(
          (c) => `<tr>
            <td style="${cell}">${escapeHtml(new Date(c.checked_at).toUTCString())}</td>
            <td style="${cell}">${c.price == null ? '-' : escapeHtml(`${c.price} ${c.currency ?? ''}`)}</td>
            <td style="${cell}">${c.in_stock == null ? '-' : c.in_stock ? 'in stock' : 'out of stock'}</td>
            <td style="${cell}">${escapeHtml(c.raw_status.slice(0, 300))}</td>
          </tr>`
        )
        .join('')
    : `<tr><td style="${cell}" colspan="4">No checks yet.</td></tr>`;

  try {
    const { error } = await resend.emails.send({
      from: `MarginCanary <${from}>`,
      to: SITE.supportEmail,
      reply_to: opts.customerEmail,
      subject: `Problem report #${opts.reportId}: ${opts.reason} - ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 640px; color:#18181b;">
          <h2 style="margin:0 0 12px;">Problem report #${opts.reportId}</h2>
          <p style="margin:4px 0;"><strong>Customer:</strong> ${escapeHtml(opts.customerEmail)} (${escapeHtml(opts.plan)} plan)</p>
          <p style="margin:4px 0;"><strong>Problem:</strong> ${escapeHtml(opts.reason)}</p>
          <p style="margin:4px 0;"><strong>Their note:</strong> ${opts.note ? escapeHtml(opts.note) : '<em>none</em>'}</p>
          <p style="margin:4px 0;"><strong>Product:</strong> ${escapeHtml(title)}</p>
          <p style="margin:4px 0; word-break:break-all;"><strong>Supplier link:</strong> <a href="${escapeHtml(safeLink(opts.productUrl))}">${escapeHtml(opts.productUrl.slice(0, 300))}</a></p>
          <h3 style="margin:20px 0 6px; font-size:15px;">Latest checks</h3>
          <table cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%;">
            <tr><th align="left" style="${cell}">When</th><th align="left" style="${cell}">Price</th><th align="left" style="${cell}">Stock</th><th align="left" style="${cell}">What the checker saw</th></tr>
            ${checks}
          </table>
          <p style="color:#71717a; font-size:12px; margin-top:20px;">Reply to this email to answer the customer directly.</p>
        </div>
      `,
    });
    if (error) {
      console.error('Resend rejected problem report email', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send problem report email', err);
    return false;
  }
}

// Internal: a customer sent the feedback form. Goes to the support inbox;
// replying answers the customer directly.
export async function sendFeedbackEmail(opts: {
  feedbackId: number;
  customerEmail: string;
  plan: string;
  productCount: number;
  recommend: string | null;
  answers: { question: string; answer: string | null }[];
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email send');
    return false;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev';
  const answers = opts.answers
    .map(
      (a) => `<h3 style="margin:20px 0 6px; font-size:15px;">${escapeHtml(a.question)}</h3>
        <p style="margin:0; white-space:pre-wrap;">${a.answer ? escapeHtml(a.answer) : '<em style="color:#71717a;">No answer</em>'}</p>`
    )
    .join('');

  try {
    const { error } = await resend.emails.send({
      from: `MarginCanary <${from}>`,
      to: SITE.supportEmail,
      reply_to: opts.customerEmail,
      subject: `Feedback #${opts.feedbackId} from ${opts.customerEmail}`,
      html: `
        <div style="font-family: sans-serif; max-width: 640px; color:#18181b;">
          <h2 style="margin:0 0 12px;">Feedback #${opts.feedbackId}</h2>
          <p style="margin:4px 0;"><strong>Customer:</strong> ${escapeHtml(opts.customerEmail)} (${escapeHtml(opts.plan)} plan, ${opts.productCount} tracked product${opts.productCount === 1 ? '' : 's'})</p>
          <p style="margin:4px 0;"><strong>Would recommend:</strong> ${opts.recommend ? escapeHtml(opts.recommend) : '<em>not answered</em>'}</p>
          ${answers}
          <p style="color:#71717a; font-size:12px; margin-top:20px;">Reply to this email to answer the customer directly.</p>
        </div>
      `,
    });
    if (error) {
      console.error('Resend rejected feedback email', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send feedback email', err);
    return false;
  }
}

// Account emails (welcome, trial ending and so on). Paragraphs are plain
// text and are escaped here; replies go to the support inbox.
export async function sendServiceEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  reason: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email send');
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev';
  const body = opts.paragraphs.map((p) => `<p style="color:#3f3f46; line-height:1.55;">${escapeHtml(p)}</p>`).join('');
  const cta = opts.cta
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(safeLink(opts.cta.url))}" style="background:#18181b; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:8px; display:inline-block; font-weight:600;">${escapeHtml(opts.cta.label)}</a></p>`
    : '';

  try {
    const { error } = await resend.emails.send({
      from: `MarginCanary <${from}>`,
      to: opts.to,
      reply_to: SITE.supportEmail,
      subject: opts.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 4px;"><tr>
            <td style="padding-right: 10px; vertical-align: middle;"><img src="${SITE.url}/email-logo.png" width="32" height="32" alt="" style="display: block;" /></td>
            <td style="vertical-align: middle;"><h2 style="margin: 0;">${escapeHtml(opts.heading)}</h2></td>
          </tr></table>
          ${body}
          ${cta}
          <p style="color:#a1a1aa; font-size:12px; margin-top:24px; line-height:1.5;">
            ${escapeHtml(opts.reason)}<br />
            <a href="mailto:${SITE.supportEmail}" style="color:#71717a;">${SITE.supportEmail}</a> &middot;
            <a href="${SITE.url}/privacy" style="color:#71717a;">Privacy</a><br />
            ${escapeHtml(companyFooterLine())}
          </p>
        </div>
      `,
    });
    if (error) {
      console.error('Resend rejected account email', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send account email', err);
    return false;
  }
}

export async function sendAlertEmail(opts: {
  to: string;
  productTitle: string;
  productUrl: string;
  message: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email send');
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // Titles come from supplier pages: one line, sensible length.
  const title = opts.productTitle.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120) || 'Tracked product';
  const from = process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { error } = await resend.emails.send({
      from: `MarginCanary <${from}>`,
      to: opts.to,
      subject: `MarginCanary alert: ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 4px;"><tr>
            <td style="padding-right: 10px; vertical-align: middle;"><img src="${SITE.url}/email-logo.png" width="32" height="32" alt="" style="display: block;" /></td>
            <td style="vertical-align: middle;"><h2 style="margin: 0;">${SITE.name} alert</h2></td>
          </tr></table>
          <p style="color:#3f3f46;">${escapeHtml(opts.message)}</p>
          <p><a href="${escapeHtml(safeLink(opts.productUrl))}" style="color:#2348d8;">View the supplier page</a></p>
          <p style="color:#a1a1aa; font-size:12px; margin-top:24px; line-height:1.5;">
            You're receiving this because you're tracking this product on ${SITE.name}.
            To change your alerts or stop tracking it, open your
            <a href="${SITE.url}/dashboard" style="color:#71717a;">dashboard</a>.<br />
            <a href="mailto:${SITE.supportEmail}" style="color:#71717a;">${SITE.supportEmail}</a> &middot;
            <a href="${SITE.url}/privacy" style="color:#71717a;">Privacy</a><br />
            ${escapeHtml(companyFooterLine())}
          </p>
        </div>
      `,
    });
    if (error) {
      console.error('Resend rejected alert email', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send alert email', err);
    return false;
  }
}
