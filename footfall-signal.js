// footfall-signal.js — v0.59.0 (Phase 1a MVP)
//
// Real per-venue busyness via the BestTime API. Mirrors the existing
// crowd-signal.js shape so consumers can read either field. Treated
// as an enrichment — failures never block delivery.
//
// Surface (per venue):
//   v.footfall = {
//     liveBusyness: 0–100 | null,    // BestTime "venue_live_busyness"
//     forecastNext: 0–100 | null,    // forecast for the next hour
//     peakHour:    'HH:MM' | null,   // weekday peak from forecast
//     source:      'besttime',
//     cachedAt:    epoch_ms
//   }
//
// Behaviour without an API key:
//   BESTTIME_API_KEY unset → attachFootfallSignals returns the venues
//   array unchanged. Existing carpark-proxy `crowdSignal` stays as the
//   refine-prompt's only busy/quiet signal. This means deploying v0.59.0
//   without configuring BestTime is safe — the new code path is dormant.
//
// Cost:
//   BestTime free tier: forecast endpoint is free; live-busyness
//   endpoint is paid. We call /forecasts/{venue_id} for the weekly
//   forecast (free) and /forecasts/now for the live signal IF the
//   key has live access. Both calls cached 30 min in Redis per
//   placeId+lang.

const axios = require('axios');

const FORECAST_URL = 'https://besttime.app/api/v1/forecasts';
const LIVE_URL     = 'https://besttime.app/api/v1/forecasts/live';
const CACHE_TTL    = 30 * 60;   // 30 min
const REQUEST_TIMEOUT_MS = 6000;

function cacheKey(placeId) {
  // BestTime is venue-resolved (by name + address); the result doesn't
  // change per locale, so we don't include lang in the cache key.
  return `footfall:besttime:${placeId}`;
}

// Single venue lookup. Returns the footfall object or null.
async function fetchOne(redis, venue, apiKey) {
  if (!venue?.placeId || !venue?.name) return null;
  const placeId = venue.placeId;
  const ck = cacheKey(placeId);
  if (redis?.isOpen) {
    try {
      const cached = await redis.get(ck);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch { /* cache miss / parse error → proceed */ }
  }
  // BestTime resolves venues by name + address. Use the venue's name
  // and area as the address (good enough for SG).
  const params = {
    api_key_public: apiKey,
    venue_name: venue.name,
    venue_address: venue.area || venue.formattedAddress || 'Singapore'
  };
  let payload = null;
  try {
    // /forecasts/live returns a single object with `analysis.venue_live_busyness`
    // when the venue is open + has live data; otherwise falls back to
    // the forecast for the current hour.
    const { data } = await axios.post(LIVE_URL, null, { params, timeout: REQUEST_TIMEOUT_MS });
    if (data?.analysis) {
      const a = data.analysis;
      payload = {
        liveBusyness: Number.isFinite(a.venue_live_busyness) ? a.venue_live_busyness : null,
        forecastNext: Number.isFinite(a.venue_forecasted_busyness) ? a.venue_forecasted_busyness : null,
        peakHour: data.venue_info?.venue_peak_day_hour || null,
        source: 'besttime',
        cachedAt: Date.now()
      };
    }
  } catch (err) {
    // Best-effort. BestTime returns 4xx for unresolved venues; treat
    // identically to "no signal".
    if (err.response?.status && err.response.status >= 500) {
      console.warn('[footfall] BestTime 5xx for', placeId, '→', err.message);
    }
    return null;
  }
  if (payload && redis?.isOpen) {
    try { await redis.setEx(ck, CACHE_TTL, JSON.stringify(payload)); } catch { /* noop */ }
  }
  return payload;
}

// Public entrypoint. Mutates each venue with a `footfall` field where
// data is available. Returns the venues array.
//
// Concurrency: capped at 4 parallel BestTime calls so we don't hit
// the per-IP rate ceiling on a single search. With our typical 5–12
// venue result list, this is 2-3 batches.
async function attachFootfallSignals(redis, venues) {
  if (!Array.isArray(venues) || !venues.length) return venues || [];
  const apiKey = process.env.BESTTIME_API_KEY;
  if (!apiKey) return venues;
  const queue = venues.filter((v) => v?.placeId && v?.name);
  const PAR = 4;
  for (let i = 0; i < queue.length; i += PAR) {
    const batch = queue.slice(i, i + PAR);
    const results = await Promise.all(batch.map((v) => fetchOne(redis, v, apiKey).catch(() => null)));
    batch.forEach((v, idx) => {
      const r = results[idx];
      if (r) v.footfall = r;
    });
  }
  return venues;
}

// Numeric "busy cost" for downstream sort tiebreakers (mirrors
// crowd-signal.crowdCost shape). Range 0..1.
function footfallCost(footfall) {
  const live = footfall?.liveBusyness;
  if (Number.isFinite(live)) return Math.max(0, Math.min(1, live / 100));
  const fc = footfall?.forecastNext;
  if (Number.isFinite(fc)) return Math.max(0, Math.min(1, fc / 100));
  return 0.5;
}

// Chip text + colour for venue-templates / MapPanel / ResultCard.
// EN/FR per active locale.
function footfallChip(footfall, lang = 'en') {
  if (!footfall) return null;
  const live = footfall.liveBusyness;
  const fc   = footfall.forecastNext;
  const value = Number.isFinite(live) ? live : (Number.isFinite(fc) ? fc : null);
  if (value == null) return null;
  const peak = footfall.peakHour ? ` · ${lang === 'fr' ? 'pic' : 'peaks'} ${footfall.peakHour}` : '';
  const verb = lang === 'fr'
    ? (Number.isFinite(live) ? 'occupé maintenant' : 'prévu')
    : (Number.isFinite(live) ? 'busy now' : 'forecast');
  return `🚦 ${value}% ${verb}${peak}`;
}

module.exports = {
  attachFootfallSignals,
  footfallCost,
  footfallChip
};
