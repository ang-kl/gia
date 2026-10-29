// gemini-client.js — v0.58.28
//
// Gemini-with-Google-Search wrapper for the /hidden Hidden-Gems
// flow. Per Human Lead's spec, the entire C1–C4 evaluation, source
// verification, distance check, and chain blacklist are handled by
// Gemini grounded with Google Search. We just forward a single
// prompt with a verified anchor + today's SGT date and stream the
// raw text response back to chat.
//
// Why a separate file (not extending llm-client.js): llm-client.js
// is Claude-only. Gemini's googleSearchRetrieval tool has no
// Anthropic equivalent — we want the spec's exact grounding
// mechanism, not an approximation. Keeps the Claude path
// unchanged for /cuisine + Tell-Gia.
//
// Env: GEMINI_API_KEY (required at call time, not at module load).

const HIDDEN_GEMS_PROMPT_TEMPLATE = [
  'You are a Singapore F&B discovery analyst.',
  '',
  'Use Google Search grounding to find hidden food/drink gems within a {{RADIUS_BAND}} walking band around the anchor location.',
  '',
  // v0.60.31 — radius is the HARDEST constraint. Production shows
  // Gemini routinely returns venues 5-7 km away (Coconut Club @ Beach
  // Road from a Telok Blangah anchor) when the band is "100m to 2km".
  // Lifting the rule out of the EXCLUDE list and stating it twice up
  // front so the model treats it as a precondition, not a soft filter.
  'HARD CONSTRAINT — DISTANCE:',
  '- Every venue you return MUST be within walking distance {{RADIUS_BAND}} of the anchor.',
  '- If the venue\'s Google Maps page shows it is more than {{RADIUS_UPPER}} from the anchor, do NOT return it. No exceptions, no padding the list with farther venues.',
  '- If fewer than 3 qualifying venues exist within the band, return fewer (or zero). Saying "I found nothing within {{RADIUS_BAND}}" is correct; returning a 6 km venue is wrong.',
  '',
  'ANCHOR_LOCATION:',
  '{{ANCHOR_NAME}}',
  'Google Maps URL: {{GOOGLE_MAPS_URL}}',
  '',
  'SEARCH WINDOW:',
  'Today = {{TODAY_SGT}}.',
  'Only consider places where the latest rating/review signal is at least 5 days old, so that very fresh unstable ratings are not over-weighted.',
  '',
  'A place qualifies if it meets AT LEAST TWO of the following AND at least one of the matched criteria is C1 (NEW_HIGHRATED) or C3 (UNDERREVIEWED). A place that only matches C2 + C4 is "popular and unique" — that is not hidden. Hidden means newly opened or low review count.',
  '',
  'C1 NEW_HIGHRATED',
  // v0.61.318 — operator: new = opened 3 months or less (was 4); rating floor 3.9 (was 4.0).
  '- Opened in the last 3 months.',
  '- Google rating >= 3.9.',
  '- If you claim a place opened recently, it must have NO Google reviews older than ~3 months. A review can only be posted after a place opens, so an older review means it is not newly opened — do not count C1 for it.',
  '- If Google rating is not verifiable, write "Google rating: unverified" and do not count C1.',
  '',
  'C2 SOCIAL_BUZZ',
  '- Covered in a Singapore food blog, Instagram post, TikTok post, or news article in the last 3 months.',
  '- At least one source must be a non-aggregator source, such as Eatbook, HungryGoWhere, SethLui, DanielFoodDiary, Time Out Singapore, 8days, CNA Lifestyle, The Ranting Panda, Honeycombers, Rubbish Eat Rubbish Grow, or the establishment\'s own Instagram post.',
  '- Avoid relying only on generic listicle round-ups.',
  '',
  'C3 UNDERREVIEWED',
  // v0.61.318 — rating floor 3.9 (was 4.0).
  '- Google rating >= 3.9.',
  '- Fewer than 120 Google reviews.',
  '- If Google review count is not verifiable, write "review count: unverified" and do not count C3.',
  '',
  'C4 UNIQUE_OFFERING',
  '- Signature dish/drink is uncommon across Singapore\'s wider F&B scene.',
  '- This must be specific, not generic.',
  '- Examples: stone-milled matcha, Filipino ensaymada bakery-cafe, Japanese salted-kelp pasta, Sarawak-style kolo mee cafe, coconut-specialty dessert cafe.',
  '',
  // v0.58.32: reverted to the user's working spec verbatim. The
  // expanded hawker / clubhouse / mall list (v0.58.31) was reported
  // as "too tight" — restoring the original "Shopping mall food court
  // chains" line. Specific complex names + stall carve-outs are now
  // handled deterministically (server-side) where the cuisine flows
  // share a venue-filters.js module; /hidden relies on Gemini's
  // judgment plus the broader chain blacklist.
  'EXCLUDE:',
  '- National chains:',
  '  Toast Box, Ya Kun, Killiney, Starbucks, Coffee Bean, KOI, LiHO, Mr Bean,',
  '  Old Chang Kee, Each-a-Cup, Subway, McDonald\'s, KFC, Burger King,',
  '  Crystal Jade, Texas Chicken, Boost.',
  '- Hotel restaurants.',
  '- Shopping mall food court chains.',
  '- Permanently closed venues. Before including a place, verify via Google Search / Google Maps that it is currently OPERATIONAL. If the venue page or any recent post (Instagram, blog, news) says "Permanently closed", "Closed permanently", "Now closed", "Has shut", "Has shuttered", "Final day", or similar, EXCLUDE it. Temporarily closed venues are also out unless reopening is confirmed in the last 30 days.',
  '- Places with fewer than 8 Google reviews unless C2 fires with at least 2 independent recent mentions.',
  '- Places with more than 300 Google reviews UNLESS C1 fires (newly opened in the last 3 months). 300+ reviews means the venue is already widely known — not hidden — regardless of buzz or unique offering.',
  '- Anything rated below 3.9.',
  '- Places below {{RADIUS_LOWER}} walking distance from the anchor.',
  '- Places above {{RADIUS_UPPER}} walking distance from the anchor.',
  '- Places where all rating, review count, opening date, and social buzz signals are unverifiable.',
  '',
  'PRIORITISE:',
  'Independent cafes, restaurants, bakeries, dessert shops, hawker stalls, bars, coffee roasters, and specialty kiosks.',
  '',
  'RANKING:',
  // v0.59.53: bumped max 5 → 8 per Human Lead 2026-05-07. /hidden
  // and /hidden <street> were both surfacing 1-2 venues at peak —
  // user reported "lack of choices" and screenshots showed The
  // Coconut Club appearing as the #1 result for two different
  // anchors with hallucinated address variations (269 Beach Road
  // vs 23 Beach Road). Bigger ceiling + explicit variety instruction
  // gives Gemini room to surface a diverse set across categories.
  // v0.60.35 (Human Lead 2026-05-08): hard-cap at 5 (was "up to 8 / aim
  // for 5"). Reduces Gemini output tokens AND verifier surface (5
  // Places lookups instead of 8). The Coconut-Club hallucination is
  // already solved at the verifier layer (v0.60.31 prose pre-filter +
  // v0.60.33 haversine drop), so the v0.59.53 ceiling-bump rationale
  // ("more rope to surface a diverse set") is no longer needed.
  'Return EXACTLY 5 results. If fewer than 5 venues qualify within the band, return only those that qualify — do NOT pad with farther venues. 5 is a hard cap, not a target to overshoot.',
  'Diversify across cuisines and venue types — do not return 5+ venues of the same dish category (e.g. avoid 5 brunch cafes in a row). Mix bakeries, hawker stalls, dessert kiosks, coffee roasters, bars, and ethnic restaurants when each category has a qualifying candidate.',
  'Rank by score, with C2 SOCIAL_BUZZ and C4 UNIQUE_OFFERING carrying the most weight.',
  'Prefer:',
  '1. Strong recent non-listicle coverage.',
  '2. Clearly distinctive signature item.',
  '3. Independent or less obvious operator.',
  '4. Verified Google rating and review count.',
  '5. Walking distance comfortably within {{RADIUS_BAND}}.',
  '',
  'OUTPUT FORMAT:',
  'For each result, use this exact structure:',
  '',
  '1. NAME - primary type',
  'Address - approx walking distance and direction from anchor.',
  '🕒 Opening hours - if verifiable, otherwise write "unverified".',
  // v0.59.24: rating without review count (counts were inaccurate per
  // Human Lead 2026-05-07). 🌟 emoji prefix added.
  '🌟 Google rating · rating only (no review count). If unverifiable, write "unverified".',
  // v0.59.24: 📝 prefix + middot + short-date format requirement.
  '📝 Latest rating/review · short date in DD MMM YYYY (e.g. "12 Jan 2026"). If unverifiable, write "unverified".',
  '💎 Why a gem · one concrete sentence citing a specific signal, such as review pattern, blog detail, dish detail, opening signal, or social-buzz signal.',
  // v0.59.24: rename "Order this" → "Try"; drinks BANNED; 5/3 dishes
  // based on Google review distinct-dish count.
  '🍲 Try · top FOOD dishes only — never drinks. If Google reviews mention 4+ distinct dishes, list 5; otherwise list 3. Comma-separated. EXCLUDE all drinks: kopi, teh, teh tarik, milo, bandung, coffee, latte, cappuccino, espresso, mocha, americano, flat white, cold brew, iced tea, bubble tea, boba, milk tea, smoothies, juices, lemonade, soda, beer, wine, cocktails, whisky, sake, soju, mojito, margarita, etc.',
  '📍 <raw full Google Maps URL — emoji prefix only, no "Google Map URL:" label>.',
  // v0.58.37: removed Criteria-met / Confidence / Sources lines per
  // Human Lead. The criteria gate is still enforced internally — you
  // must judge each candidate against C1-C4 silently and only output
  // places that pass — but the user-facing block stays compact.
  // Sources are evaluated for the C2 / verification rules below but
  // not printed.
  'IMPORTANT OUTPUT RULES:',
  '- Use raw full URLs in the Google Map URL line. No hidden markdown links.',
  '- For the Google Map URL, use ONLY the search format with the venue name as the query: https://www.google.com/maps/search/?api=1&query=<URL-encoded venue name>+Singapore. Never construct place-detail URLs (https://www.google.com/maps/place/.../data=...) — you cannot verify the underlying Place ID or lat/lng, and fabricated Place IDs / coordinates direct users to wrong locations.',
  '- In "Why a gem" do NOT mention which criteria (C1/C2/C3/C4) the place meets. State the actual evidence in plain prose only — e.g. "rated 4.6 over 87 reviews, opened in March 2026, Eatbook coverage in February" — without the letters Cx. The criteria gate is internal.',
  '- Even though sources are not printed, you MUST verify each candidate against at least one non-aggregator source (Eatbook, HungryGoWhere, SethLui, DanielFoodDiary, Time Out Singapore, 8days, CNA Lifestyle, The Ranting Panda, Honeycombers, Rubbish Eat Rubbish Grow, or the establishment\'s own Instagram). If you cannot verify, do not include the place.',
  '- Do not fabricate ratings, addresses, opening dates, review counts, opening hours, Google Map links, or source links.',
  // v0.60.29 — production logs show Gemini routinely re-anchors a real
  // venue's address to the user's neighbourhood (e.g. THE BETTER HALF,
  // genuinely at 1 Everton Park, was rendered as "1 Bukit Merah Lane 1
  // 01-08" because the user anchored on Bukit Merah). The verifier
  // catches the mismatch but the venue still gets dropped.
  '- The address must be copied verbatim from the venue\'s authoritative Google Maps listing — same street name, same block / unit, same postal code. Do NOT invent or paraphrase an address to fit the anchor neighbourhood. If the venue\'s true address is not within the {{RADIUS_BAND}} band you set above, simply do not include the venue.',
  '- If a number is unverifiable, write "unverified".',
  '- If the place only meets one criterion, or its only matched criteria are C2 + C4 (no C1 and no C3), exclude it — that is not hidden.',
  '- If fewer than 3 places qualify, say so plainly and list what was filtered out and why.',
  '- Never use vague phrases like "great vibes", "must try", "popular spot", or "worth checking out".',
  '- Use Singapore English.',
  '- Keep the tone neutral.',
  '- No exclamation marks.',
  '- No decorative emojis. Use exactly the six functional icons in the OUTPUT FORMAT (🕒 🌟 📝 💎 🍴 📍) and no others — no flag, no food emoji, no thumbs-up, etc.',
  '- No marketing language.',
  '- Plain text only. Do not use Markdown formatting — no double-asterisk bold (**...**), no underscores for italics, no headings (#), no backticks. The Telegram client renders these as literal characters.'
].join('\n');

// v0.59.4: parallel French localisation block. Appended to the EN
// template when lang='fr'. Approach mirrors v0.59.0's pipeline.rankAndNarrate
// — keep the EN spec verbatim (so parsers + criteria gate behave
// identically) and instruct Gemini to translate the human-readable prose
// to French while preserving:
//   - URLs verbatim (Google Map URL line)
//   - Iconic SG dish names (laksa, char kway teow, kopi-o, etc.) which
//     French-speaking SG residents refer to in their original form
//   - Numerals (ratings, review counts, dates)
// Fixed labels DO get translated (Address → Adresse, 🕒 Opening hours →
// 🕒 Horaires, etc.).
const HIDDEN_GEMS_LOCALISATION_FR = [
  '',
  'LOCALISATION:',
  'Render the entire user-facing output in French, with these rules:',
  // v0.59.24: labels updated to match the new EN OUTPUT FORMAT
  // (rating-only, 📝 prefix, middot separators, "🍴 Essayez").
  '- Translate the fixed labels: "Address" → "Adresse", "🕒 Opening hours" → "🕒 Horaires", "🌟 Google rating ·" → "🌟 Note Google ·", "📝 Latest rating/review ·" → "📝 Dernier avis ·", "💎 Why a gem ·" → "💎 Pourquoi un trésor ·", "🍲 Try ·" → "🍲 Essayez ·". For the Google Map URL line, keep the 📍 emoji prefix and the raw URL only — no label.',
  '- Keep iconic Singapore dish names in their original form (laksa, char kway teow, kopi-o, kaya toast, mee siam, satay, hokkien mee, popiah, rojak, prata, roti john, nasi lemak, otah, kueh, chendol, ice kachang, kway teow, char siew, teh tarik). Translate the surrounding prose (e.g. "stall réputée pour son laksa onctueux").',
  '- Keep proper nouns (venue names, neighbourhoods, MRT stations) untranslated.',
  '- Keep URLs verbatim — do not translate or modify the Google Maps URL.',
  '- Use a comma as decimal separator in numbers ("4,6" not "4.6") and "km" with a space ("1,2 km") per French conventions.',
  '- Use French connectors and structure (au sud-ouest de, à proximité de, ouvert en mars 2026).',
  '- The "place qualifies if…" criteria gate, EXCLUDE list, RANKING, and OUTPUT FORMAT instructions stay in English internally — they are for your reasoning, not for the user. Only the final output text (one block per result) is in French.'
].join('\n');

