// web/transport/src/components/MrtMapPanel.jsx — v0.60.85
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
// Pin colour: PinElement.background = LINES_BY_CODE[primary].hex
// (canonical LTA palette). Multi-line interchanges use the first
// line's colour; the InfoWindow lists every line + code. Future
// stations render desaturated grey with "Opens 20XX" in the popup.
//
// Loading: reuses /maps-key + the __giaMapsReady global from the
// hawker / cuisine TMAs so the Maps JS bundle deduplicates.

import React, { useEffect, useRef, useState } from 'react';
import { LINES_BY_CODE } from '../data/lines.js';

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
const FUTURE_BORDER = '#6B7280';
const DEFAULT_BG = '#888888';

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

export default function MrtMapPanel({ focusedCode = null, onResetFocus, statusByLine = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const stationsRef = useRef([]);
  // v0.60.87 — capture the registered Map ID from /maps-key so the
  // Map constructor uses the operator's MAP_ID env var when set
  // (custom vector styling + branding), falling back to Google's
  // public DEMO_MAP_ID only when MAP_ID is unset or the server
  // returned the 'GIA_SANCTUARY' placeholder.
  const mapIdRef = useRef('DEMO_MAP_ID');
  const [mapsKeyState, setMapsKeyState] = useState('loading');   // loading | ready | error | nokey
  const [stations, setStations] = useState(null);
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

  // Re-render pins whenever stations, map readiness, OR focused line
  // change. v0.60.88 — focused line filters the visible pins.
  useEffect(() => {
    if (mapRef.current && stations) renderPins(stations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, mapsKeyState, focusedCode]);

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
      clickableIcons: false,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
    if (stations) renderPins(stations);
  }

  function renderPins(list) {
    if (!window.google?.maps?.marker?.AdvancedMarkerElement) return;
    const { AdvancedMarkerElement, PinElement } = window.google.maps.marker;
    // Tear down old.
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
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
      const borderColor = isFuture ? FUTURE_BORDER : bg;
      const pin = new PinElement({
        background: bg,
        borderColor,
        glyphColor: '#fff',
        scale: isFuture ? 0.8 : 1.0
      });
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: s.lat, lng: s.lng },
        title: s.name,
        content: pin.element
      });
      if (isFuture && marker.element?.style) marker.element.style.opacity = '0.7';
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
        const futureLine = isFuture && s.opensYear
          ? `<br><em style="color:#9CA3AF">Opens ${escapeHtml(String(s.opensYear))}</em>`
          : '';
        // v0.60.99 — per-station train status block. For each line
        // the station serves, look up statusByLine (from /api/
        // transport/status) and render "🔴 NSL · status: Normal
        // service" or the matching disruption label. Hidden for
        // future stations.
        const STATUS_LABEL = { delay: 'Delay', disrupted: 'Service disrupted', closure: 'Closure', normal: 'Normal service', unknown: 'Unknown' };
        const statusHtml = (!isFuture && statusByLine && Array.isArray(s.lines) && s.lines.length)
          ? '<br>' + s.lines.map((ln) => {
              const emoji = LINE_EMOJI[ln] || '⬜';
              const st = statusByLine[ln]?.status || 'normal';
              const label = STATUS_LABEL[st] || st;
              const color = st === 'normal' ? '#34C759' : (st === 'delay' ? '#FF9500' : '#FF3B30');
              return `<span style="color:${color}">${emoji} ${escapeHtml(ln)} · ${escapeHtml(label)}</span>`;
            }).join('<br>')
          : '';
        const linkHtml = `<br><a href="#" onclick="__giaMrtOpenMap('${escapeHtml(s.name)}'); return false;">Open 📍 in a map ↗</a>`;
        const html = `<div style="max-width:240px;font-size:12px;line-height:1.45"><strong>${escapeHtml(s.name)}</strong><br>${codes || ''}${statusHtml}${futureLine}${linkHtml}</div>`;
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

  if (err) return <div className="text-xs text-red-500 p-3">⚠ Could not load stations: {err}</div>;
  if (mapsKeyState === 'nokey') return <div className="text-xs text-tg-hint p-3">Map unavailable (key not configured).</div>;
  if (mapsKeyState === 'error') return <div className="text-xs text-red-500 p-3">⚠ Map failed to load.</div>;

  const opsCount = (stations || []).filter((s) => s.status !== 'future').length;
  const futureCount = (stations || []).filter((s) => s.status === 'future').length;

  // v0.60.88 — filtered subset when a line is focused via the
  // AffectedTicker tap (App.jsx threads focusedCode through). Shows
  // an Overview reset button so users can return to the full map.
  const filteredCount = focusedCode && stations
    ? stations.filter((s) => Array.isArray(s.lines) && s.lines.includes(focusedCode)).length
    : 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-tg-border">
      {focusedCode && (
        <div className="flex items-center justify-between px-2 py-1.5 text-[11px] bg-tg-card border-b border-tg-border">
          <span className="text-tg-text">
            Showing <strong>{focusedCode}</strong> · {filteredCount} stations
          </span>
          <button
            type="button"
            onClick={() => onResetFocus?.()}
            className="px-2 py-0.5 rounded-md bg-tg-accent text-tg-accent-text text-[11px] font-semibold active:scale-95 transition"
            aria-label="Overview"
          >Overview ↺</button>
        </div>
      )}
      <div
        ref={containerRef}
        // v0.60.93 — match Cuisine MapPanel responsive height per
        // operator 2026-05-11 ("too long"). Phone: ≤50vh capped at
        // 420 px; minHeight 240 px so the map remains usable on tiny
        // viewports. No tablet bump yet — defer until needed.
        style={{ height: 'min(420px, 50vh)', minHeight: '240px', width: '100%' }}
        aria-label="Map of MRT and LRT stations in Singapore"
      />
      {stations && (
        <div className="text-[10px] text-tg-hint px-2 py-1.5">
          🚇 {opsCount} operational · ⬜ {futureCount} future (greyed)
        </div>
      )}
    </div>
  );
}
