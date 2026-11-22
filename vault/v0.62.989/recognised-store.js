// recognised-store.js — v0.34.0 Redis ops for the "Hall of Fame"
// recognised-venue store.
//
// Two-stage pipeline: Gemini-drafted entries land in `recog:staging:<placeId>`
// for human verification (via redis-cli + /admin/promote-recognised). Once
// promoted, they move to `recog:venue:<placeId>` HASH + `recog:venues:geo`
// GEO set for nearest-N queries.
//
// This split exists because Gemini's training data is not authoritative
// for "current Michelin-Star holders in SG" — restaurants gain/lose stars
// every year and the LLM may hallucinate. Promotion is a manual gate.
//
// Schema:
//   recog:venue:<placeId>     HASH  — promoted entry
//     placeId, name, address, lat, lng, source, awards (JSON array),
//     tags (JSON array), promoted_at, drafted_at
//   recog:venues:geo          GEO   — member=placeId, score=geohash
//   recog:staging:<placeId>   HASH  — pending entry (same shape minus promoted_at)
//   recog:staging:list        SET   — placeIds awaiting promotion
//   recog:rejected:<placeId>  HASH  — rejected entry kept for audit (TTL 90d)
//
// Awards JSON shape (per entry):
//   [{ category: 'michelin-star', year: 2025, level: 1 },
//    { category: 'bib-gourmand', year: 2024 },
//    { category: 'asia-50-best', year: 2023, rank: 27 }, ...]

const VENUE_PREFIX = 'recog:venue:';
const STAGING_PREFIX = 'recog:staging:';
const REJECTED_PREFIX = 'recog:rejected:';
const STAGING_LIST = 'recog:staging:list';
const VENUES_GEO = 'recog:venues:geo';
const REJECTED_TTL_S = 90 * 86400; // 90 d

const VALID_CATEGORIES = new Set([
  'michelin-star',
  'bib-gourmand',
  'michelin-selected',
  'asia-50-best',
  'world-culinary-awards',
  'best-chef-awards',
  'unesco-ich' // hawker culture inscription, special-cased
]);

function venueKey(placeId) { return `${VENUE_PREFIX}${placeId}`; }
function stagingKey(placeId) { return `${STAGING_PREFIX}${placeId}`; }
function rejectedKey(placeId) { return `${REJECTED_PREFIX}${placeId}`; }

function safeStringify(v) {
  try { return JSON.stringify(v); } catch { return JSON.stringify(null); }
}
function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function rowToEntry(raw) {
  if (!raw || !raw.placeId) return null;
  return {
    placeId: raw.placeId,
    name: raw.name || '',
    address: raw.address || '',
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    source: raw.source || '',
    awards: safeParse(raw.awards || '[]', []),
    tags: safeParse(raw.tags || '[]', []),
    promoted_at: raw.promoted_at ? Number(raw.promoted_at) : null,
    drafted_at: raw.drafted_at ? Number(raw.drafted_at) : null
  };
}

function validateEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('entry must be an object');
  if (!entry.placeId || typeof entry.placeId !== 'string') throw new Error('placeId required');
  if (!entry.name || typeof entry.name !== 'string') throw new Error('name required');
  if (!Number.isFinite(Number(entry.lat)) || !Number.isFinite(Number(entry.lng))) throw new Error('lat/lng required');
  if (!Array.isArray(entry.awards) || !entry.awards.length) throw new Error('awards array required (≥1 entry)');
  for (const a of entry.awards) {
    if (!a || !VALID_CATEGORIES.has(a.category)) throw new Error(`invalid award category: ${a?.category}`);
  }
}

async function setStaging(redis, entry) {
  validateEntry(entry);
  const now = Date.now();
  const key = stagingKey(entry.placeId);
  await redis.hSet(key, {
    placeId: entry.placeId,
    name: entry.name,
    address: entry.address || '',
    lat: String(entry.lat),
    lng: String(entry.lng),
    source: entry.source || 'gemini-seeder',
    awards: safeStringify(entry.awards),
    tags: safeStringify(entry.tags || []),
    drafted_at: String(now)
  });
  await redis.sAdd(STAGING_LIST, entry.placeId);
}

