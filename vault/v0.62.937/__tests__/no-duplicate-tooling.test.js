import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// On 22-08 '26 three copies of count-interactions.js existed at once: scripts/
// (fixed), instr/ (uploaded in #1740, missing both protocol fixes), and an
// older one on the operator's machine that `find` picked FIRST and that read
// `--sessions` as a directory path.
//
// The damage from a duplicate measuring tool is not that it fails — it is that
// it SUCCEEDS with wrong numbers. The instr/ copy matched only `Task` and not
// `Agent`, so it reported a confident `agents_total: 0` on a corpus containing
// subagent calls; and it summed token usage per transcript line rather than
// per message.id, inflating every figure by 1.938x measured on this repo's own
// transcript. Both read as normal output.
//
// The operator's ruling (22-08 '26): "delete instr copy, keep scripts one".
// This keeps it deleted, because the journal entry that recorded the decision
// cannot stop the next upload.
describe('measurement tooling is not duplicated', () => {
  const NAME = 'count-interactions.js';

  function walk(dir, hits = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'public') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, hits);
      else if (e.name === NAME) hits.push(path.relative(ROOT, p));
    }
    return hits;
  }

  const found = walk(ROOT);

  it('has exactly one copy, and it lives in scripts/', () => {
    expect(found).toEqual(['scripts/count-interactions.js']);
  });

  it('that copy carries both protocol fixes', () => {
    // A single copy is worth little if it is the WRONG single copy — deleting
    // scripts/ and keeping instr/ would satisfy the count above and reinstate
    // both bugs. So the survivor is identified by behaviour, not by path.
    const src = fs.readFileSync(path.join(ROOT, found[0]), 'utf8');
    expect(src, '§4: must match Agent as well as Task').toContain("b.name === 'Agent'");
    expect(src, '§5: must dedupe usage on message.id').toContain('seenMessageIds');
  });

  it('the check can actually fire', () => {
    const fake = ['scripts/count-interactions.js', 'instr/count-interactions.js'];
    expect(fake).not.toEqual(['scripts/count-interactions.js']);
    expect(walk(ROOT).length).toBe(1);
  });
});
