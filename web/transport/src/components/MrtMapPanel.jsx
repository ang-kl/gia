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
import { createOverlayController, attachAmenityPins, infoCard, infoPalette, ensureGreyscaleStyle, stationPillNode, stationCodeNode, trainTier, demoteByOverlap, makeTrainColourOverlay } from '../lib/mapOverlays.js';
import MapControls from '../../../_shared/components/MapControls.jsx';
// v0.62.689 — station-pick inspection overlay. The ring layer was the ONE piece
// Transport lacked (Cuisine + Hawker already draw rings); the hawker-centre fetch
// it pairs with was already here as mapOverlays' private `fetchHawkerCentres`, so
// the shared loader is used instead of exporting that.
import { createRingLayer } from '../../../_shared/lib/distance-rings.js';
import { createInspectLayer, loadAllHawkerCentres } from '../../../_shared/lib/temp-pin.js';
import { TAP_ZOOM_WIDE, TAP_ZOOM_PHONE } from '../../../_shared/lib/map-interaction.js';
// v0.62.814 — O-320. Official gov.sg station names in the reader's language.
// DISPLAY ONLY. Every other `s.name` in this file is a KEY — a Map lookup, an
// identity comparison, or a Google Maps query string — and translating one of those
// breaks the app silently. The three call sites below are the ones a reader sees.
import { stationName } from '../../../_shared/lib/mrt-stations-i18n.generated.js';

// Local openLink — transport TMA's tg.js doesn't export one. Routes
// through Telegram WebApp's openLink when available so Telegram opens
// the link in the system browser; falls back to window.open for tests.
function openExternal(url) {
  const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  if (w && typeof w.openLink === 'function') { w.openLink(url); return; }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
}

const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };
// v0.62.132 — default 11->12. v0.62.659 — operator, first-load screenshot: "set
// to 10 like the screenshot and overview" — a first-time visitor should see the
// whole network at once (the z<12 plain-dot tier, same look Overview computes
// via fitBounds), not a partial zoomed-in slice of central Singapore.
const SG_DEFAULT_ZOOM = 10;
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

