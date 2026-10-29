'use strict';

// owner-gate.js — v0.62.774 (Register O-185)
//
// WHAT WAS WRONG
// `isOwnerChat` lived inline in index.js and read:
//
//     const owner = process.env.TELEGRAM_OWNER_CHAT_ID;
//     if (!owner) return true;          // <-- fails OPEN
//     return String(chatId) === String(owner);
//
// It gates **17 call sites** (measured; the Register said 20): /cost, /ver,
// /log, the Recount commands, and the
// `/api/oversight/stats` HTTP route (a 403) — the only one reachable without
// Telegram. With the variable unset, every one of them answers YES to every
// user. The comment called this
// "deliberate for local dev", and for local dev it is — but a convenience whose
// failure mode is "admin opens to everyone" is not a convenience, it is a
// default. Defaults are what production runs on.
//
// THE FIX IS AN INVERSION, NOT A TIGHTENING
// Closed is now the default; open is opt-in and must be asked for by name:
//
//     TELEGRAM_OWNER_CHAT_ID set   -> exact match, unchanged
//     unset + opt-in set           -> open (local dev)
//     unset + no opt-in            -> CLOSED
//
// WHY NOT `NODE_ENV !== 'production'`. That was the first idea and it is the
// wrong one: it only holds if something actually sets NODE_ENV=production on
// the host. Nothing in this repo guarantees Railway does, so a gate hung on it
// would look like a fix, pass review, and leave the hole exactly where it was.
// An explicit opt-in cannot fail that way — production never sets it, because
// nobody would.
//
// THIS CHANGES BEHAVIOUR IF THE VARIABLE IS CURRENTLY UNSET IN PRODUCTION.
// Admin commands would stop working for the owner too, until it is set. That is
// the correct direction (a locked-out owner notices in seconds; an open admin
// surface notices nobody), but it is a real consequence and is flagged rather
// than buried. Whether the variable IS set on Railway could not be checked from
// this session — the Railway MCP was disconnected — so it is stated as unknown
// rather than assumed either way.

const OPT_IN = 'GIA_ALLOW_UNOWNED_ADMIN';

// Pure decision, env passed in so it can be tested without mutating the
// process. Returns { allow, reason } — the reason exists so a caller can log
// WHY it refused, which is the difference between a silent 403 and a
// diagnosable one.
function decideOwner({ chatId, owner, optIn }) {
  if (owner !== undefined && owner !== null && String(owner).trim() !== '') {
    const match = String(chatId) === String(owner).trim();
    return { allow: match, reason: match ? 'owner-match' : 'not-owner' };
  }
  if (String(optIn || '') === '1') {
    return { allow: true, reason: 'unowned-open-by-opt-in' };
  }
  return { allow: false, reason: 'unowned-closed' };
}

// Env-reading wrapper. `chatId` may be undefined (the HTTP route passes
// `req.tg?.user?.id`), which must never match an owner id.
function isOwnerChat(chatId, env = process.env) {
  if (chatId === undefined || chatId === null || String(chatId) === '') {
    return false;
  }
  return decideOwner({
    chatId,
    owner: env.TELEGRAM_OWNER_CHAT_ID,
    optIn: env[OPT_IN],
  }).allow;
}

module.exports = { decideOwner, isOwnerChat, OPT_IN };
