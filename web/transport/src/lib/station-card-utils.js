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

// Normalised first/last train times for one direction row, keyed by weekday /
// weekend, with a `terminal` flag when the direction has no service (a terminus).
export function trainTimes(timings) {
  const wdFirst = pickTiming(timings, ['first_weekday', 'first_mon_sat']);
  const wdLast = pickTiming(timings, ['last_weekday', 'last_daily']);
  const weFirst = pickTiming(timings, ['first_weekend', 'first_sat', 'first_sun_ph']);
  const weLast = pickTiming(timings, ['last_weekend', 'last_weekend_ph']);
  return {
    wdFirst, wdLast, weFirst, weLast,
    terminal: !wdFirst && !wdLast && !weFirst && !weLast,
    weekendDiffers: (!!weFirst && weFirst !== wdFirst) || (!!weLast && weLast !== wdLast)
  };
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
