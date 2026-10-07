import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Nobody else may show these pages inside a frame (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  // Product images are plain <img> tags, so the next/image optimizer isn't
  // used. No remotePatterns means it can't be used as an open image proxy.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  experimental: {
    instrumentationHook: true,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
