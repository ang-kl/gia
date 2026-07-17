// distance-rings.js — v0.62.537
//
// Concentric distance-ring overlay shared by the Cuisine + Hawker Mini Apps.
// Draws, on the Google map, two dashed rings centred on a point:
//
//   1. a fixed 750 m "walkable" ring        → 🚶 750m
//   2. a "2 MRT stops away" ring, sized from real station data → 🚆 #.#km
//
// Reference: operator's IMG_3014.jpeg (concentric dashed rings, walk + MRT).
// Both rings share ONE line style (colour / weight / dash) so they read as a
// set. Each ring carries a small pill label on its north edge: a mode icon
// (🚶 / 🚆) + the ring distance (###m under 1 km, else #.#km).
//
// The "2 MRT stops away" radius is COMPUTED (operator choice, 15-07-26): find
// the operational station nearest the centre, walk ±2 stops along each of its
// lines (line code = prefix + sequence number, so ±2 in the per-line
// operational order is exactly two stops), and take the mean straight-line
// distance from the centre to those 2-stops-away stations. The MRT ring is
// suppressed when the centre isn't genuinely near the MRT network (nearest
// station > MRT_GATE_M) — e.g. Cuisine's non-SG regions — so only the walk ring
// shows there.
//
// Self-contained: no per-TMA imports (so it lives in web/_shared/ and both TMAs
// import the ONE copy). It reads the shared operational-station list, which the
// generator (scripts/gen-cuisine-stations.mjs) emits alongside the Cuisine one.

import { SG_STATIONS } from './mrt-stations.generated.js';

const WALK_RADIUS_M = 750;        // operator: 750 m walkable ring
const MRT_STOPS = 2;              // "2 MRT stops away"
const MRT_GATE_M = 2000;          // draw the MRT ring only when centre is this near a station
const MIN_MRT_OVER_WALK = 1.08;   // and only when it's meaningfully bigger than the walk ring
const REACH_CAP_STOPS = 6;        // cap the outer "reach" ring at ~6 stops so one far result can't balloon it
const REACH_MIN_OVER_2STOP = 1.15;// and only draw it when clearly bigger than the 2-stop ring
// v0.62.540 — OUTSIDE Singapore there's no MRT network (and the station list is
// SG-only), so rings 2 + 3 become plain distance rings, no train/walk icon:
// ring 2 fixed at 2 km, ring 3 at the farthest result.
const NON_SG_RING2_M = 2000;      // fixed middle ring outside SG
// v0.62.543 — a big ring's single north label can sit far off the visible arc,
// so rings wider than this get a distance label on all four sides (N/E/S/W).
const LARGE_RING_M = 8000;        // operator: "above 8 km → indicate on four sides"
// v0.62.586 — non-SG tiered outer rings (operator, Brisbane): when the results
// spread wide (farthest pin > TIER_TRIGGER_M) replace the single farthest ring
// with up to THREE band rings — ring 3 on the farthest pin in (2 km, 10 km],
// ring 4 in (10 km, 20 km], ring 5 in (20 km, ∞) — so the pin distribution reads
// at a glance. Below the trigger the single farthest ring (ring 3) stays.
const TIER_TRIGGER_M = 20000;     // only tier when the farthest pin exceeds 20 km
const TIER_BAND_1_M = 10000;      // ring 3 upper edge: farthest pin within 10 km
const TIER_BAND_2_M = 20000;      // ring 4 upper edge: farthest pin within 20 km
const M_PER_MILE = 1609.344;
const M_PER_FOOT = 0.3048;

// Shared line style for both rings (neutral grey — reads on colour + greyscale maps).
const RING_COLOR = '#5f6368';
const RING_WEIGHT = 2;
const RING_OPACITY = 0.95;
const CIRCLE_POINTS = 72;         // polyline segments approximating the circle
const EARTH_R = 6371000;

function toRad(d) { return (d * Math.PI) / 180; }
function toDeg(r) { return (r * 180) / Math.PI; }

