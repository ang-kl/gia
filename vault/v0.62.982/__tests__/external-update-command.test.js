// __tests__/external-update-command.test.js — v0.62.944.
//
// Spec: doc/Feature/2026-10-26-external-eateries.spec.md (I5, I6, I9, A3, A7, A8, A9).
//
// /external_update (owner chat only) opens a 15-minute window; each CSV sent in it is recognised by
// its header, validated, and merged by id. A file that fails validation changes nothing. The handlers
// take every side effect as an argument so they can run here without Telegram.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ext = require('../external-eateries');
const FIX = join(__dirname, 'fixtures', 'external');
const ALERTS = readFileSync(join(FIX, 'Alerts_fixture.CSV'), 'utf8');
const BRIEFS = readFileSync(join(FIX, 'DailyBrief_fixture.CSV'), 'utf8');

function fakeRedis() {
  const kv = new Map(); const hashes = new Map(); const sets = new Map();
  return {
    isOpen: true, _kv: kv, _hashes: hashes,
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v) { kv.set(k, String(v)); return 'OK'; },
    async del(k) { return (kv.delete(k) | hashes.delete(k) | sets.delete(k)) ? 1 : 0; },
    async hSet(k, obj) { const h = hashes.get(k) || new Map(); for (const [f, v] of Object.entries(obj)) h.set(f, String(v)); hashes.set(k, h); return 1; },
    async hGetAll(k) { const h = hashes.get(k); return h ? Object.fromEntries(h) : {}; },
    async sAdd(k, m) { const s = sets.get(k) || new Set(); [].concat(m).forEach((x) => s.add(String(x))); sets.set(k, s); return 1; },
    async sMembers(k) { return [...(sets.get(k) || [])]; },
  };
}
const OWNER = 111; const STRANGER = 222;

describe('A7 + I5 — /external_update is owner-only', () => {
  it('the owner gets the upload prompt and a 15-minute window', async () => {
    const r = fakeRedis();
    const reply = await ext.handleCommand({ chatId: OWNER, isOwner: true, redis: r });
    expect(reply).toMatch(/15 minutes/);
    expect(await r.get(`ext:upload-window:${OWNER}`)).toBeTruthy();
  });
  it('anyone else gets nothing and opens nothing', async () => {
    const r = fakeRedis();
    expect(await ext.handleCommand({ chatId: STRANGER, isOwner: false, redis: r })).toBeNull();
    expect(await r.get(`ext:upload-window:${STRANGER}`)).toBeNull();
  });
  it('a stranger\'s CSV is never read, even with a window key present', async () => {
    const r = fakeRedis(); let fetched = 0;
    await r.set(`ext:upload-window:${STRANGER}`, '1');
    const reply = await ext.handleDocument({ chatId: STRANGER, isOwner: false, redis: r, fileName: 'Alerts.CSV', fetchText: async () => { fetched += 1; return ALERTS; } });
    expect(reply).toBeNull();
    expect(fetched).toBe(0);
    expect(r._hashes.size).toBe(0);
  });
  it('the command name has no hyphen (Telegram commands cannot contain one)', () => {
    expect(ext.COMMAND).toBe('external_update');
    expect(ext.COMMAND_RE.test('/external_update')).toBe(true);
    expect(ext.COMMAND_RE.test('/external_update@soleat_bot')).toBe(true);
    expect(ext.COMMAND_RE.test('/external')).toBe(false);
  });
});

describe('loading files', () => {
  it('the owner\'s Alerts and DailyBrief load in one window, each reported', async () => {
    const r = fakeRedis();
    await ext.handleCommand({ chatId: OWNER, isOwner: true, redis: r });
    const a = await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'Alerts_2026-1026.CSV', fetchText: async () => ALERTS, today: '2026-10-26' });
    expect(a).toMatch(/Alerts/);
    expect(a).toMatch(/78 added/);
    const b = await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'DailyBrief_2026-1026.CSV', fetchText: async () => BRIEFS, today: '2026-10-26' });
    expect(b).toMatch(/27 added/);
    expect(await ext.loadRows(r, 'alerts')).toHaveLength(78);
    expect(await ext.loadRows(r, 'briefs')).toHaveLength(27);
  });
  it('without an open window, the owner\'s document is left alone (ordinary chat)', async () => {
    const r = fakeRedis(); let fetched = 0;
    const reply = await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'x.CSV', fetchText: async () => { fetched += 1; return ALERTS; } });
    expect(reply).toBeNull();
    expect(fetched).toBe(0);
  });
  it('a file that is not CSV is refused with a reason', async () => {
    const r = fakeRedis();
    await ext.handleCommand({ chatId: OWNER, isOwner: true, redis: r });
    const reply = await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'photo.jpg', fetchText: async () => '' });
    expect(reply).toMatch(/CSV/);
  });
});

describe('I6 — a bad file changes nothing already stored', () => {
  it('a short row is refused and the earlier set is intact', async () => {
    const r = fakeRedis();
    await ext.handleCommand({ chatId: OWNER, isOwner: true, redis: r });
    await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'a.CSV', fetchText: async () => ALERTS });
    const before = JSON.stringify(await ext.loadRows(r, 'alerts'));
    const lines = ALERTS.split('\n');
    const broken = [lines[0], 'ALERT-SG-0001,1,only three'].join('\n');
    const reply = await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'b.CSV', fetchText: async () => broken });
    expect(reply).toMatch(/not loaded/i);
    expect(JSON.stringify(await ext.loadRows(r, 'alerts'))).toBe(before);
  });
  it('an unrecognised header is refused', async () => {
    const r = fakeRedis();
    await ext.handleCommand({ chatId: OWNER, isOwner: true, redis: r });
    const reply = await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'c.CSV', fetchText: async () => 'foo,bar\n1,2\n' });
    expect(reply).toMatch(/not loaded/i);
    expect(r._hashes.size).toBe(0);
  });
});

describe('I9 — loading makes no paid call', () => {
  it('the only fetch is the Telegram file download the handler is given', async () => {
    const r = fakeRedis(); let calls = 0;
    await ext.handleCommand({ chatId: OWNER, isOwner: true, redis: r });
    await ext.handleDocument({ chatId: OWNER, isOwner: true, redis: r, fileName: 'a.CSV', fetchText: async () => { calls += 1; return ALERTS; } });
    expect(calls).toBe(1);
  });
});

describe('index.js wiring', () => {
  const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  it('the command and document handlers pass the owner check from isOwnerChat', () => {
    expect(src).toMatch(/externalEateries\.COMMAND_RE/);
    expect(src).toMatch(/externalEateries\.handleCommand\(\{[^}]*isOwner: isOwnerChat\(/);
    expect(src).toMatch(/externalEateries\.handleDocument\(\{[^}]*isOwner: isOwnerChat\(/);
  });
});
