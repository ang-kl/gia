// __tests__/cuisine-stream-stage2.test.js — progressive-results Stage 2.
// The base/patch split helpers: snapshotVenue, diffVenue, applyPatchFields,
// assembleFinal — and the round-trip invariant that base ⊕ patches equals the
// fully-enriched venue array (so the streamed payload is byte-identical to the
// non-streamed one).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cs = require('../cuisine-stream.js');

describe('diffVenue — fast→slow field delta', () => {
  it('captures added slow fields only', () => {
    // The slow phase mutates the SAME venue object the snapshot was taken
    // from, so unchanged fields keep their reference (a fast field like
    // `dishes` set in enrichFast is untouched by enrichSlow).
    const venue = { placeId: 'A', name: 'X', rating: 4.2, dishes: ['Laksa'] };
    const snap = cs.snapshotVenue(venue);
    venue.recentReview = 'great';
    venue.travelMins = 7;
    venue.footfall = { liveBusyness: 40 };
    expect(cs.diffVenue(snap, venue)).toEqual({
      recentReview: 'great', travelMins: 7, footfall: { liveBusyness: 40 },
    });
  });
  it('captures a changed field (slow phase overwrote a fast value)', () => {
    const snap = cs.snapshotVenue({ placeId: 'A', recentReview: 'short' });
    const fin = { placeId: 'A', recentReview: 'translated longer review' };
    expect(cs.diffVenue(snap, fin)).toEqual({ recentReview: 'translated longer review' });
  });
  it('surfaces deletes as explicit null (e.g. reviews/regularPeriods dropped)', () => {
    const snap = cs.snapshotVenue({ placeId: 'A', reviews: [{ text: 'x' }], regularPeriods: [] });
    const fin = { placeId: 'A' };
    expect(cs.diffVenue(snap, fin)).toEqual({ reviews: null, regularPeriods: null });
  });
  it('replaces a wholesale-swapped nested object (shallow ref compare)', () => {
    const foot = { liveBusyness: 10 };
    const snap = cs.snapshotVenue({ placeId: 'A', footfall: foot });
    const fin = { placeId: 'A', footfall: { liveBusyness: 90 } };
    expect(cs.diffVenue(snap, fin)).toEqual({ footfall: { liveBusyness: 90 } });
  });
  it('empty diff when nothing changed', () => {
    const snap = cs.snapshotVenue({ placeId: 'A', name: 'X' });
    expect(cs.diffVenue(snap, { placeId: 'A', name: 'X' })).toEqual({});
  });
});

describe('applyPatchFields — client merge incl. null-delete', () => {
  it('merges fields onto the matching venue, returns a new array + new object', () => {
    const venues = [{ placeId: 'A', name: 'X' }, { placeId: 'B', name: 'Y' }];
    const next = cs.applyPatchFields(venues, 'A', { recentReview: 'hi' });
    expect(next).not.toBe(venues);
    expect(next[0]).toEqual({ placeId: 'A', name: 'X', recentReview: 'hi' });
    expect(next[1]).toBe(venues[1]);   // untouched venue keeps identity
  });
  it('null field deletes the key', () => {
    const venues = [{ placeId: 'A', reviews: [1, 2] }];
    expect(cs.applyPatchFields(venues, 'A', { reviews: null })[0]).toEqual({ placeId: 'A' });
  });
  it('no-op for an absent placeId', () => {
    const venues = [{ placeId: 'A' }];
    expect(cs.applyPatchFields(venues, 'Z', { x: 1 })).toBe(venues);
  });
});

describe('round-trip — base ⊕ patches == fully-enriched venues', () => {
  it('reassembles the exact non-streamed payload', () => {
    // Fast snapshots (what the base event carries).
    const fast = [
      { placeId: 'A', name: 'Aaa', rating: 4.5, reviews: [{ text: 'r' }], regularPeriods: [] },
      { placeId: 'B', name: 'Bbb', rating: 4.1, reviews: [{ text: 's' }] },
    ];
    // Fully-enriched final venues (what the non-streamed route returns).
    const final = [
      { placeId: 'A', name: 'Aaa', rating: 4.5, recentReview: 'r', travelMins: 5, nameReading: 'aaa' },
      { placeId: 'B', name: 'Bbb', rating: 4.1, recentReview: 's', dishes: ['Char Kway Teow'] },
    ];
    const snaps = new Map(fast.map((v) => [v.placeId, cs.snapshotVenue(v)]));
    const baseEv = cs.baseEvent({ venues: fast.map((v) => ({ ...v })), firstBatch: true, poolCount: 19 });
    const patchEvs = final.map((v) => cs.patchEvent(v.placeId, cs.diffVenue(snaps.get(v.placeId), v)));
    const doneEv = cs.doneEvent({ exhausted: false, poolCount: 19, firstBatch: true, cached: false });

    const assembled = cs.assembleFinal(baseEv, patchEvs, doneEv);
    expect(assembled.venues).toEqual(final);
    // non-venue metadata travels on the done event
    expect(assembled.exhausted).toBe(false);
    expect(assembled.poolCount).toBe(19);
    expect(assembled.type).toBeUndefined();
  });

  it('survives a buffered single-blob decode (proxy buffering fallback)', () => {
    const baseEv = cs.baseEvent({ venues: [{ placeId: 'A', name: 'X' }] });
    const patch = cs.patchEvent('A', { recentReview: 'hi' });
    const doneEv = cs.doneEvent({ exhausted: true });
    const blob = cs.encodeEvent(baseEv) + cs.encodeEvent(patch) + cs.encodeEvent(doneEv);
    const dec = cs.createNdjsonDecoder();
    const evs = dec.push(blob).concat(dec.flush());
    const b = evs.find((e) => e.type === 'base');
    const d = evs.find((e) => e.type === 'done');
    const ps = evs.filter((e) => e.type === 'patch');
    expect(cs.assembleFinal(b, ps, d)).toEqual({ exhausted: true, venues: [{ placeId: 'A', name: 'X', recentReview: 'hi' }] });
  });

  it('decoder handles a line split across chunk boundaries', () => {
    const line = cs.encodeEvent(cs.patchEvent('A', { x: 1 }));
    const dec = cs.createNdjsonDecoder();
    const mid = Math.floor(line.length / 2);
    expect(dec.push(line.slice(0, mid))).toEqual([]);       // partial — nothing yet
    const out = dec.push(line.slice(mid));
    expect(out).toEqual([{ type: 'patch', placeId: 'A', fields: { x: 1 } }]);
  });
});
