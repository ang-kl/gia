// i18n-translate.test.js — v0.62.718
//
// The masking layer is the whole reason this module exists: without it Cloud
// Translation turns {cap} into {上限} and /hidden into /oculto, both of which
// read as fluent text and pass casual review. These tests pin that behaviour,
// including the failure DETECTION path — a mask that silently stops working
// would be worse than no mask, because the output would still look clean.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { mask, unmask, protectedRunsIntact, fillJob } = require('../i18n-translate');

describe('mask — wraps what must survive', () => {
  it('protects a placeholder', () => {
    expect(mask('Top {n} eateries')).toBe('Top <span translate="no">{n}</span> eateries');
  });

  it('protects a slash command without eating its leading space', () => {
    expect(mask('tap /transport now')).toBe('tap <span translate="no">/transport</span> now');
  });

  it('protects a command at the very start of a string', () => {
    expect(mask('/cuisine for the picker')).toBe('<span translate="no">/cuisine</span> for the picker');
  });

  it('protects Telegram HTML tags', () => {
    const out = mask('<b>Top</b> picks');
    expect(out).toContain('<span translate="no"><b></span>');
    expect(out).toContain('<span translate="no"></b></span>');
  });

  it('protects a backtick code span', () => {
    expect(mask('Run `/cost` for the breakdown')).toContain('<span translate="no">`/cost`</span>');
  });

  it('protects several placeholders in one string', () => {
    const out = mask('limit of {cap} per {window} min, retry in {mins}');
    expect(out.match(/translate="no"/g)).toHaveLength(3);
  });

  it('leaves an unprotected string untouched', () => {
    expect(mask('No results near you')).toBe('No results near you');
  });
});

describe('unmask — restores and decodes', () => {
  it('strips the span wrapper', () => {
    expect(unmask('顶部 <span translate="no">{n}</span> 餐馆')).toBe('顶部 {n} 餐馆');
  });

  it('decodes the entities Cloud Translation introduces in html mode', () => {
    expect(unmask('You&#39;ve hit the limit')).toBe("You've hit the limit");
    expect(unmask('a &amp; b')).toBe('a & b');
  });

  it('round-trips a string through mask then unmask unchanged', () => {
    for (const s of [
      "⏳ You've hit the limit of {cap} requests per {window} minutes.",
      '🚆 For trains, tap /transport. This chat searches for food.',
      '✨ <b>Top {n} eateries near {place}</b> (within {km} km)',
      'Run `/cost` for the breakdown.'
    ]) {
      expect(unmask(mask(s))).toBe(s);
    }
  });
});

describe('protectedRunsIntact — detects a mask that did not hold', () => {
  it('passes when every protected run survived', () => {
    expect(protectedRunsIntact('Top {n} near {place}', '顶部 {n} 靠近 {place}')).toBe(true);
  });

  it('fails on a translated placeholder', () => {
    expect(protectedRunsIntact('limit of {cap}', '限制为 {上限}')).toBe(false);
  });

  it('fails on a translated command — the case that produces a dead button', () => {
    expect(protectedRunsIntact('tap /transport', '点按 /运输')).toBe(false);
  });

  it('fails when a placeholder is dropped entirely', () => {
    expect(protectedRunsIntact('Top {n} eateries', '顶部餐馆')).toBe(false);
  });
});

describe('fillJob', () => {
  const makeJob = (n = 2) => ({
    job: { target_lang: 'zh-CN' },
    items: Array.from({ length: n }, (_, i) => ({
      id: `k${i}`, source: `String ${i} with {ph}`,
      google_translation: null,
      gemini_audit: { verdict: 'unreviewed', notes: '' }
    }))
  });

  beforeEach(() => vi.restoreAllMocks());

  it('refuses without an API key rather than failing silently', async () => {
    await expect(fillJob(makeJob(), { apiKey: '' })).rejects.toThrow(/GOOGLE_TRANSLATE_API_KEY/);
  });

  it('refuses without a target language', async () => {
    const j = makeJob(); delete j.job.target_lang;
    await expect(fillJob(j, { apiKey: 'k' })).rejects.toThrow(/target_lang/);
  });

  it('skips items that already carry a translation, so a re-run is cheap', async () => {
    const axios = require('axios');
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { translations: [{ translatedText: '译文 <span translate="no">{ph}</span>' }] } }
    });
    const j = makeJob(2);
    j.items[0].google_translation = 'already done';
    const r = await fillJob(j, { apiKey: 'k' });
    expect(r.filled).toBe(1);
    expect(r.alreadyFilled).toBe(1);
    expect(j.items[0].google_translation).toBe('already done');
  });

  it('flags an item whose protected run did not survive', async () => {
    const axios = require('axios');
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { translations: [{ translatedText: '译文 {占位}' }] } }   // placeholder mangled
    });
    const j = makeJob(1);
    const r = await fillJob(j, { apiKey: 'k' });
    expect(r.damaged).toBe(1);
    expect(j.items[0].gemini_audit.notes).toMatch(/placeholder_damaged/);
  });

  it('throws when the API returns a different number of results than asked for', async () => {
    const axios = require('axios');
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { translations: [] } } });
    await expect(fillJob(makeJob(2), { apiKey: 'k' })).rejects.toThrow(/expected 2 results/);
  });

  it('does not let a cost-recording failure break the translation', async () => {
    const axios = require('axios');
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { translations: [{ translatedText: '译文 <span translate="no">{ph}</span>' }] } }
    });
    const hostileRedis = { get isOpen() { throw new Error('redis exploded'); } };
    const r = await fillJob(makeJob(1), { apiKey: 'k', redis: hostileRedis });
    expect(r.filled).toBe(1);
  });
});

