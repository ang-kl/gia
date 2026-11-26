// __tests__/render-checks-wiring.test.js — v0.62.994.
//
// Spec: doc/Feature/2026-11-24-cuisine-place-actions-browser-check.spec.md, invariants I9 and I10.
//
// The browser checks (scripts/render-smoke.mjs, scripts/cuisine-deeplink-boot.mjs and
// scripts/cuisine-place-actions.mjs) need a build and a browser, so they run in CI's build job through
// `npm run test:render` and not here. That leaves one way for a check to stop guarding anything without a single
// test going red: the script stays in the tree and is dropped from the command. This file holds the wire.
//
// What it holds, and how:
//   - the command, READ from package.json and taken apart: each script is a step of its own, joined by `&&`, so a
//     failing step stops the run with its exit code;
//   - CI really runs that command, after the build it needs;
//   - the new script, RUN against a tree with no build: it must exit 1. This is a run, not a reading of the
//     source, because "a missing build is a failure, not a skip" is a statement about what the script does.
//
// What it does not hold: anything the checks themselves assert. Only a browser can show that.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = () => JSON.parse(read('package.json'));

const CHECKS = ['scripts/render-smoke.mjs', 'scripts/cuisine-deeplink-boot.mjs', 'scripts/cuisine-place-actions.mjs'];

// The command as a list of steps. Only `&&` joins steps here: `;` and `||` would let a failed step be followed by a
// passing one, and the run would end green.
function steps(command) {
  return String(command || '').split('&&').map((s) => s.trim()).filter(Boolean);
}

describe('I10 - the browser checks stay wired into `npm run test:render`', () => {
  it('each check is a step of its own in the command', () => {
    const list = steps(pkg().scripts['test:render']);
    for (const script of CHECKS) expect(list, `${script} is not a step of test:render`).toContain(`node ${script}`);
  });

  it('the command holds nothing else, and nothing that could hide a failed step', () => {
    const command = pkg().scripts['test:render'];
    expect(steps(command)).toEqual(CHECKS.map((s) => `node ${s}`));
    expect(command).not.toMatch(/\|\||;|\|/);
  });

  it('every script the command names is in the tree', () => {
    for (const script of CHECKS) expect(fs.existsSync(path.join(ROOT, script)), `${script} is missing`).toBe(true);
  });

  it('CI runs the command, and after the build it needs', () => {
    const ci = read('.github/workflows/ci.yml');
    const build = ci.indexOf('run: npm run build\n');
    const render = ci.indexOf('run: npm run test:render\n');
    expect(build, 'ci.yml has no `run: npm run build` step').toBeGreaterThan(-1);
    expect(render, 'ci.yml has no `run: npm run test:render` step').toBeGreaterThan(-1);
    expect(render).toBeGreaterThan(build);
  });

  it('the steps() reader used above tells a wired command from an unwired one', () => {
    // The reader is what the first two cases rest on, so it is shown to bite: the command as it was before
    // v0.62.994, and a command that names the script only as a fallback.
    const before = 'node scripts/render-smoke.mjs && node scripts/cuisine-deeplink-boot.mjs';
    expect(steps(before)).not.toContain('node scripts/cuisine-place-actions.mjs');
    const fallback = 'node scripts/render-smoke.mjs || node scripts/cuisine-place-actions.mjs';
    expect(steps(fallback)).not.toContain('node scripts/cuisine-place-actions.mjs');
  });
});

describe('I9 - the place-card check cannot pass on a tree with no build', () => {
  it('pointed at an empty folder it exits 1 and says the build is missing', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'gia-no-build-'));
    try {
      const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/cuisine-place-actions.mjs')], {
        env: { ...process.env, GIA_PLACE_ACTIONS_ROOT: empty },
        encoding: 'utf8',
        timeout: 30000
      });
      expect(run.error, 'the script could not be started').toBeUndefined();
      expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/no build output/);
      // Nothing was checked, so nothing may read as a pass.
      expect(run.stdout).not.toMatch(/✓/);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});
