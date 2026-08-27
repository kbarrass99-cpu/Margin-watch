import { Resend } from 'resend';

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
      from: `MarginWatch <${from}>`,
      to: opts.to,
      subject: `MarginWatch alert: ${opts.productTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="margin-bottom: 4px;">Price/stock change detected</h2>
          <p style="color:#334155;">${opts.message}</p>
          <p><a href="${opts.productUrl}" style="color:#4f46e5;">View the supplier page &rarr;</a></p>
          <p style="color:#94a3b8; font-size:12px; margin-top:24px;">
            You're receiving this because you're tracking this product on MarginWatch.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send alert email', err);
  }
}
