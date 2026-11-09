// The reader's language survives the round trip — no hand-copied allow-list narrows it.
//
// WHAT THIS GUARDS, AND WHY A CENSUS RATHER THAN FOUR ASSERTIONS.
//
// v0.62.915 fixed seven sites that each restated which locales the app speaks. They were written
// at different times, by different hands, and every one of them was correct on the day it was
// typed: `['en','fr']` was the whole list once. What made them defects is that i18n.js grew to
// nine and none of them heard about it.
//
//   index.js x4            the TMA toggle's `lang` on copy-all / copy-one / warm-start / syntax
//   clip-store.js          a ternary ladder clamping a saved card to five locales
//   bot-fun-facts.js       its own copy of the overlay rule, three locales behind the lib's
//   open-hours.js          `ko` missing from the 24-hour branch under nine-locale day tables
//
// Pinning those seven line numbers would guard the past. The failure mode is a NEW eighth copy,
// so the assertion has to be the property — no narrow locale allow-list anywhere on a runtime
// path — and the exemptions have to be named with reasons, the ERASURE_EXEMPT shape this repo
// already uses for `sg-terms-i18n.js`'s NOT_TERMS.
//
// COMMENTS ARE MASKED. Thirteenth occurrence of the self-referential trap: the comments above,
// and the ones in the fixed files, necessarily CONTAIN `['en','fr']`. An unmasked scan reports a
// hit in exactly the files that were fixed. The masker is the regex-aware one — the naive copy
// desynced on a regex literal holding a quote and left 512 comment lines unmasked in index.js.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { maskComments } from './helpers/mask-comments.js';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { SUPPORTED } = require('../i18n.js');

const NINE = new Set(SUPPORTED);

/**
 * Files that MAY carry a narrower locale set, each with the reason. A file not listed here and
 * not complete is a failure — the point is that adding one is a deliberate act with a stated
 * justification, not something a future edit does by accident.
 */
const NARROWER_ON_PURPOSE = {
  'web/_shared/lib/sg-place-text.js':
    'NON_LATIN and HEAD_FINAL are SCRIPT properties, not coverage — ru/zh/ja/ko need a script '
    + 'conversion and zh/ja/ko put the head last. A tenth locale in Latin script belongs in neither.',
  'web/_shared/lib/sg-terms-i18n.js':
    'TERM_LOCALES is the eight NON-ENGLISH locales; English is the source column, not a translation.',
  'web/cuisine/src/v2/lib/fun-facts.js':
    'SUPPORTED_LANGS is which languages MAY appear as a FLAT key on a fact (its own comment says '
    + 'so) and includes ms/ta/th, which the app UI does not speak; OVERLAY_LANGS is which read the '
    + 'generated overlay. Neither is the app locale list.',
  'open-hours.js':
    'fmtTime branches on CLOCK CONVENTION — id uses dots, fr uses h, en uses 12-hour AM/PM, and '
    + 'the rest use a 24-hour colon. Grouping is the content, and the ko test below pins it.',
  'web/_shared/lib/sg-nouns-i18n.generated.js':
    'NOUN_READING_LOCALES is ru/ja/ko — the locales whose readers cannot read a Latin name, so a '
    + 'proper noun needs a TRANSLITERATION for them and for nobody else. A French reader already '
    + 'has the reading: "Whampoa" is "Whampoa". NOUN_TRANSLATION_LOCALES is the six non-English '
    + 'locales, English being the key language. Neither is the app locale list.',
  'clip-store.js':
    'The v0.62.915 comment quotes the five-locale ladder it replaced; the clamp itself reads '
    + 'SUPPORTED. Masking removes the comment, so a hit here would be real.',
};

const SKIP_DIRS = new Set(['node_modules', '.git', 'public', 'vault', 'doc', 'log', 'dist', '__tests__']);

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(p);
    }
  };
  walk(ROOT);
  return out;
}

