import { lookup } from 'dns/promises';
import { isIP } from 'net';

// Non-public IPv4 ranges: private, loopback, link-local/cloud metadata,
// carrier-grade NAT, benchmarking, documentation, multicast and reserved.
const BLOCKED_V4: [number, number][] = [
  [0x00000000, 8], // 0.0.0.0/8
  [0x0a000000, 8], // 10.0.0.0/8
  [0x64400000, 10], // 100.64.0.0/10
  [0x7f000000, 8], // 127.0.0.0/8
  [0xa9fe0000, 16], // 169.254.0.0/16
  [0xac100000, 12], // 172.16.0.0/12
  [0xc0000000, 24], // 192.0.0.0/24
  [0xc0000200, 24], // 192.0.2.0/24
  [0xc0586300, 24], // 192.88.99.0/24
  [0xc0a80000, 16], // 192.168.0.0/16
  [0xc6120000, 15], // 198.18.0.0/15
  [0xc6336400, 24], // 198.51.100.0/24
  [0xcb007100, 24], // 203.0.113.0/24
  [0xe0000000, 4], // 224.0.0.0/4 multicast
  [0xf0000000, 4], // 240.0.0.0/4 reserved and broadcast
];

function isPublicIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const n = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  return !BLOCKED_V4.some(([base, bits]) => n >>> (32 - bits) === base >>> (32 - bits));
}

// Expands an IPv6 address to its eight 16-bit groups.
function ipv6Groups(ip: string): number[] | null {
  let addr = ip.toLowerCase().split('%')[0];
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const p = v4[1].split('.').map(Number);
    addr = addr.slice(0, -v4[1].length) + `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
  }
  const halves = addr.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(fill).fill('0'), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

// Only global unicast (2000::/3) is allowed, minus Teredo (2001::/32),
// documentation (2001:db8::/32) and 6to4 (2002::/16), which can tunnel to
// private IPv4 addresses. IPv4-mapped, NAT64, unique-local, link-local,
// site-local and multicast addresses all fall outside 2000::/3.
function isPublicIPv6(ip: string): boolean {
  const g = ipv6Groups(ip);
  if (!g) return false;
  if (g[0] < 0x2000 || g[0] > 0x3fff) return false;
  if (g[0] === 0x2001 && (g[1] === 0x0000 || g[1] === 0x0db8)) return false;
  if (g[0] === 0x2002) return false;
  return true;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIPv4(address);
  if (family === 6) return isPublicIPv6(address);
  return false;
}

function checkUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Please provide a valid product URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('This URL is not allowed');
  }
  return parsed;
}

// Blocks product URLs that resolve to localhost, private networks, or
// link-local/cloud metadata addresses, so the scraper can't be used to
// probe internal infrastructure (SSRF). Used when a URL is submitted; the
// scraper repeats the address check at connect time (see safeFetch.ts), so
// a DNS answer that changes in between can't slip through.
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  const parsed = checkUrl(rawUrl);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  let addresses: { address: string }[];
  try {
    addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  } catch {
    throw new Error('Could not resolve this URL');
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('This URL is not allowed');
  }
}

// The canonical form of a URL that passed the checks above. Stored and
// emailed instead of the raw input, so stray quotes or spaces are encoded.
export function normalizeHttpUrl(rawUrl: string): string {
  return checkUrl(rawUrl).toString();
}
