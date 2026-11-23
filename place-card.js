'use strict';
// place-card.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Parts B and D.
//
// Operator, 23-11 '26: "since now I can click on the bus stop and you give details, how about - other eateries on the
// map, hospital, hotel, shopping, police station, park, attractions, building name, etc."
//
// A tap on a Google map icon gives the map a place ID and a position, nothing else. This module turns that ID into a
// card, from the cheapest source that can answer:
//   1. the 24-hour store for that place and language   - no Google call, nothing counted;
//   2. a remembered link to one of OUR records         - no Google call, nothing counted;
//   3. one Google Place Details call                    - paid, and held to two limits the operator set.
//
// MONEY. Google prices a call by the dearest field it asks for. The card's fields sit in the Enterprise tier, US$0.02
// (Google's price list, read 22-11 '26). Amounts are counted in thousandths of a US dollar so they are whole numbers:
// a card lookup is 20; a reader may spend 1,000 a Singapore day (operator: "a daily cap per reader $1"); everyone
// together may spend 20,000 a Singapore calendar month (operator: "US$20 a month"). The amount is RESERVED before the
// call and given back if the call fails, so parallel taps cannot pass a limit. Both limits count list price and
// ignore Google's free monthly allowance, so they stop early, never late (assumption A9).
//
// OUR OWN DATA. After a lookup the place is linked to one of our records only when a fitting Google type, the
// distance and the tidied name ALL agree and exactly one record fits. Anything less shows Google's own card, which is
// correct but plainer. The link is remembered against the place ID with no expiry, so the next tap is free.
//
// Nothing here logs or stores who asked: a reader appears only as a 16-hex hash inside a Redis key, as fr24.js does.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { currentOpenString, closedTodayString, ohLang } = require('./open-hours');

const PLACES_URL = 'https://places.googleapis.com/v1/places';

// ── money ────────────────────────────────────────────────────────────────────────────────────────────────────────
const CARD_MILLS = 20;            // US$0.020: Place Details, Enterprise tier
const FULL_MILLS = 25;            // US$0.025: Enterprise + Atmosphere, used by the full Soleat card (spec Part F)
const TRANSLATE_MILLS = 1;        // a flat allowance for the one review translation a full card may make (Amendment 1, F-3)
const FULL_CARD_MILLS = FULL_MILLS + TRANSLATE_MILLS;   // 26: what a paid full card counts against both limits
const READER_DAILY_MILLS = 1000;  // US$1.00 per reader per Singapore day
const MONTHLY_MILLS = 20000;      // US$20.00 for everyone per Singapore calendar month
const STORE_TTL_S = 24 * 60 * 60;
const READER_TTL_S = 2 * 24 * 60 * 60;
const MONTH_TTL_S = 40 * 24 * 60 * 60;
const SGT_MS = 8 * 60 * 60 * 1000;

// Every field is in the Enterprise tier or below. __tests__/place-card-mask.test.js pins this list and checks it
// against the dearer tier; a field added here without that test changing is a price rise nobody chose.
const CARD_FIELDS = Object.freeze([
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'location', 'types', 'primaryType',
  'primaryTypeDisplayName', 'businessStatus', 'googleMapsUri', 'rating', 'userRatingCount', 'priceLevel',
  'currentOpeningHours', 'regularOpeningHours', 'utcOffsetMinutes',
]);
const PLACE_CARD_FIELD_MASK = CARD_FIELDS.join(',');

// ── languages ────────────────────────────────────────────────────────────────────────────────────────────────────
const LANGS = Object.freeze(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
function cardLang(lang) {
  const two = String(lang || '').slice(0, 2).toLowerCase();
  return LANGS.includes(two) ? two : 'en';
}
function googleLang(lang) {
  const l = cardLang(lang);
  return l === 'zh' ? 'zh-CN' : l;
}

// A Google place ID is letters, digits, dash and underscore. It goes into a URL path, so anything else is refused.
function isPlaceId(s) {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{10,300}$/.test(s);
}

function sgtDay(nowMs) { return new Date(nowMs + SGT_MS).toISOString().slice(0, 10); }
function sgtMonth(nowMs) { return new Date(nowMs + SGT_MS).toISOString().slice(0, 7); }
function hashId(id) { return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 16); }

// ── what kind of place it is ─────────────────────────────────────────────────────────────────────────────────────
const BAR = new Set(['bar', 'pub', 'night_club', 'karaoke', 'brewery', 'beer_garden', 'gastropub', 'lounge']);
const EATERY = new Set(['restaurant', 'cafe', 'bakery', 'food_court', 'meal_takeaway', 'meal_delivery', 'coffee_shop', 'food',
  'ice_cream_shop', 'dessert_shop', 'sandwich_shop', 'bagel_shop', 'donut_shop', 'juice_shop', 'tea_house', 'cafeteria',
  'deli', 'diner', 'steak_house', 'confectionery', 'acai_shop', 'cat_cafe', 'dog_cafe']);
const LODGING = new Set(['lodging', 'hotel', 'hostel', 'motel', 'resort_hotel', 'guest_house', 'bed_and_breakfast', 'inn',
  'extended_stay_hotel', 'japanese_inn', 'budget_japanese_inn', 'private_guest_room', 'cottage', 'farmstay', 'campground']);
