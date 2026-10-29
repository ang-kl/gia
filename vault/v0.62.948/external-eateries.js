// external-eateries.js — v0.62.944.
//
// Curated new eateries from the operator's Gemini automation (Alerts_*.CSV, DailyBrief_*.CSV),
// stored complete in Redis and offered to "new" searches.
//
// Operator, 26-10 '26: copy the files into a separate store, "the copied information into each
// columns should be complete records same as the original", load them with an admin command, and
// when a search asks for "new", "consider these records that it matches the location-pinned, meet
// the criteria of new and desire outcome before showing to the user"; "stop using that after 3
// months of curated date". Answers recorded in the spec:
//   • store: Redis, its own `ext:` keyspace, every column verbatim (A1);
//   • source: CSV files sent to the bot after /external_update, owner chat only (A3, A7, A8);
//   • merge by id: rows in a file are added or replaced whole, rows not in it stay (A9);
//   • new = NOW OPEN / SOFT LAUNCH, plus POP-UP / LIMITED RUN inside its event dates (A2);
//   • halal: JB and Batam halal unless pork, lard, alcohol or "non-halal" shows; SG certified
//     only; cards say "Halal ✓ certified" or "Halal" (A4, A5);
//   • curated venues still face the New filter's review-age check (A11), so they are merged into
//     the pool BEFORE applyNewnessRule, never after it.
//
// Nothing here calls a paid API: coordinates come from the file (I9).
//
// Spec: doc/Feature/2026-10-26-external-eateries.spec.md.

'use strict';

const { haversineMeters } = require('./location-mode');

const COMMAND = 'external_update';
// Telegram commands allow only a-z, 0-9 and "_": "/external-update" would arrive as "/external".
const COMMAND_RE = /^\/external_update(?:@\w+)?\s*$/;
const WINDOW_S = 15 * 60;
const STALE_MONTHS = 3;

const KINDS = {
  alerts: {
    idCol: 'alert_id', dateCol: 'alert_date', label: 'Alerts',
    required: ['alert_id', 'alert_date', 'status_badge', 'market_region', 'venue_name', 'formatted_address',
      'place_id', 'latitude', 'longitude', 'is_halal_certified', 'dietary_notes', 'must_try_dishes_detailed',
      'is_pet_friendly', 'gia_slug', 'gia_price_tier', 'gia_quick_filters'],
  },
  briefs: {
    idCol: 'brief_id', dateCol: 'schedule_date', label: 'DailyBrief',
    required: ['brief_id', 'schedule_date', 'linked_alert_ids'],
  },
};

const key = {
  row: (kind, id) => `ext:${kind}:row:${id}`,
  ids: (kind) => `ext:${kind}:ids`,
  columns: (kind) => `ext:${kind}:columns`,
  meta: (kind) => `ext:${kind}:meta`,
  window: (chatId) => `ext:upload-window:${chatId}`,
};

// ── CSV ───────────────────────────────────────────────────────────────────────────────────────
// RFC 4180: quoted fields may hold commas, newlines and doubled quotes. A leading BOM is dropped.
// Rows whose width differs from the header are reported in `badWidth` (1-based data row numbers),
// never padded or cut, so a validation can refuse the file whole.
function parseCsv(text) {
  const s = String(text || '').replace(/^﻿/, '');
  const records = [];
  let field = ''; let record = []; let i = 0; let quoted = false;
  while (i < s.length) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += c; i += 1; continue;
    }
    if (c === '"') { quoted = true; i += 1; continue; }
    if (c === ',') { record.push(field); field = ''; i += 1; continue; }
    if (c === '\r' && s[i + 1] === '\n') { i += 1; continue; }
    if (c === '\n' || c === '\r') { record.push(field); records.push(record); record = []; field = ''; i += 1; continue; }
    field += c; i += 1;
  }
  if (field !== '' || record.length) { record.push(field); records.push(record); }
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0] === ''));
  const header = nonEmpty.length ? nonEmpty[0].map((h) => h.trim()) : [];
  const rows = []; const badWidth = [];
  nonEmpty.slice(1).forEach((r, idx) => {
    if (r.length !== header.length) { badWidth.push(idx + 1); return; }
    const o = {};
    header.forEach((h, j) => { o[h] = r[j]; });
    rows.push(o);
  });
  return { header, rows, badWidth };
}

