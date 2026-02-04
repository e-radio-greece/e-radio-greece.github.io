export const siteOrigin = () => import.meta.env.SITE || 'https://e-radio-greece.github.io';

export const buildUrl = (path: string) => {
  const site = siteOrigin();
  const base = import.meta.env.BASE_URL || '/';
  const normalizedPath = path.replace(/^\//, '');
  const basePath = base.endsWith('/') ? base : `${base}/`;
  return new URL(basePath + normalizedPath, site).toString();
};

export const toAbsoluteUrl = (path: string) => buildUrl(path);

export const pageTitle = (title: string) => `${title} | E-Radio Greece`;

export const truncate = (value: string, max = 160) =>
  value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;

export const buildHreflangLinks = (canonical: string) => [
  { hreflang: 'en', href: canonical },
];
