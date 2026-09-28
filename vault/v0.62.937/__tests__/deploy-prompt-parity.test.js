import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// instr/claude-code-deploy-prompt.txt EMBEDS two files verbatim between
// marker lines: CLAUDE-protocol.md and scripts/count-interactions.js. It is
// the prompt used to deploy this protocol into other repos.
//
// On 22-08 '26 the embedded copies were found to be a superseded revision:
// the script matched only tool_use "Task" and not "Agent" (§4), and summed
// token usage per transcript line rather than per message.id (§5, measured
// 1.938x inflation). Both bugs produce confident wrong numbers rather than
// errors, and the prompt would have propagated them into every repo it was
// pasted into — a fault that spreads is worse than one that sits still.
//
// The prompt is now GENERATED from the live files. This asserts it stayed
// that way, because "remember to regenerate it" is the class of rule this
// repo has repeatedly watched fail (X-25).
describe('deploy prompt embeds the live files', () => {
  const PROMPT = path.join(ROOT, 'instr', 'claude-code-deploy-prompt.txt');
  const text = fs.readFileSync(PROMPT, 'utf8');

  const BLOCKS = [
    ['CLAUDE-protocol.md', 'PROTOCOL BEGIN', 'PROTOCOL END'],
    ['scripts/count-interactions.js', 'SCRIPT BEGIN', 'SCRIPT END'],
  ];

  // Anchor on the FULL marker LINE (the `====` padded delimiter), not the bare
  // words: the instructions above the blocks say "between the PROTOCOL
  // BEGIN/END markers below", so a bare indexOf finds the prose first and
  // silently extracts the wrong region. That is how the first version of this
  // test failed — usefully, and before it could pass on nothing.
  const markerLine = (word) =>
    text.split('\n').find((l) => l.includes(word) && /^=+ .* =+$/.test(l.trim()));

  function extract(beginWord, endWord) {
    const b = markerLine(beginWord);
    const e = markerLine(endWord);
    if (!b || !e) return null;
    const bi = text.indexOf(b);
    const ei = text.indexOf(e, bi + b.length);
    if (bi === -1 || ei === -1) return null;
    return text.slice(bi + b.length, ei);
  }

  for (const [file, begin, end] of BLOCKS) {
    it(`${file} block is present and matches the live file`, () => {
      const embedded = extract(begin, end);
      expect(embedded, `${begin}/${end} markers missing`).not.toBeNull();
      const live = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(embedded.trim()).toBe(live.trim());
    });
  }

  it('the embedded script carries both protocol fixes', () => {
    // Belt and braces: the equality test above would already catch a stale
    // script, but only while the live file is correct. If someone reverted
    // BOTH, equality still passes. These name the behaviours directly.
    const embedded = extract('SCRIPT BEGIN', 'SCRIPT END');
    expect(embedded, '§4: must match Agent as well as Task').toContain("b.name === 'Agent'");
    expect(embedded, '§5: must dedupe usage on message.id').toContain('seenMessageIds');
  });

  it('the extractor can actually fire', () => {
    // A parser that returns null or '' would make every comparison vacuous —
    // the exact shape that produced a false "0 rows" reading earlier today.
    const embedded = extract('SCRIPT BEGIN', 'SCRIPT END');
    expect(embedded.length).toBeGreaterThan(1000);
    expect(extract('NO SUCH MARKER', 'ALSO MISSING')).toBeNull();
  });
});
