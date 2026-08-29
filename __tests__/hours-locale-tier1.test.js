// __tests__/hours-locale-tier1.test.js — v0.62.827, Tier 1 of the re-localisation plan.
//
// THE ASK: "If I switch the language in Cuisine TMA, can we translate the display on the
// spot — not a refresh, because a refresh brings another set of eateries."
//
// Most of the card already does. `useLocale()` is React state, so every `t(key, lang)`
// string re-renders the instant the toggle is tapped. What did not switch was anything the
// SERVER had already rendered into a string, and the hours line is the one such field that
// is pure computation over data the server already holds.
//
// WHAT WAS TRIED FIRST AND FAILED, so nobody repeats it. The plan was to ship the INPUTS
// (`periods` + `utcOffsetMinutes` — which the server deletes) and import `open-hours.js`
// into the TMA from `web/_shared/lib/`, formatting at render. That would also have fixed
// staleness. Rollup refused it, measured:
//
//     "ohLang" is not exported by "../../open-hours.js", imported by "src/__probe.js"
//
// because the root package is CommonJS and `web/cuisine` is `"type": "module"`. Converting
// open-hours.js to ESM moves the break onto four CJS server call sites and its own test;
// keeping a second copy is the drift O-335 was about. So: render all eight here, let the
// client pick. 374 bytes a venue, measured — LESS than the 561 the periods would have cost.
//
// WHAT THIS DOES NOT FIX, and the test says so rather than the reader discovering it: the
// labels are still computed at SEARCH time and age exactly as today's single label does.
import { describe, it, expect } from 'vitest';
const fs = require('fs');

const oh = require('../open-hours.js');
const INDEX = fs.readFileSync(require.resolve('../index.js'), 'utf8');
const ENRICH = fs.readFileSync(require.resolve('../cuisine-enrich.js'), 'utf8');
const CARD = fs.readFileSync('web/cuisine/src/v2/components/ResultCard.jsx', 'utf8');
const PANEL = fs.readFileSync('web/cuisine/src/v2/components/ResultPanel.jsx', 'utf8');

const CLOSED = [{ open: { day: 0, hour: 11, minute: 30 }, close: { day: 0, hour: 14, minute: 0 } }];
const AT = new Date('2026-08-29T12:00:00+09:00');   // a Saturday noon in Tokyo — closed

describe('the hours line exists in every locale at once', () => {
  it('one call returns all eight, keyed by OH_LANGS', () => {
    const m = oh.closedTodayByLang(CLOSED, AT, 540);
    expect(Object.keys(m).sort()).toEqual([...oh.OH_LANGS].sort());
  });

  it('and they are eight DIFFERENT strings, not eight fallbacks to English', () => {
    // The failure this catches is the quiet one: a phrase table that falls back returns a
    // string for every locale and passes any "is it a string" check.
    const m = oh.closedTodayByLang(CLOSED, AT, 540);
    expect(new Set(Object.values(m)).size).toBe(oh.OH_LANGS.length);
    expect(m.ja).toBe('本日休業 · 日 11:30 開店');
    expect(m.en).toBe('Closed today · Opens Sun 11:30 AM');
  });

  it('the map is empty when there is nothing to say, rather than eight empty strings', () => {
    // A venue that is closed has no "currently open" line. Shipping eight blanks would be
    // 8 keys of payload saying nothing, and would defeat the `|| scalar` fallback below.
    expect(oh.currentOpenByLang(CLOSED, AT, 540)).toEqual({});
  });

  it('the locale set is DERIVED, so adding a language to the phrase table is enough', () => {
    // NOT `expect(OH_LANGS).toEqual(<the same list rebuilt>)` — the first draft of this
    // test did exactly that and proved nothing. What matters is that the builder LOOPS the
    // derived list instead of naming locales, which is the fifth-hand-copy O-335 was about.
    const OH = fs.readFileSync(require.resolve('../open-hours.js'), 'utf8');
    expect(OH).toContain('for (const l of OH_LANGS)');
    const named = OH.slice(OH.indexOf('function _byLang'))
      .match(/'(en|fr|id|ru|de|zh|ja|es)'/g) || [];
    expect(named, 'a locale is named by hand below the derivation').toEqual([]);
  });
});

