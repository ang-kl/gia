// __tests__/michelin-native-name.test.js — v0.62.824, Phase 1 of the native-name plan.
//
// JP/CN/KR-michelin.js carry `nameJa`/`nameZh`/`nameKo` (+ the address twin) on 1,202 rows,
// curated by the operator and loaded verbatim. `venueToVenue()` rebuilds every venue from a
// field whitelist, and for three versions those fields were not on it — read from disk and
// dropped in the same breath, while the renderer for them shipped anyway in v0.61.359 and
// waited. This carries them across as one normalised `nameLocal` / `addressLocal`.
//
// THE FIRST TEST IN THIS FILE IS NOT A COUNT. It is the display-versus-key invariant, and it
// is first because it is the one that can do damage. `venue.name` is not only shown:
//
//   ResultCard.jsx:176   the Google Maps query
//   ResultCard.jsx:215   the `detailsId` DOM selector
//   ResultCard.jsx:227   the clipboard payload
//   ResultCard.jsx:243   the share payload
//
// A localised string in that slot breaks a key, not a label — saved items orphan, the
// carousel stops finding its card, Maps searches for kanji. The station work came within one
// field of shipping exactly that (O-329, and before it O-317). So: the native name is added
// BESIDE the key, never into it, and that is asserted before anything is counted.
import { describe, it, expect } from 'vitest';

const md = require('../michelin-data.js');
const V = md.VENUES;

const NATIVE_CC = ['JP', 'CN', 'KR'];
const LATIN_CC = ['FR', 'TH', 'TW', 'HK', 'MO', 'VN', 'MY', 'PH', 'SG'];
const withLocal = V.filter((v) => v.nameLocal);

