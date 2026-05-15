// PR parser — three input options in priority order:
//   1. `doc/VibeCodingRecord/data/prs.ndjson` if the project already
//      maintains a Soleat-style PR ledger (no API call needed).
//   2. The `gh` CLI (`gh pr list --state merged --limit 200 --json …`)
//      if `gh` is installed + authenticated.
//   3. Git log on the local repo, falling back to commit-message PR
//      references (e.g. `(#412)` suffixes).
// Returns ndjson-ready records: { number, title, state, merged_at, author,
// files_changed, url }.

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
      return readNdjson(ledger).map((r) => ({ type: 'pr', ...r }));
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

function canRunGh() {
  try { execSync('command -v gh', { stdio: 'ignore' }); return true; } catch { return false; }
}

function parseFromGh(source) {
  const repo = source.github_repo;
  const args = repo ? `--repo ${repo}` : '';
  const json = execSync(
    `gh pr list ${args} --state all --limit 200 --json number,title,state,mergedAt,author,url,changedFiles`,
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  return JSON.parse(json).map((p) => ({
    type: 'pr',
    number: p.number,
    title: p.title,
    state: p.state,
    merged_at: p.mergedAt,
    author: p.author?.login || null,
    files_changed: p.changedFiles,
    url: p.url
  }));
}

function parseFromGitLog(root) {
  let log;
  try {
    log = execSync('git -C ' + JSON.stringify(root) + ' log --pretty=format:"%H|%s|%an|%aI" --max-count=200', { encoding: 'utf8' });
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
      url: null,
      sha
    };
  });
}
