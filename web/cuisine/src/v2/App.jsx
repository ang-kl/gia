import React, { useEffect, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery, warmStart, fetchUserLocation, reverseGeocode, saveUserLocation, fetchCountryPref, saveCountryPref, startSession, backOnePage, recycleSession, iataSnap } from './lib/api.js';
import { IATA_CITIES, nearestIataCity } from './lib/iata-cities.js';
import { OTHER_COUNTRIES } from './lib/countries.js';
import { CITIES_BY_COUNTRY } from './lib/cities.js';
import { defaultState, clearedFilters, readFromHash, readOverridesFromHash, writeToHash } from './lib/state.js';
import { coordsToCountry, isJbCoords } from './lib/coords-to-country.js';
import { startLocationSync } from './lib/location-sync.js';
import { shouldFollowDevice } from './lib/location-follow.js';
import { resolveSearchCenter } from './lib/search-location.js';
// v0.61.277 — for the JB region-pill auto-anchor on tap.
import { JB_FOCUS_POINTS, JB_FOCUS_DEFAULT } from './lib/jb-focus-points.js';
// v0.61.285 — fun-fact modal for the rotating-search wait window.
import FunFactModal from './components/FunFactModal.jsx';
import { pickFunFact } from './lib/fun-facts.js';
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
import LocaleToggle from './components/LocaleToggle.jsx';
import BackFab from './components/BackFab.jsx';
import WeatherBadge from './components/WeatherBadge.jsx';
import { useLocale, t, tn } from './lib/i18n.js';
import { tg } from '../api/tg.js';
import { giaToggleStyle } from './lib/mapOverlays.js';

