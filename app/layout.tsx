import type { Metadata } from 'next';
import Script from 'next/script';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import CookieConsent from '@/components/CookieConsent';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarginCanary — Know before your supplier changes the price',
  description:
    'Track supplier product pages and get alerted the moment price or stock changes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans bg-zinc-50 text-zinc-900 antialiased">
        {children}
        <CookieConsent />
        {/* Vercel Web Analytics: counts page views without cookies or personal data, so it needs no consent. */}
        <Script id="vercel-analytics-queue" strategy="afterInteractive">
          {'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };'}
        </Script>
        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
