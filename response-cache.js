// response-cache.js — v0.41.0 cross-user response cache for /cuisine.
//
// Two diners at the same lunchtime hub firing identical queries should
// see the same picks served from a 30-min cache, not pay a full LLM
// round-trip each. Empirically ~70-80% of weekday lunch traffic
// concentrates on the top 20 anchors (Raffles Place, Tanjong Pagar,
// Maxwell, Marina Bay, Bugis, Orchard, Jurong East, Tampines Hub, etc.)
// so the hit rate target is high enough to materially shift cost +
// latency.
//
// Cache key: `cuisine-cache:<geoBucket>:<cuisinesSorted>:<mealPeriod>:<dow>`
//
//   geoBucket = "<lat3>:<lng3>" — lat/lng rounded to 3 decimal places.
//               In Singapore latitudes (~1.3°), 0.001° ≈ 110m.
//               Buckets are coarser than user precision but tight
//               enough that a venue 200m away from the bucket centre
//               is still walkable.
//
//   cuisinesSorted = the cuisines array sorted alphabetically and
//                    joined with '|', or 'any' when empty. Sort is
//                    critical — caching is a prefix match, so
//                    ['Korean','Japanese'] and ['Japanese','Korean']
//                    must hash to the same key.
//
//   mealPeriod = 'breakfast'|'lunch'|'afternoon'|'dinner'|'supper'
//                — meal preferences shift across periods so cache
//                MUST partition by period.
//
//   dow = day-of-week 0..6 (SGT) — weekday vs weekend menu/availability
//         differs at most venues; partition prevents Sunday brunch
//         picks from leaking into Wednesday lunch.
//
// TTL: 30 minutes. Long enough to absorb rush-hour bursts, short enough
// that openNow / queue estimates / weather context don't go stale. The
// cached payload is the validated venue list; the Refine pass still
// runs per-request so weather/traffic stay fresh.
//
// Honest caveats:
//   - The cache stores DISCOVERY output, not REFINE output. Two users
//     half an hour apart get the same 5 venues but different
//     travel-advice / shelter-note copy because Refine ran twice. This
//     is by design — refine is cheap, discovery is expensive.
//   - radius and specialRequest are NOT in the key (would balkanise
//     the cache too much). The cache is keyed on the choices that
//     actually move the candidate set most: location bucket, cuisines,
//     time of day, day of week.

const KEY_PREFIX = 'cuisine-cache:';
const TTL_S = 30 * 60;

function bucketCoord(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

function buildKey({ lat, lng, cuisines, mealPeriod }) {
  const geoBucket = `${bucketCoord(lat)}:${bucketCoord(lng)}`;
  const cuisineKey = (Array.isArray(cuisines) && cuisines.length)
    ? cuisines.slice().map((c) => String(c).toLowerCase()).sort().join('|')
    : 'any';
  const period = String(mealPeriod || 'now').toLowerCase();
  // SGT day-of-week. 0 = Sunday.
  const sgtNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const dow = sgtNow.getUTCDay();
  return `${KEY_PREFIX}${geoBucket}:${cuisineKey}:${period}:${dow}`;
}

async function get(redis, params) {
  if (!redis?.isOpen) return null;
  const key = buildKey(params);
  try {
    const raw = await redis.get(key);
    if (!raw) return { hit: false, key };
    const parsed = JSON.parse(raw);
    return { hit: true, key, venues: parsed.venues || [], cachedAt: parsed.cachedAt };
  } catch (err) {
    console.warn(`[ResponseCache] read failed (${err.message?.slice(0, 80)})`);
    return { hit: false, key };
  }
}

async function set(redis, params, venues) {
  if (!redis?.isOpen || !Array.isArray(venues) || !venues.length) return null;
  const key = buildKey(params);
  const payload = { venues, cachedAt: Date.now() };
  try {
    await redis.set(key, JSON.stringify(payload), { EX: TTL_S });
    return key;
  } catch (err) {
    console.warn(`[ResponseCache] write failed (${err.message?.slice(0, 80)})`);
    return null;
  }
}

// Telemetry counters — kept fire-and-forget so cache failures never
// block a real request. Bumped from pipeline-task.js after read/write.
async function incrHit(redis) {
  if (!redis?.isOpen) return;
  redis.incr(`${KEY_PREFIX}metric:hit`).catch(() => {});
}
async function incrMiss(redis) {
  if (!redis?.isOpen) return;
  redis.incr(`${KEY_PREFIX}metric:miss`).catch(() => {});
}
async function incrWrite(redis) {
  if (!redis?.isOpen) return;
  redis.incr(`${KEY_PREFIX}metric:write`).catch(() => {});
}

module.exports = { get, set, buildKey, incrHit, incrMiss, incrWrite, TTL_S };
