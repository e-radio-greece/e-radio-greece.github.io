import stations from '../data/stations.json';
import { normalizeGenre, slugify, titleFromSlug } from './slugify';

export type Station = {
  slug: string;
  stationuuid: string;
  name: string;
  state: string | null;
  country: string | null;
  countrycode: string | null;
  stream_url: string | null;
  homepage: string | null;
  favicon: string | null;
  genres: string[] | null;
  language: string | null;
  bitrate: number | null;
  codec: string | null;
  clickcount: number | null;
  lastcheckok: number | null;
  votes: number | null;
  hls: number | null;
  ssl_error: number | null;
  geo_lat: number | null;
  geo_long: number | null;
};

export type EnrichedStation = Station & {
  cityName: string;
  citySlug: string;
  normalizedGenres: string[];
};

export type CityStat = {
  citySlug: string;
  cityName: string;
  count: number;
  topGenres: { slug: string; name: string; count: number }[];
  bitrateDistribution: Record<string, number>;
};

export type GenreStat = {
  genreSlug: string;
  genreName: string;
  count: number;
  topCities: { slug: string; name: string; count: number }[];
  bitrateDistribution: Record<string, number>;
};

export type QualityTier = 'low' | 'standard' | 'high' | 'hd';

const letterBuckets = [
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  '0-9',
  'other',
] as const;

export type LetterBucket = (typeof letterBuckets)[number];

const qualityTiers: Record<QualityTier, { min: number; max: number | null; label: string }> = {
  low: { min: 0, max: 95, label: 'Low quality (0–95 kbps)' },
  standard: { min: 96, max: 159, label: 'Standard quality (96–159 kbps)' },
  high: { min: 160, max: 255, label: 'High quality (160–255 kbps)' },
  hd: { min: 256, max: null, label: 'HD quality (256+ kbps)' },
};

export const qualityTierKeys = Object.keys(qualityTiers) as QualityTier[];

const allStations = stations as Station[];

const bitrateBuckets = ['0-63', '64-127', '128-191', '192-255', '256+', 'unknown'];

const emptyBitrateDistribution = () =>
  bitrateBuckets.reduce<Record<string, number>>((acc, bucket) => {
    acc[bucket] = 0;
    return acc;
  }, {});

const getBitrateBucket = (bitrate: number | null) => {
  if (!bitrate || bitrate <= 0) return 'unknown';
  if (bitrate < 64) return '0-63';
  if (bitrate < 128) return '64-127';
  if (bitrate < 192) return '128-191';
  if (bitrate < 256) return '192-255';
  return '256+';
};

const normalizeStation = (station: Station): EnrichedStation => {
  const cityName = (station.state || '').trim() || 'Unknown City';
  const citySlug = slugify(cityName);
  const genres = (station.genres || []).filter(Boolean);
  const normalizedGenres = Array.from(
    new Set(genres.map((genre) => normalizeGenre(genre)).filter(Boolean))
  );
  return {
    ...station,
    cityName,
    citySlug,
    normalizedGenres,
  };
};

const enrichedStations = allStations.map(normalizeStation);

export const stationsAll = enrichedStations;
export const stationsListing = enrichedStations.filter((station) => station.lastcheckok === 1);

const stationsByCity = new Map<string, EnrichedStation[]>();
const stationsByGenre = new Map<string, EnrichedStation[]>();

const cityGenreCounts = new Map<string, Map<string, number>>();
const genreCityCounts = new Map<string, Map<string, number>>();
const cityBitrate = new Map<string, Record<string, number>>();
const genreBitrate = new Map<string, Record<string, number>>();

