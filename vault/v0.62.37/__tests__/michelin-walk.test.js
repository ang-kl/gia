// v0.60.198 — michelin-walk.js unit tests.
//
// Covers:
//   - computeCriteriaHash: stable across key order, normalises filters,
//     case-folds free-text, distinguishes meaningful changes.
//   - readWalkState: empty when no key, reads back set, wipes on hash
//     change, wipes on TTL expiry, no-ops without redis/chatId.
//   - recordWalk: writes set + meta, refreshes TTL, no-ops gracefully.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const mw = require('../michelin-walk.js');

// In-memory redis stub matching the small surface michelin-walk uses.
function makeRedis() {
  const sets = new Map();
  const hashes = new Map();
  return {
    isOpen: true,
    async sMembers(key) { return Array.from(sets.get(key) || []); },
    async sAdd(key, slugs) {
      const s = sets.get(key) || new Set();
      for (const x of slugs) s.add(x);
      sets.set(key, s);
      return slugs.length;
    },
    async hGetAll(key) { return { ...(hashes.get(key) || {}) }; },
    async hSet(key, obj) {
      const cur = hashes.get(key) || {};
      hashes.set(key, { ...cur, ...obj });
      return 1;
    },
    async del(key) {
      sets.delete(key);
      hashes.delete(key);
      return 1;
    },
    async expire() { return 1; },
    _setMeta(key, meta) { hashes.set(key, meta); },
    _setSeen(key, arr)  { sets.set(key, new Set(arr)); },
  };
}

describe('computeCriteriaHash', () => {
  it('is stable across object-key order', () => {
    const a = mw.computeCriteriaHash({ otherCuisineSlugs: ['italian'], filters: { halal: true, openNow: true }, prices: [2, 3], radius: 20000, isJB: false, freeText: 'foo' });
    const b = mw.computeCriteriaHash({ freeText: 'foo', radius: 20000, prices: [3, 2], isJB: false, filters: { openNow: true, halal: true }, otherCuisineSlugs: ['italian'] });
    expect(a).toBe(b);
  });

  it('drops falsy filter flags', () => {
    const a = mw.computeCriteriaHash({ filters: {} });
    const b = mw.computeCriteriaHash({ filters: { halal: false, openNow: false } });
    expect(a).toBe(b);
  });

  it('case-folds free-text', () => {
    const a = mw.computeCriteriaHash({ freeText: '  Italian Pasta ' });
    const b = mw.computeCriteriaHash({ freeText: 'italian pasta' });
    expect(a).toBe(b);
  });

  it('changes when combo changes', () => {
    const a = mw.computeCriteriaHash({ otherCuisineSlugs: [] });
    const b = mw.computeCriteriaHash({ otherCuisineSlugs: ['japanese'] });
    expect(a).not.toBe(b);
  });

  it('changes when a filter flips on', () => {
    const a = mw.computeCriteriaHash({ filters: {} });
    const b = mw.computeCriteriaHash({ filters: { halal: true } });
    expect(a).not.toBe(b);
  });

  it('changes when price tier added', () => {
    const a = mw.computeCriteriaHash({ prices: [] });
    const b = mw.computeCriteriaHash({ prices: [3] });
    expect(a).not.toBe(b);
  });
  // v0.61.440 — per-country/city loc token: switching country must NOT
  // reuse the prior country's walk seen-set (operator: MY Michelin → 0).
  it('changes when the loc (country/city) differs', () => {
    const sg = mw.computeCriteriaHash({ loc: 'SG|' });
    const my = mw.computeCriteriaHash({ loc: 'MY|kuala lumpur' });
    const vn = mw.computeCriteriaHash({ loc: 'VN|hanoi' });
    expect(sg).not.toBe(my);
    expect(my).not.toBe(vn);
  });
  it('is stable for the same loc (re-tap "more" keeps the walk)', () => {
    const a = mw.computeCriteriaHash({ loc: 'MY|kuala lumpur', radius: 40000 });
    const b = mw.computeCriteriaHash({ radius: 40000, loc: 'MY|kuala lumpur' });
    expect(a).toBe(b);
  });
});

