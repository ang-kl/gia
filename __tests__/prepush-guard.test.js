import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { decide, inspect } = await import(path.join(ROOT, 'scripts', 'prepush-guard.mjs'));

// O-219 / X-31. Four times in one arc (X-20, X-22, X-23, X-31) new work was
// pushed onto a branch whose PR had already been squash-merged. The push
// SUCCEEDS, the closed PR ignores it, main never gets it — and nothing reports
// a problem. Succeeding silently is why it kept recurring.
describe('prepush-guard decision', () => {
  it('blocks a fast-forward onto an already-merged branch tip', () => {
    const d = decide({ isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: true, remoteTipIsAncestorOfMain: false });
    expect(d.action).toBe('block');
    expect(d.reason).toMatch(/closed PR|never reach main/i);
  });

  it('ALLOWS a force push onto a merged tip — that is the correct recovery', () => {
    // The guard must not obstruct restarting a branch from main after a merge.
    // Blocking this would make the guard worse than the bug.
    const d = decide({ isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: false, remoteTipIsAncestorOfMain: false });
    expect(d.action).toBe('allow');
    expect(d.reason).toMatch(/force/i);
  });

  it('allows an ordinary push to an unmerged branch', () => {
    expect(decide({ isNewBranch: false, remoteTipMergedIntoMain: false, isFastForward: true }).action)
      .toBe('allow');
  });

  it('allows a brand-new branch', () => {
    expect(decide({ isNewBranch: true }).action).toBe('allow');
  });

  it('BLOCKS when the main ref did not resolve — the check did not run', () => {
    // X-35b. A guard that cannot perform its check must fail loudly, not pass
    // quietly — the principle already applied to an unreadable stdin. The
    // reason must not read as a finding about the branch, because it is not one.
    const d = decide({ isNewBranch: false, mainRefResolved: false, remoteTipMergedIntoMain: false, isFastForward: true });
    expect(d.action).toBe('block');
    expect(d.reason).toMatch(/DID NOT RUN/);
    expect(d.reason).toMatch(/absence of evidence/);
    expect(d.reason).not.toMatch(/still carries unmerged content/);
  });

  it('lets a NEW branch through even with no main ref — nothing to be stale', () => {
    // The blind-block must not swallow the one case that is unconditionally
    // safe, or a first push from a fresh clone would be refused.
    expect(decide({ isNewBranch: true, mainRefResolved: false }).action).toBe('allow');
  });

  it('blocks in exactly two of six states — it is not a blanket refusal', () => {
    const states = [
      { isNewBranch: true },
      { isNewBranch: false, remoteTipMergedIntoMain: false, isFastForward: true },
      { isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: false, remoteTipIsAncestorOfMain: false },
      { isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: true, remoteTipIsAncestorOfMain: false },
      // the false positive a test caught before it shipped: branch sitting AT
      // main, then given work. Content-identical, fast-forward — but fine.
      { isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: true, remoteTipIsAncestorOfMain: true },
      // X-35b: blind. Looks identical to row 2 on every other field.
      { isNewBranch: false, mainRefResolved: false, remoteTipMergedIntoMain: false, isFastForward: true },
    ];
    expect(states.map((s) => decide(s).action))
      .toEqual(['allow', 'allow', 'allow', 'block', 'allow', 'block']);
  });

  it('omitting mainRefResolved keeps the pre-X-35b behaviour — the default is the ordinary case', () => {
    // The field defaults to true so callers testing another axis need not
    // restate it. Asserted rather than assumed, because a permissive default is
    // exactly the kind of thing that silently un-guards a check.
    expect(decide({ isNewBranch: false, remoteTipMergedIntoMain: false, isFastForward: true }).action).toBe('allow');
  });
});

