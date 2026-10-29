// nearby-zones.js — group the current result venues into precinct "zones" for
// the location field's nearby browser.
//
// v1 (operator IMG_2578): SG groups by nearest operational MRT/LRT station
// ("Raffles Place · NS26/EW14"); other regions fall back to a single flat list
// (street + venue), since they have no bundled transit graph yet. Pure client
// side — uses each venue's lat/lng + formatted address; no backend change.

import { t } from './i18n.js';

import { SG_STATIONS } from './mrt-stations.generated.js';

const ZONE_MAX_M = 1200; // a venue further than this from any station → "Nearby"

function haversineM(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearestStation(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best = null;
  for (const s of SG_STATIONS) {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (!best || d < best.distM) best = { name: s.n, codes: s.c, distM: d };
  }
  return best;
}

// Build a visitor-legible address from a Google formatted address: keep the
// meaningful parts (street/building + floor + unit), street-first, and drop only
// the postal code + country. The row truncates with CSS, so this shows as much
// detail as the available width allows (operator: "show street+floor+unit if
// there's space") and clips gracefully when long.
export function streetLabel(area) {
  const segs = String(area || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!segs.length) return '';
  const isUnit = (s) => /^#/.test(s) || /^(level|floor|lobby|unit|storey|l\d|b\d)\b/i.test(s);
  // Drop ONLY trailing country / postal segments (e.g. "Singapore 048616",
  // "Singapore", "048616"). Matching anywhere would wrongly strip real roads
  // like "China Street", so we only pop from the end and never the last segment.
  const COUNTRY = '(singapore|malaysia|indonesia|thailand|vietnam|japan|korea|south korea|china|taiwan|hong kong|philippines)';
  const isTrailDrop = (s) => /^\d{4,6}(\s+\S.*)?$/.test(s) || new RegExp(`^${COUNTRY}(\\s+\\S.*)?$`, 'i').test(s);
  const keep = segs.slice();
  while (keep.length > 1 && isTrailDrop(keep[keep.length - 1])) keep.pop();
  // Move the street/building (first segment with letters that isn't a bare
  // unit/floor) to the front; append the rest (unit, floor) in order.
  const streetIdx = keep.findIndex((s) => !isUnit(s) && /[a-z]/i.test(s));
  if (streetIdx > 0) keep.unshift(keep.splice(streetIdx, 1)[0]);
  return keep.join(', ');
}

function toItem(v) {
  return {
    name: v.name || '',
    street: streetLabel(v.area),
    lat: v.lat,
    lng: v.lng,
    distanceM: Number.isFinite(v.distanceM) ? v.distanceM : null,
  };
}

const byDist = (a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);

// → [{ zone: { name, codes, distM } | null, items: [item] }], zones nearest-first.
export function groupByZone(venues, region) {
  const items = (Array.isArray(venues) ? venues : []).filter((v) => v && v.name).map(toItem);
  if (region !== 'SG') return items.length ? [{ zone: null, items: items.sort(byDist) }] : [];

  const groups = new Map(); // zoneName → { zone, items }
  const NEARBY = '__nearby__';
  for (const it of items) {
    const st = nearestStation(it.lat, it.lng);
    const inZone = st && st.distM <= ZONE_MAX_M;
    const key = inZone ? st.name : NEARBY;
    if (!groups.has(key)) {
      groups.set(key, { zone: inZone ? { name: st.name, codes: st.codes, distM: st.distM } : null, items: [] });
    }
    groups.get(key).items.push(it);
  }
  const out = [...groups.values()];
  out.forEach((g) => g.items.sort(byDist));
  // zones nearest-first by their closest item; the catch-all "Nearby" last.
  out.sort((a, b) => {
    if (!a.zone) return 1;
    if (!b.zone) return -1;
    return (a.items[0]?.distanceM ?? Infinity) - (b.items[0]?.distanceM ?? Infinity);
  });
  return out;
}

export function zoneHeader(zone, lang) {
  if (!zone) return t('nz.nearby', lang);
  const codes = Array.isArray(zone.codes) && zone.codes.length ? ` · ${zone.codes.join('/')}` : '';
  return `${zone.name}${codes}`;
}