describe('michelin native names — the key is not the label', () => {
  it('every venue that gained a native name kept its original `name` untouched', () => {
    // The source of truth is the country table, not this module. If `name` had been
    // overwritten by the native string, these would differ.
    const tables = { JP: require('../JP-michelin.js'), CN: require('../CN-michelin.js'), KR: require('../KR-michelin.js') };
    const byId = new Map();
    for (const mod of Object.values(tables)) {
      const rows = Object.values(mod).find((x) => Array.isArray(x) && x.length) || [];
      for (const r of rows) byId.set(r.id, r);
    }
    const drifted = withLocal
      .filter((v) => byId.has(v.id) && v.name !== byId.get(v.id).name)
      .map((v) => `${v.id}: "${byId.get(v.id).name}" → "${v.name}"`);
    expect(drifted, 'a venue name changed — that string is a Maps query and a saved-list key').toEqual([]);
  });

  it('`name` is Latin on every row that has a native name — the key never became the label', () => {
    // Hiragana, katakana, CJK ideographs (incl. Ext-A) and hangul — and deliberately NOT the
    // whole U+3000 block. U+30FB KATAKANA MIDDLE DOT is a separator that appears inside
    // Latin names: "Suyab Courtyard・Pickmoon Gourmet" is a romanized CN name, not a leak.
    // A range of ぀-ヿ flagged it, and the flag was the bug: CN rows whose `name` holds
    // an actual ideograph measure 0.
    const CJK = /[\u3041-\u3096\u30A1-\u30FA\u30FC-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/;
    const bad = withLocal.filter((v) => CJK.test(v.name)).map((v) => `${v.id}: ${v.name}`);
    expect(bad, 'native script reached `name`, which is used as a key at four call sites').toEqual([]);
  });

  it('the native value lives in its own field, and both fields are present together', () => {
    const v = V.find((x) => x.id && x.nameLocal && x.country === 'JP');
    expect(v.name).toBeTruthy();
    expect(v.nameLocal).toBeTruthy();
    expect(v.nameLocal).not.toBe(v.name);
  });
});

describe('michelin native names — coverage, measured against the source files', () => {
  it('1,202 venues carry a native name and 1,186 a native address', () => {
    expect(withLocal.length).toBe(1202);
    expect(V.filter((v) => v.addressLocal).length).toBe(1186);
  });

  // CN is 495 of 511, NOT 511. Sixteen rows genuinely carry no `nameZh` — among them
  // "The Bay by Chef Fei", "Yun Jing" and "Ensue". A test pinned at 511 would fail on
  // correct data, which is how a guard teaches the next person to weaken it.
  it.each([['JP', 590], ['CN', 495], ['KR', 117]])('%s carries %i', (cc, n) => {
    expect(V.filter((v) => v.country === cc && v.nameLocal).length).toBe(n);
  });

  it('the count matches the country tables themselves, not just itself', () => {
    let fromSource = 0;
    for (const f of ['../JP-michelin.js', '../CN-michelin.js', '../KR-michelin.js']) {
      const rows = Object.values(require(f)).find((x) => Array.isArray(x) && x.length) || [];
      fromSource += rows.filter((r) => r.nameJa || r.nameZh || r.nameKo).length;
    }
    expect(withLocal.length).toBe(fromSource);
  });

  it('no country without a native field gained one', () => {
    const leaked = LATIN_CC.filter((cc) => V.some((v) => v.country === cc && (v.nameLocal || v.addressLocal)));
    expect(leaked, 'the whitelist leaked a field into a Latin-script country').toEqual([]);
  });

  it('only the three curated countries have it', () => {
    expect([...new Set(withLocal.map((v) => v.country))].sort()).toEqual(NATIVE_CC.slice().sort());
  });

  it('the corpus itself did not move', () => {
    expect(V.length).toBe(2118);
    expect(V.filter((v) => !v.cuisine).length).toBe(3);   // O-228's named residue, unchanged
  });
});

describe('michelin native names — nothing here was authored', () => {
  // Every value must byte-match the country table it came from. This is the check that
  // separates "moved a field" from "wrote some Japanese".
  it('a sample of 30 rows byte-matches its source row', () => {
    const src = new Map();
    for (const f of ['../JP-michelin.js', '../CN-michelin.js', '../KR-michelin.js']) {
      const rows = Object.values(require(f)).find((x) => Array.isArray(x) && x.length) || [];
      for (const r of rows) src.set(r.id, r);
    }
    const step = Math.floor(withLocal.length / 30) || 1;
    const mismatched = [];
    for (let i = 0; i < withLocal.length; i += step) {
      const v = withLocal[i];
      const r = src.get(v.id);
      if (!r) { mismatched.push(`${v.id}: no source row`); continue; }
      const expectName = r.nameJa || r.nameZh || r.nameKo;
      const expectAddr = r.addressJa || r.addressZh || r.addressKo;
      if (v.nameLocal !== expectName) mismatched.push(`${v.id}: nameLocal ≠ source`);
      if (expectAddr && v.addressLocal !== expectAddr) mismatched.push(`${v.id}: addressLocal ≠ source`);
    }
    expect(mismatched).toEqual([]);
  });
});

describe('michelin native names — the renderer that was already waiting', () => {
  it('the chat card emits the native line under the name, and only under it', () => {
    const { formatVenueBlock } = require('../venue-templates.js');
    const v = V.find((x) => x.name === 'Gion Sasaki');
    expect(v.nameLocal).toBe('祇園 さゝ木');

    const lines = formatVenueBlock(
      { name: v.name, nameLocal: v.nameLocal, area: 'Kyoto', restaurantType: 'Japanese' },
      { number: 1 },
    ).split('\n');

    expect(lines[0]).toContain('<b>Gion Sasaki</b>');   // the name still leads
    expect(lines[1]).toBe('(祇園 さゝ木)');              // the native line sits under it
  });

  it('a venue with no native name renders exactly as before — no empty brackets', () => {
    const { formatVenueBlock } = require('../venue-templates.js');
    const fr = V.find((x) => x.country === 'FR' && x.name === 'Kei');
    expect(fr.nameLocal).toBeUndefined();
    const out = formatVenueBlock({ name: fr.name, nameLocal: fr.nameLocal, area: 'Paris' }, { number: 1 });
    expect(out).not.toContain('()');
    expect(out.split('\n')[0]).toContain('<b>Kei</b>');
  });
});
