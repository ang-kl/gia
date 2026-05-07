// pipeline.js — v0.26.0
//
// Reason–Fetch–Refine "Draft-and-Validate" middleware.
//
// reason()       — Gemini 2.5 Flash with vault snapshot context. Returns
//                  candidate {name, area, dishes:[1-3], cost_estimate_sgd}.
//                  Reads grounded review text from the snapshot when
//                  available (vault-index keeps last-5 reviews per placeId).
// fetchContext() — Per-cluster (500 m grid) data.gov.sg pulls:
//                  weather (2-hour forecast), traffic incidents, carpark
//                  occupancy as a foot-traffic proxy.
// refine()       — Gemini second pass. Reconciles draft + context:
//                  rewrites travel advice, surfaces shelter notes on heavy
//                  rain, inflates wait time on heavy traffic.
//
// runPipeline()  — orchestrator used by /cuisine and /surprise.
//
// Diagnostic codes (mirror of TMA codes for grep parity):
//   D601  vault snapshot built (n_vault, n_summaries, n_reviews)
//   D610  reason gemini start
//   D611  reason gemini ok
//   D612  reason gemini fail
//   D620  cluster build
//   D621  context fetch start (n_clusters)
//   D622  context fetch done (elapsed ms)
//   D623  context fetch partial-fail
//   D630  refine gemini start
//   D631  refine gemini ok
//   D632  refine gemini fail
//   D640  pipeline emit final (n_final)

const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const vaultIndex = require('./vault-index');
const weather = require('./weather');
const transport = require('./transport');
const carpark = require('./carpark');
const { logger } = require('./logger');
const { googleMapsUrl } = require('./maps-url');

const MODEL_NAME = llm.DEFAULT_MODEL;

const GRID_M = 500;

// v0.31.2: When grounding is on we cannot use responseMimeType:application/json
// (Gemini API rejects the combination with HTTP 400). Grounded responses may
// arrive wrapped in ```json fences or surrounded by prose; locate and return
// the first top-level JSON array. Falls back to raw text for the existing
// JSON.parse to surface a meaningful error in D612 diagnostics.
function extractJsonArray(text) {
  if (!text) return text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  // Preferred shape: top-level array.
  const arrStart = candidate.indexOf('[');
  const arrEnd = candidate.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) return candidate.slice(arrStart, arrEnd + 1);

  // Tolerate top-level objects from occasional model drift:
  // {"venues":[...]}, {"candidates":[...]}, {"results":[...]}.
  const objStart = candidate.indexOf('{');
  const objEnd = candidate.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      const obj = JSON.parse(candidate.slice(objStart, objEnd + 1));
      const arr = Array.isArray(obj?.venues) ? obj.venues
        : Array.isArray(obj?.candidates) ? obj.candidates
        : Array.isArray(obj?.results) ? obj.results
        : null;
      if (arr) return JSON.stringify(arr);
    } catch {
      // fall through and return candidate for upstream parse diagnostics
    }
  }
  return candidate;
}

// ---------------------------------------------------------------------
// REASON
// ---------------------------------------------------------------------

// v0.30.3: GEOSPATIAL_CULINARY_ANALYST persona, sourced from the
// Human Lead's canonical recipe at prompt-templates/geospatial-
// culinary-analyst.md. Pairs with Google Search grounding so the
// model can hit live web sources for "newly opened" recall.
function buildReasonPrompt({ lat, lng, query, snapshot, count }) {
  const vaultBlock = snapshot.vault.length
    ? snapshot.vault.map((v, i) => {
        const reviews = snapshot.reviews[v.placeId] || [];
        const reviewLines = reviews.length
          ? reviews.map((r) => `    - "${(r.text || '').replace(/\s+/g, ' ').slice(0, 220)}"${r.rating != null ? ` (${r.rating}★)` : ''}`).join('\n')
          : '    (no recent reviews cached)';
        const summary = snapshot.summaries[v.placeId] || '';
        return `${i + 1}. ${v.name} — ${v.area || v.primaryType}${summary ? `\n   summary: ${summary.slice(0, 200)}` : ''}\n   recent reviews:\n${reviewLines}`;
      }).join('\n\n')
    : '(vault is empty for this area)';

  const radiusKm = ((query.radius || 1000) / 1000).toFixed(1);
  const hasCuisines = Array.isArray(query.cuisines) && query.cuisines.length > 0;
  const cuisinesList = hasCuisines ? query.cuisines.join(', ') : 'any cuisine appropriate to the period';
  const recencyClause = query.recencyDays
    ? `confirmed grand opening dates within the last ${query.recencyDays} day(s) (use Google Search to verify opening dates)`
    : 'verified OPERATIONAL business status';
  const queueLine = query.queueMaxMin ? `User queue tolerance: ≤ ${query.queueMaxMin} minutes — estimate honestly per pick.` : '';
  const specialLine = query.specialRequest && query.specialRequest.trim()
    ? `Distinctive user qualifier (HONOUR THIS): ${query.specialRequest.trim()}.`
    : '';
  // v0.30.6: when the user named cuisines explicitly, those override the
  // meal-period bias. Previously "afternoon snack" hint pulled Gemini
  // toward coffee/dessert even when the user asked for Korean food.
  // Soften the period framing AND add an authoritative cuisine clause.
  const periodLine = hasCuisines
    ? `Time of day (informational only — DO NOT bias toward generic snack/café venues): ${query.label || 'now'}${query.detail ? ` (${query.detail})` : ''}.`
    : `Period: ${query.label || 'now'}${query.detail ? ` (${query.detail})` : ''}.`;
  const cuisineEnforcement = hasCuisines
    ? `\nAUTHORITATIVE CUISINE CONSTRAINT: Every venue you return MUST primarily serve one of [${cuisinesList}]. Coffee shops, dessert specialists, generic cafés, kopitiams, and bakeries DO NOT QUALIFY unless they specialise in the named cuisines. If you cannot find venues matching the cuisines + area + recency, return fewer (or zero) — DO NOT pad with off-cuisine venues.`
    : '';

  return `[ACT: GEOSPATIAL_CULINARY_ANALYST]

Execute a deep-crawl search USING GOOGLE SEARCH GROUNDING to identify ${cuisinesList} establishments located within ${radiusKm} km of latitude ${lat}, longitude ${lng} in Singapore.

${periodLine}
Filter results to include only venues with ${recencyClause}.
${queueLine}
${specialLine}${cuisineEnforcement}

For each qualifying entry, return JSON with:
  "name"                      — exact common name
  "verified_opening_date"     — ISO date YYYY-MM-DD if cross-referenced via Google Search; null otherwise
  "verified_google_maps_url"  — canonical Google Maps URL if you found it; null otherwise (server will overlay authoritative URL from Places)
  "area"                      — street or building
  "vibe"                      — one short phrase suitable for a solo diner
  "dishes"                    — array of 1–3 specific dish strings (the order recommendation)
  "signature_dish"            — single most-recommended dish from "dishes"
  "cost_estimate_sgd"         — { "low": <int>, "high": <int> } per-person typical spend (cite review snippets verbatim when possible)
  "queue_min_estimate"        — integer minutes
  "booking_required"          — boolean

NEGATIVE CONSTRAINTS (exclude):
  - Major fast-food chains (McDonald's, KFC, Subway, Burger King, Starbucks, Coffee Bean & Tea Leaf, Domino's, Pizza Hut, Jollibee, Texas Chicken)
  - Closed venues
  - Venues outside Singapore

Cross-reference between real-time social media activity (Instagram, TikTok, Reddit r/singapore, r/SingaporeEats) AND verified F&B editorial sources (Time Out Singapore, SethLui, Honeycombers, MICHELIN Guide SG, Tatler) for maximum factual density.

VAULT SNAPSHOT (${snapshot.vault.length} venues — ground first on these cached entries with their recent reviews; only invoke Google Search grounding when the vault is silent for the requested cuisines):
${vaultBlock}

Return EXACTLY a JSON array of ${count} venues. Return ONLY the JSON array.`;
}

