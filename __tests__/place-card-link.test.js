// place-card-link.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Part B,
// invariant I3.
//
// A tapped Google icon carries a place ID and a position, nothing else. After one lookup the server knows the place's
// name, its Google types and its exact position, and may then answer from OUR record of the same place: a hospital
// with every phone line, a police post, an attraction, a hawker centre, a train station.
//
// The rule is deliberately strict, because the wrong card is worse than a plainer one. A link needs ALL of:
//   - a fitting Google type, where the type is reliable (train station, hospital, police; a hawker centre must at
//     least be a food or market place);
//   - a position within the limit for that kind;
//   - the same name once both are tidied (brackets, "Singapore", MRT / Station, Market / Food Centre and the like);
//   - exactly one record that fits. Two means no link.
// A miss falls back to Google's own card, which is correct but plainer (assumption A11).
//
// Everything here runs over the real data files, because a rule that is only tried on hand-made fixtures says nothing
// about the 609 records it will meet.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pc = require('../place-card.js');

const own = pc.loadOwn();
const TYPES = {
  station: ['subway_station', 'transit_station', 'point_of_interest'],
  hospital: ['hospital', 'health', 'point_of_interest'],
  police: ['police', 'point_of_interest'],
  hawker: ['food_court', 'food', 'point_of_interest'],
  attraction: ['tourist_attraction', 'point_of_interest'],
};
const KINDS = Object.keys(TYPES);
const find = (kind, re) => {
  const r = own[kind].find((x) => re.test(x.name));
  if (!r) throw new Error(`no ${kind} record matches ${re}`);
  return r;
};
const metresNorth = (p, m) => ({ lat: p.lat + m / 111195, lng: p.lng });
const link = (name, types, at) => pc.linkOwn({ name, types, lat: at.lat, lng: at.lng }, own);

describe('our own data is loaded, and it is not empty', () => {
  it('holds the five kinds at the sizes the files have', () => {
    // An empty array would make every "each record" check below pass while checking nothing.
    expect(own.station.length).toBe(183);
    expect(own.hospital.length).toBe(67);
    expect(own.police.length).toBe(128);
    expect(own.hawker.length).toBe(122);
    expect(own.attraction.length).toBe(109);
  });

  it('every record has a name and a position; a station also has a code', () => {
    for (const kind of KINDS) {
      for (const r of own[kind]) {
        expect(typeof r.name === 'string' && r.name.length > 0, `${kind} name`).toBe(true);
        expect(Number.isFinite(r.lat) && Number.isFinite(r.lng), `${kind} ${r.name} position`).toBe(true);
      }
    }
    for (const s of own.station) expect(/^[A-Z]{2,3}\d{0,2}$/.test(s.code), `${s.name} code ${s.code}`).toBe(true);
  });

  it('the distance limits are the stated ones', () => {
    expect(pc.LINK_MAX_M).toEqual({ station: 400, hospital: 300, police: 150, hawker: 150, attraction: 300 });
  });
});

describe.each(KINDS)('every %s record links to itself (I3)', (kind) => {
  it('given its own name, its own position and a fitting type', () => {
    const misses = [];
    for (const r of own[kind]) {
      const hit = link(r.name, TYPES[kind], r);
      if (!hit || hit.kind !== kind || hit.record.name !== r.name) misses.push(`${r.name} -> ${hit ? `${hit.kind}:${hit.record.name}` : 'no link'}`);
    }
    expect(misses, misses.slice(0, 5).join(' | ')).toEqual([]);
  });

  it('and still links from 40 m away', () => {
    let linked = 0;
    for (const r of own[kind]) {
      const hit = link(r.name, TYPES[kind], metresNorth(r, 40));
      if (hit && hit.kind === kind && hit.record.name === r.name) linked++;
    }
    expect(linked).toBe(own[kind].length);
  });

  it('but not from 2 km away, however well the name fits', () => {
    for (const r of own[kind]) {
      const hit = link(r.name, TYPES[kind], metresNorth(r, 2000));
      expect(hit && hit.record.name === r.name ? r.name : null, `${r.name} linked from 2 km`).toBe(null);
    }
  });
});

