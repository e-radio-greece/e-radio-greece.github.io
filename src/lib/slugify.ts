const greekMap: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th',
  ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
  ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

const transliterateGreek = (input: string): string => {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  let result = '';
  for (const char of normalized) {
    if (greekMap[char]) {
      result += greekMap[char];
    } else {
      result += char;
    }
  }
  return result;
};

export const slugify = (input: string): string => {
  if (!input) return 'unknown';
  const transliterated = transliterateGreek(input);
  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase() || 'unknown';
};

export const normalizeGenre = (genre: string): string => slugify((genre || '').toLowerCase());

export const titleFromSlug = (slug: string): string =>
  slug
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
