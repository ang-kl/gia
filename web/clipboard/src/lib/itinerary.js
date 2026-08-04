// itinerary.js — the pure half of the Sketchbook itinerary map.
//
// Everything here is a plain function over plain data: no React, no Google
// Maps, no DOM. That is deliberate and load-bearing. The feature has TWO
// renderers — a live Google map on screen and an inline SVG for print (a
// WebGL canvas of raster tiles prints blank or grey, and Google's terms
// restrict reuse of captured tiles) — and if each computed its own geometry
// the printed page would quietly stop matching the screen. Both call this.
//
// It is also the only part that can be unit-tested without a browser, which
// is where the real rules live: which stops can be pinned at all, what colour
// a drawer is, and which legs survive when a drawer is hidden.
//
// See instr/GIA_Sketchbook_Itinerary_Map_AI_Prompt.md.

import { SEGMENTS, SEGMENT_BY_KEY } from './segments.js';
import { t } from './i18n.js';

// The four day-part families, matching tailwind.config.js g-morning … g-night.
export const GROUP_HEX = {
  morning: '#ff9a45', midday: '#3ecf8e', evening: '#ff6b6b', night: '#9d7bff'
};

export const PART_ORDER = ['morning', 'midday', 'evening', 'night'];

/** Darken a #rrggbb by `steps` × 20 %, capped at 60 %. */
export function darken(hex, steps) {
  const n = parseInt(String(hex).slice(1), 16);
  if (!Number.isFinite(n)) return hex;
  const f = Math.min(Math.max(steps, 0) * 0.2, 0.6);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - f)));
  return '#' + ((1 << 24) | (ch[0] << 16) | (ch[1] << 8) | ch[2]).toString(16).slice(1);
}

// A drawer's colour: the FAMILY is its day-part, the SHADE is its ordinal
// within that day-part.
//
// Colouring by day-part alone is wrong and was nearly shipped that way. A
// day-part holds more than one drawer and usually does — teaBreak,
// earlyDinner and dinner are all `evening` — so three drawers would render
// the identical #ff6b6b, and "which drawer is this pin" is the only question
// the colour exists to answer.
export function drawerColor(group, nth) {
  const base = GROUP_HEX[group] || GROUP_HEX.night;
  return nth > 0 ? darken(base, nth) : base;
}

/** A stop can be a pin only if it carries real, finite coordinates. */
export function mappable(stop) {
  return !!stop && Number.isFinite(stop.lat) && Number.isFinite(stop.lng);
}

export function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// "7:30 AM – 9:30 AM" → { startMin: 450, endMin: 570 }. `wholeDay` carries
// "Anytime" and returns null — it is not on the clock, and §7.2 of the spec
// keeps it out of leg sequencing for exactly that reason.
const CLOCK = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
export function parseTimeEN(timeEN) {
  const out = [];
  let m;
  CLOCK.lastIndex = 0;
  while ((m = CLOCK.exec(String(timeEN || ''))) !== null) {
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    out.push(h * 60 + Number(m[2]));
  }
  if (out.length < 2) return null;
  return { startMin: out[0], endMin: out[1] };
}

const SEG_INDEX = Object.fromEntries(SEGMENTS.map((s, i) => [s.key, i]));

