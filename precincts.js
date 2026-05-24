// precincts.js — v0.61.122
//
// Single source of truth for the curated "quick-pick" location anchors
// the user can set via `/location` (chat) and (Phase 2) the Menu TMA
// dropdown. Three sources, one shape:
//
//   1. Singapore Tourism Board (STB) — 10 key precincts loaded from
//      `geoloc/stb_key_precincts.geojson` (the file curated by the
//      operator). We compute each polygon's centroid for the search
//      anchor and keep the polygon coords so a future "outside the
//      zone" filter can do point-in-polygon exclusion (Phase 2).
//
//   2. Johor Bahru CBD — hardcoded anchor (Jalan Wong Ah Fook area)
//      with a 30 km search radius cap (matches the existing JB region
//      bbox in the Cuisine TMA).
//
//   3. IOI Resort City, Putrajaya — hardcoded anchor at the
//      62502 Putrajaya area with a 15 km search radius cap. The cap
//      is the operator's explicit constraint: searches anchored here
//      should not reach beyond ~15 km (Putrajaya → Puchong).
//
// Each precinct exposes:
//   { id, label, region, lat, lng, source, polygon?, radiusCapM?,
//     country, description?, keyAttractions? }
//
//   - id: stable kebab-case slug used in callback_data (`locpick:<id>`)
//   - region: 'SG' | 'JB' | 'MY-PUT' — used by region-gated UI (Cuisine
//     TMA's JB toggle, future Menu TMA disable-when-Malaysia logic)
//   - source: 'STB' | 'JB' | 'Putrajaya' — for analytics + display
//   - polygon: STB-only; array of [lng,lat] pairs from the geojson
//   - radiusCapM: when present, hard ceiling on any Places search
//     radius computed from this anchor (clamped client-side in
//     runFreeTextSearch and /api/cuisine/search)

'use strict';

const fs = require('fs');
const path = require('path');

const STB_GEOJSON_PATH = path.join(__dirname, 'geoloc', 'stb_key_precincts.geojson');

// v0.61.123 — Singapore region buckets (CBD + 4 cardinal regions).
// Not in the STB geojson; these are operator-curated centroids of
// each region for use in the Menu TMA dropdown. No polygon (so they
// don't participate in containingPrecinct / pointInPolygon — they're
// pure anchors, not zones). Listed AFTER the 10 STB precincts in
// getAll().
const SG_REGION_BUCKETS = [
  // Raffles Place / Tanjong Pagar area — anchor for any CBD search.
  { id: 'sg-cbd',      label: 'Singapore CBD',     region: 'SG', lat: 1.2845, lng: 103.8519, source: 'region', country: 'Singapore' },
  // Jurong East MRT — central node of the West region (matches
  // hawker-vault.js's "West" zone).
  { id: 'sg-western',  label: 'Singapore Western', region: 'SG', lat: 1.3329, lng: 103.7426, source: 'region', country: 'Singapore' },
  // Bedok MRT — central node of the East region.
  { id: 'sg-eastern',  label: 'Singapore Eastern', region: 'SG', lat: 1.3236, lng: 103.9273, source: 'region', country: 'Singapore' },
  // Yishun MRT — central node of the North region.
  { id: 'sg-north',    label: 'Singapore North',   region: 'SG', lat: 1.4304, lng: 103.8354, source: 'region', country: 'Singapore' },
  // Bishan / Toa Payoh axis — geographic centre of SG.
  { id: 'sg-central',  label: 'Singapore Central', region: 'SG', lat: 1.3503, lng: 103.8485, source: 'region', country: 'Singapore' }
];

// Hardcoded Malaysia anchors. Kept here (not in geojson) because the
// geojson is STB-only and these don't have STB polygons.
const MALAYSIA_ANCHORS = [
  {
    id: 'jb',
    label: 'Johor Bahru',
    region: 'JB',
    // City Square / Jalan Wong Ah Fook — standard JB CBD anchor used
    // by the existing /api/cuisine/search JB fallback (index.js).
    lat: 1.4927,
    lng: 103.7414,
    source: 'JB',
    country: 'Malaysia',
    radiusCapM: 30000,
    description: 'Johor Bahru — checkpoint side of the Causeway.'
  },
  {
    id: 'ioi-resort-putrajaya',
    label: 'IOI Resort City, Putrajaya',
    region: 'MY-PUT',
    // IOI Resort City, 62502 Putrajaya — the operator's specified
    // anchor; perimeter capped to 15 km (covers Putrajaya → Puchong).
    lat: 2.9742,
    lng: 101.7060,
    source: 'Putrajaya',
    country: 'Malaysia',
    radiusCapM: 15000,
    description: 'IOI Resort City (62502 Putrajaya). Searches capped to 15 km — covers Putrajaya → Puchong.'
  }
];

