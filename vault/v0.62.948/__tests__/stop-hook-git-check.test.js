import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = path.join(ROOT, 'scripts', 'stop-hook-git-check.sh');
const INSTALLER = path.join(ROOT, 'scripts', 'install-stop-hook.sh');
const HARNESS = path.join(ROOT, '__tests__', 'fixtures', 'stop-hook-git-check.harness.sh');

// §3,362·D / [AMD-216]. The harness's stop hook counted `origin/<branch>..HEAD`
// and demanded a push for ANY unpushed commit. After a squash-merge restart the
// remote branch tip is a dead line content-identical to main, so it reported
// TWO unpushed commits when one existed; and D-210 requires a merge record to
// stay unpushed until substantive work carries it, so hook and rule disagreed
// on every stop. These tests DRIVE the script against real temporary repos —
// the hook is bash, so nothing here is asserted by reading it.

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
};
const commit = (cwd, file, subject) => {
  fs.writeFileSync(path.join(cwd, file), `${subject}\n${Date.now()}\n`);
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-q', '-m', subject);
  return git(cwd, 'rev-parse', 'HEAD');
};
const runHook = (cwd, input = { stop_hook_active: false }) => {
  const r = spawnSync('bash', [HOOK], { cwd, encoding: 'utf8', input: JSON.stringify(input) });
  return { status: r.status, stderr: r.stderr, stdout: r.stdout };
};

let tmp;
// Build: a bare remote with `main`, a clone on branch `feat` pushed at main's
// commit, then a SQUASH-MERGE simulated the way GitHub does it — the branch's
// work lands on main as a NEW commit object, so the remote branch tip is
// content-identical to main but not its ancestor.
function squashMergedRepo(name) {
  const bare = path.join(tmp, `${name}.git`);
  const work = path.join(tmp, name);
  git(tmp, 'init', '-q', '--bare', '-b', 'main', bare);
  git(tmp, 'clone', '-q', bare, work);
  git(work, 'config', 'user.email', 'noreply@anthropic.com');
  git(work, 'config', 'user.name', 'Claude');
  git(work, 'config', 'commit.gpgsign', 'false');
  commit(work, 'base.txt', 'base');
  git(work, 'push', '-q', '-u', 'origin', 'main');
  git(work, 'checkout', '-q', '-b', 'feat');
  commit(work, 'feature.txt', 'v0.0.1 — a feature');
  git(work, 'push', '-q', '-u', 'origin', 'feat');
  // squash-merge onto main: same tree, different commit
  git(work, 'checkout', '-q', 'main');
  git(work, 'merge', '-q', '--squash', 'feat');
  git(work, 'commit', '-q', '-m', 'v0.0.1 — a feature (#1)');
  git(work, 'push', '-q', 'origin', 'main');
  // the post-merge restart this repo does every time: feat := origin/main
  git(work, 'checkout', '-q', '-B', 'feat', 'origin/main');
  // sanity: remote feat tip is content-identical to main and NOT its ancestor
  expect(spawnSync('git', ['diff', '--quiet', 'origin/main', 'origin/feat'], { cwd: work }).status).toBe(0);
  expect(spawnSync('git', ['merge-base', '--is-ancestor', 'origin/feat', 'origin/main'], { cwd: work }).status).toBe(1);
  return work;
}

