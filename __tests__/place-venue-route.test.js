// place-venue-route.test.js - v0.62.993. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Amendment 1
// (Part F), invariants I1, I13, I14 and I15.
//
// POST /api/place-card/full turns one tapped eatery or bar into a Soleat result card. What must hold:
//   - one Google call (Place Details with the search's own field list), counted as 26: 25 for Google at list price
//     and 1 flat for the review translation. Reserved before the call, given back if the call fails;
//   - at most one translation call, and NO other paid call: the search's slow step (Routes, crowd, footfall, AI
//     dishes, the AI read, name lines) is never run for this card;
//   - a stored answer (24 hours, per place and language) costs nothing and calls nothing;
//   - the reader's set location is used for the distance and then forgotten: not stored, not logged.
// Google and the translator are stood in for, so every "no call" below is counted, not assumed. The search's own
// local step (enrichFast), the price line and the three badge modules are the REAL ones, run with every outside
// call trapped.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { maskComments } from './helpers/mask-comments.js';

const require = createRequire(import.meta.url);
const pc = require('../place-card.js');
const pipeline = require('../pipeline.js');
const enrich = require('../cuisine-enrich.js');
const cf = require('../currency-format.js');
const axios = require('axios');
const { humaniseRestaurantType } = require('../venue-type-label.js');
const { reviewLanguagePrimary } = require('../cuisine-review-language.js');
const { PRICES } = require('../api-cost.js');
const fixture = require('./fixtures/place-to-venue/places.json');

const clone = (x) => JSON.parse(JSON.stringify(x));
const sgt = (iso) => Date.parse(iso + '+08:00');
const MONDAY_1PM = sgt('2026-11-23T13:00:00');   // a Monday: the izakaya fixture opens 11:00 to 22:00 on day 1
const [IZAKAYA, BARE, RAMEN, SHUT, NAMELESS, BAR] = fixture.places;
const MALL = {
  id: 'ChIJtest0000000000000000007', displayName: { text: 'Fixture Plaza' }, formattedAddress: '7 Example Road, Singapore 000007',
  location: { latitude: 1.3044, longitude: 103.8339 }, types: ['shopping_mall', 'point_of_interest'], primaryType: 'shopping_mall',
  primaryTypeDisplayName: { text: 'Shopping mall' }, businessStatus: 'OPERATIONAL', utcOffsetMinutes: 480,
  addressComponents: [{ longText: 'Singapore', shortText: 'SG', types: ['country'] }],
};
// Google sends only what the field list asks for. The search's list has no `types`, so the full answer has none.
const asFull = (p) => { const c = clone(p); delete c.types; return c; };
const ORIGIN = { lat: 1.30123, lng: 103.86789 };   // a made-up point, nobody's home

function fakeStore() {
  const m = new Map(); const ttl = new Map();
  return {
    m, ttl,
    get: async (k) => (m.has(k) ? m.get(k) : null),
    set: async (k, v) => { m.set(k, String(v)); },
    setEx: async (k, t, v) => { m.set(k, String(v)); ttl.set(k, t); },
    incrBy: async (k, n) => { const v = (Number(m.get(k)) || 0) + n; m.set(k, String(v)); return v; },
    expire: async () => {},
    del: async (k) => { m.delete(k); },
  };
}

// The outside world, trapped. Anything the build reaches for beyond its two stand-ins lands here.
const outside = [];
const real = { fetch: globalThis.fetch, get: axios.get, post: axios.post, request: axios.request };
beforeEach(() => {
  outside.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MONDAY_1PM);
  globalThis.fetch = async (u) => { outside.push(`fetch ${String(u).slice(0, 60)}`); throw new Error('no network in this test'); };
  for (const k of ['get', 'post', 'request']) axios[k] = async (u) => { outside.push(`axios.${k} ${String(u).slice(0, 60)}`); throw new Error('no network in this test'); };
});
afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = real.fetch; axios.get = real.get; axios.post = real.post; axios.request = real.request;
  vi.restoreAllMocks();
});

