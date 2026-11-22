// tell-gia-rate-limit.js — v0.62.941.
//
// ONE hourly budget of AI ("Tell Soleat") calls per Telegram user, shared by the
// Cuisine Mini App's AI route and the bot chat's question path.
//
// The operator chose a shared cap on 25-10 '26 ("Share the 60/hour cap"). Until this
// release the counter was built inline in /api/cuisine/nl-query (v0.58.19); the chat
// path now spends from the same budget, so the key format is kept exactly — a user
// with 40 Mini App calls this hour has 20 left in chat, not 60.
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md (invariant I4).

'use strict';

const TELL_GIA_HOURLY_CAP = 60;
const HOUR_MS = 3_600_000;

function tellGiaRateKey(id, now = Date.now()) {
  return `tell-gia:rl:${id}:${Math.floor(now / HOUR_MS)}`;
}

// Returns { allowed, count }. On Redis trouble it ALLOWS, as the route always has:
// the 60 s response cache and the output-token cap still bound spend, and a Redis
// blip should not turn every AI request into an error.
async function consumeTellGiaQuota(redis, id, { now = Date.now() } = {}) {
  try {
    if (!redis || !redis.isOpen) return { allowed: true, count: null };
    const key = tellGiaRateKey(id, now);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    return { allowed: count <= TELL_GIA_HOURLY_CAP, count };
  } catch (err) {
    console.warn('[TellGia-RL] rate-limit check failed:', err.message);
    return { allowed: true, count: null };
  }
}

module.exports = { TELL_GIA_HOURLY_CAP, tellGiaRateKey, consumeTellGiaQuota };