async function reason({ lat, lng, query, snapshot, count = 15, diag = noopDiag() }) {
  if (!llm.isReady()) {
    diag('D612', 'LLM unavailable (no API key)', false);
    return [];
  }
  diag('D610', 'Reason call start', true, { count, vault_n: snapshot.vault.length });
  try {
    // v0.40.0: migrated to Anthropic. Web-search grounding (the Gemini
    // googleSearch tool) is dropped — was already off by default since
    // v0.31.2 (`GROUNDING_ENABLED=false`) due to the JSON-mime regression.
    // The vault snapshot remains the primary grounding source.
    const prompt = buildReasonPrompt({ lat, lng, query, snapshot, count });
    logger.info({ model: MODEL_NAME, promptLen: prompt.length }, 'pipeline reason start');
    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, json: true, jsonShape: 'array', maxTokens: 8192 }),
      { label: 'Pipeline-Reason' }
    );
    // v0.30.4: capture raw text for diagnostic on parse error.
    const rawText = result.response.text();
    logger.info({ rawChars: rawText.length }, 'pipeline reason response');
    let parsed;
    try {
      // v0.31.2: grounded responses arrive without responseMimeType, so
      // Gemini may wrap JSON in markdown fences or surrounding prose.
      // Strip ```json ... ``` fences and locate the first top-level
      // `[ ... ]` array before parsing.
      const cleaned = extractJsonArray(rawText);
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      diag('D612', 'Reason JSON parse failed', false, {
        err: parseErr.message,
        head: rawText.slice(0, 200),
        tail: rawText.slice(-100)
      });
      logger.error({ err: { message: parseErr.message }, head: rawText.slice(0, 200) }, 'pipeline reason JSON parse failed');
      return [];
    }
    if (!Array.isArray(parsed)) {
      diag('D612', 'Reason returned non-array', false, { type: typeof parsed, keys: typeof parsed === 'object' ? Object.keys(parsed || {}).slice(0, 5) : [] });
      logger.error({ type: typeof parsed, head: JSON.stringify(parsed).slice(0, 200) }, 'pipeline reason non-array response');
      return [];
    }
    const candidates = parsed.filter((c) => c && typeof c.name === 'string').slice(0, count).map((c) => ({
      name: c.name,
      area: c.area || '',
      vibe: c.vibe || '',
      dishes: Array.isArray(c.dishes) ? c.dishes.slice(0, 3) : [],
      costEstimateSgd: c.cost_estimate_sgd && typeof c.cost_estimate_sgd === 'object'
        ? { low: Number(c.cost_estimate_sgd.low) || null, high: Number(c.cost_estimate_sgd.high) || null }
        : null,
      signatureDish: c.signature_dish || (Array.isArray(c.dishes) ? c.dishes[0] : ''),
      queueMinEstimate: Number.isFinite(Number(c.queue_min_estimate))
        ? Math.round(Number(c.queue_min_estimate)) : null,
      bookingRequired: c.booking_required === true || c.booking_required === 'true',
      // v0.30.3 GEOSPATIAL_CULINARY_ANALYST schema additions:
      verifiedOpeningDate: typeof c.verified_opening_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.verified_opening_date)
        ? c.verified_opening_date : null,
      verifiedGoogleMapsUrl: typeof c.verified_google_maps_url === 'string' ? c.verified_google_maps_url : null
    }));
    diag('D611', 'Reason returned candidates', true, { n: candidates.length });
    return candidates;
  } catch (err) {
    diag('D612', 'Reason gemini failed', false, err.message);
    logger.error({ err: { message: err.message } }, 'pipeline reason failed');
    return [];
  }
}

// v0.32.0: reasonExecute — accepts a Stage-A-constructed prompt object
// `{system, user, schema, relaxations, reasoning}` and runs the executor
// model. No internal prompt construction; no grounding tools (Stage A
// notes this in its constructed prompt). Returns the same shape as
// reason() so downstream code (cuisine-search, surprise) is uniform.
//
// On 0 candidates and a relaxation rule with trigger "0_candidates", the
// caller (pipeline-task.js) is responsible for re-invoking with a
// modified prompt — this function does NOT auto-retry; that policy lives
// at the orchestrator layer.
function normaliseCandidate(c, isSurprise = false) {
  return {
    name: c.name,
    area: c.area || '',
    vibe: c.vibe || '',
    dishes: Array.isArray(c.dishes) ? c.dishes.slice(0, isSurprise ? 4 : 3) : [],
    costEstimateSgd: c.cost_estimate_sgd && typeof c.cost_estimate_sgd === 'object'
      ? { low: Number(c.cost_estimate_sgd.low) || null, high: Number(c.cost_estimate_sgd.high) || null }
      : null,
    signatureDish: c.signature_dish || (Array.isArray(c.dishes) ? c.dishes[0] : ''),
    queueMinEstimate: Number.isFinite(Number(c.queue_min_estimate))
      ? Math.round(Number(c.queue_min_estimate)) : null,
    bookingRequired: c.booking_required === true || c.booking_required === 'true',
    verifiedOpeningDate: typeof c.verified_opening_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.verified_opening_date)
      ? c.verified_opening_date : null,
    verifiedGoogleMapsUrl: typeof c.verified_google_maps_url === 'string' ? c.verified_google_maps_url : null,
    reviewerPraise: typeof c.reviewer_praise === 'string' ? c.reviewer_praise : null
  };
}

async function reasonExecute({ prompt, count = 15, isSurprise = false, diag = noopDiag() }) {
  if (!llm.isReady()) {
    diag('D612', 'LLM unavailable (no API key)', false);
    return { candidates: [], rawText: '', meta: { ok: false, error: 'no_api_key' } };
  }
  if (!prompt || !prompt.user) {
    diag('D612', 'reasonExecute: missing prompt.user', false);
    return { candidates: [], rawText: '', meta: { ok: false, error: 'no_prompt' } };
  }
  diag('D610', 'Reason call start', true, { count, executor: true });
  const composed = `[USER]\n${prompt.user}\n\n`
    + (prompt.schema ? `[SCHEMA]\n${prompt.schema}\n\n` : '')
    + 'Return ONLY a JSON array.';
  const t0 = Date.now();
  try {
    logger.info({ model: MODEL_NAME, promptLen: composed.length }, 'pipeline reason-exec start');
    const result = await withRetry(
      () => llm.generate({
        prompt: composed,
        system: prompt.system || undefined,
        model: MODEL_NAME,
        json: true,
        jsonShape: 'array',
        maxTokens: 8192
      }),
      { label: 'Pipeline-Reason-Exec' }
    );
    const rawText = result.response.text();
    const ms = Date.now() - t0;
    logger.info({ rawChars: rawText.length, ms }, 'pipeline reason-exec response');
    let parsed;
    try {
      parsed = JSON.parse(extractJsonArray(rawText));
    } catch (parseErr) {
      diag('D612', 'Reason JSON parse failed', false, {
        err: parseErr.message, head: rawText.slice(0, 200), tail: rawText.slice(-100)
      });
      return { candidates: [], rawText, meta: { ok: false, error: 'parse', ms } };
    }
    if (!Array.isArray(parsed)) {
      diag('D612', 'Reason returned non-array', false, { type: typeof parsed });
      return { candidates: [], rawText, meta: { ok: false, error: 'non_array', ms } };
    }
    const candidates = parsed
      .filter((c) => c && typeof c.name === 'string')
      .slice(0, count)
      .map((c) => normaliseCandidate(c, isSurprise));
    diag('D611', 'Reason returned candidates', true, { n: candidates.length });
    return { candidates, rawText, meta: { ok: true, ms, raw_chars: rawText.length } };
  } catch (err) {
    const ms = Date.now() - t0;
    diag('D612', 'Reason gemini failed', false, err.message);
    logger.error({ err: { message: err.message } }, 'pipeline reason-exec failed');
    return { candidates: [], rawText: '', meta: { ok: false, error: err.message?.slice(0, 200), ms } };
  }
}

// ---------------------------------------------------------------------
// DISCOVER + RANK&NARRATE (v0.41.0 inverted pipeline)
// ---------------------------------------------------------------------
//
// The legacy Reason / reasonExecute path asks Claude to invent venue
// names, then hits Google Places to validate each one. On sparse anchors
// (Pasir Panjang, far-west HDB, sub-CBD) ~30-60% of names hallucinate
// and validation drops them — empty result.
//
// The inversion: Google Places is the discovery index, Claude is the
// ranker/narrator. discover() returns 20 real, currently-open, rated
// venues from Places. rankAndNarrate() asks Claude to pick top N and
// add per-venue narrative (vibe / dishes / cost). No invention.
//
// Diagnostic codes (additive — old D610/D611/D612 still fire when the
// rollback flag PIPELINE_INVERSION_ENABLED=false is set):
//   D710  discover Places start
//   D711  discover Places ok (n_candidates)
//   D712  discover Places failed
//   D720  rankAndNarrate Claude start
//   D721  rankAndNarrate Claude ok (n_picked)
//   D722  rankAndNarrate Claude failed (falls back to top-N by rating)

const axios = require('axios');

