// web/hawker/src/components/HawkerMapPanel.jsx — v0.60.41
//
// Embedded multi-pin Google Map for the hawker TMA. Mirrors the
// cuisine TMA's MapPanel.jsx (web/cuisine/src/v2/components/MapPanel.jsx)
// with the venue-specific bits stripped — hawker centres are a
// deterministic 123-row dataset with no ranking, no enrichment,
// no focused-card sync. Just pins on a map per active region.
//
// Loading: fetches /maps-key, injects the Maps JS script with the
// marker library, calls __giaMapsReady on load. Same pattern + same
// global as the cuisine TMA so the script loads once across both
// TMAs when a user opens both in succession.
//
// Pins: AdvancedMarkerElement with a custom tiny-dot DOM node
// (v0.60.224). Gold for the 16 `isNew` entries in
// data/list-of-hawker-centres.md, red for established centres.
//
// InfoWindow: tap a pin → name + address + "Open on Google Maps ↗"
// link to c.mapsUrl. No travel time, no rating, no footfall —
// the hawker centre dataset doesn't carry them.
//
// Bounds: fitBounds(markers, 60) on every region change. When the
// active region has zero geocoded centres (i.e. before
// data/hawker-coords.json is populated by scripts/fetch-hawker-coords.js),
// the panel renders a "coordinates not yet loaded" placeholder.

import React, { useEffect, useRef, useState } from 'react';
import { openLink } from '../tg.js';
import { t, tn, useLocale } from '../i18n.js';
import { hawkerNameLocal } from '../../../_shared/lib/hawker-names-i18n.js';
import { createOverlayController, infoCard, infoPalette, ensureGreyscaleStyle, codeHex } from '../lib/mapOverlays.js';
import { activeClosure, CLOSURE_PIN_COLOR } from '../closure.js';
import { createRingLayer } from '../../../_shared/lib/distance-rings.js';
import { createInspectLayer, loadAllHawkerCentres } from '../../../_shared/lib/temp-pin.js';
import { TAP_ZOOM_WIDE, TAP_ZOOM_PHONE, TAP_PAUSE_MS, BLINK_MS } from '../../../_shared/lib/map-interaction.js';
import MapControls from '../../../_shared/components/MapControls.jsx';

const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };
const SG_DEFAULT_ZOOM = 12;   // v0.62.132 — default 11->12

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// v0.62.559 — safe for a single-quoted JS string embedded in a double-quoted
// inline onclick attribute (JS-escape the quote/backslash, then HTML-escape so
// the browser decodes back to valid JS before running it).
function jsStr(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\r?\n/g, ' ');
}

// v0.60.227 — operator: the v0.60.224 13px dots were too tiny and
// their colour didn't read against the map. New centres carry a "NEW"
// badge so they pop; the 🆕 distinction still surfaces in the
// InfoWindow too.
// v0.60.229 — operator: pins reduced 25px → 18px to match the Cuisine
// TMA dot size. The "NEW" badge is absolutely positioned off the
// marker's top edge, so it re-anchors at any pin size.
// v0.60.233 — operator: pins 18px → 17px. New-centre colour changed
// gold → navy (#1e3a8a); the operator is red/green colour-blind, so
// navy reads cleanly against the red "established" pin.
// v0.61.91 — operator: the centre pin is now a numbered droplet — a
// 26 px teardrop with the sharp corner pointing down at the coordinate
// and the centre's 1-based list rank in a counter-rotated inner span.
// The established-red / new-navy colour split + the "NEW" badge are
// kept; the badge rides on a non-rotated wrapper so it stays upright.
// v0.62.553 — operator: a centre with Michelin Bib Gourmand stall(s) takes the
// Cuisine TMA's macaron-red pin (#C6282D). Because the operator is red/green
// colour-blind (the established red / navy-new split exists for that reason), the
// Bib pin ALSO carries a small ✳️ marker so it's distinguishable without relying
// on hue — matching the app's CVD-safe convention.
const PIN_BIB_RED = '#C6282D';
// v0.62.596 — operator: a centre currently CLOSED (cleaning / renovation /
// redevelopment) recolours its pin to the tab's background colour and shows a
// "CLOSE" badge above the pin (like the "NEW" badge). closureKind overrides the
// established-red / new-navy / Bib-red colour while the closure is active.
function hawkerPinNode(isNew, number, hasBib, closureKind) {
  const size = 26;
  const closeColor = closureKind ? CLOSURE_PIN_COLOR[closureKind] : null;
  const wrap = document.createElement('div');
  wrap.style.cssText =
    `position:relative;width:${size}px;height:${size}px;cursor:pointer;`;
  const el = document.createElement('div');
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;' +
    `width:${size}px;height:${size}px;` +
    'border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
    'border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.45);' +
    `background:${closeColor || (hasBib ? PIN_BIB_RED : (isNew ? '#1e3a8a' : '#e53935'))};`;
  const inner = document.createElement('span');
  inner.style.cssText =
    'transform:rotate(45deg);color:#fff;font-weight:700;' +
    'font-size:13px;line-height:1;';
  if (number != null) inner.textContent = String(number);
  el.appendChild(inner);
  wrap.appendChild(el);
  if (hasBib) {
    // ✳️ marker at the top-right so the Bib pin is not colour-only (CVD-safe).
    const star = document.createElement('div');
    star.textContent = '✳️';
    star.style.cssText =
      'position:absolute;top:-7px;right:-7px;font-size:12px;line-height:1;'
      + 'filter:drop-shadow(0 1px 1px rgba(0,0,0,0.55));';
    wrap.appendChild(star);
  }
  // v0.62.596 — a "CLOSE" badge (closure colour) wins over "NEW" when the centre is
  // currently closed; otherwise the existing navy "NEW" badge for new centres.
  if (closeColor || isNew) {
    const badge = document.createElement('div');
    badge.textContent = closeColor ? 'CLOSE' : 'NEW';
    badge.style.cssText =
      'position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);' +
      `background:${closeColor || '#1e3a8a'};color:#fff;font-size:9px;font-weight:700;line-height:1;` +
      'letter-spacing:0.5px;padding:3px 5px;border-radius:4px;white-space:nowrap;' +
      'border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.4);';
    wrap.appendChild(badge);
  }
  return wrap;
}

