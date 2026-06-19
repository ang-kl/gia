import React from 'react';

// v0.62.213 — operator (IMG_1069 item 6): one standardised footer control across
// the Menu / Train / Hawker TMAs, mirroring the Cuisine TMA's footer — a single
// fixed bottom-right row that combines ⇡ top / ⇣ down  ·  ↩ back / 🔚 end. This
// replaces the two separate aqua corner FABs (BackFab + scroll FAB) on Menu /
// Hawker and the vertical merged FAB on Train, so all three read the same way.
//
// Cuisine's footer-row styling: text-tg-link, px-2 rounded-lg buttons; a thin
// divider separates the two clusters. back/end self-detects (history.back vs
// Telegram close), exactly like the old BackFab. `atBottom` is owned by each app
// (it already tracks scroll for the FAB) and passed in; `labels` is passed in too
// because the three apps' i18n keys differ (btn.fab* on Menu/Hawker, fab.* on
// Train). Byte-identical across web/menu, web/transport, web/hawker — edit one,
// copy to the others.
export default function FooterNav({ atBottom, labels }) {
  const hasHistory = typeof window !== 'undefined' && window.history.length > 1;
  const onBackEnd = () => {
    const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (w && typeof w.close === 'function') {
      w.close();
    }
  };
  return (
    <div
      className="fixed right-3 z-50 pointer-events-auto rounded-2xl bg-tg-bg/95 backdrop-blur border border-tg-border shadow-lg px-1 py-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-tg-link"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: atBottom ? 0 : window.scrollY + window.innerHeight, behavior: 'smooth' })}
        aria-label={atBottom ? labels.topAria : labels.downAria}
        className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
      >{atBottom ? labels.top : labels.down}</button>
      <div className="w-px self-stretch bg-tg-border/50" aria-hidden="true" />
      <button
        type="button"
        onClick={onBackEnd}
        aria-label={hasHistory ? labels.backAria : labels.endAria}
        className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
      >{hasHistory ? `⇠ ${labels.back}` : `🔚 ${labels.end}`}</button>
    </div>
  );
}
