import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
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

  it('blocks in exactly one of five states — it is not a blanket refusal', () => {
    const states = [
      { isNewBranch: true },
      { isNewBranch: false, remoteTipMergedIntoMain: false, isFastForward: true },
      { isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: false, remoteTipIsAncestorOfMain: false },
      { isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: true, remoteTipIsAncestorOfMain: false },
      // the false positive a test caught before it shipped: branch sitting AT
      // main, then given work. Content-identical, fast-forward — but fine.
      { isNewBranch: false, remoteTipMergedIntoMain: true, isFastForward: true, remoteTipIsAncestorOfMain: true },
    ];
    expect(states.map((s) => decide(s).action)).toEqual(['allow', 'allow', 'allow', 'block', 'allow']);
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

  it('does not flag the current unmerged branch', () => {
    const facts = inspect('HEAD', 'HEAD', 'origin/main');
    expect(facts.remoteTipMergedIntoMain).toBe(false);
    expect(decide(facts).action).toBe('allow');
  });
});

// The hook's stdin path — the one the assertions above do NOT reach.
//
// The first implementation read stdin via `require('node:fs')` inside an ESM
// module. `require` is undefined there, it threw, a catch swallowed it, stdin
// came back '' and the hook exited 0 on EVERY push. Installed, executable, and
// completely inert. Every test above still passed, because they call decide()
// and inspect() directly. Only driving the real hook exposed it.
describe('prepush-guard hook invocation (end to end)', () => {
  const GUARD = path.join(ROOT, 'scripts', 'prepush-guard.mjs');

  const run = (stdin) => {
    try {
      execFileSync('node', [GUARD], { cwd: ROOT, input: stdin, encoding: 'utf8', stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status ?? 1;
    }
  };

  const sha = (rev) => execFileSync('git', ['rev-parse', rev], { cwd: ROOT, encoding: 'utf8' }).trim();

  it('exits non-zero on the real X-31 push', () => {
    // local 19f3132e onto remote tip b2b0c4a2, which main had already squashed.
    const line = 'refs/heads/x 19f3132e refs/heads/claude/handover-july-11-49uzvf b2b0c4a2\n';
    expect(run(line)).toBe(1);
  });

  it('exits zero on a healthy push', () => {
    const line = `refs/heads/x ${sha('HEAD')} refs/heads/feature ${sha('origin/main')}\n`;
    // origin/main content vs itself IS identical, but this is not a
    // fast-forward onto a merged tip unless HEAD descends from it — and even
    // then, a push to main is skipped outright. Use a non-main ref.
    expect(run(line)).toBe(0);
  });

  it('skips pushes to main entirely', () => {
    expect(run('refs/heads/main abc123 refs/heads/main def456\n')).toBe(0);
  });

  it('ignores a branch deletion', () => {
    expect(run(`refs/heads/x ${'0'.repeat(40)} refs/heads/y ${sha('origin/main')}\n`)).toBe(0);
  });

  it('passes an empty ref list', () => {
    expect(run('')).toBe(0);
  });
});