// v0.62.839 — the same block for the other six locales, built from the language
// name rather than written out six more times. The FR constant above stays the
// reference implementation; this asks the model to reach the same result. The
// French decimal-comma rule generalises to "the target language's own conventions",
// because it was never a French rule — it is a don't-use-English-conventions rule
// that only French had been given.
function hiddenGemsLocalisationFor(lang) {
  const name = langName(lang);
  return [
    '',
    'LOCALISATION:',
    `Render the entire user-facing output in ${name}, with these rules:`,
    '- Translate the fixed labels: "Address", "🕒 Opening hours", "🌟 Google rating ·", "📝 Latest rating/review ·", "💎 Why a gem ·", "🍲 Try ·". For the Google Map URL line, keep the 📍 emoji prefix and the raw URL only — no label.',
    `- Keep iconic Singapore dish names in their original form (${ICONIC_SG_DISHES}). Translate the surrounding prose.`,
    '- Keep proper nouns (venue names, neighbourhoods, MRT stations) untranslated.',
    '- Keep URLs verbatim — do not translate or modify the Google Maps URL.',
    `- Use ${name}'s own number, date and punctuation conventions.`,
    `- The "place qualifies if…" criteria gate, EXCLUDE list, RANKING, and OUTPUT FORMAT instructions stay in English internally — they are for your reasoning, not for the user. Only the final output text (one block per result) is in ${name}.`,
  ].join('\n');
}

// v0.59.31 — radiusBand opt. Default '100m to 2km' (per Human Lead
// 2026-05-08 — was '1km to 3km' in v0.59.31). Free-text /hidden mode
// can pass a wider band ('200m to 3km') for user-specified anchor.
// runSurpriseCommand retries with '1.5km to 3km' when the tight band
// yields fewer than 5 verified survivors.
function buildHiddenGemsPrompt({ anchorName, googleMapsUrl, todayIsoSGT, lang = 'en', radiusBand = '100m to 2km', radiusLower = '100m', radiusUpper = '2km' }) {
  if (!anchorName || !googleMapsUrl || !todayIsoSGT) {
    throw new Error('buildHiddenGemsPrompt: anchorName, googleMapsUrl, todayIsoSGT all required');
  }
  const base = HIDDEN_GEMS_PROMPT_TEMPLATE
    .replace('{{ANCHOR_NAME}}', anchorName)
    .replace('{{GOOGLE_MAPS_URL}}', googleMapsUrl)
    .replace('{{TODAY_SGT}}', todayIsoSGT)
    .replace(/\{\{RADIUS_BAND\}\}/g, radiusBand)
    .replace(/\{\{RADIUS_LOWER\}\}/g, radiusLower)
    .replace(/\{\{RADIUS_UPPER\}\}/g, radiusUpper);
  // v0.62.839 — French keeps its HAND-TUNED block above; every other locale gets a
  // generic one. Not uniformity for its own sake: the French block specifies exact
  // label wordings ("Address" → "Adresse") and French typographic rules. Folding
  // French into the generic version to tidy the code would REGRESS a locale that
  // works today in order to fix six that do not.
  if (lang === 'fr') return `${base}\n${HIDDEN_GEMS_LOCALISATION_FR}`;
  if (!needsLocalisation(lang)) return base;
  return `${base}\n${hiddenGemsLocalisationFor(lang)}`;
}

// Today's date in SGT (UTC+8) as ISO YYYY-MM-DD. Used in the
// "Today = ..." line of the prompt so Gemini's "last 4 months" /
// "last 3 months" / "5 days old" windows are anchored.
function todaySGT() {
  const sgtOffsetMs = 8 * 60 * 60 * 1000;
  const sgtNow = new Date(Date.now() + sgtOffsetMs);
  return sgtNow.toISOString().slice(0, 10);
}

// Default model. v0.58.35: switched 'gemini-1.5-pro' → 'gemini-2.5-flash'.
// Google retired Gemini 1.x from the public v1beta API in 2025 — calling
// gemini-1.5-pro now returns 404 NOT_FOUND. gemini-2.5-flash is the
// current-generation low-latency model that the legacy SDK 0.24.1 can
// still reach. GEMINI_MODEL env var still overrides.
//
// v0.62.710 — operator: "should follow env.var". Until this version only
// generateGroundedHiddenGems (/hidden) actually read DEFAULT_MODEL;
// validateAuthenticity, classifySearchIntent, describeCookingMethod, and
// extractDishesFromReviews each had their own hardcoded
// model = 'gemini-flash-latest' default, silently ignoring GEMINI_MODEL.
// All four now default to DEFAULT_MODEL, so a GEMINI_MODEL override
// applies to every Gemini call in this file, not just one. Each
// function's own fallback chain (SEARCH_INTENT_MODEL_CHAIN / FALLBACK_CHAIN)
// is a deliberate list of concrete models to retry if the primary fails —
// those stay hardcoded on purpose; only the PRIMARY choice follows the env var.
//
// v0.62.722 — the concrete names moved to gemini-models.js. Google retired the
// whole 2.5 line ("no longer available to new users", 404) and named the
// replacements in its own error body; eleven files carried the dead names.
const { replyLanguageLine, proseLanguageLine, needsLocalisation, ICONIC_SG_DISHES } = require('./prompt-locale');
const { langName } = require('./translate-review');
const GEMINI_MODELS = require('./gemini-models');
const DEFAULT_MODEL = GEMINI_MODELS.defaultModel();

// v0.58.33 / v0.58.42: Gemini renamed the search-grounding tool
// between major versions. 1.x uses `googleSearchRetrieval`; 2.x+
// (including the `*-latest` aliases that route to current-gen)
// uses `googleSearch`. Picking the wrong name for the model
// produces an immediate 400.
function searchToolForModel(model) {
  const m = String(model || '');
  // v0.58.42: `gemini-flash-latest` / `gemini-pro-latest` are aliases
  // for the current-gen flagship — always 2.x+ in practice. The old
  // regex missed them because there's no major-version digit.
  if (/-latest\b/i.test(m)) return { googleSearch: {} };
  // Match "gemini-N…" where N >= 2.
  if (/^gemini-([2-9]|\d{2,})/i.test(m)) {
    return { googleSearch: {} };
  }
  return { googleSearchRetrieval: {} };
}

// v0.58.35 / v0.58.42 / v0.58.44: known-good fallback chain. Walked
// when the user-supplied model fails. v0.58.44 swapped gemini-2.5-pro
// (TTFT 60-120s for grounded queries — too slow under load) for
// gemini-2.5-flash-lite (TTFT ~0.46s, GA, supports grounding). Now
// every fallback model is in the flash family; no slow stragglers.
// v0.62.722 — names now come from gemini-models.js. The SHAPE is unchanged:
// still three entries, still all flash-family, still ordered cheapest-safe-last.
const FALLBACK_CHAIN = GEMINI_MODELS.MODEL_CHAIN.map(
  (model) => ({ model, tool: { googleSearch: {} } })
);

