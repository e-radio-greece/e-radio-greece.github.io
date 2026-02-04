import type { APIRoute } from 'astro';
import { buildUrl } from '../lib/seo';
import {
  getCityGenreCombos,
  getStationsByQuality,
  letterHubBuckets,
  qualityTierKeys,
} from '../lib/data';

const pageSize = 50;

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString();
  const urls: string[] = [
    buildUrl('/hubs/'),
    buildUrl('/hubs/top-cities/'),
    buildUrl('/hubs/top-genres/'),
    buildUrl('/hubs/city-genre/'),
    buildUrl('/quality/'),
  ];

  for (const bucket of letterHubBuckets) {
    urls.push(buildUrl(`/city/letter/${bucket}/`));
    urls.push(buildUrl(`/genre/letter/${bucket}/`));
  }

  for (const tier of qualityTierKeys) {
    urls.push(buildUrl(`/quality/${tier}/`));
    const stations = getStationsByQuality(tier)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 100);
    const totalPages = Math.max(1, Math.ceil(stations.length / pageSize));
    for (let page = 2; page <= totalPages; page += 1) {
      urls.push(buildUrl(`/quality/${tier}/page/${page}/`));
    }
  }

  for (const combo of getCityGenreCombos(20, 5)) {
    urls.push(buildUrl(`/city/${combo.citySlug}/genre/${combo.genreSlug}/`));
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
