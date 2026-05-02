// nea-scrape.js — v0.38.0 NEA hawker announcements scraper.
//
// Source: https://www.nea.gov.sg/our-services/hawker-management/announcements
//
// NEA's page is HTML, no public JSON API. We use cheerio to parse two
// table types:
//   1. "Hawker Centres & Market Closure" — quarterly cleaning schedule
//   2. "R&R (Repairs and Redecoration / Renovation) Work" — longer
//      multi-week / multi-month closures for refurbishment
//
// CONTRACT RISK: NEA can change their HTML at any time and break this
// parser. We mitigate by:
//   1. Caching the last successful parse 6 h in Redis with a `fetchedAt`
//      timestamp surfaced in the TMA.
//   2. Returning a parser-failure flag distinguishable from a fetch
//      failure so the UI can show "couldn't parse — visit NEA directly"
//      without claiming there are zero closures.
//   3. Permissive heuristic: any <table> within the page main body is
//      parsed; we then partition by header text containing "closure"
//      vs "R&R" vs other.

const axios = require('axios');
const cheerio = require('cheerio');

const ANNOUNCEMENTS_URL = 'https://www.nea.gov.sg/our-services/hawker-management/announcements';
const HAWKER_HOME_URL = 'https://www.nea.gov.sg/our-services/hawker-management';
const SCRAPE_CACHE_KEY = 'nea:hawker-scrape:v1';
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
    const { data } = await axios.get(ANNOUNCEMENTS_URL, {
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
      sourceUrl: ANNOUNCEMENTS_URL,
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
      sourceUrl: ANNOUNCEMENTS_URL,
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

module.exports = {
  ANNOUNCEMENTS_URL,
  HAWKER_HOME_URL,
  SCRAPE_CACHE_KEY,
  SCRAPE_CACHE_TTL_S,
  fetchAndParse,
  getCachedOrFetch
};
