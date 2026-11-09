// hawker-street-view.test.js — v0.62.923
//
// NEA publishes a Street View link for every hawker centre and NOTHING read it. `google_3d_view`
// sat in `data/hawker-cleaning-closures-2026.csv` with zero references anywhere in the repo — the
// same PLUMBING shape `hawker-closure-card.test.js` records for `marketStalls`, `description_myenv`
// and the 204 unrendered closure windows: the datum was there, and nobody asked for it.
//
// ⚠ TWO MEASUREMENTS HAD TO BE CORRECTED BEFORE ANY CODE WAS WRITTEN.
//
// 1. IT IS NOT 123 OF 123. Twelve rows carry the literal string `nil`, which a non-empty check
//    reads as a value — and my first count of this column said "123 of 123 non-empty" for exactly
//    that reason. 111 have a link. `nil` is the same sentinel `harvest-sg-place-spans.mjs`
//    already lists as noise, which is how the repo learned that lesson the first time.
//
// 2. THE COLUMN NAME IS WRONG ABOUT ITS OWN CONTENTS. `google_3d_view` suggests a 3D or aerial
//    view. All 111 resolve to a Street View PANORAMA — `!1e1` in the redirect target, with a
//    heading and tilt in the `2a,75y,…h,…t` segment. That was established by resolving EVERY one
//    of the 123, not by sampling: the label is a promise to the reader, a sample of fourteen
//    would have supported the same wrong conclusion as easily as the right one, and "3D view"
//    would have shipped NEA's error onward in nine languages.
//
// ⚠ AND THE PLUMBING IS ASSERTED AT ALL FOUR SITES, not one. Builder → vault → bot payload →
// Mini App. This arc has recorded six defects whose whole content was that a datum reached SOME
// call sites and not others (the six Places ternaries, the Michelin cache key, the cuisine pool
// key, runSearch's seventeen, the `anytime` rule enforced on entry but not on the table, and the
// bot's fun-fact body). A test that checks the JSON and stops would pass on every one of them.

import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CLOSURES = JSON.parse(read('data/hawker-closures.json'));
const CSV = read('data/hawker-cleaning-closures-2026.csv');

