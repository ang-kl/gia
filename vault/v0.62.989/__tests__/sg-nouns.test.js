// The proper nouns, and the rule that keeps the Chinese column honest.
//
// `sg-nouns-i18n.generated.js` is the open half of the place vocabulary — the names the closed
// word list attaches to. Its one structural rule is that **ru/ja/ko are transliteration and zh is
// not**: a Japanese reading of "Whampoa" is derivable from how the word is said, and 黄埔 is not
// derivable from anything, because it is the merchant's native county rather than a reading.
//
// So the test that matters here is not completeness. It is that **every zh carries its evidence**,
// and that the evidence is real: a `src` naming a row in the station table (whose zh column is the
// government register, cell-checked by its own test) or a `why` stating where else it is
// established. A Chinese cell with neither is a guess wearing a register's clothes, and this file
// exists to make that impossible to add quietly.
//
// ⚠ ASSERTED BY CALLING, and by re-deriving from `data/` rather than from a number in prose. The
// figure "283 phrases to author" was carried across three sessions and was wrong in three ways;
// the harvester is in the repo precisely so no count here has to be believed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import { SG_NOUNS_LOCAL, NOUN_READING_LOCALES, NOUN_TRANSLATION_LOCALES, nounNameLocal }
  from '../web/_shared/lib/sg-nouns-i18n.generated.js';
import { SG_STATION_NAMES_LOCAL } from '../web/_shared/lib/mrt-stations-i18n.local.generated.js';
import { nounLocal, placeLocal, placeSecondLine } from '../web/_shared/lib/sg-place-text.js';
import { harvest } from '../scripts/harvest-sg-place-spans.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEYS = Object.keys(SG_NOUNS_LOCAL);

describe('the noun table is complete in the locales it claims', () => {
  it('the table is not empty, and its size moves deliberately', () => {
    expect(KEYS.length, 'the noun table changed size — bump this deliberately').toBe(195);
  });

  it('every row carries all three readings', () => {
    const gaps = [];
    for (const k of KEYS) {
      const row = SG_NOUNS_LOCAL[k];
      const bag = row.k === 's' ? row.t : row.r;
      const want = row.k === 's' ? NOUN_TRANSLATION_LOCALES : NOUN_READING_LOCALES;
      for (const l of want) if (!bag || !bag[l] || !String(bag[l]).trim()) gaps.push(`${k}.${l}`);
    }
    expect(gaps, 'a noun landed half-authored').toEqual([]);
  });

  it('every row is one kind or the other, never both', () => {
    for (const k of KEYS) {
      const row = SG_NOUNS_LOCAL[k];
      expect(['p', 's'], `${k} has an unknown kind`).toContain(row.k);
      if (row.k === 'p') expect(row.t, `${k} is proper but carries a translation bag`).toBeUndefined();
      if (row.k === 's') expect(row.r, `${k} is semantic but carries a reading bag`).toBeUndefined();
    }
  });

  it('⚠ no Latin-script locale is invented for a proper noun', () => {
    // A `k:'p'` row deliberately has no fr/de/es. "Whampoa" in French IS "Whampoa" — a bracket
    // repeating the line above it is the noise `StationCard.jsx:454-460` warns about.
    for (const k of KEYS) {
      if (SG_NOUNS_LOCAL[k].k !== 'p') continue;
      for (const l of ['fr', 'de', 'es']) {
        expect(nounNameLocal(k, l), `${k} invented a ${l} rendering`).toBeNull();
      }
    }
  });

  it('⚠ EVERY row is proper today, and relabelling one costs evidence', () => {
    // ⚠ A MUTATION WALKED STRAIGHT PAST THE CHECK ABOVE. Flipping Whampoa to `k: 's'` and giving
    // it fr/de/es values left every test green — because the Latin-script check only looks at
    // rows where `k === 'p'`, so changing the kind exempts a row from its own guard. A check
    // conditioned on the very field a mutation edits is not a check.
    //
    // The fix is to guard the KIND. Every name harvested from `data/` so far is a name and not a
    // phrase with meaning, so the file is 195 rows of 'p' and zero of 's'. A semantic row is a
    // claim that the REGISTER translates the name — Chinese Garden 裕华园, Little India 小印度 —
    // and that claim needs the same evidence a `zh` needs.
    const semantic = KEYS.filter((k) => SG_NOUNS_LOCAL[k].k === 's');
    expect(semantic.filter((k) => !SG_NOUNS_LOCAL[k].src && !SG_NOUNS_LOCAL[k].why),
      'a row claims the register translates it, with nothing to show for the claim').toEqual([]);
    expect(semantic.length,
      'the first semantic noun landed — check it really is one the register TRANSLATES, then move this pin')
      .toBe(0);
  });
});

