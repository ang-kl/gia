// venue-filters.js — v0.60.229
//
// Single source of truth for "this place isn't a specific eatery"
// filtering. Replaces three duplicate inline NON_FOOD_TYPES Sets in
// index.js (search / warm-start / NL path) and adds the new
// BUILDING_NAME_PATTERNS regex deny-list per Human Lead's rule:
//
//   "It ought to check if there are restaurants inside the building
//    or the building name is the restaurant or eatery."
//
// Read: drop venues whose NAME IS the building itself (whole hawker
// centre, whole SAFRA, whole mall). KEEP venues that are specific
// eateries inside such buildings — even when those eateries mention
// the building. So patterns are anchored to the start of the name
// (with a small tolerance for trailing ", Singapore" / "(CBD)") and
// a stall name like "Tian Tian @ Maxwell Food Centre" never matches.

const NON_FOOD_TYPES = new Set([
  'lodging', 'hotel', 'motel', 'hostel', 'guest_house', 'resort',
  'shopping_mall', 'department_store', 'store', 'supermarket_chain',
  'tourist_attraction', 'point_of_interest', 'establishment',
  'plaza', 'complex', 'building', 'park', 'school',
  'university', 'hospital', 'gym', 'fitness_center',
  // v0.58.31: explicitly drop food courts. Google's includedTypes
  // request still asks for them (pipeline.js / consultant.js) but the
  // filter rejects them because the user wants Song Fa, not Lau Pa
  // Sat.
  'food_court'
]);

