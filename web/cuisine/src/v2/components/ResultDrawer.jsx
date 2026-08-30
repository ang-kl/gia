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

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ResultCard from './ResultCard.jsx';
import { useLocale, t } from '../lib/i18n.js';

// v0.62.561 — O-54 responsive port: `basisClass` controls how many cards sit in
// focus. Phones keep the single-card `basis-[82%]` (unchanged); tablet/desktop
// pass the Hawker carousel basis (`… md:basis-[44%] min-[1180px]:basis-[30%]`)
// so an iPad-mini shows 2 and an iPad-Pro / desktop shows 3 cards in focus.
// v0.62.577 — the `max-w-[22rem]` per-card cap was REMOVED (operator: the 3-in-
// focus that works on Hawker wasn't working here): the cap made the wide cards
// narrower than their 30%/44% basis, so more, flatter cards showed instead of a
// prominent centre + two glass half-peeks. The outer `max-w-[1600px]` still
// bounds the track, so cards can't balloon. Matches the Hawker CentreCarousel.
// v0.62.682 — the gap held between the carousel card's bottom and the
// recommendation strip's top edge, in real px (see the offset comment in the
// render below for how this number was chosen). Applied to the MEASURED
// offset only; the first-paint calc() fallback keeps its own historic +2px.
const STRIP_GAP_PX = 5;