async function generateGroundedHiddenGems({
  anchor,
  todayIsoSGT,
  model = DEFAULT_MODEL,
  lang = 'en',
  // v0.59.31 — radius-band overrides for free-text /hidden mode.
  radiusBand,
  radiusLower,
  radiusUpper,
  // v0.62.71x — optional Redis client for api-cost.js spend tracking.
  // Undefined is safe (recordGeminiUsage no-ops without a client).
  redis,
  // Test seam — pass a mock factory to avoid real SDK calls.
  _genAIFactory
}) {
  if (!anchor?.name || !anchor?.googleMapsUrl) {
    throw new Error('generateGroundedHiddenGems: anchor.name + anchor.googleMapsUrl required');
  }
  if (!todayIsoSGT) throw new Error('generateGroundedHiddenGems: todayIsoSGT required');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) {
    throw new Error('GEMINI_API_KEY unset');
  }
  const prompt = buildHiddenGemsPrompt({
    anchorName: anchor.name,
    googleMapsUrl: anchor.googleMapsUrl,
    todayIsoSGT,
    lang,
    ...(radiusBand ? { radiusBand } : {}),
    ...(radiusLower ? { radiusLower } : {}),
    ...(radiusUpper ? { radiusUpper } : {})
  });
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  const genAI = factory();

  // v0.58.34/v0.58.35: multi-step fallback chain so /hidden keeps
  // working even when the user picks a model Google retired or that
  // the legacy SDK 0.24.1 doesn't recognise.
  //
  //   1. user's model       + tool detected by version regex
  //   2. user's model       + opposite tool (per-model quirks)
  //   3. gemini-2.5-flash   + googleSearch          (current-gen, low-latency)
  //   4. gemini-flash-latest + googleSearch         (alias — auto-routes)
  //
  // (gemini-2.0-flash was permanently retired by Google in May 2026
  // — removed from the chain in v0.60.1.)
  //
  // attempts[].degraded === true means we fell back from the user's
  // requested model — caller can surface a "fallback model used"
  // hint to the user.
  const primaryTool = searchToolForModel(model);
  const oppositeTool = primaryTool.googleSearch ? { googleSearchRetrieval: {} } : { googleSearch: {} };
  const attempts = [
    { model, tool: primaryTool, degraded: false },
    { model, tool: oppositeTool, degraded: false },
    ...FALLBACK_CHAIN.map((f) => ({ model: f.model, tool: f.tool, degraded: true }))
  ];
  // De-duplicate: if user's model is already in the fallback chain
  // and uses the matching tool, skip the redundant later attempt.
  const dedupedAttempts = [];
  const seen = new Set();
  for (const a of attempts) {
    const key = `${a.model}|${Object.keys(a.tool)[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedAttempts.push(a);
  }

  // v0.58.42 / v0.58.43: invoke generateContent once with a hard
  // per-attempt deadline. Wraps generateContent in Promise.race so
  // a hung model (e.g. gemini-2.5-pro under load) doesn't burn the
  // entire overall timeout — we cut after PER_ATTEMPT_MS and move
  // to the next fallback. The wrapped function is still called
  // twice when the first invocation is a transient 503.
  const PER_ATTEMPT_MS = 60_000;
  // v0.58.44: latency hardening per researched best practice.
  //   • thinkingConfig.thinkingBudget=0 disables Gemini 2.5's thinking
  //     phase (default is dynamic, which adds many seconds before any
  //     output token). Per Google's 2.5 Flash dev guide: setting it to
  //     0 keeps the lowest cost & latency while still beating 2.0
  //     Flash quality. This was the dominant cause of the user's
  //     "AI Studio is 10s but our API is 30-90s" gap.
  //   • temperature 0.3 + topP 0.8 → tighter convergence than the
  //     defaults (1.0 / 0.95). Saves a few seconds on output gen.
  //   • maxOutputTokens 3072 → enough headroom for 5 picks × ~500
  //     tokens each. Default 8192 lets the model overgenerate.
  //   The legacy SDK accepts both at getGenerativeModel({ … }) time.
  const GENERATION_CONFIG = {
    temperature: 0.3,
    topP: 0.8,
    maxOutputTokens: 3072,
    thinkingConfig: { thinkingBudget: 0 }
  };
  async function tryOnce(attempt) {
    const m = genAI.getGenerativeModel({
      model: attempt.model,
      tools: [attempt.tool],
      generationConfig: GENERATION_CONFIG
    });
    const text = await Promise.race([
      (async () => {
        const r = await m.generateContent(prompt);
        // v0.62.71x — record spend regardless of what happens next (an
        // empty-response throw below still consumed the API call).
        require('./api-cost').recordGeminiUsage(redis, attempt.model, r?.response?.usageMetadata);
        const t = (r.response && typeof r.response.text === 'function') ? r.response.text() : '';
        if (!t || !t.trim()) throw new Error('empty response from Gemini');
        return t;
      })(),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error(`per-attempt timeout ${PER_ATTEMPT_MS / 1000}s`)),
        PER_ATTEMPT_MS
      ))
    ]);
    return text;
  }

  const errors = [];
  for (const [i, attempt] of dedupedAttempts.entries()) {
    const toolName = Object.keys(attempt.tool)[0];
    try {
      let text;
      try {
        text = await tryOnce(attempt);
      } catch (err) {
        // v0.58.42: 503 "high demand" is transient upstream weather.
        // Wait 2s and retry the SAME model+tool once before marching
        // to the next fallback. Without this, a single Google overload
        // burns through the whole chain in seconds.
        const msg = String(err?.message || '');
        const transient = /\b503\b|high demand|service unavailable/i.test(msg);
        if (transient) {
          console.warn(`[gemini-client] 503 transient on ${attempt.model}; retrying after 2s`);
          await new Promise((r) => setTimeout(r, 2_000));
          text = await tryOnce(attempt);
        } else {
          throw err;
        }
      }
      if (attempt.degraded) {
        console.warn(
          `[gemini-client] degraded — fell back to ${attempt.model} after user model "${model}" failed`
        );
      }
      return {
        text,
        prompt,
        model: attempt.model,
        tool: toolName,
        degraded: attempt.degraded,
        requestedModel: model,
        attemptErrors: errors
      };
    } catch (err) {
      // Surface the real error in Railway logs — bad model name (404),
      // unsupported tool (400 INVALID_ARGUMENT), API key (401), quota (429).
      const status = err?.status || err?.errorDetails?.[0]?.['@type'] || '';
      const detail = err?.errorDetails ? JSON.stringify(err.errorDetails).slice(0, 400) : '';
      const summary = `model=${attempt.model} tool=${toolName} status=${status} msg=${err.message}`;
      errors.push(summary);
      console.warn(
        `[gemini-client] attempt ${i + 1}/${dedupedAttempts.length} failed ${summary}` +
        `${detail ? ` detail=${detail}` : ''}`
      );
    }
  }
  // All attempts failed. Build a rich error so the bot can surface
  // the actual cause to the user (instead of swallowing it behind
  // a generic classifier).
  const aggregate = new Error(
    `gemini-client: all ${dedupedAttempts.length} attempts failed. ` +
    errors.join(' | ')
  );
  aggregate.attemptErrors = errors;
  aggregate.requestedModel = model;
  throw aggregate;
}

// v0.60.10 — Claude fallback for /hidden when Gemini returns nothing
// usable (every venue closed, or post-verify haversine kills all picks).
// Mirrors generateGroundedHiddenGems shape: same prompt template, same
// {text, model} return value, so verifyHiddenGemsOutput parses it
// identically. Uses Anthropic web_search server-side tool (already wired
// in llm-client.js v0.48.0) to ground on live Singapore venue listings.
//
// Triggered explicitly by runSurpriseCommand only — this does NOT replace
// Gemini as the primary path. Adds ~$0.03 / call when it fires.
async function generateGroundedHiddenGemsClaude({
  anchor,
  todayIsoSGT,
  lang = 'en',
  radiusBand,
  radiusLower,
  radiusUpper
}) {
  if (!anchor?.name || !anchor?.googleMapsUrl) {
    throw new Error('generateGroundedHiddenGemsClaude: anchor.name + anchor.googleMapsUrl required');
  }
  if (!todayIsoSGT) throw new Error('generateGroundedHiddenGemsClaude: todayIsoSGT required');
  const llm = require('./llm-client');
  if (!llm.isReady()) throw new Error('ANTHROPIC_API_KEY unset');
  const prompt = buildHiddenGemsPrompt({
    anchorName: anchor.name,
    googleMapsUrl: anchor.googleMapsUrl,
    todayIsoSGT,
    lang,
    ...(radiusBand ? { radiusBand } : {}),
    ...(radiusLower ? { radiusLower } : {}),
    ...(radiusUpper ? { radiusUpper } : {})
  });
  const result = await llm.generate({
    prompt,
    webSearch: true,
    maxTokens: 4096
  });
  const text = result.response.text();
  return {
    text,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    requestedModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    degraded: false
  };
}

// v0.59.54: /search command — multi-turn intent disambiguator.
// Caller passes the user's latest free-text + the recent history, gets
// back a structured intent (dish/ingredient/tool/ambiguous) + either a
// clarifying question (when ambiguous) or a Places-shaped textQuery +
// canonical cuisine + a one-sentence "why this matters".
//
// No grounded search needed for this — it's pure classification + a
// small reasoning step. Fast model, no tool wiring.
//
// v0.59.56: per-bug 2026-05-07 — "Goulash with dumplings" and
// "Beef bourguignon" both fell through to the catch path. Two
// failure modes confirmed:
//   1. Gemini's RECITATION finishReason fires for some well-known
//      dish names (the model thinks the answer would copy training
//      data verbatim). `response.text()` then throws.
//   2. The legacy SDK doesn't recognise `gemini-2.5-flash` in some
//      regions, returning a 400.
// Fix: model-fallback chain (gemini-flash-latest → 2.0-flash →
// 2.5-flash-lite) + a small built-in dish dictionary for the common
// European dishes that get blocked + NEVER throw — always return a
// valid intent object.

// Common dishes that Gemini's recitation filter sometimes blocks.
// Used as a final deterministic fallback when every model errors out.
// Keys are lowercased; match is "phrase contained in user text".
const DISH_FALLBACK = [
  // French
  { match: ['beef bourguignon', 'boeuf bourguignon', 'bourguignon'], cuisine: 'French', why: 'Beef bourguignon is a Burgundian beef stew braised in red wine.' },
  { match: ['coq au vin'], cuisine: 'French', why: 'Coq au vin is chicken braised in wine, a classic French peasant dish.' },
  { match: ['cassoulet'], cuisine: 'French', why: 'Cassoulet is a slow-cooked Languedoc bean and meat casserole.' },
  { match: ['ratatouille'], cuisine: 'French', why: 'Ratatouille is a Provençal stewed-vegetable dish.' },
  { match: ['bouillabaisse'], cuisine: 'French', why: 'Bouillabaisse is a Marseille fish stew.' },
  { match: ['steak frites', 'steak-frites'], cuisine: 'French', why: 'Steak frites is the French bistro staple of seared steak with chips.' },
  // v0.59.58: 'duck confit' first so match[0] produces the English
  // searchTerm preferred by SG Google Places ranking.
  { match: ['duck confit', 'confit de canard'], cuisine: 'French', why: 'Duck confit is duck legs slow-cooked in their own fat.' },
  { match: ['quiche lorraine'], cuisine: 'French', why: 'Quiche Lorraine is a savoury custard tart with bacon and cream.' },
  { match: ['crepe', 'crêpe', 'galette'], cuisine: 'French', why: 'Crêpes are thin French pancakes; galettes are buckwheat-based and savoury.' },
  // Hungarian/European
  { match: ['goulash', 'gulyás'], cuisine: 'European', why: 'Goulash is a Hungarian beef paprika stew, often served with dumplings or noodles.' },
  // Italian
  { match: ['carbonara'], cuisine: 'Italian', why: 'Carbonara is a Roman pasta with egg, guanciale, pecorino, and pepper.' },
  { match: ['cacio e pepe'], cuisine: 'Italian', why: 'Cacio e pepe is a Roman pasta of pecorino and pepper.' },
  { match: ['osso buco', 'ossobuco'], cuisine: 'Italian', why: 'Osso buco is a Milanese braised veal shank.' },
  { match: ['risotto'], cuisine: 'Italian', why: 'Risotto is a creamy short-grain Italian rice dish.' },
  { match: ['lasagna', 'lasagne'], cuisine: 'Italian', why: 'Lasagna is a layered baked pasta.' },
  // Thai
  { match: ['pad thai', 'padthai'], cuisine: 'Thai', why: 'Pad Thai is the iconic Thai stir-fried rice noodle dish.' },
  { match: ['tom yum', 'tom yam', 'tomyum'], cuisine: 'Thai', why: 'Tom yum is a hot-and-sour Thai broth.' },
  { match: ['khao soi'], cuisine: 'Thai', why: 'Khao soi is a Northern Thai coconut-curry noodle soup.' },
  { match: ['green curry', 'gaeng keow wan'], cuisine: 'Thai', why: 'Thai green curry is built on a fresh chilli + galangal paste.' },
  // Indian
  { match: ['butter chicken', 'murgh makhani'], cuisine: 'North Indian', why: 'Butter chicken is a Punjabi tomato-cream chicken curry.' },
  { match: ['biryani', 'biriyani'], cuisine: 'North Indian', why: 'Biryani is a layered spiced rice dish with origins across the subcontinent.' },
  { match: ['tandoori chicken'], cuisine: 'North Indian', why: 'Tandoori chicken is yogurt-marinated chicken roasted in a clay tandoor oven.' },
  { match: ['dosa', 'masala dosa'], cuisine: 'South Indian', why: 'Dosa is a fermented-batter crisp South Indian crêpe.' },
  // Japanese
  { match: ['ramen'], cuisine: 'Japanese', why: 'Ramen is a Japanese wheat-noodle soup with regional broth styles.' },
  { match: ['sushi'], cuisine: 'Japanese', why: 'Sushi pairs vinegared rice with raw fish or other toppings.' },
  { match: ['tonkatsu'], cuisine: 'Japanese', why: 'Tonkatsu is a panko-breaded deep-fried pork cutlet.' },
  // Korean
  { match: ['bibimbap'], cuisine: 'Korean', why: 'Bibimbap is a mixed-rice bowl with vegetables, beef, and gochujang.' },
  { match: ['kimchi jjigae', 'kimchi stew'], cuisine: 'Korean', why: 'Kimchi jjigae is a fermented-cabbage stew with pork or tofu.' },
  // Mexican
  { match: ['tacos', 'taco'], cuisine: 'Mexican', why: 'Tacos are folded soft-corn-tortilla street food across Mexican regions.' },
  { match: ['mole'], cuisine: 'Mexican', why: 'Mole is a complex Mexican sauce family — Oaxacan moles use chiles, chocolate, and spices.' },
  // Spanish
  { match: ['paella'], cuisine: 'Spanish', why: 'Paella is a Valencian rice dish cooked in a wide flat pan.' },
  { match: ['tapas'], cuisine: 'Spanish', why: 'Tapas are small Spanish sharing plates eaten with drinks.' },
  // Vietnamese
  { match: ['pho', 'phở'], cuisine: 'Vietnamese', why: 'Pho is a Vietnamese rice-noodle soup, beef (bò) or chicken (gà).' },
  { match: ['banh mi', 'bánh mì'], cuisine: 'Vietnamese', why: 'Banh mi is a Vietnamese baguette sandwich, a French colonial fusion.' },
  // British
  { match: ['fish and chips', 'fish & chips'], cuisine: 'British', why: 'Fish and chips is the classic British battered-fish-with-fries combo.' },
  { match: ['shepherd\'s pie', 'shepherds pie', 'cottage pie'], cuisine: 'British', why: 'Shepherd\'s pie is minced lamb topped with mashed potato, baked.' },
  { match: ['beef wellington'], cuisine: 'British', why: 'Beef Wellington is a fillet of beef in pâté and puff pastry.' },
  // v0.60.0 — variant dishes referenced by TECHNIQUE_FALLBACK fan-out.
  // These are the canonical iconic dishes for the non-origin cuisines
  // when a technique fans across cultures. dishKey lookups in the
  // technique entries reference match[0] of these entries.
  { match: ['lu shui braised', 'lu shui', 'lou sui', 'lo bah', '卤水'], cuisine: 'Cantonese', why: 'Lu shui = a Cantonese soy + star-anise master stock used to braise duck, eggs, tofu and pork.' },
  { match: ['pörkölt', 'porkolt'], cuisine: 'European', why: 'Pörkölt is a Hungarian paprika meat stew, denser than goulash.' },
  { match: ['nimono'], cuisine: 'Japanese', why: 'Nimono is a Japanese simmered dish, dashi + soy + mirin, vegetables and protein.' },
  { match: ['kakuni'], cuisine: 'Japanese', why: 'Kakuni is Japanese braised pork belly — soy, sake, ginger, slow-simmered to tender squares.' },
  { match: ['pot-au-feu', 'pot au feu'], cuisine: 'French', why: 'Pot-au-feu is a French boiled-beef-and-vegetables one-pot, served with mustard and gros sel.' },
  { match: ['brasato al barolo', 'brasato'], cuisine: 'Italian', why: 'Brasato al Barolo is Piedmontese beef braised in Barolo wine.' },
  { match: ['kway chap'], cuisine: 'Teochew', why: 'Kway chap is Teochew flat rice sheets in dark-soy braised broth with assorted braised innards.' },
  { match: ['braised duck', 'lor ack'], cuisine: 'Teochew', why: 'Teochew braised duck (lor ack) is duck slow-cooked in a soy + 5-spice + galangal master stock.' }
];

function dishFallback(text) {
  const lc = String(text || '').toLowerCase();
  for (const e of DISH_FALLBACK) {
    if (e.match.some((m) => lc.includes(m))) return e;
  }
  return null;
}

// v0.59.57: cooking-technique fallback. Bug 2026-05-07: user typed
// "/s Braisage" (French for braising) and the bot didn't explain
// what the technique is before searching. Single foreign-language
// technique words are easy for Gemini to mis-classify as ambiguous,
// so we mirror the dish-fallback approach with a small curated
// technique catalogue (EN + FR aliases). Each entry's `why` is the
// one-sentence "this is what the technique does" explainer surfaced
// to the user above the venue list.
// v0.60.0 — TECHNIQUE_FALLBACK schema extended with origin-first
// tier-grouping. Per Human Lead 2026-05-07: the previous flat
// `searchPhrase` keyword search returned wrong-cuisine venues (bug:
// "/s Braisage" returned Chinese braised-duck stalls). New shape:
//
//   defaultOrigin     — the textbook origin cuisine of the technique
//   originByAlias     — language-keyed override (e.g. "lu shui" → Cantonese)
//   originDish        — canonical iconic dish for the origin
//   originIngredients — signal ingredients used in scoring
//   originTool        — unique tool/equipment that signals authenticity
//   variants[]        — OTHER authentic traditions for fan-out
//   fusion            — optional modern-fusion section
//
// Fan-out: origin block (≤3 venues) → variant blocks (1-2 each) →
// fusion (≤1). Cap 6 total. Validated by Gemini grounded check.
//
// Techniques that have a fixed cuisine (tandoor → North Indian, etc.)
// keep their cuisine but get an empty variants[] — single-tier render
// via the same code path, just no fan-out.
const TECHNIQUE_FALLBACK = [
  {
    match: ['braising', 'braisage', 'braiser', 'braised'],
    defaultOrigin: 'French',
    originByAlias: { 'lu shui': 'Cantonese', '卤水': 'Cantonese', 'kway chap': 'Teochew', 'lor ack': 'Teochew', 'kakuni': 'Japanese', 'pörkölt': 'European' },
    why: 'Braising = slow-cooking tougher cuts in a small amount of seasoned liquid in a covered pot until tender. French canon: bourguignon, daube, navarin.',
    originDish: 'beef bourguignon',
    originIngredients: ['red wine', 'beef chuck', 'mirepoix', 'pearl onions', 'lardons'],
    originTool: 'cocotte / dutch oven',
    variants: [
      { cuisine: 'Italian',   dishKey: 'osso buco',        whyLocal: 'Milanese veal shank, gremolata-finished.' },
      { cuisine: 'Cantonese', dishKey: 'lu shui braised',  whyLocal: 'Soy + star-anise master stock; duck, eggs, tofu.' },
      { cuisine: 'European',  dishKey: 'goulash',          whyLocal: 'Hungarian paprika beef stew.' }
    ],
    fusion: { label: 'Modern European', searchPhrase: 'modern european braised restaurant Singapore' }
  },
  {
    match: ['rotisserie', 'rôtisserie', 'rôtissage', 'rotissage', 'roasting on spit', 'spit-roasted'],
    defaultOrigin: 'French',
    why: 'Rotisserie = roasting on a rotating spit so the juices baste the meat as it turns. Common for chicken, lamb, porchetta.',
    originDish: 'rotisserie chicken',
    originIngredients: ['poulet rôti', 'thyme', 'butter'],
    originTool: 'rotisserie spit',
    variants: [
      { cuisine: 'Italian',   dishKey: 'porchetta',        whyLocal: 'Italian rolled pork belly + loin, herb-stuffed.' },
      { cuisine: 'Turkish',   dishKey: 'doner',            whyLocal: 'Vertical-spit shaved meat sandwich.' },
      { cuisine: 'Cantonese', dishKey: 'siu yuk',          whyLocal: 'Cantonese roast pork with crackling skin.' }
    ],
    fusion: null
  },
  {
    match: ['sous vide', 'sous-vide'],
    defaultOrigin: 'French',
    why: 'Sous vide = vacuum-sealing food and cooking it in a precisely temperature-controlled water bath, then searing to finish. Hits exact doneness every time.',
    originDish: 'sous vide steak',
    originIngredients: ['precision water bath', 'vacuum-sealed bag'],
    originTool: 'immersion circulator',
    variants: [
      { cuisine: 'American',  dishKey: 'sous vide brisket', whyLocal: 'Modernist American — 36-hour sous vide brisket.' },
      { cuisine: 'Japanese',  dishKey: 'sous vide tonkatsu', whyLocal: 'Japanese sous-vide pork katsu, crisp finish.' }
    ],
    fusion: { label: 'Modernist fusion', searchPhrase: 'modernist sous vide tasting menu Singapore' }
  },
  {
    match: ['smoking', 'smoked', 'smokehouse', 'fumage', 'fumé', 'fume'],
    defaultOrigin: 'American',
    why: 'Smoking = cooking and flavouring food with low-temperature wood smoke (hickory, oak, mesquite, applewood) over hours. American BBQ canon.',
    originDish: 'smoked brisket',
    originIngredients: ['oak', 'hickory', 'mesquite', 'applewood', 'salt-pepper rub'],
    originTool: 'offset smoker',
    variants: [
      { cuisine: 'European',  dishKey: 'smoked salmon',    whyLocal: 'Scandinavian cold-smoked salmon (gravlax adjacent).' },
      { cuisine: 'Cantonese', dishKey: 'tea smoked duck',  whyLocal: 'Sichuan/Cantonese tea-smoked duck, camphor + jasmine.' },
      { cuisine: 'Japanese',  dishKey: 'sakura smoked',    whyLocal: 'Japanese sakura cherry-wood smoked fish.' }
    ],
    fusion: { label: 'Modern smokehouse', searchPhrase: 'modern smokehouse fine dining Singapore' }
  },
  {
    match: ['grilling', 'grillade', 'grillage', 'grillé', 'grilled', 'charcoal grill'],
    defaultOrigin: 'Argentinian',
    why: 'Grilling = direct dry heat from below (gas, charcoal, wood embers). Maillard sear outside, juicy inside.',
    originDish: 'asado',
    originIngredients: ['parrilla', 'wood embers', 'chimichurri'],
    originTool: 'parrilla grill',
    variants: [
      { cuisine: 'Japanese',  dishKey: 'yakitori',         whyLocal: 'Binchotan-grilled chicken skewers.' },
      { cuisine: 'Korean',    dishKey: 'samgyeopsal',      whyLocal: 'Korean BBQ pork belly, table-side grill.' },
      { cuisine: 'Turkish',   dishKey: 'shish kebab',      whyLocal: 'Turkish skewered grilled lamb.' }
    ],
    fusion: { label: 'Modern grill', searchPhrase: 'modern wood fire grill restaurant Singapore' }
  },
  {
    match: ['tandoor', 'tandoori', 'clay oven'],
    defaultOrigin: 'North Indian',
    why: 'Tandoor = a vertical clay oven heated with charcoal to ~480 °C. Marinated meats and breads are slapped onto the wall; the intense heat seals in juices and chars the surface.',
    originDish: 'tandoori chicken',
    originIngredients: ['yogurt marinade', 'kasuri methi', 'ginger-garlic'],
    originTool: 'tandoor clay oven',
    variants: [
      { cuisine: 'Pakistani', dishKey: 'tandoori naan',    whyLocal: 'Pakistani tandoor naan, charred bubbled crust.' }
    ],
    fusion: null
  },
  {
    match: ['robata', 'robatayaki'],
    defaultOrigin: 'Japanese',
    why: 'Robatayaki = Japanese over-coal grilling on an open hearth, traditionally with binchotan charcoal. Diners sit around the grill.',
    originDish: 'robatayaki',
    originIngredients: ['binchotan', 'tare', 'shichimi'],
    originTool: 'robata hearth grill',
    variants: [],
    fusion: null
  },
  {
    match: ['binchotan'],
    defaultOrigin: 'Japanese',
    why: 'Binchotan = white-hot, smoke-free Japanese oak charcoal at very high temperatures. Used in yakitori and robata for clean intense heat.',
    originDish: 'binchotan yakitori',
    originIngredients: ['binchotan oak charcoal', 'tare'],
    originTool: 'binchotan grill',
    variants: [],
    fusion: null
  },
  {
    match: ['yakitori'],
    defaultOrigin: 'Japanese',
    why: 'Yakitori = Japanese skewered chicken (every part) grilled over binchotan with tare glaze or salt.',
    originDish: 'yakitori',
    originIngredients: ['binchotan', 'tare', 'shichimi', 'leek'],
    originTool: 'binchotan grill',
    variants: [],
    fusion: null
  },
  {
    match: ['wok hei', 'breath of the wok'],
    defaultOrigin: 'Cantonese',
    why: '镬气 (wok hei, "breath of the wok") = the smoky char a screaming-hot wok imparts to stir-fries. Requires roaring flame + split-second timing.',
    originDish: 'wok hei hor fun',
    originIngredients: ['carbon steel wok', 'high flame', 'lard'],
    originTool: 'carbon-steel wok over jet flame',
    variants: [],
    fusion: null
  },
  {
    match: ['char siu'],
    defaultOrigin: 'Cantonese',
    why: 'Char siu = Cantonese roasted-pork: pork shoulder marinated in honey, five-spice, red fermented bean curd, hung on hooks in a vertical oven.',
    originDish: 'char siu',
    originIngredients: ['honey', 'maltose', 'five spice', 'red fermented bean curd'],
    originTool: 'char siu vertical oven',
    variants: [],
    fusion: null
  },
  {
    match: ['flambé', 'flambe', 'flambage', 'flaming'],
    defaultOrigin: 'French',
    why: 'Flambé = igniting alcohol added to a pan to burn off harsh notes and add caramelised flavour. Table-side classics: crêpes Suzette, steak Diane.',
    originDish: 'crêpes suzette',
    originIngredients: ['orange liqueur', 'butter', 'sugar'],
    originTool: 'flambé pan',
    variants: [
      { cuisine: 'American',  dishKey: 'bananas foster',   whyLocal: 'New Orleans table-side flambé dessert.' }
    ],
    fusion: null
  },
  {
    match: ['omakase'],
    defaultOrigin: 'Japanese',
    why: 'Omakase = "I leave it to you" — diners surrender the menu to the chef, who serves a sequence of seasonal dishes (most often sushi).',
    originDish: 'omakase',
    originIngredients: ['seasonal seafood', 'edomae sushi'],
    originTool: 'sushi counter',
    variants: [],
    fusion: null
  },
  {
    match: ['teppanyaki'],
    defaultOrigin: 'Japanese',
    why: 'Teppanyaki = Japanese flat-iron-griddle cooking, performed in front of diners at a counter. Wagyu, seafood, garlic-fried-rice classics.',
    originDish: 'teppanyaki',
    originIngredients: ['wagyu', 'garlic chips', 'soy butter'],
    originTool: 'teppan flat-top griddle',
    variants: [],
    fusion: null
  },
  {
    match: ['kamado', 'big green egg'],
    defaultOrigin: 'Japanese',
    why: 'Kamado = a Japanese-origin ceramic egg-shaped grill that holds steady low temperatures for hours — equally good at smoking, baking, and high-heat searing.',
    originDish: 'kamado grilled fish',
    originIngredients: ['ceramic kamado', 'lump charcoal'],
    originTool: 'kamado grill',
    variants: [
      { cuisine: 'American',  dishKey: 'kamado brisket',   whyLocal: 'American kamado low-and-slow brisket.' }
    ],
    fusion: null
  },
  {
    match: ['hibachi'],
    defaultOrigin: 'Japanese',
    why: 'Hibachi = a small portable charcoal brazier; in modern usage often refers to Western teppanyaki-style flat-iron-griddle show.',
    originDish: 'hibachi',
    originIngredients: ['lump charcoal'],
    originTool: 'hibachi brazier',
    variants: [],
    fusion: null
  },
  {
    match: ['poaching', 'pochage', 'poché', 'poached'],
    defaultOrigin: 'French',
    why: 'Poaching = gentle cooking in liquid held below a simmer (~70-85 °C). Preserves delicate proteins like fish, eggs, chicken breast.',
    originDish: 'poached cod',
    originIngredients: ['court bouillon', 'butter', 'tarragon'],
    originTool: 'wide shallow saucepan',
    variants: [
      { cuisine: 'Cantonese', dishKey: 'white cut chicken', whyLocal: 'Cantonese pak chit gai — poached in seasoned stock.' }
    ],
    fusion: null
  },
  {
    match: ['confit'],
    defaultOrigin: 'French',
    why: 'Confit = slow-cooking food (classically duck legs) submerged in its own fat at low temperature until meltingly tender, then often crisped to finish.',
    originDish: 'duck confit',
    originIngredients: ['duck fat', 'thyme', 'salt cure'],
    originTool: 'cassole / heavy pot',
    variants: [],
    fusion: null
  },
  {
    match: ['mijoter', 'simmering', 'simmered'],
    defaultOrigin: 'French',
    why: 'Mijoter / simmering = cooking just below the boil so flavours develop without breaking down delicate textures. Base of stews and reductions.',
    originDish: 'pot-au-feu',
    originIngredients: ['beef shank', 'leek', 'carrot', 'gros sel'],
    originTool: 'stockpot',
    variants: [
      { cuisine: 'Italian',   dishKey: 'brasato al barolo', whyLocal: 'Piemontese beef simmered in Barolo wine.' },
      { cuisine: 'Japanese',  dishKey: 'nimono',            whyLocal: 'Japanese dashi-simmered vegetables and protein.' }
    ],
    fusion: null
  },
  {
    match: ['friture', 'deep fry', 'deep-fried', 'deep frying'],
    defaultOrigin: 'French',
    why: 'Friture / deep frying = submerging food in 170-190 °C oil so the surface dehydrates rapidly into a crisp shell while the interior steams.',
    originDish: 'pommes frites',
    originIngredients: ['neutral oil', 'beef tallow', 'fleur de sel'],
    originTool: 'fryer',
    variants: [
      { cuisine: 'Japanese',  dishKey: 'tempura',           whyLocal: 'Japanese tempura — light cold-batter fritters.' },
      { cuisine: 'American',  dishKey: 'fried chicken',     whyLocal: 'American Southern fried chicken.' }
    ],
    fusion: null
  },
  // v0.60.7 (Human Lead 2026-05-08) — Japanese deep-frying as its own
  // technique entry. v0.60.7 PR #273 piggybacked 'agemono'/'karaage'
  // onto the French friture entry, which produced "🇫🇷 French · pommes
  // frites" venues (La Vache, Bouillon Gavroche) for /s Agemono. Now
  // routes correctly to Japanese tempura/karaage/tonkatsu venues.
  {
    match: ['agemono', 'karaage', 'kara-age'],
    defaultOrigin: 'Japanese',
    why: 'Agemono = Japanese deep-frying technique umbrella, covering tempura (cold-batter fritters), karaage (marinated bite-sized fried chicken), and tonkatsu (panko-breaded cutlets).',
    originDish: 'tempura',
    originIngredients: ['tempura flour', 'cold sparkling water', 'sesame oil'],
    originTool: 'tempura nabe',
    variants: [
      { cuisine: 'Korean',     dishKey: 'korean fried chicken', whyLocal: 'Korean double-fried chicken — gochujang or soy-garlic glazed.' },
      { cuisine: 'American',   dishKey: 'fried chicken',        whyLocal: 'American Southern fried chicken — buttermilk-brined, deep-fried.' }
    ],
    fusion: null
  },
  {
    match: ['sauter', 'sautage', 'sauté', 'saute', 'sautéing', 'sauteing', 'sautéed', 'sauteed'],
    defaultOrigin: 'French',
    why: 'Sautéing = cooking quickly in a small amount of fat over high heat, tossing the pan so food browns evenly without stewing.',
    originDish: 'sauté de veau',
    originIngredients: ['butter', 'shallot', 'demi-glace'],
    originTool: 'sauteuse pan',
    variants: [],
    fusion: null
  }
];

function techniqueFallback(text) {
  const lc = String(text || '').toLowerCase();
  for (const e of TECHNIQUE_FALLBACK) {
    if (e.match.some((m) => lc.includes(m))) return e;
  }
  return null;
}

// v0.60.0 — return the technique entry whose match[] OR originByAlias
// keys appear in the user text. originByAlias is checked so that
// foreign-language aliases ("lu shui", "kakuni", "pörkölt") route to
// the parent technique entry (braising) rather than missing the
// dictionary because they aren't in match[]. resolveOrigin then
// handles the origin override per alias.
function lookupTechnique(text) {
  const lc = String(text || '').toLowerCase();
  if (!lc) return null;
  for (const e of TECHNIQUE_FALLBACK) {
    if (e.match.some((m) => lc.includes(String(m).toLowerCase()))) return e;
    if (e.originByAlias && Object.keys(e.originByAlias).some((alias) => lc.includes(String(alias).toLowerCase()))) return e;
  }
  return null;
}

// v0.60.0 — resolve the per-turn origin cuisine. Each technique has a
// defaultOrigin (textbook origin) plus optional originByAlias overrides
// that fire when the user typed a non-default-language alias. So
// "/s lu shui" matches braising's 'lu shui' alias → origin='Cantonese'
// even though braising's defaultOrigin is 'French'. Returns the cuisine
// label string, or null if no technique entry passed.
function resolveOrigin(techEntry, userText) {
  if (!techEntry) return null;
  const lc = String(userText || '').toLowerCase();
  const overrides = techEntry.originByAlias || {};
  for (const [alias, cuisine] of Object.entries(overrides)) {
    if (lc.includes(String(alias).toLowerCase())) return cuisine;
  }
  return techEntry.defaultOrigin || techEntry.cuisine || null;
}

// v0.60.0 — given the canonical dish phrase (match[0] of a DISH_FALLBACK
// entry, or a free-form string), return it directly. Centralised so
// the fan-out caller can resolve a `dishKey` via the dictionary if it
// matches an entry, otherwise pass through as-is. dishKey usage in
// TECHNIQUE_FALLBACK.variants is kept human-readable (e.g. "lu shui
// braised") and we don't strictly require it to match a dictionary
// entry — the value is used directly as the Places searchText.
function canonicalDishPhrase(dishKey) {
  if (!dishKey) return '';
  const lc = String(dishKey).toLowerCase();
  for (const e of DISH_FALLBACK) {
    if (e.match.some((m) => lc.includes(String(m).toLowerCase()) || String(m).toLowerCase().includes(lc))) {
      return e.match[0];
    }
  }
  return String(dishKey);
}

// v0.60.0 — Gemini grounded-search authenticity grader. Per Human
// Lead 2026-05-07: every candidate venue from the technique fan-out
// is scored 0-100 against (ingredients > tool > dish > authentic >
// fusion > chef nationality). One Gemini call per /s turn covers all
// candidates. Adds ~2-3s latency, deemed acceptable for accuracy
// because the alternative is the v0.59.59 keyword-only search that
// returned Chinese braised-duck stalls for "/s Braisage".
//
// Input shape:
//   { technique, origin, originDish, originIngredients[], originTool,
//     candidates: [{ placeId, name, address }] }
// Output shape:
//   { [placeId]: { score: 0-100, signals: ['ingredients', ...], reason: '…' } }
//
// Failure mode: returns empty object on Gemini error → caller falls
// back to rating-only ranking (same behaviour as v0.59.59).
async function validateAuthenticity({ technique, origin, originDish, originIngredients = [], originTool, candidates = [], lang = 'en', model = DEFAULT_MODEL, redis, _genAIFactory }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return {};
  if (!Array.isArray(candidates) || candidates.length === 0) return {};
  const ingredientsList = originIngredients.length ? originIngredients.join(', ') : 'canonical ingredients';
  const candidateLines = candidates.map((c, i) => `${i + 1}. [${c.placeId}] ${c.name} — ${c.address || 'Singapore'}`).join('\n');
  const prompt = [
    'You are a Singapore F&B authenticity grader. For each candidate Singapore restaurant below,',
    `score 0-100 how likely it is that the restaurant authentically uses the cooking technique "${technique}" in the ${origin} tradition.`,
    '',
    'Use Google Search to read recent reviews, menus, and blog posts where helpful.',
    '',
    'SCORING SIGNALS (highest weight first):',
    `1. INGREDIENTS — does the menu use the canonical ingredients (${ingredientsList})?`,
    `2. TOOL — do they have / use the unique equipment (${originTool || 'specialised gear'})?`,
    `3. DISH — is "${originDish}" or a close variant explicitly on their menu?`,
    `4. AUTHENTIC CUISINE — is the restaurant's stated cuisine genuinely ${origin}?`,
    '5. FUSION — modern fusion that still respects the technique gets a moderate score.',
    `6. CHEF NATIONALITY — chef from ${origin} is a weak signal (only score this if mentioned).`,
    '',
    'SCORE BANDS:',
    '- 0-40 = false positive (the venue name happens to contain a keyword but the technique is not authentic). DROP.',
    '- 41-70 = plausible (some signals match).',
    '- 71-100 = authentic (multiple strong signals).',
    '',
    'OUTPUT: a single JSON array, one object per candidate, in the same order:',
    '[{"placeId":"<exact id>","score":<int>,"signals":["ingredients","tool","dish","authentic","fusion","chef"],"reason":"one sentence","orderTip":"one sentence — what dish to order at THIS specific venue and how to phrase the request to get the technique done right (e.g. \\"Order the bœuf bourguignon and ask if it\'s slow-braised in red wine for 3+ hours.\\")"}, ...]',
    'Plain JSON only. No markdown fences. No prose outside the array.',
    '',
    'orderTip rules: refer to the specific venue\'s menu where you can; if you can\'t find a menu, give a conservative ordering hint based on the technique. ≤140 chars. End with a period.',
    '',
    `CANDIDATES (${candidates.length}):`,
    candidateLines
  ].join('\n');
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  const genAI = factory();
  // Prefer the grounded search tool — it lets Gemini check actual
  // SG menus / reviews. Fall back to ungrounded if the tool fails.
  const candidates_models = [model, ...SEARCH_INTENT_MODEL_CHAIN].filter((v, i, a) => a.indexOf(v) === i);
  let parsed = null;
  for (const m of candidates_models) {
    try {
      const tool = searchToolForModel(m);
      const gen = genAI.getGenerativeModel({ model: m, tools: [tool] });
      const r = await gen.generateContent(prompt);
      require('./api-cost').recordGeminiUsage(redis, m, r?.response?.usageMetadata);
      let raw = '';
      try { raw = r?.response?.text?.() || ''; }
      catch (textErr) {
        console.warn(`[Authenticity] ${m} text() threw: ${textErr.message}`);
        continue;
      }
      const cleaned = String(raw).trim().replace(/^```json\s*|```$/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) break;
      } catch (parseErr) {
        // Try to extract a JSON array from somewhere in the text.
        const m2 = cleaned.match(/\[[\s\S]*\]/);
        if (m2) {
          try { parsed = JSON.parse(m2[0]); if (Array.isArray(parsed)) break; } catch { /* keep trying */ }
        }
        console.warn(`[Authenticity] ${m} non-JSON: ${cleaned.slice(0, 120)}`);
      }
    } catch (err) {
      console.warn(`[Authenticity] ${m} generateContent failed: ${err.message}`);
    }
  }
  const out = {};
  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      if (row && typeof row.placeId === 'string') {
        const score = Number(row.score);
        out[row.placeId] = {
          score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
          signals: Array.isArray(row.signals) ? row.signals.slice(0, 6) : [],
          reason: typeof row.reason === 'string' ? row.reason.slice(0, 240) : '',
          // v0.60.2: per-venue Gemini-grounded ordering tip — what to
          // order at THIS specific venue and how to phrase it to get
          // the technique done right. Rendered as the 🍽️ row.
          orderTip: typeof row.orderTip === 'string' ? row.orderTip.slice(0, 240) : ''
        };
      }
    }
  }
  return out;
}

