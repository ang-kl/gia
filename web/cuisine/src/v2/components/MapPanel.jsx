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

export default function MapPanel({ venues, userLoc, focusedPlaceId, onPinTap, searchCenter, onSearchHere, anchorName, children }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  // v0.58.53: cache the PinElement DOM node for the user-anchor pin
  // so the hover handler can re-bind to it across syncMarkers re-runs
  // without relying on AdvancedMarkerElement's (non-existent) `.element`.
  const anchorPinNodeRef = useRef(null);
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
  // v0.58.54: detect once at mount whether the active pointer is touch
  // (iPad / iPhone / Android). On touch devices `mouseover` never fires,
  // so we surface the InfoWindow on tap instead and embed an "Open in
  // Maps" CTA inside the bubble. matchMedia is the canonical truth —
  // navigator.userAgent lies for iPadOS in desktop-mode.
  const isTouchRef = useRef(false);
  // v0.58.54: tablet-form-factor detection drives the map-height bump.
  // Re-evaluated on resize so rotating an iPad updates the layout.
  const [isTablet, setIsTablet] = useState(false);
  // v0.58.54: cache the current venues array in a ref so the global
  // `window.__giaOpenMap(placeId)` handler (registered once at mount,
  // invoked from inside the InfoWindow's HTML) can resolve back to a
  // venue object without going through React state.
  const venuesRef = useRef([]);
  useEffect(() => { venuesRef.current = venues || []; }, [venues]);

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

  // v0.58.54: pointer + viewport detection (touch, tablet) + global
  // window.__giaOpenMap handler that the InfoWindow's CTA button calls.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const touchMql = window.matchMedia('(hover: none) and (pointer: coarse)');
    isTouchRef.current = touchMql.matches;
    const tabletMql = window.matchMedia('(min-width: 700px)');
    setIsTablet(tabletMql.matches);
    const onTouchChange = (e) => { isTouchRef.current = e.matches; };
    const onTabletChange = (e) => setIsTablet(e.matches);
    touchMql.addEventListener?.('change', onTouchChange);
    tabletMql.addEventListener?.('change', onTabletChange);
    // Global handler invoked from inside the InfoWindow's HTML CTA.
    // Looks the venue up by placeId from the live `venuesRef` so the
    // closure doesn't go stale across re-renders.
    window.__giaOpenMap = (placeId) => {
      const v = (venuesRef.current || []).find((x) => x.placeId === placeId);
      if (v) openInGoogleMaps(v);
    };
    return () => {
      touchMql.removeEventListener?.('change', onTouchChange);
      tabletMql.removeEventListener?.('change', onTabletChange);
      try { delete window.__giaOpenMap; } catch { window.__giaOpenMap = undefined; }
    };
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
    // v0.58.53: hoist InfoWindow init above the userLoc block so the
    // anchor-pin hover wiring sees a populated ref on the first sync.
    if (!infoWindowRef.current && window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new window.google.maps.Size(0, -10)
      });
    }
    if (userLoc) {
      if (!userMarkerRef.current) {
        const pin = new PinElement({ background: '#1e88e5', borderColor: '#0d47a1', glyph: '●', glyphColor: '#fff', scale: 1 });
        // v0.58.53: hold the PinElement DOM node so hover listeners
        // can be attached to it (AdvancedMarkerElement has no
        // `.element`; its DOM is `.content`).
        const anchorPinNode = pin.element;
        userMarkerRef.current = new AdvancedMarkerElement({
          map: mapRef.current, position: userLoc, title: 'You are here', content: anchorPinNode, gmpClickable: true
        });
        anchorPinNodeRef.current = anchorPinNode;
      } else {
        userMarkerRef.current.position = userLoc;
        userMarkerRef.current.map = mapRef.current;
      }
      // v0.58.52: hover info on the user-anchor pin too. Shows the
      // reverse-geocoded area name when known (e.g. "Downtown Core"),
      // else falls back to the literal "You are here" label.
      // v0.58.53: idempotent re-bind to the cached PinElement DOM node
      // so the handler closure picks up the latest `anchorName` on
      // subsequent renders.
      const anchorHtml =
        `<div style="min-width:120px;max-width:220px;padding:2px 4px;">
           <div style="font-weight:600;font-size:13px;color:#0d47a1;">📍 ${escapeHtml(anchorName || 'You are here')}</div>
           <div style="font-size:10.5px;color:#888;margin-top:2px;font-style:italic;">your search anchor</div>
         </div>`;
      const anchorNode = anchorPinNodeRef.current;
      if (anchorNode && infoWindowRef.current) {
        anchorNode.style.cursor = 'pointer';
        anchorNode.onmouseover = () => {
          infoWindowRef.current.setContent(anchorHtml);
          infoWindowRef.current.open(mapRef.current, userMarkerRef.current);
        };
        anchorNode.onmouseout = () => infoWindowRef.current.close();
      }
      bounds.extend(userLoc);
    }
    for (const v of venues || []) {
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
      const focused = v.placeId === focusedPlaceId;
      const pin = new PinElement({
        background: focused ? '#FF9500' : '#34C759',
        borderColor: '#1c1c1f', glyphColor: '#fff', scale: focused ? 1.3 : 1
      });
      const pinNode = pin.element;
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: v.lat, lng: v.lng },
        title: v.name,                                    // native browser tooltip (desktop hover)
        content: pinNode,
        gmpClickable: true                                // enable click + DOM events on the pin
      });
      // v0.58.51 / v0.58.52: hover preview via InfoWindow. Desktop only.
      // Now shows venue name (bold) + 📇 address + 🚊/🚘 travel times
      // per Human Lead. Travel-time fields populated server-side via
      // travel-times.enrichTravelTimes (TRANSIT + DRIVE Routes calls).
      const addressHtml = v.area
        ? `<div style="font-size:11px;color:#666;margin-top:2px;">📇 ${escapeHtml(v.area)}</div>`
        : '';
      const travelParts = [];
      if (Number.isFinite(v.transitMinutes)) travelParts.push(`🚊 ${v.transitMinutes} min`);
      if (Number.isFinite(v.driveMinutes))   travelParts.push(`🚘 ${v.driveMinutes} min`);
      const travelHtml = travelParts.length
        ? `<div style="font-size:11px;color:#444;margin-top:3px;">${travelParts.join(' · ')}</div>`
        : '';
      const ratingHtml = Number.isFinite(v.rating)
        ? `<div style="font-size:11px;color:#666;margin-top:2px;">⭐ ${v.rating.toFixed(1)}${Number.isFinite(v.userRatingCount) ? ` (${v.userRatingCount})` : ''}</div>`
        : '';
      // v0.58.54: on touch devices, embed an "Open in Google Maps" CTA
      // inside the bubble — the global `window.__giaOpenMap(placeId)`
      // handler (registered at mount) routes through openInGoogleMaps.
      // On desktop the hint reads "Tap pin → Google Maps" because the
      // pin click itself opens Maps directly without showing the bubble.
      const ctaHtml = isTouchRef.current
        ? `<button onclick="window.__giaOpenMap('${escapeHtml(v.placeId || '')}')" style="margin-top:8px;width:100%;padding:6px 10px;border:0;border-radius:6px;background:#1a73e8;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">📍 Open in Google Maps</button>`
        : `<div style="font-size:10.5px;color:#888;margin-top:4px;font-style:italic;">Tap pin → Google Maps</div>`;
      const infoHtml =
        `<div style="min-width:160px;max-width:280px;padding:2px 4px;">
           <div style="font-weight:600;font-size:13px;color:#1c1c1f;">${escapeHtml(v.name || '')}</div>
           ${addressHtml}
           ${travelHtml}
           ${ratingHtml}
           ${ctaHtml}
         </div>`;
      const onMouseOver = () => {
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(infoHtml);
        infoWindowRef.current.open(mapRef.current, marker);
      };
      const onMouseOut = () => {
        if (infoWindowRef.current) infoWindowRef.current.close();
      };
      // v0.58.53: AdvancedMarkerElement exposes its DOM at `.content`,
      // NOT `.element`. Previous code used `marker.element` which was
      // always undefined → the `if` guard silently no-op'd and no
      // hover ever fired. Hold the PinElement DOM in a local
      // (`pinNode = pin.element`) and attach listeners to that.
      // v0.58.54: only attach hover listeners on devices that fire
      // pointer events. Touch devices skip this — taps go through
      // marker.click below.
      if (pinNode && !isTouchRef.current) {
        pinNode.style.cursor = 'pointer';
        pinNode.addEventListener('mouseover', onMouseOver);
        pinNode.addEventListener('mouseout', onMouseOut);
      }
      // v0.58.51: click on desktop → open Google Maps via tg.openLink.
      // v0.58.54: on touch devices, click instead opens the InfoWindow
      // preview with the embedded "📍 Open in Google Maps" CTA. The
      // user taps once for preview, again for Maps — matches Google
      // Maps' own native mobile pattern.
      marker.addListener('click', () => {
        onPinTap?.(v.placeId);
        if (isTouchRef.current) {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(infoHtml);
            infoWindowRef.current.open(mapRef.current, marker);
          }
        } else {
          openInGoogleMaps(v);
        }
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
          the original.
          v0.58.54: tablet form-factor (≥700 px wide, e.g. iPad Mini)
          gets a taller cap of 640 px / 60vh — 420 was only ~37 % of a
          1133 px iPad portrait viewport, which felt cramped. */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: isTablet ? 'min(640px, 60vh)' : 'min(420px, 50vh)',
          minHeight: 240
        }}
      />
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
