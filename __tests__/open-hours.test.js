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

describe('localNow + timezone offset (v0.62.291)', () => {
  it('computes day + minutes in the venue timezone, not SGT', () => {
    // 2026-05-04 22:30 UTC. SGT(+8) = Tue 06:30; Tokyo(+9) = Tue 07:30.
    const d = new Date(Date.UTC(2026, 4, 4, 22, 30));
    expect(oh.localNow(d, 8 * 60).minutes).toBe(6 * 60 + 30);
    const tokyo = oh.localNow(d, 9 * 60);
    expect(tokyo.minutes).toBe(7 * 60 + 30);
    expect(tokyo.day).toBe(2); // Tuesday
  });

  it('defaults to SGT when no offset passed (back-compat)', () => {
    const d = new Date(Date.UTC(2026, 4, 4, 6, 30));
    expect(oh.localNow(d)).toEqual(oh.sgtNow(d));
  });

  it('nextOpenString honours a non-SGT offset', () => {
    // 2026-05-04 16:00 UTC; offset -300 → local Mon 11:00. Opens 18:00 Mon.
    const now = new Date(Date.UTC(2026, 4, 4, 16, 0));
    const periods = [{ open: { day: 1, hour: 18, minute: 0 }, close: { day: 1, hour: 23, minute: 0 } }];
    expect(oh.nextOpenString(periods, now, -5 * 60)).toBe('Opens today 6:00 PM');
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

  // v0.61.219 — "Closed today" was misleading when the venue re-opens
  // later the same day. The prefix now flips to "Closed now" in that
  // case (operator-reported on a KL Bukit Bintang card that showed
  // "Closed today · Opens today 11:30 AM").
  it('uses "Closed now" prefix when next-open is later today', () => {
    const now = sgtDate(2026, 5, 4, 9, 30); // Mon 09:30 — pre-opening
    const periods = [
      { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 22, minute: 0 } }
    ];
    expect(oh.closedTodayString(periods, now)).toBe('Closed now · Opens today 11:30 AM');
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

// v0.61.246 — operator: "if currently is open, state the closing
// time like what time and next open (especially for resturants that
// have fix lunch and dinner timing)."
describe('currentOpenString', () => {
  it('returns null when periods missing or empty', () => {
    expect(oh.currentOpenString(null)).toBe(null);
    expect(oh.currentOpenString([])).toBe(null);
  });

  it('returns null when currently outside any period', () => {
    // Mon 09:30, period is Mon 11:30-22:00 → before open → null
    const now = sgtDate(2026, 5, 4, 9, 30);
    const periods = [
      { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 22, minute: 0 } }
    ];
    expect(oh.currentOpenString(periods, now)).toBe(null);
  });

  it('single-session venue: "Open · Closes 10:00 PM"', () => {
    // Mon 14:30, period is Mon 11:30-22:00 → inside, no reopen
    const now = sgtDate(2026, 5, 4, 14, 30);
    const periods = [
      { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 22, minute: 0 } }
    ];
    expect(oh.currentOpenString(periods, now)).toBe('Open · Closes 10:00 PM');
  });

  it('lunch-dinner split: "Open · Closes 3:00 PM · Reopens 6:00 PM"', () => {
    // Mon 12:30, lunch period 11:30-15:00, dinner period 18:00-22:30
    const now = sgtDate(2026, 5, 4, 12, 30);
    const periods = [
      { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 15, minute: 0 } },
      { open: { day: 1, hour: 18, minute: 0 }, close: { day: 1, hour: 22, minute: 30 } }
    ];
    expect(oh.currentOpenString(periods, now)).toBe('Open · Closes 3:00 PM · Reopens 6:00 PM');
  });

  it('in dinner session of a lunch+dinner venue: no further reopen, just "Closes 10:30 PM"', () => {
    // Mon 19:00, in dinner period (18:00-22:30); no further reopen today
    const now = sgtDate(2026, 5, 4, 19, 0);
    const periods = [
      { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 15, minute: 0 } },
      { open: { day: 1, hour: 18, minute: 0 }, close: { day: 1, hour: 22, minute: 30 } }
    ];
    expect(oh.currentOpenString(periods, now)).toBe('Open · Closes 10:30 PM');
  });

  it('24-hour venue: "Open · 24 hours"', () => {
    const now = sgtDate(2026, 5, 4, 14, 30);
    const periods = [
      { open: { day: 1, hour: 0, minute: 0 } } // no close → 24h
    ];
    expect(oh.currentOpenString(periods, now)).toBe('Open · 24 hours');
  });

  it('midnight crosser opened yesterday, still open early today', () => {
    // Tue 01:30, period is Mon 22:00 → Tue 03:00
    const now = sgtDate(2026, 5, 5, 1, 30);
    const periods = [
      { open: { day: 1, hour: 22, minute: 0 }, close: { day: 2, hour: 3, minute: 0 } }
    ];
    expect(oh.currentOpenString(periods, now)).toBe('Open · Closes 3:00 AM');
  });

  it('midnight crosser starting today, closes tomorrow', () => {
    // Mon 23:30, period is Mon 22:00 → Tue 02:00
    const now = sgtDate(2026, 5, 4, 23, 30);
    const periods = [
      { open: { day: 1, hour: 22, minute: 0 }, close: { day: 2, hour: 2, minute: 0 } }
    ];
    expect(oh.currentOpenString(periods, now)).toBe('Open · Closes Tue 2:00 AM');
  });

  it('three-session venue (breakfast + lunch + dinner): picks the next reopen', () => {
    // Mon 08:00 — inside breakfast 07:00-10:00; next reopen is lunch 11:30
    const now = sgtDate(2026, 5, 4, 8, 0);
    const periods = [
      { open: { day: 1, hour: 7, minute: 0 }, close: { day: 1, hour: 10, minute: 0 } },
      { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 15, minute: 0 } },
      { open: { day: 1, hour: 18, minute: 0 }, close: { day: 1, hour: 22, minute: 30 } }
    ];
    expect(oh.currentOpenString(periods, now)).toBe('Open · Closes 10:00 AM · Reopens 11:30 AM');
  });
});

