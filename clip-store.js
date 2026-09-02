// clip-store.js — v0.62.328
//
// Per-chatId clip history. The cuisine TMA's "Copy" / "Copy all"
// buttons POST to /api/cuisine/copy-{one,all} which bot.sendMessage()
// the formatted block to the user's chat. Telegram preserves chat
// history forever, but native search can't filter by cuisine selection
// (the cuisine label was a chip in the picker, not in the message
// body). pushClip() snapshots the structured selection alongside the
// formatted body so /clip can list + filter + resend.
//
// ── Schema (v0.62.328 onward) ────────────────────────────────────────
// Cards are now per-card Redis HASHes so each card carries its own TTL
// (a favourite must never expire while a non-favourite catch-all card
// must expire at 30 days — one shared list TTL can't express that).
//
//   card:<chatId>:<cardId>      HASH    {
//                                         ts, type, cuisines (JSON),
//                                         filters (JSON), region,
//                                         venueCount, preview, body,
//                                         lang, name?, note?,
//                                         favourite: '0' | '1'
//                                       }
//
//   clip:<chatId>               LIST    ordered cardIds (newest first,
//                                       cap 50). PERSIST — entries age
//                                       out only when the underlying
//                                       card HASH expires (lazy purge).
//
//   card_locs:<chatId>:<cardId> SET     "{cabId}:{n}" placements
//                                       (populated by clipboard-store.js
//                                       in PR #2; the recomputeCardTtl
//                                       helper already honours it).
//
// TTL rule (applied via recomputeCardTtl after every card write):
//   favourite              → PERSIST (no TTL, lives forever)
//   placed in any drawer   → 1 year
//   else (catch-all only)  → 30 days
//
// ── Back-compat ──────────────────────────────────────────────────────
// The public function signatures (pushClip, listClips, getClip,
// clearClips, removeClip, renameClip) are unchanged from v0.59.44.
// Old-shape entries (full JSON in the LIST) are migrated lazily on
// first read via migrateOldShapeEntry().

const crypto = require('crypto');
const { SUPPORTED: SUPPORTED_LOCALES } = require('./i18n');   // v0.62.915 — the clamp reads the list, never restates it

const KEY_PREFIX = 'clip:';
const CARD_PREFIX = 'card:';
const LOCS_PREFIX = 'card_locs:';
const MAX_CLIPS = 50;

const TTL_CATCHALL_S = 30 * 24 * 60 * 60;   // 30 days
const TTL_PLACED_S = 365 * 24 * 60 * 60;    // 1 year
// favourite → PERSIST (no TTL)

// Kept as TTL_S export for back-compat with callers that imported it.
const TTL_S = TTL_CATCHALL_S;

function newCardId() {
  return crypto.randomBytes(8).toString('base64url'); // ~11 chars, URL-safe
}

function clipKey(chatId) { return `${KEY_PREFIX}${chatId}`; }
function cardKey(chatId, cardId) { return `${CARD_PREFIX}${chatId}:${cardId}`; }
function locsKey(chatId, cardId) { return `${LOCS_PREFIX}${chatId}:${cardId}`; }

