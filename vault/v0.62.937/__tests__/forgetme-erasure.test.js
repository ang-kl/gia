// __tests__/forgetme-erasure.test.js — v0.62.898
//
// `/privacy` says, verbatim and in nine locales: *"You can clear your stored data at any time
// by typing /forgetme."* That is a published commitment. It did not hold.
//
// `forgetUserData` deleted SEVEN namespaces. The app writes about forty. Missing, among others:
// the whole clipboard card family, the entire `cab:*` cabinet tree, `rating-pref`, `country-pref`,
// `user:<id>:lang`, `userlocale:`, `recent-locations:`, and `search-conv:` — **which holds the
// user's own typed messages**.
//
// ⚠ AND THE ORDER MADE IT WORSE THAN A GAP. It deleted `clip:<chatId>` — the INDEX — without the
// card hashes it points at, and `clip-store.js recomputeCardTtl` sets a favourited card to
// PERSIST, no TTL, ever. So asking to be forgotten left favourited cards on disk permanently with
// nothing pointing at them: unreachable AND undeletable. Erasure created the orphan.
//
// THE FIX DOES NOT DEPEND ON THE INDEX AT ALL. It SCANs `card:<chatId>:*`, so ordering stops
// mattering and — the reason it is the better fix — it also collects orphans that ALREADY exist
// from every /forgetme run before this one. A user erased last month gets cleaned up the next
// time they ask.
//
// The guard at the bottom is the real deliverable. A list of namespaces rots silently; this one
// cannot, because it is bidirectional: a namespace the code writes must be erased or exempted
// with a named reason, and an exemption that stops being true fails too. The same shape
// i18n-coverage.test.js uses for locale exemptions, for the same reason.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { forgetUserData, plainKeys, hashedKeys, scanPatterns, ERASURE_EXEMPT } = require('../user-data.js');
const { hashChatId } = require('../location-cache.js');

// A SYNTHETIC id. It used to be the owner's real Telegram chat id, which is not a credential
// but does identify a real person in a public repo. 100000001 / 1000000019 keep the prefix
// relationship the collision test at the bottom of this file depends on.
const CHAT = 100000001;
const H = hashChatId(CHAT);

