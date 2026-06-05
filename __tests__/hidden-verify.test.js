// __tests__/hidden-verify.test.js — v0.59.5

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseBlocks, applyVerified, verifyHiddenGemsOutput } = require('../hidden-verify.js');

const SAMPLE_EN = `1. MONDAY COFFEE BAR - lifestyle cafe
Block 420A Clementi Avenue 1, #01-01 - approx 1.5km north-east from Clementi central.
🕒 08:30 - 17:30 - verifiable.
Google rating - 4.5 and 114 reviews.
Latest rating/review signal - 2026-04-20.
💎 Why a gem: this under-the-radar spot maintains a 4.5 rating with 114 reviews and was covered by DanielFoodDiary.
🍴 Order this: Ricotta Sourdough.
📍 https://www.google.com/maps/search/?api=1&query=Monday+Coffee+Bar+Singapore

2. SEVEN SCOOPS AND BAKES - ice cream and bakery
Block 440 Clementi Avenue 3, #01-04 - approx 1.2km north-west from Clementi central.
🕒 12:00 - 22:00 - verifiable.
Google rating - 4.4 and 56 reviews.
Latest rating/review signal - 2026-04-15.
💎 Why a gem: with only 56 reviews and a 4.4 rating, this independent bakery-cafe was identified by DanielFoodDiary.
🍴 Order this: Sea Salt Brownie.
📍 https://www.google.com/maps/search/?api=1&query=Seven+Scoops+and+Bakes+Singapore`;

const SAMPLE_FR_LINE_BLOCK = {
  number: 1,
  name: 'TEST CAFE',
  lines: [
    '1. TEST CAFE - café',
    'Adresse - quelque part.',
    'Note Google : 4,5 et 114 avis.',
    '💎 Pourquoi un trésor : note 4,5 sur 114 avis.'
  ]
};

describe('parseBlocks', () => {
  it('extracts venue name from "N. NAME - type" headings', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    expect(blocks.length).toBe(2);
    expect(blocks[0].name).toBe('MONDAY COFFEE BAR');
    expect(blocks[1].name).toBe('SEVEN SCOOPS AND BAKES');
  });

  it('captures all lines until the next numbered heading', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    // Block 1 should include 7 content lines + heading = 8.
    expect(blocks[0].lines.length).toBeGreaterThanOrEqual(7);
    expect(blocks[0].lines.some((l) => l.includes('Ricotta Sourdough'))).toBe(true);
    // Heading boundary: block 1 must NOT contain block 2's content.
    expect(blocks[0].lines.some((l) => l.includes('SEVEN SCOOPS'))).toBe(false);
  });

  it('returns empty blocks for non-block input', () => {
    const r = parseBlocks('No numbered headings here. Just prose.');
    expect(r.blocks.length).toBe(0);
    expect(r.prefix.length).toBeGreaterThan(0);
  });

  it('handles em-dash headings as well as hyphen', () => {
    const text = '1. THE CAFE — coffee shop\nAddress: somewhere';
    const { blocks } = parseBlocks(text);
    expect(blocks.length).toBe(1);
    expect(blocks[0].name).toBe('THE CAFE');
  });

  // Codex #209 #1: Gemini sometimes wraps headings in Markdown bold
  // (`**1. NAME - cafe**`) despite the prompt rule. Without stripping,
  // the regex misses and verification silently no-ops.
  it('parses headings wrapped in Markdown bold', () => {
    const text = [
      '**1. MONDAY COFFEE BAR - lifestyle cafe**',
      'Block 420A Clementi Avenue 1 - approx 1.5km north-east.',
      'Google rating - 4.5 and 114 reviews.'
    ].join('\n');
    const { blocks } = parseBlocks(text);
    expect(blocks.length).toBe(1);
    expect(blocks[0].name).toBe('MONDAY COFFEE BAR');
    // Cleaned heading is stored without surrounding asterisks.
    expect(blocks[0].lines[0]).toBe('1. MONDAY COFFEE BAR - lifestyle cafe');
  });

  // Codex #209 #2: capture the block's address so downstream lookupVenue
  // can disambiguate chains / duplicate names.
  it('captures the block address from the line after the heading', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    expect(blocks[0].address).toContain('Block 420A Clementi Avenue 1');
    expect(blocks[1].address).toContain('Block 440 Clementi Avenue 3');
  });

  // v0.60.31 — extract claimed distance from the address line so the
  // verifier can pre-filter blocks that exceed the band before paying
  // for a Places lookup.
  it('extracts claimedDistanceM from "approx 1.5km" prose (km unit)', () => {
    const text = '1. CAFE - coffee\nBlock 420A Clementi Avenue 1 - approx 1.5km north-east.';
    const { blocks } = parseBlocks(text);
    expect(blocks[0].claimedDistanceM).toBe(1500);
  });

  it('extracts claimedDistanceM from "approx 6.3 km east" (decimal km)', () => {
    const text = '1. THE COCONUT CLUB - Restaurant\n269 Beach Road - approx 6.3 km east from anchor.';
    const { blocks } = parseBlocks(text);
    expect(blocks[0].claimedDistanceM).toBe(6300);
  });

  it('extracts claimedDistanceM from "approx 200 m away" (m unit)', () => {
    const text = '1. CAFE - coffee\nBlock 1 Some Road - approx 200 m away.';
    const { blocks } = parseBlocks(text);
    expect(blocks[0].claimedDistanceM).toBe(200);
  });

  it('leaves claimedDistanceM undefined when prose omits distance', () => {
    const text = '1. CAFE - coffee\nBlock 1 Some Road - just nearby.';
    const { blocks } = parseBlocks(text);
    expect(blocks[0].claimedDistanceM).toBeUndefined();
  });
});

