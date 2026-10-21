import React from 'react';
import { t, useLocale } from '../i18n.js';

// v0.60.55 — bottom-left FAB.
// v0.61.75 — always 🔚 End / WebApp.close(). The menu hub is always the
// entry point of the webview session: the Cuisine/Hawker tiles navigate
// AWAY (window.location → separate apps) and nothing ever navigates
// INTO /app/menu, and the hub itself has no sub-views to pop. The old
// `window.history.length > 1` heuristic was wrong — history.length only
// ever grows, so after menu → Cuisine → close the hub kept showing
// ⇠ Back (and a tap ran history.back() into the closed Cuisine page)
// instead of 🔚 End.
export default function BackFab() {
  const lang = useLocale();
  const onClick = () => {
    // close() is a bit flaky on Telegram Desktop/macOS; the second
    // call is a harmless no-op if the webview already shut.
    const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (w && typeof w.close === 'function') {
      try { w.close(); } catch { /* webview tearing down */ }
      setTimeout(() => { try { w.close(); } catch { /* noop */ } }, 350);
    }
  };
  return (
    // v0.60.95 — text label (end) standardised across TMAs.
    <button
      type="button"
      onClick={onClick}
      aria-label={t('btn.fabEndAria', lang)}
      style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f', bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      className="fixed left-4 px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 z-50 whitespace-nowrap"
    >
      <span aria-hidden="true">🔚</span>
      <span>{t('btn.fabEnd', lang)}</span>
    </button>
  );
}
