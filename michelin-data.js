// michelin-data.js — v0.61.331
//
// Unified Michelin loader. Merges the hand-curated Singapore dataset
// (michelin-2025.js, FLAT rows) with the per-country tables under
// michelin/ (venue-centric; all EMPTY today — the curator fills them
// from the official Michelin Guide) into one validated VENUE pool, and
// exposes city/country lookups, year/edition views, an awards-history
// diff, and a `hasMichelinData(cityOrCountry)` gate the search/cuisine
// layer can use to light the Michelin option only where curated rows
// exist.
//
// ── venue-award-schema.v0_1 ──────────────────────────────────────────
// Two shapes are accepted, and BOTH normalise to one Venue shape:
//
//   FLAT row (Singapore / michelin-2025.js):
//     { city, country, name, address, postal?, category, year,
//       cuisine?, vegetarian, halal }
//   → normalised to a Venue with a synthesised id and a single-award
//     history: awards:[{ year, category }].
//
//   VENUE row (per-country tables, michelin/<cc>.js):
//     { id, city, country, name, formerNames?, address, postal?,
//       cuisine?, vegetarian, halal, status?, awards:[{year,category}] }
//   → used as-is (validated).
//
// Unified Venue shape (the loaded pool):
//   { id, city, country, name, formerNames?, address, postal?,
//     cuisine?, vegetarian, halal, status, awards:[{year,category}] }
//   where:
//     - id        : REQUIRED stable slug `${cc}-${iata}-${kebab(name)}`
//                   (cc = lowercased ISO-2; iata = lowercased cities.js
//                   `code` for the venue's city). UNIQUE — a duplicate id
//                   at load THROWS (never a silent skip).
//     - city      : string; for venue-centric country rows it must exist
//                   in the curated cities table (throw if not). SG is the
//                   canonical home dataset and is always accepted.
//     - country   : ISO-2 string (e.g. 'SG', 'MY', 'JP').
//     - name      : non-empty string.
//     - address   : string (may be '' for hawker-centre Bib entries).
//     - status    : 'open' | 'closed' (default 'open'). Closed venues are
//                   EXCLUDED from visitableVenues() but INCLUDED in
//                   editionVenues(Y) (the year/edition view).
//     - awards    : Array<{ year:2025|2026, category:<enum> }>, length ≥ 1.
//
// Validation runs at load and FAILS LOUD: a bad category, a missing
// required field, a bad country/year, a city not in the curated table
// (venue-centric rows), or a DUPLICATE id all THROW — but every check is
// SAFE for empty files (an empty ENTRIES array loads cleanly). The
// per-(country, year) manifest count check is GATED on non-empty, so the
// empty michelin/my.js does NOT break boot.

'use strict';

const sg = require('./michelin-2025');

// Per-country table modules. Each exports { COUNTRY, ENTRIES:[] }.
// All empty today; the curator adds venue-centric rows by hand.
const COUNTRY_TABLES = [
  require('./michelin/my'),
  require('./michelin/th'),
  require('./michelin/vn'),
  require('./michelin/jp'),
  require('./michelin/kr'),
  require('./michelin/cn'),
  require('./michelin/hk'),
  require('./michelin/tw'),
];

const CATEGORIES = new Set(['three-star', 'two-star', 'one-star', 'bib-gourmand']);
const STATUSES = new Set(['open', 'closed']);
const VALID_YEARS = new Set([2025, 2026]);

