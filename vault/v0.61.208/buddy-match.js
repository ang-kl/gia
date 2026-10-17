// buddy-match.js — Buddy Level 2 (v0.31.0).
//
// Safety-conscious live solo-dining match. Design rules:
//   1. Opt-in only.
//   2. Mutual confirmation reveals first names + Telegram handle.
//   3. Block list per user; blocked counterparts never matched.
//   4. Daily cap = 5 connections / 24 h.
//   5. 60-min intent window — auto-expires.
//   6. Report mechanism logs to admin set for review.
//
// Storage shape:
//   buddy-optin:<chatId>          STRING '1' (with TTL of 30d to nudge
//                                 users to re-confirm consent)
//   buddy-intent:<placeId>        ZSET   member=chatId, score=expiry-ms
//   buddy-blocks:<chatId>         SET    blocked-chatIds (no TTL)
//   buddy-day:<chatId>:<YMD>      STRING int count, 24h TTL
//   buddy-offer:<token>           HASH   {fromId, toId, placeId, venueName,
//                                         fromName, toName, status, expiresAt}
//   buddy-reports                 LIST   appended `[ts]<reporter>:<reported>:<reason>`
//                                 (admin-only consumer; never auto-acts)

const crypto = require('crypto');

const OPT_IN_TTL_S      = 30 * 24 * 60 * 60;  // 30 days
const INTENT_WINDOW_MS  = 60 * 60 * 1000;     // 60 min
const OFFER_TTL_S       = 30 * 60;            // 30 min match-offer expiry
const DAILY_CAP         = 5;
const MAX_BLOCKS        = 50;

function ymd() {
  const d = new Date();
  const sgt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return sgt.toISOString().slice(0, 10).replace(/-/g, '');
}

function genToken() {
  return crypto.randomBytes(8).toString('base64url');
}

// --------- Opt-in -------------------------------------------------------

async function isOptedIn(redis, chatId) {
  if (!redis || !chatId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    return Boolean(await redis.get(`buddy-optin:${chatId}`));
  } catch { return false; }
}

async function optIn(redis, chatId) {
  if (!redis || !chatId) return;
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`buddy-optin:${chatId}`, OPT_IN_TTL_S, '1');
}

async function optOut(redis, chatId) {
  if (!redis || !chatId) return;
  if (!redis.isOpen) await redis.connect();
  await redis.del(`buddy-optin:${chatId}`).catch(() => {});
  // Also drop any active intents this user has registered.
  // Best-effort; not strictly required (intents auto-expire in 60 min).
}

// --------- Block list ---------------------------------------------------

async function block(redis, chatId, blockedChatId) {
  if (!redis || !chatId || !blockedChatId) return false;
  if (!redis.isOpen) await redis.connect();
  const card = await redis.sCard(`buddy-blocks:${chatId}`).catch(() => 0);
  if (card >= MAX_BLOCKS) return false;
  await redis.sAdd(`buddy-blocks:${chatId}`, String(blockedChatId));
  return true;
}

async function isBlocked(redis, chatId, otherChatId) {
  if (!redis || !chatId || !otherChatId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    return Boolean(await redis.sIsMember(`buddy-blocks:${chatId}`, String(otherChatId)));
  } catch { return false; }
}

// --------- Daily cap ----------------------------------------------------

async function dailyCount(redis, chatId) {
  if (!redis || !chatId) return 0;
  try {
    if (!redis.isOpen) await redis.connect();
    const v = await redis.get(`buddy-day:${chatId}:${ymd()}`);
    return Number(v) || 0;
  } catch { return 0; }
}

async function bumpDailyCount(redis, chatId) {
  if (!redis || !chatId) return;
  if (!redis.isOpen) await redis.connect();
  const key = `buddy-day:${chatId}:${ymd()}`;
  await redis.incr(key);
  await redis.expire(key, 24 * 60 * 60);
}

// --------- Intent (user is heading to placeId) --------------------------

async function registerIntent(redis, chatId, placeId) {
  if (!redis || !chatId || !placeId) return;
  if (!await isOptedIn(redis, chatId)) return; // opt-in gate
  if (!redis.isOpen) await redis.connect();
  const expiresAt = Date.now() + INTENT_WINDOW_MS;
  await redis.zAdd(`buddy-intent:${placeId}`, [{ score: expiresAt, value: String(chatId) }]);
  // Self-cleaning: drop expired members on every write.
  await redis.zRemRangeByScore(`buddy-intent:${placeId}`, '-inf', Date.now());
}

// Returns array of OTHER opted-in chatIds with active intent at this place,
// excluding the requester and anyone they've blocked.
async function findCounterparts(redis, chatId, placeId) {
  if (!redis || !chatId || !placeId) return [];
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.zRemRangeByScore(`buddy-intent:${placeId}`, '-inf', Date.now());
    const members = await redis.zRange(`buddy-intent:${placeId}`, 0, -1);
    const me = String(chatId);
    const out = [];
    for (const m of members) {
      if (m === me) continue;
      // Filter blocked + non-opted-in + symmetric block
      if (!(await isOptedIn(redis, m))) continue;
      if (await isBlocked(redis, chatId, m)) continue;
      if (await isBlocked(redis, m, chatId)) continue;
      out.push(m);
    }
    return out;
  } catch { return []; }
}

// --------- Match offers (mutual-confirm flow) ---------------------------

async function createOffer(redis, { fromId, toId, placeId, venueName, fromName }) {
  if (!redis) return null;
  if (!redis.isOpen) await redis.connect();
  // Daily cap on the initiator
  const count = await dailyCount(redis, fromId);
  if (count >= DAILY_CAP) return { error: 'daily_cap', count };
  const token = genToken();
  const offer = {
    fromId: String(fromId),
    toId: String(toId),
    placeId,
    venueName,
    fromName: String(fromName || 'a fellow soleat user').slice(0, 40),
    toName: '',                  // filled when To-side confirms
    status: 'pending_to',        // pending_to → mutual_confirmed | declined | expired
    expiresAt: Date.now() + OFFER_TTL_S * 1000
  };
  await redis.setEx(`buddy-offer:${token}`, OFFER_TTL_S, JSON.stringify(offer));
  return { token, offer };
}

async function loadOffer(redis, token) {
  if (!redis || !token) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const raw = await redis.get(`buddy-offer:${token}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function setOfferStatus(redis, token, patch) {
  const offer = await loadOffer(redis, token);
  if (!offer) return null;
  Object.assign(offer, patch);
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`buddy-offer:${token}`, OFFER_TTL_S, JSON.stringify(offer));
  return offer;
}

// --------- Report -------------------------------------------------------

async function report(redis, reporterId, reportedId, reason = '') {
  if (!redis || !reporterId || !reportedId) return;
  if (!redis.isOpen) await redis.connect();
  const line = `[${new Date().toISOString()}] ${reporterId}:${reportedId}:${String(reason).slice(0, 200)}`;
  await redis.lPush('buddy-reports', line);
  await redis.lTrim('buddy-reports', 0, 999); // keep last 1000
  console.warn('[Buddy] report:', line);
}

module.exports = {
  isOptedIn, optIn, optOut,
  block, isBlocked,
  dailyCount, bumpDailyCount,
  registerIntent, findCounterparts,
  createOffer, loadOffer, setOfferStatus,
  report,
  DAILY_CAP, INTENT_WINDOW_MS, OFFER_TTL_S
};
