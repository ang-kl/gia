// hawker-vault.js — v0.50.0 canonical hawker-centre vault from MD file.
//
// Source: data/list-of-hawker-centres.md (123 centres, snapshot 25 Jul 2025).
// The MD file is committed to the repo, so no network fetch needed —
// reads from disk at module load, parses once, cached in memory.
//
// Why MD over PDF (v0.49.0 → v0.50.0): the MD file is human-editable,
// reviewable in PR diffs, and doesn't need pdf-parse. Plus we get
// region segmentation (north/south/east/west/central) for free since
// each row carries an address + postal code.
//
// Schema per centre:
//   { sno, name, address, postal, region, mapsUrl, mgmt, isNew }
//
// Regions (URA-inspired 5-zone split):
//   • Central:  Orchard, Newton, Novena, Toa Payoh, Bukit Timah, etc.
//   • South:    CBD/Tanjong Pagar/Outram/Tiong Bahru/Telok Blangah
//   • East:     Bedok, Tampines, Pasir Ris, Marine Parade, Geylang
//   • North:    Yishun, Woodlands, Sembawang, Hougang, Sengkang,
//               Punggol, AMK, Bishan, Serangoon (incl. Northeast)
//   • West:     Jurong, Clementi, Bukit Batok, Bukit Panjang,
//               Holland, Pasir Panjang, West Coast, Queenstown

const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, 'data', 'list-of-hawker-centres.md');
const REGIONS = ['Central', 'South', 'East', 'North', 'West'];

