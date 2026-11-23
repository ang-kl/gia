// place-venue-client.test.js - v0.62.993. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Amendment 1
// (Part F: F-1, F-8, F-9, F-10), invariants I13 and I15.
//
// On the Cuisine map, the Google card of an eatery or a bar gains a main button, "Details, review & links". Pressing
// it asks our server for a full Soleat card (a POST, with the reader's set location in the BODY) and, when the card
// comes back, puts it at the front of the results with a "From the map" mark and selects it. What must hold:
//   - the button exists only for an eatery or a bar from Google, and only on Cuisine;
//   - the set location never appears in the address of the request;
//   - a refusal leaves a reason and a way out, and adds nothing;
//   - the card is added once, the other results keep their order, and the search's own count does not move.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  actionsRow, placeInner, refusalInner, loadingInner, createPlaceTap, insertVenue, searchCounts, searchTotal,
} from '../web/_shared/lib/place-card.js';
import { PLACE_CARD_LOCALES, PLACE_CARD_STRINGS, pct } from '../web/_shared/lib/place-card-i18n.js';
import { maskComments } from './helpers/mask-comments.js';

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
const ID = 'ChIJtest0000000000000000001';
const card = (family, over = {}) => ({
  ok: true, source: 'google', family,
  place: { placeId: ID, name: 'Sakura Table Izakaya', typeLabel: 'Japanese restaurant', address: '1 Example Quay', lat: 1.2871, lng: 103.8501, country: 'SG', rating: 4.4, ratingCount: 812, priceLevel: 2, openNow: true, openLabel: 'Open', closedGuess: false, mapsUri: 'https://maps.google.com/?cid=1' },
  ...over,
});
const EATERY = card('eatery');
const BAR = card('bar');
const VENUE = { placeId: ID, name: 'Sakura Table Izakaya', lat: 1.2871, lng: 103.8501, rating: 4.4, recentReview: 'Excellent yakitori.' };
const TAP = { placeId: ID, at: { lat: 1.2871, lng: 103.8501 } };
const ORIGIN = { lat: 1.30123, lng: 103.86789 };   // a made-up point, nobody's home
const FULL = 'data-place-action="full"';
const NEAR = 'data-place-action="near"';
const SET = 'data-place-action="set"';

describe('the button: only an eatery or a bar from Google, only on Cuisine (F-1)', () => {
  it('is the first button on an eatery card and on a bar card', () => {
    for (const body of [EATERY, BAR]) {
      const html = actionsRow(body, { lang: 'en', app: 'cuisine' });
      expect(html, body.family).toContain(FULL);
      expect(html).toContain('>Details, review &amp; links</button>');
      expect(html.indexOf(FULL)).toBeLessThan(html.indexOf(NEAR));
      expect(html.indexOf(NEAR)).toBeLessThan(html.indexOf(SET));
    }
  });

  it('is the one filled button: "Eateries near here" steps back to an outline beside it', () => {
    const html = actionsRow(EATERY, { lang: 'en', app: 'cuisine' });
    const buttons = html.split('<button').slice(1);
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toContain(FULL);
    expect(buttons[0]).toContain('font-weight:700');
    expect(buttons[1]).toContain(NEAR);
    expect(buttons[1]).not.toContain('font-weight:700');
    expect(buttons[2]).toContain(SET);
  });

  it('is not offered on Hawker or Train', () => {
    for (const app of ['hawker', 'transport']) {
      for (const body of [EATERY, BAR]) expect(actionsRow(body, { lang: 'en', app }), `${app} ${body.family}`).not.toContain(FULL);
    }
  });

  it('is not offered for any other kind of place, and the card of such a place is as it was', () => {
    for (const family of ['shopping', 'lodging', 'health', 'safety', 'nature', 'sight', 'transit', 'worship', 'learning', 'building']) {
      const html = actionsRow(card(family), { lang: 'en', app: 'cuisine' });
      expect(html, family).not.toContain(FULL);
      const buttons = html.split('<button').slice(1);
      expect(buttons, family).toHaveLength(2);
      expect(buttons[0], family).toContain(NEAR);
      expect(buttons[0], family).toContain('font-weight:700');   // still the filled one
    }
  });

  it('is not offered on a card of our own data, even a hawker centre', () => {
    const own = { ok: true, source: 'own', kind: 'hawker', family: 'eatery', own: { name: 'Fixture Food Centre' }, place: { placeId: ID, name: 'Fixture Food Centre', lat: 1.3, lng: 103.8 } };
    expect(actionsRow(own, { lang: 'en', app: 'cuisine' })).not.toContain(FULL);
  });

  it('is part of the Google card the map draws', () => {
    expect(placeInner(EATERY, { lang: 'en', app: 'cuisine' })).toContain(FULL);
    expect(placeInner(EATERY, { lang: 'en', app: 'hawker' })).not.toContain(FULL);
  });
});

