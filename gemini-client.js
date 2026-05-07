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
  '- Opened in the last 4 months.',
  '- Google rating >= 4.0.',
  '- If Google rating is not verifiable, write "Google rating: unverified" and do not count C1.',
  '',
  'C2 SOCIAL_BUZZ',
  '- Covered in a Singapore food blog, Instagram post, TikTok post, or news article in the last 3 months.',
  '- At least one source must be a non-aggregator source, such as Eatbook, HungryGoWhere, SethLui, DanielFoodDiary, Time Out Singapore, 8days, CNA Lifestyle, The Ranting Panda, Honeycombers, Rubbish Eat Rubbish Grow, or the establishment\'s own Instagram post.',
  '- Avoid relying only on generic listicle round-ups.',
  '',
  'C3 UNDERREVIEWED',
  '- Google rating >= 4.0.',
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
  '- Places with more than 300 Google reviews UNLESS C1 fires (newly opened in the last 4 months). 300+ reviews means the venue is already widely known — not hidden — regardless of buzz or unique offering.',
  '- Anything rated below 4.0.',
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
  'Return up to 8 results. Aim for at least 5 if the criteria gate yields enough qualifying venues.',
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
  '🍴 Try · top FOOD dishes only — never drinks. If Google reviews mention 4+ distinct dishes, list 5; otherwise list 3. Comma-separated. EXCLUDE all drinks: kopi, teh, teh tarik, milo, bandung, coffee, latte, cappuccino, espresso, mocha, americano, flat white, cold brew, iced tea, bubble tea, boba, milk tea, smoothies, juices, lemonade, soda, beer, wine, cocktails, whisky, sake, soju, mojito, margarita, etc.',
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
  '- Translate the fixed labels: "Address" → "Adresse", "🕒 Opening hours" → "🕒 Horaires", "🌟 Google rating ·" → "🌟 Note Google ·", "📝 Latest rating/review ·" → "📝 Dernier avis ·", "💎 Why a gem ·" → "💎 Pourquoi un trésor ·", "🍴 Try ·" → "🍴 Essayez ·". For the Google Map URL line, keep the 📍 emoji prefix and the raw URL only — no label.',
  '- Keep iconic Singapore dish names in their original form (laksa, char kway teow, kopi-o, kaya toast, mee siam, satay, hokkien mee, popiah, rojak, prata, roti john, nasi lemak, otah, kueh, chendol, ice kachang, kway teow, char siew, teh tarik). Translate the surrounding prose (e.g. "stall réputée pour son laksa onctueux").',
  '- Keep proper nouns (venue names, neighbourhoods, MRT stations) untranslated.',
  '- Keep URLs verbatim — do not translate or modify the Google Maps URL.',
  '- Use a comma as decimal separator in numbers ("4,6" not "4.6") and "km" with a space ("1,2 km") per French conventions.',
  '- Use French connectors and structure (au sud-ouest de, à proximité de, ouvert en mars 2026).',
  '- The "place qualifies if…" criteria gate, EXCLUDE list, RANKING, and OUTPUT FORMAT instructions stay in English internally — they are for your reasoning, not for the user. Only the final output text (one block per result) is in French.'
].join('\n');

