import React, { useEffect, useRef, useState } from 'react';
import { LINES, LINES_BY_CODE } from './data/lines.js';
import { lineStationsFull } from './data/line-paths.js';
import { useViewport } from '../../_shared/lib/use-viewport.js';
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
import BottomSheet from '../../_shared/components/BottomSheet.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';

// v0.60.213 — build version for the footer tag line.
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

// v0.62.600 — operator: a LIVE Singapore-time clock on the status row. Format
// "DD MMM HH:MM" (24-hour); the ":" blinks each second so it's visibly running
// on SGT, replacing the static server timestamp row.
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  const [colonOn, setColonOn] = useState(true);
  useEffect(() => {
    // 500 ms tick → the ":" blinks on/off once a second (classic running clock);
    // re-reading the time each tick keeps the minute current.
    const id = setInterval(() => {
      setNow(new Date());
      setColonOn((c) => !c);
    }, 500);
    return () => clearInterval(id);
  }, []);
  let day = '', month = '', hour = '', minute = '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Singapore', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now);
    const get = (type) => (parts.find((p) => p.type === type) || {}).value || '';
    day = get('day'); month = get('month'); hour = get('hour'); minute = get('minute');
  } catch { /* Intl timezone unsupported — the clock just hides */ }
  if (!day) return null;
  return (
    <span className="tabular-nums whitespace-nowrap" aria-label={`${day} ${month} ${hour}:${minute} SGT`}>
      {day} {month} {hour}<span style={{ visibility: colonOn ? 'visible' : 'hidden' }}>:</span>{minute}
    </span>
  );
}

// v0.62.601 — a horizontal snap-scroll carousel of station cards for the wide
// landscape / full-map layout (mirrors the Hawker TMA's CentreCarousel). The
// off-centre (peeking) cards get the frosted "glass" look; the centred one is
// opaque. IntersectionObserver tracks which cards are in focus.
function StationCarousel({ items, render }) {
  const trackRef = useRef(null);
  const [focused, setFocused] = useState(() => new Set());
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === 'undefined') {
      setFocused(new Set(items.map((_, i) => i)));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      setFocused((prev) => {
        const next = new Set(prev);
        for (const e of entries) {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (e.intersectionRatio >= 0.9) next.add(idx); else next.delete(idx);
        }
        return next;
      });
    }, { root: track, threshold: [0, 0.5, 0.9, 1] });
    track.querySelectorAll('[data-idx]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);
  return (
    <div
      ref={trackRef}
      // v0.62.628 — operator: match the Cuisine desktop standard (compact cards
      // floating over a full-bleed map). `items-end` (was items-stretch) sits the
      // cards on a common baseline at their NATURAL heights — items-stretch grew
      // every card to the tallest one's height, leaving a wall of empty white
      // space below the shorter cards (the "cards too tall" look). pointer-events-
      // auto because the floating carousel wrapper is pointer-events-none so the
      // map stays draggable in the gaps between cards.
      className="flex items-end gap-2 overflow-x-auto snap-x snap-mandatory px-[4%] pb-1 max-w-6xl mx-auto pointer-events-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {items.map((c, i) => (
        <div key={i} data-idx={i}
          className="snap-center shrink-0 basis-[86%] sm:basis-[48%] min-[1100px]:basis-[32%] max-h-[44vh] overflow-y-auto rounded-xl shadow-lg">
          {render(c, i, !focused.has(i))}
        </div>
      ))}
    </div>
  );
}

