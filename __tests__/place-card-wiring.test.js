// place-card-wiring.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Parts A and C,
// invariants I4, I5 and I10.
//
// Operator, 23-11 '26: "since now I can click on the bus stop and you give details, how about - other eateries on the
// map, hospital, hotel, shopping, police station, park, attractions, building name, etc."
//
// A tap on a Google icon is answered in this order on all three maps:
//   1. a bus stop within 20 m     - our stop card, exactly as v0.62.991 shipped it;
//   2. Cuisine only: one of the reader's own results - that result card is selected, and the server is not asked;
//   3. anything else              - the place card.
// The first half calls the two shared pieces with stand-ins. The second half reads the three panels and the three
// map controllers for the wiring, because the order above lives in how they are joined.
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskComments } from './helpers/mask-comments.js';
import { thenPlace, handleIconTap } from '../web/_shared/lib/base-icon-stop.js';
import { createPlaceTap, placeInner, loadingInner, pinNode } from '../web/_shared/lib/place-card.js';

const read = (p) => maskComments(fs.readFileSync(path.join(process.cwd(), p), 'utf8'));
const icon = (over = {}) => ({ placeId: 'ChIJfixtureMall0000000001', latLng: { lat: () => 1.3044, lng: () => 103.8339 }, stop: vi.fn(), ...over });

describe('thenPlace: the place card comes only after the bus-stop check (I5)', () => {
  it('a tap that is not on a Google icon stays null, and nothing is asked', () => {
    const openPlace = vi.fn();
    expect(thenPlace(handleIconTap({ latLng: { lat: () => 1, lng: () => 103 } }, vi.fn()), {}, openPlace)).toBe(null);
    expect(thenPlace(null, icon(), openPlace)).toBe(null);
    expect(openPlace).not.toHaveBeenCalled();
  });

  it('a bus stop that opened wins: the place card is not asked for', async () => {
    const openPlace = vi.fn(() => true);
    const e = icon();
    const opened = await thenPlace(handleIconTap(e, async () => true), e, openPlace);
    expect(opened).toBe(true);
    expect(openPlace).not.toHaveBeenCalled();
  });

  it('no bus stop there: the place card is asked for, with the icon\'s place ID and position', async () => {
    const openPlace = vi.fn(() => true);
    const e = icon();
    const opened = await thenPlace(handleIconTap(e, async () => false), e, openPlace);
    expect(opened).toBe(true);
    expect(openPlace).toHaveBeenCalledTimes(1);
    expect(openPlace).toHaveBeenCalledWith({ placeId: 'ChIJfixtureMall0000000001', at: { lat: 1.3044, lng: 103.8339 } });
  });

  it('a place card that did not open reads as "nothing opened", so the caller does what an empty tap does', async () => {
    const e = icon();
    expect(await thenPlace(handleIconTap(e, async () => false), e, () => false)).toBe(false);
    expect(await thenPlace(handleIconTap(e, async () => false), e, () => undefined)).toBe(false);
    expect(await thenPlace(handleIconTap(e, async () => false), e, () => { throw new Error('boom'); })).toBe(false);
    expect(await thenPlace(handleIconTap(e, async () => false), e, async () => { throw new Error('boom'); })).toBe(false);
    expect(await thenPlace(handleIconTap(e, async () => false), e, null)).toBe(false);
  });

  it('a plain-object position works as well as Google\'s LatLng', async () => {
    const openPlace = vi.fn(() => true);
    const e = icon({ latLng: { lat: 1.3, lng: 103.8 } });
    await thenPlace(handleIconTap(e, async () => false), e, openPlace);
    expect(openPlace).toHaveBeenCalledWith({ placeId: e.placeId, at: { lat: 1.3, lng: 103.8 } });
  });
});

