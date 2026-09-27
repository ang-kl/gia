// __tests__/format.test.js — v0.59.3

import { describe, it, expect } from 'vitest';
import { formatDistance } from '../format.js';

describe('formatDistance', () => {
  it('renders metres for values < 1000', () => {
    expect(formatDistance(0)).toBe('0m');
    expect(formatDistance(50)).toBe('50m');
    expect(formatDistance(350)).toBe('350m');
    expect(formatDistance(999)).toBe('999m');
  });
  it('rounds metres', () => {
    expect(formatDistance(50.4)).toBe('50m');
    expect(formatDistance(50.6)).toBe('51m');
  });
  it('renders kilometres with 2 dp at and above 1000', () => {
    expect(formatDistance(1000)).toBe('1.00km');
    expect(formatDistance(1234)).toBe('1.23km');
    expect(formatDistance(1235)).toBe('1.24km');
    expect(formatDistance(10000)).toBe('10.00km');
  });
  it('returns empty string for invalid input', () => {
    expect(formatDistance(null)).toBe('');
    expect(formatDistance(undefined)).toBe('');
    expect(formatDistance(NaN)).toBe('');
    expect(formatDistance(-50)).toBe('');
    expect(formatDistance('not a number')).toBe('');
  });
});
