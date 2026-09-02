// The map layer speaks the reader's language — station names, bus stops, addresses.
//
// WHAT THIS GUARDS. The operator reported three things: the Hawker TMA not translating the train
// station name or the address, and the Transport TMA's station pill and bus stop still English.
// All three were one cause — the three mapOverlays.js copies wired `secondLine()` to exactly ONE
// thing, the MRT line name, and nothing else. The correct behaviour sat inches away the whole
// time: MrtMapPanel.jsx:719 already called `stationName(s.name, lang)` for the popup while the
// pill for the same station on the same map got a raw English name with `' station'` welded on.
//
// ⚠ COMMENTS ARE MASKED, AND THAT IS NOT DEFENSIVE PROGRAMMING — IT IS THE TWELFTH TIME. The
// comment recording the removal of `(nice + ' station')` necessarily CONTAINS `' station'`, so an
// unmasked scan reports three hits in exactly the three files that were fixed.
//
// The masker below was going to be lifted verbatim from `__tests__/bot-ternary-sweep.test.js`, as
// every previous occurrence of this trap was. It is NOT — that one is broken, and the note above
// `maskComments` records what was measured. This file carries a corrected copy rather than a
// borrowed one.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

import { SG_TERMS, TERM_LOCALES, ABBREV, NOT_TERMS, termLocal, expandStWord } from '../web/_shared/lib/sg-terms-i18n.js';
import { placeLocal, placeSecondLine, nounLocal } from '../web/_shared/lib/sg-place-text.js';
import { stationDisplay, stationDisplayIsLocal } from '../web/_shared/lib/station-display.js';
import { CHROME, LOCALES } from '../web/_shared/lib/station-card-labels.js';
import { maskComments } from './helpers/mask-comments.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COPIES = {
  transport: 'web/transport/src/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
};
const SRC = Object.fromEntries(Object.entries(COPIES)
  .map(([k, p]) => [k, fs.readFileSync(path.join(ROOT, p), 'utf8')]));


const CODE = Object.fromEntries(Object.entries(SRC).map(([k, s]) => [k, maskComments(s)]));