for (const station of stationsListing) {
  const citySlug = station.citySlug;
  if (!stationsByCity.has(citySlug)) stationsByCity.set(citySlug, []);
  stationsByCity.get(citySlug)?.push(station);

  if (!cityGenreCounts.has(citySlug)) cityGenreCounts.set(citySlug, new Map());
  if (!cityBitrate.has(citySlug)) cityBitrate.set(citySlug, emptyBitrateDistribution());

  const cityGenres = cityGenreCounts.get(citySlug);
  for (const genreSlug of station.normalizedGenres) {
    if (!stationsByGenre.has(genreSlug)) stationsByGenre.set(genreSlug, []);
    stationsByGenre.get(genreSlug)?.push(station);

    if (!genreCityCounts.has(genreSlug)) genreCityCounts.set(genreSlug, new Map());
    if (!genreBitrate.has(genreSlug)) genreBitrate.set(genreSlug, emptyBitrateDistribution());

    cityGenres?.set(genreSlug, (cityGenres.get(genreSlug) || 0) + 1);

    const genreCities = genreCityCounts.get(genreSlug);
    genreCities?.set(citySlug, (genreCities.get(citySlug) || 0) + 1);
  }

  const cityBucket = getBitrateBucket(station.bitrate ?? null);
  const cityDist = cityBitrate.get(citySlug);
  if (cityDist) cityDist[cityBucket] += 1;

  for (const genreSlug of station.normalizedGenres) {
    const genreDist = genreBitrate.get(genreSlug);
    if (genreDist) genreDist[cityBucket] += 1;
  }
}

const toTopItems = (counts: Map<string, number>, limit = 5, useTitle = false) =>
  Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, count]) => ({
      slug,
      name: useTitle ? titleFromSlug(slug) : slug,
      count,
    }));

export const cityStats: CityStat[] = Array.from(stationsByCity.entries()).map(([citySlug, list]) => {
  const cityName = list[0]?.cityName || 'Unknown City';
  const genreCounts = cityGenreCounts.get(citySlug) || new Map();
  return {
    citySlug,
    cityName,
    count: list.length,
    topGenres: toTopItems(genreCounts, 5, true),
    bitrateDistribution: cityBitrate.get(citySlug) || emptyBitrateDistribution(),
  };
});

export const genreStats: GenreStat[] = Array.from(stationsByGenre.entries()).map(([genreSlug, list]) => {
  const genreName = titleFromSlug(genreSlug);
  const cityCounts = genreCityCounts.get(genreSlug) || new Map();
  return {
    genreSlug,
    genreName,
    count: list.length,
    topCities: toTopItems(cityCounts, 5, true),
    bitrateDistribution: genreBitrate.get(genreSlug) || emptyBitrateDistribution(),
  };
});

export const cities = cityStats.sort((a, b) => b.count - a.count);
export const genres = genreStats.sort((a, b) => b.count - a.count);

const citiesAlphabetical = [...cities].sort((a, b) => a.cityName.localeCompare(b.cityName, 'el'));
const genresAlphabetical = [...genres].sort((a, b) => a.genreName.localeCompare(b.genreName, 'el'));

const cityStatBySlug = new Map(cities.map((city) => [city.citySlug, city]));
const genreStatBySlug = new Map(genres.map((genre) => [genre.genreSlug, genre]));

export const topRatedStations = [...stationsListing].sort((a, b) => (b.votes || 0) - (a.votes || 0));

export const getCityStations = (citySlug: string) => stationsByCity.get(citySlug) || [];
export const getGenreStations = (genreSlug: string) => stationsByGenre.get(genreSlug) || [];

export const getCityStat = (citySlug: string) => cityStatBySlug.get(citySlug);
export const getGenreStat = (genreSlug: string) => genreStatBySlug.get(genreSlug);

export const getStationBySlug = (slug: string) => stationsAll.find((station) => station.slug === slug);

export const getLetterBucket = (slug: string): LetterBucket => {
  if (!slug) return 'other';
  const first = slug.trim().charAt(0).toLowerCase();
  if (first >= 'a' && first <= 'z') return first;
  if (first >= '0' && first <= '9') return '0-9';
  return 'other';
};

export const letterHubBuckets = letterBuckets as readonly LetterBucket[];

export const getLetterLabel = (bucket: LetterBucket) => {
  if (bucket === '0-9') return '0-9';
  if (bucket === 'other') return 'Other';
  return bucket.toUpperCase();
};

export const getCitiesByLetter = (bucket: LetterBucket) =>
  citiesAlphabetical.filter((city) => getLetterBucket(city.citySlug) === bucket);

export const getGenresByLetter = (bucket: LetterBucket) =>
  genresAlphabetical.filter((genre) => getLetterBucket(genre.genreSlug) === bucket);