const SHOPPING = new Set(['shopping_mall', 'department_store', 'supermarket', 'convenience_store', 'market', 'store']);
const HEALTH = new Set(['doctor', 'dentist', 'pharmacy', 'drugstore', 'medical_lab', 'physiotherapist', 'chiropractor', 'health']);
const SAFETY = new Set(['police', 'fire_station']);
const NATURE = new Set(['park', 'national_park', 'state_park', 'garden', 'botanical_garden', 'beach', 'hiking_area', 'playground',
  'dog_park', 'wildlife_park', 'picnic_ground']);
const SIGHT = new Set(['tourist_attraction', 'museum', 'art_gallery', 'zoo', 'aquarium', 'amusement_park', 'historical_landmark',
  'historical_place', 'monument', 'cultural_landmark', 'performing_arts_theater', 'observation_deck', 'visitor_center',
  'cultural_center', 'water_park', 'ferris_wheel', 'planetarium', 'sculpture']);
const TRAIN_TYPES = ['subway_station', 'train_station', 'light_rail_station'];
const TRANSIT = new Set([...TRAIN_TYPES, 'bus_station', 'bus_stop', 'transit_station', 'transit_depot', 'airport',
  'international_airport', 'ferry_terminal', 'taxi_stand']);
const WORSHIP = new Set(['place_of_worship', 'church', 'mosque', 'hindu_temple', 'buddhist_temple', 'synagogue', 'temple', 'shrine']);
const LEARNING = new Set(['school', 'university', 'library', 'primary_school', 'secondary_school', 'preschool']);

function familyOfOne(t) {
  if (typeof t !== 'string' || !t) return null;
  if (BAR.has(t) || /(^|_)(bar|pub)$/.test(t)) return 'bar';
  if (EATERY.has(t) || /_restaurant$/.test(t)) return 'eatery';
  if (LODGING.has(t)) return 'lodging';
  if (SAFETY.has(t)) return 'safety';
  if (HEALTH.has(t) || /hospital|clinic/.test(t)) return 'health';
  if (TRANSIT.has(t)) return 'transit';
  if (NATURE.has(t)) return 'nature';
  if (SIGHT.has(t)) return 'sight';
  if (WORSHIP.has(t)) return 'worship';
  if (LEARNING.has(t)) return 'learning';
  if (SHOPPING.has(t) || /_(store|shop)$/.test(t)) return 'shopping';
  return null;
}
// The main type decides; without one, the first type Google lists that we recognise. Anything else is a building.
function familyOf(types, primaryType) {
  const main = familyOfOne(primaryType);
  if (main) return main;
  if (Array.isArray(types)) {
    for (const t of types) { const f = familyOfOne(t); if (f) return f; }
  }
  return 'building';
}

// ── the closing-time guess (spec Part D) ─────────────────────────────────────────────────────────────────────────
// Operator: "f there isn't opening hours stated in the google map, use human-logic like is 10 PM (the chance eatery to
// be closed is near 99% in Singapore, 11 PM for Japan and Korea)". It is a guess and is only ever shown as one: an
// eatery, no hours from Google at all, one of three countries, and the place's own clock between the hour below and
// 06:00. A bar or night club is a different family and is never guessed.
const GUESS_FROM_MIN = Object.freeze({ SG: 22 * 60, JP: 23 * 60, KR: 23 * 60 });
const GUESS_UNTIL_MIN = 6 * 60;
const COUNTRY_OFFSET_MIN = Object.freeze({ SG: 480, JP: 540, KR: 540 });
function closedGuess({ family, hasHours, country, localMinutes } = {}) {
  if (family !== 'eatery' || hasHours) return false;
  const from = GUESS_FROM_MIN[country];
  if (from == null) return false;
  if (!Number.isFinite(localMinutes) || localMinutes < 0 || localMinutes >= 1440) return false;
  return localMinutes >= from || localMinutes < GUESS_UNTIL_MIN;
}

// The open or closed line, worked out when the card is READ. The stored answer keeps the hours, not a verdict, so a
// card stored at lunch does not still say "Open" at midnight.
function openLine(entry, nowMs, lang) {
  const e = entry || {};
  const offset = Number.isFinite(e.utcOffsetMinutes) ? e.utcOffsetMinutes
    : (COUNTRY_OFFSET_MIN[e.country] != null ? COUNTRY_OFFSET_MIN[e.country] : 480);
  const periods = Array.isArray(e.periods) && e.periods.length ? e.periods
    : (Array.isArray(e.regularPeriods) && e.regularPeriods.length ? e.regularPeriods : null);
  if (periods) {
    const l = ohLang(lang);
    const at = new Date(nowMs);
    const open = currentOpenString(periods, at, offset, l);
    if (open) return { openNow: true, label: open, guess: false };
    return { openNow: false, label: closedTodayString(periods, at, offset, l) || '', guess: false };
  }
  const local = new Date(nowMs + offset * 60000);
  const localMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return { openNow: null, label: '', guess: closedGuess({ family: e.family, hasHours: !!e.hasHours, country: e.country, localMinutes }) };
}

