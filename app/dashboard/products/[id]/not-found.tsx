import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] max-w-7xl mx-auto px-4 sm:px-6 py-24">
      <h1 className="text-xl font-semibold tracking-tight">Product not found</h1>
      <p className="mt-2 text-sm text-zinc-500 max-w-[52ch]">
        It may have been removed from tracking, or the link is from another account.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover">
        Back to your products
      </Link>
    </main>
  );
}