describe('all three server paths attach it — the same three that used to disagree', () => {
  // COUNTS, not `toContain`, and the first draft of this test got that wrong. Each file
  // attaches each label TWICE — once in the explicit openNow branch and once in the
  // openNow-UNKNOWN branch that v0.62.x added. A `toContain` matched the second and passed
  // while the first was deleted: proved by mutation, the deletion verified to have applied
  // (2 occurrences → 1) before trusting the green. A gate that cannot see half its subject
  // is the shape this repo keeps finding, and it nearly shipped inside the test for it.
  const count = (hay, needle) => hay.split(needle).length - 1;

  it('the general search path (cuisine-enrich) attaches both, in both branches', () => {
    expect(count(ENRICH, 'v.closedTodayByLang = ')).toBe(2);
    expect(count(ENRICH, 'v.openClosingByLang = ')).toBe(2);
    expect(ENRICH).toContain('closedTodayByLang(periods, now, offset)');
  });

  it('the Michelin and free-text paths (index.js) attach both, once each', () => {
    expect(count(INDEX, 'v.closedTodayByLang = ')).toBe(2);   // Michelin + free-text
    expect(count(INDEX, 'v.openClosingByLang = ')).toBe(2);
    expect(INDEX).toContain('closedTodayByLang(periods, nowTL, offset)');       // Michelin
    expect(INDEX).toContain('closedTodayByLangNL(periodsNL, nowNL, offsetNL)'); // free-text
  });

  it('the maps track the scalars one-for-one, so neither can be attached alone', () => {
    // If a future branch sets the scalar without the map, that locale silently reverts to
    // the search-time language for that venue only — the hardest kind of bug to see.
    expect(count(ENRICH, 'v.closedTodayByLang = ')).toBe(count(ENRICH, 'v.closedTodayLabel = '));
    expect(count(INDEX, 'v.closedTodayByLang = ')).toBe(count(INDEX, 'v.closedTodayLabel = '));
    expect(count(ENRICH, 'v.openClosingByLang = ')).toBe(count(ENRICH, 'v.openClosingLabel = '));
    expect(count(INDEX, 'v.openClosingByLang = ')).toBe(count(INDEX, 'v.openClosingLabel = '));
  });

  it('and none of them dropped the scalar label, which another consumer needs', () => {
    // Copy-All posts a whitelisted venue back to the server, which re-renders the chat
    // message with formatVenueBlock in the CHAT language. That path reads the scalar. If
    // the scalar had been replaced rather than joined, copy would have silently degraded
    // while the card looked right — the O-305 shape, from the other direction.
    expect(PANEL).toContain('closedTodayLabel: v.closedTodayLabel,');
    expect(PANEL).toContain('openClosingLabel: v.openClosingLabel,');
    expect(ENRICH).toContain('v.closedTodayLabel = closedTodayString(');
    expect(INDEX).toContain('v.openClosingLabel = currentOpenString(');
  });
});

describe('the card prefers the map and survives without it', () => {
  it('reads the language-keyed value first', () => {
    expect(CARD).toContain("venue.openClosingByLang && venue.openClosingByLang[lang]");
    expect(CARD).toContain("venue.closedTodayByLang && venue.closedTodayByLang[lang]");
  });

  it('falls back to the scalar, so an older payload renders exactly as before', () => {
    // Cached responses and any path not yet taught the map must not render blank.
    expect(CARD).toContain('|| venue.openClosingLabel;');
    expect(CARD).toContain('|| venue.closedTodayLabel;');
  });

  it('the fallback chain behaves, exercised rather than asserted', () => {
    const pick = (venue, lang) =>
      (venue.closedTodayByLang && venue.closedTodayByLang[lang]) || venue.closedTodayLabel;
    const withMap = { closedTodayByLang: oh.closedTodayByLang(CLOSED, AT, 540), closedTodayLabel: 'EN scalar' };
    expect(pick(withMap, 'ja')).toBe('本日休業 · 日 11:30 開店');
    expect(pick(withMap, 'ko')).toBe('EN scalar');          // a locale open-hours cannot speak
    expect(pick({ closedTodayLabel: 'EN scalar' }, 'ja')).toBe('EN scalar');  // old payload
    expect(pick({}, 'ja')).toBeUndefined();                  // nothing at all — no throw
  });
});
