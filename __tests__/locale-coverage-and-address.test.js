// __tests__/locale-coverage-and-address.test.js — v0.62.850.
//
// Two operator threads land here.
//
// 1. O-336, from a Russian screenshot whose card read "Barbecue" under Cyrillic chrome.
//    `cuisine-i18n.js` carried fr/zh/ja/es on every row and ru/de/id on none, so three of
//    the eight shipped locales fell through to English for every cuisine and venue type.
//    Measured before the fix: 95 rows, 95 missing ru, 95 missing de, 95 missing id.
//
// 2. *"would the foreign address being translated help?"* — asked with two examples that
//    are TRANSLITERATIONS rather than translations ("Телок Бланга Драйв",
//    "テロック・ブランガ・ドライブ"). That distinction is the design: a street name is a
//    proper noun, so the English line STAYS and the guide is additive. It helps a reader
//    read and say the address; it does not help them navigate, and replacing the Latin
//    form would have removed the only part a taxi driver can use.
//
// The coverage test asserts PER ROW rather than counting, because a total can be reached
// while individual rows are missing — and the comment in that file claiming ru/de/id fell
// through was itself out of date by the time anyone read it, which is the argument for
// checking the table instead of the prose.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pickAddressGuide } from '../web/_shared/lib/address-guide.js';
import {
  cuisineName, restaurantTypeName, CUISINE_SLUGS, VENUE_TYPE_SLUGS,
} from '../web/_shared/lib/cuisine-i18n.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// CI runs `npm ci` at the ROOT ONLY — `web/cuisine/node_modules` does not exist there, and
// `i18n.js` imports react for its two hooks. Importing it unmocked resolves in a sandbox
// that has built the TMAs and FAILS in CI, which is a green that means something other
// than it looks like (v0.62.834 shipped exactly that). `test-import-graph-guard` caught
// this file before CI did. The stub THROWS if a hook is actually called, so a future test
// that renders one fails loudly instead of quietly receiving a fake React.
vi.mock('react', () => {
  const nope = (name) => () => { throw new Error(`react.${name} called — this suite stubs react`); };
  return { useEffect: nope('useEffect'), useState: nope('useState'), useMemo: nope('useMemo'), default: {} };
});

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const LOCALES = ['fr', 'zh', 'ja', 'es', 'ru', 'de', 'id', 'ko'];

// v0.62.896 — THIS BLOCK USED TO SCAN THE SOURCE of web/cuisine/src/v2/lib/cuisine-i18n.js
// with a regex over `const NAMES = {`. It would have gone red on the move to
// web/_shared/lib/ while not one of the strings it checks had changed, and it could only
// ever prove a KEY was present — not that calling the function returns it. It now asserts
// by calling, which is the same repair name-guide.js's header prescribes and the fifth
// time this arc has had to make it.
//
// `ko` joined LOCALES here at v0.62.896. Operator IMG: the Cuisine sub-menu drew its
// headers in Korean (남아시아, 유럽) with every cuisine name under them still English,
// because the table had no `ko` column — 95 rows, 95 missing. This list is the guard
// against that recurring for a tenth locale.
const MISS = '\u0000not-covered';

