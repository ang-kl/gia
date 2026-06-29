// clipboard-store.js — v0.62.328
//
// Cabinets, drawers, and card placements for the upcoming Clipboard
// TMA. This module is the storage layer; the HTTP routes that wire it
// up land in PR #2.
//
// ── Vocabulary (operator-locked) ─────────────────────────────────────
//   Catch-all  — the existing per-chatId clip list (clip-store.js).
//                Every Copy / Copy-all lands here first. 30-day TTL on
//                the underlying cards (per recomputeCardTtl rule).
//   Cabinet    — user-named container ("Trip to Tokyo", "Girls night").
//                12 max per user. 1-year TTL on touch.
//   Drawer     — one of the 10 time-segments inside a cabinet. 20 max
//                per cabinet. Holds an ordered list of cardIds.
//   Card       — a venue snapshot (stored in card:<chatId>:<cardId>).
//                A single card may appear in many drawers (duplicates
//                across drawers ARE permitted, per operator).
//
// ── Redis schema ─────────────────────────────────────────────────────
//   cab:<chatId>                     ZSET  cabinet IDs, score = lastTouched
//   cab:<chatId>:<cabId>             HASH  { name, emoji, location,
//                                            dateStart, dateEnd,
//                                            createdAt, modifiedAt,
//                                            sortDirection }
//   cab:<chatId>:<cabId>:dr          LIST  drawer metadata JSONs
//                                          (max 20 entries)
//   cab:<chatId>:<cabId>:dr:<n>      LIST  ordered cardIds in drawer n
//   card_locs:<chatId>:<cardId>      SET   "{cabId}:{n}" — inverse index
//                                          maintained alongside placements
//
// ── Cascade-delete rules ─────────────────────────────────────────────
// v0.62.416 AU-7 amendment — operator reversed the orphan rule (HANDOFF §5:
// "delete drawer/cabinet → its venueIds return to the Clipboard"). PRIOR rule
// (superseded, kept verbatim): "4. Else → softDeleteCard (drop the HASH)."
// CURRENT rule, when a cabinet OR drawer is deleted, walk its cardIds; for each:
//   1. Remove the "{cabId}:{n}" entry from card_locs.
//   2. If card_locs still has any entry → card stays (other placement
//      survives + recompute TTL).
//   3. Else → returnToClipboard(card): re-add to the catch-all clip list
//      (dedupe, cap 50) + recompute TTL (favourite → PERSIST, else 30-day).
//      Nothing is hard-deleted by a cascade any more.
//
// All multi-step mutations use MULTI/EXEC so a partial failure can't
// leave card_locs pointing at a drawer that no longer exists.

const {
  cardKey,
  locsKey,
  getCardById,
  recomputeCardTtl,
  softDeleteCard,
  returnToClipboard,
  TTL_PLACED_S
} = require('./clip-store.js');
const crypto = require('crypto');

const CAB_INDEX_PREFIX = 'cab:';                                  // ZSET key
const CAB_HASH_PREFIX  = 'cab:';                                  // HASH key (with :<cabId>)
const DR_META_SUFFIX   = ':dr';                                   // LIST suffix
const DR_LIST_SUFFIX   = ':dr:';                                  // LIST prefix per drawer

const MAX_CABINETS_PER_USER = 12;
const MAX_DRAWERS_PER_CAB   = 20;
const MAX_CARDS_PER_DRAWER  = 10;
const MAX_NAME_CHARS        = 80;
const MAX_NOTE_CHARS        = 990;
const MAX_LOCATION_CHARS    = 120;

const VALID_SEGMENTS = Object.freeze([
  'dayBreak', 'breakfast', 'brunch', 'lunch', 'lateLunch',
  'teaBreak', 'earlyDinner', 'dinner', 'supper', 'nightSnack',
  'wholeDay'
]);

const VALID_SORT_DIRECTIONS = Object.freeze([
  'created', 'segAsc', 'segDesc', 'location', 'manual'
]);

