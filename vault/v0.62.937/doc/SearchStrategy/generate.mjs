#!/usr/bin/env node
// doc/SearchStrategy/generate.mjs — regenerates the Search Decision Tree mind-map.
//
// Input (single source of truth, committed):
//   data/search-modes.json — dimensions, precedence tiers, conflicts, the tree.
//                            The combination test matrix
//                            (__tests__/search-mode-matrix.test.js) reads the
//                            SAME file, so doc + diagram + tests can't drift.
//
// Outputs (overwritten on each run, committed):
//   search-strategy.md                  — canonical Markdown view.
//   ../../public/doc/search-strategy.html — self-contained hosted mind-map,
//                                           served at /doc/search-strategy.html.
//
// Run:  node doc/SearchStrategy/generate.mjs
//
// ACCESSIBILITY: the page is colour-blind safe (deuteranopia/protanopia). It uses
// a BLUE/ORANGE palette only — never red/green — and every state is also marked
// by SHAPE + TEXT (tier badges, �disabled⌀ tags, arrows), so meaning never rides
// on hue alone. WCAG AA contrast on a dark canvas.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN_DATE = '2026-06-11';   // v0.62.15 — initial publish (JB-502 fix PR)

const data = JSON.parse(readFileSync(join(HERE, 'data', 'search-modes.json'), 'utf8'));

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ── 1. Markdown canonical doc ────────────────────────────────────────────────
const md = [];
md.push(`# ${data.title}`);
md.push('');
md.push(`> ${data.subtitle}`);
md.push('');
md.push(`_Generated ${GEN_DATE} from \`data/search-modes.json\` (v${data.version}). ${data.generatedNote}_`);
md.push('');
md.push('## Precedence (top wins)');
md.push('');
md.push('| Tier | Winner | Rule | Source |');
md.push('|---|---|---|---|');
for (const p of data.precedence) md.push(`| ${p.tier} | **${p.winner}** | ${p.rule} | \`${p.citation}\` |`);
md.push('');
md.push('## Dimensions');
md.push('');
md.push('| Mode | Input | Values | Gates (disables) | Gated by | Source |');
md.push('|---|---|---|---|---|---|');
for (const d of data.dimensions) {
  md.push(`| **${d.label}** | \`${d.input}\` | ${d.values.join(', ')} | ${d.gates} | ${d.gatedBy} | \`${d.citation}\` |`);
}
md.push('');
md.push('## Conflicts & resolutions');
md.push('');
md.push('| Combination | Resolves to | Why |');
md.push('|---|---|---|');
for (const c of data.conflicts) md.push(`| ${c.pair} | **${c.resolution}** | ${c.note} |`);
md.push('');
md.push('## Master decision tree');
md.push('');
for (const step of data.tree) md.push(`- ${step}`);
md.push('');
writeFileSync(join(HERE, 'search-strategy.md'), md.join('\n') + '\n');

// ── 2. Hosted HTML mind-map ──────────────────────────────────────────────────
// Palette: colour-blind-safe blue/orange on dark. Tier badges + shapes carry
// meaning so hue is never load-bearing.
const TIER_LABEL = { 1: 'TIER 1 ▸ wins first', 2: 'TIER 2 ▸ then', 3: 'TIER 3 ▸ default' };

const dimCard = (d) => `
  <article class="dim">
    <h3>${esc(d.label)}</h3>
    <code class="in">${esc(d.input)}</code>
    <p class="beh">${esc(d.behavior)}</p>
    <dl>
      <dt>Disables</dt><dd>${esc(d.gates)}</dd>
      <dt>Gated by</dt><dd>${esc(d.gatedBy)}</dd>
    </dl>
    <span class="src">${esc(d.citation)}</span>
  </article>`;

const tierBlock = (p) => `
  <section class="tier tier-${p.tier}">
    <span class="badge">${TIER_LABEL[p.tier] || ('TIER ' + p.tier)}</span>
    <h2>${esc(p.winner)}</h2>
    <p>${esc(p.rule)}</p>
    <span class="src">${esc(p.citation)}</span>
  </section>`;

