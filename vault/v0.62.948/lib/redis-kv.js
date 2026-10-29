// lib/redis-kv.js — v0.62.536
//
// Thin, behaviour-preserving Redis helpers shared by the off-hot-path stores.
// This is the minimal safe slice of the audit's "no shared redis helper" finding
// (audit/tma-code-reuse-audit-2026-07-11.md §3.4): only the two pieces that are
// verbatim-identical across modules AND have no per-caller error-log coupling —
// the connection guard and the JSON read. The set/del sites in those modules are
// deliberately left in place because they sit inside per-function try/catch blocks
// that also wrap business logic and emit module-specific warn logs; folding them
// in here would swallow those logs (a silent change).

'use strict';

// Ensure the client is connected. Mirrors the `_connect` guard used across the
// stores: false if there's no client or the connect fails, true otherwise.
async function ensure(redis) {
  if (!redis) return false;
  if (!redis.isOpen) {
    try { await redis.connect(); } catch { return false; }
  }
  return true;
}

// Read + JSON.parse a key. Returns null on a missing key, a get error, or invalid
// JSON — never throws. Callers apply their own shape check (e.g. Array.isArray).
async function getJSON(redis, key) {
  try {
    const raw = await redis.get(key).catch(() => null);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = { ensure, getJSON };
