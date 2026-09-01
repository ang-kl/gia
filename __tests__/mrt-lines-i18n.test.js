// __tests__/mrt-lines-i18n.test.js — v0.62.828.
//
// Operator: "Proceed to do the ... MRT Train line's name translation", hawker centres held.
//
// TWO OF TWELVE, AND THAT IS THE WHOLE DELIVERABLE. translatedterms.gov.sg is the only free,
// official, unauthenticated source for Singapore's rail names — verified live: 43 categories,
// the only place-name one is "MRT/LRT Station", and no hawker or market category exists at
// all. Inside it, exactly two rows are LINE names. The other ten are pinned by code below so
// that filling one SHRINKS a list rather than passing silently. Nothing is translated by us.
import { describe, it, expect } from 'vitest';
import { SG_LINE_NAMES_I18N, SG_LINE_NAMES_BY_CODE, lineName } from '../web/_shared/lib/mrt-lines-i18n.generated.js';
const fs = require('fs');
const { LINES } = require('../mrt-lines.js');

const MISSING = ['BPL', 'CCL', 'CGL', 'CRL', 'DTL', 'JRL', 'NEL', 'PLRT', 'SLRT', 'TEL'];

describe('what the register actually holds', () => {
  it('two lines, and the codes are the two everyone knows', () => {
    expect(SG_LINE_NAMES_I18N.map((r) => r.code).sort()).toEqual(['EWL', 'NSL']);
  });

  it('every line we ship is either in the table or in the named-missing list — no third state', () => {
    // The premise of the pinned list: it must account for the whole network. If a 13th line
    // is added to mrt-lines.js and nobody touches this file, that is the failure to catch.
    const all = LINES.map((l) => l.code).sort();
    expect([...SG_LINE_NAMES_I18N.map((r) => r.code), ...MISSING].sort()).toEqual(all);
  });

  it('the ten missing are missing, so filling one shrinks the list rather than passing quietly', () => {
    const wronglyPresent = MISSING.filter((c) => SG_LINE_NAMES_BY_CODE.has(c));
    expect(wronglyPresent, 'the register gained a line — shrink MISSING and regenerate').toEqual([]);
  });

  it('both rows carry all three published languages', () => {
    for (const r of SG_LINE_NAMES_I18N) {
      expect(r.zh, `${r.code} zh`).toBeTruthy();
      expect(r.ms, `${r.code} ms`).toBeTruthy();
      expect(r.ta, `${r.code} ta`).toBeTruthy();
    }
  });
});

describe('the source mislabels one row, and the copy keeps the mislabel', () => {
  it('the register files the North-South Line under the code (EWL)', () => {
    // The PREMISE, asserted rather than described. If the register is ever corrected this
    // fails, and the next reader learns the fact changed instead of trusting a stale comment.
    const nsl = SG_LINE_NAMES_BY_CODE.get('NSL');
    expect(nsl.src).toBe('North-South Line (EWL)');
    expect(nsl.n).toBe('North-South Line');
  });

  it('and the join is on the NAME, so NSL gets the North-South names', () => {
    // Reading the bracket would file 南北线 under EWL — a wrong answer that looks official.
    expect(lineName('NSL', 'North-South Line', 'zh')).toBe('南北线');
    expect(lineName('EWL', 'East-West Line', 'zh')).toBe('东西线');
  });

  it('the regenerator refuses an unmapped line rather than skipping it', () => {
    const src = fs.readFileSync('scripts/fetch-mrt-line-names.mjs', 'utf8');
    expect(src).toContain('unmapped line row');
    expect(src).toContain('CODE_BY_NAME');
    expect(src, 'the bracketed code must not be parsed as the line code').not.toContain('match(/\\(([A-Z]+)\\)/)');
  });
});

describe('reach — measured, not assumed', () => {
  it('zh renders, and id reads the ms column exactly as the station table does', () => {
    expect(lineName('EWL', 'East-West Line', 'zh')).toBe('东西线');
    expect(lineName('EWL', 'East-West Line', 'id')).toBe('Laluan Timur-Barat');
  });

  it('a locale the register does not publish falls back to English, never to blank', () => {
    for (const l of ['ja', 'fr', 'de', 'ru', 'es']) {
      expect(lineName('EWL', 'East-West Line', l)).toBe('East-West Line');
    }
    expect(lineName('EWL', 'East-West Line', 'en')).toBe('East-West Line');
  });

  it('an unknown line falls back too, so the other ten render as they always did', () => {
    expect(lineName('NEL', 'North-East Line', 'zh')).toBe('North-East Line');
    expect(lineName('NOPE', 'Whatever', 'zh')).toBe('Whatever');
  });

  it('Tamil is stored and reaches no reader — the carried gap, stated as a fact', () => {
    // The apps offer en/fr/de/ru/id/zh/ja/es. `ta` is in the table because the register
    // publishes it and a copy of a register keeps what it copies; it renders nowhere.
    const toggle = fs.readFileSync('web/transport/src/components/LocaleToggle.jsx', 'utf8');
    expect(toggle).not.toContain("code: 'ta'");
    expect(SG_LINE_NAMES_BY_CODE.get('EWL').ta).toBeTruthy();
  });
});

describe('every render site is wired, not just the convenient ones', () => {
  const site = (f) => fs.readFileSync(`web/transport/src/${f}`, 'utf8');
  it.each([
    // v0.62.888 — 2 -> 3. The picker sheet now renders the official name and,
    // under it, the reader's own; the extra CALL is the one feeding secondLine()
    // the primary to compare against. Updated deliberately rather than loosened
    // to a >=, for the same reason v0.62.841 did: the point of this table is that
    // a NEW render site cannot appear unnoticed.
    ['App.jsx', 3],
    // v0.62.841 — 1 -> 4. The pronunciation line added three more CALLS, none of
    // them a new render: one inside `curatedFor` (does the register already answer
    // this?), and two in the guard that shows the say-it line ONLY when it does not.
    // Updated deliberately rather than loosened to a >=, because the point of this
    // table is that a NEW render site cannot appear unnoticed.
    ['components/LineStatusPanel.jsx', 4],
    ['components/AffectedTicker.jsx', 2],
    // v0.62.888 — 1 -> 2. Same second line, and the extra call is in the guard
    // that only fires on the lineName branch (c.direction is already localised).
    ['components/EngineeringList.jsx', 2],
    ['components/SystemMap.jsx', 1],
  ])('%s calls lineName %i time(s)', (f, n) => {
    // Counts the CALLS: the import reads \`import { lineName } from …\`, with no paren, so
    // it is not one of these. The first draft added +1 for it and failed on all five.
    expect(site(f).split('lineName(').length - 1).toBe(n);
  });

  it('no bare {line.name} survives in a rendered position', () => {
    // O-305's shape: a name that is Chinese on one panel and English on the next.
    for (const f of ['App.jsx', 'components/LineStatusPanel.jsx', 'components/AffectedTicker.jsx']) {
      expect(site(f), f).not.toContain('>{line.name}<');
    }
  });
});
