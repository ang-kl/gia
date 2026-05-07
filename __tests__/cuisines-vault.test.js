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
  it('loads exactly 72 cuisines (v0.59.34: African collapse 4 → 2)', () => {
    expect(vault.getAllCuisines().length).toBe(72);
  });

  it('groups by category with expected counts', () => {
    // v0.59.2: regrouped per Human Lead. Source markdown still has
    // 8 categories in the original layout; cuisines-vault remaps at
    // load time into a 10-bucket world-region view.
    // v0.59.21: 2 new top-level categories (dessert + fusion), 1
    // entry each. Total cuisine count 72 → 74.
    const by = vault.getByCategory();
    const counts = Object.fromEntries(by.map((c) => [c.id, c.cuisines.length]));
    expect(counts['common-here']).toBe(3);          // Singaporean, Peranakan, Eurasian
    expect(counts['southeast-asian']).toBe(8);      // + Malaysian, Indonesian, Thai, Filipino, Vietnamese, Burmese
    expect(counts['east-asian']).toBe(4);           // (new) Japanese, Chinese, Korean, Taiwanese
    expect(counts['china-regional']).toBe(10);
    expect(counts['south-asian']).toBe(7);          // + South Indian, North Indian
    expect(counts['middle-eastern']).toBe(10);
    expect(counts['european']).toBe(17);
    expect(counts['americas']).toBe(7);             // + American, Mexican, Brazilian
    expect(counts['australasia']).toBe(2);          // (new) Australian, New Zealand
    expect(counts['african']).toBe(2);              // v0.59.34: collapsed E/K/N into 'African' (kept South African)
    expect(counts['dessert']).toBe(1);              // v0.59.21: Dessert
    expect(counts['fusion']).toBe(1);               // v0.59.21: Fusion
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(72);
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
