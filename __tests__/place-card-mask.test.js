// place-card-mask.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Part B,
// invariant I2.
//
// A place-card lookup is one Google Place Details call, and Google prices a call by the dearest field it asks for.
// The card's fields sit in the Enterprise tier (US$0.02). One convenient extra field - a review, a summary, "serves
// beer" - moves EVERY lookup to the next tier (US$0.025) without any visible change. So the field list is pinned here
// in full, and checked against the fields Google lists in the dearer tier (as read from Google's Place Details page on
// 22-11 '26). Adding a field means editing this file on purpose.
//
// The limits are counted in thousandths of a US dollar, so both prices are whole numbers.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pc = require('../place-card.js');
const { PRICES } = require('../api-cost.js');

// The Enterprise + Atmosphere tier, from Google's Place Details (New) field list.
const DEARER_TIER = [
  'reviews', 'reviewSummary', 'generativeSummary', 'editorialSummary', 'neighborhoodSummary', 'evChargeAmenitySummary',
  'allowsDogs', 'curbsidePickup', 'delivery', 'dineIn', 'goodForChildren', 'goodForGroups', 'goodForWatchingSports',
  'liveMusic', 'menuForChildren', 'outdoorSeating', 'parkingOptions', 'paymentOptions', 'reservable', 'restroom',
  'servesBeer', 'servesBreakfast', 'servesBrunch', 'servesCocktails', 'servesCoffee', 'servesDessert', 'servesDinner',
  'servesLunch', 'servesVegetarianFood', 'servesWine', 'takeout', 'evChargeOptions', 'fuelOptions',
];

describe('the card lookup asks only for the US$0.02 tier (I2)', () => {
  it('the field list is exactly the one the card needs', () => {
    expect(pc.CARD_FIELDS).toEqual([
      'id', 'displayName', 'formattedAddress', 'addressComponents', 'location', 'types', 'primaryType',
      'primaryTypeDisplayName', 'businessStatus', 'googleMapsUri', 'rating', 'userRatingCount', 'priceLevel',
      'currentOpeningHours', 'regularOpeningHours', 'utcOffsetMinutes',
    ]);
  });

  it('the header sent to Google is that list, joined by commas', () => {
    expect(pc.PLACE_CARD_FIELD_MASK).toBe(pc.CARD_FIELDS.join(','));
  });

  it('no field of the dearer tier is in it, whole or as a sub-field', () => {
    for (const f of pc.CARD_FIELDS) {
      const top = f.split('.')[0];
      expect(DEARER_TIER, `${f} is in the US$0.025 tier`).not.toContain(top);
    }
  });

  it('no wildcard, which Google bills at the dearest tier', () => {
    expect(pc.PLACE_CARD_FIELD_MASK).not.toContain('*');
  });
});

describe('the prices and the limits, in thousandths of a US dollar (I1, I2)', () => {
  it('a card lookup is 20 and a full-card lookup is 25', () => {
    expect(pc.CARD_MILLS).toBe(20);
    expect(pc.FULL_MILLS).toBe(25);
  });

  it('a reader has 1,000 a Singapore day, which is 50 card lookups', () => {
    expect(pc.READER_DAILY_MILLS).toBe(1000);
    expect(pc.READER_DAILY_MILLS / pc.CARD_MILLS).toBe(50);
  });

  it('everyone together has 20,000 a month, which is 1,000 card lookups', () => {
    expect(pc.MONTHLY_MILLS).toBe(20000);
    expect(pc.MONTHLY_MILLS / pc.CARD_MILLS).toBe(1000);
  });

  it('an answer is kept 24 hours', () => {
    expect(pc.STORE_TTL_S).toBe(24 * 60 * 60);
  });

  it('/cost knows both rates, and they agree with the limits', () => {
    expect(PRICES.maps.placeCard).toBe(0.02);
    expect(PRICES.maps.placeCardFull).toBe(0.025);
    expect(Math.round(PRICES.maps.placeCard * 1000)).toBe(pc.CARD_MILLS);
    expect(Math.round(PRICES.maps.placeCardFull * 1000)).toBe(pc.FULL_MILLS);
  });
});

describe('what the route accepts', () => {
  it('a Google place ID is letters, digits, dash and underscore', () => {
    expect(pc.isPlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(true);
    expect(pc.isPlaceId('ChIJ-abc_DEF0123456789')).toBe(true);
  });

  it('anything else is refused before it can reach a URL', () => {
    for (const bad of ['', 'short', '../../v1/places:searchText', 'ChIJ abc def ghi jkl', 'ChIJabc/def0123456789', 'ChIJabc?fields=*0123456', null, undefined, 42, 'x'.repeat(301)]) {
      expect(pc.isPlaceId(bad), String(bad)).toBe(false);
    }
  });

  it('the nine languages are served; zh is asked of Google as zh-CN; anything else falls back to English', () => {
    expect(pc.LANGS).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
    expect(pc.googleLang('zh')).toBe('zh-CN');
    expect(pc.googleLang('ko')).toBe('ko');
    expect(pc.cardLang('xx')).toBe('en');
    expect(pc.cardLang('ja')).toBe('ja');
    expect(pc.cardLang(undefined)).toBe('en');
  });
});
