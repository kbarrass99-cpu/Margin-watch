import PricingTable from '@/components/PricingTable';
import { TRIAL_DAYS } from '@/lib/plans';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';
import HeroSwitch from '@/components/marketing/HeroSwitch';
import HeroControl from '@/components/marketing/HeroControl';
import HeroTest from '@/components/marketing/HeroTest';
import HowItWorks from '@/components/marketing/HowItWorks';
import MarketingMotion from '@/components/marketing/MarketingMotion';

export default function Home() {
  return (
    <main className="min-h-[100dvh]">
      <MarketingMotion />
      <SiteHeader />

      <HeroSwitch control={<HeroControl />} test={<HeroTest />} />

      <div className="border-t border-zinc-200" />

      <HowItWorks />

      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 pb-28 scroll-mt-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-none">
              Pricing
            </h2>
            <p className="mt-4 text-zinc-600 leading-relaxed max-w-[36ch]">
              Start free with one product. Every plan gets the same alerts; you only pay for how
              many products you track.
            </p>
          </div>
          <PricingTable trialDays={TRIAL_DAYS} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
