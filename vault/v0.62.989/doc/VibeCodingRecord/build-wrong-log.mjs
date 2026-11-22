#!/usr/bin/env node
// build-wrong-log.mjs — render data/wrong-log.ndjson as one self-contained page.
//
//   node doc/VibeCodingRecord/build-wrong-log.mjs
//
// Output: doc/VibeCodingRecord/wrong-log.html — GITIGNORED, like its input. See
// extract-wrong-log.mjs §NOT-COMMITTED for why, and for the consequence: this file
// cannot reach /doc/vibe-journal.html, because Railway deploys from git.
//
// It is deliberately NOT wired into generate.mjs. That script embeds its data
// directly into the hosted page (`const REPLIES = …` at :611), so anything it touches
// becomes part of a file served at soleat.net. Keeping this separate is what makes
// "regenerating the journal produces a byte-identical page" checkable — and it is
// checked, in __tests__/wrong-log.test.js.
//
// No network, no fonts, no CDN: it opens from a file:// URL on a plane.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'data', 'wrong-log.ndjson');
const STATS = join(HERE, 'data', 'wrong-log.stats.json');
const OUT = join(HERE, 'wrong-log.html');

if (!existsSync(SRC)) {
  console.error(`no ${SRC} — run extract-wrong-log.mjs first`);
  process.exit(2);
}
const rows = readFileSync(SRC, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const stats = existsSync(STATS) ? JSON.parse(readFileSync(STATS, 'utf8')) : {};

const byDay = new Map();
for (const r of rows) {
  if (!byDay.has(r.day)) byDay.set(r.day, []);
  byDay.get(r.day).push(r);
}
const days = [...byDay.keys()].sort().reverse();       // newest first
const peak = Math.max(...[...byDay.values()].map((v) => v.length), 1);

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The word is highlighted so the eye lands on it, but ONLY after escaping — the
// paragraphs are full of `<b>`, `<i>` and backticked code, and marking up before
// escaping would render the transcript's own HTML as page HTML.
const mark = (s) => esc(s).replace(/\b(wrong)\b/gi, '<mark>$1</mark>');

const dayRows = days.map((d) => {
  const items = byDay.get(d);
  return `<section class="day" data-day="${d}">
  <h2>${d} <span class="n">${items.length}</span><i class="bar" style="width:${Math.round((items.length / peak) * 100)}%"></i></h2>
  ${items.map((r) => `<article class="p" data-i="${r.i}">
    <div class="meta">#${r.i} · reply ${r.replyIndex} · ${new Date(r.ts).toISOString().replace('T', ' ').slice(0, 16)}Z${r.redactions ? ` · <b class="red">${r.redactions} redacted</b>` : ''}</div>
    <div class="t">${mark(r.text)}</div>
  </article>`).join('\n')}
</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wrong-Log — Soleat</title>
<style>
:root{--bg:#fbfbfa;--fg:#1c1c1a;--dim:#6b6b66;--line:#e4e4e0;--card:#fff;--mark:#ffe9a8;--accent:#a4341f}
@media (prefers-color-scheme:dark){:root{--bg:#15150f;--fg:#eceae2;--dim:#96958c;--line:#2e2e26;--card:#1c1c16;--mark:#5c4a12;--accent:#e8896f}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:2rem 1.1rem 5rem}
h1{font-size:1.5rem;margin:0 0 .2rem}
.sub{color:var(--dim);font-size:.92rem;margin:0 0 1.4rem}
.kpi{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.2rem}
.kpi div{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;font-size:.85rem}
.kpi b{display:block;font-size:1.25rem;line-height:1.2}
#q{width:100%;padding:.6rem .75rem;font:inherit;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
#count{color:var(--dim);font-size:.85rem;margin:.5rem 0 1.4rem}
.day h2{font-size:1rem;margin:1.8rem 0 .7rem;padding-bottom:.35rem;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:.6rem}
.day h2 .n{color:var(--dim);font-weight:400;font-size:.85rem}
.bar{height:3px;background:var(--accent);opacity:.35;border-radius:2px;flex:0 0 auto;max-width:180px}
.p{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:7px;padding:.7rem .85rem;margin:0 0 .6rem}
.meta{color:var(--dim);font-size:.76rem;margin-bottom:.35rem;font-variant-numeric:tabular-nums}
.red{color:var(--accent)}
.t{white-space:pre-wrap;overflow-wrap:anywhere}
mark{background:var(--mark);color:inherit;padding:0 .12em;border-radius:2px}
.note{color:var(--dim);font-size:.82rem;border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1rem}
</style></head><body><div class="wrap">
<h1>Wrong-Log</h1>
<p class="sub">Every paragraph in which the assistant said something was <mark>wrong</mark> — verbatim, uncurated, newest first.</p>
<div class="kpi">
  <div><b>${stats.paragraphs ?? rows.length}</b>paragraphs</div>
  <div><b>${stats.replies ?? '—'}</b>replies</div>
  <div><b>${stats.days ?? days.length}</b>days</div>
  <div><b>${Math.round((stats.chars ?? 0) / 1024)} KB</b>of text</div>
  <div><b>${stats.redactions ?? 0}</b>redactions</div>
</div>
<input id="q" type="search" placeholder="filter — try 'cache', 'assumed', 'test', 'measured'&hellip;" autocomplete="off">
<div id="count"></div>
${dayRows}
<p class="note">Generated ${esc(stats.generated || '')} from ${esc(String(stats.since ? `--since ${stats.since}` : 'the whole transcript'))}.
Not committed and not deployed, by instruction: this repo is public and Railway builds from it.
Regenerate with <code>node doc/VibeCodingRecord/extract-wrong-log.mjs &lt;transcript.jsonl&gt;</code> then <code>node doc/VibeCodingRecord/build-wrong-log.mjs</code>.</p>
</div>
<script>
const ps = [...document.querySelectorAll('.p')];
const secs = [...document.querySelectorAll('.day')];
const q = document.getElementById('q'), c = document.getElementById('count');
function apply() {
  const t = q.value.trim().toLowerCase();
  let shown = 0;
  for (const p of ps) {
    const hit = !t || p.textContent.toLowerCase().includes(t);
    p.hidden = !hit; if (hit) shown++;
  }
  for (const s of secs) s.hidden = !s.querySelector('.p:not([hidden])');
  c.textContent = shown + ' of ' + ps.length + ' paragraphs';
}
q.addEventListener('input', apply); apply();
</script>
</body></html>`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT}  (${rows.length} paragraphs, ${days.length} days, ${Math.round(html.length / 1024)} KB)`);