// v0.62.602 — a centred modal (click-outside / ✕ to dismiss), mirroring the
// Cuisine TMA's first-load popup style. Sits above the fixed footer bar (z-40).
function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="skeuo-card w-full max-w-[420px] max-h-[80vh] overflow-y-auto rounded-2xl p-4 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold flex-1 leading-tight">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="text-tg-hint text-lg leading-none px-1 active:scale-90">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

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
  // v0.62.602 — which header popup is open: 'status' (service + engineering
  // closures, opened from the status chip / auto-shown once on first load) or
  // 'source' (data-source attribution, opened from the title). null = none.
  const [popup, setPopup] = useState(null);
  const firstPopupRef = useRef(false);
  // v0.62.601 — device/orientation for the responsive layout (phone stacked /
  // tablet-desktop two-panel / landscape carousel). Hook stays above the early
  // returns below (Rules of Hooks).
  const vp = useViewport();
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
  // v0.62.621 — the user's location, best-effort, for the station card's
  // distance + walking-time (Google-Maps place-details style). The TMA-only
  // /status fetch has no coords (they're chat-side only), so we ask the browser
  // once; if denied / unavailable the card simply omits distance and the
  // Directions button still routes from the user's device.
  const [userLoc, setUserLoc] = useState(null);
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
  // v0.62.606 — operator: the Train TMA now DEFAULTS to the Cuisine/Hawker
  // "full-map + bottom station carousel" across every device (was device-driven:
  // phone stacked / tablet two-panel / landscape carousel). The carousel is
  // EMPTY on first load (map only) until a line pill is tapped; the footer 🗺/⊞
  // toggle switches to the two-panel LIST. 'carousel' | 'list'.
  const [viewMode, setViewMode] = useState('carousel');
  // v0.62.606 — the list-mode scroller (for the footer ⇡/⇣ button + atBottom).
  const listScrollRef = useRef(null);
  const [listAtBottom, setListAtBottom] = useState(false);
  const onListScroll = () => {
    const el = listScrollRef.current;
    if (el) setListAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 50);
  };
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
        // v0.62.620 — operator: on DEFAULT load, open with the East-West Line (so
        // the drawer/carousel isn't empty). Still auto-focus the first AFFECTED
        // line when there's a disruption; otherwise fall back to EWL.
        if (!focusedCode) setFocusedCode(d?.affectedCodes?.[0] || 'EWL');
        // v0.62.602 — surface the service-status popup once on first load
        // (operator: "like first load in Cuisine TMA").
        if (!firstPopupRef.current) { firstPopupRef.current = true; setPopup('status'); }
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

  // v0.62.621 — best-effort one-shot geolocation for the card's distance / walk
  // time. Silent on denial (distance is simply omitted). Cached up to 5 min.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    let cancelled = false;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled && pos?.coords) setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        () => { /* denied / unavailable — distance omitted, Directions still works */ },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    } catch { /* noop */ }
    return () => { cancelled = true; };
  }, []);

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

  // v0.62.601 — the focused line's stations as StationCards (the wide-layout
  // "listing" / carousel items). Empty when no line is focused.
  const lineStations = (focusedCode && Array.isArray(coarseStations))
    ? lineStationsFull(coarseStations, focusedCode) : [];

  // ---- shared sub-elements (rendered into each layout below) ----
  const headerEl = (
    /* v0.62.164 — ONE neo-skeuomorphic header card.
       v0.62.603 — operator: standardise the header on the Cuisine TMA. Row 1 =
       title (left) + a flush-right cluster [language · temperature · refresh].
       Row 2 = the live SGT clock (date & time) then the tappable service status.
       Row 3 = the line pills. Colour-blind safe: status pairs a glyph/count with
       the hue. */
    <header className="font-inter skeuo-card rounded-2xl px-3 py-2.5 flex flex-col gap-1.5 relative z-10">
      <div className="flex items-center justify-between gap-2">
        {/* v0.62.602 — the title opens the data-source popup. */}
        <button
          type="button"
          onClick={() => setPopup('source')}
          aria-label={t('src.title', lang)}
          className="text-base font-bold leading-tight text-left truncate active:scale-95"
        >{t('header.title', lang)}</button>
        {/* v0.62.603 — Cuisine-standard flush-right cluster: language, temp, refresh. */}
        <div className="flex items-center gap-3 shrink-0">
          <LocaleToggle className="flex-shrink-0" />
          <span className="text-[11px] text-tg-hint flex items-center"><WeatherBadge /></span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            title={lang === 'fr' ? 'Actualiser' : 'Refresh'}
            className="text-[11px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
          >↻</button>
        </div>
      </div>
      {/* v0.62.603 — row 2: date & time (live SGT clock), then the tappable
          service status which opens the service / engineering popup. */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
        <span className="text-tg-hint"><LiveClock /></span>
        <span className="text-tg-hint" aria-hidden>·</span>
        <button type="button" onClick={() => setPopup('status')} className="active:scale-95">
          {affectedCodes.length === 0
            ? <span className="text-green-500">{t('header.allNormal', lang)}</span>
            : <span className="text-orange-500">{tn(affectedCodes.length === 1 ? 'header.linesAffected' : 'header.linesAffectedPlural', lang, { n: affectedCodes.length })}</span>}
        </button>
      </div>
      {/* v0.62.597 — the overview (All Lines) + operating-line pills. */}
      <AffectedTicker
        compact
        affectedCodes={affectedCodes.length ? affectedCodes : LINES.filter((l) => !l.future).map((l) => l.code)}
        focusedCode={focusedCode}
        onFocus={(code) => {
          setFocusedCode(code);
          if (code && !autoSwitchedRef.current) {
            autoSwitchedRef.current = true;
            setMapView((prev) => (prev === 'png' ? 'gmap' : prev));
          }
        }}
        statusByLine={statusByLine}
      />
    </header>
  );

  // The map block. `fillMode` makes MrtMapPanel fill its (bounded) parent — used
  // by the two-panel / carousel layouts; otherwise it self-sizes and tucks up
  // under the header (negative mt).
  const mapBlock = (fillMode, navInset = false) => (
    mapView === 'png'
      ? <div className={fillMode ? 'h-full overflow-auto rounded-2xl' : '-mt-3 relative z-0'}>
          <SystemMap focusedCode={focusedCode} affectedCodes={affectedCodes} />
        </div>
      : <div className={fillMode ? 'h-full' : '-mt-3 relative z-0'}>
          <MrtMapPanel
            fill={fillMode}
            navInset={navInset}
            focusedCode={focusedCode}
            focusedStation={focusedStation}
            onStationSelect={handleSelectStation}
            onLineSelect={(code) => setFocusedCode(code)}
            statusByLine={statusByLine}
            lang={lang}
            overlayLayers={overlayLayers}
            onOverlayChange={setOverlayLayers}
          />
        </div>
  );

  // One station's rich StationCard (used in the wide list + carousel). Tapping
  // it focuses that station (card ↔ pin: the map reframes on focusedStation).
  const renderStationCard = (st, i, glass = false, compact = false) => {
    const rich = geoStations ? (geoStations[st.name] || null) : null;
    const active = !!focusedStation && focusedStation.name === st.name;
    return (
      <StationCard
        key={st.focusCode || st.name || i}
        station={rich}
        coarse={{ ...st, tappedCode: active ? focusedStation.tappedCode : st.focusCode }}
        context={active ? stationContext : null}
        crowd={crowd}
        statusByLine={statusByLine}
        coarseStations={coarseStations}
        lang={lang}
        active={active}
        glass={glass}
        compact={compact}
        userLoc={userLoc}
        onTap={() => handleSelectStation(st, st.focusCode)}
        onFocusStationCode={handleFocusStationCode}
      />
    );
  };

  // The single tapped-station card (shown when no line is focused).
  const singleFocusedCard = focusedStation ? (
    <StationCard
      station={geoStations ? (geoStations[focusedStation.name] || null) : null}
      coarse={focusedStation}
      context={stationContext}
      crowd={crowd}
      statusByLine={statusByLine}
      coarseStations={coarseStations}
      lang={lang}
      userLoc={userLoc}
      onClose={() => handleSelectStation(null)}
      onFocusStationCode={handleFocusStationCode}
    />
  ) : null;

  // The line-status + you-are-here + engineering panels (secondary content).
  const secondaryPanels = (
    <>
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
      <LocationCard address={data.address} nearest={data.nearestMrt} />
    </>
  );

  // v0.62.602 — the two header popups. The status chip (and the first-load
  // auto-open) surfaces the service status + engineering closures; the title
  // surfaces the data-source attribution. Both are `fixed` so they overlay any
  // layout; rendered once alongside the footer bar in each return below.
  const popups = (
    <>
      {popup === 'status' && (
        <Modal title={t('status.popupTitle', lang)} onClose={() => setPopup(null)}>
          <div className="text-xs">
            {affectedCodes.length === 0
              ? <span className="text-green-500 font-semibold">{t('header.allNormal', lang)}</span>
              : <span className="text-orange-500 font-semibold">{tn(affectedCodes.length === 1 ? 'header.linesAffected' : 'header.linesAffectedPlural', lang, { n: affectedCodes.length })}</span>}
          </div>
          {affectedCodes.length > 0 && (
            <div className="flex flex-col gap-1">
              {affectedCodes.map((code) => {
                const ln = LINES_BY_CODE[code];
                const st = statusByLine[code]?.status || 'delay';
                return (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span className="inline-block w-3 h-3 rounded" style={{ background: ln?.hex || '#888' }} />
                    <span className="font-semibold">{code}</span>
                    <span className="text-tg-hint">· {t(`mrt.status.${st}`, lang)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="border-t border-tg-border pt-2">
            <EngineeringList closures={data.engineering || []} />
          </div>
        </Modal>
      )}
      {popup === 'source' && (
        <Modal title={t('src.title', lang)} onClose={() => setPopup(null)}>
          <div className="text-xs text-tg-text leading-relaxed">{t('src.body', lang)}</div>
          <div className="text-[10px] text-tg-hint">{t('footer.tag', lang)} · v{BUILD_VERSION}</div>
        </Modal>
      )}
    </>
  );

  // v0.62.217/597/600 — the fixed bottom bar: version + view toggle (left) and
  // top/down & back/end nav (right). Shared across every layout.
  const footerBar = (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-tg-bg/95 backdrop-blur border-t border-tg-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] text-tg-hint leading-tight truncate">
            {t('footer.tag', lang)} · v{BUILD_VERSION}
          </span>
          {/* v0.62.606 — layout toggle: carousel (map-first) ⇄ list (two-panel).
              The label names the view you'll switch TO. */}
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'carousel' ? 'list' : 'carousel'))}
            aria-label={viewMode === 'carousel' ? t('layout.list', lang) : t('layout.map', lang)}
            className="skeuo-pill px-2.5 py-1 rounded-lg text-[11px] font-medium text-tg-text active:scale-95 whitespace-nowrap shrink-0"
          >{viewMode === 'carousel' ? t('layout.list', lang) : t('layout.map', lang)}</button>
          <button
            type="button"
            onClick={() => setMapView((v) => (v === 'png' ? 'gmap' : 'png'))}
            aria-label={mapView === 'png' ? t('view.btnGoogleMap', lang) : t('view.btnSchematic', lang)}
            className="skeuo-pill px-2.5 py-1 rounded-lg text-[11px] font-medium text-tg-text active:scale-95 whitespace-nowrap shrink-0"
          >{mapView === 'png' ? t('view.btnGoogleMap', lang) : t('view.btnSchematic', lang)}</button>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-tg-link shrink-0">
          {/* v0.62.606 — ⇡/⇣ scrolls the LIST panel (list mode only; the carousel
              has nothing to scroll vertically). */}
          {viewMode === 'list' && (
          <button
            type="button"
            onClick={() => { const el = listScrollRef.current; if (el) el.scrollTo({ top: listAtBottom ? 0 : el.scrollTop + el.clientHeight, behavior: 'smooth' }); }}
            aria-label={listAtBottom ? t('fab.topAria', lang) : t('fab.downAria', lang)}
            className="px-2 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
          >{listAtBottom ? t('fab.top', lang) : t('fab.down', lang)}</button>
          )}
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
  );

  const fixedShellStyle = {
    paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))'
  };

  // ---- LIST mode (toggled): two-panel — fixed map + scrolling station list.
  //      Works on every device. v0.62.606. ----
  if (viewMode === 'list') {
    return (
      <>
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-tg-bg text-tg-text" style={fixedShellStyle}>
          <div className="px-3 pt-2 shrink-0">{headerEl}</div>
          <div className="px-3 pt-2 shrink-0 h-[40vh]">{mapBlock(true)}</div>
          <div ref={listScrollRef} onScroll={onListScroll} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
            {lineStations.length > 0
              ? (
                <div className="grid grid-cols-1 min-[1100px]:grid-cols-2 gap-2">
                  {lineStations.map((st, i) => (
                    <React.Fragment key={st.focusCode || st.name || i}>{renderStationCard(st, i)}</React.Fragment>
                  ))}
                </div>
              )
              : singleFocusedCard}
            {secondaryPanels}
          </div>
        </div>
        {popups}
        {footerBar}
      </>
    );
  }

  // ---- SIDE-PANEL mode (desktop + landscape tablet) — REMOVED v0.62.625.
  //      v0.62.621 added a fixed left station-list column beside the map for the
  //      wide/desktop layout; operator (2026-07-21, desktop screenshot): "revert
  //      the side drawer it is aweful" — in the narrow left column the 35 station
  //      cards stacked into an unreadable run of coloured name strips. Reverted:
  //      wide / landscape / desktop now fall through to the CAROUSEL layout below
  //      (full-bleed map + a bottom station carousel), same as before v0.62.621.
  //      Phone portrait keeps the draggable bottom sheet; the LIST toggle wins. ----

  // ---- DRAWER mode (phone portrait, carousel view): full-bleed map behind a
  //      floating header + a Google-Maps-style DRAGGABLE bottom-sheet holding the
  //      vertical station list (Hawker parity, v0.62.609). Operator (IMG_3595/6):
  //      "merge when you set up the drawer". The two-panel LIST toggle still wins
  //      when viewMode === 'list'; landscape/tablet keep the bottom carousel. ----
  if (vp.deviceClass === 'mobile' && vp.orientation === 'portrait') {
    const drawerItems = lineStations.length > 0
      ? (
        <div className="flex flex-col gap-2 px-2 pt-1">
          {lineStations.map((st, i) => (
            <React.Fragment key={st.focusCode || st.name || i}>{renderStationCard(st, i)}</React.Fragment>
          ))}
        </div>
      )
      : (singleFocusedCard ? <div className="px-2 pt-1">{singleFocusedCard}</div> : null);
    return (
      <>
        <div className="fixed inset-0 overflow-hidden bg-tg-bg text-tg-text"
          style={{
            paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}>
          {/* full-bleed map behind everything */}
          <div className="absolute inset-0 z-0">{mapBlock(true, true)}</div>
          {/* floating header over the map — only the card catches taps so the map
              stays tappable around it. */}
          <div className="absolute top-0 inset-x-0 z-20 px-2 pointer-events-none"
            style={{ paddingTop: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.5rem)' }}>
            <div className="pointer-events-auto">{headerEl}</div>
          </div>
          {/* the draggable station-list drawer (only once a line/station is chosen;
              first load is map-only, matching the empty carousel). */}
          {drawerItems && (
            <BottomSheet contentRef={listScrollRef} onContentScroll={onListScroll}>
              {drawerItems}
            </BottomSheet>
          )}
        </div>
        {popups}
        {footerBar}
      </>
    );
  }

  // ---- CAROUSEL mode (DEFAULT, every device): full-bleed map with the station
  //      carousel FLOATING over its bottom edge — the Cuisine/Hawker desktop
  //      standard. v0.62.628 — operator (desktop screenshots): "the carousel cards
  //      in CUISINE TMA and the Google Map aspect size is the standard … the other
  //      2 TMA (Hawker, Train) follow exactly". Was a STACKED flex-col (header,
  //      map, then a solid card row below) that shrank the map and blocked it with
  //      an opaque strip; now the map is full-bleed (absolute inset-0) and the
  //      header + carousel float over it, so the map fills the viewport and shows
  //      through the gaps between cards — matching Cuisine. The carousel is EMPTY
  //      on first load (map only) until a line pill is tapped. ----
  return (
    <>
      <div className="fixed inset-0 overflow-hidden bg-tg-bg text-tg-text"
        style={{
          paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}>
        {/* full-bleed map behind everything; navInset drops the map's nav cluster
            below the floating header so its buttons stay reachable. */}
        <div className="absolute inset-0 z-0">{mapBlock(true, true)}</div>
        {/* floating header over the map — only the card catches taps so the map
            stays draggable around it. */}
        <div className="absolute top-0 inset-x-0 z-20 px-2 pointer-events-none"
          style={{ paddingTop: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.5rem)' }}>
          <div className="pointer-events-auto">{headerEl}</div>
        </div>
        {/* floating compact carousel over the bottom of the map (Cuisine standard). */}
        {(lineStations.length > 0 || singleFocusedCard) && (
          <div className="absolute inset-x-0 bottom-14 z-30 pointer-events-none">
            {lineStations.length > 0
              ? <StationCarousel items={lineStations} render={(st, i, glass) => renderStationCard(st, i, glass, true)} />
              : <div className="px-3 max-w-md mx-auto max-h-[44vh] overflow-y-auto pointer-events-auto">{singleFocusedCard}</div>}
          </div>
        )}
      </div>
      {popups}
      {footerBar}
    </>
  );
}
