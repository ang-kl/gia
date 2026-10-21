// open-hours.js — v0.57.20
//
// Derive a human "Closed today · Opens tomorrow 11:00 AM" string
// from Google Places `regularOpeningHours.periods`.
//
// Places returns periods as:
//   [{ open:  { day: 0..6, hour: 0..23, minute: 0..59 },
//      close: { day: 0..6, hour: 0..23, minute: 0..59 } }, ...]
//   day 0 = Sunday per Places docs.
// A period that crosses midnight has open.day < close.day. A 24-hour
// venue may be a single period with no close.
//
// All time math runs in Asia/Singapore — SGT is UTC+8 with no DST,
// so a fixed offset is safe.
//
// API:
//   nextOpenString(periods, now = new Date()) -> string | null
//     Returns "Opens today 11:00 AM" / "Opens tomorrow 11:00 AM" /
//     "Opens Mon 11:00 AM". null when periods is missing or never opens.

const SGT_OFFSET_MIN = 8 * 60;

// Returns { day: 0..6, minutes: 0..1439 } in SGT.
function sgtNow(now) {
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const total = utcMin + SGT_OFFSET_MIN;
  const dayShift = Math.floor(total / 1440);
  const minutes = ((total % 1440) + 1440) % 1440;
  // JS getUTCDay: 0=Sun..6=Sat; same encoding as Places.
  const day = (now.getUTCDay() + dayShift + 7) % 7;
  return { day, minutes };
}

function fmtTime(hour, minute) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const mm = String(minute || 0).padStart(2, '0');
  return `${h12}:${mm} ${ampm}`;
}

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function nextOpenString(periods, now = new Date()) {
  if (!Array.isArray(periods) || !periods.length) return null;

  const cur = sgtNow(now);

  // Build (dayDelta, openTime) candidates for the next 7 days.
  // dayDelta 0 = today; we only consider future opens (open in future today,
  // or any open on dayDelta 1..6).
  let best = null;
  for (let delta = 0; delta < 7; delta += 1) {
    const targetDay = (cur.day + delta) % 7;
    for (const pd of periods) {
      const o = pd?.open;
      if (!o || typeof o.day !== 'number') continue;
      if (o.day !== targetDay) continue;
      const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
      if (delta === 0 && openMin <= cur.minutes) continue;
      if (!best || delta < best.delta || (delta === best.delta && openMin < best.openMin)) {
        best = { delta, openMin, hour: o.hour ?? 0, minute: o.minute ?? 0, day: targetDay };
      }
    }
    if (best && best.delta === delta) break;
  }

  if (!best) return null;
  const time = fmtTime(best.hour, best.minute);
  if (best.delta === 0) return `Opens today ${time}`;
  if (best.delta === 1) return `Opens tomorrow ${time}`;
  return `Opens ${DAY_LABEL[best.day]} ${time}`;
}

// closedTodayString — returns the user-facing closed-today line for
// a venue that's currently closed. Combines "Closed now"/"Closed today"
// with the next-open hint when available.
//
// v0.61.219 — operator: "Closed today" is misleading when the venue
// re-opens later the same day. Switch the prefix:
//   next opens TODAY     → "Closed now · Opens today 11:30 AM"
//   next opens tomorrow+ → "Closed today · Opens tomorrow 11:00 AM"
function closedTodayString(periods, now = new Date()) {
  const next = nextOpenString(periods, now);
  if (!next) return 'Closed';
  const prefix = next.startsWith('Opens today ') ? 'Closed now' : 'Closed today';
  return `${prefix} · ${next}`;
}

// v0.61.246 — operator: "if currently is open, state the closing time
// like what time and next open (especially for resturants that have
// fix lunch and dinner timing)."
//
// Returns the user-facing current-open line:
//   single same-day period      → "Open · Closes 10:00 PM"
//   split (lunch + dinner)      → "Open · Closes 3:00 PM · Reopens 6:00 PM"
//   period crosses midnight     → "Open · Closes Tue 2:00 AM" (best-effort)
//   no current period           → null
//
// Algorithm:
//   1. Find the current period — one whose [open, close] interval
//      contains `now` in SGT minutes. Midnight crossers are handled
//      by treating close-day shift as +24h on the close side.
//   2. Look for a same-day reopen — another period today whose open
//      is strictly after the current period's close.
//   3. Format the close time + (if reopen) the reopen time.
function currentOpenString(periods, now = new Date()) {
  if (!Array.isArray(periods) || !periods.length) return null;
  const cur = sgtNow(now);

  // Find the current period in SGT.
  let active = null;
  for (const pd of periods) {
    const o = pd?.open;
    const c = pd?.close;
    if (!o || typeof o.day !== 'number') continue;
    const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
    // 24-hour venue: no close → permanently open
    if (!c) {
      if (o.day === cur.day || cur.day === (o.day + 1) % 7) {
        return 'Open · 24 hours';
      }
      continue;
    }
    const closeMin = (c.hour ?? 0) * 60 + (c.minute ?? 0);
    // Same-day period — open.day === today AND open<=now<close
    if (o.day === cur.day && c.day === cur.day) {
      if (openMin <= cur.minutes && cur.minutes < closeMin) {
        active = { period: pd, sameDayClose: true, openMin, closeMin, closeHour: c.hour ?? 0, closeMinute: c.minute ?? 0, closeDay: c.day };
        break;
      }
      continue;
    }
    // Midnight-crosser starting today, closing on the next day.
    if (o.day === cur.day && c.day === (o.day + 1) % 7) {
      if (cur.minutes >= openMin) {
        active = { period: pd, sameDayClose: false, openMin, closeMin: closeMin + 1440, closeHour: c.hour ?? 0, closeMinute: c.minute ?? 0, closeDay: c.day };
        break;
      }
      continue;
    }
    // Midnight-crosser opened yesterday, still closing today.
    if (o.day === (cur.day + 6) % 7 && c.day === cur.day) {
      if (cur.minutes < closeMin) {
        active = { period: pd, sameDayClose: false, openMin: openMin - 1440, closeMin, closeHour: c.hour ?? 0, closeMinute: c.minute ?? 0, closeDay: c.day };
        break;
      }
      continue;
    }
  }

  if (!active) return null;

  // Look for a same-day reopen — a period whose open.day === today AND
  // openMin > current period's closeMin (relative to today's minutes).
  // Only meaningful when the current period closes today (not on a
  // midnight-crosser that closes tomorrow).
  let reopen = null;
  if (active.sameDayClose) {
    for (const pd of periods) {
      const o = pd?.open;
      if (!o || typeof o.day !== 'number') continue;
      if (o.day !== cur.day) continue;
      const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
      if (openMin > active.closeMin) {
        if (!reopen || openMin < reopen.openMin) {
          reopen = { openMin, hour: o.hour ?? 0, minute: o.minute ?? 0 };
        }
      }
    }
  }

  const closeFmt = fmtTime(active.closeHour, active.closeMinute);
  // Midnight-crosser closing on the next day surfaces the day label so
  // the user isn't surprised by an early-morning AM time.
  const sameDay = active.sameDayClose || active.closeDay === cur.day;
  const closePart = sameDay ? `Closes ${closeFmt}` : `Closes ${DAY_LABEL[active.closeDay]} ${closeFmt}`;
  if (reopen) {
    return `Open · ${closePart} · Reopens ${fmtTime(reopen.hour, reopen.minute)}`;
  }
  return `Open · ${closePart}`;
}

module.exports = {
  nextOpenString,
  closedTodayString,
  currentOpenString,
  sgtNow,
  fmtTime,
  SGT_OFFSET_MIN
};
