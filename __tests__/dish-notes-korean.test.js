// __tests__/dish-notes-korean.test.js — K4 of the Korean arc: the overlay dish notes.
//
// 1,684 one-sentence 📜 notes, keyed `${slug}::${dish}`, folded onto each iconicDish's
// `note` by nation-overlay.js at load. `ko` is NOT in any SUPPORTED list yet, so
// `dish-notes-i18n.test.js` — which iterates a hardcoded seven-locale `LOCALES` — cannot
// see this column. The arc stages content first and flips the lists last, which keeps the
// suite green throughout; it also means the content arrives unguarded unless this guards it.
//
// PROSE, NOT NAMES. K3's checks were built for two-word dish names; these are sentences, so
// the tests that matter here are different: script integrity still, but also that the fold
// loop actually delivers `ko` to a served dish, and that the seven columns that shipped
// before it survived a 1,684-row splice. A 256 KB diff is not something a reviewer reads
// line by line — the guard IS the review.
//
// RULE 2 TRANSLITERATES HERE. Hangul is not Latin, so `ko` behaves like `zh`/`ja`: 락사, not
// "laksa". No blanket "no Latin in Hangul" rule — K1 measured 88 distinct residual Latin
// words, nearly all proper nouns and units. The check below is the inverse: a value with no
// Hangul at all is a defect.
//
// Hand-written, no paid translation API. No native speaker has read any of it.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const I18N = require('../nation-overlay-dishnotes-i18n.generated.js');
const BASE = require('../nation-overlay-dishnotes.generated.js');
const NATION_OVERLAY = require('../nation-overlay').NATION_OVERLAY;

const HANGUL = /[가-힣ᄀ-ᇿ㄰-ㆎ]/;
const entries = Object.entries(I18N);
const SHIPPED = ['id', 'ru', 'de', 'zh', 'ja', 'es'];

describe('the Korean column is complete for the overlay dish notes', () => {
  it('covers every entry, and the table is the size the arc has been measuring', () => {
    expect(entries.length, '1,684 note rows — the figure this PR closed on').toBe(1684);
    const missing = entries.filter(([, v]) => !v.ko || !String(v.ko).trim()).map(([k]) => k);
    expect(missing, 'these notes have no Korean').toEqual([]);
  });

  it('and every dish the overlay actually serves with a note resolves to a Korean one', () => {
    // Stated over the OVERLAY rather than over this map, for the same reason K3 states its
    // completeness that way: a dish added to a slug nobody listed slips past a hand-kept list.
    // The fold loop in nation-overlay.js is locale-agnostic — it copies whatever keys the row
    // carries — so this also proves `ko` will flow the moment K6 flips the lists.
    const untranslated = [];
    let slugs = 0, noted = 0;
    for (const [slug, nation] of Object.entries(NATION_OVERLAY)) {
      if (!nation || !Array.isArray(nation.iconicDishes)) continue;
      slugs++;
      for (const d of nation.iconicDishes) {
        if (!d || !d.note || !d.name) continue;
        noted++;
        if (!d.note.ko || !String(d.note.ko).trim()) untranslated.push(`${slug}::${d.name}`);
      }
    }
    expect(untranslated, 'these are served with a note but have no Korean').toEqual([]);
    // Non-vacuity on both dimensions: a failed import cannot pass this by iterating nothing.
    expect(slugs).toBeGreaterThanOrEqual(60);
    expect(noted).toBeGreaterThanOrEqual(1500);
  });

  it('and every key with an English base note has a Korean sibling', () => {
    // The sibling guard `dish-notes-i18n.test.js` asserts the reverse direction — that no base
    // note lacks a translation row. It caught a real error in this arc: two rows were deleted
    // from THIS file after checking only that no slug served them, while their English still
    // existed one file further back. Assert the pairing rather than trusting either count.
    const orphans = Object.keys(BASE).filter((k) => !I18N[k] || !I18N[k].ko);
    expect(orphans, 'these have an English note but no Korean').toEqual([]);
    expect(Object.keys(BASE).length).toBeGreaterThanOrEqual(1600);
  });

  it('and the columns that shipped before it are untouched', () => {
    // The `ko` lines were spliced in by script, one per entry. A splice that also rewrote a
    // neighbouring value would be invisible in a 1,684-entry diff, so the columns are counted.
    for (const l of SHIPPED) {
      const gaps = entries.filter(([, v]) => typeof v[l] !== 'string' || !v[l].trim()).map(([k]) => k);
      expect(gaps, `${l} lost values when ko was inserted`).toEqual([]);
    }
    // `fr` is the exception and is asserted separately: it was never complete. 1,652 of 1,684
    // rows carry one, and stating the number is what stops a future splice from eroding it
    // quietly under cover of "fr was always partial".
    const fr = entries.filter(([, v]) => typeof v.fr === 'string' && v.fr.trim()).length;
    expect(fr).toBe(1652);
  });
});

