// venue-templates.js — v0.58.50
//
// Shared formatter for the three user-facing venue templates Human
// Lead specified:
//
//   T1 detail-with-sanctuary  — free-text chat replies + cuisine TMA
//                                per-card 📋 Copy button
//   T2 detail                 — /api/cuisine/copy-all (multi-pick clip)
//   T3 compact                — deliverPicks numbered list at the top
//
// All three render as Telegram HTML (parse_mode='HTML') so the venue
// name can be bolded via <b>…</b>. URLs are emitted as raw text;
// Telegram auto-links them. Missing fields gracefully omit their
// row — no empty 🌐 or 📞 lines.

const { t: tr } = require('./i18n');

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
// Legacy English-only crowd label table kept for backward compatibility
// with any caller that imports it directly. Renderer now goes through
// crowdLabel(level, lang) so callers passing { lang } get FR variants.
const CROWD_LABEL = {
  high:   '🔴 busy',
  medium: '🟡 moderate',
  low:    '🟢 quiet'
};
function crowdLabel(level, lang) {
  if (level === 'high')   return tr('crowd.high', lang);
  if (level === 'medium') return tr('crowd.medium', lang);
  if (level === 'low')    return tr('crowd.low', lang);
  return '';
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Today's weekday in SGT (0=Sunday … 6=Saturday). Used to pick the
// right entry from regularOpeningHours.weekdayDescriptions.
function sgtWeekday() {
  const sgtMs = Date.now() + 8 * 60 * 60 * 1000;
  return new Date(sgtMs).getUTCDay();
}

// Format the 🕰️ row. Google's weekdayDescriptions array is ordered
// Monday-first per their convention. If openNow is false and we have
// a closedTodayLabel ("Closed today · Opens tomorrow 11:00 AM" from
// open-hours.js v0.4 helper), prefer that — clearer for the user.
function formatHoursLine(p, lang) {
  if (p.closedTodayLabel) return `🕰️ ${p.closedTodayLabel}`;
  // weekdayDescriptions is ordered Mon-Sun (Google convention) — JS
  // Date.getUTCDay() returns 0=Sun ... 6=Sat. Convert.
  const wd = Array.isArray(p.weekdayDescriptions) ? p.weekdayDescriptions : null;
  if (wd && wd.length === 7) {
    const sgtDay = sgtWeekday();           // 0=Sun ... 6=Sat
    const idx = (sgtDay + 6) % 7;          // → 0=Mon ... 6=Sun
    const todayLine = wd[idx] || '';
    if (todayLine) return `🕰️ ${escapeHtml(todayLine)}`;
  }
  if (p.openNow === true)  return `🕰️ ${tr('hours.openNow', lang)}`;
  if (p.openNow === false) return `🕰️ ${tr('hours.closed', lang)}`;
  return '';
}

// Format the ✨ stats row. Stars + review count + price + crowd
// + (optional) distance.
function formatStatsLine(p, opts = {}) {
  const { includeDistance = false, lang } = opts;
  const parts = [];
  if (Number.isFinite(p.rating)) {
    const stars = `⭐${p.rating.toFixed(1)}`;
    const count = Number.isFinite(p.userRatingCount) ? ` (${p.userRatingCount})` : '';
    parts.push(`${stars}${count}`);
  }
  const price = PRICE_LABEL[p.priceLevel];
  if (price) parts.push(price);
  // v0.58.55: localised crowd label via crowdLabel(level, lang).
  const crowd = crowdLabel(p.crowdLevel, lang);
  if (crowd) parts.push(crowd);
  if (includeDistance && Number.isFinite(p.distanceM)) {
    parts.push(p.distanceM >= 1000
      ? `${(p.distanceM / 1000).toFixed(2)} km`
      : `${p.distanceM} m`);
  }
  return parts.length ? `✨ ${parts.join(' • ')}` : '';
}

// Format the 🧾 order line — top dishes (capped at 3).
function formatOrderLine(p) {
  const dishes = Array.isArray(p.dishes) ? p.dishes.slice(0, 3) : [];
  if (!dishes.length) return '';
  return `🧾 ${escapeHtml(dishes.join(' · '))}`;
}

// Format the 📍 Maps URL line. Prefers the canonical googleMapsUrl(p)
// (place_id-explicit deep-link → opens Google Maps app on iOS).
function formatMapsLine(p, googleMapsUrlFn) {
  const url = (typeof googleMapsUrlFn === 'function' ? googleMapsUrlFn(p) : null)
    || p.url
    || (p.name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' Singapore')}` : '');
  return url ? `📍 ${url}` : '';
}

// v0.58.52: travel-time line. Shows BOTH transit and drive when
// available (per Human Lead's preference). Either field may be
// missing if Routes API returned no route for that mode (rare for
// SG); in that case the present mode renders solo. Empty string
// when neither is available.
function formatTravelLine(p) {
  const parts = [];
  if (Number.isFinite(p.transitMinutes)) parts.push(`🚊 ${p.transitMinutes} min`);
  if (Number.isFinite(p.driveMinutes))   parts.push(`🚘 ${p.driveMinutes} min`);
  return parts.length ? parts.join(' · ') : '';
}

// v0.59.0: footfall row (real per-venue busyness from BestTime, set
// in footfall-signal.attachFootfallSignals). Renders nothing when
// the venue has no footfall data — keeping the block tight for venues
// outside BestTime's coverage.
function formatFootfallLine(p, lang = 'en') {
  if (!p?.footfall) return '';
  try {
    const { footfallChip } = require('./footfall-signal');
    return footfallChip(p.footfall, lang) || '';
  } catch { return ''; }
}

// Build a single venue block per the requested variant.
//
// opts:
//   variant: 'compact' | 'detail' | 'detail-with-sanctuary'
//   number:  optional integer to prefix the heading with "N. "
//   sanctuaryRead: full vibe-summary block (`• Quiet:` etc.) for T1
//   googleMapsUrl: function (place) → URL  (injected to avoid require cycles)
function formatVenueBlock(p, opts = {}) {
  if (!p || !p.name) return '';
  const {
    variant = 'compact',
    number = null,
    sanctuaryRead = '',
    googleMapsUrl: mapsFn = null,
    lang  // v0.58.55: 'en' | 'fr', forwarded to label helpers
  } = opts;
  const includeContact = (variant === 'detail' || variant === 'detail-with-sanctuary');
  const includeOrder   = (variant === 'detail' || variant === 'detail-with-sanctuary');
  const includeSanct   = (variant === 'detail-with-sanctuary');
  const includeDistance = (variant === 'detail' || variant === 'compact');

  const lines = [];
  const headPrefix = (number == null) ? '' : `${number}. `;
  lines.push(`${headPrefix}<b>${escapeHtml(p.name)}</b>`);
  if (p.area) lines.push(`📇 ${escapeHtml(p.area)}`);
  const hours = formatHoursLine(p, lang);
  if (hours) lines.push(hours);
  if (includeContact) {
    if (p.websiteUri) lines.push(`🌐 ${p.websiteUri}`);
    if (p.phone)      lines.push(`📞 ${p.phone}`);
  }
  if (includeSanct && sanctuaryRead && sanctuaryRead.trim()) {
    lines.push('');                                    // blank line
    lines.push(`🌿 ${lang === 'fr' ? 'Lecture sanctuaire pour' : 'Sanctuary read for'} ${escapeHtml(p.name)}`);
    // Sanctuary read already carries `• Quiet: …` etc. lines.
    lines.push(escapeHtml(sanctuaryRead.trim()));
  }
  const stats = formatStatsLine(p, { includeDistance, lang });
  // v0.58.51: per Human Lead — drop the blank line before the stats
  // row. The ✨ row should sit flush against the preceding row (or
  // the sanctuary read block) for compactness within a single pick.
  // The separator BETWEEN picks lives at the join site, not here.
  if (stats) lines.push(stats);
  if (includeOrder) {
    const orderLine = formatOrderLine(p);
    if (orderLine) lines.push(orderLine);
  }
  // v0.59.0: footfall row sits ABOVE travel-time, so a user reading
  // top-to-bottom sees "should I go now?" before "how do I get there?"
  // Skipped silently when no BestTime signal is attached.
  const footfallLine = formatFootfallLine(p, lang);
  if (footfallLine) lines.push(footfallLine);
  // v0.58.52: travel-time row immediately above Maps URL — applies to
  // ALL three variants (T1/T2/T3) per Human Lead. Skipped silently
  // when Routes API didn't populate either transitMinutes or
  // driveMinutes for this venue.
  const travelLine = formatTravelLine(p);
  if (travelLine) lines.push(travelLine);
  const mapsLine = formatMapsLine(p, mapsFn);
  if (mapsLine) lines.push(mapsLine);
  return lines.join('\n');
}

module.exports = {
  formatVenueBlock,
  formatHoursLine,
  formatStatsLine,
  formatOrderLine,
  formatMapsLine,
  formatTravelLine,
  formatFootfallLine,
  escapeHtml,
  PRICE_LABEL,
  CROWD_LABEL
};