describe('O-336 — every cuisine and venue type covers all eight non-English locales', () => {
  it('NAMES: no row falls through to English for any locale', () => {
    expect(CUISINE_SLUGS.length).toBeGreaterThan(0);
    const gaps = [];
    for (const slug of CUISINE_SLUGS) {
      for (const l of LOCALES) {
        if (cuisineName(slug, MISS, l) === MISS) gaps.push(`NAMES.${slug}.${l}`);
      }
    }
    expect(gaps, 'these render English to a reader who chose that locale').toEqual([]);
  });

  it('VENUE_TYPES: no row falls through to English for any locale', () => {
    expect(VENUE_TYPE_SLUGS.length).toBeGreaterThan(0);
    const gaps = [];
    for (const slug of VENUE_TYPE_SLUGS) {
      for (const l of LOCALES) {
        // restaurantTypeName returns its INPUT unchanged when it has nothing better to
        // say, so "came back as the slug" is exactly "not covered" here.
        if (restaurantTypeName(slug, l) === slug) gaps.push(`VENUE_TYPES.${slug}.${l}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('the counts are the ones that were measured, so a silent shrink is caught', () => {
    expect(VENUE_TYPE_SLUGS.length).toBe(26);
    expect(CUISINE_SLUGS.length).toBe(69);
  });

  it('the Korean names are the authored ones, not a locale key echoing English', () => {
    expect(cuisineName('south-indian', MISS, 'ko')).toBe('남인도');
    expect(cuisineName('european', MISS, 'ko')).toBe('유럽');
    expect(cuisineName('korean', MISS, 'ko')).toBe('한국');
    expect(restaurantTypeName('ice-cream', 'ko')).toBe('아이스크림');
  });

  it('and both Mini Apps read the SAME table — the copy that drifted cannot come back', async () => {
    const shared = await import('../web/_shared/lib/cuisine-i18n.js');
    const viaCuisine = await import('../web/cuisine/src/v2/lib/cuisine-i18n.js');
    const viaClipboard = await import('../web/clipboard/src/lib/cuisine-i18n.js');
    // Identity, not equality of output: a re-export is the same function object, a
    // second hand-kept copy is not. That is the property that failed before v0.62.896,
    // when the clipboard copy sat three locales and one whole table behind this one.
    expect(viaCuisine.cuisineName).toBe(shared.cuisineName);
    expect(viaClipboard.cuisineName).toBe(shared.cuisineName);
    expect(viaCuisine.restaurantTypeName).toBe(shared.restaurantTypeName);
    expect(viaClipboard.restaurantTypeName).toBe(shared.restaurantTypeName);
  });
});

describe('the Google Map label is translated, like its neighbours were', () => {
  it('the map card calls tr() instead of hardcoding it', () => {
    const src = read('web/cuisine/src/v2/components/MapPanel.jsx');
    expect(src).toMatch(/tr\('card\.googleMap', lang\)/);
    expect(src, 'the hardcoded English label is back').not.toMatch(/>Google Map ↗<\/a>/);
  });

  it('and the key exists in all eight locales', async () => {
    const m = await import('../web/cuisine/src/v2/lib/i18n.js');
    for (const l of ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']) {
      const v = m.t('card.googleMap', l);
      expect(v, `card.googleMap missing for ${l}`).not.toBe('card.googleMap');
      expect(v.length).toBeGreaterThan(0);
    }
    expect(m.t('card.googleMap', 'ru')).toBe('Google Карты');
    expect(m.t('card.googleMap', 'zh')).toBe('谷歌地图');
  });
});

describe('station names on the map card use the official register', () => {
  it('the transit block calls stationName rather than printing the raw name', () => {
    const src = read('web/cuisine/src/v2/components/MapPanel.jsx');
    // v0.62.852 — the call moved into `const shown = stationName(...)` when the station
    // guide was added. The REQUIREMENT is that the displayed name comes from the register,
    // not that the call sits inline. Fifth time an expression pin has broken on a refactor
    // while the behaviour held.
    expect(src).toMatch(/stationName\(s\.name \|\| '', lang\)/);
    expect(src, 'the raw station name is rendered again')
      .not.toMatch(/\$\{chips\} \$\{escapeHtml\(s\.name \|\| ''\)\}<\/a>/);
    // v0.62.852 — the call gained a third argument (the station pronunciation lookup).
    // The requirement is that `lang` reaches the block at all, not the exact arity.
    expect(src, 'lang is not threaded into the transit block')
      .toMatch(/transitBlockHtml\(transit, lang[,)]/);
  });
});

describe('streetOf — the address key', () => {
  let client;
  beforeEach(async () => {
    globalThis.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
    vi.resetModules();
    client = await import('../web/_shared/lib/pronounce-client.js');
  });

  it("finds the street even when it is not the first segment — the operator's own address", () => {
    // "Block 49, Telok Blangah Drive": segment one is a block number. Taking parts[0]
    // would have keyed on "Block 49" and asked the model to pronounce a numeral.
    expect(client.streetOf('Block 49, Telok Blangah Drive')).toBe('Telok Blangah Drive');
  });

  it('drops the house number so one road is one cached answer', () => {
    expect(client.streetOf('35 N Canal Rd, Unit 01-01, Singapore 059291')).toBe('N Canal Rd');
    expect(client.streetOf('37 N Canal Rd, Singapore 059291')).toBe('N Canal Rd');
    // The point of the two above: same key, so the second venue costs nothing.
    expect(client.streetOf('35 N Canal Rd, Singapore'))
      .toBe(client.streetOf('37 N Canal Rd, Singapore'));
  });

  it('handles the Malay forms this app sees across the causeway', () => {
    expect(client.streetOf('383 Jln Besar, Kam Leng Hotel, Singapore 209001')).toBe('Jln Besar');
    expect(client.streetOf('Jalan Sultan Ismail, Kuala Lumpur')).toBe('Jalan Sultan Ismail');
    expect(client.streetOf('Lorong 3 Geylang, Singapore')).toContain('Lorong');
  });

  it('returns nothing when no street is recognisable — a silent miss beats silent spend', () => {
    // An earlier draft fell back to parts[0] and returned "Singapore 059291", which would
    // have paid the model to pronounce a postcode.
    expect(client.streetOf('Singapore 059291')).toBe('');
    expect(client.streetOf('')).toBe('');
    expect(client.streetOf(null)).toBe('');
    expect(client.streetOf(undefined)).toBe('');
    expect(client.streetOf(42)).toBe('');
  });
});

describe('the address guide is ADDITIVE — the English line must survive', () => {
  it('the card still renders venue.area, and the guide is a separate line', () => {
    const src = read('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src, 'the English address line was replaced rather than supplemented')
      .toMatch(/📍 \{horizontal \? abbrevAddress\(dropCountry\(venue\.area\)\)/);
    // v0.62.895 — the inline condition moved into pickAddressGuide(); the guide being a
    // SEPARATE line from the English one is still a source fact, so that part is grepped.
    expect(src).toMatch(/pickAddressGuide\(venue, streetSay, addrStreet\)/);
  });

  it('and it is suppressed when the guide just echoes the street', () => {
    // An English reader gets no second line, because the guide equals the street.
    // Asserted by calling it rather than by grepping the condition it used to be.
    expect(pickAddressGuide({ area: '1 Raffles Place' }, 'Raffles Place', 'Raffles Place')).toBeNull();
    expect(pickAddressGuide({ area: '1 Raffles Place' }, 'РАФ-фелс Плейс', 'Raffles Place').key).toBe('say');
  });

  it('App batches names AND streets in one request', () => {
    const src = read('web/cuisine/src/v2/App.jsx');
    expect(src).toMatch(/venueStreetsRaw = \(venues \|\| \[\]\)\.map\(\(v\) => streetOf\(/);
    expect(src).toMatch(/new Set\(\[\.\.\.venueNamesRaw, \.\.\.venueStreetsRaw\]\)/);
    expect(src, 'the batch key must cover both lists or the memo pins to a stale page')
      .toMatch(/JSON\.stringify\(\[venueNamesRaw, venueStreetsRaw\]\)/);
  });

  it('the map popup carries both lines too', () => {
    const src = read('web/cuisine/src/v2/components/MapPanel.jsx');
    // v0.62.851 — both lookups moved behind `sayOf`, which prefers the shared projection
    // and falls back to the module cache (Codex #1792 P2-1: the markers were built from a
    // cold cache and never rebuilt). The REQUIREMENT is unchanged and is what is asserted —
    // the popup resolves a guide for the name and for the street. Pinning the expression
    // has now broken on refactor four times; this pins the behaviour instead.
    expect(src).toMatch(/const nameSay = sayOf\(v\.name \|\| ''\)/);
    expect(src).toMatch(/const vStreetSay = vStreet \? sayOf\(vStreet\) : null/);
    expect(src).toMatch(/\$\{sayHtml\}\$\{addressHtml\}\$\{streetSayHtml\}/);
  });
});
