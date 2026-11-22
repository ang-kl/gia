// __tests__/clipboard-routes.test.js — v0.62.329
//
// Integration tests for the 16 /api/clipboard/* endpoints. Stands up an
// in-process Express server (no supertest dep) with the same fake-redis
// from clip-store.test.js. SKIP_INIT_DATA_AUTH=true lets us pass chatId
// via query/body so tests don't need to forge HMAC initData.

import http from 'node:http';
import express from 'express';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import { makeFakeRedis } from './clip-store.test.js';

const require = createRequire(import.meta.url);
const { mountClipboardRoutes } = require('../clipboard-routes.js');
const { pushClip, cardKey, locsKey, TTL_PLACED_S, TTL_CATCHALL_S } = require('../clip-store.js');

const NO_TTL = -1;

beforeAll(() => { process.env.SKIP_INIT_DATA_AUTH = 'true'; });
afterAll(() => { delete process.env.SKIP_INIT_DATA_AUTH; });

function makeApp(redis) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  mountClipboardRoutes(app, redis);
  return app;
}

function request(app, method, path, { body, headers, query } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const qs = query ? '?' + new URLSearchParams(query).toString() : '';
      const req = http.request({
        host: '127.0.0.1', port, path: path + qs, method,
        headers: { 'content-type': 'application/json', ...(headers || {}) }
      }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          server.close();
          let parsed = data;
          if (data) {
            try { parsed = JSON.parse(data); } catch { /* keep raw */ }
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on('error', (e) => { server.close(); reject(e); });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

// ── helpers ──────────────────────────────────────────────────────────

async function plantCatchAllCard(redis, chatId, body) {
  await pushClip(redis, chatId, { body, cuisines: ['Italian'] });
  return redis._lists.get(`clip:${chatId}`)[0];
}

const CHAT = '12345';
const Q = { chatId: CHAT };
const withChat = (b = {}) => ({ chatId: CHAT, ...b });

// ── State ────────────────────────────────────────────────────────────

describe('GET /api/clipboard/state', () => {
  let app, redis;
  beforeEach(() => { redis = makeFakeRedis(); app = makeApp(redis); });

  it('returns 200 with empty state for a fresh chatId', async () => {
    const r = await request(app, 'GET', '/api/clipboard/state', { query: Q });
    expect(r.status).toBe(200);
    expect(r.body.cabinets).toEqual([]);
    expect(r.body.catchAllCount).toBe(0);
    // v0.62.330 (PR #3) — `/state` additionally returns the catch-all
    // cards in full so the TMA's strip can render without a second
    // roundtrip. PR #2's surface (cabinets + catchAllCount) stays —
    // catchAllCards is additive.
    expect(r.body.catchAllCards).toEqual([]);
  });

  it('counts catch-all cards and lists cabinets', async () => {
    await plantCatchAllCard(redis, CHAT, 'A');
    await plantCatchAllCard(redis, CHAT, 'B');
    await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'Trip' }) });
    const r = await request(app, 'GET', '/api/clipboard/state', { query: Q });
    expect(r.status).toBe(200);
    expect(r.body.catchAllCount).toBe(2);
    expect(r.body.cabinets).toHaveLength(1);
    expect(r.body.cabinets[0].name).toBe('Trip');
  });
});

// ── Cabinet CRUD ─────────────────────────────────────────────────────

describe('POST /api/clipboard/cabinet', () => {
  let app, redis;
  beforeEach(() => { redis = makeFakeRedis(); app = makeApp(redis); });

  it('creates a cabinet and returns 201', async () => {
    const r = await request(app, 'POST', '/api/clipboard/cabinet', {
      body: withChat({ name: 'Trip to Tokyo', emoji: '🍣', location: 'Tokyo' })
    });
    expect(r.status).toBe(201);
    expect(r.body.cabinet.name).toBe('Trip to Tokyo');
    expect(r.body.cabinet.emoji).toBe('🍣');
  });

  it('rejects empty name with 400 name-required', async () => {
    const r = await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: '' }) });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('name-required');
  });

  it('rejects the 13th cabinet with 409 cap-cabinets', async () => {
    for (let i = 0; i < 12; i++) {
      const r = await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: `Cab ${i}` }) });
      expect(r.status).toBe(201);
    }
    const r = await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'extra' }) });
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('cap-cabinets');
    expect(r.body.cap).toBe(12);
  });
});