// v0.60.4 — R.E.D ambiguity dictionary. Per Human Lead 2026-05-07:
// Singapore is a culinary melting pot, so dish names overlap across
// traditions and the bot must DETERMINISTICALLY disambiguate before
// running a search. NO Gemini in this pipeline — too risky for
// silent-guess output. Dictionary-only, signal-weighted.
//
// Each entry has multiple `interpretations[]`. Each interpretation has:
//   - id           : stable identifier
//   - label        : human-readable, used in disclosure
//   - cuisine      : routes to existing cuisine classification
//   - flag         : country flag emoji for tourist render
//   - defaultIn[]  : ISO codes / 'SG' tags — locale tiebreaker
//   - signals[]    : modifier substrings that pin THIS interpretation
//                    (e.g. 'cream cheese' → western dessert)
//
// Match precedence: explicit modifier (signals) > locale default >
// conversation history > LOW-CONFIDENCE fallback (show both, never guess).
// v0.60.23 — parent-cuisine table. The umbrellas Singaporeans /
// tourists most commonly type into the chip grid or the "Tell me"
// box. When the user picks the umbrella alone (no sub-style modifier),
// we want to fan out into the dominant sub-styles rather than search
// the umbrella as a single Places query — Places returns generic
// "Chinese restaurant" entries that miss authentic Cantonese / Sichuan
// venues. Sub-style ordering reflects the populationInSG signal so
// the spread we surface matches the SG dining landscape.
const PARENT_CUISINES = [
  { slug: 'chinese',
    aliases: ['chinese', 'china', 'chinois', 'chinoise', 'cn'],
    flag: '🇨🇳',
    label: { en: 'Chinese', fr: 'Chinois' },
    subStyles: ['cantonese', 'teochew', 'hokkien', 'sichuan', 'hainanese', 'shanghainese', 'hunan', 'hakka', 'hong-kong', 'taiwanese'] },
  { slug: 'indian',
    aliases: ['indian', 'india', 'indien', 'indienne', 'in'],
    flag: '🇮🇳',
    label: { en: 'Indian', fr: 'Indien' },
    subStyles: ['north-indian', 'south-indian', 'bengali', 'gujarati', 'goan'] },
  { slug: 'south-asian',
    aliases: ['south asian', 'south-asian', 'subcontinent', 'asie du sud'],
    flag: '🌏',
    label: { en: 'South Asian', fr: 'Asie du Sud' },
    subStyles: ['north-indian', 'south-indian', 'bengali', 'gujarati', 'goan', 'pakistani', 'sri-lankan', 'nepalese'] },
  { slug: 'middle-eastern',
    aliases: ['middle eastern', 'middle-eastern', 'mideast', 'moyen-orient', 'moyen orient'],
    flag: '🕌',
    label: { en: 'Middle Eastern', fr: 'Moyen-Oriental' },
    subStyles: ['lebanese', 'persian', 'turkish', 'jordanian', 'israeli', 'egyptian'] },
  { slug: 'european',
    aliases: ['european', 'europe', 'européen', 'européenne'],
    flag: '🇪🇺',
    label: { en: 'European', fr: 'Européen' },
    subStyles: ['french', 'italian', 'spanish', 'german', 'austrian', 'swiss', 'british', 'portuguese', 'greek', 'russian'] },
  { slug: 'mediterranean',
    aliases: ['mediterranean', 'med', 'méditerranéen', 'mediterranée'],
    flag: '🌊',
    label: { en: 'Mediterranean', fr: 'Méditerranéen' },
    subStyles: ['italian', 'spanish', 'greek', 'turkish', 'lebanese', 'moroccan'] }
];