function detectKind(header) {
  const h = Array.isArray(header) ? header : [];
  if (h[0] === 'alert_id') return 'alerts';
  if (h[0] === 'brief_id') return 'briefs';
  return null;
}

// Errors refuse the whole file; warnings are reported but do not block.
function validateFile(kind, parsed) {
  const spec = KINDS[kind];
  const errors = []; const warnings = [];
  if (!spec) return { errors: ['unknown file type'], warnings };
  const header = parsed?.header || []; const rows = parsed?.rows || [];
  const dupHeaders = header.filter((h, i) => header.indexOf(h) !== i);
  if (dupHeaders.length) errors.push(`duplicate columns: ${[...new Set(dupHeaders)].join(', ')}`);
  const missing = spec.required.filter((c) => !header.includes(c));
  if (missing.length) errors.push(`missing columns: ${missing.join(', ')}`);
  if (Array.isArray(parsed?.badWidth) && parsed.badWidth.length) {
    errors.push(`rows with the wrong width (expected ${header.length} columns): ${parsed.badWidth.slice(0, 10).join(', ')}`);
  }
  if (!rows.length && !(parsed?.badWidth || []).length) errors.push('no rows');
  const ids = rows.map((r) => r[spec.idCol]);
  if (ids.some((x) => !x || !String(x).trim())) errors.push(`a row has an empty ${spec.idCol}`);
  const dups = ids.filter((x, i) => x && ids.indexOf(x) !== i);
  if (dups.length) errors.push(`duplicate ${spec.idCol}: ${[...new Set(dups)].slice(0, 10).join(', ')}`);
  if (kind === 'alerts' && !missing.length) {
    const noCoord = rows.filter((r) => !Number.isFinite(parseFloat(r.latitude)) || !Number.isFinite(parseFloat(r.longitude)));
    if (noCoord.length) warnings.push(`${noCoord.length} row(s) without coordinates will never match a location: ${noCoord.slice(0, 5).map((r) => r.alert_id).join(', ')}`);
    const placeholder = rows.filter((r) => Object.values(r).some((v) => /^(not verified|not maintained|none|nil|n\/a)$/i.test(String(v).trim())));
    if (placeholder.length) warnings.push(`${placeholder.length} row(s) carry placeholder text such as "Not verified"`);
  }
  return { errors, warnings };
}

// ── store ─────────────────────────────────────────────────────────────────────────────────────
// Merge by id (A9): each row in the file replaces its stored copy whole (the hash is deleted
// first, so a column dropped from a later export does not linger); rows not in the file stay.
async function storeFile(redis, kind, parsed, meta = {}) {
  const spec = KINDS[kind];
  const existing = new Set(await redis.sMembers(key.ids(kind)));
  let added = 0; let replaced = 0;
  for (const row of parsed.rows) {
    const id = row[spec.idCol];
    const k = key.row(kind, id);
    if (existing.has(id)) replaced += 1; else added += 1;
    await redis.del(k);
    await redis.hSet(k, row);
    await redis.sAdd(key.ids(kind), id);
  }
  await redis.set(key.columns(kind), JSON.stringify(parsed.header));
  const kept = existing.size - replaced;
  await redis.set(key.meta(kind), JSON.stringify({
    fileName: meta.fileName || '', by: meta.by || '', at: new Date().toISOString(),
    added, replaced, kept, total: existing.size + added,
  }));
  cacheFor(redis).delete(kind);
  return { added, replaced, kept, total: existing.size + added };
}

