// __tests__/cuisine-session.test.js — v0.60.146
//
// Tests for the Cuisine TMA per-session clipboard + back-page history
// (cuisine-session.js). Uses the in-memory redis-stub.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const sess = require('../cuisine-session.js');

function makePage(ids, extra = {}) {
  return {
    ts: Date.now(),
    criteriaHash: 'h1',
    venues: ids.map((id) => ({ placeId: id, name: 'V' + id, lat: 1.3, lng: 103.8 })),
    meta: { region: 'SG', ...extra }
  };
}

describe('startSession', () => {
  let r;
  beforeEach(() => { r = createStub(); });

  it('wipes session-seen, session-pages, session-meta for the chat', async () => {
    await sess.recordPage(r, 99, makePage(['p1', 'p2', 'p3']));
    expect(await sess.seenCount(r, 99)).toBe(3);
    expect(await sess.depth(r, 99)).toBe(1);
    const out = await sess.startSession(r, 99);
    expect(out.started).toBe(true);
    expect(await sess.seenCount(r, 99)).toBe(0);
    expect(await sess.depth(r, 99)).toBe(0);
  });

  it('is no-op when redis is closed', async () => {
    r.isOpen = false;
    const out = await sess.startSession(r, 99);
    expect(out.started).toBe(false);
  });
});

describe('recordPage / seenCount / depth', () => {
  let r;
  beforeEach(() => { r = createStub(); });

  it('accumulates placeIds in session-seen and LPUSHes payloads', async () => {
    const a = await sess.recordPage(r, 1, makePage(['p1', 'p2']));
    const b = await sess.recordPage(r, 1, makePage(['p3', 'p4', 'p5']));
    expect(a.seenCount).toBe(2);
    expect(b.seenCount).toBe(5);
    expect(b.depth).toBe(2);
    expect(b.capped).toBe(false);
  });

  it('reports capped=true once the 100-cap is reached', async () => {
    // v0.61.170 bumped SEEN_CAP 80 → 100. Serve 12 venues per page;
    // 9 pages → 108 placeIds → cap fires once the SET hits 100.
    let last;
    for (let i = 0; i < 9; i++) {
      const ids = Array.from({ length: 12 }, (_, j) => `pg${i}-${j}`);
      last = await sess.recordPage(r, 7, makePage(ids));
    }
    expect(last.seenCount).toBeGreaterThanOrEqual(100);
    expect(last.capped).toBe(true);
    expect(await sess.isExhausted(r, 7)).toBe(true);
  });

  it('trims the page list to the cap (10)', async () => {
    for (let i = 0; i < 14; i++) {
      const ids = Array.from({ length: 2 }, (_, j) => `pg${i}-${j}`);
      await sess.recordPage(r, 2, makePage(ids));
    }
    expect(await sess.depth(r, 2)).toBe(10);
  });

  it('skips the LPUSH on an empty-venues payload', async () => {
    await sess.recordPage(r, 3, makePage([]));
    expect(await sess.depth(r, 3)).toBe(0);
    expect(await sess.seenCount(r, 3)).toBe(0);
  });
});

describe('popPage', () => {
  let r;
  beforeEach(() => { r = createStub(); });

  it('returns the most-recent page first and decrements depth', async () => {
    await sess.recordPage(r, 4, makePage(['a1', 'a2']));
    await sess.recordPage(r, 4, makePage(['b1', 'b2']));
    await sess.recordPage(r, 4, makePage(['c1', 'c2']));
    expect(await sess.depth(r, 4)).toBe(3);
    const top = await sess.popPage(r, 4);
    expect(top.venues.map((v) => v.placeId)).toEqual(['c1', 'c2']);
    expect(await sess.depth(r, 4)).toBe(2);
    const second = await sess.popPage(r, 4);
    expect(second.venues.map((v) => v.placeId)).toEqual(['b1', 'b2']);
  });

  it('returns null when the history is empty', async () => {
    expect(await sess.popPage(r, 5)).toBeNull();
  });

  it('does NOT remove placeIds from the session-seen SET', async () => {
    await sess.recordPage(r, 6, makePage(['x1', 'x2']));
    await sess.recordPage(r, 6, makePage(['y1']));
    const before = await sess.seenCount(r, 6);
    await sess.popPage(r, 6);   // pops the y1 page
    expect(await sess.seenCount(r, 6)).toBe(before);   // x1, x2, y1 still in the SET
  });
});

describe('isExhausted', () => {
  it('returns false below the cap and true at/above', async () => {
    // v0.61.170 — SEEN_CAP is 100 (was 80); isExhausted flips at /
    // above that.
    const r = createStub();
    expect(await sess.isExhausted(r, 8)).toBe(false);
    const ids = Array.from({ length: 100 }, (_, i) => 'p' + i);
    await sess.recordPage(r, 8, makePage(ids));
    expect(await sess.isExhausted(r, 8)).toBe(true);
  });
});

describe('recordPage opts.skipCap (v0.60.149 — Michelin)', () => {
  let r;
  beforeEach(() => { r = createStub(); });

  it('never reports capped=true even when serving > SEEN_CAP venues', async () => {
    // 12 batches of 12 venues = 144 unique placeIds across two cuisine-
    // sized chunks; cap is 100 (v0.61.170). With skipCap=true, capped
    // must stay false.
    let last;
    for (let i = 0; i < 12; i++) {
      const ids = Array.from({ length: 12 }, (_, j) => `pg${i}-${j}`);
      last = await sess.recordPage(r, 10, makePage(ids), { skipCap: true });
    }
    expect(last.capped).toBe(false);
    expect(await sess.isExhausted(r, 10)).toBe(false);   // session-seen stayed empty
    expect(await sess.depth(r, 10)).toBe(10);            // page list still trimmed to 10
  });

  it('does not contribute to the session-seen SET', async () => {
    await sess.recordPage(r, 11, makePage(['m1', 'm2', 'm3']), { skipCap: true });
    expect(await sess.seenCount(r, 11)).toBe(0);
  });

  it('still LPUSHes the page payload so the back-FAB can walk it', async () => {
    await sess.recordPage(r, 12, makePage(['m1', 'm2']), { skipCap: true });
    expect(await sess.depth(r, 12)).toBe(1);
    const popped = await sess.popPage(r, 12);
    expect(popped.venues.map((v) => v.placeId)).toEqual(['m1', 'm2']);
  });

  it('skipCap and non-skipCap pages can coexist on the same session', async () => {
    // Cuisine-chip page (counts toward cap) + Michelin page (does not)
    await sess.recordPage(r, 13, makePage(['c1', 'c2']));   // default: cap-counted
    await sess.recordPage(r, 13, makePage(['m1', 'm2']), { skipCap: true });
    expect(await sess.seenCount(r, 13)).toBe(2);            // only c1, c2 counted
    expect(await sess.depth(r, 13)).toBe(2);                // both pages in history
  });
});
