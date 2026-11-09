// 3rd-party parser — two input shapes supported per config:
//   { type: 'yaml', path: '…' }            — project-managed manifest of
//                                             external services / API
//                                             keys / endpoints.
//   { type: 'github-issues', repo: '…' }   — pulls GitHub issues (open
//                                             + closed) via gh CLI if
//                                             available.
//
// Output records:
//   { type: 'third-party', kind: 'service'|'issue', name, status, url,
//     details }

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

export function parseThirdParty({ projectRoot, source }) {
  if (!source || !Array.isArray(source.sources)) return [];
  const out = [];
  for (const sub of source.sources) {
    if (sub.type === 'yaml') {
      out.push(...readYamlManifest(resolve(projectRoot, sub.path)));
    } else if (sub.type === 'github-issues') {
      out.push(...readGitHubIssues(sub));
    }
  }
  return out;
}

function readYamlManifest(path) {
  if (!existsSync(path)) {
    return [];
  }
  let doc;
  try { doc = yaml.load(readFileSync(path, 'utf8')); }
  catch (err) {
    console.warn(`[vibe-journal] third-party: failed to parse ${path} —`, err.message);
    return [];
  }
  const out = [];
  // Expected schema (lenient — anything sensible works):
  //   apis:
  //     - { name, vendor, purpose, key_env_var, docs_url, status, daily_cap, notes }
  //   integrations:
  //     - { name, kind, purpose, docs_url, status, notes }
  for (const a of doc?.apis || []) {
    out.push({
      type: 'third-party',
      kind: 'api',
      name: a.name || 'unnamed',
      vendor: a.vendor || null,
      status: a.status || 'active',
      url: a.docs_url || null,
      details: {
        purpose: a.purpose || '',
        key_env_var: a.key_env_var || null,
        daily_cap: a.daily_cap || null,
        notes: a.notes || ''
      }
    });
  }
  for (const i of doc?.integrations || []) {
    out.push({
      type: 'third-party',
      kind: 'integration',
      name: i.name || 'unnamed',
      vendor: i.kind || null,
      status: i.status || 'active',
      url: i.docs_url || null,
      details: { purpose: i.purpose || '', notes: i.notes || '' }
    });
  }
  return out;
}

function readGitHubIssues(sub) {
  let canGh;
  try { execSync('command -v gh', { stdio: 'ignore' }); canGh = true; } catch { canGh = false; }
  if (!canGh) return [];
  const repoArg = sub.repo ? `--repo ${sub.repo}` : '';
  const stateArg = sub.state ? `--state ${sub.state}` : '--state all';
  let json;
  try {
    json = execSync(
      `gh issue list ${repoArg} ${stateArg} --limit 200 --json number,title,state,url,labels,createdAt,author`,
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );
  } catch (err) {
    console.warn('[vibe-journal] third-party: gh issue list failed —', err.message);
    return [];
  }
  return JSON.parse(json).map((i) => ({
    type: 'third-party',
    kind: 'issue',
    name: `#${i.number} ${i.title}`,
    vendor: 'GitHub',
    status: i.state,
    url: i.url,
    details: {
      labels: (i.labels || []).map((l) => l.name),
      author: i.author?.login || null,
      created_at: i.createdAt
    }
  }));
}
