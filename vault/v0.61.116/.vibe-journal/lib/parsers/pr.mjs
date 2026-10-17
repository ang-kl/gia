// PR parser — three input options in priority order:
//   1. `doc/VibeCodingRecord/data/prs.ndjson` if the project already
//      maintains a Soleat-style PR ledger (no API call needed).
//      Also reads `pr-files.tsv` (PR# → comma-separated file list) and
//      attaches `files[]` to each record so the renderer can show the
//      per-PR file breakdown — restoring the rich legacy view per
//      operator request v0.60.179.
//   2. The `gh` CLI (`gh pr list --state merged --limit 500 --json …`)
//      if `gh` is installed + authenticated.
//   3. Git log on the local repo, falling back to commit-message PR
//      references (e.g. `(#412)` suffixes).
// Returns ndjson-ready records: { number, title, state, merged_at,
// author, files_changed, files, body, url, version }.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

export function parsePR({ projectRoot, source, repoRoot }) {
  const candidates = [
    resolve(projectRoot, 'doc/VibeCodingRecord/data/prs.ndjson'),
    repoRoot ? resolve(repoRoot, 'doc/VibeCodingRecord/data/prs.ndjson') : null
  ].filter(Boolean);
  for (const ledger of candidates) {
    if (existsSync(ledger)) {
      const filesTsvCandidates = [
        resolve(projectRoot, 'doc/VibeCodingRecord/data/pr-files.tsv'),
        repoRoot ? resolve(repoRoot, 'doc/VibeCodingRecord/data/pr-files.tsv') : null
      ].filter(Boolean);
      let filesByPr = {};
      for (const tsv of filesTsvCandidates) {
        if (existsSync(tsv)) { filesByPr = readPrFilesTsv(tsv); break; }
      }
      return readNdjson(ledger).map((r) => normaliseLedgerRecord(r, filesByPr));
    }
  }
  if (canRunGh()) {
    try { return parseFromGh(source); } catch (err) {
      console.warn('[vibe-journal] pr: gh CLI failed —', err.message);
    }
  }
  return parseFromGitLog(repoRoot || projectRoot);
}

function readNdjson(path) {
  return readFileSync(path, 'utf8')
    .split('\n').filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

function readPrFilesTsv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [n, files] = line.split('\t');
    if (!n || !files) continue;
    out[Number(n)] = files.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

function normaliseLedgerRecord(r, filesByPr) {
  const n = r.n ?? r.number ?? null;
  const files = (n && filesByPr[n]) || [];
  return {
    type: 'pr',
    number: n,
    title: r.title || '',
    state: (r.state || '').toUpperCase(),     // legacy "closed"/"merged" → uppercase chip
    merged_at: r.merged || r.merged_at || null,
    author: r.author || null,
    files_changed: files.length || r.files_changed || null,
    files,                                    // full list — used by per-PR `<details>` card
    body: r.body || '',                       // first ~300 chars of the PR description
    url: r.url || (n ? `https://github.com/ang-kl/gia/pull/${n}` : null),
    version: versionFromTitle(r.title || '')
  };
}

function versionFromTitle(t) {
  const m = t.match(/v?(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

function canRunGh() {
  try { execSync('command -v gh', { stdio: 'ignore' }); return true; } catch { return false; }
}

function parseFromGh(source) {
  const repo = source.github_repo;
  const args = repo ? `--repo ${repo}` : '';
  const json = execSync(
    `gh pr list ${args} --state all --limit 500 --json number,title,state,mergedAt,author,url,changedFiles,body`,
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  return JSON.parse(json).map((p) => ({
    type: 'pr',
    number: p.number,
    title: p.title,
    state: p.state,
    merged_at: p.mergedAt,
    author: p.author?.login || null,
    files_changed: p.changedFiles,
    files: [],
    body: (p.body || '').slice(0, 300),
    url: p.url,
    version: versionFromTitle(p.title || '')
  }));
}

function parseFromGitLog(root) {
  let log;
  try {
    log = execSync('git -C ' + JSON.stringify(root) + ' log --pretty=format:"%H|%s|%an|%aI" --max-count=500', { encoding: 'utf8' });
  } catch { return []; }
  return log.split('\n').filter(Boolean).map((line) => {
    const [sha, subject, author, when] = line.split('|');
    const prMatch = subject.match(/#(\d+)\)?\s*$/) || subject.match(/\(#(\d+)\)/);
    return {
      type: 'pr',
      number: prMatch ? Number(prMatch[1]) : null,
      title: subject,
      state: 'MERGED',
      merged_at: when,
      author,
      files_changed: null,
      files: [],
      body: '',
      url: null,
      sha,
      version: versionFromTitle(subject || '')
    };
  });
}
