// __tests__/vibe-journal-feature-area.test.js — v0.62.819, O-324.
//
// The Vibe Journal's "Feature & UX area" column used to pour the title and the body into one
// string and take the first FEATURE_RULES keyword that hit anywhere in it. PR bodies in this
// repo are long narrative documents that mention every surface in passing, so a bare
// substring like 'hawker' at rule 6 captured whatever it touched: of the 8 rows the
// 2026-08-28 catch-up filed under `Hawker NEA`, **6 were not about hawker centres** —
// including #1771, a transport i18n PR that matched on `mrt.nearestHawker` appearing in its
// prose.
//
// Resolution is now three stages, strongest evidence first: TITLE → FILES → BODY.
//
// This test reads the GENERATED records.tsv rather than importing the generator, for two
// reasons. The generator writes four files as a side effect of being imported, so importing
// it in a test would rewrite the repo mid-run. And the artefact is what is published — a
// green test over a function whose output never reached the page would be the wrong gate.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const TSV = readFileSync(join(ROOT, 'doc/VibeCodingRecord/records.tsv'), 'utf8').split('\n').filter(Boolean);
const HEAD = TSV[0].split('\t');
const iPR = HEAD.indexOf('PR');
const iArea = HEAD.indexOf('Feature & UX area');
const rows = TSV.slice(1).map((l) => l.split('\t'));
const areaOf = new Map(rows.map((r) => [Number(r[iPR]), r[iArea]]));

describe('vibe journal — feature area resolution (O-324)', () => {
  it('the fixture is the real ledger, not an empty one a broken parser would also pass', () => {
    expect(iPR).toBeGreaterThanOrEqual(0);
    expect(iArea).toBeGreaterThanOrEqual(0);
    expect(rows.length).toBeGreaterThan(1700);
    expect(areaOf.get(1771)).toBeTruthy();
  });

  // The eight rows O-324 was opened on. Six were wrong; two were right and must STAY right —
  // a fix that moves everything is not a fix, and #1690/#1692 are the guard against that.
  it.each([
    [1686, 'Docs / vault',         'a VibeCodingRecord catch-up — matched on "hawker" in its own prose'],
    [1688, 'Docs / vault',         'a post-merge journal record'],
    [1690, 'Hawker NEA',           'genuinely Hawker — was already correct and must not move'],
    [1692, 'Hawker NEA',           'genuinely Hawker: its file list is web/hawker'],
    [1697, 'Buddy / sharing',      'Sketchbook, which lives in web/clipboard'],
    [1760, 'Cuisine Picker',       'classics-notes — dish content, renders in the picker'],
    [1765, 'Cuisine Picker',       'classics-notes again'],
    [1771, 'Transport / carpark',  'station names — matched on the literal string mrt.nearestHawker'],
  ])('#%i is filed as %s (%s)', (pr, area) => {
    expect(areaOf.get(pr)).toBe(area);
  });

  it('no row is left without an area, and every area is one the taxonomy names', () => {
    const KNOWN = new Set([
      'Oversight / usage stats', 'Cuisine Picker', 'Search / free-text', '/eat /drink flow',
      '/hidden surprise', 'Hawker NEA', 'Transport / carpark', 'Weather', 'Buddy / sharing',
      'Recognised lists', 'Menu hub', 'Privacy / legal', 'Language / i18n',
      'Maps / geo / location', 'Docs / vault', 'Infra / setup', 'Pipeline / discovery',
      'Commands / chat UX', 'Core / misc',
    ]);
    const unknown = [...new Set(rows.map((r) => r[iArea]))].filter((a) => !KNOWN.has(a));
    expect(unknown, 'areas not in the documented taxonomy').toEqual([]);
  });

  // O-326, found while fixing O-324: 116 rows (#1552-#1665) carried `n` as a STRING, so the
  // published vibe-journal.json shipped a mixed-type `pr` field to anyone reading it with jq
  // or pandas. Nothing internal broke — every use already wrapped it in Number() — which is
  // exactly why it survived unnoticed for months.
  it('every PR number is a number, in both the TSV and the published JSON', () => {
    const bad = rows.map((r) => r[iPR]).filter((v) => !/^\d+$/.test(v));
    expect(bad, 'PR cells that are not bare digits').toEqual([]);
    const json = JSON.parse(readFileSync(join(ROOT, 'public/doc/vibe-journal.json'), 'utf8'));
    const types = [...new Set(json.records.map((r) => typeof r.pr))];
    expect(types).toEqual(['number']);
  });

  // The banner is a claim about the RANGE. It used to print the row COUNT on both sides of
  // `#1–#N`, which was wrong by 27 the day it was noticed.
  it('the banners name the highest PR number, not the row count', () => {
    const md = readFileSync(join(ROOT, 'doc/VibeCodingRecord/vibe-coding-record.md'), 'utf8').slice(0, 800);
    const maxPr = Math.max(...rows.map((r) => Number(r[iPR])));
    expect(maxPr).toBeGreaterThan(rows.length); // the numbering has gaps; if this ever fails the guard below is moot
    expect(md).toContain(`(#1–#${maxPr})`);
    expect(md).toContain(`all ${rows.length} pull requests`);
  });

  it('the dish corpora are evidence of Cuisine, not of i18n — the measured routing', () => {
    const gen = readFileSync(join(ROOT, 'doc/VibeCodingRecord/generate.mjs'), 'utf8');
    const fileRules = gen.slice(gen.indexOf('const FILE_RULES = ['), gen.indexOf('\n];', gen.indexOf('const FILE_RULES = [')));
    const cuisine = fileRules.split('\n').find((l) => l.includes("'Cuisine Picker'"));
    const i18n = fileRules.split('\n').find((l) => l.includes("'Language / i18n'"));
    expect(cuisine).toContain('classics-notes');
    expect(i18n).not.toContain('classics-notes');
  });
});