function plain(s) {
  return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// One card → one stop. `venue` is the ONLY carrier of coordinates, and three
// classes of card never have it: copy-all pushes (that call sends no venue
// field), blank cards, and anything filed before v0.62.429. Those are real
// content — they stay in the list and get counted out loud, never dropped.
function toStop(card) {
  const v = card && card.venue && typeof card.venue === 'object' ? card.venue : null;
  return {
    id: card && card.id,
    name: (card && card.name && card.name.trim()) || (v && v.name) ||
          plain(card && card.preview).slice(0, 40) || 'Untitled',
    // NOTE: the street address is `area` on a v2 venue (it is Places'
    // formattedAddress, flattened upstream). There is no `address` key.
    addr: (v && v.area) || '',
    lat: v && typeof v.lat === 'number' ? v.lat : undefined,
    lng: v && typeof v.lng === 'number' ? v.lng : undefined,
    rating: v && typeof v.rating === 'number' ? v.rating : undefined,
    tags: Array.isArray(card && card.cuisines) ? card.cuisines : [],
    note: (card && card.note) || '',
    url: (v && v.url) || ''
  };
}

/**
 * `{ cabinet, drawers }` → the itinerary model both renderers draw from.
 * Drawers keep their stored order but are given their clock position, so a
 * cabinet whose drawers were added out of order still reads as a day.
 */
export function buildItinerary(payload, lang = 'en') {
  const raw = (payload && Array.isArray(payload.drawers)) ? payload.drawers : [];
  const seen = {};
  const drawers = raw.map((d, i) => {
    const seg = SEGMENT_BY_KEY[d.segment] || SEGMENT_BY_KEY.wholeDay;
    const nth = seen[seg.group] === undefined ? 0 : seen[seg.group] + 1;
    seen[seg.group] = nth;
    const stops = (Array.isArray(d.cards) ? d.cards : []).map(toStop);
    return {
      idx: i,
      key: seg.key,
      emoji: seg.emoji,
      group: seg.group,
      name: t(`seg.${seg.key}`, lang),
      dayTag: d.dayTag || '',
      time: seg.timeEN,
      clock: parseTimeEN(seg.timeEN),
      order: SEG_INDEX[seg.key] ?? 99,
      color: drawerColor(seg.group, nth),
      anchor: d.location && Number.isFinite(d.location.lat) && Number.isFinite(d.location.lng)
        ? { lat: d.location.lat, lng: d.location.lng, label: d.location.label || '' }
        : null,
      stops,
      mapped: stops.filter(mappable).length
    };
  });
  const totalStops = drawers.reduce((a, d) => a + d.stops.length, 0);
  const mappedStops = drawers.reduce((a, d) => a + d.mapped, 0);
  return { drawers, totalStops, mappedStops };
}

/**
 * One circle per drawer: centre = centroid of its MAPPABLE stops, radius =
 * how far the furthest one sits from that centre. A drawer with no mappable
 * stop has no zone (null) — it is not a point at 0,0.
 */
export function drawerZone(drawer) {
  const pts = (drawer.stops || []).filter(mappable);
  if (!pts.length) return null;
  const c = {
    lat: pts.reduce((a, s) => a + s.lat, 0) / pts.length,
    lng: pts.reduce((a, s) => a + s.lng, 0) / pts.length
  };
  return {
    ...c,
    idx: drawer.idx,
    name: drawer.name,
    color: drawer.color,
    spreadKm: pts.length < 2 ? 0 : Math.max(...pts.map((s) => haversineKm(c, s)))
  };
}

/**
 * Travel legs, BETWEEN drawers only.
 *
 * Within a drawer the stops are candidates, not a route — Sketchbook has no
 * within-drawer ordering (sortDirection is 'created' only), so a line between
 * two stops in the same drawer would assert an order the data does not carry.
 *
 * Legs are computed over the VISIBLE drawers, so hiding Tea Break re-links
 * Lunch → Dinner with the distance actually travelled rather than leaving a
 * stale line to a drawer that is no longer on the map.
 *
 * `wholeDay` ("Anytime") has no clock position and is excluded from the
 * sequence entirely.
 */
export function visibleLegs(drawers, isVisible = () => true) {
  const chain = drawers
    .map((d) => ({ d, z: drawerZone(d) }))
    .filter((x) => x.z && x.d.clock && isVisible(x.d.idx))
    .sort((a, b) => a.d.order - b.d.order);

  return chain.slice(1).map((x, k) => {
    const prev = chain[k];
    const km = haversineKm(prev.z, x.z);
    const gapMin = x.d.clock.startMin - prev.d.clock.endMin;
    // Tight = no slack at all, or a hop long enough that the slack cannot
    // plausibly cover it. 12 km/h is a deliberately forgiving town speed —
    // this flags "look at this", it does not claim a travel time.
    const tight = gapMin <= 0 || (km / 12) * 60 > gapMin;
    return { from: prev, to: x, km, gapMin, tight };
  });
}

/**
 * Drawers grouped into day-parts for the layer panel.
 *
 * A part with no drawers is NOT returned — never a fixed row waiting to be
 * filled. Each part's span is computed from the drawers inside it, so it
 * stays true when the drawer set changes.
 *
 * `wholeDay` is classified `night` by segments.js but reads "Anytime". It is
 * lifted into its own trailing part rather than pretending to be an evening.
 */
export function dayParts(drawers) {
  const timed = drawers.filter((d) => d.clock);
  const anytime = drawers.filter((d) => !d.clock);

  const parts = PART_ORDER.map((g) => {
    const items = timed.filter((d) => d.group === g).sort((a, b) => a.order - b.order);
    if (!items.length) return null;
    return {
      key: g,
      items,
      span: [items[0].time.split('–')[0].trim(), items[items.length - 1].time.split('–')[1].trim()]
    };
  }).filter(Boolean);

  if (anytime.length) parts.push({ key: 'anytime', items: anytime, span: null });
  return parts;
}

/** Straight-line distance disclaimer is the caller's job; this is text only. */
export function toPlainText({ cabinet, drawers, legs, lang = 'en' }) {
  const lines = [];
  lines.push(`${cabinet && cabinet.emoji ? cabinet.emoji + ' ' : ''}${(cabinet && cabinet.name) || ''}`.trim());
  if (cabinet && cabinet.location) lines.push(`📍 ${cabinet.location}`);
  lines.push('');

  const legTo = new Map((legs || []).map((h) => [h.to.d.idx, h]));

  drawers.forEach((d, n) => {
    const hop = legTo.get(d.idx);
    if (hop) {
      lines.push(`   ↓ ${hop.km.toFixed(1)} km${hop.gapMin > 0 ? ` · ${hop.gapMin} min gap` : ' · no gap'}`);
      lines.push('');
    }
    lines.push(`${n + 1}. ${d.emoji} ${d.name}${d.dayTag ? ` — ${d.dayTag}` : ''}  (${d.time})`);
    if (d.anchor && d.anchor.label) lines.push(`   ◇ ${d.anchor.label}`);
    d.stops.forEach((s, si) => {
      const num = `${d.idx + 1}.${si + 1}`;
      lines.push(`   ${mappable(s) ? num : '—'}  ${s.name}${s.rating ? `  ★${s.rating.toFixed(1)}` : ''}`);
      if (s.addr) lines.push(`        ${s.addr}`);
      if (s.tags.length) lines.push(`        ${s.tags.join(' · ')}`);
      if (s.note) lines.push(`        ✎ ${s.note}`);
      if (mappable(s)) lines.push(`        ${mapsUrl(s)}`);
      else lines.push(`        ${t('itin.noCoords', lang)}`);
    });
    lines.push('');
  });
  return lines.join('\n').trim();
}

export function mapsUrl(stop) {
  return 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(`${stop.lat},${stop.lng}`);
}
