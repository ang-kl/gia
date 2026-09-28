// __tests__/discovery-dish.test.js — v0.62.29
//
// Foodie discovery: curated national-dish "Try" fill, evidence-verified.
// Pins the operator's rules: (1) reviews-first — a venue with review-mined
// dishes is never touched (asserted at the index.js gate; here we pin the
// helper contracts); (2) NO unverified claims — a curated dish is returned
// ONLY when the venue's own text mentions it; (3) unfamiliar = the searched
// cuisine's family is not local to the search country (set location).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dd = require('../discovery-dish.js');
const cf = require('../cuisine-family.js');

describe('discovery-dish — iconicDishesFor (unambiguous food only)', () => {
  it('returns food-kind, unshared entries for overlay cuisines', () => {
    expect(dd.iconicDishesFor('french')).toContain('boeuf bourguignon');
    expect(dd.iconicDishesFor('german')).toContain('schnitzel');
    expect(dd.iconicDishesFor('moroccan')).toContain('tagine');
    expect(dd.iconicDishesFor('african')).toContain('jollof rice');
  });

  it('excludes drinks and shared/ambiguous dishes', () => {
    // Singaporean has drinks (teh tarik …) and shared dishes (laksa →
    // sharedWith) — none may appear; unshared SG originals do.
    const sg = dd.iconicDishesFor('singaporean', { max: 50 });
    expect(sg).toContain('chilli crab');
    expect(sg).not.toContain('teh tarik');   // drink
    expect(sg).not.toContain('laksa');       // shared/ambiguous
  });

  it('unknown slug → []', () => {
    expect(dd.iconicDishesFor('klingon')).toEqual([]);
    expect(dd.iconicDishesFor(null)).toEqual([]);
  });
});

describe('discovery-dish — findVerifiedDish (no mention → no claim)', () => {
  const frenchReview = { reviews: [{ text: { text: 'Best bœuf bourguignon in town.' } }] };
  const blandReview = { reviews: [{ text: { text: 'Nice place, friendly staff, lovely decor.' } }] };

  it('claims the dish ONLY when the venue text mentions it', () => {
    expect(dd.findVerifiedDish(frenchReview, 'french')).toEqual(
      { dish: 'boeuf bourguignon', source: 'curated-verified' });
    expect(dd.findVerifiedDish(blandReview, 'french')).toBe(null);
  });

  it('matches across diacritics AND ligatures (bœuf → boeuf, pâté …)', () => {
    const v = { reviews: [{ text: { text: 'the BŒUF BOURGUIGNON était parfait' } }] };
    expect(dd.findVerifiedDish(v, 'french')?.dish).toBe('boeuf bourguignon');
  });

  it('reads the Google editorial/generative summary too', () => {
    const v = { reviews: [], googleSummary: { overview: 'Known for slow-cooked tagine.' } };
    expect(dd.findVerifiedDish(v, 'moroccan')).toEqual(
      { dish: 'tagine', source: 'curated-verified' });
  });

  it('falls back to a famous cooking-method term (method-verified)', () => {
    const v = { reviews: [{ text: { text: 'amazing flambage tableside show' } }] };
    expect(dd.findVerifiedDish(v, 'french')).toEqual(
      { dish: 'flambage', source: 'method-verified' });
  });

  it('defensive: empty venue / unknown slug → null', () => {
    expect(dd.findVerifiedDish({}, 'french')).toBe(null);
    expect(dd.findVerifiedDish(null, 'french')).toBe(null);
    expect(dd.findVerifiedDish(frenchReview, 'klingon')).toBe(null);
  });
});

describe('cuisine-family — isUnfamiliar (set-location = home cuisine)', () => {
  it('European/African cuisines are unfamiliar in SG/CN (the discovery case)', () => {
    expect(cf.isUnfamiliar('french', 'SG')).toBe(true);
    expect(cf.isUnfamiliar('african', 'CN')).toBe(true);
    expect(cf.isUnfamiliar('italian', 'JP')).toBe(true);
  });

  it('local-family cuisines are NOT unfamiliar', () => {
    expect(cf.isUnfamiliar('chinese', 'SG')).toBe(false);
    expect(cf.isUnfamiliar('japanese', 'JP')).toBe(false);
    expect(cf.isUnfamiliar('thai', 'TH')).toBe(false);
    expect(cf.isUnfamiliar('north-indian', 'SG')).toBe(false); // SG everyday trio
  });

  it('never guesses: unsupported country or family-less cuisine → false', () => {
    expect(cf.isUnfamiliar('french', 'FR')).toBe(false);   // FR not in the picker map
    expect(cf.isUnfamiliar('fusion', 'SG')).toBe(false);   // umbrella, no family
    expect(cf.isUnfamiliar('french', null)).toBe(false);
  });

  it('COUNTRY_LOCAL_FAMILIES covers exactly the supported picker countries + SG/MY', () => {
    const keys = Object.keys(cf.COUNTRY_LOCAL_FAMILIES).sort();
    expect(keys).toEqual(['AU', 'BN', 'CN', 'HK', 'ID', 'JP', 'KR', 'MO', 'MY', 'NZ', 'PH', 'SG', 'TH', 'TW', 'VN']);
  });
});

