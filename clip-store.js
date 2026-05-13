// clip-store.js — v0.59.44
//
// Per-chatId clip history. The cuisine TMA's "Copy" / "Copy all"
// buttons POST to /api/cuisine/copy-{one,all} which bot.sendMessage()
// the formatted block to the user's chat. Telegram preserves chat
// history forever, but native search can't filter by cuisine selection
// (the cuisine label was a chip in the picker, not in the message
// body). pushClip() snapshots the structured selection alongside the
// formatted body so /clip can list + filter + resend.
//
// Storage: Redis list `clip:${chatId}`, LPUSH + LTRIM 0 49 (last 50),
// EXPIRE 30d on each push. Mirrors the recent-picks.js pattern.

const KEY_PREFIX = 'clip:';
const MAX_CLIPS = 50;
const TTL_S = 30 * 24 * 60 * 60;

async function pushClip(redis, chatId, record) {
  if (!redis || !chatId || !record || !record.body) return;
  try {
    if (!redis.isOpen) await redis.connect();
    const trimmed = {
      ts: Number.isFinite(record.ts) ? record.ts : Date.now(),
      type: record.type === 'one' ? 'one' : 'all',
      cuisines: Array.isArray(record.cuisines) ? record.cuisines.slice(0, 5).map(String) : [],
      filters: record.filters && typeof record.filters === 'object' ? record.filters : {},
      region: record.region === 'JB' ? 'JB' : 'SG',
      venueCount: Number.isFinite(record.venueCount) ? record.venueCount : 1,
      preview: typeof record.preview === 'string' ? record.preview.slice(0, 200) : '',
      body: String(record.body).slice(0, 4096),
      lang: record.lang === 'fr' ? 'fr' : 'en'
    };
    const key = `${KEY_PREFIX}${chatId}`;
    await redis.lPush(key, JSON.stringify(trimmed));
    await redis.lTrim(key, 0, MAX_CLIPS - 1);
    await redis.expire(key, TTL_S);
  } catch (err) {
    console.warn('[Clip-Store] pushClip failed:', err.message);
  }
}

function matchesCuisine(rec, cuisineFilter) {
  if (!cuisineFilter) return true;
  const needle = String(cuisineFilter).toLowerCase().trim();
  if (!needle) return true;
  return (rec.cuisines || []).some((c) => String(c).toLowerCase().includes(needle));
}

async function listClips(redis, chatId, { cuisine = null, limit = 5, offset = 0 } = {}) {
  if (!redis || !chatId) return { items: [], total: 0 };
  try {
    if (!redis.isOpen) await redis.connect();
    const raws = await redis.lRange(`${KEY_PREFIX}${chatId}`, 0, MAX_CLIPS - 1);
    const all = raws
      .map((r, i) => {
        try { return { ...JSON.parse(r), index: i }; }
        catch { return null; }
      })
      .filter(Boolean)
      .filter((r) => matchesCuisine(r, cuisine));
    const items = all.slice(offset, offset + limit);
    return { items, total: all.length };
  } catch (err) {
    console.warn('[Clip-Store] listClips failed:', err.message);
    return { items: [], total: 0 };
  }
}

async function getClip(redis, chatId, index) {
  if (!redis || !chatId || !Number.isFinite(index) || index < 0) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const raw = await redis.lIndex(`${KEY_PREFIX}${chatId}`, index);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  } catch (err) {
    console.warn('[Clip-Store] getClip failed:', err.message);
    return null;
  }
}

async function clearClips(redis, chatId) {
  if (!redis || !chatId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.del(`${KEY_PREFIX}${chatId}`);
    return true;
  } catch (err) {
    console.warn('[Clip-Store] clearClips failed:', err.message);
    return false;
  }
}

// v0.60.151 — removeClip: delete one entry by its list index. Uses the
// idiomatic Redis "LSET-then-LREM" pattern (atomic-as-Redis-gets): mark
// the slot with a sentinel value, then LREM removes the only entry that
// matches it. Returns true if a clip was removed.
const REMOVE_SENTINEL = '__deleted__';
async function removeClip(redis, chatId, index) {
  if (!redis || !chatId || !Number.isFinite(index) || index < 0) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    const key = `${KEY_PREFIX}${chatId}`;
    const raw = await redis.lIndex(key, index);
    if (!raw) return false;
    await redis.lSet(key, index, REMOVE_SENTINEL);
    await redis.lRem(key, 1, REMOVE_SENTINEL);
    return true;
  } catch (err) {
    console.warn('[Clip-Store] removeClip failed:', err.message);
    return false;
  }
}

// v0.60.151 — renameClip: stamp a user-supplied display name onto the
// clip's record JSON. Stored as the new `name` field; listClips and the
// /clipboard header prefer it over the auto-cuisines label. Trimmed,
// capped at 60 chars, non-empty required. Returns the saved name or null.
async function renameClip(redis, chatId, index, rawName) {
  if (!redis || !chatId || !Number.isFinite(index) || index < 0) return null;
  const name = String(rawName || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
  if (!name) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const key = `${KEY_PREFIX}${chatId}`;
    const raw = await redis.lIndex(key, index);
    if (!raw) return null;
    let rec; try { rec = JSON.parse(raw); } catch { return null; }
    rec.name = name;
    await redis.lSet(key, index, JSON.stringify(rec));
    return name;
  } catch (err) {
    console.warn('[Clip-Store] renameClip failed:', err.message);
    return null;
  }
}

module.exports = {
  pushClip,
  listClips,
  getClip,
  clearClips,
  removeClip,
  renameClip,
  KEY_PREFIX,
  MAX_CLIPS,
  TTL_S
};
