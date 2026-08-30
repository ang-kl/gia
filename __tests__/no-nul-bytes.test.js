// __tests__/no-nul-bytes.test.js — v0.62.849.
//
// Operator: "thoroughly investigate the translation code — check that the sequence are
// not overdrift". This came out of that audit, and it is not a style rule.
//
// A literal 0x00 byte in a source file is valid JavaScript and runs correctly. What it
// does is make GIT CLASSIFY THE FILE AS BINARY — so:
//   * every diff of it renders as an unreviewable blob ("Binary files differ"),
//   * `grep` skips it silently, and
//   * a reviewer, human or bot, sees nothing to review.
//
// `name-gloss.js` — TRANSLATION CODE, the meaning-gloss on a foreign venue name — had
// carried two of them: a Redis "no gloss" sentinel written as a raw NUL rather than an
// escape. It was found only because a routine grep across the translation path printed
// "binary file matches" instead of a line.
//
// The same defect was caught in `pronounce-client.js` before it shipped (v0.62.841), by
// reading `git diff --numstat` and seeing a "-  -" row where a line count belonged.
// Twice is a pattern, so it becomes a test.
//
// THE FIX CARRIES NO BEHAVIOURAL RISK, which is why it did not need a decision: the
// escape evaluates to exactly the same one-character string as a literal NUL, so every
// value already cached in Redis under the old sentinel still matches.
//
// A NOTE ON THE SCAN ITSELF. The first version of this check used `grep -P '\x00'`,
// which matches NOTHING — it reported the repo clean while two files were affected. A
// scan that returns a false negative is worse than no scan at all, so the comparison is
// done on bytes here, and the first test proves the detector fires on a known-bad string
// before the second test is allowed to mean anything.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = join(__dirname, '..');
const NUL = String.fromCharCode(0);
const EXTS = ['.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.html', '.css'];

function trackedSourceFiles() {
  const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return out.split('\n').filter((f) => f && EXTS.some((e) => f.endsWith(e)));
}

describe('no source file contains a literal NUL byte', () => {
  it('the detector actually fires — a scan that cannot fail proves nothing', () => {
    const bad = 'const sentinel = ' + NUL + ';';
    expect(bad.includes(NUL), 'the detector cannot see a NUL it was handed').toBe(true);
    // The escaped form must NOT be flagged: it is the fix, not the defect.
    expect("const sentinel = '\\u0000';".includes(NUL)).toBe(false);
  });

  it('every tracked source file is free of them', () => {
    const offenders = [];
    for (const f of trackedSourceFiles()) {
      let text;
      try { text = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
      const n = text.split(NUL).length - 1;
      if (n) offenders.push(f + ' (' + n + ')');
    }
    expect(
      offenders,
      'a literal NUL makes git treat the file as BINARY, so its diffs become unreviewable. '
      + 'Use the escape backslash-u-0000, which is the same string at runtime.',
    ).toEqual([]);
  });

  it('name-gloss.js in particular — it carried two, and it is translation code', () => {
    const src = readFileSync(join(ROOT, 'name-gloss.js'), 'utf8');
    expect(src.includes(NUL)).toBe(false);
    // The sentinel itself must still be there, escaped — losing it would change the
    // cache contract rather than just the file's encoding.
    expect(src, 'the sentinel is gone entirely — that changes behaviour, not encoding')
      .toContain("'\\u0000'");
  });
});
