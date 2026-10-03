import Link from 'next/link';

// A price line that dips under a threshold: the one thing MarginCanary watches for.
export function LogoMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 12.5h12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 2" opacity="0.45" />
      <path
        d="M4 8l3.5 1.5L10 6.5l2.5 7L16 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-900">
      <LogoMark />
      MarginCanary
    </Link>
  );
}