describe('readWalkState', () => {
  let r;
  beforeEach(() => { r = makeRedis(); });

  it('returns empty + reset:false when no prior state', async () => {
    const { seen, reset } = await mw.readWalkState(r, '42', 'h1');
    expect(seen.size).toBe(0);
    expect(reset).toBe(false);
  });

  it('returns the stored set when hash matches and fresh', async () => {
    r._setMeta('michelin:walk:meta:42', { hash: 'h1', lastSeenAt: String(Date.now()) });
    r._setSeen('michelin:walk:seen:42', ['a', 'b']);
    const { seen, reset } = await mw.readWalkState(r, '42', 'h1');
    expect(seen.has('a')).toBe(true);
    expect(seen.has('b')).toBe(true);
    expect(reset).toBe(false);
  });

  it('wipes seen-set when hash differs (filter change)', async () => {
    r._setMeta('michelin:walk:meta:42', { hash: 'h-old', lastSeenAt: String(Date.now()) });
    r._setSeen('michelin:walk:seen:42', ['a', 'b']);
    const { seen, reset } = await mw.readWalkState(r, '42', 'h-new');
    expect(seen.size).toBe(0);
    expect(reset).toBe(true);
    expect(await r.sMembers('michelin:walk:seen:42')).toEqual([]);
  });

  it('wipes seen-set when lastSeenAt is older than TTL (1h idle)', async () => {
    const ancient = Date.now() - (mw.TTL_SECONDS * 1000 + 60_000);
    r._setMeta('michelin:walk:meta:42', { hash: 'h1', lastSeenAt: String(ancient) });
    r._setSeen('michelin:walk:seen:42', ['a']);
    const { seen, reset } = await mw.readWalkState(r, '42', 'h1');
    expect(seen.size).toBe(0);
    expect(reset).toBe(true);
  });

  it('no-ops gracefully without redis', async () => {
    const { seen, reset } = await mw.readWalkState(null, '42', 'h1');
    expect(seen.size).toBe(0);
    expect(reset).toBe(false);
  });

  it('no-ops gracefully without chatId', async () => {
    const { seen } = await mw.readWalkState(r, null, 'h1');
    expect(seen.size).toBe(0);
  });
});

describe('recordWalk', () => {
  let r;
  beforeEach(() => { r = makeRedis(); });

  it('writes slugs + meta', async () => {
    await mw.recordWalk(r, '42', 'h1', ['a', 'b']);
    expect((await r.sMembers('michelin:walk:seen:42')).sort()).toEqual(['a', 'b']);
    const meta = await r.hGetAll('michelin:walk:meta:42');
    expect(meta.hash).toBe('h1');
    expect(Number(meta.lastSeenAt)).toBeGreaterThan(0);
  });

  it('appends to existing set', async () => {
    r._setSeen('michelin:walk:seen:42', ['a']);
    await mw.recordWalk(r, '42', 'h1', ['b', 'c']);
    expect((await r.sMembers('michelin:walk:seen:42')).sort()).toEqual(['a', 'b', 'c']);
  });

  it('no-ops on empty slug list', async () => {
    await mw.recordWalk(r, '42', 'h1', []);
    expect(await r.sMembers('michelin:walk:seen:42')).toEqual([]);
  });

  it('no-ops gracefully without redis', async () => {
    await expect(mw.recordWalk(null, '42', 'h1', ['a'])).resolves.toBeUndefined();
  });
});

describe('walk-through integration shape', () => {
  it('two consecutive recordWalks accumulate; hash flip resets', async () => {
    const r = makeRedis();
    const hashA = mw.computeCriteriaHash({ otherCuisineSlugs: [], filters: {} });
    const hashB = mw.computeCriteriaHash({ otherCuisineSlugs: ['italian'], filters: {} });

    // Tap 1: serve a, b
    let { seen } = await mw.readWalkState(r, '42', hashA);
    expect(seen.size).toBe(0);
    await mw.recordWalk(r, '42', hashA, ['a', 'b']);

    // Tap 2: serve c, d (same combo)
    ({ seen } = await mw.readWalkState(r, '42', hashA));
    expect(seen.size).toBe(2);
    await mw.recordWalk(r, '42', hashA, ['c', 'd']);

    // Tap 3: combo changes to Italian — reset
    let walk = await mw.readWalkState(r, '42', hashB);
    expect(walk.reset).toBe(true);
    expect(walk.seen.size).toBe(0);
  });
});

describe('entryKey', () => {
  it('joins name + address, lowercase', () => {
    expect(mw.entryKey({ name: 'Les Amis', address: '1 Scotts Road' })).toBe('les amis|1 scotts road');
  });
  it('handles missing address', () => {
    expect(mw.entryKey({ name: 'Odette' })).toBe('odette|');
  });
  it('returns empty for missing entry / name', () => {
    expect(mw.entryKey(null)).toBe('');
    expect(mw.entryKey({})).toBe('');
  });
  it('round-trips through walk state', async () => {
    const r = makeRedis();
    const hash = mw.computeCriteriaHash({});
    const e1 = { name: 'Les Amis', address: '1 Scotts Road' };
    const e2 = { name: 'Odette', address: '1 St Andrew Road' };
    await mw.recordWalk(r, '42', hash, [mw.entryKey(e1), mw.entryKey(e2)]);
    const { seen } = await mw.readWalkState(r, '42', hash);
    expect(seen.has(mw.entryKey(e1))).toBe(true);
    expect(seen.has(mw.entryKey(e2))).toBe(true);
  });
});
