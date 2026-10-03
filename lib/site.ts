// Business details shown on the legal pages and in emails. UK GDPR requires
// the privacy policy to say who is responsible for customers' data, so set
// operatorName to your full legal name (sole trader) or company name and
// number before taking real payments.
export const SITE = {
  name: 'MarginCanary',
  url: 'https://margincanary.com',
  operatorName: 'Kieran Barrass' as string | null,
  supportEmail: 'support@margincanary.com',
  legalUpdated: '3 October 2026',
};

// Reads after "run by", e.g. "Jane Smith, a sole trader based in the United Kingdom".
export function operatorDescription(): string {
  const base = 'a sole trader based in the United Kingdom';
  return SITE.operatorName ? `${SITE.operatorName}, ${base}` : base;
}
