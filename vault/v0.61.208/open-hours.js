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
// a venue that's currently closed. Combines "Closed today" with the
// next-open hint when available.
function closedTodayString(periods, now = new Date()) {
  const next = nextOpenString(periods, now);
  if (!next) return 'Closed';
  return `Closed today · ${next}`;
}

module.exports = {
  nextOpenString,
  closedTodayString,
  sgtNow,
  fmtTime,
  SGT_OFFSET_MIN
};