function findParentCuisine(text) {
  const lc = String(text || '').toLowerCase().trim();
  if (!lc) return null;
  // Exact / contained alias match. Word-boundary against the alias
  // string so "europe" does not match "europe-something" verbatim
  // but "/s European" does.
  for (const p of PARENT_CUISINES) {
    for (const alias of p.aliases) {
      const a = alias.toLowerCase();
      // Whole-word match: alias surrounded by start/end or non-word.
      const re = new RegExp(`(?:^|\\W)${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\W)`, 'i');
      if (re.test(` ${lc} `)) return p;
    }
  }
  return null;
}

const AMBIGUOUS_DISHES = [
  {
    match: ['carrot cake', 'chai tow kway', '菜头粿'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-chai-tow-kway',
        label: 'Singapore savoury fried carrot cake',
        cuisine: 'Teochew', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['white', 'black', 'chai tow kway', 'fried', 'kway', 'savoury', 'hawker', 'wok'] },
      { id: 'western-dessert',
        label: 'Western carrot cake dessert',
        cuisine: 'American', flag: '🇺🇸',
        defaultIn: ['US', 'UK', 'EU', 'AU'],
        signals: ['cream cheese', 'cinnamon', 'walnut', 'frosted', 'slice', 'cake shop', 'dessert', 'icing', 'bakery'] }
    ]
  },
  {
    match: ['bak kut teh', 'bkt'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'teochew-bkt',
        label: 'Teochew bak kut teh (peppery clear broth)',
        cuisine: 'Teochew', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['peppery', 'pepper', 'clear', 'white', 'teochew', 'song fa'] },
      { id: 'hokkien-bkt',
        label: 'Hokkien bak kut teh (dark herbal broth)',
        cuisine: 'Hokkien', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['herbal', 'dark', 'klang', 'hokkien', 'malaysian'] }
    ]
  },
  {
    // v0.60.114 — operator 2026-05-11: `/s asado` should interact and
    // confirm rather than guess "asado grilling" (cooking-method path).
    // "asado" means two distinct dishes: the Argentinian/Uruguayan
    // open-fire parrilla feast, or the Filipino Chinese-influenced
    // sweet soy-braised pork. Neither defaults in SG → LOW confidence
    // → handleSearchTurn renders both as one-tap pivots, no Places call.
    match: ['asado'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'argentinian-asado',
        label: 'Argentinian asado (open-fire parrilla feast)',
        cuisine: 'Argentinian', flag: '🇦🇷',
        defaultIn: ['AR', 'UY'],
        signals: ['argentine', 'argentinian', 'uruguayan', 'parrilla', 'tira de asado', 'choripan', 'choripán', 'chimichurri', 'vacio', 'vacío', 'morcilla', 'grill', 'grilled', 'bbq', 'barbecue', 'open fire'] },
      { id: 'filipino-asado',
        label: 'Filipino asado (sweet soy-braised pork)',
        cuisine: 'Filipino', flag: '🇵🇭',
        defaultIn: ['PH'],
        signals: ['filipino', 'pinoy', 'siopao', 'asado roll', 'pork asado', 'braised pork', 'sweet', 'soy', 'star anise', 'kapampangan', 'pampanga'] }
    ]
  },
  {
    match: ['laksa'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'katong-laksa',
        label: 'Katong laksa (creamy coconut, cut noodles)',
        cuisine: 'Peranakan', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['katong', 'coconut', 'creamy', 'cut noodles', 'laksa lemak', 'nyonya', 'peranakan'] },
      { id: 'penang-asam-laksa',
        label: 'Penang asam laksa (tamarind, fish, no coconut)',
        cuisine: 'Malaysian', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['penang', 'asam', 'tamarind', 'sour', 'fish', 'no coconut'] },
      { id: 'sarawak-laksa',
        label: 'Sarawak laksa (sambal belacan + coconut + chicken)',
        cuisine: 'Malaysian', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['sarawak', 'sambal belacan'] }
    ]
  },
  {
    match: ['rojak'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'chinese-rojak',
        label: 'Chinese rojak (fruit + dough fritters + prawn paste)',
        cuisine: 'Singaporean', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['chinese', 'prawn paste', 'haebee', 'cucumber', 'pineapple', 'you tiao'] },
      { id: 'indian-rojak',
        label: 'Indian rojak (mixed fritters + sweet potato sauce)',
        cuisine: 'Indian-Singaporean', flag: '🇮🇳',
        defaultIn: ['SG'],
        signals: ['indian', 'pasembur', 'fritter', 'sweet sauce'] }
    ]
  },
  {
    match: ['curry puff', 'karipap'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-curry-puff',
        label: 'Singapore curry puff (Old Chang Kee style — chicken curry, hard pastry)',
        cuisine: 'Singaporean', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['old chang kee', 'chicken', 'potato', 'crispy', 'hard pastry'] },
      { id: 'malay-karipap',
        label: 'Malay karipap (cumin + potato, flaky pastry)',
        cuisine: 'Malay', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['malay', 'karipap', 'cumin', 'flaky', 'pusing'] }
    ]
  },
  {
    match: ['chicken rice', 'hainanese chicken rice'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'hainanese-poached',
        label: 'Hainanese poached chicken rice (default)',
        cuisine: 'Hainanese', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['poached', 'white', 'hainanese'] },
      { id: 'roasted-chicken-rice',
        label: 'Roasted chicken rice',
        cuisine: 'Cantonese', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['roasted', 'roast', 'siu mei'] },
      { id: 'soy-sauce-chicken-rice',
        label: 'Soya sauce chicken rice',
        cuisine: 'Cantonese', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['soy sauce', 'soya', 'see yew', 'liao fan'] }
    ]
  },
  {
    match: ['char kway teow', 'char kuey teow', 'ckt'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-ckt',
        label: 'Singapore char kway teow (sweeter, lighter)',
        cuisine: 'Teochew', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'sweet', 'cockle'] },
      { id: 'penang-ckt',
        label: 'Penang char kway teow (drier, more wok hei)',
        cuisine: 'Malaysian', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['penang', 'wok hei', 'duck egg', 'lard'] }
    ]
  },
  {
    match: ['hokkien mee'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-hokkien-mee',
        label: 'Singapore Hokkien mee (yellow + bee hoon, prawn stock)',
        cuisine: 'Hokkien', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'prawn', 'yellow', 'bee hoon', 'sambal'] },
      { id: 'kl-hokkien-mee',
        label: 'KL Hokkien mee (dark soy, thick noodle, pork lard)',
        cuisine: 'Malaysian', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['kl', 'dark', 'thick', 'lard', 'kuala lumpur'] },
      { id: 'penang-hokkien-mee',
        label: 'Penang Hokkien mee (prawn-paste broth, hae mee)',
        cuisine: 'Malaysian', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['penang', 'hae mee', 'prawn broth'] }
    ]
  },
  {
    match: ['mee goreng'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'malay-mee-goreng',
        label: 'Malay mee goreng (sambal-based, sweet-spicy)',
        cuisine: 'Malay', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['malay', 'sambal', 'sweet'] },
      { id: 'mamak-mee-goreng',
        label: 'Mamak / Indian-Muslim mee goreng (tomato-based)',
        cuisine: 'Indian-Singaporean', flag: '🇮🇳',
        defaultIn: ['SG', 'MY'],
        signals: ['mamak', 'indian', 'tomato', 'tamil'] }
    ]
  },
  {
    match: ['biryani', 'briyani', 'nasi briyani'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'hyderabadi-biryani',
        label: 'Hyderabadi biryani (dum-cooked, saffron, mutton)',
        cuisine: 'North Indian', flag: '🇮🇳',
        defaultIn: ['IN'],
        signals: ['hyderabadi', 'dum', 'saffron'] },
      { id: 'lucknowi-biryani',
        label: 'Lucknowi / Awadhi biryani (lighter spicing)',
        cuisine: 'North Indian', flag: '🇮🇳',
        defaultIn: ['IN'],
        signals: ['lucknowi', 'awadhi'] },
      { id: 'sg-nasi-briyani',
        label: 'Singapore nasi briyani (Indian-Muslim style, ghee rice + curry)',
        cuisine: 'Indian-Singaporean', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['nasi briyani', 'mamak', 'ghee', 'singapore'] }
    ]
  },
  {
    match: ['goulash', 'gulyás'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'hu-stew',
        label: 'Hungarian gulyás (paprika beef stew, soup-like)',
        cuisine: 'European', flag: '🇭🇺',
        defaultIn: ['HU'],
        signals: ['hungarian', 'paprika', 'soup', 'kettle', 'gulyás', 'gulyas'] },
      { id: 'cz-with-dumplings',
        label: 'Czech guláš with bread dumplings',
        cuisine: 'European', flag: '🇨🇿',
        defaultIn: ['CZ'],
        signals: ['dumpling', 'dumplings', 'knedlík', 'knedlíky', 'czech'] },
      { id: 'at-bavarian',
        label: 'Austrian/Bavarian goulash (with spätzle or bread dumplings)',
        cuisine: 'European', flag: '🇦🇹',
        defaultIn: ['AT', 'DE'],
        signals: ['austrian', 'bavarian', 'wiener', 'spätzle', 'spaetzle'] }
    ]
  },
  {
    match: ['wonton', 'wantan', 'wanton'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'cantonese-wonton',
        label: 'Cantonese wonton (prawn + pork, thin skin, broth)',
        cuisine: 'Cantonese', flag: '🇨🇳',
        defaultIn: ['SG', 'HK', 'CN'],
        signals: ['cantonese', 'prawn', 'broth', 'thin skin', 'hong kong'] },
      { id: 'sichuan-wonton',
        label: 'Sichuan chao shou wonton (chili oil, vinegar)',
        cuisine: 'Sichuan', flag: '🇨🇳',
        defaultIn: ['CN'],
        signals: ['sichuan', 'chao shou', 'chili oil', 'spicy', 'red oil'] }
    ]
  },
  {
    match: ['prata', 'paratha', 'roti prata', 'roti paratha'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-roti-prata',
        label: 'Singapore roti prata (flaky, with curry)',
        cuisine: 'Indian-Singaporean', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'flaky', 'curry', 'kosong', 'plaster', 'cheese prata'] },
      { id: 'in-paratha',
        label: 'Indian paratha (denser layered flatbread)',
        cuisine: 'North Indian', flag: '🇮🇳',
        defaultIn: ['IN'],
        signals: ['indian', 'aloo', 'gobi', 'punjabi', 'stuffed paratha'] }
    ]
  },
  {
    match: ['chendol', 'cendol'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-chendol',
        label: 'Singapore/Malaysian chendol (gula melaka + green jelly + coconut milk)',
        cuisine: 'Peranakan', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['gula melaka', 'green jelly', 'coconut', 'singapore', 'malaysian'] },
      { id: 'id-es-cendol',
        label: 'Indonesian es cendol (similar but red bean variant common)',
        cuisine: 'Indonesian', flag: '🇮🇩',
        defaultIn: ['ID'],
        signals: ['indonesian', 'es cendol', 'red bean', 'jakarta'] }
    ]
  },
  {
    match: ['oyster omelette', 'orh luak', 'or chien', 'orh chien'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'teochew-orh-luak',
        label: 'Teochew orh luak (gooey starch base, oyster + egg)',
        cuisine: 'Teochew', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['teochew', 'orh luak', 'singapore', 'starch'] },
      { id: 'taiwan-o-a-chian',
        label: 'Taiwanese o-á-chian (sweeter sauce, larger oysters)',
        cuisine: 'Taiwanese', flag: '🇹🇼',
        defaultIn: ['TW'],
        signals: ['taiwan', 'taiwanese', 'shilin', 'sweet sauce'] }
    ]
  },
  {
    match: ['mee siam'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-mee-siam',
        label: 'Singapore mee siam (sweet-tangy gravy with peanuts)',
        cuisine: 'Peranakan', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'gravy', 'tau cheo'] },
      { id: 'malay-mee-siam',
        label: 'Malay mee siam (drier, sambal-fried)',
        cuisine: 'Malay', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['malay', 'dry', 'sambal'] }
    ]
  },
  {
    match: ['satay'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-malay-satay',
        label: 'Malay/Singaporean satay (chicken, beef, mutton + peanut sauce)',
        cuisine: 'Malay', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['malay', 'chicken', 'beef', 'mutton', 'lau pa sat'] },
      { id: 'indonesian-sate',
        label: 'Indonesian sate (regional variants — sate ayam, sate padang)',
        cuisine: 'Indonesian', flag: '🇮🇩',
        defaultIn: ['ID'],
        signals: ['indonesian', 'sate ayam', 'sate padang', 'jakarta', 'java'] },
      { id: 'thai-moo-satay',
        label: 'Thai-style satay (sweeter peanut sauce + ajat)',
        cuisine: 'Thai', flag: '🇹🇭',
        defaultIn: ['TH'],
        signals: ['thai', 'ajat', 'bangkok'] }
    ]
  },
  {
    match: ['pho'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'pho-bac',
        label: 'Northern Vietnamese phở Bắc (clear broth, simpler)',
        cuisine: 'Vietnamese', flag: '🇻🇳',
        defaultIn: ['VN'],
        signals: ['hanoi', 'bac', 'northern', 'clear'] },
      { id: 'pho-nam',
        label: 'Southern Vietnamese phở Nam (sweeter, richer broth)',
        cuisine: 'Vietnamese', flag: '🇻🇳',
        defaultIn: ['VN'],
        signals: ['saigon', 'nam', 'southern', 'hoisin', 'sriracha'] }
    ]
  },
  {
    match: ['ramen'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'tonkotsu',
        label: 'Tonkotsu ramen (Hakata/Fukuoka — pork bone, milky)',
        cuisine: 'Japanese', flag: '🇯🇵',
        defaultIn: ['JP'],
        signals: ['tonkotsu', 'hakata', 'fukuoka', 'pork bone', 'milky'] },
      { id: 'shoyu',
        label: 'Shoyu ramen (Tokyo — soy-based clear broth)',
        cuisine: 'Japanese', flag: '🇯🇵',
        defaultIn: ['JP'],
        signals: ['shoyu', 'tokyo', 'soy', 'clear'] },
      { id: 'miso',
        label: 'Miso ramen (Sapporo — fermented soybean paste)',
        cuisine: 'Japanese', flag: '🇯🇵',
        defaultIn: ['JP'],
        signals: ['miso', 'sapporo', 'hokkaido'] },
      { id: 'shio',
        label: 'Shio ramen (salt-based, lightest)',
        cuisine: 'Japanese', flag: '🇯🇵',
        defaultIn: ['JP'],
        signals: ['shio', 'salt'] }
    ]
  },
  {
    match: ['ban mian', 'pan mee'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-ban-mian',
        label: 'Singapore ban mian (clear broth, ikan bilis, hand-pulled noodles)',
        cuisine: 'Hakka', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'ikan bilis', 'hand pulled'] },
      { id: 'kl-pan-mee',
        label: 'KL pan mee (dry chili variant common, mushroom + sambal)',
        cuisine: 'Malaysian', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['kl', 'dry chili', 'mushroom', 'sambal', 'kuala lumpur'] }
    ]
  },
  {
    match: ['popiah'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-popiah',
        label: 'Singapore popiah (turnip + sweet sauce, fresh wrap)',
        cuisine: 'Hokkien', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['turnip', 'sweet sauce', 'kee chap', 'singapore'] },
      { id: 'taiwan-popiah',
        label: 'Taiwanese run-bing (peanut crumb forward)',
        cuisine: 'Taiwanese', flag: '🇹🇼',
        defaultIn: ['TW'],
        signals: ['taiwan', 'run bing', 'peanut crumb'] }
    ]
  },
  {
    match: ['gado gado'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'jakarta-gado-gado',
        label: 'Jakarta gado-gado (peanut sauce + rice cake + tofu + tempeh)',
        cuisine: 'Indonesian', flag: '🇮🇩',
        defaultIn: ['ID'],
        signals: ['jakarta', 'java', 'lontong'] },
      { id: 'sg-gado-gado',
        label: 'Singapore-style gado gado (less peanut, more sambal)',
        cuisine: 'Indonesian', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'sambal'] }
    ]
  },
  {
    match: ['murtabak'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-murtabak',
        label: 'Singapore Indian-Muslim murtabak (mutton/chicken + onion stuffed prata)',
        cuisine: 'Indian-Singaporean', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'mamak', 'mutton', 'chicken', 'zam zam'] },
      { id: 'arabic-murtabak',
        label: 'Arabic murtabak (egg + meat folded crepe, Yemeni origin)',
        cuisine: 'Middle Eastern', flag: '🇾🇪',
        defaultIn: ['YE', 'AE'],
        signals: ['arabic', 'yemeni', 'egg crepe'] }
    ]
  },
  {
    match: ['chwee kueh', 'shui guo'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-chwee-kueh',
        label: 'Singapore chwee kueh (steamed rice cake + fried preserved radish)',
        cuisine: 'Teochew', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'preserved radish', 'chai poh'] }
    ]
  },
  {
    match: ['otak', 'otah'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-otah',
        label: 'Singapore otah (banana-leaf wrapped fish cake)',
        cuisine: 'Peranakan', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['banana leaf', 'fish cake', 'singapore'] },
      { id: 'id-otak-otak',
        label: 'Indonesian otak-otak (smaller, sweeter, served with peanut sauce)',
        cuisine: 'Indonesian', flag: '🇮🇩',
        defaultIn: ['ID'],
        signals: ['indonesian', 'palembang', 'peanut sauce'] }
    ]
  },
  {
    match: ['ice kachang', 'ais kacang', 'ice kacang'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-ice-kachang',
        label: 'Singapore ice kachang (shaved ice + syrup + corn + red bean + jelly)',
        cuisine: 'Singaporean', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['shaved ice', 'red bean', 'corn', 'syrup'] }
    ]
  },
  {
    match: ['kuih lapis', 'kueh lapis'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'kuih-lapis-sagu',
        label: 'Kuih lapis sagu (steamed sago + coconut layered cake)',
        cuisine: 'Peranakan', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['sagu', 'sago', 'steamed', 'coconut', 'colorful'] },
      { id: 'kuih-lapis-legit',
        label: 'Kuih lapis legit / lapis Surabaya (rich butter spice cake, Indo-Dutch)',
        cuisine: 'Indonesian', flag: '🇮🇩',
        defaultIn: ['ID'],
        signals: ['legit', 'spekkoek', 'surabaya', 'butter'] }
    ]
  },
  {
    match: ['ondeh ondeh', 'klepon'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-ondeh-ondeh',
        label: 'Ondeh ondeh (pandan glutinous rice ball + gula melaka + coconut)',
        cuisine: 'Peranakan', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['pandan', 'gula melaka', 'glutinous'] },
      { id: 'id-klepon',
        label: 'Indonesian klepon (smaller, similar fill, often green)',
        cuisine: 'Indonesian', flag: '🇮🇩',
        defaultIn: ['ID'],
        signals: ['indonesian', 'klepon', 'java'] }
    ]
  },
  {
    match: ['mee rebus'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-mee-rebus',
        label: 'Singapore mee rebus (sweet potato gravy, egg, lime)',
        cuisine: 'Malay', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['singapore', 'sweet potato gravy', 'lime'] }
    ]
  },
  {
    match: ['soto ayam'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'id-soto-ayam',
        label: 'Indonesian soto ayam (turmeric chicken broth, vermicelli)',
        cuisine: 'Indonesian', flag: '🇮🇩',
        defaultIn: ['ID'],
        signals: ['indonesian', 'turmeric', 'kunyit'] },
      { id: 'sg-soto-ayam',
        label: 'Singapore/Malay soto ayam (lighter, served with ketupat or bergedil)',
        cuisine: 'Malay', flag: '🇸🇬',
        defaultIn: ['SG', 'MY'],
        signals: ['ketupat', 'bergedil', 'singapore', 'malay'] }
    ]
  },
  {
    match: ['prawn noodle', 'hae mee', 'har mee'],
    kind: 'ambiguous-dish',
    interpretations: [
      { id: 'sg-prawn-noodle',
        label: 'Singapore prawn mee (clear prawn broth, dry or soup)',
        cuisine: 'Hokkien', flag: '🇸🇬',
        defaultIn: ['SG'],
        signals: ['singapore', 'clear', 'sambal', 'pork rib'] },
      { id: 'penang-hae-mee',
        label: 'Penang hae mee (richer prawn broth, more sweetness)',
        cuisine: 'Malaysian', flag: '🇲🇾',
        defaultIn: ['MY'],
        signals: ['penang', 'rich', 'malaysian'] }
    ]
  }
];

