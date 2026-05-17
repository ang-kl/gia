// web/transport/src/components/MrtMapPanel.jsx — v0.60.230
//
// Interactive Google Map alternative to the static SystemMap PNG.
// Pins every station from /api/transport/stations (~177 operational
// + ~29 future as of v0.60.85). Operator 2026-05-10:
//
//   "ensure that if the SG Map is first loaded still show the PNG
//    map of Singapore MRT system network and suggest to user to
//    toggle to see Google Map as 184 pins in the map of singapore
//    will be very cramp and ugly."
//
// So this is the OPT-IN view — App.jsx defaults to the PNG and the
// user must explicitly tap a toggle to render this component.
//
// v0.60.230 (Build E 5a-5d) — colour-coded line POLYLINES under the
// station markers (geometry from buildLinePaths, deriving order from
// the station codes); the markers themselves are now tiny coloured
// DOTS (stationDotNode) instead of PinElement teardrops; tapping a
// polyline focuses that line (onLineSelect), and tapping a dot still
// opens the station InfoWindow.
//
// Pin colour: dot background = LINES_BY_CODE[primary].hex (canonical
// LTA palette). Multi-line interchanges use the first line's colour;
// the InfoWindow lists every line + code. Future stations render
// desaturated grey + smaller, with "Opens 20XX" in the popup.
//
// Loading: reuses /maps-key + the __giaMapsReady global from the
// hawker / cuisine TMAs so the Maps JS bundle deduplicates.

import React, { useEffect, useRef, useState } from 'react';
import { LINES_BY_CODE } from '../data/lines.js';
import { resolveLinePaths } from '../data/line-paths.js';
import { t, tn } from '../i18n.js';
import { createOverlayController } from '../lib/mapOverlays.js';

// Local openLink — transport TMA's tg.js doesn't export one. Routes
// through Telegram WebApp's openLink when available so Telegram opens
// the link in the system browser; falls back to window.open for tests.
function openExternal(url) {
  const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  if (w && typeof w.openLink === 'function') { w.openLink(url); return; }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
}

const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };
const SG_DEFAULT_ZOOM = 11;
const FUTURE_BG = '#9CA3AF';
const DEFAULT_BG = '#888888';

// v0.60.230 (Build E 5b/5d) — tiny station dots + line polyline
// styling. Future stations/lines render smaller and fainter.
const DOT_SIZE = 12;
const DOT_SIZE_FUTURE = 9;
const LINE_WEIGHT = 3;
const LINE_WEIGHT_FOCUSED = 5;
const LINE_OPACITY = 0.85;
const FUTURE_LINE_OPACITY = 0.4;

// v0.60.230 — a station marker is now a small round dot DOM node
// (replacing the PinElement teardrop), modeled on the Hawker TMA's
// hawkerPinNode. White ring so the dot reads against its line
// polyline; future stations are smaller + translucent.
function stationDotNode(bg, isFuture) {
  const size = isFuture ? DOT_SIZE_FUTURE : DOT_SIZE;
  const el = document.createElement('div');
  el.style.cssText =
    `width:${size}px;height:${size}px;border-radius:50%;cursor:pointer;` +
    `background:${bg};border:1.5px solid #fff;` +
    'box-shadow:0 0 0 0.5px rgba(0,0,0,0.35);' +
    (isFuture ? 'opacity:0.75;' : '');
  return el;
}