const PLACES_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

// v0.59.19 — iconic Singapore dish names. When the user picks the
// "Singaporean" cuisine chip, discover() rotates 2 random dishes from
// this list into the Places textQuery (alongside the Singaporean
// anchor) so the search diversifies recall across calls — chicken-rice
// stalls one call, Bak Kut Teh another, Chilli Crab a third — without
// losing the SG-cuisine breadth. Per Human Lead 2026-05-06.
//
// Names match how French-speaking SG residents refer to the dishes
// (Telegram bot reply prose can sit around them in either EN or FR;
// the dish name itself stays in its native form — same iconic-dish
// carve-out the venue-templates and Gemini grounding prompt already
// observe).
// v0.59.21: removed 'Curry Puff' (brand-cluster offender — see
// throttleBrands rationale), 'Ice Kacang' and 'Chendol' (better-served
// by the Dessert cuisine entry's specialRequest). Pool 50 → 47.
const SINGAPOREAN_DISHES = [
  'Hainanese Chicken Rice', 'Chilli Crab', 'Laksa', 'Char Kway Teow',
  'Hokkien Mee', 'Bak Kut Teh', 'Bak Chor Mee', 'Chai Tow Kway',
  'Oyster Omelette', 'Rojak', 'Tau Huay',
  'Popiah', 'Chwee Kueh', 'Sambal Stingray', 'Prawn Mee',
  'Wanton Mee', 'Ban Mian', 'Claypot Rice', 'Duck Rice', 'Lor Mee',
  'Kway Chap', 'Yong Tau Foo', 'Nasi Lemak', 'Satay', 'Beef Rendang',
  'Nasi Padang', 'Lontong', 'Mee Rebus', 'Mee Siam', 'Ayam Penyet',
  'Soto Ayam', 'Mee Goreng', 'Sup Tulang', 'Asam Pedas', 'Sayur Lodeh',
  'Otak-Otak', 'Tauhu Goreng', 'Pulut Hitam', 'Bubur Cha Cha',
  'Roti Prata', 'Nasi Biryani', 'Murtabak', 'Fish Head Curry',
  'Thosai', 'Vadai', 'Mutton Soup', 'Putu Mayam'
];

// Partial Fisher-Yates: returns up to n unique items drawn from arr.
function pickRandomSubset(arr, n) {
  const a = [...(arr || [])];
  const out = [];
  for (let i = 0; i < n && a.length; i++) {
    const j = Math.floor(Math.random() * a.length);
    out.push(a.splice(j, 1)[0]);
  }
  return out;
}

// Word-token match (Codex review #224): cuisines arriving here may
// have search-modifier prefixes — index.js routes things like
// 'halal Singaporean', 'vegetarian Singaporean', 'home-cooked
// Singaporean', or 'private dining home-cooked Singaporean' into
// discover(). An exact-string compare misses those. Splitting on
// whitespace and matching any token equal to 'singaporean' (lc)
// catches every prefixed form while respecting word boundaries —
// e.g. 'singaporean-style' (one hyphenated token) still does NOT
// match, which is correct (that's not a Singaporean cuisine pick).
function containsSingaporeanCuisine(cuisines) {
  if (!Array.isArray(cuisines)) return false;
  return cuisines.some((c) =>
    String(c || '')
      .split(/\s+/)
      .some((tok) => tok.toLowerCase() === 'singaporean')
  );
}

// Expand the user's cuisine selection: when 'singaporean' appears as
// a word-token in any cuisine entry, keep all original entries AND
// append 2 random iconic SG dishes from SINGAPOREAN_DISHES. Non-SG
// selections pass through unchanged.
function expandSingaporeanCuisines(cuisines) {
  if (!Array.isArray(cuisines)) return cuisines;
  if (!containsSingaporeanCuisine(cuisines)) return cuisines;
  // v0.59.21: 2 → 3 dishes per Human Lead 2026-05-07. The query stays
  // well under Places' textQuery length cap and 3 OR-terms still
  // produce enough varied recall without diluting the result list.
  return [...cuisines, ...pickRandomSubset(SINGAPOREAN_DISHES, 3)];
}

// v0.59.21 — Dessert + Fusion query expansion (Codex review #226 P2).
// /api/cuisine/search calls pipeline.discover() directly with no LLM
// rank step — query.specialRequest never reaches an LLM in the TMA
// flow. To honour Human Lead's Dessert/Fusion intent in the TMA path,
// we expand the Places textQuery with grounded keywords the same way
// Singaporean expands with random iconic dishes.
const DESSERT_KEYWORDS = [
  'kueh', 'kaya toast', 'bingsu', 'patisserie', 'tau huay',
  'bubur cha cha', 'ice kachang', 'chendol', 'mochi', 'gelato',
  'cake shop', 'soft serve'
];
const FUSION_KEYWORDS = [
  'Michelin Star Singapore', 'Michelin Bib Gourmand Singapore',
  "Asia's 50 Best Restaurants", 'modern Asian Singapore',
  'contemporary Singapore'
];

function expandDessertCuisines(cuisines) {
  if (!Array.isArray(cuisines)) return cuisines;
  const has = cuisines.some((c) =>
    String(c || '').split(/\s+/).some((tok) => tok.toLowerCase() === 'dessert')
  );
  if (!has) return cuisines;
  return [...cuisines, ...pickRandomSubset(DESSERT_KEYWORDS, 3)];
}

function expandFusionCuisines(cuisines) {
  if (!Array.isArray(cuisines)) return cuisines;
  const has = cuisines.some((c) =>
    String(c || '').split(/\s+/).some((tok) => tok.toLowerCase() === 'fusion')
  );
  if (!has) return cuisines;
  return [...cuisines, ...pickRandomSubset(FUSION_KEYWORDS, 2)];
}

// v0.59.24 — Drinks filter. Per Human Lead 2026-05-07: the
// "🍴 Try ·" recommendation should be a *food* dish, not a drink.
// Applied to the dishes array + signatureDish before they reach
// the user. Conditional: skipped when the user picks Dessert or
// Fusion cuisines, since those venues legitimately surface sweet
// drinks (chendol, bandung) and signature coffee/cocktail programs.
// Per Human Lead 2026-05-07. Multi-word forms preferred over
// standalone "teh" / "tea" / "coffee" to avoid false-positives on
// SG food dishes whose names contain those tokens (Bak Kut Teh =
// pork rib soup, Tea-Smoked Duck = dish, Coffee Pork Ribs = dish).
const DRINK_TERMS = [
  // SG / Asian beverages — multi-word + unambiguous singles
  'kopi', 'kopi-o', 'kopi-c', 'kopi gao', 'kopi peng', 'kopi siew dai',
  'teh-o', 'teh-c', 'teh tarik', 'teh peng', 'teh halia',
  'milo', 'milo dinosaur', 'horlicks', 'ovaltine',
  'bandung', 'soya bean', 'soy milk', 'soybean milk', 'barley water',
  'chrysanthemum tea', 'sugarcane juice', 'lime juice', 'lemon juice',
  // Western coffee / tea — multi-word forms only
  'latte', 'cappuccino', 'espresso', 'mocha', 'macchiato',
  'americano', 'flat white', 'cold brew', 'iced coffee', 'iced tea',
  'iced latte', 'hot chocolate', 'matcha latte', 'chai latte',
  // Bubble tea / sweet drinks
  'bubble tea', 'boba', 'milk tea', 'taro milk', 'thai milk tea',
  'fruit tea', 'fresh juice', 'smoothie', 'milkshake',
  'lemonade', 'soda', 'cola', 'sparkling water',
  // Bar / alcohol
  'beer', 'craft beer', 'wine', 'red wine', 'white wine', 'champagne',
  'cocktail', 'mocktail', 'whisky', 'whiskey', 'bourbon', 'scotch',
  'sake', 'soju', 'shochu', 'mojito', 'margarita', 'martini',
  'gin and tonic', 'old fashioned', 'sangria', 'spritz'
];
const DRINK_RE = new RegExp(
  '\\b(' + DRINK_TERMS
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
    .join('|') + ')\\b',
  'i'
);

function isDrink(dish) {
  return DRINK_RE.test(String(dish || ''));
}

function filterOutDrinks(dishes) {
  if (!Array.isArray(dishes)) return dishes;
  return dishes.filter((d) => !isDrink(d));
}

// Returns true when the drinks filter SHOULD run for this cuisine
// selection. False when 'dessert' or 'fusion' is in the list — those
// venues legitimately surface drinks as headline items.
function shouldFilterDrinks(cuisines) {
  if (!Array.isArray(cuisines)) return true;
  return !cuisines.some((c) =>
    String(c || '').split(/\s+/).some((tok) => {
      const t = tok.toLowerCase();
      return t === 'dessert' || t === 'fusion';
    })
  );
}

