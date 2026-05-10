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
}

export function recipeJsonLd(r: RecipeForLd): string {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Recipe',
    name: r.title,
    image: [r.image],
    description: truncate(r.instructions, 250),
    recipeCategory: r.category ?? undefined,
    recipeYield: r.servings_text ?? (r.servings_n ? `${r.servings_n} raciones` : undefined),
    totalTime: r.total_time_min ? `PT${r.total_time_min}M` : undefined,
    recipeIngredient: r.ingredients.map((i) => i.raw_text || i.name),
    recipeInstructions: r.instructions
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ '@type': 'HowToStep', text })),
    url: r.url,
    inLanguage: 'es',
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
