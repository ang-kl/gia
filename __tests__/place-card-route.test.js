// place-card-route.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Parts A and B,
// invariants I1, I4, I8 and I10.
//
// GET /api/place-card answers a tap on a Google icon that was neither a bus stop nor one of the reader's results. In
// order, and stopping at the first that answers:
//   1. the 24-hour store for that place and language   - no Google call, nothing counted;
//   2. a remembered link to one of our own records     - no Google call, nothing counted;
//   3. one Google lookup, if both limits allow it      - 20 thousandths of a US dollar, reserved before the call.
// The service is called here with a stand-in for Google, so every "no Google call" below is counted, not assumed.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { maskComments } from './helpers/mask-comments.js';

const require = createRequire(import.meta.url);
const pc = require('../place-card.js');

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
const sgt = (iso) => Date.parse(iso + '+08:00');
const clock = (start) => { let t = start; const now = () => t; now.set = (v) => { t = v; }; return now; };
const DAILY = Array.from({ length: 7 }, (_, d) => ({ open: { day: d, hour: 11, minute: 0 }, close: { day: d, hour: 21, minute: 0 } }));
const SG = [{ longText: 'Singapore', shortText: 'SG', types: ['country', 'political'] }];

// Fixtures in the shape of Google's Place Details (New). The values are made up for the test.
const MALL_ID = 'ChIJfixtureMall0000000001';
const MALL = {
  id: MALL_ID, displayName: { text: 'Fixture Plaza' }, formattedAddress: '1 Fixture Road, Singapore 000001', addressComponents: SG,
  location: { latitude: 1.3044, longitude: 103.8339 }, types: ['shopping_mall', 'point_of_interest', 'establishment'],
  primaryType: 'shopping_mall', primaryTypeDisplayName: { text: 'Shopping mall' }, businessStatus: 'OPERATIONAL',
  googleMapsUri: 'https://maps.google.com/?cid=1', rating: 4.1, userRatingCount: 12000, utcOffsetMinutes: 480,
  currentOpeningHours: { openNow: true, periods: DAILY }, regularOpeningHours: { periods: DAILY },
};
const EATERY_ID = 'ChIJfixtureEatery00000002';
const EATERY = {
  id: EATERY_ID, displayName: { text: 'Fixture Kitchen' }, formattedAddress: '2 Fixture Road, Singapore 000002', addressComponents: SG,
  location: { latitude: 1.3050, longitude: 103.8340 }, types: ['restaurant', 'food', 'point_of_interest'],
  primaryType: 'restaurant', primaryTypeDisplayName: { text: 'Restaurant' }, businessStatus: 'OPERATIONAL',
  googleMapsUri: 'https://maps.google.com/?cid=2', rating: 4.4, userRatingCount: 310, priceLevel: 'PRICE_LEVEL_MODERATE', utcOffsetMinutes: 480,
};

function make({ data = { [MALL_ID]: MALL, [EATERY_ID]: EATERY }, start = sgt('2026-11-23T13:00:00'), apiKey = 'test-key', own = pc.loadOwn(), fail = null } = {}) {
  const calls = [];
  const cost = [];
  const store = fakeStore();
  const now = clock(start);
  const request = async (req) => {
    calls.push(req);
    if (fail) throw fail;
    const id = req.url.split('/').pop();
    if (!data[id]) { const e = new Error('404'); e.status = 404; throw e; }
    return data[id];
  };
  const svc = pc.createPlaceCard({ request, store, now, own, apiKey, onCall: (ep) => cost.push(ep) });
  return { svc, calls, cost, store, now };
}
const ask = (svc, placeId, lang = 'en', readerId = 'reader-a') => svc.lookup({ placeId, lang, readerId });