// v0.59.21 — Brand-throttle dedup. After Google Places returns
// candidates, runs of same-brand venues (Hong Lim Curry Puff at 3
// outlets, Gold Xiang Curry Puff at 2 outlets, etc.) crowd out
// dish-level variety. This helper extracts a "brand key" by
// normalising the venue name and caps at `cap` venues per brand.
//
// Brand-key extraction:
//   1. Lowercase, drop trailing branch markers after " - "
//      ("GOLD XIANG CURRY PUFF PTE. LTD. - Bukit Merah" → "gold xiang
//      curry puff pte. ltd.")
//   2. Drop parenthesised suffixes ("Hong Lim Curry Puff (Maxwell
//      Food Centre)" → "Hong Lim Curry Puff")
//   3. Strip corporate-form tokens (pte, ltd, pte., ltd., co, co.,
//      &) and punctuation
//   4. Collapse whitespace, take first 4 tokens
//
// Wired into runPipeline between discover() and rankAndNarrate so
// both cuisine-search and chat-side flows get the throttled list.
const CORPORATE_TOKENS = new Set(['pte', 'ltd', 'pte.', 'ltd.', 'co', 'co.', '&', 'and', 'inc', 'inc.', 'llc']);
function brandKey(venue) {
  const raw = String(venue?.displayName?.text || venue?.displayName || venue?.name || '');
  if (!raw) return '';
  let s = raw.toLowerCase();
  // Cut at " - " (en-dash hyphen variants too).
  s = s.split(/\s[-–—]\s/)[0];
  // Drop parenthesised suffixes, including "[ ... ]" and "{ ... }".
  s = s.replace(/[(\[{][^)\]}]*[)\]}]/g, ' ');
  // Strip punctuation.
  s = s.replace(/[.,!?'"`]/g, ' ');
  // Tokenise; drop corporate-form tokens.
  const tokens = s.split(/\s+/).filter((t) => t && !CORPORATE_TOKENS.has(t));
  // First 4 tokens — covers "Hong Lim Curry Puff" and "Gold Xiang
  // Curry Puff" (both 4 tokens) without over-collapsing distinct
  // brands like "Toast Box" vs "Toast Box Express".
  return tokens.slice(0, 4).join(' ').trim();
}

function throttleBrands(venues, cap = 2) {
  if (!Array.isArray(venues)) return venues;
  const counts = new Map();
  const out = [];
  for (const v of venues) {
    const key = brandKey(v);
    if (!key) { out.push(v); continue; }
    const n = counts.get(key) || 0;
    if (n < cap) {
      out.push(v);
      counts.set(key, n + 1);
    }
  }
  return out;
}

// v0.59.21 — Inject per-cuisine prompt augmentations into the
// rankAndNarrate `specialRequest` slot. Currently for Dessert and
// Fusion (new categories from Human Lead 2026-05-07).
//
// History-aware clauses ("past 4 months", "top 5 favorites") were
// stripped per user direction — there's no user-history backing
// store today. The prompt now grounds entirely against discover()
// candidates + LLM training-data awareness. When user-history
// infra ships later, this helper can grow the stripped clauses
// back without changing call sites.
function specialRequestForCuisines(cuisines) {
  const lc = (cuisines || []).map((c) => String(c || '').toLowerCase());
  const reqs = [];
  if (lc.some((c) => c.split(/\s+/).some((tok) => tok === 'dessert'))) {
    reqs.push("Surface dessert venues that are open now at the user's local time. Prefer variety across dessert styles (kueh, kaya toast, bingsu, patisserie, ice kachang, chendol) and avoid repeating the same brand more than twice.");
  }
  if (lc.some((c) => c.split(/\s+/).some((tok) => tok === 'fusion'))) {
    reqs.push("Surface fusion restaurants that are open now. Prefer venues listed in the Michelin Guide Singapore 2025-2026 (Star or Bib Gourmand) or Asia's 50 Best Restaurants 2025-2026; if none are reachable, fall back to other well-regarded fusion venues. Avoid repeating the same brand more than twice.");
  }
  return reqs.join(' ');
}

const DISCOVER_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.businessStatus',
  'places.primaryType',
  'places.googleMapsUri',
  'places.googleMapsLinks',
  'places.currentOpeningHours.openNow',
  // v0.57.20: regularOpeningHours.periods carries weekly schedule
  // (open.day/open.hour/open.minute + close.*). Used to derive
  // "Closed today · Opens tomorrow 11:00 AM" when openNow=false.
  'places.regularOpeningHours.periods',
  // v0.58.50: human-readable weekday descriptions ("Monday: 11:00 AM
  // – 9:00 PM") so the new T1/T2/T3 venue templates can show full
  // schedules. v0.57.20's periods are already requested for the
  // closed-today helper; weekdayDescriptions is a separate field
  // that arrives pre-formatted.
  'places.regularOpeningHours.weekdayDescriptions',
  // v0.58.50: contact + web fields for T1/T2 venue templates
  // (🌐 website, 📞 phone). Atmosphere SKU.
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.generativeSummary',
  'places.reviews'
].join(',');

function priceLevelToInt(p) {
  if (typeof p === 'number') return p;
  const map = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4
  };
  return map[p] ?? null;
}

