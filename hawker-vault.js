// hawker-vault.js — v0.49.0 canonical 125-hawker-centre vault.
//
// Source: NEA's master list PDF
//   https://www.nea.gov.sg/docs/default-source/hawker-centres-documents/list-of-hcs_-25-july-2025.pdf
// 125 centres as of 25 July 2025. Updated quarterly by NEA.
//
// Why a vault: the v0.48.x scrape + LLM web_search paths return centre
// names that may be mistyped, abbreviated, or hallucinated (LLM fallback).
// Cross-referencing against the canonical 125 lets us:
//   • drop fakes / duplicates,
//   • normalise names to the NEA spelling,
//   • build precise Maps URLs anchored to the official address (not just
//     `<name> + Singapore` which is what googleMapsSearchUrl currently does).
//
// Runtime model:
//   • First call fetches the PDF, parses with pdf-parse, caches to Redis
//     (30-day TTL). Subsequent calls hit cache.
//   • Sandbox can't reach NEA — so this module is no-op in dev (returns
//     []). Production (Railway) hits NEA freely.
//   • Failures are non-fatal — callers fall back to the v0.48.x behaviour.

const axios = require('axios');
const pdfParse = require('pdf-parse');

const PDF_URL = 'https://www.nea.gov.sg/docs/default-source/hawker-centres-documents/list-of-hcs_-25-july-2025.pdf';
const VAULT_CACHE_KEY = 'nea:hawker-vault:v1';
const VAULT_CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days
const FETCH_TIMEOUT_MS = 20000;

// Parse the raw PDF text into structured records.
//
// Heuristic — the NEA PDF lays out centres in a numbered list:
//   1. Adam Road Food Centre
//      2 Adam Road, Singapore 289876
//   2. Albert Centre Market & Food Centre
//      270 Queen Street, Singapore 180270
//   ...
//
// Each record spans 2 lines. Postal pattern: "Singapore <6-digit>".
// We scan for the postal code first (most reliable anchor), then walk
// backwards to find the centre name + address.
function parsePdfText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const centres = [];
  // Pattern: line ending in "Singapore <postal>" is the address line.
  const postalLineRe = /Singapore\s+(\d{6})\s*$/i;
  // Numbered prefix pattern at start of name line.
  const numberedRe = /^(\d{1,3})\.\s*(.+?)\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(postalLineRe);
    if (!m) continue;
    const postal = m[1];
    // Address may be the same line (with name appearing on prior line),
    // or split across two lines. Look up to 2 lines back for the name.
    let name = null;
    let address = null;
    let nameIdx = -1;
    for (let j = 1; j <= 3 && i - j >= 0; j++) {
      const candidate = lines[i - j];
      const nm = candidate.match(numberedRe);
      if (nm) {
        name = nm[2].trim();
        nameIdx = i - j;
        // Address = lines between the numbered line and the postal line,
        // joined with comma. If no intermediate line, the postal line itself
        // contains the address.
        if (i - nameIdx === 1) {
          address = line.trim();
        } else {
          address = lines.slice(nameIdx + 1, i + 1).join(', ');
        }
        break;
      }
    }
    if (name && address) {
      centres.push({
        name: name.replace(/\s{2,}/g, ' ').trim(),
        address: address.replace(/\s{2,}/g, ' ').trim(),
        postal
      });
    }
  }
  // Dedupe by postal (PDF sometimes repeats records in section breaks).
  const seen = new Set();
  return centres.filter((c) => {
    if (seen.has(c.postal)) return false;
    seen.add(c.postal);
    return true;
  });
}

async function fetchAndParsePdf() {
  const t0 = Date.now();
  const { data } = await axios.get(PDF_URL, {
    timeout: FETCH_TIMEOUT_MS,
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; soleat-bot/0.49; +https://gia4lunch-production.up.railway.app)',
      'Accept': 'application/pdf,*/*'
    },
    maxContentLength: 10 * 1024 * 1024
  });
  const parsed = await pdfParse(Buffer.from(data));
  const centres = parsePdfText(parsed.text);
  return {
    ok: centres.length > 0,
    fetchedAt: Date.now(),
    ms: Date.now() - t0,
    sourceUrl: PDF_URL,
    centres,
    diagnostics: {
      pdfBytes: data.byteLength || data.length,
      textChars: parsed.text?.length || 0,
      pageCount: parsed.numpages || 0,
      centresParsed: centres.length
    }
  };
}

async function getAllCentres(redis) {
  if (redis) {
    try {
      const raw = await redis.get(VAULT_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, cached: true };
      }
    } catch (err) {
      console.warn('[HawkerVault] cache read failed:', err.message);
    }
  }
  let result;
  try {
    result = await fetchAndParsePdf();
  } catch (err) {
    return {
      ok: false,
      error: `fetch/parse failed: ${err.message?.slice(0, 200)}`,
      fetchedAt: Date.now(),
      centres: []
    };
  }
  if (result.ok && redis) {
    try {
      await redis.set(VAULT_CACHE_KEY, JSON.stringify({ ...result, cached: false }), { EX: VAULT_CACHE_TTL_S });
    } catch (err) {
      console.warn('[HawkerVault] cache write failed:', err.message);
    }
  }
  return { ...result, cached: false };
}

// Normalise a name for fuzzy matching. Lowercases, strips
// "Centre"/"Center"/"Market"/"Food" filler that NEA uses inconsistently
// across its scrape page vs PDF, drops punctuation.
function normaliseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.,()/\\-]/g, ' ')
    .replace(/\b(centre|center|market|food|hawker|complex|cooked)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance — small (≤30 chars typical), so the O(n*m) is fine.
function editDistance(a, b) {
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// Find best match in `centres` for `query`. Returns
// { centre, score (0-1), distance } or null when no acceptable match.
// Acceptable: substring match OR edit distance ≤ 25% of max length.
function findByName(centres, query) {
  if (!Array.isArray(centres) || !centres.length || !query) return null;
  const qn = normaliseName(query);
  if (!qn) return null;
  let best = null;
  for (const c of centres) {
    const cn = normaliseName(c.name);
    if (!cn) continue;
    if (cn === qn) return { centre: c, score: 1, distance: 0 };
    // Substring match (either direction) is high-confidence.
    if (cn.includes(qn) || qn.includes(cn)) {
      const score = Math.min(qn.length, cn.length) / Math.max(qn.length, cn.length);
      if (!best || score > best.score) best = { centre: c, score, distance: 0 };
      continue;
    }
    const d = editDistance(qn, cn);
    const maxLen = Math.max(qn.length, cn.length);
    if (maxLen === 0) continue;
    const ratio = 1 - d / maxLen;
    if (ratio >= 0.75 && (!best || ratio > best.score)) {
      best = { centre: c, score: ratio, distance: d };
    }
  }
  return best;
}

// Build a Maps URL anchored to the centre's address (much more
// precise than `<name> + Singapore` which can hit other places).
function mapsUrlForCentre(centre) {
  if (!centre) return '';
  const query = `${centre.name}, ${centre.address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Convenience: enrich an arbitrary list of centre-name strings with
// vault data. Returns array of { input, match: {centre, score} | null }.
function annotateNames(centres, names) {
  if (!Array.isArray(names)) return [];
  return names.map((n) => ({ input: n, match: findByName(centres, n) }));
}

module.exports = {
  PDF_URL,
  VAULT_CACHE_KEY,
  VAULT_CACHE_TTL_S,
  fetchAndParsePdf,
  getAllCentres,
  parsePdfText,
  normaliseName,
  editDistance,
  findByName,
  mapsUrlForCentre,
  annotateNames
};
