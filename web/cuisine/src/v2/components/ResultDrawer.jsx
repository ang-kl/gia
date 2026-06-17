// ResultDrawer.jsx — v0.62.138
//
// Operator (17-06 '26): results now DEFAULT to a horizontal floating card
// strip over the map (no vertical list shown). This drawer is that strip:
// a snap swipe-carousel docked above the footer, the selected card centred
// and its neighbours peeking. Tapping a card only BLINKS the map pin (the
// map's blinkOnly path) — it does not pop the info card or zoom; the vertical
// list (the page ResultPanel) is where the card "pops".
//
// Controls are STACKED top-right (operator: "close list, vertical/horizontal
// should be stacked on top of each other"): ✕ list (dismiss the strip → map
// only) above ↴ vertical (switch to the vertical ResultPanel list).
//
// Rendered at App top level as a fixed footer layer.

import React, { useEffect, useRef } from 'react';
import ResultCard from './ResultCard.jsx';

export default function ResultDrawer({ venues, focusedPlaceId, onSelect, specialMode = null }) {
  const trackRef = useRef(null);
  const list = Array.isArray(venues) ? venues : [];

  // Centre the focused card horizontally whenever the selection changes
  // (smooth on update, instant on first open).
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
    <div className="fixed inset-x-0 bottom-[6.5rem] z-30 px-1 pointer-events-none max-w-[1600px] mx-auto">
      {/* v0.62.141 — operator: the list + vertical/horizontal controls moved to
          the FOOTER (out of the strip). Cards are BOTTOM-aligned (items-end),
          and each is a COMPACT ~5-row scroll panel (card-scroll = visible thin
          scrollbar) rendering its full content, so the detail is reachable two
          ways — scroll the card OR tap the in-card ⌄/⌃ to expand. */}
      <div
        ref={trackRef}
        className="flex items-end gap-2 overflow-x-auto snap-x snap-mandatory px-[9%] pb-1 pointer-events-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {list.map((v, i) => (
          <div
            key={v.placeId || i}
            data-pid={v.placeId || ''}
            className="card-scroll snap-center shrink-0 basis-[82%] max-h-[10.5rem] overflow-y-auto rounded-lg shadow-xl"
          >
            <ResultCard
              venue={v}
              number={i + 1}
              focused={v.placeId === focusedPlaceId}
              onTap={() => onSelect && onSelect(v.placeId)}
              specialMode={specialMode}
              defaultExpanded
            />
          </div>
        ))}
      </div>
    </div>
  );
}
