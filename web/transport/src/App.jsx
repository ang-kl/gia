import React, { useEffect, useState } from 'react';
import { LINES, LINES_BY_CODE } from './data/lines.js';
import { initData } from './tg.js';
import LineStatusPanel from './components/LineStatusPanel.jsx';
import SystemMap from './components/SystemMap.jsx';
import MrtMapPanel from './components/MrtMapPanel.jsx';
import AffectedTicker from './components/AffectedTicker.jsx';
import EngineeringList from './components/EngineeringList.jsx';
import LocationCard from './components/LocationCard.jsx';
import BackFab from './components/BackFab.jsx';

// Hitachi-style transport TMA — main composition.
// Layout (mobile-first):
//   1. Header: title + timestamp
//   2. SystemMap (focused line flashing, others muted)
//   3. LineStatusPanel (side card mirroring Hitachi's "JH Yokohama Line / Delay" card)
//   4. AffectedTicker (horizontal-scroll list of all affected lines)
//   5. LocationCard (you-are-here + nearest stations)
//   6. EngineeringList (next 7 days from data/mrt-engineering-closures.md)
export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [focusedCode, setFocusedCode] = useState(null);
  // v0.60.85 — view toggle between the static PNG schematic
  // (SystemMap) and the interactive Google Map (MrtMapPanel,
  // ~177 ops + ~29 future pins). Operator 2026-05-10: "if the SG
  // Map is first loaded still show the PNG map of Singapore MRT
  // system network and suggest to user to toggle to see Google
  // Map as 184 pins in the map of singapore will be very cramp and
  // ugly." Default = 'png'; user opts into 'gmap' via toggle.
  const [mapView, setMapView] = useState('png');
  // v0.60.93 — scroll FAB state machine mirroring the cuisine TMA's
  // `scrolledPastHero` pattern. Bottom-right FAB shows ↓ when the
  // user is at the top (map below the fold), flips to ↑ once the
  // user has scrolled past the hero. Same threshold heuristic
  // (240 px) as the Cuisine TMA modulo the smaller hero height
  // here — covers status banner + view toggle row.
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolledPastHero(window.scrollY > 240);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/transport/status?initData=' + encodeURIComponent(initData()))
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => {
        setData(d);
        // Auto-focus the first affected line, if any.
        if (d?.affectedCodes?.length && !focusedCode) setFocusedCode(d.affectedCodes[0]);
      })
      .catch((err) => setError(err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="p-4 text-tg-text">⚠️ Could not load MRT status: {error}</div>;
  if (!data) return <div className="p-4 text-tg-hint">Loading MRT status…</div>;

  const affectedCodes = data.affectedCodes || [];
  const statusByLine = data.statusByLine || {};
  const focusedLine = focusedCode ? LINES_BY_CODE[focusedCode] : null;
  const focusedStatus = focusedCode ? statusByLine[focusedCode] : null;

  return (
    <div
      className="bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-3 max-w-[960px] mx-auto"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold leading-tight">🚇 SG MRT</h1>
          <div className="text-[11px] text-tg-hint">{data.timestampSGT || ''}</div>
        </div>
        <div className="text-[11px] text-tg-hint">
          {affectedCodes.length === 0
            ? <span className="text-green-500">✓ All lines normal</span>
            : <span className="text-orange-500">⚠️ {affectedCodes.length} line{affectedCodes.length === 1 ? '' : 's'} affected</span>}
        </div>
      </header>

      {/* v0.60.85 — view toggle. PNG (default, clean schematic) vs
          Google Map (~177 pins, opt-in because the pin density is
          high in central SG). Hint line above the toggle nudges
          first-time users toward the interactive view when they
          want to look up a specific station. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-tg-hint italic flex-1 min-w-0">
            {mapView === 'png'
              ? 'Tap "Google Map" to explore each station →'
              : 'Tip: zoom in to read the pins (central SG is dense)'}
          </div>
          <div className="inline-flex rounded-md border border-tg-border overflow-hidden text-[11px] font-medium flex-shrink-0">
            <button
              type="button"
              onClick={() => setMapView('png')}
              aria-pressed={mapView === 'png'}
              className={`px-2.5 py-1 ${mapView === 'png' ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card text-tg-text'}`}
            >🗺 Schematic</button>
            <button
              type="button"
              onClick={() => setMapView('gmap')}
              aria-pressed={mapView === 'gmap'}
              className={`px-2.5 py-1 ${mapView === 'gmap' ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card text-tg-text'}`}
            >📍 Google Map</button>
          </div>
        </div>
        {mapView === 'png'
          ? <SystemMap focusedCode={focusedCode} affectedCodes={affectedCodes} />
          : <MrtMapPanel focusedCode={focusedCode} onResetFocus={() => setFocusedCode(null)} />}
      </div>

      {focusedLine && (
        <LineStatusPanel line={focusedLine} status={focusedStatus} />
      )}

      <AffectedTicker
        affectedCodes={affectedCodes.length ? affectedCodes : LINES.slice(0, 7).map((l) => l.code)}
        focusedCode={focusedCode}
        onFocus={setFocusedCode}
      />

      <LocationCard address={data.address} nearest={data.nearestMrt} />

      <EngineeringList closures={data.engineering || []} />

      <footer className="text-[10px] text-tg-hint text-center pt-2">
        Source: LTA TrainServiceAlerts (live) + curated engineering schedule
      </footer>

      <BackFab />

      {/* v0.60.93 — bottom-right scroll FAB. Mirrors Cuisine TMA's
          ↑ top button (same inverse theme colour as BackFab so the
          pair reads as a matched set). ↓ scrolls one viewport down
          when above the hero threshold; ↑ scrolls to top otherwise. */}
      <button
        type="button"
        onClick={() => window.scrollTo({
          top: scrolledPastHero ? 0 : window.scrollY + window.innerHeight,
          behavior: 'smooth'
        })}
        aria-label={scrolledPastHero ? 'Back to top' : 'Scroll down'}
        style={{ backgroundColor: 'var(--tg-text)', color: 'var(--tg-bg)' }}
        className="fixed bottom-4 right-4 w-8 h-8 rounded-t-md rounded-b-[16px] border border-tg-border shadow-md text-base flex items-center justify-center active:scale-95 z-50"
      ><span aria-hidden="true">{scrolledPastHero ? '↑' : '↓'}</span></button>
    </div>
  );
}