// Square line emoji — mirrors mrt-lines.js LINES table (v0.60.83).
const LINE_EMOJI = {
  EWL: '🟩', CGL: '🟩', NSL: '🟥', NEL: '🟪',
  CCL: '🟧', DTL: '🟦', TEL: '🟫', BPL: '⬜',
  SLRT: '⬜', PLRT: '⬜', JRL: '🟦', CRL: '🟩'
};

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// v0.60.210 (DF-109) — `lang` threaded from App.jsx so the station
// InfoWindow popup + the panel chrome localise (was English-only).
export default function MrtMapPanel({ focusedCode = null, onResetFocus, onLineSelect, statusByLine = null, lang = 'en', overlayLayers = null, attractionsMode = 'nearby' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const infoWindowRef = useRef(null);
  const stationsRef = useRef([]);
  // v0.63.0 — parks / attractions / taxi / carpark overlay layers.
  const overlayControllerRef = useRef(null);
  const overlayLayersRef = useRef(overlayLayers);
  useEffect(() => { overlayLayersRef.current = overlayLayers; }, [overlayLayers]);
  // v0.63.0 — expand toggle: grows the map to ~90vh in place.
  const [expanded, setExpanded] = useState(false);
  // v0.60.232 (Build E 5e) — real LTA route geometry from
  // /api/transport/line-paths; null until fetched / when no data file.
  const linePathsRef = useRef(null);
  // v0.60.87 — capture the registered Map ID from /maps-key so the
  // Map constructor uses the operator's MAP_ID env var when set
  // (custom vector styling + branding), falling back to Google's
  // public DEMO_MAP_ID only when MAP_ID is unset or the server
  // returned the 'GIA_SANCTUARY' placeholder.
  const mapIdRef = useRef('DEMO_MAP_ID');
  const [mapsKeyState, setMapsKeyState] = useState('loading');   // loading | ready | error | nokey
  const [stations, setStations] = useState(null);
  const [linePaths, setLinePaths] = useState(null);
  const [err, setErr] = useState(null);

  // Fetch stations once.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/transport/stations')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => {
        if (cancelled) return;
        setStations(Array.isArray(d?.stations) ? d.stations : []);
      })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, []);

  // v0.60.232 — fetch the real LTA route geometry once. Best-effort:
  // any failure leaves linePaths null and renderPolylines falls back
  // to the station-code-derived polylines (buildLinePaths).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/transport/line-paths')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => {
        if (cancelled) return;
        const paths = d && typeof d.paths === 'object' ? d.paths : null;
        linePathsRef.current = paths;
        setLinePaths(paths);
      })
      .catch(() => { /* fallback geometry is used */ });
    return () => { cancelled = true; };
  }, []);

  // Stable ref for the InfoWindow CTA closure.
  useEffect(() => { stationsRef.current = stations || []; }, [stations]);

  // Load Maps JS once. Reuses __giaMapsReady so concurrent TMAs share.
  useEffect(() => {
    let cancelled = false;
    if (window.google?.maps) { setMapsKeyState('ready'); initMap(); return; }
    fetch('/maps-key').then((r) => r.json()).then((d) => {
      if (cancelled) return;
      if (!d?.key) { setMapsKeyState('nokey'); return; }
      // v0.60.87 — use operator's registered Map ID when env-sourced.
      // 'GIA_SANCTUARY' is the placeholder /maps-key returns when
      // MAP_ID env is unset; treat that as no-mapid and fall back
      // to Google's public DEMO_MAP_ID so AdvancedMarkerElement
      // still renders.
      if (d.mapIdSource === 'env:MAP_ID' && d.mapId) {
        mapIdRef.current = d.mapId;
      }
      const existing = document.querySelector('script[data-gmaps]');
      if (existing) {
        if (window.google?.maps) { setMapsKeyState('ready'); initMap(); }
        else window.__giaMapsReady = () => { if (!cancelled) { setMapsKeyState('ready'); initMap(); } };
        return;
      }
      const tag = document.createElement('script');
      tag.src = `https://maps.googleapis.com/maps/api/js?key=${d.key}&libraries=marker&v=quarterly&loading=async&callback=__giaMapsReady`;
      tag.async = true;
      tag.dataset.gmaps = '1';
      window.__giaMapsReady = () => { if (!cancelled) { setMapsKeyState('ready'); initMap(); } };
      document.head.appendChild(tag);
    }).catch(() => {
      if (!cancelled) setMapsKeyState('error');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global InfoWindow link handler. Looks up station via stationsRef
  // so closure stays current across re-renders.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.__giaMrtOpenMap = (name) => {
      const s = (stationsRef.current || []).find((x) => x.name === name);
      if (!s) return;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' MRT Station Singapore')}`;
      openExternal(url);
    };
    return () => {
      try { delete window.__giaMrtOpenMap; } catch { window.__giaMrtOpenMap = undefined; }
    };
  }, []);

  // Re-render pins whenever stations, map readiness, focused line, OR
  // locale change. v0.60.88 — focused line filters the visible pins.
  // v0.60.210 — `lang` added so a locale flip rebuilds the markers and
  // their click handlers close over the current language.
  useEffect(() => {
    if (mapRef.current && stations) renderPins(stations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, linePaths, mapsKeyState, focusedCode, lang]);

  function initMap() {
    if (!containerRef.current || mapRef.current || !window.google?.maps) return;
    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: SG_CENTROID,
      zoom: SG_DEFAULT_ZOOM,
      // v0.60.87 — mapId from /maps-key (env-sourced when MAP_ID is
      // set on Railway), falling back to Google's public DEMO_MAP_ID
      // for AdvancedMarkerElement support. Without ANY mapId the
      // map throws the "This page can't load Google Maps correctly"
      // auth overlay (operator screenshot 2026-05-11).
      mapId: mapIdRef.current,
      disableDefaultUI: false,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
    overlayControllerRef.current = createOverlayController(mapRef.current, window.google.maps);
    applyOverlayLayers(overlayLayersRef.current);
    // v0.64.0 — feed the map-centre anchor so radius-clipped overlay
    // layers re-filter on every pan/zoom.
    mapRef.current.addListener('idle', () => {
      const c = mapRef.current?.getCenter?.();
      if (c) overlayControllerRef.current?.setAnchor?.(c.lat(), c.lng());
    });
    if (stations) renderPins(stations);
  }

  // Push the current layer-toggle state into the overlay controller.
  // No 'train' layer here — the Transport map already draws line polylines.
  function applyOverlayLayers(layers) {
    const ctrl = overlayControllerRef.current;
    if (!ctrl || !layers) return;
    ctrl.setLayer('parks', !!layers.parks);
    ctrl.setLayer('attractions', !!layers.attractions);
    ctrl.setLayer('taxis', !!layers.taxis);
    ctrl.setLayer('carpark', !!layers.carpark);
    ctrl.setLayer('exits', !!layers.exits);
  }
  useEffect(() => { applyOverlayLayers(overlayLayers); }, [overlayLayers]); // eslint-disable-line
  useEffect(() => { overlayControllerRef.current?.setAttractionsMode?.(attractionsMode); }, [attractionsMode]);
  useEffect(() => () => { overlayControllerRef.current?.destroy?.(); }, []);

  // v0.60.230 (Build E 5a) — draw a colour-coded polyline per line
  // beneath the station dots. v0.60.232 (Build E 5e) — geometry is the
  // real LTA route shape from /api/transport/line-paths when available,
  // else the station-code-derived polylines (resolveLinePaths picks).
  // When a line is focused only that line's polyline is drawn (heavier
  // weight); tapping any polyline focuses that line via onLineSelect.
  function renderPolylines(list) {
    if (!window.google?.maps?.Polyline) return;
    for (const p of polylinesRef.current) p.setMap(null);
    polylinesRef.current = [];
    const paths = resolveLinePaths(linePathsRef.current, list);
    for (const [lineCode, segments] of Object.entries(paths)) {
      if (focusedCode && lineCode !== focusedCode) continue;
      const meta = LINES_BY_CODE[lineCode];
      const hex = meta?.hex || DEFAULT_BG;
      const isFutureLine = !!meta?.future;
      for (const seg of segments) {
        if (!Array.isArray(seg) || seg.length < 2) continue;
        const pl = new window.google.maps.Polyline({
          path: seg,
          map: mapRef.current,
          strokeColor: hex,
          strokeOpacity: isFutureLine ? FUTURE_LINE_OPACITY : LINE_OPACITY,
          strokeWeight: focusedCode === lineCode ? LINE_WEIGHT_FOCUSED : LINE_WEIGHT,
          clickable: true,
          zIndex: 1
        });
        pl.addListener('click', () => onLineSelect?.(lineCode));
        polylinesRef.current.push(pl);
      }
    }
  }

  function renderPins(list) {
    if (!window.google?.maps?.marker?.AdvancedMarkerElement) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;
    // Tear down old.
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    // v0.60.230 — line polylines first so the station dots layer on top.
    renderPolylines(list);
    // v0.60.88 — filter to the focused line when set. Pin colour
    // logic stays the same; only the visible set changes.
    const visibleList = focusedCode
      ? list.filter((s) => Array.isArray(s.lines) && s.lines.includes(focusedCode))
      : list;
    const bounds = new window.google.maps.LatLngBounds();
    let boundedCount = 0;
    for (const s of visibleList) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      const isFuture = s.status === 'future';
      const primary = s.lines?.[0];
      const bg = isFuture ? FUTURE_BG : (LINES_BY_CODE[primary]?.hex || DEFAULT_BG);
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: s.lat, lng: s.lng },
        title: s.name,
        content: stationDotNode(bg, isFuture)
      });
      marker.addListener('click', () => {
        const codes = (s.codes || []).map((c) => {
          const lineCode = c.replace(/\d+$/, '');
          // Translate the per-line prefix back to a line code for emoji lookup.
          // CCxx → CCL, NSxx → NSL, NExx → NEL, EWxx → EWL, DTxx → DTL,
          // TExx → TEL, CGxx → CGL, BPxx → BPL, SExx/SWxx → SLRT, PExx/PWxx → PLRT,
          // JSxx/JExx → JRL, CRxx → CRL.
          const mapPrefix = {
            CC: 'CCL', NS: 'NSL', NE: 'NEL', EW: 'EWL', DT: 'DTL',
            TE: 'TEL', CG: 'CGL', BP: 'BPL', SE: 'SLRT', SW: 'SLRT',
            PE: 'PLRT', PW: 'PLRT', JS: 'JRL', JE: 'JRL', CR: 'CRL',
            CE: 'CCL', STC: 'SLRT', PTC: 'PLRT'
          };
          const prefix = c.replace(/\d+$/, '');
          const ln = mapPrefix[prefix] || prefix;
          const emoji = LINE_EMOJI[ln] || '⬜';
          return `${emoji} ${escapeHtml(c)}`;
        }).join(' · ');
        // v0.60.207 — prefer an exact opening date when the station
        // record carries one (CCL6 stage: Keppel / Cantonment / Prince
        // Edward Road → "12 July 2026"); else fall back to the bare
        // year. v0.60.210 (DF-109) — use the FR opening date when the
        // locale is French and the record carries one.
        const opensWhen = (lang === 'fr' && s.opensDateFr)
          ? s.opensDateFr
          : (s.opensDate || (s.opensYear != null ? String(s.opensYear) : ''));
        const futureLine = isFuture && opensWhen
          ? `<br><em style="color:#9CA3AF">${tn('mrt.opens', lang, { when: escapeHtml(opensWhen) })}</em>`
          : '';
        // v0.60.99 — per-station train status block. For each line
        // the station serves, look up statusByLine (from /api/
        // transport/status) and render "🔴 NSL · status: Normal
        // service" or the matching disruption label. Hidden for
        // future stations.
        // v0.60.210 (DF-109) — status labels localised via i18n. The
        // five known statuses have keys; an unrecognised value from
        // /api/transport/status falls through to its raw string.
        const STATUS_KEYS = ['delay', 'disrupted', 'closure', 'normal', 'unknown'];
        const statusHtml = (!isFuture && statusByLine && Array.isArray(s.lines) && s.lines.length)
          ? '<br>' + s.lines.map((ln) => {
              const emoji = LINE_EMOJI[ln] || '⬜';
              const st = statusByLine[ln]?.status || 'normal';
              const label = STATUS_KEYS.includes(st) ? t(`mrt.status.${st}`, lang) : st;
              const color = st === 'normal' ? '#34C759' : (st === 'delay' ? '#FF9500' : '#FF3B30');
              return `<span style="color:${color}">${emoji} ${escapeHtml(ln)} · ${escapeHtml(label)}</span>`;
            }).join('<br>')
          : '';
        const linkHtml = `<br><a href="#" onclick="__giaMrtOpenMap('${escapeHtml(s.name)}'); return false;">${escapeHtml(t('mrt.openInMap', lang))}</a>`;
        // v0.60.207 — explicit dark text colour. The Google Maps
        // InfoWindow bubble is always white, but Telegram's dark-mode
        // theme can cascade a light body colour into it, rendering the
        // text near-invisible (operator screenshot). Pin #1c1c1f so the
        // popup is legible in both light and dark Telegram themes.
        const html = `<div style="max-width:240px;font-size:12px;line-height:1.45;color:#1c1c1f"><strong>${escapeHtml(s.name)}</strong><br>${codes || ''}${statusHtml}${futureLine}${linkHtml}</div>`;
        infoWindowRef.current?.setContent(html);
        infoWindowRef.current?.open({ anchor: marker, map: mapRef.current });
      });
      markersRef.current.push(marker);
      // Only operational stations contribute to the auto-bounds so
      // the map opens framing the live network, not future east/west spread.
      if (!isFuture) {
        bounds.extend({ lat: s.lat, lng: s.lng });
        boundedCount++;
      }
    }
    if (boundedCount > 1) mapRef.current.fitBounds(bounds, 60);
  }

  if (err) return <div className="text-xs text-red-500 p-3">{t('mrt.err.stations', lang)} {err}</div>;
  if (mapsKeyState === 'nokey') return <div className="text-xs text-tg-hint p-3">{t('mrt.err.nokey', lang)}</div>;
  if (mapsKeyState === 'error') return <div className="text-xs text-red-500 p-3">{t('mrt.err.mapfail', lang)}</div>;

  const opsCount = (stations || []).filter((s) => s.status !== 'future').length;
  const futureCount = (stations || []).filter((s) => s.status === 'future').length;

  // v0.60.88 — filtered subset when a line is focused via the
  // AffectedTicker tap (App.jsx threads focusedCode through). Shows
  // an Overview reset button so users can return to the full map.
  const filteredCount = focusedCode && stations
    ? stations.filter((s) => Array.isArray(s.lines) && s.lines.includes(focusedCode)).length
    : 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-tg-border relative">
      {focusedCode && (
        <div className="px-2 py-1.5 text-[11px] bg-tg-card border-b border-tg-border text-tg-text">
          {tn('mrt.showing', lang, { code: focusedCode, n: filteredCount })}
        </div>
      )}
      <div
        ref={containerRef}
        // v0.60.93 — match Cuisine MapPanel responsive height per
        // operator 2026-05-11 ("too long"). Phone: ≤50vh capped at
        // 420 px; minHeight 240 px so the map remains usable on tiny
        // viewports. v0.63.0 — expand toggle grows it to ~90vh.
        style={{ height: expanded ? '90vh' : 'min(420px, 50vh)', minHeight: '240px', width: '100%' }}
        aria-label={t('mrt.aria.map', lang)}
      />
      {/* v0.63.1 — custom map-control stack, top-right: zoom +/- and the
          expand toggle. Semi-transparent + theme-adaptive (tg-card / tg-text). */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? SG_DEFAULT_ZOOM) + 1)}
          className="w-9 h-9 rounded-full bg-tg-card/70 text-tg-text border border-tg-border shadow-md flex items-center justify-center text-lg font-semibold leading-none active:scale-95"
          aria-label={t('map.zoomIn', lang)}
        ><span aria-hidden>＋</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? SG_DEFAULT_ZOOM) - 1)}
          className="w-9 h-9 rounded-full bg-tg-card/70 text-tg-text border border-tg-border shadow-md flex items-center justify-center text-lg font-semibold leading-none active:scale-95"
          aria-label={t('map.zoomOut', lang)}
        ><span aria-hidden>－</span></button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-9 h-9 rounded-full bg-tg-card/70 text-tg-text border border-tg-border shadow-md flex items-center justify-center text-base leading-none active:scale-95"
          aria-label={t(expanded ? 'map.collapse' : 'map.expand', lang)}
          title={t(expanded ? 'map.collapse' : 'map.expand', lang)}
        ><span aria-hidden>{expanded ? '⤡' : '⤢'}</span></button>
      </div>
      {/* v0.63.1 — Overview (reset focus) button, floating bottom-right
          below the map's native controls; shown only when a line is focused. */}
      {focusedCode && (
        <button
          type="button"
          onClick={() => onResetFocus?.()}
          className="absolute bottom-3 right-2 px-2.5 py-1 rounded-full bg-tg-card/80 text-tg-text border border-tg-border shadow-md text-[11px] font-semibold active:scale-95 z-10"
          aria-label={t('mrt.overview', lang)}
        >{t('mrt.overview', lang)}</button>
      )}
      {stations && (
        <div className="text-[10px] text-tg-hint px-2 py-1.5">
          {tn('mrt.counts', lang, { ops: opsCount, future: futureCount })}
        </div>
      )}
    </div>
  );
}