// Normalise an incoming caller-supplied record into the HASH-field shape.
// Strings only (Redis HASH stores strings); JSON-encode nested objects.
function normaliseRecord(record) {
  const ts = Number.isFinite(record.ts) ? record.ts : Date.now();
  const type = record.type === 'one' ? 'one' : 'all';
  const cuisines = Array.isArray(record.cuisines)
    ? record.cuisines.slice(0, 5).map(String) : [];
  const filters = record.filters && typeof record.filters === 'object'
    ? record.filters : {};
  const region = record.region === 'JB' ? 'JB' : 'SG';
  const venueCount = Number.isFinite(record.venueCount) ? record.venueCount : 1;
  const preview = typeof record.preview === 'string' ? record.preview.slice(0, 200) : '';
  const body = String(record.body || '').slice(0, 4096);
  // v0.62.915 — a hand-extended ternary ladder that stopped at five locales (en/fr/id/ru/de)
  // while the app reached nine, so a card saved by a zh/ja/es/ko reader was persisted as 'en'
  // and re-opened in English. The ladder is why: adding a locale meant editing this file, and
  // whoever added zh, ja, es and ko to i18n.js had no reason to know it existed. The clamp now
  // READS the supported list instead of restating it, so a tenth locale needs no edit here.
  const lang = SUPPORTED_LOCALES.includes(record.lang) ? record.lang : 'en';
  const name = typeof record.name === 'string' && record.name.trim()
    ? record.name.trim().slice(0, 60) : '';
  const note = typeof record.note === 'string'
    ? record.note.slice(0, 990) : '';   // operator-locked: 990 chars
  const favourite = record.favourite === true || record.favourite === '1' || record.favourite === 1
    ? '1' : '0';
  // v0.62.429 — store the STRUCTURED venue (single-copy only) so Sketchbook can
  // render the real Cuisine ResultCard instead of the copied HTML text. Capped
  // JSON; absent on copy-all and on pre-v0.62.429 clips (→ text-only card).
  //
  // v0.62.708 (O-144) — the cap used to be `.slice(0, 6000)` applied to the
  // STRINGIFIED result: truncating a JSON string mid-token produces syntactically
  // invalid JSON, which then silently failed to parse on read (see the matching
  // fix in denormaliseRecord below) and was indistinguishable from "no venue was
  // ever attached." Validate the FULL length before writing anything, and if it's
  // too big, drop venue entirely — the same '' path already taken when
  // record.venue is absent — rather than persist a corrupt fragment. Cap raised
  // 6000 → 10000 for headroom: a fully-populated venue serialises to ~1.5KB, and
  // the only fields with no explicit length cap upstream (vibe, nameGloss,
  // nameReading, signatureDish — free-text LLM output) are the realistic way a
  // future venue could approach the old cap.
  const VENUE_JSON_CAP = 10000;
  let venue = '';
  if (record.venue && typeof record.venue === 'object') {
    try {
      const json = JSON.stringify(record.venue);
      venue = json.length <= VENUE_JSON_CAP ? json : '';
    } catch { venue = ''; }
  }
  return {
    ts: String(ts),
    type,
    cuisines: JSON.stringify(cuisines),
    filters: JSON.stringify(filters),
    region,
    venueCount: String(venueCount),
    preview,
    body,
    lang,
    name,
    note,
    favourite,
    venue
  };
}

// Inverse — turn the HASH back into the JSON-record shape that callers
// from before v0.62.328 expect.
function denormaliseRecord(fields) {
  if (!fields || typeof fields !== 'object') return null;
  let cuisines = []; try { cuisines = JSON.parse(fields.cuisines || '[]'); } catch { /* keep [] */ }
  let filters = {};  try { filters = JSON.parse(fields.filters || '{}'); } catch { /* keep {} */ }
  return {
    ts: Number(fields.ts) || 0,
    type: fields.type === 'one' ? 'one' : 'all',
    cuisines: Array.isArray(cuisines) ? cuisines : [],
    filters: filters && typeof filters === 'object' ? filters : {},
    region: fields.region === 'JB' ? 'JB' : 'SG',
    venueCount: Number(fields.venueCount) || 1,
    preview: fields.preview || '',
    body: fields.body || '',
    lang: fields.lang || 'en',
    name: fields.name || undefined,            // omit when empty for parity with the old shape
    note: fields.note || undefined,
    favourite: fields.favourite === '1',
    // v0.62.429 — parsed structured venue (undefined when absent → text-only card).
    // v0.62.708 (O-144) — log parse failures instead of swallowing them silently,
    // matching every other catch block in this file (see normaliseRecord above for
    // why a corrupt venue string can no longer be written in the first place).
    venue: (() => {
      if (!fields.venue) return undefined;
      try { return JSON.parse(fields.venue); }
      catch (err) { console.warn('[Clip-Store] venue JSON.parse failed:', err.message); return undefined; }
    })()
  };
}

