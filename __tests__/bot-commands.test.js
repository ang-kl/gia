// bot-commands.test.js — v0.62.884
//
// WHAT WENT WRONG, AND WHY NOTHING SAID SO. The Telegram slash menu was two
// hardcoded arrays inside index.js — English and French — and index.js has no
// module.exports, so no test could reach them. `grep -rn setMyCommands
// __tests__/` returned nothing at all. Seven of the nine locales had no command
// list, the /language entry still read "English / Français" three locale
// additions later, and the operator found it by opening the menu.
//
// The other half of the bug is subtler and this file states it in assertions
// rather than prose: Telegram picks a list by the user's CLIENT language, so
// registering all nine language_code lists STILL leaves a Korean speaker whose
// app is in English reading English. Only a chat-scoped list overrides that.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const {
  COMMAND_IDS, MAX_COMMANDS, NAME_MAX, DESCRIPTION_MAX, NAME_RE,
  chatScope, deleteScopeArg, buildCommandList, buildDescription, buildShortDescription,
} = require('../bot-commands');
const { t, SUPPORTED } = require('../i18n');

const COUNTS = { cuisines: '55+', hawker: '100' };
// Comments in index.js QUOTE the very patterns these scans look for — the
// v0.62.884 comment explains the drift by naming the stale alternation, and the
// helpers are declared with the same call shape their call sites use. Both made
// this file fail on its first run. bot-ternary-sweep.test.js hit the same trap
// and wrote maskComments for it; this is the fifth occurrence in the arc, so the
// helper is reused rather than the assertions loosened. A scan that counts its
// own explanation is not measuring the code.
function maskComments(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

const INDEX_SRC = maskComments(read('index.js'));
// Occurrences that are CALLS, not the declaration `function name(...)`.
const calls = (name, args) =>
  (INDEX_SRC.match(new RegExp(String.raw`(?<!function )\b${name}\(${args}`, 'g')) || []).length;

// Deliberately absurd, to prove nothing here is tuned to today's numbers.
const COUNT_CASES = [
  { cuisines: '50+', hawker: '100' },
  { cuisines: '55+', hawker: '100' },
  { cuisines: '120', hawker: '127' },
  { cuisines: '9999+', hawker: '9999' },
];

describe('the command table is complete across every locale', () => {
  it('fourteen commands, nine locales, no gaps', () => {
    expect(COMMAND_IDS).toHaveLength(14);
    expect(SUPPORTED).toHaveLength(9);
    const gaps = [];
    for (const id of COMMAND_IDS) {
      for (const l of SUPPORTED) {
        const v = t(`bot.commands.${id}`, l);
        if (!v || v === `bot.commands.${id}`) gaps.push(`${id}.${l}: missing`);
        else if (!v.trim()) gaps.push(`${id}.${l}: blank`);
      }
    }
    expect(gaps, 'a missing cell is INVISIBLE at the call site — t() just serves English').toEqual([]);
    expect(COMMAND_IDS.length * SUPPORTED.length).toBe(126);
  });

  it('no locale silently serves the English', () => {
    // The failure this replaces was not a wrong translation, it was NO
    // translation: seven locales had no list, and Telegram fell back. Identity
    // with the English is how an unfilled cell looks from here.
    const same = [];
    for (const id of COMMAND_IDS) {
      const en = t(`bot.commands.${id}`, 'en');
      for (const l of SUPPORTED) {
        if (l === 'en') continue;
        if (t(`bot.commands.${id}`, l) === en) same.push(`${id}.${l}`);
      }
    }
    expect(same).toEqual([]);
  });

  it('and no two locales in one row are byte-identical', () => {
    const dupes = [];
    for (const id of COMMAND_IDS) {
      const seen = new Map();
      for (const l of SUPPORTED) {
        const v = t(`bot.commands.${id}`, l);
        if (seen.has(v)) dupes.push(`${id}: ${l} === ${seen.get(v)}`);
        else seen.set(v, l);
      }
    }
    expect(dupes).toEqual([]);
  });
});

describe("Telegram's own limits, asserted rather than assumed", () => {
  // Bot API, BotCommand: command is 1-32 chars of [a-z0-9_], description is
  // 1-256 chars, and setMyCommands takes at most 100 commands. Exceeding any of
  // them is a 400 inside a non-fatal catch — the exact shape of failure that let
  // the 512-char description sit broken for months.
  it('every command name is a legal Telegram command', () => {
    for (const id of COMMAND_IDS) {
      expect(NAME_RE.test(id), `/${id}`).toBe(true);
      expect(id.length).toBeLessThanOrEqual(NAME_MAX);
    }
    expect(new Set(COMMAND_IDS).size, 'a duplicate command silently wins').toBe(COMMAND_IDS.length);
  });

  it('every description in every locale fits 256 characters, at every count value', () => {
    const over = [];
    for (const counts of COUNT_CASES) {
      for (const l of SUPPORTED) {
        for (const c of buildCommandList(l, counts)) {
          if (c.description.length < 1 || c.description.length > DESCRIPTION_MAX) {
            over.push(`${c.command}.${l} @ ${counts.cuisines}/${counts.hawker}: ${c.description.length}`);
          }
          if (/\n/.test(c.description)) over.push(`${c.command}.${l}: newline`);
        }
      }
    }
    expect(over).toEqual([]);
  });

  it('and the list is under the 100-command ceiling', () => {
    for (const l of SUPPORTED) expect(buildCommandList(l, COUNTS)).toHaveLength(COMMAND_IDS.length);
    expect(COMMAND_IDS.length).toBeLessThanOrEqual(MAX_COMMANDS);
  });
});

describe('the live counts survive translation', () => {
  it('every locale keeps the placeholders the English has, and invents none', () => {
    // tn() renders an unknown name literally, so a dropped {hawker} does not
    // throw — it ships ">{hawker} hawker centres" to a reader.
    const bad = [];
    for (const id of COMMAND_IDS) {
      const en = new Set([...t(`bot.commands.${id}`, 'en').matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
      for (const l of SUPPORTED) {
        const got = new Set([...t(`bot.commands.${id}`, l).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
        for (const p of got) if (!en.has(p)) bad.push(`${id}.${l}: invented {${p}}`);
        for (const p of en) if (!got.has(p)) bad.push(`${id}.${l}: dropped {${p}}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('and nothing renders a brace to the reader', () => {
    for (const l of SUPPORTED) {
      for (const c of buildCommandList(l, COUNTS)) {
        expect(c.description, `${c.command}.${l}`).not.toMatch(/[{}]/);
      }
    }
  });

  it('the /language count is derived from SUPPORTED, not spelled out', () => {
    // "Switch chat language (English / Français)" was hardcoded and was wrong
    // from v0.62.480 onward. The count now moves when SUPPORTED moves.
    for (const l of SUPPORTED) {
      const langCmd = buildCommandList(l, COUNTS).find((c) => c.command === 'language');
      expect(langCmd.description, `${l}`).toContain(String(SUPPORTED.length));
    }
    expect(t('bot.commands.language', 'en')).toContain('{n}');
  });
});

describe('scripts stay where they belong', () => {
  const CJK = /[぀-ヿ一-鿿]/, CYR = /[Ѐ-ӿ]/, HANGUL = /[가-힣]/, KANA = /[぀-ヿ]/, HAN = /[一-鿿]/;

  it('no script leaks into a locale that does not use it', () => {
    const bad = [];
    for (const id of COMMAND_IDS) {
      for (const l of SUPPORTED) {
        const v = t(`bot.commands.${id}`, l);
        if (['ru', 'de', 'es', 'id', 'fr', 'en'].includes(l) && CJK.test(v)) bad.push(`${id}.${l}: CJK`);
        if (['zh', 'ja', 'de', 'es', 'id', 'fr', 'en', 'ko'].includes(l) && CYR.test(v)) bad.push(`${id}.${l}: Cyrillic`);
        if (l !== 'ko' && HANGUL.test(v)) bad.push(`${id}.${l}: Hangul`);
        if (l !== 'ja' && KANA.test(v)) bad.push(`${id}.${l}: kana`);
        // Korean is written in Hangul. Han characters are how a zh value gets
        // pasted into the ko column — it happened three times during K4/K5.
        if (l === 'ko' && HAN.test(v)) bad.push(`${id}.ko: Han character`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('and each non-Latin locale actually uses its own script', () => {
    const missing = [];
    for (const id of COMMAND_IDS) {
      if (!HANGUL.test(t(`bot.commands.${id}`, 'ko'))) missing.push(`${id}.ko`);
      if (!CYR.test(t(`bot.commands.${id}`, 'ru'))) missing.push(`${id}.ru`);
      if (!HAN.test(t(`bot.commands.${id}`, 'zh'))) missing.push(`${id}.zh`);
      const ja = t(`bot.commands.${id}`, 'ja');
      if (!KANA.test(ja) && !HAN.test(ja)) missing.push(`${id}.ja`);
    }
    expect(missing, 'a Latin-only value in a non-Latin locale is untranslated English').toEqual([]);
  });

  it('no description is left in English inside a non-Latin locale', () => {
    // Four or more Latin words in a row. Command names and the /search example
    // are quoted verbatim on purpose, so the run is measured after stripping
    // the slash-tokens they sit in.
    const bad = [];
    for (const id of COMMAND_IDS) {
      for (const l of ['ru', 'zh', 'ja', 'ko']) {
        const v = t(`bot.commands.${id}`, l).replace(/\/[a-z]+/g, ' ');
        const run = v.match(/(?:\b[A-Za-z][A-Za-z'’-]*\b[ ]+){3,}\b[A-Za-z][A-Za-z'’-]*\b/);
        if (run) bad.push(`${id}.${l}: "${run[0]}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('the chat scope — the part that makes the menu follow the toggle', () => {
  it('is a chat scope with no language_code', () => {
    // Bot API §Determining list of commands, private chats, in order:
    //   1 chat + language_code · 2 chat · 3 all_private_chats + language_code
    //   4 all_private_chats    · 5 default + language_code · 6 default
    // Rank 2 beats 5 and 6 unconditionally. Adding a language_code would move
    // this to rank 1, which is NARROWER — it would then apply only to users
    // whose client language already matched, i.e. the ones who did not need it.
    // An obviously-synthetic id. A real chat id is user data and a unit test has
    // no use for one; the first draft of this file pasted the owner's.
    const s = chatScope(100200300);
    expect(s).toEqual({ type: 'chat', chat_id: 100200300 });
    expect(Object.keys(s)).not.toContain('language_code');
  });

  it('and the delete path passes a STRING, because the library will not stringify it', () => {
    // node-telegram-bot-api 0.64.0: setMyCommands() JSON-stringifies form.scope
    // (src/telegram.js:2139), deleteMyCommands() does NOT (:2158). Passing the
    // object sends the literal "[object Object]" and the delete quietly misses.
    const arg = deleteScopeArg(42);
    expect(typeof arg).toBe('string');
    expect(JSON.parse(arg)).toEqual({ type: 'chat', chat_id: 42 });
    expect(String({})).toBe('[object Object]');   // what the asymmetry would have sent
  });

  it('index.js applies the chat list on toggle and clears it on auto and /forgetme', () => {
    expect(INDEX_SRC).toMatch(/applyChatCommands\(chatId, written\)/);
    expect(calls('applyChatCommands', 'chatId'), 'both the keyboard and /language <code>').toBe(2);
    expect(calls('clearChatCommands', String.raw`chatId\)`), '/language auto and /forgetme').toBe(2);
    expect(INDEX_SRC).toMatch(/deleteMyCommands\(\{ scope: deleteScopeArg\(chatId\) \}\)/);
  });

  it('and registers a list for every locale, not just two', () => {
    expect(INDEX_SRC, 'the hardcoded EN/FR arrays are gone').not.toMatch(/const (en|fr)Commands = \[/);
    expect(INDEX_SRC).toMatch(/for \(const lang of MENU_LANGS\)/);
    expect(INDEX_SRC).toMatch(/setMyCommands\(buildCommandList\(lang, _periodicalCountsStr\), \{ language_code: lang \}\)/);
  });
});

describe('the "What can this bot do?" pane — v0.62.885', () => {
  // The pane is a SECOND string family, not a reuse of bot.commands.*: it is
  // capped at 512 characters TOTAL for all fourteen lines (~20 each), while the
  // menu descriptions get 256 EACH. Truncating one to fit the other is garbage.
  // Until v0.62.885 it was EN + FR literals, so seven of nine readers got English
  // on the one surface whose entire job is telling them what the bot does.
  it('every command has a pane label in every locale', () => {
    const gaps = [];
    for (const id of COMMAND_IDS) {
      for (const l of SUPPORTED) {
        const v = t(`bot.about.${id}`, l);
        if (!v || v === `bot.about.${id}` || !v.trim()) gaps.push(`${id}.${l}`);
      }
    }
    expect(gaps).toEqual([]);
    for (const l of SUPPORTED) {
      expect(t('bot.about.hint', l), `hint.${l}`).not.toBe('bot.about.hint');
      expect(t('bot.about.short', l), `short.${l}`).not.toBe('bot.about.short');
    }
  });

  it('and no locale silently serves the English, bar two named proper-noun pairs', () => {
    // "Michelin, Bib, Asia 50/100" is four proper nouns and a number; Indonesian
    // and Spanish both write "Asia". French and Russian genuinely differ (Asie,
    // Азия) and are NOT listed — the exemption is per pair, so it cannot cover a
    // locale that simply went unfilled.
    const IDENTICAL_BY_DESIGN = new Set(['bot.about.recognised.id', 'bot.about.recognised.es']);
    const same = [];
    for (const key of [...COMMAND_IDS.map((id) => `bot.about.${id}`), 'bot.about.hint', 'bot.about.short']) {
      const en = t(key, 'en');
      for (const l of SUPPORTED) {
        if (l === 'en' || IDENTICAL_BY_DESIGN.has(`${key}.${l}`)) continue;
        if (t(key, l) === en) same.push(`${key}.${l}`);
      }
    }
    expect(same).toEqual([]);
  });

  it('the pane is built from COMMAND_IDS, so it cannot disagree with the menu', () => {
    // It disagreed for three months: /buddy was removed from the menu at
    // v0.60.113 and stayed in the pane, which also omitted /menu, /rating and
    // /clipboard. Derivation makes that structural rather than remembered.
    for (const l of SUPPORTED) {
      const lines = buildDescription(l, { cuisines: '55+', hawker: '100' }).split('\n');
      const listed = lines.filter((x) => x.startsWith('/')).map((x) => x.slice(1).split(' ')[0]);
      expect(listed, `${l} pane`).toEqual(COMMAND_IDS);
    }
  });

  it('and it cannot follow the toggle — stated as a fact about the Bot API', () => {
    // setMyDescription takes a language_code and NO scope, so it can only track
    // the reader's Telegram client language. The slash menu escapes this through
    // botCommandScopeChat; there is no equivalent here. Asserted so that the next
    // report of "the pane is in the wrong language" is read as the limit it is.
    expect(INDEX_SRC).toMatch(/setMyDescription\(code/);
    expect(INDEX_SRC, 'no chat scope exists for descriptions').not.toMatch(/setMyDescription\([^)]*scope/);
    expect(INDEX_SRC, 'no chat scope exists for the profile blurb').not.toMatch(/setMyShortDescription\([^)]*scope/);
    expect(INDEX_SRC, 'both panes loop every locale, not two').toMatch(/for \(const code of \[null, \.\.\.PANE_LANGS\]\)/);
  });

  it('the profile blurb names the product in every locale', () => {
    for (const l of SUPPORTED) expect(buildShortDescription(l), `${l}`).toContain('Soleat');
  });
});

describe('the drift that made this necessary cannot recur', () => {
  it('/language accepts every SUPPORTED locale, because the regex is built from it', () => {
    // K6 added 'ko' to SUPPORTED and left the literal alternation alone, so
    // `/language ko` matched NOTHING: bot.onText never fired and the user got
    // no acknowledgement and no picker. Silence, not an error.
    expect(INDEX_SRC, 'the hardcoded alternation is what went stale')
      .not.toMatch(/\(en\|fr\|id\|ru\|de\|zh\|ja\|es\|auto\)/);
    expect(INDEX_SRC).toMatch(/const LANGUAGE_CMD_RE = new RegExp\(/);

    const re = new RegExp(
      `^\\/(?:language|la)(?:@\\w+)?(?:\\s+(${[...SUPPORTED, 'auto'].join('|')}))?$`,
      'i',
    );
    for (const code of [...SUPPORTED, 'auto']) {
      expect(re.test(`/language ${code}`), `/language ${code}`).toBe(true);
    }
    expect(re.test('/la ko')).toBe(true);
    expect(re.test('/language xx'), 'an unsupported code must still be rejected').toBe(false);
  });

  it('the Telegram-client fallback covers all nine locales, not en/fr', () => {
    // Three sites derived it by hand and each hardcoded ['en','fr'], so a German
    // user with Telegram in German got an English /language prompt.
    expect(INDEX_SRC).not.toMatch(/\['en','fr'\]\.includes\(tgLang\)/);
    expect(calls('tgClientLang', String.raw`msg\)`), '/start drift hint, /language auto, the picker').toBe(3);
  });

  it('and bot.langname carries all nine, which widening the gate made reachable', () => {
    // bot.langname.ko did not exist. It was harmless only because /start's drift
    // hint gated on ['en','fr']; widening that gate is what would have shown a
    // Korean reader the literal string "bot.langname.ko".
    for (const l of SUPPORTED) {
      const v = t(`bot.langname.${l}`, 'en');
      expect(v, `bot.langname.${l}`).not.toBe(`bot.langname.${l}`);
    }
    expect(t('bot.langname.ko', 'ko')).toBe('한국어');
  });
});
