// fun-facts-ko.test.js — v0.62.919
//
// The 72 Korean fun-fact bodies, checked as CONTENT rather than as row count.
//
// ⚠ WHY THIS FILE EXISTS AT ALL. `lib/fun-facts.js` listed `ko` in OVERLAY_LANGS from
// v0.62.915 and the overlay carried id/ru/de/zh/ja/es and no ko — so `factBody(fact, 'ko')`
// asked for a Korean body, found none, and returned English, on BOTH the bot and the Mini
// App. Nothing failed. A locale can sit in an allow-list with nothing behind it and every
// test stays green, because the allow-list and the data are different files.
//
// ⚠ AND WHY IT DOES NOT COUNT ROWS. A count of 72 is satisfied by 72 rows whatever they
// hold. The station overlay's first pass reported "68/68 rows · 334 cells · 0 defects" and
// 45 of the 68 were katakana — a pronunciation guide sitting in a translation's slot
// ([AMD-158]). Every band below is MEASURED from the shipped file, then given headroom;
// none is guessed. The K4 length band was guessed at [0.4, 2.5] and a doubled sentence
// walked through it.

import { describe, it, expect, beforeAll } from 'vitest';
import { factBody } from '../web/cuisine/src/v2/lib/fun-facts.js';

const HANGUL = /[가-힣]/;
const KANA = /[぀-ヿ]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const HAN = /[一-鿿]/;

describe('fun-facts Korean overlay', () => {
  let ov; let byId; let ids;

  beforeAll(async () => {
    ov = (await import('../web/cuisine/src/v2/data/fun-facts-i18n.generated.js')).default;
    const data = await import('../web/cuisine/src/v2/data/fun-facts.js');
    const F = data.FUN_FACTS || data.default;
    const all = Array.isArray(F) ? F : Object.values(F);
    byId = new Map(all.map((f) => [f.id, f]));
    ids = Object.keys(ov);
    // ⚠ ABORT ON AN EMPTY PARSE, before any assertion below can be vacuously true of nothing.
    expect(ids.length, 'the overlay parsed zero rows — every check below would be vacuous').toBe(72);
    expect(byId.size, 'the fact corpus parsed zero rows').toBe(72);
  });

  it('every overlay row carries a ko body', () => {
    expect(ids.filter((id) => !ov[id].ko), 'rows with no Korean').toEqual([]);
  });

  it('every ko body is written in Hangul', () => {
    // The romanisation check. A body that reads "Penang asam laksa neun tamarind..." would
    // pass a length band, pass an echo check, and be useless to a Korean reader.
    expect(ids.filter((id) => !HANGUL.test(ov[id].ko)), 'ko bodies with no Hangul').toEqual([]);
  });

  it('no ko body is its English body', () => {
    const echo = ids.filter((id) => ov[id].ko.trim() === (byId.get(id)?.en || '').trim());
    expect(echo, 'ko bodies byte-identical to the English').toEqual([]);
  });

  it('no ko body carries kana or Cyrillic', () => {
    // How a `ja` or `ru` body reaches the ko slot: a mis-keyed insertion, a bad merge, a
    // copy from the row above. Measured on the shipped file: 0 kana, 0 Cyrillic, 0 Han.
    const bad = ids.filter((id) => KANA.test(ov[id].ko) || CYRILLIC.test(ov[id].ko) || HAN.test(ov[id].ko));
    expect(bad, 'ko bodies carrying kana, Cyrillic or Han').toEqual([]);
  });

  it('the Latin share stays far below a romanisation', () => {
    // MEASURED on the 72: 0.000 – 0.153. Latin runs are real — dish names ("asam laksa"),
    // acronyms (NEA, CNN) and years stay in the Latin script in Korean prose. A full
    // romanisation would sit near 0.9, and `ja` — which does the same thing with more of
    // it — reaches 0.57. The ceiling is 0.35: above anything the corpus does, far below
    // anything a romanisation could.
    const worst = ids.map((id) => ({
      id, share: (ov[id].ko.match(/[A-Za-z]/g) || []).length / ov[id].ko.length,
    })).sort((a, b) => b.share - a.share);
    expect(worst[0].share, `${worst[0].id} is mostly Latin characters`).toBeLessThan(0.35);
  });

  it('the length ratio against English sits in the CJK band', () => {
    // MEASURED: 0.423 – 0.730, mean 0.543 — inside the shipped `zh` (0.26–0.66) and `ja`
    // (0.43–0.86) bands, which is what Korean should look like beside them. The floor
    // catches a truncated body, the ceiling a doubled sentence or an untranslated echo
    // (which lands at exactly 1.0). Headroom on both sides, but not the [0.4, 2.5] the K4
    // guard guessed — a band no real corpus comes near cannot catch anything.
    const ratios = ids.map((id) => ({ id, r: ov[id].ko.length / (byId.get(id).en.length || 1) }));
    const lo = ratios.reduce((a, b) => (a.r < b.r ? a : b));
    const hi = ratios.reduce((a, b) => (a.r > b.r ? a : b));
    expect(lo.r, `${lo.id} is short enough to be a fragment`).toBeGreaterThan(0.30);
    expect(hi.r, `${hi.id} is long enough to be doubled or untranslated`).toBeLessThan(0.95);
  });

  it('factBody resolves ko through the overlay, not to English', () => {
    // ⚠ THE ONE CHECK THAT CALLS THE CODE. Everything above reads the data file; this reads
    // what a Korean reader actually gets, which is the thing that was broken. A table can be
    // complete while the call site never reaches it — the defect [AMD-152] recorded four
    // times over.
    const facts = [...byId.values()].map((f) => ({ ...f, _i18n: ov[f.id] }));
    const wrong = facts.filter((f) => {
      const ko = factBody(f, 'ko');
      return !ko || ko === f.en || !HANGUL.test(ko);
    });
    expect(wrong.map((f) => f.id), 'facts whose ko body resolves to English or nothing').toEqual([]);
  });
});
