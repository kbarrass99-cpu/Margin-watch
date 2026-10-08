import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/marketing/LegalPage';
import { SITE, companyDescription } from '@/lib/site';

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE.name}`,
  description: `The terms that apply when you use ${SITE.name}.`,
};

export default function TermsPage() {
  const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

  return (
    <LegalPage title="Terms of Service">
      <section>
        <h2>About these terms</h2>
        <p>
          These terms are an agreement between you and {companyDescription()}, whose registered office is at{' '}
          {SITE.company.registeredOffice} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We run {SITE.name}. By creating an account you agree to them. Our{' '}
          <Link href="/privacy">Privacy Policy</Link> explains how we handle your data.
        </p>
        <p>
          {SITE.name} is a tool for businesses. By using it you confirm you are using it for your business,
          not as a consumer.
        </p>
      </section>

      <section>
        <h2>What {SITE.name} does</h2>
        <p>
          You add links to supplier product pages and, optionally, what you sell each product for. We check those
          pages on a schedule, currently about every six hours, and email you when the price, stock or your
          margin changes in the ways you have asked to hear about.
        </p>
        <p>
          We read prices and stock from pages run by other companies, which can change, be wrong, or block
          automated checks without warning. So we cannot promise every check will succeed or every figure will
          be accurate or up to date. Always confirm the price with your supplier before relying on it. You remain
          responsible for your own pricing and buying decisions.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Give us a working email address. That is where your alerts go.</li>
          <li>Keep your password secure. You are responsible for activity on your account.</li>
          <li>You can delete your account at any time from your dashboard.</li>
        </ul>
      </section>

      <section>
        <h2>Fair use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>add pages other than publicly available product pages you have a legitimate business reason to monitor;</li>
          <li>use {SITE.name} for anything unlawful, or in a way that breaks a website&apos;s own terms that apply to you;</li>
          <li>try to overload, disrupt, or get around the limits or security of the service;</li>
          <li>resell or provide the service to others without our written agreement.</li>
        </ul>
        <p>We may stop checking a page, or suspend an account, if it is being used in breach of these terms.</p>
      </section>

      <section>
        <h2>Plans and payment</h2>
        <ul>
          <li>
            The Free plan is free. Paid plans are billed in advance through Stripe, monthly or yearly as you
            choose, at the prices in US dollars shown on our <Link href="/#pricing">pricing</Link> section,
            plus any tax that applies.
          </li>
          <li>Paid plans renew automatically at the end of each month or year until you cancel.</li>
          <li>
            You can cancel at any time from <strong>Billing</strong> in your dashboard. Your plan stays active until
            the end of the period you have paid for, then moves to Free. We do not refund unused months or part-months,
            except where the law requires.
          </li>
          <li>
            If you upgrade, the change applies straight away and you are charged the difference for the rest of your
            billing period. If you downgrade, it applies from your next billing date.
          </li>
          <li>We will give you at least 30 days&apos; notice by email before changing the price of your plan.</li>
        </ul>
      </section>

      <section>
        <h2>Other companies&apos; websites</h2>
        <p>
          {SITE.name} is not affiliated with, endorsed by, or sponsored by any supplier or platform it works with,
          such as AliExpress or Shopify. Their names and trade marks belong to them.
        </p>
      </section>

      <section>
        <h2>Your data and ours</h2>
        <p>
          The links, prices and settings you add are yours. You let us use them only to provide the service to
          you. {SITE.name} itself, including its software and design, belongs to us.
        </p>
      </section>

      <section>
        <h2>Changes and availability</h2>
        <p>
          We work to keep {SITE.name} running, but it may sometimes be unavailable, for example during maintenance.
          We may change or improve features over time. If we make a change to these terms that matters, we will
          email you at least 30 days before it applies.
        </p>
      </section>

      <section>
        <h2>Our liability</h2>
        <p>
          Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or
          for anything else the law does not allow us to limit.
        </p>
        <p>
          Otherwise, we are not liable for lost profits, sales, business or data, or for any indirect or
          consequential loss, including losses from acting on, or failing to receive, an alert. Our total
          liability to you in any 12-month period is limited to the greater of the amount you paid us in that
          period and £50.
        </p>
      </section>

      <section>
        <h2>Ending the agreement</h2>
        <p>
          You can stop using {SITE.name} and delete your account at any time. We may end your account with 30
          days&apos; notice, or straight away if you seriously breach these terms. If we end a paid plan for a
          reason other than your breach, we will refund any unused part of the period you paid for.
        </p>
      </section>

      <section>
        <h2>Law and disputes</h2>
        <p>
          These terms are governed by the law of England and Wales, and the courts of England and Wales have
          exclusive jurisdiction. If you have a problem, please email {email} first. Most things can be sorted out
          quickly.
        </p>
      </section>
    </LegalPage>
  );
}
