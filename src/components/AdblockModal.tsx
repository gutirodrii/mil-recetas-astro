import { useEffect, useState } from 'react';

const COOKIE_NAME = 'mr_adblock_dismissed';
const COOKIE_DAYS = 7;
const BOT_RE = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|duckduck|baiduspider|facebookexternalhit|slurp|applebot/i;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

async function detectAdblock(): Promise<boolean> {
  const bait = document.createElement('div');
  bait.className = 'ads adsbox adsbygoogle ad-banner';
  bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
  bait.innerHTML = '&nbsp;';
  document.body.appendChild(bait);
  await new Promise((r) => setTimeout(r, 80));
  const baitBlocked =
    bait.offsetParent === null ||
    bait.offsetHeight === 0 ||
    bait.offsetWidth === 0 ||
    getComputedStyle(bait).display === 'none' ||
    getComputedStyle(bait).visibility === 'hidden';
  bait.remove();

  let fetchBlocked = false;
  try {
    await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
    });
  } catch {
    fetchBlocked = true;
  }
  return baitBlocked || fetchBlocked;
}

export default function AdblockModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && BOT_RE.test(navigator.userAgent)) return;
    if (readCookie(COOKIE_NAME)) return;
    let cancelled = false;
    detectAdblock().then((blocked) => {
      if (!cancelled && blocked) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) return null;

  const dismiss = () => {
    writeCookie(COOKIE_NAME, '1', COOKIE_DAYS);
    setOpen(false);
  };

  const reload = () => {
    writeCookie(COOKIE_NAME, '1', 1);
    location.reload();
  };

  return (
    <div className="adblock-modal" role="dialog" aria-modal="true" aria-labelledby="adblock-title">
      <div className="adblock-modal__backdrop" onClick={dismiss} />
      <div className="adblock-modal__card">
        <h2 id="adblock-title">Detectamos un bloqueador de anuncios</h2>
        <p>
          milrecetas es gratuito gracias a la publicidad. Si te apetece, desactiva el bloqueador en este sitio
          para apoyarnos. También puedes seguir leyendo igualmente.
        </p>
        <div className="adblock-modal__actions">
          <button type="button" className="btn" onClick={reload}>
            Ya lo desactivé · recargar
          </button>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Continuar igual
          </button>
        </div>
      </div>
    </div>
  );
}
