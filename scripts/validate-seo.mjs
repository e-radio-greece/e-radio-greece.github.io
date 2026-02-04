import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const dataPath = path.join(rootDir, 'src', 'data', 'stations.json');

const configModule = await import(pathToFileURL(path.join(rootDir, 'astro.config.mjs')));
const config = configModule.default || {};
const site = config.site || 'https://e-radio-greece.github.io';
const base = config.base || '/';

const toDistPath = (url) => {
  const target = new URL(url, site);
  const pathname = target.pathname.replace(base.replace(/\/$/, ''), '').replace(/^\//, '');
  const normalized = pathname ? `${pathname}` : '';
  const filePath = path.join(distDir, normalized, 'index.html');
  return filePath;
};

const listHtmlFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
};

const readFileSafe = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
};

const errors = [];

const stations = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
const stationsListing = stations.filter((station) => station.lastcheckok === 1);

const greekMap = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th',
  ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
  ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

const transliterateGreek = (input) =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split('')
    .map((char) => greekMap[char] || char)
    .join('');

const slugify = (input) => {
  if (!input) return 'unknown';
  return transliterateGreek(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase() || 'unknown';
};

const normalizeGenre = (genre) => slugify((genre || '').toLowerCase());

const letterBuckets = [...'abcdefghijklmnopqrstuvwxyz'.split(''), '0-9', 'other'];
const getLetterBucket = (slug) => {
  if (!slug) return 'other';
  const first = slug.trim().charAt(0).toLowerCase();
  if (first >= 'a' && first <= 'z') return first;
  if (first >= '0' && first <= '9') return '0-9';
  return 'other';
};

const cityMap = new Map();
const cityCounts = new Map();
const cityGenreCounts = new Map();
for (const station of stationsListing) {
  const cityName = (station.state || '').trim() || 'Unknown City';
  const citySlug = slugify(cityName);
  if (!cityMap.has(citySlug)) {
    cityMap.set(citySlug, cityName);
  }
  cityCounts.set(citySlug, (cityCounts.get(citySlug) || 0) + 1);
  if (!cityGenreCounts.has(citySlug)) cityGenreCounts.set(citySlug, new Map());
  const genreMap = cityGenreCounts.get(citySlug);
  const genres = (station.genres || []).filter(Boolean);
  for (const genre of genres) {
    const normalized = normalizeGenre(genre);
    if (!normalized) continue;
    genreMap.set(normalized, (genreMap.get(normalized) || 0) + 1);
  }
}

const genreSet = new Set();
for (const station of stationsListing) {
  const genres = (station.genres || []).filter(Boolean);
  for (const genre of genres) {
    const normalized = normalizeGenre(genre);
    if (normalized) genreSet.add(normalized);
  }
}

const bucketCitySlugCache = new Map();
const bucketGenreSlugCache = new Map();

for (const bucket of letterBuckets) {
  const cityHubPath = toDistPath(`/city/letter/${bucket}/`);
  const genreHubPath = toDistPath(`/genre/letter/${bucket}/`);
  const cityHtml = await readFileSafe(cityHubPath);
  const genreHtml = await readFileSafe(genreHubPath);

  if (!cityHtml) {
    errors.push(`Missing city letter hub: ${bucket}`);
  } else {
    const regex = /href="\/city\/(?!letter\/)([^/]+)\//gi;
    const slugs = new Set();
    let match;
    while ((match = regex.exec(cityHtml))) slugs.add(match[1]);
    bucketCitySlugCache.set(bucket, slugs);
  }

  if (!genreHtml) {
    errors.push(`Missing genre letter hub: ${bucket}`);
  } else {
    const regex = /href="\/genre\/(?!letter\/)([^/]+)\//gi;
    const slugs = new Set();
    let match;
    while ((match = regex.exec(genreHtml))) slugs.add(match[1]);
    bucketGenreSlugCache.set(bucket, slugs);
  }
}

const qualityTiers = {
  low: { min: 0, max: 95 },
  standard: { min: 96, max: 159 },
  high: { min: 160, max: 255 },
  hd: { min: 256, max: null },
};
const stationDir = path.join(distDir, 'station');
const stationEntries = await fs.readdir(stationDir, { withFileTypes: true });
const stationCount = stationEntries.filter((entry) => entry.isDirectory()).length;
if (stationCount !== stations.length) {
  errors.push(`Station pages count mismatch: expected ${stations.length}, found ${stationCount}`);
}

const hubPages = [
  '/hubs/',
  '/hubs/top-cities/',
  '/hubs/top-genres/',
  '/hubs/city-genre/',
  '/quality/',
];

for (const hub of hubPages) {
  const hubPath = toDistPath(hub);
  const html = await readFileSafe(hubPath);
  if (!html) {
    errors.push(`Missing hub page: ${hub}`);
  }
}

for (const bucket of letterBuckets) {
  const cityHubPath = toDistPath(`/city/letter/${bucket}/`);
  const genreHubPath = toDistPath(`/genre/letter/${bucket}/`);
  if (!(await readFileSafe(cityHubPath))) errors.push(`Missing city letter hub: ${bucket}`);
  if (!(await readFileSafe(genreHubPath))) errors.push(`Missing genre letter hub: ${bucket}`);
}

for (const [citySlug] of cityMap.entries()) {
  const bucket = getLetterBucket(citySlug);
  const slugs = bucketCitySlugCache.get(bucket);
  if (!slugs) continue;
  if (!slugs.has(citySlug)) {
    errors.push(`City slug missing from letter hub ${bucket}: ${citySlug}`);
  }
}

for (const genreSlug of genreSet) {
  const bucket = getLetterBucket(genreSlug);
  const slugs = bucketGenreSlugCache.get(bucket);
  if (!slugs) continue;
  if (!slugs.has(genreSlug)) {
    errors.push(`Genre slug missing from letter hub ${bucket}: ${genreSlug}`);
  }
}

const comboLimit = 100;
const topCityCombos = Array.from(cityCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .flatMap(([citySlug]) => {
    const genreMap = cityGenreCounts.get(citySlug) || new Map();
    return Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genreSlug]) => ({ citySlug, genreSlug }));
  });

