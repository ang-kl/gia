// web/cuisine/src/v2/components/FunFactModal.jsx — v0.61.285
//
// Floating modal that surfaces a NLB-sourced SG food-history fact
// during the cuisine-search wait window. Operator (30-05 '26):
// "replace the current wait messages while curating results … a food-
// wiki on the city that the user are searching and the popup in the
// middle window … should look like floating and fun to read."
//
// Display contract (v0.61.285 Phase 1):
//   • Only renders when `visible && fact` are both truthy.
//   • Enforces a min display time (default 3 s) so a fast search
//     doesn't dismiss the modal mid-sentence.
//   • Caller decides when to flip `visible` to false (typically when
//     the search results land); the actual fade-out waits for the
//     min-display threshold to elapse.
//   • Body text is localised via `factBody(fact, lang)`.

import React, { useEffect, useRef, useState } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';
import { factBody, deviceFactLang } from '../lib/fun-facts.js';
// P1-d — shared dialog behaviour (focus trap / initial focus / Escape / restore).
import { useDialog } from '../../../../_shared/lib/use-dialog.js';

const DEFAULT_MIN_MS = 3000;

export default function FunFactModal({ fact, visible, minDisplayMs = DEFAULT_MIN_MS, onStop }) {
  const [lang] = useLocale();
  // Local `shown` state lets us hold the modal on screen past the
  // caller's `visible=false` flip until min-display elapses.
  const [shown, setShown] = useState(false);
  const mountedAtRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Bring it up the moment caller asks AND we have a fact.
  useEffect(() => {
    if (visible && fact && fact.id) {
      if (!shown) {
        setShown(true);
        mountedAtRef.current = Date.now();
      }
      // Cancel any pending hide — caller may flip visible back on
      // before the previous fade-out completed.
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }
  }, [visible, fact?.id, shown]);

  // When caller flips visible to false, respect the min-display
  // floor before actually hiding.
  useEffect(() => {
    if (visible || !shown) return undefined;
    const elapsed = Date.now() - (mountedAtRef.current || 0);
    const remaining = Math.max(0, minDisplayMs - elapsed);
    hideTimerRef.current = setTimeout(() => {
      setShown(false);
      mountedAtRef.current = null;
      hideTimerRef.current = null;
    }, remaining);
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [visible, shown, minDisplayMs]);

  // P1-d — modal dialog semantics: trap focus in the card while shown and
  // wire Escape to the only dismiss affordance this surface has (🛑 Stop —
  // the backdrop deliberately absorbs clicks without closing). When no
  // onStop is passed, Escape is a no-op and the trap/restore still apply.
  const panelRef = useDialog({ open: !!(shown && fact), onClose: onStop });

  if (!shown || !fact) return null;

  // v0.61.383 — the fact BODY localises to the device-region language
  // (e.g. a JP device shows the Japanese text), independent of the app's
  // en/fr UI chrome (header / "curating" / source labels stay on `lang`).
  // v0.62.x — operator: an EXPLICIT UI locale pick (中文/日本語/… via the toggle)
  // must drive the fact too. Prefer the selected `lang` when it isn't the
  // default 'en'; fall back to the device-region language otherwise (so a JP
  // device on the default UI still gets Japanese facts).
  const body = factBody(fact, (lang && lang !== 'en') ? lang : deviceFactLang());
  const sourceLabel = fact.source || 'NLB';

  return (
    // P1-d — was role="status": a backdrop-blocking, Stop-dismissible surface
    // is a modal dialog. The inner text keeps announcing via the aria-live
    // wrapper below; the container now carries the dialog contract.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gia-funfact-title"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 cursor-wait"
    >
      {/* v0.61.297 — backdrop now ABSORBS pointer events so the page
          underneath is non-clickable while the fact + search are in
          flight (matches the rotating-titles overlay's prior
          behaviour). The search continues running; only user
          interaction with the underlying page is blocked. */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-hidden="true"
        onClick={(e) => e.stopPropagation()}
      />
      {/* v0.61.286 — operator: "for dark mode, the contrast in border
          for this wait message must be obvious." Default border-tg-border
          (1px) was barely visible against the dark-mode tg-bg → tg-card
          delta. Bumped to a 2px tg-accent frame: pops clearly in dark
          mode, still tasteful in light. ring offset adds an extra subtle
          halo so the modal reads as "floating" per the operator's
          v0.61.285 brief. */}
      <div
        ref={panelRef}
        className="relative max-w-[360px] w-full rounded-2xl border-2 border-tg-accent bg-tg-card shadow-2xl ring-1 ring-tg-accent/30 ring-offset-2 ring-offset-transparent px-4 py-3.5 pointer-events-auto"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span aria-hidden="true" className="text-base leading-none">💡</span>
          <span id="gia-funfact-title" className="text-xs font-semibold text-tg-text">
            {tr('funfact.header', lang)}
          </span>
        </div>
        <p className="text-[13px] leading-snug text-tg-text whitespace-pre-line">
          {body}
        </p>
        {/* v0.62.81 — operator: the progressive first-result name belongs ONLY
            under the "Finding eateries…" overlay, NOT on the fun-fact card. The
            firstResultName line (v0.62.78) was removed here on purpose. */}
        {/* v0.62.x — operator: single footer row below the divider, three
            columns spread — "••• Finding eateries…" · "Source: Wikipedia" ·
            [🛑 Stop]. The Stop button moved up from its own line into this row.
            Logic unchanged (operator: "don't change the logic"). */}
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-tg-border">
          <span className="text-[10px] text-tg-hint inline-flex items-center gap-1 min-w-0">
            <span className="inline-flex gap-0.5 shrink-0" aria-hidden="true">
              <span className="inline-block w-1 h-1 rounded-full bg-tg-hint animate-pulse" />
              <span className="inline-block w-1 h-1 rounded-full bg-tg-hint animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="inline-block w-1 h-1 rounded-full bg-tg-hint animate-pulse" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="truncate">{tr('funfact.curating', lang)}</span>
          </span>
          {fact.sourceUrl ? (
            <a
              href={fact.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-tg-hint underline decoration-dotted hover:text-tg-text shrink-0 pointer-events-auto"
            >
              {tr('funfact.sourceLabel', lang)}: {sourceLabel}
            </a>
          ) : (
            <span className="text-[10px] text-tg-hint shrink-0">
              {tr('funfact.sourceLabel', lang)}: {sourceLabel}
            </span>
          )}
          {/* Stop aborts the in-flight search; whatever already streamed stays. */}
          {onStop && (
            <button type="button" onClick={onStop}
              className="shrink-0 px-2.5 py-1 rounded-full border-[0.5px] border-tg-warn text-[10px] text-tg-text hover:bg-tg-bg pointer-events-auto">
              {tr('funfact.stop', lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