// recomputeCardTtl — the SINGLE source-of-truth helper that applies the
// TTL rule table. Called after every card mutation. Never throws —
// failures degrade to "card still exists, just with stale TTL", which
// the next mutation will re-fix.
async function recomputeCardTtl(redis, chatId, cardId) {
  if (!redis || !chatId || !cardId) return;
  try {
    if (!redis.isOpen) await redis.connect();
    const k = cardKey(chatId, cardId);
    const fav = await redis.hGet(k, 'favourite');
    const isFav = fav === '1';
    const placements = await redis.sCard(locsKey(chatId, cardId));
    const isPlaced = placements > 0;
    if (isFav) {
      await redis.persist(k);
      if (placements > 0) await redis.persist(locsKey(chatId, cardId));
    } else if (isPlaced) {
      await redis.expire(k, TTL_PLACED_S);
      await redis.expire(locsKey(chatId, cardId), TTL_PLACED_S);
    } else {
      await redis.expire(k, TTL_CATCHALL_S);
      // card_locs SET is empty here → key doesn't exist → EXPIRE is a no-op.
    }
  } catch (err) {
    console.warn('[Clip-Store] recomputeCardTtl failed:', err.message);
  }
}

// migrateOldShapeEntry — if the entry at `index` is an old-shape JSON
// blob (pre-v0.62.328), split it into a per-card HASH + index entry.
// Returns the cardId (whether freshly migrated or already new-shape).
// Returns null if the entry is unrecoverable.
async function migrateOldShapeEntry(redis, chatId, index, raw) {
  if (!raw || typeof raw !== 'string') return null;
  // New shape: raw is a short cardId. Heuristic — JSON.parse failing
  // (or producing a non-object / object without `body`) means new shape.
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* not JSON → cardId */ }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.body !== 'string') {
    // Already new shape — raw is the cardId.
    return String(raw);
  }
  // Old shape — promote to HASH + replace list entry with cardId.
  try {
    if (!redis.isOpen) await redis.connect();
    const cardId = newCardId();
    const fields = normaliseRecord(parsed);
    const k = cardKey(chatId, cardId);
    await redis.hSet(k, fields);
    await redis.lSet(clipKey(chatId), index, cardId);
    // Preserve the old 30-day TTL behaviour for migrated entries — they
    // were always catch-all, never placed, never favourite.
    await redis.expire(k, TTL_CATCHALL_S);
    return cardId;
  } catch (err) {
    console.warn('[Clip-Store] migrateOldShapeEntry failed:', err.message);
    return null;
  }
}

async function pushClip(redis, chatId, record) {
  // v0.62.444 — allow a BLANK card (empty body) when record.blank is set
  // (operator: the Clipboard can create blank "sketchbook" cards).
  if (!redis || !chatId || !record || (!record.body && !record.blank)) return;
  try {
    if (!redis.isOpen) await redis.connect();
    const cardId = newCardId();
    const fields = normaliseRecord(record);
    const k = cardKey(chatId, cardId);
    await redis.hSet(k, fields);
    const lk = clipKey(chatId);
    await redis.lPush(lk, cardId);
    await redis.lTrim(lk, 0, MAX_CLIPS - 1);
    await redis.persist(lk);   // list itself never expires; per-card TTL governs lifetime
    await recomputeCardTtl(redis, chatId, cardId);
    return cardId;   // v0.62.444 — callers (blank-card create) need the new id
  } catch (err) {
    console.warn('[Clip-Store] pushClip failed:', err.message);
    return null;
  }
}

function matchesCuisine(rec, cuisineFilter) {
  if (!cuisineFilter) return true;
  const needle = String(cuisineFilter).toLowerCase().trim();
  if (!needle) return true;
  return (rec.cuisines || []).some((c) => String(c).toLowerCase().includes(needle));
}