function make({ places = [IZAKAYA, BARE, RAMEN, SHUT, NAMELESS, BAR, MALL], translate = null, fail = null, budgetMs = 60, withFull = true, annotators } = {}) {
  const data = Object.fromEntries(places.map((p) => [p.id, p]));
  const calls = []; const cost = []; const tcalls = []; const badge = [];
  const store = fakeStore();
  const request = async (req) => {
    calls.push(req);
    if (fail) throw fail;
    const id = req.url.split('/').pop();
    if (!data[id]) { const e = new Error('404'); e.status = 404; throw e; }
    return req.headers['X-Goog-FieldMask'] === pc.PLACE_CARD_FIELD_MASK ? clone(data[id]) : asFull(data[id]);
  };
  const full = {
    fieldMask: pipeline.PLACE_DETAILS_FIELD_MASK,
    placeToVenue: pipeline.placeToVenue,
    enrichFast: enrich.enrichFast,
    humaniseRestaurantType,
    formatPriceRange: cf.formatPriceRangeForVenue,
    annotators: annotators || [
      (v) => { badge.push('michelin'); require('../SG-michelin').annotateVenueObject(v, 'Cuisine-Search'); },
      (v) => { badge.push('healthier'); require('../healthier-eateries').annotateVenueObject(v); },
      (v) => { badge.push('building'); require('../buildings').annotateVenueObject(v); },
    ],
    reviewLang: reviewLanguagePrimary,
    translateReview: async (a) => { tcalls.push(a); return typeof translate === 'function' ? translate(a) : translate; },
    translateBudgetMs: budgetMs,
  };
  const svc = pc.createPlaceCard({ request, store, own: pc.loadOwn(), apiKey: 'test-key', onCall: (ep) => cost.push(ep), ...(withFull ? { full } : {}) });
  return { svc, calls, cost, tcalls, badge, store };
}
const press = (svc, place, { lang = 'en', readerId = 'reader-a', origin } = {}) => svc.full({ placeId: place.id, lang, readerId, origin });
const numbered = (n) => Array.from({ length: n }, (_, i) => ({ ...clone(IZAKAYA), id: `ChIJmany${String(i).padStart(20, '0')}` }));

describe('the count: 26 for a paid full card (I1, F-3)', () => {
  it('is 25 for Google plus 1 flat for the translation, and FULL_MILLS is still Google\'s price', () => {
    expect(pc.FULL_MILLS).toBe(25);
    expect(pc.TRANSLATE_MILLS).toBe(1);
    expect(pc.FULL_CARD_MILLS).toBe(26);
    expect(Math.round(PRICES.maps.placeCardFull * 1000)).toBe(pc.FULL_MILLS);
  });

  it('adds 26 to the reader\'s day and to the month', async () => {
    const { svc } = make();
    const out = await press(svc, IZAKAYA);
    expect(out.status).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(await svc.budget.spent('reader-a')).toBe(26);
    expect(await svc.budget.monthSpent()).toBe(26);
  });

  it('lets 38 through in a reader\'s day and refuses the 39th without calling Google', async () => {
    const many = numbered(40);
    const { svc, calls } = make({ places: many });
    for (let i = 0; i < 38; i++) expect((await press(svc, many[i])).body.ok, `full card ${i + 1}`).toBe(true);
    expect(await svc.budget.spent('reader-a')).toBe(988);
    const over = await press(svc, many[38]);
    expect(over.body).toEqual({ ok: false, reason: 'cap' });
    expect(calls).toHaveLength(38);
    expect(await svc.budget.spent('reader-a')).toBe(988);
  });

  it('counts a card lookup and a full card together: 20 + 26', async () => {
    const { svc } = make();
    await svc.lookup({ placeId: IZAKAYA.id, lang: 'en', readerId: 'reader-a' });
    await press(svc, IZAKAYA);
    expect(await svc.budget.spent('reader-a')).toBe(46);
  });

  it('refuses at the monthly limit without calling Google', async () => {
    const { svc, calls, store } = make();
    store.m.set('placecard:month:2026-11', String(pc.MONTHLY_MILLS - 25));
    const out = await press(svc, IZAKAYA);
    expect(out.body).toEqual({ ok: false, reason: 'budget' });
    expect(calls).toHaveLength(0);
    expect(await svc.budget.spent('reader-a')).toBe(0);
  });

  it('gives the 26 back when the Google call fails', async () => {
    const { svc, calls } = make({ fail: new Error('ETIMEDOUT') });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await press(svc, IZAKAYA);
    expect(out.body).toEqual({ ok: false, reason: 'unavailable' });
    expect(calls).toHaveLength(1);
    expect(await svc.budget.spent('reader-a')).toBe(0);
    expect(await svc.budget.monthSpent()).toBe(0);
  });

  it('two presses at the same instant make one call and one count', async () => {
    const { svc, calls } = make();
    const [a, b] = await Promise.all([press(svc, IZAKAYA), press(svc, IZAKAYA)]);
    expect(a.body.ok && b.body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(await svc.budget.spent('reader-a')).toBe(26);
  });

  it('a second press within 24 hours calls nothing and counts nothing', async () => {
    const { svc, calls, tcalls, store } = make({ translate: 'やきとりとラーメンが絶品でした。' });
    await press(svc, IZAKAYA, { lang: 'ja' });
    expect(calls).toHaveLength(1);
    expect(tcalls).toHaveLength(1);
    vi.setSystemTime(MONDAY_1PM + 23 * 3600 * 1000);
    const again = await press(svc, IZAKAYA, { lang: 'ja' });
    expect(again.body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(tcalls).toHaveLength(1);
    // 23 hours on it is Tuesday in Singapore: the reader's day has started again at zero, and the second press
    // added nothing to it. The month still holds the one paid card.
    expect(await svc.budget.spent('reader-a')).toBe(0);
    expect(await svc.budget.monthSpent()).toBe(26);
    expect(store.ttl.get(`placecard:full:v1:${IZAKAYA.id}:ja`)).toBe(pc.STORE_TTL_S);
    expect(pc.STORE_TTL_S).toBe(24 * 3600);
  });

  it('keeps one stored answer per language', async () => {
    const { svc, calls } = make({ translate: 'x' });
    await press(svc, IZAKAYA, { lang: 'en' });
    await press(svc, IZAKAYA, { lang: 'fr' });
    await press(svc, IZAKAYA, { lang: 'en' });
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.params.languageCode)).toEqual(['en', 'fr']);
  });
});

