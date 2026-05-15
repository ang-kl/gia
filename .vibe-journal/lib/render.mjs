// Orchestrator — load config, run all parsers, emit ndjson + static HTML.
//
// Two output modes:
//
//   1. multi-file (default) — writes:
//        <output>/index.html
//        <output>/style.css
//        <output>/app.js
//        <output>/data/<type>.ndjson         (10 files)
//        <output>/data/manifest.json
//      Client fetches each ndjson on tab activation. Suits local dev
//      previews via `vibe-journal serve`.
//
//   2. bundled-single-page — config keys:
//        bundled_html: <abs/rel path of the HTML output file>
//        bundled_json: <abs/rel path of the JSON output file>
//      Writes ONE self-contained HTML (CSS + JS inlined) plus ONE
//      JSON blob carrying { manifest, data: { <type>: [...] } }.
//      Suits a tightly-controlled Express whitelist where only two
//      files are served (e.g. soleat.net's `/doc/vibe-journal.html`
//      + `/doc/vibe-journal.json` route in `index.js:7753`).

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import yaml from 'js-yaml';

import { parseJournal } from './parsers/journal.mjs';
import { parseSectionDoc } from './parsers/section-doc.mjs';
import { parsePR } from './parsers/pr.mjs';
import { parseThirdParty } from './parsers/third-party.mjs';
import { parseVault } from './parsers/vault.mjs';

const TAB_LAYOUT = [
  ['pr', 'register', 'third-party'],
  ['technical', 'feature'],
  ['legal', 'vault'],
  ['journal'],
  ['builder', 'persona']
];

const TAB_LABELS = {
  pr: 'PR',
  register: 'Register',
  'third-party': '3rd Party',
  technical: 'Technical',
  feature: 'Feature',
  legal: 'Legal',
  vault: 'Vault',
  journal: 'Journal',
  builder: 'Builder',
  persona: 'Persona'
};

export async function regen(cfgPath, pkgRoot) {
  const cfg = yaml.load(readFileSync(cfgPath, 'utf8'));
  const projectRoot = dirname(cfgPath);
  const bundledHtmlPath = cfg.bundled_html ? resolve(projectRoot, cfg.bundled_html) : null;
  const bundledJsonPath = cfg.bundled_json ? resolve(projectRoot, cfg.bundled_json) : null;
  const bundled = !!(bundledHtmlPath && bundledJsonPath);
  const outDir = bundled
    ? dirname(bundledHtmlPath)
    : resolve(projectRoot, cfg.output || 'dist/vibe-journal/');
  if (!bundled) mkdirSync(resolve(outDir, 'data'), { recursive: true });
  else mkdirSync(outDir, { recursive: true });

  console.log(`[vibe-journal] project: ${cfg.project?.name || projectRoot}`);
  console.log(`[vibe-journal] mode:    ${bundled ? 'bundled (1 HTML + 1 JSON)' : 'multi-file'}`);
  console.log(`[vibe-journal] output:  ${outDir}`);

  const sources = cfg.sources || {};

  // `repo_root` is the path the PR git-log fallback should treat as the
  // working tree. Order of preference:
  //   1. `project.repo_root` from config (resolved relative to config dir).
  //   2. parent of `project.doc_root`.
  //   3. the config file's own dir.
  const docRoot = cfg.project?.doc_root ? resolve(projectRoot, cfg.project.doc_root) : null;
  const repoRoot = cfg.project?.repo_root
    ? resolve(projectRoot, cfg.project.repo_root)
    : (docRoot ? resolve(docRoot, '..') : projectRoot);

  const records = {
    pr: parsePR({ projectRoot, source: sources.pr || {}, repoRoot }),
    register: parseSectionDoc('register', { projectRoot, source: sources.register }),
    'third-party': parseThirdParty({ projectRoot, source: sources.third_party }),
    technical: parseSectionDoc('technical', { projectRoot, source: sources.technical }),
    feature: parseSectionDoc('feature', { projectRoot, source: sources.feature }),
    legal: parseSectionDoc('legal', { projectRoot, source: sources.legal }),
    vault: parseVault({ projectRoot, source: sources.vault }),
    journal: parseJournal({ projectRoot, source: sources.journal || {} }),
    builder: parseSectionDoc('builder', { projectRoot, source: sources.builder }),
    persona: parseSectionDoc('persona', { projectRoot, source: sources.persona })
  };

  // Manifest — shared by both output modes.
  const manifest = {
    project: cfg.project || {},
    generated_at: new Date().toISOString(),
    tabs: TAB_LAYOUT.map((row) => row.map((key) => ({
      key,
      label: TAB_LABELS[key],
      count: records[key]?.length || 0
    })))
  };

  if (bundled) {
    // Single-JSON: { manifest, data: { <type>: [...] } }
    const blob = { manifest, data: records };
    writeFileSync(bundledJsonPath, JSON.stringify(blob));
    console.log(`[vibe-journal] wrote ${bundledJsonPath} — ${Object.values(records).reduce((n, l) => n + l.length, 0)} total records`);

    // Single-HTML: inline CSS + JS into the shell.
    const html = readFileSync(resolve(pkgRoot, 'templates', 'index.html'), 'utf8');
    const css = readFileSync(resolve(pkgRoot, 'templates', 'style.css'), 'utf8');
    const js = readFileSync(resolve(pkgRoot, 'templates', 'app.js'), 'utf8');
    const jsonHref = cfg.bundled_json_url || basename(bundledJsonPath);
    const inlined = html
      .replace(/<link rel="stylesheet" href="style\.css"[^>]*>/, `<style>${css}</style>`)
      .replace(/<script src="app\.js"[^>]*><\/script>/, `<script>window.__VJ_JSON_URL__ = ${JSON.stringify(jsonHref)};\n${js}</script>`);
    writeFileSync(bundledHtmlPath, inlined);
    console.log(`[vibe-journal] wrote ${bundledHtmlPath} — self-contained single-page bundle (inlined CSS + JS)`);
  } else {
    // Multi-file: one ndjson per type + manifest.json + static shell.
    for (const [key, list] of Object.entries(records)) {
      const ndjson = list.map((r) => JSON.stringify(r)).join('\n');
      writeFileSync(resolve(outDir, 'data', `${key}.ndjson`), ndjson);
      console.log(`[vibe-journal] data/${key}.ndjson — ${list.length} record(s)`);
    }
    writeFileSync(resolve(outDir, 'data', 'manifest.json'), JSON.stringify(manifest, null, 2));
    for (const f of ['index.html', 'style.css', 'app.js']) {
      cpSync(resolve(pkgRoot, 'templates', f), resolve(outDir, f));
    }
    console.log(`[vibe-journal] wrote ${outDir}/index.html — open it in a browser or run \`vibe-journal serve\`.`);
  }
}
