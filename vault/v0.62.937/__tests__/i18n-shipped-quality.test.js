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
import { TMA_FILES, BRAND_ONLY, loadStrings } from '../scripts/validate-i18n-tma.mjs';

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

  it('carries privacy.body and legal.body in every language, structurally matched', () => {
    // These two are `[ 'line', … ].join('\n')` rather than quoted strings, so the
    // parsers that matched only quoted literals skipped them entirely — the two
    // longest and most sensitive strings in the file were outside every check.
    const SRC = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
    const LANGS = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
    const problems = [];
    for (const key of ['privacy.body', 'legal.body']) {
      const at = SRC.indexOf(`  '${key}': {`);
      expect(at, `${key} should exist`).toBeGreaterThan(-1);
      const block = SRC.slice(at, SRC.indexOf('\n  },', at));
      const enLines = (block.match(/^      '/gm) || []).length;
      expect(enLines, `${key} should hold line arrays`).toBeGreaterThan(0);
      for (const lang of LANGS) {
        if (!new RegExp(`\\b${lang}:\\s*\\[`).test(block)) problems.push(`${key}: no ${lang}`);
      }
    }
    expect(problems).toEqual([]);
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

// The five Mini Apps are a second shipping surface with the same failure modes and,
// until v0.62.733, no gate at all. They are measured by EVALUATING each module: three
// of them merge a per-language overlay (`ID_STRINGS`, `RU_STRINGS`, …) into STRINGS at
// load, so a regex that looks for `id:` inside the entry literal reports a fully
// translated app as zero-covered. That mistake is the reason this block exists.
describe('shipped Mini App translations', () => {
  const LANGS = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];

  it('has every language for every key, except pure brand names', async () => {
    const gaps = [];
    for (const [name, rel] of TMA_FILES) {
      const S = await loadStrings(path.join(ROOT, rel));
      for (const [key, entry] of Object.entries(S)) {
        if (!entry || typeof entry.en !== 'string') continue;
        if (BRAND_ONLY.has(key)) continue;
        for (const lang of LANGS) {
          if (typeof entry[lang] !== 'string') gaps.push(`${name} ${lang} ${key}`);
        }
      }
    }
    expect(gaps).toEqual([]);
  }, 30000);

  it('is structurally safe against its own English source', async () => {
    const failures = [];
    for (const [name, rel] of TMA_FILES) {
      const S = await loadStrings(path.join(ROOT, rel));
      for (const [key, entry] of Object.entries(S)) {
        if (!entry || typeof entry.en !== 'string') continue;
        for (const lang of LANGS) {
          const v = entry[lang];
          // Present but empty is deliberate — `card.distAway` is `fr: ''` because
          // French renders the distance with no trailing suffix.
          if (typeof v !== 'string' || v === '') continue;
          const reasons = validateItem(entry.en, v);
          if (reasons.length) failures.push(`${name} ${lang} ${key}: ${reasons.join(', ')}`);
        }
      }
    }
    expect(failures).toEqual([]);
  }, 30000);
});

// v0.62.737 — a string that shows the user WHAT TO TYPE has to stay typeable. The
// free-text classifier's tokenize() splits on non-letter/number, so a Chinese or
// Japanese query collapses to a SINGLE token — `找拉面` and `ラーメンを探して` each
// tokenize to one item — and every whitelist it checks against is English. No CJK
// query can reach the cuisine-browse path at all. Whether Google Places would still
// resolve it is Not Verifiable here (no API call), which is exactly why the example
// is pinned to the form that demonstrably works rather than the one that might.
describe('typed examples stay typeable', () => {
  const TYPEABLE = [
    ['cuisine.chat.webhookOnly', 'find me ramen', ['zh', 'ja']],
    ['freetext.questionDeclined', 'char kway teow', ['zh', 'ja']],
    ['hidden.anchorAmbiguous', 'Holland Village', ['zh', 'ja']],
  ];

  for (const [key, example, langs] of TYPEABLE) {
    it(`keeps "${example}" in Latin script for ${langs.join('/')} in ${key}`, () => {
      const e = ENTRIES.find((x) => x.key === key);
      expect(e, `${key} should exist`).toBeTruthy();
      for (const lang of langs) {
        const v = e.pick(lang);
        if (v === null) continue;
        expect(v, `${lang} ${key}`).toContain(example);
      }
    });
  }

  it('the CJK tokenisation this guards against is real', () => {
    // Not an assumption about the classifier — the classifier itself, run here.
    const { _tokenize } = require('../freetext-classify.js');
    expect(_tokenize('find me ramen')).toEqual(['find', 'me', 'ramen']);
    expect(_tokenize('找拉面')).toHaveLength(1);
    expect(_tokenize('ラーメンを探して')).toHaveLength(1);
  });
});

// v0.62.736 — German addressed the reader as both du and Sie, 67 strings to 19, and one
// string used both inside a single message. The file is now Sie throughout; this keeps it
// that way. Spanish was swept at the same time and turned out to be already consistent —
// every usted had been converted during the meaning pass — so it is pinned rather than fixed.
describe('form of address stays consistent per language', () => {
  // Strip placeholders, tags, code spans and commands BEFORE looking for pronouns.
  // Without this `{dir}` matches \bdir\b and a wind-speed row reads as informal German.
  const prose = (s) => s
    .replace(/\{[\w-]+\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\/[a-z]{1,15}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');

  const DE_INFORMAL_PRONOUN = /\b[Dd]u\b|\b[Dd]ich\b|\b[Dd]ir\b|\b[Dd]eine?[nmrs]?\b/;

  // v0.62.738 — the pronoun regex above was the WHOLE guard, and it let a second, larger
  // class of informal German ship: the pronounless imperative. "Tippe auf eine Linie" and
  // "Entdecke Singapurs Küchen" address the reader as du without ever writing "du", so the
  // sweep counted 0 offenders while 18 such strings were live. Flagged by review on #1733.
  //
  // German cannot separate a du-imperative from a first-person narration by shape alone —
  // "Suche Lokale" is the SYSTEM saying "searching venues", not a command to the reader,
  // and the same is true of "Zeige die nächsten Ergebnisse" and "Prüfe Google Maps". Those
  // three lemmas are therefore excluded by name rather than by a per-key allow-list, which
  // would have to grow with every new loading string. Residual limit, stated not hidden: a
  // genuine "Suche jetzt" aimed at the reader would not be caught.
  const DE_IMPERATIVE_STEMS = [
    'Tippe', 'Entdecke', 'Lösche', 'Vergiss', 'Probier', 'Probiere', 'Klicke', 'Drücke',
    'Wähle', 'Öffne', 'Sende', 'Teile', 'Nutze', 'Verwende', 'Versuche', 'Schau', 'Scrolle',
    'Wechsle', 'Speichere', 'Erstelle', 'Setze', 'Füge', 'Ändere', 'Beginne', 'Starte',
    'Schreibe', 'Warte', 'Halte', 'Nimm', 'Frag', 'Frage', 'Sag', 'Zeig',
  ];
  const DE_INFORMAL_IMP = new RegExp(
    `(?:^|[^\\p{L}])(?:${DE_IMPERATIVE_STEMS.join('|')})(?![\\p{L}])`,
    'u',
  );
  const DE_INFORMAL = (s) => DE_INFORMAL_PRONOUN.test(s) || DE_INFORMAL_IMP.test(s);
  const ES_FORMAL = /\busted(es)?\b/;

  const shipped = (lang) => {
    const out = [];
    for (const e of ENTRIES) {
      const v = e.pick(lang);
      if (typeof v === 'string' && v) out.push([e.key, v]);
    }
    return out;
  };

  it('addresses German readers as Sie everywhere, never du', () => {
    const offenders = shipped('de')
      .filter(([, v]) => DE_INFORMAL(prose(v)))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it('addresses Spanish readers as tú everywhere, never usted', () => {
    const offenders = shipped('es')
      .filter(([, v]) => ES_FORMAL.test(prose(v)))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it('holds the same line across the five Mini Apps', async () => {
    // Two of the offenders lived here, not in i18n.js — menu's tile.sketchbook.sub and
    // clipboard's set.privacyNote. A guard over the bot file alone would have missed both.
    const offenders = [];
    for (const [name, rel] of TMA_FILES) {
      const S = await loadStrings(path.join(ROOT, rel));
      for (const [key, entry] of Object.entries(S)) {
        if (!entry || typeof entry.en !== 'string') continue;
        if (typeof entry.de === 'string' && DE_INFORMAL(prose(entry.de))) {
          offenders.push(`${name} de ${key}`);
        }
        if (typeof entry.es === 'string' && ES_FORMAL.test(prose(entry.es))) {
          offenders.push(`${name} es ${key}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  }, 30000);

  it('the German check can actually fire', () => {
    // A guard that cannot fail is not a guard.
    expect(DE_INFORMAL(prose('Teile deinen Standort'))).toBe(true);
    expect(DE_INFORMAL(prose('Teilen Sie Ihren Standort'))).toBe(false);
    expect(DE_INFORMAL(prose('Wind: {kt} kt{dir}'))).toBe(false);

    // The pronounless class the pronoun regex could not see — the actual strings that
    // shipped, and the Sie forms that replaced them.
    expect(DE_INFORMAL(prose('Tippe auf eine Linie, um ihre Stationen zu sehen.'))).toBe(true);
    expect(DE_INFORMAL(prose('Tippen Sie auf eine Linie, um ihre Stationen zu sehen.'))).toBe(false);
    expect(DE_INFORMAL(prose('Entdecke Singapurs 50+ Küchen'))).toBe(true);
    expect(DE_INFORMAL(prose('Entdecken Sie Singapurs 50+ Küchen'))).toBe(false);
    expect(DE_INFORMAL(prose('Lösche zuerst eines.'))).toBe(true);
    expect(DE_INFORMAL(prose('Löschen Sie zuerst eines.'))).toBe(false);

    // …and the first-person narration it must NOT touch, or every loading string breaks.
    expect(DE_INFORMAL(prose('Suche Lokale…'))).toBe(false);
    expect(DE_INFORMAL(prose('🔎 Prüfe Google Maps auf passende Lokale…'))).toBe(false);
    expect(DE_INFORMAL(prose('Zeige die nächsten Frucht-Ergebnisse.'))).toBe(false);
    // 'die Suche' is a noun here, not a verb of any person.
    expect(DE_INFORMAL(prose('Ort eingeben + Suche'))).toBe(false);

    // Neutral infinitive labels are register-free by construction (operator's call on the
    // four user-voice buttons) and must stay clear of the guard.
    expect(DE_INFORMAL(prose('Mich vergessen'))).toBe(false);
    expect(DE_INFORMAL(prose('Lokale zeigen'))).toBe(false);
    expect(DE_INFORMAL(prose('Mir sagen'))).toBe(false);
  });
});

// The command checks decide what counts as a Telegram command at all, so they are
// pinned in both directions: the cases they exist for must still fail, and the correct
// target-language forms they used to reject must pass.
describe('command detection boundaries', () => {
  const cases = [
    ['🔗 Copy /cuisine command', '🔗 Copier la commande /cuisine', [], 'command at end of string'],
    ['Sun/PH', 'Dim/fériés', [], 'slash meaning "or" inside a word'],
    ['Sorry, /forgetme hit an error.', '抱歉，/forgetme 出错了。', [], 'full-width comma before a command'],
    ['Sorry, /forgetme hit an error.', '申し訳ありません、/forgetme でエラー。', [], 'ideographic comma before a command'],
    ['Tap /l to set', 'Нажмите /l, чтобы', [], 'ASCII comma after a command'],
    ['/l <place> here', '/l<place> here', ['cmd-spacing'], 'argument fused to the command'],
    ['use /cuisine now', '/cuisineで探す', ['cmd-delimited', 'cmd-spacing'], 'command glued to kana'],
  ];
  for (const [en, translated, expected, why] of cases) {
    it(why, () => {
      expect(validateItem(en, translated)).toEqual(expected);
    });
  }
});
