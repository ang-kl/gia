import React from 'react';
import { t, useLocale } from '../i18n.js';

// v0.60.55 — bottom-left FAB. Smart-detects whether to act as Back
// (pop history) or Close (close the WebApp). On the transport TMA
// users typically arrive via the chat's `Open MRT map` web_app
// button (fresh history) — they'll see 🔚 Close. If a future flow
// pushes a route into history, ⬅ Back appears instead.
export default function BackFab() {
  const lang = useLocale();
  const hasHistory = typeof window !== 'undefined' && window.history.length > 1;
  const onClick = () => {
    const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (w && typeof w.close === 'function') {
      w.close();
    }
  };
  return (
    // v0.60.95 — text label (back / end) standardised across TMAs.
    <button
      type="button"
      onClick={onClick}
      aria-label={hasHistory ? t('fab.backAria', lang) : t('fab.endAria', lang)}
      style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f', bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      className="fixed left-4 px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 z-50 whitespace-nowrap"
    >
      <span aria-hidden="true">{hasHistory ? '⇠' : '🔚'}</span>
      <span>{hasHistory ? t('fab.back', lang) : t('fab.end', lang)}</span>
    </button>
  );
}
