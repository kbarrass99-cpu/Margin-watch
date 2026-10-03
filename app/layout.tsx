import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarginWatch — Know before your supplier changes the price',
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
      <body className="font-sans bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
