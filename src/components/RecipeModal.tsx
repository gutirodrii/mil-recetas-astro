import { useEffect, useState, useCallback } from 'react';
import { api, type RecipeDetail } from '../lib/api';

interface Props {
  recipeId: number | null;
  initialServings?: number | null;
  onClose: () => void;
}

function fmtQty(q: number | null): string {
  if (q == null) return '';
  return parseFloat(q.toFixed(2)).toString();
}

export default function RecipeModal({ recipeId, initialServings, onClose }: Props) {
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [servings, setServings] = useState<number>(initialServings ?? 4);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (target: number | null) => {
    if (recipeId == null) return;
    try {
      const url = target ? `/recipe/${recipeId}?target_servings=${target}` : `/recipe/${recipeId}`;
      const res = await fetch(`${api.apiBase}${url}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RecipeDetail = await res.json();
      setRecipe(data);
      const s = data.servings_target || data.servings_original || 4;
      if (target == null) setServings(s);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }, [recipeId]);

  useEffect(() => {
    if (recipeId != null) {
      setError(null);
      setRecipe(null);
      load(initialServings ?? null);
    }
  }, [recipeId, initialServings, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (recipeId == null) return null;

  const adjust = (delta: number) => {
    const next = Math.max(1, servings + delta);
    setServings(next);
    load(next);
  };

  const sections: Record<string, RecipeDetail['ingredients']> = {};
  for (const ing of recipe?.ingredients ?? []) {
    const key = ing.section || '';
    (sections[key] ??= []).push(ing);
  }

  return (
    <div
      className="rm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="rm-modal">
        <button className="rm-close" aria-label="Cerrar" onClick={onClose}>×</button>
        {error && <p className="rm-error">No se pudo cargar: {error}</p>}
        {!recipe && !error && <p className="rm-loading">Cargando…</p>}
        {recipe && (
          <>
            <h2>{recipe.title}</h2>
            <div className="rm-meta">
              {recipe.category && <span>{recipe.category}</span>}
              {recipe.total_time_min && <span>{recipe.total_time_min} min</span>}
              {recipe.difficulty && <span>{recipe.difficulty}</span>}
              {recipe.source_page && <span>pág. {recipe.source_page}</span>}
              <span className="rm-servings">
                <button onClick={() => adjust(-1)} aria-label="Menos raciones">−</button>
                <span>{servings}</span>
                <button onClick={() => adjust(1)} aria-label="Más raciones">＋</button>
                <span className="rm-servings-label">raciones</span>
              </span>
            </div>
            <h3>Ingredientes</h3>
            {Object.keys(sections).length === 0 && <p>—</p>}
            {Object.entries(sections).map(([sec, items]) => (
              <div key={sec || 'main'}>
                {sec && <div className="rm-section-header">{sec}</div>}
                <ul className="rm-ingredients">
                  {items.map((ing, i) => {
                    const qty = ing.quantity != null
                      ? `${fmtQty(ing.quantity)}${ing.unit ? ' ' + ing.unit : ''}`
                      : (ing.raw_text || '');
                    return (
                      <li key={i}>
                        <span>
                          {ing.name}
                          {ing.preparation && <em className="rm-prep"> ({ing.preparation})</em>}
                        </span>
                        <span className="rm-qty">{qty}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <h3>Elaboración</h3>
            <div className="rm-instructions">{recipe.instructions}</div>
          </>
        )}
      </div>
    </div>
  );
}
