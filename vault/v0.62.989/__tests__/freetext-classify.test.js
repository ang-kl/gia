// __tests__/freetext-classify.test.js — v0.60.131

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fc = require('../freetext-classify.js');

describe('looksLikeQuestion — fires on questions / instructions', () => {
  it('"does X sell Y" (the chiffon-cake report)', () => {
    expect(fc.looksLikeQuestion('does Beach Road curry rice sell chiffon cake')).toBe(true);
  });

  it('trailing question mark always fires', () => {
    expect(fc.looksLikeQuestion('is Burnt Ends open today?')).toBe(true);
    expect(fc.looksLikeQuestion('ramen?')).toBe(true);
    expect(fc.looksLikeQuestion('where?')).toBe(true);
  });

  it('leading interrogative/auxiliary + ≥ 4 words', () => {
    expect(fc.looksLikeQuestion('can you find me nasi lemak')).toBe(true);
    expect(fc.looksLikeQuestion('what restaurants serve laksa here')).toBe(true);
    expect(fc.looksLikeQuestion('how do I get to Burnt Ends')).toBe(true);
  });

  it('"X serves/sells/has Y" with ≥ 5 words', () => {
    expect(fc.looksLikeQuestion('a place that serves authentic ramen nearby')).toBe(true);
    expect(fc.looksLikeQuestion('Beach Road curry rice also sells cakes')).toBe(true);
  });
});

describe('looksLikeCuisineBrowse — whitelists "<cuisine> + <food noun>" patterns', () => {
  it('the reported regression: "western cuisine nearby"', () => {
    expect(fc.looksLikeCuisineBrowse('western cuisine nearby')).toBe(true);
  });

  it('umbrella cuisine + food noun', () => {
    expect(fc.looksLikeCuisineBrowse('western food near me')).toBe(true);
    expect(fc.looksLikeCuisineBrowse('asian restaurant')).toBe(true);
    expect(fc.looksLikeCuisineBrowse('fusion dining')).toBe(true);
    expect(fc.looksLikeCuisineBrowse('pan asian cuisine')).toBe(true);
  });

  it('catalogue cuisine + food noun', () => {
    expect(fc.looksLikeCuisineBrowse('italian restaurant')).toBe(true);
    expect(fc.looksLikeCuisineBrowse('japanese food near me')).toBe(true);
    expect(fc.looksLikeCuisineBrowse('thai cuisine nearby')).toBe(true);
    expect(fc.looksLikeCuisineBrowse('european dining around me')).toBe(true);
    expect(fc.looksLikeCuisineBrowse('chinese eatery')).toBe(true);
  });

  it('does NOT fire on bare cuisine word (no food noun)', () => {
    expect(fc.looksLikeCuisineBrowse('italian')).toBe(false);
    expect(fc.looksLikeCuisineBrowse('japanese')).toBe(false);
    expect(fc.looksLikeCuisineBrowse('western')).toBe(false);
  });

  it('does NOT fire on bare food noun (no cuisine word)', () => {
    expect(fc.looksLikeCuisineBrowse('restaurant')).toBe(false);
    expect(fc.looksLikeCuisineBrowse('food near me')).toBe(false);
    expect(fc.looksLikeCuisineBrowse('dining nearby')).toBe(false);
  });

  it('does NOT fire on off-topic queries (the v0.60.216 gate stays effective)', () => {
    expect(fc.looksLikeCuisineBrowse('tell me a joke')).toBe(false);
    expect(fc.looksLikeCuisineBrowse('weather in tokyo')).toBe(false);
    expect(fc.looksLikeCuisineBrowse('how is the stock market')).toBe(false);
  });

  it('blanks / nonsense', () => {
    expect(fc.looksLikeCuisineBrowse('')).toBe(false);
    expect(fc.looksLikeCuisineBrowse('   ')).toBe(false);
    expect(fc.looksLikeCuisineBrowse(null)).toBe(false);
    expect(fc.looksLikeCuisineBrowse('italian leather')).toBe(false);  // no food noun
  });
});

describe('looksLikeQuestion — does NOT fire on dish / place / brand names', () => {
  it('plain dish names', () => {
    for (const t of ['fish and chips', 'char kway teow', 'chiffon cake', 'nasi lemak', 'laksa', 'ramen',
                     'hainanese chicken rice', 'mango pomelo sago', 'bak kut teh', 'mee goreng mamak']) {
      expect(fc.looksLikeQuestion(t), `"${t}" should not look like a question`).toBe(false);
    }
  });

  it('brand names that happen to start with an interrogative word (but are short)', () => {
    expect(fc.looksLikeQuestion('What The Burger')).toBe(false);    // 3 words
    expect(fc.looksLikeQuestion('How Kee')).toBe(false);            // 2 words
  });

  it('"where is <place>" (a legitimate lookup, no ?) — "where" is excluded from the leading set', () => {
    expect(fc.looksLikeQuestion('where is Burnt Ends')).toBe(false);
    expect(fc.looksLikeQuestion('where can I get good ramen near orchard')).toBe(false);
  });

  it('blanks / nonsense', () => {
    expect(fc.looksLikeQuestion('')).toBe(false);
    expect(fc.looksLikeQuestion('   ')).toBe(false);
    expect(fc.looksLikeQuestion(null)).toBe(false);
  });
});
