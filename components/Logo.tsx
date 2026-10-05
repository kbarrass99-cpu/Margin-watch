import Link from 'next/link';

// The MarginCanary canary: a solid yellow songbird with a deeper-yellow wing
// and feet. Brand colours are fixed so the bird looks the same everywhere;
// app/icon.svg and public/email-logo.png use the same artwork.
export const CANARY = { body: '#f6c21a', deep: '#d99a06', eye: '#18181b' };

export function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="3.1 -0.4 58 58" className={className} aria-hidden="true">
      <path
        d="M36.8 45.8 L38.2 52.4 M38.2 52.4 L42.4 53.4 M38.2 52.4 L35.6 53.4 M40.6 45.4 L42 52 M42 52 L46.2 53 M42 52 L39.6 53"
        fill="none"
        stroke={CANARY.deep}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M53.8 10 C52 5.2 46 3.6 42.2 6 C39.4 7.7 38.3 10.4 37.6 13 C33.5 20 25 30 17.6 40 L5.2 47.2 C3.6 48.2 4.2 50 6 49.6 L20 45.2 C26 45.5 31 46.5 36 46.2 C43 45.5 50 38 52.3 28 C53.2 24 53.5 20 54 16.8 L58.8 14.6 L54.3 10.6 Z"
        fill={CANARY.body}
      />
      <path d="M39 22.5 C43.5 25.5 43.5 33 36.5 37.5 C31.5 40.5 24 41.2 17.8 40.6 C22 34.5 31 26 39 22.5 Z" fill={CANARY.deep} />
      <circle cx="49.6" cy="11" r="2" fill={CANARY.eye} />
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
