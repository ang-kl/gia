// __tests__/cuisines-vault.test.js — v0.53.0 catalogue parser.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const vault = require('../cuisines-vault.js');

beforeEach(() => vault._resetCache());

describe('parseSource', () => {
  it('parses categories with items', () => {
    const text = `
      export const CUISINE_CATEGORIES = [
        {
          id: 'common-here',
          label: 'Common Here',
          defaultOpen: true,
          items: ['Singaporean', 'Japanese', 'Korean']
        },
        {
          id: 'european',
          label: 'European',
          items: ['Italian', 'French']
        }
      ];
    `;
    const r = vault.parseSource(text);
    expect(r.length).toBe(5);
    expect(r[0].name).toBe('Singaporean');
    expect(r[0].categoryId).toBe('common-here');
    expect(r[0].defaultOpen).toBe(true);
    expect(r[3].name).toBe('Italian');
    expect(r[3].categoryId).toBe('european');
    expect(r[3].defaultOpen).toBe(false);
  });

  it('derives slug + searchQuery + keywords from name', () => {
    const text = `[{ id: 'x', label: 'X', items: ['South Indian'] }]`;
    const r = vault.parseSource(text);
    expect(r[0].slug).toBe('south-indian');
    expect(r[0].searchQuery).toContain('South Indian restaurant Singapore');
    expect(r[0].keywords).toContain('south indian');
  });

  it('handles names with & + spaces in slug', () => {
    expect(vault.slugify('Mac & Cheese')).toBe('mac-and-cheese');
    expect(vault.slugify('  hello  world  ')).toBe('hello-world');
  });

  it('returns [] for empty/null', () => {
    expect(vault.parseSource('')).toEqual([]);
    expect(vault.parseSource(null)).toEqual([]);
  });
});

describe('integration — load real cuisines_js.MD file', () => {
  it('loads exactly 69 cuisines (v0.61.234: Australasia catch-all removed)', () => {
    // v0.59.49 baseline was 67 (split Australian + New Zealand back,
    // plus Australasia catch-all). v0.61.141 added Fruits + Durian +
    // Durian Pastry to the dessert category → 70 total. v0.61.234
    // dropped the Australasia catch-all (weak Places match) → 69.
    expect(vault.getAllCuisines().length).toBe(69);
  });

  it('groups by category with expected counts', () => {
    // v0.59.2: regrouped per Human Lead into a world-region view.
    // v0.62.265: CATEGORY_MERGE collapses 14 → 8 picker buckets (operator:
    //   "14 buttons too many"). The 5 merged-away buckets re-home into
    //   survivors — china-regional → east-asian; slavic-eastern-european →
    //   european; australasia → americas; african → middle-eastern; fusion →
    //   dessert. Cuisine slugs + the 69 total are unchanged; only grouping.
    const by = vault.getByCategory();
    const counts = Object.fromEntries(by.map((c) => [c.id, c.cuisines.length]));
    expect(counts['common-here']).toBe(3);          // Singaporean, Peranakan, Eurasian
    expect(counts['southeast-asian']).toBe(6);      // Malaysian, Indonesian, Thai, Filipino, Vietnamese, Burmese
    expect(counts['east-asian']).toBe(16);          // v0.62.265: 4 (JP/CN/KR/TW) + 12 china-regional
    expect(counts['south-asian']).toBe(7);          // 5 source + South Indian + North Indian
    expect(counts['middle-eastern']).toBe(9);       // v0.62.265: 7 + 2 African
    expect(counts['european']).toBe(17);            // v0.62.265: 15 + 2 Slavic/Eastern (Uzbek, Georgian)
    expect(counts['americas']).toBe(6);             // v0.62.265: 4 + 2 Australasia (Australian, New Zealand)
    expect(counts['dessert']).toBe(5);              // v0.62.265: 4 (Dessert+Fruits+Durian+Durian Pastry) + 1 Fusion
    // The 5 merged-away buckets no longer appear as their own categories.
    expect(counts['china-regional']).toBeUndefined();
    expect(counts['slavic-eastern-european']).toBeUndefined();
    expect(counts['australasia']).toBeUndefined();
    expect(counts['african']).toBeUndefined();
    expect(counts['fusion']).toBeUndefined();
    expect(by.length).toBe(8);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(69);   // unchanged — cuisines regrouped, none added/removed
  });

  // v0.60.22 — defend against the duplicate-Michelin bug. The
  // /api/cuisine/catalogue endpoint .push'es a synthetic "Michelin
  // List" tile onto the value returned by getByCategory(). The
  // function must therefore return an array reference that is NOT the
  // memoised cache, otherwise every catalogue request grows the
  // cached array and the TMA grid duplicates the tile.
  it('getByCategory returns a fresh top-level array — caller .push() does not leak into the next call', () => {
    // Multi-call mutation chain. Pre-v0.60.25 the hot-path early-
    // return handed back the cached reference directly, so a .push
    // on a SECOND call leaked into the cache and every subsequent
    // call grew the array (visible in the TMA as duplicate Michelin
    // tiles). The fix slices on every call.
    const lenBefore = vault.getByCategory().length;
    const a = vault.getByCategory();
    a.push({ id: '__synthetic_test_1__', label: 'X', emoji: '?', defaultOpen: false, cuisines: [] });
    const b = vault.getByCategory();
    expect(b.length).toBe(lenBefore);
    expect(b.find((c) => c.id === '__synthetic_test_1__')).toBeUndefined();
    b.push({ id: '__synthetic_test_2__', label: 'Y', emoji: '?', defaultOpen: false, cuisines: [] });
    const c = vault.getByCategory();
    expect(c.length).toBe(lenBefore);
    expect(c.find((cat) => cat.id === '__synthetic_test_2__')).toBeUndefined();
  });

  it('Common Here is the only defaultOpen', () => {
    const by = vault.getByCategory();
    const open = by.filter((c) => c.defaultOpen);
    expect(open.length).toBe(1);
    expect(open[0].id).toBe('common-here');
  });

  it('every cuisine has slug + searchQuery + keywords', () => {
    for (const c of vault.getAllCuisines()) {
      expect(c.slug).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(c.searchQuery).toBeTruthy();
      expect(c.keywords.length).toBeGreaterThan(0);
    }
  });

  it('slugs are unique', () => {
    const slugs = vault.getAllCuisines().map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('findBySlug', () => {
  it('finds existing slug', () => {
    expect(vault.findBySlug('japanese')?.name).toBe('Japanese');
    expect(vault.findBySlug('sichuan')?.name).toBe('Sichuan');
  });
  it('returns null for unknown', () => {
    expect(vault.findBySlug('martian-food')).toBe(null);
  });
});

describe('findByNameOrKeyword', () => {
  it('matches exact name', () => {
    expect(vault.findByNameOrKeyword('Japanese')?.slug).toBe('japanese');
  });
  it('matches case-insensitive', () => {
    expect(vault.findByNameOrKeyword('CANTONESE')?.slug).toBe('cantonese');
  });
  it('returns null for unknown', () => {
    expect(vault.findByNameOrKeyword('zzzzz')).toBe(null);
  });
  it('returns null for empty', () => {
    expect(vault.findByNameOrKeyword('')).toBe(null);
  });
});