describe('applyVerified — EN', () => {
  // v0.59.24: per Human Lead 2026-05-07, review counts are no longer
  // printed (they were inaccurate). The rating value is still verified
  // against live Places data; the count is stripped from both the
  // rating line and any prose mentions.
  it('v0.59.24: rewrites legacy rating line with verified rating; strips review count', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[0], { rating: 4.5, userRatingCount: 162 });
    const rated = out.find((l) => /^Google rating/i.test(l));
    expect(rated).toBe('Google rating - 4.5');
  });

  it('v0.59.24: strips review count from prose mentions', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[0], { rating: 4.5, userRatingCount: 162 });
    const why = out.find((l) => l.startsWith('💎 Why a gem:'));
    expect(why).not.toMatch(/\d+\s+reviews/);
    expect(why).toContain('DanielFoodDiary');
  });

  it('v0.59.24: second venue rating verified, count stripped', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[1], { rating: 4.4, userRatingCount: 159 });
    const rated = out.find((l) => /^Google rating/i.test(l));
    expect(rated).toBe('Google rating - 4.4');
    const why = out.find((l) => l.startsWith('💎 Why a gem:'));
    expect(why).not.toMatch(/\d+\s+reviews/);
  });

  it('v0.59.24: rewrites the new "🌟 Google rating · X" format too', () => {
    const block = {
      number: 1,
      name: 'TEST',
      lines: [
        '1. TEST - cafe',
        '🌟 Google rating · 4.2',
        '💎 Why a gem · solid spot.',
        '📍 https://example.com/'
      ]
    };
    const out = applyVerified(block, { rating: 4.6, userRatingCount: 200 });
    const rated = out.find((l) => /🌟 Google rating/i.test(l));
    expect(rated).toBe('🌟 Google rating · 4.6');
  });

  it('returns the original lines unchanged when verified is null', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[0], null);
    expect(out).toEqual(blocks[0].lines);
  });
});

