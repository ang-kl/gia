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

module.exports = {
  NON_FOOD_TYPES,
  BUILDING_NAME_PATTERNS,
  DIRECTORY_BUILDINGS,
  RAIN_SENSITIVE_TYPES,
  RAIN_SENSITIVE_TEXT_RE,
  isDirectoryBuilding,
  isBuildingItself,
  passesVenueFilter,
  isRainSensitiveVenue
};
