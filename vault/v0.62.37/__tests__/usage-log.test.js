// __tests__/usage-log.test.js — the hidden /oversight dashboard's
// Redis-only usage counters (usage-log.js). Uses the in-memory stub.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const usageLog = require('../usage-log.js');
const { hashChatId } = require('../location-cache.js');

const TODAY = usageLog._ymd();

describe('recordUser', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('adds the chat hash to usage:users and today\'s DAU set', async () => {
    await usageLog.recordUser(redis, 12345);
    const h = hashChatId(12345);
    expect(await redis.sIsMember('usage:users', h)).toBe(1);
    expect(await redis.sIsMember(`usage:dau:${TODAY}`, h)).toBe(1);
    expect(await redis.sCard('usage:users')).toBe(1);
  });

  it('is idempotent — same chat counted once', async () => {
    await usageLog.recordUser(redis, 12345);
    await usageLog.recordUser(redis, 12345);
    await usageLog.recordUser(redis, 67890);
    expect(await redis.sCard('usage:users')).toBe(2);
    expect(await redis.sCard(`usage:dau:${TODAY}`)).toBe(2);
  });

  it('never throws when redis is closed', async () => {
    redis.isOpen = false;
    await expect(usageLog.recordUser(redis, 1)).resolves.toBeUndefined();
  });
});

describe('recordSearch', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('records the searcher and bumps cuisine + criteria hashes', async () => {
    await usageLog.recordSearch(redis, 111, {
      cuisines: ['Japanese', 'Korean'],
      filters: { halal: true, openNow: false },
      prices: [2],
      region: 'JB',
      freeText: 'ramen',
      src: 'cuisine-tma'
    });
    const h = hashChatId(111);
    expect(await redis.sIsMember('usage:users', h)).toBe(1);
    expect(await redis.sIsMember(`usage:search:${TODAY}`, h)).toBe(1);
    expect(await redis.sIsMember(`usage:searchmulti:${TODAY}`, h)).toBe(0);
    expect(await redis.hGet('usage:cuisine', 'Japanese')).toBe('1');
    expect(await redis.hGet('usage:cuisine', 'Korean')).toBe('1');
    expect(await redis.hGet(`usage:cuisine:${TODAY}`, 'Japanese')).toBe('1');
    expect(await redis.hGet('usage:criteria', 'src:cuisine-tma')).toBe('1');
    expect(await redis.hGet('usage:criteria', 'filter:halal')).toBe('1');
    expect(await redis.hGet('usage:criteria', 'filter:openNow')).toBeNull();
    expect(await redis.hGet('usage:criteria', 'price:2')).toBe('1');
    expect(await redis.hGet('usage:criteria', 'region:JB')).toBe('1');
    expect(await redis.hGet('usage:criteria', 'freetext')).toBe('1');
  });

  it('promotes a chat to "frequent" on its 2nd search of the day', async () => {
    await usageLog.recordSearch(redis, 222, { src: 's' });
    await usageLog.recordSearch(redis, 222, { src: 's' });
    const h = hashChatId(222);
    expect(await redis.sIsMember(`usage:search:${TODAY}`, h)).toBe(1);
    expect(await redis.sIsMember(`usage:searchmulti:${TODAY}`, h)).toBe(1);
    expect(await redis.sCard(`usage:searchmulti:${TODAY}`)).toBe(1);
    // cuisine-less search → no cuisine hash, but a src counter
    expect(await redis.hGet('usage:criteria', 'src:s')).toBe('2');
  });

  it('a one-search chat is a searcher but not frequent', async () => {
    await usageLog.recordSearch(redis, 333, { src: 'eat' });
    const h = hashChatId(333);
    expect(await redis.sIsMember(`usage:search:${TODAY}`, h)).toBe(1);
    expect(await redis.sCard(`usage:searchmulti:${TODAY}`)).toBe(0);
  });
});

describe('getStats', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('returns the expected shape with the right counts', async () => {
    await usageLog.recordUser(redis, 1);
    await usageLog.recordSearch(redis, 1, { cuisines: ['Thai'], src: 'cuisine-tma' });
    await usageLog.recordSearch(redis, 1, { cuisines: ['Thai'], src: 'cuisine-tma' }); // frequent
    await usageLog.recordSearch(redis, 2, { cuisines: ['Italian'], src: 's' });
    await usageLog.recordUser(redis, 3);

    const stats = await usageLog.getStats(redis, { days: 7 });
    expect(stats.totalUsers).toBe(3);
    expect(stats.today.date).toBe(TODAY);
    expect(stats.today.active).toBe(3);
    expect(stats.today.searchers).toBe(2);
    expect(stats.today.frequent).toBe(1);
    expect(Array.isArray(stats.byDay)).toBe(true);
    expect(stats.byDay.length).toBe(7);
    expect(stats.byDay[stats.byDay.length - 1].date).toBe(TODAY);
    expect(Array.isArray(stats.byDayOfWeek)).toBe(true);
    expect(stats.topCuisines).toEqual(
      expect.arrayContaining([{ name: 'Thai', count: 2 }, { name: 'Italian', count: 1 }])
    );
    expect(stats.topCriteria.find((c) => c.key === 'src:cuisine-tma')?.count).toBe(2);
    expect(Array.isArray(stats.topFreeText)).toBe(true);
    expect(Array.isArray(stats.recentFreeText)).toBe(true);
    expect(typeof stats.note).toBe('string');
  });

  it('a single ?date= picks just that day and uses the per-day cuisine hash', async () => {
    await usageLog.recordSearch(redis, 9, { cuisines: ['Greek'], src: 'cuisine-tma' });
    const stats = await usageLog.getStats(redis, { date: TODAY });
    expect(stats.byDay.length).toBe(1);
    expect(stats.byDay[0].date).toBe(TODAY);
    expect(stats.topCuisines).toEqual([{ name: 'Greek', count: 1 }]);
  });

  it('is safe on an empty / closed store', async () => {
    const stats = await usageLog.getStats(redis, {});
    expect(stats.totalUsers).toBe(0);
    expect(stats.today.active).toBe(0);
    redis.isOpen = false;
    const stats2 = await usageLog.getStats(redis, {});
    expect(stats2.totalUsers).toBe(0);
  });
});
