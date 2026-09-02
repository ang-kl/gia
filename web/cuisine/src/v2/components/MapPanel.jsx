import React, { useEffect, useRef, useState } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';
import { tg } from '../../api/tg.js';
import { createOverlayController, infoCard, infoPalette, ensureGreyscaleStyle, codeHex } from '../lib/mapOverlays.js';
import { stationName } from '../../../../_shared/lib/mrt-stations-i18n.generated.js';
import { cachedPronunciation, streetOf, fetchPronunciations } from '../../../../_shared/lib/pronounce-client.js';
import { initData } from '../../api/tg.js';
import { createRingLayer, farthestResultDist } from '../../../../_shared/lib/distance-rings.js';
import { TAP_ZOOM_WIDE, TAP_ZOOM_PHONE, TAP_PAUSE_MS } from '../../../../_shared/lib/map-interaction.js';
import MapControls from '../../../../_shared/components/MapControls.jsx';
import { mapsLanguageParam } from '../../../../_shared/lib/gmaps-language.js';

// v0.61.70 — venue pin carrying the venue's 1-based result number (its
// rank in the current search results / first load). Replaces the emoji-
// glyph pin (the v0.60.184 michelin / pet / dessert glyphs).
// v0.61.81 — CR-1: droplet/teardrop shape (was a round circle). The
// outer node is a 30 px box with three rounded corners and one sharp
// corner, rotated 45° so the sharp corner points straight down at the
// venue coordinate. The rank number rides in a counter-rotated inner
// span so it stays upright. White border + drop shadow retained.
// v0.62.542 — operator: the result droplet is colour-coded by status/attribute.
// Precedence (most availability-critical first, then prestige): closed → grey,
// else closing within the hour → pink, else Michelin star/Bib → red, else the
// default open → green. The card still carries the word ("Closed" / "Closing in
// N min") + ✳️ Michelin row, so colour is a scan aid, never the sole signal.
const PIN_GREEN = '#34C759';       // open (default)
const PIN_GREY = '#8E8E93';        // closed
const PIN_PINK = '#DB2777';        // closing within the next hour (matches the card's pink tab)
const PIN_MICHELIN_RED = '#C6282D';// Michelin star / Bib Gourmand (Michelin macaron red)
function pinColor(v) {
  if (!v) return PIN_GREEN;
  if (v.openNow === false) return PIN_GREY;
  if (typeof v.closingSoonMinutes === 'number' && v.closingSoonMinutes >= 0 && v.closingSoonMinutes <= 60) return PIN_PINK;
  if (v.michelinCategory) return PIN_MICHELIN_RED;
  return PIN_GREEN;
}

// v0.61.91 — droplet bumped one size up (24 → 30 px; operator request).
// v0.62.542 — `background` is now status-driven (see pinColor); default green.
function cuisinePinNode(number, background = PIN_GREEN) {
  const size = 30;
  const el = document.createElement('div');
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;'
    + `width:${size}px;height:${size}px;cursor:pointer;`
    + 'border-radius:50% 50% 50% 0;transform:rotate(-45deg);'
    + 'border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.5);'
    + `background:${background};`;
  const inner = document.createElement('span');
  inner.style.cssText =
    'transform:rotate(45deg);color:#fff;font-weight:700;'
    + 'font-size:14px;line-height:1;';
  if (number != null) inner.textContent = String(number);
  el.appendChild(inner);
  return el;
}

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

// v0.62.106 — operator (SG only): append a transit block to the venue card —
// nearest 2 stations as "TE12 Napier" (code + name), each deep-linking the
// Train Mini App, and the nearest 3 bus-stop codes. `transit` is the shape
// returned by the overlay controller's showVenueTransit().
// v0.62.850 — `lang` is threaded in so station names can use the OFFICIAL register
// rendering. This block used to print `s.name` raw, so a Chinese or Malay reader saw
// "Clarke Quay" on the map card while the very same station read 克拉码头 in the
// Transport app — from a table already bundled in this build. Free to fix; it was simply
// never wired. Locales the register does not cover (ja/es/de/ru/fr) fall back to the
// English name, which is what `stationName` already does.
function transitBlockHtml(transit, lang = 'en', sayStation = null) {
  if (!transit) return '';
  const p = infoPalette();
  const rows = [];
  if (Array.isArray(transit.stations) && transit.stations.length) {
    const links = transit.stations.map((s) => {
      const codes = Array.isArray(s.codes) ? s.codes : [];
      const first = codes[0] || '';
      // v0.62.130 — operator: each station code rides its OFFICIAL MRT line
      // colour (NS red, EW green, CC orange, DT blue, TE brown, BP/LRT grey…)
      // via codeHex, as a small white-on-colour chip — instead of a plain link.
      const chips = codes.map((code) =>
        `<span style="display:inline-block;background:${codeHex(code)};color:#fff;border-radius:5px;padding:0 4px;margin:0 1px;font-weight:700;font-size:11px;line-height:1.6;">${escapeHtml(code)}</span>`
      ).join('');
      // v0.62.852 — official register name, and a "how to say it" guide beside it when
      // the register has nothing. Operator: "the pin card's mrt station name isn't
      // translated". v0.62.850 wired `stationName()`, which is correct — but the register
      // is zh/ms only, so a Japanese reader still saw "Jalan Besar". There is no official
      // Japanese station name to show; what helps is knowing how to SAY it, exactly as
      // for a venue name or a street.
      const shown = stationName(s.name || '', lang);
      const guide = (shown === (s.name || '') && sayStation) ? sayStation(s.name || '') : null;
      const guideHtml = (guide && guide !== s.name)
        ? ` <span style="opacity:.75;">· ${escapeHtml(guide)}</span>`
        : '';
      return `<a href="#" onclick="window.__giaFocusStation&&window.__giaFocusStation('${escapeHtml(first)}');return false;" style="color:${p.sub};text-decoration:none;cursor:pointer;white-space:nowrap;">${chips} ${escapeHtml(shown)}${guideHtml}</a>`;
    }).join(' · ');
    rows.push(`<div style="font-size:12px;color:${p.sub};margin-top:3px;">🚆 ${links}</div>`);
  }
  if (Array.isArray(transit.bus) && transit.bus.length) {
    // v0.62.120 — operator: the bus-stop codes are now hyperlinks too (parity
    // with the station links above). Tap → pan + open live arrivals on this map.
    const codes = transit.bus.map((b) => {
      const code = escapeHtml(b.code);
      return `<a href="#" onclick="window.__giaFocusBusStop&&window.__giaFocusBusStop('${code}');return false;" style="color:${p.link};text-decoration:underline;cursor:pointer;">${code}</a>`;
    }).join(' · ');
    rows.push(`<div style="font-size:12px;color:${p.sub};margin-top:2px;">🚌 ${codes}</div>`);
  }
  return rows.join('');
}

// v0.62.543 — operator: "some countries use miles". Road-distance imperial
// countries (miles) — US, UK, Myanmar, Liberia; everywhere else (incl. SG, AU)
// uses km. The ring labels follow the SEARCHED country (state.countryPref),
// not the device locale.
const MILES_COUNTRIES = new Set(['US', 'GB', 'MM', 'LR']);
function distanceUnit(region, countryPref) {
  if ((region || 'SG') === 'SG') return 'km';
  return MILES_COUNTRIES.has(String(countryPref || '').toUpperCase()) ? 'mi' : 'km';
}

