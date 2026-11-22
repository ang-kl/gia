// building-scope.js — v0.62.945.
//
// When a search names a BUILDING (a mall, hotel, address) or a ROAD, list what is inside it first,
// then what sits within 150 m outside it, tagged "beyond {name}"; drop everything farther.
//
// Operator, 26-10 '26, after "New eateries in Raffles City" came back as Marina One, Asia Square and
// Telok Ayer: "if the query is building specify the AI should query within building", and how: "the
// card should show address first and then fill the rest within 150m outside with a tab the address
// as "beyond #### building/road"". If nothing is inside and nothing within 150 m, say so and show
// nothing. Applies to the AI searches and the normal search alike (operator: "Both").
//
// "Inside" is read from the venue's ADDRESS, not its pin: a unit's pin can sit on the street outside
// its own mall, but "#B1-12 Raffles City Shopping Centre" cannot. Building vs road vs area comes from
// Google's place types on the lookup the place detector already makes (spec A3).
//
// Spec: doc/Feature/2026-10-26-ai-place-building-scope.spec.md.

'use strict';

const { haversineMeters } = require('./location-mode');

const RING_M = 150;

// Google place types (Places API) that make a named place a building or a road. A food business is
// never a building here: "Assaggi" names a restaurant, and its neighbours within 150 m are not what
// the reader asked for, so it keeps the ordinary 1.5 km search.
const BUILDING_TYPES = new Set(['shopping_mall', 'department_store', 'hotel', 'lodging', 'food_court', 'market',
  'premise', 'subpremise', 'street_address', 'corporate_office', 'convention_center']);
const ROAD_TYPES = new Set(['route']);
const FOOD_TYPES = /(^|_)(restaurant|cafe|bar|bakery|food|meal_takeaway|meal_delivery|coffee_shop|tea_house|dessert_shop)($|_)/;

function scopeFromTypes(types) {
  const list = Array.isArray(types) ? types.map((t) => String(t).toLowerCase()) : [];
  if (!list.length) return null;
  if (list.some((t) => FOOD_TYPES.test(t) && t !== 'food_court')) return null;
  if (list.some((t) => ROAD_TYPES.has(t))) return 'road';
  if (list.some((t) => BUILDING_TYPES.has(t))) return 'building';
  return null;
}

// Road suffixes and directions folded to one spelling, so "N Bridge Rd" and "North Bridge Road" meet.
const FOLD = [
  [/\bstreet\b/g, 'st'], [/\broad\b/g, 'rd'], [/\bavenue\b/g, 'ave'], [/\bboulevard\b/g, 'blvd'],
  [/\bdrive\b/g, 'dr'], [/\blane\b/g, 'ln'], [/\bcrescent\b/g, 'cres'], [/\bplace\b/g, 'pl'],
  [/\bcentral\b/g, 'ctrl'], [/\bnorth\b/g, 'n'], [/\bsouth\b/g, 's'], [/\beast\b/g, 'e'], [/\bwest\b/g, 'w'],
  [/\bcenter\b/g, 'centre'],
];
// Words that say what KIND of building it is, not which one. "Raffles City Shopping Centre" and
// "Raffles City" are the same place; "The Plaza" stripped of "the" and "plaza" is nothing at all.
const GENERIC = new Set(['the', 'shopping', 'centre', 'mall', 'plaza', 'singapore', 'sg', 'building', 'bldg', 'tower', 'complex']);

function norm(s) {
  let t = String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/[^a-z0-9#]+/g, ' ').trim();
  for (const [re, to] of FOLD) t = t.replace(re, to);
  return ` ${t.replace(/\s+/g, ' ')} `;
}

function coreName(name) {
  const words = norm(name).trim().split(' ').filter((w) => w && !GENERIC.has(w));
  return words.join(' ');
}

function addressInside(address, placeName) {
  const core = coreName(placeName);
  if (core.replace(/\s/g, '').length < 4) return false;
  return norm(address).includes(` ${core} `);
}

// anchor: { name, lat, lng, scope: 'building' | 'road' | null }.
// Returns { venues, insideCount, ringCount, empty, applied }. Inside venues keep their order by
// distance; ring venues follow, each with `_beyond = anchor.name`. Nothing is mutated except the
// `_beyond` tag on ring venues (copied, so a venue reused elsewhere is not tagged).
function scopeVenues(venues, anchor, { ringM = RING_M } = {}) {
  const list = Array.isArray(venues) ? venues : [];
  if (!anchor || (anchor.scope !== 'building' && anchor.scope !== 'road')
    || !Number.isFinite(anchor.lat) || !Number.isFinite(anchor.lng)) {
    return { venues: list, insideCount: 0, ringCount: 0, empty: false, applied: false };
  }
  const centre = { lat: anchor.lat, lng: anchor.lng };
  const dist = (v) => (Number.isFinite(v?.lat) && Number.isFinite(v?.lng) ? haversineMeters(centre, v) : Infinity);
  const inside = []; const ring = [];
  for (const v of list) {
    if (!v) continue;
    const addr = v.area || v.address || v.formattedAddress || '';
    const d = dist(v);
    if (addressInside(addr, anchor.name)) inside.push({ v, d });
    else if (d <= ringM) ring.push({ v: { ...v, _beyond: anchor.name }, d });
  }
  inside.sort((a, b) => a.d - b.d); ring.sort((a, b) => a.d - b.d);
  const out = [...inside.map((x) => x.v), ...ring.map((x) => x.v)];
  return { venues: out, insideCount: inside.length, ringCount: ring.length, empty: out.length === 0, applied: true };
}

module.exports = { RING_M, scopeFromTypes, addressInside, scopeVenues, _norm: norm, _coreName: coreName };