// A short in-process cache, per Redis client: a "new" search reads every row, and the rows change
// only when the owner uploads. storeFile clears it.
const caches = new WeakMap();
const cacheFor = (redis) => { let c = caches.get(redis); if (!c) { c = new Map(); caches.set(redis, c); } return c; };
const CACHE_MS = 5 * 60 * 1000;

async function loadRows(redis, kind, { now = Date.now() } = {}) {
  const cache = cacheFor(redis);
  const hit = cache.get(kind);
  if (hit && now - hit.at < CACHE_MS) return hit.rows;
  const ids = await redis.sMembers(key.ids(kind));
  let columns = null;
  try { columns = JSON.parse((await redis.get(key.columns(kind))) || 'null'); } catch { columns = null; }
  const rows = [];
  for (const id of ids) {
    const h = await redis.hGetAll(key.row(kind, id));
    if (!h || !Object.keys(h).length) continue;
    // Restore the file's column order; any column not in the latest header follows it.
    if (Array.isArray(columns)) {
      const o = {};
      for (const c of columns) if (c in h) o[c] = h[c];
      for (const c of Object.keys(h)) if (!(c in o)) o[c] = h[c];
      rows.push(o);
    } else rows.push(h);
  }
  cache.set(kind, { at: now, rows });
  return rows;
}

// ── rules ─────────────────────────────────────────────────────────────────────────────────────
// Dates are compared as SGT calendar days, 'YYYY-MM-DD'.
function sgtToday(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function addMonths(ymd, months) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]) - 1 + months; const d = Number(m[3]);
  const ty = y + Math.floor(mo / 12); const tm = ((mo % 12) + 12) % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

// Stale on the day that is `STALE_MONTHS` calendar months after the curated date. A row with no
// readable date is treated as stale: it cannot prove it is recent.
function isStale(curatedYmd, todayYmd) {
  const cutoff = addMonths(curatedYmd, STALE_MONTHS);
  if (!cutoff) return true;
  return todayYmd >= cutoff;
}

function isNewEligible(row, todayYmd) {
  const badge = String(row?.status_badge || '').toUpperCase();
  if (badge.startsWith('NOW OPEN')) return true;
  if (badge.startsWith('POP-UP')) {
    const s = row.event_start_date; const e = row.event_end_date;
    return !!s && !!e && todayYmd >= s && todayYmd <= e;
  }
  return false;
}

// Halal (A4): certified anywhere when the file says so; in JB and Batam, halal by default unless
// the notes or the dishes show pork, lard, alcohol or say non-halal. "Pork-free", "no pork" and
// "alcohol-free" are not evidence against, and turkey / chicken / beef "ham" or "bacon" is allowed.
const FORBIDDEN = /\b(non-?halal|not halal|pork|lard|babi|bak kut teh|char siu|ham|bacon|alcohol|alcoholic|beer|beers|wine|wines|sake|soju|highballs?|cocktails?|liquor|whisky|whiskey|rum|mirin|spirits)\b/i;
const NEGATED = /\b(pork|lard|alcohol|babi)[- ]free\b|\bno (pork|lard|alcohol)\b|\b(turkey|chicken|beef|duck)\s+(ham|bacon)\b|\bnot halal-certified\b|\bnon-?alcoholic\b/gi;

function halalStatus(row) {
  if (String(row?.is_halal_certified || '').toUpperCase() === 'TRUE') return 'certified';
  const region = String(row?.market_region || '').toUpperCase();
  if (region !== 'JB' && region !== 'BTM') return null;
  const text = `${row.dietary_notes || ''} ${row.must_try_dishes_detailed || ''}`.replace(NEGATED, ' ');
  return FORBIDDEN.test(text) ? null : 'default';
}

function quickFilters(row) {
  return new Set(String(row?.gia_quick_filters || '').split(',').map((x) => x.trim()).filter(Boolean));
}

