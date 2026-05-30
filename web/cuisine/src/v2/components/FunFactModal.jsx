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
import { factBody } from '../lib/fun-facts.js';

const DEFAULT_MIN_MS = 3000;

export default function FunFactModal({ fact, visible, minDisplayMs = DEFAULT_MIN_MS }) {
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

  if (!shown || !fact) return null;

  const body = factBody(fact, lang);
  const sourceLabel = fact.source || 'NLB';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
    >
      {/* Light backdrop — non-blocking; the search keeps running underneath. */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      {/* v0.61.286 — operator: "for dark mode, the contrast in border
          for this wait message must be obvious." Default border-tg-border
          (1px) was barely visible against the dark-mode tg-bg → tg-card
          delta. Bumped to a 2px tg-accent frame: pops clearly in dark
          mode, still tasteful in light. ring offset adds an extra subtle
          halo so the modal reads as "floating" per the operator's
          v0.61.285 brief. */}
      <div
        className="relative max-w-[360px] w-full rounded-2xl border-2 border-tg-accent bg-tg-card shadow-2xl ring-1 ring-tg-accent/30 ring-offset-2 ring-offset-transparent px-4 py-3.5 pointer-events-auto"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span aria-hidden="true" className="text-base leading-none">💡</span>
          <span className="text-xs font-semibold text-tg-text">
            {tr('funfact.header', lang)}
          </span>
        </div>
        <p className="text-[13px] leading-snug text-tg-text whitespace-pre-line">
          {body}
        </p>
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-tg-border">
          <span className="text-[10px] text-tg-hint inline-flex items-center gap-1">
            <span className="inline-flex gap-0.5" aria-hidden="true">
              <span className="inline-block w-1 h-1 rounded-full bg-tg-hint animate-pulse" />
              <span className="inline-block w-1 h-1 rounded-full bg-tg-hint animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="inline-block w-1 h-1 rounded-full bg-tg-hint animate-pulse" style={{ animationDelay: '300ms' }} />
            </span>
            {tr('funfact.curating', lang)}
          </span>
          {fact.sourceUrl ? (
            <a
              href={fact.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-tg-hint underline decoration-dotted hover:text-tg-text"
            >
              {tr('funfact.sourceLabel', lang)}: {sourceLabel}
            </a>
          ) : (
            <span className="text-[10px] text-tg-hint">
              {tr('funfact.sourceLabel', lang)}: {sourceLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
