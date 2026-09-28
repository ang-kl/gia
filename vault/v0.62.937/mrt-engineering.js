// mrt-engineering.js — v0.51.0 SG MRT engineering-closure schedule.
//
// Source: data/mrt-engineering-closures.md (Human Lead curates).
// Schema: { date, line, direction, type, time, note }
// All entries are SGT.
//
// Why MD over LTA API: LTA TrainServiceAlerts only surfaces TODAY's
// disruptions. Engineering closures are pre-announced (1–4 weeks
// ahead) on SMRT/SBS websites. This file lets the bot show the
// upcoming-7-day list without scraping.

const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, 'data', 'mrt-engineering-closures.md');

const LINE_CODES = ['NSL', 'EWL', 'CCL', 'NEL', 'DTL', 'TEL', 'CGL', 'BPL', 'SLRT', 'PLRT', 'JRL', 'CRL'];
const VALID_TYPES = new Set(['early-closure', 'late-opening', 'closure', 'extension-test']);

// Parse the MD file's pipe-table rows into structured records.
function parseMd(md) {
  if (!md) return [];
  const out = [];
  const lines = md.split(/\r?\n/);
  let inTable = false;
  for (const line of lines) {
    if (!line.startsWith('|')) { inTable = false; continue; }
    if ((line.match(/\|/g) || []).length < 6) continue;
    const cells = line.split('|').map((s) => s.trim()).slice(1, -1);
    // Skip header / separator
    if (/^---+$|^-+:?$|^:?-+:?$/.test(cells[0] || '')) { inTable = true; continue; }
    if (/^date$/i.test(cells[0] || '')) continue;
    const [date, lineCode, direction, type, time, note] = cells;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) continue;
    if (!LINE_CODES.includes((lineCode || '').toUpperCase())) continue;
    out.push({
      date,
      line: lineCode.toUpperCase(),
      direction: direction || '',
      type: VALID_TYPES.has(type) ? type : 'closure',
      time: time || '',
      note: note || ''
    });
  }
  return out;
}

let _cache = null;
function loadAll() {
  if (_cache) return _cache;
  try {
    const md = fs.readFileSync(MD_PATH, 'utf8');
    _cache = parseMd(md);
  } catch (err) {
    console.warn('[MRT-Eng] MD load failed:', err.message);
    _cache = [];
  }
  return _cache;
}

// Get closures within [todayISO, todayISO + days]. todayISO is
// YYYY-MM-DD in SGT.
function upcoming(todayISO, days = 7) {
  const all = loadAll();
  const t0 = new Date(todayISO + 'T00:00:00Z').getTime();
  const tN = t0 + days * 86400000;
  return all
    .filter((c) => {
      const t = new Date(c.date + 'T00:00:00Z').getTime();
      return t >= t0 && t <= tN;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.line.localeCompare(b.line));
}

function todayClosures(todayISO) {
  return loadAll().filter((c) => c.date === todayISO);
}

function _resetCache() { _cache = null; }

module.exports = {
  MD_PATH,
  LINE_CODES,
  VALID_TYPES,
  parseMd,
  loadAll,
  upcoming,
  todayClosures,
  _resetCache
};
