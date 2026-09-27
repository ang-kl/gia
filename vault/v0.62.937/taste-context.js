// taste-context.js — v0.62.901
//
// THE CONTEXT A SUGGESTION IS FOR — and, deliberately, nothing about who is asking.
//
// Operator: *"find a way to learn about the pre-user taste vector without user-name or
// user-device, but include meal period, weather and location and time of search and free-text
// query (intepreted)"*. So the taste vector belongs to the CONTEXT — a rainy Tuesday dinner —
// never to a person. `/privacy` says *"No personal profile is created"*, and this module is where
// that constraint is enforced rather than merely intended: it takes `now`, coordinates and an
// optional query, and returns no identifier of any kind. There is nothing here to key on a chat.
//
// WHY DAY-TYPE COMES FROM `localNow` AND NOT `estimateWaitMinutes`. The obvious source looks like
// `transport.estimateWaitMinutes(now)`, which already computes `isWeekday` and an SGT hour — but
// its LABEL collapses to `'off-peak'` for weekday-midday and for all of Saturday alike, so it
// cannot answer "is this a leisure occasion". `open-hours.localNow(now)` gives `{day, minutes}`
// with the day correct across the UTC boundary, and `holidays.isPublicHoliday` is synchronous,
// memory-cached and falls back to a hardcoded table, so it never blocks a reply.
//
// WEATHER IS READ ONLY FROM CACHE, NEVER FETCHED. `getNowcastCached` / `getRainfallCached` are
// Redis reads (TTL 300 s / 60 s) populated by the search path. On a cold cache the weather signal
// is simply NOT LIVE, and `taste-score.js` renormalises over the terms that are — which is why
// this module returns `liveSignals[]` rather than substituting a default. A guessed "dry" is a
// wrong answer wearing a right answer's shape; an absent signal is honest and costs one weight.

'use strict';

const DAY_TYPES = Object.freeze(['weekday', 'weekend', 'holiday']);
const WEATHER_STATES = Object.freeze(['wet', 'dry', 'unknown']);
// The six `mealPeriodSGT` ids, pinned here so the bucket space is a closed set the aggregate can
// reason about rather than whatever that function happens to return.
const BUCKET_PERIODS = Object.freeze(['breakfast', 'lunch', 'afternoon', 'dinner', 'supper', 'night_supper']);

const WET_RE = /(shower|thundery|thunder|rain|squall|wet|drizzle)/i;
const RAIN_MM = 0.2;

/**
 * The bucket a context belongs to. **Period × day-type only — 18 buckets.**
 *
 * Zone and weather are deliberately NOT in the key, and that is a decision with two reasons. At
 * ~200 users and ~400 searches a week, adding 5 zones × 3 weather states would make 270 buckets
 * and roughly 1.5 observations each per week — nine months to warm one, by which point the season
 * has moved underneath it. And a neighbourhood-plus-hour bucket at this population edges toward
 * identifying somebody, which is the one thing this design exists to avoid. Both stay in the
 * SCORE, where they are rules rather than statistics.
 */
function bucketIdFor({ period, dayType } = {}) {
  const p = BUCKET_PERIODS.includes(period) ? period : 'lunch';
  const d = DAY_TYPES.includes(dayType) ? dayType : 'weekday';
  return `${p}:${d}`;
}

function dayTypeFor(now = new Date(), deps = {}) {
  const isHoliday = deps.isPublicHoliday
    || ((d) => { try { return require('./holidays').isPublicHoliday(d); } catch { return null; } });
  if (isHoliday(now)) return 'holiday';
  const localNow = deps.localNow || ((d) => require('./open-hours').localNow(d));
  const { day } = localNow(now) || {};
  return (day === 0 || day === 6) ? 'weekend' : 'weekday';
}

/**
 * Build the context. All IO is optional and failure-tolerant: anything unavailable is simply
 * absent from `liveSignals`, and the scorer drops the matching weight.
 *
 * @returns {Promise<{period, mealLabel, dayType, weather, holiday, lat, lng, queryText, bucketId, liveSignals[]}>}
 */
async function buildContext({ now = new Date(), lat = null, lng = null, redis = null, queryText = '', deps = {} } = {}) {
  const liveSignals = [];

  const mealPeriodSGT = deps.mealPeriodSGT || ((d) => require('./vibe-suggest').mealPeriodSGT(d));
  let period = 'lunch';
  let mealLabel = 'lunch';
  try {
    const m = mealPeriodSGT(now) || {};
    if (BUCKET_PERIODS.includes(m.id)) { period = m.id; mealLabel = m.label || m.id; liveSignals.push('period'); }
  } catch { /* the default stands, and 'period' stays out of liveSignals */ }

  let dayType = 'weekday';
  let holiday = null;
  try {
    dayType = dayTypeFor(now, deps);
    liveSignals.push('dayType');
    const isHoliday = deps.isPublicHoliday || ((d) => require('./holidays').isPublicHoliday(d));
    holiday = isHoliday(now) || null;
  } catch { /* dayType stays 'weekday' and out of liveSignals */ }

  // Cache-only. See the header: a cold cache means the signal is absent, not "dry".
  let weather = 'unknown';
  if (redis && redis.isOpen && Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      const w = require('./weather');
      if (w.inSgBounds(lat, lng)) {
        const [nowcast, rainfall] = await Promise.all([
          w.getNowcastCached(redis).catch(() => null),
          w.getRainfallCached(redis).catch(() => null),
        ]);
        if (nowcast || rainfall) {
          const forecasts = (nowcast && nowcast.forecasts) || [];
          const anyWet = forecasts.some((f) => WET_RE.test(String(f && f.forecast) || ''));
          const readings = (rainfall && rainfall.readings) || [];
          const rainingNow = readings.some((r) => Number(r && r.value) > RAIN_MM);
          weather = (anyWet || rainingNow) ? 'wet' : 'dry';
          liveSignals.push('weather');
        }
      }
    } catch { /* weather stays 'unknown' */ }
  }

  const q = typeof queryText === 'string' ? queryText.trim() : '';
  if (q) liveSignals.push('query');
  if (Number.isFinite(lat) && Number.isFinite(lng)) liveSignals.push('geo');

  return {
    period, mealLabel, dayType, weather, holiday,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    queryText: q,
    bucketId: bucketIdFor({ period, dayType }),
    liveSignals,
  };
}

module.exports = {
  buildContext, bucketIdFor, dayTypeFor,
  BUCKET_PERIODS, DAY_TYPES, WEATHER_STATES,
};
