// holidays.js — Singapore public-holiday dataset.
//
// Source: data.gov.sg dataset (annual JSON). On boot, fetched and cached
// in Redis for 90 days. Falls back to a hardcoded 2026 array if the API
// is unreachable so the bot never blocks on this dependency.

const axios = require('axios');

const REDIS_KEY = 'sg:public-holidays:2026';
const CACHE_TTL_S = 90 * 24 * 60 * 60;
const FETCH_TIMEOUT_MS = 5000;

// Authoritative MOM 2026 list. Used both as fallback and for boot-warm
// when Redis is empty and data.gov.sg fails.
const FALLBACK_2026 = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Chinese New Year' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-31', name: 'Vesak Day' },
  { date: '2026-03-21', name: 'Hari Raya Puasa' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-08-09', name: 'National Day' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-12-25', name: 'Christmas Day' }
];

const DATA_GOV_URL = 'https://api-open.data.gov.sg/v1/public/api/datasets/d_4e19214c1a6202f87b8a0bfd0ad1b2db/poll-download';

let memoryCache = null;

async function fetchFromDataGov() {
  const headers = process.env.DATA_GOV_SG_API_KEY
    ? { 'x-api-key': process.env.DATA_GOV_SG_API_KEY }
    : {};
  try {
    const meta = await axios.get(DATA_GOV_URL, { headers, timeout: FETCH_TIMEOUT_MS });
    const url = meta.data?.data?.url;
    if (!url) return null;
    const csv = await axios.get(url, { timeout: FETCH_TIMEOUT_MS });
    const rows = parseCsv(csv.data);
    return rows.length ? rows : null;
  } catch (err) {
    console.warn('[Holidays] data.gov.sg fetch failed:', err.message);
    return null;
  }
}

// CSV is `date,day,holiday,...` with header row. We extract date (ISO) +
// holiday name. Tolerant of stray quotes and CRLF.
function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const out = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    if (cells.length < 3) continue;
    const date = cells[0];
    const name = cells[2];
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && name) out.push({ date, name });
  }
  return out;
}

async function warmCache(redis) {
  try {
    if (!redis.isOpen) await redis.connect();
    const cached = await redis.get(REDIS_KEY);
    if (cached) {
      memoryCache = JSON.parse(cached);
      console.log(`[Holidays] ${memoryCache.length} SG PH loaded from cache`);
      return;
    }
    const fetched = await fetchFromDataGov();
    const list = fetched && fetched.length ? fetched : FALLBACK_2026;
    memoryCache = list;
    await redis.set(REDIS_KEY, JSON.stringify(list), { EX: CACHE_TTL_S });
    console.log(`[Holidays] ${list.length} SG PH cached (${fetched ? 'data.gov.sg' : 'fallback'})`);
  } catch (err) {
    console.error('[Holidays] warmCache failed:', err.message);
    memoryCache = FALLBACK_2026;
  }
}

function toIsoDate(d = new Date()) {
  // SGT date string YYYY-MM-DD.
  const sgt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return sgt.toISOString().slice(0, 10);
}

function isPublicHoliday(date = new Date()) {
  const list = memoryCache || FALLBACK_2026;
  const iso = toIsoDate(date);
  return list.find((h) => h.date === iso) || null;
}

function nextPublicHoliday(date = new Date()) {
  const list = memoryCache || FALLBACK_2026;
  const iso = toIsoDate(date);
  return list.filter((h) => h.date >= iso).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

module.exports = { warmCache, isPublicHoliday, nextPublicHoliday, FALLBACK_2026 };
