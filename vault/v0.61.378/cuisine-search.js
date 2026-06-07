// cuisine-search.js — backend for the v0.22.0 Cuisine Picker TMA.
//
// Generalises pickValidated to:
//   - count = 15 (tunable)
//   - explicit radius (no radial expansion)
//   - multi-cuisine + preset + when prompt enrichment
//   - signature_dish per candidate (the "recipe" surface)
//   - sort: open_now first, then walk minutes asc, then rating desc

// v0.61.309 — removed `llm`, `withRetry`, `MODEL_NAME`, `validateWithPlaces`
// imports. The previous LLM-invents-names-then-Places-validates pipeline
// was retired in favour of `pipeline.discover()` direct from Places.
// `validateWithPlaces` (and the `gemini-retry` + `llm-client` helpers it
// depended on) is no longer called from this file.
const { rankByWalkingTime, mealPeriodSGT } = require('./vibe-suggest');
const holidays = require('./holidays');

const PRESETS = {
  'transit-efficiency': {
    minRating: 4.2,
    promptHint: 'low-profile high-rating "hidden gem" venues, easy to reach via MRT or short walk; no chains, no tourist traps'
  },
  'after-hours': {
    forceMeal: 'supper',
    requireOpenNow: true,
    promptHint: 'open after 22:00, suitable for late-night supper or post-dinner drinks; mention 24-hour or last-order time when relevant'
  },
  'holiday-special': {
    promptHint: null // composed dynamically using holidays
  },
  'cuisine-discovery': {
    promptHint: 'newest openings (within the last 6 months) for the requested cuisine; emphasise novelty over popularity'
  }
};

// v0.23.0: free-form radius 200..5000 m. The toggle (250/1000) was
// retired with the slider UI. Server still clamps for safety so callers
// can't trigger huge Places billable queries.
const RADIUS_MIN_M = 200;
const RADIUS_MAX_M = 5000;
const RECENCY_MIN_D = 5;
const RECENCY_MAX_D = 180;
const QUEUE_MIN = 5;
const QUEUE_MAX = 60;

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function whenToMealHint(when, presetForceMeal) {
  if (presetForceMeal === 'supper') {
    return { id: 'supper', label: 'supper', hint: 'late-night supper, drinks and casual food after 22:00' };
  }
  if (when === 'now' || !when) return mealPeriodSGT();
  // ISO timestamp — derive meal period from its SGT hour.
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return mealPeriodSGT();
  const sgtHour = (d.getUTCHours() + 8) % 24;
  if (sgtHour >= 7 && sgtHour < 11) return { id: 'breakfast', label: 'breakfast', hint: 'breakfast and morning coffee' };
  if (sgtHour >= 11 && sgtHour < 15) return { id: 'lunch', label: 'lunch', hint: 'midday meals' };
  if (sgtHour >= 15 && sgtHour < 17) return { id: 'afternoon', label: 'afternoon', hint: 'afternoon tea, coffee, light bites' };
  if (sgtHour >= 17 && sgtHour < 21) return { id: 'dinner', label: 'dinner', hint: 'evening dinner' };
  return { id: 'supper', label: 'supper', hint: 'late-night supper and drinks' };
}

// v0.61.309 — removed `buildPrompt` + `geminiCandidates15` (the
// LLM-invents-candidate-names path). searchCuisine now sources venues
// directly from Google Places via `pipeline.discover()`. The deleted
// helpers were the only callers of `llm.generate` + `withRetry` from
// this file, so their imports were also removed above.

function applyPostFilters(venues, preset) {
  const cfg = PRESETS[preset] || {};
  let out = venues;
  if (cfg.requireOpenNow) out = out.filter((v) => v.openNow !== false);
  if (cfg.minRating != null) out = out.filter((v) => (v.rating ?? 0) >= cfg.minRating);
  return out;
}

// v0.30.6: server-side defense-in-depth chain-name exclusion. Gemini's
// negative-constraint compliance is unreliable (v0.30.5 trace returned
// "The Coffee Bean & Tea Leaf" despite explicit exclusion list). Match
// venue names case-insensitively against unambiguously-global fast-food
// + coffee chains. Conservative list — does NOT touch SG-local chains
// like Toast Box, Ya Kun, Killiney, Old Chang Kee where the user might
// genuinely want them.
const FAST_FOOD_CHAIN_PATTERNS = [
  /\bmcdonald'?s?\b/i,
  /\bkfc\b/i,
  /\bsubway\b/i,
  /\bburger king\b/i,
  /\bstarbucks\b/i,
  /\bcoffee bean(?:\s*&?\s*tea leaf)?\b/i,
  /\bdomino'?s?(?: pizza)?\b/i,
  /\bpizza hut\b/i,
  /\bjollibee\b/i,
  /\btexas chicken\b/i,
  /\bwendy'?s?\b/i,
  /\bpopeye'?s?\b/i,
  /\bshake shack\b/i,
  /\bfive guys\b/i,
  /\btaco bell\b/i,
  /\blong john silver'?s?\b/i,
  /\bcarl'?s? jr\b/i
];

