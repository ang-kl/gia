// hidden-gems.js — v0.58.22 deterministic hidden-gem evaluation.
//
// Replaces the relative-rarity-only path that ran in /hidden v0.57.x –
// v0.58.21 (which ranked candidates against each other inside the
// query result pool, so popular places kept floating to the top
// because they out-ranked the few genuinely hidden survivors).
//
// We now apply explicit thresholds:
//   C1 NEW_HIGHRATED   - earliest review ≤ 150 days old AND rating ≥ 4.3
//   C3 UNDERREVIEWED   - rating ≥ 4.5 AND userRatingCount < 60
//   C4 OFF_TRANSPORT   - ≥ 400 m walking from nearest MRT station
//
// C2 SOCIAL_BUZZ and C5 UNIQUE_OFFERING are judged by Claude (with web
// search) downstream in pipeline.rankAndNarrate(specialRequest:
// 'HIDDEN_GEMS_V2'). The server returns its C1/C3/C4 booleans to
// Claude as deterministic priors so it doesn't second-guess hard
// numbers.

const SG_FRESH_DAYS = 150;       // C1 freshness window
const C1_RATING_FLOOR = 4.3;
const C3_RATING_FLOOR = 4.5;
const C3_REVIEW_CEILING = 60;    // strict less-than
const C4_MRT_WALK_FLOOR_M = 400;
const HARD_RATING_FLOOR = 4.0;
const HARD_REVIEW_FLOOR = 8;
const WALK_FACTOR = 1.3;          // straight-line × 1.3 ≈ walking distance

// Expanded chain blacklist. Includes SG-local chains the existing
// cuisine-search.js FAST_FOOD_CHAIN_PATTERNS deliberately omits
// (Toast Box, Ya Kun, Killiney, Old Chang Kee, KOI, LiHO, Mr Bean,
// Each-a-Cup, Crystal Jade, Boost). Whole-word boundaries to avoid
// false hits like "Toast Bar".
const HIDDEN_GEMS_CHAIN_PATTERNS = [
  // SG-local chains
  /\btoast\s*box\b/i, /\bya\s*kun\b/i, /\bkilliney\b/i,
  /\bold\s*chang\s*kee\b/i, /\bkoi\b/i, /\bliho\b/i,
  /\bmr\.?\s*bean\b/i, /\beach[\s-]a[\s-]cup\b/i,
  /\bcrystal\s*jade\b/i, /\bboost\b/i,
  // Bubble-tea chains
  /\bgong\s*cha\b/i, /\btiger\s*sugar\b/i, /\bheytea\b/i,
  // Fast-food chains
  /\bmcdonald'?s?\b/i, /\bkfc\b/i, /\bsubway\b/i,
  /\bburger\s*king\b/i, /\btexas\s*chicken\b/i, /\bjollibee\b/i,
  // Coffee + pizza chains
  /\bstarbucks\b/i, /\bcoffee\s*bean\b/i,
  /\bdomino'?s?\b/i, /\bpizza\s*hut\b/i
];

function isChain(name) {
  if (!name || typeof name !== 'string') return false;
  return HIDDEN_GEMS_CHAIN_PATTERNS.some((re) => re.test(name));
}

// Hard pre-filter applied BEFORE C1/C3/C4 evaluation. Drops anything
// rating < 4.0, fewer than 8 reviews, chain, or non-OPERATIONAL.
function passesHardFilter(v) {
  if (!v) return false;
  if (typeof v.rating === 'number' && v.rating < HARD_RATING_FLOOR) return false;
  if (typeof v.userRatingCount === 'number' && v.userRatingCount < HARD_REVIEW_FLOOR) return false;
  if (isChain(v.name || '')) return false;
  if (v.businessStatus && v.businessStatus !== 'OPERATIONAL') return false;
  return true;
}

