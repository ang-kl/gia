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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hasHistory ? 'Back' : 'Close'}
      className={`${positionClasses} w-8 h-8 rounded-t-md rounded-b-[16px] bg-tg-card text-tg-text border border-tg-border shadow-md text-base flex items-center justify-center active:scale-95`}
    >
      <span aria-hidden="true">{hasHistory ? '⬅' : '🔚'}</span>
    </button>
  );
}