// ── city table ───────────────────────────────────────────────────────
// `michelin-data.js` is CommonJS at the repo root; the curated cities
// source (web/cuisine/src/v2/lib/cities.js) is an ES module living under
// an iCloud-synced web/ tree. Rather than cross that boundary with a
// runtime ESM require at boot, the { city name → IATA code } map for the
// eight guide countries is embedded here, mirrored verbatim from
// cities.js (v0.61.242). Used for (a) city-membership validation of
// venue-centric rows and (b) the iata segment of synthesised SG ids.
// Keep in sync with cities.js if curated cities change.
//
// NOTE: Singapore is NOT a curated city in cities.js (no SG key) — the
// SG dataset is the canonical home pool, so SG flat rows are accepted
// without a city-table lookup and synthesise their id with iata 'sg'.
const CITY_IATA = Object.freeze({
  // Malaysia
  'kuala lumpur': 'KUL', 'putrajaya': 'KUL', 'shah alam': 'KUL', 'johor': 'JHB',
  'alor setar': 'AOR', 'kota kinabalu': 'BKI', 'kuching': 'KCH', 'kuantan': 'KUA',
  'kota bharu': 'KBR', 'kuala terengganu': 'TGG', 'george town': 'PEN', 'ipoh': 'IPH',
  'seremban': 'KUL', 'malacca city': 'MKZ', 'kangar': 'AOR',
  // Thailand
  'bangkok': 'BKK', 'chiang mai': 'CNX', 'phuket': 'HKT', 'pattaya': 'UTP',
  'hua hin': 'HHQ', 'krabi': 'KBV', 'ayutthaya': 'BKK', 'koh samui': 'USM',
  // Vietnam
  'ho chi minh city': 'SGN', 'hanoi': 'HAN', 'da nang': 'DAD', 'hoi an': 'DAD',
  'nha trang': 'CXR', 'hue': 'HUI', 'phu quoc': 'PQC', 'dalat': 'DLI',
  // Japan
  'tokyo': 'TYO', 'osaka': 'OSA', 'kyoto': 'OSA', 'yokohama': 'TYO',
  'fukuoka': 'FUK', 'sapporo': 'SPK', 'hiroshima': 'HIJ', 'nara': 'OSA',
  // South Korea
  'seoul': 'SEL', 'busan': 'PUS', 'incheon': 'ICN', 'jeju city': 'CJU',
  'daegu': 'TAE', 'daejeon': 'CJJ', 'gwangju': 'KWJ', 'gyeongju': 'TAE',
  // China
  'shanghai': 'SHA', 'beijing': 'BJS', 'guangzhou': 'CAN', 'shenzhen': 'SZX',
  'chengdu': 'CTU', 'hangzhou': 'HGH', "xi'an": 'XIY', 'suzhou': 'SHA',
  // Hong Kong districts
  'tsim sha tsui': 'HKG', 'central': 'HKG', 'causeway bay': 'HKG', 'mong kok': 'HKG',
  'wan chai': 'HKG', 'sha tin': 'HKG', 'aberdeen': 'HKG', 'tung chung': 'HKG',
  'tuen mun': 'HKG', 'yuen long': 'HKG', 'tai po': 'HKG', 'tseung kwan o': 'HKG',
  // Taiwan
  'taipei': 'TPE', 'kaohsiung': 'KHH', 'taichung': 'TXG', 'tainan': 'TNN',
  'hsinchu': 'HSZ', 'keelung': 'TPE', 'jiufen': 'TPE', 'sun moon lake': 'TXG',
});

// Per-(country, year) MANIFEST. The expected per-tier + total counts the
// curated tables must satisfy ONCE non-empty (gated — empty files skip).
// MY pre-registered from the official Malaysia guide (2025 + 2026); the
// curator's eventual 130-row table must match exactly or load throws.
const COUNTRY_MANIFEST = Object.freeze({
  MY: {
    2025: { 'two-star': 1, 'one-star': 6, 'bib-gourmand': 56, total: 63 },
    2026: { 'two-star': 1, 'one-star': 8, 'bib-gourmand': 58, total: 67 },
  },
});

