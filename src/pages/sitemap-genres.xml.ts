import type { APIRoute } from 'astro';
import { buildUrl } from '../lib/seo';
import { genres, getGenreStations } from '../lib/data';

const pageSize = 50;

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const urls: string[] = [];

  for (const genre of genres) {
    urls.push(buildUrl(`/genre/${genre.genreSlug}/`));
    const totalPages = Math.max(1, Math.ceil(getGenreStations(genre.genreSlug).length / pageSize));
    for (let page = 2; page <= totalPages; page += 1) {
      urls.push(buildUrl(`/genre/${genre.genreSlug}/page/${page}/`));
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
