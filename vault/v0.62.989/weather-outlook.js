'use strict';

// weather-outlook.js — v0.62.960. NEA's four-day outlook for the "Outside now" sheet.
//
// Spec: doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md (C4, C6).
//
// One keyless island-wide feed, GET /v2/real-time/api/four-day-outlook. It starts TOMORROW, as NEA issues it
// (operator, 30-10 '26: "Start tomorrow (as NEA issues it."). Cached in Redis as `nea:4day` for 30 minutes, so the
// keyless limit (6 calls per 10 s) is never near: upstream sees at most two calls an hour however many readers open
// the sheet. It has its own route rather than joining outside-now.js's six-feed burst for the same reason.
//
// NEA's free-text `summary` ("Afternoon thundery showers") is English prose and is not passed on; the client labels
// each day from `text` instead (C5).

const axios = require('axios');
const { forecastEmoji } = require('./weather-emoji');

const OUTLOOK_URL = 'https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook';
const CACHE_KEY = 'nea:4day';
const TTL_S = 30 * 60;
const MAX_DAYS = 4;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function normalise(raw) {
  if (!raw || raw.code !== 0) return { ok: false };
  const rec = raw.data && Array.isArray(raw.data.records) ? raw.data.records[0] : null;
  if (!rec || !Array.isArray(rec.forecasts)) return { ok: false };
  const days = [];
  for (const f of rec.forecasts) {
    const date = /^\d{4}-\d{2}-\d{2}/.exec(String(f && f.timestamp || ''));
    const lowC = num(f && f.temperature && f.temperature.low);
    const highC = num(f && f.temperature && f.temperature.high);
    const text = String(f && f.forecast && f.forecast.text || '').trim();
    if (!date || lowC == null || highC == null || !text) continue;
    days.push({
      date: date[0],
      text,
      code: String(f.forecast.code || ''),
      emoji: forecastEmoji(text),
      lowC,
      highC,
      humidityLow: num(f.relativeHumidity && f.relativeHumidity.low),
      humidityHigh: num(f.relativeHumidity && f.relativeHumidity.high),
    });
    if (days.length === MAX_DAYS) break;
  }
  if (!days.length) return { ok: false };
  return { ok: true, issuedAt: String(rec.updatedTimestamp || rec.timestamp || ''), days };
}

async function fetchJson() {
  const r = await axios.get(OUTLOOK_URL, { timeout: 8000 });
  return r.data;
}

// `cache` is anything with async get(key) and setEx(key, ttlSeconds, value), e.g. the node-redis client. A cache that
// throws is ignored; a failed or empty answer is never cached, so the next open retries.
async function getOutlook({ fetchJson: fetcher = fetchJson, cache = null } = {}) {
  if (cache) {
    try {
      const hit = await cache.get(CACHE_KEY);
      if (hit) return JSON.parse(hit);
    } catch { /* cache unavailable: fetch instead */ }
  }
  let out;
  try {
    out = normalise(await fetcher());
  } catch {
    return { ok: false };
  }
  if (out.ok && cache) {
    try { await cache.setEx(CACHE_KEY, TTL_S, JSON.stringify(out)); } catch { /* not cached this time */ }
  }
  return out;
}

module.exports = { OUTLOOK_URL, CACHE_KEY, TTL_S, normalise, getOutlook };
