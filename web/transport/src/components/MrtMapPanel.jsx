// web/transport/src/components/MrtMapPanel.jsx — v0.61.16
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
// v0.61.16 — station-DETAIL view. Selecting a station (a map-pin tap
// or the focused-line panel's station picker) hides every station
// except the one immediately before and after on the line, and draws
// amenity pins for the station's exits / bus stops / taxi stand /
// pick-up point / carparks (from /api/transport/station-context).
// This replaces the v0.61.14 6 km radius mode. The bottom-right
// control toggles between this focused view and a whole-network
// "Overview"; it greys out when there is no focus to toggle from.
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
import { resolveLinePaths, lineStationsFull } from '../data/line-paths.js';
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

// v0.61.16 — amenity-pin palette (mirrors the overlay-layer colours).
const AMENITY_EXIT_BG = '#5E35B1';
const AMENITY_BUS_BG = '#1565C0';
const AMENITY_TAXI_BG = '#FBC02D';
const AMENITY_CARPARK_BG = '#1565C0';

// v0.61.10 — one-shot blink keyframes for crowded-station markers.
function ensureBlinkStyle() {
  if (typeof document === 'undefined' || document.getElementById('gia-mrt-blink')) return;
  const st = document.createElement('style');
  st.id = 'gia-mrt-blink';
  st.textContent = '@keyframes giaMrtBlink{0%,100%{opacity:1}50%{opacity:0.2}}';
  document.head.appendChild(st);
}

// v0.60.230 — a station marker DOM node (replacing the PinElement
// teardrop), modeled on the Hawker TMA's hawkerPinNode. White ring so
// the marker reads against its line polyline; future stations are
// smaller + translucent. v0.61.9 — station markers are SQUARE.
// v0.61.10 — crowded stations (realtime PCD level 'h') blink.
// v0.61.16 — `centre` is the selected station in the detail view
// (larger, dark ring).
function stationDotNode(bg, isFuture, crowded, centre) {
  const size = centre ? 18 : (isFuture ? DOT_SIZE_FUTURE : DOT_SIZE);
  const el = document.createElement('div');
  let css = `width:${size}px;height:${size}px;cursor:pointer;background:${bg};`;
  css += centre
    ? 'border:2.5px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,0.6);'
    : 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.35);';
  if (isFuture) css += 'opacity:0.75;';
  if (crowded) css += 'animation:giaMrtBlink 1s ease-in-out infinite;';
  el.style.cssText = css;
  return el;
}

// v0.61.16 — a small text-label marker for a station amenity (an exit
// letter/number, a bus-stop code, "Taxi" / "Pick-up", or a 🅿️ glyph).
function amenityPinNode(label, bg, fg) {
  const el = document.createElement('div');
  el.textContent = label;
  el.style.cssText = `display:inline-block;padding:1px 5px;border-radius:8px;`
    + `background:${bg};color:${fg};font-size:10px;font-weight:700;line-height:1.5;`
    + `white-space:nowrap;border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);`;
  return el;
}

// Square line emoji — mirrors mrt-lines.js LINES table (v0.60.83).
const LINE_EMOJI = {
  EWL: '🟩', CGL: '🟩', NSL: '🟥', NEL: '🟪',
  CCL: '🟧', DTL: '🟦', TEL: '🟫', BPL: '⬜',
  SLRT: '⬜', PLRT: '⬜', JRL: '🟦', CRL: '🟩'
};