describe('names the way Google writes them still link (I3)', () => {
  it('a station with "MRT Station" and a code in the name', () => {
    const s = find('station', /^Jurong East$/);
    expect(link('Jurong East MRT Station (NS1/EW24)', TYPES.station, s)).toMatchObject({ kind: 'station', record: { name: 'Jurong East' } });
    expect(link('Jurong East', ['subway_station'], s)).toMatchObject({ kind: 'station' });
  });

  it('a police centre written as NPC, or with the American spelling', () => {
    const p = find('police', /^Yishun Neighbourhood Police Centre$/);
    expect(link('Yishun NPC', TYPES.police, p)).toMatchObject({ kind: 'police', record: { name: p.name } });
    expect(link('Yishun Neighborhood Police Center', TYPES.police, p)).toMatchObject({ kind: 'police', record: { name: p.name } });
  });

  it('a police post whose record carries a note in brackets', () => {
    const p = find('police', /^Dover Neighbourhood Police Post \(/);
    expect(link('Dover Neighbourhood Police Post', TYPES.police, p)).toMatchObject({ kind: 'police', record: { name: p.name } });
  });

  it('a hospital whose record has curly apostrophes and Google has straight ones', () => {
    const h = find('hospital', /^KK Women/);
    expect(link("KK Women's and Children's Hospital", TYPES.hospital, h)).toMatchObject({ kind: 'hospital', record: { name: h.name } });
    expect(link("KK Women's and Children's Hospital (KKH)", TYPES.hospital, h)).toMatchObject({ kind: 'hospital' });
  });

  it('a hawker centre Google calls "Centre" and we call "Market"', () => {
    const k = find('hawker', /^Tekka Market$/);
    expect(link('Tekka Centre', ['food_court', 'point_of_interest'], k)).toMatchObject({ kind: 'hawker', record: { name: 'Tekka Market' } });
    expect(link('Tekka Centre', ['restaurant', 'food'], k)).toMatchObject({ kind: 'hawker' });
  });

  it('an attraction whose record adds a description after the name', () => {
    const a = find('attraction', /^Sri Mariamman Temple:/);
    expect(link('Sri Mariamman Temple', TYPES.attraction, a)).toMatchObject({ kind: 'attraction', record: { name: a.name } });
    const m = find('attraction', /^Sultan Mosque/);
    expect(link('Sultan Mosque', ['mosque', 'place_of_worship', 'tourist_attraction'], m)).toMatchObject({ kind: 'attraction', record: { name: m.name } });
  });

  it('a record that appears twice in our file links once, not zero times', () => {
    const g = find('attraction', /^Gardens by the Bay$/);
    expect(own.attraction.filter((x) => x.name === 'Gardens by the Bay').length).toBeGreaterThan(1);
    expect(link('Gardens by the Bay', TYPES.attraction, g)).toMatchObject({ kind: 'attraction', record: { name: 'Gardens by the Bay' } });
  });
});

describe('what must NOT link (I3)', () => {
  it('a cafe inside a hospital', () => {
    const h = find('hospital', /^Mount Elizabeth Hospital$/);
    expect(link('Starbucks', ['cafe', 'food', 'point_of_interest'], h)).toBe(null);
    expect(link('Mount Elizabeth Medical Centre', ['doctor', 'health'], h)).toBe(null);
  });

  it('a place with the hospital\'s name but not a hospital type', () => {
    const h = find('hospital', /^Mount Elizabeth Hospital$/);
    expect(link('Mount Elizabeth Hospital', ['parking', 'point_of_interest'], h)).toBe(null);
  });

  it('a community club or a shop beside a police post', () => {
    const p = find('police', /^Yishun Neighbourhood Police Centre$/);
    expect(link('Yishun Community Club', ['community_center', 'point_of_interest'], p)).toBe(null);
    expect(link('7-Eleven', ['convenience_store', 'store'], p)).toBe(null);
    expect(link('Yishun', ['shopping_mall'], p)).toBe(null);
  });

  it('a bus interchange is not the train station of the same name', () => {
    const s = find('station', /^Jurong East$/);
    expect(link('Jurong East Bus Interchange', ['bus_station', 'transit_station'], s)).toBe(null);
    expect(link('Jurong East', ['bus_station', 'transit_station'], s)).toBe(null);
  });

  it('a mall named after the station is not the station', () => {
    const s = find('station', /^Jurong East$/);
    expect(link('Jurong East Mall', ['shopping_mall'], s)).toBe(null);
    expect(link('Jurong East', ['shopping_mall'], s)).toBe(null);
  });

  it('a station and a hawker centre that share a name are told apart by type, each way', () => {
    const k = find('hawker', /^Maxwell Food Centre$/);
    const s = find('station', /^Maxwell$/);
    expect(link('Maxwell Food Centre', ['food_court', 'food'], k)).toMatchObject({ kind: 'hawker' });
    expect(link('Maxwell', ['subway_station', 'transit_station'], s)).toMatchObject({ kind: 'station' });
    const atHawker = link('Maxwell', ['subway_station', 'transit_station'], k);
    expect(atHawker ? atHawker.kind : null, 'a station type never opens a hawker card').not.toBe('hawker');
  });

  it('a stall inside a hawker centre is not the hawker centre', () => {
    const k = find('hawker', /^Maxwell Food Centre$/);
    expect(link('Tian Tian Hainanese Chicken Rice', ['restaurant', 'food'], k)).toBe(null);
    expect(link('Maxwell Fuzhou Oyster Cake', ['restaurant', 'food'], k)).toBe(null);
  });

  it('a hotel beside an attraction, or a part of it with a longer name', () => {
    const g = find('attraction', /^Gardens by the Bay$/);
    expect(link('Marina Bay Sands', ['lodging', 'hotel'], g)).toBe(null);
    expect(link('Gardens by the Bay - Flower Dome', ['tourist_attraction'], g)).toBe(null);
  });

  it('a name made only of common words links to nothing', () => {
    const k = find('hawker', /^Maxwell Food Centre$/);
    expect(link('Food Centre', ['food_court'], k)).toBe(null);
    expect(link('Market & Food Centre', ['food_court'], k)).toBe(null);
    expect(link('', ['food_court'], k)).toBe(null);
  });

  it('two records that both fit give no link', () => {
    const twin = { ...own, police: [{ name: 'Alpha Neighbourhood Police Post', lat: 1.3, lng: 103.8 }, { name: 'Alpha Neighbourhood Police Post (Annex)', lat: 1.3009, lng: 103.8 }] };
    expect(pc.linkOwn({ name: 'Alpha Neighbourhood Police Post', types: TYPES.police, lat: 1.3004, lng: 103.8 }, twin)).toBe(null);
  });

  it('bad input links to nothing and does not throw', () => {
    for (const bad of [null, undefined, {}, { name: 'X' }, { name: 'X', types: 'police', lat: 1.3, lng: 103.8 }, { name: 'X', types: [], lat: NaN, lng: 103.8 }]) {
      expect(pc.linkOwn(bad, own)).toBe(null);
    }
    expect(pc.linkOwn({ name: 'Maxwell', types: TYPES.station, lat: 1.28, lng: 103.84 }, null)).toBe(null);
  });
});
