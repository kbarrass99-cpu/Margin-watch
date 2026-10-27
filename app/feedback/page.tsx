import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { createClient } from '@/lib/supabase/server';
import Logo from '@/components/Logo';
import FeedbackForm from '@/components/FeedbackForm';

export const metadata: Metadata = {
  title: 'Send feedback',
  robots: { index: false },
};

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/feedback');

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <Logo href="/dashboard" />
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900">
            <ArrowLeft size={14} weight="bold" />
            Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="max-w-xl">
          <h1 className="text-xl font-semibold tracking-tight">Help shape MarginCanary</h1>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            Tell us what&apos;s working, what isn&apos;t and what you&apos;d like next. Every answer goes straight to the
            founder, and feature requests decide what we build.
          </p>
          <FeedbackForm />
        </div>
      </div>
    </main>
  );
}