// Great-circle distance in metres.
function metresBetween(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Destination point `distM` metres from (lat,lng) along `bearingRad`.
function destPoint(lat, lng, distM, bearingRad) {
  const latR = toRad(lat);
  const lngR = toRad(lng);
  const dR = distM / EARTH_R;
  const lat2 = Math.asin(
    Math.sin(latR) * Math.cos(dR) + Math.cos(latR) * Math.sin(dR) * Math.cos(bearingRad)
  );
  const lng2 = lngR + Math.atan2(
    Math.sin(bearingRad) * Math.sin(dR) * Math.cos(latR),
    Math.cos(dR) - Math.sin(latR) * Math.sin(lat2)
  );
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

// Points around a circle of `radiusM`, first point repeated to close the ring.
function circlePath(lat, lng, radiusM) {
  const pts = [];
  for (let i = 0; i <= CIRCLE_POINTS; i++) {
    pts.push(destPoint(lat, lng, radiusM, (2 * Math.PI * i) / CIRCLE_POINTS));
  }
  return pts;
}

// "NS10" → { line:"NS", num:10 }; null for anything that isn't prefix + digits.
function parseCode(code) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(String(code || '').trim());
  return m ? { line: m[1].toUpperCase(), num: Number(m[2]) } : null;
}

// Per-line operational-station order, built once. Map line → array of
// { st, num } sorted ascending by sequence number.
let _lineOrder = null;
function lineOrder() {
  if (_lineOrder) return _lineOrder;
  const byLine = new Map();
  for (const st of SG_STATIONS) {
    for (const code of (Array.isArray(st.c) ? st.c : [])) {
      const p = parseCode(code);
      if (!p) continue;
      if (!byLine.has(p.line)) byLine.set(p.line, []);
      byLine.get(p.line).push({ st, num: p.num });
    }
  }
  for (const arr of byLine.values()) arr.sort((a, b) => a.num - b.num);
  _lineOrder = byLine;
  return _lineOrder;
}

// Operational station nearest to (lat,lng), with its distance.
function nearestStation(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const st of SG_STATIONS) {
    const d = metresBetween(lat, lng, st.lat, st.lng);
    if (d < bestD) { bestD = d; best = st; }
  }
  return best ? { st: best, distM: bestD } : null;
}

// Compute the "2 MRT stops away" ring radius (metres) for a centre point, plus
// the label text. Returns null when the centre isn't near the MRT network.
//
// For each line the nearest station sits on, we step ±MRT_STOPS positions in
// that line's operational order (index-based, so non-operational gaps are
// already skipped) and measure the straight-line distance from the CENTRE to
// each 2-stops-away station. The radius is the mean of those distances — a
// balanced single-radius stand-in for a 2-stop reach in either direction.
export function mrtTwoStopRadius(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const near = nearestStation(lat, lng);
  if (!near || near.distM > MRT_GATE_M) return null;
  const order = lineOrder();
  const dists = [];
  for (const code of (Array.isArray(near.st.c) ? near.st.c : [])) {
    const p = parseCode(code);
    if (!p) continue;
    const arr = order.get(p.line);
    if (!arr) continue;
    const idx = arr.findIndex((e) => e.st === near.st);
    if (idx < 0) continue;
    for (const j of [idx - MRT_STOPS, idx + MRT_STOPS]) {
      if (j < 0 || j >= arr.length) continue;
      dists.push(metresBetween(lat, lng, arr[j].st.lat, arr[j].st.lng));
    }
  }
  if (!dists.length) return null;
  const radiusM = dists.reduce((a, b) => a + b, 0) / dists.length;
  return { radiusM, label: formatDist(radiusM) };
}

// Distance label, unit-aware (operator: "some countries use miles").
//   unit 'km' (default): ###m below 1 km (rounded to 10 m so 750 stays 750), else #.#km.
//   unit 'mi': ###ft below 0.1 mi (rounded to 10 ft), else #.#mi.
// The caller (MapPanel) picks the unit from the searched country.
export function formatDist(m, unit = 'km') {
  if (!Number.isFinite(m)) return '';
  if (unit === 'mi') {
    const miles = m / M_PER_MILE;
    if (miles < 0.1) return `${Math.round((m / M_PER_FOOT) / 10) * 10}ft`;
    return `${miles.toFixed(1)}mi`;
  }
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// Straight-line distance (m) from the centre to the FARTHEST result pin; 0 when
// there are no valid results. Shared by the SG reach ring + the non-SG ring 3.
export function farthestResultDist(lat, lng, results) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 0;
  const pts = (Array.isArray(results) ? results : [])
    .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  let far = 0;
  for (const p of pts) {
    const d = metresBetween(lat, lng, p.lat, p.lng);
    if (d > far) far = d;
  }
  return far;
}

