import React, { useEffect, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery } from './lib/api.js';
import { defaultState, readFromHash, writeToHash } from './lib/state.js';
import QuickFilters from './components/QuickFilters.jsx';
import CuisineDrawer from './components/CuisineDrawer.jsx';
import MapPanel from './components/MapPanel.jsx';
import FlipPanel from './components/FlipPanel.jsx';
import { tg } from '../api/tg.js';

// v0.56.2 — explicit Search button (no auto-debounce). Per Human Lead:
// "no refresh when I select something or clear selection. perhaps a
// button that state after selection click Ask". Auto-debounced search
// was racing with the NL submit and breaking on rapid changes.
//
// Flow now:
//   • Initial load: one search runs once we have userLoc
//   • Subsequent state changes (filters / cuisines): UI updates only
//   • User taps "Search" → fires runSearch with current state
//   • User taps "Clear all" → resets state + immediately searches default
//   • Tell Gia (NL) → fires nlQuery, syncs UI, NO duplicate runSearch
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
  // Snapshot of state at time of last search — used to gate the
  // Search button (highlights when state has changed since last run).
  const [lastRunSnap, setLastRunSnap] = useState(null);
  const initialSearchDone = useRef(false);

  // Stable signature for state to detect changes since last run.
  function stateSig(s) {
    return JSON.stringify({
      cuisines: [...(s.cuisines || [])].sort(),
      filters: {
        openNow: !!s.filters?.openNow,
        walking10: !!s.filters?.walking10,
        halal: !!s.filters?.halal,
        vegetarian: !!s.filters?.vegetarian,
        prices: [...(s.filters?.prices || [])].sort()
      },
      radius: s.radius || 800
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

  // Initial-load search ONCE userLoc is known. Subsequent searches
  // require explicit user action (Search button or NL submit).
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
        cuisines: snap.cuisines, filters: snap.filters, radius: snap.radius
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
      // Sync inferred state into UI (no duplicate search — nlQuery
      // already returned the venues).
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
  const filterCount = (state.filters.openNow ? 1 : 0) + (state.filters.walking10 ? 1 : 0)
    + (state.filters.halal ? 1 : 0) + (state.filters.vegetarian ? 1 : 0)
    + (state.filters.prices?.length || 0);
  const searchLabel = (state.cuisines.length === 0 && filterCount === 0)
    ? '🔍 Search nearby'
    : `🔍 Search (${state.cuisines.length} cuisine${state.cuisines.length === 1 ? '' : 's'}${filterCount ? ', ' + filterCount + ' filter' + (filterCount === 1 ? '' : 's') : ''})`;
  const canClear = state.cuisines.length > 0 || filterCount > 0;

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-2.5 max-w-[640px] mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold leading-tight">🍽️ Cuisine</h1>
        <div className="text-[11px] text-tg-hint">
          {state.cuisines.length} cuisine{state.cuisines.length === 1 ? '' : 's'} · {filterCount} filter{filterCount === 1 ? '' : 's'}
        </div>
      </header>

      <MapPanel venues={venues} userLoc={userLoc} focusedPlaceId={focusedPlaceId} onPinTap={setFocusedPlaceId} />

      <QuickFilters filters={state.filters} onChange={(f) => setState((s) => ({ ...s, filters: f }))} />

      <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
        onChange={(c) => setState((s) => ({ ...s, cuisines: c }))} />

      {/* Sticky search/clear bar. Highlights when state is dirty since last run. */}
      <div className="flex gap-1.5 sticky bottom-0 bg-tg-bg pb-1 pt-1.5 z-10">
        <button
          type="button"
          onClick={() => runSearch(state)}
          disabled={loading}
          className={`flex-1 text-sm font-semibold px-3 py-2 rounded-md transition-colors ${
            loading ? 'bg-tg-card text-tg-hint border border-tg-border'
            : dirty ? 'bg-tg-accent text-tg-accent-text ring-2 ring-offset-1 ring-tg-accent ring-offset-tg-bg'
            : 'bg-tg-accent text-tg-accent-text'
          }`}
        >
          {loading ? 'Searching…' : searchLabel}
          {dirty && !loading && <span className="ml-1.5 text-[10px] opacity-80">(updated)</span>}
        </button>
        {canClear && (
          <button
            type="button"
            onClick={clearAll}
            disabled={loading}
            className="text-xs px-3 py-2 rounded-md border border-tg-border bg-tg-card text-tg-text"
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
        v0.56.2 · Places-first · tap Search after changing filters
      </footer>
    </div>
  );
}
