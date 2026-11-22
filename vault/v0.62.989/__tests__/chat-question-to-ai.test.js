// __tests__/chat-question-to-ai.test.js — v0.62.941.
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md, invariant I3.
//
// Operator, 25-10 '26: "a sentence its question guard declines is passed to the same
// AI reading instead of the 🍛 reply." The orchestration lives in nl-anchor.js as
// answerQuestionWithTellGia(), with every side effect injected, so this file can run
// the whole decision on the operator's own sentence without Redis, Gemini or Places.
// index.js only wires the real dependencies in; the second half of this file checks
// that wiring and that nothing else in the chat free-text flow moved.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const nl = require('../nl-anchor.js');
const fc = require('../freetext-classify.js');

const SENTENCE = 'What are the new eateries at Raffles City';
const RAFFLES_CITY = { name: 'Raffles City', lat: 1.2937, lng: 103.8531 };
const USER = { lat: 1.2847, lng: 103.8303, region: 'SG' };
const READING = {
  cuisines: [],
  filters: { newlyOpened: true, openNow: false, halal: false, vegetarian: false, homeBased: false, prices: [] },
  location_override: 'Raffles City',
};
const NEAR_NEW = { placeId: 'n1', name: 'New place near', lat: 1.2945, lng: 103.8540, rating: 4.4 };
const NEAR_OLD = { placeId: 'n2', name: 'Old place near', lat: 1.2930, lng: 103.8520, rating: 4.7 };
const SENTOSA = { placeId: 'f1', name: 'Sol & Ora', lat: 1.2494, lng: 103.8303, rating: 4.5 };

function deps(over = {}) {
  const calls = { discover: [], deliver: [], newness: 0, floor: [], askLocation: 0, infer: 0, quota: 0 };
  const d = {
    consumeQuota: async () => { calls.quota += 1; return true; },
    infer: async () => { calls.infer += 1; return READING; },
    cuisineNames: (slugs) => slugs.map((s) => s[0].toUpperCase() + s.slice(1)),
    getUserLocation: async () => USER,
    geocode: async (q) => (q === 'Raffles City' ? RAFFLES_CITY : null),
    discover: async (args) => { calls.discover.push(args); return [SENTOSA, NEAR_OLD, NEAR_NEW]; },
    passesVenueFilter: () => true,
    applyNewness: async (venues) => { calls.newness += 1; return { venues: venues.filter((v) => v.placeId !== 'n2'), noProvenNew: false }; },
    applyRatingFloor: async (venues, opts) => { calls.floor.push(opts); return venues; },
    regionCodeFor: () => 'SG',
    askLocation: async () => { calls.askLocation += 1; },
    deliver: async (out) => { calls.deliver.push(out); },
    ...over,
  };
  return { d, calls };
}

describe('precondition: the guard still declines this sentence (the guard itself is unchanged)', () => {
  it('looksLikeQuestion is true for the operator\'s sentence', () => {
    expect(fc.looksLikeQuestion(SENTENCE)).toBe(true);
  });
});

describe('answerQuestionWithTellGia — the operator\'s sentence', () => {
  it('reads it with the AI, searches 1.5 km around Raffles City, applies the New rule, delivers', async () => {
    const { d, calls } = deps();
    const r = await nl.answerQuestionWithTellGia({ text: SENTENCE, deps: d });
    expect(r.kind).toBe('delivered');
    expect(calls.infer).toBe(1);
    expect(calls.discover).toHaveLength(1);
    expect(calls.discover[0]).toMatchObject({ lat: RAFFLES_CITY.lat, lng: RAFFLES_CITY.lng, radius: 1500 });
    expect(calls.discover[0].cuisines).toEqual(['newly opened']);
    expect(calls.newness).toBe(1);
    expect(calls.floor).toEqual([{ newlyOpened: true }]);
    const out = calls.deliver[0];
    expect(out.placeAnchor).toMatchObject({ name: 'Raffles City' });
    // Sentosa is outside the circle, the established venue was refuted by the New rule.
    expect(out.venues.map((v) => v.placeId)).toEqual(['n1']);
  });

  it('no "new" in the reading: the New rule does not run and the floor is the normal one', async () => {
    const { d, calls } = deps({ infer: async () => ({ ...READING, filters: { ...READING.filters, newlyOpened: false }, cuisines: ['thai'] }) });
    await nl.answerQuestionWithTellGia({ text: 'which thai places are at Raffles City', deps: d });
    expect(calls.newness).toBe(0);
    expect(calls.floor).toEqual([{ newlyOpened: false }]);
  });
});

