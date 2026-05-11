import React from 'react';

// v0.60.55 — single bottom-left FAB that detects context and shows
// the right semantic per Human Lead 2026-05-09:
//   • window.history.length > 1  → ⬅ Back (pop history)
//   • otherwise                   → 🔚 Close (close the WebApp)
// v0.60.58 — bowl shape (rounded-t-md rounded-b-[16px]) per Human
// Lead. Supports `inline` mode so the cuisine TMA can place it in a
// shared bottom-row container alongside the right-stack FABs (back
// + search were drifting in vertical alignment as separate fixed
// elements; a shared row makes alignment by construction).
export default function BackFab({ inline = false }) {
  const hasHistory = typeof window !== 'undefined' && window.history.length > 1;
  const onClick = () => {
    const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (w && typeof w.close === 'function') {
      w.close();
    }
  };
  // v0.60.91 — inverse theme colors per operator 2026-05-11: "grey
  // on white text when day time and when toggle to dark mode, change
  // to white background". Use var(--tg-text) as background and
  // var(--tg-bg) as icon — day: dark FAB + light icon (high contrast
  // against white result cards), night: light FAB + dark icon
  // (visible against dark page). Bumped z-50 so the FAB sits above
  // any embedded map controls that previously caught the tap.
  return (
    // v0.60.95 — text label per operator: "Navigation 'down' 'top'
    // 'end' should be standard for all TMA". BackFab renders glyph
    // + text ('⬅ back' or '🔚 end'). Width grows with content via
    // `px-2 min-w-8`; height stays 32 px so the bottom row aligns
    // with the scroll + search FABs in the cuisine TMA.
    <button
      type="button"
      onClick={onClick}
      aria-label={hasHistory ? 'Back' : 'End'}
      style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f' }}
      className={`${inline ? 'pointer-events-auto' : 'fixed bottom-2 left-4 z-50'} px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap`}
    >
      <span aria-hidden="true">{hasHistory ? '⇠' : '🔚'}</span>
      <span>{hasHistory ? 'back' : 'end'}</span>
    </button>
  );
}
