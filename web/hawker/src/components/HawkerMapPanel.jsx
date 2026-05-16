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

const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// v0.60.227 — operator: the v0.60.224 13px dots were too tiny and
// their colour didn't read against the map. Pins are now 25px, and
// new centres carry a "NEW" badge so they pop. Gold = new centre,
// red = established (same palette as the prior PinElement pins);
// the 🆕 distinction still surfaces in the InfoWindow too.
function hawkerPinNode(isNew) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:relative;width:25px;height:25px;border-radius:50%;cursor:pointer;' +
    'border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.45);' +
    `background:${isNew ? '#f5a623' : '#e53935'};`;
  if (isNew) {
    const badge = document.createElement('div');
    badge.textContent = 'NEW';
    badge.style.cssText =
      'position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);' +
      'background:#f5a623;color:#fff;font-size:9px;font-weight:700;line-height:1;' +
      'letter-spacing:0.5px;padding:3px 5px;border-radius:4px;white-space:nowrap;' +
      'border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.4);';
    el.appendChild(badge);
  }
  return el;
}

export default function HawkerMapPanel({ centres, region }) {
  const lang = useLocale();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [isTablet, setIsTablet] = useState(false);
  const [mapsKeyState, setMapsKeyState] = useState('loading');   // loading | ready | error | nokey

  // Stable copy for the global InfoWindow CTA closure.
  const centresRef = useRef([]);
  useEffect(() => { centresRef.current = centres || []; }, [centres]);

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
      zoomControl: true,
      gestureHandling: 'greedy'
    });
    setMapsKeyState('ready');
    syncMarkers();
  }

  // Re-sync markers whenever the centres array or region changes.
  useEffect(() => { syncMarkers(); }, [centres, region]); // eslint-disable-line

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
      // v0.60.207 — operator: the standalone blue "Open on Google Maps"
      // button was clipped / hard to see inside the InfoWindow bubble.
      // Dropped the button; the address line is now itself the
      // hyperlink (calls the same __giaHawkerOpenMap deep-link handler).
      // Also: surface the stall count (5b), and pin a dark text colour
      // on the root so the popup is legible in Telegram dark mode.
      const stallsLine = Number.isFinite(c.stalls) && c.stalls > 0
        ? `<div style="font-size:11px;color:#666;margin-top:3px;">${escapeHtml(tn('stalls.count', lang, { n: c.stalls }))}</div>`
        : '';
      const addrLink = c.address
        ? `<div style="font-size:11px;margin-top:3px;"><a href="#" onclick="window.__giaHawkerOpenMap('${escapeHtml(key)}'); return false;" style="color:#1a73e8;text-decoration:underline;">📇 ${escapeHtml(c.address)} ↗</a></div>`
        : '';
      const html =
        `<div style="min-width:160px;max-width:260px;padding:2px 4px;color:#1c1c1f;">
           <div style="font-weight:600;font-size:13px;">${escapeHtml(c.name)}${c.isNew ? ' 🆕' : ''}</div>
           ${stallsLine}
           ${addrLink}
         </div>`;
      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(html);
          infoWindowRef.current.open(mapRef.current, marker);
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
          height: isTablet ? 'min(560px, 55vh)' : 'min(420px, 50vh)',
          minHeight: 240
        }}
        aria-label={t('map.aria', lang)}
      />
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
