// ResultCarousel.jsx — v0.62.125
//
// Music-app "now playing" overlay docked over the map (operator). When a result
// card is selected, the vertical list becomes a horizontal swipe-carousel that
// floats over the lower part of the map: the selected card is centred and
// auto-expanded (ResultCard expands on `focused`), the neighbours peek left and
// right. Tapping a peeking card selects it — the map recenters / zooms-17 /
// blinks via the existing focusedPlaceId wiring (v0.62.115). The ✕ button (or a
// tap on the empty map, wired in App→MapPanel onDeselect) returns to the list.
//
// Purely additive: rendered as a MapPanel child (absolute overlay), so it adds
// no layout surgery and carries the lowest regression risk — the vertical
// ResultPanel below is untouched.

import React, { useEffect, useRef } from 'react';
import ResultCard from './ResultCard.jsx';
import { useLocale } from '../lib/i18n.js';

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
    <div className="absolute inset-x-0 bottom-0 z-20 pb-2 pointer-events-none">
      <div className="flex justify-end px-2 pb-1 pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === 'fr' ? 'Fermer' : 'Back to list'}
          className="pointer-events-auto text-[12px] leading-none px-2.5 py-1 rounded-full bg-tg-card/95 border border-tg-border text-tg-text shadow active:scale-95"
        >✕ {lang === 'fr' ? 'liste' : 'list'}</button>
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
