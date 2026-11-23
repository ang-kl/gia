// place-card-budget.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Part B,
// invariant I1.
//
// Operator, 23-11 '26: paid Google lookups are acceptable "with a daily cap per reader $1", and they chose a ceiling of
// US$20.00 a month for everyone together. Counted in thousandths of a US dollar at list price: 1,000 per reader per
// Singapore day, 20,000 per Singapore calendar month.
//
// The amount is RESERVED before the call and given back if the call fails. That order is the point: a check made
// before the call and a count made after it lets ten parallel taps all pass the check.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pc = require('../place-card.js');

// A stand-in for Redis with the same four calls the server adapter exposes.
function fakeStore() {
  const m = new Map();
  return {
    m,
    get: async (k) => (m.has(k) ? m.get(k) : null),
    set: async (k, v) => { m.set(k, String(v)); },
    setEx: async (k, _ttl, v) => { m.set(k, String(v)); },
    incrBy: async (k, n) => { const v = (Number(m.get(k)) || 0) + n; m.set(k, String(v)); return v; },
    expire: async () => {},
    del: async (k) => { m.delete(k); },
  };
}
const T = Date.parse('2026-11-23T04:00:00Z');   // 12:00 SGT on 23-11 '26
const clock = (start = T) => { let t = start; const now = () => t; now.set = (v) => { t = v; }; return now; };

describe.each([['with a shared store', true], ['with memory only', false]])('the reader limit, %s (I1)', (_label, shared) => {
  const make = (now = clock()) => pc.createBudget({ store: shared ? fakeStore() : null, now });

  it('50 card lookups pass and the 51st is refused', async () => {
    const b = make();
    for (let i = 0; i < 50; i++) expect((await b.reserve('reader-a', pc.CARD_MILLS)).ok, `lookup ${i + 1}`).toBe(true);
    const r = await b.reserve('reader-a', pc.CARD_MILLS);
    expect(r).toMatchObject({ ok: false, reason: 'cap' });
    expect(await b.spent('reader-a')).toBe(1000);
  });

  it('a refusal holds nothing, so the count does not creep past the limit', async () => {
    const b = make();
    for (let i = 0; i < 50; i++) await b.reserve('reader-a', pc.CARD_MILLS);
    for (let i = 0; i < 5; i++) await b.reserve('reader-a', pc.CARD_MILLS);
    expect(await b.spent('reader-a')).toBe(1000);
    expect(await b.monthSpent()).toBe(1000);
  });

  it('another reader has their own 50', async () => {
    const b = make();
    for (let i = 0; i < 50; i++) await b.reserve('reader-a', pc.CARD_MILLS);
    expect((await b.reserve('reader-b', pc.CARD_MILLS)).ok).toBe(true);
  });

  it('sixty parallel taps cannot pass the limit: exactly 50 are let through', async () => {
    const b = make();
    const out = await Promise.all(Array.from({ length: 60 }, () => b.reserve('reader-a', pc.CARD_MILLS)));
    expect(out.filter((r) => r.ok).length).toBe(50);
    expect(await b.spent('reader-a')).toBe(1000);
  });

  it('a failed call gives its amount back', async () => {
    const b = make();
    const r = await b.reserve('reader-a', pc.CARD_MILLS);
    expect(await b.spent('reader-a')).toBe(20);
    await r.release();
    expect(await b.spent('reader-a')).toBe(0);
    expect(await b.monthSpent()).toBe(0);
  });

  it('a release is given back once, however often it is called', async () => {
    const b = make();
    await b.reserve('reader-a', pc.CARD_MILLS);
    const r = await b.reserve('reader-a', pc.CARD_MILLS);
    await r.release();
    await r.release();
    expect(await b.spent('reader-a')).toBe(20);
  });

  it('full-card lookups at 25 share the same limit: 40 pass, the 41st is refused', async () => {
    const b = make();
    for (let i = 0; i < 40; i++) expect((await b.reserve('reader-a', pc.FULL_MILLS)).ok).toBe(true);
    expect((await b.reserve('reader-a', pc.FULL_MILLS)).ok).toBe(false);
    expect((await b.reserve('reader-a', pc.CARD_MILLS)).ok, 'nothing fits after 1,000').toBe(false);
  });

  it('a lookup that would cross the limit is refused even when a little is left', async () => {
    const b = make();
    for (let i = 0; i < 49; i++) await b.reserve('reader-a', pc.CARD_MILLS);   // 980
    expect((await b.reserve('reader-a', pc.FULL_MILLS)).ok, '980 + 25 is over').toBe(false);
    expect((await b.reserve('reader-a', pc.CARD_MILLS)).ok, '980 + 20 is exactly the limit').toBe(true);
  });

  it('the day turns at midnight in Singapore, not in UTC', async () => {
    const now = clock(Date.parse('2026-11-23T15:59:59Z'));   // 23:59:59 SGT
    const b = make(now);
    for (let i = 0; i < 50; i++) await b.reserve('reader-a', pc.CARD_MILLS);
    expect((await b.reserve('reader-a', pc.CARD_MILLS)).ok).toBe(false);
    now.set(Date.parse('2026-11-23T16:00:00Z'));             // 00:00:00 SGT on the 24th
    expect((await b.reserve('reader-a', pc.CARD_MILLS)).ok).toBe(true);
    expect(await b.spent('reader-a')).toBe(20);
  });
});

