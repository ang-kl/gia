#!/usr/bin/env node
// scripts/build-airport-names.js — v0.62.975. Spec: doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md, C11, I13.
//
// Builds data/airport-names.json, the table fr24.js uses to name the airports on the movements board, from
// OurAirports' airports.csv (https://ourairports.com/data/ — "All data is released to the Public Domain", read
// 01-11 '26). FR24's own airport lookup costs a credit and a request per airport, and Explorer allows 10 requests a
// minute, so a 20-row board could not name its rows that way.
//
// Kept: airports with scheduled service AND an ICAO code. Each is ICAO → { n: name, i: IATA, c: city }, in English as
// OurAirports writes them. Nothing is guessed: a code missing from the table is shown as the code itself.
//
// The 12.7 MB CSV is NOT committed. OurAirports updates it daily, so a rebuild tomorrow can differ; `_meta` records the
// source file's sha256 and the download date so the table says which file it came from.
//
//   curl -sSo /tmp/airports.csv https://davidmegginson.github.io/ourairports-data/airports.csv
//   node scripts/build-airport-names.js /tmp/airports.csv --date 2026-11-05

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUT = path.join(__dirname, '..', 'data', 'airport-names.json');

// RFC 4180: quoted fields may hold commas, doubled quotes and newlines. airports.csv has all three in places, so a
// split on ',' would shift columns (the hawker CSV taught this one: v0.62.927).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const ICAO = /^[A-Z0-9]{4}$/;
const IATA = /^[A-Z0-9]{3}$/;

// The filter, exported so the test can call it on sample rows (I13).
function keepRow(r) {
  if (!r || r.scheduled_service !== 'yes') return false;
  return ICAO.test(String(r.icao_code || '').trim());
}

function entryOf(r) {
  const e = { n: String(r.name || '').trim() };
  const iata = String(r.iata_code || '').trim();
  if (IATA.test(iata)) e.i = iata;
  const city = String(r.municipality || '').trim();
  if (city) e.c = city;
  return e;
}

function buildTable(csvText, { downloaded = null } = {}) {
  const rows = parseCsv(csvText);
  const head = rows.shift();
  if (!head || !head.includes('icao_code') || !head.includes('scheduled_service')) {
    throw new Error('airports.csv: header is missing icao_code or scheduled_service');
  }
  const airports = {};
  for (const cells of rows) {
    const r = {};
    head.forEach((h, k) => { r[h] = cells[k]; });
    if (!keepRow(r)) continue;
    const code = r.icao_code.trim();
    if (!airports[code]) airports[code] = entryOf(r);
  }
  const sorted = {};
  for (const k of Object.keys(airports).sort()) sorted[k] = airports[k];
  return {
    _meta: {
      source: 'OurAirports airports.csv (Public Domain)',
      url: SOURCE_URL,
      sha256: crypto.createHash('sha256').update(csvText).digest('hex'),
      downloaded,
      kept: 'scheduled_service = yes and a 4-character icao_code',
      count: Object.keys(sorted).length,
      fields: { n: 'name', i: 'IATA code', c: 'city (municipality)' },
    },
    airports: sorted,
  };
}

module.exports = { parseCsv, keepRow, entryOf, buildTable, SOURCE_URL };

if (require.main === module) {
  const src = process.argv[2];
  const di = process.argv.indexOf('--date');
  const downloaded = di > 0 ? process.argv[di + 1] : null;
  if (!src || !downloaded || !/^\d{4}-\d{2}-\d{2}$/.test(downloaded)) {
    console.error('usage: node scripts/build-airport-names.js <airports.csv> --date YYYY-MM-DD');
    process.exit(2);
  }
  const table = buildTable(fs.readFileSync(src, 'utf8'), { downloaded });
  if (!table.airports.WSSS || !table.airports.WSSL) throw new Error('WSSS or WSSL missing: refusing to write');
  fs.writeFileSync(OUT, JSON.stringify(table) + '\n');
  console.log(`wrote ${OUT}: ${table._meta.count} airports, sha256 ${table._meta.sha256}`);
}
