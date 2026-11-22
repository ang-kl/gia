// __tests__/location-grouping.test.js — v0.62.712
//
// Covers the generalized region-grouping mechanism added at v0.62.712:
// the `region` field rename (AU-only `state` → `region`, now also carried
// by MY/CN/FR), REGION_LABEL_BY_COUNTRY, CN_POPULAR_PROVINCES,
// defaultCollapsedRegions(), and the pure computeGroupedRows() function
// extracted from Cuisine's CityDropdown so Cuisine and Menu can share one
// grouping implementation. Tests the Cuisine copy (web/cuisine/src/v2/lib/
// cities.js); the Menu copy is byte-identical data (see the "kept in sync"
// convention already covered by __tests__/iata-cities.test.js) and consumes
// the same computeGroupedRows()/defaultCollapsedRegions() logic verbatim,
// so testing one copy exercises the shared behaviour both apps render from.

import { describe, it, expect } from 'vitest';
import {
  CITIES_BY_COUNTRY,
  REGION_LABEL_BY_COUNTRY,
  CN_POPULAR_PROVINCES,
  defaultCollapsedRegions,
  computeGroupedRows,
  citiesForCountry
} from '../web/cuisine/src/v2/lib/cities.js';

describe('computeGroupedRows — pure grouping function', () => {
  it('contiguous same-region rows produce exactly one divider', () => {
    const list = [
      { name: 'A', region: 'X' },
      { name: 'B', region: 'X' },
      { name: 'C', region: 'X' }
    ];
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(), currentRegion: null });
    const dividers = rows.filter((r) => r.type === 'divider');
    expect(dividers).toHaveLength(1);
    expect(dividers[0].region).toBe('X');
  });

  it('a region change mid-list produces a second divider', () => {
    const list = [
      { name: 'A', region: 'X' },
      { name: 'B', region: 'X' },
      { name: 'C', region: 'Y' }
    ];
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(), currentRegion: null });
    expect(rows.filter((r) => r.type === 'divider').map((r) => r.region)).toEqual(['X', 'Y']);
  });

  it('a country with no `region` field on any row produces zero dividers (costs nothing when unused)', () => {
    const list = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(), currentRegion: null });
    expect(rows.filter((r) => r.type === 'divider')).toHaveLength(0);
    expect(rows.filter((r) => r.type === 'row')).toHaveLength(3);
    expect(rows.every((r) => r.folded === false)).toBe(true);
  });

  it('a row with no `region` field is never folded, even inside a collapsed set that would otherwise match', () => {
    const list = [
      { name: 'A', region: 'X' },
      { name: 'Ungrouped' },
      { name: 'B', region: 'X' }
    ];
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(['X']), currentRegion: null });
    const ungrouped = rows.find((r) => r.type === 'row' && r.city.name === 'Ungrouped');
    expect(ungrouped.folded).toBe(false);
  });

  it('a collapsed region folds its rows (folded: true), an open region does not', () => {
    const list = [
      { name: 'A', region: 'X' },
      { name: 'B', region: 'Y' }
    ];
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(['X']), currentRegion: null });
    const a = rows.find((r) => r.type === 'row' && r.city.name === 'A');
    const b = rows.find((r) => r.type === 'row' && r.city.name === 'B');
    expect(a.folded).toBe(true);
    expect(b.folded).toBe(false);
  });

  it('the selected city\'s group is always force-open, regardless of collapsed state', () => {
    const list = [
      { name: 'A', region: 'X' },
      { name: 'B', region: 'X' }
    ];
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(['X']), currentRegion: 'X' });
    const divider = rows.find((r) => r.type === 'divider');
    const a = rows.find((r) => r.type === 'row' && r.city.name === 'A');
    expect(divider.open).toBe(true);
    expect(a.folded).toBe(false);
  });

  it('`index` on a row descriptor is the position in the ORIGINAL list, unaffected by dividers', () => {
    const list = [
      { name: 'A', region: 'X' },
      { name: 'B', region: 'X' },
      { name: 'C', region: 'Y' }
    ];
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(), currentRegion: null });
    const rowDescriptors = rows.filter((r) => r.type === 'row');
    expect(rowDescriptors.map((r) => r.index)).toEqual([0, 1, 2]);
  });

  it('handles an empty or non-array list without throwing', () => {
    expect(computeGroupedRows([], {})).toEqual([]);
    expect(computeGroupedRows(null, {})).toEqual([]);
    expect(computeGroupedRows(undefined, {})).toEqual([]);
  });
});