if (topCityCombos.length > comboLimit) {
  errors.push(`City-genre intersections exceed limit: ${topCityCombos.length} > ${comboLimit}`);
}

for (const combo of topCityCombos) {
  const comboPath = toDistPath(`/city/${combo.citySlug}/genre/${combo.genreSlug}/`);
  if (!(await readFileSafe(comboPath))) {
    errors.push(`Missing city-genre page: /city/${combo.citySlug}/genre/${combo.genreSlug}/`);
  }
}

const intersectionDir = path.join(distDir, 'city');
try {
  const cityDirs = await fs.readdir(intersectionDir, { withFileTypes: true });
  const actualCombos = [];
  for (const cityEntry of cityDirs) {
    if (!cityEntry.isDirectory()) continue;
    const genreDir = path.join(intersectionDir, cityEntry.name, 'genre');
    try {
      const genreDirs = await fs.readdir(genreDir, { withFileTypes: true });
      for (const genreEntry of genreDirs) {
        if (genreEntry.isDirectory()) {
          actualCombos.push(`${cityEntry.name}/${genreEntry.name}`);
        }
      }
    } catch {
      // Ignore missing genre directory
    }
  }

  if (actualCombos.length > comboLimit) {
    errors.push(`City-genre intersections exceed limit: ${actualCombos.length} > ${comboLimit}`);
  }

  const allowedCombos = new Set(topCityCombos.map((combo) => `${combo.citySlug}/${combo.genreSlug}`));
  for (const combo of actualCombos) {
    if (!allowedCombos.has(combo)) {
      errors.push(`Unexpected city-genre page found: /city/${combo}/`);
    }
  }
} catch {
  // Ignore missing city directory
}

