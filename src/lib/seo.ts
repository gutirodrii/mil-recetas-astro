/** Helpers SEO: meta description, JSON-LD Recipe, BreadcrumbList. */

const SITE = (import.meta.env.PUBLIC_SITE_URL || 'https://mil-recetas.com').replace(/\/$/, '');
export const SITE_NAME = 'milrecetas';

export function siteUrl(path: string): string {
  return `${SITE}${path.startsWith('/') ? path : '/' + path}`;
}

export function truncate(text: string, n = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= n) return clean;
  return clean.slice(0, n - 1).trimEnd() + '…';
}

export function metaDescription(title: string, instructions: string, category: string | null): string {
  const lead = `Receta de ${title}${category ? ` (${category})` : ''}. `;
  return truncate(lead + instructions, 160);
}

interface RecipeForLd {
  id: number;
  title: string;
  category: string | null;
  servings_n: number | null;
  servings_text: string | null;
  total_time_min: number | null;
  instructions: string;
  ingredients: Array<{ raw_text: string; name: string }>;
  url: string;
  image: string;
  extraImages?: string[];
  video?: {
    youtubeId: string;
    title?: string | null;
    uploadDate?: string | null;
    description?: string | null;
  } | null;
}

export function splitSteps(instructions: string): string[] {
  return instructions
    .split(/\n+|(?<=\.)\s+(?=\d+[\.\)])/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean);
}

function stepName(text: string, idx: number): string {
  const firstSentence = text.split(/[.;]/)[0].trim();
  const short = firstSentence.length > 60 ? firstSentence.slice(0, 57).trimEnd() + '…' : firstSentence;
  return short || `Paso ${idx + 1}`;
}

function buildKeywords(title: string, category: string | null, ingredients: Array<{ name: string }>): string {
  const names = ingredients
    .map((i) => (i.name || '').trim().toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(names)).slice(0, 6);
  const parts = [title.toLowerCase(), category?.toLowerCase(), ...unique].filter(Boolean) as string[];
  return Array.from(new Set(parts)).join(', ');
}

export function recipeJsonLd(r: RecipeForLd): string {
  const steps = splitSteps(r.instructions);
  const images = [r.image, ...(r.extraImages ?? []).map((u) => (u.startsWith('http') ? u : siteUrl(u)))];
  const description = truncate(r.instructions, 250);

  const video = r.video
    ? {
        '@type': 'VideoObject',
        name: r.video.title || `Vídeo tutorial: ${r.title}`,
        description: r.video.description || description,
        thumbnailUrl: `https://i.ytimg.com/vi/${r.video.youtubeId}/hqdefault.jpg`,
        uploadDate: r.video.uploadDate || new Date().toISOString().slice(0, 10),
        embedUrl: `https://www.youtube.com/embed/${r.video.youtubeId}`,
        contentUrl: `https://www.youtube.com/watch?v=${r.video.youtubeId}`,
      }
    : undefined;

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Recipe',
    name: r.title,
    image: images,
    description,
    recipeCategory: r.category ?? undefined,
    recipeCuisine: 'Española',
    recipeYield: r.servings_text ?? (r.servings_n ? `${r.servings_n} raciones` : undefined),
    totalTime: r.total_time_min ? `PT${r.total_time_min}M` : undefined,
    keywords: buildKeywords(r.title, r.category, r.ingredients),
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE,
    },
    recipeIngredient: r.ingredients.map((i) => i.raw_text || i.name),
    recipeInstructions: steps.map((text, idx) => ({
      '@type': 'HowToStep',
      name: stepName(text, idx),
      text,
      url: `${r.url}#paso-${idx + 1}`,
    })),
    url: r.url,
    inLanguage: 'es',
    video,
  };
  return JSON.stringify(ld);
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): string {
  return JSON.stringify({
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  });
}

export function collectionJsonLd(name: string, description: string, url: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org/',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    inLanguage: 'es',
  });
}

import { categoryImage } from './images';

export function ogImageFor(category: string | null): string {
  return siteUrl(categoryImage(category).base);
}
