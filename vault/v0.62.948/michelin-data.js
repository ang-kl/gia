// michelin-data.js — v0.61.333
//
// Venue-centric Michelin loader (venue-award-schema.v0_1). Loads the
// per-country tables ({CC}-michelin.js at the repo root; venue-centric)
// into one validated VENUE pool, and exposes city/country lookups,
// year/edition views, an awards-history diff, and a
// `hasMichelinData(cityOrCountry)` gate the search/cuisine layer can use
// to light the Michelin option only where curated rows exist.
//
// ── SINGAPORE IS DECOUPLED ───────────────────────────────────────────
// As of v0.61.333 the loader NO LONGER ingests the Singapore dataset.
// SG lives in its own standalone `SG-michelin.js` (the original flat
// curated list + its annotation helpers) and the /cuisine "✳️ Michelin
// List" card uses that file DIRECTLY on a fast path. Consequently
// `hasMichelinData('Singapore')` is now FALSE from THIS loader — that is
// intentional: the loader is venue-centric only, and SG is handled by its
// own module. The country tables here are the new {CC}-michelin.js files
// at the repo root (all empty today except MY).
//
// ── venue-award-schema.v0_1 ──────────────────────────────────────────
// Each country table exports { COUNTRY, ENTRIES:[Venue] } where a Venue is:
//   { id, city, country, name, formerNames?, address, postal?,
//     cuisine?, vegetarian, halal, status?, awards:[{year,category}] }
//   → validated and used as-is.
//
// Unified Venue shape (the loaded pool):
//   { id, city, country, name, formerNames?, address, postal?,
//     cuisine?, vegetarian, halal, status, awards:[{year,category}] }
//   where:
//     - id        : REQUIRED stable slug `${cc}-${iata}-${kebab(name)}`
//                   (cc = lowercased ISO-2; iata = lowercased cities.js
//                   `code` for the venue's city). UNIQUE — a duplicate id
//                   at load THROWS (never a silent skip).
//     - city      : string; must exist in the curated cities table
//                   (throw if not).
//     - country   : ISO-2 string (e.g. 'MY', 'JP').
//     - name      : non-empty string.
//     - address   : string (may be '' for hawker-centre Bib entries).
//     - status    : 'open' | 'closed' (default 'open'). Closed venues are
//                   EXCLUDED from visitableVenues() but INCLUDED in
//                   editionVenues(Y) (the year/edition view).
//     - awards    : Array<{ year:2025|2026, category:<enum> }>. Length ≥ 1
//                   EXCEPT on a Green Star holder, which may hold none —
//                   see greenStarYears below and the note in validateVenue.
//
// Validation runs at load and FAILS LOUD: a bad category, a missing
// required field, a bad country/year, a city not in the curated table, or
// a DUPLICATE id all THROW — but every check is SAFE for empty files (an
// empty ENTRIES array loads cleanly). The per-(country, year) manifest
// count check is GATED on non-empty, so empty country files do NOT break
// boot.

'use strict';

// Per-country table modules. Each exports { COUNTRY, ENTRIES:[Venue] }.
// All empty today EXCEPT MY (70 venues); the curator adds the rest by hand.
const COUNTRY_TABLES = [
  require('./MY-michelin'),
  require('./FR-michelin'),
  require('./TH-michelin'),
  require('./VN-michelin'),
  require('./JP-michelin'),
  require('./KR-michelin'),
  require('./CN-michelin'),
  require('./HK-michelin'),
  require('./MO-michelin'),
  require('./PH-michelin'),
  require('./TW-michelin'),
];

const { assertCityManifest } = require('./michelin-city-manifest');

const CATEGORIES = new Set(['three-star', 'two-star', 'one-star', 'bib-gourmand']);
const STATUSES = new Set(['open', 'closed']);
const VALID_YEARS = new Set([2025, 2026]);

