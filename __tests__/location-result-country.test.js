// location-result-country.test.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md,
// part A, invariants I1 and I3.
//
// The operator typed `/l mandarin gallery` with a saved country preference of MY. Google found the real Mandarin
// Gallery in Singapore, and the bot replied "📍 Location saved: 🇲🇾 Mandarin Gallery, Singapore" and stored the place as
// `region: 'OTHER', country: 'MY'`. The flag and the saved country came from the country SEARCHED, not the country
// FOUND. These tests hold the fix: the found country decides the flag and the record; the preference is untouched
// (A8); and the one extra field the lookup asks for stays in the price tier the request already pays (I3).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { maskComments } from './helpers/mask-comments.js';

const require = createRequire(import.meta.url);
const { placeSaveFields, saveOptions, recentEntry, LOCATION_SEARCH_FIELD_MASK } = require('../location-result-country.js');

describe('A: the country the place is in decides the flag and the record (I1)', () => {
  it('a Singapore place found while the preference is MY is shown with 🇸🇬 and saved as a Singapore place', () => {
    const f = placeSaveFields({ requested: 'MY', found: 'SG' });
    expect(f).toEqual({ country: 'SG', region: null, flag: '🇸🇬' });
    const o = saveOptions(f, 'Mandarin Gallery, Singapore');
    expect(o).toEqual({ label: 'Mandarin Gallery, Singapore' });
    expect('region' in o, 'a Singapore place carries no OTHER region').toBe(false);
    expect('country' in o, 'and no country, as the Singapore branch saves it').toBe(false);
  });

  it('a place found in TH while the preference is MY is shown with 🇹🇭 and saved with country TH', () => {
    const f = placeSaveFields({ requested: 'MY', found: 'TH' });
    expect(f).toEqual({ country: 'TH', region: 'OTHER', flag: '🇹🇭' });
    expect(saveOptions(f, 'Siam Paragon, Bangkok')).toEqual({ region: 'OTHER', label: 'Siam Paragon, Bangkok', country: 'TH' });
  });

  it('a country outside our list is shown with 🌍 and saved under its own code', () => {
    const f = placeSaveFields({ requested: 'MY', found: 'US' });
    expect(f).toEqual({ country: 'US', region: 'OTHER', flag: '🌍' });
  });

  it('no country in the answer keeps today\'s behaviour: the searched country', () => {
    expect(placeSaveFields({ requested: 'MY', found: null })).toEqual({ country: 'MY', region: 'OTHER', flag: '🇲🇾' });
    expect(placeSaveFields({ requested: 'JP', found: '' })).toEqual({ country: 'JP', region: 'OTHER', flag: '🇯🇵' });
  });

  it('codes are read case-blind', () => {
    expect(placeSaveFields({ requested: 'my', found: 'sg' }).country).toBe('SG');
  });

  it('the recent-locations entry carries the same country, and an OTHER region only when the record has one', () => {
    const sg = recentEntry(placeSaveFields({ requested: 'MY', found: 'SG' }), { lat: 1.3, lng: 103.84, label: 'Mandarin Gallery, Singapore' });
    expect(sg).toEqual({ lat: 1.3, lng: 103.84, label: 'Mandarin Gallery, Singapore', country: 'SG' });
    const th = recentEntry(placeSaveFields({ requested: 'MY', found: 'TH' }), { lat: 13.7, lng: 100.5, label: 'X' });
    expect(th).toEqual({ lat: 13.7, lng: 100.5, label: 'X', country: 'TH', region: 'OTHER' });
  });
});

describe('A: the lookup stays in the same price tier (I3)', () => {
  it('asks for the found country (addressComponents) beside the four fields it always asked for, and nothing else', () => {
    const fields = LOCATION_SEARCH_FIELD_MASK.split(',');
    expect(fields.sort()).toEqual(['places.addressComponents', 'places.displayName', 'places.formattedAddress', 'places.id', 'places.location']);
  });

  it('carries no Text Search Enterprise field', () => {
    // From Google's Text Search page, read 22-11 '26: these move a request into the Enterprise SKU.
    const enterprise = ['places.priceLevel', 'places.rating', 'places.userRatingCount', 'places.websiteUri',
      'places.regularOpeningHours', 'places.currentOpeningHours', 'places.nationalPhoneNumber', 'places.internationalPhoneNumber'];
    for (const e of enterprise) expect(LOCATION_SEARCH_FIELD_MASK).not.toContain(e);
  });
});

describe('A: `/l` goes through the helper', () => {
  const src = maskComments(fs.readFileSync(path.join(process.cwd(), 'index.js'), 'utf8'));
  const from = src.indexOf('const hinted = detectCountryHint(text);');
  const to = src.indexOf("'[Error] /location command failed:'");
  const region = src.slice(from, to);

  it('the /l region was found', () => {
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
  });

  it('the non-Singapore branch asks for the found country and saves through placeSaveFields', () => {
    expect(region).toMatch(/'X-Goog-FieldMask':\s*LOCATION_SEARCH_FIELD_MASK/);
    expect(region).toMatch(/extractCountryCode\(top\.addressComponents\)/);
    expect(region).toMatch(/placeSaveFields\(\{\s*requested:\s*countryCode,\s*found/);
    // `fromChat: true` is written at the call, where chat-place-reaches-devices.test.js (K3) reads each chat write.
    expect(region).toMatch(/setUserLocation\(redis,\s*chatId,\s*lat,\s*lng,\s*\{\s*\.\.\.saveOptions\(saved,\s*label\),\s*fromChat:\s*true\s*\}\)/);
    expect(region).toMatch(/addRecentLocation\(redis,\s*chatId,\s*recentEntry\(/);
  });

  it('the reply shows the found country\'s flag, not the searched one\'s', () => {
    expect(region).toMatch(/Location saved: \$\{saved\.flag\} \$\{label\}/);
    expect(region, 'the old searched-country flag is gone').not.toMatch(/Location saved: \$\{country\?\.flag \|\| ''\}/);
  });

  it('the saved preference is not written by /l (A8)', () => {
    expect(region).not.toMatch(/setUserCountryPref\(/);
  });
});
