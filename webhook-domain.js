// webhook-domain.js — v0.59.30
//
// Auto-fallback for the bot's public-facing domain. Per Human Lead
// 2026-05-07: when soleat.net is unreachable (DNS / cert / proxy
// drift, like the 2026-05-07 incident where the registrar's parking
// page replaced the Railway alias), automatically swap to the
// Railway-direct hostname so users can still tap "Open Cuisine
// Picker" without seeing "connection reset".
//
// Mechanic:
//   - PRIMARY domain  = process.env.WEBHOOK_DOMAIN (typically soleat.net)
//   - FALLBACK domain = process.env.WEBHOOK_DOMAIN_FALLBACK
//                       (typically soleat.up.railway.app)
//   - Boot probes PRIMARY. If healthy → activeHost = PRIMARY.
//     If unreachable → activeHost = FALLBACK + warn log.
//   - Background timer re-probes every CHECK_INTERVAL_MS (60 s).
//     PRIMARY's recovery is detected; activeHost flips back.
//   - Listeners get notified on every switch so callers can mutate
//     a captured `webhookDomain` reference. Works for index.js's
//     existing pattern (template strings reading the latest value
//     of a top-level `let webhookDomain`).
//
// Probe: GET https://<host>/app/cuisine. Counts 2xx/3xx/4xx as
// "host responsive" (the server is up — even a 404 means our
// hostname routed correctly). Only network errors (DNS fail, TCP
// reset, TLS fail, timeout) or 5xx are treated as unhealthy.

const axios = require('axios');
const { logger } = require('./logger');

const PRIMARY  = process.env.WEBHOOK_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN;
const FALLBACK = process.env.WEBHOOK_DOMAIN_FALLBACK || null;
const HEALTH_PATH = '/app/cuisine';
const CHECK_INTERVAL_MS = 60_000;
const PROBE_TIMEOUT_MS = 5_000;

let activeHost = PRIMARY;
let lastProbeAt = 0;
let lastResult = null;
const listeners = new Set();

async function probe(host) {
  if (!host) return false;
  try {
    const r = await axios.get(`https://${host}${HEALTH_PATH}`, {
      timeout: PROBE_TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true // any HTTP response counts as reachable
    });
    // 2xx / 3xx / 4xx all mean "host responded" — domain is reachable.
    // Only 5xx + network errors are treated as unhealthy.
    return r.status >= 200 && r.status < 500;
  } catch {
    return false;
  }
}

function setActiveHost(next, reason) {
  const prev = activeHost;
  if (next === prev) return;
  activeHost = next;
  logger.warn({ from: prev, to: next, reason }, '[webhook-domain] switched active host');
  for (const l of listeners) {
    try { l(next, prev); } catch (err) { logger.warn({ err: err.message }, '[webhook-domain] listener threw'); }
  }
}

async function checkAndUpdate() {
  if (!PRIMARY) return; // no primary configured → nothing to do
  const ok = await probe(PRIMARY);
  lastProbeAt = Date.now();
  lastResult = ok;
  if (ok) {
    setActiveHost(PRIMARY, 'primary healthy');
  } else if (FALLBACK) {
    setActiveHost(FALLBACK, 'primary unreachable');
  }
  // If !ok && !FALLBACK, we keep activeHost = PRIMARY (no fallback to switch to).
}

function startHealthCheck() {
  if (!PRIMARY || !FALLBACK) {
    logger.info({
      hasPrimary: !!PRIMARY,
      hasFallback: !!FALLBACK
    }, '[webhook-domain] fallback not configured — skipping health check');
    return;
  }
  // Initial probe on boot.
  checkAndUpdate().catch((err) => {
    logger.error({ err: err.message }, '[webhook-domain] initial probe threw');
  });
  // Recurring probe.
  const timer = setInterval(() => {
    checkAndUpdate().catch((err) => {
      logger.error({ err: err.message }, '[webhook-domain] scheduled probe threw');
    });
  }, CHECK_INTERVAL_MS);
  // Don't keep the process alive just for this timer.
  if (typeof timer.unref === 'function') timer.unref();
}

function getActiveWebhookDomain() {
  return activeHost;
}

function onSwitch(fn) {
  if (typeof fn === 'function') listeners.add(fn);
  return () => listeners.delete(fn);
}

// Test seam: lets test code force a state without going through axios.
function _testSetActiveHost(next, reason = 'test') {
  setActiveHost(next, reason);
}

module.exports = {
  PRIMARY,
  FALLBACK,
  startHealthCheck,
  getActiveWebhookDomain,
  onSwitch,
  // exposed for unit tests + ops introspection only
  _probe: probe,
  _checkAndUpdate: checkAndUpdate,
  _testSetActiveHost,
  _getLastProbe: () => ({ at: lastProbeAt, ok: lastResult })
};