// ── pressing it ─────────────────────────────────────────────────────────────────────────────
function rig({ answer = EATERY, full = { ok: true, venue: VENUE }, app = 'cuisine', origin = ORIGIN, stillOpen, destroyed = () => false, withPost = true } = {}) {
  const log = { shown: [], updated: [], dismissed: 0, lost: 0, gets: [], posts: [], actions: [] };
  const win = {};
  const tap = createPlaceTap({
    app, win,
    getLang: () => 'en',
    fetchJson: (u) => { log.gets.push(u); return Promise.resolve(answer); },
    ...(withPost ? { postJson: (u, b) => { log.posts.push({ url: u, body: b }); return typeof full === 'function' ? full(u, b) : Promise.resolve(full); } } : {}),
    getOrigin: () => origin,
    onAction: (kind, place) => log.actions.push({ kind, place }),
    isDestroyed: destroyed,
    show: (html, at) => log.shown.push({ html, at }),
    update: (html) => log.updated.push(html),
    dismiss: () => { log.dismissed++; },
    card: (inner) => `<div class="card">${inner}</div>`,
    own: {},
    stillOpen,
    lost: () => { log.lost++; },
  });
  return { tap, log, win };
}
async function opened(opts) {
  const r = rig(opts);
  r.tap.open(TAP);
  await r.tap.last;
  return r;
}
async function pressed(opts) {
  const r = await opened(opts);
  r.win.__giaPlaceAction('full');
  await r.tap.last;
  return r;
}
const lastCard = (log) => log.updated[log.updated.length - 1];

