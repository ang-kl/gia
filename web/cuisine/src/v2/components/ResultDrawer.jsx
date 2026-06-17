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
import { useLocale } from '../lib/i18n.js';

export default function ResultDrawer({ venues, focusedPlaceId, onSelect, onClose, onToggleMode, specialMode = null }) {
  const [lang] = useLocale();
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
    <div className="fixed inset-x-0 bottom-16 z-30 px-1 pb-1 pointer-events-none max-w-[1600px] mx-auto">
      {/* Stacked controls, top-right: ✕ list (dismiss) above ↴ vertical (toggle). */}
      <div className="flex justify-end px-2 pb-1 pointer-events-none">
        <div className="flex flex-col items-end gap-1 pointer-events-none">
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer la liste' : 'Close list'}
            className="pointer-events-auto text-[12px] leading-none px-2.5 py-1 rounded-full bg-tg-card/95 border border-tg-border text-tg-text shadow active:scale-95"
          >✕ {lang === 'fr' ? 'liste' : 'list'}</button>
          <button
            type="button"
            onClick={onToggleMode}
            aria-label={lang === 'fr' ? 'Affichage vertical' : 'Vertical layout'}
            className="pointer-events-auto text-[12px] leading-none px-2.5 py-1 rounded-full bg-tg-card/95 border border-tg-border text-tg-text shadow active:scale-95 flex items-center gap-0.5"
          ><span aria-hidden="true">↴</span> {lang === 'fr' ? 'vertical' : 'vertical'}</button>
        </div>
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
