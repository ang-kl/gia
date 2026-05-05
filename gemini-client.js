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
  'Use Google Search grounding to find hidden food/drink gems within a 1km to 3km walking band around the anchor location.',
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
  '- Places with fewer than 8 Google reviews unless C2 fires with at least 2 independent recent mentions.',
  '- Places with more than 300 Google reviews UNLESS C1 fires (newly opened in the last 4 months). 300+ reviews means the venue is already widely known — not hidden — regardless of buzz or unique offering.',
  '- Anything rated below 4.0.',
  '- Places below 1km walking distance from the anchor.',
  '- Places above 3km walking distance from the anchor.',
  '- Places where all rating, review count, opening date, and social buzz signals are unverifiable.',
  '',
  'PRIORITISE:',
  'Independent cafes, restaurants, bakeries, dessert shops, hawker stalls, bars, coffee roasters, and specialty kiosks.',
  '',
  'RANKING:',
  'Return up to 5 results.',
  'Rank by score, with C2 SOCIAL_BUZZ and C4 UNIQUE_OFFERING carrying the most weight.',
  'Prefer:',
  '1. Strong recent non-listicle coverage.',
  '2. Clearly distinctive signature item.',
  '3. Independent or less obvious operator.',
  '4. Verified Google rating and review count.',
  '5. Walking distance comfortably within 1km to 3km.',
  '',
  'OUTPUT FORMAT:',
  'For each result, use this exact structure:',
  '',
  '1. NAME - primary type',
  'Address - approx walking distance and direction from anchor.',
  'Opening hours - if verifiable, otherwise write "unverified".',
  'Google rating - rating and review count if verifiable; otherwise write "unverified".',
  'Latest rating/review signal - date if verifiable; otherwise write "unverified".',
  'Why a gem: one concrete sentence citing a specific signal, such as review pattern, blog detail, dish detail, opening signal, or social-buzz signal.',
  'Order this: one signature item only.',
  'Google Map URL: raw full URL.',
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
  '- No emojis.',
  '- No marketing language.',
  '- Plain text only. Do not use Markdown formatting — no double-asterisk bold (**...**), no underscores for italics, no headings (#), no backticks. The Telegram client renders these as literal characters.'
].join('\n');

function buildHiddenGemsPrompt({ anchorName, googleMapsUrl, todayIsoSGT }) {
  if (!anchorName || !googleMapsUrl || !todayIsoSGT) {
    throw new Error('buildHiddenGemsPrompt: anchorName, googleMapsUrl, todayIsoSGT all required');
  }
  return HIDDEN_GEMS_PROMPT_TEMPLATE
    .replace('{{ANCHOR_NAME}}', anchorName)
    .replace('{{GOOGLE_MAPS_URL}}', googleMapsUrl)
    .replace('{{TODAY_SGT}}', todayIsoSGT);
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
    todayIsoSGT
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

module.exports = {
  generateGroundedHiddenGems,
  buildHiddenGemsPrompt,
  todaySGT,
  searchToolForModel,
  HIDDEN_GEMS_PROMPT_TEMPLATE,
  DEFAULT_MODEL
};