// ── createPlaceTap, with stand-ins for the map ────────────────────────────────────────────────────────────────────
const MALL = {
  ok: true, source: 'google', family: 'shopping',
  place: { placeId: 'ChIJfixtureMall0000000001', name: 'Fixture Plaza', typeLabel: 'Shopping mall', address: '1 Fixture Road', lat: 1.3044, lng: 103.8339, country: 'SG', rating: 4.1, ratingCount: 12, priceLevel: null, openNow: true, openLabel: 'Open', closedGuess: false, mapsUri: 'https://maps.google.com/?cid=1' },
};
const HOSPITAL = { ok: true, source: 'own', kind: 'hospital', family: 'health', own: { name: 'Fixture Hospital', lat: 1.305, lng: 103.835 }, place: { placeId: 'ChIJfixtureHospital000003', name: 'Fixture Hospital', lat: 1.305, lng: 103.835 } };
const STATION = { ok: true, source: 'own', kind: 'station', family: 'transit', own: { name: 'Fixture Station', code: 'NS1', lat: 1.3, lng: 103.8 }, place: { placeId: 'ChIJfixtureStation0000004', name: 'Fixture Station', lat: 1.3, lng: 103.8 } };
const TAP = { placeId: 'ChIJfixtureMall0000000001', at: { lat: 1.3044, lng: 103.8339 } };

function rig({ answer = MALL, app = 'cuisine', origin = null, destroyed = () => false, refine = {}, openOwn = undefined } = {}) {
  const log = { shown: [], updated: [], dismissed: 0, urls: [], actions: [], stations: [] };
  const win = {};
  let resolve;
  const gate = new Promise((r) => { resolve = r; });
  const tap = createPlaceTap({
    app, win,
    getLang: () => 'en',
    fetchJson: (u) => { log.urls.push(u); return typeof answer === 'function' ? answer(u, gate) : Promise.resolve(answer); },
    getOrigin: () => origin,
    onAction: (kind, place) => log.actions.push({ kind, place }),
    isDestroyed: destroyed,
    show: (html, at) => log.shown.push({ html, at }),
    update: (html) => log.updated.push(html),
    dismiss: () => { log.dismissed++; },
    card: (inner) => `<div class="card">${inner}</div>`,
    own: { hospital: (f) => `<div class="card"><div>${f.name}</div></div>`, police: (f) => `<div class="card">${f.name}</div>`, attraction: (f) => `<div class="card">${f.name}</div>`, hawker: (f) => `<div class="card">${f.name}</div>` },
    refine,
    openOwn,
    focusStation: (code) => log.stations.push(code),
  });
  return { tap, log, win, release: resolve };
}

