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
    <button
      type="button"
      onClick={onClick}
      aria-label={hasHistory ? 'Back' : 'Close'}
      style={{ backgroundColor: 'var(--tg-text)', color: 'var(--tg-bg)' }}
      className={`${inline ? 'pointer-events-auto' : 'fixed bottom-4 left-4 z-50'} w-8 h-8 rounded-t-md rounded-b-[16px] border border-tg-border shadow-md text-base flex items-center justify-center active:scale-95`}
    >
      <span aria-hidden="true">{hasHistory ? '⬅' : '🔚'}</span>
    </button>
  );
}