describe('⚠ every Chinese cell carries its evidence', () => {
  const withZh = KEYS.filter((k) => SG_NOUNS_LOCAL[k].zh);

  it('the check is not vacuous — most rows DO have one', () => {
    expect(withZh.length, 'the zh column emptied out').toBeGreaterThan(100);
    expect(withZh.length).toBeLessThan(KEYS.length);   // …and some rows honestly have none
  });

  it('no zh exists without a src or a why', () => {
    const bare = withZh.filter((k) => !SG_NOUNS_LOCAL[k].src && !SG_NOUNS_LOCAL[k].why);
    expect(bare, 'a Chinese name was added with no stated source — that is a guess').toEqual([]);
  });

  it('every `src` names a row that actually exists in the station register', () => {
    const bad = KEYS.filter((k) => SG_NOUNS_LOCAL[k].src)
      .filter((k) => !SG_STATION_NAMES_LOCAL[SG_NOUNS_LOCAL[k].src]);
    expect(bad, 'a row cites a station that is not in the table').toEqual([]);
  });

  it('⚠ a cited zh appears INSIDE the station row it claims to come from', () => {
    // The check that makes `src` mean something: Jurong 裕廊 ⊂ Jurong East 裕廊东, Marina 滨海 ⊂
    // Marina South Pier 滨海南码头. Paste a `src` onto an unrelated station and it fails.
    const bad = [];
    for (const k of KEYS) {
      const row = SG_NOUNS_LOCAL[k];
      if (!row.src || !row.zh) continue;
      const reg = SG_STATION_NAMES_LOCAL[row.src].zh;
      if (!reg.includes(row.zh)) bad.push(`${k}: ${row.zh} is absent from ${row.src} → ${reg}`);
    }
    expect(bad).toEqual([]);
  });

  it('⚠ and it LEADS that row, except where a translated word sits in front of it', () => {
    // The first draft of the check above required a PREFIX, and it caught something real: every
    // citation but one has the element at the head, and the exception is `Canning` — 康宁 sits
    // inside 福康宁 because the register TRANSLATED "Fort" to 福 and put it first. Weakening
    // prefix to substring across the board would have thrown that information away, so the
    // stronger rule is kept as its own assertion with the exception named and reasoned.
    const HEAD_EXEMPT = {
      Canning: 'Fort Canning is 福康宁 — the register translates Fort to 福 and leads with it, so '
        + 'the Canning element is second. The citation is still exact, just not at the head.',
    };
    const notHead = KEYS.filter((k) => SG_NOUNS_LOCAL[k].src && SG_NOUNS_LOCAL[k].zh)
      .filter((k) => !SG_STATION_NAMES_LOCAL[SG_NOUNS_LOCAL[k].src].zh.startsWith(SG_NOUNS_LOCAL[k].zh));
    expect(notHead.filter((k) => !HEAD_EXEMPT[k]),
      'a cited element stopped leading its register form with no stated reason').toEqual([]);
    for (const [k, why] of Object.entries(HEAD_EXEMPT)) {
      expect(notHead, `${k} now leads its row — drop the exemption`).toContain(k);
      expect(why.length).toBeGreaterThan(60);
    }
  });

  it('every `why` says something, rather than gesturing at one', () => {
    // ⚠ NOT A LENGTH FLOOR. The first draft required 20 characters and failed on
    // "Adam Road is 亚当路" (16) and "Anson Road is 安顺路" (17) — which are exactly the reasons
    // this field is for: they name the road AND its Chinese form, in the fewest words that can.
    // A citation that quotes a Chinese name is self-evidently evidence however short it is; the
    // length floor only applies to reasons that name none, where brevity really does mean
    // "because I said so".
    const CJK = /[\u3400-\u9fff]/;
    for (const k of KEYS) {
      const w = SG_NOUNS_LOCAL[k].why;
      if (!w) continue;
      const cites = CJK.test(w);
      expect(cites || String(w).length > 20, `${k}'s reason neither quotes a Chinese form nor says enough to be one: "${w}"`).toBe(true);
      expect(String(w).length, `${k}'s reason is a shrug`).toBeGreaterThan(12);
    }
  });

  it('a row with no zh answers null for Chinese rather than echoing the English', () => {
    const noZh = KEYS.filter((k) => !SG_NOUNS_LOCAL[k].zh);
    expect(noZh.length, 'every row acquired a zh — re-check where they came from').toBeGreaterThan(10);
    for (const k of noZh.slice(0, 20)) expect(nounNameLocal(k, 'zh'), `${k} echoed English as Chinese`).toBeNull();
    // …and the reading locales still answer, so the row is not dead weight.
    for (const k of noZh.slice(0, 20)) expect(nounNameLocal(k, 'ja')).toBeTruthy();
  });
});

