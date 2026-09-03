// register-current.test.js — v0.62.926
//
// ⚠ THE DEFECT THIS GUARDS IS NOT A WRONG REGISTER. IT IS A SILENT ONE.
//
// A stale snapshot is indistinguishable from a current one to every other check in this repo, and
// the folder's own contract (`doc/CLAUDE.md`) is prose. `register-0_62_722-22_08_26-0620.md` sat
// as the newest for **202 patch versions** and nothing objected. So the guard is a STALENESS
// BUDGET, not a content check: a snapshot is allowed to age — that is what a snapshot is for — it
// is not allowed to age unnoticed.
//
// ⚠ AND THE SHARPER LESSON CAME FROM THIS FILE'S OWN FIRST DRAFT, WHICH GOT THE HISTORY WRONG.
// That draft said the newest snapshot was `register-0_62_69-13_06_26-1545.md`, **855 versions**
// and three months stale, and that the folder had been abandoned since June. All of it false. The
// real newest was `register-0_62_722`, 202 versions and twelve days old, in good order, already
// carrying a `Still due (D-205 hold)` section.
//
// The cause: the newest file was found with `ls -t` — MODIFICATION TIME. In a freshly cloned
// container every file carries the same mtime, so that ordering is noise. A proxy was used for
// version order and never checked.
//
// TWO THINGS SHOULD HAVE CAUGHT IT AND DID NOT, and both are the reason for the predecessor
// assertion below:
//   · this guard already sorted by parsed version, so it PASSED against the real newest — and
//     that pass was read as agreement rather than as a disagreement with the prose;
//   · a mutation printed `202 patch versions behind`, which is 924 - 722 exactly, and that number
//     was read as consistent with the 855 story instead of contradicting it.
//
// A guard that quietly agrees with a false claim is not much better than no guard. Hence: the
// newest snapshot must NAME its true version-predecessor, so a snapshot cannot assert a lineage
// that skips over a file sitting between it and the one it cites.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'doc/Register');

/**
 * The byte offset of a markdown heading, matched only at the START OF A LINE.
 *
 * ⚠ `indexOf('## …')` IS NOT GOOD ENOUGH HERE, and AU-7 is why. A retraction is required to quote
 * the prior snapshot's text verbatim — headings included — so `register-0_62_925` contains the
 * line `> "## ⚠ Owed records — the home D-205 rule 3 never had"` inside a blockquote, hundreds of
 * lines ABOVE its own `## ⚠ Owed records` section. A substring search finds the quotation first,
 * the section slice comes out empty, and the honesty checks below silently measure nothing.
 *
 * Fourteenth instance in this arc of a check reading PROSE as if it were structure — and the first
 * caused by the authenticity rule itself, which makes it a permanent hazard in this folder rather
 * than a one-off.
 */
function headingAt(src, heading) {
  const m = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').exec(src);
  return m ? m.index : -1;
}

/**
 * The slice from a line-anchored `## ` heading up to the NEXT line-anchored `## `, or end of file.
 * Same hazard as headingAt: a quoted heading inside a blockquote starts with `> `, not with `##`,
 * so it can neither open nor close a section.
 */
function sectionAfter(src, heading) {
  const a = headingAt(src, heading);
  if (a < 0) return null;
  const rest = src.slice(a + heading.length);
  const m = /^## /m.exec(rest);
  return m ? rest.slice(0, m.index) : rest;
}

/** The census heading. A snapshot states its absent ids HERE and nowhere else. */
const CENSUS = '## \u26a0 Absent-id census';

/**
 * A snapshot with its DISCUSSION sections removed, leaving only where ids are actually FILED.
 *
 * \u26a0 MENTIONING AN ID IS NOT FILING IT, and the first draft of the census check got this wrong in
 * the most direct way available: it stripped the census and nothing else, so \u2116 223's own
 * correction row — which has to name D-4, D-5 and D-6 to correct the claim about them — filed all
 * three, and the check reported them as an invented status. A correction and a census both exist
 * to DISCUSS ids; neither confers a status on one. Only the Open / New Open / Completed / Accepted
 * / Deferred / Decisions tables do that.
 *
 * Matched on the heading LINE, so a heading quoted inside a blockquote (`> "## \u26a0 Corrections \u2026"`,
 * which AU-7 requires a retraction to carry) neither opens nor closes a block.
 */