describe('applyVerified — FR (French locale)', () => {
  it('v0.59.24: rewrites "Note Google" line with comma decimal; strips count', () => {
    const out = applyVerified(SAMPLE_FR_LINE_BLOCK, { rating: 4.5, userRatingCount: 162 });
    const rated = out.find((l) => /^Note Google/i.test(l));
    expect(rated).toBe('Note Google : 4,5');
  });

  it('v0.59.24: strips "X avis" prose mentions', () => {
    const out = applyVerified(SAMPLE_FR_LINE_BLOCK, { rating: 4.5, userRatingCount: 162 });
    const why = out.find((l) => l.startsWith('💎'));
    expect(why).not.toMatch(/\d+\s+avis/);
  });

  it('v0.59.24: rewrites the new "🌟 Note Google · X,X" format', () => {
    const block = {
      number: 1,
      name: 'TEST',
      lines: [
        '1. TEST - café',
        '🌟 Note Google · 4,2',
        '💎 Pourquoi un trésor · spot solide.',
      ]
    };
    const out = applyVerified(block, { rating: 4.6, userRatingCount: 200 });
    const rated = out.find((l) => /🌟 Note Google/i.test(l));
    expect(rated).toBe('🌟 Note Google · 4,6');
  });
});

// v0.60.210 (DF-111) — the "🍴 Try ·" line must carry only genuine
// dish names; category words ("dishes", "food") are filtered out and
// the line is dropped when nothing real survives.
describe('applyVerified — "🍴 Try ·" dish-name guard (DF-111)', () => {
  const blockWith = (tryLine) => ({
    number: 1, name: 'TEST',
    lines: ['1. TEST - cafe', '🌟 Google rating · 4.5', tryLine, '📍 https://example.com/']
  });

  it('drops a bare category word but keeps real dishes', () => {
    const out = applyVerified(blockWith('🍴 Try · Carbonara, dishes, Tiramisu'), null);
    const tryLine = out.find((l) => l.startsWith('🍴 Try'));
    expect(tryLine).toBe('🍴 Try · Carbonara, Tiramisu');
  });

  it('removes the whole Try line when no real dish survives', () => {
    const out = applyVerified(blockWith('🍴 Try · dishes, food'), null);
    expect(out.some((l) => l.startsWith('🍴 Try'))).toBe(false);
    // the rest of the block is untouched
    expect(out.some((l) => l.startsWith('📍'))).toBe(true);
  });

  it('filters the FR "🍴 Essayez ·" label too', () => {
    const out = applyVerified(blockWith('🍴 Essayez · desserts, Tiramisu'), null);
    const tryLine = out.find((l) => l.startsWith('🍴 Essayez'));
    expect(tryLine).toBe('🍴 Essayez · Tiramisu');
  });

  it('runs even when rating verification succeeds', () => {
    const out = applyVerified(blockWith('🍴 Try · food, Beef Wellington'), { rating: 4.6, userRatingCount: 200 });
    expect(out.find((l) => l.startsWith('🍴 Try'))).toBe('🍴 Try · Beef Wellington');
    expect(out.find((l) => /🌟/.test(l))).toBe('🌟 Google rating · 4.6');
  });

  it('leaves a clean Try line untouched', () => {
    const out = applyVerified(blockWith('🍴 Try · Laksa, Char Kway Teow'), null);
    expect(out.find((l) => l.startsWith('🍴 Try'))).toBe('🍴 Try · Laksa, Char Kway Teow');
  });
});