beforeAll(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-hook-')); });
afterAll(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

describe('stop-hook-git-check.sh — driven against real repos', () => {
  it('is the harness hook above the replaced block — prefix and signing block byte-identical', () => {
    const ours = fs.readFileSync(HOOK, 'utf8');
    const theirs = fs.readFileSync(HARNESS, 'utf8');
    const marker = 'current_branch=$(git branch --show-current)\n';
    expect(theirs.split(marker).length).toBe(2);
    expect(ours.split('# ----')[0]).toBe(theirs.split(marker)[0]);
    const sig = theirs.slice(theirs.indexOf('  # Check for local commits'), theirs.indexOf('\n  unpushed=$(git rev-list'));
    expect(sig.length).toBeGreaterThan(1000);
    expect(ours).toContain(sig);
    // and the replaced block is really gone
    expect(ours).not.toContain('unpushed=$(git rev-list "$upstream..HEAD"');
  });

  it('exits 0 with nothing to say on a clean tree at the remote tip', () => {
    const work = squashMergedRepo('clean');
    const r = runHook(work);
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('still exits 2 on uncommitted changes and on untracked files (unchanged harness behaviour)', () => {
    const work = squashMergedRepo('dirty');
    fs.appendFileSync(path.join(work, 'base.txt'), 'edit\n');
    expect(runHook(work).status).toBe(2);
    expect(runHook(work).stderr).toMatch(/uncommitted changes/);
    git(work, 'checkout', '--', 'base.txt');
    fs.writeFileSync(path.join(work, 'stray.txt'), 'x');
    expect(runHook(work).status).toBe(2);
    expect(runHook(work).stderr).toMatch(/untracked files/);
  });

  it('exits 0 silently when the ONLY unpushed commit is a held merge record — D-210', () => {
    const work = squashMergedRepo('record');
    commit(work, 'doc.md', "[AMD-999] — #1's merge record, held per D-210");
    const r = runHook(work);
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('counts ONE unpushed code commit after a squash-merge restart, not two', () => {
    // The harness hook measured origin/feat..HEAD here = {squash commit, code}
    // = 2. Only the code commit is on no remote ref.
    const work = squashMergedRepo('code');
    const sha = commit(work, 'code.js', 'v0.0.2 — real work');
    const r = runHook(work);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/There are 1 unpushed commit\(s\) on branch 'feat'/);
    expect(r.stderr).toContain(sha.slice(0, 7));
    expect(r.stderr).not.toMatch(/There are 2 /);
  });

  it('with a record AND a code commit: exits 2, lists only the code commit, names the held record', () => {
    const work = squashMergedRepo('mixed');
    const rec = commit(work, 'doc.md', '[AMD-998] — a held record');
    const code = commit(work, 'code.js', 'v0.0.3 — real work');
    const r = runHook(work);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/There are 1 unpushed commit/);
    expect(r.stderr).toContain(code.slice(0, 7));
    expect(r.stderr).not.toContain(rec.slice(0, 7));
    expect(r.stderr).toMatch(/1 held merge record/);
  });

  it('a code commit that merely MENTIONS a record in its subject is still code', () => {
    const work = squashMergedRepo('mention');
    commit(work, 'code.js', 'fix: the thing noted in [AMD-1]');
    expect(runHook(work).status).toBe(2);
  });

  it('exits 0 immediately when stop_hook_active is true (recursion guard unchanged)', () => {
    const work = squashMergedRepo('recurse');
    commit(work, 'code.js', 'v0.0.4 — unpushed');
    expect(runHook(work, { stop_hook_active: true }).status).toBe(0);
  });
});

describe('install-stop-hook.sh', () => {
  it('installs the repo hook over an existing target, byte-identical and executable; no-op when absent', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-home-'));
    const target = path.join(home, 'stop-hook-git-check.sh');
    // absent target → no-op, exit 0
    let r = spawnSync('bash', [INSTALLER], { encoding: 'utf8', env: { ...process.env, STOP_HOOK_TARGET: target } });
    expect(r.status).toBe(0);
    expect(fs.existsSync(target)).toBe(false);
    // stale harness copy present → replaced
    fs.copyFileSync(HARNESS, target);
    r = spawnSync('bash', [INSTALLER], { encoding: 'utf8', env: { ...process.env, STOP_HOOK_TARGET: target } });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/installed/);
    expect(fs.readFileSync(target, 'utf8')).toBe(fs.readFileSync(HOOK, 'utf8'));
    expect(fs.statSync(target).mode & 0o111).not.toBe(0);
    // idempotent: second run says nothing
    r = spawnSync('bash', [INSTALLER], { encoding: 'utf8', env: { ...process.env, STOP_HOOK_TARGET: target } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('.claude/settings.json registers the installer at SessionStart', () => {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'));
    const cmds = s.hooks.SessionStart.flatMap((h) => h.hooks.map((x) => x.command));
    expect(cmds.some((c) => c.includes('scripts/install-stop-hook.sh'))).toBe(true);
  });
});
