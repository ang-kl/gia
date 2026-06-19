import React, { useEffect, useRef, useState } from 'react';
import { LINES, LINES_BY_CODE } from './data/lines.js';
import { initData } from './tg.js';
import { t, tn, useLocale } from './i18n.js';
import LineStatusPanel from './components/LineStatusPanel.jsx';
import SystemMap from './components/SystemMap.jsx';
import MrtMapPanel from './components/MrtMapPanel.jsx';
import AffectedTicker from './components/AffectedTicker.jsx';
import FooterNav from './components/FooterNav.jsx';
import EngineeringList from './components/EngineeringList.jsx';
import LocationCard from './components/LocationCard.jsx';
import WeatherBadge from './components/WeatherBadge.jsx';

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
  // v0.61.14 — a station selected from the focused-line panel's
  // station picker. Drives the map's 6 km station-focus mode and the
  // selected-station status detail.
  const [focusedStation, setFocusedStation] = useState(null);
  // v0.60.85 — view toggle between the static PNG schematic
  // (SystemMap) and the interactive Google Map (MrtMapPanel,
  // ~177 ops + ~29 future pins). Operator 2026-05-10: "if the SG
  // Map is first loaded still show the PNG map of Singapore MRT
  // system network and suggest to user to toggle to see Google
  // Map as 184 pins in the map of singapore will be very cramp and
  // ugly." Default = 'png'; user opts into 'gmap' via toggle.
  const [mapView, setMapView] = useState('png');
  // v0.63.0 — map overlay layer toggles (parks / attractions / taxis /
  // carpark), shown only on the interactive Google Map view.
  const [overlayLayers, setOverlayLayers] = useState({ attractions: false, carpark: false, busstop: false, colour: true, train: true, exits: false, taxis: false, parks: false, police: false, clinics: false, hospitals: false });
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

  // v0.62.106 — deep-link: /app/transport?station=<CODE> focuses that station
  // on the Google map (the Cuisine venue card's 🚆 links use this). Resolve the
  // code → station from the live dataset and focus it. We set ONLY focusedStation
  // (+ gmap view) — not focusedCode — so the line-change effect below can't wipe
  // it. Runs once on mount.
  useEffect(() => {
    let cancelled = false;
    let wanted = '';
    try { wanted = (new URLSearchParams(window.location.search).get('station') || '').trim().toUpperCase(); }
    catch { wanted = ''; }
    if (!wanted) return undefined;
    fetch('/api/transport/stations')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const stations = Array.isArray(d?.stations) ? d.stations : [];
        const st = stations.find((s) => Array.isArray(s.codes)
          && s.codes.some((c) => String(c).toUpperCase() === wanted));
        if (!st) return;
        setFocusedStation({ ...st, tappedCode: wanted });
        setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
      })
      .catch(() => { /* deep-link best-effort */ });
    return () => { cancelled = true; };
  }, []);

  // v0.61.14 — a station selection belongs to one focused line; clear
  // it whenever the focused line changes so the map / detail don't
  // show a station from the previous line.
  useEffect(() => { setFocusedStation(null); }, [focusedCode]);

  if (error) return <div className="p-4 text-tg-text">{t('error.unreachable', lang)} {error}</div>;
  if (!data) return <div className="p-4 text-tg-hint">{t('loading', lang)}</div>;

  const affectedCodes = data.affectedCodes || [];
  const statusByLine = data.statusByLine || {};
  const focusedLine = focusedCode ? LINES_BY_CODE[focusedCode] : null;
  const focusedStatus = focusedCode ? statusByLine[focusedCode] : null;

  // v0.61.14 — station picked in the focused-line panel. Selecting a
  // station surfaces the Google Map (the 6 km station-focus view);
  // passing null clears the selection.
  function handleSelectStation(station, code) {
    if (station) {
      setFocusedStation({ ...station, tappedCode: code || station.focusCode });
      setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
    } else {
      setFocusedStation(null);
    }
  }

  return (
    <div
      className="bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-3 max-w-[1600px] mx-auto"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        // v0.62.166 — clear the fixed bottom FAB band (ticker + corner FABs) so
        // the footer / last content never hides behind it.
        paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* v0.62.164 — operator: ONE neo-skeuomorphic header card. Row 1 = title +
          live weather + line-status; row 2 = timestamp; row 3 = the zoom/explore
          tip; row 4 = the 🗺/📍 view toggle as tactile skeuo pills. The map tucks
          UP under this card (negative mt below) so it "goes below it".
          NOTE colour-blind safe: line status pairs the ✓ glyph / a count with
          the hue, so it never relies on green-vs-orange alone. */}
      <header className="skeuo-card rounded-2xl px-3 py-2.5 flex flex-col gap-1.5 relative z-10">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
          <h1 className="text-base sm:text-lg font-bold leading-tight">{t('header.title', lang)}</h1>
          {/* v0.60.219 — live Singapore weather emoji. */}
          <span className="text-[11px] text-tg-hint flex items-center"><WeatherBadge /></span>
          <span className="text-[11px] ml-auto">
            {affectedCodes.length === 0
              ? <span className="text-green-500">{t('header.allNormal', lang)}</span>
              : <span className="text-orange-500">{tn(affectedCodes.length === 1 ? 'header.linesAffected' : 'header.linesAffectedPlural', lang, { n: affectedCodes.length })}</span>}
          </span>
        </div>
        <div className="text-[11px] text-tg-hint">{data.timestampSGT || ''}</div>
        {/* v0.60.85 — the zoom/explore tip nudges first-time users toward the
            interactive Google Map when they want to look up a station. */}
        <div className="text-[11px] text-tg-hint italic">
          {mapView === 'png' ? t('view.tipToGmap', lang) : t('view.tipZoomIn', lang)}
        </div>
        <div className="inline-flex self-start gap-1.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setMapView('png')}
            aria-pressed={mapView === 'png'}
            className={`skeuo-pill px-3 py-1 rounded-lg active:scale-95 ${mapView === 'png' ? 'skeuo-pill--selected font-semibold' : 'text-tg-text'}`}
          >{t('view.btnSchematic', lang)}</button>
          <button
            type="button"
            onClick={() => setMapView('gmap')}
            aria-pressed={mapView === 'gmap'}
            className={`skeuo-pill px-3 py-1 rounded-lg active:scale-95 ${mapView === 'gmap' ? 'skeuo-pill--selected font-semibold' : 'text-tg-text'}`}
          >{t('view.btnGoogleMap', lang)}</button>
        </div>
      </header>

      {/* v0.62.164 — the map tucks UP under the header card (negative mt cancels
          the column gap-3; lower z so the header's frosted base + shadow sit over
          the map's top edge).
          v0.62.166 — operator: the line ticker is no longer inside/over the map —
          it's a floating FAB bar at the bottom (see below, beside the corner FABs). */}
      <div className="-mt-3 relative z-0">
        {mapView === 'png'
          ? <SystemMap focusedCode={focusedCode} affectedCodes={affectedCodes} />
          : <MrtMapPanel
              focusedCode={focusedCode}
              focusedStation={focusedStation}
              onStationSelect={handleSelectStation}
              onLineSelect={(code) => setFocusedCode(code)}
              statusByLine={statusByLine}
              lang={lang}
              overlayLayers={overlayLayers}
              onOverlayChange={setOverlayLayers}
            />}
      </div>

      {focusedLine && (
        <LineStatusPanel
          line={focusedLine}
          status={focusedStatus}
          statusByLine={statusByLine}
          selectedStation={focusedStation}
          onSelectStation={handleSelectStation}
          lang={lang}
        />
      )}

      {/* v0.62.164 — the AffectedTicker moved UP to overlap the map's bottom edge
          (see the map block above). LineStatusPanel now renders directly below
          the map+ticker, so picking a line in the ticker reveals its status here. */}
      <LocationCard address={data.address} nearest={data.nearestMrt} />

      <EngineeringList closures={data.engineering || []} />

      {/* v0.60.217 — footer: no border; font +1pt. */}
      <footer className="mx-2 mb-2 mt-2 px-3 py-2 text-[9px] text-tg-hint text-center leading-tight">
        <div>Source: LTA TrainServiceAlerts (live) + curated engineering schedule</div>
        <div>{t('footer.tag', lang)} · v{BUILD_VERSION}</div>
      </footer>

      {/* v0.62.166 — operator: the line ticker is a floating FAB bar at the
          bottom, OUTSIDE the map, centred BETWEEN the back/end FAB (left) and the
          top/down FAB (right). Width-capped (max-w 100vw-12rem) so it never
          reaches the corner FABs; z-40 stays under the z-50 FABs. The line chips
          scroll horizontally inside it (compact = no title row). */}
      <div
        className="fixed left-2 right-24 z-40 pointer-events-none"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="pointer-events-auto">
          <AffectedTicker
            compact
            affectedCodes={affectedCodes.length ? affectedCodes : LINES.filter((l) => !l.future).map((l) => l.code)}
            focusedCode={focusedCode}
            onFocus={(code) => {
              setFocusedCode(code);
              // v0.60.99 — first line-chip tap on the Schematic view auto-switches
              // to Google Map (one-shot); the "All Lines" reset (null) is ignored.
              if (code && !autoSwitchedRef.current) {
                autoSwitchedRef.current = true;
                setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
              }
            }}
            statusByLine={statusByLine}
          />
        </div>
      </div>

      {/* v0.62.213 — operator (IMG_1069 item 6): the merged back/end + top/down FAB
          is replaced by the shared FooterNav row so Menu / Train / Hawker all match
          the Cuisine TMA footer. The left corner stays free for the line ticker. */}
      <FooterNav
        atBottom={atBottom}
        labels={{
          top: t('fab.top', lang), down: t('fab.down', lang),
          topAria: t('fab.topAria', lang), downAria: t('fab.downAria', lang),
          back: t('fab.back', lang), end: t('fab.end', lang),
          backAria: t('fab.backAria', lang), endAria: t('fab.endAria', lang)
        }}
      />
    </div>
  );
}
