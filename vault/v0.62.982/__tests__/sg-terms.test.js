// The place vocabulary, and the guard its own header has cited since v0.62.911.
//
// `sg-terms-i18n.js` says, in a comment shipped four releases ago:
//
//     "the map is duplicated on purpose and `__tests__/sg-terms.test.js` asserts the two agree"
//
// **This file did not exist.** Nothing in `__tests__/` referenced `sg-address.js` at all, and the
// drift that sentence predicts had already happened: measured on 03-09 '26, the Mini App map held
// 31 keys and the server's held 29 — `ln: lane` and `pl: place` were missing server-side, so the
// bot rendered "Ln" where the Mini App rendered "Lane".
//
// That is worth stating plainly rather than quietly fixing. A comment asserting a safeguard is not
// a safeguard; it is the most convincing possible way to look like one, because a reader who
// checks whether the invariant is guarded finds a sentence saying yes. The same header also named
// `sg-nouns-i18n.generated.js` as the home of proper nouns, and that file has never existed either.
//
// ⚠ EVERYTHING HERE IS ASSERTED BY LOADING AND CALLING, NEVER BY REGEX. Two source-scan pins broke
// in v0.62.915 while the behaviour they guarded was intact, and the first draft of the ABBREV
// comparison below returned `0 keys` because it required lowercase values where `sg-address.js`
// capitalises them — a checker that parses nothing reports a clean sweep of nothing. The one place
// a regex is unavoidable (reading a CJS object literal from an ESM test) throws on an empty parse.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

import { SG_TERMS, TERM_LOCALES, ABBREV, NOT_TERMS, expandAbbrev, expandStWord, termLocal }
  from '../web/_shared/lib/sg-terms-i18n.js';
import { harvest, placeStrings } from '../scripts/harvest-sg-place-spans.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The server's copy of the map, read from its source. Throws rather than report on nothing. */
function serverAbbrev() {
  const src = fs.readFileSync(path.join(ROOT, 'sg-address.js'), 'utf8');
  const m = /const ABBREV = \{([\s\S]*?)\n\};/.exec(src);
  if (!m) throw new Error('sg-address.js: no ABBREV literal found — the shape changed');
  const out = {};
  // ⚠ `[A-Za-z]+`, not `[a-z]+`. sg-address.js writes 'Road'; sg-terms-i18n.js writes 'road'.
  // Requiring lowercase parsed zero entries and reported perfect agreement between a map of 31
  // and a map of 0 — the exact vacuous pass this file exists to make impossible.
  for (const e of m[1].matchAll(/([a-z]+)\s*:\s*'([A-Za-z]+)'/g)) out[e[1]] = e[2].toLowerCase();
  if (!Object.keys(out).length) throw new Error('sg-address.js: parsed zero ABBREV entries');
  return out;
}

describe('the two ABBREV maps agree', () => {
  const server = serverAbbrev();

  it('the parse is not vacuous', () => {
    // Both floors matter: a checker comparing two empty objects passes.
    expect(Object.keys(server).length).toBeGreaterThan(20);
    expect(Object.keys(ABBREV).length).toBeGreaterThan(20);
  });

  it('⚠ neither map holds a key the other lacks', () => {
    const onlyServer = Object.keys(server).filter((k) => !(k in ABBREV));
    const onlyApp = Object.keys(ABBREV).filter((k) => !(k in server));
    expect(onlyServer, 'sg-address.js expands something the Mini Apps cannot').toEqual([]);
    expect(onlyApp, 'the Mini Apps expand something the server leaves abbreviated').toEqual([]);
  });

  it('every shared key expands to the same word', () => {
    const differ = Object.keys(server)
      .filter((k) => k in ABBREV && server[k] !== ABBREV[k])
      .map((k) => `${k}: ${server[k]} vs ${ABBREV[k]}`);
    expect(differ, 'the same abbreviation expands two ways').toEqual([]);
  });

  it('⚠ the drift this guard was written for is closed, checked by CALLING', () => {
    // `ln` and `pl` were the two keys missing server-side. Asserted through the server's own
    // exported function rather than by looking for them in the map, so a future refactor that
    // moves the map but keeps the behaviour does not fail this.
    const { expandSgAbbrev } = require('../sg-address.js');
    expect(expandSgAbbrev('5 Simei Ln')).toBe('5 Simei Lane');
    expect(expandSgAbbrev('Raffles Pl')).toBe('Raffles Place');
    // …and the Mini App side agrees on the same two.
    expect(expandAbbrev('Ln')).toBe('lane');
    expect(expandAbbrev('Pl')).toBe('place');
  });

  it('`st` is in NEITHER map, and is resolved by position instead', () => {
    // `st: 'street'` would rewrite "St Andrew's Road" to "Street Andrew's Road". Both files leave
    // it out deliberately and both say so; this pins the agreement rather than the comment.
    expect(ABBREV.st).toBeUndefined();
    expect(server.st).toBeUndefined();
    expect(expandStWord('St', true)).toBe('saint');
    expect(expandStWord('St', false)).toBe('street');
  });
});

