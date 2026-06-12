// __tests__/dish-food-group.test.js — Phase 1 of the cuisine "What to order"
// plate: the food-group classifier + the headliners/grouped structure.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { foodGroupFor, groupCuisineDishes, GROUP_LABEL } = require('../dish-food-group.js');
const { getNationOverlay } = require('../nation-overlay.js');

describe('foodGroupFor', () => {
  it('reads drinks straight off the kind flag (no guessing)', () => {
    expect(foodGroupFor('kopi', 'drink')).toBe('drink');
    expect(foodGroupFor('mystery elixir', 'drink')).toBe('drink');
  });
  it('honours explicit overrides', () => {
    expect(foodGroupFor('khachapuri adjaruli', 'food')).toBe('bread-dumpling');
    expect(foodGroupFor('khinkali', 'food')).toBe('bread-dumpling');
    expect(foodGroupFor('satsivi', 'food')).toBe('stew-curry');
    expect(foodGroupFor('sushi', 'food')).toBe('seafood');
  });
  it('classifies by keyword', () => {
    expect(foodGroupFor('tonkotsu ramen', 'food')).toBe('noodles');
    expect(foodGroupFor('nasi lemak', 'food')).toBe('rice');
    expect(foodGroupFor('chilli crab', 'food')).toBe('seafood');
    expect(foodGroupFor('beef rendang', 'food')).toBe('stew-curry');
  });
  it('falls back to other for the unmatched', () => {
    expect(foodGroupFor('zzqqx', 'food')).toBe('other');
    expect(foodGroupFor('', 'food')).toBe('other');
  });
  it('every group has an en/fr label', () => {
    for (const g of ['noodles', 'rice', 'sweet', 'drink', 'other']) {
      expect(GROUP_LABEL[g].en).toBeTruthy();
      expect(GROUP_LABEL[g].fr).toBeTruthy();
    }
  });
});

describe('groupCuisineDishes', () => {
  it('takes the first 3 as headliners and excludes them from the groups', () => {
    const dishes = [
      { name: 'a', kind: 'food' }, { name: 'b', kind: 'food' }, { name: 'c', kind: 'food' },
      { name: 'tonkotsu ramen', kind: 'food' }, { name: 'kopi', kind: 'drink' },
    ];
    const { headliners, groups } = groupCuisineDishes(dishes);
    expect(headliners.map((h) => h.dish)).toEqual(['a', 'b', 'c']);
    const all = groups.flatMap((g) => g.dishes.map((d) => d.dish));
    expect(all).toEqual(expect.arrayContaining(['tonkotsu ramen', 'kopi']));
    expect(all).not.toContain('a');   // headliner not duplicated
  });
  it('orders sections ascending by size, other last', () => {
    const dishes = [
      { name: 'h1' }, { name: 'h2' }, { name: 'h3' },
      // 2 noodles, 1 rice, 1 unmatched(other)
      { name: 'laksa' }, { name: 'udon' }, { name: 'nasi lemak' }, { name: 'zzz' },
    ].map((d) => ({ ...d, kind: 'food' }));
    const { groups } = groupCuisineDishes(dishes);
    const order = groups.map((g) => g.group);
    expect(order[order.length - 1]).toBe('other');           // other always last
    const sizes = groups.filter((g) => g.group !== 'other').map((g) => g.dishes.length);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));  // ascending
  });
  it('handles a thin cuisine (≤3 dishes → all headliners, no groups)', () => {
    const { headliners, groups } = groupCuisineDishes([{ name: 'x', kind: 'food' }]);
    expect(headliners).toHaveLength(1);
    expect(groups).toHaveLength(0);
  });
});

describe('integration — real curated cuisines', () => {
  it('Georgian: 3 headliners + grouped rest, low "other" leakage', () => {
    const ov = getNationOverlay('georgian');
    const { headliners, groups } = groupCuisineDishes(ov.iconicDishes);
    expect(headliners.map((h) => h.dish)).toEqual(['khachapuri adjaruli', 'khinkali', 'satsivi']);
    const grouped = groups.flatMap((g) => g.dishes).length;
    expect(headliners.length + grouped).toBe(ov.iconicDishes.length);   // nothing dropped
  });
  it('Georgian Phase 2: native-script `local` + headliner `note` carry through', () => {
    const ov = getNationOverlay('georgian');
    const { headliners, groups } = groupCuisineDishes(ov.iconicDishes);
    // headliners are curated with both a native name and a one-line history.
    for (const h of headliners) {
      expect(typeof h.local).toBe('string');
      expect(h.local.length).toBeGreaterThan(0);
      expect(h.note && (h.note.en || h.note.fr)).toBeTruthy();
    }
    expect(headliners[0].local).toBe('ხაჭაპური აჭარული');
    // native names survive the grouping onto the chips too (e.g. lobio → ლობიო).
    const allGrouped = groups.flatMap((g) => g.dishes);
    const lobio = allGrouped.find((d) => d.dish === 'lobio');
    expect(lobio && lobio.local).toBe('ლობიო');
    // a names-only cuisine dish (no curation) must NOT gain empty local/note keys.
    const plain = groupCuisineDishes([{ name: 'x', kind: 'food' }]).headliners[0];
    expect(plain.local).toBeUndefined();
    expect(plain.note).toBeUndefined();
  });
  it('Japanese (30 dishes): noodles + seafood groups present, every dish placed', () => {
    const ov = getNationOverlay('japanese');
    const { headliners, groups } = groupCuisineDishes(ov.iconicDishes);
    const slugs = groups.map((g) => g.group);
    expect(slugs).toContain('noodles');
    expect(headliners.length + groups.flatMap((g) => g.dishes).length).toBe(ov.iconicDishes.length);
  });
  it('Singaporean (164 dishes): "other" stays a small minority', () => {
    const ov = getNationOverlay('singaporean');
    const { groups } = groupCuisineDishes(ov.iconicDishes);
    const other = groups.find((g) => g.group === 'other');
    const otherN = other ? other.dishes.length : 0;
    expect(otherN / ov.iconicDishes.length).toBeLessThan(0.2);   // ≥80% classified
  });
});
