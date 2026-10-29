// __tests__/wrong-log.test.js — v0.62.860.
//
// Operator: *"I scanned that there are more than 77 times the word 'wrong' appear in the
// conversation for the past 3 days. Can you copy those paragraphs into the vibe-coding journal
// with a section called Wrong-Log. These are good learning lessons."*
//
// Three things this suite has to hold down, in descending order of how bad it is to get wrong:
//
//   1. NOTHING LEAKS. The redaction pipeline is shared with the extractor that feeds a page
//      served at soleat.net, and it is made of five Codex findings. The run over the real
//      transcript reported `redactions: 0` — which is exactly the shape of number the original
//      author warned "reads as assurance". So the pipeline is proved to FIRE here, on planted
//      secrets, rather than inferred from a zero.
//   2. NOTHING IS COMMITTED. The operator was shown that this repo is public and chose that
//      the output must stay out of it. A .gitignore line is precisely what a later `git add -A`
//      defeats silently, so it is asserted.
//   3. THE HOSTED PAGE IS UNTOUCHED. generate.mjs embeds its data straight into
//      public/doc/vibe-journal.html, so any wiring there would publish the log by accident.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const VCR = 'doc/VibeCodingRecord';
// Dynamic import() paths must be LITERAL here: Vite resolves variable specifiers only one
// level deep and fails with "Unknown variable dynamic import". VCR stays for readFileSync,
// which is a plain string join and has no such rule.

