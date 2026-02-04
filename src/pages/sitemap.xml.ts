import type { APIRoute } from 'astro';
import { buildUrl } from '../lib/seo';

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const sitemaps = [
    buildUrl('/sitemap-pages.xml'),
    buildUrl('/sitemap-stations.xml'),
    buildUrl('/sitemap-cities.xml'),
    buildUrl('/sitemap-genres.xml'),
    buildUrl('/sitemap-top-rated.xml'),
    buildUrl('/sitemap-hubs.xml'),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map((loc) => `  <sitemap><loc>${loc}</loc><lastmod>${lastmod}</lastmod></sitemap>`)
  .join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