// v0.59.7: businessStatus drop. Closes the gap where Gemini's grounded
// search misses a closed venue but Places already knows it's closed.
describe('verifyHiddenGemsOutput — businessStatus drop (v0.59.7)', () => {
  function fakeLookup(byName) {
    return async (name) => byName[name] || null;
  }

  it('drops a CLOSED_PERMANENTLY venue and renumbers survivors', async () => {
    const result = await verifyHiddenGemsOutput(SAMPLE_EN, {
      _lookup: fakeLookup({
        'MONDAY COFFEE BAR':       { rating: 4.5, userRatingCount: 162, lat: 1, lng: 1, businessStatus: 'CLOSED_PERMANENTLY' },
        'SEVEN SCOOPS AND BAKES':  { rating: 4.4, userRatingCount: 159, lat: 1, lng: 1, businessStatus: 'OPERATIONAL' }
      })
    });
    expect(result.text).not.toContain('MONDAY COFFEE BAR');
    expect(result.text).toContain('SEVEN SCOOPS AND BAKES');
    // The surviving venue gets renumbered from "2." to "1."
    expect(result.text).toMatch(/^1\. SEVEN SCOOPS AND BAKES/);
    expect(result.venues.length).toBe(1);
    expect(result.venues[0].name).toBe(undefined); // fake lookup didn't include name; fine
  });

  it('drops a CLOSED_TEMPORARILY venue too', async () => {
    const result = await verifyHiddenGemsOutput(SAMPLE_EN, {
      _lookup: fakeLookup({
        'MONDAY COFFEE BAR':       { rating: 4.5, userRatingCount: 162, lat: 1, lng: 1, businessStatus: 'OPERATIONAL' },
        'SEVEN SCOOPS AND BAKES':  { rating: 4.4, userRatingCount: 159, lat: 1, lng: 1, businessStatus: 'CLOSED_TEMPORARILY' }
      })
    });
    expect(result.text).toContain('MONDAY COFFEE BAR');
    expect(result.text).not.toContain('SEVEN SCOOPS AND BAKES');
    expect(result.venues.length).toBe(1);
  });

  it('keeps both when both are OPERATIONAL', async () => {
    const result = await verifyHiddenGemsOutput(SAMPLE_EN, {
      _lookup: fakeLookup({
        'MONDAY COFFEE BAR':       { rating: 4.5, userRatingCount: 162, lat: 1, lng: 1, businessStatus: 'OPERATIONAL' },
        'SEVEN SCOOPS AND BAKES':  { rating: 4.4, userRatingCount: 159, lat: 1, lng: 1, businessStatus: 'OPERATIONAL' }
      })
    });
    expect(result.text).toContain('MONDAY COFFEE BAR');
    expect(result.text).toContain('SEVEN SCOOPS AND BAKES');
    expect(result.venues.length).toBe(2);
  });

  // v0.59.39: lookup-null semantics changed. Plain null = "Places searched
  // but no name+address match" → drop the block (Gemini hallucination).
  // Infra-blip case is now signalled by { apiError: true } and KEEPS the
  // block (test below).
  it('drops a venue when Places returns no name+address match (null = hallucination)', async () => {
    const result = await verifyHiddenGemsOutput(SAMPLE_EN, {
      _lookup: async () => null
    });
    // Both blocks should be dropped (no Places match) → allDropped=true
    expect(result.allDropped).toBe(true);
  });

  // v0.59.39 — apiError marker keeps the block so the user doesn't lose
  // results during a transient Places API outage.
  it('keeps a venue when Places lookup hits an API error ({ apiError: true })', async () => {
    const result = await verifyHiddenGemsOutput(SAMPLE_EN, {
      _lookup: async () => ({ apiError: true })
    });
    expect(result.text).toContain('MONDAY COFFEE BAR');
    expect(result.text).toContain('SEVEN SCOOPS AND BAKES');
    expect(result.allDropped).toBe(false);
  });

  // v0.59.40 / Codex review #244 P2: a missing GOOGLE_MAPS_API_KEY
  // makes lookupVenue return the apiError marker (NOT null) so
  // verification is treated as "unavailable" rather than
  // "hallucination". Without this, /hidden in deployments lacking
  // a Maps key would drop ALL Gemini results.
  it('lookupVenue returns apiError marker (not null) when GOOGLE_MAPS_API_KEY is unset', async () => {
    const { lookupVenue } = require('../hidden-verify.js');
    const original = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    try {
      const r = await lookupVenue('Some Cafe', 'Some address');
      expect(r).toEqual({ apiError: true });
    } finally {
      if (original !== undefined) process.env.GOOGLE_MAPS_API_KEY = original;
    }
  });

  // Codex review #211: when EVERY pick is closed, verifyHiddenGemsOutput
  // would otherwise return an empty text — Telegram rejects empty
  // messages. Caller (runSurpriseCommand) checks the allDropped flag
  // and substitutes a user-facing fallback.
  it('flags allDropped=true when every venue is closed', async () => {
    const result = await verifyHiddenGemsOutput(SAMPLE_EN, {
      _lookup: fakeLookup({
        'MONDAY COFFEE BAR':       { rating: 4.5, userRatingCount: 162, lat: 1, lng: 1, businessStatus: 'CLOSED_PERMANENTLY' },
        'SEVEN SCOOPS AND BAKES':  { rating: 4.4, userRatingCount: 159, lat: 1, lng: 1, businessStatus: 'CLOSED_TEMPORARILY' }
      })
    });
    expect(result.allDropped).toBe(true);
    expect(result.venues.length).toBe(0);
  });

  it('does not flag allDropped when at least one venue survives', async () => {
    const result = await verifyHiddenGemsOutput(SAMPLE_EN, {
      _lookup: fakeLookup({
        'MONDAY COFFEE BAR':       { rating: 4.5, userRatingCount: 162, lat: 1, lng: 1, businessStatus: 'OPERATIONAL' },
        'SEVEN SCOOPS AND BAKES':  { rating: 4.4, userRatingCount: 159, lat: 1, lng: 1, businessStatus: 'CLOSED_TEMPORARILY' }
      })
    });
    expect(result.allDropped).toBe(false);
  });
});

