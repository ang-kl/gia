// ResultDrawer.jsx — v0.62.136
//
// Operator (17-06 '26): replace the music-app horizontal result CAROUSEL
// (v0.62.125-128) with a Google-Maps-style floating result DRAWER. When a
// result card or map pin is selected, a bottom sheet floats above the FAB
// cluster (the map fully visible behind it). It defaults to a VERTICAL
// scrolling list (the focused venue auto-scrolled into view + highlighted),
// and can flip to the old HORIZONTAL swipe-carousel via the ↰ / ↴ toggle FAB
// (rendered in App.jsx, above the 🔍 search FAB).
//
// Tapping any card selects it — the map recenters / zooms-17 / blinks via the
// existing focusedPlaceId wiring (v0.62.115). The ✕ button (or a tap on the
// empty map, wired via App→MapPanel onDeselect) returns to the list.
//
// Rendered at App top level as a fixed footer layer; the vertical ResultPanel
// stays below as the full scroll-down list.

import React, { useEffect, useRef } from 'react';
import ResultCard from './ResultCard.jsx';
import { useLocale } from '../lib/i18n.js';

export default function ResultDrawer({
  venues, focusedPlaceId, onSelect, onClose, specialMode = null,
  // v0.62.136 — 'vertical' (default, Google-Maps drawer) | 'horizontal'
  // (the legacy swipe-carousel). Driven by the ↰/↴ toggle FAB in App.jsx.
  mode = 'vertical'
}) {
  const [lang] = useLocale();
  const trackRef = useRef(null);
  const list = Array.isArray(venues) ? venues : [];

  // Bring the focused card into view whenever the selection (or mode) changes —
  // centred horizontally in carousel mode, centred vertically in drawer mode.
  // Smooth on update, instant on first open.
  const firstRef = useRef(true);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !focusedPlaceId) return;
    const el = track.querySelector(`[data-pid="${CSS && CSS.escape ? CSS.escape(focusedPlaceId) : focusedPlaceId}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({
        behavior: firstRef.current ? 'auto' : 'smooth',
        inline: mode === 'horizontal' ? 'center' : 'nearest',
        block: mode === 'horizontal' ? 'nearest' : 'center'
      });
    }
    firstRef.current = false;
  }, [focusedPlaceId, list.length, mode]);

  if (!list.length) return null;

  // Shared close pill (✕ list) — sits at the top-right of either layout.
  const closeBtn = (
    <button
      type="button"
      onClick={onClose}
      aria-label={lang === 'fr' ? 'Fermer' : 'Back to list'}
      className="pointer-events-auto text-[12px] leading-none px-2.5 py-1 rounded-full bg-tg-card/95 border border-tg-border text-tg-text shadow active:scale-95"
    >✕ {lang === 'fr' ? 'liste' : 'list'}</button>
  );

  // ── HORIZONTAL (legacy carousel) ───────────────────────────────────────────
  if (mode === 'horizontal') {
    return (
      <div className="fixed inset-x-0 bottom-16 z-30 px-1 pb-1 pointer-events-none max-w-[1600px] mx-auto">
        <div className="flex justify-end px-2 pb-1 pointer-events-none">{closeBtn}</div>
        <div
          ref={trackRef}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-[9%] pb-1 pointer-events-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {list.map((v, i) => (
            <div
              key={v.placeId || i}
              data-pid={v.placeId || ''}
              className="snap-center shrink-0 basis-[82%] max-h-[42vh] overflow-y-auto rounded-lg shadow-xl"
            >
              <ResultCard
                venue={v}
                number={i + 1}
                focused={v.placeId === focusedPlaceId}
                onTap={() => onSelect && onSelect(v.placeId)}
                specialMode={specialMode}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── VERTICAL (Google-Maps-style bottom-sheet drawer, default) ──────────────
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-1 pb-1 pointer-events-none max-w-[1600px] mx-auto">
      <div className="mx-2 rounded-2xl bg-tg-bg border border-tg-border shadow-2xl pointer-events-auto flex flex-col overflow-hidden" style={{ maxHeight: '58vh' }}>
        {/* Grab-handle header — centred pill (visual affordance) + ✕ list. */}
        <div className="relative flex items-center justify-end px-2 pt-2 pb-1 border-b border-tg-border/40">
          <span
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2 top-2 h-1 w-9 rounded-full bg-tg-hint/40"
          />
          {closeBtn}
        </div>
        {/* Vertical scrolling list — the focused card is highlighted + scrolled
            into view by the effect above. */}
        <div
          ref={trackRef}
          className="overflow-y-auto px-2 py-2 flex flex-col gap-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {list.map((v, i) => (
            <div key={v.placeId || i} data-pid={v.placeId || ''} className="scroll-mt-2">
              <ResultCard
                venue={v}
                number={i + 1}
                focused={v.placeId === focusedPlaceId}
                onTap={() => onSelect && onSelect(v.placeId)}
                specialMode={specialMode}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
