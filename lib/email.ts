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