describe('the call: one Place Details request with the search\'s field list (F-2, I14)', () => {
  it('asks Google for that place, in the reader\'s language, with the search\'s own fields', async () => {
    const { svc, calls, cost } = make();
    await press(svc, IZAKAYA, { lang: 'zh' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://places.googleapis.com/v1/places/${IZAKAYA.id}`);
    expect(calls[0].headers['X-Goog-FieldMask']).toBe(pipeline.PLACE_DETAILS_FIELD_MASK);
    expect(calls[0].headers['X-Goog-Api-Key']).toBe('test-key');
    expect(calls[0].params).toEqual({ languageCode: 'zh-CN' });
    expect(cost).toEqual(['placeCardFull']);
  });

  it('makes no other outside call: the real local step, price line and badge modules reach for nothing', async () => {
    const { svc, calls, tcalls, badge } = make({ translate: 'traduit' });
    for (const [place, lang] of [[IZAKAYA, 'fr'], [RAMEN, 'en'], [BAR, 'ko']]) {
      const out = await press(svc, place, { lang, origin: ORIGIN });
      expect(out.body.ok, place.displayName.text).toBe(true);
    }
    expect(outside).toEqual([]);
    expect(calls).toHaveLength(3);                       // one Google call per card
    expect(tcalls.length).toBeLessThanOrEqual(2);        // the bar has no review, so at most the other two
    expect(badge).toEqual(['michelin', 'healthier', 'building', 'michelin', 'healthier', 'building', 'michelin', 'healthier', 'building']);
  });

  it('is unavailable, with no call and no count, when the full card is not set up', async () => {
    const { svc, calls } = make({ withFull: false });
    const out = await press(svc, IZAKAYA);
    expect(out.body).toEqual({ ok: false, reason: 'unavailable' });
    expect(calls).toHaveLength(0);
    expect(await svc.budget.spent('reader-a')).toBe(0);
  });
});

describe('refusals (F-5)', () => {
  it('a malformed place ID and a missing session are refused before anything else', async () => {
    const { svc, calls } = make();
    expect(await svc.full({ placeId: 'x y', lang: 'en', readerId: 'reader-a' })).toEqual({ status: 400, body: { ok: false, reason: 'bad-request' } });
    expect(await svc.full({ placeId: IZAKAYA.id, lang: 'en', readerId: '' })).toEqual({ status: 401, body: { ok: false, reason: 'no-session' } });
    expect(await svc.full({ placeId: IZAKAYA.id, lang: 'en' })).toEqual({ status: 401, body: { ok: false, reason: 'no-session' } });
    expect(calls).toHaveLength(0);
  });

  it('a place the card store knows is neither eatery nor bar is refused with no paid call', async () => {
    const { svc, calls } = make();
    await svc.lookup({ placeId: MALL.id, lang: 'en', readerId: 'reader-a' });
    expect(calls).toHaveLength(1);
    const out = await press(svc, MALL);
    expect(out.body).toEqual({ ok: false, reason: 'not-eatery' });
    expect(calls).toHaveLength(1);
    expect(await svc.budget.spent('reader-a')).toBe(20);
  });

  it('with nothing in the card store, the lookup itself tells; it is counted, and a repeat is free', async () => {
    const { svc, calls } = make();
    const out = await press(svc, MALL);
    expect(out.body).toEqual({ ok: false, reason: 'not-eatery' });
    expect(calls).toHaveLength(1);
    expect(await svc.budget.spent('reader-a')).toBe(26);
    expect((await press(svc, MALL)).body).toEqual({ ok: false, reason: 'not-eatery' });
    expect(calls).toHaveLength(1);
    expect(await svc.budget.spent('reader-a')).toBe(26);
  });

  it('trusts the card store\'s verdict, which saw Google\'s full type list', async () => {
    // The card lookup has `types`; the full answer does not. A place whose main type says nothing but whose type
    // list says "restaurant" was offered the button, so the full card must not refuse it after it is paid for.
    const odd = { ...clone(IZAKAYA), id: 'ChIJtest0000000000000000008', primaryType: 'point_of_interest', types: ['point_of_interest', 'restaurant'] };
    const { svc } = make({ places: [odd] });
    const card = await svc.lookup({ placeId: odd.id, lang: 'en', readerId: 'reader-a' });
    expect(card.body.family).toBe('eatery');
    const out = await press(svc, odd);
    expect(out.body.ok).toBe(true);
    expect(out.body.venue.placeId).toBe(odd.id);
  });

  it('a bar gets a full card', async () => {
    const { svc } = make();
    const out = await press(svc, BAR);
    expect(out.body.ok).toBe(true);
    expect(out.body.venue).toMatchObject({ placeId: BAR.id, name: 'Lantern Rooftop Lounge', primaryType: 'bar' });
  });

  it('a place Google marks as not operating is refused after the lookup, and still counted', async () => {
    const { svc, calls } = make();
    const out = await press(svc, SHUT);
    expect(out.body).toEqual({ ok: false, reason: 'not-operating' });
    expect(calls).toHaveLength(1);
    expect(await svc.budget.spent('reader-a')).toBe(26);
    expect((await press(svc, SHUT)).body).toEqual({ ok: false, reason: 'not-operating' });
    expect(calls).toHaveLength(1);
  });

  it('an answer with no name or no position is unavailable; Google was paid, so it stays counted', async () => {
    const { svc } = make();
    expect((await press(svc, NAMELESS)).body).toEqual({ ok: false, reason: 'unavailable' });
    expect((await press(svc, BARE)).body).toEqual({ ok: false, reason: 'unavailable' });
    expect(await svc.budget.spent('reader-a')).toBe(52);
  });
});

describe('the venue: the search\'s mapping and local step, nothing slower (F-6, F-7)', () => {
  const MAPPED = ['placeId', 'name', 'area', 'lat', 'lng', 'rating', 'userRatingCount', 'priceLevel', 'weekdayDescriptions', 'websiteUri',
    'phone', 'primaryType', 'url', 'directionsUri', 'reviewsUri', 'photosUri', 'googleSummary', 'allowsDogs', 'wheelchairAccessible',
    'priceRange', 'country'];

  it('carries every mapped field exactly as the search maps it', async () => {
    const { svc } = make();
    const v = (await press(svc, IZAKAYA)).body.venue;
    const want = pipeline.placeToVenue(asFull(IZAKAYA));
    for (const k of MAPPED) expect(v[k], k).toEqual(want[k]);
  });

  it('leaves no working field on the card', async () => {
    const { svc } = make();
    const v = (await press(svc, IZAKAYA)).body.venue;
    for (const k of ['reviews', 'currentPeriods', 'regularPeriods', 'utcOffsetMinutes', 'primaryTypeDisplayName']) expect(k in v, k).toBe(false);
  });

  it('has the type label, the review snippet with its date, and the open line in nine languages', async () => {
    const { svc } = make();
    const v = (await press(svc, IZAKAYA)).body.venue;
    expect(v.restaurantType).toBe('Japanese');
    expect(v.recentReview).toBe('The yakitori and the ramen were excellent, and the staff were kind.');
    expect(v.recentReviewAgo).toBe('a month ago');
    expect(v.openNow).toBe(true);
    expect(v.openClosingLabel).toMatch(/^Open/);
    expect(Object.keys(v.openClosingByLang).sort()).toEqual(['de', 'en', 'es', 'fr', 'id', 'ja', 'ko', 'ru', 'zh']);
  });

  it('works out open or closed when the card is READ: stored at lunch, it does not still say open at night', async () => {
    const { svc, calls } = make();
    expect((await press(svc, IZAKAYA)).body.venue.openNow).toBe(true);
    vi.setSystemTime(sgt('2026-11-23T23:30:00'));
    const late = (await press(svc, IZAKAYA)).body.venue;
    expect(calls).toHaveLength(1);
    expect(late.openNow).toBe(false);
    expect(late.openClosingLabel).toBeUndefined();
    expect(typeof late.closedTodayLabel).toBe('string');
  });

  it('shows the price in the place\'s own currency only, and asks for no conversion', async () => {
    // The spy goes on BEFORE the service is made, because the service keeps the function it is handed.
    const spy = vi.spyOn(cf, 'formatPriceRangeForVenue');
    const { svc } = make();
    const sg = (await press(svc, IZAKAYA)).body.venue;
    const jp = (await press(svc, RAMEN)).body.venue;
    const seen = spy.mock.calls.map((c) => [c[1], c[2]]);
    expect(sg.priceRangeDisplay).toMatch(/^S\$20.30\.50$/);
    expect(jp.priceRangeDisplay).toBe('¥2,000');
    expect(sg.priceRangeDisplay).not.toMatch(/\(/);
    expect(jp.priceRangeDisplay).not.toMatch(/\(/);
    expect(outside).toEqual([]);
    expect(seen, 'the price line was really asked for, once per card').toEqual([['SG', 'SG'], ['JP', 'JP']]);
  });

  it('shows no hours line when Google has no hours at all, instead of the search\'s "Closed"', async () => {
    // Operator, 23-11 '26: "No hours line". The search's local step writes "Closed" for a place with no hours; on a
    // card added from the map that would state a guess as a fact, one tap after the small card said nothing.
    const { svc } = make();
    const v = (await press(svc, BAR)).body.venue;
    expect(v.openNow).toBe(null);
    for (const k of ['closedTodayLabel', 'closedTodayByLang', 'openClosingLabel', 'openClosingByLang']) expect(k in v, k).toBe(false);
    // and the search's own step does write it, which is why this card has to take it off
    const plain = pipeline.placeToVenue(asFull(BAR));
    await enrich.enrichFast([plain], { csLang: 'en', cuisineQueries: [], humaniseRestaurantType, enrichPriceRangeDisplay: async () => {} });
    expect(plain.closedTodayLabel).toBe('Closed');
  });

  it('keeps Google\'s own "closed now" for a place with no hours, while that verdict is fresh', async () => {
    const shutNow = { ...clone(BAR), id: 'ChIJtest0000000000000000011', currentOpeningHours: { openNow: false } };
    const { svc } = make({ places: [shutNow] });
    const fresh = (await press(svc, shutNow)).body.venue;
    expect(fresh.openNow).toBe(false);
    expect(fresh.closedTodayLabel).toBe('Closed');
    // read again from the store, the old verdict has nothing behind it and is not repeated
    const later = (await press(svc, shutNow)).body.venue;
    expect(later.openNow).toBe(null);
    expect('closedTodayLabel' in later).toBe(false);
  });

  it('adds distance and walking minutes by the search\'s formula when a location is sent', async () => {
    const hav = (a, b) => {
      const R = 6371000, r = (d) => d * Math.PI / 180;
      const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
      return Math.round(2 * R * Math.asin(Math.sqrt(x)));
    };
    const { svc } = make();
    const v = (await press(svc, IZAKAYA, { origin: ORIGIN })).body.venue;
    const want = hav(ORIGIN, { lat: 1.2871, lng: 103.8501 });
    expect(want).toBeGreaterThan(1000);
    expect(v.distanceM).toBe(want);
    expect(v.walkMinutes).toBe(Math.round(want / 80));
  });

  it('the search still uses that formula (a change there must be made here too)', () => {
    const src = maskComments(fs.readFileSync(path.join(process.cwd(), 'index.js'), 'utf8'));
    expect(src).toMatch(/const R = 6371000, toRad = \(d\) => d \* Math\.PI \/ 180;/);
    expect(src).toMatch(/distanceM: dist, walkMinutes: Math\.round\(dist \/ 80\)/);
  });

  it('adds no distance when no location, or a nonsense one, is sent', async () => {
    const { svc } = make();
    for (const origin of [undefined, null, {}, { lat: NaN, lng: 103.8 }, { lat: 91, lng: 103.8 }, { lat: 1.3, lng: 181 }, { lat: '1.3', lng: '103.8' }]) {
      const v = (await press(svc, IZAKAYA, { origin })).body.venue;
      expect('distanceM' in v, JSON.stringify(origin)).toBe(false);
      expect('walkMinutes' in v, JSON.stringify(origin)).toBe(false);
    }
  });

  it('gives each reader their own distance, from one stored answer and from one shared call', async () => {
    const { svc, calls } = make();
    const far = { lat: 1.35, lng: 103.95 };
    const [a, b] = await Promise.all([press(svc, IZAKAYA, { origin: ORIGIN }), press(svc, IZAKAYA, { readerId: 'reader-b', origin: far })]);
    expect(calls).toHaveLength(1);
    expect(a.body.venue.distanceM).not.toBe(b.body.venue.distanceM);
    const c = await press(svc, IZAKAYA, { readerId: 'reader-c' });
    expect('distanceM' in c.body.venue).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('a badge module that throws does not cost the reader the card', async () => {
    const { svc } = make({ annotators: [() => { throw new Error('bad data file'); }, (v) => { v.insideBuilding = 'Fixture Tower'; }] });
    const out = await press(svc, IZAKAYA);
    expect(out.body.ok).toBe(true);
    expect(out.body.venue.insideBuilding).toBe('Fixture Tower');
  });
});

describe('the review: in the reader\'s language, by at most one translation (F-6 step 6)', () => {
  const EN_REVIEW = 'The yakitori and the ramen were excellent, and the staff were kind.';

  it('is not translated when it is already in the reader\'s language', async () => {
    const { svc, tcalls } = make({ translate: 'should not be used' });
    const v = (await press(svc, IZAKAYA, { lang: 'en' })).body.venue;
    expect(tcalls).toHaveLength(0);
    expect(v.recentReview).toBe(EN_REVIEW);
    expect('recentReviewSourceLang' in v).toBe(false);
  });

  it('is translated once when the languages differ, and says which language it came from', async () => {
    const { svc, tcalls } = make({ translate: '  焼き鳥もラーメンも絶品で、スタッフも親切でした。  ' });
    const v = (await press(svc, IZAKAYA, { lang: 'ja' })).body.venue;
    expect(tcalls).toHaveLength(1);
    expect(tcalls[0]).toMatchObject({ text: EN_REVIEW, sourceLang: 'en', targetLang: 'ja', placeId: IZAKAYA.id });
    expect(v.recentReview).toBe('焼き鳥もラーメンも絶品で、スタッフも親切でした。');
    expect(v.recentReviewSourceLang).toBe('en');
    expect(v.recentReviewAgo).toBe('a month ago');
  });

  it('reads the language from Google\'s own tag on the review', async () => {
    const { svc, tcalls } = make({ translate: 'Rich soup and good noodles.' });
    const v = (await press(svc, RAMEN, { lang: 'en' })).body.venue;
    expect(tcalls).toHaveLength(1);
    expect(tcalls[0]).toMatchObject({ sourceLang: 'ja', targetLang: 'en' });
    expect(v.recentReview).toBe('Rich soup and good noodles.');
    expect(v.recentReviewSourceLang).toBe('ja');
    // and a Japanese reader needs no translation of a Japanese review
    const { svc: svc2, tcalls: t2 } = make({ translate: 'unused' });
    await press(svc2, RAMEN, { lang: 'ja' });
    expect(t2).toHaveLength(0);
  });

  it('reads the tag from the original text when Google sends no translated text', async () => {
    const only = { ...clone(IZAKAYA), id: 'ChIJtest0000000000000000009', reviews: [clone(IZAKAYA.reviews[1])] };
    const { svc, tcalls } = make({ places: [only], translate: 'The yakitori was very good.' });
    await press(svc, only, { lang: 'en' });
    expect(tcalls).toHaveLength(1);
    expect(tcalls[0].sourceLang).toBe('ja');
  });

  it('treats a review with no tag and no telling script as English, as the search does', async () => {
    const plain = { ...clone(IZAKAYA), id: 'ChIJtest0000000000000000010', reviews: [{ text: { text: 'Great laksa and friendly service every time.' }, rating: 5 }] };
    const a = make({ places: [plain], translate: 'unused' });
    await press(a.svc, plain, { lang: 'en' });
    expect(a.tcalls).toHaveLength(0);
    const b = make({ places: [plain], translate: 'Excellent laksa.' });
    await press(b.svc, plain, { lang: 'fr' });
    expect(b.tcalls[0]).toMatchObject({ sourceLang: 'en', targetLang: 'fr' });
  });

  it('cuts a translation to 200 characters', async () => {
    const { svc } = make({ translate: 'あ'.repeat(260) });
    const v = (await press(svc, IZAKAYA, { lang: 'ja' })).body.venue;
    expect([...v.recentReview]).toHaveLength(200);
  });

  it('keeps the original when the translation is late, and the stored answer keeps it too', async () => {
    const { svc, tcalls } = make({ translate: () => new Promise(() => {}), budgetMs: 30 });
    const v = (await press(svc, IZAKAYA, { lang: 'ja' })).body.venue;
    expect(v.recentReview).toBe(EN_REVIEW);
    expect('recentReviewSourceLang' in v).toBe(false);
    const again = (await press(svc, IZAKAYA, { lang: 'ja' })).body.venue;
    expect(again.recentReview).toBe(EN_REVIEW);
    expect(tcalls).toHaveLength(1);                    // no second try behind a stored answer
  });

  it('keeps the original when the translator throws, answers nothing, or answers the same text', async () => {
    for (const translate of [() => { throw new Error('gemini down'); }, '', '   ', EN_REVIEW, null, 42]) {
      const { svc } = make({ translate });
      const v = (await press(svc, IZAKAYA, { lang: 'ja' })).body.venue;
      expect(v.recentReview, String(translate)).toBe(EN_REVIEW);
      expect('recentReviewSourceLang' in v, String(translate)).toBe(false);
    }
  });

  it('serves the translated wording from the store without translating again', async () => {
    const { svc, tcalls } = make({ translate: '焼き鳥が絶品。' });
    await press(svc, IZAKAYA, { lang: 'ja' });
    const again = (await press(svc, IZAKAYA, { lang: 'ja', readerId: 'reader-b' })).body.venue;
    expect(again.recentReview).toBe('焼き鳥が絶品。');
    expect(again.recentReviewSourceLang).toBe('en');
    expect(tcalls).toHaveLength(1);
  });

  it('ties a kept translation to the review\'s own text, so an old one cannot be shown under a new review', async () => {
    const other = { ...clone(IZAKAYA), reviews: [{ text: { text: 'A different review about the grilled eel and the sake list.', languageCode: 'en' }, rating: 4 }] };
    const a = make({ translate: 'x' }); await press(a.svc, IZAKAYA, { lang: 'ja' });
    const b = make({ places: [other], translate: 'x' }); await press(b.svc, other, { lang: 'ja' });
    const c = make({ translate: 'x' }); await press(c.svc, IZAKAYA, { lang: 'ja' });
    expect(a.tcalls[0].reviewIdx).toMatch(/^c[0-9a-f]{10}$/);
    expect(b.tcalls[0].reviewIdx).not.toBe(a.tcalls[0].reviewIdx);
    expect(c.tcalls[0].reviewIdx).toBe(a.tcalls[0].reviewIdx);
  });

  it('with no snippet from the local step, shows the first review cut to 160 characters, with its date', async () => {
    // buildFullVenue is called directly with a local step that finds nothing, so the fallback itself is measured.
    const long = 'A very long review about the grilled fish. '.repeat(8).trim();
    expect(long.length).toBeGreaterThan(300);
    const place = { ...clone(IZAKAYA), reviews: [{ text: { text: `  ${long}  `, languageCode: 'en' }, rating: 5, relativePublishTimeDescription: '2 weeks ago' }] };
    const { venue, review } = await pc.buildFullVenue(asFull(place), { lang: 'en', nowMs: MONDAY_1PM, fresh: true }, {
      placeToVenue: pipeline.placeToVenue, enrichFast: async () => ({}), reviewLang: reviewLanguagePrimary,
    });
    expect([...venue.recentReview]).toHaveLength(160);
    expect(long.startsWith(venue.recentReview)).toBe(true);
    expect(venue.recentReviewAgo).toBe('2 weeks ago');
    expect(review).toEqual({ text: venue.recentReview, ago: '2 weeks ago', sourceLang: '' });
  });

  it('a place with no review has no review line and asks for no translation', async () => {
    const { svc, tcalls } = make({ translate: 'unused' });
    const v = (await press(svc, BAR, { lang: 'ja' })).body.venue;
    expect('recentReview' in v).toBe(false);
    expect(tcalls).toHaveLength(0);
  });
});

describe('the reader\'s location and identity stay out of the store and the log (I15, I8)', () => {
  it('nothing kept and nothing printed holds the set location or the reader', async () => {
    const printed = [];
    for (const k of ['log', 'info', 'warn', 'error', 'debug']) vi.spyOn(console, k).mockImplementation((...a) => { printed.push(a.map(String).join(' ')); });
    const { svc, store } = make({ translate: 'x' });
    await press(svc, IZAKAYA, { lang: 'ja', readerId: 'reader-secret-77', origin: ORIGIN });
    await press(svc, SHUT, { readerId: 'reader-secret-77', origin: ORIGIN });
    await press(svc, IZAKAYA, { lang: 'ja', readerId: 'reader-secret-77', origin: ORIGIN });
    const kept = JSON.stringify([...store.m]);
    const said = printed.join('\n');
    for (const secret of [String(ORIGIN.lat), String(ORIGIN.lng), 'reader-secret-77']) {
      expect(kept.includes(secret), `store holds ${secret}`).toBe(false);
      expect(said.includes(secret), `log holds ${secret}`).toBe(false);
    }
    expect(kept).toContain(`placecard:full:v1:${IZAKAYA.id}:ja`);
  });

  it('the stored answer holds no distance, so one reader\'s distance cannot reach another', async () => {
    const { svc, store } = make();
    await press(svc, IZAKAYA, { origin: ORIGIN });
    const raw = store.m.get(`placecard:full:v1:${IZAKAYA.id}:en`);
    expect(typeof raw).toBe('string');
    expect(raw).not.toMatch(/distanceM|walkMinutes/);
  });
});

describe('the route in index.js and what the module may reach (I8, I14, I15)', () => {
  const src = maskComments(fs.readFileSync(path.join(process.cwd(), 'index.js'), 'utf8'));
  const at = src.indexOf("app.post('/api/place-card/full'");
  const body = at > 0 ? src.slice(at, at + 1100) : '';

  it('is a POST behind the same Telegram session check', () => {
    expect(at, 'the route is mounted').toBeGreaterThan(0);
    expect(body).toMatch(/^app\.post\('\/api\/place-card\/full', requireInitDataFromBodyOrHeader, async \(req, res\) => \{/);
  });

  it('takes the reader from the verified session and the location from the body, never from the address', () => {
    const end = body.indexOf('\n    });');
    const route = end > 0 ? body.slice(0, end) : body;
    expect(route).toMatch(/readerId: req\.tg\?\.user\?\.id/);
    expect(route).toMatch(/req\.body/);
    expect(route).not.toMatch(/req\.query/);
    expect(route).not.toMatch(/req\.params/);
  });

  it('answers a thrown error as "unavailable" and does not print the request', () => {
    expect(body).toMatch(/catch \(err\) \{[\s\S]{0,200}?res\.json\(\{ ok: false, reason: 'unavailable' \}\);/);
    expect(body).not.toMatch(/console\.[a-z]+\([^;]*req\.body/);
  });

  it('the service is wired to the search\'s local step and to nothing slower', () => {
    const from = src.indexOf('function placeCardService');
    expect(from, 'placeCardService exists').toBeGreaterThan(0);
    const end = src.indexOf('\n}\n', from);
    expect(end, 'placeCardService ends').toBeGreaterThan(from);
    const wiring = src.slice(from, end);
    expect(wiring.length, 'the whole function, and only it').toBeGreaterThan(400);
    expect(wiring).toMatch(/translate-review/);
    expect(wiring).toMatch(/PLACE_DETAILS_FIELD_MASK/);
    expect(wiring).toMatch(/placeToVenue/);
    expect(wiring).toMatch(/enrichFast/);
    for (const slow of ['enrichSlow', 'travel-times', 'footfall', 'vibe-summary', 'enrichSanctuaryRead', 'local-name', 'pronounce-name', 'name-gloss']) {
      expect(wiring.includes(slow), slow).toBe(false);
    }
  });

  it('place-card.js itself requires no paid module and never logs who asked or from where', () => {
    const mod = maskComments(fs.readFileSync(path.join(process.cwd(), 'place-card.js'), 'utf8'));
    const required = [...mod.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]);
    for (const r of required) {
      expect(/travel-times|footfall|vibe-summary|gemini|translate-review|local-name|pronounce|pipeline|cuisine-enrich|axios/.test(r), r).toBe(false);
    }
    expect(mod).not.toMatch(/console\.[a-z]+\([^;]*(readerId|origin)/);
  });
});