export default function HawkerMapPanel({ centres, region, overlayLayers, onOverlayChange = null, fill = false, expanded: controlledExpanded = null, onToggleExpand = null, onCentreTap = null }) {
  const lang = useLocale();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  // v0.62.556 — centre markers keyed by name so a card tap (in the list/carousel)
  // can trigger the same behaviour as tapping the pin (__giaHawkerFocusCentre).
  const markersByNameRef = useRef({});
  const infoWindowRef = useRef(null);
  // v0.62.557 — latest onCentreTap prop (pin tap → highlight the matching card),
  // read from a ref so the marker-bound activateCentre never captures a stale one.
  const onCentreTapRef = useRef(onCentreTap);
  useEffect(() => { onCentreTapRef.current = onCentreTap; }, [onCentreTap]);
  // v0.61.0 — parks / attractions / taxi-stop overlay layers.
  const overlayControllerRef = useRef(null);
  // v0.62.537 — distance-ring overlay (🚶 750 m walkable + 🚆 2-MRT-stops rings),
  // centred on the CHOSEN (tapped) hawker centre; cleared on tap-out.
  const ringLayerRef = useRef(null);
  // v0.62.689 — station-pick INSPECTION overlay: one temporary amber pin + the
  // nearest 3 hawker centres. Deliberately separate from ringLayerRef's owner —
  // it is never the search anchor and never changes which centres are listed.
  const inspectLayerRef = useRef(null);
  const overlayLayersRef = useRef(overlayLayers);
  useEffect(() => { overlayLayersRef.current = overlayLayers; }, [overlayLayers]);
  const [isTablet, setIsTablet] = useState(false);
  // v0.62.689 — the inspection globals are registered once (deps []), so they
  // must read the live breakpoint from a ref, not the captured state value.
  const isTabletRef = useRef(false);
  useEffect(() => { isTabletRef.current = isTablet; }, [isTablet]);
  const [mapsKeyState, setMapsKeyState] = useState('loading');   // loading | ready | error | nokey
  // v0.63.0 — expand toggle: grows the map to ~90vh in place.
  // v0.62.550 — operator (point 4a): the portrait-tablet layout OWNS the expand
  // state in App (tapping expand switches the whole layout to the carousel), so
  // the button is CONTROLLED when onToggleExpand is passed; elsewhere (phone) it
  // stays local and grows the map in place.
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = controlledExpanded != null ? controlledExpanded : localExpanded;
  // v0.62.627 — operator ("where is the expand button"): in the LANDSCAPE
  // full-bleed carousel the ⇲ button was greyed out and did nothing (fill + no
  // onToggleExpand). Give it a real action there: a full-viewport OVERLAY (the
  // same fix the Transport map got in v0.62.626), tracked in a separate local
  // state so it doesn't disturb App's layout-switch `mapExpanded` machinery.
  const [overlayFull, setOverlayFull] = useState(false);
  const canOverlay = fill && !onToggleExpand;      // the previously-greyed case
  const toggleExpand = () => {
    if (onToggleExpand) return onToggleExpand();     // portrait-tablet: switch layout
    if (canOverlay) return setOverlayFull((v) => !v); // landscape fill: fullscreen overlay
    return setLocalExpanded((e) => !e);              // phone: grow in place
  };
  const expandActive = canOverlay ? overlayFull : expanded;
  const expandedOverlay = canOverlay && overlayFull;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps?.event) return undefined;
    const c = map.getCenter?.();
    const id = setTimeout(() => {
      try { window.google.maps.event.trigger(map, 'resize'); if (c) map.setCenter(c); } catch { /* noop */ }
    }, 60);
    return () => clearTimeout(id);
  }, [overlayFull, expanded]);
  // v0.61.89 — troubleshooting: live Google Maps zoom level, surfaced in a tiny
  // bottom-right readout. Updated on every `zoom_changed`.
  const [zoomLevel, setZoomLevel] = useState(null);

  // Stable copy for the global InfoWindow CTA closure.
  const centresRef = useRef([]);
  useEffect(() => { centresRef.current = centres || []; }, [centres]);

  // v0.61.10 — per-panel cache of /api/hawker/centre-transit results,
  // keyed by centre name, so the map-pin InfoWindow fetches transit once.
  const transitCacheRef = useRef({});
  // v0.61.310 — capture the registered Map ID from /maps-key so the
  // Map constructor uses the operator's MAP_ID env var when set
  // (custom vector styling + branding). Mirrors Transport TMA's
  // v0.60.87 + Cuisine TMA's v0.61.310 pattern. Falls back to Google's
  // public DEMO_MAP_ID only when MAP_ID is unset or /maps-key returns
  // the 'GIA_SANCTUARY' placeholder — required because
  // AdvancedMarkerElement refuses to render without a registered mapId.
  const mapIdRef = useRef('DEMO_MAP_ID');
  // v0.62.115 — operator: a hawker PIN tap zooms the map IN to 17.
  // v0.62.560 — operator: closing the card must NOT adjust the zoom — the
  // return-to-prior-zoom on close is removed (was prevFocusZoomRef).

  // One-time tablet media-query — same threshold as cuisine MapPanel.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const tabletMql = window.matchMedia('(min-width: 700px)');
    setIsTablet(tabletMql.matches);
    const onChange = (e) => setIsTablet(e.matches);
    tabletMql.addEventListener?.('change', onChange);
    return () => tabletMql.removeEventListener?.('change', onChange);
  }, []);

  // Load Maps JS once. Reuses __giaMapsReady so concurrent opens of
  // cuisine + hawker TMAs don't double-inject.
  useEffect(() => {
    let cancelled = false;
    if (window.google?.maps) { initMap(); return; }
    fetch('/maps-key').then((r) => r.json()).then((d) => {
      if (cancelled) return;
      if (!d?.key) { setMapsKeyState('nokey'); return; }
      // v0.61.310 — override the default 'DEMO_MAP_ID' when the server
      // signals an env-sourced Map ID; covers the prod case where the
      // operator has set MAP_ID on Railway.
      if (d.mapIdSource === 'env:MAP_ID' && d.mapId) {
        mapIdRef.current = d.mapId;
      }
      const existing = document.querySelector('script[data-gmaps]');
      if (existing) {
        // Another TMA already loaded the SDK; wait for ready.
        if (window.google?.maps) initMap();
        else window.__giaMapsReady = () => { if (!cancelled) initMap(); };
        return;
      }
      const tag = document.createElement('script');
      tag.src = `https://maps.googleapis.com/maps/api/js?key=${d.key}&libraries=marker&v=quarterly&loading=async&callback=__giaMapsReady`;
      tag.async = true;
      tag.dataset.gmaps = '1';
      window.__giaMapsReady = () => { if (!cancelled) initMap(); };
      document.head.appendChild(tag);
    }).catch(() => {
      if (!cancelled) setMapsKeyState('error');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global handler the InfoWindow CTA invokes by name to deep-link
  // the centre's Google Maps URL. Looks the centre up via centresRef
  // so the closure stays current across re-renders.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.__giaHawkerOpenMap = (key) => {
      const c = (centresRef.current || []).find((x) => `${x.name}|${x.postal || ''}` === key);
      if (c?.mapsUrl) openLink(c.mapsUrl);
    };
    // v0.62.551 — operator (urgent): a pill tap must SCROLL the map into view
    // first — in the phone/stacked layout the map sits ABOVE the card list, so a
    // pan/highlight was happening off-screen ("the bus stop didn't appear"). No-op
    // when the map is already on-screen (the fixed tablet layouts).
    const revealMap = () => {
      try { containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch { /* older webview */ }
    };
    // v0.62.108 — operator: the hawker card's 🚉 station link jumps to that
    // station ON THIS map + opens its info (stay in the Hawker TMA — was an
    // out-of-TMA Train-app deep link).
    window.__giaHawkerFocusStation = (code) => {
      revealMap();
      overlayControllerRef.current?.focusStation?.(code);
    };
    // v0.62.551 — operator (urgent): tapping a BUS-STOP pill in a card must make
    // the bus stop APPEAR — drop a labelled bus-stop pin (+ live-arrivals bubble),
    // pan, and flash. (The v0.62.549 halo-only highlight left nothing visible when
    // the Bus Stop overlay was off, which is the default.)
    window.__giaHawkerShowBusStop = (code, lat, lng, description) => {
      revealMap();
      overlayControllerRef.current?.showBusStop?.(String(code), Number(lat), Number(lng), description);
    };
    // v0.62.549 — retained for back-compat: pan + pulse a 3 s halo at a point.
    window.__giaHawkerHighlight = (lat, lng) => {
      revealMap();
      overlayControllerRef.current?.highlightLoc?.(Number(lat), Number(lng), 3000);
    };
    // v0.62.556 — operator: tapping a centre CARD highlights the centre pin — fire
    // the marker's own click listener (bound fresh in syncMarkers) so it runs the
    // identical flow as tapping the pin (open InfoWindow, zoom, transit, rings).
    // v0.62.689 — operator: "when type in the road or train. you should place a
    // temporary location (only one per each time) and then ring it and show
    // nearby train and hawker centre … instead a temporary pin". Station picks
    // only (no geocoding), nearest 3 centres, INSPECTION ONLY — the region tabs,
    // the carousel and the card list are all untouched by this.
    window.__giaHawkerInspect = (lat, lng, label) => {
      const la = Number(lat); const ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
      revealMap();
      // Same camera choreography as a centre tap, minus the InfoWindow: the
      // temp pin IS the card here.
      infoWindowRef.current?.close();
      overlayControllerRef.current?.closeInfo?.();
      mapRef.current?.panTo({ lat: la, lng: ln });
      mapRef.current?.setZoom(isTabletRef.current ? TAP_ZOOM_WIDE : TAP_ZOOM_PHONE);
      ringLayerRef.current?.draw({ lat: la, lng: ln });
      overlayControllerRef.current?.showVenueTransit?.(la, ln);
      loadAllHawkerCentres().then((centres) => {
        inspectLayerRef.current?.show({ lat: la, lng: ln, label: label || '', centres, count: 3 });
      });
    };
    // v0.62.698 — operator: "when I click the zone again, it should zoom out to
    // 12 in iPhone and 13 in Desktop/iPad to show the zone selected." Re-tapping
    // the ACTIVE zone pill was a no-op — the handler called setActiveRegion with
    // the value it already had, so React bailed and nothing moved. This gives
    // that tap a job: frame the whole zone again at a fixed zoom, which is the
    // "I've wandered off, show me the zone" gesture. Uses the ACTIVE region's
    // centres (centresRef follows the `centres` prop), so it frames the zone the
    // user is actually looking at.
    window.__giaHawkerFitZone = (zoom) => {
      const map = mapRef.current;
      if (!map || !window.google?.maps) return;
      revealMap();
      const pts = (centresRef.current || []).filter(
        (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)
      );
      if (!pts.length) return;
      const b = new window.google.maps.LatLngBounds();
      for (const c of pts) b.extend({ lat: c.lat, lng: c.lng });
      // panTo + setZoom rather than fitBounds: fitBounds would pick its own zoom
      // from the bounds, and the operator asked for a SPECIFIC one per device.
      map.panTo(b.getCenter());
      map.setZoom(Number.isFinite(Number(zoom)) ? Number(zoom) : 12);
    };
    window.__giaHawkerFocusCentre = (name) => {
      const entry = markersByNameRef.current[name];
      if (!entry || !entry.marker) return;
      revealMap();
      window.google?.maps?.event?.trigger(entry.marker, 'click');
    };
    return () => {
      try { delete window.__giaHawkerOpenMap; } catch { window.__giaHawkerOpenMap = undefined; }
      try { delete window.__giaHawkerFocusStation; } catch { window.__giaHawkerFocusStation = undefined; }
      try { delete window.__giaHawkerShowBusStop; } catch { window.__giaHawkerShowBusStop = undefined; }
      try { delete window.__giaHawkerHighlight; } catch { window.__giaHawkerHighlight = undefined; }
      try { delete window.__giaHawkerFocusCentre; } catch { window.__giaHawkerFocusCentre = undefined; }
      try { delete window.__giaHawkerInspect; } catch { window.__giaHawkerInspect = undefined; }
      try { delete window.__giaHawkerFitZone; } catch { window.__giaHawkerFitZone = undefined; }
    };
  }, []);

  function initMap() {
    if (!containerRef.current || mapRef.current) return;
    ensureGreyscaleStyle();
    const { Map } = window.google.maps;
    mapRef.current = new Map(containerRef.current, {
      center: SG_CENTROID,
      zoom: SG_DEFAULT_ZOOM,
      // v0.60.47 — mapId required by AdvancedMarkerElement since
      // 2024. Without it some browser/network combos throw the
      // "This page can't load Google Maps correctly" auth dialog
      // instead of falling back to legacy markers.
      // v0.61.310 — mapIdRef.current = operator's MAP_ID env var when
      // /maps-key returned `mapIdSource: 'env:MAP_ID'`; otherwise the
      // 'DEMO_MAP_ID' fallback. Same pattern as Cuisine MapPanel +
      // Transport MrtMapPanel.
      mapId: mapIdRef.current,
      disableDefaultUI: true,
      zoomControl: false,
      // v0.61.18 — suppress Google's native POI/transit info cards so a
      // station tap hits our overlay marker, not Google's own popup.
      clickableIcons: false,
      // v0.61.89 — streamline: all three TMA maps share one options block.
      // v0.62.134 — operator (17-06 '26): remove Google's native camera
      // control (the +/pan-arrows/tilt cluster) from every TMA — it duplicated
      // the custom nav cluster (top-right) + ↹ centre-map button (v0.62.133).
      // Prior (superseded): cameraControl:true @ LEFT_BOTTOM, kept since v0.61.89.
      cameraControl: false,
      keyboardShortcuts: true,
      // v0.62.102 — operator: the embedded map hung when zoomed out far (world
      // view). v0.62.294 — z5 still hung; raise the floor to minZoom 7 … maxZoom 20.
      minZoom: 7, maxZoom: 20,
      gestureHandling: 'greedy'
    });
    setMapsKeyState('ready');
    overlayControllerRef.current = createOverlayController(mapRef.current, window.google.maps, { tma: 'hawker' });
    // v0.62.537 — ring layer bound to this map; a hawker pin tap draws, tap-out clears.
    ringLayerRef.current = createRingLayer(mapRef.current, window.google.maps);
    // v0.62.689 — the temporary station pin + its nearest-3 centre pills.
    inspectLayerRef.current = createInspectLayer(mapRef.current, window.google.maps);
    applyOverlayLayers(overlayLayersRef.current);
    // v0.64.0 — feed the map-centre anchor so radius-clipped overlay
    // layers re-filter on every pan/zoom.
    mapRef.current.addListener('idle', () => {
      const c = mapRef.current?.getCenter?.();
      if (c) overlayControllerRef.current?.setAnchor?.(c.lat(), c.lng());
    });
    // v0.61.22 — close any open popup on a tap of the empty map, and
    // expose a global the in-card ✕ button calls.
    const closeInfo = () => {
      infoWindowRef.current?.close();
      overlayControllerRef.current?.closeInfo?.();
      ringLayerRef.current?.clear();   // v0.62.537 — drop the distance rings on tap-out
      inspectLayerRef.current?.clear(); // v0.62.689 — and the temporary station pin with them
      // v0.62.560 — operator: do NOT adjust the zoom on close (the pre-focus zoom
      // restore is removed) — leave the map wherever the user left it.
    };
    window.__giaMapInfoClose = closeInfo;
    mapRef.current.addListener('click', closeInfo);
    // v0.61.89 — troubleshooting: seed + track the bottom-right zoom-level readout.
    setZoomLevel(mapRef.current.getZoom());
    mapRef.current.addListener('zoom_changed', () => {
      setZoomLevel(mapRef.current?.getZoom?.());
    });
    syncMarkers();
  }

  // Push the current layer-toggle state into the overlay controller.
  function applyOverlayLayers(layers) {
    const ctrl = overlayControllerRef.current;
    if (!ctrl || !layers) return;
    ctrl.setLayer('parks', !!layers.parks);
    ctrl.setLayer('attractions', !!layers.attractions);
    ctrl.setLayer('taxis', !!layers.taxis);
    ctrl.setLayer('carpark', !!layers.carpark);
    ctrl.setLayer('busstop', !!layers.busstop);
    ctrl.setLayer('exits', !!layers.exits);
    ctrl.setLayer('clinics', !!layers.clinics);
    ctrl.setLayer('hospitals', !!layers.hospitals);
    ctrl.setLayer('police', !!layers.police);
    ctrl.setLayer('train', !!layers.train);
    // v0.61.95 — monochrome drives the coloured train-line SVG overlay.
    ctrl.setMonochrome(layers.colour === false);
  }

  useEffect(() => { applyOverlayLayers(overlayLayers); }, [overlayLayers]); // eslint-disable-line
  useEffect(() => () => {
    overlayControllerRef.current?.destroy?.();
    ringLayerRef.current?.destroy?.();
    inspectLayerRef.current?.destroy?.();
  }, []);

  // Re-sync markers whenever the centres array or region changes.
  useEffect(() => { syncMarkers(); }, [centres, region]); // eslint-disable-line

  // v0.61.10 — hawker map-pin InfoWindow template: name, operating
  // status, address, 2 nearby bus stops, nearest station (code + name
  // + line), and that station's exits. The transit half is null until
  // /api/hawker/centre-transit resolves, then the bubble refreshes.
  function buildInfoHtml(c, key, transit) {
    // v0.61.22 — themed rounded card (infoCard) with an in-card ✕;
    // secondary text uses the theme palette so nothing washes out.
    const p = infoPalette();
    let h = `<div style="font-weight:600;font-size:13px;">${escapeHtml(c.displayName || c.name)}${c.isNew ? ' 🆕' : ''}</div>`;
    // v0.62.829 — O-344, same second-line shape as the card. escapeHtml because this is
    // an innerHTML info window and the string is authored data, not a literal.
    const hLocal = hawkerNameLocal(c.displayName || c.name, lang);
    if (hLocal) h += `<div style="font-size:12px;opacity:.7;">(${escapeHtml(hLocal)})</div>`;
    if (c.status) {
      h += `<div style="color:${p.sub};margin-top:2px;">🕒 ${escapeHtml(c.status)}</div>`;
    } else if (Number.isFinite(c.stalls) && c.stalls > 0) {
      h += `<div style="color:${p.sub};margin-top:2px;">${escapeHtml(tn('stalls.count', lang, { n: c.stalls }))}</div>`;
    }
    if (c.address) {
      h += `<div style="color:${p.sub};margin-top:3px;">📇 ${escapeHtml(c.address)}</div>`;
    }
    // v0.62.553 — Michelin Bib Gourmand stalls in this centre (house style
    // "✳️ Bib Gourmand · <stall>"). Bold so it reads as the notable signal.
    // v0.62.558 — operator: each stall is a Google-Maps hyperlink (parity with
    // the list card + the bus-stop links below).
    if (Array.isArray(c.bibStalls) && c.bibStalls.length) {
      const links = c.bibStalls.map((s) => {
        const q = encodeURIComponent(`${s} ${c.displayName || c.name} Singapore`);
        return `<a href="https://maps.google.com/?q=${q}" target="_blank" rel="noopener" style="color:${p.link};">${escapeHtml(s)}</a>`;
      }).join(', ');
      h += `<div style="color:${p.sub};margin-top:3px;">✳️ <b>Bib Gourmand</b> · ${links}</div>`;
    }
    // v0.62.107 — operator #4: nearest 3 bus stops + 2 stations; the station
    // codes deep-link the Train Mini App (not Google Maps).
    // v0.62.559 — operator: tapping a bus stop here should SHOW it on THIS embedded
    // map (drop the labelled bus pin + pan + flash), not open external Google Maps —
    // same as the card's bus-stop pill (__giaHawkerShowBusStop). (Was an external
    // maps.google.com link.)
    const bus = transit && Array.isArray(transit.busStops) ? transit.busStops : [];
    for (const b of bus.slice(0, 3)) {
      if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) continue;
      h += `<div onclick="window.__giaHawkerShowBusStop&&window.__giaHawkerShowBusStop('${jsStr(b.code || '')}',${b.lat},${b.lng},'${jsStr(b.description || '')}');return false;" style="margin-top:2px;cursor:pointer;color:${p.link};">🚌 ${escapeHtml(b.code || '')} ${escapeHtml(b.description || '')}</div>`;
    }
    const stations = (transit && Array.isArray(transit.stations) && transit.stations.length)
      ? transit.stations
      : (transit && transit.station ? [transit.station] : []);
    for (const st of stations.slice(0, 2)) {
      if (!st || !st.name) continue;
      // v0.62.282 — operator: match the Cuisine card — line-coloured station code
      // PILLS (no underline) and drop the "· <line>" operator suffix. Tapping the
      // row still focuses the station on the map (__giaHawkerFocusStation).
      const codeArr = Array.isArray(st.codes) ? st.codes : [];
      const first = codeArr[0] || '';
      const pills = codeArr.map((cd) => `<span style="display:inline-block;background:${codeHex(cd)};color:#fff;font-weight:700;white-space:nowrap;border-radius:5px;padding:1px 6px;font-size:11px;line-height:1.4;">${escapeHtml(cd)}</span>`).join('');
      h += `<div onclick="window.__giaHawkerFocusStation&&window.__giaHawkerFocusStation('${escapeHtml(first)}');return false;" style="margin-top:3px;cursor:pointer;display:flex;align-items:center;gap:5px;flex-wrap:wrap;"><span aria-hidden>🚉</span>${pills}<span style="color:${p.sub};">${escapeHtml(st.name)}</span></div>`;
    }
    // v0.61.31 — standard trailing "Google Map ↗" hyperlink (every TMA).
    h += `<div style="margin-top:4px;"><a href="#" onclick="window.__giaHawkerOpenMap('${escapeHtml(key)}'); return false;" style="color:${p.link};text-decoration:underline;cursor:pointer;">Google Map ↗</a></div>`;
    return infoCard(h);
  }

  // v0.62.556 — the on-tap behaviour for a centre (open the InfoWindow, zoom to
  // 17, draw the transit + rings, lazy-fetch transit). Extracted from the marker
  // click listener so a CARD tap (__giaHawkerFocusCentre) triggers the identical
  // flow — "tapping the card highlights the centre pin", operator.
  function activateCentre(c, marker, key) {
    if (!infoWindowRef.current) return;
    const cached = transitCacheRef.current[c.name];
    infoWindowRef.current.setContent(buildInfoHtml(c, key, cached || null));
    // v0.62.589 — UNIFIED tap flow, shared verbatim with the Cuisine TMA (operator
    // spec): pan → zoom (phone TAP_ZOOM_PHONE, tablet TAP_ZOOM_WIDE) → PAUSE
    // TAP_PAUSE_MS (camera settles) → open the InfoWindow (card-from-pin) + blink
    // the pin (BLINK_MS = 0.5s × 5). The card ring (onCentreTap), transit pins and
    // distance rings fire immediately; only the popup + blink wait for the pause.
    // (Was: opened the popup first, then hard-zoomed 17 everywhere + a 3 s halo.)
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      const wide = typeof window !== 'undefined'
        && window.matchMedia?.('(min-width: 700px)')?.matches;
      mapRef.current?.panTo({ lat: c.lat, lng: c.lng });
      // v0.62.604 — operator: on a phone, zoom one step closer than the shared
      // TAP_ZOOM_PHONE (15 → 16) so the nearby bus stops are visible on tap. The
      // shared constant is left as-is (Cuisine keeps 15); Hawker leans in one step.
      mapRef.current?.setZoom(wide ? TAP_ZOOM_WIDE : Math.max(TAP_ZOOM_PHONE, 16));
      // v0.62.109 — draw the nearest 3 bus stops + 2 stations + the walk/2-stop rings.
      overlayControllerRef.current?.showVenueTransit?.(c.lat, c.lng);
      ringLayerRef.current?.draw({ lat: c.lat, lng: c.lng });
      setTimeout(() => {
        infoWindowRef.current?.open(mapRef.current, marker);
        overlayControllerRef.current?.flashPin?.(c.lat, c.lng, BLINK_MS);
      }, TAP_PAUSE_MS);
    } else {
      infoWindowRef.current.open(mapRef.current, marker);   // no coords → open in place
    }
    // v0.62.557 — operator "vice versa": tapping the pin highlights the matching
    // card in the list (App sets the card's active ring). Fires immediately.
    onCentreTapRef.current?.(c.name);
    // v0.61.10 — lazy-fetch nearest station + bus stops, then refresh the bubble.
    if (!cached && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      fetch(`/api/hawker/centre-transit?lat=${c.lat}&lng=${c.lng}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          transitCacheRef.current[c.name] = d;
          infoWindowRef.current?.setContent(buildInfoHtml(c, key, d));
        })
        .catch(() => { /* base content stays */ });
    }
  }

  // v0.61.93 — auto-fit only frames on the first data load; later loads
  // keep the user's zoom (operator: don't auto-zoom-out).
  const firstFitRef = useRef(true);
  function syncMarkers() {
    if (!mapRef.current || !window.google?.maps) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;
    // Tear down old markers + InfoWindow content.
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    markersByNameRef.current = {};
    if (!infoWindowRef.current && window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow({
        disableAutoPan: false,
        headerDisabled: true,
        pixelOffset: new window.google.maps.Size(0, -10)
      });
    }

    const bounds = new window.google.maps.LatLngBounds();
    let plotted = 0;
    let centreNo = 0;   // v0.61.91 — 1-based rank for the droplet number
    for (const c of (centres || [])) {
      centreNo += 1;    // counts every centre so numbers match the list
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: c.lat, lng: c.lng },
        title: c.name,
        content: hawkerPinNode(c.isNew, centreNo, Array.isArray(c.bibStalls) && c.bibStalls.length > 0, activeClosure(c.closures)?.kind || null),
        // v0.61.91 — centre droplets sit above every overlay layer
        // (train stations / pins) so they are never occluded.
        zIndex: 1000,
        gmpClickable: true
      });
      const key = `${c.name}|${c.postal || ''}`;
      marker.addListener('click', () => activateCentre(c, marker, key));
      markersByNameRef.current[c.name] = { c, marker, key };
      markersRef.current.push(marker);
      bounds.extend({ lat: c.lat, lng: c.lng });
      plotted++;
    }

    if (plotted > 0) {
      // v0.61.93 — operator: only the first data load auto-frames; a
      // later region switch keeps the user's zoom (recenter only).
      if (firstFitRef.current) {
        firstFitRef.current = false;
        // v0.61.20 — cap zoom only for the auto-fit, then release it
        // once the fit settles so the user can zoom in past level 16.
        mapRef.current.setOptions({ maxZoom: 16 });
        mapRef.current.fitBounds(bounds, 60);
        window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
          // v0.62.102 — release the fit-only 16 cap back to the standing 20 gate
          // (was `null`, which removed the cap entirely).
          mapRef.current?.setOptions({ maxZoom: 20 });
        });
      } else {
        mapRef.current.panTo(bounds.getCenter());
      }
    } else if (firstFitRef.current) {
      // No coords for this region — recenter on SG (first load only).
      mapRef.current.setCenter(SG_CENTROID);
      mapRef.current.setZoom(SG_DEFAULT_ZOOM);
    }
  }

  // Count of centres in this region with coords vs total — drives the
  // placeholder messaging when the JSON hasn't been bootstrapped yet.
  const total = (centres || []).length;
  const withCoords = (centres || []).filter(
    (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)
  ).length;
  const showPlaceholder = total > 0 && withCoords === 0;

  // v0.61.36 — in-map control config (shared shape across the 3 TMAs).
  // Row 1 = always-visible toggle pills; the "⋯/⋮" dropdown = the
  // checkbox layer list. Bus Stop / 24 hours render disabled (no data
  // yet); Colour toggles the greyscale map filter.
  // v0.61.51 — Train Line promoted from the dropdown into the row;
  // Attractions demoted into the dropdown above Park.
  const rowToggles = [
    { key: 'train',       icon: '🚉', label: t('layer.train', lang) },
    { key: 'carpark',     icon: '🅿️', label: t('layer.carpark', lang) },
    { key: 'busstop',     icon: '🚌', label: t('layer.busstop', lang) }
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

  return (
    /* v0.62.544 — `fill`: full-bleed background mode for the tablet/desktop
       layout (absolute inset-0 fills its relative parent); otherwise the framed,
       fixed-height inline card. */
    <div className={expandedOverlay
      // v0.62.627 — z-[35]: the bottom card carousel is `fixed … z-30` and paints
      // LATER in the DOM, so an equal-z overlay would sit BEHIND the cards (Codex
      // P2). Lift the expanded map above the carousel (z-30) while staying below
      // the footer dock (z-40) so the footer + its Map toggle stay usable.
      ? 'fixed inset-0 z-[35] overflow-hidden bg-tg-card'
      : (fill
        ? 'absolute inset-0 overflow-hidden bg-tg-card'
        : 'rounded-lg border border-tg-border bg-tg-card overflow-hidden relative')}>
      <div
        ref={containerRef}
        className={overlayLayers && overlayLayers.colour === false ? 'gia-greyscale-map' : undefined}
        style={fill
          ? { width: '100%', height: '100%' }
          : {
              width: '100%',
              height: expanded ? '90vh' : (isTablet ? 'min(560px, 55vh)' : 'min(420px, 50vh)'),
              minHeight: 240
            }}
        aria-label={t('map.aria', lang)}
      />
      {/* v0.63.1 — custom map-control row, top-right: zoom +/- and the
          expand toggle. v0.61.9 — horizontal row, smaller buttons.
          Theme-adaptive (tg-card / tg-text). */}
      {/* v0.61.51 — nav cluster shifted to top-12 so the quick-button
          row has clean horizontal space. v0.61.59 — the Colour-mode
          pill moved out of this cluster into the quick-toggle row
          (after Bus Stop); the cluster is now Reset / + / − / expand. */}
      {/* v0.62.550 — operator (point 4b): the standardised LEFT nav cluster
          (zoom readout/reset · ＋ · ↹ · － · ⇲) — same as the phone map. In the
          full-bleed (fill) carousel layout it drops below the top bar so all five
          buttons stay visible (they were clipped behind it). */}
      <div
        className={`absolute left-2 flex flex-col gap-1 z-10 ${fill ? '' : 'top-12'}`}
        style={fill ? { top: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 7.5rem)' } : undefined}>
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
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) + 1)}
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
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) - 1)}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t('map.zoomOut', lang)}
        ><span aria-hidden>－</span></button>
        <button
          type="button"
          onClick={toggleExpand}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t(expandActive ? 'map.collapse' : 'map.expand', lang)}
          title={t(expandActive ? 'map.collapse' : 'map.expand', lang)}
        ><span aria-hidden>{expandActive ? '⇱' : '⇲'}</span></button>
      </div>
      {/* v0.61.33 — Phase G floating toggle row + "⋯/⋮" overflow dropdown. */}
      <MapControls
        fill={fill}
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
      {/* v0.62.270 — 🔭 zoom readout removed; the live zoom now shows on the
          Reset button in the top-left nav cluster. */}
      {mapsKeyState === 'loading' && !showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-tg-card/90 text-xs text-tg-hint pointer-events-none">
          {t('map.loading', lang)}
        </div>
      )}
      {mapsKeyState === 'nokey' && (
        <div className="absolute inset-0 flex items-center justify-center bg-tg-card text-xs text-tg-hint p-3 text-center">
          {t('map.nokey', lang)}
        </div>
      )}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-tg-card/95 text-xs text-tg-hint p-4 text-center">
          {t('map.noCoords', lang)}
        </div>
      )}
    </div>
  );
}