describe('GET / PATCH / DELETE /api/clipboard/cabinet/:id', () => {
  let app, redis, cabId;
  beforeEach(async () => {
    redis = makeFakeRedis();
    app = makeApp(redis);
    const r = await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'cab' }) });
    cabId = r.body.cabinet.cabId;
  });

  it('GET returns the cabinet with drawers + their cards', async () => {
    const r = await request(app, 'GET', `/api/clipboard/cabinet/${cabId}`, { query: Q });
    expect(r.status).toBe(200);
    expect(r.body.cabinet.cabId).toBe(cabId);
    expect(r.body.drawers).toEqual([]);
  });

  it('PATCH renames + updates emoji + sortDirection', async () => {
    const r = await request(app, 'PATCH', `/api/clipboard/cabinet/${cabId}`, {
      body: withChat({ name: 'renamed', emoji: '🥢', sortDirection: 'location' })
    });
    expect(r.status).toBe(200);
    expect(r.body.cabinet.name).toBe('renamed');
    expect(r.body.cabinet.emoji).toBe('🥢');
    expect(r.body.cabinet.sortDirection).toBe('location');
  });

  it('DELETE returns ok and removes the cabinet', async () => {
    const r = await request(app, 'DELETE', `/api/clipboard/cabinet/${cabId}`, { query: Q });
    expect(r.status).toBe(200);
    const g = await request(app, 'GET', `/api/clipboard/cabinet/${cabId}`, { query: Q });
    expect(g.status).toBe(404);
  });
});

// ── Drawer CRUD ──────────────────────────────────────────────────────

describe('POST /api/clipboard/cabinet/:id/drawer', () => {
  let app, redis, cabId;
  beforeEach(async () => {
    redis = makeFakeRedis();
    app = makeApp(redis);
    cabId = (await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'cab' }) })).body.cabinet.cabId;
  });

  it('appends a drawer and returns 201 with its index', async () => {
    const r = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, {
      body: withChat({ segment: 'lunch', dayTag: 'Day 1' })
    });
    expect(r.status).toBe(201);
    expect(r.body.index).toBe(0);
    expect(r.body.drawer.segment).toBe('lunch');
    expect(r.body.drawer.dayTag).toBe('Day 1');
  });

  it('rejects the 21st drawer with 409 cap-drawers', async () => {
    for (let i = 0; i < 20; i++) {
      const r = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'lunch' }) });
      expect(r.status).toBe(201);
    }
    const r = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'lunch' }) });
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('cap-drawers');
    expect(r.body.cap).toBe(20);
  });

  it('rejects an unknown segment with 400 invalid-segment', async () => {
    const r = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'midnight-snack' }) });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid-segment');
  });

  it('accepts a drawer location { lat, lng, label }', async () => {
    const r = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, {
      body: withChat({ segment: 'lunch', location: { lat: 35.65, lng: 139.7, label: 'Shibuya' } })
    });
    expect(r.status).toBe(201);
    expect(r.body.drawer.location).toEqual({ lat: 35.65, lng: 139.7, label: 'Shibuya' });
  });
});

