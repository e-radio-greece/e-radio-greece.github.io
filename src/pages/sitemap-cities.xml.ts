import type { APIRoute } from 'astro';
import { buildUrl } from '../lib/seo';
import { cities, getCityStations } from '../lib/data';

const pageSize = 50;

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString();
  const urls: string[] = [];

  for (const city of cities) {
    urls.push(buildUrl(`/city/${city.citySlug}/`));
    const totalPages = Math.max(1, Math.ceil(getCityStations(city.citySlug).length / pageSize));
    for (let page = 2; page <= totalPages; page += 1) {
      urls.push(buildUrl(`/city/${city.citySlug}/page/${page}/`));
    }
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
