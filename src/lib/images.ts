/** Mapa categoría → imagen local. Las imágenes viven en /public/img/categorias/. */

import recipeImagesData from './recipe-images.json' with { type: 'json' };

export interface CategoryImage {
  base: string;   // /img/categorias/arroces.jpg (1600w)
  sm: string;     // -sm.jpg  (480w)
  lg: string;     // -lg.jpg  (1280w)
  alt: string;
}

export interface RecipeImage {
  src: string;          // ej: /img/recetas/0001-tortilla.webp ó /img/categorias/arroces.jpg
  alt: string;
  source: 'pdf' | 'category';   // de dónde sale la imagen
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

/* ---------- imágenes por receta ---------- */

interface RecipeImageEntry {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  source: 'pdf' | 'missing';
  image: string | null;       // filename (ej: 0001-tortilla.webp)
  image_path: string | null;  // ruta web (ej: /img/recetas/0001-tortilla.webp)
}

const RECIPE_IMAGES: RecipeImageEntry[] = recipeImagesData as RecipeImageEntry[];
const RECIPE_IMG_BY_ID = new Map<number, RecipeImageEntry>(
  RECIPE_IMAGES.map((e) => [e.id, e]),
);

/**
 * Foto representativa para una receta concreta.
 *
 * Si tenemos una foto extraída del PDF en /img/recetas/{id:04}-{slug}.webp
 * la usamos. Si no, caemos a la imagen de su categoría (/img/categorias/...).
 *
 * Pasar `id` cuando se conozca; en ese caso `slug` y `category` se ignoran y
 * se sacan del manifest. Si solo tenemos `slug` + `category`, intenta resolver
 * por slug y, si falla, usa la categoría.
 */
export function recipeImage(
  id: number | null | undefined,
  title: string | null | undefined,
  category: string | null | undefined,
): RecipeImage {
  let entry: RecipeImageEntry | undefined;
  if (typeof id === 'number') {
    entry = RECIPE_IMG_BY_ID.get(id);
  }

  if (entry && entry.image_path) {
    return {
      src: entry.image_path,
      alt: entry.title,
      source: 'pdf',
    };
  }

  // fallback: imagen de la categoría
  const cat = categoryImage(category ?? entry?.category ?? null);
  return {
    src: cat.lg,                       // 1280w por defecto
    alt: title ?? entry?.title ?? cat.alt,
    source: 'category',
  };
}