describe('PATCH / DELETE /api/clipboard/cabinet/:id/drawer/:n', () => {
  let app, redis, cabId;
  beforeEach(async () => {
    redis = makeFakeRedis();
    app = makeApp(redis);
    cabId = (await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'cab' }) })).body.cabinet.cabId;
    await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'breakfast' }) });
    await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'lunch' }) });
    await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'dinner' }) });
  });

  it('PATCH updates dayTag + location in place', async () => {
    const r = await request(app, 'PATCH', `/api/clipboard/cabinet/${cabId}/drawer/1`, {
      body: withChat({ dayTag: 'Day 2', location: { lat: 1.3, lng: 103.8, label: 'CBD' } })
    });
    expect(r.status).toBe(200);
    expect(r.body.drawer.dayTag).toBe('Day 2');
    expect(r.body.drawer.location).toEqual({ lat: 1.3, lng: 103.8, label: 'CBD' });
  });

  it('PATCH moveTo reorders drawers AND keeps card_locs consistent', async () => {
    // Place a card in drawer 0 (breakfast), then move drawer 0 to position 2.
    const cardId = await plantCatchAllCard(redis, CHAT, 'X');
    await request(app, 'POST', `/api/clipboard/card/${cardId}/place`, { body: withChat({ cabinetId: cabId, drawerIdx: 0 }) });
    expect(await redis.sMembers(locsKey(CHAT, cardId))).toEqual([`${cabId}:0`]);
    const r = await request(app, 'PATCH', `/api/clipboard/cabinet/${cabId}/drawer/0`, { body: withChat({ moveTo: 2 }) });
    expect(r.status).toBe(200);
    // Card should now be at index 2 (with breakfast).
    expect(await redis.sMembers(locsKey(CHAT, cardId))).toEqual([`${cabId}:2`]);
    // Order: lunch, dinner, breakfast.
    const g = await request(app, 'GET', `/api/clipboard/cabinet/${cabId}`, { query: Q });
    expect(g.body.drawers.map((d) => d.segment)).toEqual(['lunch', 'dinner', 'breakfast']);
  });

  it('DELETE drawer cascades + reindexes downstream drawers', async () => {
    const r = await request(app, 'DELETE', `/api/clipboard/cabinet/${cabId}/drawer/0`, { query: Q });
    expect(r.status).toBe(200);
    const g = await request(app, 'GET', `/api/clipboard/cabinet/${cabId}`, { query: Q });
    expect(g.body.drawers.map((d) => d.segment)).toEqual(['lunch', 'dinner']);
  });
});

// ── Card placement ───────────────────────────────────────────────────

describe('POST /api/clipboard/card/:id/place + /unplace + /move', () => {
  let app, redis, cabId, drIdx0, drIdx1;
  beforeEach(async () => {
    redis = makeFakeRedis();
    app = makeApp(redis);
    cabId = (await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'cab' }) })).body.cabinet.cabId;
    drIdx0 = (await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'lunch' }) })).body.index;
    drIdx1 = (await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'dinner' }) })).body.index;
  });

  it('places a card and bumps its TTL to 1y', async () => {
    const cardId = await plantCatchAllCard(redis, CHAT, 'A');
    expect(await redis.ttl(cardKey(CHAT, cardId))).toBe(TTL_CATCHALL_S);
    const r = await request(app, 'POST', `/api/clipboard/card/${cardId}/place`, {
      body: withChat({ cabinetId: cabId, drawerIdx: drIdx0 })
    });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(await redis.ttl(cardKey(CHAT, cardId))).toBe(TTL_PLACED_S);
  });

  it('permits the same card in two drawers (operator-locked)', async () => {
    const cardId = await plantCatchAllCard(redis, CHAT, 'A');
    await request(app, 'POST', `/api/clipboard/card/${cardId}/place`, { body: withChat({ cabinetId: cabId, drawerIdx: drIdx0 }) });
    const r = await request(app, 'POST', `/api/clipboard/card/${cardId}/place`, { body: withChat({ cabinetId: cabId, drawerIdx: drIdx1 }) });
    expect(r.status).toBe(200);
    const locs = await redis.sMembers(locsKey(CHAT, cardId));
    expect(locs.sort()).toEqual([`${cabId}:${drIdx0}`, `${cabId}:${drIdx1}`].sort());
  });

  it('move(from→to) unplaces + places atomically (sequential)', async () => {
    const cardId = await plantCatchAllCard(redis, CHAT, 'A');
    await request(app, 'POST', `/api/clipboard/card/${cardId}/place`, { body: withChat({ cabinetId: cabId, drawerIdx: drIdx0 }) });
    const r = await request(app, 'POST', `/api/clipboard/card/${cardId}/move`, {
      body: withChat({
        from: { cabinetId: cabId, drawerIdx: drIdx0 },
        to:   { cabinetId: cabId, drawerIdx: drIdx1 }
      })
    });
    expect(r.status).toBe(200);
    const locs = await redis.sMembers(locsKey(CHAT, cardId));
    expect(locs).toEqual([`${cabId}:${drIdx1}`]);
  });
});

