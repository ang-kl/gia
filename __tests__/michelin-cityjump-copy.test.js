// __tests__/michelin-cityjump-copy.test.js — v0.62.x
//
// The Michelin city-jump row copy. Operator (11-06) switched from the bare
// count ("8 Michelin picks in …") to the count/total ratio ("8/12 Michelin
// picks in …"), where count = cards for that city in the visible batch and
// total = the visible batch size. The "{city}" itself is rendered as a
// separate styled <span>, so the i18n string stops at "in ".

import { describe, it, expect } from 'vitest';
import { tn } from '../web/cuisine/src/v2/lib/i18n.js';

describe('michelin.cityJump.before — count/total ratio', () => {
  it('EN renders "{count}/{total} Michelin picks in " (stops before the city span)', () => {
    expect(tn('michelin.cityJump.before', 'en', { count: 8, total: 12 }))
      .toBe('8/12 Michelin picks in ');
  });
  it('FR renders the count/total ratio', () => {
    expect(tn('michelin.cityJump.before', 'fr', { count: 4, total: 12 }))
      .toBe('4/12 choix Michelin à ');
  });
  it('both placeholders substitute (operator examples 4/12 and 8/12)', () => {
    expect(tn('michelin.cityJump.before', 'en', { count: 4, total: 12 })).toBe('4/12 Michelin picks in ');
  });
});
