// bot-description-fit.test.js — v0.62.723
//
// The regression this guards is not "the helper trims correctly" — it is that
// the REAL description, at the real interpolated counts, fits. That is the
// thing that silently broke: 520-524 characters against a 512 cap, rejected on
// every boot since v0.60.37, visible only as `400 BOT_DESC_INVALID` in a
// non-fatal catch.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { fitDescription, measure, CAP } = require('../bot-description-fit');

// The shipped copy, with the two interpolated counts as parameters.
function enDescription(cuisines, hawker) {
  return `/cuisine (or /c) · ${cuisines} cuisines, SG, Johor Bahru + other cities, quick filters\n`
    + '/location (or /l) · change location [street]\n'
    + `/hawker · >${hawker} hawker centres (2026)\n`
    + '/recognised · Michelin, Bib Gourmand, Asia 50/100\n'
    + '/weather · now + 2-hour NEA forecast\n'
    + '/transport · bus, MRT, walk, drive\n'
    + '/carpark · nearest 5 with available lots\n'
    + '/buddy · live solo-dining match\n'
    + '/search (or /s) · dishes, ingredients, tools\n'
    + '/language · English / Français\n'
    + '/privacy · data + sources\n'
    + '/forgetme · erase stored data\n\n'
    + 'Tap 🍴 Cuisine Picker to jump in.';
}

describe('the shipped description, at real counts', () => {
  // '50+'/'100' is the hardcoded fallback; the others are live-ish figures.
  // Counts only grow, so a long pair is the case that matters.
  const CASES = [['50+', '100'], ['69', '121'], ['120', '127'], ['999+', '999']];

  it('was over the cap before this fix — the defect is reproduced, not assumed', () => {
    for (const [c, h] of CASES) {
      expect(measure(enDescription(c, h)), `counts ${c}/${h}`).toBeGreaterThan(CAP);
    }
  });

  it('fits after fitDescription, at every count value', () => {
    for (const [c, h] of CASES) {
      const fit = fitDescription(enDescription(c, h));
      expect(fit.length, `counts ${c}/${h}`).toBeLessThanOrEqual(CAP);
    }
  });

  it('keeps all twelve commands — only the hint line is sacrificed', () => {
    const fit = fitDescription(enDescription('69', '121'));
    expect(fit.trimmed).toBe('hint');
    for (const cmd of ['/cuisine', '/location', '/hawker', '/recognised', '/weather',
      '/transport', '/carpark', '/buddy', '/search', '/language', '/privacy', '/forgetme']) {
      expect(fit.text).toContain(cmd);
    }
  });
});

describe('fitDescription', () => {
  it('leaves a short description completely alone', () => {
    const r = fitDescription('hello');
    expect(r).toEqual({ text: 'hello', length: 5, trimmed: null });
  });

  it('counts the pessimistic way, so an emoji near the boundary cannot slip past', () => {
    // '🍴' is 1 code point but 2 UTF-16 units. Telegram does not document which
    // it counts, so the larger measure is the only safe one.
    expect(measure('🍴')).toBe(2);
    expect([...'🍴'].length).toBe(1);
  });

  it('drops whole lines when removing the hint is not enough', () => {
    const body = Array.from({ length: 40 }, (_, i) => `/cmd${i} · a description here`).join('\n');
    const r = fitDescription(body + '\n\nhint');
    expect(r.trimmed).toBe('lines');
    expect(r.length).toBeLessThanOrEqual(CAP);
    expect(r.text.endsWith('\n')).toBe(false);   // no dangling separator
  });

  it('never splits a surrogate pair on the hard cut', () => {
    const r = fitDescription('🍴'.repeat(600));
    expect(r.trimmed).toBe('hard');
    expect(r.text).not.toContain('�');
    expect([...r.text].every((ch) => ch === '🍴')).toBe(true);
  });

  it('handles null and undefined without throwing', () => {
    expect(fitDescription(null).text).toBe('');
    expect(fitDescription(undefined).text).toBe('');
  });
});
