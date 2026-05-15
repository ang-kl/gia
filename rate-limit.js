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

function makeRateLimiter(redis, { endpoint, cap, windowSec = 3600 }) {
  if (!endpoint) throw new Error('rate-limit: endpoint label is required');
  if (!Number.isFinite(cap) || cap <= 0) throw new Error('rate-limit: cap must be a positive integer');

  return async function rateLimiter(req, res, next) {
    // Dev bypass — never in prod.
    if (process.env.SKIP_RATE_LIMIT === 'true') return next();

    const chatId = req.tg?.user?.id;
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