// discover() — Google Places-first venue retrieval. When cuisines are
// specified, uses searchText with a cuisine keyword (better for cuisine
// recall than searchNearby's includedTypes filter). Otherwise falls
// back to searchNearby with a broad type set.
// v0.59.0: `lang` ('en' | 'fr', default 'en') is forwarded to Google
// Places as `languageCode` so weekday descriptions, generative
// summaries, and primary-type display labels come back in the user's
// language. Venue display names stay the actual brand (Google doesn't
// translate proper nouns), which is what we want for SG iconic stalls.
async function discover({ lat, lng, cuisines = [], radius = 1000, mealPeriod = 'now', maxResults = 20, regionCode = 'SG', lang = 'en', diag = noopDiag() }) {
  const languageCode = lang === 'fr' ? 'fr' : 'en';
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) {
    diag('D712', 'GOOGLE_MAPS_API_KEY missing', false);
    return [];
  }
  // v0.59.19: when 'Singaporean' is selected, rotate in 2 random
  // iconic-dish terms so consecutive calls return varied venues (not
  // the same chicken-rice / laksa duo every time). Pass-through for
  // every other cuisine selection.
  // v0.59.21 (Codex #226 P2): chain Dessert/Fusion query expansion
  // here too so the TMA path (which calls discover() directly with
  // no LLM rank) still honours the Dessert/Fusion intent.
  let effectiveCuisines = expandSingaporeanCuisines(cuisines);
  effectiveCuisines = expandDessertCuisines(effectiveCuisines);
  effectiveCuisines = expandFusionCuisines(effectiveCuisines);
  diag('D710', 'Discover Places start', true, { lat, lng, cuisines: effectiveCuisines, radius });
  const t0 = Date.now();
  try {
    const hasCuisines = Array.isArray(effectiveCuisines) && effectiveCuisines.length > 0;
    let data;
    if (hasCuisines) {
      const cuisineQuery = effectiveCuisines.join(' OR ');
      // v0.57.15: append "cuisine" to disambiguate place-name overlap.
      // Bare names like "New Zealand" or "Australian" otherwise match
      // embassies / brand names / suburb references; "New Zealand
      // cuisine restaurant" steers Places toward food-themed venues.
      // v0.57.16: dropped strictTypeFiltering so meal_takeaway,
      // meal_delivery, cafe, bakery types are also returned. Lets
      // home-based / takeaway-only operators surface (e.g. Rakae,
      // Empress Family Feast). Non-food types (lodging, mall, etc.)
      // are still removed by the post-fetch NON_FOOD_TYPES deny-list.
      const { data: textData } = await axios.post(
        PLACES_TEXT_URL,
        {
          textQuery: `${cuisineQuery} cuisine restaurant`,
          includedType: 'restaurant',
          strictTypeFiltering: false,
          regionCode,
          languageCode,                                    // v0.59.0
          maxResultCount: Math.min(maxResults, 20),
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius
            }
          },
          openNow: false // Surface closed venues too — refine layer decides
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-FieldMask': DISCOVER_FIELD_MASK
          },
          timeout: 8000
        }
      );
      data = textData;
    } else {
      const { data: nearbyData } = await axios.post(
        PLACES_NEARBY_URL,
        {
          includedTypes: ['restaurant', 'cafe', 'bar', 'meal_takeaway', 'food_court', 'bakery'],
          maxResultCount: Math.min(maxResults, 20),
          languageCode,                                    // v0.59.0
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius
            }
          },
          rankPreference: 'POPULARITY'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-FieldMask': DISCOVER_FIELD_MASK
          },
          timeout: 8000
        }
      );
      data = nearbyData;
    }
    const ms = Date.now() - t0;
    const raw = (data?.places || [])
      .filter((p) => (p.businessStatus ?? 'OPERATIONAL') === 'OPERATIONAL')
      .map((p) => {
        const overview = p.generativeSummary?.overview?.text?.trim();
        const summary = overview ? {
          overview,
          disclosure: (p.generativeSummary?.disclosureText?.text || p.generativeSummary?.disclaimerText?.text || 'Summarized with Gemini').trim(),
          flagUri: p.generativeSummary?.overviewFlagContentUri || ''
        } : null;
        return {
          placeId: p.id,
          name: p.displayName?.text || '',
          area: p.formattedAddress || '',
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          rating: p.rating ?? null,
          userRatingCount: p.userRatingCount ?? null,
          priceLevel: priceLevelToInt(p.priceLevel),
          openNow: p.currentOpeningHours?.openNow ?? null,
          regularPeriods: Array.isArray(p.regularOpeningHours?.periods) ? p.regularOpeningHours.periods : null,
          // v0.58.50: full weekday schedule for the new venue templates.
          // Pre-formatted by Google ("Monday: 11:00 AM – 9:00 PM").
          weekdayDescriptions: Array.isArray(p.regularOpeningHours?.weekdayDescriptions)
            ? p.regularOpeningHours.weekdayDescriptions
            : null,
          // v0.58.50: contact + web for the 🌐 / 📞 lines.
          websiteUri: p.websiteUri || '',
          phone: p.nationalPhoneNumber || '',
          primaryType: p.primaryType || 'restaurant',
          url: googleMapsUrl(p) ?? '',
          directionsUri: p.googleMapsLinks?.directionsUri ?? '',
          reviewsUri: p.googleMapsLinks?.reviewsUri ?? '',
          photosUri: p.googleMapsLinks?.photosUri ?? '',
          googleSummary: summary,
          // v0.57.10: pass through Places reviews so downstream code
          // (dish extraction, summary cache) can use them inline.
          reviews: Array.isArray(p.reviews) ? p.reviews.map((r) => ({
            text: r?.text?.text || r?.originalText?.text || '',
            rating: r?.rating ?? null,
            publishTime: r?.publishTime || r?.relativePublishTimeDescription || null
          })).filter((r) => r.text) : []
        };
      })
      .filter((v) => v.placeId && v.name);
    // v0.59.21 — global brand-throttle (cap=2 per brand). Same brand
    // with 3+ outlets crowded out dish-level variety in user
    // screenshots (Hong Lim Curry Puff x3, Gold Xiang x2, etc.).
    // Cap before downstream rank/narrate so the LLM gets variety to
    // pick from. Per Human Lead 2026-05-07.
    const throttled = throttleBrands(raw, 2);
    const droppedBrand = raw.length - throttled.length;
    diag('D711', 'Discover Places ok', true, { n: throttled.length, ms, droppedBrand });
    return throttled;
  } catch (err) {
    const ms = Date.now() - t0;
    diag('D712', 'Discover Places failed', false, { err: err.message?.slice(0, 200), ms });
    logger.error({ err: { message: err.message } }, 'pipeline discover failed');
    return [];
  }
}

// rankAndNarrate() — Claude picks top-N from real Places candidates and
// adds vibe/dishes/cost narration. The model NEVER invents venues —
// every output references a placeId that came in via the input list.
// Output drift (model picks fewer than asked, or returns invalid
// placeIds) falls back to a deterministic top-N by rating + walking
// distance, so a Claude failure never zeroes the result.
// v0.59.0: `lang` ('en' | 'fr') determines whether the model emits
// `vibe` / `dishes` / `signature_dish` in English or French. The
// iconic-SG-dish rule below tells the model to keep dish names like
// "laksa", "char kway teow", "kaya toast" in their original form even
// when narrating in French — that's how French-speaking SG residents
// refer to them.
async function rankAndNarrate({ candidates, query, snapshot, count = 5, lang, diag = noopDiag() }) {
  // v0.59.0: prefer top-level lang if caller passed one, else read
  // query.lang (pipeline-task.js threads payload.lang into the query),
  // else default to English.
  lang = (lang === 'fr' || query?.lang === 'fr') ? 'fr' : 'en';
  if (!candidates || !candidates.length) return [];
  if (!llm.isReady()) {
    diag('D722', 'LLM unavailable — falling back to rating-sorted top-N', false);
    return deterministicFallback(candidates, count);
  }
  diag('D720', 'RankAndNarrate start', true, { n_in: candidates.length, target: count });
  const t0 = Date.now();

  // v0.58.22: HIDDEN_GEMS_V2 mode. When pipeline-task.js runs the
  // /hidden flow, it passes `specialRequest: 'HIDDEN_GEMS_V2'` and
  // candidates already annotated with deterministic c1/c3/c4 flags +
  // nearest_mrt_walk_m. We use a different system prompt + Claude web
  // search to judge C2 (recent SG food blog / IG / news mentions) and
  // C5 (signature dish uniqueness) and re-rank.
  if (query?.specialRequest === 'HIDDEN_GEMS_V2') {
    return rankAsHiddenGems({ candidates, query, count, diag, t0 });
  }

  try {
    const candidateLines = candidates.map((c, i) => {
      const ratingStr = c.rating != null ? `${c.rating}★ (${c.userRatingCount ?? '?'} reviews)` : 'unrated';
      const priceStr = c.priceLevel != null ? `$`.repeat(Math.max(1, c.priceLevel)) : '?';
      const openStr = c.openNow === true ? 'open now' : c.openNow === false ? 'closed' : 'hours unknown';
      return `${i + 1}. [${c.placeId}] ${c.name} — ${c.area} — ${ratingStr} — ${priceStr} — ${openStr} — type:${c.primaryType}`;
    }).join('\n');

    const cuisineLine = (Array.isArray(query?.cuisines) && query.cuisines.length)
      ? `Cuisines requested: ${query.cuisines.join(', ')}.`
      : 'No cuisine restriction — pick a varied set.';
    const periodLine = `Meal period: ${query?.label || 'now'}${query?.detail ? ` (${query.detail})` : ''}.`;
    const specialLine = (query?.specialRequest && query.specialRequest.trim())
      ? `Distinctive user qualifier (HONOUR THIS): ${query.specialRequest.trim()}.`
      : '';
    const vaultBlock = (snapshot?.vault?.length)
      ? `Cached vault context for some of these venues (use only if placeId matches):\n${
          snapshot.vault.slice(0, 10).map((v) => {
            const summary = snapshot.summaries?.[v.placeId];
            return summary ? `  ${v.placeId} (${v.name}): ${summary.slice(0, 180)}` : '';
          }).filter(Boolean).join('\n')
        }`
      : '';

    const langBlock = lang === 'fr'
      ? '\nLOCALISATION: write all "vibe", "dishes", and "signature_dish" strings in FRENCH. Keep iconic Singapore dish names in their ORIGINAL form, untranslated (laksa, char kway teow, kopi-o, kaya toast, mee siam, satay, hokkien mee, popiah, rojak, prata, roti john, nasi lemak, otah, kueh, chendol, ice kachang, kway teow, char siew, teh tarik). Translate descriptive prose around them ("hawker stall réputé pour son laksa onctueux"). Numbers, prices, placeIds stay raw.\n'
      : '';
    const prompt = `You are Gia, a Singapore food concierge. Below are ${candidates.length} REAL venues from Google Places near the user. Your job is to pick the BEST ${count} for a solo diner and add narrative.

${periodLine}
${cuisineLine}
${specialLine}
${langBlock}
CANDIDATES (each line: index. [placeId] name — area — rating — price — open status — type):
${candidateLines}

${vaultBlock}

Return EXACTLY a JSON array of ${count} entries. Each entry must reference a placeId from the list above — DO NOT invent venues.

[
  {
    "placeId": "<exact placeId from input>",
    "vibe": "<one short phrase about why this suits a solo diner>",
    "signature_dish": "<one specific dish to order>",
    "dishes": ["<1-3 specific dish strings>"],
    "queue_min_estimate": <integer minutes>,
    "booking_required": <boolean>,
    "cost_estimate_sgd": { "low": <int>, "high": <int> }
  },
  ...
]

Selection criteria (in priority order):
1. Currently open (or opening soon) takes priority over closed.
2. Match cuisine intent if specified.
3. Prefer rating ≥ 4.0 with ≥ 30 reviews (signal of real quality, not just hype).
4. Avoid major fast-food chains (McDonald's, KFC, Subway, Burger King, Starbucks, Coffee Bean, Domino's).
5. Spread the picks — don't return 5 ramen places when the user asked for "Japanese".

Return ONLY the JSON array.`;

    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, json: true, jsonShape: 'array', maxTokens: 4096 }),
      { label: 'Pipeline-RankNarrate' }
    );
    const rawText = result.response.text();
    let parsed;
    try {
      parsed = JSON.parse(extractJsonArray(rawText));
    } catch (parseErr) {
      diag('D722', 'RankAndNarrate parse failed', false, { err: parseErr.message, head: rawText.slice(0, 200) });
      return deterministicFallback(candidates, count);
    }
    if (!Array.isArray(parsed)) {
      diag('D722', 'RankAndNarrate non-array', false, { type: typeof parsed });
      return deterministicFallback(candidates, count);
    }

    const byPlaceId = new Map(candidates.map((c) => [c.placeId, c]));
    const out = [];
    for (const r of parsed) {
      const base = byPlaceId.get(r.placeId);
      if (!base) continue; // Defensive — drop hallucinated placeIds
      out.push({
        ...base,
        vibe: typeof r.vibe === 'string' ? r.vibe : '',
        signatureDish: r.signature_dish || (Array.isArray(r.dishes) ? r.dishes[0] : '') || '',
        dishes: Array.isArray(r.dishes) ? r.dishes.slice(0, 3) : [],
        queueMinEstimate: Number.isFinite(Number(r.queue_min_estimate)) ? Math.round(Number(r.queue_min_estimate)) : null,
        bookingRequired: r.booking_required === true || r.booking_required === 'true',
        costEstimateSgd: r.cost_estimate_sgd && typeof r.cost_estimate_sgd === 'object'
          ? { low: Number(r.cost_estimate_sgd.low) || null, high: Number(r.cost_estimate_sgd.high) || null }
          : null,
        source: 'inverted-pipeline'
      });
      if (out.length >= count) break;
    }
    if (!out.length) {
      diag('D722', 'RankAndNarrate returned no valid placeIds', false);
      return deterministicFallback(candidates, count);
    }
    const ms = Date.now() - t0;
    diag('D721', 'RankAndNarrate ok', true, { n: out.length, ms });
    return out;
  } catch (err) {
    diag('D722', 'RankAndNarrate failed — falling back', false, err.message?.slice(0, 200));
    logger.error({ err: { message: err.message } }, 'pipeline rankAndNarrate failed');
    return deterministicFallback(candidates, count);
  }
}

