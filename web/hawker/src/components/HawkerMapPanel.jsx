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
import { createOverlayController, infoCard, infoPalette, ensureGreyscaleStyle } from '../lib/mapOverlays.js';
import MapControls from './MapControls.jsx';

const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };
const SG_DEFAULT_ZOOM = 11;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
function hawkerPinNode(isNew, number) {
  const size = 26;
  const wrap = document.createElement('div');
  wrap.style.cssText =
    `position:relative;width:${size}px;height:${size}px;cursor:pointer;`;
  const el = document.createElement('div');
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;' +
    `width:${size}px;height:${size}px;` +
    'border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
    'border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.45);' +
    `background:${isNew ? '#1e3a8a' : '#e53935'};`;
  const inner = document.createElement('span');
  inner.style.cssText =
    'transform:rotate(45deg);color:#fff;font-weight:700;' +
    'font-size:13px;line-height:1;';
  if (number != null) inner.textContent = String(number);
  el.appendChild(inner);
  wrap.appendChild(el);
  if (isNew) {
    const badge = document.createElement('div');
    badge.textContent = 'NEW';
    badge.style.cssText =
      'position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);' +
      'background:#1e3a8a;color:#fff;font-size:9px;font-weight:700;line-height:1;' +
      'letter-spacing:0.5px;padding:3px 5px;border-radius:4px;white-space:nowrap;' +
      'border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.4);';
    wrap.appendChild(badge);
  }
  return wrap;
}

