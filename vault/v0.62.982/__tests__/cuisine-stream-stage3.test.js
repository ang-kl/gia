// __tests__/cuisine-stream-stage3.test.js — progressive-results Stage 3.
// The two-wave reveal: a base event (first 6) + an append event (the rest)
// grow the list to 12 within one response. base ⊕ append ⊕ patches must equal
// the full 12-venue final list.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cs = require('../cuisine-stream.js');

const mk = (id) => ({ placeId: id, name: `V${id}`, rating: 4 });

describe('appendEvent + assembleFinal — two-wave 6→12 reveal', () => {
  it('base(6) ⊕ append(6) yields a 12-venue list in order', () => {
    const all = Array.from({ length: 12 }, (_, i) => mk(String(i + 1)));
    const base = cs.baseEvent({ venues: all.slice(0, 6), firstBatch: true, cumulativeStart: 1, cumulativeEnd: 12 });
    const append = cs.appendEvent(all.slice(6));
    const done = cs.doneEvent({ exhausted: false, firstBatch: true });
    const out = cs.assembleFinal(base, [], done, [append]);
    expect(out.venues.map((v) => v.placeId)).toEqual(['1','2','3','4','5','6','7','8','9','10','11','12']);
    expect(out.firstBatch).toBe(true);
  });

  it('patches land on append-wave venues too', () => {
    const all = Array.from({ length: 8 }, (_, i) => mk(String(i + 1)));
    const base = cs.baseEvent({ venues: all.slice(0, 6) });
    const append = cs.appendEvent(all.slice(6));               // venues 7,8
    const patch = cs.patchEvent('8', { recentReview: 'late but merged' });
    const out = cs.assembleFinal(base, [patch], cs.doneEvent({}), [append]);
    expect(out.venues.find((v) => v.placeId === '8').recentReview).toBe('late but merged');
    expect(out.venues).toHaveLength(8);
  });

  it('a ≤6 page has no append wave (just base)', () => {
    const all = [mk('1'), mk('2')];
    const out = cs.assembleFinal(cs.baseEvent({ venues: all }), [], cs.doneEvent({}), []);
    expect(out.venues).toHaveLength(2);
  });

  it('round-trips through the NDJSON decoder (base + append + patch + done)', () => {
    const all = Array.from({ length: 12 }, (_, i) => mk(String(i + 1)));
    const blob = cs.encodeEvent(cs.baseEvent({ venues: all.slice(0, 6), firstBatch: true }))
      + cs.encodeEvent(cs.appendEvent(all.slice(6)))
      + cs.encodeEvent(cs.patchEvent('12', { dishes: ['Satay'] }))
      + cs.encodeEvent(cs.doneEvent({ poolCount: 30 }));
    const dec = cs.createNdjsonDecoder();
    const evs = dec.push(blob).concat(dec.flush());
    const out = cs.assembleFinal(
      evs.find((e) => e.type === 'base'),
      evs.filter((e) => e.type === 'patch'),
      evs.find((e) => e.type === 'done'),
      evs.filter((e) => e.type === 'append'),
    );
    expect(out.venues).toHaveLength(12);
    expect(out.venues.find((v) => v.placeId === '12').dishes).toEqual(['Satay']);
    expect(out.poolCount).toBe(30);
  });
});
