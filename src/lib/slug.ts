/** title -> kebab-case sin acentos. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** /receta/{id}-{slug} → id (slug es decorativo). */
export function parseIdSlug(param: string): number | null {
  const m = /^(\d+)(?:-.*)?$/.exec(param);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}

export function recipeUrl(id: number, title: string): string {
  return `/receta/${id}-${slugify(title)}`;
}

export function categoryUrl(slug: string): string {
  return `/categoria/${slug}`;
}

export function ingredientUrl(id: number, name: string): string {
  return `/ingrediente/${id}-${slugify(name)}`;
}