// ── MICHELIN Green Star ──────────────────────────────────────────────
// The Green Star is a SUSTAINABILITY distinction, not a rung on the star
// ladder: a restaurant may hold three Stars and a Green Star in the same
// edition, or a Green Star and nothing else. That is why it is a PARALLEL
// field (`greenStarYears: [2026]`) rather than another `awards[].category`.
// v0.62.764: a Green Star can now stand ALONE. Vietnam's three 2026 holders
// carry no star and no Bib, so `awards: []` is legal for them and illegal for
// anything else. Two consequences worth knowing before adding more:
//   - they appear in `editionVenues(Y)` and `greenStarVenues(Y)`, but NOT in
//     `venuesForYear(Y)`, which stays strictly award-based because every
//     manifest count derives from it;
//   - v0.62.766: they DO produce flat rows now — one per Green Star year,
//     carrying `category: 'green-star'`. A venue holding both an award and a
//     Green Star still emits exactly one row per award, flagged
//     `greenStar: true`, so nothing is double-listed. Every flat row carries
//     a boolean `greenStar`. The load-time guard below predates this and is
//     kept: it costs nothing and still catches a city whose only venue is
//     award-less, which remains a thin surface even now.
//
// Modelling it as a category was the obvious first move and is wrong twice
// over. `_venueToFlatRows` emits one flat row PER AWARD, so a one-starred
// venue that also held a Green Star would appear TWICE in every flat view
// (`michelinForCity`, `getAll`) — once as a star, once as a green star —
// and the manifest `total`, which counts award rows, would silently grow by
// the number of Green Stars without any tier changing. Neither failure
// throws; both just quietly misreport. A parallel field cannot do either.
//
// Per-edition history is kept for the same reason the awards carry a year:
// a Green Star can be gained or lost between editions like any other.
const GREEN_STAR_KEY = 'greenStarYears';

// ── city table ───────────────────────────────────────────────────────
// `michelin-data.js` is CommonJS at the repo root; the curated cities
// source (web/cuisine/src/v2/lib/cities.js) is an ES module living under
// an iCloud-synced web/ tree. Rather than cross that boundary with a
// runtime ESM require at boot, the { city name → IATA code } map for the
// eight guide countries is embedded here, mirrored verbatim from
// cities.js (v0.61.242). Used for city-membership validation of
// venue-centric rows. Keep in sync with cities.js if curated cities change.
const CITY_IATA = Object.freeze({
  // Malaysia
  'kuala lumpur': 'KUL', 'putrajaya': 'KUL', 'shah alam': 'KUL', 'johor': 'JHB',
  'alor setar': 'AOR', 'kota kinabalu': 'BKI', 'kuching': 'KCH', 'kuantan': 'KUA',
  'kota bharu': 'KBR', 'kuala terengganu': 'TGG', 'george town': 'PEN', 'ipoh': 'IPH',
  'seremban': 'KUL', 'malacca city': 'MKZ', 'kangar': 'AOR',
  // Thailand
  'bangkok': 'BKK', 'chiang mai': 'CNX', 'phuket': 'HKT', 'pattaya': 'UTP',
  'hua hin': 'HHQ', 'krabi': 'KBV', 'ayutthaya': 'BKK', 'koh samui': 'USM',
  'nonthaburi': 'DMK', 'phang-nga': 'HKT', 'chon buri': 'UTP', 'khon kaen': 'KKC',
  'ko samui': 'USM', 'nakhon pathom': 'DMK', 'nakhon ratchasima': 'NAK',
  'pathum thani': 'DMK', 'phra nakhon si ayutthaya': 'DMK', 'samut sakhon': 'BKK',
  'surat thani': 'URT', 'ubon ratchathani': 'UBP', 'udon thani': 'UTH',
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
  'xiamen': 'XMN', 'nanjing': 'NKG', 'taizhou': 'HYN', 'fuzhou': 'FOC',
  'wenzhou': 'WNZ', 'quanzhou': 'JJN', 'yangzhou': 'YTY', 'changzhou': 'CZX',
  'ningde': 'FOC',
  // Hong Kong (territory + districts)
  'hong kong': 'HKG',
  // Macau
  'macau': 'MFM',
  // Philippines (Metro Manila districts → MNL; Cebu → CEB; Cavite → MNL)
  'makati - metro manila': 'MNL', 'taguig - metro manila': 'MNL',
  'quezon - metro manila': 'MNL', 'parañaque - metro manila': 'MNL',
  'manila - metro manila': 'MNL', 'cavite': 'MNL', 'cebu': 'CEB',
  'tsim sha tsui': 'HKG', 'central': 'HKG', 'causeway bay': 'HKG', 'mong kok': 'HKG',
  'wan chai': 'HKG', 'sha tin': 'HKG', 'aberdeen': 'HKG', 'tung chung': 'HKG',
  'tuen mun': 'HKG', 'yuen long': 'HKG', 'tai po': 'HKG', 'tseung kwan o': 'HKG',
  // France
  'paris': 'PAR', 'lyon': 'LYS', 'marseille': 'MRS', 'nice': 'NCE',
  'bordeaux': 'BOD', 'toulouse': 'TLS', 'strasbourg': 'SXB', 'nantes': 'NTE',
  'montpellier': 'MPL', 'lille': 'LIL', 'rennes': 'RNS', 'reims': 'RHE',
  // Taiwan
  'taipei': 'TPE', 'kaohsiung': 'KHH', 'taichung': 'TXG', 'tainan': 'TNN',
  'hsinchu': 'HSZ', 'hsinchu city': 'HSZ', 'hsinchu county': 'HSZ', 'new taipei': 'TPE', 'keelung': 'TPE', 'jiufen': 'TPE', 'sun moon lake': 'TXG',
});