// Integration against REAL history. These are the actual SHAs from X-31, still
// present in this repo, so the detector is exercised on the event it exists for
// rather than on a synthetic fixture.
describe('prepush-guard against the real X-31 history', () => {
  const has = (sha) => {
    try { execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); return true; }
    catch { return false; }
  };

  const MERGE_COMMIT = '73f6d867';   // main after #1745 merged
  const BRANCH_TIP = 'b2b0c4a2';     // the branch tip that PR squashed
  const BAD_PUSH = '19f3132e';       // what was pushed onto it five minutes later
  // BAD_PUSH's parent IS BRANCH_TIP, which is what made it a fast-forward.
  // An earlier draft of this test passed 'HEAD' as the local sha; today's HEAD
  // was cherry-picked onto main, so BRANCH_TIP is no longer its ancestor and
  // the fast-forward check correctly said false — the test failed for the right
  // reason, on the wrong input.

  it.runIf(has(MERGE_COMMIT) && has(BRANCH_TIP) && has(BAD_PUSH))(
    'recognises the squash-merged tip as merged, though it is NOT an ancestor',
    () => {
      const facts = inspect(BRANCH_TIP, BAD_PUSH, MERGE_COMMIT);
      // The point of using content rather than ancestry: a squash creates a new
      // commit object, so --is-ancestor says false while the work did land.
      let ancestor = true;
      try { execFileSync('git', ['merge-base', '--is-ancestor', BRANCH_TIP, MERGE_COMMIT], { cwd: ROOT, stdio: 'ignore' }); }
      catch { ancestor = false; }
      expect(ancestor).toBe(false);                       // ancestry would have missed it
      expect(facts.remoteTipMergedIntoMain).toBe(true);   // content catches it
      expect(facts.isFastForward).toBe(true);             // and it WAS a fast-forward
      expect(decide(facts).action).toBe('block');         // so the guard would have stopped it
    },
  );

  // X-35. This assertion used to read `expect(facts.remoteTipMergedIntoMain)
  // .toBe(false)` — it assumed the branch always carries unmerged work. It does
  // not: immediately after a squash-merge the branch is restarted from
  // origin/main and is content-IDENTICAL to it, so the flag flips to true and
  // the test failed. It would have failed after EVERY merge, and it failed on
  // the first one after it shipped (#1747, 25-08 '26). The same lesson as the
  // fixture-repo comment below, arriving through the other door: a test that
  // reads the live repo must assert something true in every state the repo can
  // legitimately be in, not the state it happened to be in when written.
  //
  // What IS invariant: the guard never blocks the repo's own HEAD against
  // origin/main. Blocking needs content-identical AND fast-forward AND NOT an
  // ancestor of main — and a tip identical to main IS an ancestor of it. So
  // both legitimate positions are allowed, and the test names which one it saw
  // rather than hard-coding one of them.
  // X-35b is FIXED IN inspect() NOW, not compensated for here. It used to
  // report a missing ref and an unmerged branch identically — both arrive as
  // remoteTipMergedIntoMain === false, because gitOk cannot tell "the answer is
  // no" from "the question could not be asked". CI runs actions/checkout@v5 at
  // the default fetch-depth of 1, which is shallow, detached and has no
  // origin/main, so this test asserted false === false against a ref that does
  // not exist: green, and asserting nothing. That is X-32's silent skip wearing
  // a passing badge.
  //
  // inspect() now measures mainRefResolved as its own fact, so the test asks
  // for it instead of guessing from a value that means two things.
  it('reports which situation the repo is in, and never blocks its own HEAD when main resolves', () => {
    const facts = inspect('HEAD', 'HEAD', 'origin/main');

    if (!facts.mainRefResolved) {
      // Shallow/detached checkout. The guard is BLIND, and must now say so
      // rather than claim the branch is unmerged.
      expect(facts.remoteTipMergedIntoMain).toBe(false);
      expect(decide(facts).action).toBe('block');
      expect(decide(facts).reason).toMatch(/DID NOT RUN/);
      return;
    }

    // Main resolves, so the guard can actually answer. Blocking needs
    // content-identical AND fast-forward AND not-an-ancestor — and a tip
    // identical to main IS an ancestor of it, so both legitimate branch
    // positions are allowed. The test names which one it saw.
    expect(decide(facts).action).toBe('allow');
    if (facts.remoteTipMergedIntoMain) {
      expect(facts.remoteTipIsAncestorOfMain).toBe(true);   // restarted from main after a merge
    } else {
      expect(facts.remoteTipIsAncestorOfMain).toBe(false);  // carrying unmerged work
    }
  });

  it('distinguishes a missing ref from an unmerged branch — the X-35b fix itself', () => {
    const blind = inspect('HEAD', 'HEAD', 'origin/definitely-not-a-ref');
    const seeing = inspect('HEAD', 'HEAD', 'HEAD');

    // The two used to be indistinguishable on this field alone...
    expect(blind.remoteTipMergedIntoMain).toBe(false);
    // ...and are now separated by one that is measured, not inferred.
    expect(blind.mainRefResolved).toBe(false);
    expect(seeing.mainRefResolved).toBe(true);
    expect(decide(blind).action).toBe('block');
  });

  });

