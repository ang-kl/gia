// ResultCarousel.jsx — v0.62.125
//
// Music-app "now playing" carousel docked at the FOOTER (operator, v0.62.128 —
// was an over-the-map overlay). When a result card is selected, a horizontal
// swipe-carousel floats fixed above the FAB cluster — the selected card centred
// and auto-expanded (ResultCard expands on `focused`), the neighbours peeking
// left/right. Tapping a peeking card selects it — the map (now fully visible
// behind) recenters / zooms-17 / blinks via the existing focusedPlaceId wiring
// (v0.62.115). The ✕ button (or a tap on the empty map, wired via
// App→MapPanel onDeselect) returns to the list.
//
// Rendered at App top level as a fixed footer layer; the vertical ResultPanel
// stays below as the scroll-down fallback list.

import React, { useEffect, useRef } from 'react';
import ResultCard from './ResultCard.jsx';
import { useLocale, t as tr } from '../lib/i18n.js';

export default function ResultCarousel({ venues, focusedPlaceId, onSelect, onClose, specialMode = null }) {
  const [lang] = useLocale();
  const trackRef = useRef(null);
  const list = Array.isArray(venues) ? venues : [];

  // Centre the focused card whenever the selection changes (smooth on update,
  // instant on first open).
  const firstRef = useRef(true);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !focusedPlaceId) return;
    const el = track.querySelector(`[data-pid="${CSS && CSS.escape ? CSS.escape(focusedPlaceId) : focusedPlaceId}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: firstRef.current ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
    firstRef.current = false;
  }, [focusedPlaceId, list.length]);

  if (!list.length) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-1 pb-1 pointer-events-none max-w-[1600px] mx-auto">
      <div className="flex justify-end px-2 pb-1 pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('rc.backToList', lang)}
          className="pointer-events-auto text-[12px] leading-none px-2.5 py-1 rounded-full bg-tg-card/95 border border-tg-border text-tg-text shadow active:scale-95"
        >✕ {tr('rc.list', lang)}</button>
      </div>
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
