// __tests__/composer-fold.test.js — v0.62.942.
//
// Spec: doc/Feature/2026-10-25-lever-size-and-fold-on-compose.spec.md (I1-I4).
//
// Operator, 25-10 '26: "when I click the free text 💬 first time or after idle for 10 minutes, if
// there are cards, the cards show be hidden in the "hide results" and blink 2 seconds so user knows."
// Idle = since the last search results arrived (their answer). The decision is a pure function so it
// can be pinned exactly; the wiring in App.jsx and the CSS are read from source, because the Mini App
// cannot be mounted in CI's test job (no React there; see tellme-ai-lever.test.js).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { shouldFoldOnComposerOpen, RESULTS_IDLE_MS, RESULTS_BLINK_MS }
  from '../web/cuisine/src/v2/lib/composer-fold.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const NOW = 1_800_000_000_000;
const base = { openedBefore: true, lastResultsAt: NOW - 60_000, now: NOW, hasCards: true, dismissed: false };

describe('shouldFoldOnComposerOpen', () => {
  it('constants: 10 minutes idle, 2 seconds of blink', () => {
    expect(RESULTS_IDLE_MS).toBe(10 * 60 * 1000);
    expect(RESULTS_BLINK_MS).toBe(2000);
  });
  it('first open of the session with cards showing: fold', () => {
    expect(shouldFoldOnComposerOpen({ ...base, openedBefore: false })).toBe(true);
  });
  it('opened before, results 1 minute old: leave the cards', () => {
    expect(shouldFoldOnComposerOpen(base)).toBe(false);
  });
  it('exactly 10 minutes since results: fold; 9 min 59 s: do not', () => {
    expect(shouldFoldOnComposerOpen({ ...base, lastResultsAt: NOW - RESULTS_IDLE_MS })).toBe(true);
    expect(shouldFoldOnComposerOpen({ ...base, lastResultsAt: NOW - RESULTS_IDLE_MS + 1000 })).toBe(false);
  });
  it('no cards, or already hidden: never fold', () => {
    expect(shouldFoldOnComposerOpen({ ...base, openedBefore: false, hasCards: false })).toBe(false);
    expect(shouldFoldOnComposerOpen({ ...base, openedBefore: false, dismissed: true })).toBe(false);
    expect(shouldFoldOnComposerOpen({ ...base, lastResultsAt: NOW - 3 * RESULTS_IDLE_MS, dismissed: true })).toBe(false);
  });
  it('opened before and no results time recorded: do not guess', () => {
    expect(shouldFoldOnComposerOpen({ ...base, lastResultsAt: null })).toBe(false);
  });
});

describe('App.jsx wiring', () => {
  const app = read('web/cuisine/src/v2/App.jsx');
  const fnAt = app.indexOf('function openComposer(');
  const fn = app.slice(fnAt, app.indexOf('\n  }\n', fnAt));
  it('the closed 💬 button opens through openComposer, not straight to setComposerOpen', () => {
    expect(fnAt).toBeGreaterThan(-1);
    expect(app).toMatch(/onClick=\{openComposer\}/);
    expect(app).not.toMatch(/onClick=\{\(\) => setComposerOpen\(true\)\}/);
  });
  it('openComposer consults the decision with the live state, then opens the bar', () => {
    expect(fn).toMatch(/shouldFoldOnComposerOpen\(\{/);
    for (const k of ['openedBefore:', 'lastResultsAt:', 'hasCards:', 'dismissed: drawerDismissed']) expect(fn).toContain(k);
    expect(fn.indexOf('setComposerOpen(true)')).toBeGreaterThan(fn.indexOf('shouldFoldOnComposerOpen('));
  });
  it('folding is the SAME state the hide-results button sets, and nothing clears the cards', () => {
    expect(fn).toMatch(/setDrawerDismissed\(true\)/);
    expect(fn).not.toMatch(/setVenues\(/);
  });
  it('the blink starts and is cleared after RESULTS_BLINK_MS', () => {
    expect(fn).toMatch(/setResultsBlink\(true\)/);
    expect(fn).toMatch(/setTimeout\(\(\) => setResultsBlink\(false\), RESULTS_BLINK_MS\)/);
  });
  it('the results-arrived time is recorded whenever the card list fills', () => {
    expect(app).toMatch(/useEffect\(\(\) => \{\s*if \(Array\.isArray\(venues\) && venues\.length\) lastResultsAtRef\.current = Date\.now\(\);\s*\}, \[venues\]\)/);
  });
  it('the results button carries the blink class while blinking', () => {
    expect(app).toMatch(/resultsBlink \? ' results-toggle-blink' : ''/);
  });
});

describe('styles.css', () => {
  const css = read('web/cuisine/src/styles.css');
  const rule = (sel) => {
    const at = css.indexOf(`${sel} {`);
    expect(at, `${sel} missing`).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };
  it('the lever is 12x18 with a 40x40 tap area', () => {
    const l = rule('.tellme-lever');
    expect(l).toMatch(/width: 12px; height: 18px/);
    const before = rule('.tellme-lever::before');
    expect(before).toMatch(/width: 40px; height: 40px/);
    expect(rule('.tellme-lever svg')).toMatch(/width: 12px; height: 18px/);
  });
  // v0.62.943 — the lever moved inside the bar, so the border bump is gone and a base line
  // replaces it (spec doc/Feature/2026-10-26-lever-inside-bar-and-results-origin-flag.spec.md,
  // amendment 0.2). The base keeps the same non-scaling stroke at 12×18.
  it('the base line keeps its width at the larger size (non-scaling stroke); the bump is gone', () => {
    expect(rule('.tellme-lever-base')).toMatch(/vector-effect: non-scaling-stroke/);
    expect(css).not.toMatch(/\.tellme-lever-bump/);
  });
  it('the blink lasts 2 s in total and reduce-motion gets a still highlight', () => {
    expect(css).toMatch(/\.results-toggle-blink \{[^}]*animation: results-blink 0\.5s [a-z-]* 4/);
    expect(css).toMatch(/@keyframes results-blink/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.results-toggle-blink \{[^}]*animation: none/);
  });
});