function _idFromName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Centroid of a polygon ring (simple arithmetic mean — fine for the
// small SG precincts we have; for a geographically-accurate centroid
// of an irregular shape we'd use the shoelace formula, but the STB
// precincts are near-rectangular and the mean is well within the
// 100-300 m granularity the search anchor needs).
function _centroid(ring) {
  let sumLng = 0, sumLat = 0, n = 0;
  for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; n++; }
  if (n === 0) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}

let _stbCache = null;
function _loadStbPrecincts() {
  if (_stbCache) return _stbCache;
  try {
    const raw = fs.readFileSync(STB_GEOJSON_PATH, 'utf8');
    const fc = JSON.parse(raw);
    const out = [];
    for (const f of (fc.features || [])) {
      const p = f.properties || {};
      const ring = f.geometry?.coordinates?.[0];
      if (!Array.isArray(ring) || !ring.length) continue;
      const centroid = _centroid(ring);
      if (!centroid) continue;
      const id = _idFromName(p.name) || p.precinct_id || `stb-${out.length + 1}`;
      out.push({
        id,
        label: p.name || id,
        region: 'SG',
        lat: centroid.lat,
        lng: centroid.lng,
        source: 'STB',
        country: 'Singapore',
        description: p.description || null,
        keyAttractions: Array.isArray(p.key_attractions) ? p.key_attractions : [],
        polygon: ring
      });
    }
    _stbCache = out;
  } catch (err) {
    console.warn('[precincts] STB geojson load failed:', err.message);
    _stbCache = [];
  }
  return _stbCache;
}

function getStbPrecincts() {
  return _loadStbPrecincts().slice();
}

function getSgRegionBuckets() {
  return SG_REGION_BUCKETS.slice();
}

function getMalaysiaAnchors() {
  return MALAYSIA_ANCHORS.slice();
}

// Full list — STB precincts followed by Malaysia anchors. Order is
// the operator-preferred display order in the /location button grid.
// NOTE the 5 SG region buckets are NOT in this list — they're for the
// Menu TMA dropdown only, where the operator wants the broader
// CBD/West/East/North/Central choices alongside the named STB
// precincts. Chat /location stays focused on STB-named precincts +
// Malaysia anchors.
function getAll() {
  return [...getStbPrecincts(), ...getMalaysiaAnchors()];
}

// v0.61.123 — full dropdown list for the Menu TMA: STB precincts +
// SG region buckets + Malaysia anchors. 10 + 5 + 2 = 17 entries.
function getMenuDropdown() {
  return [...getStbPrecincts(), ...getSgRegionBuckets(), ...getMalaysiaAnchors()];
}

function getById(id) {
  if (!id) return null;
  const norm = String(id).toLowerCase().trim();
  // v0.61.123 — search across the FULL menu dropdown (includes region
  // buckets) so the Menu TMA can resolve "sg-cbd" etc. while chat
  // /location quick-picks (which use getAll()) keep their existing
  // 12-entry resolution.
  for (const p of getMenuDropdown()) {
    if (p.id === norm) return p;
  }
  return null;
}

// Ray-casting point-in-polygon. ring is [[lng,lat], …]. Used by the
// future "outside the zone" filter; exposed now so callers don't have
// to re-implement it. Returns true when (lat, lng) lies inside the
// polygon (boundary considered inside for the diagonals).
function pointInPolygon(lat, lng, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = [ring[i][0], ring[i][1]];
    const [xj, yj] = [ring[j][0], ring[j][1]];
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Convenience: which precinct (if any) contains (lat, lng)?
// Iterates STB precincts only (Malaysia anchors have no polygon).
function containingPrecinct(lat, lng) {
  for (const p of getStbPrecincts()) {
    if (p.polygon && pointInPolygon(lat, lng, p.polygon)) return p;
  }
  return null;
}

// Apply a radius cap from the user's cached location, if present.
// Used by callers that produce a `radius` for pipeline.discover and
// want to respect Malaysia anchors' tighter search bounds. When the
// user has no anchor or the anchor has no cap, returns `requested`.
function effectiveRadius(loc, requestedRadiusM) {
  const cap = loc && Number.isFinite(loc.radiusCapM) ? loc.radiusCapM : null;
  if (cap == null) return requestedRadiusM;
  return Math.min(requestedRadiusM, cap);
}

module.exports = {
  getStbPrecincts,
  getSgRegionBuckets,
  getMalaysiaAnchors,
  getAll,
  getMenuDropdown,
  getById,
  pointInPolygon,
  containingPrecinct,
  effectiveRadius,
  _resetCache: () => { _stbCache = null; }
};
