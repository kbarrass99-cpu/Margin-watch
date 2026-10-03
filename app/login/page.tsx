'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Info } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import Field, { inputClass } from '@/components/auth/Field';
import SubmitButton from '@/components/auth/SubmitButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === '1') {
      setNotice({ kind: 'ok', text: 'Your email is confirmed. Log in to get started.' });
    } else if (params.get('link') === 'expired') {
      setNotice({
        kind: 'warn',
        text: 'That confirmation link has already been used or has expired. If you already confirmed your email, just log in.',
      });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Check on your products and margins."
      footer={
        <>
          No account yet?{' '}
          <Link href="/signup" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4">
            Create one free
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {notice && !error && (
          <div
            className={`flex gap-2.5 text-sm leading-relaxed ${
              notice.kind === 'ok' ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {notice.kind === 'ok' ? (
              <CheckCircle size={18} weight="bold" className="mt-0.5 shrink-0" />
            ) : (
              <Info size={18} weight="bold" className="mt-0.5 shrink-0" />
            )}
            {notice.text}
          </div>
        )}

        <Field id="email" label="Email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field id="password" label="Password" error={error}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'password-error' : undefined}
            className={inputClass}
          />
        </Field>

        <SubmitButton loading={loading} idle="Log in" busy="Logging in…" />
      </form>
    </AuthShell>
  );
}
