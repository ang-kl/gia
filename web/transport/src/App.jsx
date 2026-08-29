import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { LINES, LINES_BY_CODE } from './data/lines.js';
import { lineStationsFull } from './data/line-paths.js';
import { useViewport } from '../../_shared/lib/use-viewport.js';
import { useDialog } from '../../_shared/lib/use-dialog.js';
import { withViewTransition } from './lib/view-transition.js';
import LoadingSkeleton from './components/LoadingSkeleton.jsx';
import { initData } from './tg.js';
import { t, tn, useLocale } from './i18n.js';
import { lineName } from '../../_shared/lib/mrt-lines-i18n.generated.js';
import LineStatusPanel from './components/LineStatusPanel.jsx';
import StationCard from './components/StationCard.jsx';
import SystemMap from './components/SystemMap.jsx';
import MrtMapPanel from './components/MrtMapPanel.jsx';
import AffectedTicker from './components/AffectedTicker.jsx';
import EngineeringList from './components/EngineeringList.jsx';
import LocationCard from './components/LocationCard.jsx';
import WeatherBadge from '../../_shared/components/WeatherBadge.jsx';
import BottomSheet from '../../_shared/components/BottomSheet.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';
import StationLocationField from '../../_shared/components/StationLocationField.jsx';

// v0.60.213 — build version for the footer tag line.
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

// v0.62.600 — operator: a LIVE Singapore-time clock on the status row. Format
// "DD MMM HH:MM" (24-hour); the ":" blinks each second so it's visibly running
// on SGT, replacing the static server timestamp row.
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  const [colonOn, setColonOn] = useState(true);
  // P1-b — the colon blink is JS-driven (visibility toggle), so the CSS
  // prefers-reduced-motion net can't reach it; gate it here instead.
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    // 500 ms tick → the ":" blinks on/off once a second (classic running clock);
    // re-reading the time each tick keeps the minute current.
    const id = setInterval(() => {
      setNow(new Date());
      setColonOn((c) => !c);
    }, 500);
    return () => clearInterval(id);
  }, []);
  let day = '', month = '', hour = '', minute = '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Singapore', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now);
    const get = (type) => (parts.find((p) => p.type === type) || {}).value || '';
    day = get('day'); month = get('month'); hour = get('hour'); minute = get('minute');
  } catch { /* Intl timezone unsupported — the clock just hides */ }
  if (!day) return null;
  return (
    <span className="tabular-nums whitespace-nowrap" aria-label={`${day} ${month} ${hour}:${minute} SGT`}>
      {day} {month} {hour}<span style={{ visibility: (reduceMotion || colonOn) ? 'visible' : 'hidden' }}>:</span>{minute}
    </span>
  );
}

