// cuisine-search.js — backend for the v0.22.0 Cuisine Picker TMA.
//
// Generalises pickValidated to:
//   - count = 15 (tunable)
//   - explicit radius (no radial expansion)
//   - multi-cuisine + preset + when prompt enrichment
//   - signature_dish per candidate (the "recipe" surface)
//   - sort: open_now first, then walk minutes asc, then rating desc

const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { validateWithPlaces, rankByWalkingTime, mealPeriodSGT } = require('./vibe-suggest');
const holidays = require('./holidays');

const MODEL_NAME = llm.DEFAULT_MODEL;

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

function buildPrompt({ lat, lng, cuisines, radius, recencyDays, queueMaxMin, mode, meal, preset, holidayContext, specialRequest }) {
  const cuisineLine = cuisines.length
    ? `Cuisines requested (any of these): ${cuisines.join(', ')}.`
    : 'Any cuisine appropriate to the period.';
  const radiusLine = `Within ${radius} m of latitude ${lat}, longitude ${lng} (transport mode: ${mode}).`;
  const recencyLine = recencyDays
    ? `Bias toward venues opened or significantly refreshed within the last ${recencyDays} day(s).`
    : '';
  const queueLine = `User's max queue tolerance: ${queueMaxMin} minutes. Estimate queue minutes for each pick honestly (use venue type + day of week + meal period); flag venues you expect to exceed the tolerance with queue_min_estimate, but still include them so the server can filter.`;
  // v0.30.0: free-form qualifier from NL chat search ("Michelin-starred",
  // "halal", "kid-friendly", etc.). Surfaced verbatim so Gemini honours
  // the user's intent across languages without us pre-coding categories.
  const specialLine = specialRequest && specialRequest.trim()
    ? `Distinctive user qualifier (HONOUR THIS): ${specialRequest.trim()}.`
    : '';
  const presetCfg = PRESETS[preset] || null;
  let presetLine = '';
  if (preset === 'holiday-special') {
    if (holidayContext?.isToday) {
      presetLine = `Today is a Singapore public holiday (${holidayContext.name}). Surface venues well-known to remain open on PHs and "newly opened" venues.`;
    } else if (holidayContext?.next) {
      presetLine = `The next Singapore public holiday is ${holidayContext.next.name} on ${holidayContext.next.date}. Surface venues well-known to remain open on PHs and "newly opened" venues.`;
    } else {
      presetLine = 'Surface venues well-known to remain open on Singapore public holidays.';
    }
  } else if (presetCfg?.promptHint) {
    presetLine = presetCfg.promptHint;
  }

  return `You are Gia, a Singapore food concierge. Suggest "Sanctuary" venues for a solo diner.
Period: ${meal.label} (${meal.hint}).
${cuisineLine}
${radiusLine}
${recencyLine}
${queueLine}
${specialLine}
${presetLine}

Return EXACTLY a JSON array of 15 candidate venues. Each item has the keys:
  "name"                 — the venue's exact common name
  "area"                 — the street or building it sits on
  "vibe"                 — one short phrase about why it suits a solo diner
  "signature_dish"       — one specific dish or item to order
  "queue_min_estimate"   — integer minutes you'd expect to queue at this venue at the requested period (best-effort)
  "booking_required"     — boolean, true if reservations are usually needed at peak

Do NOT include lat/lng — those will be looked up authoritatively.
Return ONLY the JSON array, no preamble.`;
}

