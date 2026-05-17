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
import { createOverlayController } from '../lib/mapOverlays.js';

const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };

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
function hawkerPinNode(isNew) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:relative;width:17px;height:17px;border-radius:50%;cursor:pointer;' +
    'border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.45);' +
    `background:${isNew ? '#1e3a8a' : '#e53935'};`;
  if (isNew) {
    const badge = document.createElement('div');
    badge.textContent = 'NEW';
    badge.style.cssText =
      'position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);' +
      'background:#1e3a8a;color:#fff;font-size:9px;font-weight:700;line-height:1;' +
      'letter-spacing:0.5px;padding:3px 5px;border-radius:4px;white-space:nowrap;' +
      'border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.4);';
    el.appendChild(badge);
  }
  return el;
}

export default function HawkerMapPanel({ centres, region, overlayLayers, attractionsMode = 'nearby' }) {
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
      gestureHandling: 'greedy'
    });
    setMapsKeyState('ready');
    overlayControllerRef.current = createOverlayController(mapRef.current, window.google.maps);
    applyOverlayLayers(overlayLayersRef.current);
    // v0.64.0 — feed the map-centre anchor so radius-clipped overlay
    // layers re-filter on every pan/zoom.
    mapRef.current.addListener('idle', () => {
      const c = mapRef.current?.getCenter?.();
      if (c) overlayControllerRef.current?.setAnchor?.(c.lat(), c.lng());
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
    ctrl.setLayer('exits', !!layers.exits);
    ctrl.setLayer('train', !!layers.train);
  }

  useEffect(() => { applyOverlayLayers(overlayLayers); }, [overlayLayers]); // eslint-disable-line
  useEffect(() => { overlayControllerRef.current?.setAttractionsMode?.(attractionsMode); }, [attractionsMode]);
  useEffect(() => () => { overlayControllerRef.current?.destroy?.(); }, []);

  // Re-sync markers whenever the centres array or region changes.
  useEffect(() => { syncMarkers(); }, [centres, region]); // eslint-disable-line

  // v0.61.10 — hawker map-pin InfoWindow template: name, operating
  // status, address, 2 nearby bus stops, nearest station (code + name
  // + line), and that station's exits. The transit half is null until
  // /api/hawker/centre-transit resolves, then the bubble refreshes.
  function buildInfoHtml(c, key, transit) {
    const gmaps = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    let h = '<div style="min-width:170px;max-width:270px;padding:2px 4px;color:#1c1c1f;font-size:11px;line-height:1.5;">';
    h += `<div style="font-weight:600;font-size:13px;">${escapeHtml(c.name)}${c.isNew ? ' 🆕' : ''}</div>`;
    if (c.status) {
      h += `<div style="color:#666;margin-top:2px;">🕒 ${escapeHtml(c.status)}</div>`;
    } else if (Number.isFinite(c.stalls) && c.stalls > 0) {
      h += `<div style="color:#666;margin-top:2px;">${escapeHtml(tn('stalls.count', lang, { n: c.stalls }))}</div>`;
    }
    if (c.address) {
      h += `<div style="margin-top:3px;"><a href="#" onclick="window.__giaHawkerOpenMap('${escapeHtml(key)}'); return false;" style="color:#1a73e8;text-decoration:underline;">📇 ${escapeHtml(c.address)} ↗</a></div>`;
    }
    const bus = transit && Array.isArray(transit.busStops) ? transit.busStops : [];
    for (const b of bus.slice(0, 2)) {
      if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) continue;
      h += `<div style="margin-top:2px;"><a href="${escapeHtml(gmaps(b.lat, b.lng))}" target="_blank" rel="noopener" style="color:#1a73e8;">🚌 ${escapeHtml(b.code || '')} ${escapeHtml(b.description || '')}</a></div>`;
    }
    const st = transit && transit.station;
    if (st && st.name && Number.isFinite(st.lat) && Number.isFinite(st.lng)) {
      const codes = Array.isArray(st.codes) ? st.codes.join('/') : '';
      const lines = Array.isArray(st.lines) && st.lines.length ? ` · ${st.lines.join('/')}` : '';
      h += `<div style="margin-top:2px;"><a href="${escapeHtml(gmaps(st.lat, st.lng))}" target="_blank" rel="noopener" style="color:#1a73e8;">🚉 ${escapeHtml(codes)} ${escapeHtml(st.name)}${escapeHtml(lines)}</a></div>`;
      const exits = Array.isArray(st.exits) ? st.exits.filter(Boolean) : [];
      if (exits.length) {
        h += `<div style="color:#444;margin-top:2px;">🚪 ${escapeHtml(exits.join(', '))}</div>`;
      }
    }
    return h + '</div>';
  }

  function syncMarkers() {
    if (!mapRef.current || !window.google?.maps) return;
    const { AdvancedMarkerElement } = window.google.maps.marker;
    // Tear down old markers + InfoWindow content.
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    if (!infoWindowRef.current && window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow({
        disableAutoPan: false,
        pixelOffset: new window.google.maps.Size(0, -10)
      });
    }

    const bounds = new window.google.maps.LatLngBounds();
    let plotted = 0;
    for (const c of (centres || [])) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: c.lat, lng: c.lng },
        title: c.name,
        content: hawkerPinNode(c.isNew),
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
      mapRef.current.setOptions({ maxZoom: 16 });
      mapRef.current.fitBounds(bounds, 60);
    } else {
      // No coords for this region — recenter on SG.
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

  return (
    <div className="rounded-lg border border-tg-border bg-tg-card overflow-hidden relative">
      <div
        ref={containerRef}
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
      <div className="absolute top-2 right-2 flex flex-row gap-1 z-10">
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) + 1)}
          className="w-7 h-7 rounded-full bg-tg-card/70 text-tg-text border border-tg-border shadow-md flex items-center justify-center text-base font-semibold leading-none active:scale-95"
          aria-label={t('map.zoomIn', lang)}
        ><span aria-hidden>＋</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) - 1)}
          className="w-7 h-7 rounded-full bg-tg-card/70 text-tg-text border border-tg-border shadow-md flex items-center justify-center text-base font-semibold leading-none active:scale-95"
          aria-label={t('map.zoomOut', lang)}
        ><span aria-hidden>－</span></button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-7 h-7 rounded-full bg-tg-card/70 text-tg-text border border-tg-border shadow-md flex items-center justify-center text-sm leading-none active:scale-95"
          aria-label={t(expanded ? 'map.collapse' : 'map.expand', lang)}
          title={t(expanded ? 'map.collapse' : 'map.expand', lang)}
        ><span aria-hidden>{expanded ? '⤡' : '⤢'}</span></button>
      </div>
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
