// __tests__/open-hours.test.js — v0.57.20

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const oh = require('../open-hours.js');

// Helpers — build a Date that represents the given SGT moment.
// SGT is UTC+8 with no DST, so we subtract 8h from the SGT clock to get UTC.
function sgtDate(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
}

describe('sgtNow', () => {
  it('returns SGT day + minutes for a UTC instant', () => {
    // 2026-05-04 14:30 SGT == 2026-05-04 06:30 UTC
    const d = new Date(Date.UTC(2026, 4, 4, 6, 30));
    const got = oh.sgtNow(d);
    expect(got.minutes).toBe(14 * 60 + 30);
    // 2026-05-04 is a Monday → day = 1
    expect(got.day).toBe(1);
  });

  it('rolls forward to next day when SGT clock crosses midnight', () => {
    // 2026-05-04 23:00 UTC == 2026-05-05 07:00 SGT
    const d = new Date(Date.UTC(2026, 4, 4, 23, 0));
    const got = oh.sgtNow(d);
    expect(got.day).toBe(2); // Tuesday
    expect(got.minutes).toBe(7 * 60);
  });
});

describe('fmtTime', () => {
  it('formats AM hours', () => {
    expect(oh.fmtTime(11, 0)).toBe('11:00 AM');
    expect(oh.fmtTime(0, 30)).toBe('12:30 AM');
  });

  it('formats PM hours', () => {
    expect(oh.fmtTime(13, 15)).toBe('1:15 PM');
    expect(oh.fmtTime(12, 0)).toBe('12:00 PM');
  });
});

describe('nextOpenString', () => {
  it('returns null for missing periods', () => {
    expect(oh.nextOpenString(null)).toBe(null);
    expect(oh.nextOpenString([])).toBe(null);
  });

  it('returns "Opens today" when later today', () => {
    // Monday 09:00 SGT — Mon period opens at 11:00
    const now = sgtDate(2026, 5, 4, 9, 0);
    const periods = [
      { open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } }
    ];
    expect(oh.nextOpenString(periods, now)).toBe('Opens today 11:00 AM');
  });

  it('returns "Opens tomorrow" when no further open today', () => {
    // Monday 23:00 SGT — Mon already closed (22:00); Tue opens 11:00
    const now = sgtDate(2026, 5, 4, 23, 0);
    const periods = [
      { open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } },
      { open: { day: 2, hour: 11, minute: 0 }, close: { day: 2, hour: 22, minute: 0 } }
    ];
    expect(oh.nextOpenString(periods, now)).toBe('Opens tomorrow 11:00 AM');
  });

  it('returns weekday label for opens >1 day out', () => {
    // Monday 23:00 SGT — closed Mon-Wed; Thu opens 11:00 (the Kafe Utu shape)
    const now = sgtDate(2026, 5, 4, 23, 0);
    const periods = [
      { open: { day: 4, hour: 11, minute: 0 }, close: { day: 4, hour: 22, minute: 0 } },
      { open: { day: 5, hour: 11, minute: 0 }, close: { day: 5, hour: 22, minute: 0 } },
      { open: { day: 6, hour: 11, minute: 0 }, close: { day: 6, hour: 22, minute: 0 } }
    ];
    expect(oh.nextOpenString(periods, now)).toBe('Opens Thu 11:00 AM');
  });

  it('wraps around the week', () => {
    // Sunday 23:00 SGT — only Saturday open period; next open is next Saturday
    const now = sgtDate(2026, 5, 3, 23, 0); // Sunday
    const periods = [
      { open: { day: 6, hour: 10, minute: 0 }, close: { day: 6, hour: 18, minute: 0 } }
    ];
    expect(oh.nextOpenString(periods, now)).toBe('Opens Sat 10:00 AM');
  });

  it('handles minute-precision opens', () => {
    const now = sgtDate(2026, 5, 4, 8, 0);
    const periods = [
      { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 22, minute: 0 } }
    ];
    expect(oh.nextOpenString(periods, now)).toBe('Opens today 11:30 AM');
  });
});

describe('closedTodayString', () => {
  it('returns "Closed" when no periods', () => {
    expect(oh.closedTodayString(null)).toBe('Closed');
    expect(oh.closedTodayString([])).toBe('Closed');
  });

  it('combines closed + next-open hint', () => {
    const now = sgtDate(2026, 5, 4, 23, 0); // Mon 23:00
    const periods = [
      { open: { day: 2, hour: 11, minute: 0 }, close: { day: 2, hour: 22, minute: 0 } }
    ];
    expect(oh.closedTodayString(periods, now)).toBe('Closed today · Opens tomorrow 11:00 AM');
  });

  it('handles a Kafe-Utu-shaped venue (closed Mon-Wed, opens Thu)', () => {
    const now = sgtDate(2026, 5, 4, 14, 0); // Monday afternoon
    const periods = [
      { open: { day: 4, hour: 12, minute: 0 }, close: { day: 4, hour: 22, minute: 0 } },
      { open: { day: 5, hour: 12, minute: 0 }, close: { day: 5, hour: 22, minute: 0 } },
      { open: { day: 6, hour: 12, minute: 0 }, close: { day: 6, hour: 22, minute: 0 } },
      { open: { day: 0, hour: 12, minute: 0 }, close: { day: 0, hour: 22, minute: 0 } }
    ];
    expect(oh.closedTodayString(periods, now)).toBe('Closed today · Opens Thu 12:00 PM');
  });
});
