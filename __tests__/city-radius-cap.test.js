// __tests__/city-radius-cap.test.js — v0.61.419
//
// Operator: "The radius for Kuala Lumpur and Putrajaya should not overlap."
// cityRadiusCapM caps each curated city at HALF the distance to its nearest
// sibling (clamped [8 km, 40 km]) so no two cities' search circles overlap.

import { describe, it, expect } from 'vitest';
import { cityRadiusCapM, CITIES_BY_COUNTRY, citiesForCountry } from '../web/cuisine/src/v2/lib/cities.js';

function havKm(a, b) {
  const R = 6371, r = (d) => (d * Math.PI) / 180;
  const dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const FLOOR_M = 8000;

describe('cityRadiusCapM', () => {
  it('Johor keeps the 120 km whole-state cap', () => {
    expect(cityRadiusCapM('Johor')).toBe(120000);
    expect(cityRadiusCapM({ name: 'Johor', lat: 1.49, lng: 103.74 }, 'MY')).toBe(120000);
  });

  it('a legacy name-only call returns the old 40 km', () => {
    expect(cityRadiusCapM('Kuala Lumpur')).toBe(40000);
  });

  it('KL and Putrajaya get small caps that do NOT overlap', () => {
    const kl = citiesForCountry('MY').find((c) => c.name === 'Kuala Lumpur');
    const pj = citiesForCountry('MY').find((c) => c.name === 'Putrajaya');
    const capKL = cityRadiusCapM(kl, 'MY');
    const capPJ = cityRadiusCapM(pj, 'MY');
    expect(capKL).toBeLessThan(40000);
    expect(capPJ).toBeLessThan(40000);
    // radii (m) sum ≤ separation (m) → circles never overlap
    expect((capKL + capPJ) / 1000).toBeLessThanOrEqual(havKm(kl, pj));
  });

  it('an isolated city keeps the 40 km default', () => {
    // Kuching (Sarawak/Borneo) is ~735 km from every peninsular/Sabah sibling,
    // so half-distance > 40 km → the 40 km ceiling applies.
    const kch = citiesForCountry('MY').find((c) => c.name === 'Kuching');
    expect(cityRadiusCapM(kch, 'MY')).toBe(40000);
  });

  it('NO two cities in a country overlap (unless both are at the 8 km floor)', () => {
    for (const code of Object.keys(CITIES_BY_COUNTRY)) {
      const list = citiesForCountry(code);
      const caps = list.map((c) => ({ c, cap: cityRadiusCapM(c, code) }));
      for (let i = 0; i < caps.length; i++) {
        for (let j = i + 1; j < caps.length; j++) {
          const A = caps[i], B = caps[j];
          const distKm = havKm(A.c, B.c);
          if (distKm <= 0.5) continue;                 // same point (e.g. Johor row dup)
          if (A.cap === FLOOR_M && B.cap === FLOOR_M) continue; // accepted dense-district floor
          if (A.c.name === 'Johor' || B.c.name === 'Johor') continue; // 120 km state cap is intentional
          expect((A.cap + B.cap) / 1000,
            `${A.c.name}+${B.c.name} (${code})`).toBeLessThanOrEqual(distKm + 0.001);
        }
      }
    }
  });
});
