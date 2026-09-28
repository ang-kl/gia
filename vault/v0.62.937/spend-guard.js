// spend-guard.js — v0.62.715
//
// Daily-spend circuit breaker. Phase C of the cost-audit remediation plan
// (Phase A wired up api-cost.js's tracking; this module finally acts on it).
//
// WHY THIS EXISTS: before Phase A the /cost tracker was nearly blind, so
// there was nothing trustworthy to gate on. Now that Gemini + Maps spend is
// actually recorded per call, we can read today's running total and shed the
// OPTIONAL enrichment work when the day gets expensive — without ever
// blocking the core search result the user actually asked for.
//
// THREE LEVELS (see levelFor):
//   'ok'    — under the soft threshold. No-op.
//   'soft'  — soft ≤ spend < hard. Everything still runs; the owner gets one
//             DM (see shouldAlert) and a warning lands in the logs.
//   'hard'  — spend ≥ hard. Optional enrichment is skipped (see SHEDDABLE);
//             core Places search + the venue cards still work, they're just
//             thinner for the rest of the UTC day.
//
// WHAT IS NEVER SHED: the Places search itself, venue card basics, /cost,
// or any already-cached result. Degrading the product is a last resort that
// costs the user quality; refusing to serve them at all is not on the table.
//
// Env (both optional, both USD/day):
//   SPEND_SOFT_USD   default 10
//   SPEND_HARD_USD   default 25
// Set either to 0 to disable that level entirely.
//
// Reading the summary is a Redis SCAN over the day's api-cost:* keys, which
// is too heavy to run per-request — so the result is memoised in-process for
// CACHE_MS. A stale-by-≤60s spend figure is fine for a daily budget; the
// thresholds are not a hard financial guarantee (see the module's own
// caveats in the README/journal), they're a spend brake.

'use strict';

const DEFAULT_SOFT_USD = 10;
const DEFAULT_HARD_USD = 25;
const CACHE_MS = 60_000;

// The enrichment steps this guard is allowed to skip at 'hard'. Each is
// best-effort, additive polish on a venue card — never the card itself.
//   sanctuary  — the 🌿 solo-diner read (Anthropic Haiku, per uncached venue)
//   footfall   — BestTime busy-ness signal (paid, SG-only)
//   dishes     — Gemini batched dish extraction (regex fallback still runs)
//   hidden     — the /hidden grounded-search command (priciest single command)
const SHEDDABLE = Object.freeze(['sanctuary', 'footfall', 'dishes', 'hidden']);