// v0.59.31 — radiusBand opt. Default ('1km to 3km') matches the
// existing GPS-anchored /hidden behaviour. Free-text /hidden mode
// passes '200m to 3km' to widen recall around a user-specified
// street/building/MRT.
function buildHiddenGemsPrompt({ anchorName, googleMapsUrl, todayIsoSGT, lang = 'en', radiusBand = '1km to 3km', radiusLower = '1km', radiusUpper = '3km' }) {
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
  return lang === 'fr' ? `${base}\n${HIDDEN_GEMS_LOCALISATION_FR}` : base;
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
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
const FALLBACK_CHAIN = [
  { model: 'gemini-flash-latest',     tool: { googleSearch: {} } },
  { model: 'gemini-2.5-flash',        tool: { googleSearch: {} } },
  { model: 'gemini-2.5-flash-lite',   tool: { googleSearch: {} } }
];

async function generateGroundedHiddenGems({
  anchor,
  todayIsoSGT,
  model = DEFAULT_MODEL,
  lang = 'en',
  // v0.59.31 — radius-band overrides for free-text /hidden mode.
  radiusBand,
  radiusLower,
  radiusUpper,
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
  //   4. gemini-2.0-flash   + googleSearch          (older 2.x baseline)
  //   5. gemini-flash-latest + googleSearch         (alias — auto-routes)
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
  { match: ['confit de canard', 'duck confit'], cuisine: 'French', why: 'Duck confit is duck legs slow-cooked in their own fat.' },
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
  { match: ['beef wellington'], cuisine: 'British', why: 'Beef Wellington is a fillet of beef in pâté and puff pastry.' }
];

function dishFallback(text) {
  const lc = String(text || '').toLowerCase();
  for (const e of DISH_FALLBACK) {
    if (e.match.some((m) => lc.includes(m))) return e;
  }
  return null;
}

const SEARCH_INTENT_MODEL_CHAIN = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite'
];

async function classifySearchIntent({ text, history = [], lang = 'en', model = 'gemini-flash-latest', _genAIFactory }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) {
    // Caller-side env failure — log and return a graceful ambiguous.
    console.warn('[Search-Intent] GEMINI_API_KEY unset — falling back to dish dictionary.');
    const hit = dishFallback(text);
    if (hit) {
      return { intent: 'dish', cuisine: hit.cuisine, searchTerm: `${String(text).split(/\s+/)[0]} restaurant Singapore`, why: hit.why, clarify: '' };
    }
    return { intent: 'ambiguous', cuisine: null, searchTerm: '', why: '', clarify: lang === 'fr' ? 'Pouvez-vous préciser ?' : 'Could you tell me more about what you\'re looking for?' };
  }
  const histLines = (Array.isArray(history) ? history : [])
    .slice(-12)
    .map((h) => `${h.role === 'user' ? 'USER' : 'BOT'}: ${String(h.text || '').slice(0, 400)}`)
    .join('\n');
  const langInstruction = lang === 'fr'
    ? 'Reply in French (fr) — clarifying questions and "why" prose. Keep dish names, cuisine labels, and Places searchTerm in English.'
    : 'Reply in English (en).';
  const prompt = [
    'You are a Singapore F&B research assistant. The user has typed a free-text query about food, drinks, ingredients, or kitchen tools. Classify the user\'s intent and return a single-line JSON object.',
    '',
    'POSSIBLE INTENTS:',
    '- "dish": user named a specific dish (e.g. "goulash with dumpling", "pad thai", "khao soi", "carbonara").',
    '- "ingredient": user named an ingredient or technique (e.g. "tandoor", "binchotan", "cold-pressed coconut milk", "burrata").',
    '- "tool": user named a kitchen tool / cooking method (e.g. "wood-fired oven", "robata grill", "sous vide").',
    '- "ambiguous": the query is too short, contradictory, or could mean multiple things; you cannot confidently classify.',
    '',
    'WHEN A DISH IS NAMED:',
    '- Identify the dish\'s most likely culinary origin even if other-cuisine modifiers are present. "Goulash with dumpling" → Hungarian (NOT Chinese — goulash is the dish, dumpling is the side). "Pad Thai with shrimp" → Thai.',
    '- Map the origin to the closest catalogue cuisine. Catalogue includes: Singaporean, Peranakan, Malaysian, Indonesian, Thai, Filipino, Vietnamese, Japanese, Chinese, Korean, Taiwanese, American, Mexican, Brazilian, Australian, New Zealand, Australasia, Burmese, Sichuan, Shanghainese, Cantonese, Hunan, Hokkien, Teochew, Hainanese, Hakka, Northeastern, Northwestern, Hong Kong, Macau, Bengali, Gujarati, Nepalese, Sri Lankan, Pakistani, South Indian, North Indian, European, Mediterranean, Italian, Spanish, Greek, French, British, German, Austrian, Swiss, Portuguese, Russian, Ukrainian, Polish, Scandinavian, Slavic, Lebanese, Turkish, Persian, Moroccan, Egyptian, Israeli, Uzbek, Georgian, African, South African, Argentinian, Eurasian, Eastern European, Dessert, Fusion.',
    '- If origin is European but not in the catalogue (Hungarian, Czech, Slovak, etc.), use "European".',
    '',
    'WHEN AMBIGUOUS:',
    '- Suggest the most likely interpretation politely. Example: user typed "cold drink" → "Could you tell me a bit more? Are you thinking iced tea, kopi peng, smoothies, or something stronger like a cocktail?"',
    '',
    'OUTPUT JSON SHAPE (single line, no markdown):',
    '{"intent":"dish|ingredient|tool|ambiguous","cuisine":"<catalogue name OR null>","searchTerm":"<Places textQuery suitable for searchText: \'goulash restaurant Singapore\', \'tandoor indian restaurant Singapore\', etc. — or empty string when ambiguous>","why":"<one sentence explaining the cooking method, ingredient origin, or dish backstory — or empty string when ambiguous>","clarify":"<polite clarifying question — empty string when not ambiguous>"}',
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
  // Every model failed — fall back to the dish dictionary, then to a
  // graceful ambiguous prompt. NEVER throw.
  if (!parsed) {
    const hit = dishFallback(text);
    if (hit) {
      console.log(`[Search-Intent] fallback dictionary hit for "${String(text).slice(0, 60)}" → ${hit.cuisine}`);
      const firstWord = String(text).trim().split(/\s+/)[0];
      return {
        intent: 'dish',
        cuisine: hit.cuisine,
        searchTerm: `${firstWord} restaurant Singapore`,
        why: hit.why,
        clarify: ''
      };
    }
    console.warn(`[Search-Intent] all models + dictionary failed for "${String(text).slice(0, 60)}" — returning ambiguous. lastErr=${lastErr?.message}`);
    parsed = {
      intent: 'ambiguous',
      cuisine: null,
      searchTerm: '',
      why: '',
      clarify: lang === 'fr'
        ? 'Désolé, je n\'ai pas bien compris. Pouvez-vous me donner un nom de plat précis (par exemple : « pad thaï », « goulash ») ou un ingrédient ?'
        : 'Sorry, I didn\'t catch that. Could you give me a specific dish name (e.g. "pad thai", "goulash") or an ingredient?'
    };
  }
  return {
    intent: ['dish', 'ingredient', 'tool', 'ambiguous'].includes(parsed.intent) ? parsed.intent : 'ambiguous',
    cuisine: typeof parsed.cuisine === 'string' && parsed.cuisine.length ? parsed.cuisine : null,
    searchTerm: String(parsed.searchTerm || '').slice(0, 200),
    why: String(parsed.why || '').slice(0, 400),
    clarify: String(parsed.clarify || '').slice(0, 400)
  };
}

module.exports = {
  generateGroundedHiddenGems,
  classifySearchIntent,
  dishFallback,
  DISH_FALLBACK,
  buildHiddenGemsPrompt,
  todaySGT,
  searchToolForModel,
  HIDDEN_GEMS_PROMPT_TEMPLATE,
  DEFAULT_MODEL
};
