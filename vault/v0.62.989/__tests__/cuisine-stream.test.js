// __tests__/cuisine-stream.test.js — v0.62.x
//
// The progressive-result NDJSON protocol: encode/decode round-trip, chunked
// decoding across line boundaries (the real network case), the buffered-into-
// one-chunk fallback (Telegram WebView / proxy), and the per-placeId merge the
// client applies to fill cards in place.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  encodeEvent, baseEvent, patchEvent, doneEvent,
  parseNdjson, createNdjsonDecoder, mergePatch,
} = require('../cuisine-stream.js');

describe('encode + builders', () => {
  it('encodeEvent emits one JSON line terminated by \\n', () => {
    const line = encodeEvent(patchEvent('A', { vibe: 'cosy' }));
    expect(line.endsWith('\n')).toBe(true);
    expect(JSON.parse(line)).toEqual({ type: 'patch', placeId: 'A', fields: { vibe: 'cosy' } });
  });
  it('event builders carry the right type + payload', () => {
    expect(baseEvent({ venues: [], firstBatch: true }).type).toBe('base');
    expect(doneEvent({ poolCount: 12 })).toEqual({ type: 'done', poolCount: 12 });
  });
});

describe('parseNdjson', () => {
  it('parses complete lines and returns no rest', () => {
    const blob = encodeEvent({ type: 'base' }) + encodeEvent(patchEvent('X', { a: 1 }));
    const { events, rest } = parseNdjson(blob);
    expect(events.map((e) => e.type)).toEqual(['base', 'patch']);
    expect(rest).toBe('');
  });
  it('returns a trailing newline-less line as rest (split mid-line)', () => {
    const { events, rest } = parseNdjson('{"type":"base"}\n{"type":"pat');
    expect(events).toEqual([{ type: 'base' }]);
    expect(rest).toBe('{"type":"pat');
  });
  it('skips blank and malformed lines', () => {
    const { events } = parseNdjson('\n{"type":"done"}\nnot-json\n');
    expect(events).toEqual([{ type: 'done' }]);
  });
});

describe('createNdjsonDecoder — chunked across boundaries', () => {
  it('reassembles events split across chunks', () => {
    const d = createNdjsonDecoder();
    expect(d.push('{"type":"base","fi')).toEqual([]);              // partial
    const ev = d.push('rstBatch":true}\n{"type":"patch","placeId":"A","fields":{}}\n');
    expect(ev.map((e) => e.type)).toEqual(['base', 'patch']);
    expect(d.push('{"type":"done"}')).toEqual([]);                 // no newline yet
    expect(d.flush()).toEqual([{ type: 'done' }]);                 // drained
  });
  it('buffered-into-one-chunk (WebView/proxy) decodes to the same events', () => {
    const whole = [baseEvent({ firstBatch: true }), patchEvent('A', { x: 1 }), doneEvent()]
      .map(encodeEvent).join('');
    const d = createNdjsonDecoder();
    const ev = d.push(whole);
    expect(ev.map((e) => e.type)).toEqual(['base', 'patch', 'done']);
  });
});

describe('mergePatch — fill a card in place by placeId', () => {
  const venues = [{ placeId: 'A', name: 'Aoi' }, { placeId: 'B', name: 'Bex' }];
  it('merges fields onto the matching venue, new object only for that one', () => {
    const next = mergePatch(venues, 'B', { transitMinutes: 8, vibe: 'lively' });
    expect(next[1]).toEqual({ placeId: 'B', name: 'Bex', transitMinutes: 8, vibe: 'lively' });
    expect(next[0]).toBe(venues[0]);        // untouched venue keeps identity
    expect(next).not.toBe(venues);          // new array
  });
  it('is a no-op (same array) when the placeId is absent', () => {
    expect(mergePatch(venues, 'Z', { x: 1 })).toBe(venues);
  });
  it('guards bad input', () => {
    expect(mergePatch(null, 'A', { x: 1 })).toBe(null);
    expect(mergePatch(venues, '', { x: 1 })).toBe(venues);
    expect(mergePatch(venues, 'A', null)).toBe(venues);
  });
});
