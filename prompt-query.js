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
  d  →  data.gov.sg dataset search

Examples:
  /p c What is the meaning of life?
  /p g Latest news on Singapore F&B
  /p s michelin star restaurants singapore
  /p m halal ramen tanjong pagar
  /p d hawker centre

Every call hits the upstream live — never cached.`;

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
      prompt,
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
        contents: [{ parts: [{ text: prompt }] }],
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
            'places.displayName',
            'places.formattedAddress',
            'places.rating',
            'places.userRatingCount',
            'places.googleMapsUri',
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
      const url = p.googleMapsUri || '';
      return `${i + 1}. ${name}${status}\n   ${rating} · ${type}${open}\n   ${addr}${url ? `\n   ${url}` : ''}`;
    });
    return withFooter(`📍 Google Maps Places — "${prompt}"\n\n${lines.join('\n\n')}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || 'unknown';
    return `🔴 Google Maps error: ${status ? `HTTP ${status} — ` : ''}${String(msg).slice(0, 500)}`;
  }
}

// v0.44.1: data.gov.sg dataset metadata search via the CKAN-style
// public API. No API key required for metadata reads. Returns up to 5
// matching datasets with title, organization, dataset URL, and a short
// description snippet.
//
// Endpoint chosen: data.gov.sg/api/action/package_search — stable,
// CKAN-standard, returns deterministic JSON shape. Newer v2 portal
// APIs exist but lack a stable public search endpoint at the time of
// writing (v0.44.1).
async function viaDataGovSg(prompt) {
  try {
    const { data } = await axios.get(
      'https://data.gov.sg/api/action/package_search',
      {
        params: { q: prompt, rows: 5 },
        timeout: 10000
      }
    );
    if (!data?.success) {
      return `🔴 data.gov.sg error: API returned success=false (${JSON.stringify(data?.error || {}).slice(0, 200)})`;
    }
    const results = data?.result?.results || [];
    if (!results.length) {
      return withFooter(`🇸🇬 data.gov.sg — "${prompt}"\n\n(no datasets matching "${prompt}")`);
    }
    const lines = results.slice(0, 5).map((r, i) => {
      const title = (r.title || r.name || '(untitled)').trim();
      const org = r.organization?.title || r.organization?.name || '(unknown org)';
      const slug = r.name || '';
      const url = slug ? `https://data.gov.sg/datasets/${slug}` : '';
      const notes = (r.notes || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const resourceCount = Array.isArray(r.resources) ? r.resources.length : 0;
      return `${i + 1}. ${title}\n   org: ${org} · resources: ${resourceCount}${url ? `\n   ${url}` : ''}${notes ? `\n   ${notes}` : ''}`;
    });
    const totalCount = data?.result?.count ?? results.length;
    return withFooter(`🇸🇬 data.gov.sg — "${prompt}" (${totalCount} total, showing top ${results.length})\n\n${lines.join('\n\n')}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || 'unknown';
    return `🔴 data.gov.sg error: ${status ? `HTTP ${status} — ` : ''}${String(msg).slice(0, 500)}`;
  }
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
  HELP,
  MAX_OUTPUT_CHARS,
  noCacheFooter,
  withFooter
};
