// Which suppliers MarginCanary can read. Kept free of server-only imports so
// the dashboard can show the same list.

export const SUPPORTED_SUPPLIERS =
  'CJdropshipping, AliExpress, DHgate, Banggood, eBay, Etsy, Amazon, Walmart and most Shopify stores';

// Sites that block automated visits and offer no product API MarginCanary
// can use, so a price can't be read without getting around their robot
// checks (which MarginCanary doesn't do).
const UNSUPPORTED: { host: RegExp; name: string; reason: string }[] = [
  { host: /(^|\.)temu\.com$/, name: 'Temu', reason: 'blocks automated price checks and has no public product API' },
  {
    host: /(^|\.)shein\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/,
    name: 'SHEIN',
    reason: 'blocks automated price checks and has no public product API',
  },
  {
    host: /(^|\.)alibaba\.com$/,
    name: 'Alibaba',
    reason: "currently blocks automated price checks, and its product API is only open to Alibaba's own business partners",
  },
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
  return `${site.name} ${site.reason}, so MarginCanary can't track ${site.name} products yet. It works with ${SUPPORTED_SUPPLIERS}.`;
}
