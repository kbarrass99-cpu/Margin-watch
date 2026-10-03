'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import Field, { inputClass } from '@/components/auth/Field';
import SubmitButton from '@/components/auth/SubmitButton';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      // Email confirmation is off, so we're logged in immediately.
      router.push('/dashboard');
      router.refresh();
    } else {
      // Email confirmation is on - Supabase just sent a confirmation link.
      setDone(true);
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Check your email"
        footer={
          <>
            Confirmed already?{' '}
            <Link href="/login" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4">
              Log in
            </Link>
          </>
        }
      >
        <div className="flex gap-3 text-sm text-zinc-600 leading-relaxed">
          <EnvelopeSimple size={20} weight="bold" className="mt-0.5 shrink-0 text-zinc-900" />
          <p>
            We sent a confirmation link to <span className="font-medium text-zinc-900">{email}</span>.
            Open it, then come back and log in.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your free account"
      subtitle="Track one product free. No credit card."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field id="email" label="Email" helper="Margin alerts are sent here.">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="email-helper"
            className={inputClass}
          />
        </Field>

        <Field id="password" label="Password" helper="At least 6 characters." error={error}>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'password-error' : 'password-helper'}
            className={inputClass}
          />
        </Field>

        <SubmitButton loading={loading} idle="Create free account" busy="Creating account…" />
      </form>
    </AuthShell>
  );
}
