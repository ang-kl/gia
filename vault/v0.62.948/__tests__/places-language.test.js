// __tests__/places-language.test.js — v0.62.896
//
// Operator: *"do the places languageCode change."*
//
// Six call sites each wrote `lang === 'fr' ? 'fr' : 'en'` by hand, so eight of the nine
// shipped locales asked Google Places for English. A Korean reader searching Seoul got an
// English venue name and an English address from a bot that had spoken Korean on every
// other surface since v0.62.884.
//
// The change is one line at each site. THE TESTS HERE ARE MOSTLY NOT ABOUT THAT LINE —
// they are about the four downstream checks that read Google's strings as if they were
// English, because Places returns ONE language per call: asking for Korean removes the
// English string, it does not add a second one. Each compensation is asserted by CALLING,
// which is why humaniseRestaurantType had to leave index.js first (see venue-type-label.js).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  placesLanguage, isGenericTypeLabel, GENERIC_TYPE_WORDS_BY_LANG, SINGAPORE_RE, JOHOR_RE,
} = require('../places-language');
const { humaniseRestaurantType } = require('../venue-type-label');
const { scopeVenuesByRegion } = require('../cuisine-geo-scope');
const { demoteNeverEmpty } = require('../pool-floor');
const { SUPPORTED } = require('../i18n');
const { readFileSync } = require('fs');
const { join } = require('path');

const read = (p) => readFileSync(join(__dirname, '..', p), 'utf8');

describe('placesLanguage — every shipped locale reaches Google, not just French', () => {
  it('no SUPPORTED locale collapses to English any more', () => {
    // THE DEFECT, replayed as a list. Before v0.62.896 this array held eight entries.
    const collapsed = SUPPORTED.filter((l) => l !== 'en' && placesLanguage(l) === 'en');
    expect(collapsed, 'these readers still get English from Google').toEqual([]);
  });

  it('every locale maps to a language TAG, never to a display string', () => {
    for (const l of SUPPORTED) {
      expect(placesLanguage(l), l).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    }
  });

  it('zh is pinned Simplified, because the bot\'s own zh strings are', () => {
    // Google accepts a bare `zh` and resolves it by region — which would put Traditional
    // venue names next to 谷歌地图 and 新加坡. Pin it rather than let the region decide.
    expect(placesLanguage('zh')).toBe('zh-CN');
  });

  it('an unshipped or missing locale falls back rather than being forwarded', () => {
    for (const bad of ['pt', 'xx', '', null, undefined, 'EN ']) {
      expect(placesLanguage(bad), String(bad)).toBe('en');
    }
    expect(placesLanguage('KO')).toBe('ko');   // case-insensitive, not case-fragile
  });

  it('the three request sites and the Michelin cache key all use it', () => {
    // A source pin, and named as one: these are `languageCode:` properties inside axios
    // payloads in a file that exports nothing, so there is no object to call. What the
    // pin is actually guarding is that the CACHE KEY and the REQUEST agree — widening the
    // fetch while leaving `michelin:place:v2:<lang>` keyed fr-or-en would have served a
    // Korean reader the French blob, which is a poisoning bug wearing a fix's clothes.
    const idx = read('index.js');
    expect(idx).toMatch(/languageCode: placesLanguage\(lang\)/);
    expect(idx).toMatch(/const cacheLang = placesLanguage\(csLang\)/);
    expect(idx.match(/languageCode: cacheLang/g) || [], 'both Michelin calls').toHaveLength(2);
    expect(idx, 'a fr-or-en Places ternary is back').not.toMatch(/languageCode: \w+ === 'fr'/);
    expect(read('pipeline.js')).toMatch(/const languageCode = placesLanguage\(lang\)/);
  });
});

