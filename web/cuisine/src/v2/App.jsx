import React, { useEffect, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery } from './lib/api.js';
import { defaultState, readFromHash, writeToHash } from './lib/state.js';
import QuickFilters from './components/QuickFilters.jsx';
import CuisineDrawer from './components/CuisineDrawer.jsx';
import MapPanel from './components/MapPanel.jsx';
import FlipPanel from './components/FlipPanel.jsx';
import { tg } from '../api/tg.js';

// v0.57.3: Singapore-wide search (no radius constraint). Header shows
// country alongside the title. Layout order:
//   Header → Map → Cuisine drawer → [Quick filters | Search button]
//   → Flip panel (Results / Tell Gia)
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
  const initialSearchDone = useRef(false);

  function stateSig(s) {
    return JSON.stringify({
      cuisines: [...(s.cuisines || [])].sort(),
      filters: {
        openNow: !!s.filters?.openNow,
        walking20: !!s.filters?.walking20,
        halal: !!s.filters?.halal,
        vegetarian: !!s.filters?.vegetarian,
        prices: [...(s.filters?.prices || [])].sort()
      }
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

  useEffect(() => {
    if (!userLoc || initialSearchDone.current) return;
    initialSearchDone.current = true;
    runSearch(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc?.lat, userLoc?.lng]);

  async function runSearch(snap = state) {
    if (!userLoc) return;
    setLoading(true); setError(null);
    try {
      const r = await searchCuisine({
        lat: userLoc.lat, lng: userLoc.lng,
        cuisines: snap.cuisines, filters: snap.filters
      });
      setVenues(r.venues || []);
      setLastRunSnap(stateSig(snap));
    } catch (err) {
      setError(err.message); setVenues([]);
    } finally { setLoading(false); }
  }

  async function handleNLSubmit(text) {
    setLastPrompt(text); setLoading(true); setError(null);
    try {
      const r = await nlQuery({ text, lat: userLoc?.lat, lng: userLoc?.lng, filters: state.filters });
      setVenues(r.venues || []);
      const nextState = { ...state };
      if (r.inferredCuisines?.length) nextState.cuisines = r.inferredCuisines.slice(0, 5);
      if (r.inferredFilters) nextState.filters = { ...nextState.filters, ...r.inferredFilters };
      setState(nextState);
      setLastRunSnap(stateSig(nextState));
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  function clearAll() {
    const fresh = defaultState();
    setState(fresh);
    runSearch(fresh);
  }

  const dirty = lastRunSnap !== null && stateSig(state) !== lastRunSnap;
  const filterCount = (state.filters.openNow ? 1 : 0) + (state.filters.walking20 ? 1 : 0)
    + (state.filters.halal ? 1 : 0) + (state.filters.vegetarian ? 1 : 0)
    + (state.filters.prices?.length || 0);
  const canClear = state.cuisines.length > 0 || filterCount > 0;

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-2 max-w-[640px] mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold leading-tight">🍽️ Cuisine — Singapore</h1>
        <div className="text-[11px] text-tg-hint">
          {state.cuisines.length}c · {filterCount}f
        </div>
      </header>

      <MapPanel venues={venues} userLoc={userLoc} focusedPlaceId={focusedPlaceId} onPinTap={setFocusedPlaceId} />

      {/* Cuisine drawer FIRST — primary intent */}
      <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
        onChange={(c) => setState((s) => ({ ...s, cuisines: c }))} />

      {/* Quick filters + Search button INLINE on one row */}
      <div className="flex gap-1.5 items-center sticky top-0 z-10 bg-tg-bg pt-1 pb-1">
        <div className="flex-1 min-w-0">
          <QuickFilters filters={state.filters} onChange={(f) => setState((s) => ({ ...s, filters: f }))} />
        </div>
        <button
          type="button"
          onClick={() => runSearch(state)}
          disabled={loading}
          className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
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
            className="shrink-0 text-xs px-2 py-2 rounded-md border border-tg-border bg-tg-card text-tg-text"
          >Clear</button>
        )}
      </div>

      <FlipPanel
        venues={venues} loading={loading} focusedPlaceId={focusedPlaceId}
        onCardTap={setFocusedPlaceId} onNLSubmit={handleNLSubmit}
        lastPrompt={lastPrompt} flipped={flipped} setFlipped={setFlipped}
      />

      {error && <div className="text-xs text-red-500 px-1">⚠️ {error}</div>}

      <footer className="text-[10px] text-tg-hint text-center pt-2">
        v0.57.3 · Singapore-wide · tap Search after changing filters
      </footer>
    </div>
  );
}