// v0.62.305 — locale-aware open-hours (id 24-hour "11.00", fr "11h30").
describe('localised open-hours (id / fr)', () => {
  it('nextOpenString id — 24-hour time + Indonesian words', () => {
    const now = sgtDate(2026, 5, 4, 9, 0); // Mon 09:00
    const periods = [{ open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 15, minute: 0 } }];
    expect(oh.nextOpenString(periods, now, undefined, 'id')).toBe('Buka hari ini 11.00');
  });

  it('closedTodayString id — opens later today', () => {
    const now = sgtDate(2026, 5, 4, 9, 0);
    const periods = [{ open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 15, minute: 0 } }];
    expect(oh.closedTodayString(periods, now, undefined, 'id')).toBe('Tutup sekarang · Buka hari ini 11.30');
  });

  it('closedTodayString id — opens tomorrow', () => {
    const now = sgtDate(2026, 5, 4, 23, 0);
    const periods = [
      { open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 15, minute: 0 } },
      { open: { day: 2, hour: 11, minute: 0 }, close: { day: 2, hour: 15, minute: 0 } }
    ];
    expect(oh.closedTodayString(periods, now, undefined, 'id')).toBe('Tutup hari ini · Buka besok 11.00');
  });

  it('currentOpenString id — split lunch/dinner', () => {
    const now = sgtDate(2026, 5, 4, 13, 0);
    const periods = [
      { open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 15, minute: 0 } },
      { open: { day: 1, hour: 18, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } }
    ];
    expect(oh.currentOpenString(periods, now, undefined, 'id')).toBe('Buka · Tutup 15.00 · Buka lagi 18.00');
  });

  it('currentOpenString id — 24 hours', () => {
    const now = sgtDate(2026, 5, 4, 13, 0);
    const periods = [{ open: { day: 1, hour: 0, minute: 0 } }];
    expect(oh.currentOpenString(periods, now, undefined, 'id')).toBe('Buka · 24 jam');
  });

  it('closedTodayString fr — 24-hour "11h30" + French words', () => {
    const now = sgtDate(2026, 5, 4, 9, 0);
    const periods = [{ open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 15, minute: 0 } }];
    expect(oh.closedTodayString(periods, now, undefined, 'fr')).toBe("Fermé · Ouvre aujourd'hui 11h30");
  });

  it('EN output unchanged (regression guard)', () => {
    const now = sgtDate(2026, 5, 4, 9, 0);
    const periods = [{ open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 15, minute: 0 } }];
    expect(oh.closedTodayString(periods, now)).toBe('Closed now · Opens today 11:30 AM');
  });
});
