// recent-picks.js — v0.27.1
//
// Tracks the last N venues a user has been shown via /eat, /cuisine,
// or /surprise so the new /share slash command can offer them as
// shareable items without forcing the user to scroll up. List capped
// at 5 most-recent (LPUSH + LTRIM 0 4) with a 24 h TTL.

const KEY_PREFIX = 'recent-picks:';
const MAX_RECENT = 5;
const TTL_S = 24 * 60 * 60;

async function addRecent(redis, chatId, pick) {
  if (!redis || !chatId || !pick?.placeId) return;
  try {
    if (!redis.isOpen) await redis.connect();
    const trimmed = {
      kind: pick.kind || 'pick',
      placeId: pick.placeId,
      name: pick.name,
      area: pick.area || '',
      lat: pick.lat ?? null,
      lng: pick.lng ?? null,
      rating: pick.rating ?? null,
      url: pick.url ?? '',
      directionsUri: pick.directionsUri ?? '',
      primaryType: pick.primaryType || 'restaurant',
      vibe: pick.vibe || '',
      signatureDish: pick.signatureDish || '',
      googleSummary: pick.googleSummary ?? null,
      addedAt: Date.now()
    };
    const key = `${KEY_PREFIX}${chatId}`;
    await redis.lPush(key, JSON.stringify(trimmed));
    await redis.lTrim(key, 0, MAX_RECENT - 1);
    await redis.expire(key, TTL_S);
  } catch (err) {
    console.warn('[Recent-Picks] addRecent failed:', err.message);
  }
}

async function getRecent(redis, chatId) {
  if (!redis || !chatId) return [];
  try {
    if (!redis.isOpen) await redis.connect();
    const raws = await redis.lRange(`${KEY_PREFIX}${chatId}`, 0, MAX_RECENT - 1);
    return raws
      .map((r) => { try { return JSON.parse(r); } catch { return null; } })
      .filter(Boolean);
  } catch (err) {
    console.warn('[Recent-Picks] getRecent failed:', err.message);
    return [];
  }
}

module.exports = { addRecent, getRecent, MAX_RECENT, TTL_S };