// All patterns are start-anchored. A stall name preceded by an
// eatery brand never triggers them.
const BUILDING_NAME_PATTERNS = [
  /^lau\s*pa\s*sat$/i,
  /^maxwell\s+(food\s+centre|hawker(?:\s+centre)?)$/i,
  /^newton\s+(food\s+centre|hawker(?:\s+centre)?)$/i,
  /^tiong\s+bahru\s+market$/i,
  /^chinatown\s+complex(\s+(food\s+centre|market))?$/i,
  /^hong\s+lim\s+(market|food\s+centre)(\s*&\s*food\s+centre)?$/i,
  /^golden\s+mile\s+food\s+centre$/i,
  /^old\s+airport\s+road\s+(food\s+centre|hawker\s+centre)$/i,
  /^amoy\s+street\s+food\s+centre$/i,
  /^tekka\s+(market|centre|food\s+centre)$/i,
  /^zion\s+riverside\s+food\s+centre$/i,
  /^geylang\s+serai\s+market$/i,
  /^bedok\s+(market|food\s+centre|hawker\s+centre)$/i,
  /^berseh\s+food\s+centre$/i,
  // Generic suffix catch-all — any name ending in a hawker-centre /
  // food-centre / food-court / "Market & Food Centre" suffix.
  // Anchored to start so a stall name doesn't match.
  /^[\w\s'-]+(hawker\s+centre|food\s+centre|food\s+court)$/i,
  /^[\w\s'-]+market\s*&\s*food\s+centre$/i,
  // Multi-tenant clubhouses with multiple F&B outlets inside.
  /^safra(\s+[\w-]+)*$/i,                                  // "SAFRA Mount Faber", "SAFRA Toa Payoh"
  /^[\w\s'-]+\s+(country|community|civic)\s+club$/i,        // "Tanglin Country Club"
  // Lifestyle / mall hubs as the venue itself. A specific eatery
  // inside still passes ("Sushi Tei VivoCity" doesn't start with
  // "VivoCity").
  /^(plaza\s+singapura|vivocity|ion\s+orchard|takashimaya|jewel\s+changi|funan|raffles\s+city|paragon|wisma\s+atria|ngee\s+ann\s+city|nex\s+mall|the\s+shoppes\s+at\s+marina\s+bay\s+sands)$/i
];

// v0.60.229 — curated multi-tenant "directory" buildings (food halls,
// food courts, markets that escape BUILDING_NAME_PATTERNS). Operator
// rule: never return the building/food-hall itself when Google Maps
// lists many separate eateries inside it. Google's Places API has no
// directory flag, so the list is curated in data/directory-buildings.json.
// A specific stall inside still passes — its name does not START with a
// curated building name.
const DIRECTORY_BUILDINGS = (() => {
  try {
    const raw = require('./data/directory-buildings.json');
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.names) ? raw.names : []);
    return new Set(
      list.map((n) => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
  } catch {
    return new Set();
  }
})();

// `cleaned` is the building-name candidate already stripped of a
// trailing "(...)" / ", Singapore <postcode>". Match it exactly against
// the curated set, or as a start-anchored building name followed by a
// location qualifier ("Food Opera @ ION Orchard", "Food Republic -
// Wisma Atria"). A real stall ("Tian Tian @ Maxwell") never matches —
// it doesn't START with a curated name.
function isDirectoryBuilding(cleaned) {
  if (!DIRECTORY_BUILDINGS.size || !cleaned) return false;
  const norm = cleaned.toLowerCase().replace(/\s+/g, ' ').trim();
  if (DIRECTORY_BUILDINGS.has(norm)) return true;
  for (const name of DIRECTORY_BUILDINGS) {
    if (norm.startsWith(name) && /^[\s@,/–—-]/.test(norm.slice(name.length))) return true;
  }
  return false;
}

function isBuildingItself(rawName) {
  if (!rawName || typeof rawName !== 'string') return false;
  // Strip a trailing "(...)" / ", Singapore <postcode>" / " Singapore"
  // so the anchored patterns still match the building name itself.
  const cleaned = rawName
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')                      // " (CBD)", " (Tanjong Pagar)"
    .replace(/,\s*(singapore|sg)(\s*\d+)?\s*$/i, '')      // ", Singapore 048542"
    .replace(/\s+singapore(\s*\d+)?\s*$/i, '')            // " Singapore 048542"
    .trim();
  if (!cleaned) return false;
  if (isDirectoryBuilding(cleaned)) return true;
  return BUILDING_NAME_PATTERNS.some((re) => re.test(cleaned));
}

function passesVenueFilter(v) {
  if (!v) return false;
  if (v.businessStatus && v.businessStatus !== 'OPERATIONAL') return false;
  if (v.primaryType && NON_FOOD_TYPES.has(v.primaryType)) return false;
  if (Array.isArray(v.types) && v.types.some((t) => NON_FOOD_TYPES.has(t))) return false;
  if (isBuildingItself(v.name)) return false;
  return true;
}

// v0.60.118 — "is this a place where rain actually matters?" Used to
// decide whether a venue pick gets a 🌧️ rain caveat (open-air hawker /
// market / al-fresco / kopitiam-style — yes; air-conditioned mall
// restaurant — no, a rain line there is just noise). Best-effort
// heuristic on primaryType + name/address text; false negatives are
// fine (we simply skip the caveat).
const RAIN_SENSITIVE_TYPES = new Set([
  'food_court', 'market', 'farmers_market'
]);
// Words that signal open-air / shophouse-row / waterfront seating.
const RAIN_SENSITIVE_TEXT_RE = /\b(hawker(?:\s+centre)?|food\s+centre|food\s+court|wet\s+market|market(?:\s*&\s*food\s+centre)?|kopitiam|coffee\s?shop|kopi\s?tiam|al[\s-]?fresco|alfresco|outdoor|open[\s-]?air|rooftop|riverside|river\s+walk|riverwalk|waterfront|quay|esplanade|boardwalk|pasar\s+malam|night\s+market|street\s+food|garden|park\s+connector)\b/i;

function isRainSensitiveVenue(v) {
  if (!v) return false;
  if (v.primaryType && RAIN_SENSITIVE_TYPES.has(v.primaryType)) return true;
  if (Array.isArray(v.types) && v.types.some((t) => RAIN_SENSITIVE_TYPES.has(t))) return true;
  const hay = `${v.name || ''} ${v.area || v.address || ''}`;
  return RAIN_SENSITIVE_TEXT_RE.test(hay);
}

// v0.61.425 — operator: enforce a MINIMUM Google rating of 3.7 across every
// eatery surface (cuisine TMA, /s, free-text, sanctuary, cuisine flow), all
// cities incl. SG/JB. GUARDED so it can't over-compress (the investigation
// showed a hard floor would zero results in thin markets / with the New +
// durian filters):
//   • EXEMPT unrated venues (no rating / 0) — newly-opened places have no stable
//     rating yet, and the "New" pill depends on them.
//   • EXEMPT very-few-review venues (< RATING_FLOOR_EXEMPT_MAX_REVIEWS) — a 4.8
//     from 2 reviews, or a 3.2 from 1, isn't a reliable signal to drop on.
//   • NEVER empty the list — if every venue is below the floor, return the
//     input unchanged (best-effort), mirroring the v0.61.399 New-filter floor.
// /hidden is already stricter (≥ 3.9 in its Gemini prompt) so it isn't routed here.
//
// v0.61.426 — the floor is now per-chat configurable via the Cuisine TMA's
// rating pill + the `/rating` command (rating-pref.js). `opts.mode` selects:
//   • 'floor' (default) → the guarded ≥opts.floor behaviour above. Existing
//     callers that pass no mode keep the v0.61.425 contract unchanged.
//   • 'off' / 'any'     → no minimum at all; keep every venue (operator's
//     "any rating").
//   • 'unrated'         → INVERT: keep the operator's "No rating" set =
//     NEW or NULL-rating venues. v0.61.429 (operator: "No rating should be
//     searching for new nor null rating, still appear >0"): a venue counts
//     when it has NO rating (null / 0) OR is NEW / barely-reviewed
//     (userRatingCount < UNRATED_MODE_MAX_REVIEWS) — so a brand-new place
//     with a small rating > 0 still appears. Still guarded (never empties:
//     a thin area with no such venues falls back to the input → >0).
const RATING_FLOOR = 3.7;
const RATING_FLOOR_EXEMPT_MAX_REVIEWS = 5;
function applyRatingFloor(venues, opts = {}) {
  if (!Array.isArray(venues) || venues.length === 0) return Array.isArray(venues) ? venues : [];
  const mode = opts.mode || 'floor';
  // "any rating" — operator's no-minimum mode. Keep everything.
  if (mode === 'off' || mode === 'any') return venues;
  // "Unrated" — operator: "New or no reviews yet". Keep ONLY venues with no
  // Google star rating yet. v0.62.x bugfix: the prior version also kept
  // barely-reviewed venues that DID show a star rating (< UNRATED_MODE_MAX_
  // REVIEWS), and fell back to the FULL (rated) list when none were unrated —
  // so "Unrated" surfaced rated restaurants (operator: "I select 'no ratings'
  // but two restaurants with ratings appear"). Now strict: a venue with any
  // star rating > 0 is excluded, and an empty result stays empty (honest) —
  // never a fallback to the rated set.
  if (mode === 'unrated') {
    return venues.filter((v) => {
      const r = Number(v && v.rating);
      return !Number.isFinite(r) || r <= 0;   // no Google star rating
    });
  }
  // 'floor' (default) — guarded ≥floor with unrated/few-review exemptions.
  const floor = Number.isFinite(opts.floor) ? opts.floor : RATING_FLOOR;
  const exemptMax = Number.isFinite(opts.exemptMaxReviews) ? opts.exemptMaxReviews : RATING_FLOOR_EXEMPT_MAX_REVIEWS;
  const qualifies = (v) => {
    const r = Number(v && v.rating);
    if (!Number.isFinite(r) || r <= 0) return true;          // unrated → keep (New venues)
    const n = Number(v && v.userRatingCount);
    if (Number.isFinite(n) && n < exemptMax) return true;     // too-few reviews → keep
    return r >= floor;
  };
  const kept = venues.filter(qualifies);
  return kept.length ? kept : venues;                         // never empty the list
}

module.exports = {
  NON_FOOD_TYPES,
  BUILDING_NAME_PATTERNS,
  DIRECTORY_BUILDINGS,
  RAIN_SENSITIVE_TYPES,
  RAIN_SENSITIVE_TEXT_RE,
  RATING_FLOOR,
  isDirectoryBuilding,
  isBuildingItself,
  passesVenueFilter,
  isRainSensitiveVenue,
  applyRatingFloor
};