function newCabinetId() {
  return crypto.randomBytes(6).toString('base64url');  // ~8 chars
}

function cabIndexKey(chatId)              { return `${CAB_INDEX_PREFIX}${chatId}`; }
function cabHashKey(chatId, cabId)        { return `${CAB_HASH_PREFIX}${chatId}:${cabId}`; }
function drMetaKey(chatId, cabId)         { return `${cabHashKey(chatId, cabId)}${DR_META_SUFFIX}`; }
function drListKey(chatId, cabId, n)      { return `${cabHashKey(chatId, cabId)}${DR_LIST_SUFFIX}${n}`; }
function locsTag(cabId, n)                { return `${cabId}:${n}`; }
function cabDefaultKey(chatId)            { return `${CAB_INDEX_PREFIX}${chatId}:default`; }   // v0.62.416 STRING

function clampString(s, max) {
  return typeof s === 'string'
    ? s.replace(/[\r\n]+/g, ' ').trim().slice(0, max)
    : '';
}

// ── Cabinet CRUD ─────────────────────────────────────────────────────

async function listCabinets(redis, chatId) {
  if (!redis || !chatId) return [];
  try {
    if (!redis.isOpen) await redis.connect();
    const ids = await redis.zRange(cabIndexKey(chatId), 0, -1, { REV: true });
    const out = [];
    for (const cabId of ids) {
      const h = await redis.hGetAll(cabHashKey(chatId, cabId));
      if (!h || Object.keys(h).length === 0) continue;   // lazy-purge stale id
      const cab = denormaliseCabinet(cabId, h);
      // v0.62.428 — per-cabinet counts for the Cabinets list (sample parity:
      // "N drawers · M eateries"). drawerCount = drawer-meta length; eateryCount
      // = sum of placements across drawers (a card in 2 drawers counts twice,
      // matching the "eateries filed" intent). Bounded by caps (12×20×10).
      const drawerCount = await redis.lLen(drMetaKey(chatId, cabId)).catch(() => 0);
      let eateryCount = 0;
      for (let n = 0; n < drawerCount; n++) {
        eateryCount += await redis.lLen(drListKey(chatId, cabId, n)).catch(() => 0);
      }
      out.push({ ...cab, drawerCount, eateryCount });
    }
    return out;
  } catch (err) {
    console.warn('[Clipboard-Store] listCabinets failed:', err.message);
    return [];
  }
}

async function getCabinet(redis, chatId, cabId) {
  if (!redis || !chatId || !cabId) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const h = await redis.hGetAll(cabHashKey(chatId, cabId));
    if (!h || Object.keys(h).length === 0) return null;
    return denormaliseCabinet(cabId, h);
  } catch (err) {
    console.warn('[Clipboard-Store] getCabinet failed:', err.message);
    return null;
  }
}

