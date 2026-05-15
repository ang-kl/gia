// Orchestrator — load config, run all parsers, emit ndjson + static HTML.
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
  const outDir = resolve(projectRoot, cfg.output || 'dist/vibe-journal/');
  mkdirSync(resolve(outDir, 'data'), { recursive: true });

  console.log(`[vibe-journal] project: ${cfg.project?.name || projectRoot}`);
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

  for (const [key, list] of Object.entries(records)) {
    const ndjson = list.map((r) => JSON.stringify(r)).join('\n');
    writeFileSync(resolve(outDir, 'data', `${key}.ndjson`), ndjson);
    console.log(`[vibe-journal] data/${key}.ndjson — ${list.length} record(s)`);
  }

  // Manifest so the client can know which tabs have data + the counts.
  const manifest = {
    project: cfg.project || {},
    generated_at: new Date().toISOString(),
    tabs: TAB_LAYOUT.map((row) => row.map((key) => ({
      key,
      label: TAB_LABELS[key],
      count: records[key]?.length || 0
    })))
  };
  writeFileSync(resolve(outDir, 'data', 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Copy the static shell.
  for (const f of ['index.html', 'style.css', 'app.js']) {
    cpSync(resolve(pkgRoot, 'templates', f), resolve(outDir, f));
  }
  console.log(`[vibe-journal] wrote ${outDir}/index.html — open it in a browser or run \`vibe-journal serve\`.`);
}
