// scripts/build-hawker-closures.js — v0.62.595
//
// One-time transform: NEA "Dates of Hawker Centres Closure" CSV → the committed,
// reviewable data/hawker-closures.json that hawker-vault.js merges onto each
// centre (mirrors scripts/fetch-hawker-stalls.js → data/hawker-stalls.json).
//
//   node scripts/build-hawker-closures.js
//
// Source: data/hawker-cleaning-closures-2026.csv (snapshot 18 Jul 2026).
// Output: data/hawker-closures.json, keyed by the CSV's centre `name` (the vault
// re-keys via _normaliseHawkerName, so formal NEA names reconcile with the vault):
//   { "<name>": { cleaning:[{start,end}], renovation:[{start,end}],
//                 foodStalls, marketStalls, status, isNew } }
// Dates are ISO 'YYYY-MM-DD'; the client shows a tab only when TODAY is in a window.

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'hawker-cleaning-closures-2026.csv');
const OUT_PATH = path.join(__dirname, '..', 'data', 'hawker-closures.json');

// Minimal RFC4180-ish CSV parser (description_myenv carries commas/quotes/doubled-quotes).
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// "30/3/2026" → "2026-03-30". NA/nil/'' → null.
function toISO(d) {
  const s = String(d || '').trim();
  if (!s || /^(na|nil)$/i.test(s)) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// v0.62.596 — other_works splits into REDEVELOPMENT (long-term rebuild) vs
// RENOVATION (repairs / redecoration / works), each its own tab/pin colour
// (operator). Neither counts a "commence operations" new-opening note.
function isRedevelopment(remarks) {
  const r = String(remarks || '').toLowerCase();
  if (!r || /^(na|nil)$/.test(r)) return false;
  if (/commence.*operation/.test(r)) return false;
  return /redevelop/.test(r);
}
function isRenovation(remarks) {
  const r = String(remarks || '').toLowerCase();
  if (!r || /^(na|nil)$/.test(r)) return false;
  if (/commence.*operation/.test(r)) return false;
  if (/redevelop/.test(r)) return false;   // → redevelopment, not renovation
  return /repair|redecorat|renovat|\bworks\b|gas works/.test(r);
}

// v0.62.914 — PARTIALLY OPEN. A closure window says the centre is shut; the remark beside it
// sometimes says only PART of it is.
//
// Measured across the 123 rows: 7 non-nil `remarks_qN` cells, on exactly two centres, plus one
// `remarks_other_works`. Small, and wrong in the direction that matters — the card told a reader
// a place was closed while half of it was trading:
//
//   Haig Road Blk 13/14, Q4: the window runs 30 Nov → 3 Dec, four days. The remark says
//   "Blk 13 closed from 30/11 to 1/12, Blk 14 closed from 2/12 to 3/12" — so something is open on
//   every one of those four days and the centre is never fully shut.
//
//   Bendemeer Blk 29: "Only Cooked Food Section is closed for Gas Works. Market is open and
//   business as usual." — classified as a renovation, so the card read "Under Renovation" for a
//   centre whose market was trading.
//
// ⚠ "BOTH CLOSED" IS NOT PARTIAL, and that distinction is the whole reason this is a parser and
// not a regex for the word "Blk". Circuit Road's Q2 remark reads "Both closed from 22 June to 23
// June 2026" — same shape, same centre, opposite meaning. Treating any per-block remark as partial
// would mark that window open when the place really is shut, which is the worse error of the two.
function partialFrom(remarks) {
  const raw = String(remarks || '').trim();
  if (!raw || /^(na|nil)$/i.test(raw)) return null;
  const r = raw.toLowerCase();
  // Explicitly whole-centre, however the blocks are named.
  if (/\bboth\b[^.]*clos/.test(r)) return null;
  // Something is stated to remain open.
  const staysOpen = /\bis open\b|\bopen\b[^.]*\bas usual\b|\bonly\b[^.]*\bclos/.test(r);
  // Two or more separately-dated blocks.
  const blockMentions = (r.match(/\bblk\s*\d+[a-z]?/g) || []).length;
  if (!staysOpen && blockMentions < 2) return null;
  return raw;                 // NEA's own words; the card renders them verbatim
}

// Exported so __tests__/hawker-closure-card.test.js can exercise the PARSER rather than only its
// output on today's 123 rows. That distinction has teeth: a mutation deleting the "both closed"
// guard SURVIVED a data-only test, because NEA's current phrasing ("Both closed from 22 June to 23
// June 2026") names no blocks and is already rejected by the two-block floor. The guard is real
// defence for a phrasing NEA has not used YET — "Blk 79 and Blk 79A both closed on 30/3" — and
// only a direct test can hold it.
module.exports = { partialFrom, isRedevelopment, isRenovation, toISO };

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const header = rows.shift().map((h) => h.trim());
  const col = (n) => header.indexOf(n);
  const out = {};
  for (const r of rows) {
    const name = (r[col('name')] || '').trim();
    if (!name) continue;
    const cleaning = [];
    for (const q of [1, 2, 3, 4]) {
      const start = toISO(r[col(`q${q}_cleaningstartdate`)]);
      const end = toISO(r[col(`q${q}_cleaningenddate`)]);
      if (!start || !end) continue;
      // v0.62.914 — the remark beside the dates, when it says only part of the centre shuts.
      const partial = partialFrom(r[col(`remarks_q${q}`)]);
      cleaning.push(partial ? { start, end, partial } : { start, end });
    }
    const renovation = [];
    const redevelopment = [];
    const owStart = toISO(r[col('other_works_startdate')]);
    const owEnd = toISO(r[col('other_works_enddate')]);
    const owRemarks = r[col('remarks_other_works')];
    if (owStart && owEnd) {
      const owPartial = partialFrom(owRemarks);
      const win = owPartial ? { start: owStart, end: owEnd, partial: owPartial } : { start: owStart, end: owEnd };
      if (isRedevelopment(owRemarks)) redevelopment.push(win);
      else if (isRenovation(owRemarks)) renovation.push(win);
    }
    // v0.62.596 — carry the NEA lat/lng so the vault can place coord-less centres
    // (e.g. Bukit Timah, redevelopment, absent from hawker-coords.json) on the map.
    const lat = parseFloat(r[col('latitude_hc')]);
    const lng = parseFloat(r[col('longitude_hc')]);
    const status = (r[col('status')] || '').trim();
    const food = parseInt(r[col('no_of_food_stalls')], 10);
    const market = parseInt(r[col('no_of_market_stalls')], 10);
    // v0.62.912 — NEA's own prose profile of the centre: built year, size, character and
    // signature dishes, e.g. "Built in 1974, Adam Food Centre comprises 32 cooked food stalls.
    // Although small in size, the hawker centre has a huge reputation…". Populated for all 123
    // rows (median 238 chars) and, until now, dropped on the floor here — the card had no answer
    // to "what IS this place" and `status` gave it only "Existing", which 108 of 123 share.
    // Whitespace is squeezed because the source has double spaces after full stops.
    const description = (r[col('description_myenv')] || '').replace(/\s+/g, ' ').trim();
    // v0.62.914 — NEA's own photo of the centre, present on all 123 rows. Carried as the URL
    // only; nothing is downloaded or re-hosted, so the image loads from NEA at view time and
    // this repo stores no third-party binary.
    //
    // ⚠ 88 OF THE 123 URLS ARE http://, AND THE MINI APP IS SERVED OVER HTTPS — a browser blocks
    // those as mixed content, so most photos would silently fail to load. Every one is on
    // www.nea.gov.sg and that host serves the same paths over TLS: four of the http URLs were
    // fetched over https before this line was written and all returned 200. So the scheme is
    // upgraded, not hoped about. The host is pinned because rewriting the scheme on an ARBITRARY
    // host would be a guess about someone else's server.
    const photoRaw = (r[col('photourl')] || '').trim();
    const photo = /^http:\/\/www\.nea\.gov\.sg\//i.test(photoRaw)
      ? photoRaw.replace(/^http:/i, 'https:') : photoRaw;
    // Postal from address_myenv ("…, Singapore 289876") — the reliable join key
    // (name-folding alone misses ~70% because the CSV re-orders block/street tokens).
    const addr = (r[col('address_myenv')] || '').trim();
    const pm = addr.match(/(\d{6})\s*$/) || addr.match(/singapore\s+(\d{6})/i);
    out[name] = {
      postal: pm ? pm[1] : null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      cleaning,
      renovation,
      redevelopment,
      foodStalls: Number.isFinite(food) ? food : null,
      marketStalls: Number.isFinite(market) ? market : null,
      status: status || null,
      isNew: /\(new\)/i.test(status),
      description: description || null,
      photo: /^https:\/\//i.test(photo) ? photo : null,   // https only — see above
    };
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 0) + '\n');
  const n = Object.keys(out).length;
  const withClean = Object.values(out).filter((v) => v.cleaning.length).length;
  const withReno = Object.values(out).filter((v) => v.renovation.length).length;
  const withRedev = Object.values(out).filter((v) => v.redevelopment.length).length;
  console.log(`wrote ${OUT_PATH}: ${n} centres, ${withClean} cleaning, ${withReno} renovation, ${withRedev} redevelopment`);
}

main();