describe('the register still outranks the hand-authored table', () => {
  const overlap = KEYS.filter((k) => SG_STATION_NAMES_LOCAL[k]);

  it('⚠ the two tables are DISJOINT today, which is why the ordering cannot yet be observed', () => {
    // ⚠ THE FIRST DRAFT OF THIS BLOCK WAS VACUOUS AND A MUTATION PROVED IT. It looped over the
    // names in both tables and asserted the register won — and that set is EMPTY, because the
    // harvester only reports phrases the station table does not already cover, so nothing was
    // ever authored into both. Moving the noun lookup ABOVE the register in `sg-place-text.js`
    // left all 34 tests green: the assertion was true of nothing, which is the same defect
    // [AMD-183] recorded when a verifier parsed zero rows and printed four passes.
    //
    // Disjointness is the fact that IS checkable, so it is what this asserts. The precedence
    // still matters — it is the difference between a register value and a hand-authored one the
    // moment the two tables ever name the same place — and this test fires the day that happens.
    expect(overlap, 'the tables now overlap: the precedence below is real, so TEST it rather than '
      + 'relying on this disjointness — a mutation moving nounNameLocal above the register must fail')
      .toEqual([]);
  });

  it('each table answers for its own names, and neither shadows the other', () => {
    // Behavioural, and non-vacuous by construction: one name from each side.
    expect(nounLocal('Simei', 'ko')).toBe('시메이');            // station register
    expect(nounLocal('Simei', 'zh')).toBe('四美');
    expect(nounLocal('Whampoa', 'ja')).toBe('ワンポア');         // noun table
    expect(nounLocal('Whampoa', 'zh')).toBe('黄埔');
  });

  it('⚠ the cell-level fall-through is UNREACHABLE today, for two independent reasons', () => {
    // `nounLocal` falls through to the noun table when a register ROW exists but has no CELL for
    // this locale — stopping at the row would hide a hand-authored answer behind a register entry
    // with nothing to say. A mutation collapsing that back to a row-level return left every test
    // green, and the reason is not a weak test: the path cannot be taken.
    //
    //   1. the tables are disjoint (asserted above), so no phrase reaches both, and
    //   2. the station table has ZERO missing cells across zh/ru/ja/ko — measured here, not
    //      assumed — so there is no gap to fall through even if one did.
    //
    // Kept rather than deleted, and named rather than left to look tested. This is the same shape
    // as [AMD-187]'s `both`-clause guard: correct, unreached, and silently reported as a pass by
    // any run that does not say so out loud. Either assertion below failing is the signal that
    // the fall-through has become reachable and now needs a real test.
    const gaps = [];
    for (const [n, r] of Object.entries(SG_STATION_NAMES_LOCAL)) {
      const bag = r.k === 's' ? r.t : r.r;
      if (!r.zh) gaps.push(`${n}.zh`);
      for (const l of ['ru', 'ja', 'ko']) if (!bag || !bag[l]) gaps.push(`${n}.${l}`);
    }
    expect(gaps, 'a register row lost a cell — the fall-through is now reachable, so test it')
      .toEqual([]);
    expect(overlap, 'the tables now overlap — same conclusion').toEqual([]);
  });

  it('and the paths that ARE reachable behave', () => {
    expect(nounLocal('Anchorvale', 'zh')).toBeNull();          // neither table knows, honestly
    expect(nounLocal('Anchorvale', 'ja')).toBe('アンカーベール'); // noun table only
    expect(nounLocal('Nonesuch', 'ja')).toBeNull();            // nothing anywhere
  });
});

