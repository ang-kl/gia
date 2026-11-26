// visual-pins.test.js - v0.63.0
//
// Spec: doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md (D-4, invariant I7).
//
// The phone snapshots are compared pixel for pixel, so the browser that made the baselines and the browser
// that checks them must be the same build. Three places name that build: the `@playwright/test` version in
// package.json, the image CI's `visual` job runs in, and the image `scripts/visual-docker.sh` uses to make the
// baselines here. If they drift apart, CI compares Chrome N's pixels against Chrome M's and goes red with no
// code change, or worse, someone widens the tolerance to make it stop. This file keeps the three in step,
// keeps the tolerance at zero, and keeps the matrix the plan names.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('visual pins: one browser build everywhere, zero tolerance, the planned matrix', () => {
  const pkg = JSON.parse(read('package.json'));
  const ver = pkg.devDependencies && pkg.devDependencies['@playwright/test'];

  it('@playwright/test is a development dependency at an exact version', () => {
    expect(ver, '@playwright/test is missing from devDependencies').toBeTruthy();
    expect(ver, 'a range (^ or ~) lets npm pick a different browser build than the baselines were made with').toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("CI's visual job and the local script run in Playwright's image for that same version", () => {
    const image = `mcr.microsoft.com/playwright:v${ver}-noble`;
    const ci = read('.github/workflows/ci.yml');
    const script = read('scripts/visual-docker.sh');
    expect(ci, `ci.yml should run the visual job in ${image}`).toContain(image);
    expect(script, `scripts/visual-docker.sh should use ${image}`).toContain(image);
    // No other Playwright image anywhere in either file.
    for (const [name, text] of [['ci.yml', ci], ['visual-docker.sh', script]]) {
      const tags = [...text.matchAll(/mcr\.microsoft\.com\/playwright:v[0-9.]+-[a-z]+/g)].map((m) => m[0]);
      expect(new Set(tags), `${name} names more than one Playwright image`).toEqual(new Set([image]));
    }
  });

  it('the screenshot comparison allows no differing pixel', () => {
    const cfg = read('playwright.config.mjs');
    expect(cfg).toMatch(/maxDiffPixels:\s*0\b/);
    expect(cfg).toMatch(/threshold:\s*0\b/);
    expect(cfg, 'a ratio tolerance would let small layout shifts through').not.toMatch(/maxDiffPixelRatio/);
  });

  it('the matrix is the plan: five apps, six phone sizes', async () => {
    const { APPS, SIZES } = await import(path.join(ROOT, 'visual/matrix.mjs'));
    expect(APPS).toEqual(['cuisine', 'hawker', 'transport', 'menu', 'clipboard']);
    expect(SIZES.map((s) => `${s.width}x${s.height}`)).toEqual(['360x780', '375x667', '390x844', '393x852', '412x915', '430x932']);
  });

  it('the unit test runner never picks up the browser suites', () => {
    expect(read('vitest.config.js')).toMatch(/['"]visual\/\*\*['"]/);
  });
});
