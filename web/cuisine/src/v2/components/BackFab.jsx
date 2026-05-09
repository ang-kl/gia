import React from 'react';

// v0.60.53 — small in-app floating ⬅ button. Telegram's chrome
// BackButton (wired in api/tg.js) is hidden in fullscreen on iPad,
// and even when visible some users don't notice it. The FAB is an
// always-on-screen affordance that mirrors the same handler: pop
// history if there is one, otherwise close the WebApp. Mirror image
// of the bottom-right FAB stack so the layout stays balanced.
export default function BackFab() {
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
      aria-label="Back"
      className="fixed bottom-4 left-4 w-8 h-8 rounded-full bg-tg-card text-tg-text border border-tg-border shadow-md text-base flex items-center justify-center active:scale-95 z-30"
    >
      <span aria-hidden="true">⬅</span>
    </button>
  );
}
