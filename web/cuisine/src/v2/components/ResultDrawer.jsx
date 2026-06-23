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

import React, { useEffect, useRef, useState } from 'react';
import ResultCard from './ResultCard.jsx';
import { useLocale } from '../lib/i18n.js';

export default function ResultDrawer({ venues, focusedPlaceId, onSelect, specialMode = null, hasFilters = false, composerOpen = false }) {
  const [lang] = useLocale();
  const trackRef = useRef(null);
  const list = Array.isArray(venues) ? venues : [];

  // v0.62.287 — operator (urgent): the OPAQUE-white surface + the
  // lift-on-composer-expand must follow the card that is actually CENTRED in the
  // strip, NOT the tap-selected `focusedPlaceId` (which is null until the user
  // taps a pin/card — so on load nothing went white and nothing lifted). Track
  // the centred card from scroll position instead.
  const [centeredId, setCenteredId] = useState(null);

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

  // v0.62.155 — operator: a true looping carousel. A clone of the FIRST card is
  // appended after the "Last card"; when the user scrolls onto it (the far-right
  // end), jump the track instantly back to the real first card so swiping wraps
  // around seamlessly.
  const loopTimerRef = useRef(null);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    // v0.62.287 — which real card is nearest the strip's horizontal centre?
    // Uses viewport rects so it's robust regardless of offsetParent.
    const detectCentre = () => {
      const trackRect = el.getBoundingClientRect();
      const mid = trackRect.left + trackRect.width / 2;
      let best = null;
      let bestDist = Infinity;
      el.querySelectorAll('[data-pid]').forEach((node) => {
        const pid = node.getAttribute('data-pid');
        if (!pid) return;
        const r = node.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = pid; }
      });
      if (best) setCenteredId((prev) => (best !== prev ? best : prev));
    };
    const onScroll = () => {
      detectCentre();
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 6) {
        loopTimerRef.current = setTimeout(() => { el.scrollTo({ left: 0, behavior: 'auto' }); }, 240);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Seed once on mount/result change so the first centred card is opaque
    // immediately (before any scroll gesture).
    detectCentre();
    const seed = setTimeout(detectCentre, 80);
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(seed);
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, [list.length]);

  // v0.62.287 — the "active" card drives opaque-white + lift. Prefer the
  // scroll-centred card; fall back to the tap-selected card, then the first.
  const activeId = centeredId || focusedPlaceId || (list[0] && list[0].placeId) || null;

  if (!list.length) return null;

  return (
    /* v0.62.172 — operator: the result strip must sit ABOVE the active-filter
       strip. When filters are showing the footer cluster is taller, so lift the
       drawer to clear it.
       v0.62.186 — operator (IMG_2507 #2): the chips are now their OWN full-width
       strip row (not inline in the controls row), so the cluster grows another
       ~1.5rem when filters show — lift to 10rem so the cards clear the strip
       ("result card is behind the strip margin").
       v0.62.190 — cards float ABOVE the unified glass dock (taller than the old
       separate control cards): clear it with 8rem, or 10rem when the filter band
       is also showing above the dock. */
    /* v0.62.277 — operator: the strip floated too high above the 💬 free-text
       dock (it got shorter at v0.62.269). Drop it to hug the dock top so the
       card sits JUST above the free-text strip, no gap. */
    /* v0.62.285 — operator: drop the strip closer to the control border (it
       hugged the dock but still left a gap that the 💬/🔍 FABs floated in).
       The FABs are lifted to z-40 in App.jsx so they stay IN FRONT of these
       z-30 cards even as the strip sits lower. */
    <div className={`fixed inset-x-0 ${hasFilters ? 'bottom-[6rem]' : 'bottom-[4.5rem]'} z-30 px-1 pointer-events-none max-w-[1600px] mx-auto`}>
      {/* v0.62.141 — operator: the list + vertical/horizontal controls moved to
          the FOOTER (out of the strip). Cards are BOTTOM-aligned (items-end),
          and each is a COMPACT ~5-row scroll panel (card-scroll = visible thin
          scrollbar) rendering its full content, so the detail is reachable two
          ways — scroll the card OR tap the in-card ⌄/⌃ to expand. */}
      {/* v0.62.288 — operator (urgent): when the composer expands, the lifted
          centre card's TOP was chopped off. The track is `overflow-x-auto`,
          which forces overflow-y to `auto` (CSS), so it clips vertical overflow.
          The card's translateY(-3.25rem) pushed its top above the track box →
          clipped. Reserve matching top headroom while the composer is open so
          the lifted card rises into it instead of being cut. */}
      <div
        ref={trackRef}
        className={`flex items-end gap-2 overflow-x-auto snap-x snap-mandatory px-[9%] pb-1 pointer-events-auto ${composerOpen ? 'pt-[3.5rem]' : ''}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {list.map((v, i) => (
          <div
            key={v.placeId || i}
            data-pid={v.placeId || ''}
            /* v0.62.285 — operator: when the 💬 composer expands, lift ONLY the
               in-view (focused) card up to clear the input pill; the peeking
               left/right cards stay at the shared items-end baseline. */
            className="card-scroll snap-center shrink-0 basis-[82%] max-w-[22rem] max-h-[60vh] overflow-y-auto rounded-lg shadow-xl transition-transform duration-200"
            style={composerOpen && v.placeId === activeId ? { transform: 'translateY(-3.25rem)' } : undefined}
          >
            {/* v0.62.168 — operator: horizontal cards are UNIFORM size (fixed
                h-[10.5rem] + min-h-full fills it), COLLAPSED by default
                (no defaultExpanded, autoExpandFocus=false so the centred card
                doesn't auto-open), name one-row, fields wrap whole. */}
            <ResultCard
              venue={v}
              number={i + 1}
              focused={v.placeId === activeId}
              onTap={() => onSelect && onSelect(v.placeId)}
              specialMode={specialMode}
              horizontal
              autoExpandFocus={false}
            />
          </div>
        ))}
        {/* v0.62.151 — operator: a terminal card after the last result. Scroll to
            the right end → "Last card" + how to refine. */}
        <div className="snap-center shrink-0 basis-[82%] max-w-[22rem] max-h-[60vh] rounded-lg shadow-xl bg-tg-card border border-tg-border flex flex-col items-center justify-center text-center gap-1 px-3 py-4">
          <div className="text-[13px] font-semibold text-tg-text">{lang === 'fr' ? 'Dernière carte' : 'Last card'}</div>
          <div className="text-[12px] text-tg-hint leading-snug">📍 {lang === 'fr' ? 'saisir un lieu' : 'enter location'} · 💬 {lang === 'fr' ? 'tapez un plat' : 'Type dish'}</div>
          <div className="text-[12px] text-tg-hint leading-snug">{lang === 'fr' ? 'Touchez 🔍 pour rechercher' : 'Tap 🔍 to search'}</div>
        </div>
        {/* v0.62.155 — loop clone of the FIRST card (jumps back to the real one
            on reach, see the scroll effect above). */}
        <div className="card-scroll snap-center shrink-0 basis-[82%] max-w-[22rem] max-h-[60vh] overflow-y-auto rounded-lg shadow-xl" aria-hidden="true">
          <ResultCard
            venue={list[0]}
            number={1}
            focused={false}
            onTap={() => onSelect && onSelect(list[0].placeId)}
            specialMode={specialMode}
            horizontal
            autoExpandFocus={false}
          />
        </div>
      </div>
    </div>
  );
}
