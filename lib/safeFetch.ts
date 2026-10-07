import http from 'http';
import https from 'https';
import dns from 'dns';
import zlib from 'zlib';
import { isIP, type LookupFunction } from 'net';
import { isPublicAddress } from './urlSafety';

export class BlockedUrlError extends Error {
  constructor() {
    super('This URL is not allowed');
  }
}

// A DNS lookup that refuses non-public addresses. It runs at connect time,
// so the address that was checked is the address that gets connected to
// (no DNS-rebinding gap between a check and the request).
export function createSafeLookup(isAllowed: (address: string) => boolean = isPublicAddress): LookupFunction {
  return ((hostname: string, options: dns.LookupOptions, callback: (...args: any[]) => void) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err);
      const list = addresses as dns.LookupAddress[];
      if (list.length === 0 || list.some((a) => !isAllowed(a.address))) return callback(new BlockedUrlError());
      if (options?.all) return callback(null, list);
      callback(null, list[0].address, list[0].family);
    });
  }) as LookupFunction;
}

const defaultLookup = createSafeLookup();

export type SafeResponse = { status: number; location: string | null; body: string | null; truncated: boolean };

// One GET request, no redirects followed (the caller re-checks each hop).
// The body is read only for 2xx responses and is capped at maxBytes after
// decompression; anything beyond that is dropped.
export function safeGet(
  url: string,
  opts: {
    headers: Record<string, string>;
    signal: AbortSignal;
    maxBytes: number;
    lookup?: LookupFunction;
    isAllowed?: (address: string) => boolean;
  }
): Promise<SafeResponse> {
  const target = new URL(url);
  const host = target.hostname.replace(/^\[|\]$/g, '');
  // IP literals skip DNS, so check them here.
  if (isIP(host) && !(opts.isAllowed ?? isPublicAddress)(host)) return Promise.reject(new BlockedUrlError());

  const client = target.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      target,
      {
        method: 'GET',
        headers: { ...opts.headers, 'Accept-Encoding': 'gzip, deflate, br' },
        lookup: opts.lookup ?? defaultLookup,
        signal: opts.signal,
        agent: false,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = status >= 300 && status < 400 ? (res.headers.location ?? null) : null;
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status, location, body: null, truncated: false });
        }

        const encoding = String(res.headers['content-encoding'] || '').toLowerCase();
        const stream =
          encoding === 'gzip' || encoding === 'x-gzip'
            ? res.pipe(zlib.createGunzip())
            : encoding === 'deflate'
              ? res.pipe(zlib.createInflate())
              : encoding === 'br'
                ? res.pipe(zlib.createBrotliDecompress())
                : res;

        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        const finish = () => resolve({ status, location, body: Buffer.concat(chunks).toString('utf8'), truncated });
        stream.on('data', (chunk: Buffer) => {
          if (truncated) return;
          const room = opts.maxBytes - size;
          if (chunk.length >= room) {
            chunks.push(chunk.subarray(0, room));
            size = opts.maxBytes;
            truncated = true;
            req.destroy();
            finish();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        stream.on('end', () => {
          if (!truncated) finish();
        });
        stream.on('error', (err) => {
          if (!truncated) reject(err);
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.end();
  });
}