// v0.62.30 — operator (Putrajaya trip): patin tempoyak added to the Malaysian
// table (replacing the 'beef rendang malaysian' duplicate of 'rendang');
// substring form so either review phrasing verifies.
describe('discovery-dish — Malaysian patin tempoyak (v0.62.30)', () => {
  it('patin tempoyak is an unshared Malaysian iconic dish', () => {
    expect(dd.iconicDishesFor('malaysian', { max: 30 })).toContain('patin tempoyak');
  });

  it('verifies from either review phrasing (with or without "ikan")', () => {
    const a = { reviews: [{ text: { text: 'the ikan patin tempoyak here is the real Temerloh deal' } }] };
    const b = { reviews: [{ text: { text: 'patin tempoyak gravy was rich and sour' } }] };
    expect(dd.findVerifiedDish(a, 'malaysian')?.dish).toBe('patin tempoyak');
    expect(dd.findVerifiedDish(b, 'malaysian')?.dish).toBe('patin tempoyak');
  });

  it('rendang coverage survives the swap (the duplicate was removed, not the dish)', () => {
    // 'rendang' itself is shared with Indonesian → correctly NOT in the
    // unshared Try-line list; the point is the LIST still ≤30 and patin in.
    const list = dd.iconicDishesFor('malaysian', { max: 30 });
    expect(list.length).toBeLessThanOrEqual(30);
  });
});

// v0.62.31 — native-script aliases (adversarial-review fix: JP/zh reviews
// could never verify romanized curated names — 湯豆腐 ≠ yudofu class).
describe('discovery-dish — native-script aliases (v0.62.31)', () => {
  it('every alias key exists in its slug\'s unshared iconic list (no invented rows)', () => {
    // Pull the map via the module's behavior: alias keys are dish names, so
    // each must appear in iconicDishesFor(slug). Read the source map directly.
    const src = require('fs').readFileSync(new URL('../discovery-dish.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('const DISH_ALIASES'), src.indexOf('const CJK_RE'));
    for (const slug of ['japanese', 'chinese', 'cantonese', 'sichuan']) {
      const m = block.match(new RegExp(slug + ':\\s*{([\\s\\S]*?)\\n  }'));
      expect(m, slug + ' block present').toBeTruthy();
      const keys = [...m[1].matchAll(/'([^']+)':\s*\[/g)].map((k) => k[1]);
      expect(keys.length).toBeGreaterThan(0);
      const list = dd.iconicDishesFor(slug, { max: 200 });
      for (const k of keys) expect(list, `${slug}: alias key "${k}" must be a real unshared dish`).toContain(k);
    }
  });

  it('Japanese kana/kanji reviews verify (the Kyoto/Sapporo case)', () => {
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: 'ここの味噌ラーメンは絶品です' } }] }, 'japanese'))
      .toEqual({ dish: 'miso ramen', source: 'curated-verified' });
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: '天ぷらがサクサク' } }] }, 'japanese'))
      .toEqual({ dish: 'tempura', source: 'curated-verified' });
    // 2-char CJK needle passes the script-aware floor (Latin floor stays 4).
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: '餃子も美味しい' } }] }, 'japanese'))
      .toEqual({ dish: 'gyoza', source: 'curated-verified' });
  });

  it('Chinese simplified + traditional reviews verify', () => {
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: '麻婆豆腐很正宗' } }] }, 'sichuan'))
      .toEqual({ dish: 'mapo tofu', source: 'curated-verified' });
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: '佢哋嘅叉燒一流' } }] }, 'cantonese'))
      .toEqual({ dish: 'char siu', source: 'curated-verified' });
  });

  it('no-mention → still null; Latin matching unaffected; alias-less cuisines unchanged', () => {
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: '店内は綺麗でした' } }] }, 'japanese')).toBe(null);
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: 'best tonkotsu ramen in town' } }] }, 'japanese'))
      .toEqual({ dish: 'tonkotsu ramen', source: 'curated-verified' });
    expect(dd.findVerifiedDish({ reviews: [{ text: { text: 'patin tempoyak gravy, so rich' } }] }, 'malaysian'))
      .toEqual({ dish: 'patin tempoyak', source: 'curated-verified' });
  });
});