describe('the vocabulary is complete and its exemptions are reasoned', () => {
  it('every term carries all eight non-English locales', () => {
    const missing = [];
    for (const [k, row] of Object.entries(SG_TERMS)) {
      for (const l of TERM_LOCALES) if (!row[l] || !String(row[l]).trim()) missing.push(`${k}.${l}`);
    }
    expect(missing, 'a place term landed half-translated').toEqual([]);
  });

  it('the vocabulary size is pinned and moves deliberately', () => {
    // 61 at v0.62.911 → 69 at v0.62.916, when the harvester showed eight common nouns sitting in
    // the proper-noun bucket only because this table did not contain them → 75 at v0.62.917, when
    // the ordinals landed. `Sixth Avenue` composes to 第六道, which is exactly what the station
    // register independently says, so the six ordinals are checked against a source rather than
    // against themselves — see `sg-nouns.test.js`.
    expect(Object.keys(SG_TERMS).length, 'the vocabulary changed size — bump this deliberately').toBe(75);
    expect(TERM_LOCALES).toEqual(['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });

  it('every NOT_TERMS entry states a reason and is absent from the table', () => {
    expect(Object.keys(NOT_TERMS).length).toBe(8);
    for (const [k, why] of Object.entries(NOT_TERMS)) {
      expect(String(why).length, `${k} is exempt without a reason`).toBeGreaterThan(40);
      expect(SG_TERMS[k], `${k} is both exempt and translated`).toBeUndefined();
    }
  });

  it('⚠ the five words the register TRANSLITERATES are exempt, not translated', () => {
    // The finding this release turned on. `beach`, `cross` and `middle` look like obvious semantic
    // heads — Beach Road, Upper Cross Street, Middle Road — and the register renders them 美芝路,
    // 克罗士街上段 and 密驼路. A frequency count says which words are common; only the register
    // says which ones mean anything, and it disagreed with the frequency count on three of eight.
    for (const w of ['marine', 'chinese', 'beach', 'cross', 'middle']) {
      expect(NOT_TERMS[w], `${w} lost its exemption`).toBeTruthy();
      expect(termLocal(w, 'zh'), `${w} acquired a translation it must not have`).toBeNull();
    }
    // `marine` and `chinese` are checkable against the station table without leaving the repo.
    const { SG_STATION_NAMES_LOCAL: T } = require('../web/_shared/lib/mrt-stations-i18n.local.generated.js');
    expect(T['Marine Parade'].k, 'the register stopped treating Marine Parade as a proper noun').toBe('p');
    expect(T['Marine Parade'].zh).toBe('马林百列');
    expect(T['Chinese Garden'].zh, 'Chinese Garden is not a translation of "Chinese"').toBe('裕华园');
  });

  it('the eight new terms translate, and in the locale the SG sign uses', () => {
    for (const w of ['bridge', 'coast', 'airport', 'station', 'canal', 'science', 'straits', 'market']) {
      expect(SG_TERMS[w], `${w} is missing`).toBeTruthy();
      expect(termLocal(w, 'zh'), `${w} has no Chinese`).toBeTruthy();
    }
    // Two the register vouches for, from the station table.
    expect(termLocal('coast', 'zh')).toBe('海岸');    // Punggol Coast 榜鹅海岸
    expect(termLocal('airport', 'zh')).toBe('机场');   // Changi Airport 樟宜机场
    // …and the one where the dictionary and the sign differ. 巴刹, from Malay `pasar`.
    expect(termLocal('market', 'zh')).toBe('巴刹');
    expect(termLocal('market', 'id')).toBe('Pasar');
  });
});

describe('the harvester, which is where the vocabulary\'s evidence comes from', () => {
  const h = harvest();

  it('it reads a real corpus', () => {
    expect(h.files, 'the data directory shrank — re-check what this is measuring').toBeGreaterThan(20);
    expect(h.strings).toBeGreaterThan(1000);
    expect(h.proper.length).toBeGreaterThan(100);
  });

  it('⚠ it throws on an empty parse rather than reporting a clean sweep of nothing', () => {
    // ⚠ THE FIRST DRAFT OF THIS PASSED FOR THE WRONG REASON, and a mutation caught it. It read
    // `expect(() => placeStrings('/nonexistent-dir')).toThrow()` — and a missing directory makes
    // `fs.readdirSync` throw ENOENT before the zero-files check is ever reached. Deleting the
    // guard entirely left the assertion green: it was proving that Node throws on a missing path,
    // not that this script refuses to report on nothing. The directories below EXIST.
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-terms-empty-'));
    expect(() => placeStrings(empty), 'a directory with no JSON produced a silent empty result')
      .toThrow(/no JSON files/);

    const noAddresses = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-terms-noaddr-'));
    fs.writeFileSync(path.join(noAddresses, 'x.json'), JSON.stringify({ hello: 'world', n: [1, 2] }));
    expect(() => placeStrings(noAddresses), 'JSON with no address fields produced a silent empty result')
      .toThrow(/zero place strings/);

    fs.rmSync(empty, { recursive: true, force: true });
    fs.rmSync(noAddresses, { recursive: true, force: true });
  });

  it('⚠ `Bt Batok` and `Bukit Batok` produce ONE span, not two', () => {
    // Two defects, one symptom. The scratchpad harvester flushed the proper-noun run on `bt`
    // (which expands to `bukit`, a NOT_TERMS word — part of the NAME), and then, once that was
    // fixed, pushed the literal "Bt" into the run so the two spellings still made two phrases.
    // Measured on the shipped data: 11 strings write "Bt Batok" against 60 writing "Bukit".
    const spans = new Map(h.proper);
    expect(spans.get('Bukit Batok'), 'Bukit Batok is not being found at all').toBeGreaterThan(30);
    expect(spans.has('Bt Batok'), 'the abbreviated spelling is a separate phrase again').toBe(false);
    expect(spans.has('Batok'), 'the name was split at the abbreviation again').toBe(false);
    expect(spans.has('Merah'), 'Bukit Merah was split again').toBe(false);
  });

  it('⚠ `St` never survives as a proper noun', () => {
    // `st` is deliberately absent from ABBREV, so it normalised to nothing the harvester knew and
    // stayed inside the run: the first corrected version reported `Tampines St×24` and
    // `Yishun St×11`. The vocabulary's own ambiguity rule, unread by the script composing with it.
    const bad = h.proper.filter(([p]) => /\bSt$/.test(p) || /^St\b/.test(p));
    expect(bad.map(([p, n]) => `${p}×${n}`), 'a Street/Saint fragment is a proper noun again').toEqual([]);
  });

  it('⚠ every new term is REACHED by the corpus, not just present in the table', () => {
    // A vocabulary word nothing can reach is the "correct and unreachable" guard [AMD-187]
    // recorded — it passes every completeness check and does no work. Asserted against the real
    // strings rather than invented examples.
    const corpus = [...placeStrings()].join(' | ').toLowerCase();
    for (const w of ['bridge', 'coast', 'airport', 'station', 'canal', 'science', 'straits', 'market',
      'marine', 'chinese', 'beach', 'cross', 'middle']) {
      expect(corpus.includes(w), `${w} appears nowhere in data/ — why is it in the vocabulary?`).toBe(true);
    }
  });

  it('the eight new terms have left the proper-noun bucket', () => {
    // The self-correcting property: the harvester's function words ARE Object.keys(SG_TERMS), so
    // this passing is evidence the vocabulary absorbed them rather than a claim that it did.
    const spans = new Set(h.proper.map(([p]) => p.toLowerCase()));
    for (const w of ['bridge', 'coast', 'airport', 'station', 'canal', 'science', 'straits', 'market']) {
      expect(spans.has(w), `${w} is still reported as a proper noun`).toBe(false);
    }
    // …and the five exempt words correctly REMAIN, because they are parts of proper nouns.
    for (const w of ['beach', 'cross', 'middle']) {
      expect(spans.has(w), `${w} was absorbed — a NOT_TERMS word must stay inside the name`).toBe(true);
    }
  });

  it('the buckets are disjoint and the noise bucket only holds noise', () => {
    const seen = new Set();
    for (const b of [h.proper, h.institution, h.outOfCountry]) {
      for (const [p] of b) {
        expect(seen.has(p), `${p} is in two buckets`).toBe(false);
        seen.add(p);
      }
    }
    for (const [p] of h.dropped) {
      expect(p.replace(/[^A-Za-z]/g, '').length, `"${p}" is too long to be a parse artefact`)
        .toBeLessThanOrEqual(2);
    }
  });
});
