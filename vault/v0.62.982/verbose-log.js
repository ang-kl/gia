// verbose-log.js — per-chat verbose-mode toggle (v0.30.4; extended v0.60.161).
//
// Users opt in with `/log on` to receive step-by-step trace messages
// during NL chat searches and /cuisine pipeline runs. `/log off` clears
// the flag. Toggle is per-chat, 24 h Redis TTL (auto-clears so stale
// debug sessions don't keep spamming the user).
//
// v0.60.161 — same toggle now ALSO drives Railway-side debug logging
// (Cuisine TMA hot paths, Michelin handler, Redis TTLs, outbound HTTP
// cache headers) AND TMA-side client telemetry (timing + window errors
// POSTed to /api/vlog). One Redis flag, three surfaces:
//   - `🔍 …` chat messages (the original v0.30.4 user-facing trace)
//   - `[VLOG <chatId>] {…}` Railway logs (server-side)
//   - `[VLOG-CLIENT <chatId>] {…}` Railway logs (TMA-side, via /api/vlog)
//
// In-process cache (5s) on `isOn` so the new instrumentation doesn't
// double the per-request Redis traffic. The existing `isEnabled` call
// is preserved for backwards compatibility but routes through the
// cached path.

const KEY_PREFIX = 'verbose:';
const TTL_S = 24 * 60 * 60;
const CACHE_TTL_MS = 5000;

const _cache = new Map();  // chatId → { on: bool, expiresAt: ms }

async function enable(redis, chatId) {
  if (!redis || !chatId) return;
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`${KEY_PREFIX}${chatId}`, TTL_S, '1');
  // v0.60.161 — invalidate the in-process cache so the next vlogIf /
  // isOn call returns true immediately (without waiting up to 5s for
  // the cache entry to expire).
  _cache.set(String(chatId), { on: true, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function disable(redis, chatId) {
  if (!redis || !chatId) return;
  if (!redis.isOpen) await redis.connect();
  await redis.del(`${KEY_PREFIX}${chatId}`).catch(() => {});
  _cache.set(String(chatId), { on: false, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function isEnabled(redis, chatId) {
  // Existing surface (v0.30.4) — kept for backwards compatibility.
  // Now routes through the cached `isOn` so callers in the NL trace
  // path share the same 5-s cache as the new server-side instrumentation.
  return isOn(redis, chatId);
}

// v0.60.161 — cached read for the new high-frequency instrumentation
// paths. Returns true when the chat's verbose flag is set; caches the
// result for CACHE_TTL_MS so a request handler that vlogs N times only
// pays one Redis GET. `enable` / `disable` invalidate the cache.
async function isOn(redis, chatId) {
  if (!redis || !chatId) return false;
  const key = String(chatId);
  const now = Date.now();
  const cached = _cache.get(key);
  if (cached && cached.expiresAt > now) return cached.on;
  let on = false;
  try {
    if (!redis.isOpen) await redis.connect();
    on = Boolean(await redis.get(`${KEY_PREFIX}${chatId}`));
  } catch { /* swallow — verbose is a debug surface, never block on Redis */ }
  _cache.set(key, { on, expiresAt: now + CACHE_TTL_MS });
  return on;
}

// Status (on + TTL remaining) for the /log status reply.
async function status(redis, chatId) {
  if (!redis || !chatId) return { on: false, ttlSeconds: null };
  try {
    if (!redis.isOpen) await redis.connect();
    const on = Boolean(await redis.get(`${KEY_PREFIX}${chatId}`));
    if (!on) return { on: false, ttlSeconds: null };
    const ttl = await redis.ttl(`${KEY_PREFIX}${chatId}`);
    return { on: true, ttlSeconds: ttl };
  } catch {
    return { on: false, ttlSeconds: null };
  }
}

// Direct emit — caller is expected to have gated on `isOn` (or to be
// inside a vlogIf wrapper). Never throws (a misformatted payload should
// not break the request).
function vlog(chatId, payload) {
  try {
    const body = (typeof payload === 'string') ? payload : JSON.stringify(payload);
    console.log(`[VLOG ${chatId}] ${body}`);
  } catch { /* never throw */ }
}

// Single-call gate + emit. Use this at instrumentation sites that are
// off the hot path (Redis cost on cache hit is ~negligible; cache miss
// pays one extra GET but only once per 5s).
async function vlogIf(redis, chatId, payload) {
  if (await isOn(redis, chatId)) vlog(chatId, payload);
}

// Inspect the TTL on a Redis key and emit it. Useful for understanding
// how long the seen-set / session-meta / enrichment cache will live for
// the current chat. No-op when verbose is off.
async function vlogTtl(redis, chatId, key) {
  if (!(await isOn(redis, chatId))) return;
  try {
    const ttl = await redis.ttl(key);
    vlog(chatId, { kind: 'redis-ttl', key, ttl });
  } catch { /* best-effort */ }
}

// Wrap an async block with start/end timing. Always runs the block;
// only emits when verbose is on. Catches + re-throws so the caller's
// error semantics are unchanged.
async function vlogTime(redis, chatId, label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    if (await isOn(redis, chatId)) {
      vlog(chatId, { kind: 'time', label, ms: Date.now() - start, ok: true });
    }
    return result;
  } catch (err) {
    if (await isOn(redis, chatId)) {
      vlog(chatId, { kind: 'time', label, ms: Date.now() - start, ok: false, error: err && (err.message || String(err)) });
    }
    throw err;
  }
}

// Extract cache/expiry headers from an axios response and emit them.
// label disambiguates which outbound call (places-search, places-details,
// gemini-narrate, etc.). No-op when verbose is off.
async function vlogHttp(redis, chatId, label, axiosResponse) {
  if (!(await isOn(redis, chatId))) return;
  const h = (axiosResponse && axiosResponse.headers) || {};
  vlog(chatId, {
    kind: 'http',
    label,
    status: axiosResponse && axiosResponse.status,
    cacheControl: h['cache-control'] || null,
    expires: h.expires || null,
    age: h.age || null,
    contentLength: h['content-length'] || null
  });
}

// Helper used throughout the NL + pipeline flow. `bot.sendMessage` is
// passed in via DI so this module stays decoupled from telegram-bot SDK.
// Returns silently when verbose is off so call-sites don't need guards.
async function say(redis, chatId, sendFn, text) {
  if (!redis || !chatId || !sendFn || !text) return;
  try {
    if (!(await isEnabled(redis, chatId))) return;
    await sendFn(chatId, `🔍 ${text}`);
  } catch (err) {
    console.warn('[Verbose-Log] say failed:', err.message);
  }
}

module.exports = {
  // v0.30.4 user-facing trace surface
  enable, disable, isEnabled, say, TTL_S,
  // v0.60.161 server-side + TMA-side instrumentation surface
  isOn, status, vlog, vlogIf, vlogTtl, vlogTime, vlogHttp, CACHE_TTL_MS
};
