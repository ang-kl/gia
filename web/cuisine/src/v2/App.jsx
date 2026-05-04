import React, { useEffect, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery, warmStart } from './lib/api.js';
import { defaultState, clearedFilters, readFromHash, writeToHash } from './lib/state.js';
import QuickFilters from './components/QuickFilters.jsx';
import ActiveFilters from './components/ActiveFilters.jsx';
import CuisineDrawer from './components/CuisineDrawer.jsx';
import LocationField from './components/LocationField.jsx';
import MapPanel from './components/MapPanel.jsx';
import RadiusSlider, { RADIUS_DEFAULT_M } from './components/RadiusSlider.jsx';
import FlipPanel from './components/FlipPanel.jsx';
import { tg } from '../api/tg.js';

// v0.57.3: Singapore-wide search (no radius constraint). Header shows
// country alongside the title.
// v0.58.1: layout — filter strip moved below the map (Google-Maps-style),
// active-filter chips below Search/Clear, walking filter dropped, Halal
// default ON.
//   Header → Map → Filter strip → Cuisine drawer → Search/Clear
//   → Active-filter chips → FlipPanel (Results / Tell Gia)
export default function App() {
  const [catalogue, setCatalogue] = useState(null);
  const [state, setState] = useState(() => readFromHash());
  const [userLoc, setUserLoc] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState(null);
  const [flipped, setFlipped] = useState(false);
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
  // v0.58.8: search radius in metres. Defaults to 80 km (RADIUS_DEFAULT_M)
  // — the slider's top stop, covers SG island-wide. User-selectable
  // via the vertical slider on the map's right edge. Threads into
  // /api/cuisine/search → pipeline.discover({ radius }).
  const [radius, setRadius] = useState(RADIUS_DEFAULT_M);
  const initialSearchDone = useRef(false);

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

  useEffect(() => {
    const w = tg();
    const init = w?.initDataUnsafe || {};
    const tgLoc = init.user_location || init.user?.location;
    if (tgLoc?.latitude && tgLoc?.longitude) {
      setUserLoc({ lat: tgLoc.latitude, lng: tgLoc.longitude });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserLoc({ lat: 1.3521, lng: 103.8198 })
      );
    } else {
      setUserLoc({ lat: 1.3521, lng: 103.8198 });
    }
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
    setLoading(true); setError(null);
    warmStart({ lat: userLoc.lat, lng: userLoc.lng, region: state.region })
      .then((r) => {
        setVenues(r.venues || []);
        setWarmStartSeed(r.seed || null);
        setSearchCenter({ lat: userLoc.lat, lng: userLoc.lng });
      })
      .catch((err) => {
        console.warn('[Cuisine-TMA-v2] warm-start failed, falling back:', err.message);
        runSearch(state);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc?.lat, userLoc?.lng]);

  async function runSearch(snap = state, anchor = null, radiusOverride = null) {
    if (!userLoc) return;
    const center = anchor || searchCenter || userLoc;
    const r_m = Number.isFinite(radiusOverride) ? radiusOverride : radius;
    setLoading(true); setError(null);
    try {
      const r = await searchCuisine({
        lat: center.lat, lng: center.lng,
        cuisines: snap.cuisines, filters: snap.filters,
        region: snap.region || 'SG',
        radius: r_m
      });
      setVenues(r.venues || []);
      setSearchCenter({ lat: center.lat, lng: center.lng });
      setLastRunSnap(stateSig(snap));
      // v0.58.4: any explicit search supersedes the warm-start label.
      setWarmStartSeed(null);
    } catch (err) {
      setError(err.message); setVenues([]);
    } finally { setLoading(false); }
  }

  // v0.58.8: tapping a slider stop updates the radius state and
  // immediately re-runs the search at the new radius. Pass meters
  // directly to runSearch to avoid the React-state-stale-closure
  // problem (setRadius commits asynchronously).
  function handleRadiusChange(meters) {
    if (!Number.isFinite(meters) || meters === radius) return;
    setRadius(meters);
    if (initialSearchDone.current) runSearch(state, null, meters);
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
      const r = await nlQuery({ text, lat: userLoc?.lat, lng: userLoc?.lng, filters: state.filters });
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
    const fresh = { ...defaultState(), cuisines: [], filters: clearedFilters() };
    setState(fresh);
    runSearch(fresh);
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

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-2 max-w-[640px] mx-auto">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="soleat-icon.png" alt="soleat" width="24" height="24" className="rounded-full flex-shrink-0" />
            <h1 className="text-lg font-bold leading-tight truncate">Cuisine</h1>
          </div>
          <div className="text-[11px] text-tg-hint shrink-0">
            {state.cuisines.length}c · {filterCount}f
          </div>
        </div>
        {/* v0.57.9: region toggle on its own row so it's always visible.
            v0.57.34: JB now uses the Johor state flag icon (johor-flag.png)
            instead of the 🇲🇾 Malaysia emoji — Johor Bahru is the city, not
            the country. */}
        <div className="flex gap-1.5">
          {[
            { id: 'SG', flag: '🇸🇬', label: 'Singapore' },
            { id: 'JB', flag: 'johor-flag.png', label: 'Johor Bahru' }
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

      {/* v0.58.7: location anchor field. Reverse-geocodes the user's
          GPS for the placeholder ("📍 Telok Blangah") and lets them
          search a different anchor via Google Places Autocomplete.
          Picking a suggestion fires runSearchAt(lat, lng) so the map
          and result list both re-anchor in one tap. */}
      {userLoc && (
        <LocationField userLoc={userLoc} region={state.region}
          onSelect={(p) => { if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) runSearchAt(p.lat, p.lng); }} />
      )}

      <MapPanel venues={venues} userLoc={userLoc} focusedPlaceId={focusedPlaceId} onPinTap={setFocusedPlaceId}
        searchCenter={searchCenter || userLoc} onSearchHere={runSearchAt}>
        <RadiusSlider value={radius} onChange={handleRadiusChange} />
      </MapPanel>

      {/* v0.58.1: filter strip sits directly below the map, primary
          row shows Open-now / Halal / [⚙], the rest live in the
          overflow popover so the cuisine drawer + search controls
          stay close to the action. */}
      <QuickFilters filters={state.filters} onChange={(f) => setState((s) => ({ ...s, filters: f }))} />

      <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
        onChange={(c) => setState((s) => ({ ...s, cuisines: c }))} />

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5 items-center">
          <button
            type="button"
            onClick={() => runSearch(state)}
            disabled={loading}
            className={`flex-1 text-xs font-semibold px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
              loading ? 'bg-tg-card text-tg-hint border border-tg-border'
              : dirty ? 'bg-tg-accent text-tg-accent-text ring-2 ring-offset-1 ring-tg-accent ring-offset-tg-bg'
              : 'bg-tg-accent text-tg-accent-text'
            }`}
          >
            {loading ? '…' : '🔍 Search'}
          </button>
          {canClear && (
            <button
              type="button"
              onClick={clearAll}
              disabled={loading}
              className="shrink-0 text-xs px-3 py-2 rounded-md border border-tg-border bg-tg-card text-tg-text"
            >Clear</button>
          )}
        </div>

        {/* v0.58.1: read-only summary of every active selection with
            ✕ to remove individual chips + Reset all link. */}
        <ActiveFilters
          cuisines={state.cuisines}
          filters={state.filters}
          onRemoveCuisine={removeCuisine}
          onRemoveFilter={removeFilter}
          onResetAll={clearAll}
        />
      </div>

      <FlipPanel
        venues={venues} loading={loading} focusedPlaceId={focusedPlaceId}
        onCardTap={setFocusedPlaceId} onNLSubmit={handleNLSubmit}
        onNLReplace={handleNLReplace}
        lastPrompt={lastPrompt} flipped={flipped} setFlipped={setFlipped}
        warmStartSeed={warmStartSeed}
      />

      {error && <div className="text-xs text-red-500 px-1">⚠️ {error}</div>}

      <footer className="text-[10px] text-tg-hint text-center pt-2">
        v0.58.8 · {state.region === 'JB' ? 'Johor Bahru' : 'Singapore'} · tap Search after changing filters
      </footer>
    </div>
  );
}
