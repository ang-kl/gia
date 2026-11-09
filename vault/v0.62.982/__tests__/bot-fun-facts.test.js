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

  // v0.62.915 — `_formatHtml` is async now. It resolves the body through the lib's `factBody()`
  // rather than a local copy of the overlay rule, and the lib is ESM reachable only through the
  // dynamic import this CJS file already performs. A missing `await` here does not throw — it
  // asserts against a Promise, and `expect(promise).toContain(...)` fails with "expected [] to
  // include", which is what these six did before they were updated.
  it('returns empty for null fact', async () => {
    expect(await _formatHtml(null, 'en')).toBe('');
  });

  it('EN format includes "Did you know?" header + EN body + linked source', async () => {
    const html = await _formatHtml(fact, 'en');
    expect(html).toContain('💡 Did you know?');
    expect(html).toContain('EN body text');
    expect(html).toContain('href="https://eresources.nlb.gov.sg');
    expect(html).toContain('NLB Infopedia');
  });

  it('FR format swaps header to "Le saviez-vous ?"', async () => {
    const html = await _formatHtml(fact, 'fr');
    expect(html).toContain('💡 Le saviez-vous ?');
    expect(html).toContain('FR body text');
  });

  it('a locale with no body for this fact falls back to EN', async () => {
    // Was labelled "unknown lang" and passed 'de'. `de` is a REAL overlay locale — the label was
    // written when the bot only knew en/fr, and it is the same assumption this release removed.
    const html = await _formatHtml(fact, 'de');
    expect(html).toContain('EN body text');
  });

  it('a genuinely unknown lang gets the EN header and the EN body', async () => {
    const html = await _formatHtml(fact, 'xx');
    expect(html).toContain('💡 Did you know?');
    expect(html).toContain('EN body text');
  });

  it('escapes HTML in the body', async () => {
    const malicious = { ...fact, en: 'A & B <script>alert(1)</script>' };
    const html = await _formatHtml(malicious, 'en');
    expect(html).toContain('A &amp; B &lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('handles missing sourceUrl gracefully', async () => {
    const noUrl = { ...fact, sourceUrl: null };
    const html = await _formatHtml(noUrl, 'en');
    expect(html).toContain('<i>Source: NLB Infopedia</i>');
    expect(html).not.toContain('href=');
  });

  // ── v0.62.915 — THE DRIFT THIS RELEASE REMOVED ────────────────────────────────────────────
  //
  // The bot held `_OVERLAY_LANGS = new Set(['id','ru','de'])` while `lib/fun-facts.js` had been
  // corrected to read the overlay for zh/ja/es too. Measured on the shipped data AT THE TIME: the
  // generated overlay carried SIX locales x 72 facts, and the bot consulted three — so 216 written
  // bodies were discarded at render time and a Chinese reader got English from the bot and Chinese
  // from the Mini App, off the same file.
  //
  // ⚠ THAT 216 IS A MEASUREMENT WITH A DATE ON IT, not a constant. v0.62.919 added `ko` and the
  // overlay now carries SEVEN locales, so the deleted path would discard 288. The live pin is in
  // `__tests__/locale-allowlist-census.test.js`, which says the same thing and explains why the
  // figure GROWS by 72 per locale rather than signalling a widening bug. Stated here because a
  // comment asserting a measurement is an assertion, and three of those went stale in this file's
  // neighbours before anybody looked.

  it('⚠ an overlay locale the bot used to discard now reaches the reply', async () => {
    // ⚠ `ko` IS HERE BECAUSE OF WHAT v0.62.919 CLAIMS, and it was missing when that shipped.
    // That release put 72 Korean bodies in the overlay and said a Korean reader now gets Korean
    // on BOTH surfaces. The Mini App side is proved by `__tests__/fun-facts-ko.test.js`, which
    // calls the shared `factBody`; the BOT is a separate call site, and the only ko assertions
    // here covered the header and the Source label — never a body. One datum, several call
    // sites, only some of them asked: the shape this arc has now found in the Places ternaries,
    // the Michelin cache key, the pool key and `runSearch`. A locale whose body path is unasserted
    // on a surface is a locale that surface can quietly drop.
    const withOverlay = { ...fact, _i18n: { zh: 'ZH overlay body', ja: 'JA overlay body', ko: 'KO overlay body' } };
    const zh = await _formatHtml(withOverlay, 'zh');
    expect(zh, 'zh still falls through to the English body').toContain('ZH overlay body');
    expect(zh).not.toContain('EN body text');
    const ja = await _formatHtml(withOverlay, 'ja');
    expect(ja).toContain('JA overlay body');
    const ko = await _formatHtml(withOverlay, 'ko');
    expect(ko, 'ko falls through to the English body — v0.62.919 does not reach the bot').toContain('KO overlay body');
    expect(ko).not.toContain('EN body text');
  });

  it('⚠ a hand-authored flat body still beats the generated overlay', async () => {
    // The precedence `factBody()` pins, asserted from the bot side too: the bot must not have
    // re-implemented it in the other order while reading the same data.
    const both = { ...fact, ja: 'JA hand-authored', _i18n: { ja: 'JA overlay body' } };
    expect(await _formatHtml(both, 'ja')).toContain('JA hand-authored');
  });

  it('⚠ `fact.id` is the identifier, never an Indonesian body', async () => {
    // `id` is a locale code AND this data file's primary key. Reading the flat key for 'id'
    // would print the fact's id string as its body.
    const idFact = { ...fact, id: 'sample', _i18n: { id: 'ID overlay body' } };
    const html = await _formatHtml(idFact, 'id');
    expect(html).toContain('ID overlay body');
    expect(html, 'the fact identifier leaked into the body').not.toContain('>sample<');
  });

  it('the header and the Source label carry all nine locales', async () => {
    // Widening the BODY alone would have printed a Chinese fact under an English heading.
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
    const seenHeaders = new Set();
    for (const l of LOCALES) {
      const html = await _formatHtml(fact, l);
      const header = html.slice(html.indexOf('<b>') + 3, html.indexOf('</b>'));
      expect(header, `${l} has no header`).toBeTruthy();
      seenHeaders.add(header);
    }
    // fr and en both say "Source", but the HEADERS must all differ — an English header reaching
    // a ninth locale is exactly the defect, and a count is the only way to see it.
    expect(seenHeaders.size, 'two locales share a header — one of them is falling back to EN')
      .toBe(LOCALES.length);
    const withSource = { ...fact, sourceUrl: null };
    expect(await _formatHtml(withSource, 'ko')).toContain('출처:');
    expect(await _formatHtml(withSource, 'zh')).toContain('来源:');
    expect(await _formatHtml(withSource, 'en')).toContain('Source:');
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
