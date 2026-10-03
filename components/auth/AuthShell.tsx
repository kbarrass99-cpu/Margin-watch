import Logo from '@/components/Logo';

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        <Logo />
      </header>
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 pt-10 pb-24">
        <div className="w-full max-w-[400px]">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && <div className="mt-10 pt-6 border-t border-zinc-200 text-sm text-zinc-500">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
