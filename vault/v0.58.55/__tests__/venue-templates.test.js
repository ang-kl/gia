// __tests__/venue-templates.test.js — v0.58.50

import { describe, it, expect } from 'vitest';
import { formatVenueBlock, formatStatsLine, formatHoursLine, formatTravelLine } from '../venue-templates.js';

const SAMPLE_VENUE = {
  name: 'Lazy Lizard',
  area: '12 Flora Vista, #01-08, Singapore 509101',
  rating: 4.5,
  userRatingCount: 87,
  priceLevel: 2,
  openNow: true,
  weekdayDescriptions: [
    'Monday: 11:00 AM – 9:00 PM',
    'Tuesday: 11:00 AM – 9:00 PM',
    'Wednesday: 11:00 AM – 9:00 PM',
    'Thursday: 11:00 AM – 9:00 PM',
    'Friday: 11:00 AM – 10:00 PM',
    'Saturday: 12:00 PM – 10:00 PM',
    'Sunday: Closed'
  ],
  websiteUri: 'https://lazylizard.sg',
  phone: '+65 6555 1234',
  crowdLevel: 'low',
  distanceM: 1240,
  dishes: ['Truffle Risotto', 'Carbonara', 'Tiramisu'],
  url: 'https://maps.app.goo.gl/lazylizard'
};

describe('formatVenueBlock — T1 detail-with-sanctuary', () => {
  it('renders all rows including sanctuary read, no distance', () => {
    const sanctuary = '• Quiet: yes\n• Seating: cozy nooks\n• Vibe: candlelit\n• Approach: walk-up';
    const out = formatVenueBlock(SAMPLE_VENUE, {
      variant: 'detail-with-sanctuary',
      sanctuaryRead: sanctuary
    });
    expect(out).toContain('<b>Lazy Lizard</b>');
    expect(out).toContain('📇 12 Flora Vista');
    expect(out).toContain('🕰️');
    expect(out).toContain('🌐 https://lazylizard.sg');
    expect(out).toContain('📞 +65 6555 1234');
    expect(out).toContain('🌿 Sanctuary read for Lazy Lizard');
    expect(out).toContain('• Quiet: yes');
    expect(out).toContain('✨ ⭐4.5 (87) • $$ • 🟢 quiet');
    expect(out).not.toContain('km');     // T1 omits distance
    expect(out).not.toContain('1240');
    expect(out).toContain('🧾 Truffle Risotto · Carbonara · Tiramisu');
    expect(out).toContain('📍 https://maps.app.goo.gl/lazylizard');
  });
});

describe('formatVenueBlock — T2 detail (no sanctuary, with distance)', () => {
  it('renders contact rows + stats with distance + order + Maps URL', () => {
    const out = formatVenueBlock(SAMPLE_VENUE, { variant: 'detail' });
    expect(out).toContain('<b>Lazy Lizard</b>');
    expect(out).toContain('📇');
    expect(out).toContain('🕰️');
    expect(out).toContain('🌐 https://lazylizard.sg');
    expect(out).toContain('📞 +65 6555 1234');
    expect(out).not.toContain('🌿 Sanctuary read');
    expect(out).toContain('✨ ⭐4.5 (87) • $$ • 🟢 quiet • 1.24 km');
    expect(out).toContain('🧾');
    expect(out).toContain('📍');
  });

  it('formats distance < 1km as metres', () => {
    const v = { ...SAMPLE_VENUE, distanceM: 480 };
    const out = formatVenueBlock(v, { variant: 'detail' });
    expect(out).toContain('480 m');
    expect(out).not.toContain('0.48 km');
  });
});

describe('formatVenueBlock — T3 compact', () => {
  it('renders only name/address/hours/stats/Maps (no website/phone/order/sanctuary)', () => {
    const out = formatVenueBlock(SAMPLE_VENUE, {
      variant: 'compact',
      number: 1
    });
    expect(out).toContain('1. <b>Lazy Lizard</b>');
    expect(out).toContain('📇');
    expect(out).toContain('🕰️');
    expect(out).not.toContain('🌐');
    expect(out).not.toContain('📞');
    expect(out).not.toContain('🌿');
    expect(out).not.toContain('🧾');
    expect(out).toContain('✨ ⭐4.5 (87) • $$ • 🟢 quiet • 1.24 km');
    expect(out).toContain('📍');
  });
});

describe('formatVenueBlock — gracefully omits missing fields', () => {
  it('skips 🌐 / 📞 lines when website/phone are absent', () => {
    const v = { ...SAMPLE_VENUE, websiteUri: '', phone: '' };
    const out = formatVenueBlock(v, { variant: 'detail' });
    expect(out).not.toContain('🌐');
    expect(out).not.toContain('📞');
    expect(out).toContain('📇');
  });

  it('skips 🧾 line when no dishes', () => {
    const v = { ...SAMPLE_VENUE, dishes: [] };
    const out = formatVenueBlock(v, { variant: 'detail' });
    expect(out).not.toContain('🧾');
  });

  it('returns empty string for null/no-name input', () => {
    expect(formatVenueBlock(null)).toBe('');
    expect(formatVenueBlock({ name: '' })).toBe('');
  });
});