const conflictRow = (c) => `
  <tr>
    <td class="combo">${esc(c.pair)}</td>
    <td><span class="res res-${esc(c.resolution)}">${esc(c.resolution)}</span></td>
    <td>${esc(c.note)}</td>
  </tr>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(data.title)}</title>
<style>
  :root{
    --bg:#0e1116; --panel:#161b22; --panel2:#1c232c; --ink:#e8edf3; --muted:#9fb0c3;
    --blue:#4aa3ff; --blue-deep:#1b3a5c; --orange:#ff9f43; --orange-deep:#5c3a10;
    --line:#2b3946;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    -webkit-text-size-adjust:100%}
  header{padding:22px 18px;border-bottom:1px solid var(--line);background:var(--panel)}
  h1{margin:0 0 4px;font-size:20px}
  .sub{color:var(--muted);font-size:13px;max-width:70ch}
  .a11y{margin-top:10px;font-size:12px;color:var(--muted);
    border-left:3px solid var(--orange);padding:6px 10px;background:var(--panel2);border-radius:0 8px 8px 0}
  main{padding:18px;max-width:1080px;margin:0 auto}
  h2.section{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
    margin:26px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}

  /* precedence ladder — shape (stacked, arrowed) carries the "wins first" idea */
  .ladder{display:flex;flex-direction:column;gap:0}
  .tier{position:relative;background:var(--panel);border:1px solid var(--line);
    border-radius:12px;padding:14px 16px;margin-bottom:22px}
  .tier:not(:last-child)::after{content:"▼ else";position:absolute;left:18px;bottom:-19px;
    font-size:11px;color:var(--muted);letter-spacing:.05em}
  .tier-1{border-left:6px solid var(--blue)}
  .tier-2{border-left:6px solid var(--orange)}
  .tier-3{border-left:6px solid var(--muted)}
  .tier h2{margin:6px 0 6px;font-size:17px}
  .badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;
    padding:2px 8px;border-radius:999px;background:var(--panel2);border:1px solid var(--line)}

  /* dimensions grid */
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
  .dim{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 13px}
  .dim h3{margin:0 0 6px;font-size:15px}
  .dim .in{display:inline-block;font-size:11.5px;color:var(--blue);background:var(--blue-deep);
    padding:2px 7px;border-radius:6px;margin-bottom:8px;word-break:break-word}
  .dim .beh{margin:0 0 8px;color:var(--ink)}
  .dim dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12.5px}
  .dim dt{color:var(--orange);font-weight:600}
  .dim dd{margin:0;color:var(--muted)}
  .src{display:block;margin-top:8px;font-size:11px;color:var(--muted);font-family:ui-monospace,monospace}

  /* conflicts table */
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.05em}
  .combo{font-weight:600}
  .res{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;
    border:1px solid var(--line)}
  /* resolution chips — blue = a winner mode, orange = a modifier; never red/green */
  .res-michelin,.res-special-mode,.res-base{background:var(--blue-deep);color:var(--blue)}
  .res-auto-off,.res-relax-3\\.0,.res-skip{background:var(--orange-deep);color:var(--orange)}

  /* tree */
  ol.tree{margin:0;padding-left:20px}
  ol.tree li{margin:6px 0}
  footer{padding:18px;color:var(--muted);font-size:12px;text-align:center;border-top:1px solid var(--line)}
  @media(max-width:560px){.dim dl{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
  <h1>${esc(data.title)}</h1>
  <div class="sub">${esc(data.subtitle)}</div>
  <div class="a11y"><strong>Reading guide:</strong> meaning is carried by <strong>position, shape, and labels</strong>, not colour. Blue = an exclusive mode/winner; orange = a modifier (auto-off / relax / skip). The ladder reads top-down: a higher tier wins, then “▼ else” falls to the next.</div>
</header>
<main>
  <h2 class="section">Precedence — which mode wins</h2>
  <div class="ladder">
    ${data.precedence.map(tierBlock).join('')}
  </div>

  <h2 class="section">Dimensions</h2>
  <div class="grid">
    ${data.dimensions.map(dimCard).join('')}
  </div>

  <h2 class="section">Conflicts &amp; resolutions</h2>
  <table>
    <thead><tr><th>Combination</th><th>Resolves to</th><th>Why</th></tr></thead>
    <tbody>${data.conflicts.map(conflictRow).join('')}</tbody>
  </table>

  <h2 class="section">Master decision tree</h2>
  <ol class="tree">
    ${data.tree.map((s) => `<li>${esc(s.replace(/^\\d+\\.\\s*/, ''))}</li>`).join('')}
  </ol>
</main>
<footer>
  Generated ${GEN_DATE} from <code>doc/SearchStrategy/data/search-modes.json</code> (v${esc(data.version)}).
  Validated by <code>__tests__/search-mode-matrix.test.js</code>. Colour-blind-safe (blue/orange, shape-coded).
</footer>
</body>
</html>`;

const PUBLIC_DOC = join(HERE, '..', '..', 'public', 'doc');
mkdirSync(PUBLIC_DOC, { recursive: true });
writeFileSync(join(PUBLIC_DOC, 'search-strategy.html'), html);

console.log(`Search Decision Tree: wrote search-strategy.md + public/doc/search-strategy.html (${data.dimensions.length} dimensions, ${data.conflicts.length} conflicts).`);