// Resolve the cardId at `index`, migrating on the fly if it's old shape.
// Returns { cardId, record } | null. Does NOT mutate the list — the
// caller's `index` stays stable across the call. The only mutation here
// is the in-place lSet that promotes an old-shape JSON blob into a
// cardId at the same slot (which keeps the index valid).
async function readEntry(redis, chatId, index) {
  if (!redis || !chatId || !Number.isFinite(index) || index < 0) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const lk = clipKey(chatId);
    const raw = await redis.lIndex(lk, index);
    if (!raw) return null;
    const cardId = await migrateOldShapeEntry(redis, chatId, index, raw);
    if (!cardId) return null;
    const k = cardKey(chatId, cardId);
    const fields = await redis.hGetAll(k);
    if (!fields || Object.keys(fields).length === 0) {
      // Card HASH gone (TTL expired or hand-deleted). Caller will
      // simply see null and skip. We do NOT purge here — purging
      // mid-iteration shifts every subsequent index and breaks the
      // contract that listClips' returned indices stay valid for the
      // next getClip / removeClip / renameClip call.
      return null;
    }
    return { cardId, record: denormaliseRecord(fields) };
  } catch (err) {
    console.warn('[Clip-Store] readEntry failed:', err.message);
    return null;
  }
}

async function listClips(redis, chatId, { cuisine = null, limit = 5, offset = 0 } = {}) {
  if (!redis || !chatId) return { items: [], total: 0 };
  try {
    if (!redis.isOpen) await redis.connect();
    const lk = clipKey(chatId);
    const raws = await redis.lRange(lk, 0, MAX_CLIPS - 1);
    const liveItems = [];
    const deadRaws = [];
    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];
      // Migration is safe here — migrateOldShapeEntry does an in-place
      // lSet at index i; the snapshot's other indices stay valid.
      const cardId = await migrateOldShapeEntry(redis, chatId, i, raw);
      if (!cardId) { deadRaws.push(raw); continue; }
      const fields = await redis.hGetAll(cardKey(chatId, cardId));
      if (!fields || Object.keys(fields).length === 0) {
        deadRaws.push(cardId);
        continue;
      }
      const rec = denormaliseRecord(fields);
      if (!matchesCuisine(rec, cuisine)) {
        liveItems.push(null);   // placeholder so indices line up below
        continue;
      }
      liveItems.push({ ...rec, index: i, cardId });
    }
    // Lazy-purge AFTER the iteration. We LREM by exact-value (cardIds
    // are unique within the list), so we don't have to track indices.
    for (const dead of deadRaws) {
      try { await redis.lRem(lk, 1, dead); } catch { /* race: gone */ }
    }
    const filtered = liveItems.filter(Boolean);
    const items = filtered.slice(offset, offset + limit);
    return { items, total: filtered.length };
  } catch (err) {
    console.warn('[Clip-Store] listClips failed:', err.message);
    return { items: [], total: 0 };
  }
}

async function getClip(redis, chatId, index) {
  const entry = await readEntry(redis, chatId, index);
  return entry ? entry.record : null;
}

// New helper (v0.62.328) — fetch a card directly by its stable id.
// Used by clipboard-store.js (PR #2) for placement / move / amend flows.
async function getCardById(redis, chatId, cardId) {
  if (!redis || !chatId || !cardId) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const fields = await redis.hGetAll(cardKey(chatId, cardId));
    if (!fields || Object.keys(fields).length === 0) return null;
    return denormaliseRecord(fields);
  } catch (err) {
    console.warn('[Clip-Store] getCardById failed:', err.message);
    return null;
  }
}

async function clearClips(redis, chatId) {
  if (!redis || !chatId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    const lk = clipKey(chatId);
    // Walk the list, deleting each card HASH + locs SET, then DEL the list.
    const raws = await redis.lRange(lk, 0, MAX_CLIPS - 1);
    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];
      let cardId = null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && typeof parsed.body === 'string') {
          // Old shape — no HASH to delete yet. Skip.
          continue;
        }
      } catch { /* new shape: raw IS the cardId */ }
      cardId = String(raw);
      await redis.del(cardKey(chatId, cardId)).catch(() => {});
      await redis.del(locsKey(chatId, cardId)).catch(() => {});
    }
    await redis.del(lk);
    return true;
  } catch (err) {
    console.warn('[Clip-Store] clearClips failed:', err.message);
    return false;
  }
}

