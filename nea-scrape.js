// nea-scrape.js — v0.48.1 NEA hawker closure scraper.
//
// Source: https://www.nea.gov.sg/our-services/hawker-management/overview
//   (v0.38.0 hit /announcements — wrong URL; the actual closure table
//    lives on /overview. User-confirmed via screenshot 03-05-26.)
//
// The page renders a quarterly closure table:
//   View By Closure Month: Jan-Mar / Apr-Jun / Jul-Sep / Oct-Dec
//   View By Hawker Centre Name: ALL / A-E / F-J / K-O / P-T / U-Z
//
// Tabs are client-side visibility toggles — the server sends all
// quarters' data inline. A single fetch + cheerio parse picks up
// every row across all 4 quarters.
//
// Table columns (consistent on the live page):
//   Hawker Centre · Closure Date · Reason for Closure · Remarks
//
// CONTRACT RISK: NEA can redesign at any time. Mitigations:
//   1. Cache last successful parse 6 h in Redis with `fetchedAt`.
//   2. Distinguishable error states (fetch-failure vs parser-failure).
//   3. v0.48.0 web_search fallback path still wired in index.js
//      `runHawkerClosureLive` for the case where scrape returns 0.

const axios = require('axios');
const cheerio = require('cheerio');

const OVERVIEW_URL = 'https://www.nea.gov.sg/our-services/hawker-management/overview';
const ANNOUNCEMENTS_URL = OVERVIEW_URL; // v0.48.1 alias for back-compat
const HAWKER_HOME_URL = 'https://www.nea.gov.sg/our-services/hawker-management';
const SCRAPE_CACHE_KEY = 'nea:hawker-scrape:v2'; // v2 because format changed
const SCRAPE_CACHE_TTL_S = 6 * 60 * 60; // 6 h
const FETCH_TIMEOUT_MS = 12000;

function classifyTable(headerText) {
  const t = String(headerText || '').toLowerCase();
  if (/closure|cleaning/i.test(t)) return 'closure';
  if (/r ?& ?r|repair|renovation|redecoration/i.test(t)) return 'rnr';
  return null;
}