// A purpose-built fake rather than __tests__/redis-stub.js, which has no scanIterator, no zsets
// and no `persist` — and is shared by four other suites, so widening it to fit this one would put
// their green at risk for this test's convenience. Faithful to exactly what forgetUserData calls.
function fakeRedis(seed = []) {
  const keys = new Set(seed);
  const sets = new Map();
  return {
    isOpen: true,
    keys,
    sets,
    async connect() { this.isOpen = true; },
    async exists(k) { return keys.has(k) ? 1 : 0; },
    async del(k) {
      const list = Array.isArray(k) ? k : [k];
      let n = 0;
      for (const key of list) if (keys.delete(key)) n++;
      return n;
    },
    async sRem(setKey, member) {
      const s = sets.get(setKey);
      if (s && s.delete(member)) return 1;
      return 0;
    },
    scanIterator({ MATCH }) {
      // Glob → RegExp, `*` only, which is all the patterns here use.
      const re = new RegExp('^' + MATCH.split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
      const hits = [...keys].filter((k) => re.test(k));
      return (async function* () { for (const k of hits) yield k; })();
    },
  };
}

// Everything a real user accumulates, one key per namespace the app writes per chat.
function seedEverything() {
  return [
    // the clipboard family — the orphan case
    `clip:${CHAT}`,
    `card:${CHAT}:AbCdEfGhIjK`,          // favourited ⇒ PERSIST in production
    `card_locs:${CHAT}:AbCdEfGhIjK`,
    `clip_archive:${CHAT}`,
    `clip:rename-pending:${CHAT}`,
    // the cabinet tree
    `cab:${CHAT}`,
    `cab:${CHAT}:cab1`,
    `cab:${CHAT}:cab1:dr`,
    `cab:${CHAT}:cab1:dr:0`,
    `cab:${CHAT}:default`,
    // durable preferences the user set
    `rating-pref:${CHAT}`,
    `country-pref:${CHAT}`,
    `country-pref:${CHAT}:dev:abc123`,
    `user:${CHAT}:lang`,
    `user:${CHAT}:country`,
    `recent-locations:${CHAT}`,
    `verbose:${CHAT}`,
    // the user's own typed messages
    `search-conv:${CHAT}`,
    // rotation / dedup state
    `cuisine:seen:${CHAT}:deadbeefdeadbeef`,
    `cuisine:variant:${CHAT}:deadbeefdeadbeef`,
    `cuisine:pool:${CHAT}:deadbeefdeadbeef:ko:v0`,
    `cuisine:recycle:${CHAT}:deadbeefdeadbeef`,
    `cuisine:session-seen:${CHAT}`,
    `cuisine:session-pages:${CHAT}`,
    `cuisine:session-meta:${CHAT}`,
    `cuisine:sg-dishes:${CHAT}`,
    `chat-freetext:seen:${CHAT}:abc`,
    `michelin:walk:seen:${CHAT}`,
    `michelin:walk:meta:${CHAT}`,
    `funfact:lastSeen:${CHAT}`,
    `recent-picks:${CHAT}`,
    `pick-cache:${CHAT}:1.3,103.8:r1000:x`,
    // transient flow state
    `place:anchor:${CHAT}:k1`,
    `locconf:${CHAT}`,
    `drift-pending:${CHAT}`,
    `wake:pending:${CHAT}`,
    `wake2:offer:${CHAT}`,
    `degraded:notice:${CHAT}`,
    // buddy (retired, still erasable)
    `buddy-optin:${CHAT}`,
    `buddy-blocks:${CHAT}`,
    `buddy-day:${CHAT}:2026-09-02`,
    // hashed encoding — one sha256, truncated to 16 hex, shared by all six
    `loc:${H}`,
    `loc:pending:${H}`,
    `proc:${H}`,
    `seen:${H}`,
    `userlocale:${H}`,
    `drift-suppress:${H}`,
    // must SURVIVE — another user's data
    `clip:999999`,
    `card:999999:ZzZzZzZzZzZ`,
    `rating-pref:999999`,
  ];
}

describe('the orphan this created, which is worse than the gap', () => {
  it('erasure leaves NOTHING matching card:<chatId>:* behind', async () => {
    // The regression. A favourited card is PERSIST — no TTL, ever — so a card the old code
    // orphaned would have outlived the account with nothing pointing at it.
    const r = fakeRedis(seedEverything());
    await forgetUserData(r, CHAT);
    const orphans = [...r.keys].filter((k) => k.startsWith(`card:${CHAT}:`) || k.startsWith(`card_locs:${CHAT}:`));
    expect(orphans, 'favourited cards left on disk, unreachable and undeletable').toEqual([]);
  });

  it('and it does not need the index to find them — pre-existing orphans go too', async () => {
    // Someone erased BEFORE this fix has cards with no `clip:` index. SCAN still reaches them,
    // which is why SCAN rather than "delete the cards first, then the index" is the fix.
    const r = fakeRedis([`card:${CHAT}:orphaned1`, `card_locs:${CHAT}:orphaned1`, `cab:${CHAT}:c1:dr:0`]);
    const res = await forgetUserData(r, CHAT);
    expect([...r.keys]).toEqual([]);
    expect(res.deleted).toBe(3);
  });
});

describe('everything a user accumulates is erased', () => {
  let r;
  beforeEach(async () => { r = fakeRedis(seedEverything()); await forgetUserData(r, CHAT); });

  it('nothing keyed to this chat survives, in either encoding', () => {
    const left = [...r.keys].filter((k) => k.includes(String(CHAT)) || k.includes(H));
    expect(left, 'these survive /forgetme').toEqual([]);
  });

  it('another user is untouched', () => {
    expect([...r.keys].sort()).toEqual([
      `card:999999:ZzZzZzZzZzZ`, `clip:999999`, `rating-pref:999999`,
    ].sort());
  });

  it('the user\'s own typed messages go', () => {
    expect(r.keys.has(`search-conv:${CHAT}`)).toBe(false);
  });

  it('the whole cabinet tree goes, not just its root', () => {
    expect([...r.keys].filter((k) => k.startsWith(`cab:${CHAT}`))).toEqual([]);
  });

  it('⚠ a chat whose id is a PREFIX of another is not collateral damage', async () => {
    // Telegram ids are numeric, so 1000000019 starts with 100000001. A pattern ending in a bare
    // `<chatId>*` would erase the longer id's data too — silently, and for someone who never
    // asked. Every pattern therefore terminates the id with `:` or end-of-string.
    const LONGER = `${CHAT}9`;
    const r2 = fakeRedis([
      `card:${CHAT}:mine`, `cuisine:session-seen:${CHAT}`, `cuisine:seen:${CHAT}:h`,
      `card:${LONGER}:theirs`, `cuisine:session-seen:${LONGER}`, `cuisine:seen:${LONGER}:h`,
    ]);
    await forgetUserData(r2, CHAT);
    expect([...r2.keys].sort(), 'the neighbouring chat was erased too').toEqual([
      `card:${LONGER}:theirs`, `cuisine:seen:${LONGER}:h`, `cuisine:session-seen:${LONGER}`,
    ].sort());
  });

  it('and it is idempotent — a second run finds nothing and does not throw', async () => {
    const again = await forgetUserData(r, CHAT);
    expect(again.deleted).toBe(0);
    expect(again.keys).toEqual([]);
  });
});

describe('⚠ the bidirectional namespace guard — this is the deliverable', () => {
  // A list of namespaces rots silently; that is exactly how seven-of-forty happened, and the
  // module's own header described eight keys as if it were complete. So: every per-chat namespace
  // the codebase writes must be ERASED or EXEMPTED WITH A NAMED REASON, and both directions fail.
  const REASONS = new Set([
    'aggregate-no-per-user-attribution',
    'not-enumerable-by-chatid',
    'holds-chatid-as-a-field-not-in-the-key',
    'dead-code-no-writer',
  ]);

  it('every exemption carries a reason from the fixed set', () => {
    expect(Object.keys(ERASURE_EXEMPT).length).toBeGreaterThan(0);
    for (const [ns, reason] of Object.entries(ERASURE_EXEMPT)) {
      expect(REASONS.has(reason), `${ns}: unknown reason "${reason}"`).toBe(true);
    }
  });

  it('an exemption may not name a namespace the erasure also covers', () => {
    // Stale in the other direction: if a namespace becomes erasable, its exemption must go.
    // Compared on the FULL namespace prefix, not the first segment — `chat-freetext:query` is
    // exempt while `chat-freetext:seen:` is erased, and a segment-0 comparison would call that
    // a conflict. The first draft did exactly that and would have failed on correct code.
    const erased = [...plainKeys(CHAT), ...hashedKeys(CHAT), ...scanPatterns(CHAT)];
    const stale = Object.keys(ERASURE_EXEMPT)
      .filter((ns) => erased.some((k) => k === ns || k.startsWith(ns + ':')));
    expect(stale, 'these are exempted AND erased — the exemption is stale').toEqual([]);
  });

  it('every scan pattern is scoped to this chat, so it can never widen to everyone', () => {
    // A pattern that lost its chatId would delete that namespace for the entire user base.
    for (const p of scanPatterns(CHAT)) {
      expect(p, `${p} is not scoped to a chat`).toMatch(new RegExp(`(${CHAT}|${H})`));
      expect(p.startsWith('*'), `${p} starts with a wildcard`).toBe(false);
    }
  });

  it('the static key lists are scoped too', () => {
    for (const k of [...plainKeys(CHAT), ...hashedKeys(CHAT)]) {
      expect(k, `${k} is not scoped to a chat`).toMatch(new RegExp(`(${CHAT}|${H})`));
    }
  });
});