// v0.60.33 — dropBlocksByName helper used by runSurpriseCommand to
// strip out-of-radius venues from the displayed text after the
// haversine filter identifies them. Pre-v0.60.33 the haversine pass
// only counted within-radius survivors but did not prune the rendered
// output, so a venue Places resolved >2 km away still appeared in the
// delivered message.
describe('dropBlocksByName (v0.60.33)', () => {
  let dropBlocksByName;
  beforeAll(async () => {
    const mod = await import('../hidden-verify.js');
    dropBlocksByName = mod.default?.dropBlocksByName || mod.dropBlocksByName;
  });

  it('drops the matching block by name (case-insensitive)', () => {
    const text = [
      'Some intro.',
      '',
      '1. NEAR PLACE - Cafe',
      'Block 100 Some Road - approx 1.2 km North.',
      '🌟 4.5',
      '',
      '2. THE COCONUT CLUB - Restaurant',
      '269 Beach Road - approx 6.3 km East.',
      '🌟 4.4'
    ].join('\n');
    const out = dropBlocksByName(text, new Set(['THE COCONUT CLUB']));
    expect(out).toContain('NEAR PLACE');
    expect(out).not.toContain('COCONUT');
    expect(out).not.toContain('Beach Road');
  });

  it('renumbers survivors so the user sees no gaps in numbering', () => {
    const text = [
      '1. ALPHA - Cafe',
      'addr - approx 0.5 km.',
      '',
      '2. BETA - Cafe',
      'addr - approx 5.0 km.',
      '',
      '3. GAMMA - Cafe',
      'addr - approx 0.8 km.'
    ].join('\n');
    const out = dropBlocksByName(text, new Set(['BETA']));
    expect(out).toMatch(/^1\.\s+ALPHA/m);
    expect(out).toMatch(/^2\.\s+GAMMA/m);
    expect(out).not.toContain('BETA');
  });

  it('returns input unchanged when dropNames is empty or no match', () => {
    const text = '1. ALPHA - Cafe\naddr - approx 0.5 km.';
    expect(dropBlocksByName(text, new Set())).toBe(text);
    expect(dropBlocksByName(text, new Set(['NONEXISTENT']))).toBe(text);
  });

  it('handles empty / non-block input gracefully', () => {
    expect(dropBlocksByName('', new Set(['X']))).toBe('');
    expect(dropBlocksByName('No headings here', new Set(['X']))).toBe('No headings here');
  });

  // Codex review on PR #292 (P2): when verifyHiddenGemsOutput already
  // rewrote "I found N hidden gems" to match the post-Places count,
  // dropBlocksByName must rewrite again to match the post-haversine
  // kept count. Otherwise the intro reads "I found 5…" with 4 cards.
  it('rewrites "I found N hidden gems" prefix to match kept count (EN)', () => {
    const text = [
      'I found 3 hidden gems within 100m to 2km of Bukit Merah.',
      '',
      '1. ALPHA - Cafe',
      'addr - approx 0.5 km.',
      '',
      '2. BETA - Cafe',
      'addr - approx 5.0 km.',
      '',
      '3. GAMMA - Cafe',
      'addr - approx 0.8 km.'
    ].join('\n');
    const out = dropBlocksByName(text, new Set(['BETA']));
    expect(out).toContain('I found 2 hidden gems');
    expect(out).not.toContain('I found 3 hidden gems');
  });

  it("rewrites \"J'ai trouvé N trésors cachés\" prefix (FR)", () => {
    const text = [
      "J'ai trouvé 3 trésors cachés autour de Bukit Merah.",
      '',
      '1. ALPHA - Café',
      'adr - approx 0,5 km.',
      '',
      '2. BETA - Café',
      'adr - approx 5,0 km.',
      '',
      '3. GAMMA - Café',
      'adr - approx 0,8 km.'
    ].join('\n');
    const out = dropBlocksByName(text, new Set(['BETA']));
    expect(out).toContain("J'ai trouvé 2 trésors cachés");
    expect(out).not.toContain("J'ai trouvé 3 trésors cachés");
  });
});

