import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';
import { SITE } from '@/lib/site';

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh]">
      <SiteHeader />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-24 md:pt-16">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-none">{title}</h1>
        <p className="mt-4 text-sm text-zinc-500">Last updated {SITE.legalUpdated}</p>
        <div className="mt-10 flex flex-col gap-8 text-[15px] text-zinc-700 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-900 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_p+p]:mt-3 [&_a]:text-zinc-900 [&_a]:underline [&_a]:decoration-zinc-300 [&_a]:underline-offset-4">
          {children}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
