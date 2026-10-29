// __tests__/clipboard-store.test.js — v0.62.328
//
// Cabinets, drawers, placements, and cascade-delete. v0.62.416: the orphan rule
// was reversed (favourite preserved, multi-placed preserved, otherwise RETURNED
// to the catch-all clipboard — was: dropped). Plus default-cabinet + duplicate.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { makeFakeRedis } from './clip-store.test.js';

const require = createRequire(import.meta.url);
const {
  listCabinets, getCabinet, createCabinet, updateCabinet, deleteCabinet,
  getDefaultCabinetId, setDefaultCabinet, duplicateCabinet, duplicateDrawer,
  readDrawers, addDrawer, deleteDrawer, getDrawerCards,
  placeCard, unplaceCard,
  MAX_CABINETS_PER_USER, MAX_DRAWERS_PER_CAB, MAX_CARDS_PER_DRAWER,
  VALID_SEGMENTS, cabHashKey, drListKey
} = require('../clipboard-store.js');
const {
  pushClip, cardKey, locsKey, TTL_PLACED_S, TTL_CATCHALL_S
} = require('../clip-store.js');

const NO_TTL = -1;

async function plantCard(redis, chatId, body) {
  await pushClip(redis, chatId, { body });
  const cardId = redis._lists.get(`clip:${chatId}`)[0];
  return cardId;
}