// ── Card amend + delete ──────────────────────────────────────────────

describe('PATCH /api/clipboard/card/:id', () => {
  let app, redis, cardId;
  beforeEach(async () => {
    redis = makeFakeRedis();
    app = makeApp(redis);
    cardId = await plantCatchAllCard(redis, CHAT, 'A');
  });

  it('updates name + note + favourite, recomputes TTL on favourite toggle', async () => {
    const r = await request(app, 'PATCH', `/api/clipboard/card/${cardId}`, {
      body: withChat({ name: 'fav spot', note: 'try the truffle shoyu', favourite: true })
    });
    expect(r.status).toBe(200);
    expect(r.body.card.name).toBe('fav spot');
    expect(r.body.card.note).toBe('try the truffle shoyu');
    expect(r.body.card.favourite).toBe(true);
    // Favourite → PERSIST.
    expect(await redis.ttl(cardKey(CHAT, cardId))).toBe(NO_TTL);
  });

  it('caps note at 990 chars (operator-locked)', async () => {
    const huge = 'x'.repeat(1500);
    const r = await request(app, 'PATCH', `/api/clipboard/card/${cardId}`, { body: withChat({ note: huge }) });
    expect(r.status).toBe(200);
    expect(r.body.card.note.length).toBe(990);
  });

  it('flipping favourite OFF + no placements → 30-day TTL', async () => {
    await request(app, 'PATCH', `/api/clipboard/card/${cardId}`, { body: withChat({ favourite: true }) });
    expect(await redis.ttl(cardKey(CHAT, cardId))).toBe(NO_TTL);
    await request(app, 'PATCH', `/api/clipboard/card/${cardId}`, { body: withChat({ favourite: false }) });
    expect(await redis.ttl(cardKey(CHAT, cardId))).toBe(TTL_CATCHALL_S);
  });
});

describe('DELETE /api/clipboard/card/:id', () => {
  it('hard-deletes the card AND removes it from every drawer it was placed in', async () => {
    const redis = makeFakeRedis();
    const app = makeApp(redis);
    const cabId = (await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'cab' }) })).body.cabinet.cabId;
    const dr0 = (await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'lunch' }) })).body.index;
    const dr1 = (await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'dinner' }) })).body.index;
    const cardId = await plantCatchAllCard(redis, CHAT, 'A');
    await request(app, 'POST', `/api/clipboard/card/${cardId}/place`, { body: withChat({ cabinetId: cabId, drawerIdx: dr0 }) });
    await request(app, 'POST', `/api/clipboard/card/${cardId}/place`, { body: withChat({ cabinetId: cabId, drawerIdx: dr1 }) });

    const r = await request(app, 'DELETE', `/api/clipboard/card/${cardId}`, { query: Q });
    expect(r.status).toBe(200);
    expect(redis._hashes.has(cardKey(CHAT, cardId))).toBe(false);
    expect(redis._sets.has(locsKey(CHAT, cardId))).toBe(false);
    // Both drawer LISTs no longer contain the cardId.
    const g = await request(app, 'GET', `/api/clipboard/cabinet/${cabId}`, { query: Q });
    expect(g.body.drawers[0].cards).toHaveLength(0);
    expect(g.body.drawers[1].cards).toHaveLength(0);
  });
});

// ── Share + Fork ─────────────────────────────────────────────────────