// v0.62.586 — distance (m) to the farthest result pin whose distance falls in the
// half-open band (minM, maxM]; 0 when the band holds no pin. Powers the non-SG
// tiered outer rings (operator spec, Brisbane): once the spread is wide (farthest
// > 20 km) draw one ring PER band, each sitting on the farthest pin within it.
export function farthestResultDistInBand(lat, lng, results, minM, maxM) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 0;
  const pts = (Array.isArray(results) ? results : [])
    .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  let far = 0;
  for (const p of pts) {
    const d = metresBetween(lat, lng, p.lat, p.lng);
    if (d > minM && d <= maxM && d > far) far = d;
  }
  return far;
}

// Outer "reach" ring: sized to enclose the farthest RESULT pin, but capped at
// ~REACH_CAP_STOPS stops so one far-flung result can't balloon it. Only returned
// when at least one result sits beyond the 2-stop ring (and the reach ring is
// clearly bigger than it). `twoStopRadiusM` is the ring-2 radius, which also
// gives the per-stop distance (radius / 2 stops) used to estimate "~N stops".
// Returns null when there's nothing to enclose (all results within 2 stops).
export function mrtReachRadius(lat, lng, results, twoStopRadiusM) {
  if (!Number.isFinite(twoStopRadiusM) || twoStopRadiusM <= 0) return null;
  const far = farthestResultDist(lat, lng, results);
  if (!far) return null;
  if (far <= twoStopRadiusM) return null;              // nothing outside the 2-stop ring
  const perStop = twoStopRadiusM / MRT_STOPS;
  const radiusM = Math.min(far, perStop * REACH_CAP_STOPS);
  if (radiusM <= twoStopRadiusM * REACH_MIN_OVER_2STOP) return null;   // too close to ring 2
  const stops = Math.max(MRT_STOPS + 1, Math.round(radiusM / perStop));
  return { radiusM, stops, label: `${formatDist(radiusM)} (~${stops} stops)` };
}

// The dashed-stroke symbol shared by both ring polylines. Google's Circle only
// draws a SOLID stroke, so the rings are polyline circles with a repeating dash
// icon (the standard dashed-line recipe) to honour the reference's line style.
function dashSymbol(googleMaps) {
  return {
    icon: {
      path: 'M 0,-1 0,1',
      strokeColor: RING_COLOR,
      strokeOpacity: RING_OPACITY,
      strokeWeight: RING_WEIGHT,
      scale: 3
    },
    offset: '0',
    repeat: '12px'
  };
}

// Small pill label pinned on a ring's edge: mode icon + distance.
function ringLabelNode(icon, text) {
  const el = document.createElement('div');
  el.style.cssText =
    'display:inline-flex;align-items:center;gap:3px;'
    + 'background:rgba(255,255,255,0.92);color:#374151;'
    + 'font-size:11px;font-weight:700;line-height:1.4;'
    + 'border-radius:10px;padding:1px 7px;white-space:nowrap;'
    + 'box-shadow:0 1px 2px rgba(0,0,0,0.3);transform:translateY(-50%);';
  // v0.62.540 — icon is optional: outside SG rings 2 + 3 carry the distance only
  // (no walk/train glyph), so an empty icon renders the bare distance.
  el.textContent = icon ? `${icon} ${text}` : text;
  return el;
}