// ── our own data, and the link to it ─────────────────────────────────────────────────────────────────────────────
const LINK_MAX_M = Object.freeze({ station: 400, hospital: 300, police: 150, hawker: 150, attraction: 300 });
const KIND_ORDER = ['station', 'hospital', 'police', 'hawker', 'attraction'];
const KIND_FAMILY = Object.freeze({ station: 'transit', hospital: 'health', police: 'safety', hawker: 'eatery', attraction: 'sight' });
const STOP_WORDS = new Set(['the', 'of', 'in', 'at', 'and', 'a', 'an', 'singapore', 'sg']);
// Words that say WHAT a place is, not WHICH one. Dropped for that kind only, on both names: "Tekka Centre" (Google)
// and "Tekka Market" (ours) are the same hawker centre, and "Jurong East MRT Station" is the station "Jurong East".
const GENERIC = Object.freeze({
  station: new Set(['mrt', 'lrt', 'station', 'stn', 'interchange']),
  hawker: new Set(['market', 'food', 'centre', 'hawker', 'complex', 'temporary']),
  hospital: new Set(), police: new Set(), attraction: new Set(),
});
const HAWKER_TYPES = ['food_court', 'market', 'restaurant', 'food', 'meal_takeaway', 'cafe'];

let ownCache = null;
function loadOwn(root = __dirname) {
  if (ownCache && root === __dirname) return ownCache;
  const json = (f) => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')); } catch { return null; } };
  const feats = (f) => { const d = json(f); return d && Array.isArray(d.features) ? d.features.filter((x) => x && typeof x.name === 'string' && Number.isFinite(x.lat) && Number.isFinite(x.lng)) : []; };
  const hc = json('hawker-coords.json') || {};
  const hawker = Object.entries(hc)
    .filter(([name, v]) => name && v && Number.isFinite(v.lat) && Number.isFinite(v.lng))
    .map(([name, v]) => ({ name, lat: v.lat, lng: v.lng }));
  const st = (json('stations.json') || {}).stations || {};
  const station = Object.entries(st)
    .filter(([, r]) => r && Number.isFinite(r.lat) && Number.isFinite(r.lng))
    .map(([name, r]) => ({ name, lat: r.lat, lng: r.lng, code: String((Array.isArray(r.lines) && r.lines[0] && r.lines[0].station_code) || '') }));
  const out = { station, hospital: feats('geo-hospitals.json'), police: feats('geo-police.json'), hawker, attraction: feats('geo-attractions.json') };
  if (root === __dirname) ownCache = out;
  return out;
}

