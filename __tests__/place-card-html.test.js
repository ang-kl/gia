// place-card-html.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Parts C and D,
// invariants I6, I7, I9 and I10.
//
// The card is an HTML string placed in the same map bubble as the station and bus-stop cards. Three things can go
// wrong with a string like that, and each has a section here:
//   - a place name from Google is put in as markup instead of text (I7);
//   - a fixed line exists in English and is missing in another language, so a Korean reader gets an English button
//     under a Korean heading (I9);
//   - a refusal or a failure leaves the bubble blank or stuck on "looking up" (I10).
import { describe, it, expect } from 'vitest';
import {
  placeInner, actionsRow, loadingInner, refusalInner, withActions, cuisineLink, mapsLink, resultMatch, formatDistance, esc,
} from '../web/_shared/lib/place-card.js';
import { PLACE_CARD_LOCALES, PLACE_CARD_KEYS, PLACE_CARD_STRINGS, pct } from '../web/_shared/lib/place-card-i18n.js';

const google = (over = {}, placeOver = {}) => ({
  ok: true, source: 'google', family: 'shopping',
  place: {
    placeId: 'ChIJfixtureMall0000000001', name: 'Fixture Plaza', typeLabel: 'Shopping mall', address: '1 Fixture Road, Singapore 000001',
    lat: 1.3044, lng: 103.8339, country: 'SG', rating: 4.1, ratingCount: 12000, priceLevel: null,
    openNow: true, openLabel: 'Open · Closes 9:00 PM', closedGuess: false, mapsUri: 'https://maps.google.com/?cid=1', ...placeOver,
  },
  ...over,
});
const opts = (over = {}) => ({ lang: 'en', app: 'cuisine', ...over });

describe('the Google card (Part C)', () => {
  it('shows the type, the name, the rating, the open line, the address and where the details come from', () => {
    const h = placeInner(google(), opts());
    for (const part of ['Shopping mall', 'Fixture Plaza', '4.1', 'Open · Closes 9:00 PM', '1 Fixture Road, Singapore 000001', 'Details from Google', 'Open in Google Maps']) {
      expect(h, part).toContain(part);
    }
    expect(h).toContain('href="https://maps.google.com/?cid=1"');
    expect(h).toMatch(/target="_blank" rel="noopener"/);
  });

  it('shows the price for a place that has one, as dollar signs', () => {
    expect(placeInner(google({ family: 'eatery' }, { priceLevel: 2 }), opts())).toContain('$$');
    expect(placeInner(google({ family: 'eatery' }, { priceLevel: 4 }), opts())).toContain('$$$$');
    expect(placeInner(google(), opts())).not.toContain('$');
  });

  it('leaves out a line Google gave nothing for, instead of printing "null" or "undefined"', () => {
    const h = placeInner(google({}, { rating: null, ratingCount: null, openLabel: '', openNow: null, address: '', typeLabel: '', mapsUri: '' }), opts());
    expect(h).not.toMatch(/null|undefined|NaN/);
    expect(h).toContain('Fixture Plaza');
    expect(h).not.toContain('★');
  });

  it('the distance line appears on Cuisine when the distance is known, and nowhere else', () => {
    expect(placeInner(google(), opts({ distanceM: 350 }))).toContain('350 m from your set location');
    expect(placeInner(google(), opts({ distanceM: 1240 }))).toContain('1.2 km from your set location');
    expect(placeInner(google(), opts())).not.toContain('from your set location');
    expect(placeInner(google(), opts({ app: 'hawker', distanceM: 350 }))).not.toContain('from your set location');
    expect(placeInner(google(), opts({ app: 'transport', distanceM: 350 }))).not.toContain('from your set location');
  });

  it('formats a distance in metres below a kilometre and in kilometres above', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(349.6)).toBe('350 m');
    expect(formatDistance(999)).toBe('999 m');
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(12345)).toBe('12.3 km');
    expect(formatDistance(NaN)).toBe('');
    expect(formatDistance(-5)).toBe('');
  });
});

