// __tests__/auto-search-gate.test.js — v0.62.899
//
// The predicate behind "the page reloaded to re-language the map, so do not overwrite the
// results we carried across". It is four lines of logic and it gets its own module and its own
// test for one reason: `App.jsx` cannot be imported and driven, so a rule that lives inside it
// can only ever be checked by scanning source — and a source scan is exactly what was green
// while this bug was live. `locale-reload-no-research.test.js` pinned the one line that had been
// fixed and could not see the two callers that had not.
//
// So the decision moves somewhere a test can CALL it. Same carve-out, same reason, as
// bot-keyboard.js (v0.62.891), venue-type-label.js and places-language.js (v0.62.896).

import { describe, it, expect } from 'vitest';
import { shouldSuppressAutoSearch } from '../web/_shared/lib/auto-search-gate.js';

describe('shouldSuppressAutoSearch', () => {
  it('suppresses an automatic search on a restored mount — the whole point', () => {
    expect(shouldSuppressAutoSearch({ restored: true, auto: true })).toBe(true);
  });

  it('never suppresses an EXPLICIT search, restored or not', () => {
    // The operator toggling the language must not lose their 🔍 button for the rest of the
    // session. This is the asymmetry that makes opt-in the right default.
    expect(shouldSuppressAutoSearch({ restored: true, auto: false })).toBe(false);
    expect(shouldSuppressAutoSearch({ restored: true })).toBe(false);
    expect(shouldSuppressAutoSearch({ restored: true, auto: undefined })).toBe(false);
  });

  it('never suppresses anything on a normal mount', () => {
    // A boot that is NOT a locale restore must load its results, or the app opens empty —
    // which is a worse bug than the one being fixed, and the failure mode of getting the
    // polarity backwards.
    expect(shouldSuppressAutoSearch({ restored: false, auto: true })).toBe(false);
    expect(shouldSuppressAutoSearch({ auto: true })).toBe(false);
  });

  it('is total — no input shape throws or returns a non-boolean', () => {
    // It is called inside `runSearch`, on every search, including paths where `opts` is absent.
    // A throw here would take out the search itself, so the argument default and the Boolean()
    // coercion are load-bearing rather than defensive habit.
    for (const args of [undefined, {}, null && {}, { restored: null, auto: 'yes' },
      { restored: 1, auto: 1 }, { restored: 0, auto: {} }]) {
      const out = shouldSuppressAutoSearch(args);
      expect(typeof out, JSON.stringify(args)).toBe('boolean');
    }
    expect(shouldSuppressAutoSearch()).toBe(false);
    // Truthy non-booleans still mean yes — callers pass `opts?.auto` straight through.
    expect(shouldSuppressAutoSearch({ restored: 1, auto: 1 })).toBe(true);
  });

  it('the module stays pure — no React, no window, no imports', () => {
    // It is imported by App.jsx (a browser bundle) and by this test (node). Reaching for
    // `window` would break one of the two, and the whole reason it is extractable is that it
    // reaches for neither.
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'web/_shared/lib/auto-search-gate.js'), 'utf8');
    const code = src.replace(/\/\/[^\n]*/g, '');   // its own header discusses these words
    expect(code).not.toMatch(/\bwindow\b|\bdocument\b|\buseState\b|\buseEffect\b/);
    expect(code).not.toMatch(/^\s*import\s/m);
  });
});