describe('the monthly limit for everyone together (I1)', () => {
  it('the 1,001st card lookup of the month is refused for anyone, and holds nothing', async () => {
    const b = pc.createBudget({ store: fakeStore(), now: clock() });
    for (let reader = 0; reader < 20; reader++) {
      for (let i = 0; i < 50; i++) expect((await b.reserve(`reader-${reader}`, pc.CARD_MILLS)).ok).toBe(true);
    }
    expect(await b.monthSpent()).toBe(20000);
    const r = await b.reserve('a-new-reader', pc.CARD_MILLS);
    expect(r).toMatchObject({ ok: false, reason: 'budget' });
    expect(await b.spent('a-new-reader'), 'the refused reader was not charged').toBe(0);
    expect(await b.monthSpent()).toBe(20000);
  });

  it('the month turns at midnight in Singapore on the 1st', async () => {
    const now = clock(Date.parse('2026-11-30T15:59:59Z'));   // 23:59:59 SGT, 30 November
    const b = pc.createBudget({ store: fakeStore(), now });
    for (let reader = 0; reader < 20; reader++) for (let i = 0; i < 50; i++) await b.reserve(`reader-${reader}`, pc.CARD_MILLS);
    expect((await b.reserve('late', pc.CARD_MILLS)).reason).toBe('budget');
    now.set(Date.parse('2026-11-30T16:00:00Z'));             // 00:00:00 SGT, 1 December
    expect((await b.reserve('late', pc.CARD_MILLS)).ok).toBe(true);
    expect(await b.monthSpent()).toBe(20);
  });
});

describe('what is written down (I8)', () => {
  it('the reader is stored as a hash, never as the Telegram ID', async () => {
    const store = fakeStore();
    const b = pc.createBudget({ store, now: clock() });
    await b.reserve(987654321012, pc.CARD_MILLS);
    const keys = [...store.m.keys()];
    expect(keys.length).toBe(2);
    for (const k of keys) expect(k).not.toContain('987654321012');
    expect(keys.some((k) => /^placecard:reader:[0-9a-f]{16}:2026-11-23$/.test(k))).toBe(true);
    expect(keys).toContain('placecard:month:2026-11');
  });

  it('no reader means no reservation', async () => {
    const b = pc.createBudget({ store: fakeStore(), now: clock() });
    for (const id of [null, undefined, '', 0]) expect((await b.reserve(id, pc.CARD_MILLS)).ok).toBe(false);
  });

  it('a store that throws does not throw at the caller, and the limit still holds in memory', async () => {
    const broken = { get: async () => { throw new Error('down'); }, incrBy: async () => { throw new Error('down'); }, expire: async () => { throw new Error('down'); } };
    const b = pc.createBudget({ store: broken, now: clock() });
    for (let i = 0; i < 50; i++) expect((await b.reserve('reader-a', pc.CARD_MILLS)).ok).toBe(true);
    expect((await b.reserve('reader-a', pc.CARD_MILLS)).ok).toBe(false);
  });
});