// v0.58.22: HIDDEN_GEMS_V2 ranker. Server has already evaluated C1/C3/
// C4 deterministically and dropped chains via hidden-gems.passesHardFilter.
// Claude judges C2 SOCIAL_BUZZ (uses web search) + C5 UNIQUE_OFFERING
// (domain knowledge) and emits the top 5 with `criteria_met`,
// `why_a_gem`, `signature_pick`, `social_mentions[]`. The server-side
// criteria flags are surfaced to Claude as priors so it doesn't second-
// guess hard numbers.
async function rankAsHiddenGems({ candidates, query, count, diag, t0 }) {
  diag('D724', 'HIDDEN_GEMS_V2 ranking start', true, { n_in: candidates.length, target: count });
  const HIDDEN_GEMS_V2_SYSTEM = `You are a Singapore F&B discovery analyst for a Telegram bot. You receive a JSON payload of pre-filtered candidates each annotated with deterministic criteria flags { c1_new_highrated, c3_underreviewed, c4_off_transport } and a nearest_mrt_walk_m value.

Your job: for each candidate, judge the two remaining criteria using the candidate's name + reviews + your domain knowledge AND web search:
  C2 SOCIAL_BUZZ     - is the place covered in a Singapore food blog (sethlui, danielfooddiary, ladyironchef, misstamchiak, hungrygowhere), an IG / TikTok food account, or a Singapore news article in the LAST 100 DAYS? Cite the URL + snippet you find.
  C5 UNIQUE_OFFERING - signature dish or drink uncommon across Singapore's broader F&B scene (judge from the candidate's reviews + dishes you can find via search).

A place qualifies if it meets >= 2 of {C1, C2, C3, C4, C5}.

EXCLUDE: chains have already been filtered server-side. Do not re-add them.

OUTPUT: strict JSON, top ${count} ranked. No prose, no markdown fences.

{
  "anchor_time": "<ISO timestamp now>",
  "results": [
    {
      "placeId": "<exact placeId from input>",
      "criteria_met": ["C1","C3"],
      "confidence": "HIGH|MEDIUM|LOW",
      "why_a_gem": "<= 240 chars, one concrete signal cited from a review or your search",
      "signature_pick": "<single item to order>",
      "vibe": "<one-line solo-diner vibe>",
      "dishes": ["item 1", "item 2", "item 3"],
      "social_mentions": [
        { "url": "https://...", "date_iso": "2026-...", "snippet": "..." }
      ]
    }
  ],
  "fallback_note": "<string ONLY if fewer than 3 results qualify>"
}

STYLE: Singapore English, neutral, no exclamation marks, no emojis, no superlatives. why_a_gem MUST cite a concrete signal (review excerpt, blog URL, low review count, distance from MRT). Return JSON only.`;

  const userPayload = {
    user: { now_iso: new Date().toISOString() },
    candidates: candidates.map((c) => ({
      placeId: c.placeId,
      name: c.name,
      area: c.area || '',
      primaryType: c.primaryType,
      rating: c.rating ?? null,
      userRatingCount: c.userRatingCount ?? null,
      priceLevel: c.priceLevel ?? null,
      openNow: c.openNow ?? null,
      googleMapsUri: c.googleMapsUri || c.googleMapsLinks?.placeUri || null,
      c1_new_highrated: !!c.c1_new_highrated,
      c3_underreviewed: !!c.c3_underreviewed,
      c4_off_transport: !!c.c4_off_transport,
      nearest_mrt_walk_m: c.nearest_mrt_walk_m ?? null,
      review_excerpts: Array.isArray(c.reviews)
        ? c.reviews.slice(0, 3).map((r) => ({
            text: (r.text?.text || r.text || '').slice(0, 280),
            publishTime: r.publishTime || null
          })).filter((x) => x.text)
        : []
    }))
  };

  try {
    const result = await withRetry(
      () => llm.generate({
        system: HIDDEN_GEMS_V2_SYSTEM,
        prompt: JSON.stringify(userPayload),
        model: llm.SONNET_MODEL,
        json: true,
        jsonShape: 'object',
        maxTokens: 4000,
        webSearch: true
      }),
      { label: 'Pipeline-HiddenGemsV2' }
    );
    const rawText = result.response.text();
    let parsed;
    try {
      // Try array extractor first then object — the prompt says object,
      // but fence stripping behaviour is shared.
      const objMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(objMatch ? objMatch[0] : rawText);
    } catch (parseErr) {
      diag('D726', 'HIDDEN_GEMS_V2 parse failed', false, { err: parseErr.message, head: rawText.slice(0, 200) });
      return deterministicFallback(candidates, count);
    }
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    if (!results.length) {
      diag('D726', 'HIDDEN_GEMS_V2 returned no results', false, { fallback_note: parsed?.fallback_note });
      return deterministicFallback(candidates, count);
    }
    const byPlaceId = new Map(candidates.map((c) => [c.placeId, c]));
    const out = [];
    for (const r of results) {
      const base = byPlaceId.get(r.placeId);
      if (!base) continue;
      out.push({
        ...base,
        vibe: typeof r.vibe === 'string' ? r.vibe : '',
        signaturePick: typeof r.signature_pick === 'string' ? r.signature_pick : '',
        signatureDish: typeof r.signature_pick === 'string' ? r.signature_pick : (Array.isArray(r.dishes) ? r.dishes[0] : '') || '',
        dishes: Array.isArray(r.dishes) ? r.dishes.slice(0, 3) : [],
        criteriaMet: Array.isArray(r.criteria_met) ? r.criteria_met.filter((s) => /^C[1-5]$/.test(s)) : [],
        whyAGem: typeof r.why_a_gem === 'string' ? r.why_a_gem.slice(0, 240) : '',
        confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(r.confidence) ? r.confidence : 'MEDIUM',
        socialMentions: Array.isArray(r.social_mentions) ? r.social_mentions.slice(0, 3) : [],
        source: 'hidden-gems-v2'
      });
      if (out.length >= count) break;
    }
    if (!out.length) {
      diag('D726', 'HIDDEN_GEMS_V2 no valid placeIds', false);
      return deterministicFallback(candidates, count);
    }
    const ms = Date.now() - t0;
    diag('D725', 'HIDDEN_GEMS_V2 ok', true, { n: out.length, ms, fallback_note: parsed?.fallback_note });
    return out;
  } catch (err) {
    diag('D726', 'HIDDEN_GEMS_V2 failed — falling back', false, err.message?.slice(0, 200));
    logger.error({ err: { message: err.message } }, 'pipeline rankAsHiddenGems failed');
    return deterministicFallback(candidates, count);
  }
}