describe('the map layer speaks the reader\'s language', () => {
  it('⚠ no overlay welds an English word onto a station name any more', () => {
    // The masking must actually be doing something, or this passes for the wrong reason: the
    // string IS still present in all three files, in the comment explaining its removal.
    const inComments = Object.values(SRC).filter((s) => s.includes("' station'")).length;
    expect(inComments, 'the comments recording the fix are gone — re-check what this is measuring').toBe(3);
    for (const [name, code] of Object.entries(CODE)) {
      expect(code, `${name} still builds a station label by concatenation`).not.toContain("' station'");
    }
  });

  it('every station render site goes through stationDisplay', () => {
    for (const [name, code] of Object.entries(CODE)) {
      expect(code, `${name} does not import stationDisplay`).toContain('stationDisplay');
      // scLabel('station', …) interpolates a RAW name — that is the defect, not the fix.
      expect(code, `${name} still interpolates a raw name into the station template`)
        .not.toMatch(/scLabel\(\s*'station'/);
    }
  });

  it('the bus popup and the postal line are localised in all three copies', () => {
    for (const [name, code] of Object.entries(CODE)) {
      for (const gone of ["'Stop '", 'Loading arrivals', 'No live arrivals', "Singapore ' +", "' stalls'"]) {
        expect(code, `${name} still hardcodes ${gone}`).not.toContain(gone);
      }
      expect(code, `${name} does not render a translated bus road name`).toContain('placeSecondLine');
      expect(code, `${name} does not use the postal label`).toContain("scLabel('postal'");
    }
  });

  it('⚠ the register form is never wrapped in the localised template', () => {
    // stationName('Simei','zh') is 四美地铁站 — it already ends in 站. Passing it through
    // scLabel('station','zh') whose template is `{name}站` would yield 四美地铁站站.
    expect(stationDisplay('Simei', 'zh')).toBe('四美地铁站');
    expect(stationDisplay('Simei', 'zh')).not.toMatch(/站站$/);
    expect(stationDisplay('Ang Mo Kio', 'zh')).toBe('宏茂桥地铁站');
    // Where the register is silent, the local name goes INTO the localised template.
    expect(stationDisplay('Simei', 'ko')).toBe('시메이역');
    expect(stationDisplay('Simei', 'ja')).toBe('シメイ駅');
    // And English is unchanged in substance.
    expect(stationDisplay('Simei', 'en')).toBe('Simei Station');
    expect(stationDisplay('', 'zh')).toBe('');
  });

  it('stationDisplayIsLocal reports whether the reader\'s language was actually reached', () => {
    expect(stationDisplayIsLocal('Simei', 'zh')).toBe(true);
    expect(stationDisplayIsLocal('Simei', 'ko')).toBe(true);
    // French has no row for a proper-noun station — the template localises, the name does not.
    expect(stationDisplayIsLocal('Simei', 'fr')).toBe(false);
    expect(stationDisplayIsLocal('Simei', 'en')).toBe(false);
  });

  it('every vocabulary term carries all eight non-English locales', () => {
    const missing = [];
    for (const [k, row] of Object.entries(SG_TERMS)) {
      for (const l of TERM_LOCALES) if (!row[l] || !String(row[l]).trim()) missing.push(`${k}.${l}`);
    }
    expect(missing, 'a place term landed half-translated').toEqual([]);
    // v0.62.916 — THE COUNT PIN MOVED, IT WAS NOT DELETED. It read `toBe(61)` with the message
    // "bump this deliberately", and the vocabulary grew to 69 when the harvester showed eight
    // common nouns sitting in the proper-noun bucket only because this table lacked them. Rather
    // than change 61 to 69 here AND in the new `__tests__/sg-terms.test.js`, the number is pinned
    // once, there, next to the classification that produced it. Two pins on one figure is the
    // duplicate-that-drifts this arc keeps finding — the ABBREV maps had drifted by two keys
    // under a comment claiming a guard that did not exist.
    expect(Object.keys(SG_TERMS).length, 'the vocabulary shrank below what the map layer needs')
      .toBeGreaterThanOrEqual(61);
    expect(TERM_LOCALES).toEqual(['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });

  it('⚠ every abbreviation resolves to a term, or is named as deliberately not one', () => {
    // Covered, or exempt with a stated reason, and anything else fails — the ERASURE_EXEMPT shape.
    // `bt`/`tg`/`mt` expand (the noun lookup needs "Bukit Timah", not "Bt Timah") but must NOT
    // translate: 武吉知马 is one proper noun, and "Hill Timah" is not a place.
    const orphans = [...new Set(Object.values(ABBREV))]
      .filter((v) => !Object.prototype.hasOwnProperty.call(SG_TERMS, v))
      .filter((v) => !Object.prototype.hasOwnProperty.call(NOT_TERMS, v));
    expect(orphans, 'an abbreviation expands to a word with no translation and no stated exemption').toEqual([]);
    for (const [k, why] of Object.entries(NOT_TERMS)) {
      expect(String(why).length, `${k} is exempt without a reason`).toBeGreaterThan(20);
      expect(SG_TERMS[k], `${k} is both exempt and translated`).toBeUndefined();
    }
  });

  it('the Saint / Street ambiguity is resolved by position, not by a map entry', () => {
    // `st: 'street'` in ABBREV would rewrite "St Andrew's Road" to "Street Andrew's Road".
    expect(ABBREV.st).toBeUndefined();
    expect(expandStWord('St', true)).toBe('saint');
    expect(expandStWord('St', false)).toBe('street');
    expect(expandStWord('Rd', false)).toBeNull();
    expect(placeLocal("St Andrew's Rd", 'fr').text).toContain('Saint');
    expect(placeLocal('Upper Cross St', 'fr').text).toContain('Rue');
  });

  it('⚠ placeLocal returns null for English and never echoes an untranslated string', () => {
    expect(placeLocal('Maxwell Rd', 'en')).toBeNull();
    expect(placeLocal('', 'zh')).toBeNull();
    // A string with nothing translatable reports changed:false rather than passing itself off.
    const none = placeLocal('Zzzz Qqqq', 'zh');
    expect(none.changed, 'an untranslatable string claimed it changed').toBe(false);
    expect(placeSecondLine('Zzzz Qqqq', 'zh'), 'an English echo reached the bracket').toBeNull();
  });

  it('⚠ proper nouns match as PHRASES, not tokens', () => {
    // 앙모키오 is a reading of the whole name. "Ang" alone has none, and three concatenated
    // fragments would not be one either — matching token-wise produced exactly that.
    expect(nounLocal('Ang Mo Kio', 'ko')).toBe('앙모키오');
    expect(nounLocal('Ang', 'ko')).toBeNull();
    expect(placeLocal('Ang Mo Kio Ave 3', 'ko').text).toContain('앙모키오');
    expect(placeLocal('Ang Mo Kio Ave 3', 'ko').text).not.toMatch(/앙\s*모\s*키오\s*키오/);
  });

  it('⚠ head-final languages put the position last and the number first', () => {
    // "Opp Blk 123" is 123座对面 in Chinese, not 对面座123. A rider reading the latter cannot tell
    // which side of the road to stand on, which is the one thing a bus stop name exists to say.
    expect(placeLocal('Opp Blk 123', 'zh').text).toBe('123座对面');
    expect(placeLocal('Opp Blk 123', 'ko').text).toBe('123동 맞은편');
    // Latin-script locales keep English order.
    expect(placeLocal('Opp Blk 123', 'fr').text).toBe('En face de Bloc 123');
  });

  it('⚠ joining is decided by script, not by locale', () => {
    // "18 Raffles Quay" in Chinese: Raffles is an unknown noun and stays Latin, so the digit and
    // the Latin word must keep their space even though the locale is zh.
    expect(placeLocal('18 Raffles Quay', 'zh').text).toBe('18 Raffles 码头');
    // Korean spaces its words; only a road-type suffix and a counter attach.
    expect(placeLocal('Aft Bedok North Rd', 'ko').text).toBe('베독 북로 이후');
    expect(placeLocal('Maxwell Rd', 'ko').text).toBe('맥스웰로');
    expect(placeLocal('Maxwell Rd', 'zh').text).toBe('麦士威路');
  });

  it('an unknown proper noun stays in English rather than being guessed at', () => {
    const r = placeLocal('Nonesuch Rd', 'ko');
    expect(r.text).toContain('Nonesuch');
    expect(r.unknownNouns).toBe(1);
    expect(r.changed, 'the road type still translated').toBe(true);
  });

  it('the four new chrome labels carry all nine locales', () => {
    for (const key of ['stopFallback', 'arrivalsLoading', 'arrivalsNone', 'postal', 'stalls']) {
      expect(CHROME[key], `${key} is missing`).toBeTruthy();
      for (const l of LOCALES) {
        expect(CHROME[key][l], `${key}.${l} is missing`).toBeTruthy();
      }
    }
  });

  it('the overlay stalls wording matches the Hawker app rather than being re-translated', () => {
    // Two independent translations of one string is a drift waiting to happen.
    const i18n = fs.readFileSync(path.join(ROOT, 'web/hawker/src/i18n.js'), 'utf8');
    for (const [lang, frag] of [['id', 'kios'], ['ru', 'прилавков'], ['de', 'Stände'],
      ['zh', '个摊位'], ['ja', '店舗'], ['es', 'puestos'], ['ko', '점포']]) {
      expect(CHROME.stalls[lang], `stalls.${lang} drifted from the Hawker app`).toContain(frag);
      expect(i18n, `the Hawker app no longer says ${frag} — re-sync this`).toContain(frag);
    }
  });
});
