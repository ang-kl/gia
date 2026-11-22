// __tests__/SG-michelin.test.js — v0.62.709
//
// Validates the Singapore Michelin Guide dataset shape + helper functions.
// v0.62.665 — MICHELIN Guide Singapore 2026 Bib Gourmand update: 89 → 97
// (10 new, 2 dropped — "Eminent Frog Porridge & Seafood", "Soon Huat").
// Every record now carries `awardYears` (compact, newest-first "'26"-style
// strings); `formatMichelinLine` reads it directly instead of taking a bare
// `year` parameter.
// v0.62.667 — CORRECTION (operator): the 2 dropped entries above were never
// asked to be DELETED — restored with awardYears: ["'25"] only (held 2025,
// not retained 2026), same historical-row pattern already used for Taiwan's
// dropped venues (v0.62.666). 97 → 99 Bib Gourmand, 138 → 140 total. The
// live/current 2026 Bib Gourmand count (surfaced to users) stays 97 — see
// index.js's description-string filter, which excludes any entry whose
// awardYears doesn't include "'26".
// v0.62.709 — MICHELIN Guide Singapore 2026 STAR ceremony results applied
// (04 Aug 2026, 10th edition): STARS_THREE 2→3 (Zén added — a pre-existing
// gap, not a 2026 event), STARS_TWO 7→9 (1887 by André new, Seroja promoted
// from one-star), STARS_ONE raw 32→37 (27 retained get '26 prepended, 4
// dropped keep their ["'25"]-only historical row, 6 new entrants added; net
// CURRENT one-star total is 33). ALL raw total 140→148. The "no starred
// entry has '26 yet" test from the pre-ceremony arc is retired — replaced
// by tests asserting the actual 2026 shape.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const m = require('../SG-michelin.js');

describe('Michelin Singapore 2026 — shape', () => {
  it('has 3 three-star entries (Les Amis, Odette retained; Zén added — pre-existing gap)', () => {
    expect(m.STARS_THREE.length).toBe(3);
    expect(m.STARS_THREE.every((e) => e.category === 'three-star')).toBe(true);
  });

  it('has 9 two-star entries (7 retained + 1887 by André new + Seroja promoted)', () => {
    expect(m.STARS_TWO.length).toBe(9);
    expect(m.STARS_TWO.every((e) => e.category === 'two-star')).toBe(true);
  });

  it('has 37 raw one-star entries (27 retained + 4 dropped-but-kept-historical + 6 new)', () => {
    expect(m.STARS_ONE.length).toBe(37);
    expect(m.STARS_ONE.every((e) => e.category === 'one-star')).toBe(true);
  });

  it('33 of the 37 one-star entries hold the CURRENT (2026) award', () => {
    const current = m.STARS_ONE.filter((e) => e.awardYears.includes("'26"));
    expect(current.length).toBe(33);
  });

  it('has 99 Bib Gourmand entries (89 - 2 lapsed + 10 new + 2 restored-as-historical)', () => {
    expect(m.BIB_GOURMAND.length).toBe(99);
    expect(m.BIB_GOURMAND.every((e) => e.category === 'bib-gourmand')).toBe(true);
  });

  it('97 of the 99 Bib Gourmand entries hold the CURRENT (2026) award', () => {
    const current = m.BIB_GOURMAND.filter((e) => e.awardYears.includes("'26"));
    expect(current.length).toBe(97);
  });

  it('total of 148 venues across all categories', () => {
    expect(m.ALL.length).toBe(3 + 9 + 37 + 99);
  });

  it('every entry carries a non-empty, newest-first awardYears array', () => {
    for (const e of m.ALL) {
      expect(Array.isArray(e.awardYears)).toBe(true);
      expect(e.awardYears.length).toBeGreaterThan(0);
      for (const y of e.awardYears) expect(/^'\d{2}$/.test(y)).toBe(true);
    }
  });

  it('49 raw starred entries; 45 hold the CURRENT (2026) award', () => {
    const stars = m.getStars();
    expect(stars.length).toBe(3 + 9 + 37);
    const current = stars.filter((e) => e.awardYears.includes("'26"));
    expect(current.length).toBe(3 + 9 + 33);
  });

  it('every starred entry has name + address + postal', () => {
    const stars = m.getStars();
    for (const e of stars) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.address).toBe('string');
      expect(e.address.length).toBeGreaterThan(0);
      expect(typeof e.postal).toBe('string');
      expect(/^\d{6}$/.test(e.postal)).toBe(true);
    }
  });

  it('every bib gourmand entry has name (address optional)', () => {
    for (const e of m.BIB_GOURMAND) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.address).toBe('string');                  // possibly empty string
    }
  });

  it('no duplicate names within stars', () => {
    const stars = m.getStars();
    const set = new Set(stars.map((e) => e.name.toLowerCase()));
    expect(set.size).toBe(stars.length);
  });
});