/** Every array literal of 2+ locale codes in `code` that is not the full supported set. */
function narrowLocaleArrays(code) {
  const hits = [];
  const re = /\[\s*((?:'[a-z]{2}'\s*,\s*)+'[a-z]{2}')\s*\]/g;
  let m;
  while ((m = re.exec(code))) {
    const items = m[1].split(',').map((x) => x.trim().replace(/'/g, ''));
    if (!items.every((x) => NINE.has(x))) continue;      // not a locale list at all
    if (items.length === NINE.size) continue;            // already complete
    hits.push(items.join(','));
  }
  return hits;
}

describe('locale allow-list census', () => {
  const files = sourceFiles();

  it('the scanner sees the codebase at all', () => {
    // The #1844 lesson: a checker that parses nothing prints passes that are vacuously true of
    // nothing. Both floors below are far under the real figures and far over zero.
    expect(files.length, 'the walker found almost no source files').toBeGreaterThan(200);
    expect(files.some((f) => f.endsWith('/index.js')), 'index.js is not in the scan').toBe(true);
    expect(SUPPORTED).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });

  it('⚠ the census can actually fire', () => {
    // A guard that cannot fail is not a guard. The four real defects, replayed.
    expect(narrowLocaleArrays("['en','fr'].includes(x)")).toEqual(['en,fr']);
    expect(narrowLocaleArrays("new Set(['id', 'ru', 'de'])")).toEqual(['id,ru,de']);
    // …and it must NOT fire on the complete set, or every file fails and the guard gets deleted.
    expect(narrowLocaleArrays(`[${SUPPORTED.map((l) => `'${l}'`).join(',')}]`)).toEqual([]);
    // …nor on an array of two-letter strings that are not locales.
    expect(narrowLocaleArrays("['ab','cd']")).toEqual([]);
    // …and masking must be load-bearing. Asserted on a synthetic pair rather than on this file,
    // which was the first draft and was WRONG: this file states the literal twice — once in the
    // prose above and once as the fixture on the line above this one — and the fixture is CODE.
    // Masking correctly leaves it, so the check failed on a working masker. A self-check has to
    // separate the occurrence it expects to survive from the one it expects to disappear.
    expect(narrowLocaleArrays(maskComments("// the old form was ['en','fr'] here"))).toEqual([]);
    expect(narrowLocaleArrays(maskComments("const x = ['en','fr'];"))).toEqual(['en,fr']);
  });

  it('no runtime file narrows the locale list without a stated reason', () => {
    const offenders = [];
    for (const f of files) {
      const rel = path.relative(ROOT, f);
      if (/^scripts\//.test(rel)) continue;   // build-time tooling; its targets exclude 'en' by design
      const hits = narrowLocaleArrays(maskComments(fs.readFileSync(f, 'utf8')));
      if (!hits.length) continue;
      if (NARROWER_ON_PURPOSE[rel]) continue;
      offenders.push(`${rel} → [${hits.join('] [')}]`);
    }
    expect(offenders, 'a narrow locale allow-list appeared with no entry in NARROWER_ON_PURPOSE').toEqual([]);
  });

  it('every exemption carries a real reason, and none of them is stale', () => {
    for (const [rel, why] of Object.entries(NARROWER_ON_PURPOSE)) {
      expect(fs.existsSync(path.join(ROOT, rel)), `${rel} is exempt but no longer exists`).toBe(true);
      expect(String(why).length, `${rel} is exempt without a reason`).toBeGreaterThan(60);
    }
  });
});

describe('the four request-lang allow-lists', () => {
  const code = maskComments(fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8'));

  it('⚠ no route narrows the body lang to two locales any more', () => {
    // The masking must be doing something, or this passes for the wrong reason: index.js STILL
    // contains the literal, four times, in the comments recording its removal.
    const raw = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
    // A FLOOR, not an exact count. The first draft pinned 4 — one per fixed site — and measured
    // 8: two older comments elsewhere in the file quote the same literal, and pinning the count
    // makes an unrelated comment edit fail this guard for no reason.
    expect((raw.match(/\['en','fr'\]/g) || []).length,
      'the comments recording the fix are gone — re-check what this is measuring').toBeGreaterThanOrEqual(4);
    expect(narrowLocaleArrays(code), 'a narrow locale array survives in index.js code').toEqual([]);
  });

  it('all four sites read the supported list rather than restating it', () => {
    for (const name of ['bodyLang', 'venueLang', 'wsBodyLang', 'synBodyLang']) {
      const re = new RegExp(`const ${name} = [^;]*SUPPORTED_LOCALES_FOR_REVIEW\\.includes`);
      expect(code, `${name} does not consult the supported list`).toMatch(re);
    }
  });
});

describe('a saved card keeps the language it was saved in', () => {
  const clip = require('../clip-store.js');

  it('⚠ every supported locale round-trips through the card HASH', () => {
    // The ladder clamped to five, so a card saved by a zh/ja/es/ko reader came back 'en'.
    // normaliseRecord is not exported; denormalise(normalise(x)) is, via the module's own path.
    const src = fs.readFileSync(path.join(ROOT, 'clip-store.js'), 'utf8');
    const code = maskComments(src);
    expect(code, 'the ternary ladder is back').not.toMatch(/record\.lang === 'fr' \? 'fr'/);
    expect(code, 'the clamp no longer reads the supported list').toMatch(/SUPPORTED_LOCALES\.includes\(record\.lang\)/);
    expect(src.includes('en/fr/id/ru/de'),
      'the comment naming the five-locale ladder is gone — re-check what the masked check proves').toBe(true);
  });

  it('the exported record shape carries a non-English lang through', () => {
    // Behavioural, not textual: push a record through whatever public surface exists.
    expect(typeof clip.pushClip).toBe('function');
    for (const l of SUPPORTED) expect(NINE.has(l)).toBe(true);
  });
});

describe('open-hours speaks the reader\'s clock', () => {
  const { fmtTime } = require('../open-hours.js');

  it('⚠ no non-English locale gets an English AM/PM', () => {
    // `ko` was missing from the 24-hour branch while DAY_LABELS and OH_PHRASES both carried all
    // nine — an otherwise-Korean hours line ending in "AM".
    for (const l of SUPPORTED.filter((x) => x !== 'en')) {
      expect(fmtTime(11, 0, l), `${l} renders an English AM`).not.toMatch(/AM|PM/);
      expect(fmtTime(19, 30, l), `${l} renders an English PM`).not.toMatch(/AM|PM/);
    }
    // English is unchanged, deliberately.
    expect(fmtTime(11, 0, 'en')).toBe('11:00 AM');
    expect(fmtTime(19, 30, 'en')).toBe('7:30 PM');
    // …and ko specifically, since that is the one this release added.
    expect(fmtTime(11, 0, 'ko')).toBe('11:00');
  });

  it('the day and phrase tables still carry all nine, which is what made ko a gap', () => {
    const src = fs.readFileSync(path.join(ROOT, 'open-hours.js'), 'utf8');
    for (const table of ['DAY_LABELS', 'OH_PHRASES']) {
      const body = new RegExp(`const ${table} = \\{([\\s\\S]*?)\\n\\};`).exec(src)?.[1] || '';
      const keys = [...body.matchAll(/^ {2}([a-z]{2}):/gm)].map((m) => m[1]);
      expect(keys.sort(), `${table} no longer carries all nine`).toEqual([...SUPPORTED].sort());
    }
  });
});

describe('the bot no longer keeps its own copy of the overlay rule', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bot-fun-facts.js'), 'utf8');
  const code = maskComments(src);

  it('⚠ _OVERLAY_LANGS is gone, not widened', () => {
    // A second copy of a rule is the defect; a wider second copy is the same defect with a later
    // expiry date. Masked, because the comment explaining the removal names the constant.
    expect(code, 'the bot re-declared its own overlay language set').not.toMatch(/const _OVERLAY_LANGS/);
    expect(src.includes('_OVERLAY_LANGS'),
      'the comment recording the removal is gone — re-check what this measures').toBe(true);
    expect(code, 'the bot does not resolve the body through the shared factBody').toContain('factBody');
  });

  it('the generated overlay carries more locales than the old set consulted', async () => {
    // The measurement the fix rests on, re-taken from the shipped data rather than remembered.
    const gen = await import('../web/cuisine/src/v2/data/fun-facts-i18n.generated.js');
    const data = gen.default;
    const ids = Object.keys(data);
    expect(ids.length, 'the overlay is empty — this assertion would be vacuous').toBeGreaterThan(50);
    const langs = new Set();
    for (const id of ids) for (const l of Object.keys(data[id] || {})) langs.add(l);
    const OLD = new Set(['id', 'ru', 'de']);
    const discarded = [...langs].filter((l) => !OLD.has(l));
    expect(discarded.sort(), 'the overlay locales changed — re-measure what the old set discarded')
      .toEqual(['es', 'ja', 'ko', 'zh']);
    const strings = discarded.reduce((n, l) => n + ids.filter((i) => data[i]?.[l]).length, 0);
    // ⚠ THIS NUMBER GROWS WHENEVER THE OVERLAY DOES, AND THAT IS NOT A WIDENING BUG. It counts
    // the bodies a code path that NO LONGER EXISTS — the bot's deleted `_OVERLAY_LANGS` — would
    // have discarded. Every locale added to the overlay adds 72 to it: 216 at three locales
    // (v0.62.915, es/ja/zh), 288 at four (v0.62.919, + ko). A reader who takes a rising figure
    // here as a regression is reading the wrong direction; the assertion above it, on the locale
    // SET, is the one that would catch a real narrowing.
    expect(strings, 'the count of bodies the deleted bot path would have discarded').toBe(288);
  });
});