// Factory: a ring layer bound to one Google map. `draw(centre)` (re)draws the
// walk + MRT rings centred on {lat,lng}; `clear()` removes them. The caller owns
// the lifecycle — draw when results/selection appear, clear on tap-out / no
// results. Returns null-safe no-ops when the maps SDK isn't ready.
export function createRingLayer(map, googleMaps) {
  if (!map || !googleMaps || !googleMaps.Polyline) {
    return { draw() {}, clear() {}, destroy() {} };
  }
  const { Polyline } = googleMaps;
  const AdvancedMarkerElement = googleMaps.marker && googleMaps.marker.AdvancedMarkerElement;
  let items = [];

  function clear() {
    for (const it of items) {
      try {
        if (typeof it.setMap === 'function') it.setMap(null);
        else it.map = null;
      } catch { /* already detached */ }
    }
    items = [];
  }

  function drawRing(centre, radiusM, icon, text, fourSide = false) {
    const line = new Polyline({
      path: circlePath(centre.lat, centre.lng, radiusM),
      strokeOpacity: 0,           // stroke drawn entirely by the dash icons
      icons: [dashSymbol(googleMaps)],
      clickable: false,
      zIndex: 5
    });
    line.setMap(map);
    items.push(line);
    if (AdvancedMarkerElement) {
      // v0.62.543 — one north label normally; a large ring (whose north edge can
      // be far off the visible arc) gets a label on all four sides (N/E/S/W).
      // v0.62.586 — the OUTER ring (`fourSide`, the farthest-result / reach ring)
      // ALWAYS gets four labels regardless of size: operator (Brisbane, IMG_0751)
      // "where is the four corners (N/S/E/W) labels of the outer ring" — that ring
      // was 2.9 km (< LARGE_RING_M), so it had shown only the single north label.
      const bearings = (fourSide || radiusM > LARGE_RING_M)
        ? [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
        : [0];
      for (const brg of bearings) {
        const edge = destPoint(centre.lat, centre.lng, radiusM, brg);
        const marker = new AdvancedMarkerElement({
          position: edge,
          content: ringLabelNode(icon, text),
          zIndex: 6
        });
        marker.map = map;
        items.push(marker);
      }
    }
  }

  // draw(centre, results?, isSG?, unit?) — ring 1 (🚶 750 m walk) always draws.
  // `unit` ('km' | 'mi') sets the label unit (from the searched country). Rings 2
  // and 3 depend on region (operator, v0.62.540):
  //   • isSG=true  → ring 2 = 🚆 computed 2-MRT-stops; ring 3 = 🚆 capped "reach"
  //                  ring, drawn iff a result falls beyond ring 2 (as prescribed).
  //   • isSG=false → no MRT network: ring 2 = a plain 2 km ring, ring 3 = a plain
  //                  ring at the farthest result — both distance-only, NO icon.
  // `results` is the {lat,lng} pin array (Cuisine passes its venues; Hawker, SG-
  // only and centred on one hawker, passes none → two rings, no reach).
  function draw(centre, results, isSG = true, unit = 'km') {
    clear();
    if (!centre || !Number.isFinite(centre.lat) || !Number.isFinite(centre.lng)) return;
    drawRing(centre, WALK_RADIUS_M, '🚶', formatDist(WALK_RADIUS_M, unit));
    if (isSG) {
      const mrt = mrtTwoStopRadius(centre.lat, centre.lng);
      if (mrt && mrt.radiusM > WALK_RADIUS_M * MIN_MRT_OVER_WALK) {
        drawRing(centre, mrt.radiusM, '🚆', `${formatDist(mrt.radiusM, unit)} (${MRT_STOPS} stops)`);
        const reach = mrtReachRadius(centre.lat, centre.lng, results, mrt.radiusM);
        if (reach) drawRing(centre, reach.radiusM, '🚆', `${formatDist(reach.radiusM, unit)} (~${reach.stops} stops)`, true);
      }
      return;
    }
    // Outside Singapore — distance-only rings, no glyph. Ring 2 stays a fixed
    // 2 km (labelled in the local unit); the outer ring(s) sit on the result pins,
    // but ONLY when result(s) fall OUTSIDE ring 2 (the results bound them — never
    // drawn inside ring 2).
    const ring2Label = unit === 'mi' ? formatDist(NON_SG_RING2_M, 'mi') : '2km';
    drawRing(centre, NON_SG_RING2_M, '', ring2Label);
    const far = farthestResultDist(centre.lat, centre.lng, results);
    if (far > TIER_TRIGGER_M) {
      // v0.62.586 — wide spread: one ring PER band, each on the farthest pin in it.
      // Ring 3 → (2 km, 10 km], ring 4 → (10 km, 20 km], ring 5 → (20 km, farthest].
      const bands = [
        farthestResultDistInBand(centre.lat, centre.lng, results, NON_SG_RING2_M, TIER_BAND_1_M),
        farthestResultDistInBand(centre.lat, centre.lng, results, TIER_BAND_1_M, TIER_BAND_2_M),
        farthestResultDistInBand(centre.lat, centre.lng, results, TIER_BAND_2_M, Infinity),
      ];
      for (const r of bands) {
        if (r > 0) drawRing(centre, r, '', formatDist(r, unit), true);
      }
    } else if (far > NON_SG_RING2_M) {
      drawRing(centre, far, '', formatDist(far, unit), true);
    }
  }

  return { draw, clear, destroy: clear };
}

// Exported for unit tests.
export const _internal = {
  WALK_RADIUS_M, MRT_STOPS, MRT_GATE_M,
  metresBetween, destPoint, circlePath, parseCode, nearestStation, lineOrder
};
