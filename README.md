# e-radio-greece.github.io

SEO-first Astro site for Greek radio stations, optimized for static rendering and GitHub Pages.

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`   |
| `npm run build`   | Build production site to `./dist/`           |
| `npm run preview` | Preview the production build locally         |
| `npm run validate-seo` | Validate sitemap and SEO output       |

## Adding stations

1. Open [src/data/stations.json](src/data/stations.json).
2. Append a new station using the existing schema.
3. Ensure `slug` is unique and authoritative.
4. Use a city name in `state` and keep genres as lowercase strings.

## SEO checklist

- Every page has a unique title and description.
- Canonical URLs resolve to the production domain.
- Pagination includes rel prev/next and unique intro sentences.
- JSON-LD matches visible content.
- Sitemaps list all canonical URLs.
- robots.txt points to the sitemap index.

## Hub pages

The site includes static internal link hubs to improve crawlability and discovery:

- [/hubs/](https://e-radio-greece.github.io/hubs/) hub directory
- City letter hubs: `/city/letter/{a-z}`, `/city/letter/0-9`, `/city/letter/other`
- Genre letter hubs: `/genre/letter/{a-z}`, `/genre/letter/0-9`, `/genre/letter/other`
- [/hubs/top-cities/](https://e-radio-greece.github.io/hubs/top-cities/) (top 100 cities)
- [/hubs/top-genres/](https://e-radio-greece.github.io/hubs/top-genres/) (top 100 genres)
- [/quality/](https://e-radio-greece.github.io/quality/) bitrate clusters (low, standard, high, hd)
- [/hubs/city-genre/](https://e-radio-greece.github.io/hubs/city-genre/) top city/genre intersections

## Deployment

GitHub Pages deployment uses the workflow in .github/workflows/deploy.yml.
Push to main to build, validate, and deploy the site.
