// prompt-builder.js — v0.32.0 Stage A: Gemini constructs the executor prompt.
//
// Why two stages? A single hard-coded "find me 15 venues" prompt fails
// from sparse anchors (e.g. Pasir Panjang) because the executor model
// can't reframe its own constraints. Stage A is a meta-prompter: it
// takes the user's filters + neighbourhood context + meal period + holiday
// context and produces the OPTIMAL prompt to run against Gemini Flash for
// venue discovery, plus explicit relaxation rules for the 0-candidate path.
//
// Stage A output schema (saved verbatim into request row promptConstructed):
//   {
//     system:      "instruction to executor model"
//     user:        "user-facing prompt body"
//     schema:      "schema description for venue candidates"
//     relaxations: [{trigger, drop[], note}]
//     reasoning:   "one-line rationale (diagnostic only)"
//   }
//
// Stage A is deliberately fast (~2 s, no grounding tools, no reasoning
// chain). It's a query-rewrite step, not the search itself.

const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');

const STAGE_A_MODEL = process.env.ANTHROPIC_STAGE_A_MODEL || llm.SONNET_MODEL;

// Fallback prompt — used when Stage A Gemini call fails or returns
// malformed JSON. Mirrors the v0.30.3 GEOSPATIAL_CULINARY_ANALYST prompt
// shape so downstream code paths still work.
function buildFallbackPrompt(input) {
  const { kind, lat, lng, cuisines, radius, recencyDays, queueMaxMin, mealPeriod, specialRequest, holidayContext } = input;
  const cuisineLine = cuisines && cuisines.length
    ? `Cuisine constraint (HONOUR THIS): ${cuisines.join(' or ')}`
    : 'No cuisine restriction';
  const periodLine = mealPeriod ? `Meal period: ${mealPeriod}` : '';
  const phLine = holidayContext?.isToday ? `Today is the SG public holiday: ${holidayContext.name}.` : '';
  const surpriseExtras = kind === 'surprise'
    ? `\nGate: rating between 4.0 and 4.3, fewer than 50 reviews, launched within last 90 days. Day venues remain open ≥2h; night venues open until ≥02:00 OR opens by 08:00 next day.`
    : '';
  const user = [
    `Find ${kind === 'surprise' ? 5 : 15} venues within ${radius} m of ${lat},${lng} in Singapore.`,
    cuisineLine,
    periodLine,
    phLine,
    `Reviews from last ${recencyDays} days are most relevant.`,
    `Avoid venues with queue > ${queueMaxMin} min.`,
    specialRequest ? `Special request: ${specialRequest}` : '',
    surpriseExtras
  ].filter(Boolean).join('\n');
  return {
    system: 'You are a Singapore food concierge. Return ONLY a JSON array of venue objects.',
    user,
    schema: 'Array of {name, area, vibe, signature_dish, dishes[2-4], queue_min_estimate, booking_required, verified_opening_date?}',
    relaxations: [
      { trigger: '0_candidates', drop: ['recencyDays', 'specialRequest'], note: 'fallback (Stage A unavailable)' }
    ],
    reasoning: 'fallback prompt (Stage A genAI unavailable or failed)'
  };
}

async function buildPrompt(input) {
  if (!llm.isReady()) return buildFallbackPrompt(input);

  const builderPrompt = `You are a Singapore culinary query architect. Given the user's filters and context below, build the SINGLE most effective prompt that will return ${input.kind === 'surprise' ? 5 : 15} venue candidates from Gemini Flash for the executor stage.

User filters:
- search type: ${input.kind}
- coordinates: ${input.lat}, ${input.lng}
- radius_m: ${input.radius}
- cuisines: ${(input.cuisines || []).join(', ') || '(none — open discovery)'}
- recency_days_for_reviews: ${input.recencyDays || 90}
- queue_tolerance_min: ${input.queueMaxMin || 15}
- transport_mode: ${input.mode || 'walk'}
- meal_period: ${input.mealPeriod || 'now'}
- when: ${input.when || 'now'}
- preset: ${input.preset || '(none)'}
- special_request: ${input.specialRequest || '(none)'}
- holiday_context: ${input.holidayContext?.isToday ? `today is ${input.holidayContext.name}` : 'normal day'}
- user_language: ${input.lang || 'en'}
${input.kind === 'surprise' ? `
Surprise-specific gates (MANDATORY in your prompt):
- Rating window 4.0–4.3 (NOT ≥ 4.3 — we want hidden gems, not famous spots).
- Fewer than 50 Google reviews.
- Launched within last 3 months (verified_opening_date >= today minus 90 days).
- 2-4 specific dishes per venue, frequently praised by reviewers.
- Day search (06:00–22:00 SGT): venue open now AND remains open ≥2 hours.
- Night search (22:00–06:00 SGT): supper venue open until ≥02:00 OR breakfast opening by 08:00 next day.
- Return EXACTLY 5 distinct venues.
` : ''}
Return JSON exactly:
{
  "system":     "<system instruction for the executor model — terse, no fluff>",
  "user":       "<user-facing prompt body that the executor will receive>",
  "schema":     "<one-line schema description for the venue array the executor must return>",
  "relaxations": [
    {"trigger": "0_candidates", "drop": ["<field1>","<field2>"], "note": "<rationale>"}
  ],
  "reasoning":  "<one-line note explaining your prompt-design choice for diagnostics>"
}

Constraints on your output:
- The executor model has NO Google Search grounding (we disabled it after a 400-error regression). Your prompt MUST be self-contained.
- Tell the executor to return ONLY a JSON array of venues — no preamble.
- The user-facing prompt body MUST cite the user's coordinates and radius explicitly so the executor anchors correctly.
- Relaxation rules MUST list specific filter fields the caller can drop on 0-candidate retry. ${input.kind === 'surprise' ? 'For /surprise, the relaxation should expand the launched-within window from 90 days to 180 days first, then drop the recencyDays gate.' : 'Typically drop recencyDays and specialRequest first.'}

Return ONLY the JSON object.`;

  const t0 = Date.now();
  try {
    const result = await withRetry(
      () => llm.generate({ prompt: builderPrompt, model: STAGE_A_MODEL, json: true, maxTokens: 2048 }),
      { label: 'PromptBuilder' }
    );
    const rawText = result.response.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Tolerant fallback — find the first { ... } block.
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      if (start !== -1 && end > start) parsed = JSON.parse(rawText.slice(start, end + 1));
      else throw new Error('PromptBuilder: non-JSON response');
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.user) {
      throw new Error('PromptBuilder: missing required fields');
    }
    const meta = {
      ms: Date.now() - t0,
      model: STAGE_A_MODEL,
      raw_chars: rawText.length,
      ok: true
    };
    return { prompt: parsed, meta };
  } catch (err) {
    logger.error({ err: { message: err.message } }, 'promptBuilder failed — using fallback');
    return {
      prompt: buildFallbackPrompt(input),
      meta: { ms: Date.now() - t0, model: 'fallback-static', error: err.message?.slice(0, 200), ok: false }
    };
  }
}

module.exports = { buildPrompt, buildFallbackPrompt, STAGE_A_MODEL };