const RAD = Math.PI / 180;
function distM(a, b) {
  const x = Math.sin((b.lat - a.lat) * RAD / 2) ** 2
    + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin((b.lng - a.lng) * RAD / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}

// The name reduced to the words that identify the place, sorted, as one string. `cut` drops a description after a
// colon or a spaced dash, which our attraction names carry ("Sri Mariamman Temple: Hindu Temple in Singapore").
function nameKey(name, kind, cut = false) {
  let s = String(name || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/\([^)]*\)/g, ' ');
  if (cut) s = s.split(/:|\s-\s|-\s/)[0];
  s = s.replace(/['’ʼ`]/g, '').replace(/&/g, ' and ')
    .replace(/\bneighborhood\b/g, 'neighbourhood').replace(/\bcenter\b/g, 'centre')
    .replace(/\bnpc\b/g, 'neighbourhood police centre').replace(/\bnpp\b/g, 'neighbourhood police post');
  const generic = GENERIC[kind] || new Set();
  const words = s.split(/[^a-z0-9]+/).filter((w) => w && !STOP_WORDS.has(w) && !generic.has(w)
    && !(kind === 'station' && /^[a-z]{2,3}\d{1,2}$/.test(w)));
  return [...new Set(words)].sort().join(' ');
}

function typeFits(kind, types) {
  const has = (t) => types.includes(t);
  const transit = types.some((t) => TRANSIT.has(t));
  if (kind === 'station') return TRAIN_TYPES.some(has) && !has('bus_station');
  if (kind === 'hospital') return types.some((t) => /hospital/.test(t));
  if (kind === 'police') return has('police');
  if (kind === 'hawker') return !transit && !has('lodging') && (HAWKER_TYPES.some(has) || types.some((t) => /_restaurant$/.test(t)));
  if (kind === 'attraction') return !transit && !has('lodging') && !has('police') && !types.some((t) => /hospital/.test(t));
  return false;
}

// The one record of ours this Google place is, or null. Kinds are tried in a fixed order; the first kind with a
// candidate decides, and two candidates in that kind mean no link at all.
function linkOwn(place, own) {
  if (!place || !own || typeof place.name !== 'string' || !Array.isArray(place.types)
    || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const types = place.types.filter((t) => typeof t === 'string');
  for (const kind of KIND_ORDER) {
    const list = own[kind];
    if (!Array.isArray(list) || !typeFits(kind, types)) continue;
    const key = nameKey(place.name, kind);
    if (!key) continue;
    const hits = [];
    for (const r of list) {
      if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lng) || distM(place, r) > LINK_MAX_M[kind]) continue;
      // Our attraction names may carry a description, so either the whole name or the part before it may agree.
      if (nameKey(r.name, kind) !== key && !(kind === 'attraction' && nameKey(r.name, kind, true) === key)) continue;
      // The same record listed twice in our file (same name, same spot) is one candidate, not two.
      if (hits.some((h) => h.name === r.name && distM(h, r) <= 100)) continue;
      hits.push(r);
    }
    if (hits.length === 1) return { kind, record: hits[0] };
    if (hits.length > 1) return null;
  }
  return null;
}

// ── the two limits ───────────────────────────────────────────────────────────────────────────────────────────────
// `store` is the Redis adapter index.js passes ({ get, set, setEx, incrBy, expire, del }) or null. Every count is
// mirrored in memory, as fr24.js does, so the limits hold inside this process when Redis is away.
function createBudget({ store = null, now = Date.now } = {}) {
  // Two views of every count, kept in step so that Redis going away, or coming back, can never reopen a limit
  // (review finding on #1936, P1: memory used to know only what THIS process had added, so after a restart a Redis
  // outage switched the limit to an almost empty count).
  //   mem  - the last total this process knows: Redis's own answer whenever Redis gave one;
  //   owed - what was counted here while Redis could not take it. It is added to every later Redis answer, so
  //          spending made during an outage is not forgotten when Redis returns.
  // A process that starts while Redis is already away cannot know what Redis holds; it counts from zero until Redis
  // answers once. That gap is stated, not hidden.
  const mem = new Map();
  const owed = new Map();
  const readerKey = (id) => `placecard:reader:${hashId(id)}:${sgtDay(now())}`;
  const monthKey = () => `placecard:month:${sgtMonth(now())}`;
  const live = (k) => k.endsWith(`:${sgtDay(now())}`) || k.endsWith(`:${sgtMonth(now())}`);

  async function bump(key, n, ttl) {
    const local = (mem.get(key) || 0) + n;
    mem.set(key, local);
    if (mem.size > 20000) { for (const k of mem.keys()) if (!live(k)) { mem.delete(k); owed.delete(k); } }
    if (store && typeof store.incrBy === 'function') {
      let v = null;
      try { v = await store.incrBy(key, n); } catch { v = null; }
      if (v != null && Number.isFinite(Number(v))) {
        if (typeof store.expire === 'function') { try { await store.expire(key, ttl); } catch { /* the count itself is in */ } }
        const total = Number(v) + (owed.get(key) || 0);
        mem.set(key, total);
        return total;
      }
      owed.set(key, (owed.get(key) || 0) + n);
    }
    return local;
  }
  async function read(key) {
    if (store && typeof store.get === 'function') {
      try {
        const v = await store.get(key);
        if (v != null && Number.isFinite(Number(v))) return Number(v) + (owed.get(key) || 0);
      } catch { /* fall through */ }
    }
    return mem.get(key) || 0;
  }

  // Hold `mills` for this reader. Refused, with nothing left held, when either limit would be passed.
  async function reserve(readerId, mills) {
    if (readerId == null || readerId === '' || readerId === 0) return { ok: false, reason: 'no-session' };
    const rk = readerKey(readerId);
    const mk = monthKey();
    if ((await bump(rk, mills, READER_TTL_S)) > READER_DAILY_MILLS) {
      await bump(rk, -mills, READER_TTL_S);
      return { ok: false, reason: 'cap' };
    }
    if ((await bump(mk, mills, MONTH_TTL_S)) > MONTHLY_MILLS) {
      await bump(mk, -mills, MONTH_TTL_S);
      await bump(rk, -mills, READER_TTL_S);
      return { ok: false, reason: 'budget' };
    }
    let released = false;
    return {
      ok: true,
      async release() {
        if (released) return;
        released = true;
        await bump(rk, -mills, READER_TTL_S);
        await bump(mk, -mills, MONTH_TTL_S);
      },
    };
  }
  return { reserve, spent: (readerId) => read(readerKey(readerId)), monthSpent: () => read(monthKey()) };
}

// ── Google's answer, reduced to what is kept ─────────────────────────────────────────────────────────────────────
const PRICE_LEVELS = Object.freeze({ PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 });
const text = (v) => (v && typeof v.text === 'string' ? v.text : (typeof v === 'string' ? v : ''));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const list = (v) => (Array.isArray(v) && v.length ? v : null);
const httpUrl = (v) => (typeof v === 'string' && /^https?:\/\//i.test(v) ? v : '');
function countryOf(components) {
  if (!Array.isArray(components)) return '';
  for (const c of components) {
    if (c && Array.isArray(c.types) && c.types.includes('country') && typeof c.shortText === 'string') return c.shortText.toUpperCase();
  }
  return '';
}
function toEntry(data) {
  const loc = data && data.location;
  if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return null;
  const types = Array.isArray(data.types) ? data.types.filter((t) => typeof t === 'string') : [];
  const cur = data.currentOpeningHours || null;
  const reg = data.regularOpeningHours || null;
  const periods = list(cur && cur.periods);
  const regularPeriods = list(reg && reg.periods);
  const hasHours = !!(periods || regularPeriods || list(cur && cur.weekdayDescriptions) || list(reg && reg.weekdayDescriptions)
    || typeof (cur && cur.openNow) === 'boolean');
  return {
    name: text(data.displayName), typeLabel: text(data.primaryTypeDisplayName), address: typeof data.formattedAddress === 'string' ? data.formattedAddress : '',
    lat: loc.latitude, lng: loc.longitude, country: countryOf(data.addressComponents),
    rating: num(data.rating), ratingCount: num(data.userRatingCount),
    priceLevel: PRICE_LEVELS[data.priceLevel] != null ? PRICE_LEVELS[data.priceLevel] : null,
    mapsUri: httpUrl(data.googleMapsUri), types, family: familyOf(types, data.primaryType),
    periods, regularPeriods, utcOffsetMinutes: num(data.utcOffsetMinutes), hasHours,
  };
}

// ── the full Soleat card for one tapped eatery or bar (v0.62.993; spec Amendment 1, Part F) ───────────────────────
// Operator, 23-11 '26: "(c) Lean + translation". The card is built from the search's own mapping and its own LOCAL
// step, plus our own badges and the review in the reader's language. It is NOT run through the search's slow step:
// no Routes call, no crowd or footfall, no AI dishes, no AI read, no name lines. So a full card is exactly one Google
// call and at most one translation call, which is why it can be counted (26: 25 for Google, 1 flat for the
// translation; operator: "Count translation too").
//
// Everything this build needs from outside the module is handed in (`deps`), so the module itself requires nothing
// that can spend money: index.js passes the real functions, tests pass the real local ones and count the rest.
const FULL_FAMILIES = new Set(['eatery', 'bar']);   // operator: "Include bars"
const REVIEW_MAX = 160;             // the search's own cut for a review snippet
const TRANSLATED_MAX = 200;         // the search's own cut for a translated one
const TRANSLATE_BUDGET_MS = 6000;   // the search's own limit; past it the original shows
const hasPeriods = (x) => Array.isArray(x) && x.length > 0;
const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const cut = (s, n) => [...String(s)].slice(0, n).join('');

// "Open now" is Google's verdict at the moment it answered, and a stored answer is read for 24 hours. So the verdict
// is worked out again from the hours every time the card is built (the same rule openLine() follows for the small
// card). With no hours behind it, a verdict is kept only while it is fresh.
function withOpenVerdict(place, nowMs, fresh) {
  const cur = (place && place.currentOpeningHours) || null;
  const reg = (place && place.regularOpeningHours) || null;
  const periods = hasPeriods(cur && cur.periods) ? cur.periods : (hasPeriods(reg && reg.periods) ? reg.periods : null);
  const out = { ...place };
  if (periods) {
    const offset = Number.isFinite(place.utcOffsetMinutes) ? place.utcOffsetMinutes : undefined;
    out.currentOpeningHours = { ...(cur || {}), openNow: !!currentOpenString(periods, new Date(nowMs), offset, 'en') };
  } else if (!fresh && cur && typeof cur.openNow === 'boolean') {
    const { openNow: _stale, ...rest } = cur;
    out.currentOpeningHours = rest;
  }
  return out;
}

// One translation, or none. A late, failed, empty or unchanged answer all mean "keep the original".
async function translatedOnce(text, sourceLang, targetLang, placeId, deps) {
  const budget = Number.isFinite(deps.translateBudgetMs) && deps.translateBudgetMs > 0 ? deps.translateBudgetMs : TRANSLATE_BUDGET_MS;
  let timer = null;
  try {
    // The kept translation is tied to the review's own text. translate-review.js keys its 30-day store on place,
    // index and languages only, so without this an old translation could be shown under a newer, different review.
    const reviewIdx = `c${crypto.createHash('sha256').update(text).digest('hex').slice(0, 10)}`;
    const call = Promise.resolve().then(() => deps.translateReview({ text, sourceLang, targetLang, placeId, reviewIdx }));
    call.catch(() => { /* a failure after the wait is over is not an error anyone is waiting on */ });
    const out = await Promise.race([call, new Promise((res) => { timer = setTimeout(() => res(null), budget); })]);
    const s = typeof out === 'string' ? out.trim() : '';
    return s && s !== text ? s : '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

// One Google place (the answer to the search's field list) → { venue, review }.
//   opts.fresh   true when Google has just answered; false when the place comes from the 24-hour store
//   opts.review  for a stored place: the review wording decided when it was paid for (null when there was none).
//                Leave it undefined to decide the wording now, which may make the one translation call.
// `review` in the result is what to store beside the place.
async function buildFullVenue(place, opts = {}, deps = {}) {
  const lang = cardLang(opts.lang);
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const v = deps.placeToVenue(withOpenVerdict(place, nowMs, opts.fresh !== false));
  const noHours = !hasPeriods(v.currentPeriods) && !hasPeriods(v.regularPeriods);
  await deps.enrichFast([v], {
    csLang: lang, cuisines: [], cuisineQueries: [], csChatId: null, deviceRegion: v.country || null,
    humaniseRestaurantType: typeof deps.humaniseRestaurantType === 'function' ? deps.humaniseRestaurantType : () => '',
    // The reader is treated as local to the place, so the price line is in the place's own currency and nothing is
    // converted: no exchange-rate call and no geocoding call (operator, 23-11 '26: "All three stand").
    enrichPriceRangeDisplay: async (_chat, venues) => {
      if (typeof deps.formatPriceRange !== 'function') return;
      for (const x of venues) {
        const shown = await deps.formatPriceRange(x.priceRange, x.country, x.country, null);
        if (shown) x.priceRangeDisplay = shown;
      }
    },
  });
  // With no hours at all from Google, the search's local step still writes "Closed". On this card that would state
  // a guess as a fact, one tap after the small card said nothing. Operator, 23-11 '26: "No hours line".
  if (noHours && v.openNow !== false) {
    delete v.closedTodayLabel; delete v.closedTodayByLang; delete v.openClosingLabel; delete v.openClosingByLang;
  }
  for (const badge of (Array.isArray(deps.annotators) ? deps.annotators : [])) {
    try { badge(v); } catch (err) { console.warn('[place-card] a badge step failed:', err && err.message); }
  }

  let review = null;
  if (opts.review !== undefined) {
    review = opts.review || null;
    if (review && review.text) {
      v.recentReview = review.text;
      if (review.ago) v.recentReviewAgo = review.ago;
      if (review.sourceLang) v.recentReviewSourceLang = review.sourceLang;
    }
  } else {
    const mapped = Array.isArray(v.reviews) ? v.reviews : [];
    // The same choice of text and the same filter as placeToVenue, so entry i here is review i there. This is where
    // Google's own language tag survives: the mapping keeps the text and drops the tag.
    const tagged = (Array.isArray(place && place.reviews) ? place.reviews : []).map((r) => {
      const t = r && r.text && r.text.text ? r.text : ((r && r.originalText) || null);
      return { text: (t && t.text) || '', languageCode: (t && t.languageCode) || '' };
    }).filter((r) => r.text);
    if (!v.recentReview && mapped[0] && mapped[0].text) v.recentReview = cut(tidy(mapped[0].text), REVIEW_MAX);
    if (v.recentReview) {
      const shown = String(v.recentReview);
      let i = mapped.findIndex((r) => r && r.text && shown.includes(tidy(r.text).slice(0, 40)));
      if (i < 0) i = 0;
      if (!v.recentReviewAgo && mapped[i] && mapped[i].relative) v.recentReviewAgo = mapped[i].relative;
      const tag = typeof deps.reviewLang === 'function' && tagged[i] ? deps.reviewLang({ text: tagged[i] }) : null;
      const sourceLang = tag || 'en';
      if (sourceLang !== lang && typeof deps.translateReview === 'function') {
        const out = await translatedOnce(shown, sourceLang, lang, v.placeId, deps);
        if (out) { v.recentReview = cut(out, TRANSLATED_MAX); v.recentReviewSourceLang = sourceLang; }
      }
      review = { text: v.recentReview, ago: v.recentReviewAgo || '', sourceLang: v.recentReviewSourceLang || '' };
    }
  }
  // The working fields a search removes before it answers.
  delete v.reviews; delete v.currentPeriods; delete v.regularPeriods; delete v.utcOffsetMinutes; delete v.primaryTypeDisplayName;
  return { venue: v, review };
}

// What is kept for 24 hours: the place as Google answered it, minus what the card never reads. A review keeps its
// text, rating and dates, which is all the mapping uses; the reviewer's name, profile link and photo are not stored.
function forStore(place) {
  if (!place || !Array.isArray(place.reviews)) return place;
  return {
    ...place,
    reviews: place.reviews.map((r) => (r ? {
      text: r.text, originalText: r.originalText, rating: r.rating, publishTime: r.publishTime,
      relativePublishTimeDescription: r.relativePublishTimeDescription,
    } : r)),
  };
}

// Distance and walking minutes from the reader's set location, by the search's own formula (index.js: a straight
// line on a 6,371 km sphere, 80 m a minute). The location is used here and nowhere else: it is not stored and not
// logged. A copy is returned, because the venue it is given may be shared between readers.
function withDistance(venue, origin) {
  const ok = (n, max) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max;
  if (!venue || !origin || !ok(origin.lat, 90) || !ok(origin.lng, 180) || !ok(venue.lat, 90) || !ok(venue.lng, 180)) return { ...venue };
  const R = 6371000, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(venue.lat - origin.lat), dLng = toRad(venue.lng - origin.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(origin.lat)) * Math.cos(toRad(venue.lat)) * Math.sin(dLng / 2) ** 2;
  const dist = Math.round(2 * R * Math.asin(Math.sqrt(x)));
  return { ...venue, distanceM: dist, walkMinutes: Math.round(dist / 80) };
}

// ── the service ──────────────────────────────────────────────────────────────────────────────────────────────────
// request({ url, headers, params, timeout }) resolves to Google's JSON; index.js passes axios, tests pass a stand-in.
// `full` (v0.62.993) is what the full Soleat card is built with: { fieldMask, placeToVenue, enrichFast,
// humaniseRestaurantType, formatPriceRange, annotators, reviewLang, translateReview, translateBudgetMs }. Without it
// the full card answers "unavailable" and calls nothing.
function createPlaceCard({ request, store = null, now = Date.now, own = null, apiKey = '', onCall = null, full = null } = {}) {
  const budget = createBudget({ store, now });
  const memStore = new Map();   // key → { exp, json }: the 24-hour store when Redis is away
  const memLinks = new Map();   // place ID → json
  const inflight = new Map();   // store key → the lookup already under way for it
  const ownData = () => own || loadOwn();
  const refuse = (reason, status = 200) => ({ status, body: { ok: false, reason } });
  const answer = (body) => ({ status: 200, body });
  const linkKey = (placeId) => `placecard:link:${placeId}`;

  async function storeGet(key) {
    if (store && typeof store.get === 'function') {
      try { const v = await store.get(key); if (v) return JSON.parse(v); } catch { /* fall through */ }
    }
    const m = memStore.get(key);
    if (!m) return null;
    if (m.exp <= now()) { memStore.delete(key); return null; }
    try { return JSON.parse(m.json); } catch { return null; }
  }
  async function storeSet(key, entry) {
    const json = JSON.stringify(entry);
    if (memStore.size > 2000) memStore.clear();
    memStore.set(key, { exp: now() + STORE_TTL_S * 1000, json });
    if (store && typeof store.setEx === 'function') { try { await store.setEx(key, STORE_TTL_S, json); } catch { /* memory holds it */ } }
  }
  async function linkGet(placeId) {
    let raw = null;
    if (store && typeof store.get === 'function') { try { raw = await store.get(linkKey(placeId)); } catch { raw = null; } }
    if (!raw) raw = memLinks.get(placeId) || null;
    if (!raw) return null;
    try { const l = JSON.parse(raw); return l && typeof l.kind === 'string' && typeof l.name === 'string' ? l : null; } catch { return null; }
  }
  // A place ID with the kind and name of our record: no expiry, because the place does not move.
  async function linkSet(placeId, link) {
    const json = JSON.stringify(link);
    if (memLinks.size > 5000) memLinks.clear();
    memLinks.set(placeId, json);
    if (store && typeof store.set === 'function') { try { await store.set(linkKey(placeId), json); } catch { /* memory holds it */ } }
  }
  async function linkDrop(placeId) {
    memLinks.delete(placeId);
    if (store && typeof store.del === 'function') { try { await store.del(linkKey(placeId)); } catch { /* nothing to do */ } }
  }
  function findOwn(kind, name) {
    const arr = ownData()[kind];
    return Array.isArray(arr) ? (arr.find((r) => r && r.name === name) || null) : null;
  }
  const ownBody = (kind, rec, placeId) => ({
    ok: true, source: 'own', kind, family: KIND_FAMILY[kind] || 'building', own: rec,
    place: { placeId, name: rec.name, lat: rec.lat, lng: rec.lng },
  });
  // The card body from a stored entry. The open line is worked out here, at reading time.
  function render(entry, placeId, lang) {
    if (entry.own) {
      const rec = findOwn(entry.own.kind, entry.own.name);
      if (rec) return ownBody(entry.own.kind, rec, placeId);
    }
    const o = openLine(entry, now(), lang);
    return {
      ok: true, source: 'google', family: entry.family || 'building',
      place: {
        placeId, name: entry.name || '', typeLabel: entry.typeLabel || '', address: entry.address || '',
        lat: entry.lat, lng: entry.lng, country: entry.country || '',
        rating: entry.rating == null ? null : entry.rating, ratingCount: entry.ratingCount == null ? null : entry.ratingCount,
        priceLevel: entry.priceLevel == null ? null : entry.priceLevel,
        openNow: o.openNow, openLabel: o.label, closedGuess: o.guess, mapsUri: entry.mapsUri || '',
      },
    };
  }

  async function fromGoogle({ placeId, lang, readerId, key }) {
    const hold = await budget.reserve(readerId, CARD_MILLS);
    if (!hold.ok) return refuse(hold.reason === 'no-session' ? 'no-session' : hold.reason, hold.reason === 'no-session' ? 401 : 200);
    let data;
    try {
      data = await request({
        url: `${PLACES_URL}/${placeId}`,
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACE_CARD_FIELD_MASK },
        params: { languageCode: googleLang(lang) },
        timeout: 8000,
      });
    } catch (err) {
      await hold.release();
      console.error('[place-card] Google lookup failed:', err && err.message);
      return refuse('unavailable');
    }
    if (typeof onCall === 'function') { try { onCall('placeCard'); } catch { /* the count is not worth failing a card for */ } }
    const entry = toEntry(data);
    if (!entry) return refuse('unavailable');
    const hit = linkOwn({ name: entry.name, types: entry.types, lat: entry.lat, lng: entry.lng }, ownData());
    if (hit) {
      entry.own = { kind: hit.kind, name: hit.record.name };
      await linkSet(placeId, entry.own);
    }
    await storeSet(key, entry);
    return answer(render(entry, placeId, lang));
  }

  async function lookup({ placeId, lang, readerId } = {}) {
    if (!isPlaceId(placeId)) return refuse('bad-request', 400);
    if (readerId == null || readerId === '') return refuse('no-session', 401);
    const l = cardLang(lang);
    const key = `placecard:v1:${placeId}:${l}`;
    const stored = await storeGet(key);
    if (stored) return answer(render(stored, placeId, l));
    const link = await linkGet(placeId);
    if (link) {
      const rec = findOwn(link.kind, link.name);
      if (rec) return answer(ownBody(link.kind, rec, placeId));
      await linkDrop(placeId);
    }
    if (!apiKey || typeof request !== 'function') return refuse('unavailable');
    // Two taps on the same place at the same instant share one call (and one charge).
    if (inflight.has(key)) return inflight.get(key);
    const pending = fromGoogle({ placeId, lang: l, readerId, key }).finally(() => inflight.delete(key));
    inflight.set(key, pending);
    return pending;
  }

  // ── the full card (v0.62.993; spec Amendment 1, Part F) ─────────────────────────────────────────────
  const inflightFull = new Map();   // store key → the paid full lookup already under way for it
  const fullKey = (placeId, lang) => `placecard:full:v1:${placeId}:${lang}`;
  const cardKey = (placeId, lang) => `placecard:v1:${placeId}:${lang}`;
  const fullReady = () => !!full && typeof full.fieldMask === 'string' && !!full.fieldMask
    && typeof full.placeToVenue === 'function' && typeof full.enrichFast === 'function';
  const usable = (p) => !!p && typeof p.id === 'string' && !!(p.displayName && p.displayName.text)
    && !!p.location && Number.isFinite(p.location.latitude) && Number.isFinite(p.location.longitude);

  // The one paid step: reserve 26, ask Google once, build, store. Shared by presses that arrive together.
  async function fullFromGoogle({ placeId, lang, readerId, key }) {
    const hold = await budget.reserve(readerId, FULL_CARD_MILLS);
    if (!hold.ok) return refuse(hold.reason === 'no-session' ? 'no-session' : hold.reason, hold.reason === 'no-session' ? 401 : 200);
    let place;
    try {
      place = await request({
        url: `${PLACES_URL}/${placeId}`,
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': full.fieldMask },
        params: { languageCode: googleLang(lang) },
        timeout: 8000,
      });
    } catch (err) {
      await hold.release();
      console.error('[place-card] Google full lookup failed:', err && err.message);
      return refuse('unavailable');
    }
    // From here on Google has been paid, so nothing below gives the 26 back.
    if (typeof onCall === 'function') { try { onCall('placeCardFull'); } catch { /* the count is not worth failing a card for */ } }
    if (!usable(place)) return refuse('unavailable');
    // The small card's stored answer saw Google's whole type list; this answer has only the main type, because the
    // search's field list has no `types`. Where the small card has a verdict, it stands.
    const card = await storeGet(cardKey(placeId, lang));
    const family = card && card.family ? card.family : familyOf(place.types, place.primaryType);
    if (!FULL_FAMILIES.has(family)) { await storeSet(key, { reason: 'not-eatery' }); return refuse('not-eatery'); }
    if ((place.businessStatus ?? 'OPERATIONAL') !== 'OPERATIONAL') { await storeSet(key, { reason: 'not-operating' }); return refuse('not-operating'); }
    const built = await buildFullVenue(place, { lang, nowMs: now(), fresh: true }, full);
    await storeSet(key, { place: forStore(place), review: built.review });
    return answer({ ok: true, venue: built.venue });
  }

  // POST /api/place-card/full. `origin` is the reader's set location: it is used for the distance on the way out and
  // goes nowhere else. It is not part of the stored answer, the shared lookup or any log line.
  async function fullCard({ placeId, lang, readerId, origin } = {}) {
    if (!isPlaceId(placeId)) return refuse('bad-request', 400);
    if (readerId == null || readerId === '') return refuse('no-session', 401);
    if (!fullReady()) return refuse('unavailable');
    const l = cardLang(lang);
    const key = fullKey(placeId, l);
    let base = null;
    const stored = await storeGet(key);
    if (stored && stored.reason) return refuse(stored.reason);
    if (stored && stored.place) {
      const built = await buildFullVenue(stored.place, { lang: l, nowMs: now(), fresh: false, review: stored.review || null }, full);
      base = answer({ ok: true, venue: built.venue });
    }
    if (!base) {
      const card = await storeGet(cardKey(placeId, l));
      if (card && card.family && !FULL_FAMILIES.has(card.family)) return refuse('not-eatery');
      if (!apiKey || typeof request !== 'function') return refuse('unavailable');
      if (!inflightFull.has(key)) {
        inflightFull.set(key, fullFromGoogle({ placeId, lang: l, readerId, key }).finally(() => inflightFull.delete(key)));
      }
      base = await inflightFull.get(key);
    }
    if (!base || !base.body || base.body.ok !== true) return base;
    return answer({ ok: true, venue: withDistance(base.body.venue, origin) });
  }

  return { lookup, full: fullCard, budget };
}

module.exports = {
  CARD_MILLS, FULL_MILLS, TRANSLATE_MILLS, FULL_CARD_MILLS, READER_DAILY_MILLS, MONTHLY_MILLS, STORE_TTL_S,
  FULL_FAMILIES, buildFullVenue, withDistance,
  CARD_FIELDS, PLACE_CARD_FIELD_MASK, LANGS, cardLang, googleLang, isPlaceId,
  familyOf, closedGuess, openLine, LINK_MAX_M, nameKey, loadOwn, linkOwn,
  createBudget, createPlaceCard, sgtDay, sgtMonth, hashId,
};
