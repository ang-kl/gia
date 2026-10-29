// city-plate-names-i18n.test.js — v0.62.887
//
// THE DEFECT. `dishDisplayName(d, lang)` reads `d.nameI18n` and falls through to
// the English `d.dish` when it is absent. `nameI18n` was attached in exactly two
// places — `_overlayDishMeta` (the "More {country} classics" list) and
// index.js's /api/cuisine/dishes — and NEITHER touches CITY_PLATES[*].dishes.
//
// Measured before the fix: 279 plate dishes, `local` present on 279, `nameI18n`
// present on ZERO. So every 📜 headliner rendered in English in all eight
// non-English locales, which is what the operator photographed: "Hainanese
// Chicken Rice" and "Wanton Mee (SG Style)" sitting above Spanish prose.
//
// WHY THE EXISTING TESTS DID NOT CATCH IT. dish-names-i18n.test.js:798-804 does
// assert "attaches nameI18n to EVERY classic served" — but only over
// `classicGroups`, the overlay list. Nothing looked at `entry.dishes`. The
// assertion existed, it just pointed somewhere else.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CITY_PLATES } = require('../city-plates.js');
const OVERLAY = require('../city-plate-names-i18n.generated.js');
const { namesFor } = require('../dish-names-i18n.js');

const LOCALES = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const ROWS = [];
for (const [city, entry] of Object.entries(CITY_PLATES)) {
  for (const d of (entry.dishes || [])) ROWS.push([`${city}::${d.dish}`, d, entry]);
}

describe('every plate headliner has a name in every locale', () => {
  it('279 dishes, 8 locales, no gaps — it was 0 of 279 before this', () => {
    expect(ROWS.length).toBe(279);
    const gaps = [];
    for (const [k, d] of ROWS) {
      if (!d.nameI18n) { gaps.push(`${k}: no nameI18n at all`); continue; }
      for (const l of LOCALES) {
        const v = d.nameI18n[l];
        if (typeof v !== 'string' || !v.trim()) gaps.push(`${k}.${l}`);
      }
    }
    expect(gaps).toEqual([]);
    expect(ROWS.length * LOCALES.length).toBe(2232);
  });

  it('and dishDisplayName actually returns them, rather than the English', () => {
    // The assertion that would have failed before the fix, stated over the whole
    // set rather than a fixture. A non-vacuity floor so it cannot pass on empty.
    const stillEnglish = [];
    let checked = 0;
    for (const [k, d] of ROWS) {
      for (const l of LOCALES) {
        checked++;
        const shown = d.nameI18n[l];
        // Latin-script locales legitimately keep a proper name ("Ambuyat",
        // "Cao lầu"); the non-Latin ones cannot, so they are the real test.
        if (['ru', 'zh', 'ja', 'ko'].includes(l) && shown === d.dish) stillEnglish.push(`${k}.${l}`);
      }
    }
    expect(stillEnglish).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(2232);
  });

  it('the overlay covers exactly what namesFor and `local` cannot', () => {
    // 243 rows here, 36 answered by the curated table. No orphans either way —
    // K4 lost two overlay rows by checking only one direction.
    expect(Object.keys(OVERLAY)).toHaveLength(243);
    const keys = new Set(ROWS.map(([k]) => k));
    expect(Object.keys(OVERLAY).filter((k) => !keys.has(k)), 'overlay rows naming no dish').toEqual([]);
    const SLUG = { SG: 'singaporean', MY: 'malaysian', TH: 'thai', JP: 'japanese', VN: 'vietnamese', AU: 'australian', NZ: 'new-zealand', ID: 'indonesian', PH: 'filipino', KR: 'korean', CN: 'chinese', TW: 'taiwanese', HK: 'hong-kong', MO: 'macau', BN: 'malaysian' };
    let curated = 0;
    for (const [k, d, entry] of ROWS) {
      const hit = namesFor(d.dish, SLUG[entry.country]);
      if (hit) curated++;
      else expect(OVERLAY[k], `${k}: neither curated nor in the overlay`).toBeTruthy();
    }
    expect(curated).toBe(36);
  });

  it('and the English dish name is never displaced', () => {
    // dish-names-i18n.test.js:815-822 pins this for the classics: `d.dish` is the
    // search key, the Maps query and the card selector. nameI18n is an ADDITION.
    for (const [k, d] of ROWS) {
      expect(typeof d.dish, k).toBe('string');
      expect(d.dish, k).toMatch(/[A-Za-zÀ-ỹ]/);
    }
  });
});