describe('formatHoursLine — closedTodayLabel preferred over weekdayDescriptions', () => {
  it('uses closedTodayLabel when present', () => {
    const v = {
      openNow: false,
      closedTodayLabel: 'Closed today · Opens tomorrow 11:00 AM',
      weekdayDescriptions: SAMPLE_VENUE.weekdayDescriptions
    };
    expect(formatHoursLine(v)).toBe('🕰️ Closed today · Opens tomorrow 11:00 AM');
  });

  it('falls back to weekdayDescriptions[today]', () => {
    const v = { openNow: true, weekdayDescriptions: SAMPLE_VENUE.weekdayDescriptions };
    expect(formatHoursLine(v)).toMatch(/^🕰️ /);
  });

  it('returns "Open now" / "Closed" when no schedule available', () => {
    expect(formatHoursLine({ openNow: true })).toBe('🕰️ Open now');
    expect(formatHoursLine({ openNow: false })).toBe('🕰️ Closed');
    expect(formatHoursLine({ openNow: null })).toBe('');
  });

  // v0.58.55: lang propagates to formatHoursLine + formatStatsLine.
  it('localises Open now / Closed when lang=fr', () => {
    expect(formatHoursLine({ openNow: true }, 'fr')).toBe('🕰️ Ouvert maintenant');
    expect(formatHoursLine({ openNow: false }, 'fr')).toBe('🕰️ Fermé');
  });

  it('localises crowd label when lang=fr', () => {
    const en = formatStatsLine({ rating: 4.2, userRatingCount: 50, crowdLevel: 'high' });
    const fr = formatStatsLine({ rating: 4.2, userRatingCount: 50, crowdLevel: 'high' }, { lang: 'fr' });
    expect(en).toContain('🔴 busy');
    expect(fr).toContain('🔴 chargé');
  });

  it('renders FR hours + crowd inside formatVenueBlock when lang=fr', () => {
    const v = { name: 'Lieu', placeId: 'p1', openNow: true, crowdLevel: 'low', rating: 4.0 };
    const out = formatVenueBlock(v, { variant: 'detail', lang: 'fr' });
    expect(out).toContain('🕰️ Ouvert maintenant');
    expect(out).toContain('🟢 calme');
  });
});

describe('HTML escape — venue name with < > &', () => {
  it('escapes special chars in heading + address', () => {
    const v = { ...SAMPLE_VENUE, name: 'Bar <Hops & Pops>', area: 'A & B Mall' };
    const out = formatVenueBlock(v, { variant: 'detail' });
    expect(out).toContain('<b>Bar &lt;Hops &amp; Pops&gt;</b>');
    expect(out).toContain('📇 A &amp; B Mall');
  });
});

describe('formatStatsLine variants', () => {
  it('omits price/crowd/distance when fields absent', () => {
    expect(formatStatsLine({ rating: 4.2, userRatingCount: 50 })).toBe('✨ ⭐4.2 (50)');
  });

  it('returns empty string when no rating', () => {
    expect(formatStatsLine({})).toBe('');
  });
});

describe('formatTravelLine — v0.58.52', () => {
  it('shows BOTH transit and drive when available', () => {
    expect(formatTravelLine({ transitMinutes: 18, driveMinutes: 7 }))
      .toBe('🚊 18 min · 🚘 7 min');
  });

  it('renders transit alone when drive is missing', () => {
    expect(formatTravelLine({ transitMinutes: 18 })).toBe('🚊 18 min');
  });

  it('renders drive alone when transit is missing', () => {
    expect(formatTravelLine({ driveMinutes: 7 })).toBe('🚘 7 min');
  });

  it('returns empty string when both are missing', () => {
    expect(formatTravelLine({})).toBe('');
    expect(formatTravelLine({ transitMinutes: null, driveMinutes: undefined })).toBe('');
  });

  it('inserts the travel line before 📍 in venue blocks', () => {
    const v = { ...SAMPLE_VENUE, transitMinutes: 18, driveMinutes: 7 };
    const out = formatVenueBlock(v, { variant: 'detail' });
    const lines = out.split('\n');
    const travelIdx = lines.findIndex((l) => l.startsWith('🚊'));
    const mapsIdx   = lines.findIndex((l) => l.startsWith('📍'));
    expect(travelIdx).toBeGreaterThan(-1);
    expect(mapsIdx).toBeGreaterThan(travelIdx);
  });
});
