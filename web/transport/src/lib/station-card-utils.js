// station-card-utils.js — v0.62.598
//
// Pure helpers behind StationCard.jsx, split out so they can be unit-tested
// without rendering React. No DOM, no side-effects.
import { LINES_BY_CODE } from '../data/lines.js';
import { lineStationsFull } from '../data/line-paths.js';
// NOTE: this module must stay React-free (no i18n import) so it can be unit
// tested from the repo-root vitest context — i18n.js imports `react`, which is
// only resolvable inside web/transport. The translator is injected instead.

export const CROWD_DOT = { l: '🟢', m: '🟡', h: '🔴' };
export const CROWD_RANK = { l: 1, m: 2, h: 3 };
// Operating-status → swatch colour (colour-blind safe: always paired w/ a label).
export const STATUS_HEX = { normal: '#16a34a', delay: '#d97706', disrupted: '#dc2626', closure: '#dc2626', unknown: '#9ca3af' };

export const mapsQ = (q) => `https://maps.google.com/?q=${encodeURIComponent(q)}`;
export const mapsLatLng = (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`;

// v0.62.621 — Google-Maps "Directions" deep link to a station (the walking /
// transit route is computed by Google from the user's own location on open).
export function directionsUrl(lat, lng, name) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return mapsQ(`${name || ''} Singapore`);
  const dest = `${lat},${lng}`;
  const q = name ? `&destination_place_id=&travelmode=transit` : '&travelmode=transit';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${q}`;
}

