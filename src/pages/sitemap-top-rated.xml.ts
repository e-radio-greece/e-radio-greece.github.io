import type { APIRoute } from 'astro';
import { buildUrl } from '../lib/seo';
import { topRatedStations } from '../lib/data';

const pageSize = 50;

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString();
  const totalPages = Math.max(1, Math.ceil(topRatedStations.length / pageSize));
  const urls: string[] = [buildUrl('/top-rated/')];

  for (let page = 2; page <= totalPages; page += 1) {
    urls.push(buildUrl(`/top-rated/page/${page}/`));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
