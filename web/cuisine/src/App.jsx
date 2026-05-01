import React, { useEffect, useState } from 'react';
import { useCuisineState } from './state/useCuisineState.js';
import { searchCuisine } from './api/search.js';
import { requestLocation, showAlert } from './api/tg.js';
import Header from './components/Header.jsx';
import RadiusToggle from './components/RadiusToggle.jsx';
import ModeDropdown from './components/ModeDropdown.jsx';
import TimeDropdown from './components/TimeDropdown.jsx';
import CuisineChips from './components/CuisineChips.jsx';
import PresetCombos from './components/PresetCombos.jsx';
import ResultsGrid from './components/ResultsGrid.jsx';

export default function App() {
  const [state, a] = useCuisineState();
  const [locDenied, setLocDenied] = useState(false);

  // Pre-select cuisine from ?cuisine=Japanese deep-link.
  useEffect(() => {
    const url = new URL(window.location.href);
    const c = url.searchParams.get('cuisine');
    if (c) a.toggleCuisine(c);
  }, []);

  // v0.22.1 fix: auto-detect on mount so the Search button isn't dead by
  // default. If the user denies / browser blocks geolocation, we surface
  // a clear inline notice and keep Search clickable — pressing it then
  // reminds them to tap 📍.
  useEffect(() => {
    let cancelled = false;
    requestLocation()
      .then((p) => { if (!cancelled) a.setLoc(p); })
      .catch(() => { if (!cancelled) setLocDenied(true); });
    return () => { cancelled = true; };
  }, []);

  const onSearch = async () => {
    if (!state.loc) {
      showAlert('Tap 📍 Detect to share your location first.');
      return;
    }
    if (state.preset === 'cuisine-discovery' && !state.cuisines.length) {
      showAlert('Pick at least one cuisine for the Discovery preset.');
      return;
    }
    a.searchStart();
    try {
      const result = await searchCuisine({
        lat: state.loc.lat,
        lng: state.loc.lng,
        cuisines: state.cuisines,
        radius: state.radius,
        mode: state.mode,
        when: state.when,
        preset: state.preset
      });
      a.searchOk(result);
    } catch (err) {
      a.searchErr(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header loc={state.loc} onLoc={(p) => { a.setLoc(p); setLocDenied(false); }} />

      <div className="flex-1 px-3 pt-2 pb-24 flex flex-col gap-2">
        <RadiusToggle value={state.radius} onChange={(v) => { a.setRadius(v); a.clearPreset(); }} />
        <div className="grid grid-cols-2 gap-1.5">
          <ModeDropdown value={state.mode} onChange={(v) => { a.setMode(v); a.clearPreset(); }} />
          <TimeDropdown value={state.when} onChange={(v) => { a.setWhen(v); a.clearPreset(); }} />
        </div>
        <CuisineChips selected={state.cuisines} onToggle={a.toggleCuisine} />
        <PresetCombos active={state.preset} onPick={a.applyPreset} />

        <div className="border-t border-tg-border my-1" />

        {state.error && (
          <div className="text-xs text-red-400 px-2">⚠ {state.error}</div>
        )}
        {state.loading && (
          <div className="text-xs text-tg-hint px-2 py-4 text-center">🌿 Sensing the vibe…</div>
        )}
        {!state.loading && (
          <ResultsGrid results={state.results} expanded={state.expanded} onExpand={a.expand} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-3 py-2 bg-tg-bg border-t border-tg-border">
        {locDenied && !state.loc && (
          <div className="text-[11px] text-tg-hint pb-1.5 text-center">
            Tap 📍 above to share your location.
          </div>
        )}
        <button
          onClick={onSearch}
          disabled={state.loading}
          className="w-full text-sm font-medium px-4 py-2.5 rounded-md bg-tg-accent text-tg-accent-text disabled:opacity-50"
        >
          {state.loading ? 'Searching…' : '🔍 Search'}
        </button>
      </div>
    </div>
  );
}
