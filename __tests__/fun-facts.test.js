// __tests__/fun-facts.test.js — v0.61.290 (data path: .json → .js)

import { describe, it, expect } from 'vitest';
import {
  _pickFact,
  pickFunFact,
  factBody,
  totalFunFacts,
  clearFunFactHistory
} from '../web/cuisine/src/v2/lib/fun-facts.js';
import facts from '../web/cuisine/src/v2/data/fun-facts.js';

describe('fun-facts data contract', () => {
  it('exports 40 facts', () => {
    expect(facts.length).toBe(40);
    expect(totalFunFacts()).toBe(40);
  });

  it('every fact has id + tags + EN + FR + source URL', () => {
    for (const f of facts) {
      expect(typeof f.id).toBe('string');
      expect(f.id.length).toBeGreaterThan(0);
      expect(Array.isArray(f.tags)).toBe(true);
      expect(f.tags.length).toBeGreaterThan(0);
      expect(typeof f.en).toBe('string');
      expect(f.en.length).toBeGreaterThan(20);
      expect(typeof f.fr).toBe('string');
      expect(f.fr.length).toBeGreaterThan(20);
      expect(typeof f.source).toBe('string');
      expect(typeof f.sourceUrl).toBe('string');
      expect(f.sourceUrl.startsWith('https://')).toBe(true);
    }
  });

  it('every fact ID is unique', () => {
    const ids = facts.map((f) => f.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every source URL points to nlb.gov.sg (per operator NLB-only spec)', () => {
    for (const f of facts) {
      expect(f.sourceUrl.includes('nlb.gov.sg')).toBe(true);
    }
  });
});

describe('_pickFact — pure selector', () => {
  it('picks a tag-matching fact when ctx tags overlap fact tags', () => {
    const result = _pickFact({
      ctxTags: ['laksa'],
      lastSeen: [],
      factsList: facts,
      rng: () => 0
    });
    expect(result).not.toBeNull();
    expect(result.tags).toContain('laksa');
  });

  it('falls back to any non-seen fact when no tags match', () => {
    const result = _pickFact({
      ctxTags: ['xx-impossible-tag-xx'],
      lastSeen: [],
      factsList: facts,
      rng: () => 0
    });
    expect(result).not.toBeNull();
    // First fact in the list by id ordering when rng()=0.
    expect(result.id).toBe(facts[0].id);
  });

  it('excludes the lastSeen IDs from the matched subset', () => {
    // Find a tag with at least 2 facts to test exclusion.
    const sgFacts = facts.filter((f) => f.tags.includes('SG'));
    expect(sgFacts.length).toBeGreaterThan(1);
    const excludeId = sgFacts[0].id;
    const result = _pickFact({
      ctxTags: ['SG'],
      lastSeen: [excludeId],
      factsList: facts,
      rng: () => 0
    });
    expect(result).not.toBeNull();
    expect(result.id).not.toBe(excludeId);
  });

  it('resets the pool when ALL facts are in lastSeen', () => {
    const allIds = facts.map((f) => f.id);
    const result = _pickFact({
      ctxTags: [],
      lastSeen: allIds,
      factsList: facts,
      rng: () => 0
    });
    // Pool collapses to facts list; rng=0 → first item.
    expect(result).not.toBeNull();
    expect(result.id).toBe(facts[0].id);
  });

  it('returns the same fact deterministically for a fixed rng', () => {
    const a = _pickFact({ ctxTags: ['SG'], lastSeen: [], factsList: facts, rng: () => 0.5 });
    const b = _pickFact({ ctxTags: ['SG'], lastSeen: [], factsList: facts, rng: () => 0.5 });
    expect(a.id).toBe(b.id);
  });
});

describe('factBody — localised body', () => {
  const sample = facts[0];

  it('returns EN body for lang=en', () => {
    expect(factBody(sample, 'en')).toBe(sample.en);
  });

  it('returns FR body for lang=fr', () => {
    expect(factBody(sample, 'fr')).toBe(sample.fr);
  });

  it('falls back to EN for unknown lang', () => {
    expect(factBody(sample, 'de')).toBe(sample.en);
  });

  it('returns empty string for null fact', () => {
    expect(factBody(null, 'en')).toBe('');
  });
});

describe('pickFunFact — public selector with localStorage', () => {
  // localStorage stub: vitest's node env doesn't ship one.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  };

  it('returns a fact whose tags overlap the cuisine context', () => {
    store.clear();
    const fact = pickFunFact({ cuisines: ['laksa'], region: 'SG', countryPref: null });
    expect(fact).not.toBeNull();
    expect(fact.tags).toContain('laksa');
  });

  it('persists picked IDs in localStorage', () => {
    store.clear();
    const fact = pickFunFact({ cuisines: ['hokkien-mee'], region: 'SG', countryPref: null });
    const raw = store.get('gia.funfact.lastSeen');
    const arr = JSON.parse(raw);
    expect(arr).toContain(fact.id);
  });

  it('avoids repeating the most-recent ID across consecutive calls', () => {
    store.clear();
    // Use a cuisine with at least two tagged facts.
    const ctx = { cuisines: ['hokkien-mee'], region: 'SG', countryPref: null };
    const first = pickFunFact(ctx);
    const second = pickFunFact(ctx);
    // Note: with only 1 hokkien-mee fact in the catalogue this would
    // collide via the pool-reset path. The catalogue has ≥2 facts
    // tagged 'SG' though, so this assertion holds for SG context.
    const sgCtx = { cuisines: [], region: 'SG', countryPref: null };
    store.clear();
    const a = pickFunFact(sgCtx);
    const b = pickFunFact(sgCtx);
    expect(a.id).not.toBe(b.id);
  });

  it('clearFunFactHistory wipes the localStorage entry', () => {
    store.clear();
    pickFunFact({ cuisines: ['laksa'], region: 'SG', countryPref: null });
    expect(store.has('gia.funfact.lastSeen')).toBe(true);
    clearFunFactHistory();
    expect(store.has('gia.funfact.lastSeen')).toBe(false);
  });
});