// Geography-keyword → region. Strong-signal place names that override
// the postal-sector heuristic. Order matters — first match wins.
const REGION_KEYWORDS = [
  ['East', /\b(bedok|tampines|pasir ris|changi|loyang|marine parade|katong|joo chiat|amber|haig|dunman|east coast|geylang serai|geylang bahru|eunos|kembangan|paya lebar|aljunied|sims|jalan eunos|kallang|old airport|ubi)\b/],
  ['North', /\b(yishun|woodlands|sembawang|marsiling|admiralty|canberra|mandai|kranji|sungei kadut|hougang|serangoon|sengkang|punggol|anchorvale|compassvale|buangkok|fernvale|kovan|chomp chomp|ang mo kio|amk|bishan|braddell|seletar|defu|sembawang hills|thomson)\b/],
  ['West', /\b(jurong|clementi|bukit batok|boon lay|choa chu kang|pioneer|tuas|lakeside|bukit panjang|senja|tengah|teban|hillview|west coast|pasir panjang|holland|ghim moh|buona vista|dover|queenstown|commonwealth|tanglin halt|margaret drive|empress|alexandra|mei chin)\b/],
  ['South', /\b(tanjong pagar|chinatown|outram|marina|anson|raffles|cecil|shenton|amoy|telok ayer|maxwell|club street|tiong bahru|bukit merah|telok blangah|harbourfront|redhill|henderson|cantonment|new market|smith street|hong lim|people'?s park|jalan kukoh|havelock|beo crescent|bukit purmei|kreta ayer)\b/],
  ['Central', /\b(orchard|newton|novena|toa payoh|adam|cluny|stevens|farrer|whampoa|balestier|moulmein|macpherson|cambridge|jalan besar|tekka|little india|bras basah|bugis|beach road|north bridge|city hall|bendemeer|berseh|crawford|rochor|sungei road|tanglin(?! halt)|nassim|grange|bukit timah(?! market))\b/]
];

// Postal-sector fallback (first 2 digits of 6-digit code).
function regionFromPostalSector(postal) {
  const sector = parseInt(String(postal || '').slice(0, 2), 10);
  if (!Number.isFinite(sector)) return null;
  if (sector >= 1 && sector <= 8) return 'South';
  if (sector >= 9 && sector <= 10) return 'South';
  if (sector >= 11 && sector <= 13) return 'West';
  if (sector >= 14 && sector <= 16) return 'South';
  if (sector >= 17 && sector <= 23) return 'Central';
  if (sector >= 24 && sector <= 30) return 'Central';
  if (sector >= 31 && sector <= 37) return 'Central';
  if (sector >= 38 && sector <= 52) return 'East';
  if (sector >= 53 && sector <= 57) return 'North';
  if (sector >= 58 && sector <= 71) return 'West';
  if (sector >= 72 && sector <= 80) return 'North';
  if (sector >= 81 && sector <= 82) return 'East';
  return null;
}

function regionForCentre(centre) {
  const text = `${centre.name || ''} ${centre.address || ''}`.toLowerCase();
  for (const [region, re] of REGION_KEYWORDS) {
    if (re.test(text)) return region;
  }
  return regionFromPostalSector(centre.postal) || 'Central';
}

// Parse the MD file's two markdown tables (Markets/Hawker Centres + New
// Hawker Centres) into a flat list. Tolerates the "# tenancies" footnote
// marker on names. Skips closed centres without addresses.
function parseMd(md) {
  if (!md) return [];
  const out = [];
  const lines = md.split(/\r?\n/);
  let inTable = false;
  let isNewSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Section heading detect
    if (/^##\s+New Hawker Centres/i.test(line)) {
      isNewSection = true;
      inTable = false;
      continue;
    }
    if (/^##\s+Markets/i.test(line)) {
      isNewSection = false;
      inTable = false;
      continue;
    }
    // Table row detection: starts with "|" and has at least 3 pipes.
    if (line.startsWith('|') && (line.match(/\|/g) || []).length >= 4) {
      const cells = line.split('|').map((s) => s.trim());
      // Drop leading/trailing empty cells from "| ... |" form.
      const trimmed = cells.slice(1, -1);
      // Skip header row + separator row (---).
      if (/^---+$|^-+:?$|^:?-+:?$/.test(trimmed[0] || '')) { inTable = true; continue; }
      if (/^s\/?no$/i.test(trimmed[0] || '')) continue;
      const sno = parseInt(trimmed[0], 10);
      if (!Number.isFinite(sno)) continue;
      const rawName = String(trimmed[1] || '').trim();
      const address = String(trimmed[2] || '').trim();
      const mgmt = String(trimmed[3] || '').trim();
      // Skip closed centres (Bukit Timah Market — address says "Closed for redevelopment").
      if (/closed for redevelopment/i.test(address)) continue;
      // Strip the "#" footnote marker from the name.
      const name = rawName.replace(/\s*#\s*$/, '').replace(/\s+/g, ' ').trim();
      // Postal: pull "S(NNNNNN)" or "S(NNNNNN/NNNNNN)" — keep the first 6-digit code.
      const m = address.match(/S\((\d{6})/);
      const postal = m ? m[1] : null;
      const centre = { sno, name, address, postal, mgmt, isNew: isNewSection };
      centre.region = regionForCentre(centre);
      centre.mapsUrl = mapsUrlForCentre(centre);
      out.push(centre);
    }
  }
  return out;
}

function mapsUrlForCentre(centre) {
  if (!centre || !centre.name) return '';
  // Use full name + address — Maps resolves to the centre much more
  // reliably than "<name> Singapore" alone.
  const query = centre.address
    ? `${centre.name}, ${centre.address}`
    : `${centre.name} Singapore`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Module-load cache. The MD file lives in the repo so a single read
// at process start is fine — no Redis, no TTL, no async.
let _allCentres = null;
let _byRegion = null;
function loadAll() {
  if (_allCentres) return _allCentres;
  try {
    const md = fs.readFileSync(MD_PATH, 'utf8');
    _allCentres = parseMd(md);
  } catch (err) {
    console.warn('[HawkerVault] MD load failed:', err.message);
    _allCentres = [];
  }
  return _allCentres;
}

function getAllCentres() {
  return loadAll();
}

function getByRegion(region) {
  if (!_byRegion) {
    _byRegion = {};
    for (const r of REGIONS) _byRegion[r] = [];
    for (const c of loadAll()) {
      if (_byRegion[c.region]) _byRegion[c.region].push(c);
    }
    for (const r of REGIONS) {
      _byRegion[r].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    }
  }
  if (!region) return _byRegion;
  return _byRegion[region] || [];
}

// Format a single region's centres as a Telegram-friendly Markdown
// list. Each line: "1. *Name* — [📍 Maps](url)\n   address". Capped
// to fit Telegram's 4096-char message limit.
function formatRegionList(region) {
  const list = getByRegion(region);
  if (!Array.isArray(list) || !list.length) return `_No hawker centres found in ${region}._`;
  const lines = [`*${region} — ${list.length} hawker centres* (alphabetical)\n`];
  list.forEach((c, i) => {
    lines.push(`${i + 1}. *${c.name}*${c.isNew ? ' 🆕' : ''}`);
    if (c.address) lines.push(`   ${c.address}`);
    if (c.mapsUrl) lines.push(`   📍 ${c.mapsUrl}`);
  });
  let out = lines.join('\n');
  if (out.length > 3800) out = out.slice(0, 3700) + '\n\n_…truncated; ' + (list.length) + ' total in this region._';
  return out;
}

function formatRegionSummary() {
  const by = getByRegion();
  const total = loadAll().length;
  const parts = REGIONS.map((r) => `*${r}*: ${by[r]?.length || 0}`);
  return `🍚 *${total} hawker centres* (snapshot 25 Jul 2025)\n\n${parts.join(' · ')}`;
}

// ---------- v0.49.0 fuzzy-match helpers (kept for nea-scrape consumers) ----------

function normaliseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.,()/\\-]/g, ' ')
    .replace(/\b(centre|center|market|food|hawker|complex|cooked)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function findByName(centresOrQuery, maybeQuery) {
  // Backward-compat: callers can pass (centresArray, query) OR just (query)
  // where centres are loaded from the vault automatically.
  let centres, query;
  if (Array.isArray(centresOrQuery)) { centres = centresOrQuery; query = maybeQuery; }
  else { centres = loadAll(); query = centresOrQuery; }
  if (!Array.isArray(centres) || !centres.length || !query) return null;
  const qn = normaliseName(query);
  if (!qn) return null;
  let best = null;
  for (const c of centres) {
    const cn = normaliseName(c.name);
    if (!cn) continue;
    if (cn === qn) return { centre: c, score: 1, distance: 0 };
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

function annotateNames(centresOrNames, maybeNames) {
  let centres, names;
  if (Array.isArray(maybeNames)) { centres = centresOrNames; names = maybeNames; }
  else { centres = loadAll(); names = centresOrNames; }
  if (!Array.isArray(names)) return [];
  return names.map((n) => ({ input: n, match: findByName(centres, n) }));
}

// Reset module-level cache (for tests).
function _resetCache() {
  _allCentres = null;
  _byRegion = null;
}

module.exports = {
  MD_PATH,
  REGIONS,
  parseMd,
  regionForCentre,
  regionFromPostalSector,
  getAllCentres,
  getByRegion,
  formatRegionList,
  formatRegionSummary,
  mapsUrlForCentre,
  normaliseName,
  editDistance,
  findByName,
  annotateNames,
  _resetCache
};
