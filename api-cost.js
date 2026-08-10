// api-cost.js — v0.61.307
//
// Lightweight API-spend tracker. Records Gemini token usage + Google
// Maps request counts into Redis hashes keyed by UTC date so the
// /cost owner command (mirrors /ver gating) can summarise daily and
// multi-day spend without external dashboards.
//
// Redis key shapes:
//   api-cost:<YYYY-MM-DD>:gemini:<model>  — hash { count, in_tokens, out_tokens, total_tokens }
//   api-cost:<YYYY-MM-DD>:maps:<endpoint> — hash { count }
//
// TTL: 60 days per key. Recording is fire-and-forget (all errors
// swallowed) — instrumentation must NEVER fail the underlying call.
//
// Rate card (USD) is a static snapshot of public Google pricing as of
// 2026; refresh periodically. Numbers used by getCostSummary to
// estimate spend — actual billing lives in the Google dashboards.

'use strict';

const TTL_S = 60 * 24 * 60 * 60;

// USD per 1,000 tokens (Gemini) and USD per request (Maps).
const PRICES = Object.freeze({
  gemini: {
    'gemini-2.5-pro':        { in: 1.25 / 1e6, out: 5.00 / 1e6 },
    'gemini-2.5-flash':      { in: 0.30 / 1e6, out: 2.50 / 1e6 },
    'gemini-2.5-flash-lite': { in: 0.10 / 1e6, out: 0.40 / 1e6 },
    'gemini-flash-latest':   { in: 0.30 / 1e6, out: 2.50 / 1e6 }
  },
  maps: {
    // USD per request — Google Maps Platform 2026 pricing.
    searchText:        0.032,
    searchNearby:      0.032,
    placeAutocomplete: 0.00283,
    placeDetails:      0.017,
    placeResolve:      0.017,
    geocode:           0.005,
    reverseGeocode:    0.005,
    // v0.62.71x — Routes API computeRouteMatrix, billed per ELEMENT
    // (origins × destinations), not per request. travel-times.js calls
    // it once per mode (TRANSIT, DRIVE) with a 1×N matrix (1 origin ×
    // N candidate venues) — recordMapsCall(redis, 'routes', N) passes
    // the element count explicitly. Google's Compute Route Matrix
    // "Essentials" SKU (the tier a plain DRIVE/TRANSIT-without-
    // TRAFFIC_AWARE_OPTIMAL matrix falls into) is volume-tiered at
    // $2-$7 per 1,000 elements; $0.005/element is a mid-range point
    // estimate pending an exact-tier confirmation from the Cloud
    // Console billing export — refresh when that's available.
    routes:            0.005
  }
});

function _today() {
  return new Date().toISOString().slice(0, 10);
}