// v0.60.4 — disambiguateTerm: deterministic ambiguity resolver. NO
// Gemini call here (per Human Lead). Signal-weighted: explicit
// modifier > geographic locale default > conversation history >
// low-confidence fallback (show both).
//
// Inputs:
//   text          : raw user query
//   ctx           : { lang, locale, history, lastDisambig }
//                   - locale: ISO country code (e.g. 'SG'). NOT user nationality.
//                   - lastDisambig: { entryMatch, chosenId } from prior turn
//                                    in same conversation; sticky for 6 turns.
//
// Returns { kind, chosen, alternatives, confidence, isTourist,
//           disclosure, searchSpec } or { kind: 'none' } if no match.
//
// IMPORTANT: language of `text` is NOT a signal. Only the dish-level
// `signals[]` matches and explicit nation names matter. A Singaporean
// typing 'Sautage' wants French food; that the word is French has
// no bearing on user nationality and routes purely on the dish entry.
function disambiguateTerm({ text, ctx = {} }) {
  const lc = String(text || '').toLowerCase().trim();
  if (!lc) return { kind: 'none' };
  const locale = String(ctx.locale || 'SG').toUpperCase();
  const lang = String(ctx.lang || 'en').toLowerCase();
  // v0.60.23 — parent-cuisine fan-out. Checked BEFORE AMBIGUOUS_DISHES
  // because the umbrella name is itself unambiguous (it always means
  // "show me the spread"); only when no umbrella matches do we look
  // for dish-level ambiguity. AMBIGUOUS_DISHES never matches plain
  // "Chinese" / "Indian" / "Mediterranean" so the order doesn't
  // shadow any existing dish entry.
  const parent = findParentCuisine(lc);
  if (parent) {
    let overlay = null;
    try { overlay = require('./nation-overlay'); } catch { overlay = null; }
    const subStyleDetails = parent.subStyles.map((slug) => {
      const o = overlay && typeof overlay.getNationOverlay === 'function'
        ? overlay.getNationOverlay(slug)
        : null;
      const dishes = o && Array.isArray(o.iconicDishes)
        ? o.iconicDishes.filter((d) => d && d.kind !== 'drink').slice(0, 3).map((d) => d.name)
        : [];
      return {
        slug,
        label: o?.aliases?.[0] || slug,
        flag: o?.flag || '',
        iconicDishes: dishes
      };
    });
    const labelEn = parent.label.en;
    const labelFr = parent.label.fr || labelEn;
    const sample = subStyleDetails.slice(0, 4).map((s) => s.label).filter(Boolean).join(', ');
    const disclosure = {
      en: `ℹ️ <i>Reading "${labelEn}" as an umbrella — showing a spread of sub-styles${sample ? ` (${sample}…)` : ''}.</i>`,
      fr: `ℹ️ <i>Lecture de "${labelFr}" en tant que famille — éventail de sous-styles${sample ? ` (${sample}…)` : ''}.</i>`
    };
    return {
      kind: 'parent-cuisine',
      chosen: { id: parent.slug, label: lang === 'fr' ? labelFr : labelEn, cuisine: parent.slug, flag: parent.flag },
      alternatives: [],
      subStyles: subStyleDetails,
      confidence: 'low',
      isTourist: true,
      disclosure,
      searchSpec: {
        kind: 'parent-cuisine',
        cuisine: parent.slug,
        cuisines: parent.subStyles,
        wantSpread: true
      }
    };
  }
  // Find the matching ambiguous-dish entry.
  const entry = AMBIGUOUS_DISHES.find((e) => e.match.some((m) => lc.includes(String(m).toLowerCase())));
  if (!entry) return { kind: 'none' };
  // Score each interpretation by SIGNALS hits in user text.
  const scored = entry.interpretations.map((i) => {
    const signalHits = (i.signals || []).filter((s) => lc.includes(String(s).toLowerCase())).length;
    const localeMatch = (i.defaultIn || []).includes(locale);
    return { interp: i, signalHits, localeMatch };
  });
  const maxSignals = Math.max(0, ...scored.map((s) => s.signalHits));
  let chosen = null;
  let confidence = 'low';
  let alternatives = [];
  if (maxSignals > 0) {
    // HIGH confidence — explicit modifier wins.
    const winners = scored.filter((s) => s.signalHits === maxSignals);
    chosen = winners[0].interp;
    confidence = winners.length === 1 ? 'high' : 'medium';
    alternatives = scored.filter((s) => s.interp.id !== chosen.id).map((s) => s.interp);
  } else {
    // No modifier hit. Try locale.
    const localeWinners = scored.filter((s) => s.localeMatch);
    if (localeWinners.length === 1) {
      // MEDIUM confidence — locale gives a single default.
      chosen = localeWinners[0].interp;
      confidence = 'medium';
      alternatives = scored.filter((s) => s.interp.id !== chosen.id).map((s) => s.interp);
    } else if (localeWinners.length > 1) {
      // Multiple interpretations all default in this locale. LOW confidence.
      chosen = localeWinners[0].interp;
      confidence = 'low';
      alternatives = entry.interpretations.filter((i) => i.id !== chosen.id);
    } else {
      // No locale match. LOW confidence — show all.
      chosen = entry.interpretations[0];
      confidence = 'low';
      alternatives = entry.interpretations.slice(1);
    }
  }
  // Conversation history sticky: if prior turn picked a different id
  // for this same entry, prefer it (overrides MEDIUM but not HIGH).
  const last = ctx.lastDisambig;
  if (last && last.entryMatch === entry.match[0] && last.chosenId && confidence !== 'high') {
    const stickyInterp = entry.interpretations.find((i) => i.id === last.chosenId);
    if (stickyInterp && stickyInterp.id !== chosen.id) {
      chosen = stickyInterp;
      confidence = 'medium';
      alternatives = entry.interpretations.filter((i) => i.id !== chosen.id);
    }
  }
  // Tourist heuristic: bare query (≤3 words), no signals, no history.
  const tokenCount = lc.split(/\s+/).filter(Boolean).length;
  const isTourist = tokenCount <= 3 && maxSignals === 0 && !last;
  // Disclosure copy.
  const disclosure = buildDisclosure({ entry, chosen, alternatives, confidence, lang });
  return {
    kind: entry.kind,
    chosen: { id: chosen.id, label: chosen.label, cuisine: chosen.cuisine, flag: chosen.flag || '🍽' },
    alternatives: alternatives.map((a) => ({ id: a.id, label: a.label, cuisine: a.cuisine, flag: a.flag || '🍽', oneTapHint: pickOneTapHint(a) })),
    confidence,
    isTourist,
    disclosure,
    searchSpec: {
      kind: entry.kind,
      cuisine: chosen.cuisine,
      dishKey: entry.match[0],
      searchPhrase: deriveSearchPhrase(chosen),
      wantSpread: confidence === 'low',                   // low → show both side by side
      stickyKey: { entryMatch: entry.match[0], chosenId: chosen.id }
    }
  };
}