export default function HawkerMapPanel({ centres, region, overlayLayers, onOverlayChange = null }) {
  const lang = useLocale();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  // v0.61.0 — parks / attractions / taxi-stop overlay layers.
  const overlayControllerRef = useRef(null);
  const overlayLayersRef = useRef(overlayLayers);
  useEffect(() => { overlayLayersRef.current = overlayLayers; }, [overlayLayers]);
  const [isTablet, setIsTablet] = useState(false);
  const [mapsKeyState, setMapsKeyState] = useState('loading');   // loading | ready | error | nokey
  // v0.63.0 — expand toggle: grows the map to ~90vh in place.
  const [expanded, setExpanded] = useState(false);
  // v0.61.89 — troubleshooting: live Google Maps zoom level, surfaced in a tiny
  // bottom-right readout. Updated on every `zoom_changed`.
  const [zoomLevel, setZoomLevel] = useState(null);

  // Stable copy for the global InfoWindow CTA closure.
  const centresRef = useRef([]);
  useEffect(() => { centresRef.current = centres || []; }, [centres]);

  // v0.61.10 — per-panel cache of /api/hawker/centre-transit results,
  // keyed by centre name, so the map-pin InfoWindow fetches transit once.
  const transitCacheRef = useRef({});

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
    return () => {
      try { delete window.__giaHawkerOpenMap; } catch { window.__giaHawkerOpenMap = undefined; }
    };
  }, []);

  function initMap() {
    if (!containerRef.current || mapRef.current) return;
    ensureGreyscaleStyle();
    const { Map } = window.google.maps;
    mapRef.current = new Map(containerRef.current, {
      center: SG_CENTROID,
      zoom: 11,
      // v0.60.47 — mapId required by AdvancedMarkerElement since
      // 2024. Without it some browser/network combos throw the
      // "This page can't load Google Maps correctly" auth dialog
      // instead of falling back to legacy markers. Mirrors the
      // value used in cuisine MapPanel.jsx.
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: true,
      zoomControl: false,
      // v0.61.18 — suppress Google's native POI/transit info cards so a
      // station tap hits our overlay marker, not Google's own popup.
      clickableIcons: false,
      // v0.61.89 — streamline: all three TMA maps share one options block: keep
      // Google's native camera control (pan/tilt/rotate) + keyboard
      // shortcuts on. The camera widget is pinned to LEFT_BOTTOM so it
      // clears the custom nav cluster (top-right) and the bottom-right
      // controls.
      cameraControl: true,
      cameraControlOptions: { position: window.google.maps.ControlPosition.LEFT_BOTTOM },
      keyboardShortcuts: true,
      gestureHandling: 'greedy'
    });
    setMapsKeyState('ready');
    overlayControllerRef.current = createOverlayController(mapRef.current, window.google.maps, { tma: 'hawker' });
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
  useEffect(() => () => { overlayControllerRef.current?.destroy?.(); }, []);

  // Re-sync markers whenever the centres array or region changes.
  useEffect(() => { syncMarkers(); }, [centres, region]); // eslint-disable-line

  // v0.61.10 — hawker map-pin InfoWindow template: name, operating
  // status, address, 2 nearby bus stops, nearest station (code + name
  // + line), and that station's exits. The transit half is null until
  // /api/hawker/centre-transit resolves, then the bubble refreshes.
  function buildInfoHtml(c, key, transit) {
    const gmaps = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    // v0.61.22 — themed rounded card (infoCard) with an in-card ✕;
    // secondary text uses the theme palette so nothing washes out.
    const p = infoPalette();
    let h = `<div style="font-weight:600;font-size:13px;">${escapeHtml(c.name)}${c.isNew ? ' 🆕' : ''}</div>`;
    if (c.status) {
      h += `<div style="color:${p.sub};margin-top:2px;">🕒 ${escapeHtml(c.status)}</div>`;
    } else if (Number.isFinite(c.stalls) && c.stalls > 0) {
      h += `<div style="color:${p.sub};margin-top:2px;">${escapeHtml(tn('stalls.count', lang, { n: c.stalls }))}</div>`;
    }
    if (c.address) {
      h += `<div style="color:${p.sub};margin-top:3px;">📇 ${escapeHtml(c.address)}</div>`;
    }
    const bus = transit && Array.isArray(transit.busStops) ? transit.busStops : [];
    for (const b of bus.slice(0, 2)) {
      if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) continue;
      h += `<div style="margin-top:2px;"><a href="${escapeHtml(gmaps(b.lat, b.lng))}" target="_blank" rel="noopener" style="color:${p.link};">🚌 ${escapeHtml(b.code || '')} ${escapeHtml(b.description || '')}</a></div>`;
    }
    const st = transit && transit.station;
    if (st && st.name && Number.isFinite(st.lat) && Number.isFinite(st.lng)) {
      const codes = Array.isArray(st.codes) ? st.codes.join('/') : '';
      const lines = Array.isArray(st.lines) && st.lines.length ? ` · ${st.lines.join('/')}` : '';
      h += `<div style="margin-top:2px;"><a href="${escapeHtml(gmaps(st.lat, st.lng))}" target="_blank" rel="noopener" style="color:${p.link};">🚉 ${escapeHtml(codes)} ${escapeHtml(st.name)}${escapeHtml(lines)}</a></div>`;
      const exits = Array.isArray(st.exits) ? st.exits.filter(Boolean) : [];
      if (exits.length) {
        h += `<div style="color:${p.sub};margin-top:2px;">${escapeHtml(exits.join(', '))}</div>`;
      }
    }
    // v0.61.31 — standard trailing "Google Map ↗" hyperlink (every TMA).
    h += `<div style="margin-top:4px;"><a href="#" onclick="window.__giaHawkerOpenMap('${escapeHtml(key)}'); return false;" style="color:${p.link};text-decoration:underline;cursor:pointer;">Google Map ↗</a></div>`;
    return infoCard(h);
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
        content: hawkerPinNode(c.isNew, centreNo),
        // v0.61.91 — centre droplets sit above every overlay layer
        // (train stations / pins) so they are never occluded.
        zIndex: 1000,
        gmpClickable: true
      });
      const key = `${c.name}|${c.postal || ''}`;
      marker.addListener('click', () => {
        if (!infoWindowRef.current) return;
        const cached = transitCacheRef.current[c.name];
        infoWindowRef.current.setContent(buildInfoHtml(c, key, cached || null));
        infoWindowRef.current.open(mapRef.current, marker);
        // v0.61.10 — lazy-fetch nearest station + bus stops, then
        // refresh the open bubble with the transit template.
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
      });
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
          mapRef.current?.setOptions({ maxZoom: null });
        });
      } else {
        mapRef.current.panTo(bounds.getCenter());
      }
    } else if (firstFitRef.current) {
      // No coords for this region — recenter on SG (first load only).
      mapRef.current.setCenter(SG_CENTROID);
      mapRef.current.setZoom(11);
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
    <div className="rounded-lg border border-tg-border bg-tg-card overflow-hidden relative">
      <div
        ref={containerRef}
        className={overlayLayers && overlayLayers.colour === false ? 'gia-greyscale-map' : undefined}
        style={{
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
      <div className="absolute top-12 right-2 flex flex-col gap-1 z-10">
        {/* v0.61.37 — Reset: recenter to the Singapore default view. */}
        <button
          type="button"
          onClick={() => {
            mapRef.current?.setCenter(SG_CENTROID);
            mapRef.current?.setZoom(SG_DEFAULT_ZOOM);
          }}
          className="w-7 h-7 rounded-full bg-white/70 text-black border border-gray-300 shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t('map.reset', lang)}
          title={t('map.reset', lang)}
        ><span aria-hidden>⛶⟲</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) + 1)}
          className="w-7 h-7 rounded-full bg-white/70 text-black border border-gray-300 shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t('map.zoomIn', lang)}
        ><span aria-hidden>＋</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) - 1)}
          className="w-7 h-7 rounded-full bg-white/70 text-black border border-gray-300 shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={t('map.zoomOut', lang)}
        ><span aria-hidden>－</span></button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-7 h-7 rounded-full bg-white/70 text-black border border-gray-300 shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
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
      {/* v0.61.92 — live zoom readout, bottom-right.
          v0.61.93 — operator: white circle (matches the other maps).
          The Hawker map has no user location, so this stays a readout
          rather than a recenter button. */}
      {zoomLevel != null && (
        <div
          className="absolute bottom-3 right-3 z-10 text-[10px] font-bold leading-none text-gray-900 opacity-30 pointer-events-none select-none"
          aria-hidden
        >
          🔭 {Math.round(Number(zoomLevel))}
        </div>
      )}
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
