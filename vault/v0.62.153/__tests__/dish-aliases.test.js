// __tests__/dish-aliases.test.js — v0.62.94

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const da = require('../dish-aliases.js');

describe('expandDishAliases — dai lok / 大碌 → KL Hokkien mee', () => {
  it('expands the bare nickname (the ambiguous case)', () => {
    const r = da.expandDishAliases('dai lok');
    expect(r, '"dai lok" should expand').not.toBeNull();
    expect(r.terms[0]).toBe('KL Hokkien mee');
    expect(r.terms).toContain('福建面');
  });

  it('union keeps "dai lok mee" so tai-chow sellers (Ipoh Tuck Kee) survive', () => {
    const r = da.expandDishAliases('dai lok');
    expect(r.terms).toContain('dai lok mee');
    expect(r.terms).toContain('大碌麵');
  });

  it('still fires when "mee" is present (harmless reinforcement)', () => {
    expect(da.expandDishAliases('dai lok mee')).not.toBeNull();
    expect(da.expandDishAliases('dai lok mee kl')).not.toBeNull();
  });

  it('matches spacing variants and the Chinese form', () => {
    expect(da.expandDishAliases('dailok')).not.toBeNull();
    expect(da.expandDishAliases('大碌麵')).not.toBeNull();
  });
});

describe('expandDishAliases — no false positives', () => {
  it('returns null for unrelated text and empty input', () => {
    for (const t of ['hokkien mee', 'lok lok', 'tai ka lok', 'char kway teow', '', '   ']) {
      expect(da.expandDishAliases(t), `"${t}" should not match`).toBeNull();
    }
  });

  it('returns null for non-strings', () => {
    expect(da.expandDishAliases(null)).toBeNull();
    expect(da.expandDishAliases(undefined)).toBeNull();
    expect(da.expandDishAliases(42)).toBeNull();
  });
});
