// __tests__/i18n-shipped-quality.test.js — v0.62.732
//
// Locks in what the meaning pass over the six machine-translated languages
// (id, ru, de, zh, ja, es) established, so the same damage cannot come back
// unnoticed on the next translation run.
//
// WHY THIS FILE READS i18n.js AND NOT THE JOB FILES. The existing structural
// gate, validate-i18n-translations.mjs, reads scripts/i18n-audit-jobs/ — the
// translator's OUTPUT, before anything was pruned, repaired or corrected by
// hand. It therefore could not see the file the bot actually loads. A gate
// pointed at a pipeline's input cannot report on what came out the other end,
// which is how 1,509 shipped strings passed a green check while carrying
// "Massenzerstörung" (mass destruction) for "Mass Disruption" and Japanese
// "recently taken photos" for "recent picks".

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateItem } from '../scripts/validate-i18n-translations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
const MACHINE_LANGS = ['id', 'ru', 'de', 'zh', 'ja', 'es'];

/**
 * Key families whose English value is ALREADY in the reader's target language by
 * design: `bot.lang.set.de` confirms in German because that is the language you
 * just switched to, and `language.btn.ja` is the endonym 日本語 so a reader who
 * cannot read the current UI language can still find their own. Translating them
 * defeats the purpose, and every one of the 96 variants was wrong — Russian
 * "Delivery to Indonesia (without the Mini App)" for "Language set to Indonesian",
 * Indonesian "CNY 中文" where the 🇨🇳 flag had been translated as a currency code.
 */
const ENDONYM_FAMILIES = ['bot.lang.set.', 'language.btn.'];

function parseEntries() {
  const KEY_RE = /^ {2}'([\w.]+)':\s*\{/gm;
  const out = [];
  let m;
  while ((m = KEY_RE.exec(SRC))) {
    const open = SRC.indexOf('{', m.index);
    let depth = 0, end = -1, inStr = null;
    for (let i = open; i < SRC.length; i++) {
      const ch = SRC[i], prev = SRC[i - 1];
      if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
      if (ch === "'" || ch === '"') { inStr = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (!depth) { end = i; break; } }
    }
    if (end < 0) continue;
    const body = SRC.slice(open + 1, end);
    const pick = (l) => {
      const g = body.match(new RegExp(`\\b${l}:\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`));
      if (!g) return null;
      try { return (0, eval)(g[1]); } catch { return null; }
    };
    out.push({ key: m[1], pick });
  }
  return out;
}

const ENTRIES = parseEntries();

describe('shipped i18n translations', () => {
  it('parses every entry in i18n.js', () => {
    expect(ENTRIES.length).toBeGreaterThan(250);
  });

  it('is structurally safe against its own English source in all six languages', () => {
    const failures = [];
    for (const e of ENTRIES) {
      const en = e.pick('en');
      if (en === null) continue;
      for (const lang of MACHINE_LANGS) {
        const t = e.pick(lang);
        if (t === null) continue;
        const reasons = validateItem(en, t);
        if (reasons.length) failures.push(`${lang} ${e.key}: ${reasons.join(', ')}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('keeps the endonym families untranslated so t() falls back to en', () => {
    const leaked = [];
    for (const e of ENTRIES) {
      if (!ENDONYM_FAMILIES.some((p) => e.key.startsWith(p))) continue;
      for (const lang of MACHINE_LANGS) {
        if (e.pick(lang) !== null) leaked.push(`${lang} ${e.key}`);
      }
    }
    expect(leaked).toEqual([]);
  });

  it('has no slot-padding artefacts left around markup or placeholders', () => {
    // The translator wrapped every substituted token in spaces: `* {n} *` broke
    // Telegram's emphasis, `<i> {street} </i>` rendered a gap inside the italics,
    // and `/buddy block<chat_id> ` moved the delimiter off the command.
    const artefacts = [];
    for (const e of ENTRIES) {
      for (const lang of MACHINE_LANGS) {
        const t = e.pick(lang);
        if (t === null) continue;
        if (/(^|\s)\*\s\{|\}\s\*(\s|$)/.test(t)) artefacts.push(`${lang} ${e.key}: padded *emphasis*`);
        if (/<(?:b|i|u|s|code|pre)>\s+\{|\}\s+<\//.test(t)) artefacts.push(`${lang} ${e.key}: padded tag`);
        if (/\/[a-z]{1,15}<[a-z_]/.test(t)) artefacts.push(`${lang} ${e.key}: command glued to its argument`);
        if (/\{[\w-]+\} {2,}</.test(t)) artefacts.push(`${lang} ${e.key}: double space before markup`);
      }
    }
    expect(artefacts).toEqual([]);
  });

  it('leaves no English "lots" or bare "min ago" fragments in a translated row', () => {
    // Two keys shipped with the English unit still in place inside an otherwise
    // translated string — `{lots} lots` in five languages, `{h} h {m} min ago` in
    // German. Both are invisible to a structural check: the shape is perfect.
    const leftovers = [];
    for (const key of ['carpark.row', 'location.age.hourAgo']) {
      const e = ENTRIES.find((x) => x.key === key);
      expect(e, `${key} should exist`).toBeTruthy();
      for (const lang of MACHINE_LANGS) {
        const t = e.pick(lang);
        if (t === null) continue;
        // Strip the placeholders first — `{lots}` is the placeholder NAME and
        // matches \blots\b, which would fail every correct translation.
        const prose = t.replace(/\{[\w-]+\}/g, '');
        if (/\blots\b|\bmin ago\b/.test(prose)) leftovers.push(`${lang} ${key}: ${t}`);
      }
    }
    expect(leftovers).toEqual([]);
  });

  it('applies the recorded meaning fixes idempotently', () => {
    // Every fix carries the string it replaced. If i18n.js drifts away from both
    // `before` and `after`, the fix list is stale and silently no longer describes
    // the file — the failure mode this assertion exists to surface.
    const fixes = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'scripts/i18n-meaning-fixes.json'), 'utf8')
    );
    expect(fixes.length).toBeGreaterThan(0);
    const stale = [];
    for (const fix of fixes) {
      const e = ENTRIES.find((x) => x.key === fix.key);
      const current = e ? e.pick(fix.lang) : null;
      if (current !== fix.after) stale.push(`${fix.lang} ${fix.key}`);
      if (!fix.why) stale.push(`${fix.lang} ${fix.key}: no reason recorded`);
    }
    expect(stale).toEqual([]);
  });
});
