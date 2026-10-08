import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Nobody else may show these pages inside a frame (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // The site never needs the camera, microphone or location.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  // Product images are plain <img> tags and our own images are served as
  // they are, so the next/image optimizer is switched off entirely: no
  // image proxy endpoint, and nothing for image-processing bugs to reach.
  images: { unoptimized: true },
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
