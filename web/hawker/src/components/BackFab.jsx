import React from 'react';

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
    <button
      type="button"
      onClick={onClick}
      aria-label={hasHistory ? 'Back' : 'Close'}
      style={{ backgroundColor: 'var(--tg-text)', color: 'var(--tg-bg)' }}
      className="fixed bottom-4 left-4 w-8 h-8 rounded-t-md rounded-b-[16px] border border-tg-border shadow-md text-base flex items-center justify-center active:scale-95 z-50"
    >
      <span aria-hidden="true">{hasHistory ? '⬅' : '🔚'}</span>
    </button>
  );
}