describe('the closing-time guess is shown as a guess (I6)', () => {
  it('appears when the server says so, in place of an open line', () => {
    const h = placeInner(google({ family: 'eatery' }, { openNow: null, openLabel: '', closedGuess: true }), opts());
    expect(h).toContain('Probably closed - no hours on Google');
  });

  it('does not appear otherwise', () => {
    expect(placeInner(google(), opts())).not.toContain('Probably closed');
    expect(placeInner(google({ family: 'eatery' }, { openNow: null, openLabel: '', closedGuess: false }), opts())).not.toContain('Probably closed');
  });

  it('never appears beside a real open or closed line', () => {
    const h = placeInner(google({ family: 'eatery' }, { openNow: false, openLabel: 'Closed today', closedGuess: true }), opts());
    expect(h).toContain('Closed today');
    expect(h).not.toContain('Probably closed');
  });

  it('is worded as a guess in every language', () => {
    for (const lang of PLACE_CARD_LOCALES) {
      const line = pct('probablyClosed', lang);
      expect(line.length, lang).toBeGreaterThan(8);
      expect(line, `${lang}: the guess names Google as the gap`).toContain('Google');
    }
  });
});

describe('the buttons (Part C)', () => {
  const near = 'data-place-action="near"';
  const set = 'data-place-action="set"';

  it('Cuisine: a mall, hotel or building gets "Eateries here" and "Set as my location"', () => {
    for (const family of ['shopping', 'lodging', 'building']) {
      const h = actionsRow(google({ family }), opts());
      expect(h, family).toContain('Eateries here');
      expect(h).not.toContain('Eateries near here');
      expect(h).toContain('Set as my location');
      expect(h).toContain(near);
      expect(h).toContain(set);
    }
  });

  it('Cuisine: anything else gets "Eateries near here"', () => {
    for (const family of ['eatery', 'bar', 'health', 'safety', 'nature', 'sight', 'worship', 'learning', 'transit']) {
      const h = actionsRow(google({ family }), opts());
      expect(h, family).toContain('Eateries near here');
      expect(h).toContain('Set as my location');
    }
  });

  it.each(['hawker', 'transport'])('%s: "Eateries near here" only, and no "Set as my location"', (app) => {
    for (const family of ['shopping', 'eatery', 'health']) {
      const h = actionsRow(google({ family }), opts({ app }));
      expect(h).toContain('Eateries near here');
      expect(h).toContain(near);
      expect(h).not.toContain('Set as my location');
      expect(h).not.toContain(set);
    }
  });

  it('each button is a real button that calls the one handler, with a 44 px touch target', () => {
    const h = actionsRow(google(), opts());
    expect(h.match(/<button type="button"/g).length).toBe(2);
    expect(h).toContain(`onclick="window.__giaPlaceAction&&window.__giaPlaceAction('near')"`);
    expect(h).toContain(`onclick="window.__giaPlaceAction&&window.__giaPlaceAction('set')"`);
    expect(h.match(/min-height:44px/g).length).toBe(2);
  });

  it('the Google card carries its buttons', () => {
    const h = placeInner(google(), opts());
    expect(h).toContain(near);
    expect(h).toContain(set);
  });

  it('our own card gets the buttons added inside it, before its closing tag', () => {
    const card = '<div style="x"><div>Mount Elizabeth Hospital</div></div>';
    const out = withActions(card, '<div id="row"></div>');
    expect(out).toBe('<div style="x"><div>Mount Elizabeth Hospital</div><div id="row"></div></div>');
    expect(withActions(card, '')).toBe(card);
    expect(withActions('', '<div id="row"></div>')).toBe('<div id="row"></div>');
  });
});

