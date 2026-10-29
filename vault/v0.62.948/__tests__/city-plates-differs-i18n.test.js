// city-plates-differs-i18n.test.js — v0.62.886
//
// THE DEFECT. ArrivalPlate renders "differs from {x}" — the prefix from i18n,
// the object from city-plates.js. The prefix was complete in all nine locales
// and the object was always English, so a Spanish reader got
//
//     se diferencia de KL's dark-soy + pork-lard version
//
// a Spanish preposition governing an English possessive genitive, which parses
// as neither language. Nothing flagged it: city-plates-i18n.generated.js scoped
// the translation programme to `history` bodies and listed `local`, `claim`,
// `tier` and `sources` as never translated. `differsFrom` is in NEITHER list.
// It was not excluded — it was never considered.
//
// The second half of the defect was word ORDER, and it was invisible to every
// existing check because the key resolved fine in all nine locales: Japanese
// rendered "との違い ○○" (the と particle needs its noun in front) and Korean
// "이것과 다릅니다 ○○", a complete sentence with the subject dangling after it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const { CITY_PLATES } = require('../city-plates.js');
const OVERLAY = require('../city-plates-differs-i18n.generated.js');

const LOCALES = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const ROWS = [];
for (const [city, entry] of Object.entries(CITY_PLATES)) {
  for (const d of (entry.dishes || [])) {
    if (d.differsFrom) ROWS.push([`${city}::${d.dish}`, d]);
  }
}

describe('every differsFrom clause is translated', () => {
  it('49 of the 279 plate dishes carry one, and all 49 are covered', () => {
    expect(ROWS.length).toBe(49);
    expect(Object.keys(OVERLAY)).toHaveLength(49);
    const uncovered = ROWS.filter(([k]) => !OVERLAY[k]).map(([k]) => k);
    expect(uncovered).toEqual([]);
    // …and no orphan rows pointing at a dish that has no clause. K4 shipped two
    // of those because only one direction was checked.
    const keys = new Set(ROWS.map(([k]) => k));
    expect(Object.keys(OVERLAY).filter((k) => !keys.has(k))).toEqual([]);
  });

  it('the fold reaches every row at load, in all eight locales', () => {
    const gaps = [];
    for (const [k, d] of ROWS) {
      for (const l of LOCALES) {
        const v = d.differsFromI18n && d.differsFromI18n[l];
        if (typeof v !== 'string' || !v.trim()) gaps.push(`${k}.${l}`);
      }
    }
    expect(gaps).toEqual([]);
    expect(ROWS.length * LOCALES.length).toBe(392);
  });

  it('and the English clause is left exactly where it was', () => {
    // differsFromI18n is an ADDITION. The English field is the fallback and the
    // search text; overwriting it would have been a different change.
    for (const [k, d] of ROWS) {
      expect(typeof d.differsFrom, k).toBe('string');
      expect(d.differsFrom.trim().length, k).toBeGreaterThan(0);
      expect(d.differsFromI18n.en, `${k}: en must not be in the overlay`).toBeUndefined();
    }
  });

  it('no locale silently serves the English', () => {
    const same = [];
    for (const [k, d] of ROWS) {
      for (const l of LOCALES) {
        if (d.differsFromI18n[l] === d.differsFrom) same.push(`${k}.${l}`);
      }
    }
    expect(same).toEqual([]);
  });

  it('and no two locales in one row are byte-identical', () => {
    const dupes = [];
    for (const [k, d] of ROWS) {
      const seen = new Map();
      for (const l of LOCALES) {
        const v = d.differsFromI18n[l];
        if (seen.has(v)) dupes.push(`${k}: ${l} === ${seen.get(v)}`);
        else seen.set(v, l);
      }
    }
    expect(dupes).toEqual([]);
  });
});

