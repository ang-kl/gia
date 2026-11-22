// base-icon-stop.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md, C.
//
// Operator, 22-11 '26: "if user click on the bus stop on the map, possible to show the pin-card", and the stop they
// meant was "Google base-map icon". Google's icons were switched off on all three maps (clickableIcons: false), so a
// tap on one did nothing. They are on now, and a tap on any Google icon comes here:
//   - Google's own popup is always stopped;
//   - an LTA stop within 20 m of the tap means the icon was that bus stop, and our stop card opens on it;
//   - anything else (a shop, a restaurant) is left to do exactly what a tap on empty map does (A7: "Nothing, as today").
// The match uses the LTA catalogue the maps already fetch (/api/geo/bus-stops), so it makes no new call.

import { distM } from './bus-motion.js';

// Google draws its bus icon on the stop, and LTA's coordinates sit within a few metres of it; 20 m takes the stop and
// leaves a shop across the pavement alone.
export const ICON_STOP_RADIUS_M = 20;

// The stop nearest `at` within `maxM` metres, or null.
export function nearestStop(stops, at, maxM = ICON_STOP_RADIUS_M) {
  if (!Array.isArray(stops) || !at || !Number.isFinite(at.lat) || !Number.isFinite(at.lng)) return null;
  let best = null;
  let bestD = Infinity;
  for (const s of stops) {
    if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    const d = distM(at, s);
    if (d <= maxM && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

// A map click. Not a Google icon (no placeId): null, and nothing is touched. A Google icon: its popup is stopped, and
// the answer is a promise of whether `openStopAt` opened a stop card, false on any failure. The caller does what an
// empty-map tap does when it is null or false.
export function handleIconTap(e, openStopAt) {
  if (!e || !e.placeId) return null;
  if (typeof e.stop === 'function') e.stop();
  const ll = e.latLng;
  const at = ll && typeof ll.lat === 'function' ? { lat: ll.lat(), lng: ll.lng() } : ll ? { lat: ll.lat, lng: ll.lng } : null;
  if (typeof openStopAt !== 'function' || !at) return Promise.resolve(false);
  let pending;
  try { pending = openStopAt(at); } catch { return Promise.resolve(false); }
  return Promise.resolve(pending).then((opened) => opened === true).catch(() => false);
}