// v0.60.151 / v0.62.328 — remove one entry by index. Marks the slot
// with a sentinel, LREMs it, then deletes the underlying HASH + locs
// SET. If the card is favourite OR has placements, only the catch-all
// list entry is removed; the card record survives (so the user's
// favourite or in-drawer copy is not lost).
const REMOVE_SENTINEL = '__deleted__';
async function removeClip(redis, chatId, index) {
  if (!redis || !chatId || !Number.isFinite(index) || index < 0) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    const lk = clipKey(chatId);
    const raw = await redis.lIndex(lk, index);
    if (!raw) return false;
    const cardId = await migrateOldShapeEntry(redis, chatId, index, raw);
    if (!cardId) return false;
    // Always remove the list entry first.
    await redis.lSet(lk, index, REMOVE_SENTINEL);
    await redis.lRem(lk, 1, REMOVE_SENTINEL);
    // Decide whether to also drop the card record.
    const k = cardKey(chatId, cardId);
    const fav = await redis.hGet(k, 'favourite');
    const placements = await redis.sCard(locsKey(chatId, cardId));
    if (fav === '1' || placements > 0) {
      // Survives — but its TTL may need recomputing now that it's no
      // longer in the catch-all list. Placements / favourite already
      // hold it in the right tier, so just re-run the rule.
      await recomputeCardTtl(redis, chatId, cardId);
    } else {
      // Catch-all-only, non-favourite → drop the HASH.
      await redis.del(k);
      await redis.del(locsKey(chatId, cardId)).catch(() => {});
    }
    return true;
  } catch (err) {
    console.warn('[Clip-Store] removeClip failed:', err.message);
    return false;
  }
}

// softDeleteCard — new helper (v0.62.328). Hard-deletes a card record
// (HASH + locs SET) regardless of favourite / placements. Used by
// clipboard-store.js cascade-delete when the operator-locked rule says
// the card record itself should go. Does NOT touch the clip list — the
// caller is responsible for that (or relies on lazy-purge).
async function softDeleteCard(redis, chatId, cardId) {
  if (!redis || !chatId || !cardId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.del(cardKey(chatId, cardId));
    await redis.del(locsKey(chatId, cardId)).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[Clip-Store] softDeleteCard failed:', err.message);
    return false;
  }
}

// v0.62.416 — return an orphaned card to the catch-all clipboard. Operator
// reversal of the old cascade rule ("delete drawer/cabinet → cards return to
// Clipboard", HANDOFF §5). Dedupes to the front of the list, caps at MAX_CLIPS,
// recomputes the per-card TTL (→ 30-day catch-all, or PERSIST if favourite).
// No-op (returns false) if the card record is already gone.
async function returnToClipboard(redis, chatId, cardId) {
  if (!redis || !chatId || !cardId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    if (!(await redis.exists(cardKey(chatId, cardId)))) return false;
    const lk = clipKey(chatId);
    await redis.lRem(lk, 0, cardId);          // dedupe any stale entry
    await redis.lPush(lk, cardId);            // front of the catch-all
    await redis.lTrim(lk, 0, MAX_CLIPS - 1);  // cap 50
    await redis.persist(lk);
    await recomputeCardTtl(redis, chatId, cardId);
    return true;
  } catch (err) {
    console.warn('[Clip-Store] returnToClipboard failed:', err.message);
    return false;
  }
}

// v0.60.151 / v0.62.328 — stamp a user-supplied display name onto the
// clip's record. Trimmed, newline-collapsed, capped at 60 chars,
// non-empty required. Returns the saved name or null.
async function renameClip(redis, chatId, index, rawName) {
  if (!redis || !chatId || !Number.isFinite(index) || index < 0) return null;
  const name = String(rawName || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
  if (!name) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const raw = await redis.lIndex(clipKey(chatId), index);
    if (!raw) return null;
    const cardId = await migrateOldShapeEntry(redis, chatId, index, raw);
    if (!cardId) return null;
    await redis.hSet(cardKey(chatId, cardId), 'name', name);
    return name;
  } catch (err) {
    console.warn('[Clip-Store] renameClip failed:', err.message);
    return null;
  }
}