for (const [tier, range] of Object.entries(qualityTiers)) {
  const stationsForTier = stationsListing
    .filter((station) => {
      const bitrate = station.bitrate || 0;
      if (bitrate <= 0) return false;
      if (range.max === null) return bitrate >= range.min;
      return bitrate >= range.min && bitrate <= range.max;
    })
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, 100);

  const allowedSlugs = new Set(stationsForTier.map((station) => station.slug));
  const totalPages = Math.max(1, Math.ceil(stationsForTier.length / 50));
  for (let page = 1; page <= totalPages; page += 1) {
    const pagePath = page === 1
      ? toDistPath(`/quality/${tier}/`)
      : toDistPath(`/quality/${tier}/page/${page}/`);
    const html = await readFileSafe(pagePath);
    if (!html) {
      errors.push(`Missing quality hub page: /quality/${tier}/page/${page}`);
      continue;
    }
    const regex = /href="\/station\/([^/]+)\//gi;
    let match;
    while ((match = regex.exec(html))) {
      const slug = match[1];
      if (!allowedSlugs.has(slug)) {
        errors.push(`Station ${slug} in /quality/${tier}/page/${page} does not match bitrate rule`);
      }
    }
  }
}

const htmlFiles = await listHtmlFiles(distDir);
const canonicalSet = new Set();
const canonicalDuplicates = new Set();

for (const file of htmlFiles) {
  const html = await readFileSafe(file);
  if (!html) continue;

  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    errors.push(`Missing title in ${file}`);
  }
  if (!descriptionMatch || !descriptionMatch[1].trim()) {
    errors.push(`Missing description in ${file}`);
  }

  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (!canonicalMatch || !canonicalMatch[1].trim()) {
    errors.push(`Missing canonical in ${file}`);
  } else {
    const canonical = canonicalMatch[1].trim();
    if (canonicalSet.has(canonical)) {
      canonicalDuplicates.add(canonical);
    } else {
      canonicalSet.add(canonical);
    }
  }

  const hrefMatches = html.match(/href="([^"]+)"/gi) || [];
  for (const match of hrefMatches) {
    const href = match.replace(/href="/i, '').replace(/"/i, '');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
      continue;
    }
    if (!href.startsWith('/')) {
      continue;
    }
    const urlPath = new URL(href, site).pathname;
    const hasExtension = path.extname(urlPath) !== '';
    const targetPath = hasExtension
      ? path.join(distDir, urlPath.replace(base.replace(/\/$/, ''), '').replace(/^\//, ''))
      : toDistPath(href);
    const exists = await readFileSafe(targetPath);
    if (!exists) {
      errors.push(`Broken internal link ${href} referenced in ${file}`);
    }
  }
}

if (canonicalDuplicates.size) {
  errors.push(`Duplicate canonicals found: ${Array.from(canonicalDuplicates).join(', ')}`);
}

const sitemapFiles = [
  'sitemap.xml',
  'sitemap-pages.xml',
  'sitemap-stations.xml',
  'sitemap-cities.xml',
  'sitemap-genres.xml',
  'sitemap-top-rated.xml',
  'sitemap-hubs.xml',
];

for (const sitemapFile of sitemapFiles) {
  const sitemapPath = path.join(distDir, sitemapFile);
  const sitemapXml = await readFileSafe(sitemapPath);
  if (!sitemapXml) {
    errors.push(`Missing sitemap ${sitemapFile}`);
    continue;
  }
  const locs = sitemapXml.match(/<loc>(.*?)<\/loc>/g) || [];
  for (const locTag of locs) {
    const loc = locTag.replace('<loc>', '').replace('</loc>', '');
    if (!loc.endsWith('.xml')) {
      const targetPath = toDistPath(loc);
      const exists = await readFileSafe(targetPath);
      if (!exists) {
        errors.push(`Sitemap URL missing in dist: ${loc}`);
      }
    }
  }
}

if (errors.length) {
  console.error('SEO validation failed:\n' + errors.join('\n'));
  process.exit(1);
}

console.log('SEO validation passed.');