function _normaliseModel(m) {
  if (!m || typeof m !== 'string') return 'unknown';
  // Strip any suffix Google adds (e.g. '-001', '-latest' kept as-is).
  return m.toLowerCase().replace(/^google\//, '');
}

async function _connect(redis) {
  if (!redis) return false;
  if (!redis.isOpen) {
    try { await redis.connect(); } catch { return false; }
  }
  return true;
}

async function recordGeminiUsage(redis, model, usage) {
  if (!(await _connect(redis))) return false;
  const m = _normaliseModel(model);
  const key = `api-cost:${_today()}:gemini:${m}`;
  try {
    await redis.hIncrBy(key, 'count', 1);
    const inT = Number(usage?.promptTokenCount) || 0;
    const outT = Number(usage?.candidatesTokenCount) || 0;
    const totT = Number(usage?.totalTokenCount) || (inT + outT);
    if (inT > 0) await redis.hIncrBy(key, 'in_tokens', inT);
    if (outT > 0) await redis.hIncrBy(key, 'out_tokens', outT);
    if (totT > 0) await redis.hIncrBy(key, 'total_tokens', totT);
    await redis.expire(key, TTL_S);
    return true;
  } catch (err) {
    return false;
  }
}

async function recordMapsCall(redis, endpoint, count = 1) {
  if (!(await _connect(redis))) return false;
  if (!endpoint || typeof endpoint !== 'string') return false;
  const n = Number.isFinite(count) && count > 0 ? Math.round(count) : 1;
  const key = `api-cost:${_today()}:maps:${endpoint}`;
  try {
    await redis.hIncrBy(key, 'count', n);
    await redis.expire(key, TTL_S);
    return true;
  } catch (err) {
    return false;
  }
}

function _dateKey(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Compute the estimated USD for a Gemini hash entry given its model.
function _geminiUsd(model, hash) {
  const rate = PRICES.gemini[model];
  if (!rate) return 0;
  const inT = Number(hash.in_tokens) || 0;
  const outT = Number(hash.out_tokens) || 0;
  return inT * rate.in + outT * rate.out;
}

function _mapsUsd(endpoint, count) {
  const rate = PRICES.maps[endpoint];
  if (!rate) return 0;
  return Number(count) * rate;
}

// Aggregate the last `days` days into a single summary object.
// Returns: {
//   days, since, until,
//   gemini: { totalCalls, totalInTokens, totalOutTokens, totalUsd,
//             byModel: { <model>: { count, in_tokens, out_tokens, usd } } },
//   maps:   { totalCalls, totalUsd, byEndpoint: { <ep>: { count, usd } } }
// }
async function getCostSummary(redis, days = 1) {
  if (!(await _connect(redis))) return null;
  const d = Math.max(1, Math.min(60, Number(days) || 1));
  const datesAgo = [];
  for (let i = 0; i < d; i++) datesAgo.push(_dateKey(i));
  const dates = datesAgo.slice().reverse();

  const gemini = { totalCalls: 0, totalInTokens: 0, totalOutTokens: 0, totalUsd: 0, byModel: {} };
  const maps = { totalCalls: 0, totalUsd: 0, byEndpoint: {} };

  for (const date of dates) {
    // Gemini hashes
    try {
      const pattern = `api-cost:${date}:gemini:*`;
      for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 50 })) {
        const model = key.split(':').pop();
        const h = await redis.hGetAll(key).catch(() => null);
        if (!h) continue;
        const entry = gemini.byModel[model] || { count: 0, in_tokens: 0, out_tokens: 0, usd: 0 };
        entry.count += Number(h.count) || 0;
        entry.in_tokens += Number(h.in_tokens) || 0;
        entry.out_tokens += Number(h.out_tokens) || 0;
        entry.usd += _geminiUsd(model, h);
        gemini.byModel[model] = entry;
      }
    } catch { /* scan failed — partial summary still useful */ }
    // Maps hashes
    try {
      const pattern = `api-cost:${date}:maps:*`;
      for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 50 })) {
        const endpoint = key.split(':').pop();
        const h = await redis.hGetAll(key).catch(() => null);
        if (!h) continue;
        const count = Number(h.count) || 0;
        const entry = maps.byEndpoint[endpoint] || { count: 0, usd: 0 };
        entry.count += count;
        entry.usd += _mapsUsd(endpoint, count);
        maps.byEndpoint[endpoint] = entry;
      }
    } catch { /* same */ }
  }

  for (const e of Object.values(gemini.byModel)) {
    gemini.totalCalls += e.count;
    gemini.totalInTokens += e.in_tokens;
    gemini.totalOutTokens += e.out_tokens;
    gemini.totalUsd += e.usd;
  }
  for (const e of Object.values(maps.byEndpoint)) {
    maps.totalCalls += e.count;
    maps.totalUsd += e.usd;
  }

  return { days: d, since: dates[0], until: dates[dates.length - 1], gemini, maps };
}

// Format a getCostSummary() return as Markdown for Telegram. Compact
// table when there are few entries; falls back to "no data" when both
// providers are empty.
function formatCostSummary(summary) {
  if (!summary) return '⚠️ /cost: redis offline.';
  const { days, since, until, gemini, maps } = summary;
  const window = days === 1 ? `today (${since})` : `${since} → ${until} (${days} d)`;
  if (gemini.totalCalls === 0 && maps.totalCalls === 0) {
    return `💸 *API spend* — ${window}\n\n_No tracked calls in window._`;
  }
  const lines = [`💸 *API spend* — ${window}`, ''];
  if (gemini.totalCalls > 0) {
    lines.push(`*Gemini* — ${gemini.totalCalls.toLocaleString()} calls · ~$${gemini.totalUsd.toFixed(4)}`);
    lines.push(`  in: ${gemini.totalInTokens.toLocaleString()} tok · out: ${gemini.totalOutTokens.toLocaleString()} tok`);
    for (const [model, e] of Object.entries(gemini.byModel)) {
      lines.push(`  • \`${model}\` — ${e.count} · ${e.in_tokens.toLocaleString()} in · ${e.out_tokens.toLocaleString()} out · ~$${e.usd.toFixed(4)}`);
    }
    lines.push('');
  }
  if (maps.totalCalls > 0) {
    lines.push(`*Maps* — ${maps.totalCalls.toLocaleString()} req · ~$${maps.totalUsd.toFixed(4)}`);
    for (const [ep, e] of Object.entries(maps.byEndpoint)) {
      lines.push(`  • \`${ep}\` — ${e.count} · ~$${e.usd.toFixed(4)}`);
    }
    lines.push('');
  }
  lines.push(`_Static rate card; actual spend on Google Cloud / AI Studio dashboards._`);
  return lines.join('\n');
}

module.exports = {
  PRICES,
  TTL_S,
  recordGeminiUsage,
  recordMapsCall,
  getCostSummary,
  formatCostSummary
};
