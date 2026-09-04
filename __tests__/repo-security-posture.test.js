import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF = path.join(ROOT, '.github', 'workflows');

// Repo-side security posture, asserted rather than assumed.
//
// WHY THIS FILE EXISTS, AND WHAT IT DELIBERATELY DOES NOT CLAIM.
// The operator asked to "ensure the github repo is fully secure" after GitHub's
// "recent pushes" banner read to them like an intrusion. Half of that question
// lives in GitHub SETTINGS — branch protection, secret-scanning push protection,
// Dependabot, Actions default permissions, who holds write access. Every one of
// those endpoints returned 403 to the token available here, so this file cannot
// speak to them and does not pretend to. They are written down for the operator
// in the PR body instead, because a checklist nobody can run is still better than
// a green test that measured nothing — which is the defect this repo has recorded
// eleven times over.
//
// What IS checkable from inside the repo is checked here, and only that.
const workflows = () =>
  fs.readdirSync(WF).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

describe('repo security posture — the half that is checkable from inside the repo', () => {
  it('the workflow set parses — a zero-length list would make everything below vacuous', () => {
    // [AMD-181]'s defect, and [AMD-207]'s: a check that cannot tell "the property
    // holds" from "there was nothing to check" reports green either way.
    expect(workflows().length).toBeGreaterThan(5);
  });

  it('⚠ every workflow declares an explicit `permissions:` block', () => {
    // An omitted block inherits the REPOSITORY DEFAULT, which is a setting that can
    // change without this file changing — and which the audit token could not read.
    // ci.yml and cron.yml were both inheriting until v0.62.927.
    const missing = workflows().filter(
      (f) => !/^permissions:/m.test(fs.readFileSync(path.join(WF, f), 'utf8'))
             && !/^\s+permissions:/m.test(fs.readFileSync(path.join(WF, f), 'utf8')),
    );
    expect(missing, `workflows inheriting the repo default: ${missing.join(', ')}`).toEqual([]);
  });

  it('⚠ no workflow uses pull_request_target', () => {
    // pull_request_target runs with the BASE repo's secrets against a fork's code.
    // The repo allows forking (allow_forking: true, measured 03-09 '26), so this is
    // reachable rather than theoretical. None uses it today; this keeps it that way.
    const bad = workflows().filter((f) =>
      /^\s*pull_request_target\s*:/m.test(fs.readFileSync(path.join(WF, f), 'utf8')));
    expect(bad, `pull_request_target in: ${bad.join(', ')}`).toEqual([]);
  });

  it('⚠ third-party actions are pinned to a full commit SHA, not a tag', () => {
    // A tag is mutable. `@v5` is whatever the upstream owner points it at today, and
    // the workflow that used it runs with `contents: write` and pushes to main.
    // first-party `actions/*` are exempt: same trust boundary as the runner itself.
    const offenders = [];
    for (const f of workflows()) {
      const src = fs.readFileSync(path.join(WF, f), 'utf8');
      for (const m of src.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)) {
        const ref = m[1];
        if (ref.startsWith('actions/') || ref.startsWith('./')) continue;
        const [, version = ''] = ref.split('@');
        if (!/^[0-9a-f]{40}$/.test(version)) offenders.push(`${f}: ${ref}`);
      }
    }
    expect(offenders, `tag-pinned third-party actions: ${offenders.join(', ')}`).toEqual([]);
  });

  it('⚠ .gitignore excludes .env, and no real .env is tracked', () => {
    const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(/^\.env\s*$/m.test(ignore), '.gitignore does not exclude .env').toBe(true);
    const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter((f) => /(^|\/)\.env($|\.)/.test(f))
      .filter((f) => !/\.example$/.test(f));   // .env.example is a template of KEYS, no values
    expect(tracked, `tracked env files: ${tracked.join(', ')}`).toEqual([]);
  });

  it('⚠ no credential-shaped string is committed anywhere in the tracked tree', () => {
    // Shape-based, so it catches a key nobody has told this test about. Test files and
    // the mutation harnesses are excluded because they legitimately carry PLANTED
    // defects — the same reason `prove-validator.js` needs an override.
    const PATTERNS = {
      google_api_key: /AIza[0-9A-Za-z_-]{35}/,
      openai_key: /sk-[A-Za-z0-9]{32,}/,
      anthropic_key: /sk-ant-[A-Za-z0-9_-]{20,}/,
      github_token: /gh[pousr]_[A-Za-z0-9]{36}/,
      google_oauth_token: /ya29\.[A-Za-z0-9_-]{20,}/,
      aws_access_key: /AKIA[0-9A-Z]{16}/,
      slack_token: /xox[baprs]-[A-Za-z0-9-]{10,}/,
      private_key_block: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      telegram_bot_token: /[0-9]{8,10}:AA[A-Za-z0-9_-]{33}/,
    };
    const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .filter((f) => !f.startsWith('__tests__/') && !f.startsWith('node_modules/'))
      .filter((f) => !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip)$/i.test(f));
    expect(files.length, 'zero tracked files parsed — the scan would be vacuous').toBeGreaterThan(100);

    const hits = [];
    for (const f of files) {
      let src;
      try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
      for (const [name, re] of Object.entries(PATTERNS)) {
        if (re.test(src)) hits.push(`${f}: ${name}`);   // name of the SHAPE, never the value
      }
    }
    expect(hits, `credential-shaped strings committed: ${hits.join(', ')}`).toEqual([]);
  });

  it('⚠ no user location survives anywhere in the tracked tree', () => {
    // R-4, closed 04-09 '26. The bot logged `[set-location] chat=… → <lat>,<lon>`
    // at FOUR decimal places — about 11 m, which resolves to a building — and those
    // lines sat in a PUBLIC repository. The chat id beside them had already been
    // replaced by a placeholder in an earlier pass; the coordinates had not.
    //
    // ⚠ THE SCRUB WAS NOT ONE PLACE. The marker-keyed pass cleared log/ and left
    // 78 copies standing: a hand-kept coordinate in __tests__/city-centroids.test.js
    // pinning a real regression, a source comment in web/cuisine/src/v2/App.jsx, the
    // VibeCodingRecord source data, the page GENERATED from it and SERVED at
    // /doc/vibe-journal.html, 44 in doc/.serial-state.yml's anchor notes and 14
    // across six merged doc/Journal/ entries. One datum, several call sites — the
    // shape this repo keeps re-finding, and the reason this assertion scans the
    // WHOLE tree rather than the directory the data came from.
    //
    // Scoped to coordinates a [set-location] marker carries, or a search centre it
    // produced. Venue anchors, hawker centres, MRT stations and CITY_CENTROIDS are
    // public places: a blanket coordinate ban would fail on the repo's own data and
    // would protect nobody.
    const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean)
      .filter((f) => !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip)$/i.test(f));
    expect(files.length, 'zero tracked files parsed — the scan would be vacuous').toBeGreaterThan(100);

    const PAIR = /(\[set-location\][^\n]{0,110}?)(-?\d+\.\d{3,}\s*,\s*-?\d+\.\d{3,})/;
    const hits = [];
    for (const f of files) {
      let src;
      try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
      if (!src.includes('[set-location]')) continue;
      if (PAIR.test(src)) hits.push(f);          // the FILE, never the coordinate
    }
    expect(hits, `user coordinates still tracked in: ${hits.join(', ')}`).toEqual([]);
  });

  it('the location scan can actually fire — D-204, on a synthetic pin', () => {
    // A pin in the Java Sea, belonging to nobody, at the precision that matters.
    //
    // ⚠ IT IS ASSEMBLED AT RUNTIME, NOT WRITTEN OUT. The first draft spelled the
    // decoy as a literal — and the assertion above, which scans EVERY tracked file,
    // flagged this one. A guard whose own fixture trips it is the self-referential
    // trap this repo has now hit more than a dozen times. Excluding this file would
    // have been the easy fix and the wrong one: it would carve a hole exactly where
    // a real coordinate could then hide. Building the pair from parts keeps the
    // literal out of the file, so the scan can cover itself.
    const PAIR = /(\[set-location\][^\n]{0,110}?)(-?\d+\.\d{3,}\s*,\s*-?\d+\.\d{3,})/;
    const decoy = ['[set-location] chat=1 \u2192 -5', '.1234,110', '.5678'].join('');
    expect(PAIR.test(decoy)).toBe(true);
    // …and must NOT fire on the redaction that replaced the real ones,
    // nor on a public venue anchor that has no [set-location] marker.
    expect(PAIR.test('[set-location] chat=1 \u2192 <redacted>')).toBe(false);
    expect(PAIR.test('place anchor "MOMOYA" center=1.3123,103.8456')).toBe(false);
  });

  it('the credential scan can actually fire — a guard that cannot fail is not a guard', () => {
    // D-204. Replayed against strings that are structurally valid and belong to nobody:
    // the scan must bite on them, or the empty result above means nothing.
    const decoy = 'AIza' + 'B'.repeat(35);
    expect(/AIza[0-9A-Za-z_-]{35}/.test(decoy)).toBe(true);
    expect(/gh[pousr]_[A-Za-z0-9]{36}/.test('ghp_' + 'C'.repeat(36))).toBe(true);
    expect(/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test('-----BEGIN RSA PRIVATE KEY-----')).toBe(true);
    // …and must NOT bite on the .env.example template, which is keys with no values.
    const tmpl = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    expect(/AIza[0-9A-Za-z_-]{35}/.test(tmpl)).toBe(false);
  });
});
