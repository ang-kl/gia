#!/usr/bin/env node
// fetch-mrt-station-names.mjs — regenerate web/_shared/lib/mrt-stations-i18n.generated.js
// from Government Terms Translated (gov.sg).
//
//   node scripts/fetch-mrt-station-names.mjs
//
// FREE. This is a public, unauthenticated, read-only government lookup — no key, no
// quota, no spend. It is the opposite of the paid translation path the rest of this
// repo's i18n corpora are barred from using, which is the whole reason it is worth having.
//
// HOW THE ENDPOINT WAS FOUND, because the obvious route does not work: the results table
// is NOT in the page HTML. `<div class="filter-result">` ships empty and jQuery fills it
// after load, so saving the page source gets you zero station names. The endpoint is
// inside /Mvc/Scripts/ComSearchTerm/search-term.js.
//
// THREE THINGS THAT MAKE THIS TWO CALLS INSTEAD OF TWENTY:
//   · PageSize is client-supplied. The site sends 10 (hence 20 pages of 195); the server
//     honours up to 100. Asking for 1000 returns 100, so the cap is real and server-side.
//   · One response carries ALL FOUR languages in `TransTranslations`. `LanguageTo` only
//     changes what the page renders, not what the API returns — so there is no reason to
//     fetch once per language.
//   · Values come back HTML-entity encoded (`&#28023;` = 海). Anything that skips
//     decoding stores mojibake that looks like data.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web/_shared/lib/mrt-stations-i18n.generated.js');
const BASE = 'https://www.translatedterms.gov.sg';
const CATEGORY_MRT_LRT = '012db1a7-6fd2-4b2a-9393-c3fb42ca8586'; // GET /admin/api/categories
const LANG = { 2: 'zh', 3: 'ms', 4: 'ta' };
const PAGE_SIZE = 100; // server cap; larger is silently clamped
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: `${BASE}/`,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
};

// Minimal, deliberate: only the five named entities plus numeric refs actually seen in
// this feed. A general-purpose unescaper is a bigger surface than the data needs.
const decode = (s) => String(s || '')
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function page(n) {
  const body = new URLSearchParams();
  body.set('Page', String(n));
  body.set('PageSize', String(PAGE_SIZE));
  body.set('LanguageFrom', '1');
  body.set('LanguageTo', '2');
  body.append('Categories[]', CATEGORY_MRT_LRT);
  body.set('SearchTerm', '');
  const res = await fetch(`${BASE}/admin/api/Search`, { method: 'POST', headers: HEADERS, body });
  if (!res.ok) throw new Error(`page ${n}: HTTP ${res.status}`);
  return (await res.json()).result;
}

const first = await page(1);
const total = first.TotalItems;
const items = [...first.Items];
for (let p = 2; items.length < total; p += 1) {
  const r = await page(p);
  if (!r.Items?.length) break;
  items.push(...r.Items);
}
// Fail loudly rather than regenerate a short file: a truncated fetch that overwrites a
// complete table is the failure this whole repo keeps re-learning.
if (items.length !== total) throw new Error(`fetched ${items.length} of ${total} — refusing to write a partial table`);

const strip = (s) => String(s).replace(/\s+(MRT|LRT)\s+Station$/i, '').trim();
// Two rows in this category are LINE names, not stations, filed wrong at source.
// Excluded BY NAME so the exclusion is visible in a diff, never by a pattern that could
// also drop a real station.
const NOT_STATIONS = new Set(['East-West Line (EWL)', 'North-South Line (EWL)']);

const seen = new Map();
for (const it of items) {
  const en = decode(it.Name);
  if (NOT_STATIONS.has(en)) continue;
  const row = { n: strip(en), k: /LRT/i.test(en) ? 'LRT' : 'MRT', zh: '', ms: '', ta: '' };
  for (const t of it.TransTranslations || []) {
    const k = LANG[t.Language];
    if (k) row[k] = decode(t.Name);
  }
  seen.set(row.n, row);
}
const rows = [...seen.values()].sort((a, b) => a.n.localeCompare(b.n));

const blank = rows.filter((r) => !r.zh || !r.ms || !r.ta);
if (blank.length) console.warn(`WARNING: ${blank.length} rows missing a language:`, blank.map((r) => r.n));

const header = fs.readFileSync(OUT, 'utf8').split('export const SG_STATION_NAMES_I18N')[0];
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const body = rows.map((r) => `  { n: "${esc(r.n)}", k: "${r.k}", zh: "${esc(r.zh)}", ms: "${esc(r.ms)}", ta: "${esc(r.ta)}" },`).join('\n');
const tail = fs.readFileSync(OUT, 'utf8').split(/^\];$/m).slice(1).join('];');
fs.writeFileSync(OUT, `${header}export const SG_STATION_NAMES_I18N = [\n${body}\n];${tail}`);
console.log(`wrote ${rows.length} stations (${total} source rows, ${total - rows.length} excluded as non-stations) → ${path.relative(ROOT, OUT)}`);
console.log('NOTE: the header comment carries a `fetched` date — update it by hand.');