async function listStaging(redis, limit = 100) {
  const ids = await redis.sMembers(STAGING_LIST);
  const out = [];
  for (const placeId of ids.slice(0, limit)) {
    const raw = await redis.hGetAll(stagingKey(placeId));
    const entry = rowToEntry(raw);
    if (entry) out.push(entry);
  }
  return out;
}

async function getStaging(redis, placeId) {
  const raw = await redis.hGetAll(stagingKey(placeId));
  return rowToEntry(raw);
}

async function promote(redis, placeId) {
  // Move staging → live. Staging row is deleted after copy.
  const staging = await redis.hGetAll(stagingKey(placeId));
  if (!staging || !staging.placeId) throw new Error(`no staging entry for ${placeId}`);
  const entry = rowToEntry(staging);
  const now = Date.now();
  await redis.hSet(venueKey(placeId), {
    placeId: entry.placeId,
    name: entry.name,
    address: entry.address,
    lat: String(entry.lat),
    lng: String(entry.lng),
    source: entry.source,
    awards: safeStringify(entry.awards),
    tags: safeStringify(entry.tags),
    drafted_at: String(entry.drafted_at || now),
    promoted_at: String(now)
  });
  await redis.geoAdd(VENUES_GEO, [{ longitude: entry.lng, latitude: entry.lat, member: entry.placeId }]);
  await redis.del(stagingKey(placeId));
  await redis.sRem(STAGING_LIST, placeId);
  return entry;
}

async function reject(redis, placeId, reason = '') {
  const staging = await redis.hGetAll(stagingKey(placeId));
  if (!staging || !staging.placeId) throw new Error(`no staging entry for ${placeId}`);
  const fields = { ...staging, rejected_at: String(Date.now()), reason: String(reason).slice(0, 200) };
  await redis.hSet(rejectedKey(placeId), fields);
  await redis.expire(rejectedKey(placeId), REJECTED_TTL_S);
  await redis.del(stagingKey(placeId));
  await redis.sRem(STAGING_LIST, placeId);
}

async function getLive(redis, placeId) {
  const raw = await redis.hGetAll(venueKey(placeId));
  return rowToEntry(raw);
}

async function listLive(redis, limit = 500) {
  // Iterate the GEO set (no built-in count for GEOSEARCH; use ZRANGE).
  const ids = await redis.zRange(VENUES_GEO, 0, limit - 1);
  const out = [];
  for (const placeId of ids) {
    const e = await getLive(redis, placeId);
    if (e) out.push(e);
  }
  return out;
}

async function nearestLive(redis, lat, lng, count = 5, radiusM = 5000) {
  // GEOSEARCH FROMLONLAT BYRADIUS … COUNT n ASC.
  try {
    const results = await redis.sendCommand([
      'GEOSEARCH', VENUES_GEO,
      'FROMLONLAT', String(lng), String(lat),
      'BYRADIUS', String(radiusM), 'm',
      'ASC', 'COUNT', String(count),
      'WITHCOORD', 'WITHDIST'
    ]);
    if (!Array.isArray(results)) return [];
    const out = [];
    for (const row of results) {
      // Each row: [member, distance, [lng, lat]]
      const [placeId, distStr, coord] = row;
      const entry = await getLive(redis, placeId);
      if (entry) {
        out.push({
          ...entry,
          distanceM: Math.round(Number(distStr)),
          // coord echo not used (we have lat/lng in the entry)
        });
      }
    }
    return out;
  } catch (err) {
    console.error('[recognised-store] nearestLive failed:', err.message);
    return [];
  }
}

async function counts(redis) {
  const [stagingCount, liveCount] = await Promise.all([
    redis.sCard(STAGING_LIST).catch(() => 0),
    redis.zCard(VENUES_GEO).catch(() => 0)
  ]);
  return { staging: stagingCount, live: liveCount };
}

module.exports = {
  VALID_CATEGORIES,
  VENUE_PREFIX,
  STAGING_PREFIX,
  REJECTED_PREFIX,
  STAGING_LIST,
  VENUES_GEO,
  setStaging,
  listStaging,
  getStaging,
  promote,
  reject,
  getLive,
  listLive,
  nearestLive,
  counts
};
