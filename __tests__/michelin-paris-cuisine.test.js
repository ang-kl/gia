// __tests__/michelin-paris-cuisine.test.js — v0.62.823, O-228.
//
// 101 of Paris's 127 Michelin rows carried no `cuisine`, so they were absent from every
// cuisine-filtered Michelin search — correct behaviour for "cuisine unknown", and a gap in
// the data rather than a defect in the filter. `FR-michelin.js`'s own header explained why:
// guide.michelin.com returned 403 to a server-side fetch, so one-star and Bib could not be
// sourced.
//
// THAT 403 WAS A MISSING User-Agent. The same request with an ordinary desktop UA returns
// 200 and a fully server-rendered card list. 98 rows now carry the cooking style MICHELIN
// prints on its own card.
//
// This test does not re-fetch anything — a gate that needs the network is a gate that fails
// on a bad afternoon. It pins the SHAPE of the result, which is what a future edit can break:
// the count, the vocabulary, and the three rows deliberately left empty.
import { describe, it, expect } from 'vitest';

const md = require('../michelin-data.js');
const paris = md.VENUES.filter((v) => v.city === 'Paris');

describe('Michelin Paris cuisines (O-228)', () => {
  it('the fixture is the real table', () => {
    expect(paris.length).toBe(127);
    expect(md.VENUES.length).toBeGreaterThan(2000);
  });

  // A FLOOR, like the classics corpus has, and it moves only with a reason. 26 before
  // v0.62.823, 124 after. If it drops, a fill was undone or rows were lost.
  it('124 of the 127 Paris rows carry a cuisine', () => {
    expect(paris.filter((v) => (v.cuisine || '').trim()).length).toBe(124);
  });

  // Named, not counted. These three hold 2026 one-stars here but appear in none of the eight
  // listing pages fetched, and their guessed detail-page slugs 404. Left empty rather than
  // guessed — and named here so that filling one shrinks this list rather than passing
  // silently.
  it('exactly three rows are still uncuisined, and they are the three we could not source', () => {
    const empty = paris.filter((v) => !(v.cuisine || '').trim()).map((v) => v.name).sort();
    expect(empty).toEqual(['Galanga', 'La Scène Thélème', 'Pages']);
  });

  // The whole point of the item: these venues were invisible to cuisine-filtered search.
  it('availableCuisines("FR") grew from 3 slugs to 12 — the venues are now reachable', () => {
    const cuisines = md.availableCuisines('FR');
    expect(cuisines.length).toBe(12);
    for (const c of ['modern-cuisine', 'creative', 'classic-cuisine', 'japanese', 'italian']) {
      expect(cuisines, `${c} should be filterable`).toContain(c);
    }
    // and the venues really are behind those slugs, not just the labels in a list
    const modern = md.VENUES.filter((v) => v.city === 'Paris' && v.cuisine === 'modern-cuisine');
    expect(modern.length).toBeGreaterThan(40);
  });

  // MICHELIN's vocabulary, slugified by this repo's own kebab() — not a mapping onto the
  // hand-authored french-* slugs. Copying a register beats deriving from one; see the file
  // header, and O-331 for the split this leaves.
  it('every filled Paris cuisine is a kebab of a MICHELIN cooking style', () => {
    const LABELS = ['Modern Cuisine', 'Creative', 'Japanese', 'Italian', 'Classic Cuisine',
      'Traditional Cuisine', 'Seafood', 'Mexican', 'Greek', 'Chinese'];
    const fromSite = new Set(LABELS.map((l) => md.kebab(l)));
    const curated = new Set(['french-classic', 'french-contemporary']);   // the 26 authored earlier
    const stray = [...new Set(paris.map((v) => v.cuisine).filter(Boolean))]
      .filter((c) => !fromSite.has(c) && !curated.has(c));
    expect(stray, 'a Paris cuisine that is neither a MICHELIN label nor one of the 26 curated slugs').toEqual([]);
  });

  it('no row was given a cuisine without an award — the fill did not invent rows', () => {
    expect(paris.filter((v) => !(v.awards || []).length)).toEqual([]);
  });
});