describe('defaultCollapsedRegions — country-aware collapse seed', () => {
  it('every country except China starts fully expanded (empty Set)', () => {
    for (const cc of ['AU', 'MY', 'FR', 'ID', 'TH', 'SG', 'JP']) {
      expect(defaultCollapsedRegions(cc).size).toBe(0);
    }
  });

  it('China seeds every NON-popular region as collapsed', () => {
    const collapsed = defaultCollapsedRegions('CN');
    const allRegions = new Set(citiesForCountry('CN').map((c) => c.region).filter(Boolean));
    const popular = new Set(CN_POPULAR_PROVINCES);
    for (const r of allRegions) {
      expect(collapsed.has(r)).toBe(!popular.has(r));
    }
  });

  it('no CN_POPULAR_PROVINCES entry is in the default-collapsed set', () => {
    const collapsed = defaultCollapsedRegions('CN');
    for (const p of CN_POPULAR_PROVINCES) {
      expect(collapsed.has(p)).toBe(false);
    }
  });

  it('is case-insensitive on country code and handles missing input', () => {
    expect(defaultCollapsedRegions('cn').size).toBe(defaultCollapsedRegions('CN').size);
    expect(defaultCollapsedRegions(null).size).toBe(0);
    expect(defaultCollapsedRegions(undefined).size).toBe(0);
  });
});

describe('REGION_LABEL_BY_COUNTRY', () => {
  it('has exactly the 4 countries that carry a `region` field today', () => {
    expect(REGION_LABEL_BY_COUNTRY).toEqual({ AU: 'State', MY: 'State', CN: 'Province', FR: 'Région' });
  });
});

describe('CITIES_BY_COUNTRY — region field coverage + real-data invariants', () => {
  it('AU, MY, CN, FR every row carries a `region` field except MY\'s "Johor state"', () => {
    for (const cc of ['AU', 'MY', 'CN', 'FR']) {
      for (const c of citiesForCountry(cc)) {
        if (cc === 'MY' && c.code === 'JOHOR') {
          expect(c.region).toBeUndefined();
        } else {
          expect(typeof c.region).toBe('string');
          expect(c.region.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every other country has zero `region` fields (costs nothing when unused)', () => {
    for (const cc of Object.keys(CITIES_BY_COUNTRY)) {
      if (['AU', 'MY', 'CN', 'FR'].includes(cc)) continue;
      expect(citiesForCountry(cc).every((c) => c.region === undefined)).toBe(true);
    }
  });

  it('MY has 13 states + 3 Federal Territories = 16 region groups', () => {
    const regions = new Set(citiesForCountry('MY').map((c) => c.region).filter(Boolean));
    expect(regions.size).toBe(16);
  });

  it('CN has 22 provinces + 4 municipalities + 5 autonomous regions = 31 region groups', () => {
    const regions = new Set(citiesForCountry('CN').map((c) => c.region).filter(Boolean));
    expect(regions.size).toBe(31);
    // the 5 real autonomous regions — operator's original spec said "3",
    // proceeded with the complete, factually correct set on delegated authority.
    for (const ar of ['Guangxi', 'Inner Mongolia', 'Ningxia', 'Tibet', 'Xinjiang']) {
      expect(regions.has(ar)).toBe(true);
    }
  });

  it('MY[0] is Kuala Lumpur and CN[0] is Beijing — the App.jsx boot-anchor fallback reads element [0] as the national capital', () => {
    expect(citiesForCountry('MY')[0].name).toBe('Kuala Lumpur');
    expect(citiesForCountry('CN')[0].name).toBe('Beijing');
  });

  it('no duplicate city names within MY or CN (findCity does a whole-country name scan)', () => {
    for (const cc of ['MY', 'CN']) {
      const names = citiesForCountry(cc).map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('"Johor state" sits outside any region group\'s fold — always visible', () => {
    const list = citiesForCountry('MY');
    const johorState = list.find((c) => c.code === 'JOHOR');
    expect(johorState).toBeTruthy();
    const rows = computeGroupedRows(list, { collapsedRegions: new Set(['Johor']), currentRegion: null });
    const row = rows.find((r) => r.type === 'row' && r.city.code === 'JOHOR');
    expect(row.folded).toBe(false);
  });

  it('CN_POPULAR_PROVINCES is rendered first in the underlying CN array (Popular-first ordering)', () => {
    const list = citiesForCountry('CN');
    const firstSix = [...new Set(list.slice(0, list.findIndex((c) => !CN_POPULAR_PROVINCES.includes(c.region))).map((c) => c.region))];
    expect(firstSix).toEqual(CN_POPULAR_PROVINCES);
  });
});