describe('createPlaceTap: what a tap does', () => {
  it('opens a "looking up" card on the icon at once, and reports that a card is open', () => {
    const { tap, log } = rig();
    expect(tap.open(TAP)).toBe(true);
    expect(log.shown.length).toBe(1);
    expect(log.shown[0].at).toEqual(TAP.at);
    expect(log.shown[0].html).toBe(`<div class="card">${loadingInner('en')}</div>`);
  });

  it('asks our own server, once, with the place ID and the language', async () => {
    const { tap, log } = rig();
    tap.open(TAP);
    await tap.last;
    expect(log.urls).toEqual(['/api/place-card?id=ChIJfixtureMall0000000001&lang=en']);
  });

  it('fills the card with the answer', async () => {
    const { tap, log } = rig();
    tap.open(TAP);
    await tap.last;
    expect(log.updated).toEqual([`<div class="card">${placeInner(MALL, { lang: 'en', app: 'cuisine' })}</div>`]);
  });

  it('Cuisine: adds the distance from the set location when one is set', async () => {
    const { tap, log } = rig({ origin: { lat: 1.3044, lng: 103.8339 + 350 / 111195 / Math.cos(1.3044 * Math.PI / 180) } });
    tap.open(TAP);
    await tap.last;
    expect(log.updated[0]).toMatch(/3[45]\d m from your set location/);
  });

  it.each(['hawker', 'transport'])('%s: no distance line, whatever the origin', async (app) => {
    const { tap, log } = rig({ app, origin: { lat: 1.31, lng: 103.84 } });
    tap.open(TAP);
    await tap.last;
    expect(log.updated[0]).not.toContain('from your set location');
  });

  it('our own record is drawn by the card we already have for that kind, with the buttons inside it', async () => {
    const { tap, log } = rig({ answer: HOSPITAL });
    tap.open({ placeId: HOSPITAL.place.placeId, at: { lat: 1.305, lng: 103.835 } });
    await tap.last;
    expect(log.updated.length).toBe(1);
    expect(log.updated[0]).toMatch(/^<div class="card"><div>Fixture Hospital<\/div><div[^>]*>[\s\S]*data-place-action="near"[\s\S]*<\/div><\/div>$/);
    expect(log.updated[0]).toContain('data-place-action="set"');
  });

  it('a card that can be improved after it opens is replaced once, and keeps its buttons', async () => {
    const { tap, log } = rig({ answer: { ...HOSPITAL, kind: 'hawker' }, refine: { hawker: async (f) => `<div class="card">${f.name} + trains</div>` } });
    tap.open({ placeId: HOSPITAL.place.placeId, at: { lat: 1.305, lng: 103.835 } });
    await tap.last;
    expect(log.updated.length).toBe(2);
    expect(log.updated[1]).toContain('Fixture Hospital + trains');
    expect(log.updated[1]).toContain('data-place-action="near"');
  });

  it('a linked station closes the lookup card and opens our station view', async () => {
    const { tap, log } = rig({ answer: STATION });
    tap.open({ placeId: STATION.place.placeId, at: { lat: 1.3, lng: 103.8 } });
    await tap.last;
    expect(log.dismissed).toBe(1);
    expect(log.stations).toEqual(['NS1']);
    expect(log.updated).toEqual([]);
  });

  it.each([
    ['the daily limit', { ok: false, reason: 'cap' }, 'Today&#39;s place look-ups are used up'],
    ['the monthly limit', { ok: false, reason: 'budget' }, 'Place look-ups are paused until next month'],
    ['Google unavailable', { ok: false, reason: 'unavailable' }, 'Could not load this place'],
    ['no answer at all', null, 'Could not load this place'],
    ['an answer of the wrong shape', { ok: true }, 'Could not load this place'],
    ['an answer from a source this card does not know', { ...MALL, source: 'somewhere-else' }, 'Could not load this place'],
  ])('%s: the card says why and offers Google Maps (I10)', async (_label, answer, text) => {
    const { tap, log } = rig({ answer });
    tap.open(TAP);
    await tap.last;
    expect(log.updated.length).toBe(1);
    expect(log.updated[0]).toContain(text);
    expect(log.updated[0]).toContain('Open in Google Maps');
    expect(log.updated[0]).toContain('query_place_id=ChIJfixtureMall0000000001');
    expect(log.updated[0]).not.toContain('Looking up');
  });

  it('one of our records this map has no card for still gets a card: its name and the buttons', async () => {
    const { tap, log } = rig({ answer: { ...HOSPITAL, kind: 'lighthouse' } });
    tap.open({ placeId: HOSPITAL.place.placeId, at: { lat: 1.305, lng: 103.835 } });
    await tap.last;
    expect(log.updated.length).toBe(1);
    expect(log.updated[0]).toMatch(/^<div class="card">/);
    expect(log.updated[0]).toContain('Fixture Hospital');
    expect(log.updated[0]).toContain('data-place-action="near"');
    expect(log.updated[0]).not.toContain('Looking up');
  });

  it('a kind the host app shows itself is handed to it, and the lookup card is closed', async () => {
    const asked = [];
    const { tap, log } = rig({ answer: { ...HOSPITAL, kind: 'hawker' }, openOwn: (kind, rec) => { asked.push([kind, rec.name]); return true; } });
    tap.open({ placeId: HOSPITAL.place.placeId, at: { lat: 1.305, lng: 103.835 } });
    await tap.last;
    expect(asked).toEqual([['hawker', 'Fixture Hospital']]);
    expect(log.dismissed).toBe(1);
    expect(log.updated).toEqual([]);
  });

  it('when the host app has no view for it after all, the shared card shows it', async () => {
    const { tap, log } = rig({ answer: { ...HOSPITAL, kind: 'hawker' }, openOwn: () => false });
    tap.open({ placeId: HOSPITAL.place.placeId, at: { lat: 1.305, lng: 103.835 } });
    await tap.last;
    expect(log.dismissed).toBe(0);
    expect(log.updated.length).toBe(1);
    expect(log.updated[0]).toContain('Fixture Hospital');
  });

  it('a request that throws ends the same way, never stuck on "looking up" (I10)', async () => {
    const { tap, log } = rig({ answer: () => Promise.reject(new Error('offline')) });
    tap.open(TAP);
    await tap.last;
    expect(log.updated.length).toBe(1);
    expect(log.updated[0]).toContain('Could not load this place');
  });

  it('a second tap while the first is still loading wins: the first answer is dropped', async () => {
    const first = { ...MALL, place: { ...MALL.place, name: 'First Place' } };
    const second = { ...MALL, place: { ...MALL.place, placeId: 'ChIJfixtureSecond00000007', name: 'Second Place' } };
    const { tap, log, release } = rig({ answer: (u, gate) => (u.includes('Second') ? Promise.resolve(second) : gate.then(() => first)) });
    tap.open(TAP);
    const slow = tap.last;
    tap.open({ placeId: 'ChIJfixtureSecond00000007', at: { lat: 1.31, lng: 103.84 } });
    await tap.last;
    release();
    await slow;
    expect(log.updated.length).toBe(1);
    expect(log.updated[0]).toContain('Second Place');
    expect(log.updated[0]).not.toContain('First Place');
  });

  it('nothing is drawn after the map is gone', async () => {
    let gone = false;
    const { tap, log } = rig({ destroyed: () => gone });
    tap.open(TAP);
    gone = true;
    await tap.last;
    expect(log.updated).toEqual([]);
    expect(tap.open(TAP)).toBe(false);
  });

  it('a tap without a place ID or a position opens nothing and asks nothing', () => {
    const { tap, log } = rig();
    for (const bad of [null, {}, { placeId: 'ChIJx' }, { placeId: '', at: { lat: 1, lng: 2 } }, { placeId: 'ChIJx', at: { lat: NaN, lng: 2 } }]) expect(tap.open(bad)).toBe(false);
    expect(log.shown).toEqual([]);
    expect(log.urls).toEqual([]);
  });
});

