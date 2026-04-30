// cuisine-search.js — backend for the v0.22.0 Cuisine Picker TMA.
//
// Generalises pickValidated to:
//   - count = 15 (tunable)
//   - explicit radius (no radial expansion)
//   - multi-cuisine + preset + when prompt enrichment
//   - signature_dish per candidate (the "recipe" surface)
//   - sort: open_now first, then walk minutes asc, then rating desc

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { withRetry } = require('./gemini-retry');
const { validateWithPlaces, rankByWalkingTime, mealPeriodSGT } = require('./vibe-suggest');
const holidays = require('./holidays');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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

const ALLOWED_RADIUS = new Set([250, 1000]);

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

function buildPrompt({ lat, lng, cuisines, radius, mode, meal, preset, holidayContext }) {
  const cuisineLine = cuisines.length
    ? `Cuisines requested (any of these): ${cuisines.join(', ')}.`
    : 'Any cuisine appropriate to the period.';
  const radiusLine = `Within ${radius} m of latitude ${lat}, longitude ${lng} (transport mode: ${mode}).`;
  const presetCfg = PRESETS[preset] || null;
  let presetLine = '';
  if (preset === 'holiday-special') {
    if (holidayContext?.isToday) {
      presetLine = `Today is a Singapore public holiday (${holidayContext.name}). Surface venues well-known to remain open on PHs and "newly opened" venues (last 6 months).`;
    } else if (holidayContext?.next) {
      presetLine = `The next Singapore public holiday is ${holidayContext.next.name} on ${holidayContext.next.date}. Surface venues well-known to remain open on PHs and "newly opened" venues (last 6 months).`;
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
${presetLine}

Return EXACTLY a JSON array of 15 candidate venues. Each item has the keys:
  "name"            — the venue's exact common name
  "area"            — the street or building it sits on
  "vibe"            — one short phrase about why it suits a solo diner
  "signature_dish"  — one specific dish or item to order (e.g. "char kway teow", "iced flat white", "sashimi moriawase")

Do NOT include lat/lng — those will be looked up authoritatively.
Return ONLY the JSON array, no preamble.`;
}

async function geminiCandidates15(promptArgs) {
  if (!genAI) return [];
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const prompt = buildPrompt(promptArgs);
    const result = await withRetry(() => model.generateContent(prompt), { label: 'Cuisine-Search' });
    const parsed = JSON.parse(result.response.text());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.name === 'string')
      .slice(0, 15)
      .map((c) => ({
        name: c.name,
        area: c.area || '',
        vibe: c.vibe || '',
        signatureDish: c.signature_dish || c.signatureDish || ''
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

async function searchCuisine({ lat, lng, cuisines = [], radius = 1000, mode = 'walk', when = 'now', preset = null }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('lat/lng required');
  }
  if (!ALLOWED_RADIUS.has(radius)) radius = 1000;

  const presetCfg = PRESETS[preset] || null;
  const meal = whenToMealHint(when, presetCfg?.forceMeal);

  let holidayContext = null;
  if (preset === 'holiday-special') {
    const today = holidays.isPublicHoliday();
    const next = holidays.nextPublicHoliday();
    holidayContext = { isToday: !!today, name: today?.name || null, next };
  }

  const candidates = await geminiCandidates15({
    lat, lng, cuisines, radius, mode, meal, preset, holidayContext
  });
  if (!candidates.length) return { venues: [], meal, holidayContext };

  // Validate each candidate via Places (single attempt at the explicit radius).
  const validated = [];
  for (const c of candidates) {
    if (validated.length >= 15) break;
    const v = await validateWithPlaces(c, { lat, lng }, radius);
    if (!v) continue;
    v.signatureDish = c.signatureDish || '';
    validated.push(v);
  }
  if (!validated.length) return { venues: [], meal, holidayContext };

  // Walking-time enrichment (single Routes Matrix call for all 15).
  const ranked = await rankByWalkingTime(lat, lng, validated);

  const filtered = applyPostFilters(ranked, preset);
  const sorted = sortVenues(filtered);

  return { venues: sorted, meal, holidayContext };
}

module.exports = { searchCuisine, PRESETS };