describe('answerQuestionWithTellGia — falls back to the 🍛 reply', () => {
  it('over the shared hourly cap: no AI call at all', async () => {
    const { d, calls } = deps({ consumeQuota: async () => false });
    const r = await nl.answerQuestionWithTellGia({ text: SENTENCE, deps: d });
    expect(r).toEqual({ kind: 'declined', reason: 'quota' });
    expect(calls.infer).toBe(0);
    expect(calls.discover).toHaveLength(0);
  });
  it('the AI finds nothing to search for (a non-food question)', async () => {
    const { d, calls } = deps({ infer: async () => ({ cuisines: [], filters: { newlyOpened: false, prices: [] }, location_override: '' }) });
    const r = await nl.answerQuestionWithTellGia({ text: 'what is the weather in Tokyo', deps: d });
    expect(r).toEqual({ kind: 'declined', reason: 'not-food' });
    expect(calls.discover).toHaveLength(0);
  });
});

describe('answerQuestionWithTellGia — location', () => {
  it('no saved location but the AI named a Singapore place: searches there', async () => {
    const { d, calls } = deps({ getUserLocation: async () => null });
    const r = await nl.answerQuestionWithTellGia({ text: SENTENCE, deps: d });
    expect(r.kind).toBe('delivered');
    expect(calls.discover[0]).toMatchObject({ lat: RAFFLES_CITY.lat, radius: 1500 });
  });
  it('no saved location and no place: asks for a location instead of guessing', async () => {
    const { d, calls } = deps({ getUserLocation: async () => null, infer: async () => ({ ...READING, location_override: '' }) });
    const r = await nl.answerQuestionWithTellGia({ text: 'what are the new eateries nearby', deps: d });
    expect(r).toEqual({ kind: 'askedLocation' });
    expect(calls.askLocation).toBe(1);
    expect(calls.discover).toHaveLength(0);
  });
  it('a place that cannot be geocoded: searches around the saved location with the old radius', async () => {
    const { d, calls } = deps({ geocode: async () => null });
    await nl.answerQuestionWithTellGia({ text: SENTENCE, deps: d });
    expect(calls.discover[0]).toMatchObject({ lat: USER.lat, lng: USER.lng, radius: 50000 });
    expect(calls.deliver[0].placeAnchor).toBeNull();
  });
});

// ── index.js wiring ──────────────────────────────────────────────────────────
// index.js exports nothing, so the wiring is read from source. The chat handler is
// sliced from the transport branch to the end of the question guard.
const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
function questionGuardBlock() {
  const start = src.indexOf("const { looksLikeQuestion } = require('./freetext-classify');\n      if (looksLikeQuestion(text))");
  expect(start, 'chat question guard not found').toBeGreaterThan(-1);
  const end = src.indexOf('committedToFreeText = true;', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('index.js — the chat question guard hands off before the 🍛 reply', () => {
  it('tries the AI first, and sends 🍛 only when that did not deliver', () => {
    const block = questionGuardBlock();
    const ai = block.indexOf('answerChatQuestionWithAi(');
    const declined = block.indexOf("'freetext.questionDeclined'");
    expect(ai).toBeGreaterThan(-1);
    expect(declined).toBeGreaterThan(ai);
    expect(block).toMatch(/if \(!handled\)/);
  });
  it('the wiring passes the real AI reader, quota, newness rule and delivery', () => {
    const at = src.indexOf('async function answerChatQuestionWithAi(');
    expect(at).toBeGreaterThan(-1);
    const fn = src.slice(at, src.indexOf('\n}\n', at));
    for (const needle of ['answerQuestionWithTellGia(', 'consumeTellGiaQuota(', 'inferTellGia(', 'applyNewnessRule(', 'deliverPicks(', 'geocodeQuery(', "'place.foundN'"]) {
      expect(fn, `missing ${needle}`).toContain(needle);
    }
  });
  it('the other chat declines are untouched: noise, transport, and the ambiguous gate still send their own replies', () => {
    expect(src).toMatch(/if \(FREE_TEXT_NOISE\.has\(lowNoise\)\)[\s\S]{0,400}'freetext\.questionDeclined'/);
    expect(src).toMatch(/looksLikeTransport\(text\)[\s\S]{0,600}'freetext\.transportRedirect'/);
    expect(src).toMatch(/cls\.intent === 'ambiguous'[\s\S]{0,400}'freetext\.questionDeclined'/);
  });
});