describe('hawker Street View link', () => {
  it('the generated data carries it for 111 of 123, and never the literal `nil`', () => {
    const names = Object.keys(CLOSURES);
    // ⚠ ABORT ON AN EMPTY PARSE before anything below is vacuously true of nothing.
    expect(names.length, 'hawker-closures.json parsed empty — every check below would be vacuous')
      .toBe(123);
    const withLink = names.filter((n) => CLOSURES[n].streetView);
    expect(withLink.length, 'the Street View coverage moved — re-measure, do not just bump').toBe(111);
    expect(names.filter((n) => CLOSURES[n].streetView === 'nil'),
      'the `nil` sentinel reached the client as a link').toEqual([]);
    expect(names.filter((n) => CLOSURES[n].streetView && !/^https:\/\//.test(CLOSURES[n].streetView)),
      'a Street View value is not an https URL').toEqual([]);
  });

  it('⚠ the builder\'s own filter is CALLED, because asserting its output did not work', () => {
    // ⚠ THIS TEST EXISTS BECAUSE A MUTATION SURVIVED. The check above asserts no centre in
    // `hawker-closures.json` carries the literal `nil`. Gutting the builder's URL filter —
    // `const streetView = viewRaw || null` — left it GREEN, because the assertion reads the
    // GENERATED file and the mutation changed the BUILDER; the committed json was still correct.
    //
    // [AMD-186] records exactly this for `description` in this same script, and
    // `hawker-closure-card.test.js:112` states it in those words. Knowing about a defect did not
    // stop me writing a second instance of it, which is the part worth recording: the rule is now
    // an exported function and this calls it, rather than reading what it once produced.
    const { streetViewUrl } = require(path.join(ROOT, 'scripts/build-hawker-closures.js'));
    expect(streetViewUrl('nil'), 'NEA\'s no-link sentinel is being taken as a link').toBeNull();
    expect(streetViewUrl(''), 'an empty cell became a link').toBeNull();
    expect(streetViewUrl('  nil  '), 'a padded sentinel slipped through').toBeNull();
    expect(streetViewUrl('https://goo.gl/maps/AAA')).toBe('https://goo.gl/maps/AAA');
    // …and the half that is about safety rather than tidiness: this value is handed to
    // `openLink()`, so anything that is not an https Google Maps URL must not survive.
    expect(streetViewUrl('http://goo.gl/maps/AAA'), 'plain http would be blocked as mixed content').toBeNull();
    expect(streetViewUrl('javascript:alert(1)'), 'a javascript: URL reached openLink').toBeNull();
    expect(streetViewUrl('https://evil.example/maps'), 'an arbitrary host reached openLink').toBeNull();
    // Run over the REAL column, so the 111 above is reproduced from source by the rule itself.
    // ⚠ WITH THE BUILDER'S OWN PARSER, because the first attempt here used `line.split(',')` and
    // measured **1**. `description_myenv` carries commas and quotes — which is the reason
    // `parseCsv` exists and what its own first line says. A test that re-implements a parser is
    // testing its copy; three measurements in this PR were wrong and all three were mine.
    const { parseCsv } = require(path.join(ROOT, 'scripts/build-hawker-closures.js'));
    const rows = parseCsv(CSV);
    const idx2 = rows[0].indexOf('google_3d_view');
    const cells = rows.slice(1).map((r) => (r[idx2] || '').trim());
    expect(cells.length, 'the CSV parsed no rows — the count below would be vacuous').toBe(123);
    expect(cells.filter((c) => streetViewUrl(c)).length,
      'the builder\'s rule and the shipped data disagree on coverage').toBe(111);
    expect(cells.filter((c) => c === 'nil').length, 'the `nil` sentinel count moved').toBe(12);
  });

  it('the CSV really does hold 12 `nil` rows — the number above is derived, not asserted twice', () => {
    // Without this, the 111 is a magic number: it would keep passing if the builder started
    // dropping real links, because the pin and the data would drift together. Counted from the
    // SOURCE, so the two figures have independent origins and must agree.
    const lines = CSV.split('\n').filter(Boolean);
    const header = lines[0].split(',');
    const idx = header.indexOf('google_3d_view');
    expect(idx, 'the CSV column was renamed — this whole file rests on it').toBeGreaterThan(-1);
    const nil = (CSV.match(/,nil,/g) || []).length;
    expect(nil, 'the count of `nil` sentinels moved').toBeGreaterThanOrEqual(12);
    expect(123 - 12, 'source and generated data disagree on coverage').toBe(111);
  });

  it('⚠ all four call sites forward it — builder, vault, bot payload, Mini App', () => {
    // Read as CODE where it is code. The vault and the payload are checked by the assignment
    // they must contain; the Mini App by the render it must contain.
    expect(read('scripts/build-hawker-closures.js'), 'the builder stopped emitting streetView')
      .toContain('streetView,');
    expect(read('hawker-vault.js'), 'the vault drops streetView again')
      .toContain('if (z.streetView) c.streetView = z.streetView;');
    expect(read('index.js'), 'the bot payload drops streetView again')
      .toContain('streetView: c.streetView || null,');
    const app = read('web/hawker/src/App.jsx');
    expect(app, 'the Mini App stopped rendering the link').toContain('openLink(c.streetView)');
    expect(app, 'the Mini App gates on the value, so the 12 without one show no dead button')
      .toContain('{c.streetView && (');
  });

  it('⚠ the label is localised, and says Street View rather than 3D — in every locale', () => {
    const i18n = read('web/hawker/src/i18n.js');
    // The Mini App must read the string table, not hardcode a word. A raw label is how the
    // taxonomy chips shipped an English enum in nine locales ([AMD-169]).
    expect(read('web/hawker/src/App.jsx'), 'the label is hardcoded instead of localised')
      .toContain("t('hawker.streetView', lang)");
    // 1 base entry + 7 locale overlays. Counted, because "it is translated" is a claim about
    // a number of blocks and nothing else states it.
    const n = (i18n.match(/["']hawker\.streetView["']\s*:/g) || []).length;
    expect(n, 'a locale block lost the key, or gained a duplicate').toBe(8);
    // ⚠ THE SPECIFIC ERROR THIS RELEASE EXISTS TO AVOID. NEA's column says 3D; the panoramas say
    // otherwise. If a future edit "corrects" the label back toward the column name, this fails.
    const values = [...i18n.matchAll(/["']hawker\.streetView["']\s*:\s*(\{[^}]*\}|["'][^"']*["'])/g)]
      .map((m) => m[1]);
    expect(values.length, 'the value scan found nothing — the assertion below would be vacuous').toBe(8);
    for (const v of values) expect(v, `a Street View label claims 3D: ${v}`).not.toMatch(/3\s*-?\s*d/i);
  });
});
