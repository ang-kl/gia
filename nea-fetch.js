// nea-fetch.js — v0.52.0 LLM-driven NEA hawker closure fetcher.
//
// Why this exists: NEA's `/our-services/hawker-management` and
// `/announcements` pages render their tables behind tabbed/iframe
// interactions that a vanilla cheerio scrape can't reach. The
// closure schedule splits across 4 quarter tabs × alphabetical
// accordions; the R&R schedule lives behind a separate tab on
// `/announcements`. Static fetches return placeholders.
//
// This module asks Claude (with the `web_search` tool) to find +
// extract the tables, then normalises into the same `{closures,
// rnrWorks}` shape the existing nea-scrape module returns. Cached
// 12h in Redis so we hit Anthropic at most twice per day.

const llm = require('./llm-client');

const CACHE_KEY = 'nea:fetch:v1';
const CACHE_TTL_S = 12 * 60 * 60;

const PROMPT = `Use web_search to find Singapore hawker centre closure schedules from the NEA (National Environment Agency) website.

PRIMARY SOURCES:
- https://www.nea.gov.sg/our-services/hawker-management — quarterly cleaning closures (Jan-Mar / Apr-Jun / Jul-Sep / Oct-Dec tabs, alphabetical accordions)
- https://www.nea.gov.sg/our-services/hawker-management/announcements — Repairs & Redecoration (R&R) Works closure table

EXTRACT TWO TABLES:

1. CLEANING CLOSURES — every centre across all 4 quarters of the current calendar year. Columns:
   - Hawker Centre Name (exact NEA spelling)
   - Closure Date (YYYY-MM-DD or "YYYY-MM-DD to YYYY-MM-DD" range)
   - Reason (always "Cleaning" for this table)
   - Remarks (any extra notes, blank if none)

2. R&R WORKS CLOSURES — every entry in the "Centre Closure Date due to Repairs and Redecoration (R&R) Work" table. Columns:
   - Hawker Centre Name
   - Closure Date (YYYY-MM-DD ranges)
   - Reason (always "R&R")
   - Remarks

OUTPUT FORMAT — strict JSON only, no prose, no markdown fences:

{
  "closures": {
    "headers": ["Hawker Centre", "Closure Date", "Reason", "Remarks"],
    "data": [["centre name", "date", "Cleaning", "remarks"], ...]
  },
  "rnrWorks": {
    "headers": ["Hawker Centre", "Closure Date", "Reason", "Remarks"],
    "data": [["centre name", "date", "R&R", "remarks"], ...]
  }
}

RULES:
- Use the canonical NEA spelling for centre names (matches data/list-of-hawker-centres.md when available).
- Singapore only. No duplicates (dedupe by centre+date pair).
- If a date range spans multiple months, keep it as a single row — don't expand.
- If a table is empty or unreachable, return that key with empty data: {"headers": [...], "data": []}.
- Aim for ≥10 closures per quarter for the cleaning table; if you find significantly fewer, the page likely failed to load — return {"data": []} for that table rather than guess.

Respond with the JSON object directly. No additional text.`;

function tryParseJson(text) {
  if (!text) return null;
  // Strip markdown fences + leading/trailing prose if Claude ignores instructions.
  let s = String(text).trim();
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) s = fenceMatch[1];
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace > 0 || lastBrace < s.length - 1) {
    if (firstBrace !== -1 && lastBrace > firstBrace) s = s.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function normaliseTable(table) {
  if (!table || typeof table !== 'object') return { headers: [], data: [] };
  const headers = Array.isArray(table.headers) ? table.headers : [];
  const data = Array.isArray(table.data) ? table.data.filter((r) => Array.isArray(r) && r.length) : [];
  return { headers, data };
}

async function fetchAndParse() {
  const t0 = Date.now();
  const result = await llm.generate({
    prompt: PROMPT,
    model: llm.SONNET_MODEL || llm.DEFAULT_MODEL,
    webSearch: true,
    maxTokens: 6000
  });
  const text = result?.response?.text?.() || '';
  const parsed = tryParseJson(text);
  if (!parsed || (typeof parsed !== 'object')) {
    return {
      ok: false,
      error: `LLM did not return parseable JSON (${text.slice(0, 100)}…)`,
      fetchedAt: Date.now(),
      ms: Date.now() - t0,
      closures: { headers: [], data: [] },
      rnrWorks: { headers: [], data: [] }
    };
  }
  const closures = normaliseTable(parsed.closures);
  const rnrWorks = normaliseTable(parsed.rnrWorks);
  const total = closures.data.length + rnrWorks.data.length;
  return {
    ok: total > 0,
    fetchedAt: Date.now(),
    ms: Date.now() - t0,
    sourceUrl: 'https://www.nea.gov.sg/our-services/hawker-management',
    closures,
    rnrWorks,
    diagnostics: {
      closuresCount: closures.data.length,
      rnrCount: rnrWorks.data.length,
      llmTextChars: text.length
    }
  };
}

async function getCachedOrFetch(redis) {
  if (redis) {
    try {
      const raw = await redis.get(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, cached: true };
      }
    } catch (err) {
      console.warn('[NEA-Fetch] cache read failed:', err.message);
    }
  }
  let result;
  try {
    result = await fetchAndParse();
  } catch (err) {
    return {
      ok: false,
      error: `LLM fetch failed: ${err.message?.slice(0, 200)}`,
      fetchedAt: Date.now(),
      closures: { headers: [], data: [] },
      rnrWorks: { headers: [], data: [] }
    };
  }
  if (result.ok && redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify({ ...result, cached: false }), { EX: CACHE_TTL_S });
    } catch (err) {
      console.warn('[NEA-Fetch] cache write failed:', err.message);
    }
  }
  return { ...result, cached: false };
}

module.exports = {
  CACHE_KEY,
  CACHE_TTL_S,
  PROMPT,
  tryParseJson,
  normaliseTable,
  fetchAndParse,
  getCachedOrFetch
};
