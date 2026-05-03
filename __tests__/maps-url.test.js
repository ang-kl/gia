// __tests__/maps-url.test.js — v0.45.0 centralised Maps URL helper.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { googleMapsUrl, googleMapsContainerUrl, buildMapHashUrl } = require('../maps-url.js');

describe('googleMapsUrl', () => {
  it('returns null for null/undefined/empty', () => {
    expect(googleMapsUrl(null)).toBe(null);
    expect(googleMapsUrl(undefined)).toBe(null);
    expect(googleMapsUrl({})).toBe(null);
  });

  it('prefers googleMapsLinks.placeUri (place_id deep-link, iOS-friendly)', () => {
    const r = googleMapsUrl({
      googleMapsLinks: { placeUri: 'https://maps.app.goo.gl/abc123' },
      url: 'http://other-url',
      googleMapsUri: 'http://cid-url',
      placeId: 'ChIJ_test'
    });
    expect(r).toBe('https://maps.app.goo.gl/abc123');
  });

  it('falls back to place.url when no placeUri', () => {
    const r = googleMapsUrl({
      url: 'https://existing.example/map',
      googleMapsUri: 'http://other'
    });
    expect(r).toBe('https://existing.example/map');
  });

  it('falls back to googleMapsUri when no placeUri or url', () => {
    const r = googleMapsUrl({
      googleMapsUri: 'https://maps.google.com/?cid=12345'
    });
    expect(r).toBe('https://maps.google.com/?cid=12345');
  });

  it('synthesises place_id deep-link from placeId field', () => {
    const r = googleMapsUrl({ placeId: 'ChIJ_synth_test' });
    expect(r).toBe('https://www.google.com/maps/place/?q=place_id:ChIJ_synth_test');
  });

  it('synthesises place_id deep-link from id field', () => {
    const r = googleMapsUrl({ id: 'ChIJ_id_test' });
    expect(r).toBe('https://www.google.com/maps/place/?q=place_id:ChIJ_id_test');
  });

  it('falls back to lat/lng search URL', () => {
    const r = googleMapsUrl({ lat: 1.2839, lng: 103.8517 });
    expect(r).toBe('https://www.google.com/maps/search/?api=1&query=1.2839,103.8517');
  });

  it('encodes place_id properly (special characters)', () => {
    const r = googleMapsUrl({ placeId: 'ChIJ_test/with+special' });
    expect(r).toContain('place_id:');
    expect(r).toContain('ChIJ_test');
    // encoded:
    expect(r).toMatch(/%2F|%2B/);
  });

  it('rejects non-http url field', () => {
    const r = googleMapsUrl({ url: 'javascript:alert(1)', placeId: 'ChIJ_safe' });
    expect(r).toBe('https://www.google.com/maps/place/?q=place_id:ChIJ_safe');
  });
});

describe('googleMapsContainerUrl (multi-stop directions)', () => {
  it('returns null for empty array', () => {
    expect(googleMapsContainerUrl([])).toBe(null);
    expect(googleMapsContainerUrl(null)).toBe(null);
  });

  it('builds destination_place_id for first venue when placeId present', () => {
    const r = googleMapsContainerUrl([{ placeId: 'ChIJ_a', lat: 1, lng: 2 }]);
    expect(r).toContain('destination_place_id=ChIJ_a');
    expect(r).toContain('travelmode=walking');
  });

  it('falls back to coord destination when no placeId', () => {
    const r = googleMapsContainerUrl([{ lat: 1.28, lng: 103.85 }]);
    expect(r).toContain('destination=1.28%2C103.85');
  });

  it('caps waypoints at 4 (Google Maps URL limit = destination + 4)', () => {
    const venues = Array.from({ length: 10 }, (_, i) => ({ placeId: `ChIJ_${i}` }));
    const r = googleMapsContainerUrl(venues);
    // destination = ChIJ_0, waypoints = ChIJ_1..ChIJ_4 (4 waypoints)
    expect(r).toContain('destination_place_id=ChIJ_0');
    expect(r).toContain('waypoint_place_ids=');
    expect(r).toContain('ChIJ_1');
    expect(r).toContain('ChIJ_4');
    expect(r).not.toContain('ChIJ_5');
  });

  it('honours travelmode override', () => {
    const r = googleMapsContainerUrl([{ placeId: 'ChIJ_a' }], { travelmode: 'transit' });
    expect(r).toContain('travelmode=transit');
  });

  it('includes origin when supplied', () => {
    const r = googleMapsContainerUrl([{ placeId: 'ChIJ_a' }], { origin: '1.28,103.85' });
    expect(r).toContain('origin=1.28%2C103.85');
  });
});

describe('buildMapHashUrl (TMA multi-marker view)', () => {
  it('returns null for empty array', () => {
    expect(buildMapHashUrl([])).toBe(null);
    expect(buildMapHashUrl(null)).toBe(null);
  });

  it('returns null when no venue has lat/lng', () => {
    expect(buildMapHashUrl([{ name: 'A' }, { name: 'B' }])).toBe(null);
  });

  it('builds /app/map#venues=<base64> path (relative)', () => {
    const r = buildMapHashUrl([{ name: 'Test', lat: 1.28, lng: 103.85, placeId: 'ChIJ_a' }]);
    expect(r).toMatch(/^\/app\/map#venues=[A-Za-z0-9_-]+$/);
  });

  it('prepends webhookDomain when supplied (shareable URL)', () => {
    const r = buildMapHashUrl([{ name: 'Test', lat: 1.28, lng: 103.85 }], { webhookDomain: 'gia.example.com' });
    expect(r).toMatch(/^https:\/\/gia\.example\.com\/app\/map#venues=/);
  });

  it('encodes venue JSON as base64url (no +, /, = chars)', () => {
    const r = buildMapHashUrl([{ name: 'Test+Place/Name=', lat: 1.28, lng: 103.85 }]);
    const hashPart = r.split('#venues=')[1];
    expect(hashPart).not.toMatch(/[+/=]/);
  });

  it('drops venues without lat/lng (filters before encoding)', () => {
    const r = buildMapHashUrl([
      { name: 'Has', lat: 1.28, lng: 103.85 },
      { name: 'No coords' }
    ]);
    expect(r).toBeTruthy();
    // Decode and verify only one venue made it
    const hashPart = r.split('#venues=')[1];
    const padded = hashPart + '='.repeat((4 - (hashPart.length % 4)) % 4);
    const decoded = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const venues = JSON.parse(decoded);
    expect(venues.length).toBe(1);
    expect(venues[0].name).toBe('Has');
  });
});