describe('scripts stay where they belong', () => {
  const CJK = /[぀-ヿ一-鿿]/, CYR = /[Ѐ-ӿ]/, HANGUL = /[가-힣]/, KANA = /[぀-ヿ]/, HAN = /[一-鿿]/;

  it('no script leaks into a locale that does not use it', () => {
    const bad = [];
    for (const [k, d] of ROWS) {
      for (const l of LOCALES) {
        const v = d.differsFromI18n[l];
        if (['ru', 'de', 'es', 'id', 'fr'].includes(l) && CJK.test(v)) bad.push(`${k}.${l}: CJK`);
        if (['zh', 'ja', 'de', 'es', 'id', 'fr', 'ko'].includes(l) && CYR.test(v)) bad.push(`${k}.${l}: Cyrillic`);
        if (l !== 'ko' && HANGUL.test(v)) bad.push(`${k}.${l}: Hangul`);
        if (l !== 'ja' && KANA.test(v)) bad.push(`${k}.${l}: kana`);
        if (l === 'ko' && HAN.test(v)) bad.push(`${k}.ko: Han character`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('and each non-Latin locale actually uses its own script', () => {
    const missing = [];
    for (const [k, d] of ROWS) {
      const i = d.differsFromI18n;
      if (!HANGUL.test(i.ko)) missing.push(`${k}.ko`);
      if (!CYR.test(i.ru)) missing.push(`${k}.ru`);
      if (!HAN.test(i.zh)) missing.push(`${k}.zh`);
      if (!KANA.test(i.ja) && !HAN.test(i.ja)) missing.push(`${k}.ja`);
    }
    expect(missing).toEqual([]);
  });

  it('no clause is left in English inside a non-Latin locale', () => {
    // Five consecutive Latin words, not four: these rows legitimately quote
    // multi-word proper nouns — "Nong Mon, Chon Buri", "Nam Vang = Phnom Penh",
    // "mee hokkien phuket". The threshold was set from the corpus, not guessed.
    const bad = [];
    for (const [k, d] of ROWS) {
      for (const l of ['ru', 'zh', 'ja', 'ko']) {
        const run = d.differsFromI18n[l].match(/(?:\b[A-Za-z][A-Za-zÀ-ÿ'’-]*\b[ ]+){4,}\b[A-Za-z][A-Za-z'’-]*\b/);
        if (run) bad.push(`${k}.${l}: "${run[0]}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('length stays inside the band the corpus actually occupies', () => {
    // Measured after authoring, not before: zh/ja/ko compress hard (0.21–0.74)
    // and the Latin locales run long (0.82–2.00). A band guessed from K4's dish
    // notes would have rejected a fifth of these rows.
    const band = { fr: [0.9, 2.1], id: [0.7, 2.1], ru: [0.7, 2.1], de: [0.8, 2.3], zh: [0.15, 0.9], ja: [0.25, 0.9], es: [0.8, 2.2], ko: [0.3, 0.9] };
    const out = [];
    for (const [k, d] of ROWS) {
      for (const l of LOCALES) {
        const r = d.differsFromI18n[l].length / d.differsFrom.length;
        const [lo, hi] = band[l];
        if (r < lo || r > hi) out.push(`${k}.${l}: ${r.toFixed(2)} outside [${lo}, ${hi}]`);
      }
    }
    expect(out).toEqual([]);
  });
});

describe('the sentence reads as a sentence in every locale', () => {
  const SRC = readFileSync(join(ROOT, 'web/cuisine/src/v2/lib/i18n.js'), 'utf8');
  const template = (lang) => {
    const esc = 'plate\\.differsFrom';
    if (lang === 'en' || lang === 'fr') {
      const b = SRC.match(new RegExp(`^\\s*'${esc}':\\s*\\{(.*)\\},$`, 'm'));
      const m = b[1].match(new RegExp(`${lang}:\\s*'([^']*)'`));
      return m[1];
    }
    for (const m of SRC.matchAll(/const ([A-Z]{2})_STRINGS = \{([\s\S]*?)\n\};/g)) {
      if (m[1].toLowerCase() !== lang) continue;
      const v = m[2].match(new RegExp(`["']${esc}["']:\\s*["']([^"']*)["']`));
      if (v) return v[1];
    }
    return null;
  };

  it('the prefix is a TEMPLATE with {x}, in all nine locales', () => {
    // Rendered as `${t(key)} ${value}` this line could only ever be right in
    // languages that put the preposition first. Making it a template is what
    // lets Japanese and Korean put the noun where their grammar needs it.
    for (const l of ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']) {
      const t = template(l);
      expect(t, `plate.differsFrom.${l}`).toBeTruthy();
      expect(t, `plate.differsFrom.${l} must carry {x}`).toContain('{x}');
    }
  });

  it('and Japanese and Korean put the noun before their postposition', () => {
    expect(template('ja')).toBe('{x}との違い');
    expect(template('ja').indexOf('{x}')).toBe(0);
    // Korean 와/과 agrees with the preceding syllable, which a static template
    // cannot compute — so the particle is anchored to the fixed word 다음 and
    // the variable goes last, rather than shipping the hedged "와(과)".
    expect(template('ko')).toBe('다음과 다름: {x}');
    expect(template('ko')).not.toContain('와(과)');
  });

  it('the render uses tn(), not a bare concatenation', () => {
    const plate = readFileSync(join(ROOT, 'web/cuisine/src/v2/components/ArrivalPlate.jsx'), 'utf8');
    expect(plate).toMatch(/tn\('plate\.differsFrom', lang, \{ x:/);
    expect(plate, 'the old prefix-then-value shape must be gone')
      .not.toMatch(/\{t\('plate\.differsFrom', lang\)\} \{d\.differsFrom\}/);
    expect(plate).toMatch(/localisedBody\(d\.differsFromI18n, lang\) \|\| d\.differsFrom/);
  });
});
