import React, { useEffect, useRef, useState } from 'react';
import { LINES, LINES_BY_CODE } from './data/lines.js';
import { initData } from './tg.js';
import { t, tn, useLocale } from './i18n.js';
import LineStatusPanel from './components/LineStatusPanel.jsx';
import StationCard from './components/StationCard.jsx';
import SystemMap from './components/SystemMap.jsx';
import MrtMapPanel from './components/MrtMapPanel.jsx';
import AffectedTicker from './components/AffectedTicker.jsx';
import EngineeringList from './components/EngineeringList.jsx';
import LocationCard from './components/LocationCard.jsx';
import WeatherBadge from '../../_shared/components/WeatherBadge.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';

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
  // v0.62.598 — the rich station-info card's data sources: the per-station
  // dataset (/api/geo/stations, keyed by name), the coarse station list
  // (/api/transport/stations, for terminus resolution + code→station lookup),
  // live platform crowd, and the tapped station's amenity context.
  const [geoStations, setGeoStations] = useState(null);
  const [coarseStations, setCoarseStations] = useState(null);
  const [crowd, setCrowd] = useState(null);
  const [stationContext, setStationContext] = useState(null);
  // v0.60.85 — view toggle between the static PNG schematic
  // (SystemMap) and the interactive Google Map (MrtMapPanel,
  // ~177 ops + ~29 future pins). Operator 2026-05-10: "if the SG
  // Map is first loaded still show the PNG map of Singapore MRT
  // system network and suggest to user to toggle to see Google
  // Map as 184 pins in the map of singapore will be very cramp and
  // ugly." Default = 'png'; user opts into 'gmap' via toggle.
  // v0.62.223 — operator (IMG_2537) REVERSED this: "also start in google
  // map mode". Default is now 'gmap'; the schematic PNG stays one tap away
  // via the view toggle (the prior 2026-05-10 rationale kept above).
  const [mapView, setMapView] = useState('gmap');
  // v0.63.0 — map overlay layer toggles (parks / attractions / taxis /
  // carpark), shown only on the interactive Google Map view.
  const [overlayLayers, setOverlayLayers] = useState({ attractions: false, carpark: false, busstop: false, hawker: false, colour: true, train: true, exits: false, taxis: false, parks: false, police: false, clinics: false, hospitals: false });
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

  // v0.62.598 — load the station card's shared datasets once: the rich
  // per-station info (/api/geo/stations), the coarse station list (for
  // terminus resolution + code lookups), and live platform crowd.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/geo/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setGeoStations(d.stations || d || {}); })
      .catch(() => { /* card degrades to coarse identity */ });
    fetch('/api/transport/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCoarseStations(Array.isArray(d.stations) ? d.stations : []); })
      .catch(() => { /* terminus links simply omitted */ });
    fetch('/api/transport/crowd')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCrowd(d.crowd || {}); })
      .catch(() => { /* crowd line omitted */ });
    return () => { cancelled = true; };
  }, []);

  // v0.62.598 — fetch the tapped station's amenity context (bus stops, taxi
  // stands, nearest hawker) whenever the focused station changes.
  useEffect(() => {
    if (!focusedStation || !Number.isFinite(focusedStation.lat) || !Number.isFinite(focusedStation.lng)) {
      setStationContext(null);
      return undefined;
    }
    let cancelled = false;
    setStationContext(null);
    fetch(`/api/transport/station-context?lat=${focusedStation.lat}&lng=${focusedStation.lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setStationContext(d); })
      .catch(() => { /* amenities section just omitted */ });
    return () => { cancelled = true; };
  }, [focusedStation]);

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

  // v0.62.598 — focus a station by one of its LTA codes (used by the station
  // card's terminus hyperlink). Resolves the code → station in the coarse list.
  function handleFocusStationCode(code) {
    if (!code || !Array.isArray(coarseStations)) return;
    const want = String(code).toUpperCase();
    const st = coarseStations.find((s) => (s.codes || []).some((c) => String(c).toUpperCase() === want));
    if (st) {
      setFocusedStation({ ...st, tappedCode: want });
      setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div
      className="bg-tg-bg text-tg-text px-3 py-3 flex flex-col gap-3 max-w-[1600px] mx-auto"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        // v0.62.217 — clear the fixed bottom bar (full-width ticker + version/
        // controls row) so the last content never hides behind it.
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
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
          <h1 className="text-base font-bold leading-tight">{t('header.title', lang)}</h1>
          {/* v0.60.219 — live Singapore weather emoji. */}
          <span className="text-[11px] text-tg-hint flex items-center"><WeatherBadge /></span>
          {/* v0.62.x — operator: tiny ↻ refresh after the weather temp. */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            title={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            className="text-[11px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
          >↻</button>
          <span className="text-[11px] ml-auto flex items-center gap-2">
            <span>
              {affectedCodes.length === 0
                ? <span className="text-green-500">{t('header.allNormal', lang)}</span>
                : <span className="text-orange-500">{tn(affectedCodes.length === 1 ? 'header.linesAffected' : 'header.linesAffectedPlural', lang, { n: affectedCodes.length })}</span>}
            </span>
            <LocaleToggle className="flex-shrink-0" />
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
        {/* v0.62.597 — operator: the "overview (All Lines) + operating-line" pills
            move UP into the header (like the Hawker TMA zone pills), out of the
            bottom bar. Full line list; the "All Lines" chip resets to the overview. */}
        <AffectedTicker
          compact
          affectedCodes={affectedCodes.length ? affectedCodes : LINES.filter((l) => !l.future).map((l) => l.code)}
          focusedCode={focusedCode}
          onFocus={(code) => {
            setFocusedCode(code);
            // v0.60.99 — first line-chip tap on the Schematic view auto-switches to
            // the Google Map (one-shot); the "All Lines" reset (null) is ignored.
            if (code && !autoSwitchedRef.current) {
              autoSwitchedRef.current = true;
              setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
            }
          }}
          statusByLine={statusByLine}
        />
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

      {/* v0.62.598 — the rich Google-Maps-style station card for the tapped
          station: name strip (line colour / white interchange), stacked
          per-line-code sub-cards (first/last train + terminus hyperlink +
          operating status), crowd, and the "around the station" amenity
          hyperlinks. Replaces LineStatusPanel's basic selected-station detail. */}
      {focusedStation && (
        <StationCard
          station={geoStations ? (geoStations[focusedStation.name] || null) : null}
          coarse={focusedStation}
          context={stationContext}
          crowd={crowd}
          statusByLine={statusByLine}
          coarseStations={coarseStations}
          lang={lang}
          onClose={() => handleSelectStation(null)}
          onFocusStationCode={handleFocusStationCode}
        />
      )}

      {focusedLine && (
        <LineStatusPanel
          line={focusedLine}
          status={focusedStatus}
          statusByLine={statusByLine}
          selectedStation={focusedStation}
          onSelectStation={handleSelectStation}
          lang={lang}
          hideStationDetail={!!focusedStation}
        />
      )}

      {/* v0.62.164 — the AffectedTicker moved UP to overlap the map's bottom edge
          (see the map block above). LineStatusPanel now renders directly below
          the map+ticker, so picking a line in the ticker reveals its status here. */}
      <LocationCard address={data.address} nearest={data.nearestMrt} />

      <EngineeringList closures={data.engineering || []} />

      {/* v0.60.217 — footer: no border; font +1pt. v0.62.217 — the version line
          moved to the fixed bottom bar (with the back/top buttons), per operator;
          the data-source attribution stays here in-flow. */}
      <footer className="mx-2 mb-2 mt-2 px-3 py-2 text-[9px] text-tg-hint text-center leading-tight">
        <div>Source: LTA TrainServiceAlerts (live) + curated engineering schedule</div>
      </footer>

      {/* v0.62.217 — structured Train-TMA bottom bar: version (left) + top/down and
          back/end buttons (right), pinned to the bottom.
          v0.62.597 — the line ticker moved UP into the header (operator), so the
          bottom bar is now just the version + nav controls. */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-tg-bg/95 backdrop-blur border-t border-tg-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="text-[9px] text-tg-hint leading-tight min-w-0 truncate">
            {t('footer.tag', lang)} · v{BUILD_VERSION}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-tg-link shrink-0">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: atBottom ? 0 : window.scrollY + window.innerHeight, behavior: 'smooth' })}
              aria-label={atBottom ? t('fab.topAria', lang) : t('fab.downAria', lang)}
              className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
            >{atBottom ? t('fab.top', lang) : t('fab.down', lang)}</button>
            <button
              type="button"
              onClick={() => {
                const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
                if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
                else if (w && typeof w.close === 'function') w.close();
              }}
              aria-label={(typeof window !== 'undefined' && window.history.length > 1) ? t('fab.backAria', lang) : t('fab.endAria', lang)}
              className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
            >{(typeof window !== 'undefined' && window.history.length > 1) ? `⇠ ${t('fab.back', lang)}` : `🔚 ${t('fab.end', lang)}`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