export const getNearbyCities = (citySlug: string, limit = 5) => {
  const index = citiesAlphabetical.findIndex((city) => city.citySlug === citySlug);
  if (index === -1) return [];
  const windowSize = limit + 1;
  let start = Math.max(0, index - Math.floor(limit / 2));
  let end = start + windowSize;
  if (end > citiesAlphabetical.length) {
    end = citiesAlphabetical.length;
    start = Math.max(0, end - windowSize);
  }
  return citiesAlphabetical
    .slice(start, end)
    .filter((city) => city.citySlug !== citySlug)
    .slice(0, limit);
};

export const getNearbyGenres = (genreSlug: string, limit = 5) => {
  const index = genresAlphabetical.findIndex((genre) => genre.genreSlug === genreSlug);
  if (index === -1) return [];
  const windowSize = limit + 1;
  let start = Math.max(0, index - Math.floor(limit / 2));
  let end = start + windowSize;
  if (end > genresAlphabetical.length) {
    end = genresAlphabetical.length;
    start = Math.max(0, end - windowSize);
  }
  return genresAlphabetical
    .slice(start, end)
    .filter((genre) => genre.genreSlug !== genreSlug)
    .slice(0, limit);
};

export const getTopCities = (limit = 100) => cities.slice(0, limit);
export const getTopGenres = (limit = 100) => genres.slice(0, limit);

export const getTopStationsForCity = (citySlug: string, limit = 3) =>
  [...getCityStations(citySlug)]
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, limit);

export const getTopStationsForGenre = (genreSlug: string, limit = 3) =>
  [...getGenreStations(genreSlug)]
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, limit);

export const getQualityTier = (bitrate: number | null): QualityTier | null => {
  if (!bitrate || bitrate <= 0) return null;
  if (bitrate <= 95) return 'low';
  if (bitrate <= 159) return 'standard';
  if (bitrate <= 255) return 'high';
  return 'hd';
};

export const getStationsByQuality = (tier: QualityTier) => {
  const { min, max } = qualityTiers[tier];
  return stationsListing.filter((station) => {
    const bitrate = station.bitrate || 0;
    if (bitrate <= 0) return false;
    if (max === null) return bitrate >= min;
    return bitrate >= min && bitrate <= max;
  });
};

export const getQualityLabel = (tier: QualityTier) => qualityTiers[tier].label;

export const getQualityCounts = () =>
  (Object.keys(qualityTiers) as QualityTier[]).map((tier) => ({
    tier,
    label: qualityTiers[tier].label,
    count: getStationsByQuality(tier).length,
  }));

export const getCityGenreStations = (citySlug: string, genreSlug: string) =>
  getCityStations(citySlug).filter((station) => station.normalizedGenres.includes(genreSlug));

export const getCityGenreCombos = (cityLimit = 20, genreLimit = 5) =>
  getTopCities(cityLimit).flatMap((city) =>
    city.topGenres.slice(0, genreLimit).map((genre) => ({
      citySlug: city.citySlug,
      cityName: city.cityName,
      genreSlug: genre.slug,
      genreName: genre.name,
      count: genre.count,
    }))
  );

export const getRelatedStations = (station: EnrichedStation, max = 8): EnrichedStation[] => {
  const related: EnrichedStation[] = [];
  const used = new Set<string>([station.slug]);

  const sameCity = getCityStations(station.citySlug);
  for (const candidate of sameCity) {
    if (used.has(candidate.slug)) continue;
    related.push(candidate);
    used.add(candidate.slug);
    if (related.length >= max) return related;
  }

  for (const genreSlug of station.normalizedGenres) {
    const sameGenre = getGenreStations(genreSlug);
    for (const candidate of sameGenre) {
      if (used.has(candidate.slug)) continue;
      related.push(candidate);
      used.add(candidate.slug);
      if (related.length >= max) return related;
    }
  }

  return related;
};

export const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: items.slice(start, end),
    totalPages,
    currentPage,
  };
};

export const formatBitrateSummary = (distribution: Record<string, number>) => {
  const ordered = bitrateBuckets.filter((bucket) => bucket !== 'unknown');
  const parts = ordered
    .map((bucket) => `${distribution[bucket] || 0} at ${bucket} kbps`)
    .filter((part) => !part.startsWith('0 '));
  return parts.length ? parts.join(', ') : 'bitrate data is limited.';
};

export const getTotalStationsCount = () => stationsAll.length;
