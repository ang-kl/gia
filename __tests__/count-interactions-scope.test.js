import { describe, it, expect } from 'vitest';

const { mungePath, matchesProject } = require('../scripts/count-interactions.js');

// O-215. `--sessions` under-reported by 40% — 4,090 replies against a true
// 6,822 — and TWO defects were both needed to produce that:
//
//   1. the munge replaced only / \ . _ and space, so a path containing '~'
//      (com~apple~CloudDocs, an iCloud path) failed to match its own folder;
//   2. even on a match it returned ONLY that folder, discarding the sibling
//      folder for sessions run in a subdirectory.
//
// Neither failed loudly. The script printed a clean number that was wrong.
// These are the REAL folder names from the machine where it happened; this
// container has a single simple path and cannot reproduce the case.
describe('project folder scope (O-215)', () => {
  const MAC = '/Users/akla/Library/Mobile Documents/com~apple~CloudDocs/Downloads/Github/gia';
  const REPO = '-Users-akla-Library-Mobile-Documents-com-apple-CloudDocs-Downloads-Github-gia';
  const WEB = REPO + '-web';
  const OTHER = '-Users-akla-Library-Mobile-Documents-com-apple-CloudDocs-Downloads-Github-Gia-WA';

  it('munges every non-alphanumeric character, tilde included', () => {
    expect(mungePath(MAC)).toBe(REPO);
    expect(mungePath('/home/user/gia')).toBe('-home-user-gia');
  });

  it('the old munge really did miss — this is defect 1, pinned', () => {
    const oldMunge = (p) => p.replace(/[/\\._ ]/g, '-');
    expect(oldMunge(MAC)).not.toBe(REPO);
    expect(oldMunge(MAC)).toContain('~');
  });

  it('claims the repo folder and its subdirectory folders', () => {
    const cwd = mungePath(MAC);
    expect(matchesProject(REPO, cwd)).toBe(true);
    expect(matchesProject(WEB, cwd)).toBe(true);      // defect 2 — the 2,732 replies
  });

  it('does not claim a differently-named sibling project', () => {
    const cwd = mungePath(MAC);
    expect(matchesProject(OTHER, cwd)).toBe(false);
    // and nothing outside the path at all
    expect(matchesProject('-Users-akla-Github-bot-trade', cwd)).toBe(false);
  });

  it('is case-sensitive on purpose', () => {
    const cwd = mungePath(MAC);
    // `Gia-WA` differs only by case from `gia`; folding case would swallow a
    // separate project into this one's count.
    expect(matchesProject(REPO.replace(/gia$/, 'Gia'), cwd)).toBe(false);
  });

  it('does not match on a substring that is not a path boundary', () => {
    // '-nostalgia' contains 'gia'; the loose endsWith/includes matching this
    // replaced is exactly what would have taken it.
    const cwd = '-home-user-gia';
    expect(matchesProject('-home-user-nostalgia', cwd)).toBe(false);
    expect(matchesProject('-home-user-gia2', cwd)).toBe(false);   // needs the '-' boundary
    expect(matchesProject('-home-user-gia-web', cwd)).toBe(true);
  });

  it('requiring the module does not run the CLI', () => {
    // Without the require.main guard, importing it here would measure, print,
    // and possibly process.exit(1) on a machine with no transcripts.
    expect(typeof mungePath).toBe('function');
    expect(typeof matchesProject).toBe('function');
  });
});
