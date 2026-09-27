// __tests__/recent-label.test.js — v0.61.400
//
// Unit tests for tidyRecentLabel — the recents-drawer display string the
// operator wants as a FULL address (street number + street/building, city)
// with the country dropped (a flag conveys it), not a bare city or coords.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tidyRecentLabel } = require('../recent-label.js');

describe('tidyRecentLabel — full street+city display, country dropped', () => {
  it('prepends a POI/building name and drops the country tail (SG)', () => {
    expect(tidyRecentLabel({
      name: 'Marina Bay Sands',
      formatted: '10 Bayfront Ave, Singapore 018956, Singapore',
      country: 'Singapore',
    })).toBe('Marina Bay Sands, 10 Bayfront Ave, Singapore');
  });

  it('keeps the street number + ward + city and strips the postal (JP)', () => {
    expect(tidyRecentLabel({
      name: 'Kita Ward',
      formatted: '1 Chome-1-3 Marunouchi, Kita Ward, Osaka 530-0001, Japan',
      country: 'Japan',
    })).toBe('1 Chome-1-3 Marunouchi, Kita Ward, Osaka');
  });

  it('does not duplicate the name when the street line already carries it', () => {
    expect(tidyRecentLabel({
      name: '252 North Bridge Rd',
      formatted: '252 North Bridge Rd, Singapore 179103, Singapore',
      country: 'Singapore',
    })).toBe('252 North Bridge Rd, Singapore');
  });

  it('never emits a bare building number as the prepended name', () => {
    // Places/geocode sometimes returns "1" as the premise name.
    expect(tidyRecentLabel({
      name: '1',
      formatted: '1, Jln Imbi, 55100 Kuala Lumpur, Malaysia',
      country: 'Malaysia',
    })).toBe('1, Jln Imbi, Kuala Lumpur');
  });

  it('drops a standalone postal segment (SG "238843")', () => {
    expect(tidyRecentLabel({
      name: 'Pavilion',
      formatted: '176 Orchard Rd, 238843, Singapore',
      country: 'Singapore',
    })).toBe('Pavilion, 176 Orchard Rd');
  });

  it('never echoes a bare country name as the label', () => {
    expect(tidyRecentLabel({ name: 'Japan', formatted: 'Japan', country: 'Japan' })).toBe('');
  });

  it('is null/empty safe', () => {
    expect(tidyRecentLabel(null)).toBe('');
    expect(tidyRecentLabel({})).toBe('');
    expect(tidyRecentLabel({ formatted: '' })).toBe('');
  });
});