describe('one Google lookup, shaped for the card', () => {
  it('asks Google for that place, in the reader\'s language, with the pinned field list', async () => {
    const { svc, calls } = make();
    await ask(svc, MALL_ID, 'zh');
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(`https://places.googleapis.com/v1/places/${MALL_ID}`);
    expect(calls[0].headers['X-Goog-FieldMask']).toBe(pc.PLACE_CARD_FIELD_MASK);
    expect(calls[0].headers['X-Goog-Api-Key']).toBe('test-key');
    expect(calls[0].params).toEqual({ languageCode: 'zh-CN' });
  });

  it('returns what the card shows', async () => {
    const { svc } = make();
    const out = await ask(svc, MALL_ID);
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({
      ok: true, source: 'google', family: 'shopping',
      place: {
        placeId: MALL_ID, name: 'Fixture Plaza', typeLabel: 'Shopping mall', address: '1 Fixture Road, Singapore 000001',
        lat: 1.3044, lng: 103.8339, country: 'SG', rating: 4.1, ratingCount: 12000, priceLevel: null,
        openNow: true, closedGuess: false, mapsUri: 'https://maps.google.com/?cid=1',
      },
    });
    expect(out.body.place.openLabel).toMatch(/Open/);
  });

  it('turns Google\'s price word into a number from 0 to 4', async () => {
    const { svc } = make();
    expect((await ask(svc, EATERY_ID)).body.place.priceLevel).toBe(2);
  });

  it('sends back nothing it was not asked to show', async () => {
    const { svc } = make();
    const { place } = (await ask(svc, MALL_ID)).body;
    expect(Object.keys(place).sort()).toEqual(['address', 'closedGuess', 'country', 'lat', 'lng', 'mapsUri', 'name', 'openLabel', 'openNow', 'placeId', 'priceLevel', 'rating', 'ratingCount', 'typeLabel'].sort());
  });

  it('records the call for /cost', async () => {
    const { svc, cost } = make();
    await ask(svc, MALL_ID);
    expect(cost).toEqual(['placeCard']);
  });

  it('costs the reader 20', async () => {
    const { svc } = make();
    await ask(svc, MALL_ID);
    expect(await svc.budget.spent('reader-a')).toBe(20);
    expect(await svc.budget.monthSpent()).toBe(20);
  });
});

describe('the free answers stay free (I4)', () => {
  it('a second tap on the same place in the same language makes no Google call and costs nothing', async () => {
    const { svc, calls } = make();
    const first = await ask(svc, MALL_ID);
    const second = await ask(svc, MALL_ID);
    expect(calls.length).toBe(1);
    expect(second.body).toEqual(first.body);
    expect(await svc.budget.spent('reader-a')).toBe(20);
  });

  it('another reader gets the stored answer free too', async () => {
    const { svc, calls } = make();
    await ask(svc, MALL_ID, 'en', 'reader-a');
    const out = await ask(svc, MALL_ID, 'en', 'reader-b');
    expect(out.body.ok).toBe(true);
    expect(calls.length).toBe(1);
    expect(await svc.budget.spent('reader-b')).toBe(0);
  });

  it('two taps at the same instant share one Google call', async () => {
    const { svc, calls } = make();
    const [a, b] = await Promise.all([ask(svc, MALL_ID), ask(svc, MALL_ID)]);
    expect(calls.length).toBe(1);
    expect(a.body.ok && b.body.ok).toBe(true);
    expect(await svc.budget.spent('reader-a')).toBe(20);
  });

  it('the store is per language: a different language is a new lookup', async () => {
    const { svc, calls } = make();
    await ask(svc, MALL_ID, 'en');
    await ask(svc, MALL_ID, 'ja');
    expect(calls.length).toBe(2);
    expect(calls[1].params).toEqual({ languageCode: 'ja' });
  });

  it('the open line is worked out at reading time, from the stored hours, without a new call', async () => {
    const { svc, calls, now } = make();
    expect((await ask(svc, MALL_ID)).body.place.openNow).toBe(true);    // 13:00
    now.set(sgt('2026-11-23T22:30:00'));
    const late = await ask(svc, MALL_ID);
    expect(late.body.place.openNow).toBe(false);
    expect(late.body.place.openLabel).toMatch(/Closed/);
    expect(calls.length).toBe(1);
  });

  it('an eatery with no hours gets the guess late at night and not in the afternoon, from the same stored answer', async () => {
    const { svc, calls, now } = make();
    const noon = await ask(svc, EATERY_ID);
    expect(noon.body.family).toBe('eatery');
    expect(noon.body.place).toMatchObject({ openNow: null, openLabel: '', closedGuess: false });
    now.set(sgt('2026-11-23T22:05:00'));
    expect((await ask(svc, EATERY_ID)).body.place).toMatchObject({ openNow: null, openLabel: '', closedGuess: true });
    expect(calls.length).toBe(1);
  });
});