// The search's other filters (spec Interpretation): a row that does not say is not offered.
function meetsFilters(row, filters = {}, cuisines = []) {
  const slugs = (Array.isArray(cuisines) ? cuisines : []).map((c) => String(c).toLowerCase());
  if (slugs.length && !slugs.includes(String(row.gia_slug || '').toLowerCase())) return false;
  if (filters.halal && !halalStatus(row)) return false;
  if (Array.isArray(filters.prices) && filters.prices.length && !filters.prices.includes(row.gia_price_tier)) return false;
  if (filters.petFriendly && String(row.is_pet_friendly).toUpperCase() !== 'TRUE') return false;
  if (filters.vegetarian && !quickFilters(row).has('vegetarian')) return false;
  if (filters.homeBased && !quickFilters(row).has('homeBased')) return false;
  // Whether a venue is open right now cannot be read from a file curated days ago.
  if (filters.openNow) return false;
  return true;
}

const usable = (v) => (v && !/^(not verified|not maintained|none|nil|n\/a)$/i.test(String(v).trim()) ? String(v).trim() : '');

// A curated row as an ordinary result venue (pipeline.js's shape), plus `_curated` for the tag,
// the halal label and the record it came from.
function toVenue(row, distM) {
  const tier = String(row.gia_price_tier || '');
  return {
    placeId: row.place_id,
    name: row.venue_name,
    area: row.formatted_address,
    lat: parseFloat(row.latitude),
    lng: parseFloat(row.longitude),
    rating: Number.isFinite(parseFloat(row.rating)) ? parseFloat(row.rating) : null,
    userRatingCount: Number.isFinite(parseInt(row.user_rating_count, 10)) ? parseInt(row.user_rating_count, 10) : null,
    priceLevel: /^\$+$/.test(tier) ? tier.length : null,
    openNow: null,
    websiteUri: usable(row.website_url),
    phone: '',
    primaryType: 'restaurant',
    primaryTypeDisplayName: row.culinary_category || '',
    url: usable(row.google_maps_uri),
    reviews: [],
    allowsDogs: String(row.is_pet_friendly).toUpperCase() === 'TRUE',
    distanceM: Number.isFinite(distM) ? Math.round(distM) : undefined,
    _curated: {
      alertId: row.alert_id,
      region: String(row.market_region || '').toUpperCase(),
      statusBadge: row.status_badge,
      curatedDate: row.alert_date,
      halal: halalStatus(row),
      cuisineSlug: row.gia_slug,
      instagram: usable(row.instagram_url),
      facebook: usable(row.facebook_url),
      mustTry: row.must_try_dishes_detailed || '',
    },
  };
}

