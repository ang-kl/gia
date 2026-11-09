// taste-aggregate.js — v0.62.901
//
// ⚠ READ THIS BEFORE TRUSTING ANYTHING THIS MODULE RETURNS.
//
// Operator asked to *"learn about the pre-user taste vector"*, and chose "build it, gated, and say
// so plainly". This is the gated part, and the plain saying is here rather than only in the PR.
//
// THE ARITHMETIC. ~200 active users × ~2 searches/week ≈ **400 observations a week**. Across the
// 18 buckets (6 meal periods × 3 day types) that is ~22 per bucket per week, so a bucket clears
// K_MIN in about a week and stays clear. That is the ONLY reason this is worth building at all,
// and it only holds because zone and weather were kept OUT of the key: with them the space is 270
// buckets, ~1.5 observations each per week, and roughly nine months to warm one — by which point
// the season has moved underneath it.
//
// WHAT IT ACTUALLY BUYS, STATED HONESTLY: rotation, and a weak "does this dish convert to real
// venues at this hour" signal. **It will not discover that Tiong Bahru prefers Teochew on rainy
// Tuesdays, and it must not be sold as if it might.** Its real value is different and better — it
// makes the hand-designed weights in `taste-score.js` MEASURABLE. "Is the cold-start scorer's top
// pick also the highest keep-rate pick in this bucket?" becomes answerable in a month, and that
// EVALUATES the weights rather than replacing them.
//
// NOTHING HERE IS KEYED ON A PERSON. No chatId, no device id, no zone, no coordinates, no
// timestamp finer than the period, and no query text — `freetext-log.js` already holds queries
// separately and identity-free, and joining the two would be worse than either alone. This is why
// `/forgetme` has nothing to delete here, and that absence is the proof the privacy copy holds
// rather than a gap in the erasure list. `__tests__/forgetme-erasure.test.js` would otherwise
// require it to be erased or exempted; it is neither, because there is no per-user row.
//
// Writes mirror `usage-log.js` exactly: fire-and-forget, every error swallowed, never blocking a
// reply. Instrumentation that can fail a user's request is worse than no instrumentation.

'use strict';

const TTL_S = 90 * 24 * 60 * 60;   // matches the /privacy retention promise

// A bucket is ignored entirely below this. NOT 5: with 66 cuisines and 1,697 dishes, five
// observations is five things seen once each — noise indistinguishable from one person's session,
// and at 200 users quite possibly IS one person's session. 25 matches the one-week arrival rate,
// so a bucket becomes trusted in about a week rather than never or immediately.
const K_MIN = 25;
// And a single <slug>::<dish> cell needs its own floor before its keep-rate is read, or the rate
// is 0/1 or 1/1 and reads as certainty.
const CELL_MIN = 5;

const keyShown = (bucketId) => `taste:shown:${bucketId}`;
const keyKept = (bucketId) => `taste:kept:${bucketId}`;
const keyN = (bucketId) => `taste:n:${bucketId}`;

const cellOf = (slug, dish) => `${slug}::${dish}`;

/** One suggestion was put in front of somebody. Fire-and-forget. */
async function recordShown(redis, bucketId, slug, dish) {
  if (!redis || !redis.isOpen || !bucketId || !slug || !dish) return false;
  try {
    await redis.hIncrBy(keyShown(bucketId), cellOf(slug, dish), 1);
    await redis.expire(keyShown(bucketId), TTL_S);
    await redis.incr(keyN(bucketId));
    await redis.expire(keyN(bucketId), TTL_S);
    return true;
  } catch { return false; }
}

/** Somebody tapped it AND the search behind it returned at least one venue. Fire-and-forget. */
async function recordKept(redis, bucketId, slug, dish) {
  if (!redis || !redis.isOpen || !bucketId || !slug || !dish) return false;
  try {
    await redis.hIncrBy(keyKept(bucketId), cellOf(slug, dish), 1);
    await redis.expire(keyKept(bucketId), TTL_S);
    return true;
  } catch { return false; }
}

/**
 * Read a bucket. `trusted` is the whole point: below K_MIN the caller must treat this as absent,
 * and `taste-score.js` drops the rotation weight entirely rather than contributing a small number.
 *
 * @returns {Promise<{n:number, trusted:boolean, rate:(slug,dish)=>number|null}>}
 */
async function readBucket(redis, bucketId) {
  const dead = { n: 0, trusted: false, rate: () => null };
  if (!redis || !redis.isOpen || !bucketId) return dead;
  try {
    const [nRaw, shown, kept] = await Promise.all([
      redis.get(keyN(bucketId)).catch(() => null),
      redis.hGetAll(keyShown(bucketId)).catch(() => ({})),
      redis.hGetAll(keyKept(bucketId)).catch(() => ({})),
    ]);
    const n = Number(nRaw) || 0;
    if (n < K_MIN) return { n, trusted: false, rate: () => null };
    return {
      n,
      trusted: true,
      rate(slug, dish) {
        const c = cellOf(slug, dish);
        const s = Number((shown || {})[c]) || 0;
        if (s < CELL_MIN) return null;         // a rate of 1/1 is not a rate
        const k = Number((kept || {})[c]) || 0;
        return Math.max(0, Math.min(1, k / s));
      },
    };
  } catch { return dead; }
}

module.exports = { recordShown, recordKept, readBucket, K_MIN, CELL_MIN, TTL_S, keyShown, keyKept, keyN, cellOf };
