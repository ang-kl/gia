// mrt-lines-local-i18n.test.js — v0.62.888
//
// Operator: "MRT stays English or Chinese or Malay or Tamil but second line has
// the translated words in bracket and one font size smaller."
//
// THE GATE DID NOT NEED INVERTING. Read literally, the request could mean "show
// the bracket even when the register already answered" — which for a Chinese
// reader would print 东西线 above (东西线). The rule StationCard.jsx:454-460 wrote
// down is still right: where the official name IS the reader's language, a second
// line under it is noise. What was missing was never the gate; it was the
// CONTENT. For es/fr/de/ru/ja/ko the register publishes nothing at all, so the
// gate opened onto an empty hand and the only thing to show was a pronunciation
// guide, which answers a different question.
//
// PROVENANCE IS THE HARD PART HERE, not translation. The register covers 2 of 12
// lines. Ten rows are hand-authored with nothing official behind them, so the
// only evidence available is that the twelve were written WITHOUT consulting the
// register and the four overlapping cells came out byte-identical. That
// agreement is asserted below. It is evidence, not proof, and the test says so.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SG_LINE_NAMES_LOCAL, lineNameLocal } from '../web/_shared/lib/mrt-lines-i18n.local.generated.js';
import { SG_LINE_NAMES_BY_CODE, lineName } from '../web/_shared/lib/mrt-lines-i18n.generated.js';
import { secondLine } from '../web/_shared/lib/name-second-line.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const LOCALES = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const CODES = ['EWL', 'CGL', 'NSL', 'NEL', 'CCL', 'DTL', 'TEL', 'BPL', 'SLRT', 'PLRT', 'JRL', 'CRL'];

describe('the twelve lines are complete in eight locales', () => {
  it('12 × 8, no gaps, and the codes match mrt-lines.js', () => {
    expect(Object.keys(SG_LINE_NAMES_LOCAL).sort()).toEqual([...CODES].sort());
    const gaps = [];
    for (const c of CODES) {
      for (const l of LOCALES) {
        const v = SG_LINE_NAMES_LOCAL[c][l];
        if (typeof v !== 'string' || !v.trim()) gaps.push(`${c}.${l}`);
      }
    }
    expect(gaps).toEqual([]);
    expect(CODES.length * LOCALES.length).toBe(96);
    // JRL and CRL are `future: true` and render nowhere yet. Covered anyway so
    // they are not a gap on the day they open.
    expect(SG_LINE_NAMES_LOCAL.JRL.es).toBeTruthy();
    expect(SG_LINE_NAMES_LOCAL.CRL.ko).toBeTruthy();
  });

  it('agrees with the official register on every cell the register publishes', () => {
    // THE ONLY EVIDENCE the other ten are LTA's names rather than mine. These four
    // were authored without looking at the register; the day one drifts, this
    // fails and the provenance claim in the file header stops being true.
    let checked = 0;
    for (const [code, reg] of SG_LINE_NAMES_BY_CODE) {
      expect(SG_LINE_NAMES_LOCAL[code].zh, `${code}.zh`).toBe(reg.zh);
      expect(SG_LINE_NAMES_LOCAL[code].id, `${code}.id reads the register's ms column`).toBe(reg.ms);
      checked += 2;
    }
    expect(checked, 'the register covers exactly two lines').toBe(4);
  });

  it('and no two locales in one row are byte-identical', () => {
    // fr and es came out identical on all three LRTs, both keeping "LRT". The fix
    // was to expand the acronym in fr/es/de — "Métro léger de Sengkang" — which is
    // the better translation anyway: a bracket whose job is to translate should
    // not leave LRT untranslated. id and ja keep it because those languages do.
    const dupes = [];
    for (const c of CODES) {
      const seen = new Map();
      for (const l of LOCALES) {
        const v = SG_LINE_NAMES_LOCAL[c][l];
        if (seen.has(v)) dupes.push(`${c}: ${l} === ${seen.get(v)}`);
        else seen.set(v, l);
      }
    }
    expect(dupes).toEqual([]);
    expect(SG_LINE_NAMES_LOCAL.SLRT.fr).toBe('Métro léger de Sengkang');
    expect(SG_LINE_NAMES_LOCAL.SLRT.id).toContain('LRT');
  });
});

