// __tests__/results-origin-flag.test.js — v0.62.943.
//
// Spec: doc/Feature/2026-10-26-lever-inside-bar-and-results-origin-flag.spec.md (I3, I4).
//
// Operator, 26-10 '26: "if it is non-AI result, flagged it and display centre above the
// "Singapore" that is "Traditional / Non-AI results"". AI results show nothing (their answer),
// and results restored after a language reload keep the origin they had. The decision is a pure
// function so it can be pinned exactly; the wiring in App.jsx is read from source, because the
// Mini App cannot be mounted in CI's test job (no React there; see tellme-ai-lever.test.js).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resultsFlagKey, RESULTS_ORIGIN } from '../web/cuisine/src/v2/lib/results-origin.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('resultsFlagKey', () => {
  it('the two origins', () => {
    expect(RESULTS_ORIGIN).toEqual({ SEARCH: 'search', AI: 'ai' });
  });
  it('cards from the normal search are flagged', () => {
    expect(resultsFlagKey({ hasCards: true, origin: 'search' })).toBe('footer.nonAi');
  });
  it('cards from the AI route are not flagged', () => {
    expect(resultsFlagKey({ hasCards: true, origin: 'ai' })).toBeNull();
  });
  it('no cards, no flag, whatever the origin', () => {
    expect(resultsFlagKey({ hasCards: false, origin: 'search' })).toBeNull();
    expect(resultsFlagKey({ hasCards: false, origin: 'ai' })).toBeNull();
  });
  it('an unknown origin is not flagged — never claim "non-AI" without knowing', () => {
    expect(resultsFlagKey({ hasCards: true, origin: null })).toBeNull();
    expect(resultsFlagKey({ hasCards: true, origin: 'other' })).toBeNull();
    expect(resultsFlagKey({ hasCards: true })).toBeNull();
    expect(resultsFlagKey()).toBeNull();
  });
});

// The nine-locale strings are checked in tellme-ai-lever.test.js, which bundles i18n.js with a
// React stand-in: importing i18n.js here would pull React into the root test job
// (test-import-graph-guard.test.js).

describe('App.jsx wiring', () => {
  const app = read('web/cuisine/src/v2/App.jsx');
  const body = (start, end) => { const a = app.indexOf(start); return app.slice(a, app.indexOf(end, a)); };

  it('origin state exists and starts unknown', () => {
    expect(app).toMatch(/const \[resultsOrigin, setResultsOrigin\] = useState\(null\)/);
  });
  it('the AI route marks its results AI', () => {
    expect(body('async function handleNLSubmit(', 'function handleNLReplace(')).toMatch(/setResultsOrigin\(RESULTS_ORIGIN\.AI\)/);
  });
  it('the normal search marks its results non-AI, for both the streamed and the final list', () => {
    const n = (app.match(/setResultsOrigin\(RESULTS_ORIGIN\.SEARCH\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
    const onBase = body('onBase: (ev) => {', 'onPatch:');
    expect(onBase).toMatch(/setResultsOrigin\(RESULTS_ORIGIN\.SEARCH\)/);
  });
  it('the language-reload stash carries the origin and the restore puts it back', () => {
    expect(app).toMatch(/venues, searchCenter, userLoc, selectedCityLocation,\s*resultsOrigin,/);
    expect(app).toMatch(/setResultsOrigin\(restored\.resultsOrigin/);
  });
  it('the footer renders the flag above the experimental / region / version tag', () => {
    const flagAt = app.indexOf('resultsFlagKey({');
    const tagAt = app.indexOf("t('footer.experimental', lang)");
    expect(flagAt).toBeGreaterThan(0);
    expect(tagAt).toBeGreaterThan(flagAt);
  });
});
