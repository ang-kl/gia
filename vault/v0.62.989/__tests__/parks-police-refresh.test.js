// __tests__/parks-police-refresh.test.js — v0.62.951.
//
// Spec: doc/Feature/2026-10-29-parks-and-police-refresh.spec.md (I1, I3, I4).
//
// NParks Parks and Nature Reserves (d_77d7ec97be83d44f61b85454f844382f, updated 25-10 '26), SPF Establishments
// (d_c69e6d27d72f765fabfbeea362299378, updated 30-07 '26) and SPF NPC Boundary (d_89b44df21fccc4f51390eaff16aa1fe8,
// updated 02-07 '26), downloaded 29-10 '26. Measured before the refresh, matching rows by name because the publishers
// renumber OBJECTID on every release: one park added and 18 redrawn (the overlay goes 276 -> 279); no police point
// moved, but five changed status, which SPF writes into the name. Nothing in the app reads the NPC Boundary file.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { createHash } from 'crypto';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p));
const json = (p) => JSON.parse(read(p).toString('utf8'));
const sha = (p) => createHash('sha256').update(read(p)).digest('hex');

describe('I1 — the geoloc files are the 29-10 downloads, unedited', () => {
  it('parks', () => {
    expect(sha('geoloc/NParksParksandNatureReserves.geojson')).toBe('032a96ae1cde6057a2fd701b51388fc019df1b6e63e2a599e97a5942ada70526');
  });
  it('police establishments', () => {
    expect(sha('geoloc/SingaporePoliceForceEstablishments.geojson')).toBe('792ed470c357a1106f32991473b226aa22895278c84fc8afb85bd9c28b2101d6');
  });
  it('NPC boundary (C2: refreshed although no code reads it)', () => {
    expect(sha('geoloc/SingaporePoliceForceNPCBoundary.geojson')).toBe('edf2d3c6f8afba5223d444f2485159ec0d50eea6d264e777772f010c1abffa57');
  });
});

describe('I3 — the parks overlay is built from the new data', () => {
  const parks = json('data/geo-parks.json').features;
  const names = parks.map((f) => f.name);
  it('279 parks, each named once', () => {
    expect(parks.length).toBe(279);
    expect(new Set(names).size).toBe(names.length);
  });
  it('the added park, and the two whose redrawn boundaries are now big enough to keep', () => {
    for (const n of ['Westwood Family Park', 'Chuan Green Pg', 'Chuan Lane Park']) expect(names, n).toContain(n);
  });
});

describe('I4 — the police overlay carries SPF\'s current statuses', () => {
  const police = json('data/geo-police.json').features;
  const byName = new Map(police.map((f) => [f.name, f]));
  it('still 128 points', () => {
    expect(police.length).toBe(128);
  });
  it('the five new names are present, the five old ones gone', () => {
    const now = [
      'Bukit Timah Neighbourhood Police Centre (Temporarily Closed)',
      'Hougang West Neighbourhood Police Post (Temporarily Closed)',
      'Hougang Neighbourhood Police Post (Self-Help Kiosks Only)',
      'Serangoon Neighbourhood Police Centre (Self-Help Kiosks Only)',
      'Serangoon North Neighbourhood Police Post (Self-Help Kiosks Only)',
    ];
    const was = [
      'Bukit Timah Neighbourhood Police Centre',
      'Hougang Neighbourhood Police Centre',
      'Hougang Neighbourhood Police Post (Temporarily Closed)',
      'Serangoon Neighbourhood Police Centre (Temporarily Closed)',
      'Serangoon North Neighbourhood Police Post (Temporarily Closed)',
    ];
    for (const n of now) expect(byName.has(n), n).toBe(true);
    for (const n of was) expect(byName.has(n), n).toBe(false);
  });
  it('the renamed Hougang post is the same building at 60 Hougang Avenue 9', () => {
    const f = byName.get('Hougang West Neighbourhood Police Post (Temporarily Closed)');
    expect(f.address).toBe('60 Hougang Avenue 9, Singapore 538775');
  });
});
