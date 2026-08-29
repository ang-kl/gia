// __tests__/michelin-dish-forcefill.test.js — v0.62.826, O-338.
//
// The card said: 🍲 おすすめ: french signature plate • french chef's recommendation.
//
// That is not a translation gap and it was never a dish. `index.js` composed it —
// `dishesArr.push(`${label} signature plate`)` — as the v0.60.153 force-fill, whose
// stated purpose is "cards never ship empty". So a cuisine SLUG was being used as
// prose, naming a dish nobody recorded, in the one row that tells a reader what to
// order.
//
// WHY REMOVAL AND NOT A FILTER. A filter is the tempting fix and it is the weaker one:
// `filterDishNames` already ran over these strings and accepted all four (asserted
// below), so a filter means maintaining a denylist against text this repo generates
// itself. Deleting the generator is smaller and cannot drift.
//
// AND IT OUTLIVED THE RENDER. warmMichelinEnrich's cache WRITE reads `v.dishes` at
// FIRE time, after the force-fill had mutated it. On a narrate miss the fabricated
// names were persisted for 7 days and read back as real — so this was a data defect
// wearing a display defect's clothes.
import { describe, it, expect } from 'vitest';
const fs = require('fs');

const INDEX = fs.readFileSync(require.resolve('../index.js'), 'utf8');
const CODE = INDEX.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const { filterDishNames } = require('../dish-name.js');

const BOILERPLATE = [
  'french signature plate',
  "french chef's recommendation",
  "Chef's choice",
  'japanese signature plate',
];

describe('O-338 — nothing composes a dish name any more', () => {
  it('the three templates are gone from executable code', () => {
    // Comment lines are stripped first: this file's own explanation quotes the
    // removed lines, and so does index.js's AU-1 record of them. An absence check
    // that reads commentary as code is one that can never pass.
    expect(CODE).not.toContain('signature plate');
    expect(CODE).not.toContain("chef's recommendation");
    expect(CODE).not.toContain('Chef\'s choice');
  });

  it('the removed code is preserved verbatim in a comment, per AU-1', () => {
    // Reversibility is the point: whoever disagrees should be able to restore it
    // without archaeology. If this fails, someone tidied the record away.
    expect(INDEX).toContain('${label} signature plate');
    expect(INDEX).toContain('v0.62.826 — O-338');
  });

  it('and the review half of v0.60.153 is deliberately still there', () => {
    // Scope, asserted. "★★★ Michelin Guide 2025 · curated recommendation" states
    // where the row came from, which is true; the dish line stated a fact that was
    // not. Removing both would be a wider change than the item asked for.
    expect(CODE).toContain('curated recommendation.');
    expect(CODE).toContain('recommandation curatée.');
  });
});

describe('O-338 — why a denylist was rejected, pinned as evidence', () => {
  it('filterDishNames accepts every one of the boilerplate strings', () => {
    // If this ever fails because the filter got stricter, the argument above is
    // weakened but the fix still stands — and the next reader should see that the
    // premise changed rather than find a stale claim in a comment.
    expect(filterDishNames(BOILERPLATE)).toEqual(BOILERPLATE);
  });
});

describe('O-338 — the empty state renders, rather than breaking', () => {
  const CARD = fs.readFileSync('web/cuisine/src/v2/components/ResultCard.jsx', 'utf8');

  it('the Mini App card drops the row when there is no dish', () => {
    expect(CARD).toContain('return primaryDish ? (');
    expect(CARD).toContain(') : null;');
  });

  it('the chat card emits an empty string, not an empty bullet list', () => {
    expect(CODE).toContain("const dishes = v.dishes?.length");
  });

  it('a venue with no dishes still renders its name and area in chat', () => {
    // The actual renderer, not a claim about it: no dishes must not mean no card.
    const { formatVenueBlock } = require('../venue-templates.js');
    const out = formatVenueBlock({ name: 'Gion Sasaki', nameLocal: '祇園 さゝ木', area: 'Kyoto' }, { number: 1 });
    expect(out).toContain('Gion Sasaki');
    expect(out).not.toContain('🍲');
    expect(out).not.toContain('•');
  });
});