// v0.62.601 — a horizontal snap-scroll carousel of station cards for the wide
// landscape / full-map layout (mirrors the Hawker TMA's CentreCarousel). The
// off-centre (peeking) cards get the frosted "glass" look; the centred one is
// opaque. IntersectionObserver tracks which cards are in focus.
// v0.62.679 — O-96 (operator, device check): on PHONE this IntersectionObserver
// path could get "stuck" opaque on a card that had already scrolled to a
// peeking edge — IO callback timing during a scroll-snap gesture is
// implementation-defined and can coalesce/delay in Telegram's embedded WebView.
// Cuisine's own carousel (ResultDrawer.jsx) avoids this by only using
// IntersectionObserver on tablet/desktop (`glassPeek = vp.isWide`); on phone it
// tracks the single centred card via a synchronous getBoundingClientRect()
// geometry match re-run on every native `scroll` event, which cannot get
// stuck. Ported that same dual-mode split here via the new `isWide` prop.
function StationCarousel({ items, render, activeIndex = -1, isWide = false }) {
  const trackRef = useRef(null);
  const [focused, setFocused] = useState(() => new Set());
  const [centeredIdx, setCenteredIdx] = useState(0);
  useEffect(() => {
    if (!isWide) { setFocused(new Set()); return undefined; }
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === 'undefined') {
      setFocused(new Set(items.map((_, i) => i)));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      setFocused((prev) => {
        const next = new Set(prev);
        for (const e of entries) {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (e.intersectionRatio >= 0.9) next.add(idx); else next.delete(idx);
        }
        return next;
      });
    }, { root: track, threshold: [0, 0.5, 0.9, 1] });
    track.querySelectorAll('[data-idx]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items, isWide]);
  // v0.62.679 — phone-only scroll-geometry fallback (mirrors Cuisine's
  // ResultDrawer.jsx detectCentre()).
  useEffect(() => {
    if (isWide) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;
    const detectCentre = () => {
      const trackRect = track.getBoundingClientRect();
      const mid = trackRect.left + trackRect.width / 2;
      let best = null;
      let bestDist = Infinity;
      track.querySelectorAll('[data-idx]').forEach((node) => {
        const idx = Number(node.getAttribute('data-idx'));
        const r = node.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = idx; }
      });
      if (best != null) setCenteredIdx((prev) => (best !== prev ? best : prev));
    };
    track.addEventListener('scroll', detectCentre, { passive: true });
    detectCentre();
    const seed = setTimeout(detectCentre, 80);
    return () => { track.removeEventListener('scroll', detectCentre); clearTimeout(seed); };
  }, [items, isWide]);
  const glassFor = (i) => (isWide ? !focused.has(i) : i !== centeredIdx);
  // v0.62.632 — when a station is selected (card tap or map pin), scroll its card
  // to the centre of the track — the Cuisine/iPhone "selected card centres + pops"
  // effect. The active card also auto-expands + scales (StationCard `active`).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || activeIndex < 0) return;
    const el = track.querySelector(`[data-idx="${activeIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeIndex]);
  return (
    <div
      ref={trackRef}
      // v0.62.628 — operator: match the Cuisine desktop standard (compact cards
      // floating over a full-bleed map). `items-end` (was items-stretch) sits the
      // cards on a common baseline at their NATURAL heights — items-stretch grew
      // every card to the tallest one's height, leaving a wall of empty white
      // space below the shorter cards (the "cards too tall" look). pointer-events-
      // auto because the floating carousel wrapper is pointer-events-none so the
      // map stays draggable in the gaps between cards.
      className="flex items-end gap-2 overflow-x-auto snap-x snap-mandatory px-[4%] pb-1 max-w-6xl xl:max-w-none mx-auto pointer-events-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* v0.62.639 — operator (iPad mini): "have at least four can be seen and half
          at each side, therefore squeeze the width". Narrower basis so ~4 cards
          are in view plus a half-peek at each edge on an iPad-mini width; phones
          keep a single wide card. Natural height (items-end), tight max-h. */}
      {/* v0.62.645 — the CARD owns its height now (StationCard: fixed h-[14rem] when
          collapsed, auto when expanded, so "expand IS to expand the card"). The box
          only caps how far an expanded card may grow before it scrolls. */}
      {/* v0.62.652 — operator (Telegram Desktop screenshot): "for the desktop are
          you able to increase the number of cards to see from current to another
          few more depending on aspect ratio of the desktop". The basis ladder used
          to stop at md (768 px), so a 1920 px desktop showed the SAME ~4.5 cards as
          a 768 px tablet — every extra pixel went into making each card WIDER
          rather than showing more of the line. It now keeps stepping to 2000 px+.
          `min-w-[9rem]` is the floor: at the top of the ladder a percentage basis
          could squeeze a card below readable width, and the track should scroll
          rather than render something illegible.

          v0.62.816 — THE TOP TWO RUNGS REVERSE, and the paragraph above is why that
          needs saying rather than doing quietly. That change existed because a 1920 px
          desktop showed the same ~4.5 cards as a 768 px tablet, so the ladder was made
          to keep ADDING cards: 13.5 % at 1600 px, 11 % at 2000 px — about nine cards on
          a 2048 px notebook. Operator, looking at that screen: "16%, 5 + drop ml-auto."

          Both numbers land as the two top rungs — 16 % from 1600 px (~6 cards), 20 %
          from 2000 px (5 cards) — so neither reading of that instruction is contradicted.

          WHAT CHANGED SINCE THE EARLIER DECISION, because it was not wrong then: the
          station name TRUNCATES (`truncate` in StationCard), and at 11 % a 2048 px screen
          renders "Yio Chu K…" and "Ang M…" in English. v0.62.815 made the names longer —
          "Stesen MRT Ang Mo Kio", 宏茂桥地铁站 — so at the old width the localised names
          this repo just spent two versions fetching would have shipped as ellipsis. More
          cards stopped being worth more than legible ones. */}
      {items.map((c, i) => (
        <div key={i} data-idx={i}
          className="snap-center shrink-0 basis-[60%] sm:basis-[31%] md:basis-[22%] xl:basis-[17%] min-[1600px]:basis-[16%] min-[2000px]:basis-[20%] min-w-[9rem] max-h-[52vh] overflow-y-auto rounded-lg shadow-lg">
          {render(c, i, glassFor(i))}
        </div>
      ))}
    </div>
  );
}

// v0.62.602 — a centred modal (click-outside / ✕ to dismiss), mirroring the
// Cuisine TMA's first-load popup style. Sits above the fixed footer bar (z-40).
function Modal({ title, onClose, children }) {
  // P1-d — full dialog contract via the shared hook: initial focus, Tab
  // containment, Escape→onClose, focus restoration. The visible <h3> is the
  // accessible name (aria-labelledby) instead of a duplicated string.
  const panelRef = useDialog({ open: true, onClose });
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      role="dialog" aria-modal="true" aria-labelledby="gia-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className="skeuo-card w-full max-w-[420px] max-h-[80vh] overflow-y-auto rounded-2xl p-4 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <h3 id="gia-modal-title" className="text-sm font-bold flex-1 leading-tight">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="text-tg-hint text-lg leading-none px-1 active:scale-90">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Hitachi-style transport TMA — main composition.
// Layout (mobile-first):
//   1. Header: title + timestamp
//   2. SystemMap (focused line flashing, others muted)
//   3. LineStatusPanel (side card mirroring Hitachi's "JH Yokohama Line / Delay" card)
//   4. AffectedTicker (horizontal-scroll list of all affected lines)
//   5. LocationCard (you-are-here + nearest stations)
//   6. EngineeringList (next 7 days from data/mrt-engineering-closures.md)
export default function App() {
  const lang = useLocale();
  // v0.62.602 — which header popup is open: 'status' (service + engineering
  // closures, opened from the status chip / auto-shown once on first load) or
  // 'source' (data-source attribution, opened from the title). null = none.
  const [popup, setPopup] = useState(null);
  const firstPopupRef = useRef(false);
  // v0.62.601 — device/orientation for the responsive layout (phone stacked /
  // tablet-desktop two-panel / landscape carousel). Hook stays above the early
  // returns below (Rules of Hooks).
  const vp = useViewport();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [focusedCode, setFocusedCode] = useState(null);
  // v0.62.659 — which line chip blinks to draw the eye while the first-load
  // "pick a line" popup is open (operator: "blink the top bar of East-West
  // line"). Cleared the moment the user taps any line chip or dismisses
  // the popup.
  const [blinkCode, setBlinkCode] = useState(null);
  // v0.61.14 — a station selected from the focused-line panel's
  // station picker. Drives the map's 6 km station-focus mode and the
  // selected-station status detail.
  const [focusedStation, setFocusedStation] = useState(null);
  // v0.62.598 — the rich station-info card's data sources: the per-station
  // dataset (/api/geo/stations, keyed by name), the coarse station list
  // (/api/transport/stations, for terminus resolution + code→station lookup),
  // live platform crowd, and the tapped station's amenity context.
  const [geoStations, setGeoStations] = useState(null);
  const [coarseStations, setCoarseStations] = useState(null);
  const [crowd, setCrowd] = useState(null);
  const [stationContext, setStationContext] = useState(null);
  // v0.62.621 — the user's location, best-effort, for the station card's
  // distance + walking-time (Google-Maps place-details style). The TMA-only
  // /status fetch has no coords (they're chat-side only), so we ask the browser
  // once; if denied / unavailable the card simply omits distance and the
  // Directions button still routes from the user's device.
  const [userLoc] = useState(null);   // v0.62.641 — always null (walk row removed)
  // v0.60.85 — view toggle between the static PNG schematic
  // (SystemMap) and the interactive Google Map (MrtMapPanel,
  // ~177 ops + ~29 future pins). Operator 2026-05-10: "if the SG
  // Map is first loaded still show the PNG map of Singapore MRT
  // system network and suggest to user to toggle to see Google
  // Map as 184 pins in the map of singapore will be very cramp and
  // ugly." Default = 'png'; user opts into 'gmap' via toggle.
  // v0.62.223 — operator (IMG_2537) REVERSED this: "also start in google
  // map mode". Default is now 'gmap'; the schematic PNG stays one tap away
  // via the view toggle (the prior 2026-05-10 rationale kept above).
  const [mapView, setMapView] = useState('gmap');
  // v0.62.606 — operator: the Train TMA now DEFAULTS to the Cuisine/Hawker
  // "full-map + bottom station carousel" across every device (was device-driven:
  // phone stacked / tablet two-panel / landscape carousel). The carousel is
  // EMPTY on first load (map only) until a line pill is tapped; the footer 🗺/⊞
  // toggle switches to the two-panel LIST. 'carousel' | 'list'.
  const [viewMode, setViewMode] = useState('carousel');
  // v0.62.606 — the list-mode scroller (for the footer ⇡/⇣ button + atBottom).
  const listScrollRef = useRef(null);
  const [listAtBottom, setListAtBottom] = useState(false);
  // v0.62.636 (C2) — AutoAnimate the LIST-mode station grid: cards fade / slide
  // as the focused line (and so the station set) changes. Honours
  // prefers-reduced-motion on its own. Hook stays above the early returns.
  const [gridParent] = useAutoAnimate();
  const onListScroll = () => {
    const el = listScrollRef.current;
    if (el) setListAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 50);
  };
  // v0.63.0 — map overlay layer toggles (parks / attractions / taxis /
  // carpark), shown only on the interactive Google Map view.
  const [overlayLayers, setOverlayLayers] = useState({ attractions: false, carpark: false, busstop: false, hawker: false, colour: true, train: true, exits: false, taxis: false, parks: false, police: false, clinics: false, hospitals: false });
  // v0.60.99 — one-shot auto-switch from PNG → Google Map on the
  // first line-chip tap. After that (whether the user stayed on
  // Google Map or toggled back to Schematic), subsequent chip taps
  // respect the user's current view choice. Codex P2 2026-05-11:
  // without this guard, tap-line → toggle-Schematic → tap-line
  // would yank the user back to Google Map.
  const autoSwitchedRef = useRef(false);
  // v0.60.96 — operator: "flip to Top when I am at the bottom of the
  // screen". atBottom = within 50 px of the document's full height.
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const reached = window.scrollY + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setAtBottom(reached >= fullH - 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/transport/status?initData=' + encodeURIComponent(initData()))
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => {
        setData(d);
        // v0.62.620 — operator: on DEFAULT load, open with the East-West Line (so
        // the drawer/carousel isn't empty). Still auto-focus the first AFFECTED
        // line when there's a disruption; otherwise fall back to EWL.
        if (!focusedCode) setFocusedCode(d?.affectedCodes?.[0] || 'EWL');
        // v0.62.602 — surface a popup once on first load (operator: "like first
        // load in Cuisine TMA"). v0.62.659 — operator superseded the auto-shown
        // status popup with an explicit "select a line" prompt + a blinking EWL
        // chip; the status info is still one tap away on the status chip.
        if (!firstPopupRef.current) {
          firstPopupRef.current = true;
          setPopup('pickline');
          setBlinkCode('EWL');
        }
      })
      .catch((err) => setError(err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // v0.62.598 — load the station card's shared datasets once: the rich
  // per-station info (/api/geo/stations), the coarse station list (for
  // terminus resolution + code lookups), and live platform crowd.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/geo/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setGeoStations(d.stations || d || {}); })
      .catch(() => { /* card degrades to coarse identity */ });
    fetch('/api/transport/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCoarseStations(Array.isArray(d.stations) ? d.stations : []); })
      .catch(() => { /* terminus links simply omitted */ });
    fetch('/api/transport/crowd')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCrowd(d.crowd || {}); })
      .catch(() => { /* crowd line omitted */ });
    return () => { cancelled = true; };
  }, []);

  // v0.62.598 — fetch the tapped station's amenity context (bus stops, taxi
  // stands, nearest hawker) whenever the focused station changes.
  useEffect(() => {
    if (!focusedStation || !Number.isFinite(focusedStation.lat) || !Number.isFinite(focusedStation.lng)) {
      setStationContext(null);
      return undefined;
    }
    let cancelled = false;
    setStationContext(null);
    fetch(`/api/transport/station-context?lat=${focusedStation.lat}&lng=${focusedStation.lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setStationContext(d); })
      .catch(() => { /* amenities section just omitted */ });
    return () => { cancelled = true; };
  }, [focusedStation]);

  // v0.62.106 — deep-link: /app/transport?station=<CODE> focuses that station
  // on the Google map (the Cuisine venue card's 🚆 links use this). Resolve the
  // code → station from the live dataset and focus it. We set ONLY focusedStation
  // (+ gmap view) — not focusedCode — so the line-change effect below can't wipe
  // it. Runs once on mount.
  useEffect(() => {
    let cancelled = false;
    let wanted = '';
    try { wanted = (new URLSearchParams(window.location.search).get('station') || '').trim().toUpperCase(); }
    catch { wanted = ''; }
    if (!wanted) return undefined;
    fetch('/api/transport/stations')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const stations = Array.isArray(d?.stations) ? d.stations : [];
        const st = stations.find((s) => Array.isArray(s.codes)
          && s.codes.some((c) => String(c).toUpperCase() === wanted));
        if (!st) return;
        setFocusedStation({ ...st, tappedCode: wanted });
        setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
      })
      .catch(() => { /* deep-link best-effort */ });
    return () => { cancelled = true; };
  }, []);

  // v0.61.14 — a station selection belongs to one focused line; clear
  // it whenever the focused line changes so the map / detail don't
  // show a station from the previous line.
  useEffect(() => { setFocusedStation(null); }, [focusedCode]);

  // v0.62.641 — the one-shot geolocation that fed the card's distance / walk time
  // is REMOVED with the walk row itself (operator: "remove distance walking in
  // train"). Nothing in this TMA consumes a user fix any more, so the Mini App no
  // longer raises a location permission prompt it cannot justify. `userLoc` stays
  // wired (always null) so StationCard's prop contract is unchanged.

  if (error) return <div className="p-4 text-tg-text">{t('error.unreachable', lang)} {error}</div>;
  // v0.62.636 (C1) — skeleton screen instead of a bare "Loading…" line.
  if (!data) return <LoadingSkeleton />;

  const affectedCodes = data.affectedCodes || [];
  const statusByLine = data.statusByLine || {};
  const focusedLine = focusedCode ? LINES_BY_CODE[focusedCode] : null;
  const focusedStatus = focusedCode ? statusByLine[focusedCode] : null;

  // v0.61.14 — station picked in the focused-line panel. Selecting a
  // station surfaces the Google Map (the 6 km station-focus view);
  // passing null clears the selection.
  function handleSelectStation(station, code) {
    if (station) {
      setFocusedStation({ ...station, tappedCode: code || station.focusCode });
      setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
    } else {
      setFocusedStation(null);
    }
  }

  // v0.62.598 — focus a station by one of its LTA codes (used by the station
  // card's terminus hyperlink). Resolves the code → station in the coarse list.
  function handleFocusStationCode(code) {
    if (!code || !Array.isArray(coarseStations)) return;
    const want = String(code).toUpperCase();
    const st = coarseStations.find((s) => (s.codes || []).some((c) => String(c).toUpperCase() === want));
    if (st) {
      setFocusedStation({ ...st, tappedCode: want });
      setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // v0.62.601 — the focused line's stations as StationCards (the wide-layout
  // "listing" / carousel items). Empty when no line is focused.
  const lineStations = (focusedCode && Array.isArray(coarseStations))
    ? lineStationsFull(coarseStations, focusedCode) : [];

  // v0.62.639 — operator (iPad mini): at 4/6 CSS-columns the station NAME
  // truncated to one letter ("EW1 P.."). Use a REAL grid with FEWER, wider
  // columns (2 portrait / 3 landscape; 1 phone) so the full name shows and the
  // tiles read as a uniform grid. Literal class strings so Tailwind's JIT keeps them.
  // v0.62.650 — operator: "two independent columns for iPhone portrait mode,
  // three independent columns in iPad / iPad mini".
  // v0.62.651 — operator: "Can you create dynamic awareness for desktop and ipad
  // landscape version? i think desktop version can have 4 columns". Device-class
  // buckets can't answer that: an iPad in landscape (1133 px) and a desktop
  // window (1440 px+) are both "wide", but only one of them has room for four
  // readable cards. So the column count is driven by the ACTUAL viewport width
  // via Tailwind breakpoints, which is what "dynamic awareness" needs to mean —
  // it also re-flows correctly when a Telegram Desktop window is resized, which
  // no device guess can do.
  //   < 768 px   2  — phone portrait
  //   ≥ 768 px   3  — iPad mini/iPad portrait, iPad landscape
  //   ≥ 1280 px  4  — desktop, iPad Pro landscape
  // "Independent" is already true: each tile is its own collapsible card in a
  // grid with `items-start`, so one expanding never stretches its neighbours.
  const gridColsClass = 'grid grid-cols-2 min-[700px]:grid-cols-3 xl:grid-cols-4';

  // v0.62.632 — the selected station's index within the focused line (drives the
  // carousel's centre-on-select). -1 when nothing is selected.
  const activeStationIndex = focusedStation
    ? lineStations.findIndex((s) => s.name === focusedStation.name) : -1;

  // ---- shared sub-elements (rendered into each layout below) ----
  const headerEl = (
    /* v0.62.164 — ONE neo-skeuomorphic header card.
       v0.62.603 — operator: standardise the header on the Cuisine TMA. Row 1 =
       title (left) + a flush-right cluster [language · temperature · refresh].
       Row 2 = the live SGT clock (date & time) then the tappable service status.
       Row 3 = the line pills. Colour-blind safe: status pairs a glyph/count with
       the hue. */
    <header className="font-inter skeuo-card rounded-2xl px-3 py-2.5 flex flex-col gap-1.5 relative z-10">
      <div className="flex items-center justify-between gap-2">
        {/* v0.62.602 — the title opens the data-source popup. */}
        <button
          type="button"
          onClick={() => setPopup('source')}
          aria-label={t('src.title', lang)}
          className="text-base font-bold leading-tight text-left truncate active:scale-95"
        >{t('header.title', lang)}</button>
        {/* v0.62.603 — Cuisine-standard flush-right cluster: language, temp, refresh. */}
        <div className="flex items-center gap-3 shrink-0">
          <LocaleToggle className="flex-shrink-0" />
          <span className="text-[11px] text-tg-hint flex items-center"><WeatherBadge /></span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            title={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            className="gia-hit text-[11px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
          >↻</button>
        </div>
      </div>
      {/* v0.62.659 — operator: "have the same location (show current location and
          nearest station) like cuisine TMA... allowing user to type on the train
          station name or train station code with auto-fill" — sits directly below
          the title, above the clock/status row. */}
      <StationLocationField
        lang={lang}
        onSelectStation={(s) => {
          // v0.62.690 — the field now also returns roads/addresses. An address has
          // no codes and no lines, so it must NOT become `focusedStation`: that
          // state drives StationCard, which would render a station detail panel
          // for something that is not a station. It gets the map + the inspection
          // overlay and nothing else.
          if (s.kind === 'address') {
            setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
            if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
              setTimeout(() => window.__giaMrtInspect?.(s.lat, s.lng, s.name || ''), 0);
            }
            return;
          }
          setFocusedStation({ ...s, tappedCode: (s.codes && s.codes[0]) || null });
          if (s.lines && s.lines[0]) { setFocusedCode(s.lines[0]); setBlinkCode(null); }
          setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
          // v0.62.689 — additionally drop the inspection overlay (temp pin +
          // rings + nearest 3 hawker centres). Deferred a frame because the pick
          // may be what switches the PNG view to the Google map, so the panel —
          // and the global it registers — may not exist yet at this point.
          if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
            setTimeout(() => window.__giaMrtInspect?.(s.lat, s.lng, s.name || ''), 0);
          }
        }}
      />
      {/* v0.62.603 — row 2: date & time (live SGT clock), then the tappable
          service status which opens the service / engineering popup. */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
        <span className="text-tg-hint"><LiveClock /></span>
        <span className="text-tg-hint" aria-hidden>·</span>
        <button type="button" onClick={() => setPopup('status')} className="active:scale-95">
          {affectedCodes.length === 0
            ? <span className="text-blue-500">{t('header.allNormal', lang)}</span>
            : <span className="text-amber-500">{tn(affectedCodes.length === 1 ? 'header.linesAffected' : 'header.linesAffectedPlural', lang, { n: affectedCodes.length })}</span>}
        </button>
      </div>
      {/* v0.62.597 — the overview (All Lines) + operating-line pills. */}
      <AffectedTicker
        compact
        affectedCodes={affectedCodes.length ? affectedCodes : LINES.filter((l) => !l.future).map((l) => l.code)}
        focusedCode={focusedCode}
        blinkCode={blinkCode}
        onFocus={(code) => {
          setFocusedCode(code);
          setBlinkCode(null);
          if (code && !autoSwitchedRef.current) {
            autoSwitchedRef.current = true;
            setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
          }
        }}
        statusByLine={statusByLine}
      />
    </header>
  );

  // The map block. `fillMode` makes MrtMapPanel fill its (bounded) parent — used
  // by the two-panel / carousel layouts; otherwise it self-sizes and tucks up
  // under the header (negative mt).
  const mapBlock = (fillMode, navInset = false) => (
    mapView === 'png'
      ? <div className={fillMode ? 'h-full overflow-auto rounded-2xl' : '-mt-3 relative z-0'}>
          <SystemMap focusedCode={focusedCode} affectedCodes={affectedCodes} />
        </div>
      : <div className={fillMode ? 'h-full' : '-mt-3 relative z-0'}>
          <MrtMapPanel
            fill={fillMode}
            navInset={navInset}
            focusedCode={focusedCode}
            focusedStation={focusedStation}
            onStationSelect={handleSelectStation}
            onLineSelect={(code) => setFocusedCode(code)}
            statusByLine={statusByLine}
            lang={lang}
            overlayLayers={overlayLayers}
            onOverlayChange={setOverlayLayers}
          />
        </div>
  );

  // One station's rich StationCard (used in the wide list + carousel). Tapping
  // it focuses that station (card ↔ pin: the map reframes on focusedStation).
  // v0.62.651 — operator: "as a foreigner to Singapore i wouldn't know how to read
  // the cards if presented in columns for listing."
  //
  // The diagnosis: MRT stations are an ORDERED SEQUENCE, and a single column
  // encoded that for free — reading down the list IS travelling along the line.
  // Two, three or four columns destroy it: there is no way to tell whether to
  // read across or down, and a visitor has no prior knowledge that "EW1, EW2,
  // EW3…" counts along the track. The grid was silently throwing away the one
  // piece of information a stranger needs most.
  //
  // Two additions restore it without giving up the columns:
  //   • this header — the line, its two termini, and the direction of travel
  //   • an explicit ordinal on every card ("3 / 35"), below
  // Together they make the order readable in ANY column count, which is exactly
  // what a device-independent grid needs.
  const lineOrderHeader = (focusedLine && lineStations.length > 1) ? (
    <div className="rounded-lg border border-tg-border bg-tg-card px-2 py-1.5 flex items-center gap-2 text-[10px] leading-tight">
      <span style={{ background: focusedLine.hex, color: '#fff' }}
        className="font-bold rounded px-1.5 py-0.5 text-[10px] leading-none shrink-0">{focusedCode}</span>
      <span className="font-semibold text-tg-text shrink-0">{lineName(focusedCode, focusedLine.name, lang)}</span>
      <span className="text-tg-hint min-w-0 truncate">
        {lineStations[0].name} → {lineStations[lineStations.length - 1].name}
      </span>
      <span className="ml-auto shrink-0 text-tg-hint tabular-nums">
        {tn('mrt.stopsCount', lang, { n: lineStations.length })}
      </span>
    </div>
  ) : null;

  const renderStationCard = (st, i, glass = false, compact = false, collapsible = false, seq = null, seqTotal = null) => {
    const rich = geoStations ? (geoStations[st.name] || null) : null;
    const active = !!focusedStation && focusedStation.name === st.name;
    return (
      <StationCard
        key={st.focusCode || st.name || i}
        station={rich}
        coarse={{ ...st, tappedCode: active ? focusedStation.tappedCode : st.focusCode }}
        context={active ? stationContext : null}
        crowd={crowd}
        statusByLine={statusByLine}
        coarseStations={coarseStations}
        lang={lang}
        active={active}
        glass={glass}
        compact={compact}
        collapsible={collapsible}
        isCompact={vp.isCompact}
        seq={seq}
        seqTotal={seqTotal}
        userLoc={userLoc}
        onTap={() => handleSelectStation(st, st.focusCode)}
        onFocusStationCode={handleFocusStationCode}
      />
    );
  };

  // The single tapped-station card (shown when no line is focused).
  const singleFocusedCard = focusedStation ? (
    <StationCard
      station={geoStations ? (geoStations[focusedStation.name] || null) : null}
      coarse={focusedStation}
      context={stationContext}
      crowd={crowd}
      statusByLine={statusByLine}
      coarseStations={coarseStations}
      lang={lang}
      userLoc={userLoc}
      isCompact={vp.isCompact}
      onClose={() => handleSelectStation(null)}
      onFocusStationCode={handleFocusStationCode}
    />
  ) : null;

  // The line-status + you-are-here + engineering panels (secondary content).
  const secondaryPanels = (
    <>
      {focusedLine && (
        <LineStatusPanel
          line={focusedLine}
          status={focusedStatus}
          statusByLine={statusByLine}
          selectedStation={focusedStation}
          onSelectStation={handleSelectStation}
          lang={lang}
          hideStationDetail={!!focusedStation}
        />
      )}
      <LocationCard address={data.address} nearest={data.nearestMrt} lang={lang} />
    </>
  );

  // v0.62.602 — the two header popups. The status chip (and the first-load
  // auto-open) surfaces the service status + engineering closures; the title
  // surfaces the data-source attribution. Both are `fixed` so they overlay any
  // layout; rendered once alongside the footer bar in each return below.
  const popups = (
    <>
      {popup === 'pickline' && (
        <Modal title={t('pickline.title', lang)} onClose={() => { setPopup(null); setBlinkCode(null); }}>
          <div className="text-xs text-tg-hint">{t('pickline.body', lang)}</div>
          <div className="grid grid-cols-2 gap-2">
            {LINES.filter((l) => !l.future).map((line) => (
              <button
                key={line.code}
                type="button"
                onClick={() => {
                  setFocusedCode(line.code);
                  setBlinkCode(null);
                  setPopup(null);
                  if (!autoSwitchedRef.current) {
                    autoSwitchedRef.current = true;
                    setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-tg-border bg-tg-bg text-left active:scale-95"
              >
                <span className="inline-block w-3 h-3 rounded shrink-0" style={{ background: line.hex }} />
                <span className="text-xs font-medium truncate">{lineName(line.code, line.name, lang)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {popup === 'status' && (
        <Modal title={t('status.popupTitle', lang)} onClose={() => setPopup(null)}>
          <div className="text-xs">
            {affectedCodes.length === 0
              ? <span className="text-blue-500 font-semibold">{t('header.allNormal', lang)}</span>
              : <span className="text-amber-500 font-semibold">{tn(affectedCodes.length === 1 ? 'header.linesAffected' : 'header.linesAffectedPlural', lang, { n: affectedCodes.length })}</span>}
          </div>
          {affectedCodes.length > 0 && (
            <div className="flex flex-col gap-1">
              {affectedCodes.map((code) => {
                const ln = LINES_BY_CODE[code];
                const st = statusByLine[code]?.status || 'delay';
                return (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span className="inline-block w-3 h-3 rounded" style={{ background: ln?.hex || '#888' }} />
                    <span className="font-semibold">{code}</span>
                    <span className="text-tg-hint">· {t(`mrt.status.${st}`, lang)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="border-t border-tg-border pt-2">
            <EngineeringList closures={data.engineering || []} />
          </div>
        </Modal>
      )}
      {popup === 'source' && (
        <Modal title={t('src.title', lang)} onClose={() => setPopup(null)}>
          <div className="text-xs text-tg-text leading-relaxed">{t('src.body', lang)}</div>
          <div className="text-[10px] text-tg-hint">{t('footer.tag', lang)} · v{BUILD_VERSION}</div>
        </Modal>
      )}
    </>
  );

  // v0.62.217/597/600 — the fixed bottom bar: version + view toggle (left) and
  // top/down & back/end nav (right). Shared across every layout.
  const footerBar = (
    <div
      /* v0.62.649 — operator: "the footer be 75% liquid glass effect which is the
         standard". Was `bg-tg-bg/95 backdrop-blur` (near-opaque, and the /95 was
         being dropped by the palette bug anyway). Now the shared
         `.liquid-glass-dock` at the standard 75 %. */
      className="fixed bottom-0 inset-x-0 z-40 bg-tg-bg/75 liquid-glass-dock border-t border-tg-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] text-tg-hint leading-tight truncate">
            {t('footer.tag', lang)} · v{BUILD_VERSION}
          </span>
          {/* v0.62.606 — layout toggle: carousel (map-first) ⇄ list (two-panel).
              The label names the view you'll switch TO. */}
          <button
            type="button"
            onClick={() => withViewTransition(() => setViewMode((m) => (m === 'carousel' ? 'list' : 'carousel')))}
            aria-label={viewMode === 'carousel' ? t('layout.list', lang) : t('layout.map', lang)}
            className="skeuo-pill px-2.5 py-1 rounded-lg text-[11px] font-medium text-tg-text active:scale-95 whitespace-nowrap shrink-0"
          >{viewMode === 'carousel' ? t('layout.list', lang) : t('layout.map', lang)}</button>
          <button
            type="button"
            onClick={() => withViewTransition(() => setMapView((v) => (v === 'png' ? 'gmap' : 'png')))}
            aria-label={mapView === 'png' ? t('view.btnGoogleMap', lang) : t('view.btnSchematic', lang)}
            className="skeuo-pill px-2.5 py-1 rounded-lg text-[11px] font-medium text-tg-text active:scale-95 whitespace-nowrap shrink-0"
          >{mapView === 'png' ? t('view.btnGoogleMap', lang) : t('view.btnSchematic', lang)}</button>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-tg-link shrink-0">
          {/* v0.62.606 — ⇡/⇣ scrolls the LIST panel (list mode only; the carousel
              has nothing to scroll vertically). */}
          {viewMode === 'list' && (
          <button
            type="button"
            onClick={() => { const el = listScrollRef.current; if (el) el.scrollTo({ top: listAtBottom ? 0 : el.scrollTop + el.clientHeight, behavior: 'smooth' }); }}
            aria-label={listAtBottom ? t('fab.topAria', lang) : t('fab.downAria', lang)}
            className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
          >{listAtBottom ? t('fab.top', lang) : t('fab.down', lang)}</button>
          )}
          <button
            type="button"
            onClick={() => {
              const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
              if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
              else if (w && typeof w.close === 'function') w.close();
            }}
            aria-label={(typeof window !== 'undefined' && window.history.length > 1) ? t('fab.backAria', lang) : t('fab.endAria', lang)}
            className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
          >{(typeof window !== 'undefined' && window.history.length > 1) ? `⇠ ${t('fab.back', lang)}` : `🔚 ${t('fab.end', lang)}`}</button>
        </div>
      </div>
    </div>
  );

  const fixedShellStyle = {
    paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))'
  };

  // ---- LIST mode (toggled): a Google-Maps-style DRAGGABLE bottom-sheet DRAWER
  //      of the station grid, floating OVER the full-bleed map (operator: "Drawer
  //      effect for listing means is another layer on top of the map. I thought we
  //      had that in other TMA" — Hawker/Cuisine parity). Was a two-panel split
  //      (fixed map + scrolling grid). The grid is a real 2/3-col grid of
  //      collapsible tiles so the station NAME shows; each tile's ▾ expands its
  //      details in place. v0.62.639. ----
  if (viewMode === 'list') {
    // v0.62.650 — operator: "still in drawer layout reduce font size by 1 px".
    // The card's type is all `text-[Npx]`, i.e. ABSOLUTE — so a rem/em scale on an
    // ancestor cannot reach it. `gia-list-dense` (styles.css) steps every absolute
    // size inside the drawer's grid down by exactly 1 px, which is what makes two
    // columns on a phone readable rather than merely narrower.
    // (Comment lives HERE, not inside the ternary: a {/* … */} as the first token
    // of a parenthesised JSX expression is a syntax error — this is the third time
    // it has broken a build. See v0.62.640 and v0.62.646.)
    const listBody = lineStations.length > 0
      ? (
        <div className="px-2 pt-1 flex flex-col gap-2 gia-list-dense">
          {lineOrderHeader}
          <div ref={gridParent} className={`${gridColsClass} gap-2 items-start`}>
            {lineStations.map((st, i) => (
              <React.Fragment key={st.focusCode || st.name || i}>
                {renderStationCard(st, i, false, true, true, i + 1, lineStations.length)}
              </React.Fragment>
            ))}
          </div>
          {secondaryPanels}
        </div>
      )
      : (singleFocusedCard ? <div className="px-2 pt-1 flex flex-col gap-2">{singleFocusedCard}{secondaryPanels}</div> : <div className="px-2 pt-1">{secondaryPanels}</div>);

    // v0.62.661 — operator: an iPhone in LANDSCAPE + list mode has too little
    // vertical room (~375-430px) for the drawer to show any real amount of list
    // AND leave the map visible — even the 1/4 peek obstructs a large share of
    // the screen. Carved out to a static two-panel split instead: the map
    // anchored in a bounded top box (does not scroll away), the station grid in
    // its own independently-scrollable panel below. Every other case (portrait
    // phone, any tablet/desktop orientation) keeps the drawer, unchanged.
    if (vp.deviceClass === 'mobile' && vp.orientation === 'landscape') {
      return (
        <>
          <div className="fixed inset-0 flex flex-col overflow-hidden bg-tg-bg text-tg-text" style={fixedShellStyle}>
            <div className="px-3 pt-2 shrink-0 relative z-20">{headerEl}</div>
            <div className="relative shrink-0 h-[38vh] px-3 pt-2 pb-1">{mapBlock(true)}</div>
            <div ref={listScrollRef} onScroll={onListScroll} className="flex-1 min-h-0 overflow-y-auto">
              {listBody}
            </div>
          </div>
          {popups}
          {footerBar}
        </>
      );
    }

    return (
      <>
        <div className="fixed inset-0 overflow-hidden bg-tg-bg text-tg-text"
          style={{
            paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}>
          {/* full-bleed map behind everything */}
          {/* v0.62.646 — NO z-0 here. A positioned element with an explicit z-index
              creates a STACKING CONTEXT, which trapped the map's fullscreen
              `fixed inset-0 z-[35]` expand overlay inside this z-0 box — so ⇲
              Expand "did nothing": the map DID go fullscreen but painted
              behind the z-30 drawer. `absolute inset-0` (z-auto) keeps the
              same paint order for the normal state and lets the overlay out. */}
          <div className="absolute inset-0">{mapBlock(true, true)}</div>
          {/* floating header over the map (only the card catches taps) */}
          <div className="absolute top-0 inset-x-0 z-20 px-3 pointer-events-none"
            style={{ paddingTop: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.5rem)' }}>
            <div className="pointer-events-auto">{headerEl}</div>
          </div>
          {/* the draggable station-list drawer over the map. v0.62.659 — operator:
              "if in list mode, only show 1/4 drawer" — opens on the collapsed snap
              (0.75 = 1/4 of the viewport visible) instead of the 0.48 half-screen
              default, so the map stays visible; the handle still drags/steps it up. */}
          <BottomSheet contentRef={listScrollRef} onContentScroll={onListScroll}
            snaps={[0.14, 0.48, 0.75]} initialSnap={2}
            ariaLabel={t('sheet.dragHandle', lang)}>
            {listBody}
          </BottomSheet>
        </div>
        {popups}
        {footerBar}
      </>
    );
  }

  // ---- SIDE-PANEL mode (desktop + landscape tablet) — REMOVED v0.62.625.
  //      v0.62.621 added a fixed left station-list column beside the map for the
  //      wide/desktop layout; operator (2026-07-21, desktop screenshot): "revert
  //      the side drawer it is aweful" — in the narrow left column the 35 station
  //      cards stacked into an unreadable run of coloured name strips. Reverted:
  //      wide / landscape / desktop now fall through to the CAROUSEL layout below
  //      (full-bleed map + a bottom station carousel), same as before v0.62.621.
  //      Phone portrait falls through there too since v0.62.648. ----

  // ---- DRAWER mode (phone portrait, carousel view) — REMOVED v0.62.648.
  //      v0.62.609 gave phone-portrait its own always-on bottom-sheet drawer in
  //      CAROUSEL view, so the phone never saw the carousel this TMA defaults to
  //      everywhere else. Operator (2026-07-27): "better experience to have both
  //      Hawker TMA and Train TMA in Cuisine's carousel card mode … these 2 TMA
  //      like Cuisine TMA can toggle to list which is how the drawer effect takes
  //      place." So the drawer is now reached ONE way, on every device: the
  //      footer's ⊿ List toggle (viewMode === 'list', handled above). Phone
  //      portrait falls through to the carousel below with everything else. ----

  // ---- CAROUSEL mode (DEFAULT, every device): the Cuisine desktop standard —
  //      header ON TOP, the map filling the rest, and the station carousel
  //      FLOATING over the map's bottom edge (map shows through the gaps).
  //      v0.62.628 — operator: "carousel cards … and the Google Map aspect size is
  //      the standard [Cuisine] … the other 2 TMA (Hawker, Train) follow exactly."
  //      v0.62.629 — operator: the v0.62.628 attempt floated the HEADER over the
  //      map, which COVERED the map's quick-access toggle row (Monochrome / Train /
  //      Carpark / Bus Stop / Hawker) + nav cluster ("missing buttons"). Cuisine
  //      keeps its header ABOVE the map (sticky) and floats only the cards — mirror
  //      that: header in flow (shrink-0), map fills flex-1, carousel absolute over
  //      the map's bottom. `mapBlock(true)` (navInset off) since the header no
  //      longer overlaps the map. Carousel is EMPTY on first load (map only). ----
  return (
    <>
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-tg-bg text-tg-text" style={fixedShellStyle}>
        <div className="px-3 pt-2 shrink-0 relative z-20">{headerEl}</div>
        <div className="relative flex-1 min-h-0 px-3 pt-2 pb-1">{mapBlock(true)}</div>
      </div>
      {/* v0.62.630 — operator ("i expand the screen, the cards are gone"): the
          carousel used to live INSIDE the map's flex container at z-30, so the
          map's ⇲ Expand overlay (fixed inset-0 z-[35]) painted over it and the
          cards vanished when expanded. Make the carousel a FIXED sibling at z-[38]
          — above the expand overlay (z-[35]), below the footer (z-40) — so it
          floats over the map's bottom edge in BOTH the normal and expanded states
          and the cards stay visible. */}
      {/* v0.62.640 — operator ("see the footer that covers the text"): the carousel
          sat at a fixed bottom-14, which on an iPad with a bottom safe-area inset
          let the fixed footer dock overlap the cards' last row. Offset by the REAL
          footer height + the safe-area inset so a card always clears the dock. */}
      {(lineStations.length > 0 || singleFocusedCard) && (
        <div className="fixed inset-x-0 z-[38] pointer-events-none"
          style={{ bottom: 'calc(3.25rem + env(safe-area-inset-bottom, 0px))' }}>
          {lineStations.length > 0
            ? <StationCarousel items={lineStations} activeIndex={activeStationIndex} isWide={vp.isWide}
                render={(st, i, glass) => renderStationCard(st, i, glass, true, true)} />
            : <div className="px-3 max-w-md mx-auto max-h-[44vh] overflow-y-auto pointer-events-auto">{singleFocusedCard}</div>}
        </div>
      )}
      {popups}
      {footerBar}
    </>
  );
}
