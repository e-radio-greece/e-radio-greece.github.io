import type { APIRoute } from 'astro';
import { buildUrl } from '../lib/seo';
import stations from '../data/stations.json';

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(stations as Array<{ slug: string }>).map((station) => (
  `  <url><loc>${buildUrl(`/station/${station.slug}/`)}</loc><lastmod>${lastmod}</lastmod></url>`
)).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