describe('createPlaceTap: the buttons act on the place whose card is open', () => {
  it('"Eateries here" and "Set as my location" hand the place to the map that owns the card', async () => {
    const { tap, log, win } = rig();
    tap.open(TAP);
    await tap.last;
    win.__giaPlaceAction('near');
    win.__giaPlaceAction('set');
    expect(log.actions).toEqual([
      { kind: 'near', place: { placeId: 'ChIJfixtureMall0000000001', name: 'Fixture Plaza', lat: 1.3044, lng: 103.8339 } },
      { kind: 'set', place: { placeId: 'ChIJfixtureMall0000000001', name: 'Fixture Plaza', lat: 1.3044, lng: 103.8339 } },
    ]);
  });

  it('an unknown action, or a press before the answer arrived, does nothing', async () => {
    const { tap, log, win, release } = rig({ answer: (_u, gate) => gate.then(() => MALL) });
    tap.open(TAP);
    win.__giaPlaceAction('near');
    expect(log.actions).toEqual([]);
    release();
    await tap.last;
    win.__giaPlaceAction('delete-everything');
    win.__giaPlaceAction();
    expect(log.actions).toEqual([]);
  });

  // Found by a mutation that survived: nothing checked that "set" is ignored where the card has no such button.
  it.each(['hawker', 'transport'])('%s: "set" does nothing even if something calls it, and "near" still works', async (app) => {
    const { tap, log, win } = rig({ app });
    tap.open(TAP);
    await tap.last;
    win.__giaPlaceAction('set');
    expect(log.actions).toEqual([]);
    win.__giaPlaceAction('near');
    expect(log.actions.map((a) => a.kind)).toEqual(['near']);
  });

  it('after a refusal there is no place to act on', async () => {
    const { tap, log, win } = rig({ answer: { ok: false, reason: 'cap' } });
    tap.open(TAP);
    await tap.last;
    win.__giaPlaceAction('near');
    expect(log.actions).toEqual([]);
  });
});

describe('the pin drawn on the tapped icon', () => {
  it('is a ring that takes no taps of its own', () => {
    const el = { style: {}, setAttribute(k, v) { this[k] = v; } };
    const node = pinNode({ createElement: () => el });
    expect(node).toBe(el);
    expect(el.style.pointerEvents).toBe('none');
    expect(el.style.borderRadius).toBe('50%');
    expect(el['aria-hidden']).toBe('true');
  });
});