// v0.61.362 — countries the Cuisine OTHER picker can represent. The
// 20 s location-sync only follows the device into one of these (else it
// leaves region/countryPref untouched).
const CUISINE_OTHER_CODES = new Set(OTHER_COUNTRIES.map((c) => c.code));

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
  const [catalogue, setCatalogue] = useState(null);
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
        saveUserLocation({ lat: loc.lat, lng: loc.lng }).catch(() => {});
      },
    });
    return stop;
  }, []); // eslint-disable-line
  const [venues, setVenues] = useState([]);
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
  // v0.61.397 — operator: durian / fruits / durian-pastry are blocked
  // outside the SE-Asian durian belt (SG/MY/ID/TH/PH/BN). The server
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
  const [loading, setLoading] = useState(true);
  // v0.61.50 — loading-overlay message variant + rotating-title index.
  // 'initial' (boot) → "loading random eateries…"; 'rotating' (user
  // search w/ changed criteria) → cycles through 6 titles; 'refresh'
  // (user search w/ unchanged criteria) → "refreshing same filters…".
  const [loadingReason, setLoadingReason] = useState('initial');
  const [rotatingIndex, setRotatingIndex] = useState(0);
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
        const fact = pickFunFact({
          cuisines: state.cuisines,
          region: state.region,
          countryPref: state.countryPref
        });
        if (fact) setFunFact(fact);
      } catch { /* swallow — never break the search on a modal-pick error */ }
    };
    let intervalId = null;
    const startId = setTimeout(() => {
      pick();
      intervalId = setInterval(pick, 15000); // re-trigger every 15 s
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
  const [error, setError] = useState(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState(null);
  // v0.61.0 — map overlay layer toggles. Map-view state only; kept out
  // of `state` so it never enters the search query or a saved snapshot.
  const [overlayLayers, setOverlayLayers] = useState({ attractions: false, carpark: false, busstop: false, colour: true, train: true, exits: false, taxis: false, parks: false, police: false, clinics: false, hospitals: false });
  // v0.59.0: collapsible "Search criteria" section. Default collapsed
  // when a search has already produced results so the user can scan
  // results without scrolling past the builder.
  // v0.60.47: default closed on first render — the warm-start fetch
  // takes ~4s and an open builder dominating the viewport while
  // results loaded behind it confused users. Now the page opens
  // calm; once warm-start finishes we briefly pulse the "Edit search"
  // pill so the builder is discoverable without forcing it open.
  const [criteriaOpen, setCriteriaOpen] = useState(false);
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
  // v0.59.1: floating Search + Top buttons. `↑ Top` only surfaces
  // once the user has scrolled past the hero (map + active chips).
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
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
    if (anchorActive && (locationAnchor.name || '').trim()) { setLocationName(locationAnchor.name.trim()); return; }
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
      const reached = (window.scrollY || 0) + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setScrolledPastHero(reached >= fullH - 50);
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
    fetchCatalogue()
      .then((d) => setCatalogue(d.categories || []))
      .catch((err) => console.warn('[Cuisine-TMA-v2] catalogue fetch failed:', err));
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
          }
          // v0.61.205 — track anchor precinctId so the OTHER pill can
          // show the Putrajaya flag PNG when the anchor is IOI Resort
          // City (other OTHER anchors stay on 🌏).
          if (r.precinctId) setAnchorPrecinctId(r.precinctId);
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
          console.log('[Cuisine-TMA-v2] tryServerCache: HIT', r);
          return true;
        }
        console.log('[Cuisine-TMA-v2] tryServerCache: MISS (no/stale/zero cache)');
      } catch (err) { console.log('[Cuisine-TMA-v2] tryServerCache: ERROR', err.message); }
      return false;
    }

    function tryGps() {
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
      setState((s) => (s.countryPref === r.countryCode ? s : { ...s, countryPref: r.countryCode }));
    })();
    return () => { cancelled = true; };
  }, []);

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

  const coherenceCheckedRef = useRef(false);
  const [coherenceMismatch, setCoherenceMismatch] = useState(null);
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
      setCoherenceMismatch({ saved: state.countryPref, coords: coordsCountry });
      modalPendingRef.current = true;  // v0.61.322 — hold the splash gate shut
      console.log(`[Cuisine-TMA-v2] coherence MISMATCH saved=${state.countryPref} coords=${coordsCountry}`);
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
    setRegionMismatch({ coordsCountry });
    modalPendingRef.current = true;  // v0.61.322 — hold the splash gate shut
    console.log(`[Cuisine-TMA-v2] region/coords MISMATCH: region=JB but coords=${userLoc.lat.toFixed(2)},${userLoc.lng.toFixed(2)} (country guess=${coordsCountry || '?'})`);
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
    if (km <= 150) { anchorCoherenceCheckedRef.current = true; return; }
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
    console.log(`[Cuisine-TMA-v2] anchor/device differ (${km.toFixed(0)}km) → keeping the SET-LOCATION (authoritative); device GPS not overriding`);
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
      runInitialLoad();
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
            : `Location moved to ${anchorMismatch.deviceLabel}`)
            + (anchorMismatch.anchorLabel
              ? (lang === 'fr' ? ` · 📍 pour revenir à ${anchorMismatch.anchorLabel}` : ` · 📍 to return to ${anchorMismatch.anchorLabel}`)
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
        if (r.label && typeof r.label === 'string' && r.label.trim()) {
          setLocationAnchor({
            lat: r.lat,
            lng: r.lng,
            name: r.label.trim()
          });
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
      saveUserLocation({ lat: target.lat, lng: target.lng }).catch(() => {});
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
      runSearch(state, { lat: locationAnchor.lat, lng: locationAnchor.lng });
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
    runSearch(state, { lat: center.lat, lng: center.lng });
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

  async function runSearch(snap = state, anchor = null, opts = {}) {
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
        resetSeen: opts?.resetSeen === true || autoResetOnLowCount,  // v0.60.117 / v0.60.188
        freeText: (typeof nlText === 'string' && nlText.trim()) ? nlText.trim() : undefined,  // v0.60.126 — Tell-me box as a qualifier
        specialMode: snap.specialMode || null,           // v0.61.126 — Fruits / Durian exclusive mode override
        // v0.61.271 — Phase 3 SSOT: forward state.countryPref so the
        // server uses the user's explicit country pick instead of
        // inferring from cached anchor (which may be stale). Only
        // sent when region is OTHER/MY-PUT — SG/JB regions carry
        // their country implicitly through `region`.
        countryCode: (snap.region === 'OTHER' || snap.region === 'MY-PUT') ? snap.countryPref : undefined
      });
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
        // Schedule the retry in a microtask so the current `finally`
        // (setLoading(false)) runs first, then the retry's setLoading(true)
        // re-fires the spinner. Without this the spinner appears to skip.
        Promise.resolve().then(() => runSearch(snap, anchor, { resetSeen: true }));
        // Fall through to the regular zero-result setters below; the
        // retry will overwrite them on success.
      } else if (isZeroResult && isRetryCall && !r.specialModeBlocked) {
        // The retry came back zero too — show the CTA + open criteria.
        setZeroRetried(true);
        setCriteriaOpen(true);
      } else if (!isZeroResult) {
        // Non-zero result clears the flag + ref so a future criteria
        // signature that returns zero can get its own retry budget.
        setZeroRetried(false);
        lastZeroRetrySnapRef.current = null;
      }
      setVenues(r.venues || []);
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
      // v0.61.397 — server blocked the durian/fruits/durian-pastry mode for
      // a country outside the SE-Asian durian belt. { mode, country } or null.
      setSpecialModeBlocked(r.specialModeBlocked || null);
      // v0.61.278 — O-25: JB-hybrid graceful-exit signal from server.
      setJbFallbackNotice(r.jbFallbackToOther === true);
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
        setCriteriaOpen(false);
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
          countryFlag: r.michelinSummary.countryFlag || ''
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
    } catch (err) {
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
      setComboInfo(null);  // v0.60.82 — NL query bypasses the AND/OR combo logic
      setFirstLoadPending(false);
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
    setLoadingReason(lastRunSnap !== null && !dirty ? 'refresh' : 'rotating');
    // v0.61.354 — if a city is previewed, 🔍 COMMITS it as the active search
    // location (and searches there). Reuse onLocationSelect WITHOUT cityPreview
    // so the full commit runs (anchor + searchCenter + region + server persist
    // + auto-fire). Otherwise search at the existing confirmed anchor.
    if (selectedCityLocation && Number.isFinite(selectedCityLocation.lat) && Number.isFinite(selectedCityLocation.lng)) {
      const sc = selectedCityLocation;
      setSelectedCityLocation(null);
      onLocationSelect({ lat: sc.lat, lng: sc.lng, label: sc.name || '',
        ...(Number.isFinite(sc.radiusCapM) && sc.radiusCapM > 0 ? { radiusCapM: sc.radiusCapM } : {}) });
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

  // v0.61.29 — LocationField pick handler, hoisted to a named callback
  // so the field can render in the banner slot above the map instead
  // of inside the collapsed Search-criteria section.
  function onLocationSelect(p) {
    if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) {
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
        }, 350);
        return;
      }
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
        }).catch(() => {});
      }
      // v0.61.237 — auto-fire the search with the explicit new anchor.
      // Microtask deferral so the locationAnchor + searchCenter state
      // updates have committed before runSearch reads `state`.
      // v0.61.241 — OTHER city-dropdown picks pass noAutoFire (operator:
      // "you fire search after selecting the city is wrong. It should
      // wait until clicking the search button."). Free-text picks +
      // SG/JB Autocomplete picks still auto-fire — that flow already
      // has a search gesture baked in.
      if ((p.label || '').trim() && !p.noAutoFire) {
        Promise.resolve().then(() => runSearch(state, { lat: p.lat, lng: p.lng }));
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
          aria-label={lang === 'fr' ? 'Conflit de localisation' : 'Location mismatch'}
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 className="text-sm font-semibold flex-1">
                {lang === 'fr' ? 'Conflit de localisation' : 'Location mismatch'}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text">
              {lang === 'fr'
                ? `Vous aviez choisi ${coherenceMismatch.saved} précédemment, mais votre appareil est actuellement en ${coherenceMismatch.coords === 'SG' ? 'Singapour' : 'Malaisie'}.`
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
                  : `Use ${coherenceMismatch.coords === 'SG' ? 'Singapore' : 'Malaysia'}`}
              </button>
              <button
                type="button"
                onClick={() => applyCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm"
              >
                {lang === 'fr'
                  ? `Garder ${coherenceMismatch.saved}`
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
          aria-label={lang === 'fr' ? 'Conflit de région' : 'Region mismatch'}
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 className="text-sm font-semibold flex-1">
                {lang === 'fr' ? 'Conflit de région' : 'Region mismatch'}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text">
              {lang === 'fr'
                ? "La région Johor Bahru est sélectionnée, mais vous n'êtes pas à Johor. Les résultats de cuisine seront filtrés à vide."
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
                  : (regionMismatch.coordsCountry === 'SG' ? 'Switch to Singapore' : 'Switch to Others')}
              </button>
              <button
                type="button"
                onClick={() => applyRegionCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm"
              >
                {lang === 'fr' ? 'Rester sur JB' : 'Stay on JB'}
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
            className="pointer-events-auto max-w-sm rounded-2xl border border-amber-500/40 bg-tg-card/95 px-3 py-2 text-left text-[12px] leading-snug text-tg-text shadow-lg backdrop-blur"
          >
            {locMoveNote.text}
          </button>
        </div>
      )}
      {anchorMismatch && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'fr' ? 'Conflit de localisation' : 'Location mismatch'}
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 className="text-sm font-semibold flex-1">
                {lang === 'fr' ? 'Conflit de localisation' : 'Location mismatch'}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text break-words">
              {lang === 'fr'
                ? `Votre lieu enregistré est ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}, mais vous semblez vous trouver à ${anchorMismatch.deviceLabel}.`
                : `Your saved spot is ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}, but you appear to be at ${anchorMismatch.deviceLabel}.`}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => applyAnchorCoherenceChoice(true)}
                className="w-full px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text text-sm font-semibold break-words line-clamp-2"
              >
                {lang === 'fr' ? `Utiliser ${anchorMismatch.deviceLabel}` : `Use ${anchorMismatch.deviceLabel}`}
              </button>
              <button
                type="button"
                onClick={() => applyAnchorCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm break-words line-clamp-2"
              >
                {lang === 'fr' ? `Garder ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}` : `Keep ${anchorMismatch.anchorLabel || anchorMismatch.anchorName}`}
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
          paddingBottom: 'env(safe-area-inset-bottom, 0)'
        }}
      >
        {locationModals}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center" role="status" aria-live="polite">
          <div className="h-8 w-8 rounded-full border-2 border-tg-hint/30 border-t-tg-accent animate-spin" aria-hidden />
          <div className="text-sm text-tg-hint">{lang === 'fr' ? 'Confirmation de votre position…' : 'Confirming your location…'}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-tg-bg text-tg-text py-3 flex flex-col gap-2 max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8"
      style={{
        // v0.59.20: use Telegram's stable viewport variable so the
        // container tracks the *visible* iframe height, not the buggy
        // 100vh that iPad WebView resolves to the full sheet (including
        // Telegram's bottom chrome) and leaves a drag-up gap.
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      {/* v0.61.285 — fun-fact modal during the rotating-search wait
          window. NLB-sourced food-history facts replace the generic
          "still loading" rotating-titles. Visible only when a fact
          has been picked (1.5 s into a rotating search); the modal
          itself enforces a 3 s on-screen minimum so a fast search
          doesn't yank it mid-sentence. */}
      <FunFactModal fact={funFact} visible={loading && !!funFact} />

      {/* v0.61.322 — the three coherence modals (extracted above into
          `locationModals`, shared with the splash-gate early-return). */}
      {locationModals}
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="soleat-icon.png" alt="soleat" width="24" height="24" className="rounded-full flex-shrink-0" />
            <h1 className="text-lg font-bold leading-tight truncate">Cuisine</h1>
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
        <div className="flex gap-1.5">
          {[
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
            const sel = (state.region || 'SG') === r.id;
            return (
              <button key={r.id} type="button"
                onClick={() => {
                  setState((s) => {
                    // v0.60.199 — ✳️ Michelin list is SG-only; when the
                    // user toggles away from SG, drop a previously-
                    // selected 'michelin' chip so the search request
                    // doesn't carry an unsupported cuisine.
                    // v0.61.280 — Register O-31: extended from JB-only
                    // to any non-SG region (JB + OTHER + MY-PUT). The
                    // Michelin chip is greyed in the drawer for these
                    // regions; this strip clears any chip that was
                    // sticky from a prior SG session.
                    const nextCuisines = r.id !== 'SG'
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
                      const fp = JB_FOCUS_POINTS[JB_FOCUS_DEFAULT];
                      onLocationSelect({
                        lat: fp.lat, lng: fp.lng, label: fp.name,
                        noAutoFire: true
                      });
                    }
                  }
                }}
                aria-pressed={sel}
                className={`flex-1 px-2.5 py-1 rounded-full border text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
                {(r.flag.endsWith('.png') || r.flag.endsWith('.svg'))
                  ? <img src={r.flag} alt="" width="18" height="12" className="rounded-sm border border-tg-border/40 flex-shrink-0" />
                  : <span aria-hidden>{r.flag}</span>}
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* v0.61.29 — the editable LocationField sits here, above the map.
          It replaces the static "📍 <place> · N places nearby" status
          banner; the field was previously buried in the collapsed
          Search-criteria section, so the anchor couldn't be changed
          without expanding it (and the Google map has no text input).
          The place count / search status now rides as a suffix.
          The !userLoc branch keeps the v0.58.23 "Locating you…" state
          shown while geolocation resolves. */}
      {!userLoc ? (
        <div className="text-[11px] text-tg-hint italic px-1 py-1">
          📍 {lang === 'fr' ? 'Localisation en cours…' : 'Locating you…'}
        </div>
      ) : (
        /* v0.61.247 — reverted the v0.61.241 mt-7 wrapper (operator:
           "don't have large UI spacing gaps between SG/JB/Others
           button inside the Cuisine TMA"). The location-suffix
           speech bubble was removed in this PR so the 28 px breathing
           room is no longer needed; the region pill row sits tight
           above the LocationField again. */
        <LocationField
          userLoc={userLoc}
          region={state.region}
          anchor={locationAnchor}
          suffix={loading
            ? t('banner.locating.suffix', lang)
            : (!venues.length
              ? t('banner.no.match', lang)
              : (venues.length === 1
                ? t('banner.places.one', lang)
                : tn('banner.places.many', lang, { n: venues.length })))}
          onSelect={onLocationSelect}
          onSearch={triggerSearch}
          /* v0.61.191 — OTHER region's country picker. countryPref is
             one of the 16 ISO codes from countries.js; onCountryChange
             updates state.countryPref so the next Places search-by-
             country call constrains to the right country. */
          countryPref={state.countryPref || 'MY'}
          onCountryChange={(code) => {
            setState((s) => ({ ...s, countryPref: code }));
            // v0.61.196 — fire-and-forget push to /api/cuisine/country-pref
            // so the chat /location (v0.61.195) picks up the same value.
            saveCountryPref(code).catch(() => { /* non-fatal */ });
          }}
        />
      )}

      {(() => {
        // v0.61.353 — "↩ Back to last search area". Shows when the map view
        // has drifted meaningfully (>600 m) from the confirmed search anchor
        // (manual pan / city preview). Low-weight orange helper (operator's
        // no-red accessibility rule); flies the map back WITHOUT changing the
        // search anchor (positive control — the aircraft-handoff model).
        const anchor = (locationAnchor && Number.isFinite(locationAnchor.lat) && Number.isFinite(locationAnchor.lng))
          ? locationAnchor : userLoc;
        if (!anchor || !mapViewLocation) return null;
        const R = 6371000, toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(mapViewLocation.lat - anchor.lat), dLng = toRad(mapViewLocation.lng - anchor.lng);
        const hav = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(anchor.lat)) * Math.cos(toRad(mapViewLocation.lat)) * Math.sin(dLng / 2) ** 2;
        const distM = 2 * R * Math.asin(Math.sqrt(hav));
        if (distM < 600) return null;
        return (
          <div className="px-1 -mt-0.5 mb-1">
            <button
              type="button"
              onClick={() => { setFlyTarget({ lat: anchor.lat, lng: anchor.lng, zoom: 14, _k: Date.now() }); setSelectedCityLocation(null); }}
              className="text-[11px] px-2.5 py-0.5 rounded-full border border-[#f59e0b] text-[#d97706] bg-transparent leading-tight whitespace-nowrap"
              title={lang === 'fr' ? 'Recentrer la carte sur la dernière zone de recherche' : 'Recentre the map on your last search area'}
            >
              ↩ {lang === 'fr' ? 'Retour à la dernière zone de recherche' : 'Back to last search area'}
            </button>
          </div>
        );
      })()}

      <MapPanel
        venues={visibleVenues.length ? visibleVenues : venues}
        userLoc={userLoc}
        focusedPlaceId={focusedPlaceId}
        onPinTap={setFocusedPlaceId}
        searchCenter={searchCenter || userLoc}
        anchorName={locationName}
        overlayLayers={overlayLayers}
        onOverlayChange={setOverlayLayers}
        region={state.region}
        onMapMove={setMapViewLocation}
        flyTo={flyTarget}
      />

      {/* v0.60.84 — ActiveFilters chip bar removed from this slot per
          operator 2026-05-10. The pills now live inside the Search
          criteria header below the title (visible only when collapsed)
          — see the <ActiveFilters /> mount further down. */}

      {/* v0.59.0: Tell-me input box also moved BELOW the map. Always
          visible — single-line composer, expands the conversation
          inline. Replaces the v0.57.30 FlipPanel back-face. */}
      <TellMePanel
        value={nlText}
        onChange={setNlText}
        onSubmit={handleNLSubmit}
        onReplace={handleNLReplace}
        lastPrompt={lastPrompt}
        loading={loading}
      />

      {/* v0.59.0: Search criteria — collapsible. Filter chips
          (Open-now / New / Halal / Price / Filters), location field,
          cuisine drawer, Search button all live inside. Tapping the
          header toggles open/closed; chevron flips ▾↔▸. Active
          filters above stay visible regardless.
          v0.58.29: subtle accent tint on the card background so it
          reads distinct from the surrounding tg-card panels (per
          Human Lead — "Search card could have a lighter shade than
          the background to distinguish it"). Header gains an
          explicit "Collapse"/"Edit search" pill on the right so the
          collapse affordance isn't just a small chevron. */}
      <div
        className="rounded-2xl border border-tg-accent/40 overflow-hidden"
        style={{ backgroundColor: 'color-mix(in srgb, var(--tg-card) 88%, var(--tg-accent) 12%)' }}
      >
        <button
          type="button"
          onClick={() => setCriteriaOpen((o) => !o)}
          aria-expanded={criteriaOpen}
          className="w-full flex items-start gap-2 px-3 py-2.5 text-xs font-semibold text-tg-text hover:bg-tg-bg/30 transition-colors"
        >
          <span aria-hidden className="text-tg-accent text-base leading-none mt-0.5">{criteriaOpen ? '▾' : '▸'}</span>
          {/* v0.60.80 — title + selected-criteria preview stacked in one
              flex column. The count badge ("1c · 0f") was meaningless;
              replace with a one-size-smaller line showing the real
              selections separated by " • ". Hidden when nothing is
              selected so the header collapses to a single row. */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex-1">{lang === 'fr' ? 'Critères de recherche' : 'Search criteria'}</span>
              <span
                aria-hidden
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full bg-tg-accent text-tg-accent-text transition-shadow ${
                  !criteriaOpen && editSearchPulse ? 'ring-2 ring-tg-accent ring-offset-1 animate-pulse' : ''
                }`}
              >
                {criteriaOpen ? t('btn.collapse', lang) : t('btn.editSearch', lang)}
              </span>
            </div>
          </div>
        </button>
        {/* v0.60.84 — operator 2026-05-10: pills now live inside the
            criteria card below the toggle button (visible only when
            collapsed AND something is selected). Replaces the v0.60.80
            text preview "Japanese • Open now • $$". Mounted as a
            sibling of the <button>, not nested inside it — nested
            <button> in <button> is invalid HTML and breaks the X-tap
            removal on each pill. */}
        {!criteriaOpen && criteriaSummary.length > 0 && (
          <div className="px-3 pb-2 -mt-1">
            <ActiveFilters
              cuisines={state.cuisines}
              filters={state.filters}
              onRemoveCuisine={removeCuisine}
              onRemoveFilter={removeFilter}
              onResetAll={clearAll}
            />
          </div>
        )}
        {criteriaOpen && (
          <div className="flex flex-col gap-2 px-3 pb-3">
            <QuickFilters
              filters={state.filters}
              onChange={(f) => setState((s) => ({ ...s, filters: f }))}
              specialModeActive={!!state.specialMode}
            />
            {/* v0.61.29 — LocationField moved out of this collapsed
                section to the banner slot above the map; see the
                `!userLoc ? … : <LocationField …>` block near the top.
                v0.61.126 — specialMode + onSpecialModeChange wired so
                the Fruits / Durian exclusive toggles inside the drawer
                lift state up to App.jsx. */}
            <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
              region={state.region}
              countryPref={state.countryPref}
              specialMode={state.specialMode || null}
              onSpecialModeChange={(mode) => setState((s) => ({ ...s, specialMode: mode || null }))}
              onChange={(c) => setState((s) => ({ ...s, cuisines: c }))}
              onCategoryClose={() => {
                if (state.cuisines.length > 0) {
                  setSearchHintActive(true);
                  setTimeout(() => setSearchHintActive(false), 5000);  // v0.61.174: 3s → 5s
                }
              }} />
            <div className="flex gap-1.5 items-center">
              <button
                type="button"
                onClick={triggerSearch}
                disabled={loading}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-2xl transition-colors whitespace-nowrap ${
                  loading ? 'bg-tg-card text-tg-hint border border-tg-border'
                  : dirty ? 'bg-tg-accent text-tg-accent-text ring-2 ring-offset-1 ring-tg-accent ring-offset-tg-bg'
                  : 'bg-tg-accent text-tg-accent-text'
                }`}
              >
                {loading ? t('btn.searchPleaseWait', lang) : t('btn.searchFull', lang)}
              </button>
              {canClear && (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={loading}
                  className="shrink-0 text-xs px-3 py-2 rounded-2xl border border-tg-border bg-tg-card text-tg-text"
                >{t('btn.clear', lang)}</button>
              )}
            </div>
          </div>
        )}
      </div>

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
      {loading && !funFact && (
        <div
          aria-busy="true"
          className="fixed inset-0 z-50 bg-tg-bg/60 flex items-center justify-center cursor-wait"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl border border-tg-border bg-tg-card p-4 text-xs text-tg-text shadow-lg text-center max-w-[280px]">
            {loadingReason === 'rotating' ? (
              <>
                <div className="font-semibold">{t('loading.head', lang)}</div>
                <div className="mt-1">{t('loading.rotating.' + (rotatingIndex + 1), lang)}</div>
              </>
            ) : loadingReason === 'refresh' ? (
              t('loading.refresh', lang)
            ) : (
              t('loading.initial', lang)
            )}
          </div>
        </div>
      )}

      {/* v0.60.131 — "Tell me" text read as a question/instruction:
          decline note, no result list. */}
      {questionDeclined && !loading && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[11px] leading-snug text-tg-text">
          🙂 <span className="italic">{lang === 'fr'
            ? 'Je ne réponds pas encore aux questions dans la case « Tell me ». Tapez un plat ou une cuisine (ex. chiffon cake, laksa, ramen), ou choisissez une cuisine ci-dessous.'
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
      {specialModeNotice && !loading && (
        <div className="rounded-2xl border border-amber-500/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
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
        <div className="rounded-2xl border border-amber-500/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {t('banner.jbFallbackToOther', lang)}
        </div>
      )}

      {/* v0.61.234 — sparse-coverage hint for African / South African /
          Georgian cuisines where Google Maps SG has genuinely few
          listings. Sets expectation so the user doesn't perceive the
          short result list as a bug. */}
      {sparseNotice && !loading && (
        <div className="rounded-2xl border border-amber-500/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {lang === 'fr'
            ? `Cuisine peu représentée à Singapour — Google Maps répertorie peu d'établissements ${sparseNotice}. Affichage de toutes les correspondances.`
            : `Limited coverage in Singapore — Google Maps has few ${sparseNotice} restaurants listed. Showing all matches.`}
        </div>
      )}

      {/* v0.60.129 — "Did you mean a cooking method?" pivot: tap a
          cuisine chip to re-run the search constrained to that cuisine. */}
      {cookMethodPivot && !loading && cookMethodPivot.matches.length > 0 && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[11px] leading-snug text-tg-text">
          <div className="mb-1.5">🙂 <span className="italic">
            {lang === 'fr'
              ? `Cherchiez-vous peut-être une méthode de cuisson — « ${cookMethodPivot.query} » ?`
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

      <div ref={resultPanelRef}>
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
        <ResultPanel
          venues={venues}
          loading={loading}
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
            if (f.halal) parts.push(lang === 'fr' ? 'Halal' : 'Halal');
            if (f.vegetarian) parts.push(lang === 'fr' ? 'Végétarien' : 'Vegetarian');
            if (f.openNow) parts.push(lang === 'fr' ? 'Ouvert' : 'Open now');
            if (f.homeBased) parts.push(lang === 'fr' ? 'À domicile' : 'Home-based');
            if (f.petFriendly) parts.push(lang === 'fr' ? 'Animaux acceptés' : 'Pet-friendly');
            if (f.newlyOpened) parts.push(lang === 'fr' ? 'Nouveau' : 'Newly opened');
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
                : `📚 Explore ${mr.cityRemaining} more in ${mr.city} · ${mr.total} across ${fc}`;
            }
            // v0.61.374 — country-only NEW format (fix A): used for city-states
            // like Singapore (city == country → no redundant "in <City>"):
            // "📚 Explore 69 more · 117 across 🇸🇬 Singapore".
            if (fc) {
              return lang === 'fr'
                ? `📚 Explorez ${mr.remaining} de plus · ${mr.total} dans ${fc}`
                : `📚 Explore ${mr.remaining} more · ${mr.total} across ${fc}`;
            }
            // Legacy fallback only when no country info resolved at all.
            return lang === 'fr'
              ? `📚 Liste Michelin organisée — ${mr.remaining} de plus à découvrir (${mr.total} au total). Touchez 🔍 pour le prochain groupe de 12.`
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
                  : '✳️ Fetching Michelin Info. Please wait a moment.')
              : null
          }
          focusedPlaceId={focusedPlaceId}
          onCardTap={setFocusedPlaceId}
          warmStartSeed={warmStartSeed}
          comboInfo={comboInfo}
          specialModeBlocked={specialModeBlocked}
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
                aria-label={lang === 'fr' ? 'Recycler cette session' : 'Recycle this session'}
              >
                {lang === 'fr' ? '↻ Recycler' : '↻ Recycle'}
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
        {zeroRetried && !loading && venues.length === 0 && (
          <div className="text-[12px] text-tg-hint text-center mt-2 px-2 py-3 rounded-lg bg-tg-card border border-tg-hint/20">
            <div className="leading-snug">{t('result.noMatchAfterRetry', lang)}</div>
            <button
              type="button"
              onClick={() => {
                setCriteriaOpen(true);
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

      {error && <div className="text-xs text-red-500 px-1">⚠️ {error}</div>}

      {/* v0.60.213 — two-line footer: a how-to line + an
          "Experimental · <region> · v<build>" tag line.
          v0.60.217 — no border; font +1pt; region restored. */}
      <footer className="mx-2 mb-2 mt-2 px-3 py-2 text-[9px] text-tg-hint text-center leading-tight">
        <div>{t('footer.howto', lang)}</div>
        {/* v0.61.186 — footer now resolves all three pill states.
            Was missing 'OTHER' (introduced in v0.61.185); operator
            on Putrajaya would see "Singapore" in the footer even
            with the 🌏 Others pill selected. */}
        {/* v0.61.392 — operator: drop the "built <date> <time> UTC" chip
            from the Cuisine footer (it was never removed since v0.61.182);
            keep just the version, which is enough to identify a deploy. */}
        <div>{t('footer.experimental', lang)} · {
          state.region === 'JB' ? t('region.johor', lang)
          : state.region === 'OTHER' ? t('region.others', lang)
          : t('region.singapore', lang)
        } · v{BUILD_VERSION}</div>
      </footer>

      {/* v0.59.1: floating action buttons. Always-visible 🔍 Search
          (so the user can re-run a search without scrolling back to
          the criteria builder), plus a contextual ↑ Top that only
          appears when the user has scrolled past the hero (map +
          active filters). Stacked bottom-right, fixed positioning,
          z-30 to sit above the result panel. */}
      {/* v0.60.58 — single bottom row holding BackFab (left) + the
          right-side stack (top + search). Previously each FAB was its
          own `fixed bottom-4` element; in practice the left and right
          ones rendered at very slightly different baselines on some
          devices. A shared row container makes alignment by
          construction. Bowl shape (rounded-t-md rounded-b-[16px])
          across all three FABs per Human Lead 2026-05-09 — replaces
          the prior rounded-full circles. */}
      <div
        className="fixed left-4 right-4 z-30 pointer-events-none flex items-end justify-between gap-3"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* v0.60.154 — left cluster: End / ⇠ Back / ⇢ Next. The Back FAB
            replaces the v0.60.148 right-column ⇠ button (now removed)
            and reverts to the original "End" position the operator
            preferred; it walks the client-side page-history cache
            (`pages` + `cursor`) instead of round-tripping
            /api/cuisine/session/back, so navigation is instant and no
            re-curation happens. The ⇢ Next button only renders when
            the user has stepped back and there is forward history. */}
        <div className="flex items-end gap-2 pointer-events-none">
          <BackFab
            inline
            mode={cursor > 0 ? 'back' : 'close'}
            onBack={() => setCursor((c) => Math.max(0, c - 1))}
          />
          {cursor < pages.length - 1 && (
            <button
              type="button"
              onClick={() => setCursor((c) => Math.min(pages.length - 1, c + 1))}
              aria-label={lang === 'fr' ? 'Liste suivante' : 'Next list'}
              title={lang === 'fr' ? 'Liste suivante' : 'Next list'}
              style={fabBgFg(false)}
              className="pointer-events-auto px-2 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap"
            >
              <span aria-hidden="true">⇢</span>
              <span>{lang === 'fr' ? 'Suivant' : 'next'}</span>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end pointer-events-none">
          {/* v0.60.97 — operator: "flip the position of 'Search 🔍'
              and 'top' / 'down'. 'Search 🔍' be on top of 'top' /
              'down'." Search FAB now renders FIRST (top of column);
              scroll FAB renders SECOND (below).
              v0.61.174 — v0.61.79's left-of-FAB 👉 arrow retired.
              Replaced with a speech-bubble tooltip ABOVE the 🔍 ("More
              eats? Tap 🔍") for the same flash window, now 5 s. The
              tail is a 8 px rotated square positioned at the bottom-
              center of the bubble body (same bg, no border on the
              tail's hidden edges) so the silhouette reads as a true
              chat bubble pointing down at the FAB. */}
          <div className="relative pointer-events-none">
            {(searchHintActive || searchFabFlash) && (
              <div
                aria-hidden="true"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 animate-pulse drop-shadow-md select-none pointer-events-none"
              >
                <div className="relative bg-tg-accent text-tg-bg text-[10px] font-semibold rounded-2xl px-2.5 py-1 whitespace-nowrap shadow-md">
                  {t('panel.bubble.moreEats', lang)}
                  {/* Downward tail — rotated square hugging the bottom
                      edge so half the diamond sits under the bubble
                      body. Same bg as the body for a seamless join. */}
                  <span
                    className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-tg-accent rotate-45"
                  />
                </div>
              </div>
            )}
            {/* v0.61.180 — disable the 🔍 FAB when the cumulative
                pool is exhausted (finalBatch=true + knownTotal ===
                venues.length means the user has been shown
                everything Places returned AND the next tap would
                fetch zero). Closes operator's earlier complaint
                "subsequent tap return zero because of the five
                near location". `dirty` (criteria changed) re-enables
                the button — a new query has its own pool. */}
            {(() => {
              const poolExhausted = !!finalBatch && Number.isFinite(knownTotal) && venues && venues.length === knownTotal;
              const isDisabled = loading || (poolExhausted && !dirty);
              return (
                <button
                  type="button"
                  onClick={triggerSearch}
                  disabled={isDisabled}
                  aria-label={lang === 'fr' ? 'Rechercher · Trouvez où manger' : 'Search · Show me places to eat'}
                  title={poolExhausted && !dirty
                    ? (lang === 'fr' ? 'Aucun autre résultat — modifiez les critères' : 'No more results — change criteria')
                    : undefined}
                  style={fabBgFg(dirty)}
                  className={`pointer-events-auto w-7 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[11px] font-semibold flex items-center justify-center active:scale-95 transition-all ${
                    isDisabled ? 'opacity-40'
                    : dirty ? 'ring-2 ring-offset-1 ring-tg-accent'
                    : ''
                  } ${(searchHintActive || searchFabFlash) && !isDisabled ? 'animate-pulse ring-2 ring-offset-1 ring-tg-accent' : ''}`}
                >🔍</button>
              );
            })()}
          </div>
          <button
            type="button"
            onClick={() => window.scrollTo({
              top: scrolledPastHero ? 0 : window.scrollY + window.innerHeight,
              behavior: 'smooth'
            })}
            aria-label={scrolledPastHero ? t('btn.backToTop', lang) : 'Scroll down'}
            style={fabBgFg(false)}
            className="pointer-events-auto px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center active:scale-95 transition-all whitespace-nowrap"
          >{scrolledPastHero ? t('btn.topShort', lang) : t('btn.downShort', lang)}</button>
        </div>
      </div>
    </div>
  );
}
