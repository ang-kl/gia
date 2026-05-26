const crypto = require('crypto');

const LOC_TTL = 24 * 60 * 60;  // 24 hours
const PENDING_TTL = 5 * 60;    // 5 minutes

function hashChatId(chatId) {
  return crypto.createHash('sha256').update(String(chatId)).digest('hex').slice(0, 16);
}

async function setUserLocation(redis, chatId, lat, lng, opts = {}) {
  if (!redis.isOpen) await redis.connect();
  const key = `loc:${hashChatId(chatId)}`;
  // v0.30.2: stamp setAt so callers can compute staleness for the
  // 15-min "your location is old, refresh?" reminder.
  // v0.61.122: optional anchor metadata from /location precinct picks.
  // `region` ('SG' | 'JB' | 'OTHER') lets the cuisine TMA + chat
  // pipelines know which side of the Causeway we're on; `radiusCapM`
  // hard-caps Places search radii (JB → 30 km, IOI Putrajaya → 20 km
  // per v0.61.185; was 15 km). Legacy 'MY-PUT' anchors written
  // before v0.61.185 still work — read paths accept both values.
  // `label` / `precinctId` pass through for display + analytics.
  // All four are OPTIONAL — old callers (share-pin handler, manual
  // geocode handler) pass nothing and get exactly the legacy payload.
  const payload = { lat, lng, setAt: Date.now() };
  if (opts && typeof opts === 'object') {
    if (typeof opts.region === 'string' && opts.region) payload.region = opts.region;
    if (Number.isFinite(opts.radiusCapM) && opts.radiusCapM > 0) payload.radiusCapM = opts.radiusCapM;
    if (typeof opts.label === 'string' && opts.label) payload.label = opts.label;
    if (typeof opts.precinctId === 'string' && opts.precinctId) payload.precinctId = opts.precinctId;
    // v0.61.139 — structured address parts from Places addressComponents.
    // Optional — set only when the caller geocoded via geocodeQueryRegion
    // (precinct picks have no addressComponents). Persisted so the Menu
    // TMA's anchor pill can render "<street> + <building> + (<postal>)"
    // after a reload without re-hitting Places.
    if (typeof opts.street === 'string' && opts.street) payload.street = opts.street;
    if (typeof opts.building === 'string' && opts.building) payload.building = opts.building;
    if (typeof opts.postal === 'string' && opts.postal) payload.postal = opts.postal;
  }
  await redis.setEx(key, LOC_TTL, JSON.stringify(payload));
}

async function getUserLocation(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get(`loc:${hashChatId(chatId)}`);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    // Backwards-compat for pre-v0.30.2 entries without setAt.
    if (parsed && typeof parsed === 'object' && !parsed.setAt) parsed.setAt = null;
    return parsed;
  } catch {
    return null;
  }
}

// v0.30.2: minutes since the user last shared/typed a location, or
// `null` if no location stored / pre-v0.30.2 entry without timestamp.
async function getLocationAgeMinutes(redis, chatId) {
  const loc = await getUserLocation(redis, chatId);
  if (!loc?.setAt) return null;
  return Math.floor((Date.now() - loc.setAt) / 60000);
}

const SEEN_TTL = 30 * 24 * 60 * 60;  // 30 days

// v0.61.84 — per-chat last-activity marker. touchLastSeen returns the
// PRIOR timestamp (ms epoch, or null) and then stamps `now`, so one
// call yields the idle gap and refreshes the marker. Drives the
// wake-from-idle location re-confirmation prompt.
async function touchLastSeen(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  const key = `seen:${hashChatId(chatId)}`;
  const prev = await redis.get(key);
  await redis.setEx(key, SEEN_TTL, String(Date.now()));
  const n = prev != null ? Number(prev) : NaN;
  return Number.isFinite(n) ? n : null;
}

async function setPendingMeal(redis, chatId, mealId) {
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`loc:pending:${hashChatId(chatId)}`, PENDING_TTL, mealId);
}

async function consumePendingMeal(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  const key = `loc:pending:${hashChatId(chatId)}`;
  const value = await redis.get(key);
  if (value) await redis.del(key);
  return value;
}

const PROCESSING_TTL = 60; // 60 s — covers a full pickValidated + Routes round trip

async function isProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  return Boolean(await redis.get(`proc:${hashChatId(chatId)}`));
}

async function setProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`proc:${hashChatId(chatId)}`, PROCESSING_TTL, '1');
}

async function clearProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  await redis.del(`proc:${hashChatId(chatId)}`).catch(() => {});
}

module.exports = {
  hashChatId,
  setUserLocation,
  getUserLocation,
  getLocationAgeMinutes,
  touchLastSeen,
  setPendingMeal,
  consumePendingMeal,
  isProcessing,
  setProcessing,
  clearProcessing
};