async function createCabinet(redis, chatId, { name, emoji = '', location = '', dateStart = '', dateEnd = '' } = {}) {
  if (!redis || !chatId) return { ok: false, error: 'missing-redis' };
  const cleanName = clampString(name, MAX_NAME_CHARS);
  if (!cleanName) return { ok: false, error: 'name-required' };
  try {
    if (!redis.isOpen) await redis.connect();
    const indexKey = cabIndexKey(chatId);
    const count = await redis.zCard(indexKey);
    if (count >= MAX_CABINETS_PER_USER) {
      return { ok: false, error: 'cap-cabinets', cap: MAX_CABINETS_PER_USER };
    }
    const cabId = newCabinetId();
    const now = Date.now();
    const fields = {
      name: cleanName,
      emoji: clampString(emoji, 8),
      location: clampString(location, MAX_LOCATION_CHARS),
      dateStart: clampString(dateStart, 16),
      dateEnd: clampString(dateEnd, 16),
      createdAt: String(now),
      modifiedAt: String(now),
      sortDirection: 'created'
    };
    const k = cabHashKey(chatId, cabId);
    await redis.hSet(k, fields);
    await redis.expire(k, TTL_PLACED_S);
    await redis.zAdd(indexKey, { score: now, value: cabId });
    await redis.expire(indexKey, TTL_PLACED_S);
    return { ok: true, cabinet: denormaliseCabinet(cabId, fields) };
  } catch (err) {
    console.warn('[Clipboard-Store] createCabinet failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

async function updateCabinet(redis, chatId, cabId, patch = {}) {
  if (!redis || !chatId || !cabId) return { ok: false, error: 'missing-args' };
  try {
    if (!redis.isOpen) await redis.connect();
    const k = cabHashKey(chatId, cabId);
    const exists = await redis.exists(k);
    if (!exists) return { ok: false, error: 'not-found' };
    const fields = {};
    if (typeof patch.name === 'string') {
      const v = clampString(patch.name, MAX_NAME_CHARS);
      if (!v) return { ok: false, error: 'name-required' };
      fields.name = v;
    }
    if (typeof patch.emoji === 'string')    fields.emoji = clampString(patch.emoji, 8);
    if (typeof patch.location === 'string') fields.location = clampString(patch.location, MAX_LOCATION_CHARS);
    if (typeof patch.dateStart === 'string') fields.dateStart = clampString(patch.dateStart, 16);
    if (typeof patch.dateEnd === 'string')   fields.dateEnd = clampString(patch.dateEnd, 16);
    if (typeof patch.sortDirection === 'string' && VALID_SORT_DIRECTIONS.includes(patch.sortDirection)) {
      fields.sortDirection = patch.sortDirection;
    }
    if (Object.keys(fields).length === 0) return { ok: true, cabinet: await getCabinet(redis, chatId, cabId) };
    fields.modifiedAt = String(Date.now());
    await redis.hSet(k, fields);
    await redis.expire(k, TTL_PLACED_S);
    await redis.zAdd(cabIndexKey(chatId), { score: Number(fields.modifiedAt), value: cabId });
    await redis.expire(cabIndexKey(chatId), TTL_PLACED_S);
    return { ok: true, cabinet: await getCabinet(redis, chatId, cabId) };
  } catch (err) {
    console.warn('[Clipboard-Store] updateCabinet failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

async function deleteCabinet(redis, chatId, cabId) {
  if (!redis || !chatId || !cabId) return { ok: false, error: 'missing-args' };
  try {
    if (!redis.isOpen) await redis.connect();
    const exists = await redis.exists(cabHashKey(chatId, cabId));
    if (!exists) return { ok: false, error: 'not-found' };
    // Walk every drawer, cascade-handle each card.
    const drawers = await readDrawers(redis, chatId, cabId);
    let returned = 0;
    for (let i = 0; i < drawers.length; i++) {
      returned += await cascadeRemoveDrawerCards(redis, chatId, cabId, i);
      await redis.del(drListKey(chatId, cabId, i)).catch(() => {});
    }
    await redis.del(drMetaKey(chatId, cabId)).catch(() => {});
    await redis.del(cabHashKey(chatId, cabId)).catch(() => {});
    await redis.zRem(cabIndexKey(chatId), cabId).catch(() => {});
    // v0.62.416 — if the deleted cabinet was the default, reassign to the first
    // remaining cabinet (spec: "deleting the default reassigns to the first
    // remaining"); clear the key when none remain.
    let reassignedDefault = null;
    try {
      const def = await redis.get(cabDefaultKey(chatId));
      if (def === cabId) {
        const remaining = await redis.zRange(cabIndexKey(chatId), 0, -1, { REV: true });
        if (remaining.length) {
          await redis.set(cabDefaultKey(chatId), remaining[0]);
          await redis.expire(cabDefaultKey(chatId), TTL_PLACED_S);
          reassignedDefault = remaining[0];
        } else {
          await redis.del(cabDefaultKey(chatId)).catch(() => {});
        }
      }
    } catch { /* default reassignment is non-fatal */ }
    return { ok: true, returned, reassignedDefault };
  } catch (err) {
    console.warn('[Clipboard-Store] deleteCabinet failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

function denormaliseCabinet(cabId, h) {
  return {
    cabId,
    name: h.name || '',
    emoji: h.emoji || '',
    location: h.location || '',
    dateStart: h.dateStart || '',
    dateEnd: h.dateEnd || '',
    createdAt: Number(h.createdAt) || 0,
    modifiedAt: Number(h.modifiedAt) || 0,
    sortDirection: VALID_SORT_DIRECTIONS.includes(h.sortDirection) ? h.sortDirection : 'created'
  };
}

// ── Drawer CRUD ──────────────────────────────────────────────────────

async function readDrawers(redis, chatId, cabId) {
  if (!redis || !chatId || !cabId) return [];
  try {
    if (!redis.isOpen) await redis.connect();
    const raws = await redis.lRange(drMetaKey(chatId, cabId), 0, MAX_DRAWERS_PER_CAB - 1);
    return raws.map((r) => {
      try {
        const d = JSON.parse(r);
        return {
          segment: VALID_SEGMENTS.includes(d.segment) ? d.segment : 'wholeDay',
          dayTag: typeof d.dayTag === 'string' ? d.dayTag.slice(0, 24) : '',
          description: typeof d.description === 'string' ? d.description.slice(0, 120) : '',  // v0.62.435 item 12b
          location: d.location && typeof d.location === 'object' ? d.location : null,
          createdAt: Number(d.createdAt) || 0,
          shareToken: typeof d.shareToken === 'string' ? d.shareToken : ''
        };
      } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    console.warn('[Clipboard-Store] readDrawers failed:', err.message);
    return [];
  }
}

async function addDrawer(redis, chatId, cabId, { segment, dayTag = '', location = null, description = '' } = {}) {
  if (!redis || !chatId || !cabId) return { ok: false, error: 'missing-args' };
  if (!VALID_SEGMENTS.includes(segment)) return { ok: false, error: 'invalid-segment' };
  try {
    if (!redis.isOpen) await redis.connect();
    const cab = await getCabinet(redis, chatId, cabId);
    if (!cab) return { ok: false, error: 'cabinet-not-found' };
    const mk = drMetaKey(chatId, cabId);
    const count = await redis.lLen(mk);
    if (count >= MAX_DRAWERS_PER_CAB) {
      return { ok: false, error: 'cap-drawers', cap: MAX_DRAWERS_PER_CAB };
    }
    const drawer = {
      segment,
      dayTag: clampString(dayTag, 24),
      description: clampString(description, 120),  // v0.62.435 item 12b
      location: validateLocation(location),
      createdAt: Date.now(),
      shareToken: ''
    };
    await redis.rPush(mk, JSON.stringify(drawer));
    await redis.expire(mk, TTL_PLACED_S);
    await touchCabinet(redis, chatId, cabId);
    return { ok: true, index: count, drawer };
  } catch (err) {
    console.warn('[Clipboard-Store] addDrawer failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

async function deleteDrawer(redis, chatId, cabId, drawerIdx) {
  if (!redis || !chatId || !cabId || !Number.isInteger(drawerIdx) || drawerIdx < 0) {
    return { ok: false, error: 'missing-args' };
  }
  try {
    if (!redis.isOpen) await redis.connect();
    const mk = drMetaKey(chatId, cabId);
    const raw = await redis.lIndex(mk, drawerIdx);
    if (!raw) return { ok: false, error: 'not-found' };
    const returned = await cascadeRemoveDrawerCards(redis, chatId, cabId, drawerIdx);
    await redis.del(drListKey(chatId, cabId, drawerIdx)).catch(() => {});
    // Remove the metadata entry by sentinel + LREM.
    const SENTINEL = `__drawer_deleted__:${cabId}:${drawerIdx}`;
    await redis.lSet(mk, drawerIdx, SENTINEL);
    await redis.lRem(mk, 1, SENTINEL);
    // Drawer indices have shifted — re-key card_locs and drawer lists
    // for any drawer that moved down by 1.
    await reindexDrawersAfterDelete(redis, chatId, cabId, drawerIdx);
    await touchCabinet(redis, chatId, cabId);
    return { ok: true, returned };
  } catch (err) {
    console.warn('[Clipboard-Store] deleteDrawer failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

function validateLocation(loc) {
  if (!loc || typeof loc !== 'object') return null;
  const lat = Number(loc.lat), lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = clampString(loc.label, MAX_LOCATION_CHARS);
  return { lat, lng, label };
}

async function touchCabinet(redis, chatId, cabId) {
  const now = Date.now();
  await redis.hSet(cabHashKey(chatId, cabId), { modifiedAt: String(now) });
  await redis.expire(cabHashKey(chatId, cabId), TTL_PLACED_S);
  await redis.zAdd(cabIndexKey(chatId), { score: now, value: cabId });
  await redis.expire(cabIndexKey(chatId), TTL_PLACED_S);
}

// ── Placements ───────────────────────────────────────────────────────

async function placeCard(redis, chatId, cardId, cabId, drawerIdx) {
  if (!redis || !chatId || !cardId || !cabId || !Number.isInteger(drawerIdx) || drawerIdx < 0) {
    return { ok: false, error: 'missing-args' };
  }
  try {
    if (!redis.isOpen) await redis.connect();
    const card = await getCardById(redis, chatId, cardId);
    if (!card) return { ok: false, error: 'card-not-found' };
    const drawers = await readDrawers(redis, chatId, cabId);
    if (drawerIdx >= drawers.length) return { ok: false, error: 'drawer-not-found' };
    const dk = drListKey(chatId, cabId, drawerIdx);
    const count = await redis.lLen(dk);
    if (count >= MAX_CARDS_PER_DRAWER) {
      return { ok: false, error: 'cap-cards-per-drawer', cap: MAX_CARDS_PER_DRAWER };
    }
    // Dedupe within the same drawer (cap intent).
    const existing = await redis.lRange(dk, 0, -1);
    if (existing.includes(cardId)) return { ok: true, alreadyPresent: true };
    await redis.rPush(dk, cardId);
    await redis.expire(dk, TTL_PLACED_S);
    await redis.sAdd(locsKey(chatId, cardId), locsTag(cabId, drawerIdx));
    await recomputeCardTtl(redis, chatId, cardId);
    await touchCabinet(redis, chatId, cabId);
    return { ok: true };
  } catch (err) {
    console.warn('[Clipboard-Store] placeCard failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

async function unplaceCard(redis, chatId, cardId, cabId, drawerIdx) {
  if (!redis || !chatId || !cardId || !cabId || !Number.isInteger(drawerIdx) || drawerIdx < 0) {
    return { ok: false, error: 'missing-args' };
  }
  try {
    if (!redis.isOpen) await redis.connect();
    const dk = drListKey(chatId, cabId, drawerIdx);
    await redis.lRem(dk, 0, cardId);
    await redis.sRem(locsKey(chatId, cardId), locsTag(cabId, drawerIdx));
    await recomputeCardTtl(redis, chatId, cardId);
    await touchCabinet(redis, chatId, cabId);
    return { ok: true };
  } catch (err) {
    console.warn('[Clipboard-Store] unplaceCard failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

// ── Cascade-delete ───────────────────────────────────────────────────

// For every cardId in drawer N: remove the placement tag; if the card
// has no more placements AND is not favourite, drop the HASH; otherwise
// recompute its TTL (it survives in catch-all / other drawers / as fav).
async function cascadeRemoveDrawerCards(redis, chatId, cabId, drawerIdx) {
  const dk = drListKey(chatId, cabId, drawerIdx);
  const cardIds = await redis.lRange(dk, 0, -1).catch(() => []);
  let returned = 0;   // v0.62.416 — cards sent back to the catch-all clipboard
  for (const cardId of cardIds) {
    try {
      await redis.sRem(locsKey(chatId, cardId), locsTag(cabId, drawerIdx));
      const remaining = await redis.sCard(locsKey(chatId, cardId));
      if (remaining === 0) {
        // v0.62.416 — orphaned card RETURNS to the clipboard (was: soft-delete
        // for non-favourites). returnToClipboard recomputes the TTL, so a
        // favourite still PERSISTs and a plain card gets the 30-day catch-all TTL.
        if (await returnToClipboard(redis, chatId, cardId)) returned++;
      } else {
        await recomputeCardTtl(redis, chatId, cardId);
      }
    } catch (err) {
      console.warn('[Clipboard-Store] cascade card failed:', err.message);
    }
  }
  return returned;
}

// After a drawer is deleted, every higher-indexed drawer in the same
// cabinet shifts down by 1. Re-key the per-drawer LISTs and update
// card_locs tags so the inverse index stays consistent.
async function reindexDrawersAfterDelete(redis, chatId, cabId, deletedIdx) {
  try {
    const drawers = await readDrawers(redis, chatId, cabId);
    // For each drawer at the new index `n` (where n >= deletedIdx),
    // its old index was n+1.
    for (let n = deletedIdx; n < drawers.length; n++) {
      const oldN = n + 1;
      const fromKey = drListKey(chatId, cabId, oldN);
      const toKey = drListKey(chatId, cabId, n);
      const cardIds = await redis.lRange(fromKey, 0, -1).catch(() => []);
      // Move the list.
      if (cardIds.length > 0) {
        await redis.del(toKey).catch(() => {});
        await redis.rPush(toKey, cardIds);
        await redis.expire(toKey, TTL_PLACED_S);
      }
      await redis.del(fromKey).catch(() => {});
      // Update card_locs tags for every card in this drawer.
      for (const cardId of cardIds) {
        await redis.sRem(locsKey(chatId, cardId), locsTag(cabId, oldN));
        await redis.sAdd(locsKey(chatId, cardId), locsTag(cabId, n));
        await recomputeCardTtl(redis, chatId, cardId);
      }
    }
    // The OLD highest index's slot is now orphan — already cleared above.
  } catch (err) {
    console.warn('[Clipboard-Store] reindexDrawersAfterDelete failed:', err.message);
  }
}

// ── Read-side ────────────────────────────────────────────────────────

async function getDrawerCards(redis, chatId, cabId, drawerIdx) {
  if (!redis || !chatId || !cabId || !Number.isInteger(drawerIdx) || drawerIdx < 0) return [];
  try {
    if (!redis.isOpen) await redis.connect();
    const cardIds = await redis.lRange(drListKey(chatId, cabId, drawerIdx), 0, -1);
    const out = [];
    for (const cardId of cardIds) {
      const rec = await getCardById(redis, chatId, cardId);
      if (rec) out.push({ ...rec, cardId });
    }
    return out;
  } catch (err) {
    console.warn('[Clipboard-Store] getDrawerCards failed:', err.message);
    return [];
  }
}

// ── Default cabinet (v0.62.416) ──────────────────────────────────────
// One cabinet per user can be the "default" — it drives footer tab 2 in the
// TMA. Stored as a STRING key (cabId). getDefaultCabinetId validates the cabinet
// still exists (lazy-clears a stale pointer).

async function getDefaultCabinetId(redis, chatId) {
  if (!redis || !chatId) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const id = await redis.get(cabDefaultKey(chatId));
    if (!id) return null;
    if (await redis.exists(cabHashKey(chatId, id))) return id;
    await redis.del(cabDefaultKey(chatId)).catch(() => {});   // stale → clear
    return null;
  } catch (err) {
    console.warn('[Clipboard-Store] getDefaultCabinetId failed:', err.message);
    return null;
  }
}

async function setDefaultCabinet(redis, chatId, cabId) {
  if (!redis || !chatId || !cabId) return { ok: false, error: 'missing-args' };
  try {
    if (!redis.isOpen) await redis.connect();
    if (!(await redis.exists(cabHashKey(chatId, cabId)))) return { ok: false, error: 'not-found' };
    await redis.set(cabDefaultKey(chatId), cabId);
    await redis.expire(cabDefaultKey(chatId), TTL_PLACED_S);
    return { ok: true, defaultCabinetId: cabId };
  } catch (err) {
    console.warn('[Clipboard-Store] setDefaultCabinet failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

// ── Duplicate (v0.62.416) ────────────────────────────────────────────
// Copy a cabinet (name + " copy", emoji, location, dates) with all its drawers
// and their card placements; or copy a single drawer within a cabinet. Cards
// are shared by id (a card may live in many drawers), so placeCard just adds the
// new placement tag. Respects the per-user cabinet cap and per-cabinet drawer cap.

async function duplicateCabinet(redis, chatId, cabId) {
  if (!redis || !chatId || !cabId) return { ok: false, error: 'missing-args' };
  const src = await getCabinet(redis, chatId, cabId);
  if (!src) return { ok: false, error: 'not-found' };
  const created = await createCabinet(redis, chatId, {
    name: clampString(`${src.name} copy`, MAX_NAME_CHARS),
    emoji: src.emoji, location: src.location,
    dateStart: src.dateStart, dateEnd: src.dateEnd
  });
  if (!created.ok) return created;            // e.g. cap-cabinets
  const newCabId = created.cabinet.cabId;
  const drawers = await readDrawers(redis, chatId, cabId);
  for (let i = 0; i < drawers.length; i++) {
    const d = drawers[i];
    const add = await addDrawer(redis, chatId, newCabId, { segment: d.segment, dayTag: d.dayTag, location: d.location });
    if (!add.ok) continue;
    const cardIds = await redis.lRange(drListKey(chatId, cabId, i), 0, -1).catch(() => []);
    for (const cardId of cardIds) await placeCard(redis, chatId, cardId, newCabId, add.index);
  }
  return { ok: true, cabinet: created.cabinet };
}

async function duplicateDrawer(redis, chatId, cabId, drawerIdx) {
  if (!redis || !chatId || !cabId || !Number.isInteger(drawerIdx) || drawerIdx < 0) {
    return { ok: false, error: 'missing-args' };
  }
  const drawers = await readDrawers(redis, chatId, cabId);
  if (drawerIdx >= drawers.length) return { ok: false, error: 'not-found' };
  const d = drawers[drawerIdx];
  const add = await addDrawer(redis, chatId, cabId, { segment: d.segment, dayTag: d.dayTag, location: d.location, description: d.description });
  if (!add.ok) return add;                    // e.g. cap-drawers
  const cardIds = await redis.lRange(drListKey(chatId, cabId, drawerIdx), 0, -1).catch(() => []);
  for (const cardId of cardIds) await placeCard(redis, chatId, cardId, cabId, add.index);
  return { ok: true, index: add.index, drawer: d };
}

module.exports = {
  // Cabinets
  listCabinets,
  getCabinet,
  createCabinet,
  updateCabinet,
  deleteCabinet,
  getDefaultCabinetId,
  setDefaultCabinet,
  duplicateCabinet,
  duplicateDrawer,
  // Drawers
  readDrawers,
  addDrawer,
  deleteDrawer,
  getDrawerCards,
  // Placements
  placeCard,
  unplaceCard,
  // Caps + constants
  MAX_CABINETS_PER_USER,
  MAX_DRAWERS_PER_CAB,
  MAX_CARDS_PER_DRAWER,
  MAX_NAME_CHARS,
  MAX_NOTE_CHARS,
  VALID_SEGMENTS,
  VALID_SORT_DIRECTIONS,
  // Key helpers (exposed for tests / PR #2 routes)
  cabIndexKey,
  cabHashKey,
  drMetaKey,
  drListKey,
  locsTag,
  newCabinetId
};
