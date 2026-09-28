// onemap-search.js — v0.62.690
//
// Normalises OneMap's `common/elastic/search` payload into the small shape the
// station/road field consumes. Pure and dependency-free so the parsing is unit
// tested without a network; the HTTP call itself lives in index.js.
//
// WHY ONEMAP AND NOT GOOGLE. The operator's request was road/address search for
// the station-pick inspection overlay, which is Singapore-only (hawker centres,
// MRT). OneMap is the SLA/sovereign source, is FREE and needs no key for this
// endpoint, and returns ROAD_NAME / BLK_NO / POSTAL as first-class fields —
// Google Places Autocomplete has no road-only type filter and would be a paid
// call (gate G4, default no). This project already treats OneMap as the
// SG-authoritative geocoder: `scripts/fetch-hawker-coords.js` uses this exact
// endpoint, and `doc/Legal/legal-0_61_76-21_05_26-0944.md` already lists it as
// an active source with the attribution string "Source: OneMap / SLA".
//
// CORRECTION TO A STANDING NOTE. `doc/Register/register-0_61_76` records that
// "the sandbox cannot reach OneMap". That is true of
// `public/nearbysvc/getNearestBusStops`, which requires ONEMAP_API_KEY. It is
// NOT true of this endpoint: `common/elastic/search` answers unauthenticated
// and was verified reachable from the sandbox while building this. It does
// return a top-level `"error": "Authentication token missing…"` string ALONGSIDE
// a fully populated `results` array — an advisory, not a failure. Callers must
// therefore key off `results`, never off the presence of `error`.

const SG_BOUNDS = { latMin: 1.15, latMax: 1.50, lngMin: 103.55, lngMax: 104.10 };

/** OneMap writes the literal string "NIL" for an absent field. */
function clean(v) {
  const s = String(v == null ? '' : v).trim();
  return (!s || s.toUpperCase() === 'NIL') ? '' : s;
}

function inSgBounds(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= SG_BOUNDS.latMin && lat <= SG_BOUNDS.latMax
    && lng >= SG_BOUNDS.lngMin && lng <= SG_BOUNDS.lngMax;
}

/**
 * Title Case for OneMap's SHOUTED values. Keeps a token that is all-digits or
 * a known initialism (NUS, SMU, MRT) intact rather than lowercasing it.
 */
const KEEP_UPPER = new Set(['MRT', 'LRT', 'NUS', 'NTU', 'SMU', 'SIT', 'SUTD', 'HDB', 'CBD', 'JB', 'SG']);
function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b[a-z0-9'()&/-]+/g, (w) => {
      const up = w.toUpperCase();
      if (KEEP_UPPER.has(up)) return up;
      if (/^\d/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
}

/**
 * The secondary line: "20 Bideford Road · S(229921)". Built from parts rather
 * than reusing OneMap's ADDRESS, which repeats the building name already shown
 * on the primary line and appends "SINGAPORE <postal>" in full caps.
 */
function addressLabel(r) {
  const blk = clean(r && r.BLK_NO);
  const road = clean(r && r.ROAD_NAME);
  const postal = clean(r && r.POSTAL);
  const street = [blk, titleCase(road)].filter(Boolean).join(' ');
  const parts = [];
  if (street) parts.push(street);
  if (postal) parts.push(`S(${postal})`);
  return parts.join(' · ');
}

/**
 * ERP gantries are returned as ordinary results ("Orchard Road After Ymca -
 * ERP(47)"). They are toll points, not destinations — on a live "Orchard Road"
 * query three of the first six rows were gantries. Dropped so the list stays
 * places a person might actually want to inspect.
 */
const ERP_ROW = /\s-\s*ERP\s*\(\s*\d+\s*\)\s*$/i;

/**
 * raw OneMap body → [{ name, sub, lat, lng, road, postal }], nearest-first is
 * NOT applied here (the caller may not have a user location); OneMap's own
 * relevance order is preserved.
 *
 * Drops: non-finite coords, anything outside the SG bbox, ERP gantries, and
 * repeats of a name already listed.
 *
 * DEDUP IS BY NAME, NOT BY COORDINATE. Coordinate dedup was the obvious first
 * choice and it is not enough: a live "Jalan Kayu" query returned six rows all
 * titled "Jalan Kayu Estate", each a different house with different coordinates,
 * so nothing collapsed and the user saw one name six times. Keying on the name
 * costs us the ability to distinguish two genuinely distinct places that share a
 * name (the live "Bishan" query has "Bishan Loft" at blocks 31 and 33, ~60 m
 * apart) — an acceptable trade for an INSPECTION overlay, whose job is "show me
 * roughly here", not "pick this exact unit".
 */
function normaliseOneMapResults(body, opts) {
  const limit = (opts && Number.isFinite(opts.limit)) ? opts.limit : 6;
  const rows = (body && Array.isArray(body.results)) ? body.results : [];
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const lat = Number(r && r.LATITUDE);
    const lng = Number(r && r.LONGITUDE);
    if (!inSgBounds(lat, lng)) continue;
    const searchval = clean(r.SEARCHVAL);
    const road = clean(r.ROAD_NAME);
    if (ERP_ROW.test(searchval)) continue;
    const name = titleCase(searchval || road);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      sub: addressLabel(r),
      lat,
      lng,
      road: titleCase(road),
      postal: clean(r.POSTAL)
    });
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = { normaliseOneMapResults, addressLabel, titleCase, inSgBounds, SG_BOUNDS };