// ── v0.62.862 — WHY THIS MODULE IS STILL HERE ────────────────────────────────────────────
//
// Operator, 31-08 '26: *"i have rotated the I18N_TRANSLATE_TOKEN. And now being deployed"*.
//
// Checking what that rotation touched, I reported this module as ORPHANED and proposed
// deleting it. That was WRONG, and the way it was wrong is the reason this block exists: the
// check was `require('./i18n-translate')` — with a leading `./` — which cannot match the real
// call sites, because all three live one directory down and write `'../i18n-translate'`.
//
// A grep that can only match one spelling returned 0 and read as proof of absence. Deleting
// on it would have taken out a live 20-test suite and two operator scripts.
//
// So the guard is inverted: instead of asserting the module is unused, this asserts it IS
// used, and names who by. A future "dead code cleanup" now fails loudly rather than deleting
// a module whose consumers a narrow grep could not see.
import { readFileSync, existsSync } from 'fs';
import { join as pathJoin } from 'path';

describe('i18n-translate.js has live consumers — do not delete it', () => {
  const ROOT = pathJoin(__dirname, '..');
  const CONSUMERS = [
    '__tests__/i18n-translate.test.js',        // this file
    'scripts/fill-i18n-translations.mjs',
    'scripts/retranslate-failed-i18n.mjs'
  ];

  it('the module exists', () => {
    expect(existsSync(pathJoin(ROOT, 'i18n-translate.js'))).toBe(true);
  });

  it('and every known consumer still requires it, by its real specifier', () => {
    for (const c of CONSUMERS) {
      const src = readFileSync(pathJoin(ROOT, c), 'utf8');
      expect(src, `${c} no longer requires i18n-translate`).toMatch(/require\(['"]\.\.\/i18n-translate['"]\)/);
    }
  });

  it('the search that missed them is pinned, so nobody repeats it', () => {
    // `./i18n-translate` matches NOTHING in this repo — that spelling is why the orphan check
    // returned a false zero. Kept as a negative assertion because a reviewer reading
    // "0 call sites" has no way to tell a real zero from that one.
    //
    // COMMENTS STRIPPED FIRST, and the reason is almost too neat: the first version of this
    // assertion FAILED, because the paragraph above quotes the very specifier it scans for.
    // That is the FIFTH source scan in this arc to match its own prose — in a test written
    // about a search that matched the wrong thing.
    const code = readFileSync(pathJoin(ROOT, '__tests__/i18n-translate.test.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    expect(code).not.toMatch(/require\(['"]\.\/i18n-translate['"]\)/);
    expect(code).toMatch(/require\(['"]\.\.\/i18n-translate['"]\)/);
  });
});

describe('the rotated token is safe to remove from Railway', () => {
  const ROOT = pathJoin(__dirname, '..');
  const INDEX = readFileSync(pathJoin(ROOT, 'index.js'), 'utf8');

  it('I18N_TRANSLATE_TOKEN is not in the required-env list, so removing it cannot fail startup', () => {
    // index.js exits(1) on a missing REQUIRED var. This is the claim the "you can delete the
    // Railway variable" recommendation rests on, so it is asserted rather than stated.
    const m = INDEX.match(/const required = \[([^\]]*)\]/);
    expect(m, 'the required-env list moved or changed shape').toBeTruthy();
    expect(m[1]).not.toMatch(/I18N_TRANSLATE_TOKEN/);
    expect(m[1], 'the guard is vacuous if the list is empty').toMatch(/TELEGRAM_BOT_TOKEN/);
  });

  it('and no code reads the token at all — the routes went at v0.62.730', () => {
    // Comments and test fixtures mention the NAME; nothing reads the VALUE.
    expect(INDEX).not.toMatch(/process\.env\.I18N_TRANSLATE_TOKEN/);
    expect(INDEX, 'the deleted route is back').not.toMatch(/app\.(get|post)\(['"]\/api\/i18n-translate/);
  });
});
