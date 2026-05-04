import React, { useEffect, useRef, useState } from 'react';
import { fetchCatalogue, searchCuisine, nlQuery } from './lib/api.js';
import { defaultState, readFromHash, writeToHash } from './lib/state.js';
import QuickFilters from './components/QuickFilters.jsx';
import CuisineDrawer from './components/CuisineDrawer.jsx';
import MapPanel from './components/MapPanel.jsx';
import FlipPanel from './components/FlipPanel.jsx';
import { tg } from '../api/tg.js';

const DEBOUNCE_MS = 350;

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
  const debounceRef = useRef(null);

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
    if (!userLoc) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearch, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cuisines.join(','), JSON.stringify(state.filters), state.radius, userLoc?.lat, userLoc?.lng]);

  async function runSearch() {
    if (!userLoc) return;
    setLoading(true); setError(null);
    try {
      const r = await searchCuisine({
        lat: userLoc.lat, lng: userLoc.lng,
        cuisines: state.cuisines, filters: state.filters, radius: state.radius
      });
      setVenues(r.venues || []);
    } catch (err) {
      setError(err.message); setVenues([]);
    } finally { setLoading(false); }
  }

  async function handleNLSubmit(text) {
    setLastPrompt(text); setLoading(true);
    try {
      const r = await nlQuery({ text, lat: userLoc?.lat, lng: userLoc?.lng, filters: state.filters });
      setVenues(r.venues || []);
      if (r.inferredCuisines?.length) {
        setState((s) => ({ ...s, cuisines: r.inferredCuisines.slice(0, 5) }));
      }
      if (r.inferredFilters) {
        setState((s) => ({ ...s, filters: { ...s.filters, ...r.inferredFilters } }));
      }
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-2.5 max-w-[640px] mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold leading-tight">🍽️ Cuisine</h1>
        <div className="text-[11px] text-tg-hint">
          {state.cuisines.length} cuisine{state.cuisines.length === 1 ? '' : 's'}
        </div>
      </header>

      <MapPanel venues={venues} userLoc={userLoc} focusedPlaceId={focusedPlaceId} onPinTap={setFocusedPlaceId} />

      <QuickFilters filters={state.filters} onChange={(f) => setState((s) => ({ ...s, filters: f }))} />

      <CuisineDrawer catalogue={catalogue} selected={state.cuisines}
        onChange={(c) => setState((s) => ({ ...s, cuisines: c }))} />

      <FlipPanel
        venues={venues} loading={loading} focusedPlaceId={focusedPlaceId}
        onCardTap={setFocusedPlaceId} onNLSubmit={handleNLSubmit}
        lastPrompt={lastPrompt} flipped={flipped} setFlipped={setFlipped}
      />

      {error && <div className="text-xs text-red-500 px-1">⚠️ {error}</div>}

      <footer className="text-[10px] text-tg-hint text-center pt-2">
        v0.53.0 · Places-first discovery
      </footer>
    </div>
  );
}
