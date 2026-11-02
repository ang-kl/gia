// anchor-age.js — v0.62.965. One rule for the saved place, shared by the Cuisine and Menu Mini Apps and the bot.
//
// Spec: doc/Feature/2026-11-02-saved-place-expires-after-six-hours.spec.md, C1, C2, C7, C9.
//
// A place the user set on purpose carries a `label`. It is LOCKED for 6 hours from `setAt` (the chat's own
// "welcome back" gap, IDLE_WAKE_MS): while locked it wins over the phone, which is the v0.61.430 / v0.62.30 rule that
// stopped a Wellington or KL pick being dragged back to the Singapore GPS. After 6 hours it is no longer locked, and
// an app that opens with the phone more than 50 km away (Menu's "genuine travel, not the daily SG↔JB hop" threshold)
// switches to the phone and offers "↩ Back to <place>". Before this version nothing asked how old a pick was, so
// yesterday's Kyoto still won in Singapore the next morning (operator, 02-11 '26).
//
// Pure: no React, no fetch, no clock of its own (`now` is passed in, so the tests choose the time). The bot
// (CommonJS) loads this ESM file with a dynamic import() in location-cache.js, which every Node since 12 supports;
// require() of an ES module needs Node 22.12 and CI runs Node 20 (ci.yml:26), so that door was not taken.

export const LOCK_MS = 6 * 60 * 60 * 1000;
export const SWITCH_KM = 50;

const validCoord = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
  && !(Math.abs(p.lat) < 0.001 && Math.abs(p.lng) < 0.001);

export function distanceKm(a, b) {
  if (!validCoord(a) || !validCoord(b)) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}

// I1 — labelled, with a setAt, and younger than LOCK_MS. A setAt in the future (clock skew between phone and server)
// reads as just set. No label, a blank label, no setAt → never locked.
export function isLocked(saved, now = Date.now()) {
  if (!saved || typeof saved !== 'object') return false;
  if (typeof saved.label !== 'string' || !saved.label.trim()) return false;
  if (!Number.isFinite(saved.setAt)) return false;
  return (now - saved.setAt) < LOCK_MS;
}

// I2 — switch only when the saved place is unlocked, the phone reading is real, and it is over SWITCH_KM away.
export function shouldSwitchToDevice({ saved, device, now = Date.now() } = {}) {
  if (!validCoord(saved)) return false;
  if (!validCoord(device)) return false;
  if (isLocked(saved, now)) return false;
  return distanceKm(saved, device) > SWITCH_KM;
}

// The chat line: "today 4:10 PM", "yesterday 4:10 PM", or the date. Singapore time, which is what the operator's
// Telegram showed for the pick; the day boundary is Singapore midnight.
const TZ = 'Asia/Singapore';
export function describeAge(setAt, now = Date.now(), tz = TZ) {
  if (!Number.isFinite(setAt)) return null;
  const dayKey = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(setAt)).replace(/ /g, ' ');
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short' }).format(new Date(setAt)).replace(/ /g, ' ');
  const d = dayKey(setAt);
  let day = 'date';
  if (d === dayKey(now)) day = 'today';
  else if (d === dayKey(now - 24 * 60 * 60 * 1000)) day = 'yesterday';
  return { day, time, date };
}
