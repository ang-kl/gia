// rate-limit.js — per-chatId Redis sliding-window rate limit middleware
// for the Cuisine API hot endpoints (v0.60.173 / DF-54).
//
// Reuses the v0.59.x Tell-Gia precedent at index.js:10155-10174:
//
//   const hour = Math.floor(Date.now() / 3_600_000);
//   const rlKey = `gia:rl:<endpoint>:<chatId>:<hour>`;
//   const count = await redis.incr(rlKey);
//   if (count === 1) await redis.expire(rlKey, 3600);
//   if (count > cap) return 429;
//
// Strictly a fixed-window-per-epoch-hour counter, not a true sliding
// window — matches the existing Tell-Gia behaviour. Counter resets when
// the hour rolls over so users get a fresh budget hourly.
//
// chatId source: `req.tg.user.id` set by `twa-auth.requireInitDataFromBodyOrHeader`
// (which runs first via the `/api/cuisine/*` chokepoint mount in
// `index.js`). If the auth bypass is active (`SKIP_INIT_DATA_AUTH=true`)
// `req.tg.devBypass === true` and `req.tg.user` is null — the limiter
// fails open in that case (preview / dev convenience).
//
// Global dev bypass: `SKIP_RATE_LIMIT=true` short-circuits every limiter
// to no-op. Strict-string check on `"true"` (matches `SKIP_INIT_DATA_AUTH`
// convention). NEVER set this in prod.
//
// Redis-down behaviour: fail open. Real spend is still bounded by the
// upstream auth gate (which rejects anonymous probes), the Places API
// budget caps (DF-55), and the response-cache TTLs.
//
// Usage:
//
//   const { makeRateLimiter } = require('./rate-limit');
//   const rlSearch = makeRateLimiter(redis, { endpoint: 'search', cap: 60 });
//   app.post('/api/cuisine/search', rlSearch, async (req, res) => { … });

// v0.60.175 — windowSec default lowered 3600 → 900 (15 minutes) per
// operator: "TTL Should reset by 15 minutes". The rate-limit Redis key
// now expires after 900 s and the bucket index advances at every
// 15-min epoch boundary (00:00, 00:15, 00:30, …). Per-endpoint caps
// (set at the call sites in index.js) are unchanged, so the effective
// hourly ceiling per chatId rises ~4× — money defence shifts further
// onto DF-55 (cloud-console daily quotas + budget caps).
// v0.62.690 — optional `keyFn`. Every caller so far sits behind the
// `/api/cuisine/*` auth chokepoint and can key on `req.tg.user.id`, which stays
// the default. `/api/geo/road-search` cannot: it is an unauthenticated GET (like
// `/api/transport/stations`, which the same field already calls), so there is no
// chatId to key on and the limiter would fail open on every request. It passes
// `keyFn: (req) => req.ip` instead. The default is unchanged, so the five
// existing call sites behave exactly as before.
// v0.62.716 — Phase D. The Redis-counter core, extracted verbatim from
// makeRateLimiter's body so a NON-Express caller (the Telegram bot command
// handlers, which have no req/res/next) can share the exact same mechanism
// and key shape instead of growing a second, drifting copy of it.
//
// Returns { limited, count, cap, retryAfterSec, reason }:
//   limited === false  → caller proceeds. `reason` says why when the check
//                        was skipped rather than passed ('bypass' | 'no-key'
//                        | 'redis-down' | 'redis-error' | 'under-cap').
//   limited === true   → caller refuses; retryAfterSec is when the fixed
//                        window rolls over.
//
// Fails OPEN on every abnormal path (dev bypass, missing key, Redis down or
// erroring) — identical to the pre-extraction middleware. Never throws.
async function checkRateLimit(redis, { endpoint, key, cap, windowSec = 900, now = Date.now() }) {
  if (!endpoint) throw new Error('rate-limit: endpoint label is required');
  if (!Number.isFinite(cap) || cap <= 0) throw new Error('rate-limit: cap must be a positive integer');

  const open = (reason, extra = {}) => ({ limited: false, cap, reason, ...extra });

  // Dev bypass — never in prod.
  if (process.env.SKIP_RATE_LIMIT === 'true') return open('bypass');
  if (!key) return open('no-key');
  if (!redis?.isOpen) return open('redis-down');

  try {
    const bucket = Math.floor(now / (windowSec * 1000));
    const rlKey = `gia:rl:${endpoint}:${key}:${bucket}`;
    const count = await redis.incr(rlKey);
    if (count === 1) await redis.expire(rlKey, windowSec);
    const retryAfterSec = windowSec - (Math.floor(now / 1000) % windowSec);
    if (count > cap) return { limited: true, count, cap, retryAfterSec, reason: 'over-cap' };
    return open('under-cap', { count });
  } catch (err) {
    console.warn(`[rate-limit] check failed for ${endpoint}:`, err.message);
    return open('redis-error');
  }
}

// Express middleware wrapper. Behaviour is unchanged from pre-v0.62.716 for
// all existing /api/cuisine/* call sites — same key shape, same fail-open
// paths, same 429 body — it just delegates the counter to checkRateLimit.
function makeRateLimiter(redis, { endpoint, cap, windowSec = 900, keyFn = null }) {
  if (!endpoint) throw new Error('rate-limit: endpoint label is required');
  if (!Number.isFinite(cap) || cap <= 0) throw new Error('rate-limit: cap must be a positive integer');

  return async function rateLimiter(req, res, next) {
    // Auth dev-bypass (SKIP_INIT_DATA_AUTH=true) → no chatId to key on;
    // fail open. Same for any other path where the auth middleware
    // didn't populate req.tg (shouldn't happen on /api/cuisine/* given
    // the chokepoint but defensively no-op).
    const chatId = keyFn ? keyFn(req) : req.tg?.user?.id;
    const verdict = await checkRateLimit(redis, { endpoint, key: chatId, cap, windowSec });
    if (!verdict.limited) return next();
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    console.warn(`[rate-limit] 429 ${endpoint} chatId=${chatId} ip=${ip} count=${verdict.count}/${cap}`);
    return res.status(429).json({
      error: 'rate_limited',
      endpoint,
      retryAfterSec: verdict.retryAfterSec
    });
  };
}

module.exports = { makeRateLimiter, checkRateLimit };
