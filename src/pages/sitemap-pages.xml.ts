import type { APIRoute } from 'astro';
import { buildUrl } from '../lib/seo';

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString();
  const pages = ['/', '/top-rated/', '/city/', '/genre/'];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((path) => `  <url><loc>${buildUrl(path)}</loc><lastmod>${lastmod}</lastmod></url>`)
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