// The hook's stdin path — the one the assertions above do NOT reach.
//
// The first implementation read stdin via `require('node:fs')` inside an ESM
// module. `require` is undefined there, it threw, a catch swallowed it, stdin
// came back '' and the hook exited 0 on EVERY push. Installed, executable, and
// completely inert. Every assertion above still passed, because they call
// decide() and inspect() directly. Only driving the real hook exposed it.
//
// These build a THROWAWAY REPO rather than leaning on this one's refs. The
// first version used `origin/main` and passed locally while failing in CI with
// `unknown revision` three times over — GitHub checks out detached with no
// origin/main, and a shallow clone has none of the historical SHAs either, so
// the X-31 replay merely SKIPPED. A test that skips in CI protects nothing.
// A fixture repo reproduces the squash-merge exactly and depends on nothing.
describe('prepush-guard hook invocation (end to end)', () => {
  const GUARD = path.join(ROOT, 'scripts', 'prepush-guard.mjs');
  let repo;

  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'prepush-'));
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'config', 'user.email', 't@t');
    git(repo, 'config', 'user.name', 't');

    fs.writeFileSync(path.join(repo, 'a.txt'), 'base\n');
    git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'base');

    // feature branch with work
    git(repo, 'checkout', '-q', '-b', 'feature');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'work\n');
    git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'work');
    featureTip = git(repo, 'rev-parse', 'HEAD');

    // one more commit on the branch — what a later push would carry
    fs.writeFileSync(path.join(repo, 'b.txt'), 'more\n');
    git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'more');
    featureNext = git(repo, 'rev-parse', 'HEAD');

    // SQUASH-MERGE it into main: a NEW commit carrying the same content, which
    // is why ancestry misses it and content does not.
    git(repo, 'checkout', '-q', 'main');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'work\n');
    git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'squash of feature');
    git(repo, 'update-ref', 'refs/remotes/origin/main', git(repo, 'rev-parse', 'main'));
  });

  afterAll(() => { if (repo) fs.rmSync(repo, { recursive: true, force: true }); });

  let featureTip; let featureNext;

  const run = (stdin) => {
    try {
      execFileSync('node', [GUARD], { cwd: repo, input: stdin, encoding: 'utf8', stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status ?? 1;
    }
  };

  it('BLOCKS a fast-forward onto a squash-merged tip — the X-31 shape', () => {
    // featureTip content == main content, but is NOT an ancestor of main.
    expect(run(`refs/heads/f ${featureNext} refs/heads/feature ${featureTip}\n`)).toBe(1);
  });

  it('allows a force push onto that same merged tip — the recovery', () => {
    // localSha unrelated to featureTip => not a fast-forward.
    const mainSha = git(repo, 'rev-parse', 'main');
    expect(run(`refs/heads/f ${mainSha} refs/heads/feature ${featureTip}\n`)).toBe(0);
  });

  it('allows a push to a branch sitting AT main — the false positive that was caught', () => {
    const mainSha = git(repo, 'rev-parse', 'main');
    expect(run(`refs/heads/f ${featureNext} refs/heads/other ${mainSha}\n`)).toBe(0);
  });

  it('skips pushes to main entirely', () => {
    expect(run('refs/heads/main abc123 refs/heads/main def456\n')).toBe(0);
  });

  it('ignores a branch deletion', () => {
    expect(run(`refs/heads/f ${'0'.repeat(40)} refs/heads/y ${featureTip}\n`)).toBe(0);
  });

  it('passes an empty ref list', () => {
    expect(run('')).toBe(0);
  });

  // X-35b, driven through the REAL hook rather than through decide(). This is
  // the path every assertion above the fixture block misses — the same blind
  // spot that let the first implementation ship inert (require() in ESM,
  // swallowed, stdin '' , exit 0 on every push).
  it('BLOCKS through the hook when origin/main is absent, and says the check did not run', () => {
    const blind = fs.mkdtempSync(path.join(os.tmpdir(), 'prepush-blind-'));
    try {
      git(blind, 'init', '-q', '-b', 'main');
      git(blind, 'config', 'user.email', 't@t');
      git(blind, 'config', 'user.name', 't');
      fs.writeFileSync(path.join(blind, 'a.txt'), 'base\n');
      git(blind, 'add', '-A'); git(blind, 'commit', '-qm', 'base');
      const sha = git(blind, 'rev-parse', 'HEAD');

      // No origin remote at all, so the hook's self-healing fetch fails and the
      // ref stays unresolvable — the CI checkout shape.
      expect(() => execFileSync('git', ['rev-parse', '--verify', 'origin/main'], { cwd: blind, stdio: 'ignore' }))
        .toThrow();

      let status = 0; let stderr = '';
      try {
        execFileSync('node', [GUARD], {
          cwd: blind,
          input: `refs/heads/f ${sha} refs/heads/feature ${sha}\n`,
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (e) { status = e.status ?? 1; stderr = e.stderr ?? ''; }

      expect(status).toBe(1);
      expect(stderr).toMatch(/DID NOT RUN/);
      // Before the fix this same input exited 0 with "still carries unmerged
      // content" — a claim about a comparison that never happened.
      expect(stderr).not.toMatch(/still carries unmerged content/);
    } finally {
      fs.rmSync(blind, { recursive: true, force: true });
    }
  });
});
