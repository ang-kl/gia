// prompt-query.js — v0.44.1 hidden `/p` power-user query relay.
//
// Single-purpose module: relay a free-text prompt to one of five upstream
// APIs and return a Telegram-ready string (≤3800 chars, plain text +
// emoji, no Markdown).
//
// Usage from index.js:
//   const { runPromptQuery } = require('./prompt-query');
//   const reply = await runPromptQuery('c what is 2+2');
//   bot.sendMessage(chatId, reply);
//
// Handlers:
//   c → Claude / Anthropic       (uses ./llm-client wrapper)
//   g → Google Gemini            (raw axios, no SDK — SDK was removed in v0.40.0)
//   s → Google Custom Search     (raw axios, requires CSE setup)
//   m → Google Maps Places       (raw axios — same Places New endpoint as the rest of the bot)
//   d → Singapore data.gov.sg    (v0.44.1 — CKAN-style dataset metadata search; no API key needed)
//
// Hidden = not registered in setMyCommands. Anyone who knows the
// command can use it. Not admin-gated by chat ID — flag deferred to
// v0.44.2 if abuse is observed.
//
// CACHE GUARANTEE (v0.44.1):
// Every /p call hits the upstream live. NO Redis lookup, NO axios
// response cache, NO memoisation. The bot's response-cache.js (which
// caches /cuisine results for 30min) is NEVER touched by /p — different
// codepath entirely. Output footer "🚫 no cache · <ISO time>" makes
// freshness visible to the operator so a cached-looking response is
// recognisable as a real-time fetch. This is by design: /p exists to
// debug what providers actually return RIGHT NOW.

const axios = require('axios');
const llm = require('./llm-client');

const MAX_OUTPUT_CHARS = 3800;

const HELP = `📡 /p — power-user query relay (hidden, no cache)

Usage: /p <type> <prompt>

Type:
  c  →  Claude / Anthropic API   (default model)
  g  →  Google Gemini API
  s  →  Google Custom Search API
  m  →  Google Maps Places (text search)
  d  →  data.gov.sg (dual-mode: path or search)

Examples:
  /p c What's tomorrow in Singapore?
  /p g Latest news on Singapore F&B
  /p s michelin star restaurants singapore
  /p m halal ramen tanjong pagar
  /p d v2/real-time/api/2-hour-weather-forecast    (path mode → live data)
  /p d hawker centre                                (search mode → datasets)

Notes:
  • Every call hits the upstream live — never cached.
  • /p c and /p g get current Singapore time prepended automatically.
  • /p m URLs deep-link to Google Maps app on iOS (not Apple Maps).
  • /p d path-mode hits api-open.data.gov.sg/<path>.`;

// Visible no-cache marker appended to every (non-HELP, non-error) reply
// so the operator can see at a glance that the result is fresh, not
// served from a stale cache. ISO 8601 SGT time for unambiguous parsing.
function noCacheFooter() {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
  return `\n\n🚫 no cache · ${sgt}`;
}

function withFooter(body) {
  if (typeof body !== 'string') body = String(body ?? '');
  const footer = noCacheFooter();
  const room = MAX_OUTPUT_CHARS - footer.length;
  const trimmedBody = body.length > room ? body.slice(0, room) : body;
  return trimmedBody + footer;
}

// v0.44.2: temporal grounding for LLM calls. Without this, models say
// "I don't know what 'tomorrow' is" because they have no real-time
// concept of now. Prepend the current SGT date/time as context so
// "today", "tomorrow", "this Friday" etc. resolve correctly.
function withSgtContext(prompt) {
  const sgtNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const dateStr = sgtNow.toISOString().slice(0, 10);
  const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][sgtNow.getUTCDay()];
  const timeStr = sgtNow.toISOString().slice(11, 16);
  return `Current Singapore time: ${dateStr} (${dow}) ${timeStr} SGT.\n\n${prompt}`;
}

function trim(s) {
  if (typeof s !== 'string') return String(s ?? '');
  return s.length > MAX_OUTPUT_CHARS ? s.slice(0, MAX_OUTPUT_CHARS) : s;
}

async function viaClaude(prompt) {
  if (!llm.isReady()) {
    return '🔴 Claude: ANTHROPIC_API_KEY not set in Railway env.';
  }
  try {
    const result = await llm.generate({
      prompt: withSgtContext(prompt),
      model: llm.DEFAULT_MODEL,
      maxTokens: 2048
    });
    const text = (result.response.text() || '').trim() || '(empty response)';
    return withFooter(`🟣 Claude (${llm.DEFAULT_MODEL})\n\n${text}`);
  } catch (err) {
    return `🔴 Claude error: ${(err.message || 'unknown').slice(0, 500)}`;
  }
}

