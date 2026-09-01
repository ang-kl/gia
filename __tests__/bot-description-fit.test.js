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

const { SUPPORTED } = require('../i18n');

// v0.62.723's copy, KEPT. It is not the shipped text any more, but it is the
// text the trimmer was written for, and deleting it would delete the evidence
// that the defect was real. The block below still asserts it overflows.
function enDescriptionV0_60_37(cuisines, hawker) {
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

// v0.62.884's copy — the one index.js actually sends. Mirrors
// registerCommandsMenu()'s enDescription line for line.
function enDescription(cuisines, hawker) {
  return '/menu · every feature, one tap\n'
    + `/cuisine · ${cuisines} cuisines, SG + Johor Bahru\n`
    + '/location · change location\n'
    + `/hawker · >${hawker} hawker centres\n`
    + '/recognised · Michelin, Bib, Asia 50/100\n'
    + '/weather · now + 2h NEA forecast\n'
    + '/transport · bus, MRT, walk, drive\n'
    + '/carpark · nearest 5, free lots\n'
    + '/search · dishes, ingredients, tools\n'
    + '/rating · min rating 0–5\n'
    + '/clipboard · saved cuisine clips\n'
    + `/language · ${SUPPORTED.length} languages\n`
    + '/privacy · data + sources\n'
    + '/forgetme · erase stored data\n\n'
    + 'Tap 🍴 Cuisine Picker to jump in.';
}

describe('the shipped description, at real counts', () => {
  // '50+'/'100' is the hardcoded fallback; the others are live-ish figures.
  // Counts only grow, so a long pair is the case that matters. v0.62.884 adds
  // an absurd pair, because "fits at today's numbers" is not the guarantee.
  const CASES = [['50+', '100'], ['69', '121'], ['120', '127'], ['999+', '999'], ['9999+', '9999']];

  it('the v0.60.37 copy really was over the cap — the defect stays reproduced', () => {
    // INVERTED RATHER THAN DELETED, v0.62.884. This assertion used to name the
    // SHIPPED copy; the rewrite made it fit, so the assertion's premise expired.
    // Deleting it would delete the reason fitDescription exists. Pointing it at
    // the old text keeps the history true and frees the shipped copy to be held
    // to the stronger standard below.
    for (const [c, h] of CASES) {
      expect(measure(enDescriptionV0_60_37(c, h)), `counts ${c}/${h}`).toBeGreaterThan(CAP);
    }
  });

  it('the shipped copy now fits WITHOUT being trimmed, at every count value', () => {
    // Stronger than "fits after trimming": trimming silently drops the hint or
    // whole command lines, so a passing trim test is compatible with a menu the
    // user never sees in full. trimmed === null is the real guarantee.
    for (const [c, h] of CASES) {
      const fit = fitDescription(enDescription(c, h));
      expect(fit.length, `counts ${c}/${h}`).toBeLessThanOrEqual(CAP);
      expect(fit.trimmed, `counts ${c}/${h} — the shipped copy should not need trimming`).toBe(null);
      expect(fit.text).toBe(enDescription(c, h));
    }
  });

  it('carries all fourteen commands, and no longer advertises the retired /buddy', () => {
    const { COMMAND_IDS } = require('../bot-commands');
    const text = enDescription('69', '121');
    expect(COMMAND_IDS).toHaveLength(14);
    for (const id of COMMAND_IDS) expect(text, `/${id} missing from the description`).toContain(`/${id}`);
    expect(text, '/buddy was retired at v0.60.113').not.toContain('/buddy');
  });

  it('and the locale count in it is derived, so it cannot go stale the way "English / Français" did', () => {
    expect(enDescription('69', '121')).toContain(`/language · ${SUPPORTED.length} languages`);
    expect(enDescription('69', '121')).not.toContain('English / Français');
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