function isFastFoodChain(venueName) {
  if (!venueName) return false;
  return FAST_FOOD_CHAIN_PATTERNS.some((re) => re.test(venueName));
}

function excludeChains(venues) {
  const out = [];
  let dropped = 0;
  for (const v of venues) {
    if (isFastFoodChain(v.name)) {
      dropped++;
      console.warn(`[Cuisine-Search] D709 chain-filter dropped "${v.name}"`);
      continue;
    }
    out.push(v);
  }
  if (dropped) console.log(`[Cuisine-Search] chain-filter removed ${dropped} venue(s)`);
  return out;
}

function sortVenues(venues) {
  return [...venues].sort((a, b) => {
    const ao = a.openNow === false ? 1 : 0;
    const bo = b.openNow === false ? 1 : 0;
    if (ao !== bo) return ao - bo;
    const aw = a.walkSeconds ?? Number.POSITIVE_INFINITY;
    const bw = b.walkSeconds ?? Number.POSITIVE_INFINITY;
    if (aw !== bw) return aw - bw;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

async function searchCuisine({
  lat, lng, cuisines = [], radius = 1000,
  recencyDays = 90, queueMaxMin = 15,
  mode = 'walk', when = 'now', preset = null,
  specialRequest = '', // v0.30.0: free-form qualifier from NL chat search
  redis = null
}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('lat/lng required');
  }
  radius = clamp(radius, RADIUS_MIN_M, RADIUS_MAX_M);
  recencyDays = clamp(recencyDays, RECENCY_MIN_D, RECENCY_MAX_D);
  queueMaxMin = clamp(queueMaxMin, QUEUE_MIN, QUEUE_MAX);

  const presetCfg = PRESETS[preset] || null;
  const meal = whenToMealHint(when, presetCfg?.forceMeal);

  let holidayContext = null;
  if (preset === 'holiday-special') {
    const today = holidays.isPublicHoliday();
    const next = holidays.nextPublicHoliday();
    holidayContext = { isToday: !!today, name: today?.name || null, next };
  }

  // v0.61.309 — PLACES-FIRST SOURCING. The v0.26.0 Reason–Fetch–Refine
  // pipeline (Claude Sonnet generating candidate venue names) + the
  // v0.30.0 geminiCandidates15 fallback (Gemini inventing names) were
  // the operator-flagged "inventive" path: an LLM produced a JSON list
  // of *names* that validateWithPlaces then tried to resolve against
  // Places — hallucinated names that happened to match a real venue
  // would slip through, so the *selection* of venues was effectively
  // LLM-driven. Operator (31-05 '26 → 01-06 '26): *"it has to be 100%
  // non-inventive ... true source from Google."*
  //
  // Path B (this function) now routes through pipeline.discover() —
  // the same Google-Places-searchText path the TMA 🔍 button has used
  // since v0.26.x. Real venues only; no LLM in the venue-selection
  // loop. The Refine pass (which LLM-rewrote travel-advice / queue-
  // minutes / cost from weather/traffic context) is also retired —
  // weather + rain alerts still attach via deliverPicks downstream,
  // no LLM in the loop.
  //
  // Inputs `specialRequest`, `recencyDays`, `queueMaxMin` were LLM-
  // only constraints; they survive in the function signature for
  // back-compat but no longer steer venue selection. The pre-existing
  // queueMaxMin post-filter is a no-op now (Places doesn't return a
  // queue estimate); we keep the filter wired in case a future signal
  // populates `v.queueMinEstimate` from a Google-side source.
  const pipeline = require('./pipeline');
  const discoveredVenues = await pipeline.discover({
    lat, lng,
    cuisines,
    radius,
    mealPeriod: when,
    maxResults: 12,
    regionCode: 'SG'
  });
  if (!discoveredVenues.length) {
    return { venues: [], meal, holidayContext, recencyDays, queueMaxMin };
  }

  // v0.61.309 — venues already carry placeId / name / coords / rating /
  // openNow / etc. from Places. Set the formerly-LLM-asserted fields
  // to neutral defaults so downstream formatters render no fabricated
  // signature dish / queue estimate / cost / opening-date.
  const validated = discoveredVenues.map((v) => ({
    ...v,
    signatureDish: '',
    queueMinEstimate: null,
    bookingRequired: false,
    dishes: [],
    costEstimateSgd: null,
    verifiedOpeningDate: null,
    verifiedGoogleMapsUrl: ''
  }));

  const ranked = await rankByWalkingTime(lat, lng, validated);

  let filtered = applyPostFilters(ranked, preset);
  filtered = filtered.filter((v) => v.queueMinEstimate == null || v.queueMinEstimate <= queueMaxMin);
  // v0.30.6: defense-in-depth — drop any fast-food chain. Kept post-
  // v0.61.309 since Places searchText for a cuisine slug ("italian
  // restaurant near me") still surfaces global chains.
  filtered = excludeChains(filtered);
  const sorted = sortVenues(filtered);

  return { venues: sorted, meal, holidayContext, recencyDays, queueMaxMin };
}

module.exports = { searchCuisine, PRESETS };
