import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery, warmStart, fetchUserLocation, reverseGeocode, saveUserLocation, fetchCountryPref, saveCountryPref, fetchRatingPref, saveRatingPref, startSession, backOnePage, recycleSession, iataSnap } from './lib/api.js';
import { IATA_CITIES, nearestIataCity } from '../../../_shared/lib/iata-cities.js';
import { OTHER_COUNTRIES } from './lib/countries.js';
import { cuisineName } from './lib/cuisine-i18n.js';
import { CITIES_BY_COUNTRY, findCity, cityRadiusCapM } from './lib/cities.js';
import { defaultState, clearedFilters, readFromHash, readOverridesFromHash, writeToHash } from './lib/state.js';
import { coordsToCountry, isJbCoords } from './lib/coords-to-country.js';
import { startLocationSync } from '../../../_shared/lib/location-sync.js';
// v0.62.561 — O-54 responsive port: shared device/orientation hook (drives the
// tablet/desktop card-count in the result strip + the footer device cue).
import BottomSheet from '../../../_shared/components/BottomSheet.jsx';
import { useViewport, viewportTag } from '../../../_shared/lib/use-viewport.js';
// P1-d — shared dialog behaviour (focus trap / initial focus / Escape /
// focus restore) for the three coherence modals below.
import { useDialog } from '../../../_shared/lib/use-dialog.js';
import { shouldFollowDevice } from './lib/location-follow.js';
import { resolveSearchCenter } from './lib/search-location.js';
// v0.61.277 — for the JB region-pill auto-anchor on tap.
import { JB_FOCUS_POINTS, JB_FOCUS_DEFAULT } from './lib/jb-focus-points.js';
import { groupByAwardCity, initialFitPins, pinsOf } from './lib/michelin-city-groups.js';
// v0.62.700 (O-124) — the union of every country's Michelin editions, which
// decides WHICH year ticks exist (michelinYearsByCC decides which are live).
import { unionYears } from './lib/michelin-years.js';
// v0.61.285 — fun-fact modal for the rotating-search wait window.
import FunFactModal from './components/FunFactModal.jsx';
import AnimatedStar from './components/AnimatedStar.jsx';
import { pickFunFact, dishFactsFromPlate } from './lib/fun-facts.js';
// v0.61.272 — Phase 4 (audit ledger C1+C2): the SG_ONLY_SLUGS whitelist
// previously stripped Fruits / Durian / Durian Pastry from the chip
// list when state.region !== 'SG'. Operator's PLATFORM REFRACTORING
// spec demanded the strict whitelist be removed so durian / fruits
// chips load globally — MY, ID, TH, VN, PH, JP, anywhere. The file
// `lib/sg-only-slugs.js` is deleted in this PR.
import QuickFilters from './components/QuickFilters.jsx';
import ActiveFilters from './components/ActiveFilters.jsx';
import CuisineDrawer from './components/CuisineDrawer.jsx';
import LocationField from './components/LocationField.jsx';
import MapPanel from './components/MapPanel.jsx';
import TellMePanel from './components/TellMePanel.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import InsightStrip from './components/InsightStrip.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
// v0.62.136 — operator: the horizontal result CAROUSEL is replaced by the
// Google-Maps-style ResultDrawer (vertical by default; flips to horizontal
// via the ↰/↴ toggle FAB). ResultCarousel.jsx is retired from the render.
import ResultDrawer from './components/ResultDrawer.jsx';
import ArrivalPlate from './components/ArrivalPlate.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';
import WeatherBadge from './components/WeatherBadge.jsx';
import { useLocale, t, tn } from './lib/i18n.js';
import { tg, hasInitData, getTelegramLocation, openTelegramLocationSettings } from '../api/tg.js';
import { giaToggleStyle } from './lib/mapOverlays.js';

// v0.61.362 — countries the Cuisine OTHER picker can represent. The
// 20 s location-sync only follows the device into one of these (else it
// leaves region/countryPref untouched).
const CUISINE_OTHER_CODES = new Set(OTHER_COUNTRIES.map((c) => c.code));

// v0.61.437 — ONE rule for "does the Michelin chip make sense here" (code
// review F5/F15: the region pill and the country dropdown each had their own
// — or no — rule, and the pill's stripped a valid selection while the
// catalogue was still loading). Returns:
//   true  → Michelin valid (SG, or a country in the catalogue's list)
//   false → provably NOT valid (JB; or a country known to lack a list)
//   null  → UNKNOWN (catalogue not loaded / country not yet resolved)
// Callers must strip the chip ONLY on `false` — never on `null` (fail-open;
// the server answers honestly via reasonCode when it truly has no list).
function michelinAllowedFor(region, countryPref, catalogue) {
  if (region === 'SG') return true;
  if (region === 'JB') return false;
  const cc = region === 'MY-PUT' ? 'MY' : String(countryPref || '').toUpperCase();
  if (!cc) return null;
  const michCat = Array.isArray(catalogue) ? catalogue.find((c) => c.id === 'michelin') : null;
  if (!michCat || !Array.isArray(michCat.michelinCountries)) return null;
  return michCat.michelinCountries.map((x) => String(x).toUpperCase()).includes(cc);
}

// v0.61.51 — operator CR7: floating FABs must not use green
// (washed-out against the Google Map). The bg/colour come from the
// shared giaToggleStyle palette (theme-aware amber-on-white / dark
// slate). `active` = the "selected" state (Search FAB when dirty).
function fabBgFg(active) {
  const s = giaToggleStyle(active);
  return { backgroundColor: s.background, color: s.color };
}

// v0.61.325 — specific place labels for the anchor-coherence modal.
// Operator (05-06 '26): the v0.61.321 mismatch prompt named neither
// place — "your saved spot" vs "somewhere else" was too vague. Build
// a concrete human label from coords (+ an optional reverse-geocoded
// street/area name): prefer "{name}, {city}, {country}", falling back
// to "{name}, {country}" / "{city}, {country}" / just the name.
//
// City + country come from nearestIataCity(lat,lng), which is fully
// synchronous (haversine over the frozen IATA table) and returns
// { city: { name, country, countryCode, ... }, distanceKm }. So a
// useful "City, Country" label is always available immediately, with
// no API call; the caller optionally upgrades the device label with a
// reverse-geocoded street/area name when that async result lands.
function placeLabel({ lat, lng, name } = {}) {
  const clean = (s) => (typeof s === 'string' ? s.trim() : '');
  const name0 = clean(name);
  let city = '';
  let country = '';
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const near = nearestIataCity(lat, lng);
    if (near?.city) {
      city = clean(near.city.name);
      country = clean(near.city.country);
    }
  }
  // De-dupe: if the reverse-geocoded name equals the city (e.g. "Singapore"
  // resolved as both), don't repeat it.
  const parts = [];
  if (name0) parts.push(name0);
  if (city && city.toLowerCase() !== name0.toLowerCase()) parts.push(city);
  if (country) parts.push(country);
  if (parts.length) return parts.join(', ');
  // Last resort — no name, no IATA hit: a coarse coord string beats blank.
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
  return name0 || '';
}

// v0.62.655 — operator: "build in the overlay drawer like Hawker TMA in Cuisine
// TMA in list mode ... it should show only 1.5 card height in list mode so user
// knows how to scroll up and down in the drawer and use drawer handle to expand".
//
// Cuisine's vertical result list had never been a drawer: it sat in PAGE FLOW
// below the map, which is why the audit found Cuisine to be the one map app
// without the over-the-map layer that Hawker and Train have had since v0.62.648.
//
// Wrapping in place (rather than relocating the ~350-line panel) keeps the
// existing refs, scroll handlers, pagination and flash-highlight wiring exactly
// as they are — the panel does not know it is now inside a sheet. When inactive
// this is a plain fragment, so horizontal mode is byte-for-byte unchanged.
function ResultSheetShell({ active, peekPx, label, children }) {
  if (!active) return <>{children}</>;
  return (
    <BottomSheet
      /* v0.62.657 — the collapsed snap is the operator's 1-card peek (peekPx,
         measured from a real card below via [data-pid]); the two taller snaps
         are the drag/tap targets. */
      snaps={[0.10, 0.45, 0.80]}
      initialSnap={2}
      peekPx={peekPx}
      ariaLabel={label}
    >
      {children}
    </BottomSheet>
  );
}

// v0.60.213 — build version for the footer (was a hardcoded "v0.60.4").
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
// v0.61.392 — the v0.61.182 build-timestamp chip (BUILD_TIME +
// _formatBuildTimeShort) was dropped from the footer per the operator;
// only the version is shown now. The `__BUILD_TIME__` vite define is left
// in place (harmless) so the chip can be reinstated easily if ever needed.

// v0.57.3: Singapore-wide search (no radius constraint).
// v0.58.1: layout — filter strip below map, active-filter chips below
//   Search/Clear, walking filter dropped, Halal default ON (later
//   reverted in v0.58.16).
// v0.59.0: redesign — map + active-filter chips + TellMePanel always
//   visible at top; Search criteria (filter chips + location field +
//   cuisine drawer + Search button) collapsible below; ResultPanel at
//   bottom. FlipPanel + Ask-Gia flip-card retired in favour of a
//   standalone TellMePanel. Cuisine drawer rebuilt as 8 category cards
//   with drill-down overlay (CuisineCategoryDrawer) replacing inline
//   expansion.
//   Order: Header → Region → Map → ActiveFilters → TellMe →
//          [▾ Search criteria] → Result → Footer
export default function App() {
  // v0.58.55: active locale (EN | FR). useLocale persists to
  // localStorage and re-renders on the 'gia:locale' CustomEvent
  // dispatched by LocaleToggle.
  const [lang] = useLocale();
  // v0.62.561 — O-54 responsive port: device/orientation (drives the result
  // strip's card-count on tablet/desktop + the footer cue). `isWide` = tablet
  // or desktop; phones stay `false` so their layout is provably unchanged.
  const vp = useViewport();
  const isWide = vp.isWide;
  // v0.62.567 — O-54 portrait two-panel: a wide device held in PORTRAIT gets the
  // Hawker two-panel (a static ~40vh map pinned at the top + the two-column list
  // scrolling below it); the map's ⇲ expands to the full carousel and ⇱ collapses
  // back. Landscape stays the full carousel.
  const portraitWide = isWide && vp.orientation === 'portrait';
  const footerTag = viewportTag(vp);
  // Tablet/desktop show 2–3 result cards in focus (the Hawker carousel basis);
  // phones keep the single-card strip.
  // v0.62.684 — operator's carousel-card spec: ONE width rule for every device
  // and orientation, replacing the six-rung responsive ladder that ran here
  // since v0.62.652.
  //
  // The ladder keyed off VIEWPORT width, which produced widths ranging 265px →
  // 609px and, worse, was non-monotonic: an iPad mini in PORTRAIT (744px, just
  // under Tailwind's 768px `md`) fell through to the phone's 82% and rendered a
  // 531px card, while the same device in LANDSCAPE took the 44% rung at 436px —
  // the portrait-wider-than-landscape inversion the operator reported. A phone
  // in landscape was worse still at 609px (82% of an 844px track).
  //
  // `min(82%, 20rem)` reproduces the operator's stated de facto exactly: the two
  // phone portraits stay under the cap on their own (82% of a 375px viewport is
  // 265px, of a 393px viewport 278px), and every wider surface pins to 320px.
  //
  // KNOWN TRADE, accepted by the operator after being shown the measured table:
  // this re-introduces a width cap of the kind v0.62.577 REMOVED (`max-w-[22rem]`,
  // dropped because it gave "more, flatter cards instead of a prominent centre +
  // two glass half-peeks"). At 320px an iPad mini in landscape shows ~3.0 cards
  // where the 44% rung showed ~2.3. That is the deliberate cost of one uniform
  // width; see the v0.62.684 Journal entry.
  const drawerBasisClass = 'basis-[min(82%,20rem)]';
  // v0.62.562 — O-54 (operator: "keep to the iPhone size"): on a tablet/desktop
  // the "Cuisine & filters" / "Pick local classic" folio tabs + their panels
  // stretched the full iPad width. Cap them to a centred phone-width column so
  // the picker reads like the phone. No-op on phones (already this width).
  // v0.62.573 — operator: left-aligned (top-left), not centred (no mx-auto).
  const pickerWidthCls = isWide ? 'max-w-md w-full' : '';
  const [catalogue, setCatalogue] = useState(null);
  // v0.62.x — auth guard. True when the Mini App was opened WITHOUT a valid
  // Telegram initData (outside Telegram, or a stale >24h launch) → every API
  // call 401s. Instead of a blank app silently 401-storming, show a clear
  // "reopen from Telegram" screen. Server auth is unchanged (still enforced).
  const [authBlocked, setAuthBlocked] = useState(false);
  // v0.61.445 — per-country+city Michelin cuisine coverage (from /catalogue):
  // { cc: { all:[…], byCity:{ "<City>":[…] } } }. Greys uncovered cuisine
  // chips under Michelin. Absent cc (e.g. SG) → fail open.
  const [michelinCuisinesByCC, setMichelinCuisinesByCC] = useState({});
  // v0.62.696 — which award years each country actually has (catalogue payload),
  // so the Michelin popup can grey a year nobody holds instead of offering a
  // tick that silently changes nothing.
  const [michelinYearsByCC, setMichelinYearsByCC] = useState({});
  const [state, setState] = useState(() => readFromHash());
  const [userLoc, setUserLoc] = useState(null);
  // v0.61.353 — location-state model (subset): the live map centre + an
  // imperative fly target. activeSearchLocation = locationAnchor || userLoc
  // (the confirmed anchor the search uses); previousSearch/selectedCity land
  // in the follow-up. The map view can drift from the active anchor (manual
  // pan / city preview) — the orange "↩ Back to last search area" helper
  // flies it back without touching the search anchor.
  const [mapViewLocation, setMapViewLocation] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  // v0.61.404 — operator: when the location-mismatch modal is resolved, show a
  // brief bottom toast narrating the move ("moved to …, 📍 to return to …") or,
  // when a far spot is KEPT, "tap 🔍 to search here". { text }.
  const [locMoveNote, setLocMoveNote] = useState(null);
  const locMoveTimerRef = useRef(null);
  // v0.61.404 — auto-dismiss the move toast after ~7 s.
  useEffect(() => {
    if (!locMoveNote) return undefined;
    const id = setTimeout(() => setLocMoveNote(null), 7000);
    return () => clearTimeout(id);
  }, [locMoveNote]);
  // v0.61.358 — debounce the city-preview map fly so rapid city switches don't
  // make the map jump unpredictably; only the latest pick (after a short quiet)
  // flies. selectedCityLocation + the Back button still update immediately.
  const cityFlyDebounceRef = useRef(null);
  // v0.61.354 — selectedCityLocation: a PREVIEWED city (from the OTHER city
  // dropdown). It flies the map but does NOT move the confirmed search anchor
  // (= locationAnchor) until the user taps 🔍 (commit in triggerSearch) or ↩
  // Back cancels it. activeSearchLocation = locationAnchor‖userLoc;
  // previousSearchLocation is implicitly locationAnchor (unchanged in preview).
  const [selectedCityLocation, setSelectedCityLocation] = useState(null);
  // v0.61.355 — recurring stale-flag fix: on load, poll device GPS + Telegram
  // location for ~20 s and FOLLOW the device (operator) — update flag/region,
  // userLoc, the anchor, and persist — when the user has physically moved
  // (>1.5 km, so GPS jitter or a stationary city pick is never yanked).
  const userLocRef = useRef(userLoc);
  useEffect(() => { userLocRef.current = userLoc; }, [userLoc]);
  // v0.61.371 — track the current locationAnchor so the "follow device"
  // sync can tell an EXPLICIT pick (Menu / deep-link anchor, which carries
  // a name) from an implicit device-GPS anchor (name ''). Kept in sync by
  // an effect after locationAnchor is declared.
  const locationAnchorRef = useRef(null);
  // v0.61.372 — flips true when the mount-time location resolution
  // (tryServerCache / GPS / centroid) has settled. The follow-device sync
  // must not fire before this, or its first GPS tick overwrites the
  // server-cached Menu pick before it's installed (the Wellington race).
  const initialResolveDoneRef = useRef(false);
  // v0.61.387 — operator: "first load just ask user to wait". Mirrors the
  // firstLoadPending state so the 20 s follow-sync (closure below) can hold
  // off re-searching until the boot load lands — a mid-load re-search also
  // pops a fact card on the first load, which the operator doesn't want.
  const firstLoadPendingRef = useRef(true);
  // v0.61.430 — "explicit pick wins". Flips true once the user deliberately
  // chooses a location / country / foreign region (a city pick, the country
  // dropdown, or an inherited Menu pick that lands in OTHER/JB). While true,
  // the 20 s device-follow yields — it must NOT drag a foreign pick back to
  // the SG device GPS (the country-drift bug). Resets to false on reload, so
  // device-follow still works on a plain GPS start with no pick.
  const explicitPickRef = useRef(false);
  // v0.62.97 — operator: tapping 🇸🇬 after a non-SG anchor (e.g. Johor → SG)
  // used to keep the old anchor (KL's Mid Valley) and only flip the flag.
  // Remember the last REAL Singapore anchor so the pill can restore it;
  // fall back to Merlion Park when none has been picked yet. Seeded from
  // localStorage so it survives reloads.
  const MERLION = { lat: 1.2867892, lng: 103.8545014, name: 'Merlion Park' };
  const lastSgAnchorRef = useRef(null);
  if (lastSgAnchorRef.current === null && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('gia.lastSgAnchor');
      lastSgAnchorRef.current = raw ? JSON.parse(raw) : undefined;
    } catch { lastSgAnchorRef.current = undefined; }
  }
  const syncStartedRef = useRef(false);
  useEffect(() => {
    if (syncStartedRef.current) return;
    syncStartedRef.current = true;
    // v0.61.372 — the move/jitter math now lives in the unit-tested
    // shouldFollowDevice (location-follow.js); no inline havM here.
    const stop = startLocationSync({
      current: userLocRef.current,
      onLocation: (loc) => {
        // v0.61.371/372 — operator: a Menu pick (e.g. Wellington / Tokyo) was
        // overwritten by the SG device GPS. The pure shouldFollowDevice rule
        // (location-follow.js, unit-tested) gates this: don't follow until the
        // mount resolution settled (initialResolveDoneRef — closes the race
        // where the first GPS tick clobbered the not-yet-installed cached
        // pick), and never follow off an EXPLICIT named anchor (Menu /
        // deep-link / LocationField). Sub-threshold jitter is ignored too.
        const cur = userLocRef.current;
        const anchorNow = locationAnchorRef.current;
        if (!shouldFollowDevice({
          initialResolveDone: initialResolveDoneRef.current,
          firstLoadPending: firstLoadPendingRef.current, // v0.61.387 — don't re-search over the boot load
          explicitAnchorName: anchorNow && anchorNow.name,
          explicitPick: explicitPickRef.current,          // v0.61.430 — explicit pick wins over device GPS
          current: cur,
          loc,
        })) return;
        console.log('[LocationSync] following device →', loc.lat.toFixed(4), loc.lng.toFixed(4), '(' + loc.source + ')');
        setUserLoc({ lat: loc.lat, lng: loc.lng });
        const c = coordsToCountry({ lat: loc.lat, lng: loc.lng });
        if (c === 'SG') {
          setState((s) => (s.region === 'SG' ? s : { ...s, region: 'SG' }));
        } else if (c === 'MY') {
          const target = isJbCoords({ lat: loc.lat, lng: loc.lng }) ? 'JB' : 'OTHER';
          setState((s) => { if (s.region === target) return s; const n = { ...s, region: target }; if (target === 'OTHER') n.countryPref = 'MY'; return n; });
        } else {
          // v0.61.362 — outside the SG/MY bbox, resolve the real country
          // globally (same nearestIataCity detector the mount auto-detect
          // uses) and follow it into the OTHER picker, so region + the
          // country flag track the device beyond SG/MY (operator: "the
          // 20 seconds codes will detect the location and the flag").
          const near = nearestIataCity(loc.lat, loc.lng);
          const cc = near && near.city && near.city.countryCode;
          if (cc && CUISINE_OTHER_CODES.has(cc)) {
            setState((s) => (s.region === 'OTHER' && s.countryPref === cc ? s : { ...s, region: 'OTHER', countryPref: cc }));
            saveCountryPref(cc).catch(() => {});
          }
        }
        setLocationAnchor({ lat: loc.lat, lng: loc.lng, name: '' });
        setSearchCenter({ lat: loc.lat, lng: loc.lng });
        setFlyTarget({ lat: loc.lat, lng: loc.lng, zoom: 13, _k: Date.now() });
        // v0.62.31 — ambient: an AUTOMATIC follow-sync save; the server's
        // D787 label-guard refuses it over a fresh labelled pick (defence-
        // in-depth under the v0.62.30 explicit-pick latch).
        saveUserLocation({ lat: loc.lat, lng: loc.lng, ambient: true }).catch(() => {});
      },
    });
    return stop;
  }, []); // eslint-disable-line
  const [venues, setVenues] = useState([]);
  // v0.62.205 — operator: when the "New" filter found nothing provably new nearby
  // and fell back to established spots, the server flags noProvenNew so we can say
  // "no new <cuisine> nearby" instead of passing established off as new.
  const [noProvenNew, setNoProvenNew] = useState(false);
  // v0.60.82 — server's AND/OR combo metadata for multi-cuisine
  // searches. { attempted: bool, matched: bool }. When attempted &&
  // !matched, ResultPanel renders the "No exact cuisine combination
  // found" banner above the first result card.
  const [comboInfo, setComboInfo] = useState(null);
  // v0.60.128 — "misrepresented dish" note. When the "Tell me" free-text
  // box names a dish from the curated table (server-side data/
  // Misrepresented Dish Dessert Drink.MD), the search response carries
  // { name, note } and we render it as a small info banner above the
  // result list. null when there's no match.
  const [misrepNote, setMisrepNote] = useState(null);
  // v0.60.129 — "Did you mean a cooking method?" pivot. When the Tell-me
  // box names a method from cooking-methods.js + the data/cooking method
  // reference by cuisine.md merge, the server returns { query, matches:
  // [{ slug, cuisine, method }] } and we render a small banner with
  // cuisine chips above the result list. Tapping a chip prefills that
  // cuisine into the criteria and re-runs the search.
  const [cookMethodPivot, setCookMethodPivot] = useState(null);
  // v0.61.126 — server tag indicating Fruits / Durian post-filter
  // dropped the count below the spec's "8-12 relevant" target. Null
  // otherwise; "fruits" / "durian" when set.
  const [specialModeNotice, setSpecialModeNotice] = useState(null);
  // v0.62.13 — operator: a zero result must be EVIDENT. The server tags WHY a
  // search returned nothing (zeroReason); this holds the i18n key for the
  // notice the result panel shows on a persistent empty list.
  const [zeroReasonKey, setZeroReasonKey] = useState(null);
  // v0.62.14 — durian soft-rating: server surfaced a sub-3.7 / unrated stall.
  const [durianRatingNote, setDurianRatingNote] = useState(false);
  // v0.61.397 — operator: durian / fruits / durian-pastry are blocked
  // outside the SE-Asian durian belt (SG/MY/ID/TH/PH/BN/VN). The server
  // returns { mode, country } in `specialModeBlocked`; the result panel
  // swaps the generic "No results" copy for a "only available in …" note
  // so the empty list reads as intentional, not as a failed search.
  const [specialModeBlocked, setSpecialModeBlocked] = useState(null);
  // v0.61.278 — O-25: server signals JB-hybrid filter wiped the pool
  // and fell back to OTHER (the v0.61.276 graceful exit fired). The
  // TMA renders an amber notice so the user knows their JB pick was
  // overridden — without this, results just silently came from the
  // OTHER path.
  const [jbFallbackNotice, setJbFallbackNotice] = useState(false);
  const [degradedNotice, setDegradedNotice] = useState(false);
  // v0.61.130 — surfaces v0.61.129 O-23: when the special-mode
  // widening pass actually escalated the radius, render a small
  // " · widened to N km" caption next to the limited card.
  // Null when widening didn't run; { fromM, finalM } when it did.
  const [specialModeWidenedInfo, setSpecialModeWidenedInfo] = useState(null);
  // v0.61.130 — surfaces v0.61.129 O-20: when the Tell-me box typed
  // text named a place, the backend pivots searchCenter to that
  // anchor; this state drives the "📍 Searching near …" pill above
  // the result list. Carries the stripped query remainder so we can
  // echo "Showing 'ramen' near Tiong Bahru MRT" rather than just the
  // place. Null when no anchor was detected.
  const [placeAnchor, setPlaceAnchor] = useState(null);
  // v0.60.131 — server declined a "Tell me" text that read like a
  // question/instruction rather than a dish/cuisine name.
  const [questionDeclined, setQuestionDeclined] = useState(false);
  // v0.60.28 — current page slice surfaced by ResultPanel. The map
  // shows only this slice so paging left/right also rotates the pins,
  // keeping the visual context aligned with what the user is reading.
  const [visibleVenues, setVisibleVenues] = useState([]);
  // v0.62.6 — Michelin city-grouped display (display layer only). When the
  // visible Michelin batch spans cities, the map either stays on the set
  // city's pins (Case A) or fit-bounds across all visible pins (Case B), and
  // a tapped city-jump row re-fits to that city's pins. `fitPins` is
  // { pins:[{lat,lng}], token } — token forces the MapPanel effect to re-run
  // on repeated taps of the same city. Null on non-Michelin pages.
  const [fitPins, setFitPins] = useState(null);
  const [loading, setLoading] = useState(true);
  // v0.61.50 — loading-overlay message variant + rotating-title index.
  // 'initial' (boot) → "loading random eateries…"; 'rotating' (user
  // search w/ changed criteria) → cycles through 6 titles; 'refresh'
  // (user search w/ unchanged criteria) → "refreshing same filters…".
  const [loadingReason, setLoadingReason] = useState('initial');
  const [rotatingIndex, setRotatingIndex] = useState(0);
  // v0.62.681 — operator: "when I first time open the Cuisine TMA, it should
  // fire 'first load…' like before … back to originally planned 'finding
  // eateries…' and the results."
  //
  // The overlay itself was verified intact and untouched by the recent audits:
  // it renders on `loading && !funFact`, `loadingReason` is still 'initial' on
  // the boot path (nothing but a user-initiated search flips it to
  // 'rotating'/'refresh'), and fun-facts are explicitly suppressed while
  // firstLoadPending — so the message it would show IS t('loading.initial')
  // ("Finding eateries" + the blinking …). What was never guaranteed is that
  // the message is on screen long enough to READ: the splash gate opens and
  // fires the boot search in a single commit, so a boot search that settles
  // fast (warm response cache, small pool) flips `loading` back to false within
  // a frame or two and the wait message flashes past — the TMA looks like it
  // jumps straight from "Confirming your location…" to results.
  //
  // Hold the first-load overlay for a readable minimum from the moment the gate
  // fires the boot load, independent of how fast the search settles, so a first
  // open always reads "Finding eateries…" → results. Only the BOOT path arms
  // this (the saved≠device mismatch path deliberately opens an EMPTY TMA with
  // no hourglass — v0.61.409 — and must stay that way), it is bounded by a
  // timer that always fires, and 🛑 Stop clears it, so it cannot wedge the
  // overlay open.
  const [bootOverlayHold, setBootOverlayHold] = useState(false);
  useEffect(() => {
    if (!bootOverlayHold) return undefined;
    // Long enough to read three words + the blinking ellipsis; short enough
    // that it never feels like an artificial stall on a fast connection.
    const BOOT_WAIT_MIN_MS = 900;
    const t = setTimeout(() => setBootOverlayHold(false), BOOT_WAIT_MIN_MS);
    return () => clearTimeout(t);
  }, [bootOverlayHold]);
  // v0.62.x — operator "🛑 Stop loading": holds the in-flight search's
  // AbortController so the loading pop-up's Stop button can cancel the stream.
  const searchAbortRef = useRef(null);
  // v0.62.x — the active plate (cuisinePlate || arrivalPlate), mirrored into a
  // ref so the fun-fact picker (effect declared above the plate states) can
  // read the current dish explanations without a temporal-dead-zone reference.
  const activePlateRef = useRef(null);
  // Abort the in-flight search (if any) and drop the loading overlay. Whatever
  // base/patched venues already streamed in stay on screen.
  const stopLoading = React.useCallback(() => {
    try { searchAbortRef.current?.abort(); } catch { /* already settled */ }
    searchAbortRef.current = null;
    setLoading(false);
    // v0.62.681 — a manual Stop also drops the first-load minimum-dwell hold;
    // otherwise Stop would appear not to work for the rest of the dwell.
    setBootOverlayHold(false);
    // v0.62.250 — a manual Stop must leave a CLEAN, current-code state: clear the
    // boot-load posture (else fun-facts stay suppressed + the follow-sync guard
    // stays armed) and un-dismiss the horizontal drawer so whatever venues
    // already streamed in show — never a stale fallback.
    if (firstLoadPendingRef.current) setFirstLoadPending(false);
    setDrawerDismissed(false);
    // v0.62.256 — operator: hitting Stop was revealing the "Choose your cuisine"
    // picker that had stayed OPEN under the loading overlay (a normal search
    // auto-closes it on results; a Stop never did). Close BOTH folio pickers so
    // Stop lands on the clean map, not a panel.
    setCuisinePickOpen(false);
    setClassicOpen(false);
  }, []);
  // v0.61.50 — cycle the 6 rotating loading titles every 1.5 s while a
  // user-triggered search with changed criteria is in flight.
  useEffect(() => {
    if (!loading || loadingReason !== 'rotating') return undefined;
    setRotatingIndex(0);
    const id = setInterval(() => setRotatingIndex((i) => (i + 1) % 6), 1500);
    return () => clearInterval(id);
  }, [loading, loadingReason]);
  // v0.61.285 — pick a NLB-sourced SG food-history fact 1.5 s after a
  // rotating-search starts. Skips fast searches (the 1.5 s gate
  // avoids a flash for sub-1.5 s round-trips), boot warm-start
  // ('initial'), and same-criteria refreshes ('refresh'). Cleared on
  // loading→false; FunFactModal enforces a 3 s minimum on-screen.
  const [funFact, setFunFact] = useState(null);
  // v0.62.78 — the first STREAMED result's name for the wait card ("show what
  // it found progressively"). Cleared at each search start; set only by the
  // NDJSON onBase/onPatch, so it never flashes the previous search's result and
  // is blank on the single-shot boot load.
  const [streamFirstName, setStreamFirstName] = useState(null);
  // v0.62.88 — when the in-range pool is exhausted and re-served (D793 recycle),
  // the server sends { count, capKm }; the TMA shows an honest "all N within X km"
  // note + a 🔭 Widen button (re-runs with widen:true → wider OTHER cap).
  const [allSeenInRange, setAllSeenInRange] = useState(null);
  // v0.62.90 — operator: Widen is a STICKY per-cuisine SWITCH (not a one-shot).
  // ON → every search for this cuisine uses the wider 40 km cap; resets to OFF
  // when the cuisine changes/clears (see the effect below).
  const [widenActive, setWidenActive] = useState(false);
  // v0.61.383 — operator Task 1: the wait can run up to ~60 s, so ROTATE
  // the fact every 15 s (was a single fact for the whole wait). First fact
  // after the 1.5 s flash-guard, then a fresh one every 15 s until the
  // search lands. Each pick avoids the last-10 seen this session.
  useEffect(() => {
    if (!loading) { setFunFact(null); return undefined; }
    // v0.61.387 — operator: the FIRST load shows ONLY the "please wait"
    // message, never a fact card. (A 20 s-sync re-search over a slow boot
    // load used to count as 'rotating' and pop one.) Fact cards are for
    // genuine subsequent searches only.
    if (firstLoadPendingRef.current) { setFunFact(null); return undefined; }
    if (loadingReason !== 'rotating') { setFunFact(null); return undefined; }
    const pick = () => {
      try {
        // v0.62.x — operator: mix the 📜 DISH explanations of the CURRENT plate
        // (cuisine plate if a cuisine is selected, else the city plate) into the
        // rotation — cuisine/city-scoped by construction. Read via a ref since
        // the plate states are declared below this effect.
        const extra = dishFactsFromPlate(activePlateRef.current);
        const fact = pickFunFact({
          cuisines: state.cuisines,
          region: state.region,
          countryPref: state.countryPref
        }, extra);
        if (fact) setFunFact(fact);
      } catch { /* swallow — never break the search on a modal-pick error */ }
    };
    let intervalId = null;
    const startId = setTimeout(() => {
      pick();
      intervalId = setInterval(pick, 10000); // v0.62.x — operator: rotate every 10 s
    }, 1500);
    return () => { clearTimeout(startId); if (intervalId) clearInterval(intervalId); };
  }, [loading, loadingReason, state.cuisines, state.region, state.countryPref]);
  // v0.60.32 — first-load indicator. Set to true on mount, cleared
  // after the first venues array arrives. Drives the "Please wait
  // while loading list…" banner so the user knows the longer initial
  // fetch (warm-start + travel-times + footfall enrichment for the
  // first batch) is intentional, not a hang. Subsequent searches in
  // the same TMA session are fast enough that the regular spinner
  // suffices.
  const [firstLoadPending, setFirstLoadPending] = useState(true);
  // v0.61.387 — keep firstLoadPendingRef (read by the follow-sync guard +
  // the fact-card gate, both declared above) in sync with the state.
  useEffect(() => { firstLoadPendingRef.current = firstLoadPending; }, [firstLoadPending]);
  // v0.62.90 — reset the Widen switch whenever the cuisine selection changes
  // (operator: "once the cuisine is closed, it would be off").
  useEffect(() => { setWidenActive(false); }, [JSON.stringify(state.cuisines || [])]);
  const [error, setError] = useState(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState(null);
  // v0.62.138 — operator: results DEFAULT to the horizontal floating card strip
  // (ResultDrawer) over the map; the vertical list (page ResultPanel) is hidden
  // until the user toggles to 'vertical'. 'horizontal' | 'vertical'.
  const [drawerMode, setDrawerMode] = useState('horizontal');
  // v0.62.564 — O-54 (operator: "not allow list in landscape, only when user
  // rotate to portrait"). On a tablet/desktop the results surface follows the
  // ORIENTATION — LANDSCAPE = the map + carousel (horizontal), PORTRAIT = the
  // list (vertical) — and the manual list/map toggle is hidden (below). Phones
  // keep the manual toggle and are unaffected (the effect no-ops when !isWide).
  // v0.62.654 — operator: "proceed to code to make all three consistent". This
  // effect was the last thing keeping Cuisine out of line with Hawker + Train.
  // It FORCED the view by orientation on every tablet/desktop — landscape →
  // carousel, portrait → list — so a wide PORTRAIT device could not stay on the
  // carousel: rotating reset the choice on every turn. Hawker and Train both
  // default to the carousel on every device and orientation and let the footer
  // toggle be the one way into the list (v0.62.648). Cuisine now does the same:
  // `drawerMode` seeds to 'horizontal' and nothing overrides the user's choice.
  //
  // Kept as an empty-dependency no-op rather than deleted so the v0.62.564 intent
  // ("not allow list in landscape, only when user rotate to portrait") stays
  // readable in the file — it was a deliberate decision, later reversed.
  // v0.62.177 — operator: switching to the vertical list scrolls to + briefly
  // highlights where it starts ("Results #") so the user sees where it went.
  const [resultsFlash, setResultsFlash] = useState(false);
  // v0.62.138 — ✕ "close list" dismisses the floating horizontal strip (→ map
  // only). Reset to false whenever a fresh result set arrives so a new search
  // re-shows the cards.
  const [drawerDismissed, setDrawerDismissed] = useState(false);
  // v0.62.280 — collapsed (💬 FAB) vs expanded (full-width pill) free-text composer.
  const [composerOpen, setComposerOpen] = useState(false);
  // v0.62.281 — "Criteria" dropdown in the control row (collapses the active-filter chips).
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  // v0.62.138 — a fresh (or grown) result set re-shows the floating strip even
  // if the user had dismissed the previous one.
  useEffect(() => { if (venues.length) setDrawerDismissed(false); }, [venues]);
  // v0.61.0 — map overlay layer toggles. Map-view state only; kept out
  // of `state` so it never enters the search query or a saved snapshot.
  const [overlayLayers, setOverlayLayers] = useState({ attractions: false, carpark: false, busstop: false, hawker: false, colour: true, train: true, exits: false, taxis: false, parks: false, police: false, clinics: false, hospitals: false });
  // v0.62.249 — operator ("why are there two codes"): the legacy footer
  // "Search criteria" bottom sheet (`criteriaOpen`) is REMOVED. It rendered a
  // SECOND copy of QuickFilters + CuisineDrawer that could resurface (with the
  // pre-white-panel styling) when a search was interrupted. Everything now goes
  // through the single header FOLIO drawer (`cuisinePickOpen`) below, which
  // already carries the filters, the cuisine grid, and its own 🔍 Search button.
  const [cuisinePickOpen, setCuisinePickOpen] = useState(false);
  // v0.62.479 — cuisine-picker drill depth (1 = sub-cuisine drawer, 2 = dish
  // list, 3 = dish detail), bubbled up from CuisineCategoryDrawer so the 🔙
  // back FAB can render in THIS component's bottom FAB cluster (correct stacking
  // context + placement one row above the 🔍 Search FAB). drillBackRef holds the
  // topmost layer's back handler; the FAB calls whatever is current.
  const [drillDepth, setDrillDepth] = useState(0);
  const drillBackRef = useRef(null);
  const onDrillChange = useCallback((depth, back) => {
    setDrillDepth(depth);
    drillBackRef.current = back;
  }, []);
  // v0.62.204 — operator: the cuisine / local-classic picker overlays must drop
  // down JUST BELOW the header tabs (in front of the map) — NOT at the footer.
  // Measure the (sticky) header's bottom edge so the overlays anchor there.
  const headerRef = useRef(null);
  const [headerBottom, setHeaderBottom] = useState(120);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => setHeaderBottom(Math.round(el.getBoundingClientRect().bottom));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  // v0.61.426 — per-chat minimum-rating preference, shared with the
  // chat-side /rating (/ra) command via one Redis key. Kept as a dedicated
  // hook (NOT in `state`) so the filter-reset paths (`{...defaultState()}`)
  // never clobber the user's saved rating. Seeded '3.7' so the pill reads
  // "≥3.7" on first paint (the v0.61.425 guarded default = toggled-on); the
  // mount effect below overwrites it with the server value.
  const [ratingPref, setRatingPref] = useState('3.7');
  // v0.61.428 — forward the rating as an explicit search criterion. Gate
  // it on having an AUTHORITATIVE value (mount-fetch succeeded OR the user
  // saved) so the boot auto-load can't override a chat /rating value with
  // the '3.7' default before the fetch resolves. While false, the search
  // omits ratingPref and the server falls back to the Redis pref.
  const [ratingLoaded, setRatingLoaded] = useState(false);
  // v0.62.x — operator pop-up set (amended copy + G3 decision via
  // AskUserQuestion: idle-return ACTUALLY resets the rating): every fresh
  // entry and every ≥2 min idle-return resets the rating to the Good+ 3.7
  // default — a custom rating lasts for the session only. { kind } is one of
  // 'reset' (idle/entry), 'intro' (first time on this device) or 'saved'
  // (after the panel's Save). Bottom toast, auto-dismissed ~7 s.
  const [ratingReminder, setRatingReminder] = useState(null);
  // v0.62.95 — operator: "Keep the rating line for as long as the loading
  // overlay is up < 15 seconds." The flat 7 s auto-dismiss dropped the
  // "Rating reset…" sub-line mid-wait on slow (>7 s) first loads (operator's
  // two-card screenshots: card 1 had the line, card 2 was the SAME overlay
  // after the 7 s timer fired). Now: while the loading overlay is up, hold the
  // reminder; once loading ends, fall back to the original ~7 s toast life —
  // but in every case enforce a hard 15 s ceiling from when it first showed.
  const ratingReminderShownAtRef = useRef(0);
  // v0.62.96 — operator: "on first load why repeat this leaked pop-up message
  // which is after the first card". The initial loading overlay already shows
  // the reset/intro line; the same reminder then re-appeared as the bottom
  // toast once the overlay closed (the existing suppression only held WHILE
  // loading — and v0.62.95 keeps the reminder alive up to 15 s, so the leak
  // became reliable). Track whether the overlay displayed this reminder and, if
  // so, never repeat it as a toast (see the toast's render guard below).
  const [reminderShownInOverlay, setReminderShownInOverlay] = useState(false);
  useEffect(() => {
    if (!ratingReminder) {
      ratingReminderShownAtRef.current = 0;
      setReminderShownInOverlay(false);
      return undefined;
    }
    if (!ratingReminderShownAtRef.current) ratingReminderShownAtRef.current = Date.now();
    // The initial overlay shows this reminder for non-'saved' kinds while a
    // first-load (non-rotating / non-refresh) search runs — mark it consumed.
    if (loading && loadingReason !== 'rotating' && loadingReason !== 'refresh' && ratingReminder.kind !== 'saved') {
      setReminderShownInOverlay(true);
    }
    const capLeft = Math.max(0, 15000 - (Date.now() - ratingReminderShownAtRef.current));
    const delay = loading ? capLeft : Math.min(7000, capLeft);
    const id = setTimeout(() => setRatingReminder(null), delay);
    return () => clearTimeout(id);
  }, [ratingReminder, loading, loadingReason]);
  // v0.62.143 — operator: a custom rating must survive an idle-return (it was
  // resetting to Good+ 3.7 after ≥2 min hidden — the "leak" the operator saw).
  // The idle-return RESET is removed; the only visibility work kept is
  // dismissing a still-showing reminder toast as the TMA goes hidden, so it
  // can't bleed past a close (v0.62.131).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => { if (document.hidden) setRatingReminder(null); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  // v0.60.47 — 3s pulse on the "Edit search" pill after warm-start
  // delivers the first 5 suggestions. Mirrors the searchHintActive
  // pattern below for the floating 🔍 FAB.
  const [editSearchPulse, setEditSearchPulse] = useState(false);
  const [lastPrompt, setLastPrompt] = useState(null);
  const [lastRunSnap, setLastRunSnap] = useState(null);
  // v0.58.2: lat/lng anchor of the last successful search. The map
  // panel compares this against its current viewport centre to
  // decide when to surface "Search this area".
  const [searchCenter, setSearchCenter] = useState(null);
  // v0.58.4: id of the rotating warm-start seed that produced the
  // initial venue list (e.g. 'open-now-cheap'). Cleared once the user
  // runs a real search via the 🔍 Search button.
  const [warmStartSeed, setWarmStartSeed] = useState(null);
  // v0.58.10: respect bot-supplied overrides from the URL hash so a
  // pasted /cuisine command opens the TMA pre-anchored.
  // v0.58.18: dropped client-side radius state — the slider was
  // removed per Human Lead. Server falls back to its region defaults
  // (50 km SG / 18 km JB) when the search body has no `radius`.
  const initialOverrides = (typeof window !== 'undefined') ? readOverridesFromHash() : null;
  // v0.58.10: location anchor (LocationField pick OR bot-supplied
  // override). Threaded into the copy-syntax payload so the emitted
  // /cuisine command can deep-link the recipient back to the same
  // anchor.
  const [locationAnchor, setLocationAnchor] = useState(initialOverrides?.location || null);
  // v0.62.32 — Arrival Plate: the curated what-to-try card for the
  // anchored city, supplied by the server alongside the saved location.
  const [arrivalPlate, setArrivalPlate] = useState(null);
  // v0.62.x — cuisine "What to order" plate (from the search response when a
  // single cuisine is selected). Takes precedence over the geo city plate so
  // selecting Georgian shows Georgian dishes, not the city's classics.
  const [cuisinePlate, setCuisinePlate] = useState(null);
  // v0.62.x — mirror the active plate into activePlateRef so the loading
  // fun-fact picker can surface its 📜 dish explanations (declared above).
  useEffect(() => { activePlateRef.current = cuisinePlate || arrivalPlate; }, [cuisinePlate, arrivalPlate]);
  // v0.62.37 — the ⭐ Recommend 7-second explainer (operator: "when tap, it
  // will show in few 7 seconds what is this 'Recommend' means").
  const [recommendHint, setRecommendHint] = useState(false);
  const recommendHintTimerRef = useRef(null);
  // v0.61.371 — keep locationAnchorRef in sync so the mount-time location
  // sync (declared above, before this state) can read the CURRENT anchor and
  // hold an explicit pick instead of following the device off it.
  useEffect(() => { locationAnchorRef.current = locationAnchor; }, [locationAnchor]);
  // v0.61.205 — track the server-cached anchor's precinctId so the
  // OTHER region pill can show the Putrajaya flag PNG specifically
  // for the IOI Resort City anchor (other OTHER anchors — KL,
  // Bangkok, etc. — keep the generic 🌏 globe).
  const [anchorPrecinctId, setAnchorPrecinctId] = useState(null);
  // v0.60.126 — the free-text "Tell me" box value, lifted out of
  // TellMePanel so the Search-criteria 🔍 search passes it to the
  // server as a `freeText` qualifier (it was being silently dropped —
  // selecting a cuisine ignored whatever was typed in the box).
  const [nlText, setNlText] = useState((initialOverrides && initialOverrides.freeText) || '');
  const initialSearchDone = useRef(false);
  // v0.58.14: ref the FlipPanel wrapper so we can scroll the result
  // list into view after a successful 🔍 Search press. Users were
  // missing the result list because it sits below the cuisine drawer.
  const resultPanelRef = useRef(null);
  // v0.62.674 — ref on the fixed-bottom footer stack (back FAB row + composer
  // FAB row + the liquid-glass dock), so the drawer's collapsed peek height
  // can measure and reserve its REAL rendered height (see listPeekPx below).
  const footerRef = useRef(null);

  // v0.62.655 — the drawer's collapsed height, in REAL pixels: a result card
  // plus the sheet's own 44 px handle band. The operator asked for the fold to
  // follow the CARD, not a guessed fraction of the viewport (which lands right
  // on one device and wrong on every other). Measured from the first rendered
  // card and re-measured on resize; null until a card exists, at which point
  // BottomSheet falls back to its snap fraction.
  //
  // v0.62.657 — operator device-check (v0.62.655 shipped BROKEN): the selector
  // below matched NOTHING. ResultCard's root is a plain
  // `<button data-pid={venue.placeId} className="w-full text-left rounded-lg
  // border …">` — no `data-venue-card` attribute, no `<article>` tag, no
  // `.skeuo-card` class (that class does not appear anywhere in this app).
  // `listPeekPx` was therefore permanently null in production, and the sheet
  // was always on its 0.80-fraction FALLBACK — nowhere near "1 card". Fixed to
  // the selector ResultPanel.jsx already uses for its own scroll-into-view
  // logic (`[data-pid="…"]`), which is the one place in the codebase that is
  // guaranteed to keep matching a real card if this markup changes again.
  // Multiplier also dropped 1.5 → 1 per the operator's revised ask ("i wanted
  // only 1 card height instead of current 50% of the map").
  const [listPeekPx, setListPeekPx] = useState(null);
  useEffect(() => {
    const measure = () => {
      const panel = resultPanelRef.current;
      if (!panel) return;
      const card = panel.querySelector('[data-pid]');
      const h = card ? card.getBoundingClientRect().height : 0;
      // v0.62.674 — operator (device screenshot): the peeked card sat FLUSH
      // against the footer on first load, with no gap, unlike a fully-scrolled
      // card (which already clears the footer via BottomSheet's own footerPad
      // reserve). Root cause: this measurement only ever accounted for the
      // card + the sheet's own 44px handle band — it had NO idea a separate
      // `fixed bottom-0` footer stack paints on top of whatever the sheet
      // reveals at its bottom edge. Adding the footer's own real rendered
      // height (measured the same way the card height already is, not a
      // guessed constant) restores the same visual gap "normal" (scrolled)
      // cards get.
      const footerH = footerRef.current ? footerRef.current.getBoundingClientRect().height : 0;
      if (h > 40) setListPeekPx(Math.round(h + 44 + footerH));
    };
    measure();
    const t = setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    // v0.62.674 — a ResizeObserver on the footer (rather than adding its
    // content flags — criteriaSummary/isMichelinMode/pages — to this effect's
    // deps) re-measures whenever the footer's REAL height changes for any
    // reason (Criteria pill or Michelin pager appearing/disappearing,
    // locale-driven text reflow, …), without risking the exact
    // declared-later-in-this-component TDZ bug this file already caught once
    // (tma-hook-deps-tdz.test.js) — all three of those are declared well
    // after this effect.
    let ro;
    if (footerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(footerRef.current);
    }
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); if (ro) ro.disconnect(); };
    // v0.62.655 — deliberately NOT keyed on `cursor`: it is declared LATER in this
    // component, and a dep array is evaluated during render, so referencing it here
    // throws "Cannot access 'cursor' before initialization" on every render.
    // __tests__/tma-hook-deps-tdz.test.js caught exactly that.
    //
    // v0.62.658 — Codex review (P2, PR #1667): keyed on `venues.length` alone, a
    // new search that returns a SAME-SIZE batch of different venues never
    // re-ran this. ResultCard's height varies with its status/price/dish/
    // metadata rows, so `listPeekPx` could keep the PREVIOUS batch's card
    // height after the venues underneath it changed — real bug, not just a
    // hypothetical: two searches landing on the same result count is common.
    // Keyed on the first venue's own identity instead, so any change to WHICH
    // card is first re-measures, regardless of whether the count moved.
  }, [drawerMode, venues.length, venues[0] && venues[0].placeId]);

  // v0.62.681 — operator (device screenshots): on the FIRST open the carousel
  // card sat much closer to the "S$xx ~ xx · N gems | ★ …" recommendation strip
  // than it did after a search ("I want it consistent to be just 2 tiny spacing
  // above the strip"). Root cause: ResultDrawer's bottom offset was a hardcoded
  // GUESS — `hasFilters ? '6rem' : '4.5rem'` — left over from v0.62.186, when
  // the active-filter chips really did render as their OWN full-width row above
  // the dock. Since v0.62.192/281 those chips live INSIDE the dock as the inline
  // "Criteria (N) ▾" pill, so the footer's real height no longer changes when
  // filters exist — yet the drawer still lifted an extra 1.5rem (24px) whenever
  // any criteria did. First open (nothing picked yet → no criteria) took the
  // 4.5rem branch and landed nearly flush with the strip; after picking a
  // cuisine the 6rem branch gave the roomier gap. Same class of bug, and same
  // fix, as v0.62.674's footer-height reserve: MEASURE the strip's real top edge
  // instead of guessing at it, so the card sits a consistent, real gap above the
  // strip in every state (criteria or not, back-FAB row or not, locale reflow,
  // …). The gap itself is `STRIP_GAP_PX` in ResultDrawer.jsx — v0.62.682, set to
  // 5px by the operator after being shown what the two old states measured out
  // to (~-16px on first open, ~+8px after a search).
  //
  // Queried off `.insight-glass` (InsightStrip's inline root, the single place
  // that class is used) and scoped to the footer we already hold a ref to —
  // the same "match a stable selector that is guaranteed to keep matching"
  // precedent v0.62.657 set for `[data-pid]` after a hand-written selector
  // silently matched nothing in production.
  //
  // Deliberately NO dep array: this runs after every render and bails out when
  // the value is unchanged, so it can never go stale against a flag declared
  // LATER in this component — the exact TDZ trap `tma-hook-deps-tdz.test.js`
  // already caught once on the listPeekPx effect above.
  const [stripLiftPx, setStripLiftPx] = useState(null);
  useLayoutEffect(() => {
    const strip = footerRef.current ? footerRef.current.querySelector('.insight-glass') : null;
    // Both the strip and the drawer are `fixed`, so both resolve against the
    // same containing block — clientHeight is the layout viewport a `fixed`
    // element's `bottom` is measured from (unlike visualViewport, which shrinks
    // under the on-screen keyboard while fixed positioning does not move).
    const vh = (typeof document !== 'undefined' && document.documentElement.clientHeight)
      || (typeof window !== 'undefined' ? window.innerHeight : 0);
    // Keep the LAST good measurement when the strip is temporarily unmounted
    // (expanding the 💬 composer swaps the whole FAB row out for TellMePanel,
    // and the picker/region overlays hide the strip too). Falling back to the
    // calc() guess in those moments would visibly JUMP the card mid-interaction
    // — the composer already handles its own clearance via top headroom
    // (v0.62.288), and the drawer's bottom never tracked it before either.
    if (!strip) return;
    const next = Math.round(vh - strip.getBoundingClientRect().top);
    setStripLiftPx((prev) => (prev === next ? prev : next));
  });

  // v0.59.1: floating Search + Top buttons. `↑ Top` only surfaces
  // once the user has scrolled past the hero (map + active chips).
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  // v0.62.135 — operator (17-06 '26): tapping a DIFFERENT region/mode pill
  // surfaces the Location + "Local food picks" fields as an OPAQUE staging
  // area (header + both fields go solid, per light/dark theme) so the user
  // can confirm the new area before tapping 🔍. We scroll back to the top so
  // the in-flow fields are in view, and flag `modePeek` to drive the opaque
  // treatment. v0.62.144 — the fields are HIDDEN unless modePeek; firing a
  // search OR a downward scroll gesture clears it (fields disappear, header back
  // to liquid glass). Matches vertical mode (where the result list scrolls them
  // off); horizontal mode is a short page so they needed the explicit hide.
  const [modePeek, setModePeek] = useState(false);
  // v0.62.144 — track scroll position so a DOWNWARD scroll gesture dismisses the
  // peek (operator: the fields should disappear once you act/scroll, header back
  // to liquid glass). The programmatic scroll-to-top on a mode tap moves UPWARD,
  // so it never trips this.
  const lastScrollYRef = useRef(0);
  // v0.59.21: 3 s pulse on the 🔍 Search FAB after the user closes
  // the cuisine drawer with at least one cuisine selected — subtle
  // CTA "now press search" hint per Human Lead 2026-05-07.
  const [searchHintActive, setSearchHintActive] = useState(false);
  // v0.61.70 — flash the 🔍 Search FAB whenever a result set loads
  // (warm-start first paint or a Search-criteria run), drawing the eye
  // to the FAB. v0.61.79 — 2 s → 3 s, and a flashing arrow points at
  // the FAB for the same window (see the FAB row below).
  // v0.61.174 — 3 s → 5 s per operator + 👉 replaced with a speech-
  // bubble tooltip ("More eats? Tap 🔍") above the FAB.
  const [searchFabFlash, setSearchFabFlash] = useState(false);
  useEffect(() => {
    if (!venues || !venues.length) return undefined;
    setSearchFabFlash(true);
    const t = setTimeout(() => setSearchFabFlash(false), 5000);
    return () => clearTimeout(t);
  }, [venues]);
  // v0.61.79 — the "ℹ️ Google search limit · tap 🔍 again…" toast was
  // removed (operator request). Its state (`searchTipShow`), trigger,
  // and `tipFirstShownRef` guard are all gone; the 3 s FAB flash +
  // arrow are the standing cue that another 🔍 tap loads more.
  const [exhaustedNote, setExhaustedNote] = useState(false);
  // v0.61.234 — "limited coverage" hint shown when the selected cuisine
  // has genuinely few SG matches in Places (African / Georgian).
  // Operator-recommended set after the rare-cuisine investigation.
  const [sparseNotice, setSparseNotice] = useState(null);
  // v0.61.437 — Michelin zero/miss notice (code review F5/F6/F7): the
  // server's empty-Michelin responses carry a machine reasonCode, and a
  // combo page with zero cuisine matches carries cuisineMatched: 0 — both
  // previously rendered as an unexplained empty/wrong list. Holds an
  // i18n KEY (rendered through t() so locale switches re-translate).
  const [michelinNotice, setMichelinNotice] = useState(null);
  // v0.60.191 — sticky flag: did the last server response come back
  // as the planned 6-venue first batch? Used to suppress the v0.60.188
  // <12 auto-reset (which would otherwise loop 6 venues forever — see
  // Codex review on PR #440). The flag flips to false on the first
  // 12-venue follow-up; ↺ Start over wipes the seen-set server-side,
  // which makes the next response firstBatch=true again, so this
  // resets to true via the normal setFirstBatch(p.firstBatch) call.
  const [firstBatch, setFirstBatch] = useState(false);
  // v0.61.170 — counter-copy state. Server returns 1-based cumulative
  // range + finalBatch flag with every cuisine search response; the
  // TMA ResultPanel reads these to render the range labels.
  const [cumulativeStart, setCumulativeStart] = useState(null);
  const [cumulativeEnd, setCumulativeEnd] = useState(null);
  const [finalBatch, setFinalBatch] = useState(false);
  // v0.61.174 — `knownTotal` = monotonic max of `cumulativeEnd` for
  // this criteria. Powers the "Results: {known} · Showing A-B" title
  // copy. Resets to null on criteria change (alongside firstBatch).
  // SEEN_CAP mirrors the server-side cuisine-session.SEEN_CAP=100
  // bumped in v0.61.170; surfaces as `cumulativeCap` prop so the
  // header can render "Results: {cap}+ · Limit reached" when hit.
  const [knownTotal, setKnownTotal] = useState(null);
  const CUMULATIVE_CAP = 100;
  // v0.60.157 — zero-results auto-retry guard + CTA flag. When a search
  // returns `venues.length === 0`, runSearch fires exactly one silent
  // retry with `resetSeen: true` (covers the common case where the
  // long-lived per-criteria seen-set over-filtered legitimate matches).
  // If the retry also returns zero, `zeroRetried` flips on and the
  // empty-state renders a prominent 🔄 Reset filters & retry panel
  // (mirroring the exhausted-note pattern). `lastZeroRetrySnapRef` is
  // keyed by `stateSig(snap)` so the guard scopes per-criteria — the
  // same signature can never auto-retry twice; changing any criteria
  // implicitly arms a fresh budget.
  const lastZeroRetrySnapRef = useRef(null);
  const [zeroRetried, setZeroRetried] = useState(false);
  // v0.60.146 — per-session clipboard. `sessionFull` flips when the
  // server reports the 80-cap is reached; `pageStackDepth` is the
  // length of the back-page history (≥1 means the ⇠ Prev FAB is
  // enabled).
  const [sessionFull, setSessionFull] = useState(false);
  const [pageStackDepth, setPageStackDepth] = useState(0);
  // v0.60.149 — Michelin walk-through indicator. When the server's
  // Michelin response carries michelinSummary.remaining > 0, we surface
  // "X more curated Michelin places — tap 🔍 for the next 12" above the
  // result list so the user understands the per-call batch (12 venues)
  // is only a slice of the full ~130 curated list. Cleared on the next
  // non-Michelin search.
  const [michelinRemaining, setMichelinRemaining] = useState(null);  // null | { shown, remaining, total }
  // v0.62.31 — adversarial-review fix: the chip-name resolver used to
  // re-flatten the whole catalogue on EVERY ActiveFilters render. Memoize a
  // slug→name Map once per catalogue load instead.
  const cuisineNameBySlug = useMemo(() => {
    const map = new Map();
    if (Array.isArray(catalogue)) {
      for (const c of catalogue) for (const cu of (c.cuisines || [])) {
        if (cu?.slug && cu?.name) map.set(cu.slug, cu.name);
      }
    }
    return map;
  }, [catalogue]);
  // v0.62.293 (restored + combos) — strip metadata for "exact vs nearby" cards.
  //   SINGLE cuisine → { single: { label: "{cuisine} & Nearby Flavours", accent } }
  //     (one CVD-safe region accent; alternate cards w/o matchedCuisine use it).
  //   COMBO (2+)     → { strips: { "Korean": {label, accent}, "Japanese": {…} } }
  //     (distinct accent per selected cuisine, by pick order; an alternate card
  //      uses strips[venue.matchedCuisine]). Accents are blue/orange/amber/teal/
  //      indigo/purple — never red/green (operator's red-green vision).
  const nearbyFlavours = useMemo(() => {
    const PALETTE = ['#4f46e5', '#ea580c', '#0d9488', '#9333ea', '#475569'];
    const REGION_ACCENT = {
      'middle-eastern': '#b45309', 'east-asian': '#4f46e5', 'southeast-asian': '#0d9488',
      'south-asian': '#c2410c', 'european': '#2563eb', 'americas': '#475569', 'dessert': '#9333ea'
    };
    const sel = (state.cuisines || []).filter((s) => s !== 'michelin');
    if (!sel.length) return null;
    const nameOf = (slug) => cuisineNameBySlug.get(slug) || null;   // English catalogue name (stable key)
    // v0.62.476 — operator (IMG): the "& Nearby Flavours" banner showed the raw
    // English cuisine word ("Eurasian et saveurs voisines") because this path
    // never ran the name through cuisineName() the way the folio tab does. Localise
    // the LABEL; keep the combo-strip KEY English so ResultCard's lookup by
    // venue.matchedCuisine (server-set English) still matches.
    const labelOf = (slug) => { const en = nameOf(slug); return en ? cuisineName(slug, en, lang) : null; };
    const catOf = (slug) => {
      if (Array.isArray(catalogue)) {
        for (const c of catalogue) if ((c.cuisines || []).some((cu) => cu?.slug === slug)) return c.id;
      }
      return '';
    };
    if (sel.length === 1) {
      const name = labelOf(sel[0]);
      if (!name) return null;
      const accent = REGION_ACCENT[catOf(sel[0])] || '#b45309';
      return { single: { label: lang === 'fr' ? `${name} et saveurs voisines` : lang === 'id' ? `${name} & Cita Rasa Terdekat` : lang === 'ru' ? `${name} и близкие вкусы` : lang === 'de' ? `${name} & ähnliche Küchen` : lang === 'zh' ? `${name} 及邻近风味` : lang === 'ja' ? `${name} と近隣の味` : lang === 'es' ? `${name} y sabores cercanos` : `${name} & Nearby Flavours`, accent }, strips: null };
    }
    const strips = {};
    sel.forEach((slug, i) => { const n = nameOf(slug); if (n) strips[n] = { label: labelOf(slug), accent: PALETTE[i % PALETTE.length] }; });
    return { single: null, strips };
  }, [state.cuisines, cuisineNameBySlug, catalogue, lang]);
  // v0.62.6 — Michelin city-grouped display: initial map state per visible
  // batch. Case A (set city has ≥1 visible card) → fit the SET city's pins
  // (map stays centred there, never zooms out to country level). Case B
  // (zero in set city / no city resolved) → fit-bounds over ALL visible
  // Michelin pins (country-level view). Non-Michelin pages (no awardCity on
  // any card) clear fitPins → MapPanel behaviour unchanged. Display layer
  // only: reads the already-curated batch, never re-orders or re-fetches.
  useEffect(() => {
    const page = visibleVenues.length ? visibleVenues : venues;
    const hasAwardCities = Array.isArray(page) && page.some((v) => v && typeof v.awardCity === 'string' && v.awardCity);
    if (!hasAwardCities) { setFitPins(null); return; }
    const grouped = groupByAwardCity(page, michelinRemaining?.city || null);
    const pins = initialFitPins(grouped);
    setFitPins(pins.length
      ? { pins, token: 'page:' + page.map((v) => v.placeId || v.name).join('|') }
      : null);
  }, [visibleVenues, venues, michelinRemaining]);
  // v0.60.115 — how many distinct venues the server has shown for the
  // current criteria-hash. Surfaced in the "that's all N" terminal note
  // when exhausted, so the user knows the pool size and stops re-tapping.
  const [poolCount, setPoolCount] = useState(0);
  // v0.60.154 — client-side page history. Each successful search pushes
  // a Page onto `pages`; the floating ⇠ Back / ⇢ Next FABs walk the
  // array by moving `cursor` (no server round-trip). Caps: 17 normal
  // (~200 venues at 12/page) / 11 Michelin (~130 entries). Oldest page
  // is shifted off on overflow so the cap is honored. The page payload
  // mirrors every per-field state setter that runSearch updates, so the
  // useEffect below can re-render the cached page on cursor change.
  // Operator: "client-side storing of ~130 Michelin … and 200 listing
  // of search Criteria and/or free-text within Cuisine TMA."
  const [pages, setPages] = useState([]);
  const [cursor, setCursor] = useState(0);
  // v0.60.154 — re-apply per-field setters when the user steps back/forward
  // through the cached pages. The first push (after runSearch) lands at the
  // tail, where this effect is a no-op (the setters already ran inline);
  // back/forward taps fire it to swap ResultPanel's inputs to the cached
  // page without a network call.
  useEffect(() => {
    const p = pages[cursor];
    if (!p) return;
    setVenues(p.venues || []);
    setComboInfo(p.comboInfo || null);
    setMisrepNote(p.misrepNote || null);
    setCookMethodPivot(p.cookMethodPivot || null);
    // v0.61.130 — restore the O-20/O-23 pills + caption alongside the
    // venues so back/forward navigation re-renders the right context.
    setPlaceAnchor(p.placeAnchor || null);
    setSpecialModeNotice(p.specialModeNotice || null);
    setSpecialModeBlocked(p.specialModeBlocked || null);   // v0.61.397 — clear/restore the block banner
    setSpecialModeWidenedInfo(p.specialModeWidenedInfo || null);
    setSessionFull(!!p.sessionFull);
    setPageStackDepth(Number.isFinite(p.pageStackDepth) ? p.pageStackDepth : 0);
    setMichelinRemaining(p.michelinRemaining || null);
    setExhaustedNote(!!p.exhausted);
    setFirstBatch(!!p.firstBatch);              // v0.60.191
    // v0.61.170 — restore range counter fields when snapshot replay
    setCumulativeStart(Number.isFinite(p.cumulativeStart) ? p.cumulativeStart : null);
    setCumulativeEnd(Number.isFinite(p.cumulativeEnd) ? p.cumulativeEnd : null);
    setFinalBatch(!!p.finalBatch);
    // v0.61.174 — knownTotal tracks the highest cumulativeEnd seen
    // for this criteria. On snapshot replay (Prev nav), restore to
    // the snapshot's cumulativeEnd (the snapshot is a static
    // moment-in-time view; it shouldn't carry a "future" knownTotal).
    setKnownTotal(Number.isFinite(p.cumulativeEnd) ? p.cumulativeEnd : null);
    setPoolCount(Number.isFinite(p.poolCount) ? p.poolCount : 0);
    // v0.60.154 — also restore the criteria, free-text and search
    // anchor that produced this page (Codex review on PR #395:
    // otherwise the chips, ✳️ Michelin loading hint, copy-all heading,
    // and the next 🔍 still describe whatever state the user typed
    // after navigating away — so users would copy or rerun the wrong
    // search). `state` / `nlText` / `locationAnchor` are persisted on
    // every page push and re-applied here.
    if (p.criteriaState && typeof p.criteriaState === 'object') {
      setState(p.criteriaState);
    }
    if (typeof p.freeText === 'string') {
      setNlText(p.freeText);
    }
    if (p.locationAnchor !== undefined) {
      setLocationAnchor(p.locationAnchor || null);
    }
    if (p.searchCenter !== undefined) {
      setSearchCenter(p.searchCenter || null);
    }
  }, [cursor]);  // intentionally only on cursor change; pages mutates monotonically
  // v0.58.23: explicit location-resolution status. Banner above the
  // map tells users "we're locating you" while userLoc resolves, then
  // "Telok Blangah · 5 places nearby" once everything's loaded.
  // Resolved name is reverse-geocoded from userLoc once on every
  // change (server caches 24h per grid cell so repeat calls are
  // free).
  const [locationName, setLocationName] = useState('');
  // v0.62.x — operator (location-display thrash on an Other-city pick): the
  // header label must FOLLOW THE SEARCH ANCHOR, not the live locationAnchor
  // (which a focus-refresh / mount cache-sync can overwrite back to a stale
  // server anchor, e.g. a prior JB "Mid Valley Southkey"). Pinned at search
  // commit (runSearch) to the anchor's name; immune to the background refresh.
  const [searchLocName, setSearchLocName] = useState('');
  // v0.62.173 — PR B2. When results are showing, the region pills collapse to a
  // one-line "Set location is: <X>. Click to change" to give the map more room;
  // tapping the line (or this flag) re-expands the pills.
  const [regionExpanded, setRegionExpanded] = useState(false);
  // v0.62.176 — operator: the Local Food Classic plate is now behind a "Pick local
  // classic" pill (a glassmorphism dropdown), so the header stays compact + the map
  // gets more room. classicOpen drives that dropdown.
  const [classicOpen, setClassicOpen] = useState(false);
  // v0.62.582 — operator (IMG_0748/0749, landscape): the folio picker dropdown opened
  // OVER the header — its top covered the "Click to change" line + the folio tabs
  // instead of sitting flush BELOW them. Root cause: `headerBottom` (the fixed
  // dropdown's `top`) was measured STALE — the ResizeObserver seeded it before the
  // "Set location is …" line + the tabs grew the header (venues arrive AFTER first
  // paint), and RO didn't re-fire, so the dropdown anchored ~30px too high. Re-measure
  // headerBottom in a LAYOUT effect (before paint → no flash) exactly when a picker
  // opens or results/rows that change the header height appear, so the dropdown always
  // drops flush under the tabs. Deps live here because classicOpen/regionExpanded are
  // declared above; venues/cuisinePickOpen/modePeek are already in scope.
  useLayoutEffect(() => {
    if (headerRef.current) setHeaderBottom(Math.round(headerRef.current.getBoundingClientRect().bottom));
  }, [cuisinePickOpen, classicOpen, regionExpanded, modePeek, venues.length]);

  // v0.62.661 — operator: an iPhone in LANDSCAPE + list mode has too little
  // vertical room for the over-the-map BottomSheet drawer to show any real
  // amount of list AND leave the map visible — even the 1-card peek obstructs
  // a large share of an already-short (~375-430px) viewport. Carved back out to
  // the static split (map anchored on top, list scrolling independently below,
  // no drawer) that Cuisine's vertical list used everywhere before v0.62.655 —
  // for THIS one case only; portrait phone, tablet, and desktop are unchanged.
  const staticSplitList = vp.deviceClass === 'mobile' && vp.orientation === 'landscape' && drawerMode === 'vertical';

  // v0.62.594 — operator ("map stays"): in the portrait-tablet VERTICAL listing, bound
  // the results panel to the remaining viewport height so its "Showing N" header freezes
  // and the two dish-columns scroll INDEPENDENTLY while the ~40vh map above stays put.
  // Measured off the panel's own top (which tracks the sticky map + pickers), leaving a
  // small bottom reserve for the footer. Off (null) on phones / landscape / horizontal.
  // v0.62.661 — extended to the new landscape-phone static split above: it wants
  // exactly the same "freeze the header, scroll the columns independently"
  // behaviour, just on a phone instead of a tablet.
  const boundList = (portraitWide || staticSplitList) && drawerMode === 'vertical';
  const [resultBoundH, setResultBoundH] = useState(null);
  useLayoutEffect(() => {
    if (!boundList) { setResultBoundH(null); return undefined; }
    const measure = () => {
      const el = resultPanelRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setResultBoundH(`calc(var(--tg-viewport-stable-height, 100dvh) - ${Math.max(0, Math.round(top))}px - 3rem)`);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && document.documentElement) ro.observe(document.documentElement);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('orientationchange', measure); };
  }, [boundList, headerBottom, venues.length, vp.orientation, cuisinePickOpen, classicOpen]);
  // v0.62.259 — operator (urgent): trace the folio-tab loading state so a MISSING
  // "Pick local classic ▾" tab is diagnosable. The tab only shows when a plate
  // AND venues are both present (hasPlate). This logs which side is missing.
  // v0.62.261 — MOVED here (was up by activePlateRef ~L598): the effect's dep
  // array references `classicOpen`, which is declared on the line above. At its
  // old position the const was still in the temporal dead zone, so evaluating
  // the dep array during render threw `ReferenceError: Cannot access 'classicOpen'
  // before initialization` → the Cuisine TMA crashed (white screen). Build + unit
  // tests never render <App>, so CI stayed green.
  useEffect(() => {
    const hasPlate = !!(cuisinePlate || arrivalPlate) && venues.length > 0;
    console.log('[Cuisine-TMA-v2] LOADING folio tabs →', {
      loading,
      venues: venues.length,
      cuisinePlate: !!cuisinePlate,
      arrivalPlate: !!arrivalPlate,
      hasPlate,
      classicTabShown: hasPlate,
      cuisinePickOpen,
      classicOpen,
    });
  }, [loading, venues.length, cuisinePlate, arrivalPlate, cuisinePickOpen, classicOpen]);
  // v0.62.189 — operator (IMG_2516): after 8 s IDLE in the refine-location editor,
  // auto-CLOSE it and let the Cuisine + Local-classic tabs re-appear. Re-armed on
  // open, on a mode-tab tap, and on every keystroke in the field (onActivity);
  // closing only flips UI state (no search fires — honours the no-auto-fire rule).
  const locIdleTimerRef = useRef(null);
  const armLocIdleClose = () => {
    if (locIdleTimerRef.current) clearTimeout(locIdleTimerRef.current);
    locIdleTimerRef.current = setTimeout(() => {
      setModePeek(false);
      setRegionExpanded(false);
    }, 30000); // v0.62.x — operator: standardise location idle-close to 30s (was 8s)
  };
  useEffect(() => {
    if (!modePeek) {
      if (locIdleTimerRef.current) { clearTimeout(locIdleTimerRef.current); locIdleTimerRef.current = null; }
      return undefined;
    }
    armLocIdleClose();
    return () => { if (locIdleTimerRef.current) clearTimeout(locIdleTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modePeek]);
  // v0.62.180 — operator: "Back to last search area" must NOT show on first load
  // (there's no prior area to return to). Flips true on the first user-initiated
  // location change (region pill / location pick / search).
  const [locChanged, setLocChanged] = useState(false);
  // v0.62.173 — operator: a dish searched from Local Food Classic is pinned to the
  // FRONT of the plate's picks (1st), so the just-searched dish leads.
  const [pinnedDish, setPinnedDish] = useState(null);
  // v0.62.x — the dish / free-text term the CURRENT results are for (drives the
  // "Likely serves {term} {category}" card strip). Set in runSearch.
  const [searchedTerm, setSearchedTerm] = useState(null);
  const [searchedTermMode, setSearchedTermMode] = useState(null); // 'dish' | 'freetext'
  useEffect(() => {
    // v0.60.120 — the banner label tracks the *active search location*:
    // the place the user locked in via the Search-criteria builder /
    // map "Search this area" (locationAnchor) when one is set, else the
    // device / cached pin (userLoc). Before this it always reverse-
    // geocoded userLoc, so the banner kept saying e.g. "Yishun" even
    // after the user picked "Alexandra Retail Centre". When the anchor
    // already carries a name (from the place-resolve), use it verbatim;
    // otherwise reverse-geocode the anchor's coords.
    const anchorActive = !!(locationAnchor && Number.isFinite(locationAnchor.lat) && Number.isFinite(locationAnchor.lng));
    const eff = anchorActive ? locationAnchor : userLoc;
    if (!eff?.lat || !eff?.lng) { setLocationName(''); return; }
    // v0.62.209 — operator (RECURRING, "pinpointing… didn't resolve"): a GENERIC
    // anchor name (e.g. "Singapore" from /location Singapore) must NOT be shown
    // verbatim — the collapsed-line guard rejects it → "pinpointing…" forever.
    // Treat a generic anchor name as no-name and fall through to the now
    // fine-grained (v0.62.207) reverse-geocode so a real precinct shows.
    const _anchorNm = (locationAnchor && locationAnchor.name || '').trim();
    const _genericNm = new Set(['singapore','malaysia','indonesia','thailand','vietnam','japan','korea','south korea','china','taiwan','hong kong','macau','macao','australia','new zealand','brunei','philippines','johor bahru','johor','cities']);
    // v0.62.295 — OTHER-region CITY pick (carries radiusCapM): the anchor name is
    // the bare city ("Kyoto"). Resolve the nearest prominent landmark so the line
    // reads "Kyoto — near {landmark}", mirroring how an SG street pick shows a
    // building. Falls back to the bare city name when no landmark resolves.
    if (anchorActive && _anchorNm && Number.isFinite(locationAnchor.radiusCapM)) {
      let cancelledCity = false;
      reverseGeocode({ lat: eff.lat, lng: eff.lng, near: true })
        .then((r) => { if (!cancelledCity) setLocationName(r?.near ? `${_anchorNm} — near ${r.near}` : _anchorNm); })
        .catch(() => { if (!cancelledCity) setLocationName(_anchorNm); });
      return () => { cancelledCity = true; };
    }
    if (anchorActive && _anchorNm && !_genericNm.has(_anchorNm.toLowerCase())) { setLocationName(_anchorNm); return; }
    let cancelled = false;
    reverseGeocode({ lat: eff.lat, lng: eff.lng })
      .then((r) => { if (!cancelled) setLocationName(r?.name || ''); })
      .catch(() => { /* leave empty; banner shows generic line */ });
    return () => { cancelled = true; };
  }, [locationAnchor?.lat, locationAnchor?.lng, locationAnchor?.name, userLoc?.lat, userLoc?.lng]);
  useEffect(() => {
    // v0.60.96 — operator: "flip to Top when I am at the bottom of
    // the screen". Replace the previous `scrollY > 320` heuristic
    // (which surfaced the ↑ top button anywhere past hero) with a
    // true at-bottom check. The state name stays for backwards-
    // compat with line 875, but the semantics are now "user has
    // scrolled to or near the page bottom" — i.e. show ⇡ top, else
    // ⇣ down.
    function onScroll() {
      const y = window.scrollY || 0;
      const reached = y + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setScrolledPastHero(reached >= fullH - 50);
      // v0.62.144 — a downward scroll gesture dismisses the mode-tap peek (the
      // Location / Local-food-picks staging fields hide; header → liquid glass).
      // Direction-gated so the upward programmatic scroll-to-top on a mode tap
      // doesn't dismiss it.
      if (y > lastScrollYRef.current + 4 && y > 24) setModePeek(false);
      lastScrollYRef.current = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function stateSig(s) {
    return JSON.stringify({
      cuisines: [...(s.cuisines || [])].sort(),
      filters: {
        newlyOpened: !!s.filters?.newlyOpened,
        openNow: !!s.filters?.openNow,
        halal: !!s.filters?.halal,
        vegetarian: !!s.filters?.vegetarian,
        homeBased: !!s.filters?.homeBased,
        // v0.60.166 — v0.60.165 added petFriendly to state but forgot
        // to extend the signature: toggling 🐾 didn't dirty the snap,
        // so the Search-button ring never lit + the page cache wasn't
        // invalidated. Included here alongside the other quick-filter
        // flags so the dirty-detection treats Pet-allowed identically.
        petFriendly: !!s.filters?.petFriendly,
        // v0.62.37 — ⭐ Recommend in the signature so toggling it dirties
        // the snap + invalidates the page cache (the v0.60.166 lesson).
        recommend: !!s.filters?.recommend,
        prices: [...(s.filters?.prices || [])].sort()
      },
      region: s.region || 'SG'
    });
  }

  useEffect(() => {
    // v0.60.161 — install window error handlers (no-op when verbose is
    // off; auto-reports to /api/vlog when the server's first response
    // tags `_vlog: true`). Idempotent — multiple mounts won't double-
    // attach.
    import('./lib/vlog.js').then((vlog) => vlog.installGlobalHandlers()).catch(() => {});
    // v0.62.x — opened outside Telegram (no signed initData) → every call will
    // 401. Surface the guard screen immediately and DON'T fire the doomed
    // mount calls (stops the 401-storm in the server logs).
    if (!hasInitData()) {
      setAuthBlocked(true);
      return;
    }
    fetchCatalogue()
      .then((d) => {
        setCatalogue(d.categories || []);
        setMichelinCuisinesByCC(d.michelinCuisinesByCC || {});
        setMichelinYearsByCC(d.michelinYearsByCC || {});
      })
      .catch((err) => {
        // Expired/invalid initData (non-empty but rejected) → 401 here too.
        if (err?.code === 'AUTH') setAuthBlocked(true);
        console.warn('[Cuisine-TMA-v2] catalogue fetch failed:', err);
      });
    // v0.60.146 — wipe the per-Cuisine-TMA session clipboard (the
    // 80-cap session-seen SET + the page-history LIST) on every TMA
    // launch. Reset is explicit so the user gets a fresh list every
    // time they re-open Cuisine, regardless of the per-criteria
    // long-lived dedup (cuisine:seen:<chatId>:<hash>).
    startSession().catch((err) => console.warn('[Cuisine-TMA-v2] session start failed:', err));
    // v0.60.154 — also reset the client-side page-history cache so the
    // ⇠ Back / ⇢ Next FABs start with a fresh empty stack on every
    // TMA launch (parallel to the server-side wipe above).
    setPages([]);
    setCursor(0);
  }, []);

  // v0.58.20: bounded geolocation resolution.
  // v0.59.2: cache-first per Human Lead. Previously the order was
  // GPS → server cache → SG centroid, which meant a fresh
  // `/location <place>` set seconds before opening the TMA could be
  // ignored if the device had a stale GPS fix lying around. The user
  // typed /location *deliberately* — that should anchor the search.
  // New order:
  //   1. Telegram WebApp.user_location  (rarely populated)
  //   2. Server cache via /api/cuisine/user-location  (fresh ≤30 min,
  //      gated server-side)
  //   3. navigator.geolocation  (5 s timeout)
  //   4. SG centroid
  useEffect(() => {
    let cancelled = false;
    const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };
    // v0.58.26: reject {lat:0, lng:0} (Atlantic-Ocean origin) and
    // out-of-range values. This was the prod bug — the TMA was firing
    // /api/cuisine/search with center=0.0000,0.0000 because some path
    // (initData / GPS / server cache) had been setting userLoc to a
    // garbage coord that passed `r?.lat != null` truthy checks.
    const isValidCoord = (lat, lng) =>
      Number.isFinite(lat) && Number.isFinite(lng)
      && Math.abs(lat) > 0.001 && Math.abs(lng) > 0.001
      && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    // v0.58.24: louder debug logs so we can trace "not loading 5 places"
    // failures from the user's prod console (Telegram desktop devtools
    // OR mobile browser inspector). Each branch logs entry + outcome.
    console.log('[Cuisine-TMA-v2] mount: starting userLoc resolution');

    async function tryServerCache() {
      console.log('[Cuisine-TMA-v2] tryServerCache: requesting /api/cuisine/user-location');
      try {
        const r = await fetchUserLocation();
        if (!cancelled && isValidCoord(r?.lat, r?.lng)) {
          setUserLoc({ lat: r.lat, lng: r.lng });
          // v0.61.266 — operator (29-05 '26): "the transferred of
          // {set_location} in Menu TMA isn't transfer to Cuisine TMA."
          // Root cause: the prior code only read r.lat / r.lng and
          // discarded r.label (the typed/picked name persisted by
          // /api/menu/set-location via setUserLocation's `label` opt
          // — see location-cache.js:28). The Cuisine TMA's pill then
          // reverse-geocoded the coords back to a neighbourhood,
          // silently overriding the user's pick. Now: when the cache
          // includes a label, install it as locationAnchor so the
          // pill + map both honor the Menu pick verbatim.
          if (r.label && typeof r.label === 'string' && r.label.trim()) {
            setLocationAnchor({
              lat: r.lat,
              lng: r.lng,
              name: r.label.trim()
            });
          }
          // v0.61.124 — auto-flip the region toggle when the cached
          // anchor is Johor Bahru or IOI Resort City Putrajaya (set
          // via the chat /location quick-pick or Menu TMA dropdown).
          // Without this, picking JB on chat had no effect on the
          // Cuisine TMA — the toggle stayed on 🇸🇬 and searches ran at
          // SG defaults.
          // v0.61.185 — operator's three-pill model SG | JB | OTHER.
          // Anchor region 'MY-PUT' (legacy) treated as 'OTHER'; JB
          // stays JB. Auto-flips the pill to match the anchor so the
          // search request goes out with the correct region tag.
          if (r.region === 'JB') {
            setState((s) => (s.region === 'JB' ? s : { ...s, region: 'JB' }));
            console.log('[Cuisine-TMA-v2] tryServerCache: auto-flip region → JB');
          } else if (r.region === 'OTHER' || r.region === 'MY-PUT') {
            setState((s) => (s.region === 'OTHER' ? s : { ...s, region: 'OTHER' }));
            console.log('[Cuisine-TMA-v2] tryServerCache: auto-flip region → OTHER (anchor region=' + r.region + ')');
          } else if (r.region === 'SG') {
            // v0.61.238 — operator: "if my location set to Geylang, I
            // launch Cuisine TMA it still stick with 'Others' button
            // being the last selection". Missing SG branch meant a
            // previous OTHER state stayed sticky when the cached
            // anchor moved back to SG.
            setState((s) => (s.region === 'SG' ? s : { ...s, region: 'SG' }));
            console.log('[Cuisine-TMA-v2] tryServerCache: auto-flip region → SG');
          } else {
            // v0.62.35 — coords-only cache (a legacy bare write carried no
            // region): derive it from the coords, mirroring the follow-sync
            // (lines ~227-244). Without this, foreign cached coords booted
            // under the SG default — a KL anchor wearing a 🇸🇬 flag.
            const cc = coordsToCountry({ lat: r.lat, lng: r.lng });
            if (cc === 'SG') {
              setState((s) => (s.region === 'SG' ? s : { ...s, region: 'SG' }));
              console.log('[Cuisine-TMA-v2] tryServerCache: region derived from coords → SG');
            } else if (cc === 'MY') {
              const target = isJbCoords({ lat: r.lat, lng: r.lng }) ? 'JB' : 'OTHER';
              setState((s) => {
                if (s.region === target) return s;
                const n = { ...s, region: target };
                if (target === 'OTHER') n.countryPref = 'MY';
                return n;
              });
              console.log('[Cuisine-TMA-v2] tryServerCache: region derived from coords → ' + target);
            } else {
              const near = nearestIataCity(r.lat, r.lng);
              const code = near && near.city && near.city.countryCode;
              if (code && CUISINE_OTHER_CODES.has(code)) {
                setState((s) => (s.region === 'OTHER' && s.countryPref === code ? s : { ...s, region: 'OTHER', countryPref: code }));
                console.log('[Cuisine-TMA-v2] tryServerCache: region derived from coords → OTHER/' + code);
              }
            }
          }
          // v0.61.205 — track anchor precinctId so the OTHER pill can
          // show the Putrajaya flag PNG when the anchor is IOI Resort
          // City (other OTHER anchors stay on 🌏).
          if (r.precinctId) setAnchorPrecinctId(r.precinctId);
          // v0.62.32 — Arrival Plate from the cached location's city.
          setArrivalPlate(r.plate || null);
          // v0.61.270 — Phase 2 SSOT: sync state.countryPref from the
          // cached anchor's `country` field (now surfaced by /api/
          // cuisine/user-location since v0.61.270). Closes the
          // round-trip: Menu TMA picks Thailand → Cuisine TMA's OTHER
          // picker opens on TH the next time the user expands it,
          // not the stale state.countryPref default. Only flips when
          // we're effectively in OTHER mode, so SG/JB region pills
          // don't fight the seeding.
          if (r.country && (r.region === 'OTHER' || r.region === 'MY-PUT')) {
            setState((s) => (s.countryPref === r.country ? s : { ...s, countryPref: r.country }));
            console.log('[Cuisine-TMA-v2] tryServerCache: countryPref → ' + r.country);
          }
          // v0.61.438 — code review F2: an inherited LABELLED pick (a
          // deliberate Menu/chat /location choice persisted server-side)
          // counts as explicit — without this, the v0.61.430 drift case
          // (KL pick yanked back to SG GPS) would regress now that the
          // region-watching latch is gone. Plain GPS-shaped cache entries
          // (no label) do NOT latch, so device-follow keeps working.
          if (r.label && String(r.label).trim()) explicitPickRef.current = true;
          console.log('[Cuisine-TMA-v2] tryServerCache: HIT', r);
          return true;
        }
        console.log('[Cuisine-TMA-v2] tryServerCache: MISS (no/stale/zero cache)');
      } catch (err) { console.log('[Cuisine-TMA-v2] tryServerCache: ERROR', err.message); }
      return false;
    }

    async function tryGps() {
      // v0.62.x — prefer Telegram's native LocationManager (Bot API 8.0); the
      // webview's navigator.geolocation often drops a first-launch "Allow Once".
      try {
        const tgLoc = await getTelegramLocation();
        if (tgLoc && isValidCoord(tgLoc.lat, tgLoc.lng)) {
          if (!cancelled) {
            setUserLoc({ lat: tgLoc.lat, lng: tgLoc.lng });
            console.log('[Cuisine-TMA-v2] tryGps: SUCCESS via Telegram LocationManager', tgLoc);
          }
          return true;
        }
      } catch { /* fall through to navigator.geolocation */ }
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          console.log('[Cuisine-TMA-v2] tryGps: navigator.geolocation unavailable');
          resolve(false); return;
        }
        console.log('[Cuisine-TMA-v2] tryGps: requesting (timeout 5s)');
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const { latitude, longitude } = p.coords || {};
            if (!isValidCoord(latitude, longitude)) {
              console.log('[Cuisine-TMA-v2] tryGps: REJECT (zero/invalid)', { latitude, longitude });
              resolve(false); return;
            }
            if (!cancelled) {
              setUserLoc({ lat: latitude, lng: longitude });
              console.log('[Cuisine-TMA-v2] tryGps: SUCCESS', { lat: latitude, lng: longitude });
            }
            resolve(true);
          },
          (err) => {
            console.log('[Cuisine-TMA-v2] tryGps: FAIL', err?.code, err?.message);
            resolve(false);
          },
          { timeout: 5000, maximumAge: 60_000, enableHighAccuracy: false }
        );
      });
    }

    // v0.61.203 — defensive region applier. Used after URL-hash /
    // initData / GPS / centroid paths set userLoc to ensure the
    // region pill matches the server-cached anchor's region. Without
    // this, the operator's chat /location to IOI (region OTHER)
    // silently reverts to SG on TMA mount when the deep-link hash
    // didn't carry the region or when Telegram initData provided
    // device GPS — both bypass tryServerCache. Mirrors the legacy
    // auto-flip inside tryServerCache; idempotent.
    function applyRegionFromAnchor(region) {
      if (!region || cancelled) return;
      const r = String(region).toUpperCase();
      const target = (r === 'MY-PUT') ? 'OTHER'
        : (r === 'JB' || r === 'OTHER' || r === 'SG') ? r
        : null;
      if (!target) return;
      setState((s) => (s.region === target ? s : { ...s, region: target }));
      console.log(`[Cuisine-TMA-v2] applyRegionFromAnchor → ${target}`);
    }

    (async () => {
      // v0.58.26: TMA URL hash anchor wins ahead of all client paths —
      // the bot's /cuisine handler now pre-resolves the cached
      // location and deep-links it via #lat&lng. Without this, the
      // hash anchor would only be honoured by the warm-start guard
      // (line ~208), but userLoc itself would still go through GPS.
      let userLocSource = '';
      if (initialOverrides?.location && isValidCoord(initialOverrides.location.lat, initialOverrides.location.lng)) {
        if (!cancelled) {
          setUserLoc({ lat: initialOverrides.location.lat, lng: initialOverrides.location.lng });
          console.log('[Cuisine-TMA-v2] userLoc from URL hash (bot deep-link)');
          // v0.61.203 — apply region from hash if the bot included it.
          if (initialOverrides.location.region) {
            applyRegionFromAnchor(initialOverrides.location.region);
          }
        }
        userLocSource = 'hash';
      } else {
        const w = tg();
        const init = w?.initDataUnsafe || {};
        const tgLoc = init.user_location || init.user?.location;
        if (isValidCoord(tgLoc?.latitude, tgLoc?.longitude)) {
          if (!cancelled) {
            setUserLoc({ lat: tgLoc.latitude, lng: tgLoc.longitude });
            console.log('[Cuisine-TMA-v2] userLoc from Telegram initData');
          }
          userLocSource = 'initData';
        } else if (await tryServerCache()) {
          // tryServerCache already applies region inside; no follow-up needed.
          userLocSource = 'serverCache';
        } else if (await tryGps()) {
          userLocSource = 'gps';
        } else {
          if (!cancelled) {
            setUserLoc(SG_CENTROID);
            console.log('[Cuisine-TMA-v2] userLoc fallback to SG centroid');
          }
          userLocSource = 'centroid';
        }
      }
      // v0.61.203 — DEFENSIVE: for every userLoc source EXCEPT
      // `serverCache` (which already applied region), do one extra
      // fetch to read the server's region for this user. Closes the
      // "map says Putrajaya but pill says Singapore" bug that
      // appeared whenever the deep-link hash omitted region or the
      // operator launched the TMA from the menu button (Telegram
      // initData with device GPS) after setting a non-SG anchor
      // in chat. Idempotent (won't fight an in-progress chat → TMA
      // pill flip).
      if (userLocSource && userLocSource !== 'serverCache' && !cancelled) {
        try {
          const r = await fetchUserLocation();
          if (r?.region) applyRegionFromAnchor(r.region);
          // v0.61.205 — track precinctId for the OTHER pill flag swap.
          if (r?.precinctId) setAnchorPrecinctId(r.precinctId);
          // v0.62.32 — Arrival Plate on initData/GPS boots too.
          if (!cancelled) setArrivalPlate(r?.plate || null);
          // v0.62.30 — operator: "problem again to lock the location."
          // Railway log: bare label-less device re-saves (the 20-s follow
          // sync) overwrote a deliberate Putrajaya/Sapporo pick minutes
          // after it was set. Chain: an initData-GPS boot SKIPS
          // tryServerCache, so the v0.61.438 explicit-pick latch (set only
          // inside tryServerCache when the cache carries a label) never
          // arms → shouldFollowDevice sees explicitPick=false → the sync
          // saves device GPS over the labelled pick. THIS fetch already
          // reads the cached location on those boots — when it carries a
          // LABEL (a deliberate Menu/chat/TMA pick), arm the latch here
          // too. Coords/UX unchanged (no popup, no auto-load — the
          // v0.61.409 policy stands); the sync just can no longer silently
          // clobber a deliberate pick.
          if (r?.label && String(r.label).trim()) {
            explicitPickRef.current = true;
            console.log('[Cuisine-TMA-v2] explicit-pick latch armed from cached label:', r.label);
          }
        } catch { /* non-fatal */ }
      }
      // v0.61.372 — the mount-time location resolution has settled; the
      // follow-device sync may now adopt real device moves (it was gated
      // until here so it couldn't clobber a server-cached pick).
      initialResolveDoneRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // v0.61.196 — seed state.countryPref from the server on mount so
  // the OTHER picker opens on whatever the user last set in the
  // chat /lcountry (v0.61.195) command (or in a prior TMA session).
  // Falls back to the v0.61.191 default ('MY') silently on any
  // network failure or 401.
  // v0.61.393 — REVERT v0.61.391. The countryPrefResolved gate HUNG the
  // first load in prod (Railway: set-location persisted but NO cuisine
  // search ever fired → "loading first 5" hung) — same failure class as the
  // v0.61.365/367 settle timer → v0.61.368 revert. Back to the simple
  // mount-time seed; the "modal over a loading body" cosmetic returns
  // (acceptable — a hung TMA is far worse). A safer double-state fix needs
  // its own careful pass.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchCountryPref();
      if (cancelled || !r?.countryCode) return;
      // Treat 'SG' as "no OTHER pref" — the SG region pill has its
      // own anchor, so we don't overwrite state.countryPref with SG.
      // The state.countryPref slot is dedicated to the OTHER picker.
      if (r.countryCode === 'SG') return;
      // v0.61.438 — code review F14: the server seed must only FILL an
      // empty slot, never overwrite a value something fresher already set
      // (the v0.61.430 backfill or an explicit dropdown pick). A slow GET
      // resolving with last week's country was clobbering a just-picked
      // one, and the backfill couldn't self-heal (it only fills empties).
      setState((s) => (!s.countryPref ? { ...s, countryPref: r.countryCode } : s));
    })();
    return () => { cancelled = true; };
  }, []);

  // v0.61.426 — seed the rating pill from the server on mount so it shows
  // whatever the user last set in chat (/rating) or a prior TMA session.
  // Falls back silently to the '3.7' default on any network failure / 401.
  // v0.61.428 — on SUCCESS, mark the value authoritative so the search can
  // forward it. On failure we deliberately leave ratingLoaded=false so the
  // search omits it and the server uses its own Redis read.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchRatingPref();
      if (cancelled) return;
      // v0.62.143 — operator (17-06 '26): "Leaks again occasionally show the
      // ratings set to 3.7" → a custom rating must PERSIST, not snap back to
      // Good+ 3.7. This REVERSES the prior v0.62.x G3 decision (entry/idle reset
      // to 3.7). The pill now seeds from the saved server value (the user's last
      // /rating or TMA choice); a never-set user still gets DEFAULT_RATING 3.7
      // from getUserRatingPref. No forced persist of 3.7 over a saved value.
      setRatingPref(r?.ratingPref || '3.7');
      setRatingLoaded(true);
      // First time on this device → the one-off intro pop-up ("Rating set to …
      // Change it anytime"). No "reset" toast on later entries — nothing resets.
      try {
        if (typeof localStorage !== 'undefined' && !localStorage.getItem('gia.rating.introSeen')) {
          localStorage.setItem('gia.rating.introSeen', '1');
          setRatingReminder({ kind: 'intro' });
        }
      } catch { /* storage disabled → skip the one-off intro */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // v0.61.430 — countryPref BACKFILL: when the user is in an OTHER region
  // with no countryPref (the Menu→Cuisine handoff sets region=OTHER but
  // leaves countryPref empty → the Michelin chip read '' and greyed out,
  // and the server logged "no country-pref"), derive it from the committed
  // coords. Only fills when EMPTY, so it never overrides an explicit pick.
  // v0.61.438 — code review F2: this effect NO LONGER latches
  // explicitPickRef. Inferring "explicit pick" from the RESULTING region
  // misclassified automatic transitions — the 20 s device-follow callback
  // and the mount auto-detect both set region OTHER/JB from raw GPS, which
  // tripped the latch and permanently disabled device-follow for any user
  // physically outside SG who never picked anything. The latch is now set
  // ONLY at genuine pick gestures (onLocationSelect commits, the country
  // dropdown, the region pills, an inherited labelled Menu pick).
  useEffect(() => {
    if (state.region !== 'OTHER' && state.region !== 'JB') return;
    if (state.region === 'OTHER' && !state.countryPref) {
      const c = searchCenter || locationAnchor || userLoc;
      if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
        const cc = coordsToCountry(c) === 'MY'
          ? 'MY'
          : (() => {
              const near = nearestIataCity(c.lat, c.lng);
              const code = near && near.city && near.city.countryCode;
              return code && CUISINE_OTHER_CODES.has(code) ? code : null;
            })();
        if (cc) {
          setState((s) => (s.countryPref ? s : { ...s, countryPref: cc }));
          saveCountryPref(cc).catch(() => {});
          console.log('[Cuisine-TMA-v2] explicit-pick backfill countryPref →', cc);
        }
      }
    }
  }, [state.region, state.countryPref, searchCenter, locationAnchor, userLoc]);

  // v0.61.274 — mount-time location coherence check. Operator
  // (30-05 '26): "we keep circling back into first launch of TMA
  // and the incoherent of location set versus saved". Root cause:
  // saved `countryPref` (e.g., 'NZ' from a prior session) was
  // overriding the freshly-resolved GPS coords. With option B
  // (Prompt the user) we surface a modal when there's a real
  // mismatch and let the user choose.
  //
  // Fires once per mount, after userLoc resolves AND state.countryPref
  // has had a chance to load from Redis. Compares coords-derived
  // country (SG / MY / null) against the saved countryPref.
  // v0.61.322 — FULL SPLASH GATE. The TMA body must not render until all
  // three coherence checks below have evaluated and any mismatch modal the
  // user must answer has been dismissed. `locationGateOpen` flips true once
  // checks have run with no modal pending; until then the early-return at
  // the bottom shows a "Confirming your location…" splash (+ the modal, if
  // a mismatch is up). `modalPendingRef` tracks whether a coherence modal is
  // currently demanding a user choice, so the gate stays shut behind it.
  const [locationGateOpen, setLocationGateOpen] = useState(false);
  const modalPendingRef = useRef(false);
  // v0.61.323 — initial-load deferral. v0.61.322 gated only the VISUALS
  // (locationGateOpen hides the body) but the boot venue load still fired
  // underneath the splash at the raw device/GPS location — so a user who
  // entered with a stale overseas anchor saw 5 SG venues load before the
  // anchor-coherence check had even resolved. This ref ensures the boot
  // venue list is populated EXACTLY ONCE, and only after the gate opens:
  // the gate-opener fires runInitialLoad() on the no-mismatch path; the
  // apply* fns set this ref true so their own runSearch isn't doubled.
  const initialLoadFiredRef = useRef(false);

  // v0.61.409 — operator: "you should NOT load the first 5 at all if there is a
  // location mismatch … if it is equal to device's location then load 5 or else
  // stop loading just display the cuisine tma" + "kill the popup". The three
  // coherence checks below no longer pop a blocking modal — they RAISE this ref
  // (synchronously, on the same commit they evaluate). The gate-opener then
  // SKIPS the boot load and opens the TMA empty (the user taps 🔍). If a check
  // fires LATE (countryPref/anchor landed after the boot load already started —
  // the known race), haltBootLoadForMismatch() stops that stray load. NO timer,
  // NO new wait → can't deadlock the hang-prone gate.
  const bootMismatchRef = useRef(false);
  const [bootMismatchHalt, setBootMismatchHalt] = useState(false);
  function haltBootLoadForMismatch(reason) {
    bootMismatchRef.current = true;
    // Only ever touch the BOOT load — never a user-initiated 🔍 search
    // (firstLoadPending is already false by the time the user can tap).
    if (!firstLoadPendingRef.current) return;
    console.log(`[Cuisine-TMA-v2] boot load HALTED — ${reason} (saved≠device; no popup, empty TMA, tap 🔍)`);
    initialSearchDone.current = true;
    initialLoadFiredRef.current = true;
    setBootMismatchHalt(true);
    setVenues([]);
    setFirstLoadPending(false);
    setLoading(false);
  }

  const coherenceCheckedRef = useRef(false);
  const [coherenceMismatch, setCoherenceMismatch] = useState(null);
  // P1-d — focus trap for the coherence modal. Forced choice (no Cancel/✕/
  // backdrop dismiss), so no onClose: Escape is a deliberate no-op.
  const coherenceDialogRef = useDialog({ open: !!coherenceMismatch });
  useEffect(() => {
    if (coherenceCheckedRef.current) return;
    if (!userLoc?.lat || !userLoc?.lng) return;  // wait for resolution
    if (!state.countryPref) return;  // nothing to compare against
    const coordsCountry = coordsToCountry(userLoc);
    if (!coordsCountry) return;  // coords outside SG/MY bbox; trust the saved pref
    // Mismatch only matters when the user has region=OTHER (the
    // picker that uses countryPref). If region is SG/JB the saved
    // countryPref isn't surfaced in the UI.
    const isUiPathUsingCountryPref = state.region === 'OTHER' || state.region === 'MY-PUT' || state.region === '__NONE__';
    if (!isUiPathUsingCountryPref) {
      coherenceCheckedRef.current = true;
      return;
    }
    if (state.countryPref !== coordsCountry) {
      // v0.61.409 — operator: kill the popup; on a mismatch DON'T auto-load.
      // (was: setCoherenceMismatch(...) + modalPendingRef = true.)
      console.log(`[Cuisine-TMA-v2] coherence MISMATCH saved=${state.countryPref} coords=${coordsCountry} → no popup, suppress boot load`);
      haltBootLoadForMismatch('coherence (saved country ≠ coords country)');
    }
    coherenceCheckedRef.current = true;
  }, [userLoc?.lat, userLoc?.lng, state.countryPref, state.region]);

  // v0.61.274 — apply the modal choice. "Use {coords-country}"
  // resets region + countryPref to the coords-derived values;
  // "Keep {saved-country}" leaves state as-is.
  function applyCoherenceChoice(useCoords) {
    if (!coherenceMismatch) return;
    // The country the user committed to: "Use" adopts the detected coords-
    // country; "Keep" retains the saved countryPref.
    const cc = useCoords ? coherenceMismatch.coords : state.countryPref;
    if (useCoords) {
      const target = cc === 'SG' ? 'SG' : 'OTHER';
      setState((s) => ({
        ...s,
        region: target,
        countryPref: target === 'SG' ? null : cc
      }));
      // Persist the discard so the next session doesn't repeat the prompt.
      saveCountryPref(cc).catch(() => {});
    }
    modalPendingRef.current = false;  // v0.61.322 — release the splash gate
    setCoherenceMismatch(null);
    // v0.61.396 — operator: committing to a non-SG country (e.g. JP) must
    // ROUTE the map there and FIRE the first 5. Without this, resolveSearchCenter
    // returns null for OTHER (device GPS is SG-only) so runInitialLoad bails
    // ("awaiting a country+city pick") → no reroute, no venues, and the city
    // isn't shown. Set an explicit anchor at the country (the device coords for
    // "Use", else the capital centroid), fly the map there, and fire runSearch
    // with a corrected OTHER snapshot — mirroring the country-city pick flow.
    // SG keeps its existing device-GPS anchor (unchanged). We set
    // initialLoadFiredRef so the gate-opener doesn't also fire a boot load.
    if (cc && cc !== 'SG') {
      let pt = null;
      let name = '';
      const _validPt = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
        && Math.abs(p.lat) > 0.001 && Math.abs(p.lng) > 0.001;
      if (useCoords && _validPt(userLoc)) {
        pt = { lat: userLoc.lat, lng: userLoc.lng };
        const near = nearestIataCity(userLoc.lat, userLoc.lng);
        name = (near && near.city && near.city.name) || cc;
      } else {
        const cap = (CITIES_BY_COUNTRY[cc] || [])[0];
        if (cap) { pt = { lat: cap.lat, lng: cap.lng }; name = cap.name || cc; }
      }
      if (pt) {
        setLocationAnchor({ lat: pt.lat, lng: pt.lng, name });
        setSearchCenter({ lat: pt.lat, lng: pt.lng });
        setFlyTarget({ lat: pt.lat, lng: pt.lng, zoom: 11, _k: Date.now() });
        initialLoadFiredRef.current = true;
        initialSearchDone.current = true;
        runSearch({ ...state, region: 'OTHER', countryPref: cc }, pt);
      }
    }
  }

  // v0.61.276 — Expert C from the 30-05 investigation board: sibling
  // of the v0.61.274 country-coords modal. When the user lands with
  // state.region === 'JB' but their actual coords are NOT inside the
  // Johor extent, the search filter (JB-hybrid-filter at index.js
  // D703b) silently returns 0 venues. The operator hit this at
  // Putrajaya and Ipoh with a sticky JB pill from a prior session.
  // Prompt the user — same UX pattern as v0.61.274.
  const regionCoherenceCheckedRef = useRef(false);
  const [regionMismatch, setRegionMismatch] = useState(null);
  // P1-d — focus trap for the region-coherence modal (forced choice, no onClose).
  const regionDialogRef = useDialog({ open: !!regionMismatch });
  // v0.61.277 — operator (30-05 '26): the v0.61.276 one-shot ref guard
  // meant tapping JB pill mid-session never re-prompted (effect re-ran
  // after the region flip but the ref was already true from the cold
  // mount's no-JB pass). Reset the ref whenever state.region is NOT
  // 'JB' — so a subsequent flip to JB at non-JB coords can fire the
  // modal again.
  useEffect(() => {
    if (state.region !== 'JB') {
      regionCoherenceCheckedRef.current = false;
    }
  }, [state.region]);
  useEffect(() => {
    if (regionCoherenceCheckedRef.current) return;
    if (!userLoc?.lat || !userLoc?.lng) return;
    if (state.region !== 'JB') return;  // only the JB-at-non-JB case
    if (isJbCoords(userLoc)) return;     // coords ARE in Johor, no mismatch
    // v0.61.277 — also no-op when the resolved locationAnchor is
    // already in JB (the v0.61.277 JB pill auto-anchor to Southkey
    // means anchor.lat/.lng is JB even if userLoc is SG). Suppresses
    // a stale prompt that the v0.61.277 pill onClick already
    // resolved.
    if (locationAnchor
        && Number.isFinite(locationAnchor.lat)
        && Number.isFinite(locationAnchor.lng)
        && isJbCoords(locationAnchor)) return;
    const coordsCountry = coordsToCountry(userLoc);  // 'SG' / 'MY' / null
    // v0.61.409 — operator: kill the popup; on a mismatch DON'T auto-load.
    // (was: setRegionMismatch(...) + modalPendingRef = true.)
    console.log(`[Cuisine-TMA-v2] region/coords MISMATCH: region=JB but coords=${userLoc.lat.toFixed(2)},${userLoc.lng.toFixed(2)} (country guess=${coordsCountry || '?'}) → no popup, suppress boot load`);
    haltBootLoadForMismatch('region (JB pill but coords outside Johor)');
    regionCoherenceCheckedRef.current = true;
  }, [userLoc?.lat, userLoc?.lng, state.region, locationAnchor?.lat, locationAnchor?.lng]);

  function applyRegionCoherenceChoice(useCoords) {
    if (!regionMismatch) return;
    if (useCoords) {
      // SG bbox → SG region; MY but outside Johor → OTHER region;
      // unknown (outside SG+MY bbox) → OTHER as the safest fall-through.
      const target = regionMismatch.coordsCountry === 'SG' ? 'SG' : 'OTHER';
      setState((s) => ({
        ...s,
        region: target,
        countryPref: (target === 'OTHER' && regionMismatch.coordsCountry === 'MY') ? 'MY' : s.countryPref
      }));
    }
    modalPendingRef.current = false;  // v0.61.322 — release the splash gate
    setRegionMismatch(null);
  }

  // v0.61.321 — anchor/device coherence (third sibling of the v0.61.274
  // country-coords + v0.61.276 region-coords checks). Operator report
  // (05-06 '26): the location showed "Naka Ward" (a Japanese ward) with a
  // 🇸🇬 flag while the server searched SG coords. Root cause: a stale
  // locationAnchor cached from a prior overseas session (name + coords)
  // survived a GPS/region flip to SG — the banner name comes from
  // locationAnchor.name verbatim (App.jsx:386), so name says Japan while
  // region/flag/search are SG. The v0.61.274/276 checks compare coords vs
  // region/countryPref and miss this (coords=SG and region=SG agree). Here
  // we compare the ANCHOR's own location against the device: if the saved
  // anchor sits far from where the device actually is, prompt the user
  // (same modal UX as v0.61.274) instead of silently showing a mismatched
  // name+flag. Distance-gated >150 km so the daily SG↔JB border crossing
  // (its own v0.61.276 check) never triggers this, and fires once per
  // mount so a deliberate mid-session overseas pick isn't nagged.
  const anchorCoherenceCheckedRef = useRef(false);
  const [anchorMismatch, setAnchorMismatch] = useState(null);
  // P1-d — focus trap for the anchor-coherence modal (forced choice, no onClose).
  const anchorDialogRef = useDialog({ open: !!anchorMismatch });
  useEffect(() => {
    if (anchorCoherenceCheckedRef.current) return;
    if (!userLoc?.lat || !userLoc?.lng) return;       // wait for device resolution
    const a = locationAnchor;
    if (!a || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)) return;  // no anchor yet
    if (!(a.name || '').trim()) return;               // no displayed name → nothing misleading
    // Great-circle distance anchor↔device (km).
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(a.lat - userLoc.lat);
    const dLng = toRad(a.lng - userLoc.lng);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(userLoc.lat)) * Math.cos(toRad(a.lat)) * Math.sin(dLng / 2) ** 2;
    const km = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    // v0.61.410 — operator: COUNTRY-STRICT. A different country is a mismatch
    // even UNDER the 150 km distance gate (e.g. saved Johor MY but the device is
    // in Singapore — ~30 km, but a different country → don't auto-load).
    // coordsToCountry → 'SG' / 'MY' / null; null (outside the SG/MY bbox) can't
    // be compared, so distance alone decides there.
    const anchorCC = coordsToCountry(a);
    const deviceCC = coordsToCountry(userLoc);
    const countryDiffers = !!anchorCC && !!deviceCC && anchorCC !== deviceCC;
    if (km <= 150 && !countryDiffers) { anchorCoherenceCheckedRef.current = true; return; }
    // v0.61.325 — name BOTH places specifically (operator: "be specific
    // which part of JP — Fukuoka, Japan / street + city + country / or
    // current location street + city + country"). Build both labels from
    // the synchronous IATA table up-front (always shows City, Country at
    // minimum), then upgrade the DEVICE label with a reverse-geocoded
    // street/area name when that async call lands. The saved-anchor label
    // already carries the anchor's own display name (a.name) so it's
    // specific from the first paint.
    // v0.61.407 — operator: the SHARED set-location is AUTHORITATIVE. When a
    // saved anchor (e.g. Menu TMA set to Kuala Lumpur) differs from the device
    // GPS, KEEP the set-location — do NOT override to the device (the v0.61.406
    // behaviour forced the device over a Menu-set KL, which was exactly wrong)
    // and do NOT ask. tryServerCache (App.jsx:670) has already aligned the
    // region + country to the cached set-location, and runInitialLoad centres
    // the boot load on the anchor — so this check is now a no-op that lets the
    // set-location win. (The keep/use modal stays gone — anchorMismatch is never
    // set; the gate-opener fires the one boot load at the anchor.)
    // v0.61.409 — operator: when the saved anchor sits >150 km from the device
    // (saved ≠ device), DON'T auto-load. No popup, no device-override — just open
    // the TMA empty and let the user tap 🔍. (Supersedes the v0.61.407 no-op,
    // which kept loading at the set-location.)
    console.log(`[Cuisine-TMA-v2] anchor/device mismatch (${km.toFixed(0)}km${countryDiffers ? `, country ${anchorCC}≠${deviceCC}` : ' > 150'}) → no popup, suppress boot load (empty TMA, tap 🔍)`);
    haltBootLoadForMismatch(countryDiffers ? `anchor country ${anchorCC}≠device ${deviceCC}` : `anchor ${km.toFixed(0)}km from device`);
    anchorCoherenceCheckedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc?.lat, userLoc?.lng, locationAnchor?.lat, locationAnchor?.lng, locationAnchor?.name]);

  // v0.61.322 — splash-gate opener. Declared AFTER all three coherence
  // checks above so their one-shot *CheckedRefs are already set (synchronously,
  // same commit) by the time this runs. Opens the gate once the device coords
  // are known, all applicable checks have evaluated, and no mismatch modal is
  // pending a choice. The mismatch states are in deps so dismissing a modal
  // (which clears modalPendingRef in the apply* fns) re-runs this and opens
  // the gate → the TMA body finally renders, with location already reconciled.
  useEffect(() => {
    if (locationGateOpen) return;
    if (!userLoc?.lat || !userLoc?.lng) return;                 // wait for device
    // v0.61.324 — HANG FIX. This previously hard-required the three
    // coherence *CheckedRefs, but those checks `return` early WITHOUT
    // setting their ref on legitimate "nothing to flag" paths: no
    // countryPref, no saved anchor, or device coords outside the SG/MY
    // bbox (e.g. the user is physically in Japan → coordsToCountry null).
    // Any of those left a ref false forever → the gate never opened → the
    // splash hung and, after v0.61.323 deferred the search to the gate, NO
    // search ever fired (operator: "currently is hang"). The three checks
    // are declared BEFORE this effect, so on the commit where userLoc
    // resolves they run first and set modalPendingRef synchronously if they
    // raise a modal. Gating on userLoc + modalPendingRef alone is therefore
    // sufficient to wait for a genuine mismatch and can never deadlock.
    if (modalPendingRef.current) return;                        // a modal is up → stay gated
    // v0.61.368 — REVERT the v0.61.365 0.3 s settle + persist-before-load.
    // That settle (and the v0.61.367 one-shot follow-up) kept HANGING the boot
    // on the Menu→Cuisine path: the timer either deadlocked against mid-load
    // state churn or opened the gate without the search ever reaching the
    // server (Railway showed the set-location persist firing but NO cuisine
    // search). The async settle was too fragile around the coherence + sync +
    // search state churn. Back to the v0.61.323/324 SYNCHRONOUS open: no timer,
    // no persist — open the gate the instant userLoc resolves and no modal is
    // pending, and fire the one boot load. The Image-1 "modal over a loading
    // body" cosmetic returns; a hung TMA is far worse. A deterministic
    // countryPref-loaded gate is the proper follow-up if the operator wants the
    // Image-1 fix back.
    setLocationGateOpen(true);
    // v0.61.323 — the gate is the single place the boot venue list is
    // populated. On the common no-mismatch path no apply* ran, so fire the
    // ONE initial load here. On a mismatch path the user's apply* choice
    // already fired the correct search and set initialLoadFiredRef → we skip,
    // so there is no second / stale-region load.
    if (!initialLoadFiredRef.current) {
      initialLoadFiredRef.current = true;
      // v0.61.409 — operator: NEVER auto-load the boot 5 on a location mismatch.
      // If a coherence check already flagged saved≠device, open the TMA EMPTY
      // (no search, no hourglass) and let the user tap 🔍. Only load when the
      // saved location agrees with where the device is.
      if (bootMismatchRef.current) {
        console.log('[Cuisine-TMA-v2] gate open: boot load SKIPPED — saved≠device mismatch (empty TMA, tap 🔍)');
        setBootMismatchHalt(true);
        setFirstLoadPending(false);
        setLoading(false);
      } else {
        // v0.62.681 — arm the first-load overlay's minimum dwell alongside the
        // one boot load, so "Finding eateries…" is readable even when the
        // search settles in a frame or two. Deliberately NOT armed on the
        // mismatch branch above, which opens an empty TMA with no hourglass.
        setBootOverlayHold(true);
        runInitialLoad();
      }
    }
  }, [userLoc?.lat, userLoc?.lng, coherenceMismatch, regionMismatch, anchorMismatch, state.region, locationGateOpen]);

  function applyAnchorCoherenceChoice(useDevice) {
    if (!anchorMismatch) return;
    // v0.61.323 — this fn fires its own runSearch in BOTH branches (device
    // / kept-anchor), so claim the boot-load ref up-front: when the gate
    // opener subsequently runs (modal dismissed → gate opens) it must NOT
    // also fire runInitialLoad(), or the kept-JP/use-current search would
    // be followed by a stray device-location load.
    initialLoadFiredRef.current = true;
    if (useDevice) {
      // Drop the stale overseas anchor and re-anchor on the device; flip
      // region to match the device coords. Banner re-resolves the real
      // name (anchorActive=false → reverse-geocode userLoc); map + search
      // follow searchCenter=userLoc.
      setLocationAnchor(null);
      if (userLoc && Number.isFinite(userLoc.lat) && Number.isFinite(userLoc.lng)) {
        // v0.61.404 — centre the map on the chosen (device) spot FIRST, then
        // commit + search (sequential, not parallel — operator's spec).
        setFlyTarget({ lat: userLoc.lat, lng: userLoc.lng, zoom: 12, _k: Date.now() });
        setSearchCenter({ lat: userLoc.lat, lng: userLoc.lng });
        const c = coordsToCountry(userLoc);
        // v0.61.322 — build an explicit state delta so we can fire a fresh
        // search at the device location WITHOUT racing the queued setState
        // (mirrors the auto-detect `snap = {...state, ...stateDelta}` pattern).
        const stateDelta = {};
        if (c === 'SG') {
          stateDelta.region = 'SG';
        } else if (c === 'MY') {
          const target = isJbCoords(userLoc) ? 'JB' : 'OTHER';
          stateDelta.region = target;
          if (target === 'OTHER') stateDelta.countryPref = 'MY';
        }
        if (Object.keys(stateDelta).length) setState((s) => ({ ...s, ...stateDelta }));
        saveUserLocation({ lat: userLoc.lat, lng: userLoc.lng }).catch(() => {});
        if (stateDelta.countryPref) saveCountryPref(stateDelta.countryPref).catch(() => {});
        // v0.61.404 — message that the location moved to the device spot
        // (the OLD saved spot stays in the 📍 recents drawer to return to).
        setLocMoveNote({
          text: (lang === 'fr'
            ? `Position déplacée vers ${anchorMismatch.deviceLabel}`
            : lang === 'ru'
            ? `Местоположение перемещено на ${anchorMismatch.deviceLabel}`
            : lang === 'de'
            ? `Standort verschoben nach ${anchorMismatch.deviceLabel}`
            : lang === 'zh'
            ? `位置已移至 ${anchorMismatch.deviceLabel}`
            : lang === 'ja'
            ? `位置を ${anchorMismatch.deviceLabel} に移動しました`
            : lang === 'es'
            ? `Ubicacion movida a ${anchorMismatch.deviceLabel}`
            : `Location moved to ${anchorMismatch.deviceLabel}`)
            + (anchorMismatch.anchorLabel
              ? (lang === 'fr' ? ` · 📍 pour revenir à ${anchorMismatch.anchorLabel}` : lang === 'id' ? ` · 📍 untuk kembali ke ${anchorMismatch.anchorLabel}` : lang === 'ru' ? ` · 📍 чтобы вернуться к ${anchorMismatch.anchorLabel}` : lang === 'de' ? ` · 📍 zurück zu ${anchorMismatch.anchorLabel}` : lang === 'zh' ? ` · 📍 返回 ${anchorMismatch.anchorLabel}` : lang === 'ja' ? ` · 📍 ${anchorMismatch.anchorLabel} に戻る` : lang === 'es' ? ` · 📍 volver a ${anchorMismatch.anchorLabel}` : ` · 📍 to return to ${anchorMismatch.anchorLabel}`)
              : ''),
        });
        // v0.61.404 — device == set here, so DO load — but pause ~1 s so the
        // map-fly + message land first, THEN the 5 stream in. Single timer,
        // explicit snapshot (no state-settle race → safe in the gate area).
        const snap = { ...state, ...stateDelta };
        if (locMoveTimerRef.current) clearTimeout(locMoveTimerRef.current);
        locMoveTimerRef.current = setTimeout(() => {
          runSearch(snap, { lat: userLoc.lat, lng: userLoc.lng });
        }, 1000);
      }
    } else if (locationAnchor && Number.isFinite(locationAnchor.lat) && Number.isFinite(locationAnchor.lng)) {
      // v0.61.322 — "Keep saved spot" now commits FULLY to the kept spot.
      // Operator: *"if i keep to JP, the location should change, but still
      // show Downtown Cove. it is confusing."* Previously this only moved
      // searchCenter and left region/flag = SG, so a JP place rendered under
      // a 🇸🇬 flag (name says Japan, flag says SG → incoherent). Keep the
      // anchor name (correct to display) but flip region/flag/countryPref to
      // the kept spot's actual country, and fire a fresh search there so
      // name + flag + map + results all agree.
      const anchor = locationAnchor;
      // v0.61.404 — centre the map on the KEPT spot FIRST (sequential).
      setFlyTarget({ lat: anchor.lat, lng: anchor.lng, zoom: 12, _k: Date.now() });
      setSearchCenter({ lat: anchor.lat, lng: anchor.lng });
      const c = coordsToCountry(anchor);  // 'SG' / 'MY' / null
      const stateDelta = {};
      if (c === 'SG') {
        stateDelta.region = 'SG';
      } else if (c === 'MY') {
        const target = isJbCoords(anchor) ? 'JB' : 'OTHER';
        stateDelta.region = target;
        if (target === 'OTHER') stateDelta.countryPref = 'MY';
      } else {
        // Overseas (coordsToCountry returns null outside SG/MY bbox) — resolve
        // the kept spot's country from the nearest IATA city so the OTHER
        // picker shows the right flag (e.g. JP for "Naka Ward"/"Downtown Cove").
        const near = nearestIataCity(anchor.lat, anchor.lng);
        const cc = near?.city?.countryCode;
        const OTHER_SUPPORTED = new Set(OTHER_COUNTRIES.map((o) => o.code));
        if (cc && OTHER_SUPPORTED.has(cc)) {
          stateDelta.region = 'OTHER';
          stateDelta.countryPref = cc;
        } else {
          // Unresolvable country → still leave SG behind; OTHER is the safest
          // non-SG fallback so the 🇸🇬 flag never sits over an overseas name.
          stateDelta.region = 'OTHER';
        }
      }
      setState((s) => ({ ...s, ...stateDelta }));
      if (stateDelta.countryPref) saveCountryPref(stateDelta.countryPref).catch(() => {});
      // v0.61.404 — operator: when the user KEEPS a far spot, the set-location
      // (kept) ≠ the device location, so DON'T auto-load the 5 — stop here and
      // let the user tap 🔍 (or 📍 to use their real location). Crucially clear
      // the splash gate + loading so the TMA isn't stuck on the boot spinner
      // (runSearch normally clears firstLoadPending — but no search runs here).
      setFirstLoadPending(false);
      setLoading(false);
      setLocMoveNote({
        text: lang === 'fr'
          ? `Conservé ${anchorMismatch.anchorLabel}. Vous êtes à ${anchorMismatch.deviceLabel} — touchez 🔍 pour rechercher ici.`
          : lang === 'ru'
          ? `Сохранено: ${anchorMismatch.anchorLabel}. Вы в ${anchorMismatch.deviceLabel} — нажмите 🔍, чтобы искать здесь.`
          : lang === 'de'
          ? `${anchorMismatch.anchorLabel} behalten. Sie sind in ${anchorMismatch.deviceLabel} — 🔍 tippen, um hier zu suchen.`
          : lang === 'zh'
          ? `已保留 ${anchorMismatch.anchorLabel}。您位于 ${anchorMismatch.deviceLabel} — 点击 🔍 在此搜索。`
          : lang === 'ja'
          ? `${anchorMismatch.anchorLabel} を保持しました。現在地は ${anchorMismatch.deviceLabel} です — 🔍 をタップしてここで検索。`
          : lang === 'es'
          ? `Se mantuvo ${anchorMismatch.anchorLabel}. Estas en ${anchorMismatch.deviceLabel} — toca 🔍 para buscar aqui.`
          : `Kept ${anchorMismatch.anchorLabel}. You're at ${anchorMismatch.deviceLabel} — tap 🔍 to search here.`,
      });
    }
    modalPendingRef.current = false;  // v0.61.322 — release the splash gate
    setAnchorMismatch(null);
  }

  // v0.61.186 — re-fetch the server-cached user-location when the
  // TMA becomes visible again. Operator pain point: setting the
  // location to Putrajaya via chat /location, then switching back
  // to an already-open Cuisine TMA, left the pill on 🇸🇬 because
  // the initial-mount tryServerCache only ran once. This listener
  // catches the visibility flip + the Telegram WebApp's
  // viewportChanged event (fires when the user returns to the
  // TMA from chat) and re-runs the same auto-flip logic.
  useEffect(() => {
    async function refetchAndFlip() {
      if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return;
      try {
        const r = await fetchUserLocation();
        if (!r || !isValidCoord(r.lat, r.lng)) return;
        setUserLoc({ lat: r.lat, lng: r.lng });
        // v0.61.266 — mirror the v0.61.266 tryServerCache fix on the
        // visibility-refresh path. Without this, a user who switches
        // from Menu TMA to chat to Cuisine TMA (visibility flip)
        // would see the right coords but lose the Menu-set label.
        // v0.62.579 — operator (Brisbane clobbered "16 Thompson Street"): this
        // refetch must NOT downgrade a committed EXPLICIT pick to a COARSER
        // server/GPS label (a bare city like "Brisbane"). Same family as the
        // SG/Putrajaya set-location bugs; this is the coarse-city-over-street
        // case the D787 / _isCountryOnly guards never covered. When an explicit
        // pick is latched (explicitPickRef) with a name and the refetched label
        // is a COARSE one that DIFFERS from it, the PICK WINS (mirrors the boot
        // auto-detect guard at ~L2063). A coarse label = no digit, no comma, ≤ 2
        // words ("Brisbane", "Singapore", "Kuala Lumpur") — a street pick
        // ("16 Thompson Street", "…, Bowen Hills") has a digit/comma so it still
        // applies, keeping the v0.61.266 Menu-label restore intact. Holding the
        // committed pick here also stops reassertPickAfterSearch from re-pushing
        // the city, so the server self-heals to the street label on the next
        // search. Client-only display fix — the server cache logic is untouched.
        if (r.label && typeof r.label === 'string' && r.label.trim()) {
          const incoming = r.label.trim();
          const committed = (locationAnchorRef.current?.name || '').trim();
          const incomingCoarse = !/\d/.test(incoming) && !incoming.includes(',')
            && incoming.split(/\s+/).length <= 2;
          if (explicitPickRef.current && committed && committed !== incoming && incomingCoarse) {
            console.log('[Cuisine-TMA-v2] D792 visibility-refetch: committed pick "'
              + committed + '" holds over coarse refetched "' + incoming + '" (explicit pick wins)');
            // keep the committed anchor; coords already refreshed via setUserLoc above.
          } else {
            setLocationAnchor({
              lat: r.lat,
              lng: r.lng,
              name: incoming
            });
          }
        }
        if (r.region === 'JB') {
          setState((s) => (s.region === 'JB' ? s : { ...s, region: 'JB' }));
        } else if (r.region === 'OTHER' || r.region === 'MY-PUT') {
          setState((s) => (s.region === 'OTHER' ? s : { ...s, region: 'OTHER' }));
        } else if (r.region === 'SG') {
          setState((s) => (s.region === 'SG' ? s : { ...s, region: 'SG' }));
        }
        // v0.61.205 — keep precinctId in sync with the server cache
        // so the OTHER pill's flag swaps to Putrajaya when relevant.
        setAnchorPrecinctId(r.precinctId || null);
        // v0.62.33 — the visibility-refresh synced anchor/region/country but
        // never the Arrival Plate, so a city switch made in chat / Menu TMA
        // (or one whose persist response was missed) kept the OLD city's
        // "What to try here" card. Mirror the tryServerCache plate sync.
        setArrivalPlate(r.plate || null);
        // v0.61.270 — mirror tryServerCache's countryPref sync on
        // the visibility-restore path. User flips to Menu TMA, picks
        // Thailand, flips back to Cuisine TMA → countryPref tracks.
        if (r.country && (r.region === 'OTHER' || r.region === 'MY-PUT')) {
          setState((s) => (s.countryPref === r.country ? s : { ...s, countryPref: r.country }));
        }
        console.log('[Cuisine-TMA-v2] visibility-refresh: region=' + r.region + ' country=' + (r.country || '<none>') + ' precinctId=' + (r.precinctId || '<none>'));
      } catch { /* defensive: network blip shouldn't crash the listener */ }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refetchAndFlip);
    }
    const w = tg();
    if (w && typeof w.onEvent === 'function') {
      w.onEvent('viewportChanged', refetchAndFlip);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refetchAndFlip);
      }
      if (w && typeof w.offEvent === 'function') {
        w.offEvent('viewportChanged', refetchAndFlip);
      }
    };
  }, []);

  useEffect(() => { writeToHash(state); }, [state]);

  // v0.61.272 — Phase 4: the v0.61.193 SG-only chip strip is gone.
  // Durian / Durian Pastry / Fruits chips stay selected across all
  // regions; the search pipeline (v0.61.271 countryCode plumbing +
  // v0.61.267 OTHER autocomplete) handles MY / ID / TH / VN / PH /
  // JP / etc. correctly. If a region truly has no results, the
  // existing "no match" notice already surfaces that to the user.

  // v0.61.243 — GPS auto-detect + snap to nearest IATA city. Operator
  // 29-05 '26 morning: *"if my location is Kuala Lumpur, and i just
  // launch the cuisine TMA … you should detect the location and
  // change the location to Others and city code to Kuala Lumpur. if
  // my location isnt in the list of country code and/or city code —
  // you should replace with the country code and city code nearest
  // to the place of my location. … if not in the list then fire a
  // gemini. remember must be country code and city code by IATA,
  // non inventive."*
  //
  // Lifecycle: one-shot, runs after userLoc resolves. Claims the
  // warm-start effect's `initialSearchDone.current` ref so warm-
  // start is skipped on this mount — the auto-detect path fires its
  // own `runSearch` with the corrected region. Hash-deep-link mounts
  // (initialOverrides.location → `locationAnchor` already set on
  // first render) bypass auto-detect entirely; the bot already chose
  // the anchor explicitly.
  //
  // Algorithm:
  //   1. Ask for a *fresh* GPS reading (separate from userLoc, which
  //      may have come from tryServerCache and be stale by 100s of km).
  //      Fall back to userLoc when GPS denied.
  //   2. nearestIataCity(GPS) from the v0.61.242 348-entry table. If
  //      distance < 2000 km, trust the table.
  //   3. Otherwise (GPS outside ASEAN/Asia/AU-NZ/Oceania footprint),
  //      call iataSnap → /api/cuisine/iata-snap → Gemini for the
  //      nearest real IATA city. G4 pre-approved by operator
  //      ("Always fire Gemini for unknown GPS", AskUserQuestion
  //      answer recorded in the v0.61.242 journal). Last-ditch
  //      fallback: nearest in the local table even if far.
  //   4. Region routing: detected.countryCode === 'SG' → region SG;
  //      countryCode='MY' AND iata='JHB' → region JB; everything
  //      else → region OTHER + countryPref = detected.countryCode.
  //   5. Anchor lat/lng = GPS coords (operator: "move my google view
  //      to my location"). Anchor.name = the IATA city's canonical
  //      name from iata-cities.js so LocationField's OTHER picker can
  //      sync the city dropdown to the matching code (KUL, BKK, …).
  //   6. Save to /api/cuisine/set-location + country-pref so chat /
  //      next session see the same anchor.
  //   7. Fire `runSearch` with the explicit new state + GPS anchor —
  //      5 venues loaded at the GPS location with the right region.
  const autoDetectedRef = useRef(false);
  useEffect(() => {
    if (autoDetectedRef.current) return;
    if (!userLoc || !Number.isFinite(userLoc.lat) || !Number.isFinite(userLoc.lng)) return;
    if (Math.abs(userLoc.lat) < 0.001 && Math.abs(userLoc.lng) < 0.001) return;
    // v0.61.243 — deep-link case: the bot's /cuisine handler set
    // locationAnchor via the URL hash before mount. Respect that —
    // skip auto-detect, let warm-start's existing line 686 branch
    // fire runSearch at the deep-link anchor.
    if (locationAnchor && Number.isFinite(locationAnchor.lat) && Number.isFinite(locationAnchor.lng)
        && initialOverrides?.location) {
      autoDetectedRef.current = true;
      return;
    }
    // v0.62.35 — operator's Railway log: this effect's bare persist (step 5)
    // wrote label-less device coords (`[set-location] → 1.2722,103.8112`)
    // over the labelled HCM pick on every boot — setUserLocation REPLACES
    // the payload, so the pick's label/region/country were wiped and the
    // next boot rendered the mixed "MY>KL with a 🇸🇬 flag" UI from a
    // coords-only cache. A LABELLED cached pick is an explicit pick on
    // EVERY boot path (the v0.62.30 rule) — auto-detect must respect it:
    // skip the device re-anchor entirely (no GPS prompt, no Gemini, no
    // persist). The boot load still fires at the cached anchor.
    if (explicitPickRef.current && (locationAnchorRef.current?.name || '').trim()) {
      autoDetectedRef.current = true;
      console.log('[Cuisine-TMA-v2] auto-detect: SKIPPED — labelled cached pick "'
        + locationAnchorRef.current.name + '" holds (explicit pick wins)');
      return;
    }
    autoDetectedRef.current = true;
    // Claim warm-start's ref so the regular warm-start effect (declared
    // immediately below) skips this mount. Auto-detect owns the first
    // venue load.
    initialSearchDone.current = true;

    function getFreshGps() {
      return new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          resolve(null); return;
        }
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const { latitude, longitude } = p.coords || {};
            if (Number.isFinite(latitude) && Number.isFinite(longitude)
                && !(Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001)) {
              resolve({ lat: latitude, lng: longitude });
            } else resolve(null);
          },
          () => resolve(null),
          { timeout: 5000, maximumAge: 60_000, enableHighAccuracy: false }
        );
      });
    }

    (async () => {
      const fresh = await getFreshGps();
      const target = fresh || userLoc;
      console.log('[Cuisine-TMA-v2] auto-detect: target', target, 'fresh-gps=' + !!fresh);

      // 1) Try the v0.61.242 local IATA table.
      let detected = null;
      const local = nearestIataCity(target.lat, target.lng);
      if (local && local.distanceKm < 2000) {
        detected = local.city;
        console.log('[Cuisine-TMA-v2] auto-detect: LOCAL hit', detected.iata, detected.name,
          local.distanceKm.toFixed(0) + 'km');
      } else {
        // 2) GPS sits >2000 km from any covered city — Gemini fallback.
        console.log('[Cuisine-TMA-v2] auto-detect: local nearest >2000km, firing Gemini');
        try {
          const r = await iataSnap({ lat: target.lat, lng: target.lng });
          if (r?.iata) {
            // Normalise the Gemini-returned name to the canonical
            // iata-cities.js entry when we have one (so cityPick
            // sync in LocationField finds a matching dropdown row).
            const canon = IATA_CITIES.find((c) => c.iata === r.iata);
            detected = canon || r;
            console.log('[Cuisine-TMA-v2] auto-detect: GEMINI hit', detected.iata, detected.name);
          } else {
            console.log('[Cuisine-TMA-v2] auto-detect: Gemini returned null');
          }
        } catch (err) {
          console.warn('[Cuisine-TMA-v2] auto-detect: Gemini call failed', err?.message);
        }
        // Last-ditch: even a distant local entry is better than nothing.
        if (!detected && local) {
          detected = local.city;
          console.log('[Cuisine-TMA-v2] auto-detect: LAST-DITCH distant local',
            detected.iata, local.distanceKm.toFixed(0) + 'km');
        }
      }

      // 3) Route region based on the detected country.
      //    - SG → 'SG' pill
      //    - MY + JHB → 'JB' pill (Johor Bahru special-case)
      //    - Any country present in OTHER_COUNTRIES (v0.61.191 16-list:
      //      MY/ID/TH/VN/PH/BN/KH/LA/MM/AU/NZ/JP/KR/CN/HK/TW) → 'OTHER'
      //      + countryPref = detected.countryCode.
      //    - Anything else (e.g. detected in India, Pakistan, UAE) →
      //      leave region/countryPref alone. The CountryDropdown can't
      //      display a country it doesn't know, so flipping countryPref
      //      to e.g. 'IN' would silently render as MY (findCountry
      //      falls back to DEFAULT_OTHER_COUNTRY). Anchor + map + 5-
      //      place load still fire so the user sees their location.
      let targetRegion = null;
      let stateDelta = {};
      if (detected) {
        const OTHER_SUPPORTED = new Set(OTHER_COUNTRIES.map((c) => c.code));
        if (detected.countryCode === 'SG') {
          targetRegion = 'SG';
        } else if (detected.countryCode === 'MY' && detected.iata === 'JHB') {
          targetRegion = 'JB';
        } else if (OTHER_SUPPORTED.has(detected.countryCode)) {
          targetRegion = 'OTHER';
          stateDelta.countryPref = detected.countryCode;
        }
        if (targetRegion) stateDelta.region = targetRegion;
      }

      // 4) Apply state + anchor + map center.
      if (Object.keys(stateDelta).length) {
        setState((s) => ({ ...s, ...stateDelta }));
      }
      // v0.61.252 — operator: "My location is Malaysia, Putrajaya. I
      // start the Menu TMA, it jump to Kuala LUmpur. this is wrong."
      // The IATA table is sparse on satellites: KL metro covers KL +
      // Putrajaya + Shah Alam + Seremban via KUL's coords (3.14,
      // 101.69) but the canonical IATA name is "Kuala Lumpur".
      // When a curated cities.js entry sits within 30 km of the GPS,
      // PREFER its name over the IATA canonical so the operator sees
      // "Putrajaya" / "Penang" / "Tsim Sha Tsui" instead of the
      // metro umbrella. Same threshold as the v0.61.243 drift check.
      let anchorName = '';
      if (detected) {
        const list = (typeof CITIES_BY_COUNTRY !== 'undefined' ? CITIES_BY_COUNTRY[detected.countryCode] : null) || [];
        let nearestCurated = null;
        let nearestKm = Infinity;
        for (const c of list) {
          const dLat = (c.lat - target.lat) * Math.PI / 180;
          const dLng = (c.lng - target.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(target.lat * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (km < nearestKm) { nearestKm = km; nearestCurated = c; }
        }
        if (nearestCurated && nearestKm < 30) {
          anchorName = nearestCurated.name;
          console.log('[Cuisine-TMA-v2] auto-detect: prefer curated cities.js entry',
            nearestCurated.name, `(${nearestKm.toFixed(1)} km from GPS)`,
            'over IATA canonical', detected.name);
        } else {
          anchorName = IATA_CITIES.find((c) => c.iata === detected.iata)?.name || detected.name;
        }
        // v0.61.256 — defensive: never let the literal 'Unnamed'
        // placeholder string become the visible anchor name.
        if (!anchorName || anchorName === 'Unnamed') {
          anchorName = `${detected.countryCode || 'Pinned'} location`;
        }
      }
      setLocationAnchor({ lat: target.lat, lng: target.lng, name: anchorName });
      setSearchCenter({ lat: target.lat, lng: target.lng });

      // 5) Persist to server (fire-and-forget).
      // v0.62.35 — this is an AUTOMATIC mover (no user gesture), so it now
      // carries `ambient: true` (the v0.62.31 D787 contract): the server
      // refuses it over a fresh LABELLED pick — closes the initData-boot
      // race where this fired before the explicit-pick latch armed. It also
      // persists the resolved label/region/country so the cache is never a
      // bare coords-only entry again (the root of the mixed-flag boot).
      saveUserLocation({
        lat: target.lat, lng: target.lng, ambient: true,
        ...(anchorName ? { label: anchorName } : {}),
        ...(stateDelta.region ? { region: stateDelta.region } : {}),
        ...(stateDelta.countryPref ? { country: stateDelta.countryPref } : {})
      }).catch(() => {});
      if (stateDelta.countryPref) saveCountryPref(stateDelta.countryPref).catch(() => {});

      // 6) v0.61.323 — DO NOT fire the venue load here anymore. The boot
      //    load is deferred to the gate-opener's runInitialLoad() so no
      //    search runs until location is confirmed (operator: "check
      //    BEFORE load"). This effect now only RESOLVES location state
      //    (region/countryPref/locationAnchor/searchCenter) + persists it;
      //    runInitialLoad() reads the committed state/searchCenter when the
      //    gate opens. autoDetectedRef/initialSearchDone stay claimed above
      //    so warm-start remains suppressed on the auto-detect path.
      console.log('[Cuisine-TMA-v2] auto-detect applied (load deferred to gate)',
        { region: targetRegion || '(unchanged)', country: detected?.countryCode || null, city: anchorName });
    })();
  }, [userLoc?.lat, userLoc?.lng]);

  // v0.58.4: warm-start the result list on first paint with 5 random
  // venues drawn from a rotating server-side seed. Falls back to the
  // regular search pipeline if warm-start errors so the picker never
  // opens to an empty list. lastRunSnap stays null on warm-start so
  // the user's first manual 🔍 Search press still runs and populates
  // the dirty-indicator baseline.
  //
  // v0.61.243 — the autoDetect effect (declared above) now claims
  // initialSearchDone.current so warm-start is suppressed on the
  // auto-detect path. This logic still owns the URL-hash deep-link
  // case (initialOverrides.location) and the pathological "no GPS,
  // no cache" path where autoDetect noops.
  //
  // v0.61.323 — this body was an eager useEffect that fired the boot
  // venue load the moment userLoc resolved (UNDER the v0.61.322 splash),
  // racing the anchor-coherence check and showing stale SG venues. It is
  // now a function called EXACTLY ONCE by the splash-gate opener, after
  // location is confirmed. It reads the CURRENT resolved center
  // (searchCenter || locationAnchor || userLoc) and the committed state,
  // so by the time it runs the auto-detect effect has already set
  // region/countryPref/locationAnchor/searchCenter. All prior behavior
  // (deep-link runSearch, warmStart seeding + setPages, generic fallback)
  // is preserved. Guarded by initialSearchDone.current as a belt-and-
  // braces re-entry guard (the gate-opener also gates on
  // initialLoadFiredRef).
  function runInitialLoad() {
    if (!userLoc || initialSearchDone.current) return;
    // v0.61.373 — region-aware SINGLE SOURCE OF TRUTH (search-location.js).
    // An explicit anchor / committed searchCenter wins; the device GPS is a
    // valid centre ONLY in SG. In OTHER / JB with no pick yet, `center` is
    // null → we DON'T boot-load the device's city (the old `… : userLoc`
    // fallback loaded 5 SG venues under an OTHER region); the user picks a
    // country + city and the search fires from there. The done-flag is set
    // only once we actually load, so a late anchor can still fire.
    const center = resolveSearchCenter({ region: state.region, searchCenter, locationAnchor, userLoc });
    if (!center) {
      console.log('[Cuisine-TMA-v2] runInitialLoad: no coherent centre for region', state.region, '— awaiting a country+city pick');
      return;
    }
    initialSearchDone.current = true;
    // v0.58.10: when the bot's /cuisine tokeniser pre-anchored via the
    // hash (lat/lng/place), OR auto-detect resolved an anchor, skip
    // warm-start and run a real search at that anchor so the user lands
    // on the exact confirmed/deep-linked location (never raw GPS).
    if (locationAnchor?.lat != null && locationAnchor?.lng != null) {
      setSearchCenter({ lat: locationAnchor.lat, lng: locationAnchor.lng });
      runSearch(state, { lat: locationAnchor.lat, lng: locationAnchor.lng }, { boot: true });
      return;
    }
    // v0.61.394 — operator (urgent): the first load now runs the FULL search,
    // not the lean warm-start. warm-start deliberately skipped the
    // review / type / price / social enrichment for speed, so the very first
    // card came up WITHOUT the full template ("there isn't the full card").
    // runSearch is already the boot path for an explicit anchor (above) and
    // was the warm-start empty-fallback, so it is proven boot-safe — and it
    // clears firstLoadPending the same way. Accepts a slower first load
    // (operator: "first load just ask user to wait"). This is in
    // runInitialLoad ONLY — it does NOT touch the splash-gate / coherence
    // effects (the hang-prone area).
    setSearchCenter({ lat: center.lat, lng: center.lng });
    runSearch(state, { lat: center.lat, lng: center.lng }, { boot: true });
  }

  // v0.58.27 → v0.59.18: auto re-search effect REMOVED per Human Lead.
  // Search now fires only on explicit triggers — the 🔍 Search button,
  // the Tell-Me submit arrow, the floating-action search FAB, and the
  // map's "Search this area" button. Filter / cuisine / region toggles
  // stage state silently; the `dirty` ring around 🔍 Search is the
  // visible cue that pending changes haven't been searched yet.

  // v0.59.43: flush the result list when the TMA is closed/hidden so
  // the next open is a clean slate. Per Human Lead 2026-05-07: re-
  // opening should feel fresh, not show the previous results from
  // before the close. The OS clipboard is untouched (we never write
  // to it from React state — Copy/Copy-all writes happen at click
  // time through the navigator.clipboard API and persist independently).
  // - `pagehide` fires when the iframe is going to be unloaded OR put
  //   into bfcache. Clearing venues here means a bfcache restore
  //   surfaces an empty list, which the warm-start effect will refill.
  // - `pageshow` with persisted=true means we're returning from
  //   bfcache; reset the initialSearchDone gate so warm-start re-fires.
  useEffect(() => {
    function onPageHide() {
      setVenues([]);
      setComboInfo(null);
      setLastRunSnap(null);
      setWarmStartSeed(null);
      setSearchCenter(null);
    }
    function onPageShow(e) {
      if (e.persisted) {
        initialSearchDone.current = false;
        // v0.61.323 — also release the deferred-load guard + re-shut the
        // gate so the gate-opener re-fires runInitialLoad() to refill the
        // list cleared on pagehide. The coherence *CheckedRefs persist, so
        // with userLoc still resolved the gate re-opens on the next effect
        // pass (no modal pending → no splash flash) and the one load runs.
        initialLoadFiredRef.current = false;
        setLocationGateOpen(false);
      }
    }
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // v0.62.34 — operator: "After the result is displayed, should check if
  // location is still set to the location. Here i set to VN>HCM, the
  // results are correct but it switch to hanoi (capital)." Root cause: the
  // v0.61.186 visibility re-fetch (viewportChanged fires even on keyboard
  // open/close) can pull a STALE server label over a fresh explicit pick
  // when the pick's set-location was lost or out-raced. Fix (operator pick
  // 1): after each search, compare the server's label against the committed
  // pick; on mismatch RE-PUSH the pick. Silent (no chat notify, no map
  // move); fire-and-forget; D791 in the console. Only acts while the
  // explicit-pick latch is held, so plain GPS sessions are untouched.
  async function reassertPickAfterSearch(snap, searched = null) {
    try {
      if (!explicitPickRef.current) return;
      const a = locationAnchorRef.current;
      if (!a || !(a.name || '').trim() || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)) return;
      // v0.62.x — operator (AU › Canberra reset): only re-push when the live
      // anchor matches the coords THIS search actually used. If they diverge
      // (the anchor drifted back to a country capital while the search ran at the
      // picked city), re-pushing would clobber the server cache with the wrong
      // city — the Canberra reset. Skip in that case; the searched city stays.
      if (searched && Number.isFinite(searched.lat) && Number.isFinite(searched.lng)
          && (Math.abs(searched.lat - a.lat) > 0.01 || Math.abs(searched.lng - a.lng) > 0.01)) {
        console.log(`[Cuisine-TMA-v2] D791 skip re-push: anchor "${a.name}" (${a.lat.toFixed(3)},${a.lng.toFixed(3)}) ≠ searched (${searched.lat.toFixed(3)},${searched.lng.toFixed(3)}) — avoiding stale-capital clobber`);
        return;
      }
      const r = await fetchUserLocation();
      const serverLabel = (r?.label || '').trim();
      if (serverLabel === a.name.trim()) return;   // server agrees — nothing to do
      console.log(`[Cuisine-TMA-v2] D791 post-search location check: server="${serverLabel || '<none>'}" ≠ pick="${a.name}" — re-pushing the pick`);
      const c = coordsToCountry({ lat: a.lat, lng: a.lng });
      let region;
      if (c === 'SG') region = 'SG';
      else if (c === 'MY') region = isJbCoords({ lat: a.lat, lng: a.lng }) ? 'JB' : 'OTHER';
      else region = (snap?.region && snap.region !== '__NONE__') ? snap.region : 'OTHER';
      const country = region === 'OTHER' ? (snap?.countryPref || undefined) : undefined;
      const resp = await saveUserLocation({
        lat: a.lat, lng: a.lng, label: a.name, region, country,
        ...(Number.isFinite(a.radiusCapM) && a.radiusCapM > 0 ? { radiusCapM: a.radiusCapM } : {})
      });
      // The Arrival Plate follows the re-asserted city too.
      setArrivalPlate(resp?.plate || null);
    } catch { /* fire-and-forget — never block or fail the search UI */ }
  }

  async function runSearch(snap = state, anchor = null, opts = {}) {
    // v0.62.x — pin the displayed location name to THIS search's anchor (an
    // Other-city pick passes anchor.name, e.g. "Sunshine Coast"); cleared for
    // coordless / current-location searches so the label falls back to the
    // reverse-geocoded locationName. Makes the header immune to the background
    // refresh that re-applies a stale server anchor (the location-display thrash).
    setSearchLocName((anchor && typeof anchor.name === 'string' && anchor.name.trim()) || '');
    // v0.62.x — remember the dish / free-text term this search is FOR, so the
    // result cards + copy can show "Likely serves {term} {dish|dessert|drink}".
    // Cleared for a plain cuisine-chip search (no free text).
    {
      const _ft = (typeof opts?.freeTextOverride === 'string' && opts.freeTextOverride.trim())
        ? opts.freeTextOverride.trim()
        : ((typeof nlText === 'string' && nlText.trim()) ? nlText.trim() : '');
      setSearchedTerm(_ft || null);
      // 'dish' = a classic-picker dish tap (freeTextOverride) → copy puts the
      // line atop each card; 'freetext' = the Tell-me box → copy adds one note
      // row at the end. (Part B copy behaviour.)
      setSearchedTermMode(_ft ? (opts?.freeTextOverride ? 'dish' : 'freetext') : null);
    }
    // v0.61.320 — SINGLE SOURCE OF TRUTH for the search location, and
    // never a silent no-op. Previously this opened with `if (!userLoc)
    // return` — device GPS was the gate. In OTHER mode (foreign city
    // picked via the Country/City cascade) device GPS is often null, so
    // the 🔍 tap returned with no request, no loading, no error — a
    // silent dead search. The user's CHOSEN location lives in
    // searchCenter / locationAnchor, not userLoc. Resolve the center from
    // those first (device GPS is only the last fallback) and proceed
    // whenever ANY of them is valid; only bail with a VISIBLE error when
    // nothing is resolvable.
    // v0.60.119 — an explicit pick (locationAnchor) wins over the cached
    // device pin so a nulled searchCenter (TMA background/restore) can't
    // reset the user's chosen location.
    // v0.61.373 — region-aware SINGLE SOURCE OF TRUTH (search-location.js,
    // unit-tested). Crucially, in OTHER / JB the device GPS is NEVER the
    // centre, so an "Others" search can't silently run at the user's
    // physical SG location (the over-compression bug). null → visible error.
    const center = resolveSearchCenter({ region: snap.region, anchor, searchCenter, locationAnchor, userLoc });
    // v0.58.26: defence-in-depth — never POST {lat:0, lng:0}.
    if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)
        || (Math.abs(center.lat) < 0.001 && Math.abs(center.lng) < 0.001)) {
      console.warn('[Cuisine-TMA-v2] runSearch: no resolvable location', { center, userLoc, searchCenter, locationAnchor });
      setError(state.region === 'OTHER'
        ? 'Pick a country and city above, then tap 🔍.'
        : 'Location not yet resolved — share a pin via /location and reopen.');
      return;
    }
    // v0.60.188 — operator: when the previous search returned fewer
    // than 12 venues, the dedup seen-set has eaten into the next
    // batch's headroom. Auto-arm `resetSeen: true` on the next 🔍 tap
    // so the user gets a fresh batch with the same criteria (matches
    // the "Tap 🔍 to refresh results with same criteria" hint shown
    // below the result list). Skips when the caller already requested
    // resetSeen explicitly, or when the result set was zero (the
    // existing v0.60.157 auto-retry handles that branch), or when the
    // exhausted-note path is already armed (its ↺ Start-over button
    // is the user's affordance there).
    //
    // v0.60.191 — Codex interaction fix: the threshold followed the
    // server's intended slice size (6 on a planned firstBatch=true
    // first batch, 12 otherwise) to avoid a loop where the firstBatch
    // tap returning 6 would arm resetSeen → server wipes seen → next
    // slice is firstBatch=6 again.
    //
    // v0.61.167 — operator reported the same misfire shape under the
    // v0.61.163 unified 19-cap: a real area with only 8 matching
    // venues returns 8 on the FIRST tap (firstBatch=true), below the
    // prior 12 threshold → arms resetSeen → next tap wipes seen →
    // server returns the same 8 again → loop. The clean fix is to
    // **never auto-reset on a firstBatch response**. firstBatch=true
    // means the seen-set was empty server-side; whatever came back
    // IS the natural pool for those criteria. Only on follow-up taps
    // (firstBatch=false → user has been clicking through) does a thin
    // result indicate burnthrough that warrants reset.
    const FOLLOW_UP_THIN_THRESHOLD = 19;
    // v0.60.194 — Michelin pagination exception. handleMichelinSearch
    // has its own deterministic 130-venue pool + its own walk-through
    // indicator (michelinSummary.remaining surfaced as
    // `michelinRemaining` state). The autoReset semantic doesn't apply
    // mid-Michelin: tap 11 returning the natural 10-venue tail would
    // otherwise arm resetSeen → tap 12 wipes the seen-set → server
    // returns the first 12 again silently, destroying pagination
    // state. Suppress when michelinRemaining is truthy; rely on the
    // exhausted=true "↺ Start over" CTA at the natural end of the
    // walk-through instead.
    // v0.61.170 — autoResetOnLowCount disabled. The new range-label
    // copy makes recycle an explicit operator action ("Change criteria
    // or tap ↺") instead of a silent auto-reset. The server's
    // exhausted/finalBatch flags drive the UI directly; users who
    // want a fresh rotation tap the ↺ recycle button (handled
    // elsewhere). The v0.61.167 "!firstBatch on thin result" carve-out
    // is rolled into this complete disable.
    const autoResetOnLowCount = false;
    setLoading(true); setError(null);
    setDegradedNotice(false);   // v0.62.x — reset the stalled-stream notice per search attempt
    setStreamFirstName(null);   // v0.62.78 — reset the progressive name per search
    setAllSeenInRange(null);    // v0.62.88 — reset the "all-seen, widen?" note per search
    // v0.62.x — fresh AbortController so the loading pop-up's 🛑 Stop button can
    // cancel this stream; abort any prior in-flight search first.
    try { searchAbortRef.current?.abort(); } catch { /* none in flight */ }
    const searchAbort = new AbortController();
    searchAbortRef.current = searchAbort;
    try {
      const r = await searchCuisine({
        lat: center.lat, lng: center.lng,
        cuisines: snap.cuisines, filters: snap.filters,
        // v0.61.273 — first-paint '__NONE__' sentinel: omit region
        // from the request so the server resolves it from cache /
        // coarseGate, not from a stale 'SG' fallback. Existing
        // resolved values (SG/JB/OTHER) forward as before.
        region: (snap.region && snap.region !== '__NONE__') ? snap.region : undefined,
        lang,                                             // v0.59.0
        // v0.62.90 — sticky Widen: an explicit opts.widen (the toggle flip) wins;
        // otherwise carry the per-cuisine widenActive switch so re-taps stay wide.
        widen: (typeof opts?.widen === 'boolean') ? opts.widen : widenActive,
        resetSeen: opts?.resetSeen === true || autoResetOnLowCount,  // v0.60.117 / v0.60.188
        // v0.60.126 — Tell-me box as a qualifier. v0.62.32 — an Arrival
        // Plate dish tap passes freeTextOverride so the dish search fires
        // on the SAME render (state.nlText hasn't committed yet).
        freeText: (typeof opts?.freeTextOverride === 'string' && opts.freeTextOverride.trim()) ? opts.freeTextOverride.trim() : ((typeof nlText === 'string' && nlText.trim()) ? nlText.trim() : undefined),
        // v0.62.x — operator: a SG "Pick local classic" dish tap asks the server
        // to rank hawker-centre venues first (then fall back to regular eateries).
        hawkerFirst: opts?.hawkerFirst === true,
        specialMode: snap.specialMode || null,           // v0.61.126 — Fruits / Durian exclusive mode override
        // v0.61.271 — Phase 3 SSOT: forward state.countryPref so the
        // server uses the user's explicit country pick instead of
        // inferring from cached anchor (which may be stale). Only
        // sent when region is OTHER/MY-PUT — SG/JB regions carry
        // their country implicitly through `region`.
        countryCode: (snap.region === 'OTHER' || snap.region === 'MY-PUT') ? snap.countryPref : undefined,
        // v0.61.428 — forward the rating pill value as an explicit search
        // criterion (server prefers it over the Redis pref). Makes the
        // choice register on THIS search instead of only via the
        // fire-and-forget Save POST. Gated on ratingLoaded so the boot
        // load can't send the '3.7' default over a chat /rating value.
        ratingPref: ratingLoaded ? ratingPref : undefined,
        // v0.62.676 — Michelin year / Bib Gourmand ticks (CuisineDrawer,
        // shown only while 'michelin' is selected).
        michelinFilter: snap.michelinFilter
      },
      // v0.62.x — progressive-results Stage 2: for a USER-initiated search,
      // opt into the NDJSON stream so verified base cards paint immediately
      // and the slow fields (translated review, walk times, 🔤 readings,
      // crowd, …) merge per-card as they land. Boot load keeps the single-
      // shot path so the v0.61.409 boot-mismatch discard never flashes a
      // half-painted list. The awaited `r` is still the full final payload,
      // so all the post-processing below is unchanged.
      opts?.boot ? undefined : {
        signal: searchAbort.signal,   // v0.62.x — 🛑 Stop loading
        onBase: (ev) => {
          if (Array.isArray(ev?.venues)) {
            setVenues(ev.venues);
            setFirstLoadPending(false);
            // v0.62.78 — surface the first found name in the wait card.
            setStreamFirstName((ev.venues[0] && ev.venues[0].name) || null);
          }
        },
        onPatch: (mergedVenues) => {
          setVenues(mergedVenues.map((v) => ({ ...v })));
          if (Array.isArray(mergedVenues) && mergedVenues[0] && mergedVenues[0].name) {
            setStreamFirstName(mergedVenues[0].name);
          }
        }
      });
      // v0.62.x — operator: "slower phones are not populating the details
      // and caused a letdown." A stalled NDJSON stream (api.js
      // STREAM_STALL_TIMEOUT_MS) now resolves with a best-effort partial
      // result instead of hanging forever; surface the existing (previously
      // unwired) degraded-connection notice so the user knows to retry
      // instead of assuming the app is broken.
      if (r && r.streamStalled) {
        console.log('[Cuisine-TMA-v2] stream stalled — showing degraded notice');
        setDegradedNotice(true);
      }
      // v0.61.409 — boot-load race guard. If a coherence check flagged
      // saved≠device AFTER this boot search fired (countryPref/anchor landed
      // late), DROP the results — on a mismatch the TMA must stay empty
      // (operator: "NOT load the first 5 at all"). opts.boot is set ONLY by
      // runInitialLoad, so a user-initiated 🔍 search is never affected. The
      // finally{} below still clears `loading`, so no stray hourglass.
      if (opts?.boot && bootMismatchRef.current) {
        console.log('[Cuisine-TMA-v2] boot search returned but saved≠device → discarding results (empty TMA, tap 🔍)');
        setBootMismatchHalt(true);
        setVenues([]);
        setFirstLoadPending(false);
        return;
      }
      // v0.60.131 — server says the "Tell me" text was a question, not a
      // dish/cuisine: show the decline note, no result list.
      if (r && r.questionDeclined === true) {
        setQuestionDeclined(true);
        setVenues([]); setMisrepNote(null); setCookMethodPivot(null); setComboInfo(null);
        // v0.61.130 — clear the v0.61.129 pills + caption alongside the
        // other info chips when the server declined the typed text.
        setPlaceAnchor(null); setSpecialModeNotice(null); setSpecialModeWidenedInfo(null);
        setFirstLoadPending(false);
        return;
      }
      setQuestionDeclined(false);
      // v0.60.157 — zero-results auto-retry. If the response is empty
      // AND this isn't already the retry attempt AND we haven't already
      // retried for this exact criteria signature, fire a single silent
      // re-search with `resetSeen: true`. The most common cause of a
      // zero list is the per-criteria seen-set having accumulated past
      // the dedup pool over a long session — resetting it on the
      // server unblocks the first ~60 again. The retry itself sets
      // `opts.resetSeen=true`, so the recursion can't loop. If THIS
      // call IS the retry (i.e. opts.resetSeen === true and venues are
      // still zero), arm the CTA panel below the result list and pop
      // the criteria builder open so the user can adjust without
      // scrolling.
      const isRetryCall = opts?.resetSeen === true;
      const isZeroResult = Array.isArray(r.venues) && r.venues.length === 0;
      const currentSig = stateSig(snap);
      // v0.61.397 — a special-mode block (durian/fruits outside the belt)
      // comes back as an empty list ON PURPOSE. Skip the zero-result retry +
      // criteria-builder pop below — there's nothing to adjust; the panel
      // shows the "only available in …" banner instead.
      if (isZeroResult && !r.specialModeBlocked && !isRetryCall && lastZeroRetrySnapRef.current !== currentSig) {
        lastZeroRetrySnapRef.current = currentSig;
        // v0.62.13 — a retry is pending: don't show a zero-reason notice yet
        // (the resetSeen retry will likely recover, e.g. the stale-seen case).
        setZeroReasonKey(null);
        // Schedule the retry in a microtask so the current `finally`
        // (setLoading(false)) runs first, then the retry's setLoading(true)
        // re-fires the spinner. Without this the spinner appears to skip.
        Promise.resolve().then(() => runSearch(snap, anchor, { resetSeen: true }));
        // Fall through to the regular zero-result setters below; the
        // retry will overwrite them on success.
      } else if (isZeroResult && !r.specialModeBlocked && !r.degraded) {
        // v0.62.13 — a PERSISTENT zero (the resetSeen retry also came back
        // empty, OR the retry budget for this criteria signature was already
        // spent): make the empty list evident with the server-classified
        // reason. The criteria builder only pops on the actual retry-zero.
        // v0.61.441 — but NOT when the server flagged `degraded` (a transient
        // network / upstream-5xx blip the error-classify path turns into an
        // empty-200): that's not the criteria's fault. The degraded banner
        // below explains it.
        if (isRetryCall) {
          setZeroRetried(true);
          setCuisinePickOpen(true);   // v0.62.249 — open the folio picker (was the old criteria sheet)
        }
        const zr = r.zeroReason;
        setZeroReasonKey(
          // v0.62.x item 10 — a tapped dish gated to empty wins the message.
          r.dishSearchEmpty ? 'zero.dishNoSpot'
          : (zr === 'all-seen-criteria' || zr === 'all-seen-session') ? 'zero.allSeen'
          : (zr === 'no-venues-nearby') ? 'zero.noVenuesNearby'
          : (zr === 'no-match-criteria' || zr === 'filtered') ? 'zero.noMatchCriteria'
          : null
        );
      } else if (!isZeroResult) {
        // Non-zero result clears the flag + ref so a future criteria
        // signature that returns zero can get its own retry budget.
        setZeroRetried(false);
        lastZeroRetrySnapRef.current = null;
        setZeroReasonKey(null);
      }
      setVenues(r.venues || []);
      setNoProvenNew(!!r.noProvenNew);   // v0.62.205 — "no new nearby" banner flag
      // v0.62.88 — "all N within X km" recycle note (null unless the server
      // re-served an exhausted in-range pool at the tight cap).
      setAllSeenInRange(r.allSeenInRange || null);
      // v0.62.x — cuisine "What to order" plate (single-cuisine searches);
      // null on combo/no-cuisine → falls back to the geo city plate.
      setCuisinePlate(r.cuisinePlate || null);
      // v0.60.82 — capture combo metadata; null when single/no cuisine
      setComboInfo(r.comboInfo || null);
      // v0.60.128 — "misrepresented dish" note (null unless the Tell-me
      // text named a dish from the curated table)
      setMisrepNote(r.misrepresentation && r.misrepresentation.name ? r.misrepresentation : null);
      setCookMethodPivot(r.cookingMethod && Array.isArray(r.cookingMethod.matches) && r.cookingMethod.matches.length ? r.cookingMethod : null);
      // v0.61.126 — special-mode "limited matches" notice (server sets
      // `specialModeLimited: true` when the post-filter dropped the
      // count below the spec's 8-12 target).
      setSpecialModeNotice(r.specialMode && r.specialModeLimited ? r.specialMode : null);
      // v0.62.14 — durian soft-rating notice: the server included a below-3.7 /
      // unrated stall, so explain we prefer 3.7★+ but still show the rest.
      setDurianRatingNote(r.durianRatingNotice === true);
      // v0.61.397 — server blocked the durian/fruits/durian-pastry mode for
      // a country outside the SE-Asian durian belt. { mode, country } or null.
      setSpecialModeBlocked(r.specialModeBlocked || null);
      // v0.61.278 — O-25: JB-hybrid graceful-exit signal from server.
      setJbFallbackNotice(r.jbFallbackToOther === true);
      // v0.61.441 — `degraded` true when the server hit a transient blip
      // (network reset / upstream 5xx / redis hiccup) and returned an
      // empty-but-OK 200 instead of an HTTPS 500. Surface an honest "try
      // again" note (cleared on any non-degraded response).
      setDegradedNotice(r.degraded === true);
      // v0.61.130 — v0.61.129 O-23 backend metadata. `specialModeWidened`
      // is true when the server's radius-escalation loop fired at least
      // once; the from/final metres tell the user the search drew from
      // a wider area than the slider implies.
      setSpecialModeWidenedInfo(
        r.specialModeWidened && Number.isFinite(r.specialModeFinalRadiusM)
          ? { fromM: r.specialModeWidenedFromM, finalM: r.specialModeFinalRadiusM }
          : null
      );
      // v0.61.130 — v0.61.129 O-20 backend metadata. `placeAnchor` is
      // the detected place ({ name, kind, lat, lng, source });
      // `placeAnchorQueryRemainder` is the stripped freeText (what's
      // left after the place name was lifted out — empty when the user
      // typed a place name on its own).
      setPlaceAnchor(
        r.placeAnchor && r.placeAnchor.name && Number.isFinite(r.placeAnchor.lat)
          ? { ...r.placeAnchor, queryRemainder: typeof r.placeAnchorQueryRemainder === 'string' ? r.placeAnchorQueryRemainder : '' }
          : null
      );
      setFirstLoadPending(false);
      // v0.61.224 — operator bug: when the user types a place name in the
      // Tell-me box (e.g. "Geylang") the backend pivots `searchCenter` to
      // that place's coords (place-anchor detection, v0.61.129), but the
      // CLIENT was still calling `setSearchCenter({ lat: center.lat, lng:
      // center.lng })` using the pre-search `center`. Result: the map
      // stayed on the user's anchor (Bedok) while the result pins were in
      // Geylang. Re-anchor the map to the detected place's coords when
      // present so the map visually shifts to where the search actually
      // happened.
      if (r.placeAnchor && Number.isFinite(r.placeAnchor.lat) && Number.isFinite(r.placeAnchor.lng)) {
        setSearchCenter({ lat: r.placeAnchor.lat, lng: r.placeAnchor.lng });
      } else {
        setSearchCenter({ lat: center.lat, lng: center.lng });
      }
      setLastRunSnap(stateSig(snap));
      // v0.58.4: any explicit search supersedes the warm-start label.
      setWarmStartSeed(null);
      // v0.58.29: collapse the Search-criteria card on a successful
      // search so the result list takes focus. Per Human Lead — users
      // weren't sure their search produced anything because the
      // builder dominated the viewport. Skip the collapse if the
      // search returned zero venues so the user can adjust filters
      // without re-expanding.
      if (Array.isArray(r.venues) && r.venues.length > 0) {
        setCuisinePickOpen(false);   // v0.62.249 — collapse the folio picker once results arrive
      }
      // End-of-list note rendered separately at the result list bottom
      // (sticky, not a popup). Cleared on the next non-exhausted search.
      setExhaustedNote(r?.exhausted === true);
      // v0.61.234 — sparse-coverage hint. When the user selected a
      // cuisine that Places genuinely has few SG matches for and the
      // result count is ≤ 5, surface a note so they understand the
      // ceiling is real (vs assuming the search broke).
      const SPARSE_SLUGS = new Set(['african', 'south-african', 'georgian']);
      const sparseHit = Array.isArray(snap?.cuisines)
        && snap.cuisines.some((s) => SPARSE_SLUGS.has(String(s).toLowerCase()));
      const lowCount = Array.isArray(r?.venues) && r.venues.length > 0 && r.venues.length <= 5;
      setSparseNotice(sparseHit && lowCount ? snap.cuisines.find((s) => SPARSE_SLUGS.has(String(s).toLowerCase())) : null);
      setFirstBatch(r?.firstBatch === true);    // v0.60.191
      // v0.61.170 — range counter fields from the response.
      setCumulativeStart(Number.isFinite(r?.cumulativeStart) ? r.cumulativeStart : null);
      setCumulativeEnd(Number.isFinite(r?.cumulativeEnd) ? r.cumulativeEnd : null);
      setFinalBatch(r?.finalBatch === true);
      // v0.61.174 — knownTotal grows monotonically per criteria.
      // On a fresh criteria (firstBatch=true), seed from cumulativeEnd;
      // otherwise keep the max so the title's "Results: {known}" never
      // shrinks mid-rotation.
      if (Number.isFinite(r?.cumulativeEnd)) {
        if (r?.firstBatch === true) {
          setKnownTotal(r.cumulativeEnd);
        } else {
          setKnownTotal((prev) => Math.max(Number.isFinite(prev) ? prev : 0, r.cumulativeEnd));
        }
      }
      setPoolCount(Number.isFinite(r?.poolCount) ? r.poolCount : 0);
      // v0.60.146 — per-session clipboard signal carried by every
      // /api/cuisine/search response.
      setSessionFull(r?.sessionFull === true);
      setPageStackDepth(Number.isFinite(r?.pageStackDepth) ? r.pageStackDepth : 0);
      // v0.61.437 — surface Michelin zero/miss reasons (code review F5/F6/F7).
      if (r?.reasonCode === 'michelin_no_list') setMichelinNotice('michelin.noList');
      else if (r?.reasonCode === 'michelin_unresolved') setMichelinNotice('michelin.unresolved');
      else if (r?.michelinSummary && r.michelinSummary.cuisineMatched === 0) setMichelinNotice('michelin.comboMiss');
      else setMichelinNotice(null);
      // v0.60.149 — Michelin remaining-count indicator.
      if (r?.michelinSummary && Number.isFinite(r.michelinSummary.remaining)) {
        setMichelinRemaining({
          shown: r.michelinSummary.shown || 0,
          remaining: r.michelinSummary.remaining,
          total: r.michelinSummary.total || 0,
          // v0.61.350/.351 — country-aware edition label + city-aware counts.
          label: r.michelinSummary.label || null,
          city: r.michelinSummary.city || null,
          cityRemaining: Number.isFinite(r.michelinSummary.cityRemaining) ? r.michelinSummary.cityRemaining : null,
          countryName: r.michelinSummary.countryName || null,
          countryFlag: r.michelinSummary.countryFlag || '',
          // v0.61.445 — other-city Michelin count (walk is now city-scoped).
          nationRemaining: Number.isFinite(r.michelinSummary.nationRemaining) ? r.michelinSummary.nationRemaining : null,
          // v0.62.x — tappable other-city jumps: [{city,count}] + ISO country
          // code so the nudge can re-anchor to George Town etc. (was dead
          // state before — nationRemaining was never rendered).
          otherCities: Array.isArray(r.michelinSummary.otherCities) ? r.michelinSummary.otherCities : null,
          countryCode: r.michelinSummary.countryCode || null
        });
      } else {
        setMichelinRemaining(null);
      }
      // v0.60.154 — push the new page onto the client-side history
      // cache and advance the cursor. If the user had stepped back
      // before triggering this search, the forward branch is truncated
      // (so a search-after-back does not orphan stale future pages).
      // Cap at 17 (normal) / 11 (Michelin) — operator's ~200 / ~130
      // venue targets at 12-per-page slicing.
      const isMichelinPush = (snap.cuisines || []).some((c) => String(c).toLowerCase() === 'michelin');
      const cap = isMichelinPush ? 11 : 17;
      const newPage = {
        venues: r.venues || [],
        comboInfo: r.comboInfo || null,
        misrepNote: (r.misrepresentation && r.misrepresentation.name) ? r.misrepresentation : null,
        cookMethodPivot: (r.cookingMethod && Array.isArray(r.cookingMethod.matches) && r.cookingMethod.matches.length) ? r.cookingMethod : null,
        // v0.61.130 — persist the v0.61.129 O-20/O-23 fields onto the
        // page so Back/Forward re-renders the pill + widened caption
        // that matched the venues shown.
        placeAnchor: (r.placeAnchor && r.placeAnchor.name && Number.isFinite(r.placeAnchor.lat))
          ? { ...r.placeAnchor, queryRemainder: typeof r.placeAnchorQueryRemainder === 'string' ? r.placeAnchorQueryRemainder : '' }
          : null,
        specialModeNotice: r.specialMode && r.specialModeLimited ? r.specialMode : null,
        specialModeWidenedInfo: (r.specialModeWidened && Number.isFinite(r.specialModeFinalRadiusM))
          ? { fromM: r.specialModeWidenedFromM, finalM: r.specialModeFinalRadiusM }
          : null,
        sessionFull: r?.sessionFull === true,
        pageStackDepth: Number.isFinite(r?.pageStackDepth) ? r.pageStackDepth : 0,
        michelinRemaining: (r?.michelinSummary && Number.isFinite(r.michelinSummary.remaining))
          ? { shown: r.michelinSummary.shown || 0, remaining: r.michelinSummary.remaining, total: r.michelinSummary.total || 0 }
          : null,
        exhausted: r?.exhausted === true,
        poolCount: Number.isFinite(r?.poolCount) ? r.poolCount : 0,
        criteriaSnap: stateSig(snap),
        // v0.60.154 — full criteria/freeText/location snapshot so Back
        // restores the chips, ✳️ Michelin loading-hint trigger, copy-all
        // heading, and the next 🔍 round-trip to match the venues being
        // shown (Codex review on PR #395). `snap` is the JSON state at
        // search time; `center` is what the request actually used.
        criteriaState: snap ? JSON.parse(JSON.stringify(snap)) : null,
        freeText: (typeof nlText === 'string') ? nlText : '',
        locationAnchor: locationAnchor ? { ...locationAnchor } : null,
        searchCenter: center ? { lat: center.lat, lng: center.lng } : null,
        isMichelin: isMichelinPush
      };
      setPages((prev) => {
        const truncated = prev.slice(0, cursor + 1);
        const next = [...truncated, newPage];
        return next.length > cap ? next.slice(next.length - cap) : next;
      });
      setCursor((prev) => {
        const after = Math.min(prev + 1, cap - 1);
        // If the previous list was empty (first push of session), cursor
        // was 0 and stays 0; the array length goes from 0 → 1 so cursor
        // 0 is correctly the new tail. The `+1` advance handles every
        // subsequent push.
        return (pages.length === 0 && prev === 0) ? 0 : after;
      });
      // v0.58.14: scroll the result list into view so users don't
      // miss it. Wrapped in a microtask so the new venues render
      // first; smooth scroll keeps the motion gentle.
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      // v0.62.34 — D791 post-search location consistency check (see helper).
      // v0.62.x — pass the SEARCHED center so the helper can skip re-pushing a
      // drifted anchor (the AU›Canberra reset).
      reassertPickAfterSearch(snap, center);
    } catch (err) {
      // v0.62.x — 🛑 Stop loading: a user-aborted stream is not an error.
      // Keep whatever base/patched venues already streamed in; just stop.
      if (err && (err.name === 'AbortError' || searchAbort.signal.aborted)) {
        return;
      }
      setError(err.message); setVenues([]); setMisrepNote(null); setCookMethodPivot(null); setQuestionDeclined(false);
      // v0.61.130 — clear the v0.61.129 pills on error so a stale
      // "📍 Searching near Tiong Bahru" doesn't sit above an empty
      // result list after a network blip.
      setPlaceAnchor(null); setSpecialModeNotice(null); setSpecialModeWidenedInfo(null);
    } finally { setLoading(false); }
  }

  // v0.58.5: Tell Gia composability.
  //   mode 'merge'   (default) — union cuisines (de-duped, cap 5) and
  //                              OR-on filters; user keeps anything
  //                              they had toggled. Halal=ON + Thai
  //                              and "spicy japanese" → Halal + Thai
  //                              + Japanese + spicy.
  //   mode 'replace'           — wipe state, then apply only the
  //                              parsed result. Used by the
  //                              "Replace instead" ghost link in
  //                              FlipPanel after a merge submit.
  async function handleNLSubmit(text, opts = {}) {
    const mode = opts.mode === 'replace' ? 'replace' : 'merge';
    setLastPrompt(text); setLoading(true); setError(null);
    try {
      const r = await nlQuery({
        text, lat: userLoc?.lat, lng: userLoc?.lng,
        filters: state.filters, lang,
        // v0.61.271 — forward region + countryCode so NL queries
        // respect the user's location context (Phase 3 audit A5/D1).
        // v0.61.273 — omit region when the first-paint sentinel is
        // still in place so the server resolves from cache/coords.
        region: (state.region && state.region !== '__NONE__') ? state.region : undefined,
        countryCode: (state.region === 'OTHER' || state.region === 'MY-PUT') ? state.countryPref : undefined
      });
      setVenues(r.venues || []);
      setNoProvenNew(!!r.noProvenNew);   // v0.62.205 — "no new nearby" banner flag
      setCuisinePlate(r.cuisinePlate || null);   // v0.62.x — clear/refresh the cuisine plate on NL queries too
      setComboInfo(null);  // v0.60.82 — NL query bypasses the AND/OR combo logic
      setFirstLoadPending(false);
      // v0.62.34 — D791 post-search location consistency check (the
      // Tell-me path displays results too — same re-assert applies).
      reassertPickAfterSearch(state);
      let nextState;
      if (mode === 'replace') {
        nextState = { ...defaultState(), region: state.region, cuisines: [], filters: clearedFilters() };
      } else {
        nextState = { ...state };
      }
      if (r.inferredCuisines?.length) {
        if (mode === 'replace') {
          nextState.cuisines = r.inferredCuisines.slice(0, 5);
        } else {
          const merged = [...(nextState.cuisines || []), ...r.inferredCuisines];
          nextState.cuisines = [...new Set(merged)].slice(0, 5);
        }
      }
      if (r.inferredFilters) {
        if (mode === 'replace') {
          // Replace: take inferred verbatim, including explicit falsy keys.
          nextState.filters = { ...nextState.filters, ...r.inferredFilters };
        } else {
          // Merge: only OR-on. inferredFilters[k] === false means "the
          // LLM didn't infer this", not "turn it off" — preserve the
          // user's existing value so a Halal=ON default doesn't get
          // wiped by a query that doesn't mention halal.
          const m = { ...nextState.filters };
          for (const k of Object.keys(r.inferredFilters)) {
            if (k === 'prices') {
              const inferredPrices = Array.isArray(r.inferredFilters.prices) ? r.inferredFilters.prices : [];
              m.prices = [...new Set([...(m.prices || []), ...inferredPrices])];
            } else if (r.inferredFilters[k] === true) {
              m[k] = true;
            }
          }
          nextState.filters = m;
        }
      }
      setState(nextState);
      // v0.61.108 — operator: keep the typed free-text dish as a search
      // criterion alongside the inferred cuisine chip. It used to vanish
      // (only the inferred cuisine showed) — now nlText holds it, so it
      // stays visible in the Search-criteria builder and is sent as the
      // `freeText` qualifier on the next runSearch.
      setNlText(text);
      setLastRunSnap(stateSig(nextState));
      setWarmStartSeed(null);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  function handleNLReplace() {
    if (!lastPrompt) return;
    handleNLSubmit(lastPrompt, { mode: 'replace' });
  }

  function clearAll() {
    // v0.57.24: clearedFilters() turns ALL toggles off (defaultState
    // keeps newlyOpened: true and (since v0.58.1) halal: true as
    // first-load biases, which made Clear appear to do nothing).
    // v0.59.18: drop the implicit runSearch — the user runs the next
    // search explicitly via 🔍 Search / Tell-Me / FAB. Matches the
    // auto-search-removal pattern from the same release.
    const fresh = { ...defaultState(), cuisines: [], filters: clearedFilters() };
    setState(fresh);
  }

  function removeCuisine(slug) {
    setState((s) => ({ ...s, cuisines: (s.cuisines || []).filter((c) => c !== slug) }));
  }

  function removeFilter(key) {
    setState((s) => {
      if (key.startsWith('price:')) {
        const p = key.slice('price:'.length);
        return { ...s, filters: { ...s.filters, prices: (s.filters.prices || []).filter((x) => x !== p) } };
      }
      return { ...s, filters: { ...s.filters, [key]: false } };
    });
  }

  const dirty = lastRunSnap !== null && stateSig(state) !== lastRunSnap;

  // v0.61.50 — user-initiated search trigger. Picks the loading-overlay
  // message variant before firing the search: 'refresh' when a prior
  // search exists and the criteria are unchanged, 'rotating' otherwise.
  // Wired to the floating 🔍 FAB, the big "🔍 Search · Show me places
  // to eat" button, and the location-field's own 🔍 button.
  function triggerSearch() {
    // v0.62.135 — firing a search collapses the mode-tap reveal panel; the
    // Location + Local-food-picks fields fold back into the floating header
    // (still reachable by scrolling to the top).
    setModePeek(false);
    // v0.62.176 — operator: once the user types/commits a location the
    // glassmorphism location-editor box hides away (region pills re-collapse).
    setRegionExpanded(false);
    setClassicOpen(false);
    setCuisinePickOpen(false);   // v0.62.195 — close the cuisine picker overlay on search
    // v0.62.180 — a committed search means there's now a "last search area".
    setLocChanged(true);
    // v0.62.249 — (removed the redundant setCriteriaOpen(false); the old sheet is gone.)
    setLoadingReason(lastRunSnap !== null && !dirty ? 'refresh' : 'rotating');
    // v0.61.354 — if a city is previewed, 🔍 COMMITS it as the active search
    // location (and searches there). Reuse onLocationSelect WITHOUT cityPreview
    // so the full commit runs (anchor + searchCenter + region + server persist).
    // v0.62.x — operator bug: changing the city then tapping 🔍 still searched
    // the PREVIOUS location. Root cause: v0.62.183 made onLocationSelect
    // no-auto-fire, so this branch committed the new anchor then `return`ed
    // WITHOUT searching. 🔍 is an explicit fire, so run the search here at the
    // just-committed city — passing the anchor EXPLICITLY to dodge the stale-
    // state race (v0.61.237 lesson; onLocationSelect's setState hasn't flushed).
    if (selectedCityLocation && Number.isFinite(selectedCityLocation.lat) && Number.isFinite(selectedCityLocation.lng)) {
      const sc = selectedCityLocation;
      setSelectedCityLocation(null);
      const capM = (Number.isFinite(sc.radiusCapM) && sc.radiusCapM > 0) ? { radiusCapM: sc.radiusCapM } : {};
      onLocationSelect({ lat: sc.lat, lng: sc.lng, label: sc.name || '', ...capM });
      runSearch(state, { lat: sc.lat, lng: sc.lng, name: sc.name || '', ...capM });
      return;
    }
    runSearch(state);
  }
  // v0.60.166 — v0.60.165 added petFriendly to QUICK_FILTERS + state
  // but forgot to extend `filterCount`: toggling only 🐾 left
  // filterCount=0 → canClear=false → Clear button didn't render at
  // all, so the chip couldn't be cleared via the standard control
  // (operator: "'Pet allowed' doesn't wire to invokes the Clear
  // button"). Tallied here like every other quick-filter flag.
  const filterCount = (state.filters.newlyOpened ? 1 : 0) + (state.filters.openNow ? 1 : 0)
    + (state.filters.halal ? 1 : 0)
    + (state.filters.vegetarian ? 1 : 0) + (state.filters.homeBased ? 1 : 0)
    + (state.filters.recommend ? 1 : 0)   // v0.62.37 — ⭐ Recommend (the v0.60.166 lesson)
    + (state.filters.petFriendly ? 1 : 0)
    + (state.filters.prices?.length || 0);
  const canClear = state.cuisines.length > 0 || filterCount > 0;

  // v0.60.80 — operator 2026-05-10: replace the meaningless "1c · 0f"
  // count badge with a one-size-smaller line showing the actually-
  // selected criteria so the user sees what's filtering the search
  // without expanding the panel. Order: cuisines → toggle filters →
  // price levels — matches selection order in the UI.
  const criteriaSummary = (() => {
    const items = [];
    for (const slug of state.cuisines || []) {
      items.push(slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }
    if (state.filters?.openNow)     items.push(t('filter.openNow', lang));
    if (state.filters?.halal)       items.push(t('filter.halal', lang));
    if (state.filters?.vegetarian)  items.push(t('filter.vegetarian', lang));
    if (state.filters?.recommend)   items.push(t('filter.recommend', lang));  // v0.62.37
    if (state.filters?.homeBased)   items.push(t('filter.homeBased', lang));
    if (state.filters?.newlyOpened) items.push(t('filter.newlyOpened', lang));
    // v0.60.166 — petFriendly missing from the v0.60.165 criteria
    // preview list. Tallied + labelled alongside the other quick
    // filters so the header's "Search criteria · X • Y" line includes
    // "Pet allowed" when the 🐾 chip is on.
    if (state.filters?.petFriendly) items.push(t('filter.petFriendly', lang));
    for (const p of state.filters?.prices || []) items.push(p);
    return items;
  })();

  // v0.62.673 — footer-centre Michelin pagination (operator instruction:
  // instr/GIA_Michelin_Footer_Pagination_AI_Prompt.md). "Michelin mode" is
  // derived the same way ~10 other call sites in this file already check
  // it (e.g. :2948, :4409) — no new canonical flag, per the instruction's
  // "use the repository's existing Michelin-mode detection" rule.
  const isMichelinMode = (state.cuisines || []).some((c) => String(c).toLowerCase() === 'michelin');
  // v0.62.674 — operator (device screenshot): the pager's denominator was
  // `pages.length` (batches actually FETCHED), which by definition always
  // equals the numerator at the cache tip ("1/1", "2/2", …) — never a real
  // remaining count. `michelinRemaining.total` (already sent on every search
  // response, see App.jsx ~:2967) is the server's own count of Michelin
  // Star/Bib Gourmand venues matching the current criteria; dividing by the
  // 12-per-batch size ResultPanel.jsx's PAGE_SIZE already uses for this exact
  // batch concept gives the true total page count. `Math.max` with
  // `pages.length` is just a defensive floor (never show fewer pages than
  // already fetched, in case the estimate and the real cache ever disagree).
  const michelinTotalPages = (isMichelinMode && michelinRemaining?.total)
    ? Math.max(pages.length, Math.ceil(michelinRemaining.total / 9))
    : pages.length;

  // v0.61.29 — LocationField pick handler, hoisted to a named callback
  // so the field can render in the banner slot above the map instead
  // of inside the collapsed Search-criteria section.
  // v0.62.97 — operator: a 📍 Current button that sets the anchor to the LIVE
  // device location (not the cached anchor), identical for free-chat and the
  // Telegram device. navigator.geolocation is the common path in both runtimes
  // (the Telegram WebView proxies it to the device GPS), so a single code path
  // serves both. maximumAge:0 forces a fresh fix (never the cached position).
  // Per operator: set + fly only — the user taps 🔍 to search (parity with the
  // SG/JB/Cities pills).
  const pickCurrentLocation = React.useCallback(async () => {
    explicitPickRef.current = true;
    // v0.62.145 — 📍 Current must RESOLVE to a real place name (reverse-geocode),
    // not anchor under the literal word "Current".
    const commit = (latitude, longitude) => {
      const c = (label) => onLocationSelect({ lat: latitude, lng: longitude, label, fly: true, noAutoFire: true });
      reverseGeocode({ lat: latitude, lng: longitude })
        .then((r) => c((r?.name || '').trim() || t('region.current', lang)))
        .catch(() => c(t('region.current', lang)));
    };
    // v0.62.x — operator (urgent): prefer Telegram's native LocationManager
    // (Bot API 8.0). This is a user gesture, so it's the ideal place to trigger
    // Telegram's own permission flow — far more reliable than the webview's
    // navigator.geolocation, which often drops a first-launch "Allow Once".
    try {
      const tgLoc = await getTelegramLocation();
      if (tgLoc && Number.isFinite(tgLoc.lat) && Number.isFinite(tgLoc.lng)) {
        commit(tgLoc.lat, tgLoc.lng);
        return;
      }
    } catch { /* fall through */ }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // No native + no browser geolocation: on a Telegram 8.0 client, point the
      // user at the native settings (gesture-allowed); else show the error.
      if (!openTelegramLocationSettings()) setLocMoveNote({ text: t('region.current.error', lang) });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocMoveNote({ text: t('region.current.error', lang) });
          return;
        }
        commit(latitude, longitude);
      },
      () => {
        // Browser denied: on Telegram 8.0 offer the native settings (this is a
        // gesture), else surface the error.
        if (!openTelegramLocationSettings()) setLocMoveNote({ text: t('region.current.error', lang) });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
  }, [lang]);

  // v0.62.x — operator: LONG-PRESS the map to drop a pin → set location. Resolve
  // the pressed point to a real place name (reverse-geocode), commit it as the
  // anchor + fly there, but DON'T auto-search (parity with the pills — user taps
  // 🔍). Mirrors pickCurrentLocation, anchored at the pressed coords.
  const handleMapLongPress = React.useCallback(({ lat, lng }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    explicitPickRef.current = true;
    const commit = (label) => onLocationSelect({ lat, lng, label, fly: true, noAutoFire: true });
    reverseGeocode({ lat, lng })
      .then((r) => commit((r?.name || '').trim() || t('region.current', lang)))
      .catch(() => commit(t('region.current', lang)));
  }, [lang]);

  function onLocationSelect(p) {
    if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) {
      // v0.62.33 — operator: "i switch from putrajaya to Hanoi, the what to
      // try here is still the old dishes … the card should be wipe clean."
      // Wipe the Arrival Plate SYNCHRONOUSLY on every pick — the old city's
      // card must never linger while a switch is in flight. The persist
      // response (.then below) re-fills it when the new city is curated;
      // a failed/missed persist now leaves the card EMPTY, not stale.
      setArrivalPlate(null);
      setCuisinePlate(null);   // v0.62.x — wipe the cuisine plate on a pick too
      // v0.61.354 — a city change from the OTHER dropdown is a PREVIEW:
      // set selectedCityLocation + fly the map there, but DON'T commit the
      // search anchor (positive control). The search re-anchors only on 🔍
      // (triggerSearch commits) or is cancelled by ↩ Back to last search area.
      if (p.cityPreview) {
        setSelectedCityLocation({ lat: p.lat, lng: p.lng, name: p.label || '',
          ...(Number.isFinite(p.radiusCapM) && p.radiusCapM > 0 ? { radiusCapM: p.radiusCapM } : {}) });
        // v0.61.358 — debounce the fly (350 ms): rapid switches only fly to the last.
        if (cityFlyDebounceRef.current) clearTimeout(cityFlyDebounceRef.current);
        cityFlyDebounceRef.current = setTimeout(() => {
          setFlyTarget({ lat: p.lat, lng: p.lng, zoom: 13, _k: Date.now() });
          // v0.62.13 — operator: a city PICK must PERSIST to the Telegram chat
          // (location drawer + "Search area set to …" notify) so it stops
          // drifting back to "set location". Fire it on the SAME debounce as
          // the fly, so rapid city-flips only persist the final city. This stays
          // a PREVIEW: it does NOT commit the search anchor (explicitPickRef
          // stays false) and does NOT auto-search — the user taps 🔍 to search
          // (respects the no-auto-fire + v0.61.354 preview rules).
          if ((p.label || '').trim()) {
            const c = coordsToCountry({ lat: p.lat, lng: p.lng });
            let persistRegion;
            if (c === 'SG') persistRegion = 'SG';
            else if (c === 'MY') persistRegion = isJbCoords({ lat: p.lat, lng: p.lng }) ? 'JB' : 'OTHER';
            else persistRegion = (state.region && state.region !== '__NONE__') ? state.region : 'OTHER';
            const persistCountry = persistRegion === 'OTHER' ? (state.countryPref || undefined) : undefined;
            saveUserLocation({
              lat: p.lat, lng: p.lng, label: p.label, notify: true,
              region: persistRegion, country: persistCountry,
              ...(Number.isFinite(p.radiusCapM) && p.radiusCapM > 0 ? { radiusCapM: p.radiusCapM } : {})
            }).then((resp) => {
              // v0.62.32 — Arrival Plate rides the persist response.
              setArrivalPlate(resp?.plate || null);
            }).catch(() => {});
          }
        }, 350);
        return;
      }
      // v0.61.438 — code review F2: a COMMITTED pick (autocomplete, map,
      // country-capital commit, JB focus point — anything past the
      // preview early-return) is a genuine user gesture: latch
      // "explicit pick wins" HERE, not from the resulting region.
      explicitPickRef.current = true;
      // v0.61.237 — operator: city / precinct picks in the OTHER
      // cascade weren't auto-refreshing the result list ("the google
      // didn't set the location and search based on the new set
      // location"). v0.60.166 disabled auto-fire because of a state
      // race against the stale anchor; the fix is to pass the new
      // anchor to runSearch EXPLICITLY (the `anchor` arg, not via
      // state) so it doesn't matter when React commits the update.
      // v0.61.328 — OTHER-mode geofence Step 1: carry the picked
      // city's radius cap (40 km / 120 km Johor) on the anchor so a
      // subsequent search can read it. Only OTHER city picks supply
      // radiusCapM; SG/JB/autocomplete picks omit it (unchanged).
      setLocationAnchor({ lat: p.lat, lng: p.lng, name: p.label || '',
        ...(Number.isFinite(p.radiusCapM) && p.radiusCapM > 0 ? { radiusCapM: p.radiusCapM } : {}) });
      // v0.60.170 — also setSearchCenter on pick, so the map re-renders
      // at the picked place and the Search button (runSearch(state),
      // no explicit anchor) doesn't fall back to the stale searchCenter.
      setSearchCenter({ lat: p.lat, lng: p.lng });
      // v0.61.422 — `fly` (a deliberate country-change capital commit): MapPanel
      // only pans on flyTo, so a searchCenter change won't move the map. Pan
      // explicitly. (Other committed picks omit `fly` → behaviour unchanged.)
      if (p.fly) {
        setFlyTarget({ lat: p.lat, lng: p.lng, zoom: 12, _k: Date.now() });
      }
      // v0.61.311 — operator (01-06 '26) screenshot: picking
      // "Taman Melodies" (a JB suburb, lat 1.4912 / lng 103.7665)
      // while on the SG region pill left the 🇸🇬 flag in place even
      // though the map + server agreed on JB. Root cause: this
      // handler updated `locationAnchor` + `searchCenter` but never
      // touched `state.region`. The v0.61.186 visibility-refresh
      // (lines 798-833) DID flip region from the server's response —
      // but only on viewport flip, so the pill stayed stale until
      // the user switched away and back. Flip region synchronously
      // here based on the picked coords, mirroring the visibility-
      // refresh logic.
      //
      // `noSyncRegion` opt-out: callers like the JB focus-point
      // chips already know their region; passing `noSyncRegion: true`
      // skips the flip so we don't ping-pong region state during
      // chip-driven anchor moves inside JB.
      if (!p.noSyncRegion) {
        const c = coordsToCountry({ lat: p.lat, lng: p.lng });
        if (c === 'SG') {
          // v0.62.97 — remember this SG anchor so the 🇸🇬 pill can restore it
          // later (the Merlion fallback is itself an SG coord, so it persists
          // too — acceptable: it just becomes the remembered SG spot).
          lastSgAnchorRef.current = { lat: p.lat, lng: p.lng, name: p.label || '' };
          try { localStorage.setItem('gia.lastSgAnchor', JSON.stringify(lastSgAnchorRef.current)); } catch { /* private mode */ }
          setState((s) => (s.region === 'SG' ? s : { ...s, region: 'SG' }));
        } else if (c === 'MY') {
          const target = isJbCoords({ lat: p.lat, lng: p.lng }) ? 'JB' : 'OTHER';
          setState((s) => {
            if (s.region === target) return s;
            const next = { ...s, region: target };
            if (target === 'OTHER') next.countryPref = 'MY';
            return next;
          });
        }
        // c === null → unknown coverage (e.g. user picked Bangkok).
        // Leave region untouched so OTHER + countryPref persist.
      }
      // An explicit pick (not a "× clear", which sends an empty label)
      // also updates the bot's /location cache so it sticks across
      // sessions and in chat.
      // v0.61.270 — Phase 2 SSOT: forward the full payload to
      // /api/cuisine/set-location (route v0.61.270 brings it to
      // parity with /api/menu/set-location). The Menu TMA will now
      // see the cuisine pick's label/region/country on its next
      // /api/cuisine/user-location read. The state.region tag is
      // passed through so chat /location and the Menu TMA pick up
      // the cuisine-side region flip too.
      // v0.61.311 — prefer the coords-inferred region over the
      // possibly-stale state.region so the bot's set-location gets
      // the right tag on a cross-country jump's FIRST pick (not just
      // after the visibility-refresh round-trip).
      if ((p.label || '').trim()) {
        let inferredRegion;
        if (!p.noSyncRegion) {
          const c = coordsToCountry({ lat: p.lat, lng: p.lng });
          if (c === 'SG') inferredRegion = 'SG';
          else if (c === 'MY') inferredRegion = isJbCoords({ lat: p.lat, lng: p.lng }) ? 'JB' : 'OTHER';
        }
        const persistRegion = inferredRegion
          || ((state.region && state.region !== '__NONE__') ? state.region : undefined);
        const persistCountry = (inferredRegion === 'OTHER' || (state.region === 'OTHER' && state.countryPref))
          ? (inferredRegion === 'OTHER' ? 'MY' : state.countryPref)
          : undefined;
        saveUserLocation({
          lat: p.lat,
          lng: p.lng,
          label: p.label,
          // v0.61.412 — this is the DELIBERATE user-pick path (LocationField /
          // map / country+city), so the server fires the "Search area set to …"
          // chat message. The boot / auto-detect saveUserLocation calls omit
          // this flag, so they stay silent.
          // v0.61.422 — the country-change auto-commit passes `silent` (it
          // persists the capital so searches work, but shouldn't fire a chat
          // message just for browsing countries — only a real city pick / search does).
          notify: !p.silent,
          // v0.61.273 — don't persist the first-paint '__NONE__'
          // sentinel; only forward a resolved region.
          region: persistRegion,
          country: persistCountry,
          // v0.61.328 — persist the OTHER per-city radius cap so the
          // server's /api/cuisine/search clamps the search radius to it
          // (40 km curated cities / 120 km Johor). Only present on OTHER
          // city picks; SG/JB picks pass nothing here, so their stored
          // anchor stays cap-free and their radius logic is unchanged.
          ...(Number.isFinite(p.radiusCapM) && p.radiusCapM > 0 ? { radiusCapM: p.radiusCapM } : {})
        }).then((resp) => {
          // v0.62.32 — Arrival Plate rides the persist response.
          setArrivalPlate(resp?.plate || null);
        }).catch(() => {});
      }
      // v0.62.183 — operator (emphatic + repeated): a LOCATION pick must NEVER
      // auto-fire a search. It sets the anchor only; the user taps 🔍 to search.
      // This removes the v0.61.237 auto-fire (which still fired on SG/JB
      // autocomplete + free-text picks) — the most-thrashed policy, now settled on
      // the operator's explicit no-auto-fire rule. A pick still flashes the 🔍 FAB
      // (searchHintActive) so the next step is obvious.
      if ((p.label || '').trim()) {
        setSearchHintActive(true);
        setTimeout(() => setSearchHintActive(false), 5000);
      }
    } else {
      setLocationAnchor(null);
    }
  }

  // v0.58.17 (Tier 1 responsive): widened max-w from 640 → 1024 and
  // added breakpoint padding so the TMA stops looking like a narrow
  // column on iPad / Samsung tablet / desktop Telegram. Phone layout
  // (≤640 px) is unchanged; >640 px viewports get progressively more
  // breathing room. Subsequent tiers can lean further into md:/lg:
  // variants for grid columns, side-by-side map+results, etc.
  // v0.60.49 — bumped 1024 → 1280 in lock-step with #root cap in
  // styles.css so wide windows actually use the extra width.

  // v0.61.322 — the three coherence-modal blocks, extracted into a single
  // fragment so both the splash-gate early-return AND the main return can
  // render them. Operator-confirmed FULL SPLASH GATE: until the location is
  // confirmed, the user sees ONLY the "Confirming your location…" splash
  // (+ any mismatch modal that needs a choice) — never a half-loaded TMA
  // sitting under the modal.
  const locationModals = (
    <>
      {/* v0.61.274 — location coherence modal (audit "first-paint
          incoherent location set vs saved"). Renders when the saved
          countryPref disagrees with the GPS-derived country. Two
          buttons: Use {coords} / Keep {saved}. Sticky until user
          picks one. */}
      {coherenceMismatch && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gia-dlg-coherence-title"
        >
          <div ref={coherenceDialogRef} className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 id="gia-dlg-coherence-title" className="text-sm font-semibold flex-1">
                {lang === 'fr' ? 'Conflit de localisation' : lang === 'id' ? 'Lokasi tidak cocok' : lang === 'ru' ? 'Несовпадение местоположения' : lang === 'de' ? 'Standortkonflikt' : lang === 'zh' ? '位置不一致' : lang === 'ja' ? '位置の不一致' : lang === 'es' ? 'Ubicacion no coincide' : 'Location mismatch'}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text">
              {lang === 'fr'
                ? `Vous aviez choisi ${coherenceMismatch.saved} précédemment, mais votre appareil est actuellement en ${coherenceMismatch.coords === 'SG' ? 'Singapour' : 'Malaisie'}.`
                : lang === 'ru'
                ? `Ранее вы выбрали ${coherenceMismatch.saved}, но сейчас ваше устройство в ${coherenceMismatch.coords === 'SG' ? 'Сингапуре' : 'Малайзии'}.`
                : lang === 'de'
                ? `Sie hatten zuvor ${coherenceMismatch.saved} gewählt, aber Ihr Gerät ist jetzt in ${coherenceMismatch.coords === 'SG' ? 'Singapur' : 'Malaysia'}.`
                : lang === 'zh'
                ? `您之前将位置设为 ${coherenceMismatch.saved}，但您的设备现在位于 ${coherenceMismatch.coords === 'SG' ? '新加坡' : '马来西亚'}。`
                : lang === 'ja'
                ? `以前に位置を ${coherenceMismatch.saved} に設定しましたが、デバイスは現在 ${coherenceMismatch.coords === 'SG' ? 'シンガポール' : 'マレーシア'} にあります。`
                : lang === 'es'
                ? `Antes fijaste tu ubicacion en ${coherenceMismatch.saved}, pero tu dispositivo esta ahora en ${coherenceMismatch.coords === 'SG' ? 'Singapur' : 'Malasia'}.`
                : `You set your location to ${coherenceMismatch.saved} previously, but your device is now in ${coherenceMismatch.coords === 'SG' ? 'Singapore' : 'Malaysia'}.`}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => applyCoherenceChoice(true)}
                className="w-full px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text text-sm font-semibold"
              >
                {lang === 'fr'
                  ? `Utiliser ${coherenceMismatch.coords === 'SG' ? 'Singapour' : 'Malaisie'}`
                  : lang === 'ru'
                  ? `Использовать ${coherenceMismatch.coords === 'SG' ? 'Сингапур' : 'Малайзию'}`
                  : lang === 'de'
                  ? `${coherenceMismatch.coords === 'SG' ? 'Singapur' : 'Malaysia'} verwenden`
                  : lang === 'zh'
                  ? `使用 ${coherenceMismatch.coords === 'SG' ? '新加坡' : '马来西亚'}`
                  : lang === 'ja'
                  ? `${coherenceMismatch.coords === 'SG' ? 'シンガポール' : 'マレーシア'} を使う`
                  : lang === 'es'
                  ? `Usar ${coherenceMismatch.coords === 'SG' ? 'Singapur' : 'Malasia'}`
                  : `Use ${coherenceMismatch.coords === 'SG' ? 'Singapore' : 'Malaysia'}`}
              </button>
              <button
                type="button"
                onClick={() => applyCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm"
              >
                {lang === 'fr'
                  ? `Garder ${coherenceMismatch.saved}`
                  : lang === 'ru'
                  ? `Оставить ${coherenceMismatch.saved}`
                  : lang === 'de'
                  ? `${coherenceMismatch.saved} behalten`
                  : lang === 'zh'
                  ? `保留 ${coherenceMismatch.saved}`
                  : lang === 'ja'
                  ? `${coherenceMismatch.saved} を保持`
                  : lang === 'es'
                  ? `Mantener ${coherenceMismatch.saved}`
                  : `Keep ${coherenceMismatch.saved}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* v0.61.276 — region-coords coherence modal (sibling of the
          v0.61.274 country-coords modal). Fires when state.region
          is 'JB' but coords are not inside the Johor extent — i.e.
          the JB pill is sticky from a prior session and would
          silently return 0 results from the JB-hybrid-filter. */}
      {regionMismatch && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gia-dlg-region-title"
        >
          <div ref={regionDialogRef} className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 id="gia-dlg-region-title" className="text-sm font-semibold flex-1">
                {lang === 'fr' ? 'Conflit de région' : lang === 'id' ? 'Wilayah tidak cocok' : lang === 'ru' ? 'Несовпадение региона' : lang === 'de' ? 'Regionskonflikt' : lang === 'zh' ? '区域不一致' : lang === 'ja' ? '地域の不一致' : lang === 'es' ? 'Region no coincide' : 'Region mismatch'}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text">
              {lang === 'fr'
                ? "La région Johor Bahru est sélectionnée, mais vous n'êtes pas à Johor. Les résultats de cuisine seront filtrés à vide."
                : lang === 'ru'
                ? 'Выбран регион Джохор-Бару, но вы не в Джохоре — результаты по кухне окажутся пустыми.'
                : lang === 'de'
                ? 'Region Johor Bahru ist gewählt, aber Sie sind nicht in Johor — die Küchen-Ergebnisse werden leer gefiltert.'
                : lang === 'zh'
                ? '已选择新山区域，但您不在柔佛 — 美食结果将被筛选为空。'
                : lang === 'ja'
                ? '新山（JB）地域が選択されていますが、ジョホールにいません — 料理の結果は空になります。'
                : lang === 'es'
                ? 'La region de Johor Bahru esta seleccionada, pero no estas en Johor — los resultados quedaran vacios.'
                : "Johor Bahru region is selected, but you're not in Johor — cuisine results will filter to empty."}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => applyRegionCoherenceChoice(true)}
                className="w-full px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text text-sm font-semibold"
              >
                {lang === 'fr'
                  ? (regionMismatch.coordsCountry === 'SG' ? 'Passer à Singapour' : 'Passer à Autres')
                  : lang === 'ru'
                  ? (regionMismatch.coordsCountry === 'SG' ? 'Перейти к Сингапуру' : 'Перейти к другим')
                  : lang === 'de'
                  ? (regionMismatch.coordsCountry === 'SG' ? 'Zu Singapur wechseln' : 'Zu Andere wechseln')
                  : lang === 'zh'
                  ? (regionMismatch.coordsCountry === 'SG' ? '切换到新加坡' : '切换到其他')
                  : lang === 'ja'
                  ? (regionMismatch.coordsCountry === 'SG' ? 'シンガポールに切替' : 'その他に切替')
                  : lang === 'es'
                  ? (regionMismatch.coordsCountry === 'SG' ? 'Cambiar a Singapur' : 'Cambiar a Otros')
                  : (regionMismatch.coordsCountry === 'SG' ? 'Switch to Singapore' : 'Switch to Others')}
              </button>
              <button
                type="button"
                onClick={() => applyRegionCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm"
              >
                {lang === 'fr' ? 'Rester sur JB' : lang === 'id' ? 'Tetap di JB' : lang === 'ru' ? 'Остаться в JB' : lang === 'de' ? 'Bei JB bleiben' : lang === 'zh' ? '留在新山' : lang === 'ja' ? 'JBのまま' : lang === 'es' ? 'Seguir en JB' : 'Stay on JB'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* v0.61.321 — anchor/device coherence modal. Fires once on mount
          when the saved locationAnchor sits >150 km from the device — the
          "Naka Ward (Japan) with a 🇸🇬 flag" stale-cache case. Lets the
          user use their real current location or keep the saved spot. */}
      {/* v0.61.404 — post-mismatch move toast: narrow, bottom-anchored,
          non-blocking; narrates "moved to …" (auto-loads after a 1 s pause) or
          "kept … — tap 🔍" (stopped, no auto-load). Tap to dismiss; auto-hides
          after 7 s. */}
      {locMoveNote && (
        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
          <button
            type="button"
            onClick={() => setLocMoveNote(null)}
            className="pointer-events-auto max-w-sm rounded-2xl border border-tg-warn/40 bg-tg-card/95 px-3 py-2 text-left text-[12px] leading-snug text-tg-text shadow-lg backdrop-blur"
          >
            {locMoveNote.text}
          </button>
        </div>
      )}
      {/* v0.62.x — rating pop-ups (operator's amended copy): 'reset' on entry
          / ≥2 min idle-return ("Rating reset: Good+ ≥ 3.7⭐ — Showing eateries
          with generally good Google ratings."), 'intro' first time on this
          device ("Rating set to … Change it anytime …"), 'saved' after Save
          ("Search rating updated"). Sits a step above the locMoveNote slot so
          the two never overlap. Tap to dismiss; auto-hides after 7 s.
          v0.62.x — on RELAUNCH the reset/intro copy is shown INSIDE the initial
          loading overlay (below "Please wait…"), so suppress this toast while
          that overlay is up to avoid the duplicate.
          v0.62.96 — and once the overlay has shown it, never repeat it as a
          toast after the overlay closes (`reminderShownInOverlay`). */}
      {ratingReminder && !reminderShownInOverlay && !(loading && !funFact && loadingReason !== 'rotating' && loadingReason !== 'refresh' && ratingReminder.kind !== 'saved') && (
        <div className="pointer-events-none fixed inset-x-0 bottom-14 z-50 flex justify-center px-3">
          <button
            type="button"
            onClick={() => setRatingReminder(null)}
            className="pointer-events-auto max-w-sm rounded-2xl border border-tg-accent/40 bg-tg-card/95 px-3 py-2 text-left text-[12px] leading-snug text-tg-text shadow-lg backdrop-blur"
          >
            {ratingReminder.kind === 'saved' ? (
              t('rating.savedToast', lang)
            ) : (
              <>
                <div className="font-semibold">
                  {t(ratingReminder.kind === 'intro' ? 'rating.introTitle' : 'rating.resetTitle', lang)}
                </div>
                <div className="mt-0.5 text-tg-hint">
                  {t(ratingReminder.kind === 'intro' ? 'rating.introBody' : 'rating.resetBody', lang)}
                </div>
              </>
            )}
          </button>
        </div>
      )}
      {anchorMismatch && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gia-dlg-anchor-title"
        >
          <div ref={anchorDialogRef} className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 id="gia-dlg-anchor-title" className="text-sm font-semibold flex-1">
                {lang === 'fr' ? 'Conflit de localisation' : lang === 'id' ? 'Lokasi tidak cocok' : lang === 'ru' ? 'Несовпадение местоположения' : lang === 'de' ? 'Standortkonflikt' : lang === 'zh' ? '位置不一致' : lang === 'ja' ? '位置の不一致' : lang === 'es' ? 'Ubicacion no coincide' : 'Location mismatch'}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text break-words">
              {lang === 'fr'
                ? `Votre lieu enregistré est ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}, mais vous semblez vous trouver à ${anchorMismatch.deviceLabel}.`
                : lang === 'ru'
                ? `Сохранённое место — ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}, но вы, похоже, находитесь в ${anchorMismatch.deviceLabel}.`
                : lang === 'de'
                ? `Ihr gespeicherter Ort ist ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}, aber Sie scheinen in ${anchorMismatch.deviceLabel} zu sein.`
                : lang === 'zh'
                ? `您保存的地点是 ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}，但您似乎位于 ${anchorMismatch.deviceLabel}。`
                : lang === 'ja'
                ? `保存された地点は ${anchorMismatch.anchorLabel || anchorMismatch.anchorName} ですが、現在地は ${anchorMismatch.deviceLabel} のようです。`
                : lang === 'es'
                ? `Tu lugar guardado es ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}, pero pareces estar en ${anchorMismatch.deviceLabel}.`
                : `Your saved spot is ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}, but you appear to be at ${anchorMismatch.deviceLabel}.`}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => applyAnchorCoherenceChoice(true)}
                className="w-full px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text text-sm font-semibold break-words line-clamp-2"
              >
                {lang === 'fr' ? `Utiliser ${anchorMismatch.deviceLabel}` : lang === 'id' ? `Pakai ${anchorMismatch.deviceLabel}` : lang === 'ru' ? `Использовать ${anchorMismatch.deviceLabel}` : lang === 'de' ? `${anchorMismatch.deviceLabel} verwenden` : lang === 'zh' ? `使用 ${anchorMismatch.deviceLabel}` : lang === 'ja' ? `${anchorMismatch.deviceLabel} を使う` : lang === 'es' ? `Usar ${anchorMismatch.deviceLabel}` : `Use ${anchorMismatch.deviceLabel}`}
              </button>
              <button
                type="button"
                onClick={() => applyAnchorCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm break-words line-clamp-2"
              >
                {lang === 'fr' ? `Garder ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}` : lang === 'id' ? `Simpan ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}` : lang === 'ru' ? `Оставить ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}` : lang === 'de' ? `${anchorMismatch.anchorLabel || anchorMismatch.anchorName} behalten` : lang === 'zh' ? `保留 ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}` : lang === 'ja' ? `${anchorMismatch.anchorLabel || anchorMismatch.anchorName} を保持` : lang === 'es' ? `Mantener ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}` : `Keep ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // v0.61.322 — splash gate. Until location is confirmed, render ONLY the
  // splash + (if needed) the coherence modal. EXACT same outer className +
  // style as the main return so the layout is identical and there's no flash.
  if (!locationGateOpen) {
    return (
      <div
        className="bg-tg-bg text-tg-text py-3 flex flex-col gap-2 max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8"
        style={{
          minHeight: 'var(--tg-viewport-stable-height, 100vh)',
          // v0.62.141 — reserve just enough for the compacted 2-row footer
        // (operator: the blank footer band was too tall — roughly halved).
        // v0.62.189 — operator (IMG_2516): "too much white space, I like the
        // bottom to fill" — reserve halved again (5rem → 2.5rem).
        paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {locationModals}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center" role="status" aria-live="polite">
          <div className="h-8 w-8 rounded-full border-2 border-tg-hint/30 border-t-tg-accent animate-spin" aria-hidden />
          <div className="text-sm text-tg-hint">{lang === 'fr' ? 'Confirmation de votre position…' : lang === 'id' ? 'Mengonfirmasi lokasi Anda…' : lang === 'ru' ? 'Подтверждаем ваше местоположение…' : lang === 'de' ? 'Standort wird bestätigt…' : lang === 'zh' ? '正在确认您的位置…' : lang === 'ja' ? '位置を確認しています…' : lang === 'es' ? 'Confirmando tu ubicacion…' : 'Confirming your location…'}</div>
        </div>
      </div>
    );
  }

  // v0.62.x — auth guard screen: shown when the Mini App has no valid Telegram
  // initData (opened outside Telegram, or a stale >24h launch). Clear, actionable
  // copy instead of a blank app + silent 401 storm. Server auth is untouched.
  if (authBlocked) {
    const frr = lang === 'fr';
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center text-tg-text bg-tg-bg">
        <div className="max-w-xs">
          <div className="text-4xl mb-3" aria-hidden>🍽️🔒</div>
          <div className="font-semibold mb-2">
            {frr ? 'Ouvrez Soleat depuis Telegram' : lang === 'id' ? 'Buka Soleat dari Telegram' : lang === 'ru' ? 'Откройте Soleat в Telegram' : lang === 'de' ? 'Soleat über Telegram öffnen' : lang === 'zh' ? '从 Telegram 打开 Soleat' : lang === 'ja' ? 'Telegram から Soleat を開く' : lang === 'es' ? 'Abre Soleat desde Telegram' : 'Open Soleat from Telegram'}
          </div>
          <div className="text-[13px] text-tg-hint leading-snug mb-4">
            {frr
              ? "Impossible de vérifier votre session Telegram. Relancez Soleat depuis le bouton de menu du bot, ou réessayez dans un instant. (Si le problème persiste pour tout le monde, c'est côté serveur — prévenez-nous.)"
              : lang === 'id'
              ? "Tidak dapat memverifikasi sesi Telegram Anda. Buka kembali Soleat dari tombol menu bot, atau coba lagi sebentar. (Jika ini terjadi pada semua orang, ini masalah di sisi server — beri tahu kami.)"
              : lang === 'ru'
              ? 'Не удалось проверить вашу сессию Telegram. Откройте Soleat заново через кнопку меню бота или повторите попытку через мгновение. (Если это происходит у всех, проблема на стороне сервера — сообщите нам.)'
              : lang === 'de'
              ? 'Ihre Telegram-Sitzung konnte nicht überprüft werden. Öffnen Sie Soleat erneut über die Menü-Schaltfläche des Bots oder versuchen Sie es gleich noch einmal. (Wenn das bei allen passiert, liegt es am Server — sagen Sie uns Bescheid.)'
              : lang === 'zh'
              ? '无法验证您的 Telegram 会话。请通过机器人的菜单按钮重新打开 Soleat，或稍后重试。（如果所有人都遇到此问题，则是服务器端问题 — 请告知我们。）'
              : lang === 'ja'
              ? 'Telegram セッションを確認できませんでした。ボットのメニューボタンから Soleat を再度開くか、しばらくしてからもう一度お試しください。（全員に起きている場合はサーバー側の問題です — お知らせください。）'
              : lang === 'es'
              ? 'No se pudo verificar tu sesion de Telegram. Vuelve a abrir Soleat desde el boton de menu del bot o intentalo de nuevo en un momento. (Si le pasa a todos, es un problema del servidor — avisanos.)'
              : "Couldn't verify your Telegram session. Reopen Soleat from the bot's menu button, or try again in a moment. (If this is happening for everyone, it's a server-side issue — let us know.)"}
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-tg-border text-[13px]"
            onClick={() => { try { window.location.reload(); } catch { /* noop */ } }}
          >
            {frr ? 'Réessayer' : lang === 'id' ? 'Coba lagi' : lang === 'ru' ? 'Попробовать снова' : lang === 'de' ? 'Erneut versuchen' : lang === 'zh' ? '重试' : lang === 'ja' ? '再試行' : lang === 'es' ? 'Reintentar' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-tg-bg text-tg-text pt-3 flex flex-col gap-2 max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8"
      style={{
        // v0.59.20: use Telegram's stable viewport variable so the
        // container tracks the *visible* iframe height, not the buggy
        // 100vh that iPad WebView resolves to the full sheet (including
        // Telegram's bottom chrome) and leaves a drag-up gap.
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        // v0.62.141 — reserve just enough for the compacted 2-row footer
        // (operator: the blank footer band was too tall — roughly halved).
        // v0.62.189 — operator (IMG_2516): "too much white space, I like the
        // bottom to fill" — reserve halved again (5rem → 2.5rem).
        // v0.62.190 — full-redesign: HORIZONTAL mode is a full-bleed map that
        // fills behind the floating dock, so NO bottom reserve (the dock owns
        // the bottom). Vertical mode keeps the 2.5rem reserve for the list.
        paddingBottom: drawerMode === 'horizontal'
          ? 'env(safe-area-inset-bottom, 0px)'
          : 'calc(2.5rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* v0.61.285 — fun-fact modal during the rotating-search wait
          window. NLB-sourced food-history facts replace the generic
          "still loading" rotating-titles. Visible only when a fact
          has been picked (1.5 s into a rotating search); the modal
          itself enforces a 3 s on-screen minimum so a fast search
          doesn't yank it mid-sentence. */}
      <FunFactModal fact={funFact} visible={loading && !!funFact} onStop={stopLoading} />

      {/* v0.61.322 — the three coherence modals (extracted above into
          `locationModals`, shared with the splash-gate early-return). */}
      {locationModals}
      {/* v0.62.127 — operator: the header (soleat · Cuisine · langs · weather ·
          region pills) is now a FLOATING, always-present bar — sticky to the top
          with a frosted backdrop. Negative inline margins let the frosting span
          the container's px gutters full-bleed. */}
      {/* v0.62.135 — operator: the header read as too low-contrast in light
          mode (bg-tg-bg/85 frosted). Bumped the resting frosting to /90 + a
          border + shadow for AA separation, and the liquid glass is preserved
          on scroll. On a mode-pill tap (modePeek) the bar goes fully OPAQUE
          (solid bg, no translucency) to stage the Location + food-picks edit. */}
      {/* v0.62.264 — operator: the folio tabs read DISJOINED from the drawer below.
          Root cause: <header> (py-2 + border-b) and the drawer are siblings in a
          `flex flex-col gap-2` root, so ~9px header pad/border + 8px flex gap sat
          between the tab and the panel (the old -mt-[9px] only cancelled part, and
          the sticky header painted over the overlap). When a folio drawer is open,
          drop the header's bottom padding + border so the tabs end flush; the
          drawer then cancels the parent gap (-mt-2) and butts directly under the
          active tab → tabs + panel read as ONE folder. */}
      {/* v0.62.563 — O-54 (operator: the "Cuisine" title + location row sat UNDER
          Telegram's floating system buttons in fullscreen). On a tablet/desktop
          (fullscreen) pad the sticky header's top by Telegram's content-safe-area
          inset so the title + location row clear the ⌄/··· system chrome — the
          same fix as the Hawker top bar. Phones (not fullscreen) keep the plain
          pt-2 and are unchanged. */}
      <header ref={headerRef}
        style={{ paddingTop: isWide ? 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.5rem)' : '0.5rem' }}
        /* v0.62.578 — operator (IMG_0743: opening the location editor "push down"
           the map + a solid black band). The modePeek state used to flip the whole
           header to a SOLID bg-tg-bg — over the full-bleed map that reads as a big
           black band pushing everything down. Keep the header the SAME translucent
           bar whether editing or not (bg-tg-bg/90 backdrop-blur — the resting
           treatment that already ships); the editor's own compact panel below
           carries the staging surface. */
        className={`font-inter sticky top-0 z-30 -mx-3 md:-mx-6 lg:-mx-8 px-3 md:px-6 lg:px-8 ${(cuisinePickOpen || classicOpen) ? 'pb-0' : 'pb-2'} flex flex-col gap-1.5 transition-colors bg-tg-bg/90 backdrop-blur`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="soleat-icon.png" alt="soleat" width="24" height="24" className="rounded-full flex-shrink-0" />
            <h1 className="text-base font-bold leading-tight truncate">{t('header.appTitle', lang)}</h1>
          </div>
          {/* v0.58.55: discreet EN/FR locale toggle, top-right per
              Human Lead. Slim flag-pair to the left of the count badge. */}
          <div className="flex items-center gap-3 shrink-0">
            <LocaleToggle />
            {/* v0.60.219 — operator: drop the "Nc · Nf" count badge,
                show a live weather emoji beside the locale toggle.
                v0.61.380 — pass the active location (anchor → search centre →
                device) so the weather follows where you are, not always SG. */}
            <WeatherBadge
              className="text-[11px] text-tg-hint"
              lat={(locationAnchor?.lat ?? searchCenter?.lat ?? userLoc?.lat) ?? null}
              lng={(locationAnchor?.lng ?? searchCenter?.lng ?? userLoc?.lng) ?? null}
            />
            {/* v0.62.x — operator: tiny ↻ refresh after the weather temp (same
                size), so a stale webview can be force-reloaded without closing
                the Mini App. */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label={lang === 'fr' ? 'Actualiser' : lang === 'zh' ? '刷新' : lang === 'ja' ? '更新' : lang === 'es' ? 'Actualizar' : 'Refresh'}
              title={lang === 'fr' ? 'Actualiser' : lang === 'zh' ? '刷新' : lang === 'ja' ? '更新' : lang === 'es' ? 'Actualizar' : 'Refresh'}
              className="text-[11px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
            >↻</button>
          </div>
        </div>
        {/* v0.57.9: region toggle on its own row so it's always visible.
            v0.57.34: JB now uses the Johor state flag icon (johor-flag.png)
            instead of the 🇲🇾 Malaysia emoji — Johor Bahru is the city, not
            the country.
            v0.61.204: JB asset renamed `johor-flag.png` → `MY_Johor_flag.png`
            per operator's new naming (clearer ISO-like prefix); old path
            kept on the public/ folder for backward-compat with pre-v0.61.204
            cached bundles.
            v0.61.205: OTHER pill flag is now dynamic — `MY_Putrajaya_flag.png`
            when the server-cached anchor is IOI Resort City Putrajaya, else
            falls back to the 🌏 globe. */}
        {/* v0.62.173 — PR B2: once results are showing, collapse the four region
            pills into ONE line ("Set location is: <X>. Click to change", temp-size
            font) just below the title, to give the map more room. Tapping it
            re-expands the pills; picking a region collapses again. */}
        {venues.length > 0 && !regionExpanded && (
          <div className="text-[11px] text-tg-hint text-left leading-tight px-0.5">
            {/* v0.62.176 — operator: "Click to change" on a SECOND line. */}
            <div>📍 {lang === 'fr' ? 'Lieu défini : ' : lang === 'id' ? 'Lokasi ditetapkan: ' : lang === 'ru' ? 'Заданное место: ' : lang === 'de' ? 'Festgelegter Ort: ' : lang === 'zh' ? '已设位置：' : lang === 'ja' ? '設定中の位置：' : lang === 'es' ? 'Ubicacion fijada: ' : 'Set location is: '}<span className="text-tg-text font-medium">{(() => {
              // v0.62.180 — operator (RECURRING, do not regress): this must be a
              // specific street / building / precinct — NEVER a country or region
              // name. Reject the generic names + the old "Singapore" fallback;
              // while the precinct is still resolving, show a "pinpointing…"
              // placeholder rather than the country.
              const generic = new Set(['singapore','malaysia','indonesia','thailand','vietnam','japan','korea','south korea','china','taiwan','hong kong','macau','macao','australia','new zealand','brunei','philippines','johor bahru','johor','cities']);
              // v0.62.x — display FOLLOWS THE SEARCH ANCHOR: if the search pinned a
              // city name (searchLocName) and the live locationName has drifted off it
              // (a background refresh re-applied a stale server anchor), show the
              // pinned name. Keep the live one when it's the enriched same-city
              // ("Sunshine Coast — near …") so we don't lose the landmark detail.
              const _sln = (searchLocName || '').trim();
              const _ln = (locationName || '').trim();
              const nm = (_sln && (!_ln || !_ln.toLowerCase().includes(_sln.toLowerCase()))) ? _sln : _ln;
              return (nm && !generic.has(nm.toLowerCase())) ? nm : (lang === 'fr' ? 'localisation…' : lang === 'id' ? 'menentukan titik…' : lang === 'ru' ? 'определяем точку…' : lang === 'de' ? 'wird lokalisiert…' : lang === 'zh' ? '定位中…' : lang === 'ja' ? '位置特定中…' : lang === 'es' ? 'localizando…' : 'pinpointing…');
            })()}</span></div>
            {/* v0.62.194 — operator: "Click to change" + "↩ Back to last search area"
                sit on ONE line, highlighted in BRIGHT RED. The ↩ glyph + underline are
                a SHAPE cue too (the operator's no-colour-alone rule still holds). */}
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <button
                type="button"
                onClick={() => {
                  // v0.62.255 — operator: "when i select local food pick or choose
                  // your cuisine, then click change location … close the panel body
                  // first then open the location." The cuisine + local-classic
                  // drawers are folio overlays at `top: headerBottom`; opening the
                  // location editor underneath them stacked the two (IMG_2544 — the
                  // "📍 Singapore" plate sat over the location field). Close the
                  // panel body first, THEN expand the editor — mirrors the
                  // region-tab contract below ("editor + picker are mutually
                  // exclusive").
                  setCuisinePickOpen(false); setClassicOpen(false);
                  setRegionExpanded(true); setModePeek(true);
                }}
                aria-label={lang === 'fr' ? 'Changer le lieu' : lang === 'id' ? 'Ubah lokasi' : lang === 'ru' ? 'Изменить место' : lang === 'de' ? 'Ort ändern' : lang === 'zh' ? '更改位置' : lang === 'ja' ? '位置を変更' : lang === 'es' ? 'Cambiar ubicacion' : 'Change location'}
                className="underline font-semibold text-[#ef4444] active:scale-95"
              >{lang === 'fr' ? 'Changer' : lang === 'id' ? 'Ketuk untuk mengubah' : lang === 'ru' ? 'Изменить' : lang === 'de' ? 'Ändern' : lang === 'zh' ? '点击更改' : lang === 'ja' ? 'タップで変更' : lang === 'es' ? 'Toca para cambiar' : 'Click to change'}</button>
              {(() => {
                // v0.61.353 — "↩ Back to last search area": shows when the map view
                // has drifted >600 m from the confirmed anchor; flies the map back
                // WITHOUT changing the search anchor. v0.62.194 — moved up here to
                // sit beside "Click to change" (one line, bright red).
                const anchor = (locationAnchor && Number.isFinite(locationAnchor.lat) && Number.isFinite(locationAnchor.lng))
                  ? locationAnchor : userLoc;
                if (!locChanged || !anchor || !mapViewLocation) return null;
                const R = 6371000, toRad = (d) => d * Math.PI / 180;
                const dLat = toRad(mapViewLocation.lat - anchor.lat), dLng = toRad(mapViewLocation.lng - anchor.lng);
                const hav = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(anchor.lat)) * Math.cos(toRad(mapViewLocation.lat)) * Math.sin(dLng / 2) ** 2;
                const distM = 2 * R * Math.asin(Math.sqrt(hav));
                if (distM < 600) return null;
                return (
                  <button
                    type="button"
                    onClick={() => { setFlyTarget({ lat: anchor.lat, lng: anchor.lng, zoom: 14, _k: Date.now() }); setSelectedCityLocation(null); }}
                    className="underline font-semibold text-[#ef4444] leading-tight whitespace-nowrap active:scale-95"
                    title={lang === 'fr' ? 'Recentrer la carte sur la dernière zone de recherche' : lang === 'id' ? 'Pusatkan peta ke area pencarian terakhir' : lang === 'ru' ? 'Вернуть карту к последней зоне поиска' : lang === 'de' ? 'Karte auf letzten Suchbereich zentrieren' : lang === 'zh' ? '将地图重新居中到上次搜索区域' : lang === 'ja' ? '地図を前回の検索エリアに戻す' : lang === 'es' ? 'Centrar el mapa en tu ultima zona de busqueda' : 'Recentre the map on your last search area'}
                    aria-label={lang === 'fr' ? 'Recentrer la carte sur la dernière zone de recherche' : lang === 'id' ? 'Pusatkan peta ke area pencarian terakhir' : lang === 'ru' ? 'Вернуть карту к последней зоне поиска' : lang === 'de' ? 'Karte auf letzten Suchbereich zentrieren' : lang === 'zh' ? '将地图重新居中到上次搜索区域' : lang === 'ja' ? '地図を前回の検索エリアに戻す' : lang === 'es' ? 'Centrar el mapa en tu ultima zona de busqueda' : 'Recentre the map on your last search area'}
                  >↩ {lang === 'fr' ? 'Retour à la dernière zone' : lang === 'id' ? 'Kembali ke area terakhir' : lang === 'ru' ? 'К последней зоне' : lang === 'de' ? 'Zum letzten Bereich' : lang === 'zh' ? '返回上次搜索区域' : lang === 'ja' ? '前回の検索エリアへ' : lang === 'es' ? 'Volver a la ultima zona' : 'Back to last search area'}</button>
                );
              })()}
            </div>
          </div>
        )}
        {/* v0.62.180 — operator: while the location editor is open, REMIND that
            nothing auto-fires — the user must tap 🔍 to search. */}
        {venues.length > 0 && regionExpanded && (
          <div className="text-[10px] text-tg-accent italic px-1 -mb-0.5">
            {lang === 'fr' ? 'Choisissez un lieu, puis touchez 🔍 pour rechercher — rien ne se lance avant.' : lang === 'id' ? 'Pilih lokasi, lalu ketuk 🔍 untuk mencari — tidak ada yang berjalan sebelum Anda mengetuknya.' : lang === 'ru' ? 'Выберите место, затем нажмите 🔍 для поиска — ничего не запустится раньше.' : lang === 'de' ? 'Ort wählen, dann 🔍 tippen — nichts startet vorher.' : lang === 'zh' ? '选择一个地点，然后点击 🔍 搜索 — 点击前不会执行。' : lang === 'ja' ? '場所を選んで 🔍 をタップして検索 — タップするまで何も実行されません。' : lang === 'es' ? 'Elige un lugar y toca 🔍 para buscar — no pasa nada hasta que lo toques.' : 'Pick a spot, then tap 🔍 to search — nothing fires until you tap it.'}
          </div>
        )}
        {/* v0.62.176 — operator: when "Click to change" is tapped (regionExpanded),
            the 4 mode pills sit in ONE glassmorphism container (the refine-location
            field appears just below, via modePeek); it collapses once a region is
            picked or a location is typed/committed.
            v0.62.186 — operator (IMG_2507 #5): "the background should wrap the
            refine location." The 4 borderless modes AND the refine LocationField
            now live INSIDE this single liquid-glass panel (the field was a
            separate card below the header before). Collapsed (results showing,
            editor closed) the whole block hides behind the "Set location is …"
            line above. */}
        {/* v0.62.578 — operator (IMG_0743): the editor was a FULL-WIDTH block that,
            with the solid header, read as a map-covering band. Constrain it to the
            phone-width column (pickerWidthCls, left-aligned) and, while staging
            (modePeek), give it its OWN compact solid card surface (the header is now
            translucent) so it floats as a panel over the map instead of a band. */}
        <div className={
          venues.length > 0 && !regionExpanded ? 'hidden'
            : (modePeek
                ? `${pickerWidthCls} bg-tg-bg rounded-2xl border border-tg-border px-2.5 py-2 flex flex-col gap-1.5`
                : `${pickerWidthCls} flex flex-col gap-1.5`)
        }>
          {/* v0.62.187 — operator (IMG_2509): when the editor is open the 4 location
              modes are FOLIO FOLDER-TABS — the selected region tab is physically
              connected to the refine-field panel below (.folio-panel), inactive
              modes read as translucent index markers. Closed (first-load) they stay
              the plain pill row. */}
          <div className={modePeek ? 'folio-tabs overflow-x-auto no-scrollbar' : 'flex gap-1.5 overflow-x-auto no-scrollbar'}>
          {[
            // v0.62.97 — 📍 Current: an ACTION (not a region toggle) that anchors
            // to the live device GPS. Listed first so "set me here" reads left→right.
            { id: 'CURRENT', flag: '📍', label: t('region.current', lang), action: true },
            { id: 'SG', flag: '🇸🇬', label: t('region.singapore', lang) },
            { id: 'JB', flag: 'MY_Johor_flag.png', label: t('region.johor', lang) },
            // v0.61.185 — third pill for OTHER (anything not SG/JB:
            // Putrajaya, KL, Penang, Batam, etc.). 🌏 chosen as a
            // region-neutral globe — JB already has the Johor flag,
            // Putrajaya / KL / etc. have no single flag that fits.
            // v0.61.205 — when the active OTHER anchor IS the IOI
            // Resort City Putrajaya precinct, the pill picks up the
            // Putrajaya state flag PNG instead of the globe.
            {
              id: 'OTHER',
              flag: anchorPrecinctId === 'ioi-resort-putrajaya' ? 'MY_Putrajaya_flag.png' : '🌏',
              label: t('region.others', lang)
            }
          ].map((r) => {
            // v0.62.97 — 📍 Current is an action button, never a "selected" region.
            const sel = !r.action && (state.region || 'SG') === r.id;
            // v0.62.187 — closed (non-editor, first-load) state keeps the plain
            // pill border; the editor-open state renders folio folder-tabs (the
            // selected region = .folio-tab--active connected to the panel below),
            // which carries the selection by SHAPE — colour-blind safe.
            const borderCls = sel ? 'border-tg-accent' : 'border-tg-border/60';
            const textCls = sel ? 'text-tg-accent' : 'text-tg-text';
            // v0.62.189 — operator (IMG_2515): "Johor Bahru" must show in FULL (it
            // was truncating to "Johor B…"). Give the JB tab its content width; the
            // other three modes proportion the remaining row space (flex-1).
            // v0.62.201 — operator: EVERY mode tab sizes to its content (no
            // truncation) so "Johor Bahru" AND a bold "Singapore" both show in
            // FULL; the row scrolls horizontally if it overflows a narrow phone.
            const widthCls = 'shrink-0 whitespace-nowrap';
            return (
              <button key={r.id} type="button"
                onClick={() => {
                  // v0.62.180 — operator: tapping a mode KEEPS the location editor
                  // open (the 4 modes + the location field) so the user can refine;
                  // it collapses only when a search is COMMITTED (triggerSearch).
                  // No auto-fire — the anchor moves with noAutoFire below.
                  setLocChanged(true);
                  setRegionExpanded(true);
                  // v0.62.135 — a mode-pill tap (region switch or the 📍 Current
                  // action) surfaces the Location + Local-food-picks fields as an
                  // opaque staging area so the user can confirm the new area before
                  // tapping 🔍. Scroll the in-flow fields back into view and flag the
                  // opaque peek.
                  // v0.62.186 — operator (IMG_2507 #3): "Currently is Singapore, I
                  // click on Singapore but the refine location field didn't appear."
                  // The old `r.id !== state.region` gate skipped modePeek when
                  // re-tapping the ALREADY-selected region, so the editor never
                  // opened. ALWAYS open the editor now (re-tap = "let me refine
                  // here"); the region-change anchor logic below stays guarded on a
                  // real change, so no search fires.
                  setModePeek(true);
                  setCuisinePickOpen(false); setClassicOpen(false);   // v0.62.195 — editor + picker are mutually exclusive
                  armLocIdleClose();   // v0.62.189 — (re)start the 8 s idle-close timer
                  // v0.62.150 — operator: a mode switch must NOT wipe the result
                  // list/strip — the results "always be there", same as the
                  // vertical listing. The previous region's results persist until
                  // the user re-runs the search (no auto-fire) at the new anchor.
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                  // v0.62.97 — 📍 Current: resolve LIVE GPS, then bail (no region toggle).
                  if (r.id === 'CURRENT') { pickCurrentLocation(); return; }
                  explicitPickRef.current = true;   // v0.61.438 — F2: a pill tap is explicit
                  setState((s) => {
                    // v0.60.199 — ✳️ Michelin list is SG-only; when the
                    // user toggles away from SG, drop a previously-
                    // selected 'michelin' chip so the search request
                    // doesn't carry an unsupported cuisine.
                    // v0.61.280 — Register O-31: extended from JB-only
                    // to any non-SG region (JB + OTHER + MY-PUT).
                    // v0.61.431 — operator: "MY + Michelin returns zero".
                    // One contributor: tapping the OTHER pill silently
                    // dropped 'michelin' even though MY/VN/JP… have curated
                    // lists (the v0.61.346 multi-country Michelin). Keep
                    // 'michelin' when the TARGET region still supports it —
                    // SG always; OTHER iff the current countryPref is in the
                    // catalogue's michelinCountries; JB never (no JB list).
                    // v0.61.437 — shared 3-state rule; strip ONLY on a
                    // provable `false` (code review F15: the old check also
                    // stripped while the catalogue was still loading or
                    // countryPref hadn't resolved — a race that silently
                    // dropped a valid MY/VN Michelin selection).
                    const allowed = michelinAllowedFor(r.id, s.countryPref, catalogue);
                    const nextCuisines = allowed === false
                      ? (s.cuisines || []).filter((c) => String(c).toLowerCase() !== 'michelin')
                      : s.cuisines;
                    return { ...s, region: r.id, cuisines: nextCuisines };
                  });
                  // v0.61.277 — operator (30-05 '26): "i switch to
                  // Johor Bahru, and confirm my new loc is JB south
                  // key as spec. why my loc still in south SG."
                  // Tapping the JB pill auto-anchors to the default
                  // focus point (Southkey) when the existing anchor
                  // is missing OR outside JB extent. The user can
                  // fine-tune via the v0.61.268 chip (Southkey ↔ JB
                  // CBD). Map + pill label flip immediately.
                  if (r.id === 'JB') {
                    const anchorIsJb = locationAnchor
                      && Number.isFinite(locationAnchor.lat)
                      && Number.isFinite(locationAnchor.lng)
                      && isJbCoords(locationAnchor);
                    if (!anchorIsJb) {
                      // v0.62.100 — operator: "set my current location instead of
                      // hardcoding to SOUTHKEY". If the live device GPS is already
                      // in Johor, anchor THERE; only fall back to the Southkey
                      // focus default when the device isn't in JB (e.g. browsing
                      // JB from Singapore).
                      if (userLoc && isJbCoords(userLoc)) {
                        onLocationSelect({
                          lat: userLoc.lat, lng: userLoc.lng,
                          fly: true, noAutoFire: true
                        });
                      } else {
                        const fp = JB_FOCUS_POINTS[JB_FOCUS_DEFAULT];
                        onLocationSelect({
                          lat: fp.lat, lng: fp.lng, label: fp.name,
                          noAutoFire: true
                        });
                      }
                    }
                  }
                  // v0.62.97 — operator bug: 🇸🇬 after a non-SG anchor (Johor → SG)
                  // kept KL's Mid Valley and only swapped the flag. Mirror the JB
                  // auto-anchor: when the current anchor isn't in Singapore, restore
                  // the last real SG pick, else Merlion Park. fly:true so the map
                  // actually moves there; noAutoFire so the user taps 🔍 (pill parity).
                  if (r.id === 'SG') {
                    const anchorInSg = locationAnchor
                      && Number.isFinite(locationAnchor.lat)
                      && Number.isFinite(locationAnchor.lng)
                      && coordsToCountry(locationAnchor) === 'SG';
                    if (!anchorInSg) {
                      const sg = lastSgAnchorRef.current || MERLION;
                      onLocationSelect({
                        lat: sg.lat, lng: sg.lng, label: sg.name || MERLION.name,
                        fly: true, noAutoFire: true
                      });
                    }
                  }
                }}
                aria-pressed={r.action ? undefined : sel}
                aria-label={r.action ? r.label : undefined}
                /* v0.62.97 — all four buttons are liquid-glass 3D rectangles
                   (rounded-xl + .glass-pill frosting).
                   v0.62.126 — operator: Johor Bahru hogged the row's slack
                   (flex-1) while the others were content-width, so it looked
                   over-padded. Every pill is now flex-1 (equal share of the row)
                   with uniform px-1, so Current / Singapore / Johor Bahru /
                   Cities read as equally spaced. Selected pill drops the flat
                   ring for the .glass-pill--selected treatment (skeuomorphic /
                   pressed-in in dark mode). */
                className={modePeek
                  ? `folio-tab ${widthCls} justify-center inline-flex items-center gap-1 active:scale-95 ${sel ? 'folio-tab--active' : ''}`
                  : `glass-pill shrink-0 px-2 py-1.5 rounded-xl border text-[11px] whitespace-nowrap inline-flex items-center justify-center gap-1 ${sel ? 'glass-pill--selected ' : ''}${borderCls} ${textCls}`}>
                {(r.flag.endsWith('.png') || r.flag.endsWith('.svg'))
                  ? <img src={r.flag} alt="" width="18" height="12" className="rounded-sm border border-tg-border/40 flex-shrink-0" />
                  : <span aria-hidden>{r.flag}</span>}
                <span>{r.label}</span>
              </button>
            );
          })}
          </div>
          {/* v0.62.186 — operator (IMG_2507 #5): the refine LocationField moved UP
              into this same liquid-glass panel so ONE background wraps the 4 modes
              + the field (it was a separate ringed card BELOW the header before).
              Shown only while the editor is open (modePeek). No auto-fire —
              onSelect just sets the anchor; the user taps 🔍 (onSearch). */}
          {modePeek && (
            <div className="folio-panel px-2.5 py-2">
            {!userLoc ? (
            <div className="text-[11px] text-tg-hint italic px-1 py-1">
              📍 {lang === 'fr' ? 'Localisation en cours…' : lang === 'id' ? 'Mencari lokasi Anda…' : lang === 'ru' ? 'Определяем ваше местоположение…' : lang === 'de' ? 'Sie werden geortet…' : lang === 'zh' ? '正在定位…' : lang === 'ja' ? '現在地を取得中…' : lang === 'es' ? 'Localizandote…' : 'Locating you…'}
            </div>
          ) : (
            <LocationField
              userLoc={userLoc}
              region={state.region}
              anchor={locationAnchor}
              /* v0.61.423 — the previewed city (an OTHER city-dropdown pick that
                 hasn't been committed via 🔍 yet) so the picker's field shows the
                 SELECTION instead of the stale committed anchor. */
              selectedCity={selectedCityLocation}
              suffix={loading
                ? t('banner.locating.suffix', lang)
                : (!venues.length
                  ? t('banner.no.match', lang)
                  : (venues.length === 1
                    ? t('banner.places.one', lang)
                    : tn('banner.places.many', lang, { n: venues.length })))}
              onSelect={onLocationSelect}
              onSearch={triggerSearch}
              /* v0.62.x — pulse the 🔍 when criteria changed since the last
                 search (no auto-fire); the cue clears once a search runs. */
              searchPending={dirty}
              /* v0.62.x — feed result venues to the location field's nearby
                 browser (grouped by precinct/MRT zone; tap a row → anchor + 🔍). */
              nearbyVenues={!loading && venues.length
                ? venues.map((v) => ({ name: v.name, area: v.area, lat: v.lat, lng: v.lng, distanceM: v.distanceM }))
                : null}
              /* v0.62.189 — typing in the field re-arms the 8 s idle-close timer
                 so the editor never closes mid-entry. */
              onActivity={armLocIdleClose}
              /* v0.61.191 — OTHER region's country picker. countryPref is
                 one of the 16 ISO codes from countries.js; onCountryChange
                 updates state.countryPref so the next Places search-by-
                 country call constrains to the right country. */
              countryPref={state.countryPref || 'MY'}
              onCountryChange={(code) => {
                // v0.61.421 — operator: "I change from Japan to Hanoi it reset the
                // OTHER mode and unhinged the others button." Re-assert region in
                // the SAME setState as countryPref so no concurrent effect can
                // transiently flip the pill away. (MY-PUT legacy is preserved.)
                // v0.61.437 — code review F5: switching to a country with NO
                // curated Michelin list (AU/NZ/ID/BN/…) kept a selected 'michelin'
                // chip → an unexplained zero. Strip it here too (3-state rule; only
                // on a provable `false`, never while the catalogue is loading).
                explicitPickRef.current = true;   // v0.61.438 — F2: dropdown pick is explicit
                // v0.62.x — operator: "the city dishes should clear once country
                // and city is change." A country switch invalidates the old city's
                // plate, so wipe BOTH plates — the next city pick + search re-fill.
                setArrivalPlate(null);
                setCuisinePlate(null);
                setState((s) => {
                  const allowed = michelinAllowedFor('OTHER', code, catalogue);
                  const nextCuisines = allowed === false
                    ? (s.cuisines || []).filter((c) => String(c).toLowerCase() !== 'michelin')
                    : s.cuisines;
                  return { ...s, countryPref: code, cuisines: nextCuisines, region: s.region === 'MY-PUT' ? 'MY-PUT' : 'OTHER' };
                });
                // v0.61.196 — fire-and-forget push to /api/cuisine/country-pref
                // so the chat /location (v0.61.195) picks up the same value.
                saveCountryPref(code).catch(() => { /* non-fatal */ });
              }}
            />
            )}
            </div>
          )}
        </div>
        {/* v0.62.172 — operator: the Cuisine PICKER is the TMA's core action but
            was a tiny footer link ("how would a user know to tap it?"). Surface it
            as a PROMINENT header bar right under the region pills: an accent CTA
            when no cuisine is picked, the picks summary once chosen. Opens the
            existing CuisineDrawer (setCriteriaOpen). Collapses to a thin row once
            results are showing so the map keeps its space. Colour-blind safe —
            the 🍲 glyph + "›" chevron + label carry it, not hue alone. */}
        {/* v0.62.176 — operator: TWO compact pills below the location line replace
            the full-width cuisine bar + the always-on Local Food Classic plate, so
            the map gets more room. Each opens its list as a glassmorphism
            "conversation" dropdown: "Choose your cuisine" → the cuisine picker
            (CuisineDrawer / criteriaOpen); "Pick local classic" → the plate below.
            Before any results, only "Choose your cuisine" shows (full-width accent
            CTA, pulses) since there's no plate yet.
            v0.62.180 — operator: HIDE both pills while the location editor is open
            (regionExpanded), so the 4 modes + location field stage cleanly; they
            reappear once a search is committed. */}
        {!regionExpanded && (() => {
          const picked = state.cuisines || [];
          const names = picked.map((slug) => {
            // v0.62.825 — was `return michelinRemaining.label`, the SERVER's
            // english edition label ("Michelin Japan"), which made this the one
            // pill that skipped localisation while every other slug went through
            // cuisineName() below. `cat.michelinBib` already carries ミシュラン ·
            // ビブグルマン / 米其林 · 必比登 / Мишлен · Биб Гурман and is what
            // CuisineDrawer prints for the SAME chip, so the two now agree.
            // TRADE-OFF, STATED: the pill loses the country word the server put
            // there ("Japan"). The flag and the location line above it both name
            // the country already; localising `michelinEditionLabel` server-side
            // would need 11 country names in 8 locales and is a separate call.
            if (slug === 'michelin') return t('cat.michelinBib', lang);
            const en = cuisineNameBySlug.get(slug) || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return cuisineName(slug, en, lang);   // v0.62.x — localise folio-tab cuisine names
          });
          // v0.62.265 — operator: "Choose your cuisine" truncated in Telegram;
          // the tab holds the cuisine grid AND the filter chips, so the empty
          // state now reads "Cuisine & filters" (shorter + names the filters).
          const cuisineLabel = names.length ? names.join(' · ') : (lang === 'fr' ? 'Cuisine & filtres' : lang === 'id' ? 'Masakan & filter' : lang === 'ru' ? 'Кухня и фильтры' : lang === 'de' ? 'Küche & Filter' : lang === 'zh' ? '菜系与筛选' : lang === 'ja' ? '料理とフィルター' : lang === 'es' ? 'Cocina y filtros' : 'Cuisine & filters');
          const hasPlate = !!(cuisinePlate || arrivalPlate) && venues.length > 0;
          // v0.62.187 — operator (IMG_2509): Cuisine + Local-classic render as
          // FOLIO FOLDER-TABS. The open picker is .folio-tab--active; the
          // Local-classic tab connects to its plate panel just below
          // (.folio-panel). Empty cuisine keeps the accent + pulse CTA.
          return (
            // v0.62.225 — operator: the Cuisine + Local-Food-Pick tabs are
            // skeuomorphic MANILA FOLDERS (light-only); `folio--manila` skins them.
            <div className={`folio-tabs folio--manila ${pickerWidthCls}`}>
              <button
                type="button"
                onClick={() => { setClassicOpen(false); setCuisinePickOpen((o) => !o); }}
                aria-expanded={cuisinePickOpen}
                aria-label={names.length
                  ? (lang === 'fr' ? `Cuisines : ${names.join(', ')}` : lang === 'id' ? `Masakan: ${names.join(', ')}` : lang === 'ru' ? `Кухни: ${names.join(', ')}` : lang === 'de' ? `Küchen: ${names.join(', ')}` : lang === 'zh' ? `菜系：${names.join(', ')}` : lang === 'ja' ? `料理：${names.join(', ')}` : lang === 'es' ? `Cocinas: ${names.join(', ')}` : `Cuisines: ${names.join(', ')}`)
                  : (lang === 'fr' ? 'Cuisine & filtres' : lang === 'id' ? 'Masakan & filter' : lang === 'ru' ? 'Кухня и фильтры' : lang === 'de' ? 'Küche & Filter' : lang === 'zh' ? '菜系与筛选' : lang === 'ja' ? '料理とフィルター' : lang === 'es' ? 'Cocina y filtros' : 'Cuisine & filters')}
                // v0.62.259 — operator: the accent-blue CTA on an empty cuisine
                // tab made it MISMATCH the grey "Pick local classic" tab once both
                // showed. Apply the blue CTA only BEFORE results (no plate yet);
                // once both tabs are loaded they share the standard manila colour.
                // v0.62.678 — operator: "I like Cuisine's tab labels at 11px." Dropped the
                // text-[12px] utility here — it never actually rendered (styles.css's
                // .folio-tab{font-size:11px} sits later in the compiled CSS and silently won
                // the cascade tie, so this class was dead weight claiming a size that was
                // never real). 11px stays exactly as it always has; only the source now
                // agrees with it.
                className={`folio-tab flex-1 min-w-0 flex items-center gap-1.5 active:scale-95 ${cuisinePickOpen ? 'folio-tab--active' : ''} ${!names.length && !hasPlate ? 'text-tg-accent font-semibold' : ''} ${!names.length && !hasPlate && editSearchPulse ? 'animate-pulse' : ''}`}
              >
                <span aria-hidden className="shrink-0">🍲</span>
                <span className="flex-1 text-left truncate">{cuisineLabel}</span>
                <span aria-hidden className="shrink-0 opacity-70">{cuisinePickOpen ? '▴' : '▾'}</span>
              </button>
              {/* v0.62.263 — operator: during loading only ONE header showed
                  because this tab was gated on hasPlate (results + a plate). Now
                  it ALWAYS renders so the two-header layout is stable (no jump);
                  until a plate + results exist it's DISABLED (greyed, non-tappable,
                  no chevron). hasPlate flips it live to the real dropdown. */}
              <button
                type="button"
                disabled={!hasPlate}
                onClick={() => { if (!hasPlate) return; setCuisinePickOpen(false); setClassicOpen((o) => !o); }}
                aria-expanded={hasPlate ? classicOpen : undefined}
                aria-disabled={!hasPlate || undefined}
                title={!hasPlate ? (lang === 'fr' ? 'Disponible une fois les résultats chargés' : lang === 'id' ? 'Tersedia setelah hasil dimuat' : lang === 'ru' ? 'Доступно после загрузки результатов' : lang === 'de' ? 'Verfügbar nach dem Laden der Ergebnisse' : lang === 'zh' ? '结果加载后可用' : lang === 'ja' ? '結果の読み込み後に利用可能' : lang === 'es' ? 'Disponible al cargar resultados' : 'Available once results load') : undefined}
                aria-label={lang === 'fr' ? 'Plats classiques locaux' : lang === 'id' ? 'Pilih klasik lokal' : lang === 'ru' ? 'Местная классика' : lang === 'de' ? 'Lokale Klassiker' : lang === 'zh' ? '选择本地经典' : lang === 'ja' ? '地元の定番を選ぶ' : lang === 'es' ? 'Elegir clasico local' : 'Pick local classic'}
                // v0.62.678 — same dead text-[12px] removal as the tab above (see its comment).
                className={`folio-tab flex-1 min-w-0 flex items-center gap-1.5 ${hasPlate ? 'active:scale-95' : 'opacity-50 cursor-not-allowed'} ${hasPlate && classicOpen ? 'folio-tab--active' : ''}`}
              >
                {/* v0.62.228 — operator: the Magnify (cooking-method) icon marks
                    Local Food Pick + search. */}
                <img src="/app/cuisine/magnify-cooking.png" alt="" aria-hidden className="shrink-0 w-4 h-4 object-contain" />
                <span className="flex-1 text-left truncate">{lang === 'fr' ? 'Plats classiques locaux' : lang === 'id' ? 'Pilih klasik lokal' : lang === 'ru' ? 'Местная классика' : lang === 'de' ? 'Lokale Klassiker' : lang === 'zh' ? '选择本地经典' : lang === 'ja' ? '地元の定番を選ぶ' : lang === 'es' ? 'Elegir clasico local' : 'Pick local classic'}</span>
                <span aria-hidden className="shrink-0 opacity-70">{hasPlate ? (classicOpen ? '▴' : '▾') : ''}</span>
              </button>
            </div>
          );
        })()}
        {/* v0.62.188 — operator (IMG_2509 follow-up "1"): the Cuisine picker opens
            INLINE as a folio-panel connected to its tab (parallel to Local-classic).
            Pick chips → tap 🔍 Search to fire (no auto-fire).
            v0.62.249 — this is now the ONLY cuisine picker; the legacy footer
            "Search criteria" bottom sheet was removed (see the state comment). */}
        {/* v0.62.195 — operator: the cuisine + local-classic pickers no longer sit
            INLINE in the header (they pushed the map down + dropped the quick
            filters). They now render as fixed bottom-sheet OVERLAYS at root level
            (in front of the map; the map stays put). See below `</header>`. */}
        {/* v0.62.205 — operator: when the New filter found nothing PROVABLY new
            nearby, say so (rather than passing established spots off as new). The
            ↩-free amber note is colour-blind safe (orange + ℹ️, never red/green). */}
        {noProvenNew && venues.length > 0 && (state.filters?.newlyOpened) && (
          <div className="text-[11px] text-[#b45309] bg-[#fef3c7] border border-[#f59e0b]/50 rounded-lg px-2.5 py-1 leading-snug">
            ℹ️ {lang === 'fr' ? 'Aucune adresse récemment ouverte à proximité — voici les établies.' : lang === 'id' ? 'Tidak ada tempat yang baru buka di sekitar — menampilkan yang sudah lama.' : lang === 'ru' ? 'Поблизости нет недавно открытых мест — показываем проверенные.' : lang === 'de' ? 'Keine neu eröffneten Orte in der Nähe — etablierte werden angezeigt.' : lang === 'zh' ? '附近没有新开的店 — 显示老字号。' : lang === 'ja' ? '近くに新店はありません — 老舗を表示します。' : lang === 'es' ? 'No hay sitios recien abiertos cerca — mostrando los establecidos.' : 'No newly-opened spots nearby — showing established ones.'}
          </div>
        )}
      </header>

      {/* v0.62.x — the Search Insights strip moved OUT of here (was a full-bleed
          white band under the header that ate a row). It now renders as a slim,
          centred line INSIDE the bottom dock's FAB row, between 💬 and 🔍 (see
          the composer/FAB block below). */}

      {/* v0.62.186 — operator (IMG_2507 #5): the standalone "Location staging"
          card that used to sit here (a separate ringed panel below the header)
          was merged UP into the header's liquid-glass mode panel, so ONE glass
          background now wraps the 4 modes + the refine LocationField. */}

      {/* v0.62.194 — the "↩ Back to last search area" helper moved UP into the
          header, beside "Click to change" (one line, bright red). */}

      {/* v0.62.195 — operator: the CUISINE picker is a fixed OVERLAY in front of
          the map (was inline, pushing the map down). It carries the QUICK FILTERS
          (Open-now / Halal / Price / …) + the cuisine grid + 🔍 Search. Hidden
          result cards while open (see the ResultDrawer gate). */}
      {cuisinePickOpen && catalogue && (
        // v0.62.575 — operator (IMG_0740: "you push down the map, why?"): the
        // picker is a FIXED overlay that FLOATS over the map at `top: headerBottom`
        // (right under the folio tabs) instead of an in-flow panel that shoves the
        // map down + leaves a black band beside it. The `.folder-drawer` surface is
        // a SOLID white panel (no backdrop-filter → no WebKit compositing blackout
        // on the iPad fullscreen webview). The element is sized to its own box, so
        // the map stays tappable everywhere outside it. Left-aligned via
        // pickerWidthCls (max-w-md, no mx-auto). Replaces the v0.62.254 in-flow
        // push-down (which reversed the earlier v0.62.195 overlay).
        // v0.62.576 — Codex P2: the fixed drawer must anchor to the APP CONTAINER,
        // not the viewport. The root is `max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8`,
        // so on a viewport WIDER than 1600px the old viewport gutters (left-8) opened
        // the picker far left of its (centred) tab. The wrapper now mirrors the root
        // container exactly, so the inner panel's left edge == the tab's left edge on
        // every width. pointer-events-none on the wrapper (map tappable in the gaps);
        // pointer-events-auto on the solid panel.
        <div
          style={{ top: headerBottom }}
          className="fixed left-0 right-0 z-30 max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8 pointer-events-none">
        <div
          /* v0.62.583 — operator (IMG_3512/3513): "the horizontal bottom header
             line that appears when I tap should disappear." The floating panel's
             full `border` drew a TOP border = a horizontal line right under the
             header (before the overlay change the panel connected seamlessly to the
             tab). Drop the top border (`border-x border-b`, no `border-t`) so no
             line reads under the header; the solid panel meets the header cleanly. */
          className={`folder-drawer pointer-events-auto overflow-y-auto no-scrollbar rounded-b-2xl border-x border-b px-3 py-2.5 flex flex-col gap-2 max-h-[60vh] ${pickerWidthCls}`}>
          {/* v0.62.246 — operator: the folio TAB already reads "Choose your
              cuisine"; drop the duplicate body title, keep only the × close. */}
          <div className="flex items-center justify-end">
            <button type="button" onClick={() => setCuisinePickOpen(false)} aria-label={lang === 'fr' ? 'Fermer' : lang === 'id' ? 'Tutup' : lang === 'ru' ? 'Закрыть' : lang === 'de' ? 'Schließen' : lang === 'zh' ? '关闭' : lang === 'ja' ? '閉じる' : lang === 'es' ? 'Cerrar' : 'Close'} className="text-tg-hint hover:text-tg-text text-sm leading-none px-1">✕</button>
          </div>
          {recommendHint && (
            <div className="rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2 text-[12px] leading-snug text-tg-text">
              {t('filter.recommend.hint', lang)}
            </div>
          )}
          <QuickFilters
            filters={state.filters}
            onChange={(f) => {
              if (f.recommend && !state.filters?.recommend) {
                setRecommendHint(true);
                if (recommendHintTimerRef.current) clearTimeout(recommendHintTimerRef.current);
                recommendHintTimerRef.current = setTimeout(() => setRecommendHint(false), 7000);
              } else if (!f.recommend && recommendHint) {
                setRecommendHint(false);
                if (recommendHintTimerRef.current) clearTimeout(recommendHintTimerRef.current);
              }
              setState((s) => ({ ...s, filters: f }));
            }}
            specialModeActive={!!state.specialMode}
            ratingPref={ratingPref}
            ratingDisabled={(state.cuisines || []).includes('michelin')}
            onRatingSave={(value) => {
              setRatingPref(value);
              setRatingLoaded(true);
              saveRatingPref(value).catch(() => {});
              setRatingReminder({ kind: 'saved' });
            }}
          />
          <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
            region={state.region}
            countryPref={state.countryPref}
            michelinCuisines={(() => {
              const cc = state.region === 'SG' ? 'SG'
                : (state.region === 'MY-PUT' || state.region === 'JB') ? 'MY'
                : String(state.countryPref || '').toUpperCase();
              const byCC = michelinCuisinesByCC && michelinCuisinesByCC[cc];
              if (!byCC) return null;
              const city = selectedCityLocation?.name || locationAnchor?.name || null;
              if (city && byCC.byCity && Array.isArray(byCC.byCity[city])) return byCC.byCity[city];
              return Array.isArray(byCC.all) ? byCC.all : null;
            })()}
            specialMode={state.specialMode || null}
            onSpecialModeChange={(mode) => setState((s) => ({ ...s, specialMode: mode || null }))}
            onChange={(c) => setState((s) => ({ ...s, cuisines: c }))}
            michelinFilter={state.michelinFilter}
            /* v0.62.696 — operator reported the ticks "don't work". The wiring was
               sound end to end (verified in-browser: chips toggle, the callback
               emits the right object, and the server filter narrows correctly for
               all 11 countries). Two real causes:
               (a) changing a tick only set state — nothing prompted a re-search,
                   so nothing visibly happened. It now raises the SAME search hint
                   a category-drawer close raises (operator: "follow the existing
                   convention and just nudge you to search").
               (b) in Singapore the 2026 tick could never matter: SG's 2026 STAR
                   selection is unannounced, so all 41 SG stars carry only "'25".
                   michelinYears greys it with a reason instead. */
            onMichelinFilterChange={(mf) => {
              setState((s) => ({ ...s, michelinFilter: mf }));
              setSearchHintActive(true);
              setTimeout(() => setSearchHintActive(false), 5000);
            }}
            michelinYears={(() => {
              const cc = state.region === 'SG' ? 'SG'
                : (state.region === 'MY-PUT' || state.region === 'JB') ? 'MY'
                : String(state.countryPref || '').toUpperCase();
              const ys = michelinYearsByCC && michelinYearsByCC[cc];
              return Array.isArray(ys) ? ys : null;   // null → fail open
            })()}
            /* v0.62.700 (O-124) — the union across every country, which is what
               decides WHICH ticks exist. Kept separate from michelinYears (which
               decides which are live HERE) so an edition another country already
               has is still offered — greyed with a reason — rather than silently
               absent. That is what makes a '27 appear on its own. */
            michelinAllYears={unionYears(michelinYearsByCC)}
            isCompact={vp.isCompact}
            onCategoryClose={() => {
              if (state.cuisines.length > 0) {
                setSearchHintActive(true);
                setTimeout(() => setSearchHintActive(false), 5000);
              }
            }}
            onDrillChange={onDrillChange}
            onPickDish={(dish) => {
              // v0.62.453 — "Dishes" pop-up dish tap: same as a classic-picker
              // dish tap, but closes the cuisine picker instead of the classic one.
              setNlText(dish);
              setLastPrompt(dish);
              setPinnedDish(dish);
              setCuisinePickOpen(false);
              setLoadingReason('rotating');
              runSearch(state, null, { freeTextOverride: dish, hawkerFirst: state.region === 'SG' });
            }} />
          <button
            type="button"
            onClick={() => { setCuisinePickOpen(false); triggerSearch(); }}
            disabled={loading}
            className="w-full text-sm font-semibold px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text active:scale-[0.99] disabled:opacity-50"
          >{t('btn.search', lang)}</button>
        </div>
        </div>
      )}
      {/* v0.62.254 — the LOCAL-CLASSIC picker is IN-FLOW under its tab too (option 2). */}
      {classicOpen && (cuisinePlate || arrivalPlate) && !loading && venues.length > 0 && (
        // v0.62.575 — same as the cuisine picker above: a FIXED overlay floating
        // over the map at `top: headerBottom` (solid `.folder-drawer` white panel,
        // no backdrop-filter), not an in-flow push-down. Map stays put.
        // v0.62.576 — Codex P2: anchor to the app container (see the cuisine picker).
        <div
          style={{ top: headerBottom }}
          className="fixed left-0 right-0 z-30 max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8 pointer-events-none">
        <div
          /* v0.62.583 — no top border (see the cuisine picker above): the panel's
             top line under the header should not show. */
          className={`folder-drawer pointer-events-auto overflow-y-auto no-scrollbar rounded-b-2xl border-x border-b px-2.5 py-2 max-h-[60vh] ${pickerWidthCls}`}>
          {/* v0.62.246 — operator: the folio TAB already reads "Pick local
              classic"; drop the duplicate body title, keep only the × close.
              (The plate below still shows the city name, e.g. "📍 Singapore".) */}
          <div className="flex items-center justify-end pb-1">
            <button type="button" onClick={() => setClassicOpen(false)} aria-label={lang === 'fr' ? 'Fermer' : lang === 'id' ? 'Tutup' : lang === 'ru' ? 'Закрыть' : lang === 'de' ? 'Schließen' : lang === 'zh' ? '关闭' : lang === 'ja' ? '閉じる' : lang === 'es' ? 'Cerrar' : 'Close'} className="text-tg-hint hover:text-tg-text text-sm leading-none px-1">✕</button>
          </div>
          <ArrivalPlate
            plate={(() => {
              // v0.62.173 — PR B2: pin the just-searched dish to the FRONT.
              const p = cuisinePlate || arrivalPlate;
              if (!p || !pinnedDish || !Array.isArray(p.dishes)) return p;
              const i = p.dishes.findIndex((d) => d && d.dish === pinnedDish);
              if (i <= 0) return p;
              const dishes = [...p.dishes];
              const [pin] = dishes.splice(i, 1);
              return { ...p, dishes: [pin, ...dishes] };
            })()}
            lang={lang}
            /* v0.62.x — operator: show the dish list immediately when the
               "Pick local classic" dropdown opens (no extra taps). */
            expanded
            onTryDish={(dish) => {
              setNlText(dish);
              setLastPrompt(dish);
              setPinnedDish(dish);
              setClassicOpen(false);
              setLoadingReason('rotating');
              // v0.62.x — operator: in SG, a local-classic dish tap should look in
              // hawker centres first (then fall back to regular eateries).
              runSearch(state, null, { freeTextOverride: dish, hawkerFirst: state.region === 'SG' });
            }}
          />
        </div>
        </div>
      )}

      {/* v0.62.567 — portrait two-panel: pin the framed map at the top (sticky
          below the header) so ONLY the two-column list scrolls beneath it. Uses
          `display:contents` off-portrait so phones + landscape are untouched.
          v0.62.575 — the map STAYS sticky while a folio picker is open now: the
          picker floats over it as a fixed overlay (below) instead of pushing it
          down, so the map must hold its place.
          v0.62.580 — operator (IMG_0744: the pink "Closing in N min" / red "Closed"
          card strips BLEED onto the map in portrait). Those strips are `relative
          z-10` (ResultCard.jsx) — the SAME level as this sticky map, so a card
          scrolling up behind the map painted its z-10 strip OVER the map (later in
          DOM wins at equal z). Raise the opaque sticky map to `z-20` so it covers
          the z-10 strips (still below the z-30 header + folio pickers). */}
      <div
        className={(portraitWide || staticSplitList) && drawerMode === 'vertical'
          ? 'sticky z-20 bg-tg-bg' : 'contents'}
        style={(portraitWide || staticSplitList) && drawerMode === 'vertical'
          ? { top: headerBottom } : undefined}
      >
      <MapPanel
        /* v0.62.574 — O-54 (operator: "the map blacks out on the fullscreen
           tablet … Look into your codes and think why are cuisine TMA behaving
           this way"). ROOT CAUSE: the `fill` prop toggles ONE live map container
           between framed (height:68vh) and full-bleed (absolute inset-0) — an
           IN-PLACE Google Maps canvas resize, which is what paints the map black
           on the iPad Telegram-fullscreen WebKit view. Hawker never hits this
           because it mounts a SEPARATE HawkerMapPanel for framed vs full-bleed, so
           the map REMOUNTS rather than resizing. Follow the hawker codes: key the
           panel on the framed↔full-bleed transition so the tablet REMOUNTS a fresh
           map (no in-place resize → no blackout) exactly like Hawker's ⇲ expand.
           Phones (not fullscreen, never black out) keep a CONSTANT key so their
           picker-open fill flip stays a cheap in-place resize with no remount flash.
           On a tablet `fill` reduces to `drawerMode === 'horizontal'` (isWide
           short-circuits the || in the fill expression below), so drawerMode IS
           the framed↔full-bleed axis to key on. */
        key={isWide ? 'cuisine-map-fill' : 'cuisine-map-phone'}
        venues={visibleVenues.length ? visibleVenues : venues}
        userLoc={userLoc}
        /* v0.62.567 — portrait two-panel: a compact ~40vh framed map (the list
           gets the rest); the ⇲ button EXPANDS to the full carousel (drawerMode
           → horizontal) and, in that carousel, ⇱ collapses back to the two-panel.
           v0.62.661 — the landscape-phone static split wants exactly the same
           compact-map + expand/collapse pair; `fill` below is what actually makes
           `frameHeight` take effect for it (see the v0.62.661 note on `fill`). */
        frameHeight={(portraitWide || staticSplitList) && drawerMode === 'vertical' ? '40vh' : undefined}
        onExpandFull={(portraitWide || staticSplitList) ? () => setDrawerMode('horizontal') : undefined}
        onCollapse={(portraitWide || staticSplitList) ? () => setDrawerMode('vertical') : undefined}
        /* v0.62.190 — horizontal mode: full-bleed map that FILLS the viewport
           behind the floating dock (no white band). Vertical keeps the framed
           fixed-height card above the scrolling list.
           v0.62.254 — when a folio picker (cuisine / local-classic) is OPEN it
           renders IN-FLOW above the map (option 2, MVP layout), so the map drops
           its full-bleed fill and sits framed below — the picker pushes it down. */
        /* v0.62.575 — O-54 (operator IMG_0740: "you push down the map, why?").
           The folio pickers now FLOAT over the map as fixed overlays (below), so
           the map must NOT un-fill when a picker opens — on EVERY device. `fill`
           depends ONLY on drawerMode now (the picker-open term is gone), which
           also matches the remount-key `cuisine-map-${drawerMode}` exactly (no
           picker-triggered fill toggle → no in-place resize → no remount flash /
           blackout). This makes phone + tablet behave identically (operator: "why
           phone can be done?" — now they share one code path). */
        /* v0.62.655 — operator: "build in the overlay drawer like Hawker TMA in
           Cuisine TMA in list mode". The map is full-bleed in both modes for
           every device EXCEPT the one carved out at v0.62.661 below; because it
           doesn't vary for tablet/desktop/portrait-phone, the v0.62.574
           framed-to-full-bleed REMOUNT (which existed only to dodge the iPad
           blackout on an in-place canvas resize) has nothing left to guard
           against there: the canvas is never resized in place on those devices.
           v0.62.661 — operator: an iPhone in LANDSCAPE + list mode has too little
           vertical room for the drawer to show list AND map at once. `fill` is
           false for exactly that one case, which is what makes `frameHeight`
           (above) actually take effect — a bounded top map instead of full-bleed
           behind the drawer. Phones already use a CONSTANT remount key (see the
           v0.62.574 note above), so this in-place fill flip is the cheap resize
           that comment already anticipated, not a new remount risk. */
        fill={!staticSplitList}
        focusedPlaceId={focusedPlaceId}
        onPinTap={setFocusedPlaceId}
        /* v0.62.590 — clear the selection when the popup closes (in-card ✕ or
           empty-map tap), so re-tapping the same pin/card reopens it (Codex). */
        onInfoClose={() => setFocusedPlaceId(null)}
        searchCenter={searchCenter || userLoc}
        anchorName={locationName}
        overlayLayers={overlayLayers}
        onOverlayChange={setOverlayLayers}
        region={state.region}
        countryPref={state.countryPref}
        onMapMove={setMapViewLocation}
        flyTo={flyTarget}
        /* v0.62.125 — tap on the empty map exits the result carousel
           (back to the vertical list), per operator "tap-out → list". */
        onDeselect={() => {
          setFocusedPlaceId(null);
          // v0.62.201 — operator: tapping the map (an area OTHER than the mode
          // tabs) SAVES the current location, CLOSES the refine-location editor,
          // and brings back the "Choose your cuisine" + "Pick local classic"
          // pickers. The anchor is already committed; nothing fires.
          if (modePeek || regionExpanded) { setModePeek(false); setRegionExpanded(false); }
        }}
        /* v0.62.x — long-press the map → drop a pin → set location (no auto-search). */
        onLongPress={handleMapLongPress}
        /* v0.62.138 — horizontal mode: a card tap blinks the pin only (no zoom,
           no info pop-up). Vertical mode keeps the full pop/zoom behaviour.
           v0.62.562 — O-54 Hawker parity (operator: "follow hawker codes"): on a
           TABLET/desktop (isWide) the landscape carousel behaves like Hawker — a
           card tap zooms to 17 and POPS the pin's info window (drops blinkOnly),
           so the centred card's pin actually opens on the full-bleed map. Phones
           keep the blink-only strip behaviour unchanged. */
        blinkOnly={drawerMode === 'horizontal' && !isWide}
        /* v0.62.6 — Michelin city-grouping: fit-bounds over the given pins
           (set-city pins in Case A, all visible pins in Case B, a tapped
           city group's pins on jump-row tap). Null on non-Michelin pages. */
        fitPins={fitPins}
      />
      </div>

      {/* v0.62.141 — results DEFAULT to the horizontal floating strip (auto-shown
          when a result set exists). The list on/off + vertical/horizontal
          controls now live in the FOOTER (not on the strip). */}
      {/* v0.62.186 — operator (IMG_2507 #1): "close the result when I click the
          location." When the location editor is open (regionExpanded), hide the
          horizontal result strip so the modes + refine field stage cleanly. */}
      {/* v0.62.195 — operator: hide the horizontal result cards while ANY picker
          overlay is open (location editor, cuisine, or local-classic) so the
          overlay reads in front of the map without the cards behind it. */}
      {/* v0.62.578 — operator (IMG_0743: "all the carousel cards disappeared" when
          the location editor opens). The `!regionExpanded` gate hid the carousel
          while re-anchoring; the operator wants the cards to STAY (the editor now
          floats as a compact panel at the top, the cards sit at the bottom — they
          don't overlap). Dropped `!regionExpanded`; still hidden behind a folio
          picker (which floats over the map centre). */}
      {drawerMode === 'horizontal' && !drawerDismissed && !cuisinePickOpen && !classicOpen && (visibleVenues.length || venues.length) > 0 && (
        <ResultDrawer
          venues={visibleVenues.length ? visibleVenues : venues}
          focusedPlaceId={focusedPlaceId}
          onSelect={setFocusedPlaceId}
          specialMode={state.specialMode || null}
          hasFilters={criteriaSummary.length > 0}
          stripLiftPx={stripLiftPx}
          composerOpen={composerOpen}
          nearbyLabel={nearbyFlavours?.single?.label || null}
          nearbyAccent={nearbyFlavours?.single?.accent || null}
          nearbyStrips={nearbyFlavours?.strips || null}
          dishHints={searchedTerm ? [searchedTerm] : null}
          basisClass={drawerBasisClass}
          glassPeek={isWide}
          isShort={vp.isShort}
        />
      )}

      {/* v0.60.84 — ActiveFilters chip bar removed from this slot per
          operator 2026-05-10. The pills now live inside the Search
          criteria header below the title (visible only when collapsed)
          — see the <ActiveFilters /> mount further down. */}

      {/* v0.62.140 — operator: the free-text "What are you craving?" composer
          moved OUT of the page flow into the fixed footer row (see the footer
          rebuild below). */}


      {/* v0.60.166 — operator: on first TMA load, grey-off all
          selections (Edit-search pill, Search-criteria dropdown,
          everything) so the user doesn't interfere with the warm-start
          fetch. The previous in-flow "Please wait…" banner just sat
          inside the layout — interactive elements around it stayed
          tappable. This `fixed inset-0` overlay covers the full
          viewport, gives the page a greyed appearance, captures all
          pointer events (the page underneath is un-clickable), and
          centres the loading card so the state is obvious. Disappears
          the instant warm-start (or the deep-linked first search)
          settles `firstLoadPending=false` AND `loading=false`. */}
      {/* v0.61.50 — the loading overlay now appears for every search,
          not just the first load. The message reflects loadingReason:
          'initial' → "loading random eateries…"; 'rotating' → "Loading…"
          + a title cycling through the 6 operator-specified variants;
          'refresh' → "Refreshing results with the same filters…". */}
      {/* v0.61.297 — operator-reported overlap: FunFactModal + this
          rotating-titles overlay both render at z-50, with the
          rotating-titles on top blocking the fact text. Per the
          v0.61.285 brief ("replace the current wait messages while
          curating results"), the fact modal should REPLACE this
          overlay once a fact has been picked, not coexist with it.
          When `funFact` is truthy, suppress this overlay; the
          FunFactModal takes over as the busy indicator. For the
          first ~1.5 s of a 'rotating' search (before the fact
          gets picked) and for 'initial' / 'refresh' (which never
          pick a fact), this overlay still renders normally. */}
      {/* v0.62.681 — `bootOverlayHold` keeps this on screen for a readable
          minimum on a first open (see the state's declaration); `loading` alone
          could flip false within a frame or two on a warm boot, flashing the
          "Finding eateries…" message past before it could be read. */}
      {(loading || bootOverlayHold) && !funFact && (
        <div
          aria-busy="true"
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 cursor-wait"
          onClick={(e) => e.stopPropagation()}
        >
          {/* v0.62.x — operator: the pop-up "looks 90s". Modernised: blurred
              scrim, rounded-3xl card, softer ring + shadow, roomier padding. */}
          {/* v0.62.x — operator: "make it opaque". The first-load overlay's
              frosted `bg-tg-card/95` + card-level `backdrop-blur` + faint 60%
              border let the map bleed through, so the first load looked
              translucent while the FunFactModal "Did you know?" card was solid.
              Match that card: fully-opaque `bg-tg-card`, bold 2px accent frame,
              `ring-tg-accent/30`, no card backdrop-blur (the wrapper scrim still
              blurs the page behind). */}
          {/* v0.62.x — operator: overlay text is LEFT-justified; the 🛑 Stop
              pill stays RIGHT-justified (its own row below, `justify-end`). */}
          <div className="w-full max-w-[320px] rounded-3xl border-2 border-tg-accent bg-tg-card pl-5 pr-2.5 pt-4 pb-2 text-xs text-tg-text shadow-2xl ring-1 ring-tg-accent/30 text-left">
            {/* v0.62.89 — operator: the 🛑 Stop pill is flushed to the BOTTOM-RIGHT
                corner (own row below the text, near the bottom + right borders) for
                EVERY wait state — the centred/mid-card pill looked off. */}
            {loadingReason === 'rotating' ? (
              <>
                <div className="font-semibold">{t('loading.head', lang)}</div>
                <div className="mt-1">{t('loading.rotating.' + (rotatingIndex + 1), lang)}</div>
              </>
            ) : loadingReason === 'refresh' ? (
              <div>{t('loading.refresh', lang)}</div>
            ) : (
              <>
                {/* v0.62.84 — no ⏳; the blinking dots (one at a time) are the only motion. */}
                <div>{t('loading.initial', lang)}<span aria-hidden className="inline-flex">
                  <span className="animate-blink">.</span>
                  <span className="animate-blink" style={{ animationDelay: '0.25s' }}>.</span>
                  <span className="animate-blink" style={{ animationDelay: '0.5s' }}>.</span>
                </span></div>
                {/* v0.62.82 — the ⭐ twinkles (✨→🌟→⭐→💫) via <AnimatedStar/>. */}
                {ratingReminder && ratingReminder.kind !== 'saved' && (
                  <div className="mt-2 font-semibold">
                    {t(ratingReminder.kind === 'intro' ? 'rating.introTitle' : 'rating.resetTitle', lang).replace(/⭐\s*$/, '')}
                    <AnimatedStar />
                  </div>
                )}
              </>
            )}
            {/* v0.62.78 — first streamed result's name (bold), streaming waits only.
                v0.62.670 — operator (O-85 item 2): was text-blue-900, illegible on a
                dark Telegram theme; now the theme accent, readable in both. */}
            {streamFirstName && (
              <div className="mt-1 font-bold text-tg-accent">{streamFirstName}</div>
            )}
            <div className="mt-1 -mb-0.5 flex justify-end">
              {/* v0.62.90 — liquid-glass pill (frosted + soft 3D highlight). */}
              <button type="button" onClick={stopLoading}
                className="gia-hit glass-pill shrink-0 px-2 py-0.5 rounded-full border-[0.5px] border-tg-warn/70 text-[8px] text-tg-text whitespace-nowrap">
                {t('loading.stop', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v0.60.131 — "Tell me" text read as a question/instruction:
          decline note, no result list. */}
      {questionDeclined && !loading && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[11px] leading-snug text-tg-text">
          🙂 <span className="italic">{lang === 'fr'
            ? 'Je ne réponds pas encore aux questions dans la case « Tell me ». Tapez un plat ou une cuisine (ex. chiffon cake, laksa, ramen), ou choisissez une cuisine ci-dessous.'
            : lang === 'ru'
            ? 'Я пока не отвечаю на вопросы в поле «Tell me». Введите блюдо или кухню (напр. chiffon cake, laksa, ramen) или выберите кухню ниже.'
            : lang === 'de'
            ? 'Fragen im „Tell me“-Feld kann ich noch nicht beantworten. Geben Sie ein Gericht oder eine Küche ein (z. B. chiffon cake, laksa, ramen) oder wählen Sie unten eine Küche.'
            : lang === 'zh'
            ? '“Tell me”框暂时无法回答问题。请输入菜名或菜系（如戚风蛋糕、叻沙、拉面），或在下方选择菜系。'
            : lang === 'ja'
            ? '「Tell me」欄ではまだ質問に答えられません。料理名や料理ジャンルを入力するか（例：シフォンケーキ、ラクサ、ラーメン）、下から料理を選んでください。'
            : lang === 'es'
            ? 'Aun no puedo responder preguntas en el campo "Tell me". Escribe un plato o cocina (p. ej. chiffon cake, laksa, ramen), o elige una cocina abajo.'
            : "I can't answer questions in the “Tell me” box yet. Type a dish or cuisine (e.g. chiffon cake, laksa, ramen), or pick a cuisine below."}</span>
        </div>
      )}

      {/* v0.61.131 — place-anchor pill rendered FIRST (moved up from
          its v0.61.130 position below specialModeNotice). The "where
          am I searching" context outranks the misrepresented-dish
          aside and the limited-matches amber card because it tells
          the user WHERE the visible results come from; the other
          two cards qualify the WHAT/WHY of those same results. */}
      {placeAnchor && !loading && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {placeAnchor.queryRemainder
            ? tn('anchor.showing', lang, { query: placeAnchor.queryRemainder, place: placeAnchor.name })
            : tn('anchor.searching', lang, { place: placeAnchor.name })}
        </div>
      )}

      {/* v0.60.128 — "misrepresented dish" note: when the Tell-me box
          named a dish from the curated table, show the "often assumed X,
          but actually Y" context above the results. */}
      {misrepNote && !loading && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[11px] leading-snug text-tg-text">
          ℹ️ <span className="font-semibold">{misrepNote.name}</span> — {misrepNote.note}
        </div>
      )}

      {/* v0.61.126 — Fruits / Durian "Limited matches nearby" notice
          when the server's mode-keyword post-filter dropped results
          below the spec's 8-12 target. Per scripts/Create_2_buttons.MD
          the message is mode-specific and explicitly does NOT pad
          with unrelated cuisines. */}
      {/* v0.62.13 — zero-result reason: an empty list now explains itself
          (stale-seen "tap 🔍 again" vs a genuinely too-narrow combo vs nothing
          rated nearby) instead of a silent blank. Hidden once results return. */}
      {/* v0.62.292 — operator: when a zero result is showing but the criteria
          have CHANGED since that search (`dirty`), the correct CTA is "tap 🔍
          again", NOT "reset filters" — the old empty list is stale, not a true
          no-match. Show this first and suppress the genuine-zero notices while
          dirty so the messaging never contradicts itself. */}
      {dirty && !loading && venues.length === 0 && (
        <div className="rounded-2xl border border-tg-accent/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {lang === 'fr'
            ? 'Vos critères ont changé — touchez 🔍 pour relancer la recherche.'
            : lang === 'ru'
            ? 'Ваши критерии изменились — нажмите 🔍, чтобы искать снова.'
            : lang === 'de'
            ? 'Ihre Kriterien haben sich geändert — 🔍 tippen, um erneut zu suchen.'
            : lang === 'zh'
            ? '您的条件已更改 — 点击 🔍 重新搜索。'
            : lang === 'ja'
            ? '条件が変更されました — 🔍 をタップして再検索。'
            : lang === 'es'
            ? 'Tus criterios cambiaron — toca 🔍 para buscar de nuevo.'
            : 'Your criteria changed — tap 🔍 to search again.'}
        </div>
      )}
      {zeroReasonKey && !loading && venues.length === 0 && !dirty && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-hint">
          {t(zeroReasonKey, lang)}
        </div>
      )}
      {/* v0.62.14 — durian soft-rating: explain we prefer 3.7★+ but also show
          lower-rated / unrated stalls (a durian stall is a durian stall). */}
      {durianRatingNote && !loading && venues.length > 0 && (
        <div className="rounded-2xl border border-tg-warn/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {t('special.durian.softRating', lang)}
        </div>
      )}
      {/* v0.62.90 — operator: the Widen control is a STICKY per-cuisine SWITCH
          (OFF = nearby ~15 km, ON = wider ~40 km). Stays on across re-taps; the
          cuisine-change effect resets it. Shown while exhausted-at-tight-cap OR
          while widen is on (so it can be switched back off). */}
      {(allSeenInRange || widenActive) && !loading && venues.length > 0 && (
        <div className="rounded-2xl border border-tg-accent/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text flex items-center justify-between gap-2">
          <span className="min-w-0">
            {/* v0.62.92 — honest recycle signal: once the pool (tight OR widened)
                is fully seen, say so truthfully with the real count + cap instead
                of silently repeating. The recycle now rotates server-side, so each
                tap still shows a different window of that pool. When widen is on but
                the pool isn't exhausted yet, show the plain "wider search on" state. */}
            {allSeenInRange
              ? (lang === 'fr'
                  ? `Vous avez vu les ${allSeenInRange.count} adresses dans un rayon de ~${allSeenInRange.capKm} km.`
                  : lang === 'ru'
                  ? `Вы просмотрели все ${allSeenInRange.count} в радиусе ~${allSeenInRange.capKm} км.`
                  : lang === 'de'
                  ? `Sie haben alle ${allSeenInRange.count} im Umkreis von ~${allSeenInRange.capKm} km gesehen.`
                  : lang === 'zh'
                  ? `您已查看 ~${allSeenInRange.capKm} 公里内的全部 ${allSeenInRange.count} 家。`
                  : lang === 'ja'
                  ? `~${allSeenInRange.capKm} km 圏内の ${allSeenInRange.count} 件すべてを表示しました。`
                  : lang === 'es'
                  ? `Has visto las ${allSeenInRange.count} dentro de ~${allSeenInRange.capKm} km.`
                  : `You've seen all ${allSeenInRange.count} within ~${allSeenInRange.capKm} km.`)
              : (lang === 'fr' ? 'Recherche élargie (~40 km).' : lang === 'id' ? 'Pencarian diperluas (~40 km).' : lang === 'ru' ? 'Расширенный поиск (~40 км).' : lang === 'de' ? 'Erweiterte Suche (~40 km).' : lang === 'zh' ? '已开启更大范围搜索（~40 公里）。' : lang === 'ja' ? '広域検索オン（~40 km）。' : lang === 'es' ? 'Busqueda ampliada activada (~40 km).' : 'Wider search on (~40 km).')}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5">
            <span id="gia-widen-label" className="text-[10px] text-tg-hint">{lang === 'fr' ? 'Élargir' : lang === 'id' ? 'Perluas' : lang === 'ru' ? 'Шире' : lang === 'de' ? 'Erweitern' : lang === 'zh' ? '扩大' : lang === 'ja' ? '拡大' : lang === 'es' ? 'Ampliar' : 'Widen'}</span>
            {/* glass switch (track + thumb) */}
            <button type="button" role="switch" aria-checked={widenActive} aria-labelledby="gia-widen-label"
              onClick={() => { const next = !widenActive; setWidenActive(next); runSearch(state, null, { widen: next }); }}
              className={`glass-pill relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-tg-border/40 transition-colors ${widenActive ? 'bg-tg-accent/60' : ''}`}>
              {/* M3 Tier 0 — track is w-9 (36px), thumb w-3.5 (14px), off-inset
                  translate-x-0.5 (2px). On-position corrected to 1.25rem (20px)
                  so the right-side inset also lands at exactly 2px, symmetric
                  with the left; was 1.15rem (18.4px), a 1.6px arithmetic slip. */}
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${widenActive ? 'translate-x-[1.25rem]' : 'translate-x-0.5'}`} />
            </button>
          </span>
        </div>
      )}
      {specialModeNotice && !loading && (
        <div className="rounded-2xl border border-tg-warn/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {t(`special.${specialModeNotice}.limited`, lang)}
          {/* v0.61.130 — append "· widened to N km" when the v0.61.129
              O-23 radius-escalation pass actually ran. The km is rounded
              to one decimal place; the metres-to-km cast is the only
              transformation. */}
          {specialModeWidenedInfo && Number.isFinite(specialModeWidenedInfo.finalM) && (
            <span className="text-tg-hint">
              {' '}{tn('special.widened', lang, { km: (specialModeWidenedInfo.finalM / 1000).toFixed(1) })}
            </span>
          )}
        </div>
      )}

      {/* v0.61.278 — O-25: JB→OTHER fallback notice. Fires when the
          v0.61.276 server graceful exit triggered (JB pill at non-JB
          coords; JB-hybrid filter wiped pool; fell back to OTHER). */}
      {jbFallbackNotice && !loading && (
        <div className="rounded-2xl border border-tg-warn/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {t('banner.jbFallbackToOther', lang)}
        </div>
      )}

      {/* v0.61.441 — transient-blip note. The icon (↻) carries the meaning
          alongside the amber border so it doesn't rely on colour alone. */}
      {degradedNotice && !loading && (
        <div className="rounded-2xl border border-tg-warn/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          <span aria-hidden="true">↻ </span>
          {lang === 'fr'
            ? 'Petit hic réseau lors de la recherche — réappuyez sur 🔍 pour réessayer.'
            : lang === 'ru'
            ? 'Сбой при поиске — нажмите 🔍, чтобы повторить.'
            : lang === 'de'
            ? 'Suchproblem — 🔍 tippen, um erneut zu versuchen.'
            : lang === 'zh'
            ? '搜索出现小故障 — 点击 🔍 重试。'
            : lang === 'ja'
            ? '検索で小さな問題が発生 — 🔍 をタップして再試行。'
            : lang === 'es'
            ? 'Fallo de busqueda — toca 🔍 para reintentar.'
            : 'Search hiccup — tap 🔍 to try again.'}
        </div>
      )}

      {/* v0.61.234 — sparse-coverage hint for African / South African /
          Georgian cuisines where Google Maps SG has genuinely few
          listings. Sets expectation so the user doesn't perceive the
          short result list as a bug. */}
      {sparseNotice && !loading && (
        <div className="rounded-2xl border border-tg-warn/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {lang === 'fr'
            ? `Cuisine peu représentée à Singapour — Google Maps répertorie peu d'établissements ${sparseNotice}. Affichage de toutes les correspondances.`
            : lang === 'ru'
            ? `Кухня слабо представлена в Сингапуре — в Google Maps мало заведений ${sparseNotice}. Показаны все совпадения.`
            : lang === 'de'
            ? `Geringe Abdeckung in Singapur — Google Maps listet wenige ${sparseNotice} Restaurants. Alle Treffer werden angezeigt.`
            : lang === 'zh'
            ? `新加坡覆盖有限 — Google 地图收录的 ${sparseNotice} 餐厅较少。显示所有匹配结果。`
            : lang === 'ja'
            ? `シンガポールでは収録が限られています — Google マップに ${sparseNotice} のレストランは少数です。すべての該当を表示します。`
            : lang === 'es'
            ? `Cobertura limitada en Singapur — Google Maps tiene pocos restaurantes ${sparseNotice}. Mostrando todas las coincidencias.`
            : `Limited coverage in Singapore — Google Maps has few ${sparseNotice} restaurants listed. Showing all matches.`}
        </div>
      )}

      {/* v0.61.437 — Michelin zero/miss notice (code review F5/F6/F7):
          explains an empty Michelin result (no curated list for the picked
          country / country unresolved) or a combo page with zero cuisine
          matches, instead of an unexplained blank. Amber border per the
          operator's no-red rule; ✳️ marks the Michelin context. */}
      {michelinNotice && !loading && (
        <div className="rounded-2xl border border-tg-warn/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          <span aria-hidden className="mr-1">✳️</span>{t(michelinNotice, lang)}
        </div>
      )}

      {/* v0.60.129 — "Did you mean a cooking method?" pivot: tap a
          cuisine chip to re-run the search constrained to that cuisine. */}
      {cookMethodPivot && !loading && cookMethodPivot.matches.length > 0 && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[11px] leading-snug text-tg-text">
          <div className="mb-1.5">🙂 <span className="italic">
            {lang === 'fr'
              ? `Cherchiez-vous peut-être une méthode de cuisson — « ${cookMethodPivot.query} » ?`
              : lang === 'ru'
              ? `Возможно, вы искали способ приготовления — «${cookMethodPivot.query}»?`
              : lang === 'de'
              ? `Suchten Sie vielleicht eine Garmethode — „${cookMethodPivot.query}“?`
              : lang === 'zh'
              ? `您要找的或许是一种烹饪方法 — “${cookMethodPivot.query}”？`
              : lang === 'ja'
              ? `お探しなのは調理法かもしれません — 「${cookMethodPivot.query}」？`
              : lang === 'es'
              ? `Quizas buscabas un metodo de coccion — "${cookMethodPivot.query}"?`
              : `Were you perhaps after a cooking method — "${cookMethodPivot.query}"?`}
          </span></div>
          <div className="flex flex-wrap gap-1.5">
            {cookMethodPivot.matches.map((m) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => {
                  const next = { ...state, cuisines: [m.slug] };
                  setState(next);
                  setCookMethodPivot(null);
                  runSearch(next);
                }}
                className="px-2 py-0.5 rounded-full border border-tg-border text-[11px] text-tg-text hover:bg-tg-border/30"
              >
                {m.cuisine}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* v0.62.138 — the vertical result list is HIDDEN in horizontal mode
          (the floating strip is the result UI then). Kept MOUNTED (not
          unmounted) so its pagination still feeds the map's visible-page
          markers (onPageChange → visibleVenues) and the ↴ toggle reveals it
          instantly. */}
      <ResultSheetShell
        /* v0.62.661 — the landscape-phone static split (staticSplitList) renders
           the list in normal page flow below the bounded map, not inside a
           BottomSheet — so it must NOT be "active" here even though drawerMode
           is 'vertical'. Every other device/orientation is unchanged. */
        active={drawerMode === 'vertical' && !drawerDismissed && !staticSplitList}
        peekPx={listPeekPx}
        label={t('sheet.dragHandle', lang)}
      >
      <div ref={resultPanelRef}
        /* v0.62.594 — bound the panel to the remaining viewport in the portrait-tablet
           listing so its header freezes + the columns scroll independently ("map stays"). */
        style={boundList ? { height: resultBoundH || undefined, overflow: 'hidden' } : undefined}
        className={`${drawerMode === 'vertical' && !drawerDismissed ? (boundList ? 'flex flex-col min-h-0' : '') : 'hidden'} ${resultsFlash ? 'rounded-xl ring-2 ring-tg-accent ring-offset-2 transition-shadow scroll-mt-20' : 'scroll-mt-20'}`}>
        {/* v0.60.149 — Michelin walk-through indicator. Reduces user
            surprise that each 🔍 tap loads 12 of ~130 curated venues
            rather than the whole curated list in one shot (which timed
            out at 40 in v0.60.147 — see journal-0_60_149).
            v0.60.185 — glyph ▶ → 🔍 to match the actual Search button
            the user is tapping. The ▶ metaphor was confusing because
            no ▶ button exists on the TMA. */}
        {/* v0.61.350 — the Michelin "N more to explore" hint moved INTO
            ResultPanel (rendered below the "· Michelin <country>" line) per
            operator: it belongs below the edition line, not above the card. */}
        {/* v0.62.x — (Search Insights strip moved OUT of this hidden vertical
            panel to just under the header, so it's visible in the default map
            view too.) */}
        <ResultPanel
          venues={venues}
          loading={loading}
          dishHints={searchedTerm ? [searchedTerm] : null}
          dishHintMode={searchedTermMode}
          nearbyLabel={nearbyFlavours?.single?.label || null}
          nearbyAccent={nearbyFlavours?.single?.accent || null}
          nearbyStrips={nearbyFlavours?.strips || null}
          /* v0.61.255 — forward specialMode so ResultCard can render
             the "Inquire for seasonal durian pastry" hint when the
             active search is durian-pastry AND the venue name doesn't
             contain "durian" (operator-specified condition). */
          specialMode={state.specialMode || null}
          /* v0.61.240 — operator (Issue 3): tiny combo-criteria line
             below the result title, e.g. "· Japanese · Halal · $$".
             Computed from state.cuisines + state.filters + catalogue. */
          comboLine={(() => {
            const parts = [];
            if (Array.isArray(state.cuisines) && state.cuisines.length && catalogue) {
              const all = [].concat(...catalogue.map((c) => c.cuisines || []));
              for (const slug of state.cuisines) {
                const m = all.find((c) => c.slug === slug);
                // v0.61.350 — Michelin: show the country-aware edition label
                // (server michelinSummary.label) not the static catalogue name.
                if (slug === 'michelin' && michelinRemaining?.label) parts.push(michelinRemaining.label);
                else if (m) parts.push(m.name);
                else parts.push(slug);
              }
            }
            const f = state.filters || {};
            if (f.halal) parts.push(lang === 'fr' ? 'Halal' : lang === 'ru' ? 'Халяль' : lang === 'de' ? 'Halal' : lang === 'zh' ? '清真' : lang === 'ja' ? 'ハラル' : lang === 'es' ? 'Halal' : 'Halal');
            if (f.vegetarian) parts.push(lang === 'fr' ? 'Végétarien' : lang === 'id' ? 'Vegetarian' : lang === 'ru' ? 'Вегетарианское' : lang === 'de' ? 'Vegetarisch' : lang === 'zh' ? '素食' : lang === 'ja' ? 'ベジタリアン' : lang === 'es' ? 'Vegetariano' : 'Vegetarian');
            if (f.recommend) parts.push(lang === 'fr' ? 'Recommander' : lang === 'id' ? 'Rekomendasi' : lang === 'ru' ? 'Рекомендации' : lang === 'de' ? 'Empfehlen' : lang === 'zh' ? '推荐' : lang === 'ja' ? 'おすすめ' : lang === 'es' ? 'Recomendar' : 'Recommend');  // v0.62.37
            if (f.openNow) parts.push(lang === 'fr' ? 'Ouvert' : lang === 'id' ? 'Buka sekarang' : lang === 'ru' ? 'Открыто' : lang === 'de' ? 'Geöffnet' : lang === 'zh' ? '营业中' : lang === 'ja' ? '営業中' : lang === 'es' ? 'Abierto ahora' : 'Open now');
            if (f.homeBased) parts.push(lang === 'fr' ? 'À domicile' : lang === 'id' ? 'Rumahan' : lang === 'ru' ? 'На дому' : lang === 'de' ? 'Privatküche' : lang === 'zh' ? '家庭式' : lang === 'ja' ? '自宅型' : lang === 'es' ? 'Casero' : 'Home-based');
            if (f.petFriendly) parts.push(lang === 'fr' ? 'Animaux acceptés' : lang === 'id' ? 'Ramah hewan' : lang === 'ru' ? 'С питомцами' : lang === 'de' ? 'Tierfreundlich' : lang === 'zh' ? '允许宠物' : lang === 'ja' ? 'ペット可' : lang === 'es' ? 'Admite mascotas' : 'Pet-friendly');
            if (f.newlyOpened) parts.push(lang === 'fr' ? 'Nouveau' : lang === 'id' ? 'Baru buka' : lang === 'ru' ? 'Новое' : lang === 'de' ? 'Neu' : lang === 'zh' ? '新开业' : lang === 'ja' ? '新規開店' : lang === 'es' ? 'Recien abierto' : 'Newly opened');
            if (Array.isArray(f.prices) && f.prices.length) {
              const min = Math.min(...f.prices);
              const max = Math.max(...f.prices);
              parts.push('$'.repeat(min) + (max > min ? '–' + '$'.repeat(max) : ''));
            }
            return parts.length ? parts.join(' · ') : '';
          })()}
          /* v0.61.79 — total size of the curated Michelin pool (~130).
             When set, the result header reads "Results (12/130)" so the
             user sees this batch is a slice of the whole list. null on
             non-Michelin searches → header falls back to "Results (12)". */
          totalCount={michelinRemaining ? (michelinRemaining.total || null) : null}
          michelinHint={(() => {
            const mr = michelinRemaining;
            if (!(mr && mr.remaining > 0 && !loading)) return null;
            const fc = `${mr.countryFlag ? mr.countryFlag + ' ' : ''}${mr.countryName || ''}`.trim();
            // v0.61.351 — city-aware hint: "Explore N more in <City> · M across 🇰🇷 <Country>"
            // when the picked city resolved to a curated Michelin city (multi-city countries).
            if (mr.city && Number.isFinite(mr.cityRemaining)) {
              return lang === 'fr'
                ? `📚 Explorez ${mr.cityRemaining} de plus à ${mr.city} · ${mr.total} dans ${fc}`
                : lang === 'ru'
                ? `📚 Ещё ${mr.cityRemaining} в ${mr.city} · всего ${mr.total} в ${fc}`
                : lang === 'de'
                ? `📚 ${mr.cityRemaining} weitere in ${mr.city} · ${mr.total} in ${fc}`
                : lang === 'zh'
                ? `📚 ${mr.city} 还有 ${mr.cityRemaining} 家 · ${fc} 共 ${mr.total} 家`
                : lang === 'ja'
                ? `📚 ${mr.city} にあと ${mr.cityRemaining} 件 · ${fc} 全体で ${mr.total} 件`
                : lang === 'es'
                ? `📚 Explora ${mr.cityRemaining} mas en ${mr.city} · ${mr.total} en ${fc}`
                : `📚 Explore ${mr.cityRemaining} more in ${mr.city} · ${mr.total} across ${fc}`;
            }
            // v0.61.374 — country-only NEW format (fix A): used for city-states
            // like Singapore (city == country → no redundant "in <City>"):
            // "📚 Explore 69 more · 117 across 🇸🇬 Singapore".
            if (fc) {
              return lang === 'fr'
                ? `📚 Explorez ${mr.remaining} de plus · ${mr.total} dans ${fc}`
                : lang === 'ru'
                ? `📚 Ещё ${mr.remaining} · всего ${mr.total} в ${fc}`
                : lang === 'de'
                ? `📚 ${mr.remaining} weitere · ${mr.total} in ${fc}`
                : lang === 'zh'
                ? `📚 还有 ${mr.remaining} 家 · ${fc} 共 ${mr.total} 家`
                : lang === 'ja'
                ? `📚 あと ${mr.remaining} 件 · ${fc} 全体で ${mr.total} 件`
                : lang === 'es'
                ? `📚 Explora ${mr.remaining} mas · ${mr.total} en ${fc}`
                : `📚 Explore ${mr.remaining} more · ${mr.total} across ${fc}`;
            }
            // Legacy fallback only when no country info resolved at all.
            return lang === 'fr'
              ? `📚 Liste Michelin organisée — ${mr.remaining} de plus à découvrir (${mr.total} au total). Touchez 🔍 pour le prochain groupe de 12.`
              : lang === 'ru'
              ? `📚 Кураторский список Michelin — ещё ${mr.remaining} (всего ${mr.total}). Нажмите 🔍 для следующих 12.`
              : lang === 'de'
              ? `📚 Kuratierte Michelin-Liste — ${mr.remaining} weitere (${mr.total} gesamt). 🔍 tippen für die nächsten 12.`
              : lang === 'zh'
              ? `📚 精选米其林榜单 — 还有 ${mr.remaining} 家待发现（共 ${mr.total} 家）。点击 🔍 查看下一批 12 家。`
              : lang === 'ja'
              ? `📚 厳選ミシュランリスト — あと ${mr.remaining} 件（合計 ${mr.total} 件）。🔍 をタップして次の 12 件へ。`
              : lang === 'es'
              ? `📚 Lista Michelin curada — ${mr.remaining} mas por explorar (${mr.total} en total). Toca 🔍 para los siguientes 12.`
              : `📚 Curated Michelin list — ${mr.remaining} more to explore (${mr.total} in total). Tap 🔍 for the next batch of 12.`;
          })()}
          // v0.60.153 — Michelin-specific "please wait" copy. The
          // handler runs review-extract + LLM narrate + per-venue
          // enrichment-cache fill; cold catalogue takes 5–10 s.
          // Operator: "UI: Asking user to be patience, to curate the
          // list with review."
          loadingHint={
            // v0.60.154 — operator copy + glyph (🎩 → ✳️). Shorter
            // "please wait" framing replaces the longer "curating … hang
            // on" hint that landed in v0.60.153.
            // v0.60.158 — further compressed per operator: "Fetching the
            // latest Michelin information" → "Fetching Michelin Info" so
            // the hint stays on a single mobile line.
            (state.cuisines || []).some((c) => String(c).toLowerCase() === 'michelin')
              ? (lang === 'fr'
                  ? '✳️ Récupération des infos Michelin. Un instant…'
                  : lang === 'ru'
                  ? '✳️ Загружаем данные Michelin. Подождите немного.'
                  : lang === 'de'
                  ? '✳️ Michelin-Infos werden geladen. Einen Moment.'
                  : lang === 'zh'
                  ? '✳️ 正在获取米其林信息，请稍候。'
                  : lang === 'ja'
                  ? '✳️ ミシュラン情報を取得中。少々お待ちください。'
                  : lang === 'es'
                  ? '✳️ Obteniendo info Michelin. Espera un momento.'
                  : '✳️ Fetching Michelin Info. Please wait a moment.')
              : null
          }
          focusedPlaceId={focusedPlaceId}
          onCardTap={setFocusedPlaceId}
          /* v0.62.6 — Michelin city-grouped display. michelinCity = the
             server-resolved set-location city (michelinSummary.city);
             ResultPanel groups the visible batch by awardCity and renders
             city-jump rows. Tapping a city name pans/fits the map to that
             city's visible pins — no reload, no new search, no setLocation
             change, no pagination change. */
          michelinCity={michelinRemaining?.city || null}
          onCityJump={(group) => {
            const pins = pinsOf(group?.venues);
            if (pins.length) setFitPins({ pins, token: 'jump:' + (group.city || '') + ':' + Date.now() });
          }}
          /* v0.62.x — OTHER curated cities in this country (e.g. George Town
             when anchored at Kuala Lumpur). Rendered as tappable nudges that
             re-anchor to that city and search — the reachable path that
             v0.61.445's city-scoped walk always implied but never wired.
             Shown even when the in-city walk is exhausted. */
          michelinOtherCities={michelinRemaining?.otherCities || null}
          onMichelinCityJump={(cityName) => {
            const cc = michelinRemaining?.countryCode;
            const hit = cc ? findCity(cc, cityName) : null;
            if (!hit) return;
            // Re-anchor (commits anchor + region + persists) then search at the
            // new city explicitly, mirroring a LocationField committed pick.
            onLocationSelect({
              lat: hit.lat, lng: hit.lng, label: cityName, fly: true,
              radiusCapM: cityRadiusCapM(hit, cc)
            });
            runSearch(state, { lat: hit.lat, lng: hit.lng });
          }}
          warmStartSeed={warmStartSeed}
          comboInfo={comboInfo}
          specialModeBlocked={specialModeBlocked}
          bootMismatchHalt={bootMismatchHalt}
          copyState={{
            cuisines: state.cuisines,
            filters: state.filters,
            region: state.region,
            location: locationAnchor
          }}
          onPageChange={setVisibleVenues}
          // v0.60.43 — music-player-skip pagination. ▶ on the last
          // page asks the server for the next 40 via the same
          // runSearch path that the 🔍 Search FABs use. The dedup
          // pool rotates server-side. Server's `exhausted` flag
          // suppresses the fetch when all venues have been seen so
          // the centered indicator's wrap-to-1 recycle UX takes over.
          onLastPageNext={() => runSearch(state)}
          exhausted={exhaustedNote}
          // v0.61.170 — range counter fields drive the new "Showing
          // first 24 · More available, click 🔍" / "Result 25-36 ·
          // click 🔍 for next more" / "Final {n} shown" copy.
          firstBatch={firstBatch}
          finalBatch={finalBatch}
          cumulativeStart={cumulativeStart}
          cumulativeEnd={cumulativeEnd}
          // v0.61.174 — monotonic cumulative total + SEEN_CAP for the
          // "Results: {known} · Showing {start}-{end}" / "Results:
          // {cap}+ · Limit reached" title states.
          knownTotal={knownTotal}
          cumulativeCap={CUMULATIVE_CAP}
          // v0.60.146 — per-session clipboard. `pageStackDepth` ≥ 1
          // enables the ⇠ Prev FAB in the strip; tapping it asks the
          // server to pop the most-recent page off the history list
          // and return the one before it.
          pageStackDepth={pageStackDepth}
          sessionFull={sessionFull}
          onBackOnePage={async () => {
            const r = await backOnePage();
            if (r && r.ok && r.page && Array.isArray(r.page.venues)) {
              setVenues(r.page.venues);
              setPageStackDepth(Number.isFinite(r.pageStackDepth) ? r.pageStackDepth : 0);
              setExhaustedNote(false);
              setSessionFull(false);
            }
          }}
          /* v0.62.565 — O-54 (operator: "where are the two columns in portrait
             mode"). On a tablet/desktop the list renders in TWO columns. The
             list only shows on wide in PORTRAIT (landscape is the carousel), so
             isWide → 2 columns is the portrait two-panel grid. Phones → 1. */
          columns={isWide ? 2 : 1}
          /* v0.62.594 — portrait-tablet vertical: freeze the header + scroll the two
             columns independently within the bounded panel (operator "map stays"). */
          boundedColumns={boundList}
        />
        {/* v0.60.115/117 — terminal note when the server returns
            exhausted=true: the user has now seen everything across all
            ~4 query phrasings for these criteria. Tells them the exact
            count and offers a one-tap ↺ Start over (re-fires the search
            with resetSeen so the server wipes the exclusion + variant
            index and the first ~60 come back). Cleared on the next
            non-exhausted search. */}
        {/* v0.60.188 — low-result refresh hint. When the result list
            has venues but fewer than 12, the seen-set is close to
            exhaustion for this criteria; tell the user that the next
            🔍 tap will refresh the batch with the same criteria.
            runSearch detects the same condition and auto-arms
            resetSeen on the next call. Suppressed when exhaustedNote
            (≤2 venues) is already showing its own ↺ Start-over CTA.
            v0.60.191 — Codex fix: the threshold follows the server's
            intended slice (6 on a firstBatch response, 12 otherwise)
            so the planned 6-venue first batch doesn't trigger this
            hint (and the matching auto-reset). See runSearch comment.
            v0.60.194 — also gated by !michelinRemaining: the Michelin
            walk-through has its own indicator + natural exhaustion
            CTA at the end of the 130-venue pool, so the generic <12
            hint MUST NOT appear on its tail page (would otherwise
            read as "10 results for these criteria. Tap 🔍 to refresh…"
            which is misleading — that's just the natural Michelin
            tail, not a thin result set). */}
        {/* v0.61.170 — the v0.60.188 "N results for these criteria.
            Tap 🔍 to refresh." hint is retired. The new ResultPanel
            header carries the equivalent signal explicitly:
            "Result {start}-{end} · click 🔍 for next more" (mid-session)
            or "...No more matching · Change criteria or tap ↺"
            (finalBatch). Removing this hint avoids double-messaging. */}
        {exhaustedNote && !loading && venues.length > 0 && (
          <div className="text-[11px] text-tg-hint italic text-center mt-2 px-2">
            {sessionFull
              ? (lang === 'fr'
                  ? 'Vous avez vu le maximum de 80 lieux pour cette session. Touchez ↻ Recycler pour redémarrer (liste n°1 à nouveau), ou fermez et ré-ouvrez Cuisine.'
                  : lang === 'ru'
                  ? 'Вы просмотрели максимум 80 мест за сессию. Нажмите ↻ Обновить, чтобы начать заново (список №1), или закройте и снова откройте Cuisine.'
                  : lang === 'de'
                  ? 'Sie haben das Maximum von 80 Orten für diese Sitzung gesehen. Tippen Sie ↻ Neu starten (Liste Nr. 1 erneut) oder schließen und öffnen Sie Cuisine neu.'
                  : lang === 'zh'
                  ? '您已查看本次会话上限的 80 个地点。点击 ↻ 回收以重新开始（再次显示第 1 号列表），或关闭并重新打开 Cuisine。'
                  : lang === 'ja'
                  ? 'このセッションの上限 80 件を表示しました。↻ 回収をタップして新しいセッションを開始（再び 1 番のリスト）するか、Cuisine を閉じて開き直してください。'
                  : lang === 'es'
                  ? 'Has visto el maximo de 80 lugares de esta sesion. Toca ↻ Reciclar para iniciar una nueva sesion (lista n.º 1 de nuevo), o cierra y vuelve a abrir Cuisine.'
                  : 'You\'ve seen the 80 maximum for this session. Tap ↻ Recycle to start a fresh session (list #1 again), or close and re-open Cuisine.')
              : (poolCount > 1
                  ? tn('result.exhausted', lang, { n: poolCount })
                  : poolCount === 1
                    ? t('result.exhaustedOne', lang)
                    : t('result.exhaustedNoCount', lang))}
            {/* v0.60.149 — when sessionFull, the ↺ Start over button is
                replaced by a ↻ Recycle button that wipes the per-session
                clipboard (seen + pages + meta) and re-fires the same
                search, returning list #1 again. The existing ↺ Start
                over only resets the per-criteria seen-set, which doesn't
                clear the 80-cap. */}
            {sessionFull ? (
              <button
                type="button"
                onClick={async () => {
                  await recycleSession();
                  setVenues([]);
                  setSessionFull(false);
                  setExhaustedNote(false);
                  setPageStackDepth(0);
                  // v0.60.154 — also wipe the client-side page-history
                  // cache (Codex review on PR #395). Without this, ↻
                  // Recycle wipes the server-side seen/history but the
                  // fresh "list #1 again" is appended to the pre-recycle
                  // stack, so ⇠ Back walks back into stale results and
                  // those pages still count against the 11/17 cap.
                  setPages([]);
                  setCursor(0);
                  runSearch(state);
                }}
                className="ml-1 not-italic underline text-tg-link"
                aria-label={lang === 'fr' ? 'Recycler cette session' : lang === 'id' ? 'Daur ulang sesi ini' : lang === 'ru' ? 'Обновить эту сессию' : lang === 'de' ? 'Diese Sitzung neu starten' : lang === 'zh' ? '回收此会话' : lang === 'ja' ? 'このセッションを回収' : lang === 'es' ? 'Reciclar esta sesion' : 'Recycle this session'}
              >
                {lang === 'fr' ? '↻ Recycler' : lang === 'id' ? '↻ Daur ulang' : lang === 'ru' ? '↻ Обновить' : lang === 'de' ? '↻ Neu' : lang === 'zh' ? '↻ 回收' : lang === 'ja' ? '↻ 回収' : lang === 'es' ? '↻ Reciclar' : '↻ Recycle'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => runSearch(state, null, { resetSeen: true })}
                className="ml-1 not-italic underline text-tg-link"
              >
                {t('result.startOver', lang)}
              </button>
            )}
          </div>
        )}
        {/* v0.60.157 — zero-results CTA. After a search returns 0 venues
            AND the silent auto-retry (with resetSeen) ALSO returns 0,
            this panel renders a prominent "🔄 Reset filters & retry"
            button + a hint to widen the criteria. The criteria builder
            is already opened by runSearch in this branch so the user
            sees their chips immediately above. Tapping the button
            re-fires resetSeen=true; if the response is still zero, the
            panel persists (no flicker). Cleared as soon as the next
            search returns ≥1 venue OR the user changes any criteria. */}
        {zeroRetried && !loading && venues.length === 0 && !dirty && (
          <div className="text-[12px] text-tg-hint text-center mt-2 px-2 py-3 rounded-lg bg-tg-card border border-tg-hint/20">
            <div className="leading-snug">{t('result.noMatchAfterRetry', lang)}</div>
            <button
              type="button"
              onClick={() => {
                setCuisinePickOpen(true);   // v0.62.249 — open the folio picker (was the old criteria sheet)
                setZeroRetried(false);
                lastZeroRetrySnapRef.current = null;
                runSearch(state, null, { resetSeen: true });
              }}
              className="mt-2 inline-block px-3 py-1.5 rounded-full bg-tg-accent text-tg-accent-text text-[12px] font-medium"
            >
              {t('btn.resetFiltersRetry', lang)}
            </button>
          </div>
        )}
      </div>
      </ResultSheetShell>

      {error && <div className="text-xs text-red-500 px-1">⚠️ {error}</div>}

      {/* v0.62.146 — operator: the FOOTER is only the 2 text lines (howto +
          version); every control floats as a FAB over the map for more map
          space. One fixed bottom cluster: corner FAB stacks over the map, then a
          floating free-text bar (second-last row, above Edit-search), then the
          2-line footer. */}
      <div
        ref={footerRef}
        className="fixed inset-x-0 bottom-0 z-30 pointer-events-none px-2 flex flex-col gap-1.5"
        style={{ paddingBottom: 'calc(0.15rem + env(safe-area-inset-bottom, 0px) * 0.5)' }}
      >
        {/* v0.62.192 — operator: the "Reset all" + cuisine/dish chips no longer
            float as a band ABOVE the dock; they now sit as small text INSIDE the
            dock, just below the free-text field (see the ActiveFilters mount). */}
        {/* v0.62.190 — the unified glass command DOCK: rounded-top, full-bleed,
            frosted; free-text + 🔍 on top, a slim control row below, then a tiny
            experimental/region/version tag. A soft top shadow lifts it off the map. */}
        {/* v0.62.206 — operator (dark mode): the dock read as a CURVED card with
            the map showing in the rounded corners. Make it a FLAT full-width band
            (no rounded-t) + more opaque (/92 → /96) so the map doesn't tint it. */}
        {/* v0.62.280 — operator: the opaque band now wraps ONLY the control row +
            footer tag. The free-text composer floats OUT of it (over the map) as a
            glass 💬 FAB that expands to a full-width pill on tap; 🔍 stays right. */}
        {/* v0.62.479 — 🔙 back FAB: renders as the TOP row of this bottom FAB
            flex-col (so it sits one row ABOVE the 🔍 Search FAB by construction —
            same stacking context, no fixed-offset math). Shown only while the
            user has drilled into the cuisine picker (layer >= 1: sub-cuisine
            drawer / dish pop-ups). Per operator: English is emoji-only (the 🔙
            glyph already reads "BACK"); every other locale appends the localised
            word in a small hint font. aria-label always carries the localised word. */}
        {drillDepth >= 1 && (() => {
          const BACK_WORD = { fr: 'Retour', id: 'Kembali', ru: 'Назад', de: 'Zurück', zh: '返回', ja: '戻る', es: 'Atrás' };
          const word = BACK_WORD[lang] || 'Back';
          return (
            <div className="relative z-40 flex justify-end px-0.5">
              <button
                type="button"
                onClick={() => drillBackRef.current?.()}
                aria-label={word}
                className={`pointer-events-auto h-10 rounded-full bg-tg-card/85 liquid-glass border-2 border-tg-hint/60 shadow-lg flex items-center active:scale-95 ${lang === 'en' ? 'w-10 justify-center' : 'px-3 gap-1'}`}
              >
                <span aria-hidden className="text-lg leading-none">🔙</span>
                {lang !== 'en' && <span className="text-[10px] font-semibold leading-none">{word}</span>}
              </button>
            </div>
          );
        })()}
        {(() => {
          const poolExhausted = !!finalBatch && Number.isFinite(knownTotal) && venues && venues.length === knownTotal;
          const searchDisabled = loading || (poolExhausted && !dirty && !selectedCityLocation);
          const pulse = (searchHintActive || searchFabFlash) && !searchDisabled;
          return composerOpen ? (
            /* v0.62.285 — operator: the composer FAB / expanded pill must sit IN
               FRONT of the z-30 result cards. relative z-40 lifts it above. */
            <div className="pointer-events-auto relative z-40">
              <TellMePanel
                value={nlText}
                onChange={setNlText}
                onSubmit={handleNLSubmit}
                onReplace={handleNLReplace}
                lastPrompt={lastPrompt}
                loading={loading}
                searchIcon
                onEmptySearch={triggerSearch}
                searchDisabled={searchDisabled}
                searchPulse={searchHintActive || searchFabFlash}
                autoFocus
                onBlurClose={() => setComposerOpen(false)}
                onCollapse={() => setComposerOpen(false)}
              />
            </div>
          ) : (
            /* v0.62.285 — relative z-40: keep the 💬 collapse + 🔍 Search FABs
               in front of the z-30 result cards (operator BEFORE/AFTER mock). */
            <div className="flex items-center justify-between gap-0 px-0.5 relative z-40">
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                aria-label={lang === 'fr' ? 'Saisir un plat' : lang === 'id' ? 'Ketik yang Anda inginkan' : lang === 'ru' ? 'Введите, что хотите' : lang === 'de' ? 'Gericht eingeben' : lang === 'zh' ? '输入您想吃的' : lang === 'ja' ? '食べたいものを入力' : lang === 'es' ? 'Escribe que se te antoja' : 'Type what you are craving'}
                className="pointer-events-auto w-10 h-10 rounded-full bg-tg-card/75 liquid-glass border-2 border-tg-hint/60 shadow-lg flex items-center justify-center text-lg active:scale-95"
              >💬</button>
              {/* v0.62.x — operator: the insight strip (centre text) sits BETWEEN
                  the 💬 and 🔍 FABs, styled as a neo-glassmorphism pill (75% opaque).
                  pointer-events-none wrapper, only the hero pick is tappable, so it
                  never blocks the result cards floating above. */}
              {!regionExpanded && !cuisinePickOpen && !classicOpen && (
                <ErrorBoundary label="InsightStrip">
                  <InsightStrip
                    inline
                    venues={visibleVenues.length ? visibleVenues : venues}
                    loading={loading}
                    onSelectVenue={(id) => { setFocusedPlaceId(id); setDrawerDismissed(false); }}
                  />
                </ErrorBoundary>
              )}
              <button
                type="button"
                onClick={triggerSearch}
                disabled={searchDisabled}
                aria-label={lang === 'fr' ? 'Rechercher · Trouvez où manger' : lang === 'id' ? 'Cari · Tunjukkan tempat makan' : lang === 'ru' ? 'Поиск · Где поесть' : lang === 'de' ? 'Suchen · Wo essen' : lang === 'zh' ? '搜索 · 显示用餐地点' : lang === 'ja' ? '検索 · 食べる場所を表示' : lang === 'es' ? 'Buscar · Muestra donde comer' : 'Search · Show me places to eat'}
                className={`pointer-events-auto w-10 h-10 rounded-full bg-tg-accent text-tg-accent-text border-2 border-tg-accent-text/40 shadow-lg flex items-center justify-center text-lg disabled:opacity-40 active:scale-95 ${pulse ? 'animate-pulse ring-2 ring-offset-1 ring-tg-accent' : ''}`}
              >🔍</button>
            </div>
          );
        })()}
        {/* v0.62.281 — the active-filter chips moved INTO the "Criteria" dropdown
            in the control row below (was a floating strip here). */}
        {/* THE BAND — v0.62.510: house liquid-glass on the footer (operator).
            Was flat `bg-tg-bg/96 backdrop-blur-md`; now the `.liquid-glass-dock`
            surface (frosted blur + saturate + glass edge, up-cast lift shadow)
            over `bg-tg-bg/80`. Dark mode still drops onto a near-opaque base so
            the map can't tint it (the v0.62.206/209 fix, carried into the class). */}
        {/* v0.62.649 — operator: "the footer be 75% liquid glass effect which is
            the standard" (was /80). Hawker + Transport now carry the same
            `.liquid-glass-dock` at the same 75 %. */}
        <div className="pointer-events-auto -mx-2 px-3 pt-1.5 pb-1 liquid-glass-dock bg-tg-bg/75 flex flex-col gap-1">
          {/* slim control row — results · layout · next  |  down · end. Inline icon
              chips (no bordered cards); aria-labels carry the full text. */}
          {/* v0.62.673 — row 1 converted from `flex justify-between` to an explicit
              3-column grid (1fr auto 1fr) so a centre region can be TRUE-centred
              regardless of how wide the left/right clusters are — `justify-between`
              only guarantees equal SPACING, not a centred middle child. Per-region
              contents are unchanged; only the layout technique changed. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-[11px] font-semibold text-tg-link">
            <div className="flex items-center gap-0.5 min-w-0 justify-self-start">
              <button
                type="button"
                onClick={() => setDrawerDismissed((d) => !d)}
                aria-label={drawerDismissed
                  ? (lang === 'fr' ? 'Afficher les résultats' : lang === 'id' ? 'Tampilkan hasil' : lang === 'ru' ? 'Показать результаты' : lang === 'de' ? 'Ergebnisse anzeigen' : lang === 'zh' ? '显示结果' : lang === 'ja' ? '結果を表示' : lang === 'es' ? 'Mostrar resultados' : 'Show results')
                  : (lang === 'fr' ? 'Masquer les résultats' : lang === 'id' ? 'Sembunyikan hasil' : lang === 'ru' ? 'Скрыть результаты' : lang === 'de' ? 'Ergebnisse ausblenden' : lang === 'zh' ? '隐藏结果' : lang === 'ja' ? '結果を隠す' : lang === 'es' ? 'Ocultar resultados' : 'Hide results')}
                className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
              >{drawerDismissed
                ? `📖 ${lang === 'fr' ? 'afficher résultats' : lang === 'id' ? 'tampilkan hasil' : lang === 'ru' ? 'показать' : lang === 'de' ? 'anzeigen' : lang === 'zh' ? '显示结果' : lang === 'ja' ? '結果を表示' : lang === 'es' ? 'mostrar resultados' : 'show results'}`
                : `📘 ${lang === 'fr' ? 'masquer résultats' : lang === 'id' ? 'sembunyikan hasil' : lang === 'ru' ? 'скрыть' : lang === 'de' ? 'ausblenden' : lang === 'zh' ? '隐藏结果' : lang === 'ja' ? '結果を隠す' : lang === 'es' ? 'ocultar resultados' : 'hide results'}`}</button>
              {/* v0.62.564 — the manual list/map toggle is hidden only in wide
                  LANDSCAPE (carousel-only there). v0.62.567 (operator): show it in
                  PORTRAIT tablet too so the user can switch the two-panel list ⇄ the
                  full carousel from the footer (in addition to the map's ⇲/⇱).
                  Phones keep it always. */}
              {/* v0.62.564 hid this toggle in wide LANDSCAPE (carousel-only there),
                  which left a desktop user with NO route to the list at all.
                  v0.62.654 — operator ("make all three consistent"): Hawker and
                  Train show their ⊿ List / ◸ Map toggle on every device, so this
                  one does too. `drawerDismissed` still hides it, as before. */}
              {!drawerDismissed && (
                <button
                  type="button"
                  onClick={() => {
                    const next = drawerMode === 'horizontal' ? 'vertical' : 'horizontal';
                    setDrawerMode(next);
                    // v0.62.177 — switching TO vertical scrolls to the list start
                    // ("Results #") + a brief highlight so the user sees where it is.
                    if (next === 'vertical') {
                      setResultsFlash(true);
                      setTimeout(() => resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                      setTimeout(() => setResultsFlash(false), 1700);
                    }
                  }}
                  aria-label={drawerMode === 'horizontal'
                    ? (lang === 'fr' ? 'Affichage vertical' : lang === 'id' ? 'Tampilan vertikal' : lang === 'ru' ? 'Вертикальный вид' : lang === 'de' ? 'Vertikale Ansicht' : lang === 'zh' ? '垂直布局' : lang === 'ja' ? '縦レイアウト' : lang === 'es' ? 'Diseno vertical' : 'Vertical layout')
                    : (lang === 'fr' ? 'Affichage horizontal' : lang === 'id' ? 'Tampilan horizontal' : lang === 'ru' ? 'Горизонтальный вид' : lang === 'de' ? 'Horizontale Ansicht' : lang === 'zh' ? '水平布局' : lang === 'ja' ? '横レイアウト' : lang === 'es' ? 'Diseno horizontal' : 'Horizontal layout')}
                  className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
                >{drawerMode === 'horizontal'
                  ? `⊿ ${lang === 'fr' ? 'liste' : lang === 'id' ? 'daftar' : lang === 'ru' ? 'список' : lang === 'de' ? 'Liste' : lang === 'zh' ? '列表' : lang === 'ja' ? 'リスト' : lang === 'es' ? 'lista' : 'list'}`
                  : `◸ ${lang === 'fr' ? 'carte' : lang === 'id' ? 'peta' : lang === 'ru' ? 'карта' : lang === 'de' ? 'Karte' : lang === 'zh' ? '地图' : lang === 'ja' ? '地図' : lang === 'es' ? 'mapa' : 'map'}`}</button>
              )}
              {/* v0.62.673 — hidden specifically when the new Michelin footer-centre
                  pager is also showing (isMichelinMode && michelinTotalPages > 1):
                  that pager's '›' already covers this exact replay case PLUS
                  fresh-fetch, so keeping both would duplicate forward navigation
                  for Michelin results. Unrelated searches keep this button
                  exactly as before. */}
              {cursor < pages.length - 1 && !(isMichelinMode && michelinTotalPages > 1) && (
                <button
                  type="button"
                  onClick={() => setCursor((c) => Math.min(pages.length - 1, c + 1))}
                  aria-label={lang === 'fr' ? 'Liste suivante' : lang === 'id' ? 'Daftar berikutnya' : lang === 'ru' ? 'Следующий список' : lang === 'de' ? 'Nächste Liste' : lang === 'zh' ? '下一个列表' : lang === 'ja' ? '次のリスト' : lang === 'es' ? 'Siguiente lista' : 'Next list'}
                  className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
                >⇢ {lang === 'fr' ? 'suivant' : lang === 'id' ? 'berikutnya' : lang === 'ru' ? 'далее' : lang === 'de' ? 'weiter' : lang === 'zh' ? '下一个' : lang === 'ja' ? '次へ' : lang === 'es' ? 'siguiente' : 'next'}</button>
              )}
            </div>
            {/* v0.62.673 — the footer's centre grid cell. Holds the pre-existing
                Criteria dropdown AND/OR the new Michelin pager (v0.62.673); either,
                both, or neither can be present, and the cell collapses to its
                content when both are absent (no visual change from before). */}
            {(criteriaSummary.length > 0 || (isMichelinMode && michelinTotalPages > 1)) && (
              <div className="flex items-center justify-center gap-1 shrink-0 justify-self-center">
                {/* v0.62.281 — "Criteria" dropdown: collapses the active-filter
                    chips; tap to open, tap a chip's × to drop a cuisine + re-search. */}
                {criteriaSummary.length > 0 && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setCriteriaOpen((o) => !o)}
                      aria-haspopup="true"
                      aria-expanded={criteriaOpen}
                      className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap inline-flex items-center gap-0.5"
                    >{lang === 'fr' ? 'Critères' : lang === 'id' ? 'Kriteria' : lang === 'ru' ? 'Критерии' : lang === 'de' ? 'Kriterien' : lang === 'zh' ? '条件' : lang === 'ja' ? '条件' : lang === 'es' ? 'Criterios' : 'Criteria'} ({criteriaSummary.length}) <span aria-hidden className="text-tg-hint">{criteriaOpen ? '▴' : '▾'}</span></button>
                    {criteriaOpen && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-40 rounded-xl border border-tg-border bg-tg-card shadow-lg max-h-[40vh] overflow-y-auto p-2 min-w-[220px] max-w-[80vw]">
                        <ActiveFilters
                          cuisines={state.cuisines}
                          filters={state.filters}
                          onRemoveCuisine={removeCuisine}
                          onRemoveFilter={removeFilter}
                          onResetAll={clearAll}
                          nameForCuisine={(slug) => {
                            // v0.62.825 — the criteria popup was the LAST place still
                            // naming cuisines in English. It read the catalogue map raw
                            // while the pill two components up passed the same value
                            // through cuisineName(); NAMES carries all 69 catalogue
                            // cuisines in fr/zh/ja/es, so a Japanese reader had 69
                            // translations sitting unused one function call away.
                            // (id/ru/de are absent from NAMES and still fall back to
                            // English here — the same as everywhere else that calls it.)
                            if (slug === 'michelin') return t('cat.michelinBib', lang);
                            const en = cuisineNameBySlug.get(slug);
                            return en ? cuisineName(slug, en, lang) : null;
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* v0.62.673 — Michelin footer-centre pagination. `page` = an
                    already-fetched server batch (operator's explicit architecture
                    call), reusing the pre-existing `pages`/`cursor` history and its
                    `useEffect` restore (App.jsx ~:946) — Prev/replay-Next just move
                    `cursor`; fresh-Next (at the cache tip) calls the same
                    `runSearch(state)` ResultPanel's own '▶ next batch' button
                    already uses (App.jsx :5210), so no new fetch mechanism was
                    introduced.
                    v0.62.674 — operator (device screenshot): the total was
                    `pages.length` (batches actually fetched), which is BY
                    DEFINITION always equal to the numerator (`cursor+1`) at the
                    cache tip — the display could never show anything but "N/N"
                    ("1/1", then "2/2", …), never a real remaining count. Switched
                    to `michelinTotalPages`, derived from the server's own
                    `michelinRemaining.total` (the actual Michelin Star/Bib
                    Gourmand count matching current criteria) ÷ a page size of
                    9 — "2/6" now means what it says. The pager's VISIBILITY
                    gate moves to this real total too, so it shows from the
                    very FIRST batch (once the server has reported a total >
                    one page) instead of only after the user has already
                    stepped forward once.
                    v0.62.675 — operator correction: divisor was 12 (matching
                    ResultPanel.jsx's fetch-batch PAGE_SIZE); the operator's
                    own worked example ("140 / 9 cards per page = 15 pages")
                    specifies 9, a DISPLAY-ONLY denominator decoupled from the
                    actual 12-per-tap server fetch batch — the numerator
                    (`cursor+1`) still counts fetched batches of 12, so the
                    two axes of this counter are deliberately not the same
                    unit (disclosed, not silently reconciled). */}
                {isMichelinMode && michelinTotalPages > 1 && (
                  <nav
                    aria-label={lang === 'fr' ? 'Pages de résultats Michelin' : lang === 'id' ? 'Halaman hasil Michelin' : lang === 'ru' ? 'Страницы результатов Michelin' : lang === 'de' ? 'Michelin-Ergebnisseiten' : lang === 'zh' ? '米其林结果页面' : lang === 'ja' ? 'ミシュラン結果ページ' : lang === 'es' ? 'Páginas de resultados Michelin' : 'Michelin result pages'}
                    className="flex items-center gap-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => { if (cursor > 0) setCursor((c) => Math.max(0, c - 1)); }}
                      disabled={cursor === 0}
                      aria-label={lang === 'fr' ? 'Page précédente des résultats Michelin' : lang === 'id' ? 'Halaman Michelin sebelumnya' : lang === 'ru' ? 'Предыдущая страница Michelin' : lang === 'de' ? 'Vorherige Michelin-Ergebnisseite' : lang === 'zh' ? '上一页米其林结果' : lang === 'ja' ? '前のミシュラン結果ページ' : lang === 'es' ? 'Página anterior de resultados Michelin' : 'Previous Michelin results page'}
                      className="gia-hit-y px-1 py-1.5 rounded-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >‹</button>
                    <span className="tabular-nums px-0.5" aria-live="polite">{cursor + 1} / {michelinTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (cursor < pages.length - 1) { setCursor((c) => Math.min(pages.length - 1, c + 1)); return; }
                        if (!exhaustedNote) runSearch(state);
                      }}
                      disabled={exhaustedNote && cursor === pages.length - 1}
                      aria-label={lang === 'fr' ? 'Page suivante des résultats Michelin' : lang === 'id' ? 'Halaman Michelin berikutnya' : lang === 'ru' ? 'Следующая страница Michelin' : lang === 'de' ? 'Nächste Michelin-Ergebnisseite' : lang === 'zh' ? '下一页米其林结果' : lang === 'ja' ? '次のミシュランページ' : lang === 'es' ? 'Página siguiente de resultados Michelin' : 'Next Michelin results page'}
                      className="gia-hit-y px-1 py-1.5 rounded-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >›</button>
                  </nav>
                )}
              </div>
            )}
            {/* v0.62.686 — operator: "the 'top' and 'end' are meant to be on the
                right side. let's audit them." They were not, and the cause is
                CSS Grid auto-placement, not the alignment class.
                The row is `grid-cols-[1fr_auto_1fr]` with THREE intended
                children, but the MIDDLE one (Criteria pill / Michelin pager) is
                gated on `criteriaSummary.length > 0 || michelinTotalPages > 1`.
                With no criteria and no pager the middle child does not render,
                so auto-placement drops this cluster into column 2 — the `auto`
                column, sized to its own content — and `justify-self-end` then
                aligns it to the end of THAT column, leaving the whole third
                `1fr` column empty to its right. The result is a cluster that
                floats mid-row, exactly as the operator's screenshots show (and
                it looked correct in the older screenshots precisely because a
                "Criteria (1)" pill was present there, filling column 2).
                `col-start-3` pins this cluster to the last column whether or not
                the middle cell renders. */}
            <div className="col-start-3 flex items-center gap-0.5 shrink-0 justify-self-end">
              <button
                type="button"
                onClick={() => window.scrollTo({
                  top: scrolledPastHero ? 0 : window.scrollY + window.innerHeight,
                  behavior: 'smooth'
                })}
                aria-label={scrolledPastHero ? t('btn.backToTop', lang) : 'Scroll down'}
                className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
              >{scrolledPastHero ? t('btn.topShort', lang) : t('btn.downShort', lang)}</button>
              <button
                type="button"
                onClick={() => {
                  if (cursor > 0) { setCursor((c) => Math.max(0, c - 1)); return; }
                  const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
                  if (w && typeof w.close === 'function') {
                    try { w.close(); } catch { /* webview tearing down */ }
                    setTimeout(() => { try { w.close(); } catch { /* noop */ } }, 350);
                  }
                }}
                aria-label={cursor > 0 ? t('btn.fabBackAria', lang) : t('btn.fabEndAria', lang)}
                className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
              >{cursor > 0 ? `↩ ${t('btn.fabBack', lang)}` : `🔚 ${t('btn.fabEnd', lang)}`}</button>
            </div>
          </div>
          {/* tiny experimental / region / version tag (was 2 footer text lines). */}
          <div className="text-[9px] text-tg-hint text-center leading-none pb-0.5 pointer-events-none">
            {t('footer.experimental', lang)} · {
              state.region === 'JB' ? t('region.johor', lang)
              : state.region === 'OTHER' ? t('region.others', lang)
              : t('region.singapore', lang)
            } · v{BUILD_VERSION}{footerTag ? ` · ${footerTag}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
