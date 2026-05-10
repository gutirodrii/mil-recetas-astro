import { useEffect, useRef, useState, useCallback } from 'react';
import { api, type RecipeSummary } from '../lib/api';
import RecipeModal from './RecipeModal';

interface Cat { id: number; name: string }
interface Ing { id: number; name: string }

interface Props {
  initialRecipes: RecipeSummary[];
  initialTotal: number;
}

const PAGE_SIZE = 30;

export default function Explore({ initialRecipes, initialTotal }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [must, setMust] = useState<string[]>([]);
  const [not, setNot] = useState<string[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>(initialRecipes);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalRecipeId, setModalRecipeId] = useState<number | null>(null);

  const [mustQuery, setMustQuery] = useState('');
  const [notQuery, setNotQuery] = useState('');
  const [mustSug, setMustSug] = useState<Ing[]>([]);
  const [notSug, setNotSug] = useState<Ing[]>([]);

  useEffect(() => {
    setHydrated(true);
    fetch(`${api.apiBase}/categories`)
      .then((r) => r.ok ? r.json() : { categories: [] })
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const buildQuery = useCallback((off: number) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    for (const m of must) p.append('must_have', m);
    for (const n of not) p.append('must_not_have', n);
    p.set('limit', String(PAGE_SIZE));
    p.set('offset', String(off));
    return p.toString();
  }, [q, category, must, not]);

  const fetchPage = useCallback(async (off: number, append: boolean) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${api.apiBase}/recipes?${buildQuery(off)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setTotal(d.total || 0);
      setRecipes((prev) => append ? [...prev, ...(d.recipes || [])] : (d.recipes || []));
      setOffset(off);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // Reload on filter change (debounced via timer below)
  const reloadTimer = useRef<number | null>(null);
  const filterKey = `${q}|${category}|${must.join(',')}|${not.join(',')}`;
  useEffect(() => {
    if (!hydrated) return;
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => {
      fetchPage(0, false);
    }, 200);
    return () => { if (reloadTimer.current) window.clearTimeout(reloadTimer.current); };
  }, [filterKey, hydrated, fetchPage]);

  // Suggest hooks
  useSuggest(mustQuery, setMustSug);
  useSuggest(notQuery, setNotSug);

  const addChip = (kind: 'must' | 'not', name: string) => {
    const v = name.trim();
    if (!v) return;
    if (kind === 'must') {
      if (!must.includes(v)) setMust([...must, v]);
      setMustQuery('');
      setMustSug([]);
    } else {
      if (!not.includes(v)) setNot([...not, v]);
      setNotQuery('');
      setNotSug([]);
    }
  };

  const removeChip = (kind: 'must' | 'not', name: string) => {
    if (kind === 'must') setMust(must.filter((x) => x !== name));
    else setNot(not.filter((x) => x !== name));
  };

  const clear = () => {
    setQ('');
    setCategory('');
    setMust([]);
    setNot([]);
    setMustQuery('');
    setNotQuery('');
  };

  const shown = recipes.length;
  const hasMore = shown < total;

  return (
    <div className="exp">
      <aside className="exp__filters">
        <h2>Filtros</h2>

        <label className="exp__label">
          Buscar
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="palabras clave…"
          />
        </label>

        <label className="exp__label">
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">— cualquiera —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </label>

        <FilterField
          label="Tengo (incluir)"
          query={mustQuery}
          setQuery={setMustQuery}
          suggestions={mustSug}
          chips={must}
          onAdd={(n) => addChip('must', n)}
          onRemove={(n) => removeChip('must', n)}
        />

        <FilterField
          label="Sin (excluir)"
          query={notQuery}
          setQuery={setNotQuery}
          suggestions={notSug}
          chips={not}
          onAdd={(n) => addChip('not', n)}
          onRemove={(n) => removeChip('not', n)}
        />

        <button className="exp__clear" type="button" onClick={clear}>Limpiar</button>
      </aside>

      <section className="exp__results">
        <div className="exp__count">
          {total ? `${total} receta${total === 1 ? '' : 's'}` : (loading ? 'Cargando…' : 'Sin resultados')}
        </div>
        {err && <p className="exp__error">Error: {err}</p>}
        <div className="exp__cards">
          {recipes.map((r) => (
            <button
              key={r.id}
              type="button"
              className="exp__card"
              onClick={() => setModalRecipeId(r.id)}
            >
              <div className="exp__card-title">{r.title}</div>
              <div className="exp__card-meta">
                {r.category || '—'}
                {r.servings_n ? ` · ${r.servings_n} raciones` : ''}
                {r.total_time_min ? ` · ${r.total_time_min} min` : ''}
              </div>
            </button>
          ))}
        </div>
        {hasMore && (
          <button
            className="exp__more"
            type="button"
            disabled={loading}
            onClick={() => fetchPage(offset + PAGE_SIZE, true)}
          >
            {loading ? 'Cargando…' : 'Ver más'}
          </button>
        )}
      </section>

      {modalRecipeId != null && (
        <RecipeModal
          recipeId={modalRecipeId}
          onClose={() => setModalRecipeId(null)}
        />
      )}
    </div>
  );
}

function useSuggest(query: string, setSug: (s: Ing[]) => void) {
  const tref = useRef<number | null>(null);
  useEffect(() => {
    if (tref.current) window.clearTimeout(tref.current);
    if (!query || query.length < 2) {
      setSug([]);
      return;
    }
    tref.current = window.setTimeout(async () => {
      try {
        const r = await fetch(`${api.apiBase}/ingredients?q=${encodeURIComponent(query)}&limit=8`);
        if (!r.ok) return;
        const d = await r.json();
        setSug(d.ingredients || []);
      } catch {}
    }, 150);
    return () => { if (tref.current) window.clearTimeout(tref.current); };
  }, [query]);
}

interface FieldProps {
  label: string;
  query: string;
  setQuery: (s: string) => void;
  suggestions: Ing[];
  chips: string[];
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
}

function FilterField({ label, query, setQuery, suggestions, chips, onAdd, onRemove }: FieldProps) {
  return (
    <div className="exp__field">
      <label className="exp__label">{label}</label>
      <div className="exp__chips">
        {chips.map((n) => (
          <span key={n} className="exp__chip">
            {n}
            <button onClick={() => onRemove(n)} aria-label={`Quitar ${n}`}>×</button>
          </span>
        ))}
      </div>
      <div className="exp__suggest">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd(suggestions[0]?.name || query);
            }
          }}
          placeholder="empieza a escribir…"
        />
        {suggestions.length > 0 && (
          <ul className="exp__suggest-list">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onAdd(s.name); }}>
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
