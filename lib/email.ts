import { Resend } from 'resend';
import { SITE } from './site';

export async function sendAlertEmail(opts: {
  to: string;
  productTitle: string;
  productUrl: string;
  message: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email send');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    await resend.emails.send({
      from: `MarginCanary <${from}>`,
      to: opts.to,
      subject: `MarginCanary alert: ${opts.productTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 4px;"><tr>
            <td style="padding-right: 10px; vertical-align: middle;"><img src="${SITE.url}/email-logo.png" width="32" height="32" alt="" style="display: block;" /></td>
            <td style="vertical-align: middle;"><h2 style="margin: 0;">${SITE.name} alert</h2></td>
          </tr></table>
          <p style="color:#3f3f46;">${opts.message}</p>
          <p><a href="${opts.productUrl}" style="color:#2348d8;">View the supplier page</a></p>
          <p style="color:#a1a1aa; font-size:12px; margin-top:24px; line-height:1.5;">
            You're receiving this because you're tracking this product on ${SITE.name}.
            To change your alerts or stop tracking it, open your
            <a href="${SITE.url}/dashboard" style="color:#71717a;">dashboard</a>.<br />
            ${SITE.operatorName ? `${SITE.name} (${SITE.operatorName})` : SITE.name} &middot;
            <a href="mailto:${SITE.supportEmail}" style="color:#71717a;">${SITE.supportEmail}</a> &middot;
            <a href="${SITE.url}/privacy" style="color:#71717a;">Privacy</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send alert email', err);
  }
}