describe('script integrity, including the direction Korean adds', () => {
  it('no Korean note carries Cyrillic, kana, Han, or a replacement character', () => {
    // The class that fires repeatedly here: text left behind from the locale being copied. Han
    // matters as much as kana — a Korean note holding 拌饭 is the zh value pasted across, and it
    // reads as plausible to anyone who does not know the script.
    const bad = [];
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string') continue;
      if (/[Ѐ-ӿ]/.test(v.ko)) bad.push(`${k}: Cyrillic`);
      if (/[぀-ヿ]/.test(v.ko)) bad.push(`${k}: kana`);
      if (/[一-鿿]/.test(v.ko)) bad.push(`${k}: Han`);
      if (/�/.test(v.ko)) bad.push(`${k}: U+FFFD`);
    }
    expect(bad).toEqual([]);
  });

  it('no Korean note is an English sentence left in place', () => {
    // Not "contains Latin" — proper nouns, grape varieties and initialisms legitimately survive
    // in prose. Four or more consecutive Latin words is the shape of an untranslated clause.
    const bad = []; let checked = 0;
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string') continue;
      checked++;
      if (!HANGUL.test(v.ko)) { bad.push(`${k}: no Hangul at all — ${JSON.stringify(v.ko)}`); continue; }
      const runs = v.ko.match(/[A-Za-z][A-Za-z'’]*(?:\s+[A-Za-z][A-Za-z'’]*){3,}/g);
      if (runs) bad.push(`${k}: English run ${JSON.stringify(runs[0])}`);
    }
    expect(bad).toEqual([]);
    expect(checked).toBe(1684);
  });

  it('and no Korean note is a fragment or a pasted paragraph', () => {
    // These are one sentence each. A note far shorter than its Japanese sibling is usually a
    // truncation; far longer is usually a second sentence or an English clause carried along.
    // A band, not an equality — Korean's `·` list separator legitimately compresses what Japanese
    // spells out, which is what the five outliers at the low end turned out to be on inspection.
    //
    // THE BOUNDS ARE MEASURED, NOT GUESSED, and the first draft's were not: [0.4, 2.5] let a
    // doubled sentence through at ratio 1.64 while the real corpus never exceeds 1.44. Measured
    // across all 1,684 rows: min 0.46, median 0.81, p99 1.17, max 1.44 (british::cask ale).
    const out = [];
    let max = 0, min = Infinity;
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string' || typeof v.ja !== 'string' || !v.ja) continue;
      const ratio = v.ko.length / v.ja.length;
      max = Math.max(max, ratio); min = Math.min(min, ratio);
      if (ratio < 0.4 || ratio > 1.6) out.push(`${k}: ko/ja ${ratio.toFixed(2)} (ko ${v.ko.length}, ja ${v.ja.length})`);
    }
    expect(out).toEqual([]);
    // The band is only as good as its headroom, so the headroom is asserted rather than assumed.
    // If a legitimate future note pushes past this, the number moves and the comment above moves
    // with it — an assertion nobody can read the provenance of is one that gets widened silently.
    expect(max).toBeLessThanOrEqual(1.45);
    expect(min).toBeGreaterThanOrEqual(0.45);
    // KNOWN LIMIT, recorded rather than dropped: a paste-through under ~1.6x ja is invisible to
    // length. The doubled-sentence mutation was caught at 1.64 with 11% to spare, not comfortably.
  });
});

describe('K4 changes content only', () => {
  it('ko is still not an app locale, which is what makes staging safe', () => {
    expect(require('../i18n').SUPPORTED).not.toContain('ko');
    expect(require('../user-prefs').SUPPORTED).not.toContain('ko');
  });

  it('and the fold loop carries ko without having been told about it', () => {
    // nation-overlay.js copies `Object.entries(loc)`, not a hardcoded locale list. That is why
    // K4 needs no code change at all — and it is worth asserting, because a future "tighten the
    // fold to known locales" refactor would silently strip this whole PR back out.
    const [key, row] = entries.find(([k, v]) => v.ko && k.includes('::'));
    const [slug, dish] = key.split('::');
    const served = (NATION_OVERLAY[slug]?.iconicDishes || [])
      .find((d) => d && d.name && String(d.name).toLowerCase() === dish);
    if (served && served.note) expect(served.note.ko).toBe(row.ko);
    expect(typeof row.ko).toBe('string');
  });
});