describe('drawer share + shared read + fork round-trip', () => {
  let app, redis, cabId, drIdx;
  beforeEach(async () => {
    redis = makeFakeRedis();
    app = makeApp(redis);
    cabId = (await request(app, 'POST', '/api/clipboard/cabinet', { body: withChat({ name: 'Tokyo' }) })).body.cabinet.cabId;
    drIdx = (await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer`, { body: withChat({ segment: 'lunch', dayTag: 'Day 1' }) })).body.index;
    for (const body of ['Bella Pasta', 'Pasta Brava']) {
      const cid = await plantCatchAllCard(redis, CHAT, body);
      await request(app, 'POST', `/api/clipboard/card/${cid}/place`, { body: withChat({ cabinetId: cabId, drawerIdx: drIdx }) });
    }
  });

  it('POST /share mints a token and persists it onto the drawer meta', async () => {
    const r = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer/${drIdx}/share`, { body: withChat({}) });
    expect(r.status).toBe(200);
    expect(r.body.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(r.body.url).toMatch(/^https:\/\/t\.me\/.*\/clipboard\?startapp=dr_/);
    // Drawer meta should now carry shareToken.
    const g = await request(app, 'GET', `/api/clipboard/cabinet/${cabId}`, { query: Q });
    expect(g.body.drawers[0].shareToken).toBe(r.body.token);
  });

  it('GET /shared/:token is PUBLIC (no auth carve-out) and returns the snapshot', async () => {
    const mint = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer/${drIdx}/share`, { body: withChat({}) });
    const r = await request(app, 'GET', `/api/clipboard/shared/${mint.body.token}`);
    expect(r.status).toBe(200);
    expect(r.body.drawer.segment).toBe('lunch');
    expect(r.body.drawer.dayTag).toBe('Day 1');
    expect(r.body.cards).toHaveLength(2);
    // Owner chatId must NOT leak on the public read.
    expect(r.body.chatId).toBeUndefined();
  });

  it('GET /shared/:token returns 404 on expired/unknown token', async () => {
    const r = await request(app, 'GET', '/api/clipboard/shared/no-such-token');
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('expired');
  });

  it('POST /shared/:token/fork without cabinetId dumps cards into caller catch-all', async () => {
    const FORKER = '99999';
    const mint = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer/${drIdx}/share`, { body: withChat({}) });
    const r = await request(app, 'POST', `/api/clipboard/shared/${mint.body.token}/fork`, { body: { chatId: FORKER } });
    expect(r.status).toBe(200);
    expect(r.body.forkedCount).toBe(2);
    expect(r.body.cabinetId).toBeNull();
    const state = await request(app, 'GET', '/api/clipboard/state', { query: { chatId: FORKER } });
    expect(state.body.catchAllCount).toBe(2);
  });

  it('POST /shared/:token/fork with cabinetId places cards into a fresh drawer', async () => {
    const FORKER = '99999';
    // Forker creates a target cabinet first.
    const targetCab = (await request(app, 'POST', '/api/clipboard/cabinet', { body: { chatId: FORKER, name: 'forked-trip' } })).body.cabinet.cabId;
    const mint = await request(app, 'POST', `/api/clipboard/cabinet/${cabId}/drawer/${drIdx}/share`, { body: withChat({}) });
    const r = await request(app, 'POST', `/api/clipboard/shared/${mint.body.token}/fork`, { body: { chatId: FORKER, cabinetId: targetCab } });
    expect(r.status).toBe(200);
    expect(r.body.cabinetId).toBe(targetCab);
    expect(Number.isInteger(r.body.drawerIdx)).toBe(true);
    const g = await request(app, 'GET', `/api/clipboard/cabinet/${targetCab}`, { query: { chatId: FORKER } });
    expect(g.body.drawers).toHaveLength(1);
    expect(g.body.drawers[0].segment).toBe('lunch');
    expect(g.body.drawers[0].dayTag).toBe('Day 1');
    expect(g.body.drawers[0].cards).toHaveLength(2);
  });
});
