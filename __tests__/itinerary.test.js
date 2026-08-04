// __tests__/itinerary.test.js — v0.62.704
//
// The pure half of the Sketchbook itinerary map. These are the rules that
// would be invisible in a screenshot and expensive to find on a device:
// which stops can be pinned at all, whether two drawers can end up the same
// colour, and what happens to the travel chain when a drawer is hidden.
//
// The React tree is deliberately NOT tested here — that is what
// scripts/render-smoke.mjs is for.

import { describe, it, expect } from 'vitest';
import {
  darken, drawerColor, mappable, haversineKm, parseTimeEN,
  buildItinerary, drawerZone, visibleLegs, dayParts, toPlainText, GROUP_HEX
} from '../web/clipboard/src/lib/itinerary.js';

const venue = (name, lat, lng, extra = {}) => ({
  name, venue: { name, lat, lng, area: `${name} Road`, ...extra }
});
const textOnly = (name) => ({ name });   // a copy-all push: no venue, no coords

const cabinet = {
  cabinet: { name: 'Singapore', emoji: '🇸🇬' },
  drawers: [
    { segment: 'breakfast', cards: [venue('Ya Kun', 1.2843, 103.8479), venue('Tiong Bahru Bakery', 1.2856, 103.8317)] },
    { segment: 'lunch',     cards: [venue('Maxwell', 1.2800, 103.8446)] },
    { segment: 'teaBreak',  cards: [venue('PS.Cafe', 1.3059, 103.8118)] },
    { segment: 'dinner',    cards: [venue('Odette', 1.2903, 103.8515, { rating: 4.7 }), textOnly('Jumbo Seafood')] },
    { segment: 'supper',    cards: [venue('Swee Choon', 1.3079, 103.8556)] }
  ]
};

describe('mappable', () => {
  it('requires two finite coordinates', () => {
    expect(mappable({ lat: 1.3, lng: 103.8 })).toBe(true);
    expect(mappable({ lat: 1.3 })).toBe(false);
    expect(mappable({ lat: NaN, lng: 103.8 })).toBe(false);
    expect(mappable(null)).toBe(false);
  });

  it('counts a coordinate-less card out of the map but still into the list', () => {
    const { drawers, totalStops, mappedStops } = buildItinerary(cabinet);
    expect(totalStops).toBe(7);
    expect(mappedStops).toBe(6);
    // The card is still there — it is real content, not a parse failure.
    const dinner = drawers.find((d) => d.key === 'dinner');
    expect(dinner.stops).toHaveLength(2);
    expect(dinner.stops[1].name).toBe('Jumbo Seafood');
    expect(dinner.mapped).toBe(1);
  });
});

describe('drawerColor', () => {
  it('gives the first drawer of a day-part the family colour verbatim', () => {
    expect(drawerColor('evening', 0)).toBe(GROUP_HEX.evening);
  });

  // The bug this exists to stop: teaBreak, earlyDinner and dinner are ALL
  // `evening` in segments.js, so colouring by day-part alone renders three
  // drawers identically — and "which drawer is this pin" is the only thing
  // the colour is for.
  it('never repeats a colour when a day-part holds several drawers', () => {
    const three = buildItinerary({
      drawers: [
        { segment: 'teaBreak', cards: [] },
        { segment: 'earlyDinner', cards: [] },
        { segment: 'dinner', cards: [] }
      ]
    });
    const colors = three.drawers.map((d) => d.color);
    expect(colors[0]).toBe(GROUP_HEX.evening);
    expect(new Set(colors).size).toBe(3);
  });

  it('keeps every colour in a full cabinet distinct', () => {
    const { drawers } = buildItinerary(cabinet);
    expect(new Set(drawers.map((d) => d.color)).size).toBe(drawers.length);
  });

  it('darkens toward black and clamps at 60%', () => {
    expect(darken('#ff6b6b', 0)).toBe('#ff6b6b');
    expect(darken('#ff6b6b', 1)).toBe('#cc5656');
    expect(darken('#ffffff', 99)).toBe(darken('#ffffff', 3));   // capped
  });
});

describe('parseTimeEN', () => {
  it('reads a 12-hour range into minutes past midnight', () => {
    expect(parseTimeEN('7:30 AM – 9:30 AM')).toEqual({ startMin: 450, endMin: 570 });
    expect(parseTimeEN('12:00 PM – 1:30 PM')).toEqual({ startMin: 720, endMin: 810 });
    expect(parseTimeEN('11:00 PM – 2:00 AM')).toEqual({ startMin: 1380, endMin: 120 });
  });

  it('returns null for "Anytime" — wholeDay is not on the clock', () => {
    expect(parseTimeEN('Anytime')).toBeNull();
    expect(parseTimeEN('')).toBeNull();
  });
});

describe('haversineKm', () => {
  it('measures a known Singapore pair', () => {
    // Maxwell Food Centre → Newton Food Centre, ~4.0 km straight line.
    const km = haversineKm({ lat: 1.2800, lng: 103.8446 }, { lat: 1.3121, lng: 103.8383 });
    expect(km).toBeGreaterThan(3.4);
    expect(km).toBeLessThan(3.8);
  });

  it('is zero for a point against itself', () => {
    expect(haversineKm({ lat: 1.3, lng: 103.8 }, { lat: 1.3, lng: 103.8 })).toBe(0);
  });
});

