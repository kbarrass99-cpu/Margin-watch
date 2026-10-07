import Image from 'next/image';
import Link from 'next/link';
import logo from '@/public/brand/logo.png';
import logoMark from '@/public/brand/logo-mark.png';

// The MarginCanary shield-and-canary logo. The icons in app/ (icon.png,
// apple-icon.png, favicon.ico) and public/email-logo.png are cut from the
// same artwork as public/brand/.

export function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return <Image src={logoMark} alt="" aria-hidden="true" className={`${className} object-contain`} unoptimized />;
}

export default function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center shrink-0">
      <Image src={logo} alt="MarginCanary" className="h-9 w-auto" priority unoptimized />
    </Link>
  );
}