// Strip parenthetical descriptions and any leading "Singapore" from
// the interpretation label, then suffix "Singapore" for Places query.
// "Singapore savoury fried carrot cake" → "savoury fried carrot cake Singapore"
// "Hungarian gulyás (paprika beef stew, soup-like)" → "Hungarian gulyás Singapore"
function deriveSearchPhrase(interp) {
  if (!interp || typeof interp.label !== 'string') return '';
  let label = interp.label.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  label = label.replace(/^Singapore\s+/i, '');
  return `${label} restaurant Singapore`.replace(/\s+/g, ' ').trim();
}

// Pick the first signal as a one-tap hint for the alternative.
// Used in the disclosure: "Meant the X? → /s {term} {hint}".
function pickOneTapHint(interp) {
  const sig = (interp.signals || []).find((s) => s.length <= 12 && !s.includes(' '));
  return sig || (interp.signals && interp.signals[0]) || '';
}

function buildDisclosure({ entry, chosen, alternatives, confidence, lang }) {
  const term = entry.match[0];
  const fr = lang === 'fr';
  const head = fr
    ? `ℹ️ <i>Lecture: <b>${chosen.label}</b> (${chosen.cuisine}).</i>`
    : `ℹ️ <i>Reading this as <b>${chosen.label}</b> (${chosen.cuisine}).</i>`;
  // High confidence — modifier was explicit; no alternative offered.
  if (confidence === 'high') return { en: head, fr: head };
  // Medium / low confidence — offer one-tap pivots.
  const altLines = alternatives.slice(0, 3).map((a) => {
    const hint = pickOneTapHint(a);
    return fr
      ? `   <i>Voulu <b>${a.label}</b> ? → <code>/s ${term} ${hint}</code></i>`
      : `   <i>Meant <b>${a.label}</b>? → <code>/s ${term} ${hint}</code></i>`;
  }).join('\n');
  const text = `${head}\n${altLines}`;
  return { en: text, fr: text };
}

// v0.62.722 — same list as FALLBACK_CHAIN, minus the grounding-tool wrapper
// these callers do not use. Shared so the two cannot drift apart again.
const SEARCH_INTENT_MODEL_CHAIN = GEMINI_MODELS.MODEL_CHAIN.slice();

async function classifySearchIntent({ text, history = [], lang = 'en', model = DEFAULT_MODEL, redis, _genAIFactory }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) {
    // Caller-side env failure — log and return a graceful ambiguous.
    console.warn('[Search-Intent] GEMINI_API_KEY unset — falling back to dictionaries.');
    // v0.59.58 (codex P2): dish dictionary runs FIRST so specific
    // multi-word dish queries like "duck confit" and "tandoori
    // chicken" keep hitting their pre-existing dish entries (with
    // the precise searchTerm) instead of getting reclassified as
    // the broader "confit"/"tandoor" technique. Standalone
    // technique words ("tandoor", "braisage", "sous vide") still
    // hit the technique entry on the second pass because no dish
    // entry contains them as a substring.
    const hit = dishFallback(text);
    if (hit) {
      // v0.59.56 / codex P2: use the canonical dish phrase (match[0])
      // not just the first user token, so "Beef bourguignon" searches
      // "beef bourguignon restaurant Singapore" not "Beef restaurant
      // Singapore".
      return { intent: 'dish', cuisine: hit.cuisine, searchTerm: `${hit.match[0]} restaurant Singapore`, why: hit.why, clarify: '' };
    }
    const techHit = techniqueFallback(text);
    if (techHit) {
      // v0.60.0: schema changed to tier-aware. Map to the legacy
      // classifySearchIntent return shape so the existing API stays
      // stable. handleSearchTurn re-derives the technique entry via
      // lookupTechnique and runs the fan-out separately.
      return {
        intent: 'tool',
        cuisine: techHit.defaultOrigin || null,
        searchTerm: `${techHit.originDish} restaurant Singapore`,
        why: techHit.why,
        clarify: ''
      };
    }
    // v0.62.x — no key + no dictionary hit: FAIL OPEN to a dish search on the
    // raw text (was 'ambiguous' → declined). Discover uses Places, not Gemini,
    // so the search still works without the classifier.
    return { intent: 'dish', cuisine: null, searchTerm: String(text || '').trim(), why: '', clarify: '', degraded: true };
  }
  const histLines = (Array.isArray(history) ? history : [])
    .slice(-12)
    .map((h) => `${h.role === 'user' ? 'USER' : 'BOT'}: ${String(h.text || '').slice(0, 400)}`)
    .join('\n');
  const langInstruction = replyLanguageLine(lang);
  const prompt = [
    'You are a Singapore F&B research assistant. The user has typed a free-text query about food, drinks, ingredients, or kitchen tools. Classify the user\'s intent and return a single-line JSON object.',
    '',
    'POSSIBLE INTENTS:',
    '- "dish": user named a specific dish (e.g. "goulash with dumpling", "pad thai", "khao soi", "carbonara").',
    '- "ingredient": user named an ingredient (e.g. "burrata", "uni", "wagyu", "cold-pressed coconut milk").',
    '- "tool": user named a kitchen tool / cooking technique / cooking method (e.g. "wood-fired oven", "robata grill", "sous vide", "braising", "braisage" (FR), "rôtisserie" (FR), "sauter" (FR), "tandoor", "smoking", "flambé", "omakase", "teppanyaki", "char siu method", "wok hei"). Even SINGLE-WORD foreign-language technique names belong here — do NOT mark them ambiguous. ALWAYS populate `why` with a one-sentence plain-English explanation of what the technique does.',
    '- "venue": user named a specific F&B venue — a restaurant, café, bar, bakery, kopitiam, hawker centre, or food court (e.g. "Burnt Ends", "Newton Food Centre", "Tiong Bahru Bakery", "PS Cafe", "Lau Pa Sat", "Wok Hey"). Use this for proper-noun place names of eateries even when they contain NO dish word. Prefer "venue" over "ambiguous" whenever the text plausibly names an eating place.',
    '- "ambiguous": the query is too short, contradictory, off-topic, or could mean multiple things; you cannot confidently classify. NEVER use this for known cooking techniques in any language, nor for plausible venue names.',
    '',
    'WHEN A DISH IS NAMED:',
    '- Identify the dish\'s most likely culinary origin even if other-cuisine modifiers are present. "Goulash with dumpling" → Hungarian (NOT Chinese — goulash is the dish, dumpling is the side). "Pad Thai with shrimp" → Thai.',
    '- Map the origin to the closest catalogue cuisine. Catalogue includes: Singaporean, Peranakan, Malaysian, Indonesian, Thai, Filipino, Vietnamese, Japanese, Chinese, Korean, Taiwanese, American, Mexican, Brazilian, Australian, New Zealand, Australasia, Burmese, Sichuan, Shanghainese, Cantonese, Hunan, Hokkien, Teochew, Hainanese, Hakka, Northeastern, Northwestern, Hong Kong, Macau, Bengali, Gujarati, Nepalese, Sri Lankan, Pakistani, South Indian, North Indian, European, Mediterranean, Italian, Spanish, Greek, French, British, German, Austrian, Swiss, Portuguese, Russian, Ukrainian, Polish, Scandinavian, Slavic, Lebanese, Turkish, Persian, Moroccan, Egyptian, Israeli, Uzbek, Georgian, African, South African, Argentinian, Eurasian, Eastern European, Dessert, Fusion.',
    '- If origin is European but not in the catalogue (Hungarian, Czech, Slovak, etc.), use "European".',
    '',
    'WHEN AMBIGUOUS:',
    '- Suggest the most likely interpretation politely. Example: user typed "cold drink" → "Could you tell me a bit more? Are you thinking iced tea, kopi peng, smoothies, or something stronger like a cocktail?"',
    '',
    'WHEN A VENUE IS NAMED:',
    '- searchTerm is the venue name plus "Singapore" (e.g. "Burnt Ends Singapore", "Newton Food Centre Singapore"). cuisine is the catalogue cuisine if obvious from the name, else null. why is a short note that it is an F&B venue.',
    '',
    'OUTPUT JSON SHAPE (single line, no markdown):',
    '{"intent":"dish|ingredient|tool|venue|ambiguous","cuisine":"<catalogue name OR null>","searchTerm":"<Places textQuery suitable for searchText: \'goulash restaurant Singapore\', \'tandoor indian restaurant Singapore\', \'Burnt Ends Singapore\', etc. — or empty string when ambiguous>","why":"<one sentence explaining the cooking method, ingredient origin, dish backstory, or that it is an F&B venue — or empty string when ambiguous>","clarify":"<polite clarifying question — empty string when not ambiguous>"}',
    '',
    'IMPORTANT:',
    '- Plain JSON only. No markdown fences. No backticks. No prose outside the JSON.',
    '- Use double quotes throughout.',
    '- ' + langInstruction,
    '',
    histLines ? `RECENT CONVERSATION:\n${histLines}\n` : '',
    `USER\'s LATEST QUERY: ${String(text || '').slice(0, 600)}`
  ].filter(Boolean).join('\n');
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  const genAI = factory();
  // Try the requested model first, then walk the fallback chain.
  // De-duplicate so we don't retry the same model twice.
  const candidates = [model, ...SEARCH_INTENT_MODEL_CHAIN].filter((v, i, a) => a.indexOf(v) === i);
  let parsed = null;
  let lastErr = null;
  for (const candidate of candidates) {
    try {
      const m = genAI.getGenerativeModel({ model: candidate });
      const r = await m.generateContent(prompt);
      require('./api-cost').recordGeminiUsage(redis, candidate, r?.response?.usageMetadata);
      // SDK 0.24.x throws from response.text() if finishReason is
      // SAFETY/RECITATION/OTHER — guard explicitly so a blocked
      // response on one model doesn't kill the whole call.
      let raw = '';
      try { raw = r?.response?.text?.() || ''; }
      catch (textErr) {
        const fr = r?.response?.candidates?.[0]?.finishReason;
        console.warn(`[Search-Intent] ${candidate} text() threw (finishReason=${fr || 'unknown'}): ${textErr.message}`);
        lastErr = textErr;
        continue;
      }
      const cleaned = String(raw).trim().replace(/^```json\s*|```$/g, '').trim();
      if (!cleaned) {
        console.warn(`[Search-Intent] ${candidate} returned empty text — trying next model.`);
        continue;
      }
      try {
        parsed = JSON.parse(cleaned);
        break;
      } catch (parseErr) {
        console.warn(`[Search-Intent] ${candidate} returned non-JSON: ${cleaned.slice(0, 120)}`);
        lastErr = parseErr;
        continue;
      }
    } catch (err) {
      console.warn(`[Search-Intent] ${candidate} generateContent failed: ${err.message}`);
      lastErr = err;
      continue;
    }
  }
  // Every model failed — fall back to the dictionaries, then to a
  // graceful ambiguous prompt. NEVER throw.
  if (!parsed) {
    // v0.59.58 (codex P2 follow-up): dish dictionary runs FIRST so
    // specific multi-word dish queries like "duck confit" and
    // "tandoori chicken" keep their pre-existing dish entries
    // instead of being reclassified as the broader "confit" /
    // "tandoor" technique. Standalone technique words ("tandoor",
    // "braisage", "sous vide") still hit the technique entry on
    // the second pass because no dish entry contains them as a
    // substring.
    const hit = dishFallback(text);
    if (hit) {
      console.log(`[Search-Intent] dish-fallback hit for "${String(text).slice(0, 60)}" → ${hit.cuisine}`);
      // v0.59.56 / codex P2: use the canonical dish phrase (match[0])
      // not just the first user token, so "Beef bourguignon" searches
      // "beef bourguignon restaurant Singapore" not "Beef restaurant
      // Singapore". Same fix on both fallback exits.
      return {
        intent: 'dish',
        cuisine: hit.cuisine,
        searchTerm: `${hit.match[0]} restaurant Singapore`,
        why: hit.why,
        clarify: ''
      };
    }
    const techHit = techniqueFallback(text);
    if (techHit) {
      console.log(`[Search-Intent] technique-fallback hit for "${String(text).slice(0, 60)}" → ${techHit.match[0]}`);
      // v0.60.0: legacy return shape (cuisine + searchTerm) maintained
      // so callers that don't yet route through fan-out keep working.
      // handleSearchTurn now re-derives the technique entry and runs
      // tier-grouped fan-out for `tool` intent — see runTechniqueFanOut.
      return {
        intent: 'tool',
        cuisine: techHit.defaultOrigin || null,
        searchTerm: `${techHit.originDish} restaurant Singapore`,
        why: techHit.why,
        clarify: ''
      };
    }
    // v0.62.x — FAIL OPEN on a total classifier outage. Previously this
    // returned 'ambiguous', which the chat handler treats as "decline" — so a
    // transient Gemini 503 (high demand) silently refused EVERY non-dictionary
    // food search. Treat an outage as a dish search on the raw text instead:
    // the worst case is a non-food query slips through during an outage, far
    // better than blocking all real searches. (A genuine LLM-returned
    // 'ambiguous' from a SUCCESSFUL classify still declines, as intended.)
    console.warn(`[Search-Intent] all models + dictionary failed for "${String(text).slice(0, 60)}" — FAILING OPEN to dish search. lastErr=${lastErr?.message}`);
    parsed = {
      intent: 'dish',
      cuisine: null,
      searchTerm: String(text || '').trim(),
      why: '',
      clarify: '',
      degraded: true // classifier outage — caller may show a throttled "busy" notice
    };
  }
  return {
    intent: ['dish', 'ingredient', 'tool', 'venue', 'ambiguous'].includes(parsed.intent) ? parsed.intent : 'ambiguous',
    cuisine: typeof parsed.cuisine === 'string' && parsed.cuisine.length ? parsed.cuisine : null,
    searchTerm: String(parsed.searchTerm || '').slice(0, 200),
    why: String(parsed.why || '').slice(0, 400),
    clarify: String(parsed.clarify || '').slice(0, 400)
  };
}

