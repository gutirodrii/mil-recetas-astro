const API = (import.meta.env.PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/$/, '');

export interface RecipeSummary {
  id: number;
  title: string;
  category: string | null;
  servings_n?: number | null;
  total_time_min?: number | null;
}

export interface CategoryInfo {
  id: number;
  name: string;
  slug?: string;
  recipe_count?: number;
}

export interface IngredientInfo {
  id: number;
  name: string;
  recipe_count?: number;
}

export interface RecipeDetail {
  id: number;
  title: string;
  category: string | null;
  servings_original: number | null;
  servings_text: string | null;
  servings_target: number | null;
  scale: number;
  total_time_min: number | null;
  difficulty: string | null;
  source_page: number | null;
  instructions: string;
  ingredients: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    raw_text: string;
    preparation: string | null;
    section: string | null;
  }>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export const api = {
  apiBase: API,

  seoRecipes: () => get<{ recipes: RecipeSummary[] }>('/api/seo/recipes'),
  seoCategories: () => get<{ categories: Array<CategoryInfo & { slug: string }> }>('/api/seo/categories'),
  seoTopIngredients: (limit = 200) =>
    get<{ ingredients: IngredientInfo[] }>(`/api/seo/ingredients/top?limit=${limit}`),
  seoFeatured: (limit = 12) =>
    get<{ recipes: RecipeSummary[] }>(`/api/seo/featured?limit=${limit}`),
  seoCategoryRecipes: (slug: string) =>
    get<{ recipes: RecipeSummary[] }>(`/api/seo/category/${encodeURIComponent(slug)}`),
  seoIngredientRecipes: (id: number) =>
    get<{ recipes: RecipeSummary[] }>(`/api/seo/ingredient/${id}`),

  recipe: (id: number) => get<RecipeDetail>(`/recipe/${id}`),

  recipeRating: (id: number) =>
    get<{ avg: number; count: number }>(`/api/recipes/${id}/rating`),
  relatedRecipes: (id: number, limit = 4) =>
    get<{ recipes: RecipeSummary[] }>(`/api/recipes/${id}/related?limit=${limit}`),
  popularRecipes: (limit = 4) =>
    get<{ recipes: RecipeSummary[] }>(`/api/recipes/popular?limit=${limit}`),
  topRatedRecipes: (limit = 4) =>
    get<{ recipes: RecipeSummary[] }>(`/api/recipes/top-rated?limit=${limit}`),
};
