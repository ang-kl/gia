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
// v0.61.246 — operator: "if currently is open, state the closing
// time like what time and next open (especially for resturants that
// have fix lunch and dinner timing)." When openNow is true and we
// have a server-attached openClosingLabel ("Open · Closes 3:00 PM ·
// Reopens 6:00 PM" from open-hours.js currentOpenString), surface
// that as the primary line — the raw weekdayDescriptions string
// makes the operator do the math themselves.
function formatHoursLine(p, lang) {
  if (p.closedTodayLabel) return `🕰️ ${p.closedTodayLabel}`;
  if (p.openClosingLabel) return `🕰️ ${p.openClosingLabel}`;
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

// v0.59.28 — Stats row with single-emoji rating, NO review count.
// Per Human Lead 2026-05-07: dual-icon "✨ ⭐4.8 (100)" was visually
// noisy and review counts were inaccurate (same reason v0.59.24
// stripped them from /hidden). New format: "🌟4.8 • $$ • busy".
// 🌟 chosen to match v0.59.24's /hidden card icon.
function formatStatsLine(p, opts = {}) {
  const { includeDistance = false, lang } = opts;
  const parts = [];
  if (Number.isFinite(p.rating)) {
    parts.push(`🌟${p.rating.toFixed(1)}`); // rating only, no count
  }
  // v0.60.183 — priceLevel ($/$$/$$$/$$$$) removed from the stats row.
  // It now lives on its own line via formatPriceAndPetLine (which also
  // carries the numeric price range and the 🐾 Pet-allowed flag) just
  // above the 🚊/🚘 travel row.
  // v0.58.55: localised crowd label via crowdLabel(level, lang).
  const crowd = crowdLabel(p.crowdLevel, lang);
  if (crowd) parts.push(crowd);
  if (includeDistance && Number.isFinite(p.distanceM)) {
    parts.push(p.distanceM >= 1000
      ? `${(p.distanceM / 1000).toFixed(2)} km`
      : `${p.distanceM} m`);
  }
  // v0.59.28: dropped the leading ✨ (it duplicated ⭐ visually). The
  // rating glyph itself acts as the "stats" cue.
  return parts.length ? parts.join(' • ') : '';
}

// v0.60.183 — price-range + pet-allowed line inserted BEFORE the
// travel-time row. Renders the venue-currency numeric range with the
// operator-specified country prefix ("S$25–40" / "M$50–80" / "¥1500–2500"
// / …) and appends a user-currency conversion in parens when the
// venue's country differs from the user's. The 🐾 segment shows when
// the venue's allowsDogs attribute is true.
//
// Inputs read from the venue object:
//   p.priceRangeDisplay  — pre-resolved string from currency-format
//                          (e.g. "S$25–40" or "S$25–40 (US$18.50–29.60)").
//                          Pre-resolution keeps formatVenueBlock sync.
//                          When absent, the price segment is omitted.
//   p.allowsDogs         — boolean from pipeline (v0.60.165).
//
// Returns the formatted line ('S$25–40 · 🐾 Pet allowed' / FR equiv.)
// or null when neither segment contributes. The caller decides whether
// to push.
function formatPriceAndPetLine(p, opts = {}) {
  const { lang = 'en' } = opts;
  const segments = [];
  if (p && p.priceRangeDisplay) segments.push(p.priceRangeDisplay);
  // v0.60.223 — operator: the price row also carries ♿️ when Places
  // confirms an accessible entrance (parity with the TMA ResultCard).
  if (p && p.wheelchairAccessible === true) segments.push('♿️');
  if (p && p.allowsDogs === true) {
    segments.push(lang === 'fr' ? '🐾 Animaux autorisés' : '🐾 Pet allowed');
  }
  return segments.length ? segments.join(' · ') : null;
}

// Format the order line — top dishes (capped at 3).
// v0.60.209 — render-time guard: every entry must be a genuine
// dish/dessert name. The shared dish-name.js filter is the single
// chokepoint for ALL Telegram dish rendering (Copy, Copy to, cards),
// so a bare category word ("dishes", "food") can never reach a card
// even if an upstream extraction path lets one through.
// v0.60.222 — operator: the glyph is the "Try ·" line (matching the
// /s formatTechniqueVenueBlock line), not "🧾". Plus a venue-name
// guard: a review-regex capture sometimes leaks the venue's own name
// onto the dish list ("Restaurant Fiz and what") — drop any entry
// that contains, or is contained by, the venue name.
// v0.60.222a — operator: standardise the Try glyph to 🍲 across /s,
// /hidden and Copy (was 🍽️ / 🍴).
function formatOrderLine(p, lang = 'en') {
  const { filterDishNames } = require('./dish-name');
  const venueName = String((p && p.name) || '').trim().toLowerCase();
  const dishes = filterDishNames(p && p.dishes)
    .filter((d) => {
      if (!venueName) return true;
      const dn = String(d).trim().toLowerCase();
      return !(dn.includes(venueName) || venueName.includes(dn));
    })
    .slice(0, 3);
  if (!dishes.length) return '';
  return `🍲 ${lang === 'fr' ? 'Essayez' : 'Try'} · ${escapeHtml(dishes.join(' · '))}`;
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
//   sanctuaryRead: 2-line vibe-summary block (`🌿 Quiet:` / `🌿 Seating:`) for T1
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
  // v0.61.359 — native-script name line, e.g. "(東京駅)" / "(서울역)", added
  // after the bold name when the server resolved one (RULE A/B applied upstream).
  if (p.nameLocal) lines.push(`(${escapeHtml(p.nameLocal)})`);
  // v0.61.382 — readable foreign-name line, e.g. "🔤 Jongno Eunhaengnamu-jip
  // (City Hall branch)". A device-language romanisation + brief gloss for a
  // name in a script the reader can't read (Gemini, resolved server-side).
  // Sits alongside the native name — never replaces it.
  if (p.nameReading) lines.push(`🔤 ${escapeHtml(p.nameReading)}`);
  // v0.62.840 — the pronunciation line. 🗣 rather than the Mini Apps' SVG:
  // Telegram HTML cannot render SVG, and degrading the apps to the emoji this
  // surface can manage would be the wrong way round.
  if (p.namePronounce) lines.push(`🗣 ${escapeHtml(p.namePronounce)}`);
  // v0.60.45 — restaurant type line below the bold name. Mirrors the
  // TMA result card. Sourced from michelinCuisineLabel (when present)
  // or Places primaryTypeDisplayName, with the trailing "restaurant"
  // word stripped upstream by humaniseRestaurantType in index.js.
  if (p.restaurantType) lines.push(`🍽️ ${escapeHtml(p.restaurantType)}`);
  if (p.area) lines.push(`📇 ${escapeHtml(p.area)}`);
  const hours = formatHoursLine(p, lang);
  if (hours) lines.push(hours);
  if (includeContact) {
    if (p.websiteUri) lines.push(`🌐 ${p.websiteUri}`);
    if (p.phone)      lines.push(`📞 ${p.phone}`);
  }
  // v0.60.223 — operator's recreated copy template fixed the row
  // order: name → 🍽️ type → 📇 address → 🕰️ hours → 🌐/📞 contact →
  // 🌟 stats → price/♿️/🐾 → 🍲 Try → 🌿 Quiet/Seating → 🚊/🚘 → 📍
  // → ✳️. Stats first, then the price/pet row, then the Try line,
  // then the Sanctuary block flush beneath it.
  const stats = formatStatsLine(p, { includeDistance, lang });
  if (stats) lines.push(stats);
  const ppLine = formatPriceAndPetLine(p, { lang });
  if (ppLine) lines.push(ppLine);
  if (includeOrder) {
    const orderLine = formatOrderLine(p, lang);
    if (orderLine) lines.push(orderLine);
  }
  // v0.61.152 — nationality-language translated review quote. Only
  // surfaces when the backend (cuisine-search loop or
  // runFreeTextSearch enrich) set BOTH `recentReview` (translated
  // text) and `recentReviewTranslatedFlag` (the source flag). All
  // other code paths leave these undefined, so non-nationality
  // chat results render exactly as before. Mirrors the TMA
  // ResultCard.jsx render.
  if (typeof p.recentReview === 'string' && p.recentReview.trim()
      && typeof p.recentReviewTranslatedFlag === 'string' && p.recentReviewTranslatedFlag) {
    // v0.61.417 — review "X ago" date (Google relative time) a few spaces after
    // the closing quote, before the translated flag.
    const ago = (typeof p.recentReviewAgo === 'string' && p.recentReviewAgo.trim())
      ? `  ${escapeHtml(p.recentReviewAgo.trim())}` : '';
    lines.push(`💬 <i>"${escapeHtml(p.recentReview.trim())}"</i>${ago} ( ${p.recentReviewTranslatedFlag} translated)`);
  }
  if (includeSanct && sanctuaryRead && sanctuaryRead.trim()) {
    // v0.60.209 — drop the "🌿 Sanctuary read for <name>" header; the
    // block is the two 🌿-prefixed fields (🌿 Quiet / 🌿 Seating).
    // v0.60.221 — no blank line above it. v0.60.223 — moved below the
    // 🍲 Try line per the operator's recreated copy template.
    lines.push(escapeHtml(sanctuaryRead.trim()));
  }
  // v0.59.0 — footfall + v0.60.118 rain caveat: sparse rows, kept
  // above the travel row.
  const footfallLine = formatFootfallLine(p, lang);
  if (footfallLine) lines.push(footfallLine);
  if (typeof p.rainAlert === 'string' && p.rainAlert.trim()) lines.push(p.rainAlert.trim());
  // v0.58.52: travel-time row immediately above Maps URL — applies to
  // ALL three variants (T1/T2/T3) per Human Lead. Skipped silently
  // when Routes API didn't populate either transitMinutes or
  // driveMinutes for this venue.
  const travelLine = formatTravelLine(p);
  if (travelLine) lines.push(travelLine);
  const mapsLine = formatMapsLine(p, mapsFn);
  if (mapsLine) lines.push(mapsLine);
  // v0.61.226 — social profile URLs (Instagram / TikTok / Facebook /
  // X / YouTube / Threads), positioned immediately after the 📍 maps
  // line per operator request. Sourced from social-profiles.js via
  // Gemini grounded Google Search (Places API does not expose
  // these). Backend attaches a pre-validated, priority-ordered URL
  // array as `p.socialProfiles`; chat templates render the full
  // URLs separated by ` · ` so Telegram auto-links each. Gated by
  // `includeContact` (same gate as 🌐/📞) so the compact T3 variant
  // stays sparse.
  if (includeContact && Array.isArray(p.socialProfiles) && p.socialProfiles.length) {
    lines.push(`📱 ${p.socialProfiles.join(' · ')}`);
  }
  // v0.60.192 — Michelin / Bib Gourmand annotation row appended after
  // the maps URL. Mirrors the formatTechniqueVenueBlock + cuisine-
  // search annotation paths so /eat / /drink / Cuisine TMA Copy-All
  // cards carry the same "✳️ Michelin · ⭐⭐⭐ · 2025" badge.
  // v0.60.193 — DF-91: cross-ref logic factored into michelin-2025's
  // appendMichelinAnnotation helper; same body shared by all three
  // call sites (venue-templates, formatTechniqueVenueBlock, /api/cuisine/search).
  require('./SG-michelin').appendMichelinAnnotation(lines, p, 'formatVenueBlock');
  // v0.62.0 — HPB Healthier Choice + "inside a building complex" rows,
  // appended after the Michelin row (standalone when no Michelin).
  require('./healthier-eateries').appendHealthierChoiceLine(lines, p, 'formatVenueBlock');
  require('./buildings').appendBuildingLine(lines, p, 'formatVenueBlock');
  return lines.join('\n');
}

module.exports = {
  formatVenueBlock,
  formatHoursLine,
  formatStatsLine,
  formatPriceAndPetLine,
  formatOrderLine,
  formatMapsLine,
  formatTravelLine,
  formatFootfallLine,
  escapeHtml,
  // v0.60.133 — alias. formatTechniqueVenueBlock (index.js) and a few
  // other call sites reference `escapeHtmlForTelegram` on this module;
  // it's the same `& < >` escape as `escapeHtml`. Without the alias
  // every formatTechniqueVenueBlock call threw on its first line,
  // collapsing /s + free-text rich cards to the name-only fallback
  // (and going fully silent on the paths that lack a per-card catch).
  escapeHtmlForTelegram: escapeHtml,
  PRICE_LABEL,
  CROWD_LABEL
};