// C1 — proxy "newly opened" via earliest review timestamp from the
// Places `reviews[]` field. Place Details (New) returns up to 5
// reviews; the EARLIEST one's publishTime is a coarse "place has
// been on Google for ≥ this long" lower bound. Combined with
// rating ≥ 4.3, catches venues that opened in the last ~5 months
// and already have positive signal.
function evalC1_NewHighRated(v, now = new Date()) {
  if (typeof v?.rating !== 'number' || v.rating < C1_RATING_FLOOR) return false;
  const reviews = Array.isArray(v.reviews) ? v.reviews : [];
  if (!reviews.length) return false;
  const earliest = reviews
    .map((r) => r?.publishTime)
    .filter(Boolean)
    .map((t) => new Date(t).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b)[0];
  if (!earliest) return false;
  const ageDays = (now.getTime() - earliest) / 86_400_000;
  return ageDays <= SG_FRESH_DAYS && ageDays >= 0;
}

// C3 — strict thresholds: rating must be ≥ 4.5 AND userRatingCount
// must be strictly less than 60. Catches the "high-rated, few
// reviews" hidden gem profile.
function evalC3_Underreviewed(v) {
  if (typeof v?.rating !== 'number' || v.rating < C3_RATING_FLOOR) return false;
  if (typeof v?.userRatingCount !== 'number') return false;
  return v.userRatingCount < C3_REVIEW_CEILING;
}

// C4 — ≥ 400 m walking distance from the nearest MRT.
function evalC4_OffTransport(walkM) {
  return Number.isFinite(walkM) && walkM >= C4_MRT_WALK_FLOOR_M;
}

// Compute walking distance to nearest MRT. Uses 1.3 × straight-line
// haversine to the closest station as a fast proxy. transport.
// nearestMrtStations does the live Places-API lookup (no static
// table); we trust its `distanceM` (already haversine) and apply
// the walking-detour factor.
//
// Tests inject `mrtFn` to avoid a live API call.
async function nearestMrtWalkM({ lat, lng }, opts = {}) {
  const mrtFn = opts.mrtFn || require('./transport').nearestMrtStations;
  try {
    const stations = await mrtFn(lat, lng, opts.searchRadiusM || 1500, 1);
    if (!stations?.length) return Infinity;
    const closest = stations[0];
    const straightM = Number.isFinite(closest.distanceM) ? closest.distanceM : Infinity;
    return Math.round(straightM * WALK_FACTOR);
  } catch {
    return Infinity;
  }
}

// Annotate each candidate with c1/c3/c4 booleans and a deterministic
// score. The score is a tie-breaker; the actual qualifying rule
// (≥ N criteria) is applied by the caller.
//   deterministicScore = 1.0*c1 + 1.2*c3 + 0.8*c4
async function evaluateHiddenGemCriteria(candidates, userLoc, opts = {}) {
  const now = opts.now || new Date();
  const out = [];
  for (const c of candidates) {
    const c1 = evalC1_NewHighRated(c, now);
    const c3 = evalC3_Underreviewed(c);
    const point = { lat: c.lat, lng: c.lng };
    const walkM = (Number.isFinite(point.lat) && Number.isFinite(point.lng))
      ? await nearestMrtWalkM(point, opts)
      : Infinity;
    const c4 = evalC4_OffTransport(walkM);
    const deterministicScore = (c1 ? 1.0 : 0) + (c3 ? 1.2 : 0) + (c4 ? 0.8 : 0);
    out.push({
      ...c,
      c1_new_highrated: c1,
      c3_underreviewed: c3,
      c4_off_transport: c4,
      nearest_mrt_walk_m: Number.isFinite(walkM) ? walkM : null,
      deterministicScore
    });
  }
  return out;
}

module.exports = {
  HIDDEN_GEMS_CHAIN_PATTERNS,
  HARD_RATING_FLOOR, HARD_REVIEW_FLOOR,
  C1_RATING_FLOOR, C3_RATING_FLOOR, C3_REVIEW_CEILING,
  C4_MRT_WALK_FLOOR_M, SG_FRESH_DAYS,
  isChain, passesHardFilter,
  evalC1_NewHighRated, evalC3_Underreviewed, evalC4_OffTransport,
  nearestMrtWalkM, evaluateHiddenGemCriteria
};
