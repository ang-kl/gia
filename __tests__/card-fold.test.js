// card-fold.test.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md,
// part D, invariant I7. Register R-21.
//
// The Cuisine eatery card covered the station card on the map. On 15-11 '26 the operator asked for the eatery cards to
// fold while a map card is open; two mock-ups went on the design canvas, and on 22-11 '26 they chose "1. Card fold:
// frame 1" (the mini card: tab, band, name, guide line, cuisine line, details button), for "Every map card
// (Recommended)": station, bus stop, exit, hawker, carpark, taxi, places and flight. Not the eatery's own pin popup,
// which is the card the reader just tapped.
//
// The card is a React component and the unit job installs no React (test-import-graph-guard.test.js), so this file
// reads the source, comments masked. The open/close signal underneath it is called for real in stop-linger.test.js.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskComments } from './helpers/mask-comments.js';

const read = (p) => maskComments(fs.readFileSync(path.join(process.cwd(), p), 'utf8'));
const count = (s, needle) => s.split(needle).length - 1;

const COPIES = {
  transport: 'web/transport/src/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
};

describe.each(Object.keys(COPIES))('%s overlay copy reports its card (I7)', (name) => {
  const src = read(COPIES[name]);
  it('every card the overlay shows goes through one watched InfoWindow, and listeners hear open and close', () => {
    expect(src).toMatch(/const cardListeners = new Set\(\);/);
    expect(src).toMatch(/onChange:\s*\(open\)\s*=>\s*\{\s*for \(const f of cardListeners\) f\(open\);\s*\}/);
    expect(src).toMatch(/onCardChange\(fn\) \{ cardListeners\.add\(fn\); return \(\) => cardListeners\.delete\(fn\); \}/);
  });
});

