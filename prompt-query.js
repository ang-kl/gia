// prompt-query.js — v0.44.0 hidden `/p` power-user query relay.
//
// Single-purpose module: relay a free-text prompt to one of four upstream
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
//
// Hidden = not registered in setMyCommands. Anyone who knows the
// command can use it. Not admin-gated by chat ID — flag deferred to
// v0.44.1 if abuse is observed.

const axios = require('axios');
const llm = require('./llm-client');

const MAX_OUTPUT_CHARS = 3800;

const HELP = `📡 /p — power-user query relay (hidden)

Usage: /p <type> <prompt>

Type:
  c  →  Claude / Anthropic API   (default model)
  g  →  Google Gemini API
  s  →  Google Custom Search API
  m  →  Google Maps Places (text search)

Examples:
  /p c What is the meaning of life?
  /p g Latest news on Singapore F&B
  /p s michelin star restaurants singapore
  /p m halal ramen tanjong pagar`;

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
    return trim(`🟣 Claude (${llm.DEFAULT_MODEL})\n\n${text}`);
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
    return trim(`🔷 Gemini (${model})\n\n${text}`);
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
    if (!items.length) return `🔍 Google Search\n\n(no results for "${prompt}")`;
    const lines = items.slice(0, 5).map((it, i) => {
      const title = (it.title || '(no title)').trim();
      const link = (it.link || '').trim();
      const snippet = (it.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      return `${i + 1}. ${title}\n   ${link}${snippet ? `\n   ${snippet}` : ''}`;
    });
    return trim(`🔍 Google Search — "${prompt}"\n\n${lines.join('\n\n')}`);
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
    if (!places.length) return `📍 Google Maps Places\n\n(no places for "${prompt}")`;
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
    return trim(`📍 Google Maps Places — "${prompt}"\n\n${lines.join('\n\n')}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || 'unknown';
    return `🔴 Google Maps error: ${status ? `HTTP ${status} — ` : ''}${String(msg).slice(0, 500)}`;
  }
}

const HANDLERS = { c: viaClaude, g: viaGemini, s: viaSearch, m: viaMaps };

async function runPromptQuery(rawArgs) {
  const args = String(rawArgs || '').trim();
  if (!args || args === 'help' || args === '?') return HELP;

  const parts = args.match(/^([cgsm])(?:\s+(.+))?$/i);
  if (!parts) {
    return `❓ Unknown type. Use one of: c (Claude), g (Gemini), s (Search), m (Maps).\n\n${HELP}`;
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
  HELP,
  MAX_OUTPUT_CHARS
};