async function geminiCandidates15(promptArgs) {
  if (!llm.isReady()) return [];
  try {
    const prompt = buildPrompt(promptArgs);
    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, json: true, jsonShape: 'array', maxTokens: 4096 }),
      { label: 'Cuisine-Search' }
    );
    const parsed = JSON.parse(result.response.text());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.name === 'string')
      .slice(0, 16) // v0.59.21: 15 → 16 (cuisine final-list band 8-16).
      .map((c) => ({
        name: c.name,
        area: c.area || '',
        vibe: c.vibe || '',
        signatureDish: c.signature_dish || c.signatureDish || '',
        queueMinEstimate: Number.isFinite(Number(c.queue_min_estimate))
          ? Math.round(Number(c.queue_min_estimate)) : null,
        bookingRequired: c.booking_required === true || c.booking_required === 'true'
      }));
  } catch (err) {
    console.error('[Cuisine-Search] Gemini failed:', err.message);
    return [];
  }
}

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

  // v0.26.0: Reason–Fetch–Refine pipeline. Behind PIPELINE_ENABLED env
  // flag (default ON). When disabled or pipeline returns nothing,
  // falls back to the legacy geminiCandidates15 path.
  const pipelineEnabled = process.env.PIPELINE_ENABLED !== 'false';
  let candidates = [];
  let pipelineDiag = null;
  if (pipelineEnabled && redis) {
    const { runPipeline } = require('./pipeline');
    const draftRun = await runPipeline({
      redis,
      lat, lng,
      query: {
        label: meal.label, detail: meal.hint,
        cuisines, recencyDays, queueMaxMin, radius,
        specialRequest // threaded through pipeline.reason()
      },
      validatedVenues: null,
      // v0.59.21: cap raised 12 → 16 per Human Lead 2026-05-07
      // (band 8-16). Lower bound (8) is a target, not a guarantee —
      // when LLM rank+narrate has fewer high-quality candidates the
      // list shows fewer; brand-throttle dedup (cap=2 per brand) in
      // discover() further refines what reaches the rank stage.
      count: 16
    });
    candidates = draftRun.candidates;
    pipelineDiag = draftRun.diag;
  }
  if (!candidates.length) {
    // Legacy fallback (pipeline disabled, no Redis, or empty draft).
    candidates = await geminiCandidates15({
      lat, lng, cuisines, radius, recencyDays, queueMaxMin, mode, meal, preset, holidayContext, specialRequest
    });
  }
  if (!candidates.length) {
    return { venues: [], meal, holidayContext, recencyDays, queueMaxMin, pipelineDiag };
  }

  // v0.30.3: place-validate phase parallelised. Was sequential
  // (~1s × 15 candidates = ~15s); now Promise.allSettled fans out and
  // typically completes in ~2-3s. This was the dominant slow phase
  // pushing total pipeline latency past the 25s TMA timeout.
  const validateLimit = Math.min(candidates.length, 16); // v0.59.21: 15 → 16.
  const settled = await Promise.allSettled(
    candidates.slice(0, validateLimit).map((c) => validateWithPlaces(c, { lat, lng }, radius))
  );
  const validated = [];
  // v0.59.24: drinks filter — applied to signatureDish + dishes
  // when the user's cuisine list does NOT include dessert/fusion.
  // Per Human Lead 2026-05-07.
  const pipelineMod = require('./pipeline');
  const dropDrinks = pipelineMod.shouldFilterDrinks(cuisines);
  settled.forEach((s, i) => {
    if (s.status !== 'fulfilled' || !s.value) return;
    const v = s.value;
    const c = candidates[i];
    let sig = c.signatureDish || '';
    if (dropDrinks && sig && pipelineMod.isDrink(sig)) sig = '';
    v.signatureDish    = sig;
    v.queueMinEstimate = c.queueMinEstimate != null ? c.queueMinEstimate : null;
    v.bookingRequired  = !!c.bookingRequired;
    const rawDishes    = Array.isArray(c.dishes) ? c.dishes : (sig ? [sig] : []);
    v.dishes           = dropDrinks ? pipelineMod.filterOutDrinks(rawDishes) : rawDishes;
    v.costEstimateSgd  = c.costEstimateSgd || null;
    // v0.30.3 GEOSPATIAL_CULINARY_ANALYST fields. Note: Places URL
    // remains authoritative — verifiedGoogleMapsUrl is purely the
    // model's claimed reference and shown as supporting evidence.
    v.verifiedOpeningDate    = c.verifiedOpeningDate || null;
    v.verifiedGoogleMapsUrl  = c.verifiedGoogleMapsUrl || null;
    validated.push(v);
  });
  if (!validated.length) {
    return { venues: [], meal, holidayContext, recencyDays, queueMaxMin, pipelineDiag };
  }

  const ranked = await rankByWalkingTime(lat, lng, validated);

  // v0.26.0: Refine pass — fetches per-cluster context (weather/traffic/
  // carpark) and rewrites travel advice + queue minutes + cost based on
  // what's happening on the ground right now.
  let postRefine = ranked;
  if (pipelineEnabled && redis) {
    try {
      const { fetchContext, refine } = require('./pipeline');
      const diag = (code, label, ok, detail) => {
        if (!pipelineDiag) pipelineDiag = [];
        pipelineDiag.push({ code, label, ok, detail, t: Date.now() });
      };
      const context = await fetchContext(ranked, diag);
      postRefine = await refine({ draft: ranked, context, query: { label: meal.label }, diag });
    } catch (err) {
      console.error('[Cuisine-Search] Refine pass failed (using ranked draft):', err.message);
    }
  }

  let filtered = applyPostFilters(postRefine, preset);
  filtered = filtered.filter((v) => v.queueMinEstimate == null || v.queueMinEstimate <= queueMaxMin);
  // v0.30.6: defense-in-depth — drop any fast-food chain that slipped
  // past Gemini's negative-constraint compliance.
  filtered = excludeChains(filtered);
  const sorted = sortVenues(filtered);

  return { venues: sorted, meal, holidayContext, recencyDays, queueMaxMin, pipelineDiag };
}

module.exports = { searchCuisine, PRESETS };
