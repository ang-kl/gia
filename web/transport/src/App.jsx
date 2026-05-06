import React, { useEffect, useState } from 'react';
import { LINES, LINES_BY_CODE } from './data/lines.js';
import { initData } from './tg.js';
import LineStatusPanel from './components/LineStatusPanel.jsx';
import SystemMap from './components/SystemMap.jsx';
import AffectedTicker from './components/AffectedTicker.jsx';
import EngineeringList from './components/EngineeringList.jsx';
import LocationCard from './components/LocationCard.jsx';

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
      className="bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-3 max-w-[640px] mx-auto"
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

      <SystemMap focusedCode={focusedCode} affectedCodes={affectedCodes} />

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
    </div>
  );
}
