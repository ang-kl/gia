import React, { useEffect, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery, warmStart, fetchUserLocation, reverseGeocode } from './lib/api.js';
import { defaultState, clearedFilters, readFromHash, readOverridesFromHash, writeToHash } from './lib/state.js';
import QuickFilters from './components/QuickFilters.jsx';
import ActiveFilters from './components/ActiveFilters.jsx';
import CuisineDrawer from './components/CuisineDrawer.jsx';
import LocationField from './components/LocationField.jsx';
import MapPanel from './components/MapPanel.jsx';
import TellMePanel from './components/TellMePanel.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';
import { useLocale, t, tn } from './lib/i18n.js';
import { tg } from '../api/tg.js';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState(null);
  // v0.59.0: collapsible "Search criteria" section. Default collapsed
  // when a search has already produced results so the user can scan
  // results without scrolling past the builder.
  const [criteriaOpen, setCriteriaOpen] = useState(true);
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
  // v0.58.23: explicit location-resolution status. Banner above the
  // map tells users "we're locating you" while userLoc resolves, then
  // "Telok Blangah · 5 places nearby" once everything's loaded.
  // Resolved name is reverse-geocoded from userLoc once on every
  // change (server caches 24h per grid cell so repeat calls are
  // free).
  const [locationName, setLocationName] = useState('');
  useEffect(() => {
    if (!userLoc?.lat || !userLoc?.lng) {
      setLocationName('');
      return;
    }
    let cancelled = false;
    reverseGeocode({ lat: userLoc.lat, lng: userLoc.lng })
      .then((r) => { if (!cancelled) setLocationName(r?.name || ''); })
      .catch(() => { /* leave empty; banner shows generic line */ });
    return () => { cancelled = true; };
  }, [userLoc?.lat, userLoc?.lng]);
  useEffect(() => {
    function onScroll() {
      setScrolledPastHero((window.scrollY || 0) > 320);
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
        prices: [...(s.filters?.prices || [])].sort()
      },
      region: s.region || 'SG'
    });
  }

  useEffect(() => {
    fetchCatalogue()
      .then((d) => setCatalogue(d.categories || []))
      .catch((err) => console.warn('[Cuisine-TMA-v2] catalogue fetch failed:', err));
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
          setWarmStartSeed(r.seed || null);
          setSearchCenter({ lat: userLoc.lat, lng: userLoc.lng });
          // v0.59.18 (Codex review #223): seed lastRunSnap with the
          // current state signature so the dirty ring lights up the
          // moment the user toggles a filter / cuisine / region after
          // warm-start. Without this, dirty stays false until the user's
          // first manual 🔍 — they'd see no visible cue that pressing
          // Search would do something different.
          setLastRunSnap(stateSig(state));
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

  async function runSearch(snap = state, anchor = null) {
    if (!userLoc) return;
    const center = anchor || searchCenter || userLoc;
    // v0.58.26: defence-in-depth — never POST {lat:0, lng:0}. Server
    // now 400s on zero-coord but the user would see a confusing error;
    // surfacing a clearer message client-side is friendlier.
    if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)
        || (Math.abs(center.lat) < 0.001 && Math.abs(center.lng) < 0.001)) {
      console.warn('[Cuisine-TMA-v2] runSearch: refusing zero/invalid center', center);
      setError('Location not yet resolved — share a pin via /location and reopen.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const r = await searchCuisine({
        lat: center.lat, lng: center.lng,
        cuisines: snap.cuisines, filters: snap.filters,
        region: snap.region || 'SG',
        lang                                              // v0.59.0
      });
      setVenues(r.venues || []);
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
      // v0.58.14: scroll the result list into view so users don't
      // miss it. Wrapped in a microtask so the new venues render
      // first; smooth scroll keeps the motion gentle.
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } catch (err) {
      setError(err.message); setVenues([]);
    } finally { setLoading(false); }
  }

  // v0.58.2: re-anchor the search at an explicit lat/lng (the map's
  // viewport centre when the user taps "Search this area").
  function runSearchAt(lat, lng) {
    runSearch(state, { lat, lng });
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
  const filterCount = (state.filters.newlyOpened ? 1 : 0) + (state.filters.openNow ? 1 : 0)
    + (state.filters.halal ? 1 : 0)
    + (state.filters.vegetarian ? 1 : 0) + (state.filters.homeBased ? 1 : 0)
    + (state.filters.prices?.length || 0);
  const canClear = state.cuisines.length > 0 || filterCount > 0;

  // v0.58.17 (Tier 1 responsive): widened max-w from 640 → 1024 and
  // added breakpoint padding so the TMA stops looking like a narrow
  // column on iPad / Samsung tablet / desktop Telegram. Phone layout
  // (≤640 px) is unchanged; >640 px viewports get progressively more
  // breathing room. Subsequent tiers can lean further into md:/lg:
  // variants for grid columns, side-by-side map+results, etc.
  return (
    <div
      className="bg-tg-bg text-tg-text py-3 flex flex-col gap-2 max-w-[1024px] mx-auto px-3 md:px-6 lg:px-8"
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
            <div className="text-[11px] text-tg-hint">
              {state.cuisines.length}c · {filterCount}f
            </div>
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
                onClick={() => setState((s) => ({ ...s, region: r.id }))}
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

      {/* v0.58.23: explicit location-resolution status banner. Tells
          users what's happening while userLoc resolves (geolocation
          5 s timeout → server cache → SG centroid) and confirms the
          anchor area once known. Disappears after results load. */}
      {(() => {
        if (!userLoc) {
          return (
            <div className="text-[11px] text-tg-hint italic px-1 py-1">
              📍 {lang === 'fr' ? 'Localisation en cours…' : 'Locating you…'}
            </div>
          );
        }
        if (loading) {
          return (
            <div className="text-[11px] text-tg-hint px-1 py-1">
              📍 {locationName || t('banner.locating', lang)} · {t('banner.locating.suffix', lang)}
            </div>
          );
        }
        if (!venues.length) {
          return (
            <div className="text-[11px] text-tg-hint px-1 py-1">
              📍 {locationName || t('banner.anchor', lang)} · {t('banner.no.match', lang)}
            </div>
          );
        }
        return (
          <div className="text-[11px] text-tg-hint px-1 py-1">
            📍 {locationName || t('banner.showing', lang)} · {venues.length === 1
              ? t('banner.places.one', lang)
              : tn('banner.places.many', lang, { n: venues.length })}
          </div>
        );
      })()}

      <MapPanel venues={venues} userLoc={userLoc} focusedPlaceId={focusedPlaceId} onPinTap={setFocusedPlaceId}
        searchCenter={searchCenter || userLoc} onSearchHere={runSearchAt}
        anchorName={locationName} />

      {/* v0.59.0: ActiveFilters chip bar moved BELOW the map per
          Human Lead. Always visible regardless of whether the
          collapsible Search-criteria section is open. */}
      <ActiveFilters
        cuisines={state.cuisines}
        filters={state.filters}
        onRemoveCuisine={removeCuisine}
        onRemoveFilter={removeFilter}
        onResetAll={clearAll}
      />

      {/* v0.59.0: Tell-me input box also moved BELOW the map. Always
          visible — single-line composer, expands the conversation
          inline. Replaces the v0.57.30 FlipPanel back-face. */}
      <TellMePanel
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
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-tg-text hover:bg-tg-bg/30 transition-colors"
        >
          <span aria-hidden className="text-tg-accent text-base leading-none">{criteriaOpen ? '▾' : '▸'}</span>
          <span className="flex-1 text-left">{lang === 'fr' ? 'Critères de recherche' : 'Search criteria'}</span>
          <span className="text-[11px] text-tg-hint font-normal">
            {state.cuisines.length}c · {filterCount}f
          </span>
          <span
            aria-hidden
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-tg-accent text-tg-accent-text"
          >
            {criteriaOpen ? t('btn.collapse', lang) : t('btn.editSearch', lang)}
          </span>
        </button>
        {criteriaOpen && (
          <div className="flex flex-col gap-2 px-3 pb-3">
            <QuickFilters filters={state.filters} onChange={(f) => setState((s) => ({ ...s, filters: f }))} />
            {userLoc && (
              <LocationField userLoc={userLoc} region={state.region}
                onSelect={(p) => {
                  if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) {
                    setLocationAnchor({ lat: p.lat, lng: p.lng, name: p.label || '' });
                    runSearchAt(p.lat, p.lng);
                  } else {
                    setLocationAnchor(null);
                  }
                }} />
            )}
            <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
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
                onClick={() => runSearch(state)}
                disabled={loading}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-2xl transition-colors whitespace-nowrap ${
                  loading ? 'bg-tg-card text-tg-hint border border-tg-border'
                  : dirty ? 'bg-tg-accent text-tg-accent-text ring-2 ring-offset-1 ring-tg-accent ring-offset-tg-bg'
                  : 'bg-tg-accent text-tg-accent-text'
                }`}
              >
                {loading ? '…' : t('btn.searchFull', lang)}
              </button>
              {canClear && (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={loading}
                  className="shrink-0 text-xs px-3 py-2 rounded-2xl border border-tg-border bg-tg-card text-tg-text"
                >Clear</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={resultPanelRef}>
        <ResultPanel
          venues={venues}
          loading={loading}
          focusedPlaceId={focusedPlaceId}
          onCardTap={setFocusedPlaceId}
          warmStartSeed={warmStartSeed}
          copyState={{
            cuisines: state.cuisines,
            filters: state.filters,
            region: state.region,
            location: locationAnchor
          }}
        />
      </div>

      {error && <div className="text-xs text-red-500 px-1">⚠️ {error}</div>}

      <footer className="text-[10px] text-tg-hint text-center pt-2">
        v0.59.47 · {state.region === 'JB' ? t('region.johor', lang) : t('region.singapore', lang)} · {t('header.tagline', lang)}
      </footer>

      {/* v0.59.1: floating action buttons. Always-visible 🔍 Search
          (so the user can re-run a search without scrolling back to
          the criteria builder), plus a contextual ↑ Top that only
          appears when the user has scrolled past the hero (map +
          active filters). Stacked bottom-right, fixed positioning,
          z-30 to sit above the result panel. */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-30 pointer-events-none">
        {scrolledPastHero && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={t('btn.backToTop', lang)}
            className="pointer-events-auto w-11 h-11 rounded-full bg-tg-card text-tg-text border border-tg-border shadow-md text-base font-semibold flex items-center justify-center hover:bg-tg-bg active:scale-95 transition-all"
          >↑</button>
        )}
        <button
          type="button"
          onClick={() => runSearch(state)}
          disabled={loading}
          aria-label={lang === 'fr' ? 'Rechercher · Trouvez où manger' : 'Search · Show me places to eat'}
          className={`pointer-events-auto w-11 h-11 rounded-full shadow-md text-base font-semibold flex items-center justify-center active:scale-95 transition-all ${
            loading ? 'bg-tg-card text-tg-hint border border-tg-border'
            : dirty ? 'bg-tg-accent text-tg-accent-text ring-2 ring-offset-1 ring-tg-accent'
            : 'bg-tg-accent text-tg-accent-text'
          } ${searchHintActive ? 'animate-pulse ring-2 ring-offset-1 ring-tg-accent' : ''}`}
        >🔍</button>
      </div>
    </div>
  );
}
