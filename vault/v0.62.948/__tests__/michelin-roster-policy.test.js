import { describe, it, expect } from 'vitest';

const md = require('../michelin-data.js');

// O-208 asked which MICHELIN roster the volume tracks: the ANNOUNCEMENT
// roster (what was awarded on ceremony night) or the LIVE INDEX (what the
// Guide lists today, after closures and delistings).
//
// The answer, found by reading the code rather than deciding afresh: it
// already tracks BOTH, in two layers, and always has —
//
//   RECORDS layer  — VENUES, awards[], COUNTRY_MANIFEST, editionVenues():
//                    INCLUDE status:'closed'. An edition is a historical
//                    snapshot; a restaurant that shut in March was still
//                    three-starred in the 2026 guide. michelin-data.js says
//                    so in as many words above editionVenues().
//
//   DISPLAY layer  — visitableVenues(): EXCLUDES status:'closed'. This is
//                    what index.js uses on every user-facing path, because
//                    sending someone to a shut restaurant is the failure
//                    that matters to a diner.
//
// The policy was implicit — one comment and a filter — so it was possible
// to mistake it for an unanswered question. It is asserted here instead.
describe('MICHELIN roster policy (O-208)', () => {
  const closed = md.VENUES.filter((v) => v.status === 'closed');

  it('there are closed venues to reason about at all', () => {
    // Otherwise every assertion below is vacuous.
    expect(closed.length).toBeGreaterThan(0);
  });

  it('the RECORDS layer keeps closed venues', () => {
    for (const v of closed) {
      expect(md.VENUES.map((x) => x.id)).toContain(v.id);
      expect(v.awards.length, `${v.name} must retain its awards`).toBeGreaterThan(0);
    }
  });

  it('the DISPLAY layer drops them', () => {
    const visible = md.visitableVenues().map((v) => v.id);
    for (const v of closed) expect(visible).not.toContain(v.id);
  });

  it('the manifest counts a closed venue — proving records = announcement roster', () => {
    // SÉZANNE is closed and three-starred in 2026. Tokyo therefore reads 12
    // three-star in the records layer and 11 in the display layer, and the
    // manifest agrees with the FORMER. If the manifest ever matched the
    // display layer instead, the volume would have silently switched rosters.
    const jpTokyo = md.VENUES.filter((v) => v.country === 'JP' && v.city === 'Tokyo');
    const count = (pool) =>
      pool.reduce((n, v) => n + v.awards.filter((a) => a.year === 2026 && a.category === 'three-star').length, 0);

    const records = count(jpTokyo);
    const display = count(md.visitableVenues(jpTokyo));
    expect(records).toBeGreaterThan(display);          // the two layers really differ
    expect(md.COUNTRY_MANIFEST.JP[2026]['three-star']).toBe(
      md.VENUES.filter((v) => v.country === 'JP')
        .reduce((n, v) => n + v.awards.filter((a) => a.year === 2026 && a.category === 'three-star').length, 0),
    );
  });

  it('a closed venue is still reachable by id and by edition', () => {
    for (const v of closed) {
      expect(md.venueById(v.id), `${v.name} must remain addressable`).toBeTruthy();
    }
    const years = new Set();
    for (const v of closed) for (const a of v.awards) years.add(a.year);
    for (const y of years) {
      const ids = md.editionVenues(y).map((x) => x.id);
      const expected = closed.filter((v) => v.awards.some((a) => a.year === y));
      for (const v of expected) expect(ids).toContain(v.id);
    }
  });
});
