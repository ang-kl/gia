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
  const positionClasses = inline
    ? 'pointer-events-auto'
    : 'fixed bottom-4 left-4 z-30';
  // v0.60.83 — aqua (#7FDBDB) for all three cuisine TMA FABs (Back/
  // End, ↑ top, 🔍 Search) per operator 2026-05-10: "use aqua colour
  // background for all three". Replaces v0.60.82's ice-blue. Dark text
  // (#1c1c1f) stays for contrast against the pale aqua across both
  // Telegram light + dark themes.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hasHistory ? 'Back' : 'Close'}
      style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f' }}
      className={`${positionClasses} w-8 h-8 rounded-t-md rounded-b-[16px] border border-tg-border shadow-md text-base flex items-center justify-center active:scale-95`}
    >
      <span aria-hidden="true">{hasHistory ? '⬅' : '🔚'}</span>
    </button>
  );
}
