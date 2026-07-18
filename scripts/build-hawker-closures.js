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

// other_works is a renovation CLOSURE (repairs / redecoration / redevelopment),
// NOT a "commence operations" new-opening note.
function isRenovation(remarks) {
  const r = String(remarks || '').toLowerCase();
  if (!r || /^(na|nil)$/.test(r)) return false;
  if (/commence.*operation/.test(r)) return false;
  return /repair|redecorat|renovat|redevelop|\bworks\b|gas works/.test(r);
}

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
      if (start && end) cleaning.push({ start, end });
    }
    const renovation = [];
    const owStart = toISO(r[col('other_works_startdate')]);
    const owEnd = toISO(r[col('other_works_enddate')]);
    if (owStart && owEnd && isRenovation(r[col('remarks_other_works')])) {
      renovation.push({ start: owStart, end: owEnd });
    }
    const status = (r[col('status')] || '').trim();
    const food = parseInt(r[col('no_of_food_stalls')], 10);
    const market = parseInt(r[col('no_of_market_stalls')], 10);
    // Postal from address_myenv ("…, Singapore 289876") — the reliable join key
    // (name-folding alone misses ~70% because the CSV re-orders block/street tokens).
    const addr = (r[col('address_myenv')] || '').trim();
    const pm = addr.match(/(\d{6})\s*$/) || addr.match(/singapore\s+(\d{6})/i);
    out[name] = {
      postal: pm ? pm[1] : null,
      cleaning,
      renovation,
      foodStalls: Number.isFinite(food) ? food : null,
      marketStalls: Number.isFinite(market) ? market : null,
      status: status || null,
      isNew: /\(new\)/i.test(status),
    };
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 0) + '\n');
  const n = Object.keys(out).length;
  const withClean = Object.values(out).filter((v) => v.cleaning.length).length;
  const withReno = Object.values(out).filter((v) => v.renovation.length).length;
  console.log(`wrote ${OUT_PATH}: ${n} centres, ${withClean} with cleaning windows, ${withReno} with renovation windows`);
}

main();
