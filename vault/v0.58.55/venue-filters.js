// venue-filters.js — v0.58.31
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

module.exports = {
  NON_FOOD_TYPES,
  BUILDING_NAME_PATTERNS,
  isBuildingItself,
  passesVenueFilter
};
