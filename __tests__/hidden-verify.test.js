// __tests__/hidden-verify.test.js — v0.59.5

import { describe, it, expect } from 'vitest';
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

  // v0.59.39 / Codex review #244 P2: a missing GOOGLE_MAPS_API_KEY
  // makes lookupVenue return early with the apiError marker (NOT
  // null) so verification is treated as "unavailable" rather than
  // "hallucination". This protects deployments that haven't
  // configured Places yet — they still get Gemini's raw output.
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
