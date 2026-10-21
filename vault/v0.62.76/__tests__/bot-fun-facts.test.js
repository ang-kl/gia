// __tests__/bot-fun-facts.test.js — v0.61.296

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  pickFunFactForChat,
  sendFunFactReply,
  _formatHtml,
  _readLastSeen,
  _persistLastSeen
} = require('../bot-fun-facts.js');

function mockRedisOpen() {
  // In-memory list per key with Set-of-key tracking + TTL no-op.
  const store = new Map(); // key → string[]
  return {
    isOpen: true,
    async lRange(key, start, stop) {
      const arr = store.get(key) || [];
      // Match Redis lRange semantics (0-indexed inclusive, negative
      // indices count from end).
      const sliceEnd = stop === -1 ? arr.length : stop + 1;
      return arr.slice(start, sliceEnd);
    },
    async lPush(key, value) {
      const arr = store.get(key) || [];
      arr.unshift(value);
      store.set(key, arr);
      return arr.length;
    },
    async lTrim(key, start, stop) {
      const arr = store.get(key) || [];
      const sliceEnd = stop === -1 ? arr.length : stop + 1;
      store.set(key, arr.slice(start, sliceEnd));
      return 'OK';
    },
    async expire() { return 1; },
    _store: store
  };
}

function mockRedisClosed() {
  return { isOpen: false };
}

describe('bot-fun-facts — _formatHtml', () => {
  const fact = {
    id: 'sample',
    tags: ['laksa', 'SG'],
    en: 'EN body text',
    fr: 'FR body text',
    source: 'NLB Infopedia',
    sourceUrl: 'https://eresources.nlb.gov.sg/infopedia/articles/SIP_x.html'
  };

  it('returns empty for null fact', () => {
    expect(_formatHtml(null, 'en')).toBe('');
  });

  it('EN format includes "Did you know?" header + EN body + linked source', () => {
    const html = _formatHtml(fact, 'en');
    expect(html).toContain('💡 Did you know?');
    expect(html).toContain('EN body text');
    expect(html).toContain('href="https://eresources.nlb.gov.sg');
    expect(html).toContain('NLB Infopedia');
  });

  it('FR format swaps header to "Le saviez-vous ?"', () => {
    const html = _formatHtml(fact, 'fr');
    expect(html).toContain('💡 Le saviez-vous ?');
    expect(html).toContain('FR body text');
  });

  it('unknown lang falls back to EN body', () => {
    const html = _formatHtml(fact, 'de');
    expect(html).toContain('EN body text');
  });

  it('escapes HTML in the body', () => {
    const malicious = { ...fact, en: 'A & B <script>alert(1)</script>' };
    const html = _formatHtml(malicious, 'en');
    expect(html).toContain('A &amp; B &lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('handles missing sourceUrl gracefully', () => {
    const noUrl = { ...fact, sourceUrl: null };
    const html = _formatHtml(noUrl, 'en');
    expect(html).toContain('<i>Source: NLB Infopedia</i>');
    expect(html).not.toContain('href=');
  });
});

describe('bot-fun-facts — Redis anti-repeat', () => {
  it('returns [] when Redis is offline', async () => {
    const result = await _readLastSeen(mockRedisClosed(), 'chat1');
    expect(result).toEqual([]);
  });

  it('persists fact IDs as lPush + trims to 10', async () => {
    const redis = mockRedisOpen();
    for (let i = 0; i < 15; i++) {
      await _persistLastSeen(redis, 'chat1', `fact-${i}`);
    }
    const stored = await _readLastSeen(redis, 'chat1');
    expect(stored.length).toBe(10);
    // Most recent first (lPush prepends).
    expect(stored[0]).toBe('fact-14');
    expect(stored[9]).toBe('fact-5');
  });

  it('no-op when Redis is offline', async () => {
    const redis = mockRedisClosed();
    await _persistLastSeen(redis, 'chat1', 'fact-x');
    // Doesn't throw; nothing to verify since there's no store.
  });

  it('no-op when factId is falsy', async () => {
    const redis = mockRedisOpen();
    await _persistLastSeen(redis, 'chat1', '');
    await _persistLastSeen(redis, 'chat1', null);
    const stored = await _readLastSeen(redis, 'chat1');
    expect(stored.length).toBe(0);
  });
});

describe('bot-fun-facts — pickFunFactForChat', () => {
  it('returns null when redis is offline (still picks but no persistence)', async () => {
    // With a fresh closed redis the lastSeen comes back []. _pickFact
    // still selects a fact; we just can't persist. The result is the
    // picked fact, NOT null — the contract is "best effort".
    const result = await pickFunFactForChat({
      redis: mockRedisClosed(),
      chatId: 'chat1',
      cuisines: ['laksa']
    });
    expect(result).not.toBeNull();
    expect(result.tags).toContain('laksa');
  });

  it('persists picked fact ID to Redis on success', async () => {
    const redis = mockRedisOpen();
    const fact = await pickFunFactForChat({
      redis, chatId: 'chat-persistence',
      cuisines: ['hokkien-mee']
    });
    expect(fact).not.toBeNull();
    const stored = await _readLastSeen(redis, 'chat-persistence');
    expect(stored).toContain(fact.id);
  });

  it('respects per-chat-id anti-repeat across two consecutive picks', async () => {
    const redis = mockRedisOpen();
    const chatId = 'chat-anti-repeat';
    // Pick using a cuisine tag with 2+ matching facts (SG context has
    // ~25 SG-tagged facts).
    const a = await pickFunFactForChat({ redis, chatId, cuisines: [], region: 'SG' });
    const b = await pickFunFactForChat({ redis, chatId, cuisines: [], region: 'SG' });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a.id).not.toBe(b.id);
  });
});

describe('bot-fun-facts — sendFunFactReply', () => {
  it('calls bot.sendMessage with HTML body when a fact is picked', async () => {
    const redis = mockRedisOpen();
    const sent = [];
    const bot = {
      sendMessage: vi.fn(async (chatId, text, opts) => {
        sent.push({ chatId, text, opts });
        return { message_id: 42 };
      })
    };
    const fact = await sendFunFactReply({
      bot, redis, chatId: 'chat-send', lang: 'en',
      cuisines: ['laksa']
    });
    expect(fact).not.toBeNull();
    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(sent[0].chatId).toBe('chat-send');
    expect(sent[0].text).toContain('💡 Did you know?');
    expect(sent[0].opts.parse_mode).toBe('HTML');
    expect(sent[0].opts.disable_web_page_preview).toBe(true);
  });

  it('returns null + does not throw when bot.sendMessage rejects', async () => {
    const redis = mockRedisOpen();
    const bot = {
      sendMessage: vi.fn(async () => { throw new Error('mock send failed'); })
    };
    const result = await sendFunFactReply({
      bot, redis, chatId: 'chat-err', lang: 'en',
      cuisines: ['laksa']
    });
    expect(result).toBeNull();
  });
});
