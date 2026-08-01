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
function makeRateLimiter(redis, { endpoint, cap, windowSec = 900, keyFn = null }) {
  if (!endpoint) throw new Error('rate-limit: endpoint label is required');
  if (!Number.isFinite(cap) || cap <= 0) throw new Error('rate-limit: cap must be a positive integer');

  return async function rateLimiter(req, res, next) {
    // Dev bypass — never in prod.
    if (process.env.SKIP_RATE_LIMIT === 'true') return next();

    const chatId = keyFn ? keyFn(req) : req.tg?.user?.id;
    // Auth dev-bypass (SKIP_INIT_DATA_AUTH=true) → no chatId to key on;
    // fail open. Same for any other path where the auth middleware
    // didn't populate req.tg (shouldn't happen on /api/cuisine/* given
    // the chokepoint but defensively no-op).
    if (!chatId) return next();

    if (!redis?.isOpen) {
      // Redis transiently down — fail open. The 429 protection is a
      // belt to a series of braces (auth + per-key budget caps + cache).
      return next();
    }

    try {
      const bucket = Math.floor(Date.now() / (windowSec * 1000));
      const rlKey = `gia:rl:${endpoint}:${chatId}:${bucket}`;
      const count = await redis.incr(rlKey);
      if (count === 1) await redis.expire(rlKey, windowSec);
      if (count > cap) {
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
        console.warn(`[rate-limit] 429 ${endpoint} chatId=${chatId} ip=${ip} count=${count}/${cap}`);
        return res.status(429).json({
          error: 'rate_limited',
          endpoint,
          retryAfterSec: windowSec - (Math.floor(Date.now() / 1000) % windowSec)
        });
      }
    } catch (err) {
      // Redis hiccup mid-call — fail open + log.
      console.warn(`[rate-limit] check failed for ${endpoint}:`, err.message);
    }
    return next();
  };
}

module.exports = { makeRateLimiter };