describe('Michelin helpers', () => {
  it('getStars() returns 49 starred venues', () => {
    expect(m.getStars().length).toBe(49);
  });

  it('getBibGourmand() returns 99 entries', () => {
    expect(m.getBibGourmand().length).toBe(99);
  });

  it('getByCategory("three-star") returns 3', () => {
    expect(m.getByCategory('three-star').length).toBe(3);
  });

  it('getByCategory("bib-gourmand") returns 99', () => {
    expect(m.getByCategory('bib-gourmand').length).toBe(99);
  });

  it('findByName("Les Amis") finds the three-star entry', () => {
    const e = m.findByName('Les Amis');
    expect(e).toBeTruthy();
    expect(e.category).toBe('three-star');
    expect(e.postal).toBe('228208');
  });

  it('findByName is case-insensitive', () => {
    expect(m.findByName('odette')).toBeTruthy();
    expect(m.findByName('BURNT ENDS')).toBeTruthy();
  });

  it('findByName returns null for unknown', () => {
    expect(m.findByName('not a real venue')).toBeNull();
  });

  it('buildPlacesQuery uses postal when present', () => {
    const e = m.findByName('Les Amis');
    expect(m.buildPlacesQuery(e)).toBe('Les Amis Singapore 228208');
  });

  it('buildPlacesQuery falls back to address when no postal', () => {
    const e = m.findByName('Song Fa Bak Kut Teh');
    expect(m.buildPlacesQuery(e)).toContain('Song Fa Bak Kut Teh');
    expect(m.buildPlacesQuery(e)).toContain('New Bridge Road');
  });

  it('buildPlacesQuery falls back to bare name + Singapore when neither postal nor address', () => {
    const e = m.findByName('Kok Sen');
    expect(m.buildPlacesQuery(e)).toBe('Kok Sen Singapore');
  });
});

describe('findMichelinMatch — venue cross-reference', () => {
  it('exact name match', () => {
    const r = m.findMichelinMatch('Les Amis');
    expect(r).toBeTruthy();
    expect(r.category).toBe('three-star');
  });

  it('case-insensitive exact match', () => {
    expect(m.findMichelinMatch('odette')?.category).toBe('three-star');
    expect(m.findMichelinMatch('BURNT ENDS')?.category).toBe('one-star');
  });

  it('suffix-tolerant token match ("Burnt Ends Restaurant")', () => {
    const r = m.findMichelinMatch('Burnt Ends Restaurant');
    expect(r).toBeTruthy();
    expect(r.name).toBe('Burnt Ends');
  });

  it('postal-augmented chain match — Imperial Treasure ION wins', () => {
    const r = m.findMichelinMatch(
      'Imperial Treasure Fine Teochew Cuisine',
      '2 Orchard Turn, ION Orchard, Singapore 238801'
    );
    expect(r).toBeTruthy();
    expect(r.name).toContain('Orchard');
  });

  it('chain name without matching postal returns null', () => {
    expect(m.findMichelinMatch('Imperial Treasure', '99 Random Road 100000')).toBeNull();
  });

  it('Codex review fix — branch-qualifier guard rejects non-Orchard Imperial Treasure', () => {
    // Pre-fix bug: "Imperial Treasure Fine Teochew Cuisine" (5 tokens)
    // matched "(Orchard)" entry (6 tokens) at 0.83 fraction even when
    // candidate address didn't contain postal 238801. Now requires
    // the qualifier text OR postal to be present.
    expect(m.findMichelinMatch(
      'Imperial Treasure Fine Teochew Cuisine',
      '99 Marina Bay 018960'
    )).toBeNull();
  });

  it('Codex review fix — short-entry guard rejects "Ma Cuisine" lookalike', () => {
    // Pre-fix bug: "Ma Cuisine" (1 distinguishing token "cuisine") fuzzy-
    // matched any candidate with "cuisine" in the name. Now short
    // entries (≤2 tokens) require the entry name as a substring.
    expect(m.findMichelinMatch(
      'Imperial Treasure Fine Teochew Cuisine',
      '10 Random Road'
    )).toBeNull();
  });

  it('short-entry guard still allows "Ma Cuisine Singapore" suffix-tolerant match', () => {
    const r = m.findMichelinMatch('Ma Cuisine Singapore', '38 Craig Road');
    expect(r?.name).toBe('Ma Cuisine');
  });

  it('curly-quote tolerance (Iggy\'s vs Iggy’s)', () => {
    const r = m.findMichelinMatch("Iggy's Restaurant", '581 Orchard Road');
    expect(r).toBeTruthy();
    expect(r.name).toContain('Iggy');
  });

  it('Bib Gourmand entry matches', () => {
    expect(m.findMichelinMatch('Tian Tian Hainanese Chicken Rice')?.category)
      .toBe('bib-gourmand');
  });

  it('unrelated venue returns null', () => {
    expect(m.findMichelinMatch('Random Cafe That Does Not Exist', '')).toBeNull();
    expect(m.findMichelinMatch('', '')).toBeNull();
    expect(m.findMichelinMatch(null)).toBeNull();
  });
});