function _num(envVal, fallback) {
  const n = Number(envVal);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function thresholds() {
  return {
    soft: _num(process.env.SPEND_SOFT_USD, DEFAULT_SOFT_USD),
    hard: _num(process.env.SPEND_HARD_USD, DEFAULT_HARD_USD)
  };
}

// Pure: map a USD figure onto a level given thresholds. A threshold of 0
// disables that level (so SPEND_HARD_USD=0 means "warn but never shed").
// Guards against a mis-set hard < soft by treating hard as authoritative
// only when it is actually above soft.
function levelFor(usd, { soft, hard } = thresholds()) {
  const spend = Number(usd);
  if (!Number.isFinite(spend) || spend < 0) return 'ok';
  if (hard > 0 && hard >= soft && spend >= hard) return 'hard';
  if (soft > 0 && spend >= soft) return 'soft';
  return 'ok';
}

// In-process memo of the last computed reading. Deliberately module-level
// (not per-caller) so every call site in a process shares one Redis SCAN.
let _cache = { at: 0, reading: null };

function _resetCacheForTests() { _cache = { at: 0, reading: null }; }

// Today's spend + level. Returns
//   { usd, level, soft, hard, cached }
// and NEVER throws — a Redis failure yields level 'ok' (fail-open), because
// a monitoring outage must not silently degrade the product for everyone.
async function readSpend(redis, now = Date.now()) {
  const { soft, hard } = thresholds();
  if (_cache.reading && (now - _cache.at) < CACHE_MS) {
    return { ..._cache.reading, cached: true };
  }
  let usd = 0;
  try {
    const { getCostSummary } = require('./api-cost');
    const summary = await getCostSummary(redis, 1);
    if (summary) {
      usd = (Number(summary.gemini?.totalUsd) || 0) + (Number(summary.maps?.totalUsd) || 0);
    }
  } catch (err) {
    console.warn('[spend-guard] cost summary read failed (failing open):', err && err.message);
    return { usd: 0, level: 'ok', soft, hard, cached: false };
  }
  const reading = { usd, level: levelFor(usd, { soft, hard }), soft, hard };
  _cache = { at: now, reading };
  return { ...reading, cached: false };
}

// The question every call site actually asks: may I run this optional step?
// Unknown step names are always allowed — a typo must not silently disable
// enrichment that was never meant to be sheddable.
async function allows(redis, step, now = Date.now()) {
  if (!SHEDDABLE.includes(step)) return true;
  const { level } = await readSpend(redis, now);
  return level !== 'hard';
}

// Once-per-UTC-day-per-level alert latch, in Redis so a restart (or a second
// process) doesn't re-send. Returns true exactly once per (day, level).
// Fails CLOSED on a Redis error — a missed alert beats an alert loop.
async function shouldAlert(redis, level, now = Date.now()) {
  if (level !== 'soft' && level !== 'hard') return false;
  if (!redis) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    const day = new Date(now).toISOString().slice(0, 10);
    const key = `spend-guard:alerted:${day}:${level}`;
    // NX+EX: set-if-absent with a 2-day TTL. `null` means it already existed.
    const set = await redis.set(key, '1', { NX: true, EX: 2 * 24 * 60 * 60 });
    return set === 'OK';
  } catch (err) {
    console.warn('[spend-guard] alert latch failed (suppressing alert):', err && err.message);
    return false;
  }
}

// Telegram-ready alert copy. Markdown, matching /cost's own formatting.
function formatAlert({ usd, level, soft, hard }) {
  const spend = Number(usd) || 0;
  if (level === 'hard') {
    return `🛑 *API spend — hard cap reached*\n\n`
      + `Today: ~$${spend.toFixed(2)} (cap $${hard})\n\n`
      + `Optional enrichment is now being skipped for the rest of the UTC day: `
      + `sanctuary reads, footfall, LLM dish extraction, and \`/hidden\`.\n`
      + `Search itself still works — cards are just thinner.\n\n`
      + `_Run \`/cost\` for the breakdown._`;
  }
  return `⚠️ *API spend — soft threshold crossed*\n\n`
    + `Today: ~$${spend.toFixed(2)} (soft $${soft} · hard $${hard})\n\n`
    + `Nothing is being skipped yet. At $${hard} the optional enrichment steps `
    + `(sanctuary, footfall, dish extraction, \`/hidden\`) start being shed.\n\n`
    + `_Run \`/cost\` for the breakdown._`;
}

// Convenience for the call sites that want "check + alert" in one step.
// `notify` is injected (index.js passes a safeSend-backed closure) so this
// module stays free of any Telegram dependency and unit-testable.
async function checkAndAlert(redis, notify, now = Date.now()) {
  const reading = await readSpend(redis, now);
  if (reading.level === 'ok') return reading;
  if (typeof notify === 'function' && await shouldAlert(redis, reading.level, now)) {
    try { await notify(formatAlert(reading)); }
    catch (err) { console.warn('[spend-guard] alert notify failed:', err && err.message); }
  }
  return reading;
}

module.exports = {
  DEFAULT_SOFT_USD,
  DEFAULT_HARD_USD,
  CACHE_MS,
  SHEDDABLE,
  thresholds,
  levelFor,
  readSpend,
  allows,
  shouldAlert,
  formatAlert,
  checkAndAlert,
  _resetCacheForTests
};
