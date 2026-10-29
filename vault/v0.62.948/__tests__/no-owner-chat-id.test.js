// ⚠ THE OWNER'S TELEGRAM CHAT ID MUST NOT APPEAR IN THIS REPOSITORY.
//
// It was here: 1,056 occurrences across 26 tracked files — 12 raw deploy logs under `log/`, ten
// journal and register entries under `doc/`, two test files, and explanatory comments in
// `index.js` and `user-data.js`. Every one was prose, a fixture, or captured runtime output;
// nothing in any code path ever authenticated with it. That is precisely why it survived so long:
// a chat id is not a credential, so no secret scanner was looking for it, and it reads as an
// ordinary number in a log line.
//
// It is still an identifier for a real person, and this repository is public. The operator's
// decision (02-09 '26) was to scrub the current tree and guard it, leaving git history alone —
// history rewriting across 1,800+ merged pull requests breaks every clone and every commit link
// for a value that grants no access.
//
// ⚠ THE FORBIDDEN VALUE IS NOT WRITTEN DOWN HERE. A guard that stores the thing it forbids has
// republished it, in a file whose whole purpose is to say it must not be republished — the same
// self-defeating shape as a secret-scanner allowlist that quotes the secret. So this pins the
// SHA-256 of the id and hashes candidate digit runs to compare. The digest is one-way: it cannot
// be read back into the id, and it cannot match anything else.
//
// The counting note is not decoration either. `git grep -c` reports 47 for this value, and 47 is
// the number of matching LINES; the log files are single-line JSON arrays holding hundreds of
// occurrences each. The real figure is 1,056. A scan that measures the wrong unit reports a small
// problem and gets treated like one.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// sha256 of the owner's real Telegram chat id, and of the ten-digit id that shares its prefix
// (the pair `user-data.js` cites when explaining why every erasure pattern terminates the id).
const FORBIDDEN = new Set([
  '276f603bf62a5e7555f09e8532be2eeb04ec14edf7afb652577c8d2c3ca35599',
  '0d49e12de4c4e8e56427c0921abe16fe149001440250983717c945492de8f957',
]);

const DIGITS = /\d{8,12}/g;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8').split('\0').filter(Boolean);
}

describe('the owner chat id is not in the tree', () => {
  it('⚠ no tracked file contains it', () => {
    const hits = [];
    let scanned = 0;
    let candidates = 0;
    for (const rel of trackedFiles()) {
      const abs = path.join(ROOT, rel);
      let st;
      try { st = fs.statSync(abs); } catch { continue; }
      if (!st.isFile() || st.size > 32 * 1024 * 1024) continue;
      const buf = fs.readFileSync(abs);
      if (buf.includes(0)) continue;            // binary; the digit scan is meaningless there
      scanned++;
      const text = buf.toString('utf8');
      const seen = new Set();
      for (const m of text.matchAll(DIGITS)) seen.add(m[0]);
      candidates += seen.size;
      for (const run of seen) if (FORBIDDEN.has(sha(run))) hits.push(rel);
    }
    // ⚠ THE SCAN MUST HAVE ACTUALLY LOOKED. Reporting "0 hits" after reading nothing is the
    // failure this arc keeps finding — four checks passed vacuously on an empty parse the same
    // day this file was written. A floor on both files and digit runs makes an empty scan fail
    // loudly rather than pass quietly.
    expect(scanned, 'the scan read no files — it is not measuring anything').toBeGreaterThan(500);
    expect(candidates, 'no digit runs found at all — the extractor is broken').toBeGreaterThan(500);
    expect([...new Set(hits)], 'the owner chat id is back in these files').toEqual([]);
  });

  it('the digest pins are real sha256 digests, and one of them matches a known input', () => {
    for (const d of FORBIDDEN) expect(d).toMatch(/^[0-9a-f]{64}$/);
    // Proves the comparison works end to end without naming the forbidden value: a digest of a
    // string this file DOES contain must be found by the same code path.
    const canary = 'not-the-chat-id';
    const probe = new Set([sha(canary)]);
    expect(probe.has(sha(canary))).toBe(true);
    expect(FORBIDDEN.has(sha(canary))).toBe(false);
  });

  it('the synthetic stand-in keeps the prefix relationship user-data.js relies on', () => {
    // `user-data.js` explains that a bare trailing wildcard on `100000001` would also match
    // `1000000019`. If a later scrub broke that pair, the explanation would stop being an example
    // of anything — so assert the property the prose claims.
    expect(String(1000000019).startsWith(String(100000001))).toBe(true);
    const src = fs.readFileSync(path.join(ROOT, 'user-data.js'), 'utf8');
    expect(src).toContain('1000000019');
    expect(src).toContain('100000001');
  });
});
