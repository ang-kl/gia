import React, { useEffect, useRef, useState } from 'react';
import { LINES, LINES_BY_CODE } from './data/lines.js';
import { initData } from './tg.js';
import { t, tn, useLocale } from './i18n.js';
import LineStatusPanel from './components/LineStatusPanel.jsx';
import SystemMap from './components/SystemMap.jsx';
import MrtMapPanel from './components/MrtMapPanel.jsx';
import AffectedTicker from './components/AffectedTicker.jsx';
import EngineeringList from './components/EngineeringList.jsx';
import LocationCard from './components/LocationCard.jsx';
import BackFab from './components/BackFab.jsx';

// v0.60.213 — build version for the footer tag line.
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

// Hitachi-style transport TMA — main composition.
// Layout (mobile-first):
//   1. Header: title + timestamp
//   2. SystemMap (focused line flashing, others muted)
//   3. LineStatusPanel (side card mirroring Hitachi's "JH Yokohama Line / Delay" card)
//   4. AffectedTicker (horizontal-scroll list of all affected lines)
//   5. LocationCard (you-are-here + nearest stations)
//   6. EngineeringList (next 7 days from data/mrt-engineering-closures.md)
export default function App() {
  const lang = useLocale();
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
  // v0.60.99 — one-shot auto-switch from PNG → Google Map on the
  // first line-chip tap. After that (whether the user stayed on
  // Google Map or toggled back to Schematic), subsequent chip taps
  // respect the user's current view choice. Codex P2 2026-05-11:
  // without this guard, tap-line → toggle-Schematic → tap-line
  // would yank the user back to Google Map.
  const autoSwitchedRef = useRef(false);
  // v0.60.96 — operator: "flip to Top when I am at the bottom of the
  // screen". atBottom = within 50 px of the document's full height.
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const reached = window.scrollY + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setAtBottom(reached >= fullH - 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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

  if (error) return <div className="p-4 text-tg-text">{t('error.unreachable', lang)} {error}</div>;
  if (!data) return <div className="p-4 text-tg-hint">{t('loading', lang)}</div>;

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
          <h1 className="text-base sm:text-lg font-bold leading-tight">{t('header.title', lang)}</h1>
          <div className="text-[11px] text-tg-hint">{data.timestampSGT || ''}</div>
        </div>
        <div className="text-[11px] text-tg-hint">
          {affectedCodes.length === 0
            ? <span className="text-green-500">{t('header.allNormal', lang)}</span>
            : <span className="text-orange-500">{tn(affectedCodes.length === 1 ? 'header.linesAffected' : 'header.linesAffectedPlural', lang, { n: affectedCodes.length })}</span>}
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
            {mapView === 'png' ? t('view.tipToGmap', lang) : t('view.tipZoomIn', lang)}
          </div>
          <div className="inline-flex rounded-md border border-tg-border overflow-hidden text-[11px] font-medium flex-shrink-0">
            <button
              type="button"
              onClick={() => setMapView('png')}
              aria-pressed={mapView === 'png'}
              className={`px-2.5 py-1 ${mapView === 'png' ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card text-tg-text'}`}
            >{t('view.btnSchematic', lang)}</button>
            <button
              type="button"
              onClick={() => setMapView('gmap')}
              aria-pressed={mapView === 'gmap'}
              className={`px-2.5 py-1 ${mapView === 'gmap' ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card text-tg-text'}`}
            >{t('view.btnGoogleMap', lang)}</button>
          </div>
        </div>
        {mapView === 'png'
          ? <SystemMap focusedCode={focusedCode} affectedCodes={affectedCodes} />
          : <MrtMapPanel focusedCode={focusedCode} onResetFocus={() => setFocusedCode(null)} statusByLine={statusByLine} lang={lang} />}
      </div>

      {focusedLine && (
        <LineStatusPanel line={focusedLine} status={focusedStatus} />
      )}

      {/* v0.60.99 — operator: include LRT lines (BPL + SLRT + PLRT)
          in the default scroll, not just heavy rail. When no lines
          are affected, show every operating line including LRTs. */}
      <AffectedTicker
        affectedCodes={affectedCodes.length ? affectedCodes : LINES.filter((l) => !l.future).map((l) => l.code)}
        focusedCode={focusedCode}
        onFocus={(code) => {
          setFocusedCode(code);
          // v0.60.99 — auto-switch to Google Map ONLY on the first
          // line-chip tap when still on the initial Schematic view.
          // The "All Lines" reset (code === null) is ignored; after
          // the one-shot fires, later taps respect whatever view
          // the user is currently on (so Schematic-after-toggle
          // sticks). See Codex review on PR #342.
          if (code && !autoSwitchedRef.current) {
            autoSwitchedRef.current = true;
            setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
          }
        }}
        statusByLine={statusByLine}
      />

      <LocationCard address={data.address} nearest={data.nearestMrt} />

      <EngineeringList closures={data.engineering || []} />

      {/* v0.60.215 — footer framed in a bordered box for clearer UI. */}
      <footer className="mx-2 mb-2 mt-2 border border-tg-border rounded-lg px-3 py-2 text-[8px] text-tg-hint text-center leading-tight">
        <div>Source: LTA TrainServiceAlerts (live) + curated engineering schedule</div>
        <div>{t('footer.tag', lang)} · v{BUILD_VERSION}</div>
      </footer>

      <BackFab />

      {/* v0.60.93 — bottom-right scroll FAB. Mirrors Cuisine TMA's
          ↑ top button (same inverse theme colour as BackFab so the
          pair reads as a matched set). ↓ scrolls one viewport down
          when above the hero threshold; ↑ scrolls to top otherwise. */}
      <button
        type="button"
        onClick={() => window.scrollTo({
          top: atBottom ? 0 : window.scrollY + window.innerHeight,
          behavior: 'smooth'
        })}
        aria-label={atBottom ? t('fab.topAria', lang) : t('fab.downAria', lang)}
        style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f', bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        className="fixed right-4 px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 z-50 whitespace-nowrap"
      >{atBottom ? t('fab.top', lang) : t('fab.down', lang)}</button>
    </div>
  );
}
