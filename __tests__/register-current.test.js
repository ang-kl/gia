// register-current.test.js — v0.62.924
//
// ⚠ THE DEFECT THIS GUARDS IS NOT A WRONG REGISTER. IT IS A SILENT ONE.
//
// `doc/Register/` held `register-0_62_69-13_06_26-1545.md` as its newest snapshot from 13-06 '26
// until 03-09 '26 — **855 patch versions**. Nothing failed. Nothing could: a stale doc is
// indistinguishable from a current one to every check in this repo, and the folder's own contract
// (`doc/CLAUDE.md`) is prose. Meanwhile the repo went from ~8 tracked open items to **200 distinct
// `O-` ids** and from ~17 decisions to **78 `D-` ids**.
//
// Worse, it made one of the operator's own standing rules unexecutable. D-205 rule 3 says a held
// merge record with no successor PR is logged as still due in the Journal **and in
// `doc/Register/`**. The second half had nowhere to go: `Register.md` is an empty template and the
// newest snapshot predated the rule by two months. Three held records in this arc were logged in
// the Journal alone and the shortfall was noted each time — which is the shape of a rule that is
// on, configured, and out of reach of what it guards.
//
// So the guard is a STALENESS BUDGET, not a content check. A snapshot is allowed to age; that is
// what a snapshot is for. It is not allowed to age unnoticed.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'doc/Register');

/** Snapshots are `register-<major>_<minor>_<patch>-<date>.md`. */
function snapshots() {
  return fs.readdirSync(REG)
    .map((f) => ({ f, m: /^register-(\d+)_(\d+)_(\d+)-/.exec(f) }))
    .filter((x) => x.m)
    .map(({ f, m }) => ({ file: f, major: +m[1], minor: +m[2], patch: +m[3] }))
    .sort((a, b) => a.major - b.major || a.minor - b.minor || a.patch - b.patch);
}

describe('doc/Register currency', () => {
  const all = snapshots();
  const newest = all[all.length - 1];
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const [maj, min, pat] = pkg.version.split('.').map(Number);

  it('the snapshot set parses — a zero-length list would make everything below vacuous', () => {
    expect(all.length, 'no register snapshots parsed; the naming convention changed').toBeGreaterThan(50);
    expect(newest, 'no newest snapshot').toBeTruthy();
  });

  it('⚠ the newest snapshot is within the staleness budget', () => {
    // 150 patch versions. Chosen from the failure it exists to prevent rather than from taste:
    // the gap that prompted this file was **855**, and a budget of 150 would have failed in
    // mid-July rather than in September. It is deliberately loose — a snapshot per release would
    // be noise, and a guard that fires constantly gets bumped instead of obeyed.
    //
    // WHEN THIS FAILS, THE FIX IS A NEW SNAPSHOT, not a bigger budget. Raising the number is the
    // same move as widening a length band until nothing trips it, which this arc has recorded
    // twice as a defect in its own right.
    expect(newest.major, 'a major release with no register snapshot').toBe(maj);
    expect(newest.minor, 'a minor release with no register snapshot').toBe(min);
    const behind = pat - newest.patch;
    expect(behind, `doc/Register is ${behind} patch versions behind ${pkg.version} — write a snapshot`)
      .toBeLessThanOrEqual(150);
  });

  it('⚠ the newest snapshot gives D-205 rule 3 the home it never had', () => {
    const src = fs.readFileSync(path.join(REG, newest.file), 'utf8');
    expect(src.length, 'the newest snapshot is empty').toBeGreaterThan(500);
    // The section D-205 rule 3 requires. Matched case-insensitively, because an assertion about
    // prose is an assertion about FORMATTING — a line wrap defeated the #1851 verifier and CASE
    // defeated the #1855 one, both recorded.
    expect(src, 'no owed-records section — D-205 rule 3 has nowhere to write again')
      .toMatch(/owed records/i);
    expect(src, 'the owed-records section names no held record').toMatch(/\[AMD-\d+\]/);
  });

  it('⚠ it does not claim open items that no test guards — understating is staleness, overstating is fiction', () => {
    const src = fs.readFileSync(path.join(REG, newest.file), 'utf8');
    // Every `O-` id the snapshot lists in its guarded table must really be referenced by a test.
    // Directional on purpose: a NEW id appearing in the suite is ordinary drift and the budget
    // above already covers it; an id in the Register that no test knows about is an invented
    // status, which is the one thing worse than a late document.
    const guarded = new Set();
    for (const f of fs.readdirSync(path.join(ROOT, '__tests__'))) {
      if (!f.endsWith('.test.js')) continue;
      const t = fs.readFileSync(path.join(ROOT, '__tests__', f), 'utf8');
      for (const m of t.matchAll(/\bO-(\d{1,3})\b/g)) guarded.add(`O-${m[1]}`);
    }
    expect(guarded.size, 'no O- ids found in the suite — the check below would be vacuous')
      .toBeGreaterThan(20);
    const table = src.slice(src.indexOf('## Open Items'), src.indexOf('## Deferred'));
    expect(table.length, 'the Open Items section was not found in the snapshot').toBeGreaterThan(100);
    const claimed = [...new Set([...table.matchAll(/\bO-\d{1,3}\b/g)].map((m) => m[0]))];
    expect(claimed.length, 'the snapshot lists no open items').toBeGreaterThan(20);
    expect(claimed.filter((id) => !guarded.has(id)),
      'the Register claims these items are guarded and no test mentions them').toEqual([]);
  });

  it('⚠ every decision it calls "in force" is actually pinned in CLAUDE.md', () => {
    const src = fs.readFileSync(path.join(REG, newest.file), 'utf8');
    const claude = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
    const sec = src.slice(src.indexOf('## Decisions in force'), src.indexOf('## ⚠ Owed records'));
    expect(sec.length, 'the decisions section was not found').toBeGreaterThan(100);
    const claimed = [...new Set([...sec.matchAll(/\bD-\d{1,3}\b/g)].map((m) => m[0]))];
    expect(claimed.length, 'the snapshot names no decisions in force').toBeGreaterThan(2);
    // A decision is "in force" only if the orchestration file carries it. This is D-199 applied
    // to the Register itself: a decision recorded in a doc is evidence about the past, and only
    // CLAUDE.md states what governs the present.
    expect(claimed.filter((d) => !claude.includes(d)),
      'the Register calls these in force and CLAUDE.md does not carry them').toEqual([]);
  });
});
