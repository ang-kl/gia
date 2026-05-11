import React from 'react';

// v0.60.55 — bottom-left FAB. Smart-detects whether it should
// behave as Back (pop history) or Close (close the WebApp). On
// the menu hub specifically the user almost always sees 🔚 Close
// because the hub is the entry point — but if the user navigated
// to /app/menu via deep link from cuisine/hawker, history will
// have an entry and ⬅ Back will appear instead.
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
    // v0.60.91 — inverse theme colors + z-50 (see hawker BackFab).
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
