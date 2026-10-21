// __tests__/ztest-phrase.test.js — v0.62.279
// Covers phraseToType: natural /ztest phrases → scout types.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { phraseToType, KEYWORD_MATRIX } = require('../ztest-scout.js');

describe('phraseToType — natural phrases resolve to scout types', () => {
  it('"set lunch" → set-lunch', () => {
    expect(phraseToType('set lunch')).toBe('set-lunch');
  });
  it('"set dinner" → set-dinner', () => {
    expect(phraseToType('set dinner')).toBe('set-dinner');
  });
  it('"signature dish" → signature', () => {
    expect(phraseToType('signature dish')).toBe('signature');
  });
  it('"popular dish" → chef (popular is a chef keyword)', () => {
    expect(phraseToType('popular dish')).toBe('chef');
  });
  it('case + spacing tolerant ("  Set   Lunch ")', () => {
    expect(phraseToType('  Set   Lunch ')).toBe('set-lunch');
  });
  it('still accepts the legacy hyphen token ("set-dinner")', () => {
    expect(phraseToType('set-dinner')).toBe('set-dinner');
  });
  it('empty / unknown → null', () => {
    expect(phraseToType('')).toBeNull();
    expect(phraseToType('   ')).toBeNull();
    expect(phraseToType('xyzzy nonsense')).toBeNull();
  });
  it('every resolved type is a real KEYWORD_MATRIX key', () => {
    for (const p of ['set lunch', 'set dinner', 'signature dish', 'popular dish']) {
      expect(Object.keys(KEYWORD_MATRIX)).toContain(phraseToType(p));
    }
  });
});