describe('formatMichelinLine — rendered annotation', () => {
  // v0.62.665 — `year` param retired in favour of reading `entry.awardYears`
  // directly (a compact, newest-first array) — see SG-michelin.js's schema
  // comment. A bare `{ category }` with no awardYears falls back to
  // ["'25"] so legacy callers/fixtures don't render a dangling " · ".
  it('three-star → ⭐⭐⭐, falls back to \'25 with no awardYears', () => {
    expect(m.formatMichelinLine({ category: 'three-star' })).toBe("✳️ Michelin · ⭐⭐⭐ · '25");
  });

  it('two-star → ⭐⭐', () => {
    expect(m.formatMichelinLine({ category: 'two-star' })).toBe("✳️ Michelin · ⭐⭐ · '25");
  });

  it('one-star → ⭐', () => {
    expect(m.formatMichelinLine({ category: 'one-star' })).toBe("✳️ Michelin · ⭐ · '25");
  });

  it('bib-gourmand → ✳️ Bib Gourmand', () => {
    expect(m.formatMichelinLine({ category: 'bib-gourmand' })).toBe("✳️ Bib Gourmand · '25");
  });

  it('reads awardYears off the entry, newest-first, comma-joined', () => {
    expect(m.formatMichelinLine({ category: 'one-star', awardYears: ["'24"] })).toBe("✳️ Michelin · ⭐ · '24");
    expect(m.formatMichelinLine({ category: 'bib-gourmand', awardYears: ["'26", "'25"] })).toBe("✳️ Bib Gourmand · '26, '25");
  });

  it('a single retained year renders with no trailing comma', () => {
    expect(m.formatMichelinLine({ category: 'bib-gourmand', awardYears: ["'26"] })).toBe("✳️ Bib Gourmand · '26");
  });

  it('null entry returns empty string', () => {
    expect(m.formatMichelinLine(null)).toBe('');
    expect(m.formatMichelinLine({})).toBe('');
  });
});

