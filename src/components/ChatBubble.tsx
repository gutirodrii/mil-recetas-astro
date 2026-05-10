import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import RecipeModal from './RecipeModal';

type Role = 'user' | 'assistant' | 'tool' | 'system';
interface Msg { role: Role; content: string }
interface ToolEv { kind: 'tool'; name: string; args?: any }
interface CardsEv { kind: 'cards'; recipes: RecipeCard[] }
interface ErrEv { kind: 'error'; text: string }
type StreamItem = Msg | ToolEv | CardsEv | ErrEv;

interface RecipeCard {
  id: number;
  title: string;
  category: string | null;
  servings_n?: number | null;
}

const TOOL_LABELS: Record<string, string> = {
  search_recipes: 'buscando recetas',
  get_recipe_detail: 'consultando receta',
  check_ingredient: 'comprobando ingrediente',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

function renderMarkdown(src: string): string {
  let s = escapeHtml(src);
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  const lines = s.split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  const flush = () => {
    if (listType) {
      out.push(`<${listType}>${listItems.map((i) => `<li>${i}</li>`).join('')}</${listType}>`);
      listType = null;
      listItems = [];
    }
  };
  for (const line of lines) {
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul) { if (listType !== 'ul') flush(); listType = 'ul'; listItems.push(ul[1]); }
    else if (ol) { if (listType !== 'ol') flush(); listType = 'ol'; listItems.push(ol[1]); }
    else { flush(); out.push(line); }
  }
  flush();
  s = out.join('\n');
  return s.split(/\n{2,}/)
    .map((b) => /^<(ul|ol|p|pre|h\d|blockquote)/.test(b.trim())
      ? b
      : `<p>${b.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function* parseSSE(response: Response): AsyncGenerator<any> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data) {
            try { yield JSON.parse(data); } catch {}
          }
        }
      }
    }
  }
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StreamItem[]>([]);
  const [history, setHistory] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [modalRecipeId, setModalRecipeId] = useState<number | null>(null);
  const [targetServings, setTargetServings] = useState<number | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  useEffect(() => { if (open) scrollToBottom(); }, [items, open]);

  useEffect(() => {
    fetch(`${api.apiBase}/chat/suggestions`)
      .then((r) => r.ok ? r.json() : { suggestions: [] })
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && modalRecipeId == null) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, modalRecipeId]);

  const detectServings = (text: string) => {
    const m = text.match(/\bpara\s+(\d+)\s*(personas|comensales|raciones)\b/i);
    if (m) setTargetServings(parseInt(m[1], 10));
  };

  const send = async (text: string) => {
    if (streaming || !text.trim()) return;
    setStreaming(true);
    detectServings(text);

    const userMsg: Msg = { role: 'user', content: text };
    const newHist = [...history, userMsg];
    setHistory(newHist);
    setItems((prev) => [...prev, userMsg]);

    let assistantText = '';
    let assistantIdx = -1;

    try {
      const resp = await fetch(`${api.apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHist, conversation_id: conversationId }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      for await (const ev of parseSSE(resp)) {
        switch (ev.type) {
          case 'conversation':
            if (!conversationId) setConversationId(ev.id);
            break;
          case 'tool_call':
            setItems((prev) => [...prev, { kind: 'tool', name: ev.name, args: ev.args || {} }]);
            break;
          case 'tool_result':
            if (ev.name === 'search_recipes') {
              const inner = ev.result?.result;
              if (Array.isArray(inner) && inner.length) {
                setItems((prev) => [...prev, { kind: 'cards', recipes: inner.slice(0, 8) }]);
              }
            }
            break;
          case 'delta':
            assistantText += ev.text;
            setItems((prev) => {
              const next = [...prev];
              if (assistantIdx === -1) {
                assistantIdx = next.length;
                next.push({ role: 'assistant', content: assistantText });
              } else {
                next[assistantIdx] = { role: 'assistant', content: assistantText };
              }
              return next;
            });
            break;
          case 'error':
            setItems((prev) => [...prev, { kind: 'error', text: ev.error || 'unknown' }]);
            break;
        }
      }

      if (assistantText) {
        setHistory((prev) => [...prev, { role: 'assistant', content: assistantText }]);
      }
    } catch (e: any) {
      setItems((prev) => [...prev, { kind: 'error', text: e.message || String(e) }]);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    send(text);
  };

  const startNew = () => {
    if (streaming) return;
    setItems([]);
    setHistory([]);
    setConversationId(null);
    setTargetServings(null);
    inputRef.current?.focus();
  };

  const showSuggestions = !streaming && items.length === 0 && suggestions.length > 0;

  return (
    <>
      <button
        className={`cb-fab ${open ? 'cb-fab--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
        aria-expanded={open}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6L18 18M6 18L18 6" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      <div className={`cb-panel ${open ? 'cb-panel--open' : ''}`} role="dialog" aria-label="Chat de recetas" aria-hidden={!open}>
        <header className="cb-head">
          <div>
            <strong>Asistente</strong>
            <span className="cb-head__sub">recetas tradicionales</span>
          </div>
          <div className="cb-head__actions">
            {items.length > 0 && (
              <button className="cb-icon" onClick={startNew} aria-label="Nueva conversación" title="Nueva conversación">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
            <button className="cb-icon" onClick={() => setOpen(false)} aria-label="Cerrar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>
          </div>
        </header>

        <div className="cb-messages" ref={messagesRef} aria-live="polite">
          <div className="cb-messages__inner">
            {showSuggestions && (
              <div className="cb-welcome">
                <p className="cb-welcome__hi">¡Hola! 👋</p>
                <p className="cb-welcome__txt">Cuéntame qué tienes o qué te apetece. Algunos ejemplos:</p>
                <div className="cb-sugs">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="cb-sug" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {items.map((it, i) => {
              if ('kind' in it) {
                if (it.kind === 'tool') {
                  const args = it.args || {};
                  let extra = '';
                  if (args.query) extra = `: "${args.query}"`;
                  else if (args.recipe_id) extra = `: #${args.recipe_id}`;
                  else if (args.name) extra = `: ${args.name}`;
                  return <div key={i} className="cb-tool">· {TOOL_LABELS[it.name] || it.name}{extra}</div>;
                }
                if (it.kind === 'cards') {
                  return (
                    <div key={i} className="cb-cards">
                      {it.recipes.map((r) => (
                        <button key={r.id} type="button" className="cb-card" onClick={() => setModalRecipeId(r.id)}>
                          <div className="cb-card__title">{r.title}</div>
                          <div className="cb-card__meta">
                            {r.category || '—'}
                            {r.servings_n ? ` · ${r.servings_n} raciones` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                }
                if (it.kind === 'error') {
                  return <div key={i} className="cb-error">error: {it.text}</div>;
                }
              } else {
                const m = it as Msg;
                if (m.role === 'user') {
                  return <div key={i} className="cb-bubble cb-bubble--user">{m.content}</div>;
                }
                if (m.role === 'assistant') {
                  return (
                    <div
                      key={i}
                      className={`cb-bubble cb-bubble--assistant ${streaming && i === items.length - 1 ? 'is-streaming' : ''}`}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  );
                }
              }
              return null;
            })}
          </div>
        </div>

        <form className="cb-composer" onSubmit={submit} autoComplete="off">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(e as any);
              }
            }}
            placeholder="Escribe un mensaje…"
            rows={1}
            disabled={streaming}
            aria-label="Mensaje"
          />
          <button type="submit" disabled={streaming || !input.trim()} aria-label="Enviar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>

      {modalRecipeId != null && (
        <RecipeModal
          recipeId={modalRecipeId}
          initialServings={targetServings}
          onClose={() => setModalRecipeId(null)}
        />
      )}
    </>
  );
}
