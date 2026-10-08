// Which suppliers MarginCanary can read. Kept free of server-only imports so
// the dashboard can show the same list.

export const SUPPORTED_SUPPLIERS =
  'CJdropshipping, AliExpress, Alibaba, DHgate, Banggood, eBay, Etsy, Amazon, Walmart and most Shopify stores';

// Sites that block automated visits and offer no public product API, so a
// price can't be read without getting around their robot checks (which
// MarginCanary doesn't do).
const UNSUPPORTED: { host: RegExp; name: string }[] = [
  { host: /(^|\.)temu\.com$/, name: 'Temu' },
  { host: /(^|\.)shein\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/, name: 'SHEIN' },
];

// A plain-English reason when the link is from a supplier MarginCanary can't
// track, otherwise null.
export function unsupportedSupplierMessage(rawUrl: string): string | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  const site = UNSUPPORTED.find((s) => s.host.test(host));
  if (!site) return null;
  return `${site.name} blocks automated price checks and has no public product API, so MarginCanary can't track ${site.name} products yet. It works with ${SUPPORTED_SUPPLIERS}.`;
}
