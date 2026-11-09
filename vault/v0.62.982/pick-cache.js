// pick-cache.js — v0.27.0
//
// 60-second per-chat cache for /cuisine results. Cuts tap-spam cost
// (~$0.07/search × Reason+Refine) by deduping near-identical requests
// from the same user. Cache key folds chat-id + a 100 m lat/lng grid +
// the search params that influence Gemini output, so two taps within
// a minute at the same approximate location with the same controls
// share the same expensive response.

const TTL_S = 60;
const KEY_PREFIX = 'pick-cache:';

function gridFloor(value, stepDeg) {
  return Math.round(value / stepDeg) * stepDeg;
}

// 100 m of latitude ≈ 0.0009°. Longitude scaled by cos(lat) but we
// don't need that precision here — over-coalescing by a couple of
// metres is fine and keeps the key short.
const GRID_DEG = 0.0009;

function keyFor(chatId, params) {
  const lat = gridFloor(Number(params.lat) || 0, GRID_DEG).toFixed(4);
  const lng = gridFloor(Number(params.lng) || 0, GRID_DEG).toFixed(4);
  const cuisines = Array.isArray(params.cuisines)
    ? params.cuisines.map((c) => String(c).toLowerCase().trim()).sort().join('|')
    : '';
  const radius = Number(params.radius) || 1000;
  const recency = Number(params.recencyDays) || 90;
  const queue = Number(params.queueMaxMin) || 15;
  const mode = String(params.mode || 'walk');
  const when = String(params.when || 'now');
  const preset = String(params.preset || '');
  return `${KEY_PREFIX}${chatId}:${lat},${lng}:r${radius}:rd${recency}:q${queue}:${mode}:${when}:p${preset}:c${cuisines}`;
}

async function get(redis, chatId, params) {
  if (!redis || !chatId) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const raw = await redis.get(keyFor(chatId, params));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Pick-Cache] get failed:', err.message);
    return null;
  }
}

async function set(redis, chatId, params, value) {
  if (!redis || !chatId || !value) return;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.set(keyFor(chatId, params), JSON.stringify(value), { EX: TTL_S });
  } catch (err) {
    console.warn('[Pick-Cache] set failed:', err.message);
  }
}

module.exports = { get, set, TTL_S, keyFor };
