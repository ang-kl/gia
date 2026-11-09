// scripts/fetch-mrt-line-names.mjs — regenerates web/_shared/lib/mrt-lines-i18n.generated.js
//
// Sibling of fetch-mrt-station-names.mjs, which fetches the SAME category and throws these
// two rows away. They are not stations, so they do not belong in that table; they are the
// only official multilingual rail-LINE names that exist, so they do not belong in the bin
// either. Hence a second script over one endpoint rather than one script with a mode flag.
//
// Node 18+ (global fetch). No key, no spend.
import fs from 'node:fs';

const BASE = 'https://www.translatedterms.gov.sg';
const CATEGORY_MRT_LRT = '012db1a7-6fd2-4b2a-9393-c3fb42ca8586'; // GET /admin/api/categories
const PAGE_SIZE = 100;   // client-supplied; the server honours up to 100 (site sends 10)
const OUT = 'web/_shared/lib/mrt-lines-i18n.generated.js';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Referer: `${BASE}/`,
  'Content-Type': 'application/x-www-form-urlencoded',
};
const LANG = { 2: 'zh', 3: 'ms', 4: 'ta' };

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
const items = [...first.Items];
for (let p = 2; items.length < first.TotalItems; p += 1) {
  const r = await page(p);
  if (!r.Items?.length) break;
  items.push(...r.Items);
}
if (items.length !== first.TotalItems) {
  throw new Error(`fetched ${items.length} of ${first.TotalItems} — refusing to write a partial table`);
}

// THE JOIN IS ON THE NAME, NOT THE CODE IN THE BRACKET. The register writes the second row
// as "North-South Line (EWL)": right name, wrong code. Reading the bracket would file the
// North-South Line's names under the East-West Line — a wrong answer that looks authoritative.
const CODE_BY_NAME = new Map([
  ['East-West Line', 'EWL'],
  ['North-South Line', 'NSL'],
]);

const rows = [];
for (const it of items) {
  const src = decode(it.Name);
  if (!/\bLine\b/i.test(src)) continue;               // stations are not lines
  const n = src.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const code = CODE_BY_NAME.get(n);
  // A THIRD LINE APPEARING IS GOOD NEWS AND MUST NOT BE SWALLOWED. Fail loudly rather than
  // skip it: silently dropping a row the register just started publishing is how a table
  // stays two rows long for years while looking complete.
  if (!code) throw new Error(`unmapped line row "${src}" — add it to CODE_BY_NAME`);
  const row = { code, src, n, zh: '', ms: '', ta: '' };
  for (const t of it.TransTranslations || []) {
    const k = LANG[t.Language];
    if (k) row[k] = decode(t.Name);
  }
  rows.push(row);
}
rows.sort((a, b) => a.code.localeCompare(b.code));

const blank = rows.filter((r) => !r.zh || !r.ms || !r.ta);
if (blank.length) console.warn(`WARNING: ${blank.length} row(s) missing a language:`, blank.map((r) => r.code));

const cur = fs.readFileSync(OUT, 'utf8');
const header = cur.split('export const SG_LINE_NAMES_I18N')[0];
const tail = cur.split(/^\];$/m).slice(1).join('];');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const body = rows.map((r) => `  { code: '${r.code}', src: "${esc(r.src)}", n: "${esc(r.n)}", zh: "${esc(r.zh)}", ms: "${esc(r.ms)}", ta: "${esc(r.ta)}" },`).join('\n');
fs.writeFileSync(OUT, `${header}export const SG_LINE_NAMES_I18N = [\n${body}\n];${tail}`);
console.log(`wrote ${rows.length} line rows to ${OUT}`);
