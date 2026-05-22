const crypto = require('crypto');

const LOC_TTL = 24 * 60 * 60;  // 24 hours
const PENDING_TTL = 5 * 60;    // 5 minutes

function hashChatId(chatId) {
  return crypto.createHash('sha256').update(String(chatId)).digest('hex').slice(0, 16);
}

async function setUserLocation(redis, chatId, lat, lng) {
  if (!redis.isOpen) await redis.connect();
  const key = `loc:${hashChatId(chatId)}`;
  // v0.30.2: stamp setAt so callers can compute staleness for the
  // 15-min "your location is old, refresh?" reminder.
  await redis.setEx(key, LOC_TTL, JSON.stringify({ lat, lng, setAt: Date.now() }));
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
