'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClass } from '@/components/auth/Field';

export default function DeleteAccount({ isPaid }: { isPaid: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push('/?deleted=1');
        router.refresh();
        return;
      }
      setError(data.error || 'Your account could not be deleted. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-zinc-400 hover:text-red-600">
        Delete account
      </button>
    );
  }

  return (
    <form onSubmit={handleDelete} className="max-w-md flex flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-900">Delete your account</h2>
      <p className="text-sm text-zinc-600 leading-relaxed">
        This permanently deletes your account, every tracked product and its price history.
        {isPaid && ' Your subscription is cancelled straight away and you won’t be charged again.'} This can’t be
        undone.
      </p>
      <label htmlFor="delete-confirm" className="text-sm text-zinc-700">
        Type <span className="font-mono font-medium">DELETE</span> to confirm
      </label>
      <input
        id="delete-confirm"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={inputClass}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={confirm !== 'DELETE' || busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
        >
          {busy ? 'Deleting…' : 'Delete my account'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm('');
            setError(null);
          }}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