function tableToRows($, table) {
  const rows = [];
  $(table).find('tr').each((_, tr) => {
    const cells = $(tr).find('th,td')
      .map((_i, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();
    if (cells.length) rows.push(cells);
  });
  if (!rows.length) return { headers: [], data: [] };
  // Heuristic: if first row contains all <th> OR has notably bold-looking
  // text, treat as headers; else fall back to numeric column labels.
  const firstRowHasTh = $(table).find('tr').first().find('th').length > 0;
  if (firstRowHasTh) {
    return { headers: rows[0], data: rows.slice(1) };
  }
  // Otherwise label columns and treat all rows as data.
  const ncols = Math.max(...rows.map((r) => r.length));
  const headers = Array.from({ length: ncols }, (_, i) => `Column ${i + 1}`);
  return { headers, data: rows };
}

// Find the heading that immediately precedes a given table element.
function precedingHeading($, table) {
  let prev = $(table).prev();
  for (let i = 0; i < 12 && prev.length; i++) {
    const tag = prev[0]?.name?.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong'].includes(tag)) {
      return prev.text().trim();
    }
    if (tag === 'p' && prev.text().trim().length > 0 && prev.text().trim().length < 120) {
      // Use a short paragraph as a heading-ish hint.
      return prev.text().trim();
    }
    prev = prev.prev();
  }
  // Fall back to walking up parents and grabbing the closest preceding heading.
  let parent = $(table).parent();
  for (let i = 0; i < 6 && parent.length; i++) {
    const heading = parent.find('h1, h2, h3, h4, h5, h6').first();
    if (heading.length) return heading.text().trim();
    parent = parent.parent();
  }
  return '';
}

async function fetchAndParse() {
  const t0 = Date.now();
  let html;
  try {
    const { data } = await axios.get(OVERVIEW_URL, {
      timeout: FETCH_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; soleat-bot/0.38; +https://gia4lunch-production.up.railway.app)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      maxContentLength: 5 * 1024 * 1024
    });
    html = String(data || '');
  } catch (err) {
    return {
      ok: false,
      error: `fetch failed: ${err.message?.slice(0, 200)}`,
      fetchedAt: Date.now(),
      ms: Date.now() - t0,
      sourceUrl: OVERVIEW_URL,
      hawkerHomeUrl: HAWKER_HOME_URL,
      closures: { headers: [], data: [] },
      rnrWorks: { headers: [], data: [] }
    };
  }

  let $;
  try {
    $ = cheerio.load(html);
  } catch (err) {
    return {
      ok: false,
      error: `cheerio load failed: ${err.message?.slice(0, 200)}`,
      fetchedAt: Date.now(),
      ms: Date.now() - t0,
      sourceUrl: OVERVIEW_URL,
      hawkerHomeUrl: HAWKER_HOME_URL,
      closures: { headers: [], data: [] },
      rnrWorks: { headers: [], data: [] }
    };
  }

  const closureTables = [];
  const rnrTables = [];
  const otherTables = [];

  $('table').each((_, tbl) => {
    const heading = precedingHeading($, tbl);
    const klass = classifyTable(heading);
    const parsed = tableToRows($, tbl);
    if (!parsed.data.length) return;
    const enriched = { heading, ...parsed };
    if (klass === 'closure') closureTables.push(enriched);
    else if (klass === 'rnr') rnrTables.push(enriched);
    else otherTables.push(enriched);
  });

  // If neither classifier matched, surface the largest table as a
  // best-guess "closure" and the second largest as "rnr". This keeps
  // the TMA non-empty when NEA changes heading text.
  if (!closureTables.length && !rnrTables.length && otherTables.length) {
    otherTables.sort((a, b) => b.data.length - a.data.length);
    if (otherTables[0]) closureTables.push({ ...otherTables[0], heading: otherTables[0].heading || '(unlabelled)' });
    if (otherTables[1]) rnrTables.push({ ...otherTables[1], heading: otherTables[1].heading || '(unlabelled)' });
  }

  return {
    ok: true,
    fetchedAt: Date.now(),
    ms: Date.now() - t0,
    sourceUrl: ANNOUNCEMENTS_URL,
    hawkerHomeUrl: HAWKER_HOME_URL,
    closures: closureTables.length === 1
      ? closureTables[0]
      : { headers: ['Centre / detail'], data: closureTables.flatMap((t) => t.data) },
    rnrWorks: rnrTables.length === 1
      ? rnrTables[0]
      : { headers: ['Centre / detail'], data: rnrTables.flatMap((t) => t.data) },
    diagnostics: {
      closureTablesFound: closureTables.length,
      rnrTablesFound: rnrTables.length,
      otherTablesFound: otherTables.length,
      htmlBytes: html.length
    }
  };
}

async function getCachedOrFetch(redis) {
  if (redis) {
    try {
      const raw = await redis.get(SCRAPE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, cached: true };
      }
    } catch (err) {
      console.warn('[NEA-Scrape] cache read failed:', err.message);
    }
  }
  const result = await fetchAndParse();
  if (result.ok && redis) {
    try {
      await redis.set(SCRAPE_CACHE_KEY, JSON.stringify({ ...result, cached: false }), { EX: SCRAPE_CACHE_TTL_S });
    } catch (err) {
      console.warn('[NEA-Scrape] cache write failed:', err.message);
    }
  }
  return { ...result, cached: false };
}

// v0.48.1: parse a "30 Mar 2026 to 28 Jun 2026" / "4 May 2026 to 5
// May 2026" date range from the NEA closure table cell. Returns
// { start: Date|null, end: Date|null, raw }. Tolerates single-day
// closures ("4 May 2026") by setting start == end.
const MONTH = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDayMonthYear(s) {
  if (!s) return null;
  const m = String(s).trim().match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monKey = m[2].slice(0, 3).toLowerCase();
  const mon = MONTH[monKey];
  const year = parseInt(m[3], 10);
  if (mon == null) return null;
  return new Date(Date.UTC(year, mon, day));
}

function parseClosureDateRange(raw) {
  if (!raw) return { start: null, end: null, raw: '' };
  const cleaned = String(raw).replace(/\s+/g, ' ').trim();
  // "to" or "–" / "-" / "—" splits start from end.
  const m = cleaned.match(/(.+?)\s+(?:to|–|—|-)\s+(.+)/i);
  if (m) {
    const start = parseDayMonthYear(m[1]);
    const end = parseDayMonthYear(m[2]);
    return { start, end, raw: cleaned };
  }
  // Single date — treat as 1-day closure.
  const single = parseDayMonthYear(cleaned);
  return { start: single, end: single, raw: cleaned };
}

// status: 'ongoing' | 'upcoming' | 'recently-ended' | 'historical' | 'unknown'
function classifyClosureStatus(start, end, today = new Date()) {
  if (!start || !end) return 'unknown';
  const t = today.getTime();
  if (start.getTime() <= t && t <= end.getTime() + 86400 * 1000) return 'ongoing'; // include end-day
  if (start.getTime() > t) return 'upcoming';
  // Recently ended — within last 30 days.
  if (end.getTime() < t && (t - end.getTime()) <= 30 * 86400 * 1000) return 'recently-ended';
  return 'historical';
}

function googleMapsSearchUrl(name) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Singapore')}`;
}

