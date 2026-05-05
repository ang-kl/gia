import React, { useEffect, useRef, useState } from 'react';
import { tg } from '../../api/tg.js';

// v0.58.2: "Search this area" floating button. When the user pans
// the map far enough from the last-searched anchor, surface a
// pill-shaped button (Google-Maps-style) that re-runs the search at
// the current viewport centre. The button stays hidden when the map
// is moved programmatically (fitBounds after a fresh result list,
// panTo on a focused pin) — only user-initiated drift triggers it.
const PAN_THRESHOLD_METERS = 300;

// v0.58.51: build the canonical Google Maps URL for a venue. Mirrors
// the server's maps-url.js choice: prefer place_id-explicit deep-link
// so iOS Universal Links resolve to the Google Maps app (not Apple
// Maps). Falls back to a name-search URL when placeId is missing.
function venueMapsUrl(v) {
  if (!v) return '';
  const name = v.name || '';
  if (v.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(v.placeId)}`;
  }
  return v.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Singapore')}`;
}

// v0.58.51: open the Google Maps URL inside Telegram's WebApp shell.
// tg.openLink delegates to the system browser, which auto-routes via
// Universal Link to the Google Maps app on iOS. Plain window.open
// often does nothing inside the TMA WebView.
function openInGoogleMaps(v) {
  const url = venueMapsUrl(v);
  if (!url) return;
  const w = tg();
  if (w && typeof w.openLink === 'function') {
    w.openLink(url, { try_instant_view: false });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function metersBetween(a, b) {
  const dLat = (a.lat - b.lat) * 110600;
  const dLng = (a.lng - b.lng) * 110600;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export default function MapPanel({ venues, userLoc, focusedPlaceId, onPinTap, searchCenter, onSearchHere, children }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  // v0.58.51: shared InfoWindow for hover preview. Single instance
  // re-used across all markers (Google Maps best practice — keeps DOM
  // light and lets us close-on-mouseout without leaks).
  const infoWindowRef = useRef(null);
  // Track the last anchored search lat/lng so we can compare against
  // the live map centre on every idle event.
  const searchCenterRef = useRef(null);
  // Set true right before fitBounds/panTo so the next idle event
  // doesn't mis-attribute the programmatic move to user panning.
  const programmaticUpdateRef = useRef(false);
  const [showSearchHere, setShowSearchHere] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (window.google?.maps) { initMap(); return; }
    fetch('/maps-key').then((r) => r.json()).then((d) => {
      if (cancelled || !d?.key) return;
      const tag = document.createElement('script');
      tag.src = `https://maps.googleapis.com/maps/api/js?key=${d.key}&libraries=marker&v=quarterly&loading=async&callback=__giaMapsReady`;
      tag.async = true;
      window.__giaMapsReady = () => { if (!cancelled) initMap(); };
      document.head.appendChild(tag);
    }).catch((err) => console.warn('[Cuisine-TMA] maps-key fetch failed', err));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!containerRef.current || mapRef.current) return;
    const { Map } = window.google.maps;
    const center = userLoc || (venues?.[0] ? { lat: venues[0].lat, lng: venues[0].lng } : { lat: 1.3521, lng: 103.8198 });
    mapRef.current = new Map(containerRef.current, {
      center, zoom: 14, disableDefaultUI: true, zoomControl: true,
      gestureHandling: 'greedy', mapId: 'DEMO_MAP_ID'
    });
    mapRef.current.addListener('idle', handleIdle);
    syncMarkers();
  }

  function handleIdle() {
    if (programmaticUpdateRef.current) {
      programmaticUpdateRef.current = false;
      return;
    }
    if (!searchCenterRef.current || !mapRef.current) return;
    const c = mapRef.current.getCenter();
    if (!c) return;
    const dist = metersBetween(
      { lat: c.lat(), lng: c.lng() },
      searchCenterRef.current
    );
    setShowSearchHere(dist > PAN_THRESHOLD_METERS);
  }

  // Anchor changes whenever a new search lands. Reset the visibility
  // flag so the button doesn't briefly flicker between the result
  // arriving and fitBounds completing.
  useEffect(() => {
    if (!searchCenter) return;
    searchCenterRef.current = { lat: searchCenter.lat, lng: searchCenter.lng };
    setShowSearchHere(false);
  }, [searchCenter?.lat, searchCenter?.lng]);

  useEffect(() => { syncMarkers(); }, [venues, userLoc, focusedPlaceId]); // eslint-disable-line

  function syncMarkers() {
    if (!mapRef.current || !window.google?.maps) return;
    const { AdvancedMarkerElement, PinElement } = window.google.maps.marker;
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();
    if (userLoc) {
      if (!userMarkerRef.current) {
        const pin = new PinElement({ background: '#1e88e5', borderColor: '#0d47a1', glyph: '●', glyphColor: '#fff', scale: 1 });
        userMarkerRef.current = new AdvancedMarkerElement({
          map: mapRef.current, position: userLoc, title: 'You are here', content: pin.element
        });
      } else {
        userMarkerRef.current.position = userLoc;
        userMarkerRef.current.map = mapRef.current;
      }
      bounds.extend(userLoc);
    }
    // v0.58.51: lazy InfoWindow init (depends on google.maps loaded).
    if (!infoWindowRef.current && window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new window.google.maps.Size(0, -10)
      });
    }
    for (const v of venues || []) {
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
      const focused = v.placeId === focusedPlaceId;
      const pin = new PinElement({
        background: focused ? '#FF9500' : '#34C759',
        borderColor: '#1c1c1f', glyphColor: '#fff', scale: focused ? 1.3 : 1
      });
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: v.lat, lng: v.lng },
        title: v.name,                                    // native browser tooltip (desktop hover)
        content: pin.element,
        gmpClickable: true                                // enable click + DOM events on the pin
      });
      // v0.58.51: hover preview via InfoWindow. Desktop only — mobile
      // has no mouseover. Shows venue name, rating, and a "Click to
      // open in Maps" hint. On mouseout the window closes.
      const ratingHtml = Number.isFinite(v.rating)
        ? `<div style="font-size:11px;color:#666;margin-top:2px;">⭐ ${v.rating.toFixed(1)}${Number.isFinite(v.userRatingCount) ? ` (${v.userRatingCount})` : ''}</div>`
        : '';
      const infoHtml =
        `<div style="min-width:140px;max-width:240px;padding:2px 4px;">
           <div style="font-weight:600;font-size:13px;color:#1c1c1f;">${escapeHtml(v.name || '')}</div>
           ${ratingHtml}
           <div style="font-size:10.5px;color:#888;margin-top:4px;font-style:italic;">Tap pin → Google Maps</div>
         </div>`;
      const onMouseOver = () => {
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(infoHtml);
        infoWindowRef.current.open(mapRef.current, marker);
      };
      const onMouseOut = () => {
        if (infoWindowRef.current) infoWindowRef.current.close();
      };
      if (marker.element) {
        marker.element.addEventListener('mouseover', onMouseOver);
        marker.element.addEventListener('mouseout', onMouseOut);
      }
      // v0.58.51: click → open Google Maps via tg.openLink. On mobile
      // (no hover), this is the primary interaction. Also keeps the
      // existing focus-card behaviour so the result list still
      // highlights the corresponding card on tap.
      marker.addListener('click', () => {
        onPinTap?.(v.placeId);
        openInGoogleMaps(v);
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: v.lat, lng: v.lng });
    }
    // v0.58.16: reverted v0.58.15's "extend bounds with radius circle"
    // experiment. At radius 40 km+ the cardinal points pulled the map
    // into a regional/satellite view (Strait + Riau visible, no
    // streets) which was the opposite of useful — users want to see
    // their location and the venues around them, not the full search
    // radius they could theoretically search. Map fits venues + user
    // marker only; the slider value still feeds the search query.
    if (!bounds.isEmpty() && (venues?.length || userLoc)) {
      // v0.58.20: cap the auto-zoom so a tight cluster of 5 venues
      // within a few hundred metres doesn't drop the user into a
      // single-block view. setOptions before fitBounds is the
      // documented way to bound the result.
      mapRef.current.setOptions({ maxZoom: 16 });
      programmaticUpdateRef.current = true;
      mapRef.current.fitBounds(bounds, 60);
    }
    if (focusedPlaceId) {
      const v = (venues || []).find((x) => x.placeId === focusedPlaceId);
      if (v) {
        programmaticUpdateRef.current = true;
        mapRef.current.panTo({ lat: v.lat, lng: v.lng });
      }
    }
  }

  function handleSearchHereClick() {
    if (!mapRef.current || !onSearchHere) return;
    const c = mapRef.current.getCenter();
    if (!c) return;
    onSearchHere(c.lat(), c.lng());
  }

  // v0.58.29: "Show your location" recenter affordance. Mirrors the
  // Google Maps native button — pans the viewport to userLoc and
  // sets a sensible neighbourhood-level zoom. No-op when userLoc
  // hasn't resolved.
  function handleRecenterClick() {
    if (!mapRef.current || !userLoc) return;
    programmaticUpdateRef.current = true;
    mapRef.current.panTo({ lat: userLoc.lat, lng: userLoc.lng });
    if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
  }

  return (
    <div className="rounded-lg border border-tg-border bg-tg-card overflow-hidden relative">
      {/* v0.58.17: map height now scales with viewport. Phone keeps
          ~240 px (50vh on a 480 px viewport ≈ 240); tablet/desktop
          get up to 420 px so the map isn't a tiny strip on a tall
          screen. min-height clamps to 240 so it never shrinks below
          the original. */}
      <div ref={containerRef} style={{ width: '100%', height: 'min(420px, 50vh)', minHeight: 240 }} />
      {showSearchHere && (
        <button
          type="button"
          onClick={handleSearchHereClick}
          className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white text-gray-900 text-xs font-medium shadow-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100 z-10"
          aria-label="Search this area"
        >🔍 Search this area</button>
      )}
      {/* v0.58.29: "Show your location" recenter button. Bottom-right
          floating like the Google Maps native app. Disabled state
          when userLoc hasn't resolved yet keeps the affordance
          visible so the user knows it exists. */}
      <button
        type="button"
        onClick={handleRecenterClick}
        disabled={!userLoc}
        className={`absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white shadow-md border border-gray-300 flex items-center justify-center text-base z-10 ${userLoc ? 'hover:bg-gray-50 active:bg-gray-100 text-gray-900' : 'text-gray-400 cursor-not-allowed'}`}
        aria-label="Show your location"
        title="Show your location"
      >
        <span aria-hidden>📍</span>
      </button>
      {children}
    </div>
  );
}
