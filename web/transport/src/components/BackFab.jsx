import React from 'react';

// v0.60.55 — bottom-left FAB. Smart-detects whether to act as Back
// (pop history) or Close (close the WebApp). On the transport TMA
// users typically arrive via the chat's `Open MRT map` web_app
// button (fresh history) — they'll see 🔚 Close. If a future flow
// pushes a route into history, ⬅ Back appears instead.
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
      style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f' }}
      className="fixed bottom-4 left-4 w-8 h-8 rounded-t-md rounded-b-[16px] border border-tg-border shadow-md text-base flex items-center justify-center active:scale-95 z-50"
    >
      <span aria-hidden="true">{hasHistory ? '⬅' : '🔚'}</span>
    </button>
  );
}
