// __tests__/hawker-vault.test.js — v0.50.0 MD-file-backed vault.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const vault = require('../hawker-vault.js');

beforeEach(() => vault._resetCache());

describe('parseMd', () => {
  it('parses Markets table rows with name, address, postal, mgmt', () => {
    const md = `## Markets / Hawker Centres

| S/No | Name of Hawker Centre | Address | Common Property Managed & Maintained by |
|-----:|---|---|---|
| 1 | Adam Food Centre | 2, Adam Road, S(289876) | NEA |
| 2 | Amoy Street Food Centre | National Development Building, Telok Ayer Street, S(069111) | NEA |
`;
    const r = vault.parseMd(md);
    expect(r.length).toBe(2);
    expect(r[0].sno).toBe(1);
    expect(r[0].name).toBe('Adam Food Centre');
    expect(r[0].postal).toBe('289876');
    expect(r[0].mgmt).toBe('NEA');
    expect(r[0].isNew).toBe(false);
    expect(r[1].name).toBe('Amoy Street Food Centre');
  });

  it('parses New Hawker Centres section with isNew=true', () => {
    const md = `## Markets / Hawker Centres

| S/No | Name | Address | Mgmt |
|-----:|---|---|---|
| 1 | First Centre | 1 Foo Rd, S(010001) | NEA |

## New Hawker Centres

| S/No | Name | Address | Operator |
|-----:|---|---|---|
| 1 | Ci Yuan Hawker Centre | 51, Hougang Ave 9, S(538776) | Fei Siong |
`;
    const r = vault.parseMd(md);
    expect(r.length).toBe(2);
    expect(r[0].isNew).toBe(false);
    expect(r[1].isNew).toBe(true);
    expect(r[1].name).toBe('Ci Yuan Hawker Centre');
  });

  // v0.62.596 — operator: redevelopment centres are now SHOWN (with a black
  // "Redevelopment till …" tab + pin), not skipped. Bukit Timah is kept.
  it('keeps Bukit Timah closed-for-redevelopment row (shown with a redevelopment tab)', () => {
    const md = `## Markets / Hawker Centres

| S/No | Name | Address | Mgmt |
|-----:|---|---|---|
| 6 | Bukit Timah Market | Closed for redevelopment till 2029 (tentative) | NEA |
| 7 | Other Centre | 1 Test Rd, S(123456) | NEA |
`;
    const r = vault.parseMd(md);
    expect(r.length).toBe(2);
    expect(r.map((c) => c.name)).toContain('Bukit Timah Market');
    expect(r.map((c) => c.name)).toContain('Other Centre');
  });

  it('strips trailing # footnote marker from name', () => {
    const md = `## Markets / Hawker Centres

| S/No | Name | Address | Mgmt |
|-----:|---|---|---|
| 53 | Chong Pang Market & Food Centre # | Blk 104, S(760104) | TC |
`;
    const r = vault.parseMd(md);
    expect(r[0].name).toBe('Chong Pang Market & Food Centre');
    expect(r[0].name).not.toContain('#');
  });

  it('extracts postal from S(NNNNNN) form, takes first when slash-pair', () => {
    const md = `## Markets / Hawker Centres

| S/No | Name | Address | Mgmt |
|-----:|---|---|---|
| 1 | Pair Centre | Blks 22A/B, Havelock Road, S(161022/162022) | TC |
`;
    const r = vault.parseMd(md);
    expect(r[0].postal).toBe('161022');
  });

  it('attaches region + mapsUrl to every parsed row', () => {
    const md = `## Markets / Hawker Centres

| S/No | Name | Address | Mgmt |
|-----:|---|---|---|
| 1 | Test Centre | 1 Test Rd, S(289876) | NEA |
`;
    const r = vault.parseMd(md);
    expect(r[0].region).toBeTruthy();
    expect(r[0].mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
  });
});

describe('regionForCentre — keyword overrides', () => {
  it('classifies Bedok-area as East via name keyword', () => {
    expect(vault.regionForCentre({ name: 'Bedok Food Centre', address: '1 Bedok Rd', postal: '469572' })).toBe('East');
  });
  it('classifies Yishun as North via name keyword', () => {
    expect(vault.regionForCentre({ name: 'Yishun Park Hawker Centre', address: '51 Yishun Ave 11', postal: '768867' })).toBe('North');
  });
  it('classifies Hougang as North (combining NE)', () => {
    expect(vault.regionForCentre({ name: 'Blk 105 Hougang Ave 1', address: '...', postal: '530105' })).toBe('North');
  });
  it('classifies Jurong as West', () => {
    expect(vault.regionForCentre({ name: 'Taman Jurong Market', address: '3 Yung Sheng Rd', postal: '618499' })).toBe('West');
  });
  it('classifies Tanjong Pagar as South', () => {
    expect(vault.regionForCentre({ name: 'Blk 6 Tanjong Pagar Plaza', address: 'Blk 6, Tanjong Pagar Plaza, S(081006)', postal: '081006' })).toBe('South');
  });
  it('classifies Toa Payoh as Central', () => {
    expect(vault.regionForCentre({ name: 'Blk 127 Toa Payoh Lorong 1', address: '...', postal: '310127' })).toBe('Central');
  });
  it('classifies Pasir Panjang as West (not "East" via Pasir Ris)', () => {
    expect(vault.regionForCentre({ name: 'Pasir Panjang Food Centre', address: '121 Pasir Panjang Rd', postal: '118543' })).toBe('West');
  });
});

describe('regionFromPostalSector — fallback', () => {
  it('CBD postal → South', () => {
    expect(vault.regionFromPostalSector('048947')).toBe('South');
  });
  it('Toa Payoh postal → Central', () => {
    expect(vault.regionFromPostalSector('310127')).toBe('Central');
  });
  it('Bedok postal → East', () => {
    expect(vault.regionFromPostalSector('469572')).toBe('East');
  });
  it('Yishun postal → North', () => {
    expect(vault.regionFromPostalSector('768867')).toBe('North');
  });
  it('Jurong postal → West', () => {
    expect(vault.regionFromPostalSector('618499')).toBe('West');
  });
  it('returns null on garbage', () => {
    expect(vault.regionFromPostalSector('xxx')).toBe(null);
    expect(vault.regionFromPostalSector(null)).toBe(null);
  });
});

describe('integration — load real MD file from data/', () => {
  it('loads ≥120 centres (snapshot has 123, incl. Bukit Timah shown under redevelopment)', () => {
    const all = vault.getAllCentres();
    expect(all.length).toBeGreaterThanOrEqual(120);
    expect(all.length).toBeLessThanOrEqual(125);
  });

  it('every centre has name + region + mapsUrl', () => {
    const all = vault.getAllCentres();
    for (const c of all) {
      expect(c.name).toBeTruthy();
      expect(vault.REGIONS).toContain(c.region);
      expect(c.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
    }
  });

  it('groups by region with non-zero count in each of the 5 regions', () => {
    const by = vault.getByRegion();
    for (const r of vault.REGIONS) {
      expect(by[r].length).toBeGreaterThan(0);
    }
  });

  it('sorts each region alphabetically by name', () => {
    const by = vault.getByRegion();
    for (const r of vault.REGIONS) {
      const names = by[r].map((c) => c.name.toLowerCase());
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    }
  });

  it('formatRegionSummary returns total + per-region counts', () => {
    const s = vault.formatRegionSummary();
    expect(s).toContain('hawker centres');
    for (const r of vault.REGIONS) expect(s).toContain(r);
  });

  it('formatRegionList returns markdown blocks with maps URLs', () => {
    const s = vault.formatRegionList('East');
    expect(s).toContain('East');
    expect(s).toContain('alphabetical');
    expect(s).toContain('📍 https://www.google.com/maps/search/');
  });
});

describe('mapsUrlForCentre', () => {
  it('builds api=1 URL with name + full address', () => {
    const url = vault.mapsUrlForCentre({
      name: 'Maxwell Food Centre',
      address: '1, Kadayanallur Street, S(069184)',
      postal: '069184'
    });
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    expect(url).toContain('Maxwell%20Food%20Centre');
    expect(url).toContain('Kadayanallur');
  });

  it('falls back to "<name> Singapore" when no address', () => {
    const url = vault.mapsUrlForCentre({ name: 'Test', address: '' });
    expect(url).toContain('Test%20Singapore');
  });

  it('returns empty string for null', () => {
    expect(vault.mapsUrlForCentre(null)).toBe('');
  });
});

describe('findByName fuzzy match (kept from v0.49.0 for nea-scrape)', () => {
  const centres = [
    { name: 'Maxwell Food Centre', address: '...', postal: '069184' },
    { name: 'Tiong Bahru Market', address: '...', postal: '168898' }
  ];

  it('matches exact name with score 1', () => {
    const r = vault.findByName(centres, 'Maxwell Food Centre');
    expect(r.score).toBe(1);
  });

  it('matches abbreviated name', () => {
    const r = vault.findByName(centres, 'Maxwell');
    expect(r.centre.postal).toBe('069184');
  });

  it('matches with typo via edit distance', () => {
    const r = vault.findByName(centres, 'Tiong Bahru Markert');
    expect(r).not.toBe(null);
    expect(r.centre.postal).toBe('168898');
  });

  it('returns null for unrelated', () => {
    expect(vault.findByName(centres, 'Zoo')).toBe(null);
  });

  it('1-arg form falls back to live vault', () => {
    const r = vault.findByName('Maxwell');
    expect(r).not.toBe(null);
    expect(r.centre.name).toContain('Maxwell');
  });
});

describe('normaliseName + editDistance (sanity)', () => {
  it('normalises away Centre/Food/Market filler', () => {
    expect(vault.normaliseName('Maxwell Food Centre')).toBe('maxwell');
  });
  it('editDistance returns 0 for identical', () => {
    expect(vault.editDistance('foo', 'foo')).toBe(0);
  });
  it('editDistance counts substitution', () => {
    expect(vault.editDistance('cat', 'bat')).toBe(1);
  });
});
