/** Mapa categoría → imagen local. Las imágenes viven en /public/img/categorias/. */

export interface CategoryImage {
  base: string;   // /img/categorias/arroces.jpg (1600w)
  sm: string;     // -sm.jpg  (480w)
  lg: string;     // -lg.jpg  (1280w)
  alt: string;
}

const SLUGS: Record<string, string> = {
  'arroces': 'arroces',
  'carnes y aves': 'carnes-y-aves',
  'ensaladas': 'ensaladas',
  'entrantes': 'entrantes',
  'huevos': 'huevos',
  'legumbres': 'legumbres',
  'pastas y masas': 'pastas-y-masas',
  'pescados, mariscos y moluscos': 'pescados-mariscos-y-moluscos',
  'postres': 'postres',
  'sopas y cremas': 'sopas-y-cremas',
  'verduras, hortalizas y setas': 'verduras-hortalizas-y-setas',
};

const FALLBACK = 'hero';

function slugFor(category: string | null): string {
  if (!category) return FALLBACK;
  const k = category.toLowerCase().trim();
  if (SLUGS[k]) return SLUGS[k];
  for (const key of Object.keys(SLUGS)) {
    if (k.includes(key.split(' ')[0])) return SLUGS[key];
  }
  return FALLBACK;
}

export function categoryImage(category: string | null): CategoryImage {
  const slug = slugFor(category);
  const base = `/img/categorias/${slug}.jpg`;
  return {
    base,
    sm: `/img/categorias/${slug}-sm.jpg`,
    lg: `/img/categorias/${slug}-lg.jpg`,
    alt: category ?? 'milrecetas',
  };
}

export const heroImage: CategoryImage = {
  base: `/img/categorias/${FALLBACK}.jpg`,
  sm: `/img/categorias/${FALLBACK}-sm.jpg`,
  lg: `/img/categorias/${FALLBACK}-lg.jpg`,
  alt: 'mil recetas tradicionales',
};