describe('our own record answers when the place links to it (I3, I4)', () => {
  const own = pc.loadOwn();
  const hosp = own.hospital.find((h) => h.name === 'Mount Elizabeth Hospital');
  const HOSP_ID = 'ChIJfixtureHospital000003';
  const asGoogle = { id: HOSP_ID, displayName: { text: 'Mount Elizabeth Hospital' }, formattedAddress: 'x', addressComponents: SG, location: { latitude: hosp.lat, longitude: hosp.lng }, types: ['hospital', 'health', 'point_of_interest'], primaryType: 'hospital', primaryTypeDisplayName: { text: 'Hospital' }, googleMapsUri: 'https://maps.google.com/?cid=3', utcOffsetMinutes: 480 };

  it('the first tap is one lookup, and the answer is our record', async () => {
    const { svc, calls } = make({ data: { [HOSP_ID]: asGoogle }, own });
    const out = await ask(svc, HOSP_ID);
    expect(calls.length).toBe(1);
    expect(out.body).toMatchObject({ ok: true, source: 'own', kind: 'hospital', family: 'health', place: { placeId: HOSP_ID, name: 'Mount Elizabeth Hospital', lat: hosp.lat, lng: hosp.lng } });
    expect(out.body.own).toEqual(hosp);
  });

  it('the link is remembered with no expiry, as the place ID with the kind and name of our record', async () => {
    const { svc, store } = make({ data: { [HOSP_ID]: asGoogle }, own });
    await ask(svc, HOSP_ID);
    expect(JSON.parse(store.m.get(`placecard:link:${HOSP_ID}`))).toEqual({ kind: 'hospital', name: 'Mount Elizabeth Hospital' });
  });

  it('a later tap in ANOTHER language is answered from the link: no Google call, nothing counted', async () => {
    const { svc, calls } = make({ data: { [HOSP_ID]: asGoogle }, own });
    await ask(svc, HOSP_ID, 'en', 'reader-a');
    const out = await ask(svc, HOSP_ID, 'ko', 'reader-b');
    expect(out.body).toMatchObject({ ok: true, source: 'own', kind: 'hospital' });
    expect(calls.length).toBe(1);
    expect(await svc.budget.spent('reader-b')).toBe(0);
  });

  it('a link to a record we no longer hold is dropped, and Google is asked again', async () => {
    const { svc, calls, store } = make({ data: { [HOSP_ID]: asGoogle }, own });
    await store.set(`placecard:link:${HOSP_ID}`, JSON.stringify({ kind: 'hospital', name: 'A Hospital That Closed' }));
    const out = await ask(svc, HOSP_ID);
    expect(calls.length).toBe(1);
    expect(out.body.ok).toBe(true);
    expect(JSON.parse(store.m.get(`placecard:link:${HOSP_ID}`))).toEqual({ kind: 'hospital', name: 'Mount Elizabeth Hospital' });
  });

  it('a linked station answers with its code, so the map can open our station view', async () => {
    const st = own.station.find((s) => s.name === 'Jurong East');
    const ST_ID = 'ChIJfixtureStation0000004';
    const g = { id: ST_ID, displayName: { text: 'Jurong East MRT Station' }, addressComponents: SG, location: { latitude: st.lat, longitude: st.lng }, types: ['subway_station', 'transit_station'], primaryType: 'subway_station', utcOffsetMinutes: 480 };
    const { svc } = make({ data: { [ST_ID]: g }, own });
    const out = await ask(svc, ST_ID);
    expect(out.body).toMatchObject({ ok: true, source: 'own', kind: 'station', family: 'transit', own: { name: 'Jurong East', code: st.code } });
  });
});

