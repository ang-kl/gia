// __tests__/coords-to-country.test.js — v0.61.274

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { coordsToCountry, isJbCoords } = require('../web/cuisine/src/v2/lib/coords-to-country.js');

describe('coordsToCountry — SG', () => {
  it('SG centroid → SG', () => {
    expect(coordsToCountry({ lat: 1.3521, lng: 103.8198 })).toBe('SG');
  });
  it('Tanjong Pagar / Outram → SG', () => {
    expect(coordsToCountry({ lat: 1.2811, lng: 103.8439 })).toBe('SG');
  });
  it('Tuas (western tip of SG) → SG', () => {
    expect(coordsToCountry({ lat: 1.32, lng: 103.65 })).toBe('SG');
  });
  it('Changi (eastern SG) → SG', () => {
    expect(coordsToCountry({ lat: 1.35, lng: 104.00 })).toBe('SG');
  });
});

describe('coordsToCountry — MY (JB + peninsular)', () => {
  it('JB CBD → MY', () => {
    expect(coordsToCountry({ lat: 1.4927, lng: 103.7414 })).toBe('MY');
  });
  it('Mid Valley Southkey JB → MY', () => {
    expect(coordsToCountry({ lat: 1.4912, lng: 103.7665 })).toBe('MY');
  });
  it('Pontian (south-west Johor) → MY', () => {
    expect(coordsToCountry({ lat: 1.49, lng: 103.39 })).toBe('MY');
  });
  it('Desaru (east Johor) → MY', () => {
    expect(coordsToCountry({ lat: 1.55, lng: 104.27 })).toBe('MY');
  });
  it('Kuala Lumpur → MY', () => {
    expect(coordsToCountry({ lat: 3.139, lng: 101.6869 })).toBe('MY');
  });
  it('Penang → MY', () => {
    expect(coordsToCountry({ lat: 5.4164, lng: 100.3327 })).toBe('MY');
  });
  it('Putrajaya → MY', () => {
    expect(coordsToCountry({ lat: 2.9264, lng: 101.6964 })).toBe('MY');
  });
  it('Kota Kinabalu (Sabah) → MY', () => {
    expect(coordsToCountry({ lat: 5.9788, lng: 116.0753 })).toBe('MY');
  });
  it('Kuching (Sarawak) → MY', () => {
    expect(coordsToCountry({ lat: 1.5533, lng: 110.3592 })).toBe('MY');
  });
});

describe('coordsToCountry — elsewhere → null', () => {
  it('Bangkok → null', () => {
    expect(coordsToCountry({ lat: 13.7563, lng: 100.5018 })).toBe(null);
  });
  it('Jakarta → null', () => {
    expect(coordsToCountry({ lat: -6.2088, lng: 106.8456 })).toBe(null);
  });
  it('Tokyo → null', () => {
    expect(coordsToCountry({ lat: 35.6762, lng: 139.6503 })).toBe(null);
  });
  it('Sydney → null', () => {
    expect(coordsToCountry({ lat: -33.8688, lng: 151.2093 })).toBe(null);
  });
  it('Queenstown NZ → null (operator screenshot trigger)', () => {
    expect(coordsToCountry({ lat: -45.0312, lng: 168.6626 })).toBe(null);
  });
});

describe('coordsToCountry — defensive', () => {
  it('null input → null', () => {
    expect(coordsToCountry()).toBe(null);
    expect(coordsToCountry(null)).toBe(null);
  });
  it('NaN coords → null', () => {
    expect(coordsToCountry({ lat: NaN, lng: NaN })).toBe(null);
    expect(coordsToCountry({ lat: 1.3521, lng: NaN })).toBe(null);
  });
  it('out-of-range coords → null', () => {
    expect(coordsToCountry({ lat: 999, lng: 999 })).toBe(null);
    expect(coordsToCountry({ lat: -91, lng: 181 })).toBe(null);
  });
});

describe('isJbCoords — JB extent excluding SG bbox', () => {
  it('JB CBD → true', () => {
    expect(isJbCoords({ lat: 1.4927, lng: 103.7414 })).toBe(true);
  });
  it('Mid Valley Southkey → true', () => {
    expect(isJbCoords({ lat: 1.4912, lng: 103.7665 })).toBe(true);
  });
  it('SG centroid → false (inside SG bbox)', () => {
    expect(isJbCoords({ lat: 1.3521, lng: 103.8198 })).toBe(false);
  });
  it('KL → false (inside MY peninsular but outside JB)', () => {
    expect(isJbCoords({ lat: 3.139, lng: 101.6869 })).toBe(false);
  });
  it('Bangkok → false', () => {
    expect(isJbCoords({ lat: 13.7563, lng: 100.5018 })).toBe(false);
  });
});