// Deterministic fallback when Claude fails or returns nothing usable.
// Sort by openNow first, then rating desc — guarantees /cuisine never
// returns an empty list when Places returned candidates.
function deterministicFallback(candidates, count) {
  const sorted = [...candidates].sort((a, b) => {
    const ao = a.openNow === false ? 1 : 0;
    const bo = b.openNow === false ? 1 : 0;
    if (ao !== bo) return ao - bo;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
  return sorted.slice(0, count).map((c) => ({
    ...c,
    vibe: '',
    signatureDish: '',
    dishes: [],
    queueMinEstimate: null,
    bookingRequired: false,
    costEstimateSgd: null,
    source: 'inverted-pipeline-fallback'
  }));
}

// ---------------------------------------------------------------------
// FETCH (per-cluster)
// ---------------------------------------------------------------------

// Group venues into 500 m-grid cells. Returns Map<cellKey, {center, venues:[]}>.
function clusterByGrid(venues, gridM = GRID_M) {
  // ~111_320 m per degree of latitude; longitude scales by cos(lat).
  const latDeg = gridM / 111320;
  const map = new Map();
  for (const v of venues) {
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
    const lonDeg = gridM / (111320 * Math.cos((v.lat * Math.PI) / 180));
    const cellLat = Math.floor(v.lat / latDeg);
    const cellLng = Math.floor(v.lng / lonDeg);
    const key = `${cellLat}:${cellLng}`;
    let cell = map.get(key);
    if (!cell) {
      cell = { key, venues: [], sumLat: 0, sumLng: 0 };
      map.set(key, cell);
    }
    cell.venues.push(v);
    cell.sumLat += v.lat;
    cell.sumLng += v.lng;
  }
  for (const cell of map.values()) {
    cell.center = { lat: cell.sumLat / cell.venues.length, lng: cell.sumLng / cell.venues.length };
  }
  return map;
}

async function fetchClusterContext(cell) {
  const { lat, lng } = cell.center;
  const t0 = Date.now();
  // v0.29.0: nearest MRT now joins the per-cluster context. The Refine
  // layer can then anchor travel advice to a real station ("3 min walk
  // from Raffles Place MRT") instead of generic "transit clear".
  const [w, traffic, parks, mrt] = await Promise.allSettled([
    weather.summary(lat, lng).catch(() => null),
    transport.fetchTrafficIncidents
      ? transport.fetchTrafficIncidents().catch(() => [])
      : Promise.resolve([]),
    carpark.nearest(lat, lng, 3).catch(() => []),
    transport.nearestMrtStations
      ? transport.nearestMrtStations(lat, lng, 1500, 2).catch(() => [])
      : Promise.resolve([])
  ]);
  // Filter traffic to this cluster's 1.5 km bubble using transport's
  // own helper if exposed; otherwise pass full list and let refine see.
  let trafficNear = [];
  if (traffic.status === 'fulfilled' && Array.isArray(traffic.value) && transport.nearestIncidents) {
    trafficNear = transport.nearestIncidents(traffic.value, lat, lng, 1500, 3);
  }
  const carparkList = parks.status === 'fulfilled' ? parks.value : [];
  return {
    cellKey: cell.key,
    center: cell.center,
    venueIds: cell.venues.map((v) => v.placeId),
    weather: w.status === 'fulfilled' ? w.value : null,
    trafficIncidents: trafficNear,
    carparks: carparkList,
    // v0.36.0: carpark-as-footfall A/B test. Compute crowdSignal per
    // cluster from the median availableLots of the nearest 3 carparks.
    // Always computed (cheap); surfaced in refine prompt only when
    // FOOTFALL_PROXY_ENABLED=on. See computeCrowdSignal() comment for
    // honesty about the cars-not-diners caveat.
    crowdSignal: computeCrowdSignal(carparkList),
    mrtStations: mrt.status === 'fulfilled' ? mrt.value : [],
    elapsedMs: Date.now() - t0
  };
}

// v0.36.0: hypothesis — packed carparks at lunch/dinner peak correlate
// with packed eateries next door. WEAK signal: walk-in lunch crowd at
// CBD hawker centres is overwhelmingly NOT car-based, so this proxy
// will systematically under-detect crowd at Maxwell / Lau Pa Sat /
// Amoy Street. The A/B test is whether the signal helps despite that
// bias for non-CBD venues (suburban malls, drive-to F&B at HDB heartland).
//
// Thresholds are absolute (NOT ratio) because LTA's CarParkAvailabilityv2
// API does not expose total capacity, only currently-available lots.
//
//   median lots (top 3) < 15  → 'high'   (carparks are full)
//   median lots (top 3) > 150 → 'low'    (lots of space)
//   else                      → 'medium' (no clear signal)
//
// Returns null when fewer than 2 carparks have data (signal too weak).
function computeCrowdSignal(carparks) {
  if (!Array.isArray(carparks) || carparks.length < 2) return null;
  const lots = carparks
    .map((c) => Number(c.availableLots))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (lots.length < 2) return null;
  const median = lots.length % 2
    ? lots[(lots.length - 1) / 2]
    : Math.round((lots[lots.length / 2 - 1] + lots[lots.length / 2]) / 2);
  let level;
  if (median < 15) level = 'high';
  else if (median > 150) level = 'low';
  else level = 'medium';
  return { level, medianLots: median, sampleSize: lots.length };
}

async function fetchContext(venues, diag = noopDiag()) {
  const clusters = clusterByGrid(venues);
  diag('D620', 'Cluster build', true, { n_venues: venues.length, n_clusters: clusters.size });
  const t0 = Date.now();
  diag('D621', 'Context fetch start', true, { n_clusters: clusters.size });
  const settled = await Promise.allSettled([...clusters.values()].map(fetchClusterContext));
  const results = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
  const failures = settled.length - results.length;
  if (failures) diag('D623', 'Context fetch had failures', false, { failures, total: settled.length });
  diag('D622', 'Context fetch done', true, { elapsed_ms: Date.now() - t0, n_clusters: results.length });
  // Index by venue placeId for refine convenience.
  const byVenue = new Map();
  for (const ctx of results) {
    for (const placeId of ctx.venueIds) byVenue.set(placeId, ctx);
  }
  return { clusters: results, byVenue };
}

// ---------------------------------------------------------------------
// REFINE
// ---------------------------------------------------------------------

function summariseClusterCtx(ctx) {
  const w = ctx.weather;
  const wLine = w ? `weather=${w.forecast || 'unknown'}${Number.isFinite(w.tempC) ? `, ${Math.round(w.tempC)}°C` : ''}${Number.isFinite(w.rainMm) ? `, rain ${w.rainMm}mm` : ''}` : 'weather=unknown';
  const tIncidents = (ctx.trafficIncidents || []).slice(0, 3)
    .map((t) => t.message || t.type || JSON.stringify(t).slice(0, 80))
    .join(' | ') || 'traffic clear';
  const parks = (ctx.carparks || []).slice(0, 2)
    .map((p) => `${p.name || 'cp'}: ${p.lots ?? '?'} lots`)
    .join(', ') || 'no nearby carpark data';
  // v0.29.0: nearest MRT joins the cluster summary so refine can anchor
  // travel advice on a real station instead of generic transit copy.
  const mrt = (ctx.mrtStations || []).slice(0, 2)
    .map((s) => s.name)
    .filter(Boolean)
    .join(', ') || 'no MRT in 1.5 km';
  // v0.36.0: surface crowdSignal in the refine prompt only when the
  // env A/B flag is on. When off, refine sees the cluster ctx exactly
  // as v0.35 (no behavioural change). Honest framing: tag the signal
  // as "carpark-proxy" so the model knows it's not direct foot traffic.
  let footfallLine = '';
  if (process.env.FOOTFALL_PROXY_ENABLED === 'on' && ctx.crowdSignal) {
    const cs = ctx.crowdSignal;
    footfallLine = ` [footfall (carpark proxy, n=${cs.sampleSize}, median=${cs.medianLots} lots): ${cs.level}]`;
  }
  return `[${wLine}] [traffic: ${tIncidents}] [foot-traffic proxy via carpark: ${parks}] [nearest MRT: ${mrt}]${footfallLine}`;
}

async function refine({ draft, context, query, diag = noopDiag() }) {
  if (!llm.isReady() || !draft.length) return draft;
  diag('D630', 'Refine call start');
  try {
    const lines = draft.map((v, i) => {
      const ctx = context.byVenue.get(v.placeId);
      const ctxStr = ctx ? summariseClusterCtx(ctx) : '[no cluster context]';
      return `${i + 1}. ${v.name} (${v.placeId}) — ${v.area} — current draft cost: ${v.costEstimateSgd ? `S$${v.costEstimateSgd.low}-${v.costEstimateSgd.high}` : 'unknown'}, queue est ${v.queueMinEstimate ?? '?'}min, dishes: ${(v.dishes || [v.signatureDish]).filter(Boolean).join(' / ')}\n   context: ${ctxStr}`;
    }).join('\n');

    const prompt = `You are Gia. Reconcile the draft picks below against real-time context per cluster. For each pick, return JSON with the SAME placeId order:

[
  {
    "placeId": "<unchanged>",
    "travel_advice": "one short sentence, factor in heavy rain (suggest sheltered route / indoor sanctuary) or heavy traffic (note delay); v0.36.0: when cluster context tag '[footfall (carpark proxy ...): high]' appears, mention 'lunch crowd peak — arrive 15 min early or go takeaway'. When 'low', mention 'quiet right now — easy to walk in'. The signal is a CARPARK proxy (cars-not-diners) so do NOT cite it as authoritative for CBD walk-in venues.",
    "queue_min_estimate": <int — adjust UP if traffic in cluster is heavy, carpark occupancy is high, OR footfall=high; keep otherwise>,
    "weather_flag": "<'heavy_rain' | 'rain' | 'clear' | 'unknown'>",
    "shelter_note": "<empty string OR one phrase recommending a sheltered alternative if heavy_rain>",
    "cost_estimate_sgd": { "low": <int>, "high": <int> }
  },
  ...
]

Draft picks (with cluster context):
${lines}

User period: ${query.label || 'now'}.

Return ONLY the JSON array, in the same order as the input.`;

    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, json: true, jsonShape: 'array', maxTokens: 4096 }),
      { label: 'Pipeline-Refine' }
    );
    const refined = JSON.parse(result.response.text());
    if (!Array.isArray(refined)) {
      diag('D632', 'Refine non-array', false);
      return draft;
    }
    const byId = new Map(refined.map((r) => [r.placeId, r]));
    const out = draft.map((v) => {
      const r = byId.get(v.placeId);
      if (!r) return v;
      return {
        ...v,
        travelAdvice: typeof r.travel_advice === 'string' ? r.travel_advice : '',
        queueMinEstimate: Number.isFinite(Number(r.queue_min_estimate))
          ? Math.round(Number(r.queue_min_estimate)) : v.queueMinEstimate,
        weatherFlag: typeof r.weather_flag === 'string' ? r.weather_flag : 'unknown',
        shelterNote: typeof r.shelter_note === 'string' ? r.shelter_note : '',
        costEstimateSgd: r.cost_estimate_sgd && typeof r.cost_estimate_sgd === 'object'
          ? {
              low: Number(r.cost_estimate_sgd.low) || v.costEstimateSgd?.low || null,
              high: Number(r.cost_estimate_sgd.high) || v.costEstimateSgd?.high || null
            }
          : v.costEstimateSgd
      };
    });
    diag('D631', 'Refine ok', true, { n: out.length });
    return out;
  } catch (err) {
    diag('D632', 'Refine gemini failed', false, err.message);
    logger.error({ err: { message: err.message } }, 'pipeline refine failed');
    return draft;
  }
}