const DISCUSSION = /^## .*(Corrections|Absent-id census)/;
function filingSectionsOf(src) {
  const parts = src.split(/^(?=## )/m);
  return parts.filter((p) => !DISCUSSION.test(p)).join('');
}

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

  it('⚠ the newest snapshot names its TRUE version-predecessor', () => {
    // The check that would have caught the false-history draft. It cited `register-0_62_69` as its
    // predecessor while `register-0_62_722` sat between them, and nothing in the suite objected —
    // because every other assertion here is about the newest file alone, and a lineage claim is a
    // statement about TWO files.
    //
    // Directional, like the honesty checks below: a snapshot may say more than this, but it may
    // not skip the file immediately before it.
    expect(all.length, 'fewer than two snapshots — this assertion would be vacuous').toBeGreaterThan(1);
    const prev = all[all.length - 2];
    const src = fs.readFileSync(path.join(REG, newest.file), 'utf8');
    expect(src, `the newest snapshot does not name its predecessor ${prev.file}`).toContain(prev.file);
  });

  it('⚠ the newest snapshot carries an owed-records section', () => {
    const src = fs.readFileSync(path.join(REG, newest.file), 'utf8');
    expect(src.length, 'the newest snapshot is empty').toBeGreaterThan(500);
    // The section D-205 rule 3 requires. It is NOT a home the rule never had — `register-0_62_722`
    // has carried `Still due (D-205 hold)` since 22-08 '26, the day D-205 was approved. This
    // asserts the successor keeps it. Matched case-insensitively, because an assertion about prose
    // is an assertion about FORMATTING — a line wrap defeated the #1851 verifier and CASE defeated
    // the #1855 one, both recorded.
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
    const a = headingAt(src, '## Open Items'), b = headingAt(src, '## Deferred / not settled by any test');
    expect(a, 'no line-anchored `## Open Items` heading').toBeGreaterThan(-1);
    expect(b, 'no line-anchored `## Deferred …` heading').toBeGreaterThan(a);
    const table = src.slice(a, b);
    expect(table.length, 'the Open Items section was not found in the snapshot').toBeGreaterThan(100);
    const claimed = [...new Set([...table.matchAll(/\bO-\d{1,3}\b/g)].map((m) => m[0]))];
    expect(claimed.length, 'the snapshot lists no open items').toBeGreaterThan(20);
    expect(claimed.filter((id) => !guarded.has(id)),
      'the Register claims these items are guarded and no test mentions them').toEqual([]);
  });

  it('⚠ every decision it calls "in force" is actually pinned in CLAUDE.md', () => {
    const src = fs.readFileSync(path.join(REG, newest.file), 'utf8');
    const claude = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
    const a = headingAt(src, '## Decisions in force'), b = headingAt(src, '## ⚠ Owed records');
    expect(a, 'no line-anchored `## Decisions in force` heading').toBeGreaterThan(-1);
    expect(b, 'no line-anchored `## ⚠ Owed records` heading').toBeGreaterThan(a);
    const sec = src.slice(a, b);
    expect(sec.length, 'the decisions section was not found').toBeGreaterThan(100);
    const claimed = [...new Set([...sec.matchAll(/\bD-\d{1,3}\b/g)].map((m) => m[0]))];
    expect(claimed.length, 'the snapshot names no decisions in force').toBeGreaterThan(2);
    // A decision is "in force" only if the orchestration file carries it. This is D-199 applied
    // to the Register itself: a decision recorded in a doc is evidence about the past, and only
    // CLAUDE.md states what governs the present.
    expect(claimed.filter((d) => !claude.includes(d)),
      'the Register calls these in force and CLAUDE.md does not carry them').toEqual([]);
  });

  it('\u26a0 its absent-id census is COMPLETE — the check C-2 needed and did not have', () => {
    // \u26a0 THE DEFECT THIS EXISTS FOR. `register-0_62_925` (\u2116 222) retracted three false claims in
    // \u2116 221, and its own correction row C-2 ended: "Exactly **one** real id had never reached the
    // folder — **D-204**". Measured, FOUR had: D-204 plus D-4, D-5 and D-6, three operator
    // directives named in a single sentence of `journal-0_60_190-15_05_26-1407.md`. A retraction
    // of three false claims carried a fourth, and nothing could see it, because the claim was
    // prose about a set that had never been enumerated.
    //
    // So a snapshot must CENSUS that set rather than describe it, and this compares the census
    // against the set derived here. Exact equality, in both directions — a census that understates
    // is C-2 again, and one that overstates is an invented status.
    //
    // \u26a0 BEING LISTED AS ABSENT IS NOT BEING FILED, and neither is being argued about. Discussion
    // sections — Corrections and the census itself — are stripped from every snapshot before ids
    // are harvested (see filingSectionsOf). Without the census strip, writing an id into the census
    // would make it "present in the folder", the derived set would empty, and the check would
    // collapse to \u2205 === \u2205 at the exact moment it was first satisfied. Without the Corrections
    // strip, a snapshot could not name the ids it is correcting a claim ABOUT without thereby
    // filing them — which is how the first draft of this check failed.
    //
    // \u26a0 WHEN THIS FAILS, THE FIX IS A CENSUS ROW OR A REAL FILING — NEVER A NARROWER SCAN. An id
    // allocated in a journal and not yet in the Register is precisely what this folder exists to
    // track, so this doubles as a live staleness detector on id filing, sharper than the version
    // budget above because it names what is missing.
    const JRN = path.join(ROOT, 'doc/Journal');
    const idsIn = (txt, pre) => [...txt.matchAll(new RegExp(`\\b${pre}-(\\d{1,4})\\b`, 'g'))].map((m) => +m[1]);

    const journal = { D: new Set(), O: new Set() };
    const jfiles = fs.readdirSync(JRN).filter((f) => /^journal-.*\.md$/.test(f));
    expect(jfiles.length, 'no journal entries parsed — everything below would be vacuous')
      .toBeGreaterThan(50);
    for (const f of jfiles) {
      const txt = fs.readFileSync(path.join(JRN, f), 'utf8');
      for (const pre of ['D', 'O']) for (const n of idsIn(txt, pre)) journal[pre].add(n);
    }
    expect(journal.O.size, 'no O- ids found in doc/Journal').toBeGreaterThan(50);
    expect(journal.D.size, 'no D- ids found in doc/Journal').toBeGreaterThan(20);

    const filed = { D: new Set(), O: new Set() };
    for (const s of all) {
      const txt = filingSectionsOf(fs.readFileSync(path.join(REG, s.file), 'utf8'));
      for (const pre of ['D', 'O']) for (const n of idsIn(txt, pre)) filed[pre].add(n);
    }
    expect(filed.O.size, 'no O- ids found in doc/Register').toBeGreaterThan(100);

    const derived = [];
    for (const pre of ['D', 'O'])
      for (const n of [...journal[pre]].sort((a, b) => a - b))
        if (!filed[pre].has(n)) derived.push(`${pre}-${n}`);

    const src = fs.readFileSync(path.join(REG, newest.file), 'utf8');
    const section = sectionAfter(src, CENSUS);
    expect(section, `the newest snapshot carries no line-anchored \`${CENSUS}\` section`).toBeTruthy();
    const stated = [...new Set([...section.matchAll(/\b[DO]-\d{1,4}\b/g)].map((m) => m[0]))];
    expect(stated.length, 'the census section names no ids').toBeGreaterThan(0);

    expect(derived.filter((id) => !stated.includes(id)),
      'these ids are in doc/Journal, absent from doc/Register, and the census does not name them')
      .toEqual([]);
    expect(stated.filter((id) => !derived.includes(id)),
      'the census names these as absent and they are filed in doc/Register — an invented status')
      .toEqual([]);
  });
});
