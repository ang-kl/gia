// __tests__/dish-notes-i18n.test.js — v0.62.779
//
// THE 📜 DISH NOTES ARE THE LARGEST BODY OF USER-FACING PROSE IN THIS REPO AND
// NOTHING ASSERTED ANYTHING ABOUT THEM. 1,681 notes reach the reader through the
// loading-modal fun-fact rotation (dishFactsFromPlate), and twice this month the
// corpus was found silently short:
//
//   v0.62.777  28 base notes had no row in the i18n overlay at all, so they
//              rendered English to id/ru/de/zh/ja/es readers.
//   v0.62.778  `fr` was never in translate-content.mjs's TARGET_LANGS, so 1,649
//              of 1,681 notes rendered English to FRENCH readers — the product's
//              own second language — while six others read their own.
//
// Both were invisible because coverage was never measured against the MERGED
// table. nation-overlay.js folds the overlay onto each dish at load and a
// hand-authored note wins, so reading either file alone understates or
// overstates it. This reads what nation-overlay.js actually serves.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const LANGS = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];

const mergedNotes = () => {
  const { NATION_OVERLAY } = require('../nation-overlay.js');
  const out = [];
  for (const [slug, v] of Object.entries(NATION_OVERLAY)) {
    for (const d of (v.iconicDishes || [])) {
      if (d && d.note && typeof d.note === 'object') out.push([`${slug}::${d.name || d.dish}`, d.note]);
    }
  }
  return out;
};

describe('dish notes — merged locale coverage', () => {
  it('every merged dish note carries all 8 locales', () => {
    const notes = mergedNotes();
    expect(notes.length).toBeGreaterThan(1600);
    const gaps = [];
    for (const [key, note] of notes) {
      for (const l of LANGS) {
        if (typeof note[l] !== 'string' || !note[l]) gaps.push(`${key}/${l}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('every base note has an overlay row, and every row carries the 7 non-EN languages', () => {
    // The v0.62.777 direction: a dish added to the base after the last generator
    // run has no overlay row and quietly falls back to English everywhere.
    const base = require('../nation-overlay-dishnotes.generated.js');
    const overlay = require('../nation-overlay-dishnotes-i18n.generated.js');
    expect(Object.keys(base).filter((k) => !overlay[k])).toEqual([]);
    const short = Object.entries(overlay)
      .filter(([k]) => base[k])
      .filter(([, v]) => LANGS.filter((l) => l !== 'en').some((l) => !v[l]))
      .map(([k]) => k);
    expect(short).toEqual([]);
  });

  it("TARGET_LANGS covers every language the reader can be served in", () => {
    // The v0.62.778 direction, and the one a data check cannot catch: the corpus
    // can be complete today while the GENERATOR still omits a language, so the
    // next batch of dishes reopens the hole. Read from source — the script needs
    // GEMINI_API_KEY at import time and must not be executed here.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'translate-content.mjs'), 'utf8');
    const m = /^const TARGET_LANGS = \[([^\]]*)\]/m.exec(src);
    expect(m, 'TARGET_LANGS declaration').toBeTruthy();
    const langs = [...m[1].matchAll(/'([a-z]{2})'/g)].map((x) => x[1]).sort();
    expect(langs).toEqual(LANGS.filter((l) => l !== 'en').sort());
  });
});

// The v0.62.779 direction: COVERAGE IS NOT FIDELITY. The 1,653 French notes shipped
// in v0.62.778 were written by hand in one pass with no second reader, and a
// measured 160 of them dropped the English sentence's hedge — "often served with",
// "typically made from", "traditionally eaten at" — turning a qualified claim into
// a flat one. Every locale was present and every gate was green while that was true.
const EN_HEDGE = /\b(often|typically|traditionally|usually|sometimes|generally|commonly|frequently|occasionally)\b/i;
// Any French device that keeps the claim non-absolute counts: adverb, adjective or
// turn of phrase. WHEN THIS FAILS ON A LEGITIMATE PARAPHRASE, ADD THE FORM HERE —
// that is the intended fix, not deleting the note's hedge to match.
const FR_HEDGE = /(souvent|en g[ée]n[ée]ral|g[ée]n[ée]ralement|traditionnellement|traditionnel|habituellement|parfois|couramment|courant|courante|typiquement|typique|fr[ée]quemment|d'ordinaire|ordinairement|classiquement|le plus souvent|la plupart|volontiers|d'usage|de coutume|en r[èe]gle g[ée]n[ée]rale|bien souvent|r[ée]pandu|incontournable|la tradition|de pr[ée]f[ée]rence)/i;

describe('dish notes — French fidelity, not just presence', () => {
  it('a hedge in the English note survives into the French', () => {
    const seen = new Set();
    const dropped = [];
    for (const [key, note] of mergedNotes()) {
      if (!note.en || !note.fr || seen.has(note.fr)) continue;
      seen.add(note.fr);
      if (EN_HEDGE.test(note.en) && !FR_HEDGE.test(note.fr)) dropped.push(key);
    }
    expect(dropped).toEqual([]);
  });
});
