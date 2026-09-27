// error-classify.js — v0.61.441
//
// Pure error classifier for the /api/cuisine/search terminal catch.
//
// Background: the whole cuisine-search route sat behind ONE catch that
// turned ANY throw into res.status(500). Every external await
// (pipeline.discover, redis, Gemini, enrichment) is already individually
// guarded, so a 500 reaching that catch is almost always a TRANSIENT
// blip (a network reset, an upstream 5xx, a redis hiccup) — not a bug
// the user can act on. Those should degrade to an empty-but-OK response
// (the TMA already renders the zero-result UX) rather than a hard 500.
// Genuine programmer bugs (TypeError / ReferenceError / SyntaxError)
// stay 500 so they remain loud in logs + alerts.
//
// classifyError(err) → 'bug' | 'transient' | 'unknown'
//   bug        → keep HTTP 500 (we WANT these surfaced)
//   transient  → respond HTTP 200 { venues: [], degraded: true }
//   unknown    → keep HTTP 500 (conservative: don't hide what we can't explain)

'use strict';

// Node / libuv network + DNS error codes that mean "the network flaked",
// not "the code is wrong".
const TRANSIENT_CODES = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNABORTED',
  'ENOTFOUND', 'EAI_AGAIN', 'EPIPE', 'ENETUNREACH', 'EHOSTUNREACH',
  'ETIMEOUT', 'ESOCKETTIMEDOUT'
]);

// redis (node-redis v4) connection-level errors surface as these names.
const TRANSIENT_NAME_RE = /(ConnectionTimeoutError|SocketClosedUnexpectedlyError|ClientClosedError|ReconnectStrategyError)/i;

function classifyError(err) {
  if (!err) return 'unknown';

  // Programmer bugs — keep them loud.
  if (err instanceof TypeError) return 'bug';
  if (err instanceof ReferenceError) return 'bug';
  if (err instanceof SyntaxError) return 'bug';
  // `instanceof` misses errors that crossed a vm / worker boundary; fall
  // back to the constructor name for the same three.
  const ctor = err.constructor && err.constructor.name;
  if (ctor === 'TypeError' || ctor === 'ReferenceError' || ctor === 'SyntaxError') {
    return 'bug';
  }

  // Transient — network / DNS codes.
  const code = err.code || (err.cause && err.cause.code);
  if (code && TRANSIENT_CODES.has(String(code))) return 'transient';

  // Transient — axios wraps the upstream HTTP status on err.response.
  // A 5xx from Google Places / Gemini is their outage, not our bug.
  const status = err.response && Number(err.response.status);
  if (Number.isFinite(status) && status >= 500) return 'transient';

  // Transient — redis client connection errors (by name or message).
  const name = err.name || ctor || '';
  if (TRANSIENT_NAME_RE.test(name)) return 'transient';
  if (typeof err.message === 'string' && /redis|socket closed|connection (closed|lost|timeout)/i.test(err.message)
      && TRANSIENT_NAME_RE.test(name + ' ' + err.message)) {
    return 'transient';
  }

  // Anything we can't explain stays a 500 — better loud than silently
  // swallowed.
  return 'unknown';
}

module.exports = { classifyError, TRANSIENT_CODES };
