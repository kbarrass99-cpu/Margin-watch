'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from '@phosphor-icons/react';
import {
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_QUESTIONS,
  RECOMMEND_OPTIONS,
  type FeedbackField,
  type Recommend,
} from '@/lib/feedback';

const EMPTY: Record<FeedbackField, string> = { working: '', missing: '', features: '' };

export default function FeedbackForm() {
  const [recommend, setRecommend] = useState<Recommend | null>(null);
  const [answers, setAnswers] = useState(EMPTY);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Object.values(answers).some((a) => a.trim())) {
      setError('Answer at least one question before sending.');
      return;
    }
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommend, ...answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Your feedback could not be sent. Try again in a minute.');
        setState('idle');
        return;
      }
      setState('sent');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="mt-8 border-t border-zinc-200 pt-8">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle size={18} weight="bold" />
          Thanks, your feedback has been sent.
        </p>
        <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
          We read every reply and may email you to ask a follow-up question.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              setAnswers(EMPTY);
              setRecommend(null);
              setState('idle');
            }}
            className="px-2 py-2.5 text-sm text-zinc-600 hover:text-zinc-900"
          >
            Send more feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-6 border-t border-zinc-200 pt-8">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-zinc-900">
          Would you recommend MarginCanary to other sellers?
        </legend>
        <div className="flex flex-wrap gap-2">
          {RECOMMEND_OPTIONS.map((o) => (
            <label
              key={o.id}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm ring-1 ring-inset transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 ${
                recommend === o.id ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-300 hover:ring-zinc-400'
              }`}
            >
              <input
                type="radio"
                name="recommend"
                value={o.id}
                checked={recommend === o.id}
                onChange={() => setRecommend(o.id)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      {FEEDBACK_QUESTIONS.map((q) => (
        <div key={q.id} className="flex flex-col gap-2">
          <label htmlFor={`feedback-${q.id}`} className="text-sm font-medium text-zinc-900">
            {q.question}
          </label>
          <textarea
            id={`feedback-${q.id}`}
            value={answers[q.id]}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            maxLength={FEEDBACK_MAX_LENGTH}
            rows={3}
            placeholder={q.placeholder}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
          />
        </div>
      ))}

      <div className="flex flex-col gap-2">
        {error ? (
          <p role="alert" className="text-sm text-red-700">{error}</p>
        ) : (
          <p className="text-xs text-zinc-500">Answer as many or as few questions as you like.</p>
        )}
        <div>
          <button
            type="submit"
            disabled={state === 'sending'}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending...' : 'Send feedback'}
          </button>
        </div>
      </div>
    </form>
  );
}