// ── the wiring in the three apps ──────────────────────────────────────────────────────────────────────────────────
const PANELS = {
  cuisine: 'web/cuisine/src/v2/components/MapPanel.jsx',
  hawker: 'web/hawker/src/components/HawkerMapPanel.jsx',
  transport: 'web/transport/src/components/MrtMapPanel.jsx',
};
const COPIES = {
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  transport: 'web/transport/src/lib/mapOverlays.js',
};

describe.each(Object.keys(PANELS))('%s panel: the tap order (Part A)', (name) => {
  const src = read(PANELS[name]);

  it('imports thenPlace beside handleIconTap', () => {
    expect(src).toMatch(/import \{[^}]*\bhandleIconTap\b[^}]*\bthenPlace\b[^}]*\} from '[./]+\/_shared\/lib\/base-icon-stop\.js';/);
  });

  it('asks for the place card only after the bus-stop check', () => {
    expect(src).toMatch(/thenPlace\(handleIconTap\(e, \(at\) => overlayControllerRef\.current\?\.openStopAt\?\.\(at\)\), e, /);
    expect(src).toMatch(/overlayControllerRef\.current\?\.openPlaceAt\?\.\(tap\)/);
  });

  it('gives the controller a fetch that carries the Telegram session, and a handler for the buttons', () => {
    const at = src.indexOf('createOverlayController(mapRef.current, window.google.maps, {');
    expect(at).toBeGreaterThan(0);
    const optsText = src.slice(at, at + 900);
    expect(optsText).toMatch(/fetchJson: \(u\) => fetch\(u, \{ headers: \{ 'x-telegram-init-data': initData\(\) \|\| '' \} \}\)/);
    expect(optsText).toMatch(/onPlaceAction: /);
  });

  it('still closes whatever was open first, and still has the icons on', () => {
    expect(src).toMatch(/clickableIcons:\s*true/);
    const at = src.indexOf('thenPlace(handleIconTap(e,');
    const start = src.lastIndexOf("addListener('click', (e) => {", at);
    expect(start).toBeGreaterThan(0);
    expect(src.slice(start, at)).toMatch(/^addListener\('click', \(e\) => \{\s*closeInfo\(\);/);
  });
});

describe('Cuisine panel: one of the reader\'s own results is selected, not looked up (I4)', () => {
  const src = read(PANELS.cuisine);
  const at = src.indexOf('thenPlace(handleIconTap(e,');
  const body = src.slice(at, at + 700);

  it('checks the results before the place card', () => {
    const match = body.indexOf('resultMatch(venuesRef.current, tap.placeId)');
    const place = body.indexOf('overlayControllerRef.current?.openPlaceAt?.(tap)');
    expect(match).toBeGreaterThan(0);
    expect(place).toBeGreaterThan(match);
  });

  it('a match selects that result the way a tap on its own pin does, and counts as opened', () => {
    expect(body).toMatch(/if \(hit\) \{ onPinTapRef\.current\?\.\(hit\.placeId\); return true; \}/);
  });

  it('keeps the pin handler current through a ref, since the map listener is made once', () => {
    expect(src).toMatch(/const onPinTapRef = useRef\(null\);/);
    expect(src).toMatch(/useEffect\(\(\) => \{ onPinTapRef\.current = onPinTap; \}, \[onPinTap\]\);/);
  });

  it('takes the button handler as a prop and the set location for the distance line', () => {
    expect(src).toMatch(/export default function MapPanel\(\{[^)]*\bonPlaceAction = null\b/);
    const c = src.indexOf('createOverlayController(mapRef.current, window.google.maps, {');
    const optsText = src.slice(c, c + 900);
    expect(optsText).toMatch(/onPlaceAction: \(kind, place\) => onPlaceActionRef\.current\?\.\(kind, place\)/);
    expect(optsText).toMatch(/getOrigin: \(\) => searchCenterRef\.current/);
  });

  it('a long press still sets the location first, and an empty tap still deselects (I5)', () => {
    const click = src.slice(src.lastIndexOf("addListener('click', (e) => {", at), at + 900);
    expect(click.indexOf('onLongPressRef.current({')).toBeGreaterThan(0);
    expect(click.indexOf('onLongPressRef.current({')).toBeLessThan(click.indexOf('thenPlace('));
    expect(click).toMatch(/if \(iconTap\) \{\s*iconTap\.then\(\(opened\) => \{ if \(!opened\) onDeselectRef\.current\?\.\(\); \}\);\s*return;\s*\}\s*onDeselectRef\.current\?\.\(\);/);
  });
});

describe('Cuisine app: what the two buttons do (Part C)', () => {
  const src = read('web/cuisine/src/v2/App.jsx');
  const at = src.indexOf('const handlePlaceAction = React.useCallback((kind, place) => {');
  const body = src.slice(at, src.indexOf('}, [lang]);', at) + 12);

  it('hands the handler to the map', () => {
    expect(at).toBeGreaterThan(0);
    expect(src).toMatch(/onPlaceAction=\{handlePlaceAction\}/);
  });

  it('both buttons go through the one place that sets a location, as a deliberate pick', () => {
    expect(body).toMatch(/explicitPickRef\.current = true;/);
    expect(body.match(/onLocationSelect\(/g).length).toBe(1);
    expect(body).toMatch(/onLocationSelect\(\{ lat: place\.lat, lng: place\.lng, label: [^,]+, fly: true, \.\.\.\(kind === 'set' \? \{ noAutoFire: true \} : \{\}\) \}\);/);
  });

  it('"Set as my location" does not search, and neither button adds a search call of its own (I5)', () => {
    expect(body).not.toMatch(/runSearch\(/);
    expect(body).not.toMatch(/triggerSearch\(/);
  });

  it('closes the map card first, so the result cards are unfolded for what comes next', () => {
    expect(body).toMatch(/window\.__giaMapCardsClose\(\);/);
    expect(body.indexOf('window.__giaMapCardsClose();')).toBeLessThan(body.indexOf('onLocationSelect('));
  });

  it('ignores anything that is not one of the two buttons, or has no position', () => {
    expect(body).toMatch(/if \(kind !== 'near' && kind !== 'set'\) return;/);
    expect(body).toMatch(/if \(!place \|\| !Number\.isFinite\(place\.lat\) \|\| !Number\.isFinite\(place\.lng\)\) return;/);
  });
});

describe.each(['hawker', 'transport'])('%s panel: "Eateries near here" opens Cuisine at that place (Part C)', (name) => {
  const src = read(PANELS[name]);
  const c = src.indexOf('createOverlayController(mapRef.current, window.google.maps, {');
  const optsText = src.slice(c, c + 900);

  it('imports the Cuisine link from the shared card', () => {
    expect(src).toMatch(/import \{[^}]*\bcuisineLink\b[^}]*\} from '[./]+\/_shared\/lib\/place-card\.js';/);
  });

  it('goes to Cuisine on "near", and does nothing for any other action', () => {
    expect(optsText).toMatch(/onPlaceAction: \(kind, place\) => \{ const url = kind === 'near' \? cuisineLink\(place\) : ''; if \(url\) window\.location\.assign\(url\); \}/);
  });

  it('has no set-location handling of its own', () => {
    expect(optsText).not.toMatch(/'set'/);
    expect(optsText).not.toMatch(/getOrigin/);
  });
});

describe.each(Object.keys(COPIES))('%s map controller: the place card uses the bubble and the cards already there', (name) => {
  const src = read(COPIES[name]);
  const at = src.indexOf('const placeTap = createPlaceTap({');
  const body = src.slice(at, at + 2200);

  it('imports the shared place card', () => {
    expect(src).toMatch(/import \{[^}]*\bcreatePlaceTap\b[^}]*\bpinNode\b[^}]*\} from '[./]+\/_shared\/lib\/place-card\.js';/);
  });

  it('builds it once, for this app, in the current language', () => {
    expect(at, 'createPlaceTap is called').toBeGreaterThan(0);
    expect(src.split('createPlaceTap({').length - 1).toBe(1);
    expect(body).toMatch(/app: tma,/);
    expect(body).toMatch(/getLang: \(\) => _lang,/);
    expect(body).toMatch(/isDestroyed: \(\) => destroyed,/);
  });

  it('draws our own records with the cards the layers already use', () => {
    // The Hawker map draws hawker centres itself (HawkerMapPanel), so its controller has no hawker card: a linked
    // centre is handed to the panel through openOwnPlace instead.
    const hawker = name === 'hawker' ? 'null' : "\\(f\\) => hawkerCardHtml\\(f, null\\)";
    expect(body).toMatch(new RegExp(`own: \\{ hospital: hospitalInfo, police: poiInfo\\('👮'\\), attraction: attractionInfo, hawker: ${hawker} \\},`));
    expect(body).toMatch(/card: \(inner\) => infoCard\(inner, null\),/);
  });

  it('hands a kind the host app shows itself to the panel, and to nobody when the panel has no such view', () => {
    expect(body).toMatch(/openOwn: \(kind, rec\) => !!\(opts && typeof opts\.openOwnPlace === 'function' && opts\.openOwnPlace\(kind, rec\) === true\),/);
  });

  it('opens in the shared bubble on a pin that closeInfo already clears', () => {
    expect(body).toMatch(/iconStopPins\.push\(marker\);/);
    expect(body).toMatch(/info\.setContent\(html\);\s*info\.open\(map, marker\);/);
    expect(body).toMatch(/update: \(html\) => info\.setContent\(html\),/);
    expect(body).toMatch(/dismiss: \(\) => \{ clearIconStopPins\(\); info\.close\(\); \},/);
  });

  it('a linked station opens the station view the cards already link to', () => {
    expect(body).toMatch(/focusStation: \(code\) => \{ if \(typeof window\.__giaFocusStation === 'function'\) window\.__giaFocusStation\(code\); \},/);
  });

  it('exposes openPlaceAt, and leaves openStopAt as it was', () => {
    expect(src).toMatch(/openPlaceAt\(tap\) \{ return placeTap\.open\(tap\); \},/);
    expect(src).toMatch(/async openStopAt\(at\) \{/);
    expect(src).toMatch(/openBusInfo\(map, info, b, marker\)/);
  });

  it('takes its fetch and its button handler from the panel, and asks nothing without them', () => {
    expect(body).toMatch(/fetchJson: \(u\) => \(opts && typeof opts\.fetchJson === 'function' \? opts\.fetchJson\(u\) : Promise\.resolve\(null\)\),/);
    expect(body).toMatch(/onAction: \(kind, place\) => \{ if \(opts && typeof opts\.onPlaceAction === 'function'\) opts\.onPlaceAction\(kind, place\); \},/);
  });
});

describe('the three map controllers wire the place card the same way', () => {
  const block = (p) => {
    const src = read(p);
    const at = src.indexOf('const placeTap = createPlaceTap({');
    return src.slice(at, src.indexOf('\n  });', at) + 6);
  };

  it('Cuisine and Train are the same text', () => {
    expect(block(COPIES.cuisine).length).toBeGreaterThan(400);
    expect(block(COPIES.transport)).toBe(block(COPIES.cuisine));
  });

  it('Hawker has no hawker card of its own, and is otherwise the same lines', () => {
    const h = block(COPIES.hawker);
    expect(h).toMatch(/hawker: null \},/);
    expect(h).toMatch(/refine: \{\},/);
    expect(h).not.toContain('hawkerCardHtml');
    // The lines that hold the hawker card and its later refresh are the only ones allowed to differ.
    const mayDiffer = (l) => /^own: |^refine: |hawkerCardHtml|centre-transit|^\.then\(\(r\)|^\},$/.test(l);
    const shared = block(COPIES.cuisine).split('\n').map((l) => l.trim()).filter((l) => l && !mayDiffer(l));
    expect(shared.length).toBeGreaterThan(15);
    for (const line of shared) expect(h, line).toContain(line);
  });
});

describe('Hawker panel: a hawker centre opens the pop-up the Hawker map already has', () => {
  const src = read(PANELS.hawker);
  const c = src.indexOf('createOverlayController(mapRef.current, window.google.maps, {');
  const optsText = src.slice(c, src.indexOf('\n    });', c));

  it('looks the centre up among its own pins by name, and taps that pin', () => {
    expect(optsText).toMatch(/openOwnPlace: \(kind, rec\) => \{/);
    expect(optsText).toMatch(/const entry = kind === 'hawker' && rec \? markersByNameRef\.current\[rec\.name\] : null;/);
    expect(optsText).toMatch(/window\.google\?\.maps\?\.event\?\.trigger\(entry\.marker, 'click'\);\s*return true;/);
  });

  it('says no when it has no such pin, so the shared card still shows the place', () => {
    expect(optsText).toMatch(/if \(!entry \|\| !entry\.marker\) return false;/);
  });
});