describe('createCabinet', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('creates a cabinet with the required name and indexes it', async () => {
    const r = await createCabinet(redis, 'c', { name: 'Trip to Tokyo', emoji: '🍣' });
    expect(r.ok).toBe(true);
    expect(r.cabinet.name).toBe('Trip to Tokyo');
    expect(r.cabinet.emoji).toBe('🍣');
    expect(r.cabinet.sortDirection).toBe('created');
    const list = await listCabinets(redis, 'c');
    expect(list).toHaveLength(1);
    expect(list[0].cabId).toBe(r.cabinet.cabId);
  });

  it('rejects an empty / whitespace-only name', async () => {
    expect((await createCabinet(redis, 'c', { name: '' })).error).toBe('name-required');
    expect((await createCabinet(redis, 'c', { name: '   ' })).error).toBe('name-required');
    expect((await createCabinet(redis, 'c', {})).error).toBe('name-required');
  });

  it('caps the name at 80 chars', async () => {
    const r = await createCabinet(redis, 'c', { name: 'X'.repeat(120) });
    expect(r.ok).toBe(true);
    expect(r.cabinet.name).toHaveLength(80);
  });

  it('enforces the 12-cabinet cap', async () => {
    for (let i = 0; i < MAX_CABINETS_PER_USER; i++) {
      const r = await createCabinet(redis, 'c', { name: `Cab ${i}` });
      expect(r.ok).toBe(true);
    }
    const r = await createCabinet(redis, 'c', { name: 'one too many' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('cap-cabinets');
    expect(r.cap).toBe(MAX_CABINETS_PER_USER);
  });

  it('stores optional location + date range', async () => {
    const r = await createCabinet(redis, 'c', {
      name: 'Tokyo trip', location: 'Tokyo, JP',
      dateStart: '2026-07-12', dateEnd: '2026-07-19'
    });
    expect(r.cabinet.location).toBe('Tokyo, JP');
    expect(r.cabinet.dateStart).toBe('2026-07-12');
    expect(r.cabinet.dateEnd).toBe('2026-07-19');
  });
});

describe('updateCabinet', () => {
  let redis, cabId;
  beforeEach(async () => {
    redis = makeFakeRedis();
    const r = await createCabinet(redis, 'c', { name: 'original' });
    cabId = r.cabinet.cabId;
  });

  it('renames + updates emoji + location', async () => {
    const r = await updateCabinet(redis, 'c', cabId, {
      name: 'updated', emoji: '🍱', location: 'Shibuya'
    });
    expect(r.ok).toBe(true);
    expect(r.cabinet.name).toBe('updated');
    expect(r.cabinet.emoji).toBe('🍱');
    expect(r.cabinet.location).toBe('Shibuya');
  });

  it('rejects a blank rename (cannot clear the name)', async () => {
    const r = await updateCabinet(redis, 'c', cabId, { name: '   ' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('name-required');
  });

  it('accepts valid sortDirection values and rejects invalid ones', async () => {
    const ok = await updateCabinet(redis, 'c', cabId, { sortDirection: 'location' });
    expect(ok.cabinet.sortDirection).toBe('location');
    const bad = await updateCabinet(redis, 'c', cabId, { sortDirection: 'random' });
    expect(bad.cabinet.sortDirection).toBe('location');   // unchanged
  });

  it('returns not-found for unknown cabinet', async () => {
    const r = await updateCabinet(redis, 'c', 'no-such', { name: 'X' });
    expect(r.error).toBe('not-found');
  });
});

describe('addDrawer / readDrawers', () => {
  let redis, cabId;
  beforeEach(async () => {
    redis = makeFakeRedis();
    cabId = (await createCabinet(redis, 'c', { name: 'cab' })).cabinet.cabId;
  });

  it('appends drawers in creation order', async () => {
    await addDrawer(redis, 'c', cabId, { segment: 'breakfast', dayTag: 'Day 1' });
    await addDrawer(redis, 'c', cabId, { segment: 'lunch', dayTag: 'Day 1' });
    await addDrawer(redis, 'c', cabId, { segment: 'breakfast', dayTag: 'Day 2' });
    const drawers = await readDrawers(redis, 'c', cabId);
    expect(drawers).toHaveLength(3);
    expect(drawers.map((d) => `${d.segment}/${d.dayTag}`)).toEqual([
      'breakfast/Day 1', 'lunch/Day 1', 'breakfast/Day 2'
    ]);
  });

  it('rejects an unknown segment', async () => {
    const r = await addDrawer(redis, 'c', cabId, { segment: 'midnight-snack' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid-segment');
  });

  it('enforces the 20-drawer cap', async () => {
    for (let i = 0; i < MAX_DRAWERS_PER_CAB; i++) {
      const r = await addDrawer(redis, 'c', cabId, { segment: 'lunch', dayTag: `Day ${i}` });
      expect(r.ok).toBe(true);
    }
    const r = await addDrawer(redis, 'c', cabId, { segment: 'lunch' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('cap-drawers');
    expect(r.cap).toBe(MAX_DRAWERS_PER_CAB);
  });

  it('accepts optional drawer location { lat, lng, label }', async () => {
    const r = await addDrawer(redis, 'c', cabId, {
      segment: 'lunch',
      location: { lat: 35.65, lng: 139.7, label: 'Shibuya' }
    });
    expect(r.ok).toBe(true);
    const drawers = await readDrawers(redis, 'c', cabId);
    expect(drawers[0].location).toEqual({ lat: 35.65, lng: 139.7, label: 'Shibuya' });
  });

  it('rejects malformed location and stores null instead', async () => {
    const r = await addDrawer(redis, 'c', cabId, {
      segment: 'lunch',
      location: { lat: 'not-a-number', lng: 139, label: 'X' }
    });
    expect(r.ok).toBe(true);
    expect((await readDrawers(redis, 'c', cabId))[0].location).toBeNull();
  });
});

describe('placeCard + getDrawerCards', () => {
  let redis, cabId, drIdx;
  beforeEach(async () => {
    redis = makeFakeRedis();
    cabId = (await createCabinet(redis, 'c', { name: 'cab' })).cabinet.cabId;
    drIdx = (await addDrawer(redis, 'c', cabId, { segment: 'lunch' })).index;
  });

  it('places a card in a drawer and bumps its TTL to 1y', async () => {
    const cardId = await plantCard(redis, 'c', 'A');
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_CATCHALL_S);
    const r = await placeCard(redis, 'c', cardId, cabId, drIdx);
    expect(r.ok).toBe(true);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);
    const cards = await getDrawerCards(redis, 'c', cabId, drIdx);
    expect(cards).toHaveLength(1);
    expect(cards[0].body).toBe('A');
  });

  it('dedupes within the same drawer (same cardId re-placed → no-op)', async () => {
    const cardId = await plantCard(redis, 'c', 'A');
    await placeCard(redis, 'c', cardId, cabId, drIdx);
    const r2 = await placeCard(redis, 'c', cardId, cabId, drIdx);
    expect(r2.ok).toBe(true);
    expect(r2.alreadyPresent).toBe(true);
    const cards = await getDrawerCards(redis, 'c', cabId, drIdx);
    expect(cards).toHaveLength(1);
  });

  it('PERMITS the same cardId in two different drawers (operator-locked)', async () => {
    const cardId = await plantCard(redis, 'c', 'A');
    const dr2 = (await addDrawer(redis, 'c', cabId, { segment: 'dinner' })).index;
    await placeCard(redis, 'c', cardId, cabId, drIdx);
    await placeCard(redis, 'c', cardId, cabId, dr2);
    const locs = await redis.sMembers(locsKey('c', cardId));
    expect(locs.sort()).toEqual([`${cabId}:${drIdx}`, `${cabId}:${dr2}`].sort());
  });

  it('enforces the 10-cards-per-drawer cap', async () => {
    for (let i = 0; i < MAX_CARDS_PER_DRAWER; i++) {
      const cid = await plantCard(redis, 'c', `body-${i}`);
      const r = await placeCard(redis, 'c', cid, cabId, drIdx);
      expect(r.ok).toBe(true);
    }
    const cidExtra = await plantCard(redis, 'c', 'one-too-many');
    const r = await placeCard(redis, 'c', cidExtra, cabId, drIdx);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('cap-cards-per-drawer');
  });

  it('rejects placement into an unknown drawer index', async () => {
    const cardId = await plantCard(redis, 'c', 'A');
    const r = await placeCard(redis, 'c', cardId, cabId, 99);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('drawer-not-found');
  });
});

describe('unplaceCard', () => {
  let redis, cabId, drIdx;
  beforeEach(async () => {
    redis = makeFakeRedis();
    cabId = (await createCabinet(redis, 'c', { name: 'cab' })).cabinet.cabId;
    drIdx = (await addDrawer(redis, 'c', cabId, { segment: 'lunch' })).index;
  });

  it('removes the card from the drawer and recomputes TTL back to 30d', async () => {
    const cardId = await plantCard(redis, 'c', 'A');
    await placeCard(redis, 'c', cardId, cabId, drIdx);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);
    const r = await unplaceCard(redis, 'c', cardId, cabId, drIdx);
    expect(r.ok).toBe(true);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_CATCHALL_S);
    const cards = await getDrawerCards(redis, 'c', cabId, drIdx);
    expect(cards).toHaveLength(0);
  });

  it('keeps the card at 1y TTL if it is still placed elsewhere', async () => {
    const cardId = await plantCard(redis, 'c', 'A');
    const dr2 = (await addDrawer(redis, 'c', cabId, { segment: 'dinner' })).index;
    await placeCard(redis, 'c', cardId, cabId, drIdx);
    await placeCard(redis, 'c', cardId, cabId, dr2);
    await unplaceCard(redis, 'c', cardId, cabId, drIdx);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);
  });
});

describe('cascade-delete (operator-locked rules)', () => {
  let redis, cabId, drIdx;
  beforeEach(async () => {
    redis = makeFakeRedis();
    cabId = (await createCabinet(redis, 'c', { name: 'cab' })).cabinet.cabId;
    drIdx = (await addDrawer(redis, 'c', cabId, { segment: 'lunch' })).index;
  });

  it('rule (a) FAVOURITE — drawer delete leaves the card in catch-all + PERSIST', async () => {
    const cardId = await plantCard(redis, 'c', 'fav');
    await redis.hSet(cardKey('c', cardId), 'favourite', '1');
    await placeCard(redis, 'c', cardId, cabId, drIdx);
    // Favourite overrides placed → TTL is PERSIST.
    expect(await redis.ttl(cardKey('c', cardId))).toBe(NO_TTL);
    await deleteDrawer(redis, 'c', cabId, drIdx);
    // Card record still exists, still PERSIST.
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(true);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(NO_TTL);
    // No longer placed.
    expect(await redis.sCard(locsKey('c', cardId))).toBe(0);
  });

  it('rule (b) MULTI-PLACED — drawer delete keeps card alive via other placement', async () => {
    const cardId = await plantCard(redis, 'c', 'multi');
    const dr2 = (await addDrawer(redis, 'c', cabId, { segment: 'dinner' })).index;
    await placeCard(redis, 'c', cardId, cabId, drIdx);
    await placeCard(redis, 'c', cardId, cabId, dr2);
    await deleteDrawer(redis, 'c', cabId, drIdx);
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(true);
    // After delete + reindex: dr2 was at index 1; drIdx 0 was deleted; dr2
    // shifts down to index 0. Card_locs should reflect that.
    const locs = await redis.sMembers(locsKey('c', cardId));
    expect(locs).toEqual([`${cabId}:0`]);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);
  });

  it('rule (c) SINGLE-PLACED NON-FAVOURITE — drawer delete RETURNS card to the clipboard (v0.62.416)', async () => {
    const cardId = await plantCard(redis, 'c', 'returned');
    // Simulate the card filed OUT of catch-all (catch-all no longer owns it).
    await redis.lRem('clip:c', 1, cardId);
    await placeCard(redis, 'c', cardId, cabId, drIdx);
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(true);
    const r = await deleteDrawer(redis, 'c', cabId, drIdx);
    // Card survives, is back in the catch-all clip list, with no placements.
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(true);
    expect(await redis.sCard(locsKey('c', cardId))).toBe(0);
    expect(await redis.lRange('clip:c', 0, -1)).toContain(cardId);
    expect(r.returned).toBe(1);
  });

  it('rule (d) card_locs index stays consistent through cascade', async () => {
    // Place cardA in drIdx, cardB in dr2. Delete drIdx (cardA cascades away).
    const cardA = await plantCard(redis, 'c', 'A');
    const cardB = await plantCard(redis, 'c', 'B');
    const dr2 = (await addDrawer(redis, 'c', cabId, { segment: 'dinner' })).index;
    await redis.lRem('clip:c', 1, cardA);   // single-placed cardA
    await placeCard(redis, 'c', cardA, cabId, drIdx);
    await placeCard(redis, 'c', cardB, cabId, dr2);
    await deleteDrawer(redis, 'c', cabId, drIdx);
    // cardA returns to the clipboard (no placements left); cardB's locs tag re-keyed.
    expect(await redis.sCard(locsKey('c', cardA))).toBe(0);
    expect(redis._hashes.has(cardKey('c', cardA))).toBe(true);
    const bLocs = await redis.sMembers(locsKey('c', cardB));
    expect(bLocs).toEqual([`${cabId}:0`]);
  });

  it('deleteCabinet walks every drawer + applies the same rules', async () => {
    const cardA = await plantCard(redis, 'c', 'A');
    const cardFav = await plantCard(redis, 'c', 'fav');
    await redis.hSet(cardKey('c', cardFav), 'favourite', '1');
    await placeCard(redis, 'c', cardA, cabId, drIdx);
    await placeCard(redis, 'c', cardFav, cabId, drIdx);
    await redis.lRem('clip:c', 1, cardA);   // make cardA single-placed
    expect(redis._hashes.has(cardKey('c', cardA))).toBe(true);
    expect(redis._hashes.has(cardKey('c', cardFav))).toBe(true);
    const r = await deleteCabinet(redis, 'c', cabId);
    // Cabinet gone, drawer LIST gone.
    expect(redis._hashes.has(cabHashKey('c', cabId))).toBe(false);
    expect(redis._lists.has(drListKey('c', cabId, drIdx))).toBe(false);
    // cardA single-placed non-favourite → RETURNED to the clipboard (v0.62.416).
    expect(redis._hashes.has(cardKey('c', cardA))).toBe(true);
    expect(await redis.lRange('clip:c', 0, -1)).toContain(cardA);
    // cardFav favourite → survives + PERSIST.
    expect(redis._hashes.has(cardKey('c', cardFav))).toBe(true);
    expect(await redis.ttl(cardKey('c', cardFav))).toBe(NO_TTL);
    expect(r.returned).toBeGreaterThanOrEqual(1);
  });
});

describe('default cabinet (v0.62.416)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('set + get default; getDefault validates existence', async () => {
    const a = (await createCabinet(redis, 'c', { name: 'A' })).cabinet.cabId;
    expect(await getDefaultCabinetId(redis, 'c')).toBe(null);
    expect((await setDefaultCabinet(redis, 'c', a)).ok).toBe(true);
    expect(await getDefaultCabinetId(redis, 'c')).toBe(a);
    expect((await setDefaultCabinet(redis, 'c', 'nope')).error).toBe('not-found');
  });

  it('deleting the default reassigns to the first remaining cabinet', async () => {
    const a = (await createCabinet(redis, 'c', { name: 'A' })).cabinet.cabId;
    const b = (await createCabinet(redis, 'c', { name: 'B' })).cabinet.cabId;
    await setDefaultCabinet(redis, 'c', a);
    const r = await deleteCabinet(redis, 'c', a);
    expect(r.reassignedDefault).toBe(b);
    expect(await getDefaultCabinetId(redis, 'c')).toBe(b);
  });
});

