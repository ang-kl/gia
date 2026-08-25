#!/usr/bin/env node
// scripts/prepush-guard.mjs — O-219
//
// Blocks the failure that happened FOUR times in one arc (X-20, X-22, X-23,
// X-31): pushing new work onto a branch whose pull request has already been
// squash-merged. The commit lands on the branch, the closed PR never picks it
// up, and `main` never receives it — while everything reports success. The
// push succeeds. That is precisely why it kept recurring.
//
// WHAT IT DETECTS, AND WHAT IT DOES NOT
// A squash-merge leaves a local signature needing no API and no token: the
// remote branch tip becomes CONTENT-IDENTICAL to main. Replayed against the
// real X-31 moment:
//     git diff 73f6d867 b2b0c4a2  -> empty     (PR had merged)
//     git diff origin/main HEAD   -> 8 files   (healthy, unmerged)
// So this guards "this branch is already merged by content" — NOT "the PR is
// closed". The two overlap in the case that bit us; they are not the same
// predicate, and a branch merged by rebase rather than squash may not trip it.
//
// FAST-FORWARD IS BLOCKED, FORCE IS NOT.
// After a merge, restarting the branch from main and force-pushing is the
// CORRECT recovery — the one this guard must not obstruct. Only a
// fast-forward onto an already-merged tip is the mistake, because only that
// silently appends to a dead PR.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const gitOk = (...args) => {
  try { execFileSync('git', args, { stdio: 'ignore' }); return true; } catch { return false; }
};

// Pure decision, kept separate from git so it can be tested without a repo.
// Returns { action: 'allow' | 'block', reason }.
export function decide({ isNewBranch, remoteTipMergedIntoMain, isFastForward, remoteTipIsAncestorOfMain }) {
  if (isNewBranch) {
    return { action: 'allow', reason: 'new branch — no remote tip to be stale' };
  }
  if (!remoteTipMergedIntoMain) {
    return { action: 'allow', reason: 'remote tip still carries unmerged content' };
  }
  // Content-identical to main has TWO causes, and only one is the bug:
  //   squash-merged  — the tip is a DIFFERENT commit whose content landed, so
  //                    it is NOT an ancestor of main. This is X-31.
  //   sitting at main — the branch was pushed at main's own commit and has not
  //                    diverged yet. The tip IS an ancestor of main, and
  //                    pushing work onto it is completely normal.
  // Without this the guard blocks the second case, which a test caught before
  // it shipped: "push an empty branch, then push work" is ordinary practice
  // and a guard that forbids it would be worse than the failure it prevents.
  if (remoteTipIsAncestorOfMain) {
    return {
      action: 'allow',
      reason: 'remote tip is an ancestor of main — the branch is sitting at main, not merged away from it',
    };
  }
  if (!isFastForward) {
    return {
      action: 'allow',
      reason: 'branch tip is merged, but this is a force push — the deliberate restart after a merge',
    };
  }
  return {
    action: 'block',
    reason:
      'the remote branch tip is CONTENT-IDENTICAL to main, so its pull request has been merged. '
      + 'A fast-forward push would append to a closed PR: it would succeed, and the work would '
      + 'never reach main. Restart the branch from main and force-push with a lease instead.',
  };
}

// Gather the facts this repo can answer locally.
export function inspect(remoteSha, localSha, mainRef = 'origin/main') {
  const isNewBranch = /^0{40}$/.test(remoteSha || '');
  if (isNewBranch) return { isNewBranch: true, remoteTipMergedIntoMain: false, isFastForward: false };
  // Content comparison, not ancestry: a squash-merge produces a new commit
  // object, so `--is-ancestor` returns false even though the work landed.
  const remoteTipMergedIntoMain = gitOk('diff', '--quiet', mainRef, remoteSha);
  const isFastForward = gitOk('merge-base', '--is-ancestor', remoteSha, localSha);
  const remoteTipIsAncestorOfMain = gitOk('merge-base', '--is-ancestor', remoteSha, mainRef);
  return { isNewBranch: false, remoteTipMergedIntoMain, isFastForward, remoteTipIsAncestorOfMain };
}

function main() {
  const args = process.argv.slice(2);
  // Standalone use: `node scripts/prepush-guard.mjs --check` reports state for
  // the current branch, so the pre-push read produces QUOTABLE OUTPUT rather
  // than a claim that it happened. That is the whole point of O-219.
  if (args.includes('--check')) {
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    if (branch === 'main' || branch === 'master') {
      console.log(`branch=${branch} — nothing to guard`);
      return;
    }
    try { execFileSync('git', ['fetch', 'origin', 'main', '--quiet'], { stdio: 'ignore' }); } catch { /* offline */ }
    const remote = `origin/${branch}`;
    if (!gitOk('rev-parse', '--verify', remote)) {
      console.log(`branch=${branch} remote=absent verdict=allow (new branch)`);
      return;
    }
    const remoteSha = git('rev-parse', remote);
    const localSha = git('rev-parse', 'HEAD');
    const facts = inspect(remoteSha, localSha);
    const { action, reason } = decide(facts);
    console.log(`branch=${branch}`);
    console.log(`remote_tip=${remoteSha.slice(0, 8)}  local=${localSha.slice(0, 8)}`);
    console.log(`remote_tip_merged_into_main=${facts.remoteTipMergedIntoMain}  ancestor_of_main=${facts.remoteTipIsAncestorOfMain}  fast_forward=${facts.isFastForward}`);
    console.log(`verdict=${action.toUpperCase()} — ${reason}`);
    process.exitCode = action === 'block' ? 1 : 0;
    return;
  }

  // Hook mode: git feeds "<localref> <localsha> <remoteref> <remotesha>" lines.
  //
  // The first version read stdin with `require('node:fs')` inside this ESM
  // module. `require` is not defined in ESM, so it threw, the catch swallowed
  // it, stdin came back '' — and the hook exited 0 on EVERY push. It was
  // installed, executable, and completely inert. Caught only by driving the
  // installed hook with the real X-31 refs; the unit tests exercised decide()
  // and inspect() and never touched this path.
  //
  // fs is imported at the top now, and a read failure is REPORTED rather than
  // silently treated as "no refs to check" — a guard that cannot read its
  // input must fail loudly, not pass quietly.
  let stdin;
  try {
    stdin = readFileSync(0, 'utf8');
  } catch (err) {
    console.error(`[prepush-guard] could not read stdin: ${err.message}`);
    console.error('[prepush-guard] refusing to pass a push it could not inspect.');
    process.exit(1);
  }
  let bad = 0;
  for (const line of stdin.split('\n')) {
    const [, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/);
    if (!localSha || !remoteRef) continue;
    if (/^0{40}$/.test(localSha)) continue;                 // branch deletion
    if (remoteRef.endsWith('/main') || remoteRef.endsWith('/master')) continue;
    const { action, reason } = decide(inspect(remoteSha, localSha));
    if (action === 'block') {
      console.error(`\n[prepush-guard] BLOCKED ${remoteRef}`);
      console.error(`  ${reason}`);
      console.error(`  Override deliberately with:  git push --no-verify\n`);
      bad++;
    }
  }
  if (bad) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
