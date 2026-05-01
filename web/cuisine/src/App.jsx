import React, { useEffect, useState } from 'react';
import { useCuisineState } from './state/useCuisineState.js';
import { searchCuisine } from './api/search.js';
import { requestLocation, showAlert } from './api/tg.js';
import Header from './components/Header.jsx';
import RangeSlider from './components/RangeSlider.jsx';
import ModeDropdown from './components/ModeDropdown.jsx';
import TimeDropdown from './components/TimeDropdown.jsx';
import CuisineAccordion from './components/CuisineAccordion.jsx';
import OtherCuisineInput from './components/OtherCuisineInput.jsx';
import PresetCombos from './components/PresetCombos.jsx';
import PromptPreview from './components/PromptPreview.jsx';
import ResultsGrid from './components/ResultsGrid.jsx';

function fmtMetres(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km` : `${m} m`;
}
function fmtDays(d) {
  if (d <= 14) return `${d} d`;
  if (d <= 90) return `${Math.round(d / 7)} wk`;
  return `${Math.round(d / 30)} mo`;
}

export default function App() {
  const [state, a] = useCuisineState();
  const [locDenied, setLocDenied] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const c = url.searchParams.get('cuisine');
    if (c) a.toggleCuisine(c);
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestLocation()
      .then((p) => { if (!cancelled) a.setLoc(p); })
      .catch(() => { if (!cancelled) setLocDenied(true); });
    return () => { cancelled = true; };
  }, []);

  const onSearch = async () => {
    if (!state.loc) {
      showAlert('Tap 📍 to share your location first.');
      return;
    }
    if (state.preset === 'cuisine-discovery' && !state.cuisines.length && !state.otherCuisine.trim()) {
      showAlert('Pick at least one cuisine for the Discovery preset.');
      return;
    }
    a.searchStart();
    const cuisinesPayload = [
      ...state.cuisines,
      ...state.otherCuisine.split(',').map((s) => s.trim()).filter(Boolean)
    ];
    try {
      const result = await searchCuisine({
        lat: state.loc.lat,
        lng: state.loc.lng,
        cuisines: cuisinesPayload,
        radius: state.radius,
        recencyDays: state.recencyDays,
        queueMaxMin: state.queueMaxMin,
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
        <RangeSlider
          label="Search radius"
          min={200} max={5000} step={100}
          value={state.radius}
          onChange={a.setRadius}
          format={fmtMetres}
        />
        <RangeSlider
          label='"Newly opened" window'
          min={5} max={180} step={5}
          value={state.recencyDays}
          onChange={a.setRecency}
          format={fmtDays}
        />
        <RangeSlider
          label="Max queue tolerance"
          min={5} max={60} step={5}
          value={state.queueMaxMin}
          onChange={a.setQueueMax}
          format={(v) => `${v} min`}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <ModeDropdown value={state.mode} onChange={a.setMode} />
          <TimeDropdown value={state.when} onChange={a.setWhen} />
        </div>

        <div className="border-t border-tg-border my-1" />

        <CuisineAccordion selected={state.cuisines} onToggle={a.toggleCuisine} />
        <OtherCuisineInput value={state.otherCuisine} onChange={a.setOtherCuisine} />

        <div className="border-t border-tg-border my-1" />

        <PresetCombos active={state.preset} onPick={a.applyPreset} />
        <PromptPreview state={state} />

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