describe('Cuisine map panel: overlay card or flight card, never the eatery popup (I7, A6)', () => {
  const src = read('web/cuisine/src/v2/components/MapPanel.jsx');

  it('takes an onMapCardChange prop', () => {
    expect(src).toMatch(/export default function MapPanel\(\{[^)]*\bonMapCardChange = null\b/);
  });

  it('listens to the overlay controller, and counts a flight card as a map card', () => {
    expect(src).toMatch(/const \[overlayCardOpen, setOverlayCardOpen\] = useState\(false\);/);
    expect(src).toMatch(/overlayControllerRef\.current\.onCardChange\(\(open\) => setOverlayCardOpen\(open\)\);/);
    expect(src).toMatch(/const mapCardOpen = overlayCardOpen \|\| !!fr24Flight;/);
    expect(src).toMatch(/useEffect\(\(\) => \{ if \(onMapCardChange\) onMapCardChange\(mapCardOpen\); \}, \[mapCardOpen\]\);/);
  });

  it('the eatery popup (infoWindowRef) is never watched', () => {
    expect(src).not.toMatch(/watchInfoWindow\(/);
    expect(count(src, 'setOverlayCardOpen'), 'declared once, set only from onCardChange').toBe(2);
  });

  it('offers one close for every map card, the flight card included (Codex review of #1934)', () => {
    expect(src).toMatch(/window\.__giaMapCardsClose = \(\) => \{ closeInfo\(\); fr24Ref\.current\?\.closeInfo\(\); \};/);
  });

  it('the flight state is declared before the line that reads it', () => {
    expect(src.indexOf('const [fr24Flight, setFr24Flight]')).toBeLessThan(src.indexOf('const mapCardOpen ='));
    expect(src.indexOf('const [overlayCardOpen, setOverlayCardOpen]')).toBeLessThan(src.indexOf('const mapCardOpen ='));
  });
});

describe('Cuisine app hands the fold to the strip (I7)', () => {
  const src = read('web/cuisine/src/v2/App.jsx');

  it('keeps one mapCardOpen, set by the map panel', () => {
    expect(src).toMatch(/const \[mapCardOpen, setMapCardOpen\] = useState\(false\);/);
    expect(count(src, '<MapPanel')).toBe(1);
    expect(src).toMatch(/onMapCardChange=\{setMapCardOpen\}/);
  });

  it('the horizontal strip folds while it is open, and its details button can close the map card', () => {
    const i = src.indexOf('<ResultDrawer');
    const tag = src.slice(i, src.indexOf('/>', i));
    expect(tag).toMatch(/folded=\{mapCardOpen\}/);
    expect(tag).toMatch(/onUnfold=\{unfoldCard\}/);
    // Codex review of #1934: closing only the overlay and eatery cards left a FLIGHT card open, so the strip stayed
    // folded and the details the reader asked for stayed hidden. The app closes every map card, the flight one too.
    expect(src).toMatch(/const unfoldCard = \(pid\) => \{[\s\S]{0,200}?window\.__giaMapCardsClose\(\);[\s\S]{0,80}?setFocusedPlaceId\(pid\);\s*\};/);
  });

  it('the vertical list does not fold: it is not over the map', () => {
    const i = src.indexOf('<ResultPanel');
    if (i < 0) return;
    const tag = src.slice(i, src.indexOf('/>', i));
    expect(tag).not.toMatch(/folded=/);
  });
});

describe('ResultDrawer passes the fold to every card it draws (I7)', () => {
  const src = read('web/cuisine/src/v2/components/ResultDrawer.jsx');
  it('takes folded and onUnfold, and hands both to each ResultCard, the loop clone included', () => {
    // The signature's own default `'basis-[min(82%,20rem)]'` holds a `)`, so read up to the `}) {` that closes it.
    expect(src).toMatch(/export default function ResultDrawer\(\{[^\n]*\bfolded = false, onUnfold = null \}\) \{/);
    const cards = count(src, '<ResultCard');
    expect(cards).toBe(2);
    expect(count(src, 'folded={folded}')).toBe(cards);
    expect(count(src, 'onUnfold={onUnfold}')).toBe(cards);
  });
});

describe('ResultCard folded: frame 1 parts only (I7, A1)', () => {
  const src = read('web/cuisine/src/v2/components/ResultCard.jsx');
  const at = (needle) => {
    const i = src.indexOf(needle);
    expect(i, `${needle} must be in ResultCard`).toBeGreaterThan(0);
    return i;
  };

  it('takes folded and onUnfold', () => {
    expect(src).toMatch(/export default function ResultCard\(\{[^)]*\bfolded = false, onUnfold = null\b/);
  });

  it('keeps the tab, the band, the name, the guide line and the cuisine line outside the fold', () => {
    const gate = at('{!folded && (<>');
    for (const kept of ["venue.openNow === false ?", "venue.matchTier === 'alternate'", '{venue.name}', 'pickNameGuide(venue, sayNow)',
      'restaurantTypeName(venue.restaurantType, lang)']) {
      expect(at(kept), `${kept} stays visible when folded`).toBeLessThan(gate);
    }
  });

  it('hides everything from the durian note to the address guide while folded', () => {
    const gate = at('{!folded && (<>');
    const end = src.indexOf('</>)}', gate);
    expect(end).toBeGreaterThan(gate);
    const folded = src.slice(gate, end);
    for (const hidden of ["specialMode === 'durian-pastry'", '{meta}', 'venue.priceRangeDisplay', 'venue.michelinCategory',
      'venue.area &&', 'pickAddressGuide(venue, streetSay, addrStreet)']) {
      expect(folded, `${hidden} is hidden when folded`).toContain(hidden);
    }
    expect(end, 'the fold ends before the details button').toBeLessThan(at('aria-controls={detailsId}'));
  });

  it('hides the "Likely serves" strips and the opened details while folded', () => {
    expect(src).toMatch(/\{!folded && Array\.isArray\(dishHints\)/);
    expect(src).toMatch(/\{expanded && !folded && \(<div id=\{detailsId\}/);
  });

  it('a folded card on the short tier is not held at the fixed 7.5rem', () => {
    // `!folded` sits before `isShort`, so cuisine-card-natural-height.test.js still reads `isShort ? 'h-[7.5rem]…'`.
    expect(src).toMatch(/horizontal && !expanded && !folded && isShort \? 'h-\[7\.5rem\] overflow-hidden'/);
  });

  it('the details button on a folded card opens the card: details open, map card closes through onUnfold', () => {
    const i = at('aria-controls={detailsId}');
    const btn = src.slice(src.lastIndexOf('<button', i), src.indexOf('</button>', i));
    expect(btn).toMatch(/if \(folded\) \{\s*setExpanded\(true\);\s*if \(onUnfold\) onUnfold\(venue\.placeId\);\s*return;\s*\}/);
    expect(btn).toMatch(/aria-expanded=\{expanded && !folded\}/);
  });

  it('adds no UI text: the mini card reuses the strings it already had (I9)', () => {
    expect(src).not.toMatch(/tr\('card\.fold/);
  });
});