// v0.60.208 — describe a cooking method / food category for the /s
// cooking-method fan-out card. The COOKING_METHODS dictionary in
// cooking-methods.js only stores bare method-name strings (no
// description, no example dish), so the fan-out header used to read
// "🔧 French · En Croute" and the per-venue "Try" line echoed the
// method name itself ("Try En Croute") — operator-flagged as wrong
// (a method is not a dish).
//
// Returns: { explainer, exampleDish }
//   explainer  — one sentence: what the method is + an example + the
//                cuisine it belongs to. Empty string on any failure.
//   exampleDish — a single well-known dish made with this method
//                 (e.g. "Beef Wellington" for en croute). Empty
//                 string when the method has no signature dish or on
//                 failure — the caller then omits the "Try" line.
//
// Best-effort: never throws. Every failure path returns empty strings
// so the card still renders (just without the explainer / Try line).
async function describeCookingMethod({ term, cuisineLabel, lang = 'en', model = DEFAULT_MODEL, redis, _genAIFactory } = {}) {
  const empty = { explainer: '', exampleDish: '' };
  const cleanTerm = String(term || '').trim();
  if (!cleanTerm) return empty;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return empty;
  const langInstruction = proseLanguageLine(lang, 'explainer', 'exampleDish');
  const prompt = [
    'You are a Singapore F&B research assistant. The user searched for a cooking method / cooking technique / food category.',
    `METHOD: "${cleanTerm}"`,
    `ASSOCIATED CUISINE: ${cuisineLabel || 'unspecified'}`,
    '',
    'Return a single-line JSON object:',
    '{"explainer":"<one plain sentence: what the method is, one example dish, and which cuisine it belongs to>","exampleDish":"<one well-known dish made with this method, or empty string if the method has no single signature dish>"}',
    '',
    'RULES:',
    '- "explainer" is ONE sentence. Mention a concrete example dish and the cuisine. E.g. for "en croute": "En croûte is the French technique of baking meat or fish wrapped in pastry, as in Beef Wellington."',
    '- "exampleDish" must be an actual dish or dessert name — never the method name itself. If no single dish is emblematic, return "".',
    '- Plain JSON only. No markdown fences. No prose outside the JSON. Double quotes throughout.',
    '- ' + langInstruction
  ].join('\n');
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  let genAI;
  try { genAI = factory(); } catch { return empty; }
  const candidates = [model, ...SEARCH_INTENT_MODEL_CHAIN].filter((v, i, a) => a.indexOf(v) === i);
  for (const candidate of candidates) {
    try {
      const m = genAI.getGenerativeModel({ model: candidate });
      const r = await m.generateContent(prompt);
      require('./api-cost').recordGeminiUsage(redis, candidate, r?.response?.usageMetadata);
      let raw = '';
      try { raw = r?.response?.text?.() || ''; } catch { continue; }
      const cleaned = String(raw).trim().replace(/^```json\s*|```$/g, '').trim();
      if (!cleaned) continue;
      const parsed = JSON.parse(cleaned);
      return {
        explainer: String(parsed.explainer || '').slice(0, 300),
        exampleDish: String(parsed.exampleDish || '').slice(0, 80)
      };
    } catch (err) {
      console.warn(`[Describe-Method] ${candidate} failed: ${err.message}`);
      continue;
    }
  }
  return empty;
}

// v0.60.225 — batched dish/dessert extraction for the Cuisine TMA
// `🍲 Try ·` line. Operator: the line must carry a genuine dish or
// dessert name drawn from the venue's higher-rated Google reviews
// (4–5★, "5 stars rotated down to 3.5 minimum"). One batched call
// per search — every result venue in a single prompt — keeps the
// cost/latency of the otherwise LLM-free /api/cuisine/search path
// to a single Gemini Flash request. The caller (index.js) falls
// back to the review-text regex when this returns nothing for a
// venue, and hides the row when both are empty.
//
// Returns a Map<venueId, string[]> — only venues with at least one
// extracted dish appear in the Map.
async function extractDishesFromReviews({ venues = [], model = DEFAULT_MODEL, redis, _genAIFactory } = {}) {
  const out = new Map();
  const usable = (Array.isArray(venues) ? venues : [])
    .filter((v) => v && typeof v.id === 'string' && Array.isArray(v.reviews) && v.reviews.length);
  if (!usable.length) return out;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return out;
  const blocks = usable.map((v, i) => {
    const reviews = v.reviews
      .slice()
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 6)
      .map((r) => `  - (${Number(r.rating) || '?'}★) ${String(r.text || '').replace(/\s+/g, ' ').trim().slice(0, 400)}`)
      .join('\n');
    return `VENUE ${i} | id="${v.id}" | name="${String(v.name || '').slice(0, 80)}"\n${reviews}`;
  }).join('\n\n');
  const prompt = [
    'You are a Singapore F&B research assistant. Below are restaurants, each with recent 4–5 star Google reviews.',
    'For each venue, extract up to 3 specific dish or dessert NAMES that reviewers actually praised or recommended.',
    '',
    blocks,
    '',
    'Return a single-line JSON array, one object per venue:',
    '[{"id":"<venue id>","dishes":["<dish name>", ...]}]',
    '',
    'RULES:',
    '- Each "dishes" entry must be a real, specific dish or dessert name (e.g. "Chilli Crab", "Durian Souffle") — never a category word ("desserts", "mains", "food"), never the restaurant name, never a sentence fragment.',
    '- Only include dishes the reviews genuinely mention. If a venue has no dish worth naming, return an empty "dishes" array for it.',
    '- Up to 3 dishes per venue, most-praised first.',
    '- Plain JSON only. No markdown fences. No prose outside the JSON. Double quotes throughout.'
  ].join('\n');
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  let genAI;
  try { genAI = factory(); } catch { return out; }
  const candidates = [model, ...SEARCH_INTENT_MODEL_CHAIN].filter((v, i, a) => a.indexOf(v) === i);
  // v0.60.226 — latency guard for the Cuisine TMA search path. A
  // timeout means Gemini itself is slow, not that the model is bad,
  // so a timeout STOPS the chain rather than retrying the next model
  // (which would just stack another timeout — the old 8s × 3 chain
  // could block a search for ~24s). Other errors (model-not-found,
  // parse failure) still fall through to the next model. DEADLINE
  // bounds the total even across that fall-through path.
  //
  // v0.62.711 — 6000ms was observed timing out in production on an
  // otherwise-healthy request (dishes=6009ms in the enrichSlow timing
  // log — the attempt lost the race by ~9ms). Raised to 10000ms for
  // headroom.
  //
  // DEADLINE only went to 14000ms, not further, because this function is
  // one step inside enrichSlow, which is itself one step inside the
  // search route's own hard 20s ceiling (index.js's _SEARCH_DEADLINE_MS /
  // "D706" — see its comments on the operator complaints it exists to
  // prevent). enrichSlow also runs crowd-signal, translate, review-cache,
  // travel, sanctuary, and footfall enrichment around this call — a
  // dish-extraction DEADLINE anywhere near 20000ms would let this ONE
  // step alone consume the entire route budget and starve everything
  // else. 14000ms keeps this function's own worst case comfortably under
  // half the route ceiling. A timeout itself is still terminal (see
  // comment above) and was never retried at any PER_ATTEMPT_MS value —
  // this raise buys the single attempt more time to succeed before
  // giving up; it does not change the give-up behaviour.
  const PER_ATTEMPT_MS = 10_000;
  const DEADLINE = Date.now() + 14_000;
  for (const candidate of candidates) {
    if (Date.now() > DEADLINE) break;
    try {
      const m = genAI.getGenerativeModel({ model: candidate });
      const r = await Promise.race([
        m.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => {
          const e = new Error(`per-attempt timeout ${PER_ATTEMPT_MS / 1000}s`);
          e.isTimeout = true;
          reject(e);
        }, PER_ATTEMPT_MS))
      ]);
      require('./api-cost').recordGeminiUsage(redis, candidate, r?.response?.usageMetadata);
      let raw = '';
      try { raw = r?.response?.text?.() || ''; } catch { continue; }
      const cleaned = String(raw).trim().replace(/^```json\s*|```$/g, '').trim();
      if (!cleaned) continue;
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) continue;
      for (const row of parsed) {
        if (!row || typeof row.id !== 'string') continue;
        const dishes = Array.isArray(row.dishes)
          ? row.dishes.map((d) => String(d || '').trim()).filter(Boolean).slice(0, 3)
          : [];
        if (dishes.length) out.set(row.id, dishes);
      }
      return out;
    } catch (err) {
      console.warn(`[Extract-Dishes] ${candidate} failed: ${err.message}`);
      if (err && err.isTimeout) break;
      continue;
    }
  }
  return out;
}

module.exports = {
  generateGroundedHiddenGems,
  generateGroundedHiddenGemsClaude,
  classifySearchIntent,
  describeCookingMethod,
  extractDishesFromReviews,
  dishFallback,
  techniqueFallback,
  lookupTechnique,
  resolveOrigin,
  canonicalDishPhrase,
  validateAuthenticity,
  disambiguateTerm,
  DISH_FALLBACK,
  TECHNIQUE_FALLBACK,
  AMBIGUOUS_DISHES,
  PARENT_CUISINES,
  findParentCuisine,
  buildHiddenGemsPrompt,
  todaySGT,
  searchToolForModel,
  HIDDEN_GEMS_PROMPT_TEMPLATE,
  DEFAULT_MODEL
};
