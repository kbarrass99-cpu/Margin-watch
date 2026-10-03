import type { Metadata } from 'next';
import LegalPage from '@/components/marketing/LegalPage';
import { SITE, operatorDescription } from '@/lib/site';

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE.name}`,
  description: `How ${SITE.name} collects, uses and protects your personal data.`,
};

export default function PrivacyPage() {
  const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2>Who we are</h2>
        <p>
          {SITE.name} is run by {operatorDescription()} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the
          controller of the personal data described here under the UK General Data Protection Regulation
          (UK GDPR) and the Data Protection Act 2018.
        </p>
        <p>For any privacy question or request, email {email}.</p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your email address and password. Passwords are stored in hashed
            form by our authentication provider; we never see them.
          </li>
          <li>
            <strong>Products you track:</strong> the supplier page links you add, the prices you sell for, your
            alert settings, and the price, stock and product details we read from those pages over time.
          </li>
          <li>
            <strong>Billing details:</strong> if you take a paid plan, Stripe collects your card and billing
            details directly. We only receive your plan, your Stripe customer and subscription references, and
            whether payments succeeded. We never see or store your full card number.
          </li>
          <li>
            <strong>Technical data:</strong> when you use the site our hosting provider records standard request
            logs, including your IP address and browser type, and we record errors so we can fix them.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it, and our lawful basis</h2>
        <ul>
          <li>
            To provide the service: checking the pages you add, working out your margin and emailing you
            alerts. Lawful basis: performing our contract with you.
          </li>
          <li>To take payment and manage your subscription. Lawful basis: contract.</li>
          <li>
            To send service emails such as sign-up confirmation, password resets and alerts. We do not send
            marketing emails unless you have opted in. Lawful basis: contract.
          </li>
          <li>
            To keep the service secure, prevent abuse and fix errors. Lawful basis: our legitimate interest in
            running a reliable, secure service.
          </li>
          <li>To keep financial records we are required to keep by law. Lawful basis: legal obligation.</li>
        </ul>
        <p>We do not sell your data, use it for advertising, or make automated decisions about you that have legal or similarly significant effects.</p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We use the following providers to run {SITE.name}. Each only processes data on our instructions:</p>
        <ul>
          <li><strong>Supabase</strong>: database and account sign-in.</li>
          <li><strong>Vercel</strong>: website hosting.</li>
          <li><strong>Stripe</strong>: payments and subscriptions.</li>
          <li><strong>Resend</strong>: sending emails.</li>
          <li><strong>Sentry</strong>: error monitoring.</li>
          <li>
            <strong>Firecrawl</strong>: fetching some supplier pages. It receives the supplier page link only,
            not your personal details.
          </li>
        </ul>
        <p>
          Some of these providers store or process data outside the UK, including in the United States. Where
          they do, the transfer is protected by the UK&ndash;US data bridge or by the UK International Data
          Transfer Agreement or Addendum, as appropriate.
        </p>
        <p>We may also disclose data if the law requires it.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <ul>
          <li>Account and product data: until you delete your account, which you can do at any time from your dashboard.</li>
          <li>Request and error logs: for short periods, normally no more than 90 days.</li>
          <li>
            Billing records: for six years after the end of the tax year they relate to, as required by HMRC. These
            are held by Stripe.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We only use the cookies needed to keep you signed in. We do not use analytics or advertising cookies,
          so we do not ask for cookie consent. If that changes, we will ask first.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You have the right to access a copy of your data, to have it corrected or deleted, to restrict or object
          to how we use it, and to receive it in a portable format. You can delete your account and all your
          tracked products yourself from the dashboard. For anything else, email {email}. We will reply within
          one month.
        </p>
        <p>
          If you are unhappy with how we handle your data, please contact us first. You can also complain to the
          Information Commissioner&apos;s Office at{' '}
          <a href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer" target="_blank">
            ico.org.uk
          </a>{' '}
          or on 0303 123 1113.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we make significant changes we will email you before they take effect. The date at the top shows
          when this policy last changed.
        </p>
      </section>
    </LegalPage>
  );
}