describe('refusals are plain, and a refused or failed call costs nothing (I1, I10)', () => {
  it('the 51st place of a reader\'s day is refused before Google is asked', async () => {
    const data = {};
    for (let i = 0; i < 51; i++) { const id = `ChIJfixtureMany${String(i).padStart(9, '0')}`; data[id] = { ...MALL, id }; }
    const { svc, calls } = make({ data });
    const ids = Object.keys(data);
    for (let i = 0; i < 50; i++) expect((await ask(svc, ids[i])).body.ok, `lookup ${i + 1}`).toBe(true);
    const out = await ask(svc, ids[50]);
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: false, reason: 'cap' });
    expect(calls.length).toBe(50);
  });

  it('once the month is spent, a new reader is refused with the monthly reason', async () => {
    const { svc, calls } = make();
    for (let r = 0; r < 20; r++) for (let i = 0; i < 50; i++) await svc.budget.reserve(`other-${r}`, pc.CARD_MILLS);
    const out = await ask(svc, MALL_ID);
    expect(out.body).toEqual({ ok: false, reason: 'budget' });
    expect(calls.length).toBe(0);
  });

  it('a reader at their limit still gets a stored answer', async () => {
    const { svc } = make();
    await ask(svc, MALL_ID);
    for (let i = 0; i < 49; i++) await svc.budget.reserve('reader-a', pc.CARD_MILLS);
    expect((await ask(svc, EATERY_ID)).body).toEqual({ ok: false, reason: 'cap' });
    expect((await ask(svc, MALL_ID)).body.ok).toBe(true);
  });

  it('when Google fails, the answer says so and the amount is given back', async () => {
    const { svc, calls, cost } = make({ fail: new Error('socket hang up') });
    const out = await ask(svc, MALL_ID);
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: false, reason: 'unavailable' });
    expect(calls.length).toBe(1);
    expect(cost).toEqual([]);
    expect(await svc.budget.spent('reader-a')).toBe(0);
    expect(await svc.budget.monthSpent()).toBe(0);
  });

  it('a failure is not stored: the next tap asks again', async () => {
    const failing = make({ fail: new Error('boom') });
    await ask(failing.svc, MALL_ID);
    await ask(failing.svc, MALL_ID);
    expect(failing.calls.length).toBe(2);
  });

  it('with no Google key nothing is asked and nothing is counted', async () => {
    const { svc, calls } = make({ apiKey: '' });
    expect((await ask(svc, MALL_ID)).body).toEqual({ ok: false, reason: 'unavailable' });
    expect(calls.length).toBe(0);
    expect(await svc.budget.spent('reader-a')).toBe(0);
  });

  it('a place Google no longer lists, or one without a position, is "unavailable"', async () => {
    const { svc } = make({ data: { ChIJfixtureNoPosition00005: { id: 'ChIJfixtureNoPosition00005', displayName: { text: 'Nowhere' } } } });
    expect((await ask(svc, 'ChIJfixtureNoPosition00005')).body).toEqual({ ok: false, reason: 'unavailable' });
    expect((await ask(svc, 'ChIJfixtureUnknown0000006')).body).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a malformed place ID is refused with 400 and never reaches Google', async () => {
    const { svc, calls } = make();
    for (const bad of ['', '../places:searchText', 'ChIJ with spaces in it 00']) {
      const out = await ask(svc, bad);
      expect(out.status).toBe(400);
      expect(out.body).toEqual({ ok: false, reason: 'bad-request' });
    }
    expect(calls.length).toBe(0);
  });

  it('no reader is refused with 401 and never reaches Google', async () => {
    const { svc, calls } = make();
    for (const readerId of [undefined, null, '']) {
      const out = await svc.lookup({ placeId: MALL_ID, lang: 'en', readerId });
      expect(out.status).toBe(401);
      expect(out.body).toEqual({ ok: false, reason: 'no-session' });
    }
    expect(calls.length).toBe(0);
  });

  it('an unknown language is served in English', async () => {
    const { svc, calls } = make();
    await ask(svc, MALL_ID, 'xx');
    expect(calls[0].params).toEqual({ languageCode: 'en' });
  });
});

describe('the route in index.js (I8)', () => {
  const src = maskComments(fs.readFileSync(path.join(process.cwd(), 'index.js'), 'utf8'));
  const at = src.indexOf("app.get('/api/place-card'");
  const body = at > 0 ? src.slice(at, at + 900) : '';

  it('is mounted behind the same Telegram session check the flight routes use', () => {
    expect(at, 'the route is mounted').toBeGreaterThan(0);
    expect(body).toMatch(/^app\.get\('\/api\/place-card', requireInitDataFromBodyOrHeader, async \(req, res\) => \{/);
  });

  it('takes the reader from the verified session, never from the query', () => {
    expect(body).toMatch(/readerId: req\.tg\?\.user\?\.id/);
    expect(body).not.toMatch(/req\.query\.(user|reader|uid|chat)/i);
  });

  it('answers a thrown error as "unavailable" instead of hanging', () => {
    expect(body).toMatch(/catch \(err\) \{[\s\S]{0,200}?res\.json\(\{ ok: false, reason: 'unavailable' \}\);/);
  });

  it('place-card.js never logs who asked', () => {
    const mod = maskComments(fs.readFileSync(path.join(process.cwd(), 'place-card.js'), 'utf8'));
    expect(mod).not.toMatch(/console\.[a-z]+\([^;]*readerId/);
  });
});