export default function ResultDrawer({ venues, focusedPlaceId, onSelect, specialMode = null, hasFilters = false, stripLiftPx = null, composerOpen = false, nearbyLabel = null, nearbyAccent = null, nearbyStrips = null, dishHints = null, basisClass = 'basis-[min(82%,20rem)]', glassPeek = false, isShort = false }) {
  const [lang] = useLocale();
  const trackRef = useRef(null);
  const list = Array.isArray(venues) ? venues : [];

  // v0.62.693 — operator (two device screenshots, v0.62.691): "there is lots of
  // white space below."
  //
  // D-51 asks for two things that a single CONSTANT cannot deliver together:
  // every card in the strip the same height, AND no wasted space. The constant
  // has to be sized for the tallest card the result set can produce (Michelin
  // row + wrapped name/meta/address), so every card that lacks those rows pays
  // for them in blank space. The operator's screenshots are exactly that case —
  // "Dirty Supper" carries no cuisine type, no price row and no ≈ conversion, so
  // ~5 rows sat in a box sized for ~10. Shrinking the constant (13rem → 12rem in
  // v0.62.691) only moves which cards are wrong; D-61 already recorded that
  // 12rem was the floor before the TALL cards start clipping.
  //
  // So stop guessing the number and MEASURE it: render, read every card's
  // natural content height, and pin them all to the tallest. Uniform (D-51 holds)
  // and tight (no card is taller than the set actually needs).
  //
  // `scrollHeight` alone is not enough — once a height is applied the content no
  // longer overflows, so it would report the applied height and could never
  // shrink again. Each element is therefore momentarily set to `height:auto`
  // inside a LAYOUT effect, measured, and restored before the browser paints.
  const [uniformH, setUniformH] = useState(null);
  useLayoutEffect(() => {
    const track = trackRef.current;
    // isShort is deliberately excluded: the operator ruled "the short tier —
    // phone landscape - dont change", so it keeps its 7.5rem constant untouched.
    if (!track || isShort || !list.length) { setUniformH(null); return; }
    const els = Array.from(track.querySelectorAll('[data-card-root]'));
    if (!els.length) return;
    let max = 0;
    for (const el of els) {
      const prev = el.style.height;
      el.style.height = 'auto';
      max = Math.max(max, el.scrollHeight);
      el.style.height = prev;
    }
    // Floor keeps a one-line result from collapsing to a sliver; ceiling stops a
    // pathological card from eating the map. Both are outside the normal range.
    const cap = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.5) : 320;
    const next = Math.min(Math.max(max, 96), cap);
    setUniformH((prev) => (prev != null && Math.abs(prev - next) < 2 ? prev : next));
  }, [list, isShort, basisClass, specialMode, dishHints]);

  // v0.62.287 — operator (urgent): the OPAQUE-white surface + the
  // lift-on-composer-expand must follow the card that is actually CENTRED in the
  // strip, NOT the tap-selected `focusedPlaceId` (which is null until the user
  // taps a pin/card — so on load nothing went white and nothing lifted). Track
  // the centred card from scroll position instead.
  const [centeredId, setCenteredId] = useState(null);

  // v0.62.562 — O-54 Hawker parity: on tablet/desktop (`glassPeek`) the cards
  // fully inside the focus band render OPAQUE and the two half-peeking end cards
  // render GLASS, exactly like the Hawker carousel — an IntersectionObserver
  // (root = the scroll track, ≥ 92 % visible = in focus) drives it. `visibleSet`
  // holds the placeIds currently in focus. Off on phones (single-card strip).
  const [visibleSet, setVisibleSet] = useState(() => new Set());

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
    // v0.62.292 — re-seed on result-set identity change, not just length: a new
    // search with the SAME count must still re-detect the centred card.
  }, [list.length, list[0] && list[0].placeId]);

  // v0.62.562 — the glass/opaque IntersectionObserver (tablet/desktop only).
  useEffect(() => {
    const track = trackRef.current;
    if (!glassPeek || !track || typeof IntersectionObserver === 'undefined') {
      setVisibleSet(new Set());
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      setVisibleSet((prev) => {
        const next = new Set(prev);
        for (const e of entries) {
          const pid = e.target.getAttribute('data-pid');
          if (!pid) continue;
          if (e.intersectionRatio >= 0.92) next.add(pid); else next.delete(pid);
        }
        return next;
      });
    }, { root: track, threshold: [0, 0.5, 0.92, 1] });
    track.querySelectorAll('[data-pid]').forEach((el) => io.observe(el));
    return () => io.disconnect();
    // Re-observe when the glassPeek mode flips or the result set identity changes.
  }, [glassPeek, list.length, list[0] && list[0].placeId]);

  // v0.62.287 — the "active" card drives opaque-white + lift. Prefer the
  // scroll-centred card; fall back to the tap-selected card, then the first.
  // v0.62.292 — operator: opaque sometimes didn't apply. centeredId /
  // focusedPlaceId could be STALE (a pid from a previous result set), so
  // activeId matched no visible card → no card went opaque. Validate each
  // fallback against the CURRENT list so exactly one card is always active.
  const inList = (id) => !!id && list.some((v) => v.placeId === id);
  const activeId = (inList(centeredId) && centeredId)
    || (inList(focusedPlaceId) && focusedPlaceId)
    || (list[0] && list[0].placeId)
    || null;

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
    /* v0.62.650 — operator: "Can i have 2 px gap between the carousel card and the
       recommendation bar in Cuisine TMA". The v0.62.277/285 passes deliberately
       dropped the strip to hug the dock ("no gap"), and the card's bottom pill
       ended up flush against the "S$xx ~ xx · N gems | ★ …" bar. `calc(… + 2px)`
       adds exactly the 2 px asked for without disturbing either tuned offset. */
    /* v0.62.681 — operator (device screenshots): the first-open card sat much
       closer to that same bar than it did after a search. The `hasFilters`
       branch below is a leftover from v0.62.186, when the active-filter chips
       rendered as their OWN full-width row above the dock and genuinely made
       the footer ~1.5rem taller. Since v0.62.192/281 they sit INSIDE the dock
       as the inline "Criteria (N) ▾" pill, so the footer height no longer moves
       with filters — but this offset still lifted 6rem vs 4.5rem depending on
       them, which is exactly the first-open-vs-later inconsistency reported.
       `stripLiftPx` (measured in App.jsx off the strip's real top edge) now
       drives the offset, keeping the card a consistent gap above the strip in
       every state. The calc() stays as the pre-measurement first-paint
       fallback ONLY — unchanged, so the un-measured path behaves exactly as
       before rather than trading one guess for another. */
    /* v0.62.682 — operator, after being shown the measured before/after table:
       the two old states worked out to roughly -16px (first open, card
       overlapping the strip's top edge) and +8px (after a search). A literal
       2px — the v0.62.650 ask — would have landed TIGHTER than the +8px state
       the operator had just identified as the one that looked right, so the
       constant was put to them explicitly rather than assumed. Answer: split
       the difference. STRIP_GAP_PX = 5 is the exact midpoint of the old 2px
       and ~8px, measured from the strip's real top edge so it is a true 5px on
       every device. */
    <div
      className="fixed inset-x-0 z-30 px-1 pointer-events-none max-w-[1600px] min-[1800px]:max-w-none mx-auto"
      style={{
        bottom: stripLiftPx != null
          ? `${stripLiftPx + STRIP_GAP_PX}px`
          : `calc(${hasFilters ? '6rem' : '4.5rem'} + 2px)`
      }}
    >
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
      {/* v0.62.577 — O-54 (operator: "the 3 cards in focus which works on Hawker
          in landscape are not working"). Match the Hawker CentreCarousel EXACTLY:
          `px-[6%]` track padding (was px-[9%] — the extra padding squeezed the two
          peeking end cards) so the centre card reads prominent with two glass
          half-peeks, not 3+ flat cards. */}
      <div
        ref={trackRef}
        className={`flex items-end gap-2 overflow-x-auto snap-x snap-mandatory px-[6%] pb-1 pointer-events-auto ${composerOpen ? 'pt-[3.5rem]' : ''}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {list.map((v, i) => (
          <div
            key={v.placeId || i}
            data-pid={v.placeId || ''}
            /* v0.62.285 — operator: when the 💬 composer expands, lift ONLY the
               in-view (focused) card up to clear the input pill; the peeking
               left/right cards stay at the shared items-end baseline. */
            className={`card-scroll snap-center shrink-0 ${basisClass} max-h-[60vh] overflow-y-auto rounded-lg shadow-xl transition-transform duration-200`}
            style={composerOpen && v.placeId === activeId ? { transform: 'translateY(-3.25rem)' } : undefined}
          >
            {/* v0.62.168 — operator: horizontal cards are UNIFORM size (fixed
                h-[10.5rem] + min-h-full fills it), COLLAPSED by default
                (no defaultExpanded, autoExpandFocus=false so the centred card
                doesn't auto-open), name one-row, fields wrap whole. */}
            <ResultCard
              venue={v}
              number={i + 1}
              /* v0.62.581 — operator (IMG_0747): "why do you select a card not in
                 focus when loading the first time." On the tablet carousel the
                 accent RING (focused=border-tg-accent) was pinned to whatever card
                 auto-CENTRED on load (activeId), so a card the user never tapped
                 read as "selected". Split the two states: the centred card stays
                 visually in focus via the OPAQUE/glass treatment (visibleSet, below),
                 but the accent ring now appears ONLY on an actual tap
                 (focusedPlaceId). No tap yet → no ring on first load. Phones keep the
                 legacy activeId ring (their single-card strip has no glass focus). */
              /* v0.62.589 — operator (unified spec): the accent RING keys off the
                 tapped id (focusedPlaceId) in BOTH orientations now — so a card tap
                 OR a pin tap lights the same card's ring, and no card rings on first
                 load. (Was: phones ringed the scroll-centred card via activeId.) The
                 opaque-white "centred" treatment still follows activeId via the glass
                 prop below, so the phone centred card stays opaque independent of the
                 ring. */
              focused={!!focusedPlaceId && v.placeId === focusedPlaceId}
              onTap={() => onSelect && onSelect(v.placeId)}
              specialMode={specialMode}
              horizontal
              isShort={isShort}
              collapsedHeightPx={uniformH}
              autoExpandFocus={false}
              nearbyLabel={nearbyLabel}
              nearbyAccent={nearbyAccent}
              nearbyStrips={nearbyStrips}
              dishHints={dishHints}
              /* v0.62.562 — tablet/desktop: opaque when this card is in the focus
                 band (IntersectionObserver), glass when it half-peeks at the ends.
                 Before the observer settles, treat as opaque (visibleSet empty).
                 On phones (glassPeek off) pass null → the legacy focused-only rule. */
              /* v0.62.589 — phones now pass an EXPLICIT glass value (opaque for the
                 scroll-centred card via activeId, glass otherwise) so the centred-card
                 opaque look survives the ring being decoupled from activeId above. */
              glass={glassPeek ? (visibleSet.size > 0 ? !visibleSet.has(v.placeId) : false) : (v.placeId !== activeId)}
            />
          </div>
        ))}
        {/* v0.62.151 — operator: a terminal card after the last result. Scroll to
            the right end → "Last card" + how to refine. */}
        <div className={`snap-center shrink-0 ${basisClass} max-h-[60vh] rounded-lg shadow-xl bg-tg-card border border-tg-border flex flex-col items-center justify-center text-center gap-1 px-3 py-4`}>
          <div className="text-[13px] font-semibold text-tg-text">{t('lastCard.title', lang)}</div>
          <div className="text-[12px] text-tg-hint leading-snug">📍 {t('lastCard.enterLocation', lang)} · 💬 {t('lastCard.typeDish', lang)}</div>
          <div className="text-[12px] text-tg-hint leading-snug">{t('lastCard.tapSearch', lang)}</div>
        </div>
        {/* v0.62.155 — loop clone of the FIRST card (jumps back to the real one
            on reach, see the scroll effect above). */}
        <div className={`card-scroll snap-center shrink-0 ${basisClass} max-h-[60vh] overflow-y-auto rounded-lg shadow-xl`} aria-hidden="true">
          <ResultCard
            venue={list[0]}
            number={1}
            focused={false}
            onTap={() => onSelect && onSelect(list[0].placeId)}
            specialMode={specialMode}
            horizontal
            /* v0.62.693 — the loop clone must match the real cards' measured
               height, or the strip visibly changes height as it wraps around.
               It also carries `isShort` for the same reason (it was missing
               that too, so on phone landscape the clone was the standard tier
               while every real card was short). */
            isShort={isShort}
            collapsedHeightPx={uniformH}
            autoExpandFocus={false}
          />
        </div>
      </div>
    </div>
  );
}