describe('rule 3 — the curated name wins, and is never contradicted', () => {
  const HAN = /[一-鿿]/, KANA = /[぀-ヿ]/, HANGUL = /[가-힣]/;

  it('a dish whose `local` is Chinese, Japanese or Korean uses THAT name', () => {
    // dish-names-i18n.js:26-29: "a second, competing Chinese name invented here
    // would be a regression dressed as coverage." The fold derives these from
    // `local` rather than the overlay carrying a copy, so there is nothing to
    // drift. 63 zh, 22 ja, 22 ko.
    const wrong = [];
    let derived = 0;
    for (const [k, d, entry] of ROWS) {
      for (const part of String(d.local || '').split(/\s*[/;]\s*/)) {
        const p = part.trim();
        if (!p) continue;
        let col = null;
        if (HANGUL.test(p)) col = 'ko';
        else if (KANA.test(p)) col = 'ja';
        else if (HAN.test(p)) col = entry.country === 'JP' ? 'ja' : 'zh';
        if (!col) continue;
        derived++;
        // The curated table may legitimately answer first; what must never
        // happen is a THIRD spelling appearing from the overlay.
        if (OVERLAY[k] && OVERLAY[k][col] && OVERLAY[k][col] !== p) {
          wrong.push(`${k}.${col}: overlay "${OVERLAY[k][col]}" contradicts local "${p}"`);
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(derived).toBeGreaterThanOrEqual(100);
  });

  it('Han never lands in the Korean column, and Japanese dishes keep their kanji in ja', () => {
    // The trap this encodes: 江戸前寿司 on a Tokyo dish is Japanese, not Chinese.
    // Splitting by country alone would have filed it under zh.
    const tokyo = CITY_PLATES['Tokyo'].dishes.find((d) => d.dish === 'Edomae sushi');
    expect(tokyo.nameI18n.ja).toBe('江戸前寿司');
    expect(tokyo.nameI18n.zh).toBe('江户前寿司');
    expect(tokyo.nameI18n.ja).not.toBe(tokyo.nameI18n.zh);
    for (const [k, d] of ROWS) expect(HAN.test(d.nameI18n.ko), `${k}.ko`).toBe(false);
  });
});

describe('scripts stay where they belong', () => {
  const CJK = /[぀-ヿ一-鿿]/, CYR = /[Ѐ-ӿ]/;
  const HANGUL = /[가-힣]/, KANA = /[぀-ヿ]/, HAN = /[一-鿿]/;

  it('no script leaks into a locale that does not use it', () => {
    const bad = [];
    for (const [k, d] of ROWS) {
      for (const l of LOCALES) {
        const v = d.nameI18n[l];
        if (['ru', 'de', 'es', 'id', 'fr'].includes(l) && CJK.test(v)) bad.push(`${k}.${l}: CJK`);
        if (['zh', 'ja', 'de', 'es', 'id', 'fr', 'ko'].includes(l) && CYR.test(v)) bad.push(`${k}.${l}: Cyrillic`);
        if (l !== 'ko' && HANGUL.test(v)) bad.push(`${k}.${l}: Hangul`);
        if (l !== 'ja' && KANA.test(v)) bad.push(`${k}.${l}: kana`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('and each non-Latin locale uses its own script', () => {
    const missing = [];
    for (const [k, d] of ROWS) {
      const n = d.nameI18n;
      if (!HANGUL.test(n.ko)) missing.push(`${k}.ko`);
      if (!CYR.test(n.ru)) missing.push(`${k}.ru`);
      if (!HAN.test(n.zh)) missing.push(`${k}.zh`);
      if (!KANA.test(n.ja) && !HAN.test(n.ja)) missing.push(`${k}.ja`);
    }
    // "Adelaide::AB" is two Latin letters and a real proper noun in every
    // language; its zh carries a gloss so the rule holds without an exemption.
    expect(missing).toEqual([]);
  });

  it('no word mixes Cyrillic and Latin', () => {
    // FOUND BY MUTATION-PROVING, NOT BY READING. "Хвannam-ппан" shipped through
    // every other check here: it has Cyrillic, it is one token, and it is nowhere
    // near four consecutive English words. A half-finished transliteration is
    // invisible to a whole-string test.
    const bad = [];
    for (const [k, d] of ROWS) {
      for (const l of LOCALES) {
        for (const w of String(d.nameI18n[l]).split(/[\s·–—()[\],'’]+/)) {
          if (CYR.test(w) && /[A-Za-z]/.test(w)) bad.push(`${k}.${l}: "${w}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('no name is left in English inside a non-Latin locale', () => {
    const bad = [];
    for (const [k, d] of ROWS) {
      for (const l of ['ru', 'zh', 'ja', 'ko']) {
        const run = String(d.nameI18n[l]).match(/(?:\b[A-Za-z][A-Za-z'’-]*\b[ ]+){3,}\b[A-Za-z][A-Za-z'’-]*\b/);
        if (run) bad.push(`${k}.${l}: "${run[0]}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('the operator’s own screenshot, as a test', () => {
  it('the four Singapore headliners resolve in Spanish, Korean and Japanese', () => {
    const by = Object.fromEntries(CITY_PLATES['Singapore'].dishes.map((d) => [d.dish, d.nameI18n]));
    expect(by['Hainanese chicken rice'].es).toBe('Arroz con pollo hainanés');
    expect(by['Wanton mee (SG style)'].es).toBe('Wanton mee (estilo singapurense)');
    expect(by['Laksa (Katong)'].ko).toBe('락사 (카통)');
    expect(by['Bak kut teh (Teochew)'].ja).toBe('バクテー（潮州式）');
    // …and the 云吞面 chip beside them still comes from `local`, unchanged.
    const wm = CITY_PLATES['Singapore'].dishes.find((d) => d.dish === 'Wanton mee (SG style)');
    expect(wm.local).toBe('云吞面');
    expect(wm.nameI18n.zh).toBe('云吞面');
  });
});