export default function MapPanel({ venues, pronunciations = null, restoredMount = false, userLoc, focusedPlaceId, onPinTap, searchCenter, anchorName, overlayLayers, onOverlayChange, region, countryPref, onMapMove, flyTo, fitPins, onDeselect, onInfoClose, onLongPress, blinkOnly = false, fill = false, frameHeight = null, onExpandFull = null, onCollapse = null, children }) {
  // v0.62.125 — onDeselect (tap empty map → exit the result carousel) kept in a
  // ref so the long-lived map-click handler always calls the current prop.
  const onDeselectRef = useRef(null);
  useEffect(() => { onDeselectRef.current = onDeselect; }, [onDeselect]);
  // v0.62.x — operator: LONG-PRESS the map to drop a pin → set location. A held
  // tap (≥550ms, no drag) routes the click's latLng to onLongPress; a short tap
  // still deselects. Press timing tracked on the container via DOM events.
  const onLongPressRef = useRef(null);
  useEffect(() => { onLongPressRef.current = onLongPress; }, [onLongPress]);
  const pressStartRef = useRef(0);
  const pressMovedRef = useRef(false);
  const [lang] = useLocale();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // v0.61.0 — parks / attractions / taxi-stop overlay layers. The
  // controller is created once the Google Map exists; the chip strip
  // below the map drives layer visibility via overlayLayers.
  const overlayControllerRef = useRef(null);
  // v0.62.537 — distance-ring overlay (🚶 750 m walkable + 🚆 2-MRT-stops rings),
  // centred on the search anchor while results are on the map.
  const ringLayerRef = useRef(null);
  const overlayLayersRef = useRef(overlayLayers);
  useEffect(() => { overlayLayersRef.current = overlayLayers; }, [overlayLayers]);
  const markersRef = useRef([]);
  const markerByIdRef = useRef(new Map());
  // v0.62.106 — placeId whose info popup is currently open, so the async
  // transit fetch only re-renders the card if it's still the open one.
  const openInfoIdRef = useRef(null);
  const userMarkerRef = useRef(null);
  // v0.61.10 — ⚠️ traffic-accident markers within 250 m of the search
  // anchor, shown while cuisine results are on the map.
  const incidentMarkersRef = useRef([]);
  // v0.58.53: cache the PinElement DOM node for the user-anchor pin
  // so the hover handler can re-bind to it across syncMarkers re-runs
  // without relying on AdvancedMarkerElement's (non-existent) `.element`.
  const anchorPinNodeRef = useRef(null);
  // v0.58.51: shared InfoWindow for hover preview. Single instance
  // re-used across all markers (Google Maps best practice — keeps DOM
  // light and lets us close-on-mouseout without leaks).
  const infoWindowRef = useRef(null);
  // v0.58.54: detect once at mount whether the active pointer is touch
  // (iPad / iPhone / Android). On touch devices `mouseover` never fires,
  // so we surface the InfoWindow on tap instead and embed an "Open in
  // Maps" CTA inside the bubble. matchMedia is the canonical truth —
  // navigator.userAgent lies for iPadOS in desktop-mode.
  const isTouchRef = useRef(false);
  // v0.58.54: tablet-form-factor detection drives the map-height bump.
  // Re-evaluated on resize so rotating an iPad updates the layout.
  const [isTablet, setIsTablet] = useState(false);
  // v0.63.0 — expand toggle: grows the map to ~90vh in place.
  const [expanded, setExpanded] = useState(false);
  // v0.62.691 — operator: "the ⇱ (U+21F1) and ⇲ (U+21F2) is missing in Cuisine
  // TMA. it is to expand the embedded map like Train TMA and Hawker TMA."
  // Correct: the button was GATED OUT on a phone (`fill` true, `onCollapse`
  // undefined) on the reasoning that it "would be a no-op button" there. That is
  // the identical state Transport was bug-reported for in v0.62.626 and Hawker in
  // v0.62.627 — both fixed not by hiding the button but by giving it a real
  // action. This is the third instance of the same pattern, so Hawker's fix is
  // ported verbatim rather than re-invented: in the previously-hidden case the ⇲
  // promotes the map to a full-viewport overlay, and ⇱ brings it back.
  const [overlayFull, setOverlayFull] = useState(false);
  const canOverlay = fill && !onCollapse;          // exactly the case that was hidden
  const expandedOverlay = canOverlay && overlayFull;
  // Promoting the wrapper to `fixed inset-0` changes the container size out from
  // under the Maps SDK; without a resize trigger it keeps painting at the old size
  // (and drifts off-centre). Same guard Hawker's panel carries for the same reason.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps?.event) return undefined;
    const c = map.getCenter?.();
    const id = setTimeout(() => {
      try { window.google.maps.event.trigger(map, 'resize'); if (c) map.setCenter(c); } catch { /* older webview */ }
    }, 60);
    return () => clearTimeout(id);
  }, [overlayFull, expanded]);
  // v0.61.89 — troubleshooting: live Google Maps zoom level, surfaced in a tiny
  // bottom-right readout. Updated on every `zoom_changed`.
  const [zoomLevel, setZoomLevel] = useState(null);
  // v0.58.54: cache the current venues array in a ref so the global
  // `window.__giaOpenMap(placeId)` handler (registered once at mount,
  // invoked from inside the InfoWindow's HTML) can resolve back to a
  // venue object without going through React state.
  const venuesRef = useRef([]);
  useEffect(() => { venuesRef.current = venues || []; }, [venues]);
  // v0.62.589 — pinFocusRef removed: a pin tap and a card tap now run the same
  // unified focus flow, so there's no longer a "pin tap = don't move the map" case.
  // v0.62.590 — ref mirror so the once-bound closeInfo can notify the parent to
  // clear focusedPlaceId on popup close (Codex re-tap fix).
  const onInfoCloseRef = useRef(null);
  useEffect(() => { onInfoCloseRef.current = onInfoClose; }, [onInfoClose]);
  // v0.62.115 — operator: a result-card tap zooms the map IN to 17 (so the
  // blinking pin lands you on the street).
  // v0.62.560 — operator: closing the card must NOT adjust the zoom — the
  // return-to-prior-zoom on close is removed (was prevFocusZoomRef), across all
  // embedded-map TMAs.
  // v0.62.138 — operator: in HORIZONTAL result mode, tapping a card should ONLY
  // blink the map pin — no zoom-to-17, no info pop-up card. (The pop-up + zoom
  // stay for VERTICAL mode, where the result is a full list.) Held in a ref so
  // the focusedPlaceId effect reads the latest mode without re-subscribing.
  const blinkOnlyRef = useRef(blinkOnly);
  useEffect(() => { blinkOnlyRef.current = blinkOnly; }, [blinkOnly]);
  // v0.62.153 — operator: a card tap zooms to 15 when the spot is CROWDED (>4
  // pins clustered there), else 14. Plus a LEARNED preference: if the user
  // manually zooms OUT to 13/14 twice within ~3 s, that becomes the card-tap
  // zoom for the rest of the session (resets on TMA close = component remount).
  // progZoomRef makes the zoom_changed learner ignore our own setZoom calls.
  const prefZoomRef = useRef(null);
  const progZoomRef = useRef(false);
  const zoomOutHistRef = useRef([]);
  const lastZoomRef = useRef(null);
  // v0.61.310 — capture the registered Map ID from /maps-key so the
  // Map constructor uses the operator's MAP_ID env var when set
  // (custom vector styling + branding). Mirrors the Transport TMA's
  // v0.60.87 pattern (MrtMapPanel.jsx). Falls back to Google's public
  // DEMO_MAP_ID only when MAP_ID is unset or /maps-key returns the
  // 'GIA_SANCTUARY' placeholder — required because AdvancedMarkerElement
  // refuses to render without a registered mapId.
  const mapIdRef = useRef('DEMO_MAP_ID');

  useEffect(() => {
    let cancelled = false;
    if (window.google?.maps) { initMap(); return; }
    fetch('/maps-key').then((r) => r.json()).then((d) => {
      if (cancelled || !d?.key) return;
      // v0.61.310 — override the default 'DEMO_MAP_ID' when the server
      // signals an env-sourced Map ID; covers the prod case where the
      // operator has set MAP_ID on Railway.
      if (d.mapIdSource === 'env:MAP_ID' && d.mapId) {
        mapIdRef.current = d.mapId;
      }
      const tag = document.createElement('script');
      tag.src = `https://maps.googleapis.com/maps/api/js?key=${d.key}&libraries=marker&v=quarterly&loading=async${mapsLanguageParam()}&callback=__giaMapsReady`;
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
    // v0.62.108 — operator: the venue card's 🚆 station link jumps to that
    // station ON THIS map and opens its info (stay in the Cuisine TMA — was an
    // out-of-TMA Train-app deep link).
    window.__giaFocusStation = (code) => {
      overlayControllerRef.current?.focusStation?.(code);
    };
    // v0.62.120 — operator: bus-stop codes in the venue card are hyperlinks too;
    // tap → pan + open the stop's live-arrivals popup on this map.
    window.__giaFocusBusStop = (code) => {
      overlayControllerRef.current?.focusBusStop?.(code);
    };
    return () => {
      touchMql.removeEventListener?.('change', onTouchChange);
      tabletMql.removeEventListener?.('change', onTabletChange);
      try { delete window.__giaOpenMap; } catch { window.__giaOpenMap = undefined; }
      try { delete window.__giaFocusStation; } catch { window.__giaFocusStation = undefined; }
      try { delete window.__giaFocusBusStop; } catch { window.__giaFocusBusStop = undefined; }
    };
  }, []);

  function initMap() {
    if (!containerRef.current || mapRef.current) return;
    ensureGreyscaleStyle();
    const { Map } = window.google.maps;
    // v0.60.19 — initial map center + zoom prefers the anchored
    // searchCenter (the user's chosen anchor) over the raw userLoc
    // GPS reading, per Human Lead 2026-05-08: "TMA you should look
    // at the current anchored-location, don't refresh as it may
    // have set by user for a purposed. It is just centering of
    // current location is off." When the user manually anchored
    // (e.g. /location Tanjong Pagar MRT), searchCenter holds those
    // coords; centering the map there matches the search radius
    // ring and result distances. userLoc remains the fallback for
    // first-paint before searchCenter resolves.
    const center = searchCenter || userLoc
      || (venues?.[0] ? { lat: venues[0].lat, lng: venues[0].lng } : { lat: 1.3521, lng: 103.8198 });
    mapRef.current = new Map(containerRef.current, {
      // v0.61.114 — operator: initial-load zoom is 11, same as every
      // new search result (see syncMarkers fit block). Used to be 14;
      // dropped so the first paint already shows the same Singapore-
      // wide framing the search results will land in, avoiding a
      // zoom-out flicker the moment results arrive.
      center, zoom: 12, disableDefaultUI: true, zoomControl: false,
      // v0.61.18 — suppress Google's native POI/transit info cards so a
      // station tap hits our overlay marker, not Google's own popup.
      clickableIcons: false,
      // v0.61.89 — streamline: all three TMA maps share one options block.
      // v0.62.134 — operator (17-06 '26): remove Google's native camera
      // control (the +/pan-arrows/tilt cluster) from every TMA. It duplicated
      // our custom nav cluster (top-right: Reset / + / ↹ centre / − / expand)
      // and the 📍 recenter button, and read as clutter. The custom cluster +
      // ↹ centre-map button (v0.62.133) now own all on-map navigation.
      // Prior (superseded): cameraControl:true @ LEFT_BOTTOM, kept since v0.61.89.
      cameraControl: false,
      keyboardShortcuts: true,
      // v0.62.102 — operator: zooming out far enough hung the embedded map
      // (world-view tile/marker blow-up). Gate the camera on all three TMA maps:
      // v0.62.294 — operator: zooming out to z5 HUNG the app (mass marker/line
      // blow-up). Raised the floor to minZoom 7 … maxZoom 20 (no over-zoom past street).
      minZoom: 7, maxZoom: 20,
      gestureHandling: 'greedy', mapId: mapIdRef.current
    });
    mapRef.current.addListener('idle', handleIdle);
    // v0.61.353 — report the live map centre so App can track mapViewLocation
    // (the "↩ Back to last search area" helper compares it to the confirmed
    // search anchor). Separate listener so handleIdle's marker logic is untouched.
    mapRef.current.addListener('idle', () => {
      const c = mapRef.current && mapRef.current.getCenter && mapRef.current.getCenter();
      if (c && onMapMove) onMapMove({ lat: c.lat(), lng: c.lng() });
    });
    // v0.61.89 — troubleshooting: seed + track the bottom-right zoom-level readout.
    setZoomLevel(mapRef.current.getZoom());
    lastZoomRef.current = mapRef.current.getZoom();
    mapRef.current.addListener('zoom_changed', () => {
      const z = mapRef.current?.getZoom?.();
      setZoomLevel(z);
      const prev = lastZoomRef.current;
      lastZoomRef.current = z;
      // v0.62.153 — learn the user's preferred card-tap zoom: ignore our own
      // programmatic setZoom; otherwise, a manual zoom-OUT that lands on 13/14,
      // done twice within ~3 s, sets the preference to that level.
      if (progZoomRef.current) { progZoomRef.current = false; return; }
      if (prev != null && z < prev && (z === 13 || z === 14)) {
        const now = Date.now();
        const hist = (zoomOutHistRef.current || []).filter((t) => now - t < 3000);
        hist.push(now);
        zoomOutHistRef.current = hist;
        if (hist.length >= 2) prefZoomRef.current = z;
      }
    });
    // v0.61.168 — thread the region mode into the overlay controller
    // so the carpark layer can pick LTA (SG) vs Places (JB/MY-PUT).
    // MapPanel keeps the controller in sync via setRegionMode below.
    overlayControllerRef.current = createOverlayController(mapRef.current, window.google.maps, { tma: 'cuisine', regionMode: region || 'SG' });
    // v0.62.537 — ring layer bound to this map; syncMarkers drives draw/clear.
    ringLayerRef.current = createRingLayer(mapRef.current, window.google.maps);
    applyOverlayLayers(overlayLayersRef.current);
    // v0.61.22 — close any open popup on a tap of the empty map, and
    // expose a global the in-card ✕ button calls.
    const closeInfo = () => {
      infoWindowRef.current?.close();
      overlayControllerRef.current?.closeInfo?.();   // also clears venue transit pins
      openInfoIdRef.current = null;
      // v0.62.560 — operator: do NOT adjust the zoom on close (the pre-focus zoom
      // restore is removed) — leave the map wherever the user left it.
      // v0.62.590 — clear the parent's focusedPlaceId too (Codex: after the in-card
      // ✕ closes the popup, `focusedPlaceId` was left set, so re-tapping the SAME
      // pin/card set React state to the same value → the focus effect didn't re-run
      // → the popup couldn't reopen). Clearing it makes every re-tap a fresh
      // selection; the ring also lifts on close, which reads as a deselect.
      onInfoCloseRef.current?.();
    };
    window.__giaMapInfoClose = closeInfo;
    // v0.62.125 — a tap on the empty map closes the popup AND deselects (exits
    // the result carousel → back to the list). onDeselect is map-click-only, so
    // the in-card ✕ (which also calls closeInfo) doesn't force-exit the carousel.
    // v0.62.x — LONG-PRESS to set location: track the press on the container, then
    // in the click handler route a held (≥550ms, no-drag) click's latLng to
    // onLongPress instead of deselecting.
    const el = containerRef.current;
    if (el) {
      const MOVE_TOL = 12;
      const onDown = (e) => {
        const t = (e.touches && e.touches[0]) || e;
        pressStartRef.current = Date.now();
        pressMovedRef.current = false;
        el._lpX = t.clientX; el._lpY = t.clientY;
      };
      const onMove = (e) => {
        const t = (e.touches && e.touches[0]) || e;
        if (Math.abs(t.clientX - (el._lpX || 0)) > MOVE_TOL || Math.abs(t.clientY - (el._lpY || 0)) > MOVE_TOL) pressMovedRef.current = true;
      };
      el.addEventListener('touchstart', onDown, { passive: true });
      el.addEventListener('touchmove', onMove, { passive: true });
      el.addEventListener('mousedown', onDown);
      el.addEventListener('mousemove', onMove);
    }
    mapRef.current.addListener('click', (e) => {
      closeInfo();
      const held = Date.now() - (pressStartRef.current || 0);
      const ll = e && e.latLng;
      if (held >= 550 && !pressMovedRef.current && ll && onLongPressRef.current) {
        try { if (navigator.vibrate) navigator.vibrate(15); } catch { /* noop */ }
        onLongPressRef.current({ lat: ll.lat(), lng: ll.lng() });
        return;
      }
      onDeselectRef.current?.();
    });
    syncMarkers();
  }

  // v0.61.88 — every overlay layer is built from Singapore open data
  // (LTA / NParks / SPF / MOH …) and has no Johor Bahru coverage. In
  // the JB region the layers are forced off and the MapControls
  // toggles disabled; the underlying overlayLayers state is preserved,
  // so switching back to Singapore restores the user's choices.
  // v0.61.159 — MY-PUT (Putrajaya pill) gets the same SG-only-layer
  // treatment as JB. Rule §2.10 ("train-line default OFF outside SG")
  // is satisfied here too — the SG-only layer set is force-zeroed
  // for any non-SG region, including the train layer.
  const jb = (region || 'SG') === 'JB';
  const isNonSg = jb || ((region || 'SG') === 'MY-PUT');
  // v0.61.219 — OTHER region (the generic non-SG umbrella set by the
  // /location <text> picker for KL, Bangkok, Jakarta, etc.) greys
  // out ALL nine overlay toggles, carpark included. The anchor is
  // too coarse for the Places-fallback carpark layer to be useful,
  // and the SG-specific feeds (train / bus / etc.) are not
  // populated outside JB and Putrajaya. JB / MY-PUT keep their
  // existing behaviour — only OTHER is the new disable target.
  const isOther = (region || 'SG') === 'OTHER';
  // v0.61.168 — carpark layer now backed by Google Places outside
  // SG (v0.61.158 backend + v0.61.168 controller wiring). The other
  // overlays remain SG-only feeds so they still force-off here.
  const effectiveLayers = (isNonSg && overlayLayers)
    ? {
        ...overlayLayers,
        train: false, busstop: false, exits: false,
        taxis: false, parks: false, attractions: false,
        clinics: false, hospitals: false, police: false
        // carpark: NOT forced — Places fallback works in JB / MY-PUT
      }
    : (isOther && overlayLayers)
    ? {
        ...overlayLayers,
        train: false, carpark: false, busstop: false, exits: false,
        taxis: false, parks: false, attractions: false,
        clinics: false, hospitals: false, police: false
      }
    : overlayLayers;

  // Push the current layer-toggle state into the overlay controller.
  // v0.61.88 — in the Johor Bahru region every SG-only overlay is
  // forced off here, regardless of the saved toggle state, so the
  // map-init call (which passes the raw ref) is JB-safe too.
  // v0.61.159 — broaden the SG-only force-off to any non-SG region.
  // v0.61.168 — carpark layer is no longer SG-only (Places fallback
  // wired through the controller). Keep its user-toggle state in
  // non-SG; everything else still force-zeroes.
  function applyOverlayLayers(layers) {
    const ctrl = overlayControllerRef.current;
    if (!ctrl || !layers) return;
    const L = isNonSg ? { carpark: layers.carpark } : layers;
    ctrl.setLayer('parks', !!L.parks);
    ctrl.setLayer('attractions', !!L.attractions);
    ctrl.setLayer('taxis', !!L.taxis);
    ctrl.setLayer('carpark', !!L.carpark);
    ctrl.setLayer('busstop', !!L.busstop);
    ctrl.setLayer('hawker', !!L.hawker);   // v0.62.184
    ctrl.setLayer('exits', !!L.exits);
    ctrl.setLayer('clinics', !!L.clinics);
    ctrl.setLayer('hospitals', !!L.hospitals);
    ctrl.setLayer('police', !!L.police);
    ctrl.setLayer('train', !!L.train);
    // v0.61.95 — monochrome drives the coloured train-line SVG overlay
    // (raw `layers`, not the JB-gated `L` — it mirrors the greyscale
    // CSS class, which is JB-independent).
    ctrl.setMonochrome(layers.colour === false);
  }

  useEffect(() => { applyOverlayLayers(effectiveLayers); }, [overlayLayers, region]); // eslint-disable-line
  // v0.61.168 — push the region mode into the overlay controller
  // when the SG / JB / Putrajaya pill changes. The controller's
  // setRegionMode also invalidates the carpark fetch cache + drops
  // its layer entry so the next setLayer('carpark', true) re-fetches
  // against the new mode's endpoint.
  useEffect(() => {
    const ctrl = overlayControllerRef.current;
    if (ctrl && typeof ctrl.setRegionMode === 'function') {
      ctrl.setRegionMode(region || 'SG');
    }
  }, [region]);
  // v0.62.886 — push the reader's locale into the overlay controller. The map's
  // station info-window is a raw HTML string built inside mapOverlays.js, which
  // took no lang at all until now; a Spanish reader tapping a station got
  // "Exits" / "First / Last Train" / "Operator:" in English while the React
  // StationCard beside it rendered the same data in Spanish. Pushed through a
  // setter rather than opts because the controller is created in a mount-once
  // effect — anything passed at init would freeze at first render.
  useEffect(() => {
    const ctrl = overlayControllerRef.current;
    if (ctrl && typeof ctrl.setLang === 'function') ctrl.setLang(lang);
  }, [lang]);
  useEffect(() => () => { overlayControllerRef.current?.destroy?.(); ringLayerRef.current?.destroy?.(); }, []);

  function handleIdle() {
    // v0.62.6 — feed the map-centre anchor to the overlay controller so
    // radius-clipped layers re-filter on every pan/zoom.
    const ctr = mapRef.current?.getCenter?.();
    if (ctr) overlayControllerRef.current?.setAnchor?.(ctr.lat(), ctr.lng());
  }

  // v0.60.19 — re-run syncMarkers when searchCenter changes too, so
  // the anchor pin moves to the new anchor immediately after a
  // /location override. Previously the dep array tracked only
  // userLoc, so the pin stayed at GPS even when the search anchored
  // elsewhere.
  // v0.61.86 — focusedPlaceId dropped from these deps. Tapping a venue
  // pin set it, which forced a full marker rebuild + fitBounds + panTo:
  // the map re-centred and the just-tapped marker was destroyed before
  // its popup could open (the "tap twice to open a pin" bug). Focus
  // panning now lives in its own effect below.
  // v0.62.851 — `pronunciations` is in the deps because the popup HTML embeds the guides.
  // Without it the markers were built once from a cold cache and never rebuilt when the
  // answers arrived, so the guides showed up only on a second visit (Codex, #1792 P2).
  // The Map's identity changes exactly when the answers change, so this re-syncs once and
  // not on every render.
  useEffect(() => { syncMarkers(); }, [venues, userLoc, searchCenter?.lat, searchCenter?.lng, pronunciations]); // eslint-disable-line

  // v0.62.106 — operator (#3/#4, SG only): on a venue tap, surface the nearest
  // 3 bus stops + 2 stations on the MAP (toggle-independent) and append them to
  // the open card. Reuses the controller's showVenueTransit.
  // v0.62.109 — operator: drop the zoom ≥ 14 gate — show at ANY zoom; the
  // markers render at the live busTier/trainTier band (tiny squares when far
  // out, labels when zoomed in), and re-tier on zoom change.
  function maybeShowTransit(placeId) {
    const ctrl = overlayControllerRef.current;
    // v0.62.106 — these pins are TEMPORARY: every venue/card tap (and tap-out,
    // via closeInfo) drops the previous set first, so they never linger. They
    // only re-appear on the next qualifying tap; the persistent Train/Bus layer
    // markers (when toggled on) are separate and untouched.
    ctrl?.clearVenueTransit?.();
    const entry = placeId && markerByIdRef.current.get(placeId);
    if (!ctrl || !ctrl.showVenueTransit || !entry) return;
    if ((region || 'SG') !== 'SG') return;
    ctrl.showVenueTransit(entry.lat, entry.lng).then(async (transit) => {
      if (!transit || (!transit.bus.length && !transit.stations.length)) return;
      if (openInfoIdRef.current !== placeId || !infoWindowRef.current) return;
      // v0.62.852 — ask for guides for the stations the register does not cover, THEN
      // render once. Stations recur heavily across venues and the client caches per
      // (name, locale) in localStorage, so this is one request the first time a station
      // is seen in a locale and free after that. Failure is silent: the block still
      // renders with the plain names.
      const need = (transit.stations || [])
        .map((s) => s.name || '')
        .filter((n) => n && stationName(n, lang) === n);
      if (need.length) {
        try {
          await fetchPronunciations(need, lang, { initData: initData(), fetchImpl: null });
        } catch { /* offline / 401 — render the names alone */ }
        if (openInfoIdRef.current !== placeId || !infoWindowRef.current) return;
      }
      const sayStation = (n) => cachedPronunciation(n, lang) || null;
      const block = transitBlockHtml(transit, lang, sayStation);
      if (block) infoWindowRef.current.setContent(infoCard(entry.innerHtml + block));
    }).catch(() => {});
  }

  // v0.62.589 — UNIFIED tap flow (operator: "make Cuisine follow Hawker codes",
  // then a shared spec for both TMAs). A card tap AND a pin tap now run the SAME
  // sequence, in both orientations: panTo → zoom (phone TAP_ZOOM_PHONE, tablet/list
  // TAP_ZOOM_WIDE) → PAUSE TAP_PAUSE_MS (camera settles) → open the InfoWindow
  // anchored to the pin (card-from-pin) + blink the pin (BLINK_MS). This reverses
  // the two prior special-cases the operator signed off on: v0.61.86 (a pin tap no
  // longer stays put — it now pans/zooms like a card tap) and v0.62.141 (the phone
  // carousel no longer suppresses the InfoWindow — "blinkOnly" now only selects the
  // phone zoom). The pin's own click handler just sets focusedPlaceId; everything
  // visual happens here so the two paths can never drift.
  useEffect(() => {
    if (!focusedPlaceId || !mapRef.current) return;
    const v = (venuesRef.current || []).find((x) => x.placeId === focusedPlaceId);
    if (!v || !Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return;
    mapRef.current.panTo({ lat: v.lat, lng: v.lng });
    // Zoom: phone TAP_ZOOM_PHONE (learned pref wins; else 15 when >4 pins cluster
    // within ~150 m of the tapped venue, else 14); tablet/vertical list TAP_ZOOM_WIDE.
    let targetZoom;
    if (blinkOnlyRef.current) {
      targetZoom = prefZoomRef.current;
      if (targetZoom == null) {
        const near = (venuesRef.current || []).filter((x) =>
          Number.isFinite(x?.lat) && Number.isFinite(x?.lng)
          && Math.abs(x.lat - v.lat) < 0.0014 && Math.abs(x.lng - v.lng) < 0.0014).length;
        targetZoom = near > 4 ? TAP_ZOOM_PHONE : (TAP_ZOOM_PHONE - 1);
      }
      progZoomRef.current = true;
    } else {
      targetZoom = TAP_ZOOM_WIDE;
    }
    mapRef.current.setZoom(targetZoom);
    // 0.5 s pause → open the pin's InfoWindow + blink. flashPin pulses a 44px hollow
    // ring (wider than the venue droplet) for ~2.5 s; the pause lets the camera land
    // first so the eye catches the blink (operator: "pause for a second, then blink").
    const timer = setTimeout(() => {
      const entry = markerByIdRef.current.get(focusedPlaceId);
      if (entry && infoWindowRef.current) {
        infoWindowRef.current.setContent(entry.infoHtml);
        infoWindowRef.current.open(mapRef.current, entry.marker);
        openInfoIdRef.current = focusedPlaceId;
        maybeShowTransit(focusedPlaceId);   // v0.62.106
      }
      overlayControllerRef.current?.flashPin?.(v.lat, v.lng, 44);
    }, TAP_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [focusedPlaceId]);

  // v0.61.353 — imperative fly-to: App sets `flyTo` ({lat,lng,zoom?,_k})
  // to pan the map (e.g. the "↩ Back to last search area" helper flies back
  // to the confirmed search anchor). `_k` forces a re-fly to the same point.
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    if (!Number.isFinite(flyTo.lat) || !Number.isFinite(flyTo.lng)) return;
    mapRef.current.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    if (Number.isFinite(flyTo.zoom)) mapRef.current.setZoom(flyTo.zoom);
  }, [flyTo && flyTo.lat, flyTo && flyTo.lng, flyTo && flyTo._k]); // eslint-disable-line

  // v0.62.6 — Michelin city-grouping fit. App sets `fitPins`
  // ({ pins:[{lat,lng}], token }) per the display spec: Case A fits the SET
  // city's pins (map stays centred there), Case B fit-bounds across all
  // visible Michelin pins (country-level view), and a tapped city-jump row
  // re-fits to that city's pins. Display-only: no reload, no search, no
  // setLocation change. <2 valid pins → setCenter + zoom 10 fallback (spec:
  // "prefer fit-bounds; if not available, ~zoom 10"); a single-pin fitBounds
  // would over-zoom, so the clamp below also caps post-fit zoom at 15.
  useEffect(() => {
    if (!fitPins || !mapRef.current || !window.google?.maps) return;
    const pins = (fitPins.pins || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!pins.length) return;
    if (pins.length === 1) {
      mapRef.current.setCenter(pins[0]);
      mapRef.current.setZoom(13);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    for (const p of pins) bounds.extend(p);
    mapRef.current.fitBounds(bounds, 48);
    // Clamp: two near-identical pins make fitBounds zoom in absurdly close.
    const once = mapRef.current.addListener('idle', () => {
      if (mapRef.current && mapRef.current.getZoom() > 15) mapRef.current.setZoom(15);
      window.google.maps.event.removeListener(once);
    });
  }, [fitPins && fitPins.token]); // eslint-disable-line

  // v0.61.10 — traffic accidents within 250 m of the search anchor,
  // drawn as ⚠️ markers while results are showing. Best-effort: needs
  // LTA_ACCOUNT_KEY server-side, else /api/geo/incidents returns [].
  useEffect(() => {
    const clear = () => {
      for (const m of incidentMarkersRef.current) m.map = null;
      incidentMarkersRef.current = [];
    };
    const anchor = searchCenter || userLoc;
    if (!mapRef.current || !window.google?.maps?.marker || !anchor || !(venues?.length)) {
      clear();
      return undefined;
    }
    let cancelled = false;
    fetch(`/api/geo/incidents?lat=${anchor.lat}&lng=${anchor.lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        clear();
        const { AdvancedMarkerElement } = window.google.maps.marker;
        for (const inc of (d.incidents || [])) {
          if (!Number.isFinite(inc.lat) || !Number.isFinite(inc.lng)) continue;
          const el = document.createElement('div');
          el.textContent = '⚠️';
          el.style.cssText = 'font-size:20px;line-height:1;cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));';
          const marker = new AdvancedMarkerElement({
            map: mapRef.current, position: { lat: inc.lat, lng: inc.lng },
            title: inc.type || 'Incident', content: el, gmpClickable: true
          });
          marker.addListener('click', () => {
            if (!infoWindowRef.current) return;
            infoWindowRef.current.setContent(infoCard(
              `<strong>⚠️ ${escapeHtml(inc.type || 'Incident')}</strong><br>${escapeHtml(inc.message || '')}`,
              { lat: inc.lat, lng: inc.lng }
            ));
            infoWindowRef.current.open(mapRef.current, marker);
          });
          incidentMarkersRef.current.push(marker);
        }
      })
      .catch(() => { /* no accident layer */ });
    return () => { cancelled = true; };
  }, [venues, searchCenter?.lat, searchCenter?.lng, userLoc]); // eslint-disable-line

  // v0.61.93 — auto-fit frames on the first data load. v0.61.107 —
  // operator: re-frame on every NEW search too (a fresh `venues`
  // array), not just the first load — only an incidental re-render
  // (a userLoc / searchCenter change with the same `venues`) keeps the
  // user's zoom. `lastFitVenuesRef` tracks the venues array last fitted.
  const lastFitVenuesRef = useRef(null);
  // v0.61.320 — track the last searchCenter we centred on. A city pick in
  // OTHER mode is noAutoFire: it moves `searchCenter` but NOT `venues`, so
  // the centroid-of-venues branch below kept the camera on the prior area's
  // pins and the map never followed the pick. When searchCenter changes
  // without a new `venues` array, recentre on the picked anchor directly.
  const lastSearchCenterRef = useRef(null);
  // v0.62.892 — A RESTORED MOUNT IS NOT A NEW SEARCH, and reading it as one is
  // half of the bug the operator photographed ("the location is in Japan… it
  // switch to locale location which is in Singapore"). A locale change reloads
  // the page and re-hydrates `venues` from sessionStorage, so the array is always
  // a BRAND-NEW object on the fresh mount — `lastFitVenuesRef.current !== venues`
  // is unconditionally true, the new-result-set branch wins, and the camera goes
  // to the centroid of results the reader had already navigated away from,
  // skipping the `searchCenterChanged` branch that would have honoured their pin.
  //
  // Seeded HERE rather than in the ref's initialiser on purpose: MapPanel's mount
  // is gated on `userLoc` resolving, so it can mount either side of the restore
  // effect's setState. `useRef(restoredMount ? venues : null)` would capture `[]`
  // on the unlucky ordering and silently do nothing. This fires on the first
  // sync that actually HAS the restored results, whichever way the race lands.
  const restoreSeededRef = useRef(false);
  function syncMarkers() {
    if (!mapRef.current || !window.google?.maps) return;
    if (restoredMount && !restoreSeededRef.current && venues?.length) {
      restoreSeededRef.current = true;
      lastFitVenuesRef.current = venues;
    }
    const { AdvancedMarkerElement, PinElement } = window.google.maps.marker;
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
    // v0.62.105 — key venue markers + their popup HTML by placeId so a result-
    // card tap can OPEN the pin's info popup (highlight the location), not just
    // pan to it.
    markerByIdRef.current = new Map();
    const bounds = new window.google.maps.LatLngBounds();
    // v0.58.53: hoist InfoWindow init above the userLoc block so the
    // anchor-pin hover wiring sees a populated ref on the first sync.
    if (!infoWindowRef.current && window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow({
        disableAutoPan: true,
        headerDisabled: true,
        pixelOffset: new window.google.maps.Size(0, -10)
      });
    }
    // v0.60.19 — anchor pin position prefers searchCenter (user's
    // chosen anchor) over userLoc (raw GPS). Same reasoning as the
    // initMap() center fix above: when the user has manually
    // anchored, the "you are here" pin must reflect that anchor,
    // not the device GPS, so the visual matches the search radius
    // ring + result distances.
    const anchorPos = searchCenter || userLoc;
    if (anchorPos) {
      if (!userMarkerRef.current) {
        const pin = new PinElement({ background: '#1e88e5', borderColor: '#0d47a1', glyph: '●', glyphColor: '#fff', scale: 1 });
        // v0.58.53: hold the PinElement DOM node so hover listeners
        // can be attached to it (AdvancedMarkerElement has no
        // `.element`; its DOM is `.content`).
        const anchorPinNode = pin.element;
        userMarkerRef.current = new AdvancedMarkerElement({
          map: mapRef.current, position: anchorPos, title: tr('map.youAreHere', lang), content: anchorPinNode, gmpClickable: true
        });
        anchorPinNodeRef.current = anchorPinNode;
      } else {
        userMarkerRef.current.position = anchorPos;
        userMarkerRef.current.map = mapRef.current;
      }
      // v0.58.52: hover info on the user-anchor pin too. Shows the
      // reverse-geocoded area name when known (e.g. "Downtown Core"),
      // else falls back to the literal "You are here" label.
      // v0.58.53: idempotent re-bind to the cached PinElement DOM node
      // so the handler closure picks up the latest `anchorName` on
      // subsequent renders.
      const anchorPal = infoPalette();
      const anchorHtml = infoCard(
        `<div style="font-weight:600;font-size:13px;color:${anchorPal.link};">📍 ${escapeHtml(anchorName || tr('map.youAreHere', lang))}</div>
         <div style="font-size:12px;color:${anchorPal.sub};margin-top:2px;font-style:italic;">${escapeHtml(tr('map.yourAnchor', lang))}</div>`);
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
    let resultNo = 0;
    for (const v of venues || []) {
      resultNo += 1; // counts every venue so numbers match the result list
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
      // v0.61.70 — the pin is a numbered circle: the venue's 1-based
      // rank in the current search results / first load.
      // v0.62.542 — colour-coded by status/attribute (closed grey · closing-soon
      // pink · Michelin red · open green).
      const pinNode = cuisinePinNode(resultNo, pinColor(v));
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: v.lat, lng: v.lng },
        title: v.name,                                    // native browser tooltip (desktop hover)
        content: pinNode,
        // v0.61.91 — result droplets sit above every overlay layer
        // (train stations / pins) so they are never occluded.
        zIndex: 1000,
        gmpClickable: true                                // enable click + DOM events on the pin
      });
      // v0.58.51 / v0.58.52: hover preview via InfoWindow. Desktop only.
      // Now shows venue name (bold) + 📇 address + 🚊/🚘 travel times
      // per Human Lead. Travel-time fields populated server-side via
      // travel-times.enrichTravelTimes (TRANSIT + DRIVE Routes calls).
      // v0.61.22 — theme palette so secondary text reads in dark mode.
      const p = infoPalette();
      const addressHtml = v.area
        ? `<div style="font-size:12px;color:${p.sub};margin-top:2px;">📇 ${escapeHtml(v.area)}</div>`
        : '';
      const travelParts = [];
      if (Number.isFinite(v.transitMinutes)) travelParts.push(`🚊 ${v.transitMinutes} min`);
      if (Number.isFinite(v.driveMinutes))   travelParts.push(`🚘 ${v.driveMinutes} min`);
      const travelHtml = travelParts.length
        ? `<div style="font-size:12px;color:${p.sub};margin-top:3px;">${travelParts.join(' · ')}</div>`
        : '';
      const ratingHtml = Number.isFinite(v.rating)
        ? `<div style="font-size:12px;color:${p.sub};margin-top:2px;">⭐ ${v.rating.toFixed(1)}${Number.isFinite(v.userRatingCount) ? ` (${v.userRatingCount})` : ''}</div>`
        : '';
      // v0.59.0: footfall chip (real per-venue busyness from BestTime,
      // populated server-side via footfall-signal.attachFootfallSignals).
      let footfallHtml = '';
      if (v.footfall) {
        const live = v.footfall.liveBusyness;
        const fc   = v.footfall.forecastNext;
        const value = Number.isFinite(live) ? live : (Number.isFinite(fc) ? fc : null);
        if (value != null) {
          const verb = tr(Number.isFinite(live) ? 'mp.busyNow' : 'mp.forecast', lang);
          const peak = v.footfall.peakHour
            ? ` · ${tr('mp.peaks', lang)} ${escapeHtml(v.footfall.peakHour)}`
            : '';
          footfallHtml = `<div style="font-size:12px;color:${p.sub};margin-top:3px;">🚦 ${value}% ${verb}${peak}</div>`;
        }
      }
      // v0.61.31 — every map pin popup ends with the standard
      // "Google Map ↗" text hyperlink (no blue button). The global
      // `window.__giaOpenMap(placeId)` handler routes through
      // openInGoogleMaps for proper Telegram WebApp deep-linking.
      const ctaHtml = `<div style="margin-top:6px;"><a href="#" onclick="window.__giaOpenMap('${escapeHtml(v.placeId || '')}'); return false;" style="color:${p.link};font-size:12px;font-weight:600;text-decoration:underline;cursor:pointer;">${escapeHtml(tr('card.googleMap', lang))} ↗</a></div>`;
      // v0.62.0 — HPB Healthier Choice + inside-building rows.
      const healthierHtml = v.healthierChoice
        ? `<div style="font-size:12px;color:${p.good};margin-top:3px;">🥗 ${escapeHtml(tr('card.healthierChoice', lang))}</div>`
        : '';
      const buildingHtml = v.insideBuilding
        ? `<div style="font-size:12px;color:${p.sub};margin-top:3px;">🏢 ${escapeHtml(tr('card.insideBuilding', lang))}</div>`
        : '';
      // v0.62.106 — keep the inner HTML so the transit block can be appended
      // (SG, zoom ≥ 14) once showVenueTransit resolves.
      // v0.62.850 — the same two "how to say it" lines the result card carries. The popup
      // was never wired for them, so a Japanese reader got the guide on the card below and
      // nothing on the marker they had just tapped. Read straight from the client cache
      // (App batches one /api/pronounce call for the page), so this costs no request and
      // renders nothing when there is nothing to show.
      // Read from the SAME projection the cards use, so the marker and the card below it
      // can never disagree; the module cache is the fallback for a marker built before
      // App's first render (e.g. the shared-link path, which has no venue list).
      const sayOf = (n) => (pronunciations && pronunciations.get(n)) || cachedPronunciation(n, lang);
      const nameSay = sayOf(v.name || '');
      const sayHtml = nameSay
        ? `<div style="font-size:12px;color:${p.sub};margin-top:2px;">🌐 ${escapeHtml(nameSay)}</div>`
        : '';
      const vStreet = streetOf(v.area || '');
      const vStreetSay = vStreet ? sayOf(vStreet) : null;
      const streetSayHtml = (vStreetSay && vStreetSay !== vStreet)
        ? `<div style="font-size:12px;color:${p.sub};margin-top:2px;">🌐 ${escapeHtml(vStreetSay)}</div>`
        : '';
      const innerHtml =
        `<div style="font-weight:600;font-size:13px;">${escapeHtml(v.name || '')}</div>
         ${sayHtml}${addressHtml}${streetSayHtml}${footfallHtml}${travelHtml}${ratingHtml}${healthierHtml}${buildingHtml}${ctaHtml}`;
      const infoHtml = infoCard(innerHtml);
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
      // v0.62.114 — operator: tapping a venue pin INSIDE the TMA must open the
      // in-app info card, never jump out to the Google Maps app. The prior
      // touch-vs-desktop split (v0.58.51/54) sent every NON-touch click straight
      // to openInGoogleMaps(v) — so on Telegram Desktop (or any device not
      // detected as touch) a pin tap left the Mini App. That's wrong on every
      // platform. Always open the InfoWindow preview; it already carries the
      // explicit "Google Map ↗" CTA (window.__giaOpenMap) for users who do want
      // to leave. Mirrors the result-card tap path and the Hawker TMA.
      // v0.62.589 — a pin tap now just sets focusedPlaceId; the unified focus
      // effect above runs the whole flow (pan → zoom → pause → InfoWindow + blink),
      // exactly like a card tap. (Was: opened the popup in place with no pan/zoom.)
      marker.addListener('click', () => {
        onPinTap?.(v.placeId);
      });
      markersRef.current.push(marker);
      if (v.placeId) markerByIdRef.current.set(v.placeId, { marker, infoHtml, innerHtml, lat: v.lat, lng: v.lng });
      bounds.extend({ lat: v.lat, lng: v.lng });
    }
    // v0.58.16: reverted v0.58.15's "extend bounds with radius circle"
    // experiment. At radius 40 km+ the cardinal points pulled the map
    // into a regional/satellite view (Strait + Riau visible, no
    // streets) which was the opposite of useful — users want to see
    // their location and the venues around them, not the full search
    // radius they could theoretically search. Map fits venues + user
    // marker only; the slider value still feeds the search query.
    if (venues?.length || userLoc) {
      // v0.61.107 — operator: the first load and every new search
      // re-position the map; a re-render with the same `venues`
      // (e.g. userLoc resolved) only recenters, keeping the zoom.
      // v0.61.114 — operator: lock zoom to exactly 11 on first load
      // and every new search, and centre on the centroid (geometric
      // mean) of the result pins rather than fitBounds-framing them.
      // Replaces the v0.61.110 maxZoom-11 ceiling + fitBounds(60px)
      // pattern; the previous "show all results inside a 60px frame"
      // behaviour is gone by operator choice ("don't centralised map,
      // show the results in view without the frame"). Anchor pin is
      // intentionally NOT in the centroid so the camera tracks the
      // result cluster, not the search anchor — operator picked
      // "geometric mean of result pins" over the searchCenter option.
      // No results yet (initial paint) falls back to searchCenter /
      // userLoc so the map still positions at z11 over the user.
      let center = null;
      if (venues?.length) {
        let sumLat = 0, sumLng = 0, n = 0;
        for (const v of venues) {
          if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
          sumLat += v.lat;
          sumLng += v.lng;
          n += 1;
        }
        if (n > 0) center = { lat: sumLat / n, lng: sumLng / n };
      }
      if (!center) center = searchCenter || userLoc;

      // v0.61.320 — did the search anchor move since our last sync? (OTHER
      // city pick / /location override with the SAME venues array.)
      const scLat = searchCenter?.lat;
      const scLng = searchCenter?.lng;
      const searchCenterChanged = Number.isFinite(scLat) && Number.isFinite(scLng)
        && (lastSearchCenterRef.current?.lat !== scLat || lastSearchCenterRef.current?.lng !== scLng);

      if (center) {
        if (lastFitVenuesRef.current !== venues) {
          // New result set → frame its centroid at z11 (existing behaviour).
          lastFitVenuesRef.current = venues;
          // v0.62.542 — operator: OUTSIDE Singapore the 3rd ring sits at the
          // farthest result, which a centroid/z12 frame can leave off-screen. On
          // a NEW search, fit the map to that ring's extent (anchor ± farthest)
          // so all three rings are visible. SG keeps the centroid/z12 framing
          // (its reach ring is capped ~6 stops, already near). A manual zoom-in
          // can still crop it — expected.
          const ringAnchor = searchCenter || userLoc;
          let framedByRing = false;
          if ((region || 'SG') !== 'SG' && ringAnchor
            && Number.isFinite(ringAnchor.lat) && Number.isFinite(ringAnchor.lng)
            && window.google?.maps) {
            const far = farthestResultDist(ringAnchor.lat, ringAnchor.lng, venues);
            if (far > 2000) {   // there IS a 3rd ring (NON_SG_RING2_M = 2000 m)
              const dLat = far / 111320;
              const dLng = far / (111320 * Math.cos(ringAnchor.lat * Math.PI / 180));
              const b = new window.google.maps.LatLngBounds();
              b.extend({ lat: ringAnchor.lat + dLat, lng: ringAnchor.lng });
              b.extend({ lat: ringAnchor.lat - dLat, lng: ringAnchor.lng });
              b.extend({ lat: ringAnchor.lat, lng: ringAnchor.lng + dLng });
              b.extend({ lat: ringAnchor.lat, lng: ringAnchor.lng - dLng });
              mapRef.current.fitBounds(b, 40);
              framedByRing = true;
            }
          }
          if (!framedByRing) {
            mapRef.current.setCenter(center);
            mapRef.current.setZoom(12);   // v0.62.132 — default result zoom 11→12
          }
        } else if (searchCenterChanged) {
          // v0.61.320 — anchor picked but no fresh search yet: follow the
          // pick to the city centre instead of sitting on the stale venue
          // centroid. City-level zoom so the user sees they've moved.
          mapRef.current.setCenter({ lat: scLat, lng: scLng });
          if (mapRef.current.getZoom && mapRef.current.getZoom() > 13) {
            mapRef.current.setZoom(13);
          }
        } else {
          mapRef.current.panTo(center);
        }
      }
      if (Number.isFinite(scLat) && Number.isFinite(scLng)) {
        lastSearchCenterRef.current = { lat: scLat, lng: scLng };
      }
    }

    // v0.62.537 — distance rings centred on the search anchor, shown WHENEVER
    // results are on the map. The 750 m walkable ring always draws (near the
    // anchor); the 🚆 2-MRT-stops ring self-suppresses off the MRT network (the
    // helper gates on nearest-station distance), so non-SG regions show only the
    // walk ring. Cleared when there are no results.
    const ringCentre = searchCenter || userLoc;
    if (ringLayerRef.current) {
      if (venues?.length && ringCentre
        && Number.isFinite(ringCentre.lat) && Number.isFinite(ringCentre.lng)) {
        // v0.62.538 — pass the result pins so the ring layer can add a capped
        // "reach" train ring (#.#km · ~N stops) when a result falls beyond the
        // 2-stop ring.
        // v0.62.540 — pass the region flag: inside SG rings 2/3 are the computed
        // MRT-stop rings; outside SG they become plain distance rings (2 km +
        // farthest result, no glyph) since there's no MRT network there.
        const resultPts = venues
          .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng))
          .map((v) => ({ lat: v.lat, lng: v.lng }));
        // v0.62.543 — label unit follows the searched country (km vs miles).
        ringLayerRef.current.draw(
          { lat: ringCentre.lat, lng: ringCentre.lng }, resultPts,
          (region || 'SG') === 'SG', distanceUnit(region, countryPref)
        );
      } else {
        ringLayerRef.current.clear();
      }
    }
  }

  // v0.58.29: "Show your location" recenter affordance. Mirrors the
  // Google Maps native button — pans the viewport to userLoc and
  // sets a sensible neighbourhood-level zoom. No-op when userLoc
  // hasn't resolved.
  function handleRecenterClick() {
    if (!mapRef.current || !userLoc) return;
    mapRef.current.panTo({ lat: userLoc.lat, lng: userLoc.lng });
    if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
  }

  // v0.61.36 — in-map control config (shared shape across the 3 TMAs).
  // Row 1 = always-visible toggle pills; the "⋯/⋮" dropdown = the
  // checkbox layer list. Bus Stop / 24 hours render disabled (no data
  // yet); Colour toggles the greyscale map filter.
  // v0.61.51 — Train Line promoted from the dropdown into the row;
  // Attractions demoted into the dropdown above Park.
  // v0.61.88 — `disabled: jb` greys out every overlay toggle in the
  // Johor Bahru region (the layers are Singapore-only — see above).
  // v0.61.159 — broaden the disabled flag to any non-SG region so the
  // new MY-PUT (Putrajaya) pill also greys these out. Rule §2.10 +
  // §2.5 (TMA toggle gate for non-SG).
  // v0.61.219 — `isOther` (region === 'OTHER') ALSO disables every
  // toggle, carpark included. JB / MY-PUT keep their carpark toggle
  // enabled (Places fallback) as before.
  const rowToggles = [
    { key: 'train',       icon: '🚉', label: tr('layer.train', lang), disabled: isNonSg || isOther },
    // v0.61.168 — carpark toggle enabled in non-SG: the layer now
    // falls back to Google Places (5 km around the anchor) via the
    // v0.61.158 backend endpoint + v0.61.168 controller wiring.
    // v0.61.219 — OTHER region forces it off (anchor too coarse).
    { key: 'carpark',     icon: '🅿️', label: tr('layer.carpark', lang), disabled: isOther },
    { key: 'busstop',     icon: '🚌', label: tr('layer.busstop', lang), disabled: isNonSg || isOther },
    // v0.62.184 — operator: 🍚 Hawker centres surrounding the results (SG-only
    // dataset; radius-clipped client-side so only nearby centres show).
    { key: 'hawker',      icon: '🍚', label: tr('layer.hawker', lang), disabled: isNonSg || isOther }
  ];
  const menuToggles = [
    { key: 'exits',       icon: '',   label: tr('layer.exits', lang), disabled: isNonSg || isOther },
    { key: 'taxis',       icon: '🚕', label: tr('layer.taxis', lang), disabled: isNonSg || isOther },
    { key: 'attractions', icon: '⚝', label: tr('layer.attractions', lang), disabled: isNonSg || isOther },
    { key: 'parks',       icon: '🌳', label: tr('layer.parks', lang), disabled: isNonSg || isOther },
    { key: 'police',  icon: '👮', label: tr('layer.police', lang), disabled: isNonSg || isOther },
    { key: 'clinics', icon: '💊', label: tr('layer.clinics', lang), disabled: isNonSg || isOther },
    { key: 'hospitals', icon: '🏥', label: tr('layer.hospitals', lang), disabled: isNonSg || isOther }
  ];

  return (
    /* v0.62.190 — operator (full-redesign): in horizontal mode the map is
       FULL-BLEED and FILLS the viewport behind a floating glass dock (no white
       band). `fill` makes the wrapper a flex-1 child + edge-to-edge (drops the
       rounded card frame + gutters). Vertical mode keeps the framed fixed-height
       card so the scrolling list reads below it.
       v0.62.691 — expandedOverlay: the ⇲ in the previously-hidden case promotes
       the map to a full-viewport overlay.
       v0.62.699 — CORRECTION, operator: "why the footer is gone and the card".
       v0.62.691 set z-[35], copied from Hawker's v0.62.627 fix along with its
       reasoning — "clears the carousel (z-30) while staying under the footer
       dock (z-40)". That reasoning is true in HAWKER and false here: Cuisine's
       footer dock is `fixed inset-x-0 bottom-0 z-30` (App.jsx:5582), NOT z-40.
       So 35 cleared the carousel AND the footer, and both disappeared behind the
       expanded map. The value was ported without re-checking the stack it was
       being ported into.
       z-20 instead: the map grows to the full viewport but paints BELOW the
       carousel, the footer and the sticky header (all z-30), so — per the
       operator — "the card and footer are important despite the google map being
       expand". Their wrappers are pointer-events-none, so the map stays draggable
       in the gaps between them. */
    <div className={expandedOverlay
      ? 'fixed inset-0 z-20 overflow-hidden bg-tg-card'
      : (fill
        ? 'flex-1 min-h-[60vh] -mx-3 md:-mx-6 lg:-mx-8 overflow-hidden relative bg-tg-card'
        : 'rounded-lg border border-tg-border bg-tg-card overflow-hidden relative')}>
      {/* v0.58.17: map height scales with viewport (phone ~240 px floor; tablet/
          desktop taller).
          v0.62.191 — operator: the map looked SQUEEZED. Root cause: a percentage
          height inside a flex-grow item does NOT resolve in Telegram's webview, so
          the fill-mode map collapsed to its 240 px floor with empty card space
          below. Fill the flex-1 box with ABSOLUTE inset-0 instead (reliable
          regardless of percentage-height resolution); the wrapper also carries a
          60vh floor so the map is always tall. */}
      <div
        ref={containerRef}
        className={`${overlayLayers && overlayLayers.colour === false ? 'gia-greyscale-map' : ''} ${fill ? 'absolute inset-0' : ''}`.trim() || undefined}
        style={fill
          ? { width: '100%', height: '100%' }
          : {
              width: '100%',
              // v0.62.155 — operator: fill the white space below the map. Grow the
              // map so it reaches down toward the footer FABs (mobile 50→66vh).
              // v0.62.567 — `frameHeight` overrides it (the portrait two-panel pins
              // a compact ~40vh map so the two-column list gets the rest).
              height: expanded ? '90vh' : (frameHeight || (isTablet ? 'min(720px, 68vh)' : 'min(620px, 66vh)')),
              minHeight: 240
            }}
      />
      {/* v0.63.1 — custom map-control row, top-right: zoom +/- and the
          expand toggle. v0.61.9 — horizontal row, smaller buttons.
          Theme-adaptive (tg-card / tg-text flip with the Telegram
          light/dark theme). Replaces Google's native zoom control. */}
      {/* v0.61.51 — nav cluster shifted to top-12 so the quick-button
          row has clean horizontal space. v0.61.59 — the Colour-mode
          pill moved out of this cluster into the quick-toggle row
          (after Bus Stop); the cluster is now Reset / + / − / expand.
          v0.62.163 — operator: moved to the LEFT edge (left-2) so the 5-button
          column starts nearer the top-left corner; still top-12, which clears
          the MapControls toggle row (top-2). */}
      <div className="absolute top-12 left-2 flex flex-col gap-1 z-10">
        {/* v0.61.37 — Reset: recenter to the search anchor / default view. */}
        <button
          type="button"
          onClick={() => {
            mapRef.current?.setCenter(searchCenter || userLoc || { lat: 1.3521, lng: 103.8198 });
            mapRef.current?.setZoom(14);
          }}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-[11px] font-bold leading-none active:scale-95"
          aria-label={tr('map.reset', lang)}
          title={tr('map.reset', lang)}
        ><span aria-hidden>{zoomLevel != null ? Math.round(zoomLevel) : '⟲'}</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 14) + 1)}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={tr('map.zoomIn', lang)}
        ><span aria-hidden>＋</span></button>
        {/* v0.62.133 — "centre map" (↹). v0.62.270 — operator: this now RECENTRES
            on the user's GPS location (the old 🔭 button's job; 🔭 removed, its
            zoom number moved onto the Reset button). Disabled when no GPS fix. */}
        <button
          type="button"
          onClick={handleRecenterClick}
          disabled={!userLoc}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95 disabled:opacity-40"
          aria-label={tr('btn.showLocation', lang)}
          title={tr('btn.showLocation', lang)}
        ><span aria-hidden>↹</span></button>
        <button
          type="button"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 14) - 1)}
          className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
          aria-label={tr('map.zoomOut', lang)}
        ><span aria-hidden>－</span></button>
        {/* v0.62.190 — the expand/collapse toggle was hidden in fill mode (the map
            already fills the viewport, so it "would be a no-op button").
            v0.62.567 — portrait two-panel: when `onExpandFull` is wired the ⇲ jumps
            straight to the full carousel (App flips drawerMode) instead of the
            internal grow; and in fill/carousel mode the button REAPPEARS as ⇱ when
            `onCollapse` is wired, to collapse back to the two-panel.
            v0.62.691 — operator: the button is MISSING on the phone. It is: that
            case (fill, no onCollapse) is the one v0.62.190 hid. Hiding it is the
            same mistake Transport (v0.62.626) and Hawker (v0.62.627) were each
            bug-reported for; both were fixed by giving the button a real action.
            The gate is removed — the button now ALWAYS renders — and the formerly
            no-op case toggles a full-viewport overlay (canOverlay/overlayFull). */}
        {(() => {
          const showCollapse = expandedOverlay || (!canOverlay && (fill || (expanded && !onExpandFull)));
          return (
            <button
              type="button"
              onClick={() => {
                if (canOverlay) { setOverlayFull((v) => !v); }   // was hidden; now a real overlay
                else if (fill) { onCollapse && onCollapse(); }
                else if (onExpandFull) { onExpandFull(); }
                else { setExpanded((e) => !e); }
              }}
              className="gia-hit-x gia-map-btn w-7 h-7 rounded-full border shadow-md flex items-center justify-center text-base font-bold leading-none active:scale-95"
              aria-label={tr(showCollapse ? 'map.collapse' : 'map.expand', lang)}
              title={tr(showCollapse ? 'map.collapse' : 'map.expand', lang)}
            ><span aria-hidden>{showCollapse ? '⇱' : '⇲'}</span></button>
          );
        })()}
      </div>
      {/* v0.61.36 — Phase G/C floating toggle row + "⋯/⋮" overflow dropdown. */}
      <MapControls
        layers={effectiveLayers || {}}
        onToggleLayer={(key) => onOverlayChange?.({
          ...(overlayLayers || {}), [key]: !(overlayLayers || {})[key]
        })}
        rowToggles={rowToggles}
        menuToggles={menuToggles}
        menuLabel={tr('map.more', lang)}
        colourToggle={{
          on: overlayLayers?.colour !== false,
          label: tr(overlayLayers?.colour !== false ? 'layer.colour.on' : 'layer.colour.off', lang),
          onToggle: () => onOverlayChange?.({ ...(overlayLayers || {}), colour: !(overlayLayers || {}).colour })
        }}
      />
      {/* v0.62.270 — operator: the 🔭 zoom-readout/recentre button was removed.
          The live zoom number now shows on the Reset button (top-left cluster),
          and GPS-recentre moved to the ↹ button. */}
      {children}
    </div>
  );
}
