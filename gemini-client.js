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
  'A place qualifies if it meets AT LEAST TWO of the following:',
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
  'Criteria met: [Cx, Cy, Cz]',
  'Confidence: HIGH | MEDIUM | LOW',
  'Why a gem: one concrete sentence citing a specific signal, such as review pattern, blog detail, dish detail, opening signal, or social-buzz signal.',
  'Order this: one signature item only.',
  'Google Map URL: raw full URL.',
  'Sources:',
  '- Raw full URL 1',
  '- Raw full URL 2',
  '- Raw full URL 3',
  '',
  'IMPORTANT OUTPUT RULES:',
  '- Show raw full URLs, not hidden markdown links.',
  '- At least one source must be a non-aggregator blog, Instagram post, TikTok post, or news article.',
  '- Do not fabricate ratings, addresses, opening dates, review counts, opening hours, Google Map links, or source links.',
  '- If a number is unverifiable, write "unverified".',
  '- If the place only meets one criterion, exclude it.',
  '- If fewer than 3 places qualify, say so plainly and list what was filtered out and why.',
  '- Never use vague phrases like "great vibes", "must try", "popular spot", or "worth checking out".',
  '- Use Singapore English.',
  '- Keep the tone neutral.',
  '- No exclamation marks.',
  '- No emojis.',
  '- No marketing language.'
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

// Default model. v0.58.32: switched 'gemini-2.0-flash-exp' → 'gemini-1.5-pro'.
// Gemini 2.0 renamed the search-grounding tool from `googleSearchRetrieval`
// (1.5) to `googleSearch` — using the 1.5 tool name on a 2.0 model causes
// an immediate 400 INVALID_ARGUMENT, which the user surfaced as "/hidden
// hit a backend snag" returning in <1 s. gemini-1.5-pro is the documented
// stable pairing for `googleSearchRetrieval` and matches the spec template
// the user supplied. GEMINI_MODEL env var still overrides.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

// v0.58.33: Gemini renamed the search-grounding tool between major
// versions. 1.x uses `googleSearchRetrieval`; 2.x and later (2.0,
// 2.5, future 3.x) use `googleSearch`. Picking the wrong name for
// the model produces an immediate 400 INVALID_ARGUMENT — that's
// what the user hit when they set GEMINI_MODEL=gemini-2.5-flash.
function searchToolForModel(model) {
  // Match "gemini-N…" where N >= 2.
  if (/^gemini-([2-9]|\d{2,})/i.test(String(model || ''))) {
    return { googleSearch: {} };
  }
  return { googleSearchRetrieval: {} };
}

async function generateGroundedHiddenGems({
  anchor,
  todayIsoSGT,
  model = DEFAULT_MODEL,
  maxRetries = 1,
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
  // v0.58.33: tool-name selection by model version. Also: if the
  // first attempt fails with INVALID_ARGUMENT, retry once with the
  // OPPOSITE tool name as a defence against undocumented per-model
  // quirks (the API has been moving fast).
  const primaryTool = searchToolForModel(model);
  const fallbackTool = primaryTool.googleSearch ? { googleSearchRetrieval: {} } : { googleSearch: {} };
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const tool = (attempt === 0) ? primaryTool : fallbackTool;
    const toolName = Object.keys(tool)[0];
    try {
      const m = genAI.getGenerativeModel({ model, tools: [tool] });
      const r = await m.generateContent(prompt);
      const text = (r.response && typeof r.response.text === 'function') ? r.response.text() : '';
      if (!text || !text.trim()) throw new Error('empty response from Gemini');
      return { text, prompt, model, tool: toolName };
    } catch (err) {
      lastErr = err;
      // Surface enough detail in Railway logs to diagnose the common
      // failure modes — bad model name (404), unsupported tool for
      // the model (400 INVALID_ARGUMENT), API key 401, quota 429.
      const status = err?.status || err?.errorDetails?.[0]?.['@type'] || '';
      const detail = err?.errorDetails ? JSON.stringify(err.errorDetails).slice(0, 400) : '';
      console.warn(
        `[gemini-client] attempt ${attempt + 1}/${maxRetries + 1} failed ` +
        `model=${model} tool=${toolName} status=${status} msg=${err.message}` +
        `${detail ? ` detail=${detail}` : ''}`
      );
    }
  }
  throw lastErr || new Error('gemini-client: exhausted retries');
}

module.exports = {
  generateGroundedHiddenGems,
  buildHiddenGemsPrompt,
  todaySGT,
  searchToolForModel,
  HIDDEN_GEMS_PROMPT_TEMPLATE,
  DEFAULT_MODEL
};
