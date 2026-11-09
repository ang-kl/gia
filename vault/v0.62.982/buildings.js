// buildings.js — v0.62.0
//
// "Inside a building complex" detection. Loads data/buildings.json —
// large building footprints (built by scripts/build-geo-overlays.js from
// geoloc/AmendmenttoMP2014Building.geojson, kept only above an area
// threshold) — and exposes a point-in-polygon test. An eatery result
// whose pin falls inside a sizeable building is flagged, since such a
// venue likely shares the building with other eateries rather than
// being a standalone restaurant.
//
// Note: the source GeoJSON is the "Amendment to MP2014" subset, not the
// full building stock, so a false negative (no flag) does not prove a
// venue is standalone. The flag is a positive-only hint.

'use strict';

const fs = require('fs');
const path = require('path');

let _buildings = null;   // [{ sqm, rings:[[[lng,lat],...]], bbox:[minLng,minLat,maxLng,maxLat] }]

function _load() {
  if (_buildings) return _buildings;
  _buildings = [];
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'buildings.json'), 'utf8');
    const obj = JSON.parse(raw);
    for (const b of (obj.features || [])) {
      const rings = Array.isArray(b.rings) ? b.rings : [];
      if (!rings.length) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const ring of rings) {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      _buildings.push({ sqm: b.sqm || 0, rings, bbox: [minX, minY, maxX, maxY] });
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[buildings] load failed:', err.message);
  }
  return _buildings;
}

// Ray-casting point-in-ring. ring is [[lng,lat], ...].
function _pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Returns the matched building ({ sqm }) when (lat,lng) sits inside a
// large building footprint, else null. A bounding-box prefilter keeps
// the per-venue scan over ~1.3k footprints cheap.
function buildingAt(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const b of _load()) {
    const [minX, minY, maxX, maxY] = b.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) continue;
    for (const ring of b.rings) {
      if (_pointInRing(lng, lat, ring)) return { sqm: b.sqm };
    }
  }
  return null;
}

// Sets venue.insideBuilding on the venue OBJECT (idempotent).
function annotateVenueObject(venue) {
  if (!venue || venue.insideBuilding != null) return;
  try {
    venue.insideBuilding = !!buildingAt(venue.lat, venue.lng);
  } catch (err) {
    console.warn('[buildings] annotate failed:', err.message);
  }
}

// Appends the chat-message "🏢 Inside a building complex" row.
function appendBuildingLine(lines, venue, logTag = 'buildings-annotate') {
  if (!venue || !Array.isArray(lines)) return;
  try {
    const inside = venue.insideBuilding != null
      ? venue.insideBuilding
      : !!buildingAt(venue.lat, venue.lng);
    if (inside) lines.push('🏢 Inside a building complex');
  } catch (err) {
    console.warn(`[${logTag}] failed:`, err.message);
  }
}

module.exports = { buildingAt, annotateVenueObject, appendBuildingLine };