// kebab-case a venue name for the id slug: lowercase, strip accents /
// punctuation, collapse whitespace + separators to single hyphens.
function kebab(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip diacritics (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')                         // non-alnum → hyphen
    .replace(/^-+|-+$/g, '');                            // trim hyphens
}

function _isIso2(cc) {
  return typeof cc === 'string' && /^[A-Z]{2}$/.test(cc);
}

function _cityIata(city) {
  return CITY_IATA[String(city || '').trim().toLowerCase()] || null;
}

// Synthesise a stable id for a normalised venue when one is not supplied
// (FLAT SG rows). cc = lowercased ISO-2; iata = lowercased cities.js code
// for the city, or 'sg' / the lowercased cc when the city is not curated
// (SG has no cities.js row by design).
function synthId(country, city, name) {
  const cc = String(country || '').toLowerCase();
  const iata = (_cityIata(city) || (cc === 'sg' ? 'sg' : cc) || 'xx').toLowerCase();
  return `${cc}-${iata}-${kebab(name)}`;
}

// ── flat-row validation (legacy SG shape) ────────────────────────────
// Kept for backward compatibility: `validateEntry` validates a FLAT row
// (the SG schema). Throws on any contract breach.
const FLAT_REQUIRED = ['city', 'country', 'name', 'address', 'category', 'year'];

function validateEntry(entry, source = 'unknown') {
  const where = `[michelin-data] ${source}`;
  if (!entry || typeof entry !== 'object') {
    throw new Error(`${where}: entry is not an object`);
  }
  for (const k of FLAT_REQUIRED) {
    if (entry[k] === undefined || entry[k] === null) {
      throw new Error(`${where}: missing required field "${k}" on ${JSON.stringify(entry.name || entry)}`);
    }
  }
  if (typeof entry.name !== 'string' || !entry.name.trim()) {
    throw new Error(`${where}: "name" must be a non-empty string`);
  }
  if (typeof entry.address !== 'string') {
    throw new Error(`${where}: "address" must be a string (may be empty) on "${entry.name}"`);
  }
  if (typeof entry.city !== 'string' || !entry.city.trim()) {
    throw new Error(`${where}: "city" must be a non-empty string on "${entry.name}"`);
  }
  if (!_isIso2(entry.country)) {
    throw new Error(`${where}: "country" must be an ISO-2 code on "${entry.name}", got ${JSON.stringify(entry.country)}`);
  }
  if (!CATEGORIES.has(entry.category)) {
    throw new Error(`${where}: invalid category ${JSON.stringify(entry.category)} on "${entry.name}" — must be one of ${[...CATEGORIES].join(', ')}`);
  }
  if (!VALID_YEARS.has(entry.year)) {
    throw new Error(`${where}: "year" must be 2025 or 2026 on "${entry.name}", got ${JSON.stringify(entry.year)}`);
  }
  if (entry.postal !== undefined && typeof entry.postal !== 'string') {
    throw new Error(`${where}: "postal" must be a string when present on "${entry.name}"`);
  }
  if (entry.cuisine !== undefined && typeof entry.cuisine !== 'string') {
    throw new Error(`${where}: "cuisine" must be a string when present on "${entry.name}"`);
  }
  for (const flag of ['vegetarian', 'halal']) {
    if (entry[flag] !== undefined && typeof entry[flag] !== 'boolean') {
      throw new Error(`${where}: "${flag}" must be a boolean when present on "${entry.name}"`);
    }
  }
  return true;
}

// ── venue validation (venue-award-schema.v0_1) ───────────────────────
// Validates an ALREADY-NORMALISED venue (id present, awards[] present).
// `requireCuratedCity` = true for venue-centric country rows (city must
// be in CITY_IATA); false for SG (canonical home pool — city not in the
// curated table by design).
function validateVenue(v, source = 'unknown', requireCuratedCity = true) {
  const where = `[michelin-data] ${source}`;
  if (!v || typeof v !== 'object') {
    throw new Error(`${where}: venue is not an object`);
  }
  if (typeof v.id !== 'string' || !v.id.trim()) {
    throw new Error(`${where}: "id" must be a non-empty string on ${JSON.stringify(v.name || v)}`);
  }
  if (typeof v.name !== 'string' || !v.name.trim()) {
    throw new Error(`${where}: "name" must be a non-empty string on id "${v.id}"`);
  }
  if (typeof v.address !== 'string') {
    throw new Error(`${where}: "address" must be a string (may be empty) on "${v.name}"`);
  }
  if (typeof v.city !== 'string' || !v.city.trim()) {
    throw new Error(`${where}: "city" must be a non-empty string on "${v.name}"`);
  }
  if (requireCuratedCity && !_cityIata(v.city)) {
    throw new Error(`${where}: "city" ${JSON.stringify(v.city)} on "${v.name}" is not a curated city (cities.js) — add it there first or fix the spelling`);
  }
  if (!_isIso2(v.country)) {
    throw new Error(`${where}: "country" must be an ISO-2 code on "${v.name}", got ${JSON.stringify(v.country)}`);
  }
  if (!STATUSES.has(v.status)) {
    throw new Error(`${where}: "status" must be 'open' or 'closed' on "${v.name}", got ${JSON.stringify(v.status)}`);
  }
  if (v.formerNames !== undefined &&
      !(Array.isArray(v.formerNames) && v.formerNames.every((n) => typeof n === 'string'))) {
    throw new Error(`${where}: "formerNames" must be an array of strings when present on "${v.name}"`);
  }
  if (v.postal !== undefined && typeof v.postal !== 'string') {
    throw new Error(`${where}: "postal" must be a string when present on "${v.name}"`);
  }
  if (v.cuisine !== undefined && typeof v.cuisine !== 'string') {
    throw new Error(`${where}: "cuisine" must be a string when present on "${v.name}"`);
  }
  for (const flag of ['vegetarian', 'halal']) {
    if (typeof v[flag] !== 'boolean') {
      throw new Error(`${where}: "${flag}" must be a boolean on "${v.name}"`);
    }
  }
  if (!Array.isArray(v.awards) || v.awards.length < 1) {
    throw new Error(`${where}: "awards" must be a non-empty array on "${v.name}"`);
  }
  for (const a of v.awards) {
    if (!a || typeof a !== 'object') {
      throw new Error(`${where}: each award must be an object on "${v.name}"`);
    }
    if (!CATEGORIES.has(a.category)) {
      throw new Error(`${where}: invalid award category ${JSON.stringify(a.category)} on "${v.name}" — must be one of ${[...CATEGORIES].join(', ')}`);
    }
    if (!VALID_YEARS.has(a.year)) {
      throw new Error(`${where}: award "year" must be 2025 or 2026 on "${v.name}", got ${JSON.stringify(a.year)}`);
    }
  }
  return true;
}

// ── normalisation ────────────────────────────────────────────────────
// Normalise a FLAT SG row → Venue. Synthesises the id (sg-<iata>-<kebab>)
// and folds { year, category } into a single-element awards[] history.
// The boolean flags default to false. Does NOT mutate the source object
// (the curated SG literals stay byte-stable).
function flatToVenue(entry) {
  const v = {
    id: synthId(entry.country, entry.city, entry.name),
    city: entry.city,
    country: entry.country,
    name: entry.name,
    address: entry.address,
    cuisine: entry.cuisine,
    vegetarian: entry.vegetarian === true,
    halal: entry.halal === true,
    status: entry.status === 'closed' ? 'closed' : 'open',
    awards: [{ year: entry.year, category: entry.category }],
  };
  if (entry.postal !== undefined) v.postal = entry.postal;
  if (entry.formerNames !== undefined) v.formerNames = entry.formerNames;
  return v;
}

// Normalise a VENUE-centric country row → Venue. Used as-is, with the
// boolean flags + status defaulted and a shallow copy of awards[].
function venueToVenue(entry) {
  const v = {
    id: entry.id,
    city: entry.city,
    country: entry.country,
    name: entry.name,
    address: entry.address,
    cuisine: entry.cuisine,
    vegetarian: entry.vegetarian === true,
    halal: entry.halal === true,
    status: entry.status === 'closed' ? 'closed' : 'open',
    awards: Array.isArray(entry.awards) ? entry.awards.map((a) => ({ year: a.year, category: a.category })) : entry.awards,
  };
  if (entry.postal !== undefined) v.postal = entry.postal;
  if (entry.formerNames !== undefined) v.formerNames = entry.formerNames;
  return v;
}

// Legacy export name kept for compatibility — a flat→full shallow copy
// with the boolean flags defaulted (NOT venue-centric). Some external
// callers/tests may import this; preserve its v0.61.330 behaviour.
function normalizeEntry(entry) {
  return {
    ...entry,
    vegetarian: entry.vegetarian === true,
    halal: entry.halal === true,
  };
}

// ── pure merge / dedup ───────────────────────────────────────────────
// Add `venues` into `target`/`byId`, throwing on a DUPLICATE id (key =
// venue.id ONLY — a dup is a hard error including both names, never a
// silent skip). Pure over its args; reused by the load below and
// directly testable with synthetic fixtures.
function dedupById(venues, target, byId, source = 'unknown') {
  for (const v of venues) {
    if (byId.has(v.id)) {
      const prev = byId.get(v.id);
      throw new Error(
        `[michelin-data] ${source}: DUPLICATE venue id "${v.id}" — ` +
        `"${v.name}" collides with "${prev.name}". ids must be unique; ` +
        `disambiguate the name or fix the duplicate.`
      );
    }
    byId.set(v.id, v);
    target.push(v);
  }
  return target;
}

// ── load: build the venue pool once ──────────────────────────────────
const VENUES = [];           // normalised venue pool
const _byId = new Map();     // id → venue (dup detection)

// Ingest the FLAT SG rows → venues (canonical home pool: city not checked
// against the curated cities table).
function _ingestFlat(entries, source) {
  if (!Array.isArray(entries)) {
    throw new Error(`[michelin-data] ${source}: ENTRIES is not an array`);
  }
  const out = [];
  for (const e of entries) {
    validateEntry(e, source);                 // flat-shape contract
    const v = flatToVenue(e);
    validateVenue(v, source, /* requireCuratedCity */ false);
    out.push(v);
  }
  dedupById(out, VENUES, _byId, source);
}

// Ingest a venue-centric country table → venues (city MUST be curated).
function _ingestVenues(entries, source) {
  if (!Array.isArray(entries)) {
    throw new Error(`[michelin-data] ${source}: ENTRIES is not an array`);
  }
  const out = [];
  for (const e of entries) {
    const v = venueToVenue(e);
    validateVenue(v, source, /* requireCuratedCity */ true);
    out.push(v);
  }
  dedupById(out, VENUES, _byId, source);
}

// Per-(country, year) manifest assertion — GATED on non-empty. Only runs
// when the country has ≥1 venue; an empty table is skipped so empty files
// boot fine. Asserts per-tier + total award counts per year, and (when a
// total manifest sum is declared) that the country's TOTAL award count
// matches the sum across years. Computes counts, never hardcodes them.
function assertManifest(cc, venues, source = 'unknown', manifestOverride) {
  const manifest = manifestOverride || COUNTRY_MANIFEST[cc];
  if (!manifest) return;                       // no manifest registered
  if (!venues.length) return;                  // GATE: empty → skip

  let totalAwards = 0;
  let manifestTotalAwards = 0;
  for (const [yStr, expected] of Object.entries(manifest)) {
    const year = Number(yStr);
    const counts = {};
    for (const v of venues) {
      for (const a of v.awards) {
        if (a.year === year) counts[a.category] = (counts[a.category] || 0) + 1;
      }
    }
    let yearTotal = 0;
    for (const [tier, want] of Object.entries(expected)) {
      if (tier === 'total') continue;
      const got = counts[tier] || 0;
      manifestTotalAwards += want;
      if (got !== want) {
        throw new Error(
          `[michelin-data] ${source}: ${cc} ${year} manifest mismatch for "${tier}" — expected ${want}, got ${got}`
        );
      }
      yearTotal += got;
    }
    if (expected.total !== undefined && yearTotal !== expected.total) {
      throw new Error(
        `[michelin-data] ${source}: ${cc} ${year} manifest TOTAL mismatch — expected ${expected.total}, got ${yearTotal}`
      );
    }
    totalAwards += yearTotal;
  }

  // Cross-year total award assertion (e.g. MY: sum of all awards === 130).
  if (manifestTotalAwards > 0 && totalAwards !== manifestTotalAwards) {
    throw new Error(
      `[michelin-data] ${source}: ${cc} total-award mismatch — expected ${manifestTotalAwards} across all years, got ${totalAwards}`
    );
  }
}

// SG (flat) first, then the venue-centric country tables.
_ingestFlat(sg.getAll(), 'SG (michelin-2025.js)');
for (const tbl of COUNTRY_TABLES) {
  const cc = String(tbl.COUNTRY || '').toUpperCase();
  const source = `country=${cc} (michelin/${cc.toLowerCase()}.js)`;
  _ingestVenues(tbl.ENTRIES, source);
  const ccVenues = VENUES.filter((v) => String(v.country).toUpperCase() === cc);
  assertManifest(cc, ccVenues, source);
}

// ── back-compat flat view ────────────────────────────────────────────
// The legacy consumers (index.js Michelin card, michelin-walk) expect a
// FLAT entry list: { city, country, name, address, postal?, category,
// year, cuisine?, vegetarian, halal }. Derive one flat row PER AWARD from
// the venue pool so `getAll` / `michelinForCity` / `michelinForCountry`
// keep their v0.61.330 contract (130 SG rows, each with category + year).
function _venueToFlatRows(v) {
  return v.awards.map((a) => {
    const row = {
      city: v.city,
      country: v.country,
      name: v.name,
      address: v.address,
      category: a.category,
      year: a.year,
      vegetarian: v.vegetarian,
      halal: v.halal,
    };
    if (v.postal !== undefined) row.postal = v.postal;
    if (v.cuisine !== undefined) row.cuisine = v.cuisine;
    return row;
  });
}

const ALL = [];
for (const v of VENUES) {
  for (const row of _venueToFlatRows(v)) ALL.push(row);
}

// Set of cities + countries that currently have ≥1 curated venue.
const _populated = new Set();
for (const v of VENUES) {
  _populated.add(String(v.city).toLowerCase());
  _populated.add(String(v.country).toLowerCase());
}

function hasMichelinData(cityOrCountry) {
  if (!cityOrCountry) return false;
  return _populated.has(String(cityOrCountry).trim().toLowerCase());
}

// ── flat getters (back-compat — over the derived flat rows) ──────────
function michelinForCity(city) {
  if (!city) return [];
  const target = String(city).trim().toLowerCase();
  return ALL.filter((e) => String(e.city).toLowerCase() === target);
}

function michelinForCountry(cc) {
  if (!cc) return [];
  const target = String(cc).trim().toLowerCase();
  return ALL.filter((e) => String(e.country).toLowerCase() === target);
}

function getAll() {
  return [...ALL];
}

// ── venue-centric getters (venue-award-schema.v0_1) ──────────────────
function getAllVenues() {
  return [...VENUES];
}

function venueById(id) {
  if (!id) return null;
  return _byId.get(String(id)) || null;
}

function venuesForCity(city) {
  if (!city) return [];
  const target = String(city).trim().toLowerCase();
  return VENUES.filter((v) => String(v.city).toLowerCase() === target);
}

function venuesForCountry(cc) {
  if (!cc) return [];
  const target = String(cc).trim().toLowerCase();
  return VENUES.filter((v) => String(v.country).toLowerCase() === target);
}

// All venues holding an award in year Y.
function venuesForYear(year) {
  return VENUES.filter((v) => v.awards.some((a) => a.year === year));
}

// The category a venue held in year Y, or null if it had no award that year.
function categoryForYear(venue, year) {
  if (!venue || !Array.isArray(venue.awards)) return null;
  const hit = venue.awards.find((a) => a.year === year);
  return hit ? hit.category : null;
}

// Default visitable surface: open venues only (excludes status:'closed').
function visitableVenues(pool) {
  const src = Array.isArray(pool) ? pool : VENUES;
  return src.filter((v) => v.status !== 'closed');
}

// Year/edition view: every venue with an award in year Y, INCLUDING
// closed venues (the edition is a historical snapshot).
function editionVenues(year) {
  return venuesForYear(year);
}

// ── awards history diff (for the future "new for 2026" UI) ───────────
// Derives, from awards[] sorted by year:
//   { debutYear, latestYear, latestCategory, promotions:[{from,to,year}],
//     demotions:[{from,to,year}], droppedAfter? }
// Tier rank: bib-gourmand (0) < one-star (1) < two-star (2) < three-star (3).
// A higher rank year-over-year is a promotion; lower is a demotion. If the
// venue is closed (or absent from the latest edition year), droppedAfter is
// the last year it held an award.
const TIER_RANK = { 'bib-gourmand': 0, 'one-star': 1, 'two-star': 2, 'three-star': 3 };
const MAX_EDITION_YEAR = Math.max(...VALID_YEARS);

function awardsDiff(venue) {
  if (!venue || !Array.isArray(venue.awards) || venue.awards.length === 0) {
    return { debutYear: null, latestYear: null, latestCategory: null, promotions: [], demotions: [] };
  }
  const sorted = [...venue.awards].sort((a, b) => a.year - b.year);
  const debutYear = sorted[0].year;
  const latest = sorted[sorted.length - 1];
  const promotions = [];
  const demotions = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const pr = TIER_RANK[prev.category];
    const cr = TIER_RANK[cur.category];
    if (cr > pr) promotions.push({ from: prev.category, to: cur.category, year: cur.year });
    else if (cr < pr) demotions.push({ from: prev.category, to: cur.category, year: cur.year });
  }
  const out = {
    debutYear,
    latestYear: latest.year,
    latestCategory: latest.category,
    promotions,
    demotions,
  };
  // Dropped: closed, or no award in the most recent edition year.
  if (venue.status === 'closed' || latest.year < MAX_EDITION_YEAR) {
    out.droppedAfter = latest.year;
  }
  return out;
}

module.exports = {
  // schema constants
  CATEGORIES,
  STATUSES,
  VALID_YEARS,
  COUNTRY_MANIFEST,
  CITY_IATA,
  // id / normalisation helpers
  kebab,
  synthId,
  flatToVenue,
  venueToVenue,
  normalizeEntry,
  // validation
  validateEntry,    // flat-shape (legacy)
  validateVenue,    // venue-centric (venue-award-schema.v0_1)
  dedupById,        // pure dup-id merge (throws on collision)
  assertManifest,   // pure per-(country,year) manifest check (gated on non-empty)
  // gate
  hasMichelinData,
  // flat getters (back-compat)
  michelinForCity,
  michelinForCountry,
  getAll,
  ALL,
  // venue-centric getters
  getAllVenues,
  VENUES,
  venueById,
  venuesForCity,
  venuesForCountry,
  venuesForYear,
  categoryForYear,
  visitableVenues,
  editionVenues,
  awardsDiff,
};
