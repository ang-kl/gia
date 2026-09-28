// __tests__/owner-gate.test.js — v0.62.774 (Register O-185)
//
// The gate that used to fail OPEN. With TELEGRAM_OWNER_CHAT_ID unset,
// `isOwnerChat` returned true for everyone, and it guards 20 call sites in
// index.js including an HTTP 403 on /api/oversight/stats.
//
// These tests are written the way the bug would have been caught: the FIRST
// assertion is the one that used to pass for the wrong reason.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { decideOwner, isOwnerChat, OPT_IN } = require('../owner-gate.js');

describe('owner gate — the unowned case', () => {
  it('CLOSED when no owner is configured — the O-185 inversion', () => {
    // Before v0.62.774 this returned true. That single boolean was the
    // difference between "admin commands are owner-only" and "admin commands
    // are public", and nothing in the suite said which one was intended.
    const d = decideOwner({ chatId: '999', owner: undefined, optIn: undefined });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('unowned-closed');
  });

  it('OPEN only when the opt-in is set to exactly "1"', () => {
    expect(decideOwner({ chatId: '999', owner: undefined, optIn: '1' }).allow).toBe(true);
    // Anything else is not an opt-in. A truthy-string check would make
    // GIA_ALLOW_UNOWNED_ADMIN=false open the gate, which is the classic shape
    // of this bug reappearing one level down.
    for (const v of ['0', 'false', 'true', 'yes', '', ' ', 'on', undefined, null]) {
      expect(decideOwner({ chatId: '999', owner: undefined, optIn: v }).allow, JSON.stringify(v)).toBe(false);
    }
  });

  it('treats a blank owner as unset, not as an owner id nobody matches', () => {
    // '' and '   ' are what a half-configured env var looks like. Reading them
    // as a real owner id would fail closed for the OWNER too, with no way to
    // tell that from a genuine mismatch.
    for (const owner of ['', '   ', '\t']) {
      const d = decideOwner({ chatId: '123', owner, optIn: undefined });
      expect(d.reason).toBe('unowned-closed');
    }
  });
});

describe('owner gate — the owned case is unchanged', () => {
  it('matches the owner and rejects everyone else', () => {
    expect(decideOwner({ chatId: '123', owner: '123' }).allow).toBe(true);
    expect(decideOwner({ chatId: '999', owner: '123' }).allow).toBe(false);
  });

  it('compares as strings, so a numeric chatId still matches', () => {
    // Telegram ids arrive as numbers from the bot and as strings from initData.
    expect(decideOwner({ chatId: 123, owner: '123' }).allow).toBe(true);
    expect(decideOwner({ chatId: '123', owner: 123 }).allow).toBe(true);
  });

  it('tolerates whitespace around a configured owner id', () => {
    expect(decideOwner({ chatId: '123', owner: ' 123 ' }).allow).toBe(true);
  });

  it('the opt-in CANNOT widen a configured owner', () => {
    // The dev escape hatch must not become a production bypass: once an owner
    // is set, the opt-in is irrelevant.
    expect(decideOwner({ chatId: '999', owner: '123', optIn: '1' }).allow).toBe(false);
  });
});

describe('owner gate — missing caller identity', () => {
  it('an absent chatId never passes, even with the opt-in on', () => {
    // /api/oversight/stats passes `req.tg?.user?.id`, which is undefined when
    // initData carries no user. Undefined must not sail through the unowned
    // path — that would be the same hole through a different door.
    for (const id of [undefined, null, '']) {
      expect(isOwnerChat(id, { [OPT_IN]: '1' }), String(id)).toBe(false);
      expect(isOwnerChat(id, { TELEGRAM_OWNER_CHAT_ID: '123' }), String(id)).toBe(false);
    }
  });
});

describe('owner gate — index.js actually uses it', () => {
  const src = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');

  it('index.js requires the module and delegates to it', () => {
    expect(src).toMatch(/require\('\.\/owner-gate'\)/);
    expect(src).toMatch(/return ownerGate\.isOwnerChat\(chatId\)/);
  });

  it('the old fail-open line is GONE, not merely bypassed', () => {
    // A dead copy left behind is the kind of thing that gets restored later by
    // someone resolving a conflict in its favour.
    //
    // The first draft of this test matched `const owner = process.env.
    // TELEGRAM_OWNER_CHAT_ID;` and FAILED — on spendGuardTick, which reads the
    // same variable to decide who to DM. That use is fine (`if (!owner) return`
    // means "nobody to tell") and deleting it would break spend alerts. The
    // fail-open signature is the RETURN VALUE, so that is what is asserted.
    expect(src).not.toMatch(/if \(!owner\) return true;/);
  });

  it('does NOT disturb spendGuardTick, which reads the same variable benignly', () => {
    // Pinned because the test above nearly took it out. Reading
    // TELEGRAM_OWNER_CHAT_ID is not the bug; returning true when it is absent
    // was the bug.
    expect(src).toMatch(/function spendGuardTick\(\)/);
    expect(src).toMatch(/if \(!owner\) return;\s+\/\/ nobody to tell/);
  });

  it('still guards all 17 call sites', () => {
    // SEVENTEEN, measured — the Register said 20 and a first pass of this test
    // asserted 20. Both were wrong, and the assertion caught it rather than
    // shipping the wrong number in a security note. 19 occurrences total = 17
    // guards + the function definition + the delegating call inside it.
    const uses = [...src.matchAll(/isOwnerChat\(/g)].length;
    expect(uses).toBe(19);
    // the HTTP 403 is the one a non-Telegram caller can reach, so it is named
    expect(src).toMatch(/if \(!isOwnerChat\(req\.tg\?\.user\?\.id\)\) return res\.status\(403\)/);
  });
});