// v0.62.621 — share link: a Telegram share of the station's map location.
export function shareUrl(lat, lng, name) {
  const url = Number.isFinite(lat) && Number.isFinite(lng) ? mapsLatLng(lat, lng) : mapsQ(`${name || ''} Singapore`);
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(name || '')}`;
}

// v0.62.621 — great-circle distance in metres between two {lat,lng} points
// (haversine). Returns null when either point is missing/invalid.
export function haversineM(a, b) {
  if (!a || !b) return null;
  const { lat: la1, lng: lo1 } = a, { lat: la2, lng: lo2 } = b;
  if (![la1, lo1, la2, lo2].every(Number.isFinite)) return null;
  const R = 6371000; // Earth radius, metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(la2 - la1), dLng = toRad(lo2 - lo1);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(s))));
}

// v0.62.621 — rough walking time from a distance in metres. ~80 m/min
// (≈ 4.8 km/h) is the common pedestrian-routing assumption; floored at 1 min.
export function walkMinutes(metres) {
  if (!Number.isFinite(metres) || metres < 0) return null;
  return Math.max(1, Math.round(metres / 80));
}

// v0.62.621 — a compact "today" first/last summary for one line's directions
// (the collapsed state of the Maps-style hours dropdown). Picks the first
// direction that actually carries times; returns null when none do (terminus /
// unpublished), so the caller can fall back to the detail rows' own labels.
export function todaySummary(dirs) {
  for (const d of (dirs || [])) {
    const { wdFirst, wdLast, noTimes } = trainTimes(d.timings || {});
    if (!noTimes && (wdFirst || wdLast)) return { first: wdFirst || null, last: wdLast || null };
  }
  return null;
}

// v0.62.634 — parse a "5:45am" / "12:25am" clock string to minutes-since-midnight
// (0..1439). Returns null when unparseable.
export function parseClock(str) {
  const m = String(str || '').trim().match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  const min = parseInt(m[2], 10);
  if (/p/i.test(m[3])) h += 12;
  return h * 60 + min;
}

// v0.62.634 — is the station currently in service, given a { first, last } clock
// pair (today's summary) and the current minutes-since-midnight (SGT)? Handles
// the after-midnight last train (e.g. first 5:45am, last 12:25am) by treating a
// `last` that is <= `first` as belonging to the next day. Returns true / false,
// or null when the times are missing/unparseable.
export function stationOpenNow(summary, nowMin) {
  if (!summary || !Number.isFinite(nowMin)) return null;
  const f = parseClock(summary.first);
  const l = parseClock(summary.last);
  if (f == null || l == null) return null;
  if (l > f) return nowMin >= f && nowMin <= l;         // same-day service window
  return nowMin >= f || nowMin <= l;                    // window crosses midnight
}

// v0.62.634 — the station-wide operating window: the earliest first-train and
// latest last-train across every line the station serves (most stops share one
// window; interchanges may differ slightly). `last` is compared on a clock that
// counts after-midnight hours (0:00–4:59) as +24h so "12:25am" ranks after
// "11:30pm". Returns { first, last } (either may be null) or null when no line
// publishes times.
export function stationHours(lines, station) {
  let first = null, firstMin = Infinity;
  let last = null, lastKey = -Infinity;
  for (const l of (lines || [])) {
    const dirs = ((station && station.first_last_train) || []).filter((f) => f.station_code === l.station_code);
    const s = todaySummary(dirs);
    if (!s) continue;
    const fm = parseClock(s.first);
    if (fm != null && fm < firstMin) { firstMin = fm; first = s.first; }
    const lm = parseClock(s.last);
    if (lm != null) {
      const key = lm < 300 ? lm + 1440 : lm;            // after-midnight ranks late
      if (key > lastKey) { lastKey = key; last = s.last; }
    }
  }
  return (first || last) ? { first, last } : null;
}

export function slugify(n) {
  return String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Readable text colour for a coloured name strip (lime/teal future lines are
// light enough to need dark text).
export function textOn(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return '#fff';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111827' : '#fff';
}

export function hexForLineCode(code) { return LINES_BY_CODE[code]?.hex || '#6b7280'; }

// Worst crowd level across a station's platform codes.
export function worstCrowd(crowd, codes) {
  let best = null, rank = 0;
  for (const c of (codes || [])) {
    const lv = crowd && crowd[String(c).toUpperCase()];
    if (lv && CROWD_RANK[lv] > rank) { rank = CROWD_RANK[lv]; best = lv; }
  }
  return best;
}

// First non-empty timing among candidate keys (the timings object's keys are
// NOT uniform across the dataset — read defensively).
export function pickTiming(timings, keys) {
  for (const k of keys) { if (timings && timings[k]) return timings[k]; }
  return null;
}

// Normalised first/last train times for one direction row. The timings object's
// keys are NOT uniform, and a row can carry THREE distinct day types (weekday,
// Saturday, Sunday/PH) — so Sat (`satFirst`) and Sun/PH (`sunFirst`) are kept
// SEPARATE rather than collapsed into one "weekend" value (a Sun/PH first train
// often differs from Saturday's). `noTimes` = the row has no service times at
// all (a terminus, or timings not yet published); the caller decides how to
// label it from the row's `note`.
export function trainTimes(timings) {
  const wdFirst = pickTiming(timings, ['first_weekday', 'first_mon_sat']);
  const wdLast = pickTiming(timings, ['last_weekday', 'last_daily']);
  const satFirst = pickTiming(timings, ['first_sat', 'first_weekend']);
  const sunFirst = pickTiming(timings, ['first_sun_ph']);
  const weLast = pickTiming(timings, ['last_weekend', 'last_weekend_ph']);
  return {
    wdFirst, wdLast, satFirst, sunFirst, weLast,
    noTimes: !wdFirst && !wdLast && !satFirst && !sunFirst && !weLast
  };
}

// Whether a first_last_train `note` marks an actual terminus (vs. "timings
// unavailable" / "not yet open" style notes, which must NOT read as a terminus).
export function noteIsTerminal(note) {
  return /termin/i.test(String(note || ''));
}

// Human label for a first_last_train `direction` (compass / loop bounds). The
// translator `translate(key, lang)` is injected so this module stays React-free.
export function directionLabel(direction, translate, lang) {
  const d = String(direction || '').toLowerCase();
  if (['northbound', 'southbound', 'eastbound', 'westbound', 'clockwise', 'anticlockwise', 'loop'].includes(d)) {
    return translate(`mrt.dir.${d}`, lang);
  }
  return d.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Resolve a `towards_<slug>` direction to its terminus station row (so the card
// can show the final-stop CODE as an in-app hyperlink). Returns null for
// compass / loop directions, which don't name a terminus.
export function terminusForDirection(coarseStations, lineCode, direction) {
  const dir = String(direction || '').toLowerCase();
  if (!dir.startsWith('towards_')) return null;
  const slug = dir.slice(8);
  const ordered = lineStationsFull(coarseStations || [], lineCode);
  if (!ordered.length) return null;
  let hit = ordered.find((s) => slugify(s.name) === slug);
  if (!hit) {
    const ends = [ordered[0], ordered[ordered.length - 1]];
    hit = ends.find((s) => slugify(s.name).includes(slug) || slug.includes(slugify(s.name)));
  }
  return hit || null;
}

// v0.62.650 — operator: "Missing bus stop description and exit description with
// expanded card."
//
// EXITS. The rich station feed and data/station-exits.json disagree on the field
// name (`label` vs `exit`) and on whether the value is already prefixed: Paya
// Lebar carries "Exit A" … "Exit D" for four of its six exits and a bare "E",
// "F" for the other two. The card was reading `.label` only, which is why the
// screenshot showed a bare letter. Normalise both shapes to one prefixed label
// so the list reads "Exit A / Exit B / …" with no gaps.
// v0.62.837 — eight locales, held HERE rather than in i18n.js on purpose.
// This module is deliberately React-free (see the header) so it can be unit-tested
// from the repo-root vitest context, and `i18n.js` imports react. Injecting a
// translator would change `exitLabel`'s signature and its existing tests, so the
// word lives beside its only use. That is one source, not two — the split that
// produced the "1 gems" bug (a short local table beside a complete keyed one, and
// only the keyed one extended) is the thing being avoided, not repeated.
const EXIT_WORD = {
  en: 'Exit', fr: 'Sortie', id: 'Pintu keluar', ru: 'Выход',
  de: 'Ausgang', zh: '出口', ja: '出口', es: 'Salida',
};

export function exitLabel(exit, lang = 'en') {
  const raw = String((exit && (exit.label ?? exit.exit ?? exit.exit_label)) || '').trim();
  if (!raw) return '';
  const word = EXIT_WORD[lang] || EXIT_WORD.en;
  // Already prefixed in some other casing/language — leave the caller's text be.
  if (/^(exit|sortie)\b/i.test(raw)) return raw.replace(/^(exit|sortie)\b/i, word);
  return `${word} ${raw}`;
}

// BUS STOPS. /api/transport/station-context returns `description` + `roadName`
// (both expanded from LTA's abbreviations server-side), but either can be empty
// when the Redis stop-metadata hash has no row for that code — which is what the
// operator saw: four codes and no names. Prefer the description, fall back to
// the road, and return '' rather than 'undefined' so the caller can omit the
// separator entirely.
export function busStopDesc(stop) {
  if (!stop) return '';
  const desc = String(stop.description || '').trim();
  const road = String(stop.roadName || '').trim();
  if (desc && road && desc.toLowerCase() !== road.toLowerCase()) return `${desc}, ${road}`;
  return desc || road || '';
}

// The context feed can repeat a code (GEOSEARCH hits per exit, then merged), and
// a list that reads "81111 · 81111 · 81111" is worse than useless. First
// occurrence wins — the feed is distance-sorted, so that is the nearest.
export function dedupeBusStops(stops) {
  const seen = new Set();
  const out = [];
  for (const s of (Array.isArray(stops) ? stops : [])) {
    const key = String(s && s.code || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

// v0.62.653 — operator (Telegram Desktop, Tanah Merah / Expo / Changi Airport
// cards): "for Train station card, CG Branch description should second line
// stations: East-West Line / (Changi Airport Branch)".
//
// One line in the LTA feed carries a parenthetical qualifier —
// "East-West Line (Changi branch)" — and on a carousel-width card it truncated
// to "East-West Line (Changi br…", i.e. the qualifier was present but unreadable,
// which is the worst of both. Splitting it onto a second row shows the whole
// thing at the same width.
//
// The canonical name is preferred for the qualifier when the caller can supply
// it: data/stations.json says "Changi branch", while lines.js — and the line
// picker the user just tapped — says "Changi Airport Branch". Matching what the
// chip above says beats echoing the feed's shorthand.
export function splitLineName(name, canonical = '') {
  const raw = String(name || '').trim();
  if (!raw) return { main: '', qualifier: '' };
  const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return { main: raw, qualifier: '' };
  const main = m[1].trim();
  const inner = m[2].trim();
  const canon = String(canonical || '').trim();
  // Use the canonical name only when it is a genuinely different, fuller label —
  // never when it would just repeat the main name back.
  const qualifier = (canon && canon.toLowerCase() !== main.toLowerCase()) ? canon : inner;
  return { main: main || raw, qualifier };
}