// ── Archive (v0.62.433) ──────────────────────────────────────────────
// Operator: a "Clear all" in the Catch-all that ARCHIVES the cards for 30 days
// (restorable), not a hard delete. The archive is a separate list with a 30-day
// TTL; cards keep their hashes (also 30-day) so Restore brings them back intact.
const ARCHIVE_PREFIX = 'clip_archive:';
function archiveKey(chatId) { return `${ARCHIVE_PREFIX}${chatId}`; }

async function archiveAllClips(redis, chatId) {
  if (!redis || !chatId) return { ok: false, error: 'missing-args' };
  try {
    if (!redis.isOpen) await redis.connect();
    const lk = clipKey(chatId), ak = archiveKey(chatId);
    const ids = await redis.lRange(lk, 0, MAX_CLIPS - 1).catch(() => []);
    if (!ids.length) return { ok: true, archived: 0 };
    for (const id of [...ids].reverse()) { await redis.lRem(ak, 0, id); await redis.lPush(ak, id); }
    await redis.lTrim(ak, 0, (MAX_CLIPS * 4) - 1);
    await redis.expire(ak, TTL_CATCHALL_S);
    await redis.del(lk).catch(() => {});
    for (const id of ids) { await redis.expire(cardKey(chatId, id), TTL_CATCHALL_S).catch(() => {}); }
    return { ok: true, archived: ids.length };
  } catch (err) {
    console.warn('[Clip-Store] archiveAllClips failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

async function restoreArchive(redis, chatId) {
  if (!redis || !chatId) return { ok: false, error: 'missing-args' };
  try {
    if (!redis.isOpen) await redis.connect();
    const lk = clipKey(chatId), ak = archiveKey(chatId);
    const ids = await redis.lRange(ak, 0, -1).catch(() => []);
    if (!ids.length) return { ok: true, restored: 0 };
    for (const id of [...ids].reverse()) { await redis.lRem(lk, 0, id); await redis.lPush(lk, id); }
    await redis.lTrim(lk, 0, MAX_CLIPS - 1);
    await redis.persist(lk);
    await redis.del(ak).catch(() => {});
    for (const id of ids) { await recomputeCardTtl(redis, chatId, id); }
    return { ok: true, restored: ids.length };
  } catch (err) {
    console.warn('[Clip-Store] restoreArchive failed:', err.message);
    return { ok: false, error: 'redis-failure' };
  }
}

async function archivedCount(redis, chatId) {
  if (!redis || !chatId) return 0;
  try { if (!redis.isOpen) await redis.connect(); return await redis.lLen(archiveKey(chatId)); }
  catch { return 0; }
}

module.exports = {
  // Public API (back-compat from v0.59.44):
  pushClip,
  listClips,
  archiveAllClips,
  restoreArchive,
  archivedCount,
  getClip,
  clearClips,
  removeClip,
  renameClip,
  // New helpers (v0.62.328):
  getCardById,
  recomputeCardTtl,
  softDeleteCard,
  returnToClipboard,
  newCardId,
  cardKey,
  locsKey,
  // v0.62.915 — the record normalisers, exported for tests. They were private, so the only way
  // to guard the locale clamp was to scan this file for the ternary ladder that implemented it —
  // and `bot-ternary-sweep.test.js` did exactly that, pinning `record.lang === 'fr' ? 'fr'` as
  // its example of locale-code plumbing. Replacing the ladder broke a pin that was testing the
  // spelling of a rule rather than the rule. Exported so the clamp can be asserted by CALLING,
  // the repair that file already applied to `pipeline.js`'s languageCode pin.
  _normaliseRecord: normaliseRecord,
  _denormaliseRecord: denormaliseRecord,
  // Constants:
  KEY_PREFIX,
  CARD_PREFIX,
  LOCS_PREFIX,
  MAX_CLIPS,
  TTL_S,
  TTL_CATCHALL_S,
  TTL_PLACED_S
};
