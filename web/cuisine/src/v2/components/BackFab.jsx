import React from 'react';
import { t, useLocale } from '../lib/i18n.js';

// v0.60.55 — single bottom-left FAB that detects context and shows
// the right semantic per Human Lead 2026-05-09:
//   • window.history.length > 1  → ⬅ Back (pop history)
//   • otherwise                   → 🔚 Close (close the WebApp)
// v0.60.58 — bowl shape (rounded-t-md rounded-b-[16px]) per Human
// Lead. Supports `inline` mode so the cuisine TMA can place it in a
// shared bottom-row container alongside the right-stack FABs (back
// + search were drifting in vertical alignment as separate fixed
// elements; a shared row makes alignment by construction).
// v0.60.141 — `closeOnly`: for SPA-style TMAs that never pushState
// (the Cuisine TMA only ever replaceState's the URL hash), the
// `history.length > 1` heuristic is wrong — the >1 comes from the
// `/app/cuisine` → v2-app redirect on entry, not from in-app
// navigation — so a tap the user means as "end" did `history.back()`
// (pop the redirect entry / spin in place) and never closed the Mini
// App. With `closeOnly` the FAB always calls Telegram WebApp.close()
// (twice — `close()` is itself a bit flaky on Telegram Desktop/macOS;
// the second call is a harmless no-op if the webview already shut).
// v0.60.154 — explicit `mode` prop + `onBack` callback. The Cuisine TMA
// now drives this FAB by client-side page-history state (App.jsx pages
// + cursor): when there's prior pages cached locally, it passes
// mode='back' + onBack=stepCursor; otherwise mode='close'. This bypasses
// the unreliable window.history heuristic for SPA-style mounts and keeps
// the same visual semantics (⇠ back vs 🔚 end). `closeOnly` is retained
// for backwards compatibility with any other caller.
export default function BackFab({ inline = false, closeOnly = false, mode = null, onBack = null }) {
  const lang = useLocale();
  const effectiveMode = mode
    || (closeOnly ? 'close'
        : (typeof window !== 'undefined' && window.history.length > 1 ? 'back' : 'close'));
  const hasHistory = effectiveMode === 'back';
  const onClick = () => {
    if (hasHistory) {
      if (typeof onBack === 'function') {
        onBack();
        return;
      }
      window.history.back();
      return;
    }
    const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (w && typeof w.close === 'function') {
      try { w.close(); } catch { /* webview tearing down */ }
      setTimeout(() => { try { w.close(); } catch { /* noop */ } }, 350);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();   // not inside Telegram → at least leave the page
    }
  };
  // v0.60.91 — inverse theme colors per operator 2026-05-11: "grey
  // on white text when day time and when toggle to dark mode, change
  // to white background". Use var(--tg-text) as background and
  // var(--tg-bg) as icon — day: dark FAB + light icon (high contrast
  // against white result cards), night: light FAB + dark icon
  // (visible against dark page). Bumped z-50 so the FAB sits above
  // any embedded map controls that previously caught the tap.
  // v0.62.670 — SUPERSEDED (comment was stale, code was right): the fixed
  // teal #7FDBDB FAB shipped byte-identical across all four TMAs, and the
  // operator confirmed on the Phase 2b decision round (31-07 '26, Register
  // O-85 item 1) that the TEAL STANDARD stands — the inverse-theme wording
  // above is the superseded half, kept verbatim for trace (AU-7).
  return (
    // v0.60.95 — text label per operator: "Navigation 'down' 'top'
    // 'end' should be standard for all TMA". BackFab renders glyph
    // + text ('⬅ back' or '🔚 end'). Width grows with content via
    // `px-2 min-w-8`; height stays 32 px so the bottom row aligns
    // with the scroll + search FABs in the cuisine TMA.
    <button
      type="button"
      onClick={onClick}
      aria-label={hasHistory ? t('btn.fabBackAria', lang) : t('btn.fabEndAria', lang)}
      style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f', ...(inline ? {} : { bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }) }}
      className={`${inline ? 'pointer-events-auto' : 'fixed left-4 z-50'} px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap`}
    >
      <span aria-hidden="true">{hasHistory ? '⇠' : '🔚'}</span>
      <span>{hasHistory ? t('btn.fabBack', lang) : t('btn.fabEnd', lang)}</span>
    </button>
  );
}