// The curated venues a "new" search may offer, nearest first. Synchronous and fetch-free (I9).
function curatedCandidates({ rows, today, center, radiusM, filters = {}, cuisines = [] }) {
  if (!Array.isArray(rows) || !center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return [];
  if (!Number.isFinite(radiusM) || radiusM <= 0) return [];
  const out = [];
  for (const row of rows) {
    const lat = parseFloat(row.latitude); const lng = parseFloat(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (isStale(row.alert_date, today)) continue;
    if (!isNewEligible(row, today)) continue;
    const d = haversineMeters(center, { lat, lng });
    if (!(d <= radiusM)) continue;
    if (!meetsFilters(row, filters, cuisines)) continue;
    out.push(toVenue(row, d));
  }
  // One card per place, even when two alerts share a place_id.
  const seen = new Set();
  return out.sort((a, b) => a.distanceM - b.distanceM).filter((v) => (seen.has(v.placeId) ? false : (seen.add(v.placeId), true)));
}

function mergeCurated(googleVenues, curated) {
  const pool = Array.isArray(googleVenues) ? googleVenues : [];
  const cur = Array.isArray(curated) ? curated : [];
  const ids = new Set(cur.map((v) => v.placeId));
  return [...cur, ...pool.filter((v) => !ids.has(v.placeId))];
}

function curatedFirst(venues) {
  const list = Array.isArray(venues) ? venues : [];
  return [...list.filter((v) => v && v._curated), ...list.filter((v) => !(v && v._curated))];
}

// The one call each "new" path makes, just before applyNewnessRule (A11). Never throws: a Redis
// problem means no curated venues, not a failed search.
async function forNewSearch(venues, { redis, center, radiusM, filters, cuisines, logLabel = 'External', today = sgtToday() } = {}) {
  try {
    if (!redis) return venues;
    const rows = await loadRows(redis, 'alerts');
    if (!rows.length) return venues;
    const cur = curatedCandidates({ rows, today, center, radiusM, filters, cuisines });
    if (cur.length) console.log(`[${logLabel}] D795 curated external ${cur.length} within ${Math.round(radiusM)}m: ${cur.slice(0, 5).map((v) => v._curated.alertId).join(', ')}`);
    return mergeCurated(venues, cur);
  } catch (err) {
    console.warn(`[${logLabel}] external eateries skipped: ${err.message}`);
    return venues;
  }
}

// ── /external_update ──────────────────────────────────────────────────────────────────────────
async function handleCommand({ chatId, isOwner, redis }) {
  if (!isOwner) return null;
  await redis.set(key.window(chatId), String(Date.now()), { EX: WINDOW_S });
  const lines = ['📥 External eateries update: send the Alerts and/or DailyBrief CSV files within the next 15 minutes.',
    'Rows merge by id: rows in a file are added or replaced, rows not in it stay.'];
  for (const kind of Object.keys(KINDS)) {
    try {
      const m = JSON.parse((await redis.get(key.meta(kind))) || 'null');
      if (m) lines.push(`Stored ${KINDS[kind].label}: ${m.total} rows (last file ${m.fileName}, ${m.at}).`);
    } catch { /* no meta yet */ }
  }
  return lines.join('\n');
}

async function handleDocument({ chatId, isOwner, redis, fileName, fetchText, today = sgtToday() }) {
  if (!isOwner) return null;
  if (!(await redis.get(key.window(chatId)))) return null;
  if (!/\.csv$/i.test(String(fileName || ''))) return `⚠️ ${fileName || 'That file'} was not loaded: send a .CSV file.`;
  const text = await fetchText();
  const parsed = parseCsv(text);
  const kind = detectKind(parsed.header);
  if (!kind) return `⚠️ ${fileName} was not loaded: its first column is neither alert_id (Alerts) nor brief_id (DailyBrief).`;
  const { errors, warnings } = validateFile(kind, parsed);
  if (errors.length) return `⚠️ ${fileName} was not loaded (nothing changed):\n• ${errors.join('\n• ')}`;
  const res = await storeFile(redis, kind, parsed, { fileName, by: String(chatId) });
  const rows = await loadRows(redis, kind);
  const spec = KINDS[kind];
  const live = rows.filter((r) => !isStale(r[spec.dateCol], today)).length;
  const lines = [
    `✅ ${spec.label} (${fileName}): ${res.added} added, ${res.replaced} replaced, ${res.kept} kept, ${res.total} stored.`,
    `${live} of ${rows.length} are within 3 months of their ${spec.dateCol}; the rest are kept but not offered.`,
  ];
  if (warnings.length) lines.push(`Warnings:\n• ${warnings.join('\n• ')}`);
  return lines.join('\n');
}

module.exports = {
  COMMAND, COMMAND_RE, WINDOW_S, STALE_MONTHS, KINDS,
  parseCsv, detectKind, validateFile, storeFile, loadRows,
  sgtToday, addMonths, isStale, isNewEligible, halalStatus, meetsFilters,
  toVenue, curatedCandidates, mergeCurated, curatedFirst, forNewSearch,
  handleCommand, handleDocument,
};