describe('text from Google or from our data cannot inject markup (I7)', () => {
  const evil = '<img src=x onerror=alert(1)>"\'&';

  it('a name, a type label and an address are shown as text', () => {
    const h = placeInner(google({}, { name: evil, typeLabel: evil, address: evil, openLabel: evil }), opts());
    expect(h).not.toContain('<img');
    expect(h).not.toContain('onerror=alert(1)>');
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('a link that is not http or https is dropped, and a quote cannot close the attribute', () => {
    expect(placeInner(google({}, { mapsUri: 'javascript:alert(1)' }), opts())).not.toContain('javascript:');
    expect(placeInner(google({}, { mapsUri: 'data:text/html,x' }), opts())).not.toContain('data:text');
    const h = placeInner(google({}, { mapsUri: 'https://maps.google.com/?q="><script>alert(1)</script>' }), opts());
    expect(h).not.toContain('<script>');
    expect(h).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('esc covers the five characters', () => {
    expect(esc('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
    expect(esc(null)).toBe('');
    expect(esc(12)).toBe('12');
  });

  it('a non-number rating or price is ignored, not printed', () => {
    const h = placeInner(google({}, { rating: '<b>5</b>', ratingCount: '<i>9</i>', priceLevel: '<u>2</u>' }), opts());
    expect(h).not.toMatch(/<b>|<i>|<u>/);
  });
});

describe('a refusal or a failure always leaves a card with a reason and a way out (I10)', () => {
  const where = { placeId: 'ChIJfixtureMall0000000001', at: { lat: 1.3044, lng: 103.8339 } };

  it('while the lookup runs, the card says so', () => {
    expect(loadingInner('en')).toContain('Looking up this place');
    for (const lang of PLACE_CARD_LOCALES) expect(loadingInner(lang).length, lang).toBeGreaterThan(10);
  });

  // The English line has an apostrophe, and the card escapes it like any other text: that is I7 holding, not a slip.
  it.each([
    ['cap', 'Today&#39;s place look-ups are used up'],
    ['budget', 'Place look-ups are paused until next month'],
    ['unavailable', 'Could not load this place'],
  ])('%s: says why, and offers Google Maps', (reason, text) => {
    const h = refusalInner(reason, { lang: 'en', ...where });
    expect(h).toContain(text);
    expect(h).toContain('Open in Google Maps');
    expect(h).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=1.3044%2C103.8339&amp;query_place_id=ChIJfixtureMall0000000001"');
  });

  it('an unknown reason, or none, reads as "could not load"', () => {
    for (const reason of ['no-session', 'bad-request', 'error', '', undefined, null, 42]) {
      expect(refusalInner(reason, { lang: 'en', ...where }), String(reason)).toContain('Could not load this place');
    }
  });

  it('with no position there is still a reason, just no link', () => {
    const h = refusalInner('cap', { lang: 'en' });
    expect(h).toContain('Today&#39;s place look-ups are used up');
    expect(h).not.toContain('href=');
  });
});

describe('links (Part C)', () => {
  it('the Google Maps link names the place by ID, with its position', () => {
    expect(mapsLink({ placeId: 'ChIJabc_DEF-0123456789', lat: 1.3044, lng: 103.8339 }))
      .toBe('https://www.google.com/maps/search/?api=1&query=1.3044%2C103.8339&query_place_id=ChIJabc_DEF-0123456789');
    expect(mapsLink({ placeId: '', lat: 1.3044, lng: 103.8339 })).toBe('https://www.google.com/maps/search/?api=1&query=1.3044%2C103.8339');
    expect(mapsLink({ placeId: 'ChIJabc_DEF-0123456789', lat: NaN, lng: 103.8 })).toBe('');
    expect(mapsLink(null)).toBe('');
  });

  it('the Cuisine link carries the position and the name the way Cuisine reads them', () => {
    const url = cuisineLink({ lat: 1.30441234567, lng: 103.83391234567, name: 'Fixture Plaza & Co' });
    expect(url.startsWith('/app/cuisine/#')).toBe(true);
    const p = new URLSearchParams(url.split('#')[1]);
    expect(p.get('lat')).toBe('1.304412');
    expect(p.get('lng')).toBe('103.833912');
    expect(p.get('place')).toBe('Fixture Plaza & Co');
  });

  it('a name longer than Cuisine keeps is cut to 80 characters; no position means no link', () => {
    const p = new URLSearchParams(cuisineLink({ lat: 1.3, lng: 103.8, name: 'x'.repeat(200) }).split('#')[1]);
    expect(p.get('place').length).toBe(80);
    expect(cuisineLink({ lat: NaN, lng: 103.8, name: 'x' })).toBe('');
    expect(cuisineLink(null)).toBe('');
  });

  it('resultMatch finds the result with the same Google place ID, and nothing else', () => {
    const venues = [{ placeId: 'ChIJone', name: 'One' }, { placeId: 'ChIJtwo', name: 'Two' }, null, { name: 'no id' }];
    expect(resultMatch(venues, 'ChIJtwo')).toBe(venues[1]);
    expect(resultMatch(venues, 'ChIJthree')).toBe(null);
    expect(resultMatch(venues, '')).toBe(null);
    expect(resultMatch(null, 'ChIJone')).toBe(null);
    expect(resultMatch(venues, undefined)).toBe(null);
  });
});

describe('every fixed line exists in all nine languages, with hyphens only (I9)', () => {
  it('the nine languages and the keys', () => {
    expect(PLACE_CARD_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
    // v0.62.993 (spec Amendment 1, F-9): two keys added, 'details' and 'notOperating'. The eleven before them are unchanged.
    expect(PLACE_CARD_KEYS).toEqual(['eateriesHere', 'eateriesNear', 'setLocation', 'fromGoogle', 'openMaps', 'probablyClosed', 'distance', 'loading', 'capReached', 'budgetReached', 'unavailable', 'details', 'notOperating']);
    expect(Object.keys(PLACE_CARD_STRINGS).sort()).toEqual([...PLACE_CARD_LOCALES].sort());
  });

  it.each(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'])('%s has every key, and only those keys', (lang) => {
    expect(Object.keys(PLACE_CARD_STRINGS[lang]).sort()).toEqual([...PLACE_CARD_KEYS].sort());
    for (const k of PLACE_CARD_KEYS) {
      const v = PLACE_CARD_STRINGS[lang][k];
      expect(typeof v === 'string' && v.trim().length > 0, `${lang}.${k}`).toBe(true);
      expect(v, `${lang}.${k} has a long dash`).not.toMatch(/[—–]/);
    }
  });

  it.each(['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'])('%s is not English left in place', (lang) => {
    for (const k of PLACE_CARD_KEYS) {
      expect(PLACE_CARD_STRINGS[lang][k], `${lang}.${k}`).not.toBe(PLACE_CARD_STRINGS.en[k]);
    }
  });

  it('the distance line keeps its placeholder in every language', () => {
    for (const lang of PLACE_CARD_LOCALES) {
      expect(PLACE_CARD_STRINGS[lang].distance, lang).toContain('{d}');
      expect(pct('distance', lang, { d: '350 m' }), lang).toContain('350 m');
      expect(pct('distance', lang, { d: '350 m' }), lang).not.toContain('{d}');
    }
  });

  it('an unknown language falls back to English, and an unknown key to an empty string', () => {
    expect(pct('setLocation', 'xx')).toBe('Set as my location');
    expect(pct('setLocation', undefined)).toBe('Set as my location');
    expect(pct('noSuchKey', 'en')).toBe('');
  });

  it('the card speaks the reader\'s language: no English button under a Korean heading', () => {
    const h = placeInner(google(), opts({ lang: 'ko', distanceM: 350 }));
    for (const k of ['eateriesHere', 'setLocation', 'fromGoogle', 'openMaps']) {
      expect(h, `ko ${k}`).toContain(esc(pct(k, 'ko')));
      expect(h, `en ${k} leaked`).not.toContain(pct(k, 'en'));
    }
  });
});
