// healthier-eateries.js — v0.62.0
//
// HPB Healthier Dining Programme cross-reference. Mirrors michelin-2025.js:
// a venue is annotated as a "Healthier Choice" when it matches an entry in
// the HPB partner list — data/healthier-eateries.json, built by
// scripts/build-geo-overlays.js from geoloc/HealthierEateries.geojson.
//
// Match rule: a normalized-name token overlap AND geographic proximity
// (~150 m). Proximity guards the many same-named chain outlets — only the
// HPB-listed branch sits next to the candidate venue's coordinates.

'use strict';

const fs = require('fs');
const path = require('path');

const RADIUS_DEG = 0.0015;     // ~150 m proximity gate (lat/lng degrees)
let _index = null;             // [{ norm, tokens:Set<string>, lat, lng }]

function _norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function _tokens(s) {
  return _norm(s).split(' ').filter((t) => t.length >= 3);
}

function _load() {
  if (_index) return _index;
  _index = [];
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'healthier-eateries.json'), 'utf8');
    const obj = JSON.parse(raw);
    for (const f of (obj.features || [])) {
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      _index.push({
        norm: _norm(f.name),
        tokens: new Set(_tokens(f.name)),
        lat: f.lat,
        lng: f.lng
      });
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[healthier-eateries] load failed:', err.message);
  }
  return _index;
}

// Name compatible when the matched tokens cover >= half of the shorter
// token set (the HPB name often carries an extra outlet suffix, e.g.
// "McDonald's - Chinatown Point", so an exact match is too strict).
function _nameCompatible(venueTokens, entryTokens) {
  if (!venueTokens.length || !entryTokens.size) return false;
  const matched = venueTokens.filter((t) => entryTokens.has(t)).length;
  if (!matched) return false;
  const smaller = Math.min(venueTokens.length, entryTokens.size);
  return matched / smaller >= 0.5;
}

// True when the venue is on the HPB Healthier Dining list.
function isHealthierChoice(venue) {
  if (!venue || !venue.name) return false;
  const idx = _load();
  if (!idx.length) return false;
  const vTokens = _tokens(venue.name);
  const vNorm = _norm(venue.name);
  const hasCoords = Number.isFinite(venue.lat) && Number.isFinite(venue.lng);
  for (const e of idx) {
    if (hasCoords) {
      if (Math.abs(e.lat - venue.lat) > RADIUS_DEG) continue;
      if (Math.abs(e.lng - venue.lng) > RADIUS_DEG) continue;
      if (_nameCompatible(vTokens, e.tokens)) return true;
    } else if (e.norm && e.norm === vNorm) {
      return true;            // no coordinates — exact-name fallback only
    }
  }
  return false;
}

// Sets venue.healthierChoice on the venue OBJECT (idempotent) so the
// React TMA card's consumer can render the badge. Mirrors
// michelin-2025.annotateVenueObject.
function annotateVenueObject(venue) {
  if (!venue || venue.healthierChoice != null) return;
  try {
    venue.healthierChoice = isHealthierChoice(venue);
  } catch (err) {
    console.warn('[healthier-eateries] annotate failed:', err.message);
  }
}

// Appends the chat-message "🥗 Healthier Choice" row when the venue is
// an HPB partner. Mirrors michelin-2025.appendMichelinAnnotation.
function appendHealthierChoiceLine(lines, venue, logTag = 'healthier-annotate') {
  if (!venue || !Array.isArray(lines)) return;
  try {
    const hc = venue.healthierChoice != null ? venue.healthierChoice : isHealthierChoice(venue);
    if (hc) lines.push('🥗 Healthier Choice');
  } catch (err) {
    console.warn(`[${logTag}] failed:`, err.message);
  }
}

module.exports = { isHealthierChoice, annotateVenueObject, appendHealthierChoiceLine };