describe('duplicate (v0.62.416)', () => {
  let redis, cabId, drIdx;
  beforeEach(async () => {
    redis = makeFakeRedis();
    cabId = (await createCabinet(redis, 'c', { name: 'Trip' })).cabinet.cabId;
    drIdx = (await addDrawer(redis, 'c', cabId, { segment: 'lunch' })).index;
  });

  it('duplicateDrawer copies the drawer + its cards', async () => {
    const card = await plantCard(redis, 'c', 'x');
    await placeCard(redis, 'c', card, cabId, drIdx);
    const r = await duplicateDrawer(redis, 'c', cabId, drIdx);
    expect(r.ok).toBe(true);
    const cards = await getDrawerCards(redis, 'c', cabId, r.index);
    expect(cards.map((c) => c.cardId || c)).toContain(card);
  });

  it('duplicateCabinet copies name+" copy", drawers, and placements', async () => {
    const card = await plantCard(redis, 'c', 'y');
    await placeCard(redis, 'c', card, cabId, drIdx);
    const r = await duplicateCabinet(redis, 'c', cabId);
    expect(r.ok).toBe(true);
    expect(r.cabinet.name).toBe('Trip copy');
    const newDrawers = await readDrawers(redis, 'c', r.cabinet.cabId);
    expect(newDrawers).toHaveLength(1);
  });
});

describe('module surface', () => {
  it('exposes the operator-locked caps', () => {
    expect(MAX_CABINETS_PER_USER).toBe(12);
    expect(MAX_DRAWERS_PER_CAB).toBe(20);
    expect(MAX_CARDS_PER_DRAWER).toBe(10);
  });
  it('exposes the 11 segments (10 time-bound + Whole Day)', () => {
    expect(VALID_SEGMENTS).toHaveLength(11);
    expect(VALID_SEGMENTS).toContain('breakfast');
    expect(VALID_SEGMENTS).toContain('nightSnack');
    expect(VALID_SEGMENTS).toContain('wholeDay');
  });
});
