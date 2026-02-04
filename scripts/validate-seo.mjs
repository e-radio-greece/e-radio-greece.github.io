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
const stationDir = path.join(distDir, 'station');
const stationEntries = await fs.readdir(stationDir, { withFileTypes: true });
const stationCount = stationEntries.filter((entry) => entry.isDirectory()).length;
if (stationCount !== stations.length) {
  errors.push(`Station pages count mismatch: expected ${stations.length}, found ${stationCount}`);
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