describe('scripts stay where they belong', () => {
  const CJK = /[぀-ヿ一-鿿]/, CYR = /[Ѐ-ӿ]/, HANGUL = /[가-힣]/, KANA = /[぀-ヿ]/, HAN = /[一-鿿]/;

  it('no script leaks, and each non-Latin locale uses its own', () => {
    const bad = [];
    for (const c of CODES) {
      for (const l of LOCALES) {
        const v = SG_LINE_NAMES_LOCAL[c][l];
        if (['ru', 'de', 'es', 'id', 'fr'].includes(l) && CJK.test(v)) bad.push(`${c}.${l}: CJK`);
        if (['zh', 'ja', 'de', 'es', 'id', 'fr', 'ko'].includes(l) && CYR.test(v)) bad.push(`${c}.${l}: Cyrillic`);
        if (l !== 'ko' && HANGUL.test(v)) bad.push(`${c}.${l}: Hangul`);
        if (l !== 'ja' && KANA.test(v)) bad.push(`${c}.${l}: kana`);
        if (l === 'ko' && HAN.test(v)) bad.push(`${c}.ko: Han`);
      }
      if (!HANGUL.test(SG_LINE_NAMES_LOCAL[c].ko)) bad.push(`${c}.ko: no Hangul`);
      if (!CYR.test(SG_LINE_NAMES_LOCAL[c].ru)) bad.push(`${c}.ru: no Cyrillic`);
      if (!HAN.test(SG_LINE_NAMES_LOCAL[c].zh)) bad.push(`${c}.zh: no Han`);
    }
    expect(bad).toEqual([]);
  });

  it('no word mixes Cyrillic and Latin', () => {
    // Carried forward from v0.62.887, where "Хвannam-ппан" passed every other
    // check: it has Cyrillic, it is one token, and it is nowhere near four
    // consecutive English words. A half-finished transliteration is invisible to
    // a whole-string test.
    const bad = [];
    for (const c of CODES) {
      for (const l of LOCALES) {
        for (const w of String(SG_LINE_NAMES_LOCAL[c][l]).split(/[\s·–—()[\],’-]+/)) {
          if (CYR.test(w) && /[A-Za-z]/.test(w)) bad.push(`${c}.${l}: "${w}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('secondLine() renders one line or none, never two', () => {
  const nameOf = (c) => ({ EWL: 'East-West Line', DTL: 'Downtown Line', NSL: 'North-South Line' }[c]);

  it('stays silent when the register already answered in the reader’s language', () => {
    for (const [code, lang] of [['EWL', 'zh'], ['EWL', 'id'], ['NSL', 'zh'], ['NSL', 'id']]) {
      const primary = lineName(code, nameOf(code), lang);
      expect(primary).not.toBe(nameOf(code));   // the register did answer
      expect(secondLine({ primary, english: nameOf(code), code, lang }), `${code}.${lang}`).toBeNull();
    }
  });

  it('brackets the reader’s language when the primary is still English', () => {
    for (const lang of ['es', 'fr', 'de', 'ru', 'ja', 'ko']) {
      const primary = lineName('EWL', 'East-West Line', lang);
      expect(primary, `${lang} has no register entry`).toBe('East-West Line');
      const sl = secondLine({ primary, english: 'East-West Line', code: 'EWL', lang });
      expect(sl.key).toBe('translated');
      expect(sl.text).toBe(`(${lineNameLocal('EWL', lang)})`);
      expect(sl.text.startsWith('(') && sl.text.endsWith(')'), 'brackets mean translation').toBe(true);
    }
    // …including zh and id for the ten lines the register never covered.
    const dtl = secondLine({ primary: 'Downtown Line', english: 'Downtown Line', code: 'DTL', lang: 'zh' });
    expect(dtl.text).toBe('(滨海市区线)');
  });

  it('and never returns a translation AND a pronunciation', () => {
    // name-guide.js carries the operator's rule verbatim: "Both means TWO, so
    // exactly one guide renders." The translation outranks the say-it guide.
    const withBoth = secondLine({ primary: 'Downtown Line', english: 'Downtown Line', code: 'DTL', lang: 'es', say: 'DOWN-town' });
    expect(withBoth.key).toBe('translated');
    const sayOnly = secondLine({ primary: 'Downtown Line', english: 'Downtown Line', code: 'DTL', lang: 'en', say: 'DOWN-town' });
    expect(sayOnly.key).toBe('say');
    expect(sayOnly.text).not.toMatch(/^\(/);   // a guide is not bracketed
    expect(secondLine({ primary: 'Downtown Line', english: 'Downtown Line', code: 'DTL', lang: 'en' })).toBeNull();
  });
});

describe('the render sites, and the two that were deliberately left alone', () => {
  it('four sites render the second line', () => {
    expect(read('web/transport/src/App.jsx'), 'the picker sheet').toMatch(/secondLine\(\{ primary: lineName\(line\.code/);
    expect(read('web/transport/src/components/LineStatusPanel.jsx')).toMatch(/secondLine\(\{ primary: lineName\(line\.code/);
    expect(read('web/transport/src/components/EngineeringList.jsx')).toMatch(/secondLine\(\{ primary: lineName\(line\.code/);
    expect(read('web/transport/src/components/SystemMap.jsx'), 'a tooltip, so it appends').toMatch(/\$\{p\} \$\{sl\.text\}/);
  });

  it('the picker sheet stacks rather than centring, or the swatch floats', () => {
    const app = read('web/transport/src/App.jsx');
    expect(app).toMatch(/className="flex items-start gap-1\.5 px-2 py-1\.5 rounded-lg border border-tg-border bg-tg-bg text-left active:scale-95"/);
    expect(app).toMatch(/text-\[11px\] text-tg-hint leading-tight truncate block/);
  });

  it('AffectedTicker and the line-order header render it too — the carve-out is RETIRED', () => {
    // CARVE-OUT RETIRED, v0.62.890, and it was mine to retire. v0.62.888 left
    // these two English on my reasoning that a second line "doubles the height of
    // a header the compact layout deliberately shrinks" — a claim about a VISUAL,
    // argued from a file, in an environment that cannot render one. The operator
    // then ran the app in Korean, photographed this exact strip, and said: "Have
    // the train TMA resolve the translated line."
    //
    // The carve-out was not wrong about the pixels; it was wrong about who gets to
    // decide. A judgement made without being able to look does not outrank the
    // person looking. Kept as a test rather than deleted so the reversal is on the
    // record next to the reasoning it reversed.
    // PIN THE RENDER, NOT THE CALL. The first draft of this line asserted only
    // that the file CONTAINS 'secondLine' — and a mutation that deleted the
    // rendered span while leaving the call in place passed it clean. A guard that
    // a revert of the thing it guards survives is not a guard.
    const ticker = read('web/transport/src/components/AffectedTicker.jsx');
    expect(ticker).toMatch(/const sl = secondLine\(\{ primary: lineName\(line\.code, line\.name, lang\), english: line\.name, code: line\.code, lang \}\)/);
    expect(ticker).toMatch(/\{sl && <span className="text-\[10px\] text-tg-hint">\{sl\.text\}<\/span>\}/);
    const app = read('web/transport/src/App.jsx');
    expect(app).toMatch(/const lineOrderSecond = focusedLine/);
    expect(app).toMatch(/\{lineOrderSecond && <span className="text-\[9px\] text-tg-hint font-normal">\{lineOrderSecond\.text\}<\/span>\}/);
  });

  it('the three surfaces that were never wired at all now are', () => {
    // A DIFFERENT CLASS OF DEFECT from the two carve-outs above. Nobody decided
    // these; they were missed. And they need a hop the others do not: they render
    // data/stations.json's baked English `line_name`, not LINES_BY_CODE[...].name,
    // so a `line_code` lookup has to happen before a locale can be applied. The
    // tell was in the string itself — the card showed "North East Line" while
    // lines.js says "North-East Line".
    const card = read('web/transport/src/components/StationCard.jsx');
    expect(card, 'LineSubCard main name').toMatch(/const lineMain = lineName\(line\.line_code, nameParts\.main, lang\)/);
    expect(card, 'LineSubCard second line').toMatch(/const lineSecond = secondLine\(\{ primary: lineMain, english: nameParts\.main, code: line\.line_code, lang \}\)/);
    expect(card, 'the raw baked name must no longer be rendered').not.toMatch(/>\{nameParts\.main\}</);
    expect(card, 'the collapsed strip').toMatch(/: lineLabelInline\(l, lang\)/);
    expect(card, 'the raw fallback must be gone').not.toMatch(/: \(l\.line_name \|\| ''\)/);
  });

  it('the collapsed strip is the ONE inline exception, and says why', () => {
    // "Second line everywhere" was the operator's instruction; this single slot
    // is a ternary producing a STRING inside a 10px strip whose whole job is to
    // stay one row high. The bracket goes inline there. Naming the exception in
    // the guard beats letting it look like an oversight — the same treatment the
    // katakana rows and the cognate collisions got.
    const card = read('web/transport/src/components/StationCard.jsx');
    expect(card).toMatch(/THE ONE DOCUMENTED EXCEPTION to "second line/);
    expect(card).toMatch(/function lineLabelInline\(l, lang\)/);
    expect(card).toMatch(/return sl \? `\$\{primary\} \$\{sl\.text\}` : primary;/);
  });

  it('all three mapOverlays copies localise the line row, identically', () => {
    // It localised NOTHING while scLabel/dirLabel/dayLabel beside it all took
    // `lang` — the outlier in its own function. And it lives in THREE copies whose
    // stationInfoCardHtml region is asserted byte-identical by
    // station-card-labels.test.js, so a fix to one is a fix to all three or a
    // failure in that test.
    const copies = [
      'web/transport/src/lib/mapOverlays.js',
      'web/hawker/src/lib/mapOverlays.js',
      'web/cuisine/src/v2/lib/mapOverlays.js',
    ].map(read);
    for (const src of copies) {
      expect(src).toMatch(/const primary = english \? lineName\(ln\.line_code, english, lang\) : '';/);
      expect(src, 'escaped like every other popup field').toContain("escapeHtml(sl.text)");
      expect(src).not.toMatch(/escapeHtml\(\(ln\.line_code \|\| ''\) \+ ' · ' \+ \(ln\.line_name \|\| ''\)\)/);
    }
  });

  it('the English name is never displaced — it is still the key everywhere', () => {
    // lineName()'s fallback and `line.name` remain what the app keys on; the
    // second line is an addition beside them, never a replacement.
    expect(lineName('DTL', 'Downtown Line', 'es')).toBe('Downtown Line');
    expect(read('web/transport/src/App.jsx')).toMatch(/english: line\.name/);
  });
});