// v0.61.318 — newness-refute. The /hidden prompt lets a 300+-review venue
// through ONLY via the C1 "newly opened (≤3 months)" exception. That open
// date is Gemini's web guess, not an API fact. A Google review can only be
// posted after a venue opens, so the OLDEST review Places returns refutes a
// false "new" claim. We use it one-directionally: drop a 300+-review venue
// whose oldest review predates the 3-month window, and strip the false
// "opened …" wording from any kept venue.
describe('newness-refute (v0.61.318)', () => {
  const { oldestReviewMonths, stripOpeningClaim, verifyHiddenGemsOutput: verify } = require('../hidden-verify.js');
  const isoMonthsAgo = (m) => new Date(Date.now() - m * 30.44 * 24 * 60 * 60 * 1000).toISOString();

  describe('oldestReviewMonths', () => {
    it('returns null for no reviews / no timestamps', () => {
      expect(oldestReviewMonths([])).toBe(null);
      expect(oldestReviewMonths(undefined)).toBe(null);
      expect(oldestReviewMonths([{ text: 'great' }])).toBe(null);
    });

    it('returns ~24 for a two-year-old review', () => {
      const m = oldestReviewMonths([{ publishTime: isoMonthsAgo(24) }]);
      expect(m).toBeGreaterThan(23);
      expect(m).toBeLessThan(25);
    });

    it('returns the OLDEST review when reviews are mixed', () => {
      const m = oldestReviewMonths([
        { publishTime: isoMonthsAgo(1) },
        { publishTime: isoMonthsAgo(18) },
        { publishTime: isoMonthsAgo(6) }
      ]);
      expect(m).toBeGreaterThan(17);
      expect(m).toBeLessThan(19);
    });
  });

  describe('stripOpeningClaim', () => {
    it('strips "opened in Month Year" and keeps the rest', () => {
      const out = stripOpeningClaim('rated 4.6 over 87 reviews, opened in March 2026, Eatbook coverage.');
      expect(out).not.toMatch(/opened in March 2026/i);
      expect(out).toContain('rated 4.6 over 87 reviews');
      expect(out).toContain('Eatbook coverage');
    });

    it('strips bare "newly opened"', () => {
      expect(stripOpeningClaim('a newly opened cafe with pastries')).not.toMatch(/newly opened/i);
    });

    it('no-ops on a line with no opening claim', () => {
      const line = 'serves laksa and char kway teow';
      expect(stripOpeningClaim(line)).toBe(line);
    });
  });

  // A 300+-review venue with an old review = not new AND not under-reviewed
  // → drop. A < 120-review venue with recent reviews = a real hidden gem
  // → keep. A kept venue whose oldest review refutes "new" loses the claim.
  const SAMPLE = [
    '1. AURORA TOAST - cafe',
    '12 Some Road, #01-01 - approx 0.5km north from anchor.',
    '🌟 Google rating · 4.6',
    '💎 Why a gem · rated 4.6, newly opened in March 2026, with Eatbook coverage.',
    '🍲 Try · Kaya Toast, Soft Eggs',
    '📍 https://www.google.com/maps/search/?api=1&query=Aurora+Toast+Singapore',
    '',
    '2. GRANDE BISTRO - restaurant',
    '40 Other Road, #01-04 - approx 0.8km east from anchor.',
    '🌟 Google rating · 4.4',
    '💎 Why a gem · a neighbourhood staple, opened in January 2026, strong reviews.',
    '🍲 Try · Pasta, Tiramisu',
    '📍 https://www.google.com/maps/search/?api=1&query=Grande+Bistro+Singapore'
  ].join('\n');

  it('drops a 300+-review venue whose oldest review refutes "new"', async () => {
    const result = await verify(SAMPLE, {
      _lookup: async (name) => ({
        'AURORA TOAST':  { rating: 4.6, userRatingCount: 90,  lat: 1, lng: 1, businessStatus: 'OPERATIONAL', oldestReviewMonths: 1.2 },
        'GRANDE BISTRO': { rating: 4.4, userRatingCount: 850, lat: 1, lng: 1, businessStatus: 'OPERATIONAL', oldestReviewMonths: 26 }
      }[name] || null)
    });
    expect(result.text).not.toContain('GRANDE BISTRO');
    expect(result.text).toContain('AURORA TOAST');
    expect(result.venues.length).toBe(1);
  });

  it('keeps a genuinely new (recent-reviews) venue even at 300+ reviews', async () => {
    const result = await verify(SAMPLE, {
      _lookup: async (name) => ({
        'AURORA TOAST':  { rating: 4.6, userRatingCount: 90,  lat: 1, lng: 1, businessStatus: 'OPERATIONAL', oldestReviewMonths: 1.2 },
        'GRANDE BISTRO': { rating: 4.4, userRatingCount: 420, lat: 1, lng: 1, businessStatus: 'OPERATIONAL', oldestReviewMonths: 2 }
      }[name] || null)
    });
    expect(result.text).toContain('GRANDE BISTRO');
    expect(result.venues.length).toBe(2);
  });

  it('keeps a < 120-review venue but strips a refuted "newly opened" claim', async () => {
    const result = await verify(SAMPLE, {
      _lookup: async (name) => ({
        // Aurora is under-reviewed (C3) so it stays, but its oldest review
        // is 14 months old → the "newly opened in March 2026" line is false.
        'AURORA TOAST':  { rating: 4.6, userRatingCount: 90, lat: 1, lng: 1, businessStatus: 'OPERATIONAL', oldestReviewMonths: 14 },
        'GRANDE BISTRO': { rating: 4.4, userRatingCount: 80, lat: 1, lng: 1, businessStatus: 'OPERATIONAL', oldestReviewMonths: 1 }
      }[name] || null)
    });
    expect(result.text).toContain('AURORA TOAST');
    expect(result.text).not.toMatch(/newly opened in March 2026/i);
    // Grande's oldest review is recent (1mo) → its claim is NOT stripped.
    expect(result.text).toMatch(/opened in January 2026/i);
  });
});