// v0.61.10 — one-shot blink keyframes for crowded-station markers.
function ensureBlinkStyle() {
  if (typeof document === 'undefined' || document.getElementById('gia-mrt-blink')) return;
  const st = document.createElement('style');
  st.id = 'gia-mrt-blink';
  st.textContent = '@keyframes giaMrtBlink{0%,100%{opacity:1}50%{opacity:0.2}}'
    // v0.62.651 — the card-tap focus flash (Cuisine parity, mapOverlays.flashPin).
    + '@keyframes giaMrtFocusFlash{0%{transform:scale(0.6);opacity:0.9}'
    + '70%{transform:scale(1.35);opacity:0.15}100%{transform:scale(1.5);opacity:0}}';
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
export default function MrtMapPanel({ focusedCode = null, focusedStation = null, onStationSelect, onLineSelect, statusByLine = null, lang = 'en', overlayLayers = null, onOverlayChange = null, fill = false, navInset = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  // v0.61.21 — station-detail amenity pins, kept separate from the
  // station-dot markers so they survive a dot-only re-render.
  const amenityMarkersRef = useRef([]);
  const polylinesRef = useRef([]);
  // v0.61.95 — coloured SVG copy of the line polylines, for monochrome.
  const colourOverlayRef = useRef(null);
  const infoWindowRef = useRef(null);
  const stationsRef = useRef([]);
  // v0.63.0 — parks / attractions / taxi / carpark overlay layers.
  const overlayControllerRef = useRef(null);
  const overlayLayersRef = useRef(overlayLayers);
  useEffect(() => { overlayLayersRef.current = overlayLayers; }, [overlayLayers]);
  // v0.62.689 — station-pick inspection overlay: the distance rings (new to this
  // TMA) plus the temporary amber pin + nearest-3 hawker centres.
  const ringLayerRef = useRef(null);
  const inspectLayerRef = useRef(null);
  // Operator: "zoom in to the temporary location should be 15 (iphone and
  // smaller) or 17 (ipad and desktop)". Same 700px split Hawker's panel already
  // uses for its own tap zoom, held in a ref because the global that reads it is
  // registered once.
  const isTabletRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(min-width: 700px)');
    isTabletRef.current = mql.matches;
    const onChange = (e) => { isTabletRef.current = e.matches; };
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  // v0.63.0 — expand toggle: grows the map to ~90vh in place.
  // v0.62.626 — operator ("Expand/Collapse map buttons don't work"): in the
  // carousel/desktop layout the map runs in `fill` mode (height:100%), so the
  // 90vh/70vh toggle never applied and the button was a dead no-op. In fill mode
  // "expand" now promotes the whole panel to a full-viewport overlay (see the
  // wrapper's `expandedOverlay` below). When the container resizes, Google Maps
  // must be told to reflow (else it renders at the stale size); trigger a resize
  // and recenter so the view doesn't drift.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps?.event) return undefined;
    const c = map.getCenter?.();
    const id = setTimeout(() => {
      try {
        window.google.maps.event.trigger(map, 'resize');
        if (c) map.setCenter(c);
      } catch { /* noop */ }
    }, 60);
    return () => clearTimeout(id);
  }, [expanded]);
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
  // v0.61.92 — live zoom readout + a zoom-tier re-render of the station
  // markers. `renderPinsRef` gives the zoom_changed listener (bound once
  // in initMap) the current render closure; the existing `stationsRef`
  // (synced from `stations` below) supplies the current data.
  const [zoomLevel, setZoomLevel] = useState(null);
  const renderPinsRef = useRef(null);
  // v0.61.112 — debounce timer for the zoom-driven station re-render.
  const zoomRenderTimerRef = useRef(null);
  // v0.61.119 — debounce timer for the idle-driven setAnchor pass.
  // Each setAnchor re-runs applyVisibility (incl. applyClusterAndDrop)
  // for every active overlay — heavy at z14+ with attractions on.
  const anchorTimerRef = useRef(null);

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
    // v0.62.689 — operator: "Can this be done for Train as well?" Same inspection
    // overlay as Hawker — one temporary amber pin, its rings, and the nearest 3
    // hawker centres — minus showVenueTransit: on the Train map the picked point
    // IS a station, so drawing "nearest stations" around it says nothing.
    window.__giaMrtInspect = (lat, lng, label) => {
      const la = Number(lat); const ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
      infoWindowRef.current?.close();
      overlayControllerRef.current?.closeInfo?.();
      mapRef.current?.panTo({ lat: la, lng: ln });
      mapRef.current?.setZoom(isTabletRef.current ? TAP_ZOOM_WIDE : TAP_ZOOM_PHONE);
      ringLayerRef.current?.draw({ lat: la, lng: ln });
      loadAllHawkerCentres().then((centres) => {
        inspectLayerRef.current?.show({ lat: la, lng: ln, label: label || '', centres, count: 3 });
      });
    };
    return () => {
      try { delete window.__giaMrtOpenMap; } catch { window.__giaMrtOpenMap = undefined; }
      try { delete window.__giaMrtInspect; } catch { window.__giaMrtInspect = undefined; }
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

  // v0.62.651 — operator: "each tap should jump to the station and blink like the
  // cuisine tma." The jump already worked (setCenter + zoom 18, v0.62.634) but
  // there was no blink, so on a busy map — and especially in LIST mode, where the
  // drawer covers the lower half — you could not tell WHICH pin the tap had
  // landed on. This is Cuisine's flashPin (mapOverlays.jsx) ported: a transient
  // expanding ring at the focused station, ~1.6 s, then removed. It draws no
  // permanent marker and never touches the pin layer, so it cannot interfere with
  // renderPins' own lifecycle.
  useEffect(() => {
    const fs = focusedStation;
    const map = mapRef.current;
    if (!fs || !map || typeof document === 'undefined') return undefined;
    if (!Number.isFinite(fs.lat) || !Number.isFinite(fs.lng)) return undefined;
    const AME = window.google?.maps?.marker?.AdvancedMarkerElement;
    if (!AME) return undefined;
    ensureBlinkStyle();
    const hex = LINES_BY_CODE[(fs.lines || [])[0]]?.hex || '#2f81f7';
    const el = document.createElement('div');
    el.style.cssText = 'width:46px;height:46px;border-radius:50%;pointer-events:none;'
      + `border:3px solid ${hex};background:${hex}22;box-shadow:0 0 10px ${hex};`
      + 'animation:giaMrtFocusFlash 0.8s ease-out 2;';
    let marker = null;
    try {
      marker = new AME({ position: { lat: fs.lat, lng: fs.lng }, content: el, zIndex: 9999 });
      marker.map = map;
    } catch { return undefined; }
    const timer = setTimeout(() => { try { marker.map = null; } catch { /* noop */ } }, 1700);
    return () => { clearTimeout(timer); try { marker.map = null; } catch { /* noop */ } };
    // Keyed on the station's identity, so re-tapping the SAME card re-flashes.
  }, [focusedStation]);

  // Re-render pins whenever stations, map readiness, focused line /
  // station, Overview state, locale, crowd, or station context change.
  useEffect(() => {
    if (mapRef.current && stations) renderPins(stations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, linePaths, mapsKeyState, focusedCode, focusedStation, overview, lang, crowd, detailCtxTick]);

  function initMap() {
    if (!containerRef.current || mapRef.current || !window.google?.maps) return;
    ensureGreyscaleStyle();
    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: SG_CENTROID,
      zoom: SG_DEFAULT_ZOOM,
      // v0.60.87 — mapId from /maps-key (env-sourced when MAP_ID is
      // set on Railway), falling back to Google's public DEMO_MAP_ID
      // for AdvancedMarkerElement support. Without ANY mapId the
      // map throws the "This page can't load Google Maps correctly"
      // auth overlay (operator screenshot 2026-05-11).
      mapId: mapIdRef.current,
      // v0.61.89 — streamline: all three TMA maps now share one options block:
      // disableDefaultUI strips the native chrome; mapType / streetView /
      // fullscreen stay off.
      // v0.62.134 — operator (17-06 '26): remove Google's native camera
      // control (the +/pan-arrows/tilt cluster) from every TMA — it duplicated
      // the custom nav cluster (top-right) + ↹ centre-map button (v0.62.133).
      // Prior (superseded): cameraControl:true @ LEFT_BOTTOM, kept since v0.61.89.
      disableDefaultUI: true,
      zoomControl: false,
      clickableIcons: false,
      cameraControl: false,
      keyboardShortcuts: true,
      // v0.62.102 — operator: the embedded map hung when zoomed out far (world
      // view). v0.62.294 — z5 still hung; raise the floor to minZoom 7 … maxZoom 20.
      // v0.62.634 — operator: "capped at 23" — raise the ceiling so a selected
      // station can zoom right in to street/exit level.
      minZoom: 7, maxZoom: 23,
      gestureHandling: 'greedy'
    });
    // v0.61.22 — headerDisabled drops Google's white header + ✕ so the
    // themed infoCard (with its own in-card ✕) is the whole popup.
    infoWindowRef.current = new window.google.maps.InfoWindow({ headerDisabled: true });
    overlayControllerRef.current = createOverlayController(mapRef.current, window.google.maps, { tma: 'transport' });
    // v0.61.95 — operator part 5: the coloured SVG train-line overlay,
    // shown in monochrome mode so the lines don't grey out with the
    // WebGL base-map canvas.
    ringLayerRef.current = createRingLayer(mapRef.current, window.google.maps);
    inspectLayerRef.current = createInspectLayer(mapRef.current, window.google.maps);
    colourOverlayRef.current = makeTrainColourOverlay(window.google.maps);
    syncColourOverlay();
    applyOverlayLayers(overlayLayersRef.current);
    // v0.64.0 — feed the map-centre anchor so radius-clipped overlay
    // layers re-filter on every pan/zoom.
    // v0.61.119 — debounced. setAnchor re-runs applyVisibility for every
    // active overlay (incl. the O(N²) cluster pass over ~150 attractions);
    // zooming/panning past z14 with attractions on used to hang. ~180 ms
    // collapses rapid idle events into a single re-evaluation.
    mapRef.current.addListener('idle', () => {
      if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
      anchorTimerRef.current = setTimeout(() => {
        anchorTimerRef.current = null;
        const c = mapRef.current?.getCenter?.();
        if (c) overlayControllerRef.current?.setAnchor?.(c.lat(), c.lng());
      }, 180);
    });
    // v0.61.92 — live zoom readout + re-render station markers on zoom
    // so they swap tier (code chip <-> named pill) + re-run the overlap
    // demotion. keepView so the zoom re-render never re-frames the map.
    // v0.61.112 — the re-render (full ~200-marker teardown + polyline
    // rebuild + O(N²) overlap pass) is debounced: zooming several levels
    // quickly used to stack one synchronous rebuild per level and freeze
    // the map. The readout still updates immediately; the rebuild runs
    // once, ~180 ms after the zoom settles.
    setZoomLevel(mapRef.current.getZoom?.());
    mapRef.current.addListener('zoom_changed', () => {
      setZoomLevel(mapRef.current?.getZoom?.());
      if (zoomRenderTimerRef.current) clearTimeout(zoomRenderTimerRef.current);
      zoomRenderTimerRef.current = setTimeout(() => {
        zoomRenderTimerRef.current = null;
        if (stationsRef.current) renderPinsRef.current?.(stationsRef.current, { keepView: true });
      }, 180);
    });
    // v0.61.22 — close any open popup on a tap of the empty map, and
    // expose a global the in-card ✕ button calls.
    const closeInfo = () => {
      infoWindowRef.current?.close();
      overlayControllerRef.current?.closeInfo?.();
      // v0.62.689 — a tap on the empty map ends the inspection: rings and the
      // temporary pin go together, so no stale pin can outlive its rings.
      ringLayerRef.current?.clear();
      inspectLayerRef.current?.clear();
    };
    window.__giaMapInfoClose = closeInfo;
    mapRef.current.addListener('click', closeInfo);
    if (stations) renderPins(stations);
  }

  // Push the current layer-toggle state into the overlay controller.
  // No 'train' overlay layer here — the Transport map draws its own line
  // polylines; the Train Line toggle drives those (see the effect below).
  function applyOverlayLayers(layers) {
    const ctrl = overlayControllerRef.current;
    if (!ctrl || !layers) return;
    ctrl.setLayer('parks', !!layers.parks);
    ctrl.setLayer('attractions', !!layers.attractions);
    ctrl.setLayer('taxis', !!layers.taxis);
    ctrl.setLayer('carpark', !!layers.carpark);
    ctrl.setLayer('busstop', !!layers.busstop);
    ctrl.setLayer('hawker', !!layers.hawker);   // v0.62.278 — shared hawker overlay
    ctrl.setLayer('exits', !!layers.exits);
    ctrl.setLayer('clinics', !!layers.clinics);
    ctrl.setLayer('hospitals', !!layers.hospitals);
    ctrl.setLayer('police', !!layers.police);
  }
  useEffect(() => { applyOverlayLayers(overlayLayers); }, [overlayLayers]); // eslint-disable-line
  useEffect(() => () => {
    overlayControllerRef.current?.destroy?.();
    ringLayerRef.current?.destroy?.();
    inspectLayerRef.current?.destroy?.();
    colourOverlayRef.current?.setMap(null);
    if (zoomRenderTimerRef.current) clearTimeout(zoomRenderTimerRef.current);
    if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
  }, []);

  // v0.61.36 — Train Line toggle: show / hide the line polylines. The
  // polylines are this map's own geometry (not an overlay layer), so the
  // toggle flips their `.map` directly. Default ON (undefined !== false).
  useEffect(() => {
    const vis = overlayLayers?.train !== false;
    for (const p of polylinesRef.current) p.setMap(vis ? mapRef.current : null);
  }, [overlayLayers?.train]);

  // v0.61.95 — operator part 5: re-sync the coloured train-line overlay
  // whenever the Colour (monochrome) or Train Line toggle changes.
  // v0.61.103 — also re-render the polylines so they pick up the new
  // monochrome state (invisible in monochrome; the SVG carries them).
  useEffect(() => {
    syncColourOverlay();
    if (stationsRef.current) renderPinsRef.current?.(stationsRef.current, { keepView: true });
  }, [overlayLayers?.colour, overlayLayers?.train]);

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
    // v0.61.95 — a coloured SVG copy of every drawn line, fed to the
    // monochrome colour overlay (the base polylines grey out with the
    // WebGL canvas filter).
    const colourSegs = [];
    // v0.61.36 — Train Line toggle (default ON) gates polyline visibility.
    const trainVisible = overlayLayersRef.current?.train !== false;
    // v0.61.103 — in monochrome the base polylines render invisible
    // (strokeOpacity 0, still clickable) so they don't grey out under
    // the canvas filter; the coloured SVG overlay carries the line.
    const mono = overlayLayersRef.current?.colour === false;
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
      const weight = heavy ? LINE_WEIGHT_FOCUSED : LINE_WEIGHT;
      for (const seg of segments) {
        if (!Array.isArray(seg) || seg.length < 2) continue;
        const pl = new window.google.maps.Polyline({
          path: seg,
          map: trainVisible ? mapRef.current : null,
          strokeColor: hex,
          strokeOpacity: mono ? 0 : baseOpacity,
          strokeWeight: weight,
          clickable: true,
          zIndex: 1
        });
        pl.addListener('click', () => onLineSelect?.(lineCode));
        polylinesRef.current.push(pl);
        colourSegs.push({ hex, pts: seg, opacity: baseOpacity, weight });
      }
    }
    colourOverlayRef.current?.setSegments(colourSegs);
  }

  // v0.61.95 — operator part 5: attach the coloured SVG line overlay
  // only while monochrome mode is on and the Train Line layer is shown;
  // otherwise detach it. Reads the refs, so it is safe to call from the
  // map-init path and from the toggle effect.
  function syncColourOverlay() {
    const ov = colourOverlayRef.current;
    if (!ov || !mapRef.current) return;
    const mono = overlayLayersRef.current?.colour === false;
    const trainOn = overlayLayersRef.current?.train !== false;
    ov.setMap(mono && trainOn ? mapRef.current : null);
  }

  // v0.61.16 — build the station InfoWindow bubble and open it on the
  // tapped marker. Context (exits / bus / taxi) refreshes in place.
  function openStationInfo(s, marker, isFuture, crowdLevel) {
    const pal = infoPalette();
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
    const linkHtml = `<br><a href="#" onclick="__giaMrtOpenMap('${escapeHtml(s.name)}'); return false;" style="color:${pal.link}">Google Map ↗</a>`;
    const crowdHtml = (!isFuture && crowdLevel)
      ? `<br><span>${CROWD_DOT[crowdLevel]} ${escapeHtml(t(`mrt.crowd.${crowdLevel}`, lang))}</span>`
      : '';
    const contextHtml = (ctx) => {
      if (!ctx || isFuture) return '';
      let h = '';
      const exits = Array.isArray(ctx.exits)
        ? ctx.exits.map((e) => e && e.exit).filter(Boolean) : [];
      if (exits.length) {
        h += `<br>${escapeHtml(t('mrt.exits', lang))}: ${escapeHtml(exits.join(', '))}`;
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
    // v0.61.22 — themed rounded card (infoCard) with an in-card ✕.
    // v0.62.814 — the popup heading is the reader's language; `s.name` stays English
    // one line below, where it keys the context cache.
    const compose = (ctx) => infoCard(`<strong>${escapeHtml(stationName(s.name, lang))}</strong><br>${codes || ''}${statusHtml}${crowdHtml}${contextHtml(ctx)}${futureLine}${linkHtml}`);
    const cachedCtx = stationCtxRef.current[s.name] || null;
    infoWindowRef.current?.setContent(compose(cachedCtx));
    // v0.61.98 — anchor the InfoWindow to the station POSITION, not the
    // tapped marker. renderPins rebuilds every station marker on each
    // re-render — and a station tap triggers two of them (the
    // focusedStation change, then the station-context fetch bumping
    // detailCtxTick). An InfoWindow anchored to a torn-down marker
    // silently closes, which is why the card used to need repeated taps
    // to stay open. A position anchor survives the marker rebuilds.
    infoWindowRef.current?.setPosition({ lat: s.lat, lng: s.lng });
    infoWindowRef.current?.open({ map: mapRef.current });
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

  // v0.61.21 — draw the detailed station's amenity pins via the shared
  // attachAmenityPins helper (the proven path the Hawker / Cuisine maps
  // use), so the pins reliably appear and each opens a clickable popup
  // (live bus arrivals etc.). Kept in amenityMarkersRef; `bounds` is
  // extended so the detail view frames the pins.
  function renderAmenityPins(ctx, bounds) {
    amenityMarkersRef.current = attachAmenityPins({
      maps: window.google.maps,
      map: mapRef.current,
      infoWindow: infoWindowRef.current,
      ctx,
      limits: { bus: 3, carpark: 2, taxi: 2 }
    });
    for (const m of amenityMarkersRef.current) {
      if (m.position) bounds.extend(m.position);
    }
  }

  // v0.61.93 — auto-fit gating (operator: don't auto-zoom-out).
  // `firstFitRef` — true until the first whole-network frame; after
  // that the default view keeps the user's zoom. `lastFocusRef` — the
  // last focused-line / station / Overview key, so a focus change
  // still re-frames but an incidental re-render (crowd, locale) does not.
  const firstFitRef = useRef(true);
  const lastFocusRef = useRef(undefined);
  function renderPins(list, opts) {
    if (!window.google?.maps?.marker?.AdvancedMarkerElement) return;
    ensureBlinkStyle();
    const { AdvancedMarkerElement } = window.google.maps.marker;
    // Tear down old markers (station dots + amenity pins).
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    for (const m of amenityMarkersRef.current) m.map = null;
    amenityMarkersRef.current = [];
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
    // v0.61.92 — operator: Transport stations follow zoom tiers — code
    // chips at z12-14, named pills at z15+, demoted on overlap (keep the
    // station nearest the detailed station / viewport centre). z<12 and
    // future stations keep the plain coloured dot.
    const zoom = mapRef.current?.getZoom?.() || SG_DEFAULT_ZOOM;
    const tier = trainTier('transport', zoom);
    const tItems = visibleList
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .map((s) => ({
        name: s.name, lat: s.lat, lng: s.lng, codes: s.codes,
        mode: s.status === 'future' ? 'sq-sm'
          : tier.station === 'pill' ? 'pill'
          : tier.station === 'sq-sm' ? 'sq-sm'
          : 'chip:' + (tier.scale || 1),
        pinned: !!(detail && s.name === detail.station.name)
      }));
    demoteByOverlap(tItems, zoom, tier.overlapChip);
    const modeByName = new Map(tItems.map((x) => [x.name, x.mode]));
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
        title: stationName(s.name, lang),  // v0.62.814 — shown on hover; not a key
        content: transportStationContent(s, bg, modeByName.get(s.name),
          isFuture, crowdLevel === 'h', isCentre),
        // v0.61.119 — operator: station markers render in front of bus
        // stops. Past z13 bus pins escalate to full-name labels that
        // were occluding the station code/name pills; raising station
        // zIndex above the bus default puts stations on top.
        zIndex: 1000
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
    // viewport instead of re-fitting. v0.61.92 — `keepView` (the zoom-
    // tier re-render) skips framing entirely so it never fights a zoom.
    // v0.61.93 — operator: don't auto-zoom-out. The whole-network fit
    // now runs only on the first load or when the focused line /
    // station / Overview state changes — not on an incidental
    // re-render (crowd refresh, locale). A tapped station still frames
    // its own detail view.
    if (!opts?.keepView) {
      const focusKey = `${focusedCode || ''}|${focusedStation || ''}|${overview}`;
      const focusChanged = lastFocusRef.current !== undefined
        && lastFocusRef.current !== focusKey;
      lastFocusRef.current = focusKey;
      if (skipFitRef.current) {
        skipFitRef.current = false;
        const sv = savedViewRef.current;
        if (sv && mapRef.current) {
          mapRef.current.setCenter(sv.center);
          mapRef.current.setZoom(sv.zoom);
        }
      } else if (detail) {
        // v0.62.634 — operator: "It should zoom in 18 and capped at 23." A tapped
        // station centres and zooms to 18 (street/exit level) instead of
        // fitBounds — which zoomed OUT to frame every amenity pin, landing around
        // z15-16. The exits / bus stops / carparks stay on the map; the user can
        // pan/zoom out to 7 or in to 23 from there.
        const st = detail.station;
        if (st && Number.isFinite(st.lat) && Number.isFinite(st.lng)) {
          mapRef.current.setCenter({ lat: st.lat, lng: st.lng });
          mapRef.current.setZoom(18);
        } else if (boundedCount) {
          mapRef.current.fitBounds(bounds, 60);
        }
      } else if (boundedCount > 1 && (firstFitRef.current || focusChanged)) {
        firstFitRef.current = false;
        mapRef.current.fitBounds(bounds, 60);
      }
    }
  }
  // v0.61.92 — keep a live handle to renderPins so the zoom_changed
  // listener (bound once in initMap) always calls the current closure.
  renderPinsRef.current = renderPins;

  // v0.61.92 — resolve a Transport station marker for its zoom tier: a
  // named pill (z15+), a line-coloured code chip (z12-14, possibly
  // overlap-demoted), or the plain coloured dot (z<12 / future stns).
  function transportStationContent(s, bg, mode, isFuture, crowded, centre) {
    if (!isFuture && mode === 'pill') return stationPillNode(s.codes, s.name, bg);
    if (!isFuture && typeof mode === 'string' && mode.indexOf('chip:') === 0) {
      return stationCodeNode(s.codes, bg, parseFloat(mode.slice(5)) || 1);
    }
    return stationDotNode(bg, isFuture, crowded, centre);
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

  // v0.61.36 — in-map control config. Row 1 = the always-visible toggle
  // pills; the "⋯/⋮" dropdown = the checkbox layer list. Bus Stop / 24
  // hours render disabled (no backing data yet). Colour toggles the
  // greyscale map filter; Train Line gates the line polylines.
  // v0.61.51 — Train Line promoted from the dropdown into the row;
  // Attractions demoted into the dropdown above Park.
  const rowToggles = [
    { key: 'train',       icon: '🚉', label: t('layer.train', lang) },
    { key: 'carpark',     icon: '🅿️', label: t('layer.carpark', lang) },
    { key: 'busstop',     icon: '🚌', label: t('layer.busstop', lang) },
    // v0.62.278 — operator: 🍚 Hawker overlay pill, standardized from Cuisine.
    // OFF by default in the Train TMA (see App overlayLayers default).
    { key: 'hawker',      icon: '🍚', label: t('layer.hawker', lang) }
  ];
  const menuToggles = [
    { key: 'exits',       icon: '',   label: t('layer.exits', lang) },
    { key: 'taxis',       icon: '🚕', label: t('layer.taxis', lang) },
    { key: 'attractions', icon: '⚝', label: t('layer.attractions', lang) },
    { key: 'parks',       icon: '🌳', label: t('layer.parks', lang) },
    { key: 'police',  icon: '👮', label: t('layer.police', lang) },
    { key: 'clinics', icon: '💊', label: t('layer.clinics', lang) },
    { key: 'hospitals', icon: '🏥', label: t('layer.hospitals', lang) }
  ];

  // v0.62.626 — in fill mode, "expand" promotes the panel to a full-viewport
  // overlay (the 90vh/70vh height toggle only applies to the non-fill block).
  const expandedOverlay = expanded && fill;
  return (
    <div className={expandedOverlay
      // v0.62.628 — z-[35]: the floating station carousel + the phone bottom-sheet
      // both sit at z-30 and paint LATER in the DOM, so an equal-z overlay would
      // hide BEHIND them (same class of bug Codex flagged on Hawker). Lift the
      // expanded map above them (z-30) while staying below the footer dock (z-40).
      ? 'fixed inset-0 z-[35] overflow-hidden bg-tg-bg'
      : `rounded-2xl overflow-hidden border border-tg-border relative${fill ? ' h-full' : ''}`}>
      <div
        ref={containerRef}
        className={overlayLayers && overlayLayers.colour === false ? 'gia-greyscale-map' : undefined}
        // v0.60.93 — match Cuisine MapPanel responsive height per
        // operator 2026-05-11 ("too long"). Phone: ≤50vh capped at
        // 420 px; minHeight 240 px so the map remains usable on tiny
        // viewports. v0.63.0 — expand toggle grows it to ~90vh.
        // v0.62.223 — operator (IMG_2537) REVERSED the "too long" cap:
        // "lengthen like cuisine TMA". Cuisine's full-bleed map is min-h-[60vh];
        // match that feel here at 70vh (the header takes the top), minHeight 420 px.
        // v0.62.601 — `fill` mode: the map fills its parent (the two-panel /
        // carousel layouts give it a bounded height), instead of the 70vh block.
        style={fill
          ? { height: '100%', minHeight: '240px', width: '100%' }
          : { height: expanded ? '90vh' : '70vh', minHeight: '420px', width: '100%' }}
        aria-label={t('mrt.aria.map', lang)}
      />
      {/* v0.63.1 — custom map-control row, top-right: zoom +/- and the
          expand toggle. v0.61.16 — fixed white styling: the Google map
          tiles are always light, so the prior theme-adaptive tg-card
          colours rendered near-invisible in Telegram dark mode. */}
      {/* v0.61.51 — nav cluster shifted to top-12 so the quick-button
          row has clean horizontal space. v0.61.59 — the Colour-mode
          pill moved out of this cluster into the quick-toggle row
          (after Bus Stop); the cluster is now Reset / + / − / expand. */}
      {/* v0.62.620 — operator: in the phone DRAWER layout the floating header sits
          OVER the full-bleed map, hiding the top of this cluster (Reset/"default" +
          zoom-in). `navInset` drops the cluster below that header so all buttons
          are reachable. */}
      <div
        className={`absolute left-2 flex flex-col gap-1 z-10 ${navInset ? '' : 'top-12'}`}
        style={navInset ? { top: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 7.5rem)' } : undefined}>
        {/* v0.61.37 — Reset: recenter to the Singapore default view. */}
        <button
          type="button"
          onClick={() => {
            mapRef.current?.setCenter(SG_CENTROID);
            mapRef.current?.setZoom(SG_DEFAULT_ZOOM);
          }}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-[11px] font-bold leading-none active:scale-95"
          aria-label={t('map.reset', lang)}
          title={t('map.reset', lang)}
        ><span aria-hidden>{zoomLevel != null ? Math.round(zoomLevel) : '⟲'}</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? SG_DEFAULT_ZOOM) + 1)}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t('map.zoomIn', lang)}
        ><span aria-hidden>＋</span></button>
        {/* v0.62.133 — operator: "centre map" (↹) button between + and −. */}
        <button
          type="button"
          onClick={() => mapRef.current?.panTo(SG_CENTROID)}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={lang === 'fr' ? 'Centrer la carte' : 'Centre map'}
          title={lang === 'fr' ? 'Centrer la carte' : 'Centre map'}
        ><span aria-hidden>↹</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? SG_DEFAULT_ZOOM) - 1)}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t('map.zoomOut', lang)}
        ><span aria-hidden>－</span></button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t(expanded ? 'map.collapse' : 'map.expand', lang)}
          title={t(expanded ? 'map.collapse' : 'map.expand', lang)}
        ><span aria-hidden>{expanded ? '⇱' : '⇲'}</span></button>
      </div>
      {/* v0.61.33 — Phase G floating toggle row + "⋯/⋮" overflow dropdown. */}
      <MapControls
        layers={overlayLayers || {}}
        onToggleLayer={(key) => onOverlayChange?.({
          ...(overlayLayers || {}), [key]: !(overlayLayers || {})[key]
        })}
        rowToggles={rowToggles}
        menuToggles={menuToggles}
        menuLabel={t('map.more', lang)}
        colourToggle={{
          on: overlayLayers?.colour !== false,
          label: t(overlayLayers?.colour !== false ? 'layer.colour.on' : 'layer.colour.off', lang),
          onToggle: () => onOverlayChange?.({ ...(overlayLayers || {}), colour: !(overlayLayers || {}).colour })
        }}
      />
      {/* v0.61.16 — Overview toggle, bottom-right. Frames the whole
          network; "Back" restores the prior focused viewport. Greyed
          when there is no focused line / station to toggle from.
          v0.62.629 — z-[36]: the station carousel floated over the map's
          bottom edge, covering this control when a focused line enabled it
          (Codex P2). v0.62.630 — the carousel is now a FIXED sibling at
          z-[38] (so cards survive the map's expand overlay), so this button
          goes to z-[39] to stay above it and clickable in the normal state.
          When the map is EXPANDED the panel becomes its own z-[35] overlay
          and this button rides inside it. */}
      <button
        type="button"
        onClick={toggleOverview}
        disabled={overviewDisabled}
        className="absolute bottom-3 right-2 px-2.5 py-1 rounded-full bg-white text-gray-900 border border-gray-300 shadow-md text-[11px] font-semibold active:scale-95 z-[39] disabled:opacity-40 disabled:cursor-default"
        aria-label={t(overview ? 'mrt.backToView' : 'mrt.overview', lang)}
      >{t(overview ? 'mrt.backToView' : 'mrt.overview', lang)}</button>
      {stations && (
        <div className="text-[10px] text-tg-hint px-2 py-1.5">
          {tn('mrt.counts', lang, { ops: opsCount, future: futureCount })}
        </div>
      )}
      {/* v0.62.270 — 🔭 zoom readout removed; the live zoom now shows on the
          Reset button in the top-left nav cluster. */}
    </div>
  );
}