// v0.48.1: enrich raw scraped rows with structured fields the user's
// prompt template asks for.
//
// Input: raw rows from `closures.data` (4-cell arrays).
// Output: array of { name, closureType, startDate, endDate, durationDays,
//                    status, mapsUrl, raw }
function enrichClosureRows(rows, today = new Date()) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    const name = String(cells[0] || '').trim();
    const dateText = String(cells[1] || '').trim();
    const reason = String(cells[2] || '').trim();
    const remarks = String(cells[3] || '').trim();
    const { start, end, raw } = parseClosureDateRange(dateText);
    // Derive closure type from "Reason for Closure" + "Remarks".
    let closureType = 'Closure';
    const combined = (reason + ' ' + remarks).toLowerCase();
    if (/cleaning/.test(combined)) closureType = 'Cleaning';
    else if (/r ?& ?r|repair|redecoration|renovation/.test(combined)) closureType = 'R&R';
    else if (/upgrad/.test(combined)) closureType = 'Upgrading';
    else if (/other/.test(reason.toLowerCase())) closureType = remarks || 'Other';
    const status = classifyClosureStatus(start, end, today);
    const durationDays = (start && end)
      ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
      : null;
    return {
      name,
      closureType,
      startDate: start ? start.toISOString().slice(0, 10) : null,
      endDate: end ? end.toISOString().slice(0, 10) : null,
      durationDays,
      status,
      mapsUrl: name ? googleMapsSearchUrl(name) : '',
      reason,
      remarks,
      raw
    };
  }).filter((r) => r.name);
}

// v0.48.1: sort per Human Lead's prompt template.
// 1. Ongoing — by nearest end date
// 2. Upcoming — by nearest start date
// 3. Recently-ended (within 30d) — by most recent end date
// 4. Historical / unknown — drop (out of scope for the user-facing list)
function sortClosuresByProximity(enriched) {
  const ongoing = enriched.filter((r) => r.status === 'ongoing')
    .sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));
  const upcoming = enriched.filter((r) => r.status === 'upcoming')
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  const recentlyEnded = enriched.filter((r) => r.status === 'recently-ended')
    .sort((a, b) => (b.endDate || '').localeCompare(a.endDate || '')); // most recent first
  return [...ongoing, ...upcoming, ...recentlyEnded];
}

// v0.48.1: produce a Telegram-friendly labeled-block string per
// Human Lead's prompt template — one block per closure with all 6
// columns. Caller wraps with their own header / footer.
function formatClosureBlocks(enriched) {
  return enriched.map((r, i) => {
    const lines = [];
    const statusEmoji = r.status === 'ongoing' ? '🔴' : r.status === 'upcoming' ? '🟡' : '⚪';
    lines.push(`${i + 1}. ${statusEmoji} ${r.name}`);
    if (r.closureType) lines.push(`   Type: ${r.closureType}`);
    if (r.startDate || r.endDate) lines.push(`   Dates: ${r.startDate || '?'} → ${r.endDate || '?'}${r.durationDays ? ` (${r.durationDays}d)` : ''}`);
    if (r.mapsUrl) lines.push(`   📍 ${r.mapsUrl}`);
    return lines.join('\n');
  }).join('\n\n');
}

// Convenience: wraps getCachedOrFetch + enrichment + sort. Returns
// { ok, ongoing, upcoming, recentlyEnded, all, summary } where each
// list is enriched + sorted, plus a 1-line summary string.
async function getStructuredClosures(redis) {
  const result = await getCachedOrFetch(redis);
  if (!result.ok) return { ok: false, error: result.error, fetchedAt: result.fetchedAt };
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000); // SGT today (UTC+8)
  const today00 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const enriched = enrichClosureRows(result.closures?.data || [], today00);
  const sorted = sortClosuresByProximity(enriched);
  const ongoingN = sorted.filter((r) => r.status === 'ongoing').length;
  const upcomingN = sorted.filter((r) => r.status === 'upcoming').length;
  const recentN = sorted.filter((r) => r.status === 'recently-ended').length;
  return {
    ok: true,
    fetchedAt: result.fetchedAt,
    cached: !!result.cached,
    sourceUrl: result.sourceUrl,
    all: sorted,
    summary: `🧹 ${sorted.length} closure${sorted.length === 1 ? '' : 's'} (${ongoingN} ongoing · ${upcomingN} upcoming · ${recentN} recently ended)`
  };
}

module.exports = {
  ANNOUNCEMENTS_URL,
  OVERVIEW_URL,
  HAWKER_HOME_URL,
  SCRAPE_CACHE_KEY,
  SCRAPE_CACHE_TTL_S,
  fetchAndParse,
  getCachedOrFetch,
  // v0.48.1 enrichment helpers:
  parseClosureDateRange,
  classifyClosureStatus,
  enrichClosureRows,
  sortClosuresByProximity,
  formatClosureBlocks,
  googleMapsSearchUrl,
  getStructuredClosures
};
