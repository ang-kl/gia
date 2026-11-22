// __tests__/auto-nearby-intro-html.test.js — v0.62.987.
//
// Spec: doc/Feature/2026-11-15-chat-place-opens-cuisine-and-bold-tag.spec.md, invariant K1.
//
// Operator, 15-11 '26, with a screenshot: "There is styling <b> in the telegram text". The chat line read
//   Slim pickings at <b>Johor Bahru</b> - here are the top-rated eateries nearby:
// in italics, with the tags printed. The string wrapped the sentence in Markdown underscores and the place name in
// HTML <b>, and the send site used parse_mode 'Markdown': Telegram applied the one style and printed the other.
//
// The strings are CALLED through tn(), in all nine locales. The send site lives in a bot handler that cannot be
// called without booting the bot, so it is pinned by source with comments masked, and the comment says so.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { tn, SUPPORTED } = require('../i18n.js');

const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
// Comments masked, so a sentence in prose cannot satisfy a check about code.
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// A Markdown emphasis wrapper around the whole string AND an HTML tag inside it: whichever parse mode sends it, one
// of the two is printed as characters.
const HTML_TAG = /<\/?(?:b|i|u|s|code|pre|a)(?:\s[^>]*)?>/;
const mixesStyles = (s) => /^([_*])[\s\S]*\1$/.test(s) && HTML_TAG.test(s);

describe('K1 - the nearby-eateries line reaches Telegram as valid HTML, in nine languages', () => {
  it('the nine locales under test are the nine the bot supports', () => {
    expect([...SUPPORTED].sort()).toEqual([...LOCALES].sort());
  });

  for (const lang of LOCALES) {
    it(`${lang}: italic sentence, bold place, no Markdown underscores, tags balanced`, () => {
      const out = tn('place.autoNearbyIntro', lang, { place: 'Fish &amp; Co' });
      expect(out.startsWith('<i>'), out).toBe(true);
      expect(out.endsWith('</i>'), out).toBe(true);
      expect(out).toContain('<b>Fish &amp; Co</b>');
      expect(out.includes('_'), `an underscore survives in ${lang}: ${out}`).toBe(false);
      for (const tag of ['i', 'b']) {
        const open = out.split(`<${tag}>`).length - 1;
        const close = out.split(`</${tag}>`).length - 1;
        expect([tag, open, close]).toEqual([tag, 1, 1]);
      }
      // The bold sits inside the italics, never straddling them.
      expect(out.indexOf('<b>')).toBeGreaterThan(out.indexOf('<i>'));
      expect(out.indexOf('</b>')).toBeLessThan(out.indexOf('</i>'));
    });
  }

  it('the send site sends it as HTML (source pin: the handler cannot be called without the bot)', () => {
    const src = code('index.js');
    const at = src.indexOf("'place.autoNearbyIntro'");
    expect(at, 'the key is no longer sent from index.js').toBeGreaterThan(-1);
    expect(src.indexOf("'place.autoNearbyIntro'", at + 1), 'a second send site appeared; pin it too').toBe(-1);
    const call = src.slice(at, at + 220);
    expect(call).toMatch(/parse_mode:\s*'HTML'/);
    expect(call).not.toMatch(/parse_mode:\s*'Markdown'/);
  });
});

describe('K1 - no chat string wraps a sentence in Markdown emphasis and puts an HTML tag inside it', () => {
  it('the detector fires on the string as it shipped, so a clean scan means something', () => {
    const shipped = '_Slim pickings at ' + '<b>{place}</b>' + ' - here are the top-rated eateries nearby:_';
    expect(mixesStyles(shipped)).toBe(true);
    expect(mixesStyles('<i>Slim pickings at <b>{place}</b>:</i>')).toBe(false);
    expect(mixesStyles('_plain italics_')).toBe(false);
    expect(mixesStyles('snake_case and <b>bold</b>')).toBe(false);
  });

  it('i18n.js holds no such string', () => {
    const src = code('i18n.js');
    const literals = src.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) || [];
    // An empty parse must not read as a clean file.
    expect(literals.length, 'the scan parsed almost nothing out of i18n.js').toBeGreaterThan(2000);
    const offenders = literals.map((q) => q.slice(1, -1)).filter(mixesStyles);
    expect(offenders).toEqual([]);
  });
});