describe('drawerZone', () => {
  it('centres on the mappable stops and measures their spread', () => {
    const { drawers } = buildItinerary(cabinet);
    const z = drawerZone(drawers[0]);
    expect(z.lat).toBeCloseTo((1.2843 + 1.2856) / 2, 5);
    expect(z.spreadKm).toBeGreaterThan(0);
  });

  it('is null — not a point at 0,0 — for a drawer with nothing mappable', () => {
    const { drawers } = buildItinerary({ drawers: [{ segment: 'lunch', cards: [textOnly('a')] }] });
    expect(drawerZone(drawers[0])).toBeNull();
  });

  it('gives a single-stop drawer zero spread rather than NaN', () => {
    const { drawers } = buildItinerary(cabinet);
    expect(drawerZone(drawers[1]).spreadKm).toBe(0);
  });
});

describe('visibleLegs', () => {
  it('links consecutive drawers, one leg fewer than drawers', () => {
    const { drawers } = buildItinerary(cabinet);
    const legs = visibleLegs(drawers);
    expect(legs).toHaveLength(4);
    expect(legs.map((h) => h.from.d.key)).toEqual(['breakfast', 'lunch', 'teaBreak', 'dinner']);
  });

  // The whole point of recomputing rather than hiding a line: unticking a
  // drawer must answer "what if I skip it?" with the leg actually travelled.
  it('re-links across a hidden middle drawer', () => {
    const { drawers } = buildItinerary(cabinet);
    const teaIdx = drawers.find((d) => d.key === 'teaBreak').idx;
    const legs = visibleLegs(drawers, (i) => i !== teaIdx);
    expect(legs).toHaveLength(3);
    const middle = legs[1];
    expect(middle.from.d.key).toBe('lunch');
    expect(middle.to.d.key).toBe('dinner');
    // and the distance is the one you would really travel, not a stale value
    expect(middle.km).toBeCloseTo(
      haversineKm(drawerZone(drawers[1]), drawerZone(drawers[3])), 6);
  });

  it('flags a tight connection', () => {
    const { drawers } = buildItinerary(cabinet);
    const legs = visibleLegs(drawers);
    // Dinner ends 9:00 PM, Supper starts 9:00 PM — zero gap.
    const last = legs[legs.length - 1];
    expect(last.gapMin).toBe(0);
    expect(last.tight).toBe(true);
  });

  it('excludes wholeDay, which has no clock position', () => {
    const { drawers } = buildItinerary({
      drawers: [
        { segment: 'lunch', cards: [venue('a', 1.28, 103.84)] },
        { segment: 'wholeDay', cards: [venue('b', 1.30, 103.85)] },
        { segment: 'dinner', cards: [venue('c', 1.29, 103.85)] }
      ]
    });
    const legs = visibleLegs(drawers);
    expect(legs).toHaveLength(1);
    expect(legs[0].from.d.key).toBe('lunch');
    expect(legs[0].to.d.key).toBe('dinner');
  });

  it('drops drawers with no mappable stop from the chain', () => {
    const { drawers } = buildItinerary({
      drawers: [
        { segment: 'lunch', cards: [venue('a', 1.28, 103.84)] },
        { segment: 'teaBreak', cards: [textOnly('nowhere')] },
        { segment: 'dinner', cards: [venue('c', 1.29, 103.85)] }
      ]
    });
    expect(visibleLegs(drawers)).toHaveLength(1);
  });
});

describe('dayParts', () => {
  it('omits day-parts that hold no drawers', () => {
    const { drawers } = buildItinerary({ drawers: [{ segment: 'lunch', cards: [] }] });
    const parts = dayParts(drawers);
    expect(parts.map((p) => p.key)).toEqual(['midday']);
  });

  it('computes each part span from the drawers inside it', () => {
    const { drawers } = buildItinerary(cabinet);
    const evening = dayParts(drawers).find((p) => p.key === 'evening');
    // teaBreak 3:00 PM – 5:00 PM, dinner 7:30 PM – 9:00 PM
    expect(evening.items.map((d) => d.key)).toEqual(['teaBreak', 'dinner']);
    expect(evening.span).toEqual(['3:00 PM', '9:00 PM']);
  });

  it('lifts wholeDay out of `night` into its own trailing Anytime part', () => {
    const { drawers } = buildItinerary({
      drawers: [{ segment: 'supper', cards: [] }, { segment: 'wholeDay', cards: [] }]
    });
    const parts = dayParts(drawers);
    expect(parts.map((p) => p.key)).toEqual(['night', 'anytime']);
    expect(parts[1].span).toBeNull();
  });

  it('orders drawers by the clock, not by insertion', () => {
    const { drawers } = buildItinerary({
      drawers: [{ segment: 'dinner', cards: [] }, { segment: 'teaBreak', cards: [] }]
    });
    expect(dayParts(drawers)[0].items.map((d) => d.key)).toEqual(['teaBreak', 'dinner']);
  });
});

describe('toPlainText', () => {
  it('separates by drawer and names the unmappable stop rather than dropping it', () => {
    const { drawers } = buildItinerary(cabinet);
    const text = toPlainText({ cabinet: cabinet.cabinet, drawers, legs: visibleLegs(drawers) });
    expect(text).toContain('Ya Kun');
    expect(text).toContain('Jumbo Seafood');
    expect(text).toContain('no coordinates');
    // every drawer heading present
    for (const d of drawers) expect(text).toContain(d.name);
    // a Maps link only for stops that have one
    expect(text).toContain('google.com/maps/search/');
  });
});
