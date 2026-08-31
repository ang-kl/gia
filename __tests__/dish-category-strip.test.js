// dish-category-strip.test.js — v0.62.865
//
// Operator, with a screenshot of the Japanese UI showing the card strip reading
// "Likely serves salted egg yolk crab dish" in English: "card strip isn't
// translated".
import { describe, it, expect, vi } from 'vitest';
vi.mock('react', () => {
  const nope = (n) => () => { throw new Error(`react.${n} called — this suite stubs react`); };
  return { useEffect: nope('useEffect'), useState: nope('useState'), useMemo: nope('useMemo'), default: {} };
});
import { likelyServesText, categoryWord, dishCategory } from '../web/cuisine/src/v2/lib/dish-category.js';

const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];

describe('the "Likely serves" strip', () => {
  it('renders in every app locale, never falling back to English', () => {
    const en = likelyServesText('laksa', 'en');
    for (const l of LOCALES.filter((x) => x !== 'en')) {
      const out = likelyServesText('laksa', l);
      expect(out, `${l} is empty`).toBeTruthy();
      expect(out, `${l} fell back to the English string`).not.toBe(en);
    }
  });

  it('leaves no unfilled placeholder in any locale', () => {
    for (const l of LOCALES) {
      for (const term of ['laksa', 'kopi', 'cendol']) {
        const out = likelyServesText(term, l);
        expect(out, `${l}/${term} has an unfilled placeholder: ${out}`).not.toMatch(/\{(term|category)\}/);
      }
    }
  });

  it('always contains the searched term — it is the search key the reader typed', () => {
    for (const l of LOCALES) expect(likelyServesText('salted egg yolk crab', l)).toContain('salted egg yolk crab');
  });

  // The bug was not only three missing words: the line was concatenated in ENGLISH
  // word order, so Japanese would have read "<verb phrase> <term> <category>".
  // Japanese puts the verb last, so the term must precede the verb phrase.
  it('puts Japanese in Japanese order, not English order with Japanese words', () => {
    const ja = likelyServesText('ramen', 'ja');
    expect(ja.indexOf('ramen')).toBeLessThan(ja.indexOf('提供'));
    expect(ja.endsWith('可能性があります')).toBe(true);
  });

  it('gives zh a spaceless line, as Chinese is written', () => {
    expect(likelyServesText('ramen', 'zh')).toBe('可能供应ramen料理');
  });

  it('classifies drink and dessert terms, and localises the category word', () => {
    expect(dishCategory('kopi-O')).toBe('drink');
    expect(dishCategory('cendol')).toBe('dessert');
    expect(dishCategory('laksa')).toBe('dish');
    expect(categoryWord('kopi-O', 'ja')).toBe('ドリンク');
    expect(categoryWord('cendol', 'zh')).toBe('甜品');
    expect(categoryWord('laksa', 'es')).toBe('plato');
  });

  it('returns empty for an empty term rather than a bare sentence', () => {
    for (const l of LOCALES) expect(likelyServesText('', l)).toBe('');
  });
});
