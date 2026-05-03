// michelin-scraper.js — v0.52.0 SG-only Michelin Guide scraper.
//
// Pattern based on https://github.com/NicolaFerracin/michelin-stars-restaurants-api
// (cheerio + axios, paginated card extraction).
//
// Sources:
//   STARRED_URL — Michelin-starred SG restaurants (1★ / 2★ / 3★)
//   BIB_URL     — Bib Gourmand SG (good food at moderate prices)
//
// Cache: 24 h Redis. Module-load memo for the same Node process.
// Resilience: when cheerio returns 0 cards (selectors drift), the
// caller can fall back to Anthropic web_fetch with a structured prompt.

const axios = require('axios');
const cheerio = require('cheerio');

const STARRED_URL = 'https://guide.michelin.com/en/sg-region/restaurants/all-starred';
const BIB_URL     = 'https://guide.michelin.com/en/sg-region/restaurants/bib-gourmand';
const SCRAPE_CACHE_KEY = 'michelin:sg:v1';
const CACHE_TTL_S = 24 * 60 * 60;
const FETCH_TIMEOUT_MS = 15000;
const RATE_LIMIT_MS = 1500;

// Ferracin's rating-letter map. Michelin's `<i class="fa-michelin-X">`
// classes encode star count via single letters in some templates.
const RATING_MAP = { o: 3, n: 2, m: 1 };

function timeout(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Selectors as of Michelin Guide site at scrape time. If Michelin
// redesigns, these become stale and `parsePage` returns 0 cards —
// callers should detect that and fall back to LLM extraction.
const SELECTORS = {
  cards:     '.card__menu, [class*="restaurant__card"], article',
  rating:    '.distinction-icon, [class*="distinction"]',
  year:      '.card__menu-content--rating>span, [class*="distinction"]>span',
  name:      '.card__menu-content--title>a, h3 a, h2 a',
  link:      '.card__menu-content--title>a, h3 a, h2 a',
  location:  '.card__menu-image--top div, [class*="card__menu-image"] div',
  type:      '.card__menu-image--top div, [class*="card__menu-image"] div'
};

// Try the Ferracin-pattern first; if it returns 0, also probe the
// modern card class list. Either way we return an array of venues.
function parsePage($, sourceLabel = 'starred') {
  const out = [];
  $(SELECTORS.cards).each((_i, el) => {
    const $card = $(el);
    const name = ($card.find(SELECTORS.name).first().text() || '').trim();
    if (!name) return;
    const link = ($card.find(SELECTORS.link).first().attr('href') || '').trim();
    // Rating: Ferracin checks className suffix; modern templates also
    // expose alt text or a data attribute.
    let stars = sourceLabel === 'bib' ? 0 : null;
    const ratingEl = $card.find(SELECTORS.rating).first();
    if (ratingEl.length) {
      const cls = ratingEl.attr('class') || '';
      const last = cls.trim().split(/\s+/).pop() || '';
      if (RATING_MAP[last]) stars = RATING_MAP[last];
      // "fa-michelin-N" / "fa-michelin-M" / etc.
      const match = cls.match(/michelin[-_]?([omn])\b/i);
      if (match && RATING_MAP[match[1].toLowerCase()]) stars = RATING_MAP[match[1].toLowerCase()];
    }
    if (sourceLabel === 'starred' && (stars == null || stars === 0)) stars = 1; // default for all-starred page
    const yearText = ($card.find(SELECTORS.year).first().text() || '').trim();
    const year = parseInt((yearText.match(/(\d{4})/) || [])[1], 10) || null;
    const location = ($card.find(SELECTORS.location).eq(0).text() || '').trim();
    const cuisineType = ($card.find(SELECTORS.type).eq(1).text() || '').trim();
    out.push({
      name,
      stars,
      year,
      location,
      cuisineType,
      link: link.startsWith('http') ? link : (link ? `https://guide.michelin.com${link}` : ''),
      source: sourceLabel
    });
  });
  return out;
}

async function fetchHtml(url) {
  const { data } = await axios.get(url, {
    timeout: FETCH_TIMEOUT_MS,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; soleat-bot/0.52; +https://gia4lunch-production.up.railway.app)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    maxContentLength: 5 * 1024 * 1024
  });
  return String(data || '');
}

// Fetch all pages of a Michelin listing. Pagination URL pattern is
// `<base>/page/<N>`. We probe up to 10 pages or until a page returns 0
// cards (whichever first).
async function fetchAllPages(baseUrl, label) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}/page/${page}`;
    let html;
    try {
      html = await fetchHtml(url);
    } catch (err) {
      // Treat 404 / 410 as end-of-pages. Other errors short-circuit.
      const status = err.response?.status;
      if (status === 404 || status === 410) break;
      throw err;
    }
    const $ = cheerio.load(html);
    const venues = parsePage($, label);
    if (!venues.length) break;
    out.push(...venues);
    await timeout(RATE_LIMIT_MS);
  }
  return out;
}

async function fetchAndParse() {
  const t0 = Date.now();
  // Fetch both lists in series (rate-limit friendly).
  const starred = await fetchAllPages(STARRED_URL, 'starred').catch((err) => {
    console.warn('[Michelin] starred fetch failed:', err.message);
    return [];
  });
  const bib = await fetchAllPages(BIB_URL, 'bib').catch((err) => {
    console.warn('[Michelin] bib fetch failed:', err.message);
    return [];
  });
  // Dedupe by link (some venues appear on both; prefer starred).
  const byKey = new Map();
  for (const v of [...starred, ...bib]) {
    const key = v.link || v.name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, v);
  }
  return {
    ok: byKey.size > 0,
    fetchedAt: Date.now(),
    ms: Date.now() - t0,
    venues: [...byKey.values()],
    diagnostics: {
      starredCount: starred.length,
      bibCount: bib.length,
      dedupedTotal: byKey.size
    }
  };
}

async function getMichelinSG(redis) {
  if (redis) {
    try {
      const raw = await redis.get(SCRAPE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, cached: true };
      }
    } catch (err) {
      console.warn('[Michelin] cache read failed:', err.message);
    }
  }
  let result;
  try {
    result = await fetchAndParse();
  } catch (err) {
    return { ok: false, error: `fetch failed: ${err.message?.slice(0, 200)}`, fetchedAt: Date.now(), venues: [] };
  }
  if (result.ok && redis) {
    try {
      await redis.set(SCRAPE_CACHE_KEY, JSON.stringify({ ...result, cached: false }), { EX: CACHE_TTL_S });
    } catch (err) {
      console.warn('[Michelin] cache write failed:', err.message);
    }
  }
  return { ...result, cached: false };
}

// Format an award stub for /recognised compatibility.
// venue: { name, stars, year, source } → award: { category, level, year }
function venueAsAward(venue) {
  if (!venue) return null;
  if (venue.source === 'bib') {
    return { category: 'bib-gourmand', year: venue.year || null };
  }
  return { category: 'michelin-star', level: venue.stars || 1, year: venue.year || null };
}

module.exports = {
  STARRED_URL,
  BIB_URL,
  SCRAPE_CACHE_KEY,
  CACHE_TTL_S,
  RATING_MAP,
  SELECTORS,
  parsePage,
  fetchAndParse,
  getMichelinSG,
  venueAsAward
};
