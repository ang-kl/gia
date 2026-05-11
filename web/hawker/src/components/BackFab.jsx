import React from 'react';
import { t, useLocale } from '../i18n.js';

// v0.60.55 — single bottom-left FAB that detects context and shows
// the right semantic per Human Lead 2026-05-09 ("is end and back
// too confusing, can you detect the difference"):
//   • window.history.length > 1  → ⬅ Back (pop history)
//   • otherwise                   → 🔚 Close (close the WebApp)
// One affordance, two meanings — the icon + aria-label tell the
// user which one applies right now, so it never looks like the
// other action is also lurking.
// v0.60.91 — inverse theme colors per operator 2026-05-11 (day:
// dark bg + light icon, night: light bg + dark icon). Bumped z-50
// so the FAB sits above embedded map controls that previously
// caught the tap.
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
      aria-label={hasHistory ? t('btn.fabBackAria', lang) : t('btn.fabEndAria', lang)}
      style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f', bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      className="fixed left-4 px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 z-50 whitespace-nowrap"
    >
      <span aria-hidden="true">{hasHistory ? '⇠' : '🔚'}</span>
      <span>{hasHistory ? t('btn.fabBack', lang) : t('btn.fabEnd', lang)}</span>
    </button>
  );
}