async function viaGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return '🔴 Gemini: GEMINI_API_KEY not set in Railway env.';
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const { data } = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: withSgtContext(prompt) }] }],
        generationConfig: { maxOutputTokens: 2048 }
      },
      { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
    );
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('').trim() || '(empty response)';
    return withFooter(`🔷 Gemini (${model})\n\n${text}`);
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || 'unknown';
    return `🔴 Gemini error: ${String(msg).slice(0, 500)}`;
  }
}

async function viaSearch(prompt) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cseId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !cseId) {
    return '🔴 Google Search: set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in Railway. Create a Programmable Search Engine at https://programmablesearchengine.google.com and an API key at https://console.cloud.google.com/apis/credentials.';
  }
  try {
    const { data } = await axios.get(
      'https://www.googleapis.com/customsearch/v1',
      {
        params: { key: apiKey, cx: cseId, q: prompt, num: 5 },
        timeout: 10000
      }
    );
    const items = data?.items || [];
    if (!items.length) return withFooter(`🔍 Google Search\n\n(no results for "${prompt}")`);
    const lines = items.slice(0, 5).map((it, i) => {
      const title = (it.title || '(no title)').trim();
      const link = (it.link || '').trim();
      const snippet = (it.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      return `${i + 1}. ${title}\n   ${link}${snippet ? `\n   ${snippet}` : ''}`;
    });
    return withFooter(`🔍 Google Search — "${prompt}"\n\n${lines.join('\n\n')}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || 'unknown';
    return `🔴 Google Search error: ${status ? `HTTP ${status} — ` : ''}${String(msg).slice(0, 500)}`;
  }
}

async function viaMaps(prompt) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return '🔴 Google Maps: GOOGLE_MAPS_API_KEY not set in Railway env.';
  }
  try {
    const { data } = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: prompt,
        maxResultCount: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.rating',
            'places.userRatingCount',
            // v0.44.2: request googleMapsLinks (the place_id-explicit
            // deep-link) in addition to googleMapsUri (the cid-based URL).
            // googleMapsLinks.placeUri reliably opens in Google Maps app
            // via iOS Universal Links; the cid URL sometimes routes to
            // Apple Maps depending on iOS settings.
            'places.googleMapsUri',
            'places.googleMapsLinks',
            'places.primaryType',
            'places.businessStatus',
            'places.currentOpeningHours.openNow'
          ].join(',')
        },
        timeout: 10000
      }
    );
    const places = data?.places || [];
    if (!places.length) return withFooter(`📍 Google Maps Places\n\n(no places for "${prompt}")`);
    const lines = places.map((p, i) => {
      const name = p.displayName?.text || '(no name)';
      const rating = p.rating != null ? `${p.rating}★ (${p.userRatingCount || 0})` : 'unrated';
      const status = p.businessStatus && p.businessStatus !== 'OPERATIONAL' ? ` [${p.businessStatus}]` : '';
      const open = p.currentOpeningHours?.openNow === true ? ' · open now'
                : p.currentOpeningHours?.openNow === false ? ' · closed'
                : '';
      const type = p.primaryType || 'place';
      const addr = p.formattedAddress || '';
      // v0.44.2: prefer placeUri (place_id deep-link, opens Google Maps app)
      // over googleMapsUri (cid URL, sometimes opens Apple Maps on iOS).
      const url = p.googleMapsLinks?.placeUri || p.googleMapsUri || (p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : '');
      return `${i + 1}. ${name}${status}\n   ${rating} · ${type}${open}\n   ${addr}${url ? `\n   ${url}` : ''}`;
    });
    return withFooter(`📍 Google Maps Places — "${prompt}"\n\n${lines.join('\n\n')}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || 'unknown';
    return `🔴 Google Maps error: ${status ? `HTTP ${status} — ` : ''}${String(msg).slice(0, 500)}`;
  }
}

// v0.44.2: data.gov.sg dual-mode handler.
//
// The CKAN-style endpoint used in v0.44.1 (data.gov.sg/api/action/
// package_search) returns 404 in production — the platform migrated
// off the CKAN API. v0.44.2 pivots to two modes:
//
//   PATH MODE (recommended for power users):
//     /p d v2/real-time/api/2-hour-weather-forecast
//     /p d v2/real-time/api/air-temperature
//     /p d v2/real-time/api/rainfall
//     /p d v1/transport/carpark-availability
//     /p d /v2/real-time/api/...   (leading slash optional)
//   → fetches JSON from api-open.data.gov.sg/<path>, returns
//     pretty-printed (truncated to fit Telegram).
//
//   SEARCH MODE (free text, no API path):
//     /p d hawker
//     /p d weather forecast
//   → tries the v2 catalog search at
//     api-production.data.gov.sg/v2/public/api/datasets/search-datasets?query=<q>
//     If 404 (catalog API may also be unstable), returns a hint pointing
//     the user at the data.gov.sg website + suggesting path-mode usage.
//
// Heuristic: if the query starts with `v\d+/` or `/v\d+/`, treat as
// path. Otherwise treat as search.

const PATH_MODE_RE = /^\/?v\d+\//i;
const DATA_GOV_OPEN_BASE = 'https://api-open.data.gov.sg';
const DATA_GOV_CATALOG_SEARCH = 'https://api-production.data.gov.sg/v2/public/api/datasets/search-datasets';

async function viaDataGovSgPath(rawPath) {
  const path = rawPath.replace(/^\/+/, '');
  const url = `${DATA_GOV_OPEN_BASE}/${path}`;
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    const pretty = JSON.stringify(data, null, 2);
    return withFooter(`🇸🇬 data.gov.sg [PATH] /${path}\n\n${pretty}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message
              || err.response?.data?.error?.message
              || err.message
              || 'unknown';
    return `🔴 data.gov.sg path error: ${status ? `HTTP ${status} — ` : ''}${String(msg).slice(0, 500)}\n\nTried: ${url}\n\nKnown working paths:\n  v2/real-time/api/2-hour-weather-forecast\n  v2/real-time/api/air-temperature\n  v2/real-time/api/rainfall\n  v2/real-time/api/24-hour-weather-forecast\n  v2/real-time/api/4-day-weather-forecast`;
  }
}

async function viaDataGovSgSearch(prompt) {
  try {
    const { data } = await axios.get(
      DATA_GOV_CATALOG_SEARCH,
      {
        params: { query: prompt },
        timeout: 10000
      }
    );
    // The v2 catalog API is undocumented publicly; the response shape
    // may differ. Defensive: try several likely keys.
    const datasets = data?.data?.datasets
                  || data?.datasets
                  || data?.results
                  || (Array.isArray(data) ? data : []);
    if (!Array.isArray(datasets) || !datasets.length) {
      return withFooter(`🇸🇬 data.gov.sg [SEARCH] — "${prompt}"\n\n(no datasets — or the v2 catalog API shape changed)\n\nTry path mode instead:\n  /p d v2/real-time/api/2-hour-weather-forecast\n  /p d v2/real-time/api/air-temperature\nOr browse https://data.gov.sg/datasets`);
    }
    const lines = datasets.slice(0, 5).map((r, i) => {
      const title = (r.name || r.title || r.datasetName || '(untitled)').toString().trim();
      const id = r.datasetId || r.id || r.slug || '';
      const url = id ? `https://data.gov.sg/datasets/${id}` : '';
      const desc = (r.description || r.notes || '').toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      return `${i + 1}. ${title}${url ? `\n   ${url}` : ''}${desc ? `\n   ${desc}` : ''}`;
    });
    return withFooter(`🇸🇬 data.gov.sg [SEARCH] — "${prompt}"\n\n${lines.join('\n\n')}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message
              || err.response?.data?.error?.message
              || err.message
              || 'unknown';
    // Search API is unstable; helpful fallback message.
    return `🔴 data.gov.sg search error: ${status ? `HTTP ${status} — ` : ''}${String(msg).slice(0, 300)}\n\nThe v2 catalog search API is undocumented and unstable. Use PATH mode instead:\n  /p d v2/real-time/api/2-hour-weather-forecast\n  /p d v2/real-time/api/air-temperature\n  /p d v2/real-time/api/rainfall\n  /p d v1/transport/carpark-availability\n\nOr browse https://data.gov.sg/datasets to find dataset paths.`;
  }
}

async function viaDataGovSg(prompt) {
  if (PATH_MODE_RE.test(prompt)) {
    return viaDataGovSgPath(prompt);
  }
  return viaDataGovSgSearch(prompt);
}

const HANDLERS = { c: viaClaude, g: viaGemini, s: viaSearch, m: viaMaps, d: viaDataGovSg };

async function runPromptQuery(rawArgs) {
  const args = String(rawArgs || '').trim();
  if (!args || args === 'help' || args === '?') return HELP;

  const parts = args.match(/^([cgsmd])(?:\s+(.+))?$/i);
  if (!parts) {
    return `❓ Unknown type. Use one of: c (Claude), g (Gemini), s (Search), m (Maps), d (data.gov.sg).\n\n${HELP}`;
  }
  const provider = parts[1].toLowerCase();
  const query = (parts[2] || '').trim();
  if (!query) {
    return `❓ Missing prompt after "${provider}".\n\n${HELP}`;
  }
  const handler = HANDLERS[provider];
  if (!handler) {
    return `❓ Unknown type "${provider}".\n\n${HELP}`;
  }
  return handler(query);
}

module.exports = {
  runPromptQuery,
  viaClaude,
  viaGemini,
  viaSearch,
  viaMaps,
  viaDataGovSg,
  viaDataGovSgPath,
  viaDataGovSgSearch,
  HELP,
  MAX_OUTPUT_CHARS,
  noCacheFooter,
  withFooter,
  withSgtContext,
  PATH_MODE_RE
};