describe('1 — the redaction pipeline is shared, not copied', () => {
  it('redact.mjs exists and the old extractor imports it instead of defining its own', async () => {
    // A second copy would drift, and the drift would be silent until it leaked. This is the
    // hazard translate-dishes.js and open-hours.js:375 both name in their own words.
    const ex = read(`${VCR}/extract-session-replies.mjs`);
    expect(existsSync(join(ROOT, VCR, 'redact.mjs'))).toBe(true);
    expect(ex).toMatch(/from '\.\/redact\.mjs'/);
    expect(ex, 'the extractor has grown its own KNOWN_SHAPES again').not.toMatch(/^const KNOWN_SHAPES = \[/m);
    expect(ex, 'the extractor has grown its own redact()').not.toMatch(/^function redact\(/m);
  });

  it('and imports only the names it uses', () => {
    // The first cut imported all ten exports; six had exactly one occurrence — the import
    // itself. Unused imports read as if they were needed.
    const ex = read(`${VCR}/extract-session-replies.mjs`);
    const line = ex.match(/import \{([^}]*)\} from '\.\/redact\.mjs'/);
    expect(line).toBeTruthy();
    const names = line[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const n of names) {
      const uses = (ex.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length;
      expect(uses, `${n} is imported but never used`).toBeGreaterThan(1);
    }
  });
});

describe('2 — the redaction FIRES (the real run reported 0, which proves nothing on its own)', () => {
  it('catches every known vendor shape', async () => {
    const m = await import('../doc/VibeCodingRecord/redact.mjs');
    const planted = {
      'GOOGLE-API-KEY': 'AIzaSyA0000000000000000000000000000000',
      'GITHUB-TOKEN': 'ghp_0000000000000000000000000000000000',
      'ANTHROPIC-KEY': 'sk-ant-00000000000000000000000000',
      'AWS-ACCESS-KEY': 'AKIA0000000000000000',
      'SLACK-TOKEN': 'xoxb-0000000000-aaaaaaaaaa',
      'TELEGRAM-TOKEN': '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    };
    for (const [label, value] of Object.entries(planted)) {
      const { text, redactions } = m.redact(`a paragraph saying something was wrong: ${value}`, []);
      expect(redactions, `${label} was not redacted`).toBeGreaterThan(0);
      expect(text, `${label} survived into the output`).not.toContain(value);
    }
  });

  it('catches a WORD-SHAPED operator token that the entropy layer CANNOT see', async () => {
    // The I18N_TRANSLATE_TOKEN case, and the fixture matters more than the assertion.
    //
    // My first version used `SomeWordShapedValue9`, and a mutation that deleted the whole
    // positional layer still passed — because that string scores 3.68 bits and IS caught by
    // `looksRandom`. The test named layer 2b and exercised layer 2a. Measured isolator:
    // `forkiasee2languages` has no uppercase, so `looksRandom` rejects it outright, and it is
    // 19 chars so CANDIDATE never matches it either. Only the positional rule can find it.
    const m = await import('../doc/VibeCodingRecord/redact.mjs');
    expect(m.looksRandom('forkiasee2languages'), 'the fixture stopped isolating layer 2b').toBe(false);
    const secrets = m.collectOperatorSecrets([
      { type: 'user', message: { content: 'I18N_TRANSLATE_TOKEN=forkiasee2languages' } }
    ]);
    expect(secrets, 'the word-shaped token was not collected').toContain('forkiasee2languages');
    const { text } = m.redact('this was wrong: forkiasee2languages', secrets);
    expect(text).not.toContain('forkiasee2languages');
  });

  it('does NOT mask configuration identifiers — over-masking destroys the record', async () => {
    // Three earlier cuts of this pipeline redacted 77, then 258, then a dozen model names.
    // Masking `gemini-2.5-flash-lite` still reports a healthy redaction count while making the
    // artefact meaningless, which is the failure in the other direction.
    // The fixture has to put the identifier where the guard actually applies: ALONE on a line
    // following a credential-context line. My first version wrote it inside a sentence, which
    // fails the bare-line test for an unrelated reason — so deleting the guard changed nothing
    // and the mutation passed. A test that cannot see the code it names is not a test.
    const m = await import('../doc/VibeCodingRecord/redact.mjs');
    expect(m.contextCandidates('api key below\ngemini-2.5-flash-lite'),
      'a lowercase config identifier is being collected as a secret').toEqual([]);
    const secrets = m.collectOperatorSecrets([
      { type: 'user', message: { content: 'the key is here\ngemini-2.5-flash-lite\nclaude/handover-july-11-49uzvf' } }
    ]);
    expect(secrets).not.toContain('gemini-2.5-flash-lite');
    expect(secrets).not.toContain('claude/handover-july-11-49uzvf');
  });

  it('residualSecrets is what makes the run fail closed', async () => {
    const m = await import('../doc/VibeCodingRecord/redact.mjs');
    expect(m.residualSecrets('nothing here')).toEqual([]);
    expect(m.residualSecrets('AIzaSyA0000000000000000000000000000000').length).toBeGreaterThan(0);
    // and the extractor acts on it
    expect(read(`${VCR}/extract-wrong-log.mjs`)).toMatch(/REFUSING TO WRITE/);
    expect(read(`${VCR}/extract-wrong-log.mjs`)).toMatch(/process\.exit\(1\)/);
  });
});

describe('3 — the output never reaches the public repo', () => {
  const ignored = [
    `${VCR}/data/wrong-log.ndjson`,
    `${VCR}/data/wrong-log.stats.json`,
    `${VCR}/wrong-log.html`
  ];

  it('every output path is gitignored', () => {
    const gi = read('.gitignore');
    for (const p of ignored) expect(gi, `${p} is not ignored`).toContain(p);
  });

  it('and git actually ignores them — the .gitignore text is not the same as the behaviour', () => {
    for (const p of ignored) {
      let out = '';
      try { out = execFileSync('git', ['check-ignore', '-v', p], { cwd: ROOT }).toString(); } catch { /* not ignored */ }
      expect(out, `git does not ignore ${p}`).toContain('.gitignore');
    }
  });

  it('none of them is tracked', () => {
    const tracked = execFileSync('git', ['ls-files', ...ignored], { cwd: ROOT }).toString().trim();
    expect(tracked, `these are committed: ${tracked}`).toBe('');
  });

  it('the SCRIPTS are committed, because the tool is the durable half', () => {
    const tracked = execFileSync('git', ['ls-files', VCR], { cwd: ROOT }).toString();
    expect(tracked).toContain('extract-wrong-log.mjs');
    expect(tracked).toContain('build-wrong-log.mjs');
  });
});

describe('4 — the hosted journal is untouched', () => {
  it('generate.mjs does not read or embed the wrong-log', () => {
    // It embeds its data directly into the served page (`const REPLIES = …`), so wiring the
    // wrong-log in would publish it regardless of any route gate.
    const g = read(`${VCR}/generate.mjs`);
    expect(g).not.toMatch(/wrong-log/);
  });

  it('and no new file is served from /doc', () => {
    const idx = read('index.js');
    expect(idx).not.toMatch(/wrong-log/);
    // VIBE_DOC_FILES is the allowlist behind /doc/:file; it must be unchanged.
    const m = idx.match(/const VIBE_DOC_FILES = \{([\s\S]*?)\};/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toMatch(/wrong/);
  });

  it('the builder writes outside public/, so it cannot be served by accident', () => {
    const b = read(`${VCR}/build-wrong-log.mjs`);
    expect(b).toMatch(/const OUT = join\(HERE, 'wrong-log\.html'\)/);
    expect(b, 'the builder writes into the served directory').not.toMatch(/PUBLIC_DOC|public['"]\s*,\s*['"]doc/);
  });
});

describe('5 — the scan itself', () => {
  it('matches the whole word only, so the count is reproducible against the operator’s', async () => {
    const m = await import('../doc/VibeCodingRecord/extract-wrong-log.mjs');
    expect(m.WRONG.test('this was wrong')).toBe(true);
    expect(m.WRONG.test('Wrong turn')).toBe(true);
    expect(m.WRONG.test('wrongly assumed'), 'widening past \\b makes the count unreproducible').toBe(false);
    expect(m.WRONG.test('wrongness')).toBe(false);
  });

  it('days are bucketed in SGT, not UTC', () => {
    // The project stamps everything in SGT. Bucketing in UTC would put a 07:00 SGT paragraph
    // on the previous day — the same off-by-eight that serial-state-anchor.test.js caught.
    return import('../doc/VibeCodingRecord/extract-wrong-log.mjs').then((m) => {
      expect(m.sgtDay('2026-08-30T23:21:00Z')).toBe('2026-08-31');
      expect(m.sgtDay('2026-08-30T15:59:00Z')).toBe('2026-08-30');
    });
  });

  it('reads assistant text blocks only, and counts replies the way §1 does', async () => {
    const m = await import('../doc/VibeCodingRecord/extract-wrong-log.mjs');
    const out = m.assistantTexts([
      { type: 'assistant', timestamp: '2026-08-30T01:00:00Z', message: { content: [{ type: 'text', text: 'one' }] } },
      { type: 'assistant', timestamp: '2026-08-30T01:01:00Z', message: { content: [{ type: 'tool_use', input: {} }] } },
      { type: 'user', timestamp: '2026-08-30T01:02:00Z', message: { content: 'not mine' } },
      { type: 'assistant', timestamp: '2026-08-30T01:03:00Z', message: { content: [{ type: 'text', text: 'two' }] } }
    ]);
    expect(out.map((r) => r.text)).toEqual(['one', 'two']);
    expect(out.map((r) => r.replyIndex), 'tool-only turns must not consume a reply number').toEqual([1, 2]);
  });
});