// v0.61.10 — worst realtime crowd level across a station's codes.
const CROWD_RANK = { l: 1, m: 2, h: 3 };
function crowdLevelFor(crowdMap, codes) {
  if (!crowdMap || !Array.isArray(codes)) return null;
  let worst = null;
  for (const c of codes) {
    const lv = crowdMap[String(c).toUpperCase()];
    if (lv && CROWD_RANK[lv] && (!worst || CROWD_RANK[lv] > CROWD_RANK[worst])) worst = lv;
  }
  return worst;
}
const CROWD_DOT = { l: '🟢', m: '🟡', h: '🔴' };

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// v0.60.210 (DF-109) — `lang` threaded from App.jsx so the station
// InfoWindow popup + the panel chrome localise (was English-only).
export default function MrtMapPanel({ focusedCode = null, focusedStation = null, onStationSelect, onLineSelect, statusByLine = null, lang = 'en', overlayLayers = null, attractionsMode = 'nearby' }) {
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
  // v0.61.16 — Overview toggle: when true the map ignores the focused
  // line / station and frames the whole network. `savedViewRef` keeps
  // the exact viewport from before Overview so "Back" restores it;
  // `skipFitRef` suppresses the one renderPins fitBounds after Back.
  const [overview, setOverview] = useState(false);
  const savedViewRef = useRef(null);
  const skipFitRef = useRef(false);
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

  // v0.61.10 — realtime platform-crowd levels ({ "<code>": "l|m|h" }).
  // Best-effort: an empty/failed fetch leaves every pin unblinking.
  const crowdRef = useRef({});
  const [crowd, setCrowd] = useState(null);
  // v0.61.10 — per-station context (exits / bus stops / taxis /
  // carparks), fetched lazily and cached by station name. Shared by
  // the InfoWindow popup and the v0.61.16 station-detail amenity pins.
  const stationCtxRef = useRef({});
  // v0.61.16 — bumped when a station's context resolves, to re-run
  // renderPins so the amenity pins appear.
  const [detailCtxTick, setDetailCtxTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/transport/crowd')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        crowdRef.current = d.crowd || {};
        setCrowd(d.crowd || {});
      })
      .catch(() => { /* pins simply never blink */ });
    return () => { cancelled = true; };
  }, []);

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

  // v0.61.16 — fetch the selected station's context (exits / bus /
  // taxi / carparks) so the detail view can draw amenity pins. Cached
  // by name; a resolved fetch bumps detailCtxTick to re-run renderPins.
  useEffect(() => {
    const fs = focusedStation;
    if (overview || !fs || fs.status === 'future') return undefined;
    if (!Number.isFinite(fs.lat) || !Number.isFinite(fs.lng)) return undefined;
    if (stationCtxRef.current[fs.name]) { setDetailCtxTick((n) => n + 1); return undefined; }
    let cancelled = false;
    fetch(`/api/transport/station-context?lat=${fs.lat}&lng=${fs.lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx) => {
        if (cancelled || !ctx) return;
        stationCtxRef.current[fs.name] = ctx;
        setDetailCtxTick((n) => n + 1);
      })
      .catch(() => { /* detail view simply shows no amenity pins */ });
    return () => { cancelled = true; };
  }, [focusedStation, overview]);

  // Re-render pins whenever stations, map readiness, focused line /
  // station, Overview state, locale, crowd, or station context change.
  useEffect(() => {
    if (mapRef.current && stations) renderPins(stations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, linePaths, mapsKeyState, focusedCode, focusedStation, overview, lang, crowd, detailCtxTick]);

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

  // v0.61.16 — resolve the active station-detail view: the selected
  // station, the line it is detailed along, and the stations one stop
  // before / after it on that line. null when no station is selected
  // or while Overview is engaged.
  function computeDetail(list) {
    const fs = focusedStation;
    if (overview || !fs || !Number.isFinite(fs.lat) || !Number.isFinite(fs.lng)) return null;
    // Honour the focused line only when the selected station actually
    // serves it; a station tapped from Overview (or any pin on a
    // different line) falls back to its own primary line, so the
    // prev/next neighbours come from a line that contains it.
    const fsLines = Array.isArray(fs.lines) ? fs.lines : [];
    const line = (focusedCode && fsLines.includes(focusedCode))
      ? focusedCode
      : (fsLines[0] || null);
    let prev = null;
    let next = null;
    if (line) {
      const ordered = lineStationsFull(list, line);
      const idx = ordered.findIndex((r) => r.name === fs.name);
      if (idx > 0) prev = ordered[idx - 1];
      if (idx >= 0 && idx < ordered.length - 1) next = ordered[idx + 1];
    }
    return { station: fs, line, prev, next };
  }

  // v0.60.230 (Build E 5a) — draw a colour-coded polyline per line
  // beneath the station dots. v0.60.232 (Build E 5e) — geometry is the
  // real LTA route shape from /api/transport/line-paths when available,
  // else the station-code-derived polylines.
  // v0.61.16 — in the station-detail view only the detailed line's
  // polyline is drawn; Overview and the line-focus view filter as before.
  function renderPolylines(list, detail) {
    if (!window.google?.maps?.Polyline) return;
    for (const p of polylinesRef.current) p.setMap(null);
    polylinesRef.current = [];
    const paths = resolveLinePaths(linePathsRef.current, list);
    for (const [lineCode, segments] of Object.entries(paths)) {
      if (detail && detail.line) {
        if (lineCode !== detail.line) continue;
      } else if (!overview && focusedCode && lineCode !== focusedCode) {
        continue;
      }
      const meta = LINES_BY_CODE[lineCode];
      const hex = meta?.hex || DEFAULT_BG;
      const isFutureLine = !!meta?.future;
      const baseOpacity = isFutureLine ? FUTURE_LINE_OPACITY : LINE_OPACITY;
      const heavy = (detail && detail.line === lineCode)
        || (!overview && !detail && focusedCode === lineCode);
      for (const seg of segments) {
        if (!Array.isArray(seg) || seg.length < 2) continue;
        const pl = new window.google.maps.Polyline({
          path: seg,
          map: mapRef.current,
          strokeColor: hex,
          strokeOpacity: baseOpacity,
          strokeWeight: heavy ? LINE_WEIGHT_FOCUSED : LINE_WEIGHT,
          clickable: true,
          zIndex: 1
        });
        pl.addListener('click', () => onLineSelect?.(lineCode));
        polylinesRef.current.push(pl);
      }
    }
  }

  // v0.61.16 — build the station InfoWindow bubble and open it on the
  // tapped marker. Context (exits / bus / taxi) refreshes in place.
  function openStationInfo(s, marker, isFuture, crowdLevel) {
    const codes = (s.codes || []).map((c) => {
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
    const opensWhen = (lang === 'fr' && s.opensDateFr)
      ? s.opensDateFr
      : (s.opensDate || (s.opensYear != null ? String(s.opensYear) : ''));
    const futureLine = isFuture && opensWhen
      ? `<br><em style="color:#9CA3AF">${tn('mrt.opens', lang, { when: escapeHtml(opensWhen) })}</em>`
      : '';
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
    const crowdHtml = (!isFuture && crowdLevel)
      ? `<br><span>${CROWD_DOT[crowdLevel]} ${escapeHtml(t(`mrt.crowd.${crowdLevel}`, lang))}</span>`
      : '';
    const contextHtml = (ctx) => {
      if (!ctx || isFuture) return '';
      let h = '';
      const exits = Array.isArray(ctx.exits)
        ? ctx.exits.map((e) => e && e.exit).filter(Boolean) : [];
      if (exits.length) {
        h += `<br>🚪 ${escapeHtml(t('mrt.exits', lang))}: ${escapeHtml(exits.join(', '))}`;
      }
      const bus = Array.isArray(ctx.busStops)
        ? ctx.busStops.map((b) => b && b.code).filter(Boolean) : [];
      if (bus.length) {
        h += `<br>🚌 ${escapeHtml(t('mrt.busStops', lang))}: ${escapeHtml(bus.join(', '))}`;
      }
      const taxis = Array.isArray(ctx.taxis) ? ctx.taxis : [];
      if (taxis.some((x) => x.kind === 'stand')) {
        h += `<br>🚕 ${escapeHtml(t('mrt.taxiStand', lang))}`;
      }
      if (taxis.some((x) => x.kind === 'pickup')) {
        h += `<br>🚕 ${escapeHtml(t('mrt.taxiPickup', lang))}`;
      }
      return h;
    };
    // v0.60.207 — explicit dark text colour. The InfoWindow bubble is
    // always white, but Telegram's dark theme can cascade a light body
    // colour into it; pin #1c1c1f so the popup is legible in both.
    const compose = (ctx) => `<div style="max-width:240px;font-size:12px;line-height:1.45;color:#1c1c1f"><strong>${escapeHtml(s.name)}</strong><br>${codes || ''}${statusHtml}${crowdHtml}${contextHtml(ctx)}${futureLine}${linkHtml}</div>`;
    const cachedCtx = stationCtxRef.current[s.name] || null;
    infoWindowRef.current?.setContent(compose(cachedCtx));
    infoWindowRef.current?.open({ anchor: marker, map: mapRef.current });
    if (!cachedCtx && !isFuture && Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
      fetch(`/api/transport/station-context?lat=${s.lat}&lng=${s.lng}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((ctx) => {
          if (!ctx) return;
          stationCtxRef.current[s.name] = ctx;
          infoWindowRef.current?.setContent(compose(ctx));
        })
        .catch(() => { /* base content stays */ });
    }
  }

  // v0.61.16 — draw the amenity pins (exits / bus / taxi / carparks)
  // for the detailed station, extending `bounds` to frame them.
  function renderAmenityPins(ctx, bounds) {
    const { AdvancedMarkerElement } = window.google.maps.marker;
    const place = (lat, lng, node, title) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat, lng },
        title: title || '',
        content: node,
        zIndex: 5
      });
      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
    };
    for (const e of (Array.isArray(ctx.exits) ? ctx.exits : [])) {
      const label = String(e.exit || '').replace(/^exit\s*/i, '') || 'Exit';
      place(e.lat, e.lng, amenityPinNode(label, AMENITY_EXIT_BG, '#fff'),
        `${t('mrt.exits', lang)} ${label}`);
    }
    for (const b of (Array.isArray(ctx.busStops) ? ctx.busStops : [])) {
      if (!b || !b.code) continue;
      place(b.lat, b.lng, amenityPinNode(`№${b.code}`, AMENITY_BUS_BG, '#fff'),
        `${t('mrt.busStops', lang)} № ${b.code}`);
    }
    for (const x of (Array.isArray(ctx.taxis) ? ctx.taxis : [])) {
      if (!x || x.kind === 'stop') continue;
      const label = x.kind === 'pickup' ? t('mrt.taxiPickup', lang) : t('mrt.taxiStand', lang);
      const short = x.kind === 'pickup' ? 'Pick-up' : 'Taxi';
      place(x.lat, x.lng, amenityPinNode(short, AMENITY_TAXI_BG, '#1c1c1f'), label);
    }
    for (const cp of (Array.isArray(ctx.carparks) ? ctx.carparks : [])) {
      if (!cp) continue;
      place(cp.lat, cp.lng, amenityPinNode('🅿️', AMENITY_CARPARK_BG, '#fff'),
        `${t('mrt.carparks', lang)}${cp.name ? ' · ' + cp.name : ''}`);
    }
  }

  function renderPins(list) {
    if (!window.google?.maps?.marker?.AdvancedMarkerElement) return;
    ensureBlinkStyle();
    const { AdvancedMarkerElement } = window.google.maps.marker;
    // Tear down old markers (station dots + amenity pins).
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    const detail = computeDetail(list);
    // v0.60.230 — line polylines first so the station dots layer on top.
    renderPolylines(list, detail);
    // v0.61.16 — the detail view shows only the selected station and
    // its two neighbours; the line-focus view filters to one line;
    // Overview and the default view show every station.
    let visibleList;
    if (detail) {
      const names = new Set([detail.station.name, detail.prev?.name, detail.next?.name].filter(Boolean));
      visibleList = list.filter((s) => names.has(s.name));
    } else if (!overview && focusedCode) {
      visibleList = list.filter((s) => Array.isArray(s.lines) && s.lines.includes(focusedCode));
    } else {
      visibleList = list;
    }
    const bounds = new window.google.maps.LatLngBounds();
    let boundedCount = 0;
    for (const s of visibleList) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      const isFuture = s.status === 'future';
      const primary = s.lines?.[0];
      const bg = isFuture ? FUTURE_BG : (LINES_BY_CODE[primary]?.hex || DEFAULT_BG);
      const crowdLevel = isFuture ? null : crowdLevelFor(crowdRef.current, s.codes);
      const isCentre = !!detail && s.name === detail.station.name;
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: s.lat, lng: s.lng },
        title: s.name,
        content: stationDotNode(bg, isFuture, crowdLevel === 'h', isCentre)
      });
      marker.addListener('click', () => {
        // v0.61.16 — tapping any station pin selects it (entering /
        // re-targeting the station-detail view) and leaves Overview.
        if (overview) setOverview(false);
        onStationSelect?.(s);
        openStationInfo(s, marker, isFuture, crowdLevel);
      });
      markersRef.current.push(marker);
      // In the detail view every visible station frames the map; in
      // the other views only operational stations contribute, so the
      // map opens framing the live network.
      if (detail) {
        bounds.extend({ lat: s.lat, lng: s.lng });
        boundedCount++;
      } else if (!isFuture) {
        bounds.extend({ lat: s.lat, lng: s.lng });
        boundedCount++;
      }
    }
    // v0.61.16 — amenity pins for the detailed station.
    if (detail) {
      const ctx = stationCtxRef.current[detail.station.name];
      if (ctx) renderAmenityPins(ctx, bounds);
    }
    // Framing. After "Back" from Overview, restore the exact saved
    // viewport instead of re-fitting.
    if (skipFitRef.current) {
      skipFitRef.current = false;
      const sv = savedViewRef.current;
      if (sv && mapRef.current) {
        mapRef.current.setCenter(sv.center);
        mapRef.current.setZoom(sv.zoom);
      }
    } else if (detail) {
      if (boundedCount) mapRef.current.fitBounds(bounds, 60);
    } else if (boundedCount > 1) {
      mapRef.current.fitBounds(bounds, 60);
    }
  }

  // v0.61.16 — Overview toggle. Entering Overview stashes the current
  // viewport and frames the whole network; "Back" restores it.
  function toggleOverview() {
    const map = mapRef.current;
    if (!map) return;
    if (!overview) {
      const c = map.getCenter?.();
      savedViewRef.current = c
        ? { center: { lat: c.lat(), lng: c.lng() }, zoom: map.getZoom() }
        : null;
      setOverview(true);
    } else {
      skipFitRef.current = !!savedViewRef.current;
      setOverview(false);
    }
  }

  if (err) return <div className="text-xs text-red-500 p-3">{t('mrt.err.stations', lang)} {err}</div>;
  if (mapsKeyState === 'nokey') return <div className="text-xs text-tg-hint p-3">{t('mrt.err.nokey', lang)}</div>;
  if (mapsKeyState === 'error') return <div className="text-xs text-red-500 p-3">{t('mrt.err.mapfail', lang)}</div>;

  const opsCount = (stations || []).filter((s) => s.status !== 'future').length;
  const futureCount = (stations || []).filter((s) => s.status === 'future').length;
  // The Overview toggle is meaningless (greyed) when nothing is
  // focused — the default view already shows the whole network.
  const overviewDisabled = !overview && !focusedCode && !focusedStation;

  return (
    <div className="rounded-2xl overflow-hidden border border-tg-border relative">
      <div
        ref={containerRef}
        // v0.60.93 — match Cuisine MapPanel responsive height per
        // operator 2026-05-11 ("too long"). Phone: ≤50vh capped at
        // 420 px; minHeight 240 px so the map remains usable on tiny
        // viewports. v0.63.0 — expand toggle grows it to ~90vh.
        style={{ height: expanded ? '90vh' : 'min(420px, 50vh)', minHeight: '240px', width: '100%' }}
        aria-label={t('mrt.aria.map', lang)}
      />
      {/* v0.63.1 — custom map-control row, top-right: zoom +/- and the
          expand toggle. v0.61.16 — fixed white styling: the Google map
          tiles are always light, so the prior theme-adaptive tg-card
          colours rendered near-invisible in Telegram dark mode. */}
      <div className="absolute top-2 right-2 flex flex-row gap-1 z-10">
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? SG_DEFAULT_ZOOM) + 1)}
          className="w-7 h-7 rounded-full bg-white text-gray-900 border border-gray-300 shadow-md flex items-center justify-center text-base font-semibold leading-none active:scale-95"
          aria-label={t('map.zoomIn', lang)}
        ><span aria-hidden>＋</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? SG_DEFAULT_ZOOM) - 1)}
          className="w-7 h-7 rounded-full bg-white text-gray-900 border border-gray-300 shadow-md flex items-center justify-center text-base font-semibold leading-none active:scale-95"
          aria-label={t('map.zoomOut', lang)}
        ><span aria-hidden>－</span></button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-7 h-7 rounded-full bg-white text-gray-900 border border-gray-300 shadow-md flex items-center justify-center text-sm leading-none active:scale-95"
          aria-label={t(expanded ? 'map.collapse' : 'map.expand', lang)}
          title={t(expanded ? 'map.collapse' : 'map.expand', lang)}
        ><span aria-hidden>{expanded ? '⤡' : '⤢'}</span></button>
      </div>
      {/* v0.61.16 — Overview toggle, bottom-right. Frames the whole
          network; "Back" restores the prior focused viewport. Greyed
          when there is no focused line / station to toggle from. */}
      <button
        type="button"
        onClick={toggleOverview}
        disabled={overviewDisabled}
        className="absolute bottom-3 right-2 px-2.5 py-1 rounded-full bg-white text-gray-900 border border-gray-300 shadow-md text-[11px] font-semibold active:scale-95 z-10 disabled:opacity-40 disabled:cursor-default"
        aria-label={t(overview ? 'mrt.backToView' : 'mrt.overview', lang)}
      >{t(overview ? 'mrt.backToView' : 'mrt.overview', lang)}</button>
      {stations && (
        <div className="text-[10px] text-tg-hint px-2 py-1.5">
          {tn('mrt.counts', lang, { ops: opsCount, future: futureCount })}
        </div>
      )}
    </div>
  );
}