// Per-(country, year) MANIFEST. The expected per-tier + total counts the
// curated tables must satisfy ONCE non-empty (gated — empty files skip).
// MY pre-registered from the official Malaysia guide (2025 + 2026); the
// curator's 130-award table must match exactly or load throws.
const COUNTRY_MANIFEST = Object.freeze({
  MY: {
    2025: { 'two-star': 1, 'one-star': 6, 'bib-gourmand': 56, total: 63 },
    2026: { 'two-star': 1, 'one-star': 8, 'bib-gourmand': 58, total: 67 },
  },
  TH: {
    2025: { 'three-star': 1, 'two-star': 7, 'one-star': 28, 'bib-gourmand': 124, total: 160 },
    2026: { 'three-star': 2, 'two-star': 8, 'one-star': 33, 'bib-gourmand': 137, total: 180 },
  },
  JP: {
    // 2025 PARTIAL — source captured only upper tiers (no Bib Gourmand).
    2025: { 'three-star': 20, 'two-star': 57, 'one-star': 8, total: 85 },
    2026: { 'three-star': 21, 'two-star': 61, 'one-star': 279, 'bib-gourmand': 228, total: 589 },
  },
  KR: {
    // 2025 PARTIAL — source captured only upper tiers (no Bib Gourmand).
    2025: { 'three-star': 1, 'two-star': 8, 'one-star': 1, total: 10 },
    2026: { 'three-star': 1, 'two-star': 10, 'one-star': 35, 'bib-gourmand': 71, total: 117 },
  },
  TW: {
    // 2026 curated (verified 30 Jul 2026): 9 new one-star, 1 promoted (NOBUO
    // one-star→two-star), 1 new two-star debut (Mizue), 2 one-star dropped
    // (Fleur de Sel, Paris 1930 de Hideki Takayama), 13 new Bib Gourmand, 10
    // Bib Gourmand dropped (an 11th, closed-down "木公麥面" in Taichung, was
    // never captured in this file's 2025 snapshot — no row to drop).
    2025: { 'three-star': 3, 'two-star': 7, 'one-star': 43, 'bib-gourmand': 143, total: 196 },
    2026: { 'three-star': 3, 'two-star': 9, 'one-star': 49, 'bib-gourmand': 146, total: 207 },
  },
  VN: {
    // 2025 PARTIAL — source captured one-stars only (no Bib Gourmand).
    // Vietnam has no two-/three-star venues in either edition.
    2025: { 'one-star': 9, total: 9 },
    // 'green-star' is asserted separately and is NOT part of `total` — the
    // three 2026 holders carry no award at all, so `total` (which counts
    // award rows) stays 83 while venuesForCountry('VN') reads 86.
    2026: { 'one-star': 11, 'bib-gourmand': 72, total: 83, 'green-star': 3 },
  },
  HK: {
    // 2025 PARTIAL — source captured upper tiers only (no Bib Gourmand).
    2025: { 'three-star': 7, 'two-star': 11, 'one-star': 1, total: 19 },
    // 'green-star' is asserted separately and is NOT part of `total` — see the
    // Green Star note above CATEGORIES for why it is not an award row.
    2026: { 'three-star': 7, 'two-star': 13, 'one-star': 57, 'bib-gourmand': 70, total: 147, 'green-star': 4 },
  },
  MO: {
    // 2025 PARTIAL — source captured the stars only (no one-star, no Bib).
    2025: { 'three-star': 2, 'two-star': 6, total: 8 },
    2026: { 'three-star': 2, 'two-star': 6, 'one-star': 13, 'bib-gourmand': 13, total: 34, 'green-star': 1 },
  },
  PH: {
    // 2026-ONLY — the Philippines guide launched with the 2026 edition.
    2026: { 'two-star': 1, 'one-star': 8, 'bib-gourmand': 25, total: 34 },
  },
  CN: {
    // 2025 PARTIAL — source captured upper tiers + some Bib (no three-star).
    2025: { 'two-star': 3, 'one-star': 17, 'bib-gourmand': 44, total: 64 },
    2026: { 'three-star': 3, 'two-star': 27, 'one-star': 126, 'bib-gourmand': 355, total: 511 },
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

// Synthesise a stable id for a venue from its country/city/name (the same
// slug the curated tables use). cc = lowercased ISO-2; iata = lowercased
// cities.js code for the city, or the lowercased cc when uncurated.
function synthId(country, city, name) {
  const cc = String(country || '').toLowerCase();
  const iata = (_cityIata(city) || cc || 'xx').toLowerCase();
  return `${cc}-${iata}-${kebab(name)}`;
}

// ── venue validation (venue-award-schema.v0_1) ───────────────────────
// Validates an ALREADY-NORMALISED venue (id present, awards[] present).
// `requireCuratedCity` = true for venue-centric country rows (city must
// be in CITY_IATA); false only for synthetic fixtures in tests.
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
  // O-163 / v0.62.764. `awards` was required to be NON-EMPTY. That made a
  // MICHELIN Green Star unrepresentable on its own: the three Vietnam 2026
  // holders — Nen Danang, Lamai Garden, Tales by Chapter — carry no star and
  // no Bib, so there was no legal row for them and the gap sat open as "needs
  // a schema decision" rather than as missing data.
  //
  // The rule is NARROWED, not dropped: a venue may have zero awards ONLY if it
  // holds a Green Star. An award-less venue with no Green Star is still an
  // error, because it is a row with no reason to exist — which is the check
  // the old rule was really making.
  if (!Array.isArray(v.awards)) {
    throw new Error(`${where}: "awards" must be an array on "${v.name}"`);
  }
  if (v.awards.length < 1) {
    const gs = v[GREEN_STAR_KEY];
    if (!Array.isArray(gs) || !gs.length) {
      throw new Error(
        `${where}: "awards" may only be empty on a Green Star holder — "${v.name}" has neither`
      );
    }
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
  // Green Star: optional, but when present must be an array of valid edition
  // years with no duplicates. Absent and empty are both "no Green Star".
  if (v[GREEN_STAR_KEY] !== undefined) {
    const gs = v[GREEN_STAR_KEY];
    if (!Array.isArray(gs)) {
      throw new Error(`${where}: "${GREEN_STAR_KEY}" must be an array when present on "${v.name}"`);
    }
    for (const y of gs) {
      if (!VALID_YEARS.has(y)) {
        throw new Error(`${where}: "${GREEN_STAR_KEY}" entries must be a valid edition year on "${v.name}", got ${JSON.stringify(y)}`);
      }
    }
    if (new Set(gs).size !== gs.length) {
      throw new Error(`${where}: "${GREEN_STAR_KEY}" has duplicate years on "${v.name}"`);
    }
  }
  return true;
}

// ── normalisation ────────────────────────────────────────────────────
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
  // v0.62.824 — THE NATIVE NAME THE COUNTRY TABLES ALREADY CARRY.
  //
  // JP/CN/KR store `nameJa`/`nameZh`/`nameKo` (+ the address twin) verbatim from the
  // operator's curated source — 1,202 rows of them. This function rebuilds every venue
  // from a whitelist, and for three versions those fields were simply not on it: read
  // from disk and dropped in the same breath. `JP-michelin.js`'s own header said
  // "stored now; surfaced on the card in a later follow-up"; this is that follow-up.
  //
  // NORMALISED TO ONE FIELD, not passed through under three names, because every
  // renderer downstream already reads `nameLocal` — the chat card's `(nameLocal)` line
  // (venue-templates.js) and ResultCard's `({venue.nameLocal})` row both shipped in
  // v0.61.359 and have been waiting on a value ever since. Which language it is stays
  // derivable from `country` via LOCAL_LANG_BY_CC.
  //
  // NOTHING IS TRANSLATED HERE. These are copies of a curated register, moved one field
  // to the left. And `name` is untouched on purpose: it is the Google Maps query, the
  // `detailsId` DOM selector and the clipboard/share payload, so a localised string in
  // that slot would break a key rather than a label — the failure the station work
  // (O-329) came within one field of shipping.
  const nativeName = entry.nameJa || entry.nameZh || entry.nameKo;
  const nativeAddr = entry.addressJa || entry.addressZh || entry.addressKo;
  if (nativeName) v.nameLocal = nativeName;
  if (nativeAddr) v.addressLocal = nativeAddr;
  if (entry.postal !== undefined) v.postal = entry.postal;
  if (entry.formerNames !== undefined) v.formerNames = entry.formerNames;
  // Copied, not referenced — the country tables are module-level literals and
  // a shared array would let one consumer's mutation reach every other.
  if (Array.isArray(entry[GREEN_STAR_KEY])) v[GREEN_STAR_KEY] = entry[GREEN_STAR_KEY].slice();
  return v;
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
      if (tier === 'total' || tier === 'green-star') continue;   // green-star handled below
      const got = counts[tier] || 0;
      manifestTotalAwards += want;
      if (got !== want) {
        throw new Error(
          `[michelin-data] ${source}: ${cc} ${year} manifest mismatch for "${tier}" — expected ${want}, got ${got}`
        );
      }
      yearTotal += got;
    }
    // Green Star is asserted per year but deliberately EXCLUDED from
    // `yearTotal`: `total` counts award rows, and a Green Star is not one.
    // Folding it in would make `total` disagree with `awards.length` summed
    // across the country, which is the number every other check derives from.
    if (expected['green-star'] !== undefined) {
      let gs = 0;
      for (const v of venues) {
        if (Array.isArray(v[GREEN_STAR_KEY]) && v[GREEN_STAR_KEY].includes(year)) gs++;
      }
      if (gs !== expected['green-star']) {
        throw new Error(
          `[michelin-data] ${source}: ${cc} ${year} manifest mismatch for "green-star" — expected ${expected['green-star']}, got ${gs}`
        );
      }
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

// Ingest the venue-centric country tables.
for (const tbl of COUNTRY_TABLES) {
  const cc = String(tbl.COUNTRY || '').toUpperCase();
  const source = `country=${cc} (${cc}-michelin.js)`;
  _ingestVenues(tbl.ENTRIES, source);
  const ccVenues = VENUES.filter((v) => String(v.country).toUpperCase() === cc);
  assertManifest(cc, ccVenues, source);
  // Per-city assertion. A national total cannot see per-city drift: JP 2026
  // passes its country manifest while Tokyo is one one-star short of the
  // published figure, and CN passes while Guangzhou sits on the 2025 edition.
  assertCityManifest(cc, ccVenues, source);
}

// ── back-compat flat view ────────────────────────────────────────────
// Some consumers expect a FLAT entry list: { city, country, name, address,
// postal?, category, year, cuisine?, vegetarian, halal }. Derive one flat
// row PER AWARD from the venue pool so `getAll` / `michelinForCity` /
// `michelinForCountry` keep a flat contract over the country venues.
function _venueToFlatRows(v) {
  const gs = Array.isArray(v[GREEN_STAR_KEY]) ? v[GREEN_STAR_KEY] : [];
  const base = () => {
    const row = {
      city: v.city,
      country: v.country,
      name: v.name,
      address: v.address,
      vegetarian: v.vegetarian,
      halal: v.halal,
    };
    if (v.postal !== undefined) row.postal = v.postal;
    if (v.cuisine !== undefined) row.cuisine = v.cuisine;
    return row;
  };

  // v0.62.766 — the Green Star reaches the flat surface, in the ONE shape that
  // does not double-list. The schema note above rejected `green-star` as an
  // awards[] category precisely because a starred venue holding one would then
  // emit two rows and appear twice in `michelinForCity` / `getAll`. That
  // objection is about venues holding BOTH, and it still stands, so:
  //
  //   holds awards  → one row per award, unchanged, plus `greenStar: true` on
  //                   the rows whose year the Green Star covers. No extra row.
  //   holds only a  → one row per Green Star year, `category: 'green-star'`.
  //   Green Star      Its tier slot was empty, so nothing is displaced.
  //
  // `greenStar` is a boolean on every row, never undefined, so a consumer can
  // test it without knowing which branch produced the row.
  if (v.awards.length) {
    return v.awards.map((a) => Object.assign(base(), {
      category: a.category,
      year: a.year,
      greenStar: gs.includes(a.year),
    }));
  }
  return gs.map((y) => Object.assign(base(), {
    category: 'green-star',
    year: y,
    greenStar: true,
  }));
}

const ALL = [];
for (const v of VENUES) {
  for (const row of _venueToFlatRows(v)) ALL.push(row);
}

// v0.62.764. A Green-Star-only venue produces NO flat rows, because the flat
// contract is one row per award and a Green Star is not one. That is deliberate
// — injecting a pseudo-tier into `category` would reach every consumer that
// switches on it — but it creates a trap: such a venue still marks its city
// "populated", so `hasMichelinData(city)` could answer true for a city whose
// flat getters return nothing at all.
//
// Fail closed rather than document it. Every Green-Star-only venue must sit in
// a city that also holds a real award; today all three (Hanoi, Da Nang, Ho Chi
// Minh City) do, so this costs nothing and stops the day it would start lying.
for (const v of VENUES) {
  if (Array.isArray(v.awards) && v.awards.length) continue;
  const cityHasAward = VENUES.some(
    (o) => o.city === v.city && Array.isArray(o.awards) && o.awards.length,
  );
  if (!cityHasAward) {
    throw new Error(
      `[michelin-data] "${v.name}" holds only a Green Star and is the sole venue in ${v.city} — `
      + 'hasMichelinData() would report the city as populated while every flat getter returns [].',
    );
  }
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

// v0.61.445 — the set of cuisine slugs that have ≥1 VISITABLE star/bib venue
// in a country (optionally narrowed to a city). Powers the TMA's Michelin
// grey-out: when Michelin is the active mode, cuisine chips NOT in this set —
// and the durian / fruit / durian-pastry special modes, which are never
// Michelin — are disabled, so a user can't run a Michelin+<cuisine> search
// that yields nothing (the "Michelin + Japanese in KL hangs" report). Returns
// lowercased slugs, sorted; venues with no `cuisine` tag are ignored (a
// cuisine chip can't match them anyway).
function availableCuisines(cc, city = null) {
  if (!cc) return [];
  const ccLower = String(cc).trim().toLowerCase();
  const cityLower = city ? String(city).trim().toLowerCase() : null;
  const pool = visitableVenues(VENUES).filter((v) =>
    String(v.country).toLowerCase() === ccLower
    && (!cityLower || String(v.city).toLowerCase() === cityLower));
  const out = new Set();
  for (const v of pool) {
    if (typeof v.cuisine === 'string' && v.cuisine.trim()) {
      out.add(v.cuisine.trim().toLowerCase());
    }
  }
  return [...out].sort();
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

// Year/edition view: every venue MICHELIN published for year Y, INCLUDING
// closed venues (the edition is a historical snapshot).
//
// v0.62.764: this is award-holders UNION Green Star holders for that year. A
// Green Star is part of what the guide published, so a venue holding only one
// belongs to the edition. `venuesForYear` deliberately does NOT widen — it is
// documented as "holding an AWARD in year Y" and every award count in the
// manifests derives from it, so blurring the two would silently move numbers
// that other assertions depend on. Two names for two questions.
function editionVenues(year) {
  const out = venuesForYear(year);
  const seen = new Set(out.map((v) => v.id));
  for (const v of greenStarVenues(year)) if (!seen.has(v.id)) { seen.add(v.id); out.push(v); }
  return out;
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
// Venues holding a MICHELIN Green Star. `year` omitted → any edition.
// Returns venues, not flat rows: a Green Star is a property of the venue, and
// flattening it per award is exactly the double-listing the schema note above
// exists to prevent.
function greenStarVenues(year) {
  return VENUES.filter((v) => {
    const gs = v[GREEN_STAR_KEY];
    if (!Array.isArray(gs) || !gs.length) return false;
    return year === undefined ? true : gs.includes(year);
  });
}

// Edition years in which this venue held a Green Star (always an array).
function greenStarYears(venue) {
  const gs = venue && venue[GREEN_STAR_KEY];
  return Array.isArray(gs) ? gs.slice() : [];
}

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

// v0.62.665 — compact, newest-first "'26"-style year strings for the years
// a venue held its CURRENT (latest) category — not every year it has ever
// appeared. Walks `awards` newest-to-oldest and stops at the first category
// change, so a venue that was promoted or demoted between editions shows
// only the years matching its LATEST tier (operator spec: never label a
// changed category with a year it held a DIFFERENT category in). Mirrors
// the compact array `SG-michelin.js` stores directly on each record; this
// is the equivalent derivation for the venue-centric `awards:[{year,
// category}]` schema the 11 non-SG country files already use.
function retainedAwardYears(venue) {
  if (!venue || !Array.isArray(venue.awards) || venue.awards.length === 0) return [];
  const sorted = [...venue.awards].sort((a, b) => b.year - a.year); // newest first
  const latestCategory = sorted[0].category;
  const years = [];
  for (const a of sorted) {
    if (a.category !== latestCategory) break;
    years.push(`'${String(a.year).slice(-2)}`);
  }
  return years;
}

// v0.62.766 — the Green Star analogue of retainedAwardYears(), in the same
// compact "'26" token form the year ticks and the TMA card already speak. It
// exists so the search path can answer "which editions is this Green Star
// good for?" without every caller reaching into greenStarYears and
// reformatting it — which is how two call sites drift into two conventions.
function retainedGreenStarYears(venue) {
  const gs = venue && Array.isArray(venue[GREEN_STAR_KEY]) ? venue[GREEN_STAR_KEY] : [];
  return [...gs].sort((a, b) => b - a).map((y) => `'${String(y).slice(-2)}`);
}

module.exports = {
  // schema constants
  CATEGORIES,
  GREEN_STAR_KEY,
  greenStarVenues,
  greenStarYears,
  STATUSES,
  VALID_YEARS,
  COUNTRY_MANIFEST,
  CITY_IATA,
  // id / normalisation helpers
  kebab,
  synthId,
  venueToVenue,
  // validation
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
  availableCuisines,
  venuesForYear,
  categoryForYear,
  visitableVenues,
  editionVenues,
  awardsDiff,
  retainedAwardYears,
  retainedGreenStarYears,
};