describe('pressing "Details, review & links" (F-2, F-8, I15)', () => {
  it('makes one POST to our own server, with the place, the language and the set location in the body', async () => {
    const { log } = await pressed();
    expect(log.posts).toHaveLength(1);
    expect(log.posts[0].url).toBe('/api/place-card/full');
    expect(log.posts[0].body).toEqual({ id: ID, lang: 'en', lat: ORIGIN.lat, lng: ORIGIN.lng });
    expect(log.gets).toHaveLength(1);   // the card lookup that opened the bubble, and nothing more
  });

  it('never puts the set location, or anything else, in the address of the request', async () => {
    const { log } = await pressed();
    expect(log.posts[0].url).not.toMatch(/[?&=]/);
    expect(log.posts[0].url).not.toContain(String(ORIGIN.lat));
    for (const u of log.gets) {
      expect(u).not.toContain(String(ORIGIN.lat));
      expect(u).not.toContain(String(ORIGIN.lng));
    }
  });

  it('sends no location when none is set', async () => {
    // (`undefined` is not in this list: it would make the stand-in fall back to its default location, and the case
    // would then pass or fail for a reason that has nothing to do with the code under test.)
    for (const origin of [null, {}, { lat: NaN, lng: 1 }, { lat: 1.3 }, { lat: '1.3', lng: '103.8' }]) {
      const { log } = await pressed({ origin });
      expect(log.posts, JSON.stringify(origin)).toHaveLength(1);
      expect(log.posts[0].body, JSON.stringify(origin)).toEqual({ id: ID, lang: 'en' });
    }
  });

  it('shows "looking up" while it waits, and a second press does nothing', async () => {
    let release;
    const r = await opened({ full: () => new Promise((res) => { release = res; }) });
    r.win.__giaPlaceAction('full');
    expect(lastCard(r.log)).toBe(`<div class="card">${loadingInner('en')}</div>`);
    r.win.__giaPlaceAction('full');
    r.win.__giaPlaceAction('near');
    r.win.__giaPlaceAction('set');
    expect(r.log.posts).toHaveLength(1);
    expect(r.log.actions).toEqual([]);
    release({ ok: true, venue: VENUE });
    await r.tap.last;
    expect(r.log.actions).toHaveLength(1);
  });

  it('on success closes the bubble and hands the venue to the app, once', async () => {
    const { log } = await pressed();
    expect(log.dismissed).toBe(1);
    expect(log.actions).toEqual([{ kind: 'full', place: { placeId: ID, name: 'Sakura Table Izakaya', lat: 1.2871, lng: 103.8501, venue: VENUE } }]);
  });

  it('a bar works the same way', async () => {
    const { log } = await pressed({ answer: BAR });
    expect(log.posts).toHaveLength(1);
    expect(log.actions[0].kind).toBe('full');
  });

  it('says why when it is refused, offers Google Maps, and adds nothing', async () => {
    const cases = [['cap', 'capReached'], ['budget', 'budgetReached'], ['not-operating', 'notOperating'], ['not-eatery', 'unavailable'], ['unavailable', 'unavailable'], ['anything-else', 'unavailable']];
    for (const [reason, key] of cases) {
      const { log } = await pressed({ full: { ok: false, reason } });
      const html = lastCard(log);
      expect(html, reason).toContain(pct(key, 'en').replace(/&/g, '&amp;').replace(/'/g, '&#39;'));
      expect(html, reason).toContain('https://www.google.com/maps/search/');
      expect(log.actions, reason).toEqual([]);
      expect(log.dismissed, reason).toBe(0);
    }
  });

  it('treats no answer, a broken answer, a thrown error and a venue for another place as "could not load"', async () => {
    // "No answer" is written as a function, because a bare `undefined` would make the stand-in use its default answer.
    const bad = [null, () => Promise.resolve(undefined), {}, { ok: true }, { ok: true, venue: null }, { ok: true, venue: { ...VENUE, placeId: 'ChIJsomewhereElse00000000' } },
      () => Promise.reject(new Error('offline')), () => { throw new Error('boom'); }];
    for (const [i, full] of bad.entries()) {
      const { log } = await pressed({ full });
      expect(log.posts, `case ${i}`).toHaveLength(1);
      expect(lastCard(log), `case ${i}`).toContain(pct('unavailable', 'en'));
      expect(log.actions, `case ${i}`).toEqual([]);
      expect(log.dismissed, `case ${i}`).toBe(0);
    }
  });

  it('drops an answer that arrives after the reader opened another place', async () => {
    let release;
    const r = await opened({ full: () => new Promise((res) => { release = res; }) });
    r.win.__giaPlaceAction('full');
    const waiting = r.tap.last;
    r.tap.open({ placeId: 'ChIJtest0000000000000000099', at: { lat: 1.29, lng: 103.85 } });
    await r.tap.last;
    const drawn = r.log.updated.length;
    release({ ok: true, venue: VENUE });
    await waiting;
    expect(r.log.actions).toEqual([]);
    expect(r.log.updated.length).toBe(drawn);
  });

  it('drops an answer that arrives after the bubble moved on or was closed, and clears only its own ring', async () => {
    let release; let open = true;
    const r = await opened({ full: () => new Promise((res) => { release = res; }), stillOpen: () => open });
    r.win.__giaPlaceAction('full');
    open = false;
    release({ ok: true, venue: VENUE });
    await r.tap.last;
    expect(r.log.actions).toEqual([]);
    expect(r.log.lost).toBe(1);
    expect(r.log.dismissed).toBe(0);
  });

  it('does nothing once the map is gone', async () => {
    let release; let dead = false;
    const r = await opened({ full: () => new Promise((res) => { release = res; }), destroyed: () => dead });
    r.win.__giaPlaceAction('full');
    dead = true;
    release({ ok: true, venue: VENUE });
    await r.tap.last;
    expect(r.log.actions).toEqual([]);
  });

  it('is ignored for a place that is not an eatery or a bar, whatever the page says', async () => {
    // The handler does not trust the markup: a "full" press on a mall's card asks for nothing.
    const { log } = await pressed({ answer: card('shopping') });
    expect(log.posts).toEqual([]);
    expect(log.actions).toEqual([]);
  });

  it('is ignored on Hawker and Train, and on a host with no way to POST', async () => {
    for (const app of ['hawker', 'transport']) {
      const { log } = await pressed({ app });
      expect(log.posts, app).toEqual([]);
      expect(log.actions, app).toEqual([]);
    }
    const { log } = await pressed({ withPost: false });
    expect(log.actions).toEqual([]);
    expect(lastCard(log)).toContain(FULL);   // the card is left as it was
  });

  it('leaves "Eateries near here" and "Set as my location" working on the same card', async () => {
    const r = await opened();
    r.win.__giaPlaceAction('near');
    r.win.__giaPlaceAction('set');
    expect(r.log.actions.map((a) => a.kind)).toEqual(['near', 'set']);
    expect(r.log.posts).toEqual([]);
  });
});

describe('insertVenue: once, at the front, the others untouched (I13)', () => {
  const a = { placeId: 'A', name: 'a' }; const b = { placeId: 'B', name: 'b' }; const c = { placeId: 'C', name: 'c' };
  const NEW = { placeId: 'N', name: 'new' };

  it('puts the card at the front with the "from the map" mark', () => {
    const before = [a, b, c];
    const out = insertVenue(before, NEW);
    expect(out.map((v) => v.placeId)).toEqual(['N', 'A', 'B', 'C']);
    expect(out[0]).toEqual({ placeId: 'N', name: 'new', fromMap: true });
  });

  it('keeps the other results in order and as the very same objects, and changes neither input', () => {
    const before = [a, b, c];
    const out = insertVenue(before, NEW);
    expect(out[1]).toBe(a); expect(out[2]).toBe(b); expect(out[3]).toBe(c);
    expect(before).toEqual([a, b, c]);
    expect(NEW).toEqual({ placeId: 'N', name: 'new' });
    expect(out).not.toBe(before);
  });

  it('adds nothing when the place is already there, and hands back the same list', () => {
    const before = [a, b, c];
    expect(insertVenue(before, { placeId: 'B', name: 'again' })).toBe(before);
    const once = insertVenue(before, NEW);
    expect(insertVenue(once, { ...NEW })).toBe(once);
  });

  it('puts a second card from the map in front of the first', () => {
    const out = insertVenue(insertVenue([a], NEW), { placeId: 'M', name: 'second' });
    expect(out.map((v) => v.placeId)).toEqual(['M', 'N', 'A']);
    expect(out.filter((v) => v.fromMap).map((v) => v.placeId)).toEqual(['M', 'N']);
  });

  it('copes with an empty or missing list, and refuses a card with no place ID', () => {
    expect(insertVenue([], NEW)).toEqual([{ ...NEW, fromMap: true }]);
    expect(insertVenue(null, NEW)).toEqual([{ ...NEW, fromMap: true }]);
    const before = [a];
    for (const bad of [null, undefined, {}, { placeId: '' }, { placeId: 7 }, 'x']) expect(insertVenue(before, bad)).toBe(before);
  });
});

describe('the search\'s own count does not move (I13)', () => {
  const results = (n) => Array.from({ length: n }, (_, i) => ({ placeId: `R${i + 1}` }));
  const fromMap = (id) => ({ placeId: id, fromMap: true });

  it('with no card from the map, the numbers are exactly what the list shows today', () => {
    for (const n of [0, 1, 5, 12, 13, 24, 25, 37]) {
      const list = results(n);
      expect(searchTotal(list)).toBe(n);
      const pages = Math.max(1, Math.ceil(n / 12));
      for (let page = 1; page <= pages; page++) {
        expect(searchCounts(list, page, 12), `${n} results, page ${page}`).toEqual({
          total: n, visibleStart: (page - 1) * 12 + 1, visibleEnd: Math.min(page * 12, n),
        });
      }
    }
  });

  it('a card from the map is not counted: 8 results stay 8, shown 1 to 8', () => {
    const list = [fromMap('M'), ...results(8)];
    expect(searchTotal(list)).toBe(8);
    expect(searchCounts(list, 1, 12)).toEqual({ total: 8, visibleStart: 1, visibleEnd: 8 });
  });

  it('when the added card pushes a result to the next page, the two pages still add up', () => {
    const list = [fromMap('M'), ...results(12)];   // 13 cards: 12 on the first page, 1 on the second
    expect(searchCounts(list, 1, 12)).toEqual({ total: 12, visibleStart: 1, visibleEnd: 11 });
    expect(searchCounts(list, 2, 12)).toEqual({ total: 12, visibleStart: 12, visibleEnd: 12 });
  });

  it('two cards from the map are both left out', () => {
    const list = [fromMap('M2'), fromMap('M1'), ...results(30)];
    expect(searchTotal(list)).toBe(30);
    expect(searchCounts(list, 1, 12)).toEqual({ total: 30, visibleStart: 1, visibleEnd: 10 });
    expect(searchCounts(list, 2, 12)).toEqual({ total: 30, visibleStart: 11, visibleEnd: 22 });
    expect(searchCounts(list, 3, 12)).toEqual({ total: 30, visibleStart: 23, visibleEnd: 30 });
  });

  it('only a card from the map and no search result: nothing found, nothing shown', () => {
    expect(searchTotal([fromMap('M')])).toBe(0);
    expect(searchCounts([fromMap('M')], 1, 12)).toEqual({ total: 0, visibleStart: 1, visibleEnd: 0 });
    expect(searchTotal(null)).toBe(0);
    expect(searchCounts(undefined, 1, 12)).toEqual({ total: 0, visibleStart: 1, visibleEnd: 0 });
  });
});

describe('wording in nine languages, hyphens only (F-9, I9)', () => {
  it('the button and the not-operating line exist everywhere and read as text, not as a key', () => {
    expect(pct('details', 'en')).toBe('Details, review & links');
    for (const lang of PLACE_CARD_LOCALES) {
      for (const k of ['details', 'notOperating']) {
        const s = PLACE_CARD_STRINGS[lang][k];
        expect(typeof s, `${lang}.${k}`).toBe('string');
        expect(s.trim().length, `${lang}.${k}`).toBeGreaterThan(3);
        expect(s, `${lang}.${k}`).not.toMatch(/[–—]/);
        if (lang !== 'en') expect(s, `${lang}.${k} is translated`).not.toBe(PLACE_CARD_STRINGS.en[k]);
      }
    }
  });

  it('a refusal for a place that is not operating says so, not "could not load"', () => {
    const html = refusalInner('not-operating', { lang: 'en', placeId: ID, at: TAP.at });
    expect(html).toContain(pct('notOperating', 'en'));
    expect(html).not.toContain(pct('unavailable', 'en'));
  });

  it('Cuisine\'s own table has the "From the map" chip in all nine languages', () => {
    const src = read('web/cuisine/src/v2/lib/i18n.js');
    expect(src).toMatch(/'card\.fromMap':\s*\{ en: 'From the map', fr: '[^']+' \}/);
    // one entry in the English and French table, one in each of the seven other tables
    expect(src.match(/'card\.fromMap':/g) || []).toHaveLength(8);
    for (const m of src.matchAll(/'card\.fromMap':([^\n]*)/g)) expect(m[1]).not.toMatch(/[–—]/);
  });
});

describe('how the three maps and the Cuisine app are wired (F-8, F-10)', () => {
  const MAPS = ['web/cuisine/src/v2/lib/mapOverlays.js', 'web/transport/src/lib/mapOverlays.js', 'web/hawker/src/lib/mapOverlays.js'];
  const GET_LINE = "fetchJson: (u) => (opts && typeof opts.fetchJson === 'function' ? opts.fetchJson(u) : Promise.resolve(null)),";
  const POST_LINE = "postJson: (u, b) => (opts && typeof opts.postJson === 'function' ? opts.postJson(u, b) : Promise.resolve(null)),";

  it('each map file passes a POST through to its host, beside the look-up line, which is as it was', () => {
    for (const f of MAPS) {
      const src = maskComments(read(f));
      expect(src.includes(GET_LINE), `${f}: the look-up line`).toBe(true);
      expect(src.split(POST_LINE).length - 1, `${f}: the POST line, once`).toBe(1);
      expect(src.indexOf(POST_LINE)).toBeGreaterThan(src.indexOf(GET_LINE));
    }
  });

  it('only the Cuisine map can reach the full-card route, and it sends JSON with the Telegram session', () => {
    const cuisine = maskComments(read('web/cuisine/src/v2/components/MapPanel.jsx'));
    expect(cuisine).toContain("postJson: (u, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData() || '' }, body: JSON.stringify(b) }).then((r) => r.json()).catch(() => null),");
    for (const f of ['web/hawker/src/components/HawkerMapPanel.jsx', 'web/transport/src/components/MrtMapPanel.jsx']) {
      expect(maskComments(read(f)).includes('postJson'), f).toBe(false);
    }
  });

  it('the Cuisine app adds the venue once, shows the strip and selects the card, before the older two actions', () => {
    const src = maskComments(read('web/cuisine/src/v2/App.jsx'));
    const from = src.indexOf('const handlePlaceAction = React.useCallback((kind, place) => {');
    expect(from).toBeGreaterThan(0);
    const body = src.slice(from, src.indexOf('}, [lang]);', from));
    const full = body.indexOf("if (kind === 'full') {");
    const guard = body.indexOf("if (kind !== 'near' && kind !== 'set') return;");
    expect(full).toBeGreaterThan(0);
    expect(guard).toBeGreaterThan(full);
    const branch = body.slice(full, guard);
    expect(branch).toMatch(/setVenues\(\(prev\) => insertVenue\(prev, added\)\);/);
    expect(branch).toMatch(/setDrawerDismissed\(false\);/);
    expect(branch).toMatch(/unfoldCard\(added\.placeId\);/);
    expect(branch).toMatch(/return;\s*\}\s*$/);
    // adding a card is not a search and not a change of location
    for (const not of ['runSearch(', 'onLocationSelect(', 'fetch(', 'explicitPickRef']) expect(branch.includes(not), not).toBe(false);
  });

  it('a card from the map says so, and the counts leave it out', () => {
    const cardSrc = maskComments(read('web/cuisine/src/v2/components/ResultCard.jsx'));
    expect(cardSrc).toMatch(/venue\.fromMap === true/);
    expect(cardSrc).toMatch(/tr\('card\.fromMap', lang\)/);
    const panel = maskComments(read('web/cuisine/src/v2/components/ResultPanel.jsx'));
    expect(panel).toMatch(/searchCounts\(venues, page, PAGE_SIZE\)/);
    const app = maskComments(read('web/cuisine/src/v2/App.jsx'));
    expect(app).toMatch(/searchTotal\(venues\) === knownTotal/);
    expect(app.match(/venues\.length === knownTotal/g) || []).toHaveLength(0);
  });
});