describe('the composition, exercised end to end', () => {
  it('a real address renders with both halves', () => {
    expect(placeLocal('Opp Blk 5, Ghim Moh Rd', 'zh').text).toBe('5座对面, 锦茂路');
    expect(placeLocal('Whampoa Drive', 'ja').text).toBe('ワンポアドライブ');
    expect(placeLocal('12 Sims Ave', 'ru').text).toBe('12 Симс Авеню');
  });

  it('⚠ Sixth Avenue composes to exactly what the register says', () => {
    // The ordinals were added to the vocabulary and `avenue` was already 道. The station table
    // holds `Sixth Avenue → 第六道` independently, so this is the composition checked against a
    // source rather than against itself.
    expect(placeLocal('Sixth Avenue', 'zh').text).toBe('第六道');
    expect(SG_STATION_NAMES_LOCAL['Sixth Avenue'].zh).toBe('第六道');
  });

  it('an unknown noun still stays English, which is the whole fallback', () => {
    const r = placeLocal('Nonesuch Rd', 'ko');
    expect(r.text).toContain('Nonesuch');
    expect(r.unknownNouns).toBe(1);
    expect(r.changed, 'the road type still translated').toBe(true);
    expect(placeSecondLine('Zzzz Qqqq', 'zh'), 'an English echo reached the bracket').toBeNull();
  });
});

describe('coverage, re-derived from data/ rather than remembered', () => {
  const h = harvest(path.join(ROOT, 'data'));
  const known = new Set([...Object.keys(SG_STATION_NAMES_LOCAL), ...KEYS].map((k) => k.toLowerCase()));
  const left = h.proper.filter(([p]) => !known.has(p.toLowerCase()));

  it('the harvest is real', () => {
    expect(h.strings).toBeGreaterThan(1000);
    expect(h.proper.length).toBeGreaterThan(200);
  });

  it('⚠ exactly one proper-noun phrase in the corpus is unanswered, and it is a typo in the DATA', () => {
    // `Changi Interneational` — the misspelling is in `data/`, not here. Authoring a reading for
    // it would encode someone's slip into eight locales; leaving it unanswered makes a Chinese
    // reader see the English, which is both correct and the only thing that surfaces the typo.
    expect(left.map(([p]) => p)).toEqual(['Changi Interneational']);
    const occ = h.proper.reduce((s, [, n]) => s + n, 0);
    const missed = left.reduce((s, [, n]) => s + n, 0);
    expect(occ - missed, 'coverage fell').toBeGreaterThanOrEqual(1200);
    expect(missed).toBe(1);
  });

  it('the misspelling really is in the source data and not an artefact of the harvester', () => {
    const raw = fs.readdirSync(path.join(ROOT, 'data'))
      .filter((f) => /\.(json|geojson)$/.test(f))
      .map((f) => fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'))
      .join('');
    expect(raw.includes('Interneational'), 'the typo is gone from data/ — drop this test with it').toBe(true);
  });
});
