import React, { useEffect, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery, warmStart, fetchUserLocation, reverseGeocode, saveUserLocation, startSession, backOnePage, recycleSession } from './lib/api.js';
import { defaultState, clearedFilters, readFromHash, readOverridesFromHash, writeToHash } from './lib/state.js';
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

// v0.61.51 — operator CR7: floating FABs must not use green
// (washed-out against the Google Map). The bg/colour come from the
// shared giaToggleStyle palette (theme-aware amber-on-white / dark
// slate). `active` = the "selected" state (Search FAB when dirty).
function fabBgFg(active) {
  const s = giaToggleStyle(active);
  return { backgroundColor: s.background, color: s.color };
}

// v0.60.213 — build version for the footer (was a hardcoded "v0.60.4").
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

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
  // v0.60.32 — first-load indicator. Set to true on mount, cleared
  // after the first venues array arrives. Drives the "Please wait
  // while loading list…" banner so the user knows the longer initial
  // fetch (warm-start + travel-times + footfall enrichment for the
  // first batch) is intentional, not a hang. Subsequent searches in
  // the same TMA session are fast enough that the regular spinner
  // suffices.
  const [firstLoadPending, setFirstLoadPending] = useState(true);
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
  const [searchFabFlash, setSearchFabFlash] = useState(false);
  useEffect(() => {
    if (!venues || !venues.length) return undefined;
    setSearchFabFlash(true);
    const t = setTimeout(() => setSearchFabFlash(false), 3000);
    return () => clearTimeout(t);
  }, [venues]);
  // v0.61.79 — the "ℹ️ Google search limit · tap 🔍 again…" toast was
  // removed (operator request). Its state (`searchTipShow`), trigger,
  // and `tipFirstShownRef` guard are all gone; the 3 s FAB flash +
  // arrow are the standing cue that another 🔍 tap loads more.
  const [exhaustedNote, setExhaustedNote] = useState(false);
  // v0.60.191 — sticky flag: did the last server response come back
  // as the planned 6-venue first batch? Used to suppress the v0.60.188
  // <12 auto-reset (which would otherwise loop 6 venues forever — see
  // Codex review on PR #440). The flag flips to false on the first
  // 12-venue follow-up; ↺ Start over wipes the seen-set server-side,
  // which makes the next response firstBatch=true again, so this
  // resets to true via the normal setFirstBatch(p.firstBatch) call.
  const [firstBatch, setFirstBatch] = useState(false);
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
    setSessionFull(!!p.sessionFull);
    setPageStackDepth(Number.isFinite(p.pageStackDepth) ? p.pageStackDepth : 0);
    setMichelinRemaining(p.michelinRemaining || null);
    setExhaustedNote(!!p.exhausted);
    setFirstBatch(!!p.firstBatch);              // v0.60.191
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

    (async () => {
      // v0.58.26: TMA URL hash anchor wins ahead of all client paths —
      // the bot's /cuisine handler now pre-resolves the cached
      // location and deep-links it via #lat&lng. Without this, the
      // hash anchor would only be honoured by the warm-start guard
      // (line ~208), but userLoc itself would still go through GPS.
      if (initialOverrides?.location && isValidCoord(initialOverrides.location.lat, initialOverrides.location.lng)) {
        if (!cancelled) {
          setUserLoc({ lat: initialOverrides.location.lat, lng: initialOverrides.location.lng });
          console.log('[Cuisine-TMA-v2] userLoc from URL hash (bot deep-link)');
        }
        return;
      }
      const w = tg();
      const init = w?.initDataUnsafe || {};
      const tgLoc = init.user_location || init.user?.location;
      if (isValidCoord(tgLoc?.latitude, tgLoc?.longitude)) {
        if (!cancelled) {
          setUserLoc({ lat: tgLoc.latitude, lng: tgLoc.longitude });
          console.log('[Cuisine-TMA-v2] userLoc from Telegram initData');
        }
        return;
      }
      if (await tryServerCache()) return;
      if (await tryGps()) return;
      if (!cancelled) {
        setUserLoc(SG_CENTROID);
        console.log('[Cuisine-TMA-v2] userLoc fallback to SG centroid');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { writeToHash(state); }, [state]);

  // v0.58.4: warm-start the result list on first paint with 5 random
  // venues drawn from a rotating server-side seed. Falls back to the
  // regular search pipeline if warm-start errors so the picker never
  // opens to an empty list. lastRunSnap stays null on warm-start so
  // the user's first manual 🔍 Search press still runs and populates
  // the dirty-indicator baseline.
  useEffect(() => {
    if (!userLoc || initialSearchDone.current) return;
    initialSearchDone.current = true;
    // v0.58.10: when the bot's /cuisine tokeniser pre-anchored via the
    // hash (lat/lng/place), skip warm-start and run a real search at
    // that anchor so the user lands on the exact deep-linked state.
    if (locationAnchor?.lat != null && locationAnchor?.lng != null) {
      setSearchCenter({ lat: locationAnchor.lat, lng: locationAnchor.lng });
      runSearch(state, { lat: locationAnchor.lat, lng: locationAnchor.lng });
      return;
    }
    // v0.59.1: previously the picker showed an empty list whenever
    // warm-start returned HTTP 200 with `venues: []` (all rotating
    // seeds yielded zero Places-API candidates). The .catch only
    // handled network/HTTP failures. Now we explicitly fall back to
    // runSearch when venues is empty too.
    (async () => {
      setLoading(true); setError(null);
      console.log('[Cuisine-TMA-v2] warm-start: requesting', { lat: userLoc.lat, lng: userLoc.lng, region: state.region });
      try {
        const r = await warmStart({ lat: userLoc.lat, lng: userLoc.lng, region: state.region, lang });
        console.log('[Cuisine-TMA-v2] warm-start: response', { venues: r?.venues?.length || 0, seed: r?.seed, cached: r?.cached });
        if (r?.venues?.length) {
          setVenues(r.venues);
          setFirstLoadPending(false);
          setWarmStartSeed(r.seed || null);
          setSearchCenter({ lat: userLoc.lat, lng: userLoc.lng });
          // v0.60.154 — warm-start populates the first entry of the
          // client-side history cache so a subsequent ⇠ Back can land
          // on it. Without this, the user's first explicit search
          // would write the only cached page and ⇠ Back would never
          // light up against the warm-start view.
          setPages([{
            venues: r.venues,
            comboInfo: null,
            misrepNote: null,
            cookMethodPivot: null,
            sessionFull: false,
            pageStackDepth: 0,
            michelinRemaining: null,
            exhausted: false,
            poolCount: 0,
            criteriaSnap: stateSig(state),
            // v0.60.154 — match the runSearch push: snapshot the current
            // state / freeText / anchor so Back to the warm-start page
            // also restores the criteria builder, not just the venues.
            criteriaState: state ? JSON.parse(JSON.stringify(state)) : null,
            freeText: (typeof nlText === 'string') ? nlText : '',
            locationAnchor: locationAnchor ? { ...locationAnchor } : null,
            searchCenter: { lat: userLoc.lat, lng: userLoc.lng },
            isMichelin: false
          }]);
          setCursor(0);
          // v0.59.18 (Codex review #223): seed lastRunSnap with the
          // current state signature so the dirty ring lights up the
          // moment the user toggles a filter / cuisine / region after
          // warm-start. Without this, dirty stays false until the user's
          // first manual 🔍 — they'd see no visible cue that pressing
          // Search would do something different.
          setLastRunSnap(stateSig(state));
          // v0.60.47 — pulse the "Edit search" pill for 3s so the
          // user discovers the entry-point to the criteria builder
          // (which is collapsed on first load — see criteriaOpen
          // initial state above).
          setEditSearchPulse(true);
          setTimeout(() => setEditSearchPulse(false), 3000);
          console.log(`[Cuisine-TMA-v2] warm-start ok seed=${r.seed} count=${r.venues.length}`);
          return;
        }
        console.warn('[Cuisine-TMA-v2] warm-start returned empty venues; falling back to runSearch');
      } catch (err) {
        console.warn('[Cuisine-TMA-v2] warm-start failed:', err.message);
      }
      // Fallback: a generic /api/cuisine/search at the user's GPS with
      // no cuisine constraint. The full pipeline always returns ≥ a
      // few candidates anywhere in SG/JB.
      try {
        await runSearch(state);
      } catch (err) {
        console.warn('[Cuisine-TMA-v2] runSearch fallback failed:', err.message);
      } finally {
        setLoading(false);
      }
    })().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc?.lat, userLoc?.lng]);

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
    if (!userLoc) return;
    // v0.60.119 — locationAnchor (the location the user explicitly
    // picked in the Search-criteria builder, or a /cuisine deep-link)
    // wins over the device / cached /location pin. Without it, a
    // searchCenter that got nulled (e.g. on a TMA background/restore)
    // silently fell back to userLoc, so the user's chosen location
    // "reset" itself. Now an explicit pick sticks until the user
    // clears it or picks another.
    const center = anchor || searchCenter || locationAnchor || userLoc;
    // v0.58.26: defence-in-depth — never POST {lat:0, lng:0}. Server
    // now 400s on zero-coord but the user would see a confusing error;
    // surfacing a clearer message client-side is friendlier.
    if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)
        || (Math.abs(center.lat) < 0.001 && Math.abs(center.lng) < 0.001)) {
      console.warn('[Cuisine-TMA-v2] runSearch: refusing zero/invalid center', center);
      setError('Location not yet resolved — share a pin via /location and reopen.');
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
    // v0.60.191 — Codex interaction fix: the threshold must follow the
    // server's intended slice size, NOT a hardcoded 12. When the prior
    // response was a planned 6-venue first batch (`firstBatch: true`),
    // hitting "venues.length < 12" would loop: tap 2 fires
    // resetSeen=true → server wipes seen → next slice is firstBatch=6
    // again → loop. Use 6 as the threshold while firstBatch is sticky,
    // 12 otherwise. The follow-up batch flips firstBatch=false on
    // arrival, restoring the original v0.60.188 behaviour.
    const lowCountThreshold = firstBatch ? 6 : 12;
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
    const autoResetOnLowCount = (opts?.resetSeen !== true)
      && Array.isArray(venues) && venues.length > 0 && venues.length < lowCountThreshold
      && !exhaustedNote
      && !michelinRemaining;
    setLoading(true); setError(null);
    try {
      const r = await searchCuisine({
        lat: center.lat, lng: center.lng,
        cuisines: snap.cuisines, filters: snap.filters,
        region: snap.region || 'SG',
        lang,                                             // v0.59.0
        resetSeen: opts?.resetSeen === true || autoResetOnLowCount,  // v0.60.117 / v0.60.188
        freeText: (typeof nlText === 'string' && nlText.trim()) ? nlText.trim() : undefined  // v0.60.126 — Tell-me box as a qualifier
      });
      // v0.60.131 — server says the "Tell me" text was a question, not a
      // dish/cuisine: show the decline note, no result list.
      if (r && r.questionDeclined === true) {
        setQuestionDeclined(true);
        setVenues([]); setMisrepNote(null); setCookMethodPivot(null); setComboInfo(null);
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
      if (isZeroResult && !isRetryCall && lastZeroRetrySnapRef.current !== currentSig) {
        lastZeroRetrySnapRef.current = currentSig;
        // Schedule the retry in a microtask so the current `finally`
        // (setLoading(false)) runs first, then the retry's setLoading(true)
        // re-fires the spinner. Without this the spinner appears to skip.
        Promise.resolve().then(() => runSearch(snap, anchor, { resetSeen: true }));
        // Fall through to the regular zero-result setters below; the
        // retry will overwrite them on success.
      } else if (isZeroResult && isRetryCall) {
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
      setFirstLoadPending(false);
      setSearchCenter({ lat: center.lat, lng: center.lng });
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
      setFirstBatch(r?.firstBatch === true);    // v0.60.191
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
          total: r.michelinSummary.total || 0
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
      const r = await nlQuery({ text, lat: userLoc?.lat, lng: userLoc?.lng, filters: state.filters, lang });
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
      // v0.60.166 — picking a location commits the anchor ONLY; it must
      // not auto-fire a search (the user composes the rest of the
      // criteria and taps 🔍 themselves, and auto-firing raced the
      // React state update so the search ran with the stale anchor).
      setLocationAnchor({ lat: p.lat, lng: p.lng, name: p.label || '' });
      // v0.60.170 — also setSearchCenter on pick, so the map re-renders
      // at the picked place and the Search button (runSearch(state),
      // no explicit anchor) doesn't fall back to the stale searchCenter.
      setSearchCenter({ lat: p.lat, lng: p.lng });
      // An explicit pick (not a "× clear", which sends an empty label)
      // also updates the bot's /location cache so it sticks across
      // sessions and in chat.
      if ((p.label || '').trim()) saveUserLocation({ lat: p.lat, lng: p.lng }).catch(() => {});
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
  return (
    <div
      className="bg-tg-bg text-tg-text py-3 flex flex-col gap-2 max-w-[1280px] mx-auto px-3 md:px-6 lg:px-8"
      style={{
        // v0.59.20: use Telegram's stable viewport variable so the
        // container tracks the *visible* iframe height, not the buggy
        // 100vh that iPad WebView resolves to the full sheet (including
        // Telegram's bottom chrome) and leaves a drag-up gap.
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
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
                show a live Singapore weather emoji beside the locale
                toggle instead. */}
            <WeatherBadge className="text-[11px] text-tg-hint" />
          </div>
        </div>
        {/* v0.57.9: region toggle on its own row so it's always visible.
            v0.57.34: JB now uses the Johor state flag icon (johor-flag.png)
            instead of the 🇲🇾 Malaysia emoji — Johor Bahru is the city, not
            the country. */}
        <div className="flex gap-1.5">
          {[
            { id: 'SG', flag: '🇸🇬', label: t('region.singapore', lang) },
            { id: 'JB', flag: 'johor-flag.png', label: t('region.johor', lang) }
          ].map((r) => {
            const sel = (state.region || 'SG') === r.id;
            return (
              <button key={r.id} type="button"
                onClick={() => setState((s) => {
                  // v0.60.199 — ✳️ Michelin list is SG-only; when the
                  // user toggles to JB, drop a previously-selected
                  // 'michelin' chip so the search request doesn't
                  // carry an unsupported cuisine.
                  const nextCuisines = r.id === 'JB'
                    ? (s.cuisines || []).filter((c) => String(c).toLowerCase() !== 'michelin')
                    : s.cuisines;
                  return { ...s, region: r.id, cuisines: nextCuisines };
                })}
                aria-pressed={sel}
                className={`flex-1 px-2.5 py-1 rounded-full border text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
                {r.flag.endsWith('.png')
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
        />
      )}

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
            <QuickFilters filters={state.filters} onChange={(f) => setState((s) => ({ ...s, filters: f }))} />
            {/* v0.61.29 — LocationField moved out of this collapsed
                section to the banner slot above the map; see the
                `!userLoc ? … : <LocationField …>` block near the top. */}
            <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
              region={state.region}
              onChange={(c) => setState((s) => ({ ...s, cuisines: c }))}
              onCategoryClose={() => {
                if (state.cuisines.length > 0) {
                  setSearchHintActive(true);
                  setTimeout(() => setSearchHintActive(false), 3000);
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
      {loading && (
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

      {/* v0.60.128 — "misrepresented dish" note: when the Tell-me box
          named a dish from the curated table, show the "often assumed X,
          but actually Y" context above the results. */}
      {misrepNote && !loading && (
        <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[11px] leading-snug text-tg-text">
          ℹ️ <span className="font-semibold">{misrepNote.name}</span> — {misrepNote.note}
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
        {michelinRemaining && michelinRemaining.remaining > 0 && !loading && (
          <div className="text-[11px] text-tg-hint italic text-center mb-1 px-2">
            {lang === 'fr'
              ? `📚 Liste Michelin organisée — ${michelinRemaining.remaining} de plus à découvrir (${michelinRemaining.total} au total). Touchez 🔍 pour le prochain groupe de 12.`
              : `📚 Curated Michelin list — ${michelinRemaining.remaining} more to explore (${michelinRemaining.total} in total). Tap 🔍 for the next batch of 12.`}
          </div>
        )}
        <ResultPanel
          venues={venues}
          loading={loading}
          /* v0.61.79 — total size of the curated Michelin pool (~130).
             When set, the result header reads "Results (12/130)" so the
             user sees this batch is a slice of the whole list. null on
             non-Michelin searches → header falls back to "Results (12)". */
          totalCount={michelinRemaining ? (michelinRemaining.total || null) : null}
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
        {!exhaustedNote && !michelinRemaining && !loading && venues.length > 0 && venues.length < (firstBatch ? 6 : 12) && (
          <div className="text-[11px] text-tg-hint italic text-center mt-2 px-2">
            {lang === 'fr'
              ? `${venues.length} résultat${venues.length === 1 ? '' : 's'} pour ces critères. Touchez 🔍 pour rafraîchir.`
              : `${venues.length} result${venues.length === 1 ? '' : 's'} for these criteria. Tap 🔍 to refresh.`}
          </div>
        )}
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
        <div>{t('footer.experimental', lang)} · {state.region === 'JB' ? t('region.johor', lang) : t('region.singapore', lang)} · v{BUILD_VERSION}</div>
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
              v0.61.79 — a flashing 👉 arrow sits to the left of the
              FAB during the 3 s post-result flash window, pointing the
              eye at the 🔍 button (it loads the next batch). */}
          <div className="relative pointer-events-none">
            {(searchHintActive || searchFabFlash) && (
              <span
                aria-hidden="true"
                className="absolute right-full top-1/2 -translate-y-1/2 mr-1.5
                  text-xl leading-none animate-pulse drop-shadow-md select-none"
              >👉</span>
            )}
            <button
              type="button"
              onClick={triggerSearch}
              disabled={loading}
              aria-label={lang === 'fr' ? 'Rechercher · Trouvez où manger' : 'Search · Show me places to eat'}
              style={fabBgFg(dirty)}
              className={`pointer-events-auto w-7 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[11px] font-semibold flex items-center justify-center active:scale-95 transition-all ${
                loading ? 'opacity-60'
                : dirty ? 'ring-2 ring-offset-1 ring-tg-accent'
                : ''
              } ${(searchHintActive || searchFabFlash) ? 'animate-pulse ring-2 ring-offset-1 ring-tg-accent' : ''}`}
            >🔍</button>
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