describe('compensation 1 — the venue-type line hides a generic label in EVERY locale', () => {
  // This is the check that would have caught the Korean case. `_isGenericType` used to ask
  // an ENGLISH word set whether a KOREAN string was generic, got "no", and returned 음식점
  // — the useless label step (4) exists to hide.
  it('isGenericTypeLabel knows the generic word in all nine locales', () => {
    const missed = [];
    for (const [lang, words] of Object.entries(GENERIC_TYPE_WORDS_BY_LANG)) {
      for (const w of words) if (!isGenericTypeLabel(w)) missed.push(`${lang}:${w}`);
    }
    expect(missed).toEqual([]);
    expect(Object.keys(GENERIC_TYPE_WORDS_BY_LANG).sort()).toEqual([...SUPPORTED].sort());
  });

  it('and does not swallow a SPECIFIC label that merely looks generic', () => {
    for (const s of ['Café', 'Bakery', 'Sushi', '寿司', '카페', 'Ресторан быстрого питания']) {
      expect(isGenericTypeLabel(s), s).toBe(false);
    }
  });

  it('humaniseRestaurantType hides a bare eatery label, whatever language it arrives in', () => {
    const shown = [];
    for (const [lang, words] of Object.entries(GENERIC_TYPE_WORDS_BY_LANG)) {
      // Google's primaryTypeDisplayName IS the display of primaryType, so a generic enum
      // always pairs with a generic label — that is why consulting the enum first is safe
      // rather than a narrowing.
      const got = humaniseRestaurantType(words[0], 'restaurant', []);
      if (got !== '') shown.push(`${lang}: ${JSON.stringify(got)}`);
    }
    expect(shown, 'a reader is being shown the word "restaurant" as if it meant something').toEqual([]);
  });

  it('while the specific labels the function exists for still come through', () => {
    expect(humaniseRestaurantType('Cantonese restaurant', 'cantonese_restaurant', [])).toBe('Cantonese');
    expect(humaniseRestaurantType('Restaurant japonais', 'japanese_restaurant', [])).toBe('japonais');
    expect(humaniseRestaurantType('한국 음식점', 'korean_restaurant', [])).toBe('한국 음식점');
    // v0.62.117's case: generic everywhere except types[].
    expect(humaniseRestaurantType('Restaurant', 'restaurant', ['gluten_free_restaurant'])).toBe('Gluten Free');
    // (3) the enum itself is specific.
    expect(humaniseRestaurantType('', 'cafe', [])).toBe('Cafe');
    // the Michelin path passes an empty enum and must not be silenced by it.
    expect(humaniseRestaurantType('Modern Cuisine', '')).toBe('Modern Cuisine');
  });
});

describe('compensation 2 — the SG↔JB cross-border gate survives a localised address', () => {
  const v = (distanceM, props = {}) => ({ name: 'x', area: '', distanceM, ...props });
  const deps = () => ({
    demoteNeverEmpty,
    locationMode: { isFarFromJB: () => false, haversineMeters: () => 100000, JB_CBD: { lat: 1.46, lng: 103.76 } },
    logger: { log: () => {}, warn: () => {} },
  });

  it('a Johor venue addressed in Korean, Chinese or Japanese is still excluded from an SG pool', async () => {
    // The failure this prevents is the quiet direction: the gate would have stopped
    // matching and let the venue THROUGH, which looks like a slightly wider search rather
    // than like a broken filter.
    for (const area of ['말레이시아 조호르바루', '马来西亚柔佛新山', 'ジョホールバル', 'Johor Bahru']) {
      const venues = [v(10000, { name: 'sgVenue' }), v(8000, { name: 'jbVenue', area })];
      const r = await scopeVenuesByRegion({ venues, anchorCap: 30000, lat: 1.3, lng: 103.8, ...deps() });
      expect(r.venues.map((x) => x.name), area).toEqual(['sgVenue']);
    }
  });

  it('and a Singapore venue addressed in Korean is still excluded from a JB pool', async () => {
    for (const area of ['싱가포르 048542', '新加坡 048542', 'Singapore 048542']) {
      const venues = [v(5000, { name: 'jbVenue' }), v(5000, { name: 'sgVenue', area })];
      const r = await scopeVenuesByRegion({ venues, isJB: true, lat: 1.46, lng: 103.76, ...deps() });
      expect(r.venues.map((x) => x.name), area).toEqual(['jbVenue']);
    }
  });

  it('the anchoring of BOTH original regexes is preserved, quirks included', () => {
    // /singapore/i was unanchored and /\bjohor\b/i was not. "Singaporean Grill" therefore
    // matched the first and "Johorean" never matched the second. Both are arguably wrong;
    // repairing either inside a translation change would be a scoping change nobody asked
    // for, so the quirks are pinned rather than tidied.
    expect(SINGAPORE_RE.test('Singaporean Grill')).toBe(true);
    expect(JOHOR_RE.test('Johorean Kitchen')).toBe(false);
    expect(JOHOR_RE.test('Johor Bahru')).toBe(true);
  });
});

describe('what this change COSTS is written down, not discovered later', () => {
  it('places-language.js names each downstream check that reads Google as English', () => {
    // Four were found. Two are compensated above; two are recorded as degradations.
    // A header that lists three has lost one, and the one it loses is the one nobody
    // re-derives — this arc has three separate entries for a gate whose premise expired
    // while the gate stayed.
    const src = read('places-language.js');
    for (const name of ['cuisine-geo-scope.js', 'humaniseRestaurantType', 'venue-filters.js', 'dish-evidence']) {
      expect(src, `${name} is not named in the cost list`).toContain(name);
    }
  });
});