// ---------------------------------------------------------------------
// ORCHESTRATOR
// ---------------------------------------------------------------------

function noopDiag() { return () => {}; }

function makeDiag() {
  const events = [];
  const fn = (code, label, ok = true, detail = null) => {
    events.push({ code, label, ok, detail, t: Date.now() });
    const tag = ok ? '✓' : '✗';
    logger.info({ code, label, ok, detail }, `[Cuisine-Diag] ${tag} ${code} ${label}`);
  };
  fn.events = events;
  return fn;
}

async function runPipeline({ redis, lat, lng, query, validatedVenues, count = 15 }) {
  const diag = makeDiag();
  // v0.59.21 — Dessert/Fusion cuisine entries piggy-back on the
  // specialRequest slot. Append the auto-generated prompt augmentation
  // (currently-open + variety + Michelin grounding) to whatever the
  // caller already passed.
  if (query && Array.isArray(query.cuisines) && query.cuisines.length) {
    const auto = specialRequestForCuisines(query.cuisines);
    if (auto) {
      query = { ...query, specialRequest: [query.specialRequest, auto].filter(Boolean).join(' ') };
    }
  }
  // Phase 1: Reason — vault snapshot first, then Gemini draft.
  const snapshot = await vaultIndex.snapshotForLocation(redis, { lat, lng }, query.radius || 1500);
  diag('D601', 'Vault snapshot', true, {
    n_vault: snapshot.vault.length,
    n_summaries: Object.keys(snapshot.summaries).length,
    n_reviews: Object.keys(snapshot.reviews).length
  });
  let draft = await reason({ lat, lng, query, snapshot, count, diag });
  // v0.30.5: if Reason returned 0 candidates with a strict query (cuisines
  // + recencyDays + specialRequest combined), retry once with the most
  // restrictive constraint dropped. Order of relaxation (least → most
  // valuable to keep): drop recencyDays first, then drop specialRequest.
  if (!draft.length && (query.recencyDays || query.specialRequest)) {
    diag('D613', 'Reason 0 candidates — retrying with relaxed query (drop recencyDays + specialRequest)', false);
    logger.warn({ code: 'D613' }, 'pipeline retry without recencyDays/specialRequest');
    const relaxed = { ...query, recencyDays: null, specialRequest: '' };
    draft = await reason({ lat, lng, query: relaxed, snapshot, count, diag });
    if (draft.length) diag('D614', 'Relaxed retry yielded candidates', true, { n: draft.length });
  }
  // Phase 2: callers may pass already-validated venues with placeId/lat/lng.
  // Refine works on whatever the caller has *after* validation; if no
  // validatedVenues passed, we just return the draft (no clusters, no refine).
  if (!validatedVenues || !validatedVenues.length) {
    diag('D640', 'Pipeline emit (draft only)', true, { n_final: draft.length });
    return { candidates: draft, refined: false, diag: diag.events };
  }
  // Phase 2 + 3: Fetch context per cluster and Refine.
  const context = await fetchContext(validatedVenues, diag);
  const refined = await refine({ draft: validatedVenues, context, query, diag });
  diag('D640', 'Pipeline emit', true, { n_final: refined.length });
  return { candidates: refined, refined: true, diag: diag.events };
}

module.exports = {
  reason,
  reasonExecute,
  discover,
  rankAndNarrate,
  fetchContext,
  refine,
  runPipeline,
  clusterByGrid,
  computeCrowdSignal,
  // v0.59.19 — exposed for unit tests of the Singaporean dish-rotation.
  SINGAPOREAN_DISHES,
  pickRandomSubset,
  expandSingaporeanCuisines,
  // Codex review #224 — used by index.js /api/cuisine/search to
  // decide whether to skip the 30-min Redis cache (each Singaporean
  // call must re-run discover() so dish picks rotate per call).
  containsSingaporeanCuisine,
  // v0.59.21 — exposed for unit tests of brand-throttle dedup +
  // Dessert/Fusion specialRequest injection.
  brandKey,
  throttleBrands,
  specialRequestForCuisines,
  // v0.59.21 (Codex #226 P2) — Dessert/Fusion Places query expansion.
  DESSERT_KEYWORDS,
  FUSION_KEYWORDS,
  expandDessertCuisines,
  expandFusionCuisines,
  // v0.59.24 — drinks filter (skip for Dessert/Fusion cuisines).
  DRINK_TERMS,
  isDrink,
  filterOutDrinks,
  shouldFilterDrinks
};