describe('SG Michelin dataset — entry count + byte-stable content', () => {
  // v0.61.333 — SG-michelin.js reverted to its pre-v0.61.330 standalone
  // form (no per-entry city/country stamping). SG is decoupled from the
  // unified venue loader and consumed directly on its own fast path.
  // v0.62.665 — `awardYears` IS now on every SG record (the smallest
  // compatible addition to this same flat schema, per the operator's Michelin
  // 2026 update spec) — this is deliberately NOT the per-entry city/country/
  // unified-loader coupling the v0.61.333 comment above was reverting.
  it('the curated dataset has the expected count (148 = 3+9+37+99)', () => {
    expect(m.ALL.length).toBe(148);
    expect(m.STARS_THREE.length).toBe(3);
    expect(m.STARS_TWO.length).toBe(9);
    expect(m.STARS_ONE.length).toBe(37);
    expect(m.BIB_GOURMAND.length).toBe(99);
  });

  it('original name/address/category are still present (byte-stable)', () => {
    // Spot-check representative entries across every tier.
    const lesAmis = m.findByName('Les Amis');
    expect(lesAmis.address).toBe('1 Scotts Road, #01-16 Shaw Centre, Singapore 228208');
    expect(lesAmis.category).toBe('three-star');

    const thevar = m.findByName('Thevar');
    expect(thevar.category).toBe('two-star');
    expect(thevar.cuisine).toBe('north-indian');
    expect(thevar.vegetarian).toBe(true);

    const tianTian = m.findByName('Tian Tian Hainanese Chicken Rice');
    expect(tianTian.address).toBe('Maxwell Food Centre');
    expect(tianTian.category).toBe('bib-gourmand');
  });

  it('2026 Bib Gourmand update — retained entry carries both years', () => {
    const noodleStory = m.findByName('A Noodle Story');
    expect(noodleStory.awardYears).toEqual(["'26", "'25"]);
  });

  it('2026 Bib Gourmand update — new entries carry only \'26', () => {
    const kingOfLaksa = m.findByName('King of Laksa');
    expect(kingOfLaksa.awardYears).toEqual(["'26"]);
    expect(m.findByName('Xiangyee').awardYears).toEqual(["'26"]);
  });

  it('2026 Bib Gourmand update — lapsed entries are RESTORED as 2025-only historical rows, not deleted', () => {
    const eminentFrog = m.findByName('Eminent Frog Porridge & Seafood');
    const soonHuat = m.findByName('Soon Huat');
    expect(eminentFrog).not.toBeNull();
    expect(eminentFrog.category).toBe('bib-gourmand');
    expect(eminentFrog.awardYears).toEqual(["'25"]);
    expect(soonHuat).not.toBeNull();
    expect(soonHuat.category).toBe('bib-gourmand');
    expect(soonHuat.awardYears).toEqual(["'25"]);
    // renders as a plain historical badge, no "'26" and no dangling comma.
    expect(m.formatMichelinLine(eminentFrog)).toBe("✳️ Bib Gourmand · '25");
  });

  it('2026 star update — retained one-star entry carries both years', () => {
    const burntEnds = m.findByName('Burnt Ends');
    expect(burntEnds.category).toBe('one-star');
    expect(burntEnds.awardYears).toEqual(["'26", "'25"]);
  });

  it('2026 star update — new one-star entries carry only \'26', () => {
    for (const name of ['Cherry Garden by Chef Fei', 'Jin Ting Wan', 'Loca Niru', 'Sushi Kimura Plus', 'Tenshima', 'Yong Fu']) {
      const e = m.findByName(name);
      expect(e).not.toBeNull();
      expect(e.category).toBe('one-star');
      expect(e.awardYears).toEqual(["'26"]);
    }
  });

  it('2026 star update — dropped one-star entries kept as 2025-only historical rows, not deleted', () => {
    for (const name of ['Alma', 'Chaleur', 'Esora', 'Euphoria']) {
      const e = m.findByName(name);
      expect(e).not.toBeNull();
      expect(e.category).toBe('one-star');
      expect(e.awardYears).toEqual(["'25"]);
    }
    // renders as a plain historical badge, matching the Bib Gourmand pattern above.
    expect(m.formatMichelinLine(m.findByName('Alma'))).toBe("✳️ Michelin · ⭐ · '25");
  });

  it('2026 star update — Seroja promoted one-star → two-star, carries only its new-category year', () => {
    const seroja = m.findByName('Seroja');
    expect(seroja.category).toBe('two-star');
    expect(seroja.awardYears).toEqual(["'26"]);
    // no longer present in STARS_ONE — it moved, not duplicated.
    expect(m.STARS_ONE.some((e) => e.name === 'Seroja')).toBe(false);
  });

  it('2026 star update — 1887 by André debuts directly at two-star', () => {
    const debut = m.findByName('1887 by André');
    expect(debut).not.toBeNull();
    expect(debut.category).toBe('two-star');
    expect(debut.awardYears).toEqual(["'26"]);
  });

  it('2026 star update — Zén added to three-star as a pre-existing-gap correction, both years', () => {
    const zen = m.findByName('Zén');
    expect(zen).not.toBeNull();
    expect(zen.category).toBe('three-star');
    expect(zen.awardYears).toEqual(["'26", "'25"]);
  });
});

describe('Michelin signature venues sanity', () => {
  it('includes both three-star icons (Les Amis, Odette)', () => {
    const names = m.STARS_THREE.map((e) => e.name);
    expect(names).toContain('Les Amis');
    expect(names).toContain('Odette');
  });

  it('includes Hill Street Tai Hwa Pork Noodle (one-star hawker icon)', () => {
    expect(m.findByName('Hill Street Tai Hwa Pork Noodle')).toBeTruthy();
  });

  it('includes Tian Tian Hainanese Chicken Rice (Bib Gourmand hawker)', () => {
    expect(m.findByName('Tian Tian Hainanese Chicken Rice')).toBeTruthy();
  });
});
