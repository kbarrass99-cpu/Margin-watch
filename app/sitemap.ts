import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { SUPPLIER_PAGES } from '@/lib/supplierPages';

// Public pages for search engines. The dashboard and API are left out.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/shopify', '/price-tracker', ...SUPPLIER_PAGES.map((p) => `/price-tracker/${p.slug}`), '/signup', '/privacy', '/terms'];
  return pages.map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : path.startsWith('/price-tracker') || path === '/shopify' ? 0.8 : 0.3,
  }));
}
