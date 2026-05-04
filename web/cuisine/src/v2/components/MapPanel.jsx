import React, { useEffect, useRef } from 'react';

export default function MapPanel({ venues, userLoc, focusedPlaceId, onPinTap }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

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
    syncMarkers();
  }

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
    for (const v of venues || []) {
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
      const focused = v.placeId === focusedPlaceId;
      const pin = new PinElement({
        background: focused ? '#FF9500' : '#34C759',
        borderColor: '#1c1c1f', glyphColor: '#fff', scale: focused ? 1.3 : 1
      });
      const marker = new AdvancedMarkerElement({
        map: mapRef.current, position: { lat: v.lat, lng: v.lng }, title: v.name, content: pin.element
      });
      marker.addListener('click', () => onPinTap?.(v.placeId));
      markersRef.current.push(marker);
      bounds.extend({ lat: v.lat, lng: v.lng });
    }
    if (!bounds.isEmpty() && (venues?.length || userLoc)) mapRef.current.fitBounds(bounds, 60);
    if (focusedPlaceId) {
      const v = (venues || []).find((x) => x.placeId === focusedPlaceId);
      if (v) mapRef.current.panTo({ lat: v.lat, lng: v.lng });
    }
  }

  return (
    <div className="rounded-lg border border-tg-border bg-tg-card overflow-hidden">
      <div ref={containerRef} style={{ width: '100%', height: 240 }} />
    </div>
  );
}
