// __tests__/classics-notes-korean.test.js — K5 of the Korean arc: the classics dish notes.
//
// 1,670 notes keyed `${scope}::${dish}`, folded onto CLASSIC_NOTES / CUISINE_NOTES by
// classics-notes.js at load. This is the LAST content PR of the arc; after it only K6, the flip,
// remains. `ko` is not in any SUPPORTED list yet, so `classics-city-plates-i18n.test.js` — which
// iterates a hardcoded eight-locale `LOCALES` — cannot see this column. The arc stages content
// first and flips the lists last, which keeps the suite green throughout; it also means the
// content arrives unguarded unless this file guards it.
//
// THIS IS NOT K4's GUARD WITH THE NUMBERS CHANGED. The two note corpora share 1,491 keys and not
// one shared `ja` value — the prose is genuinely different — and the shapes differ too:
//
//   1. A HARD 140-CHARACTER CAP applies here and not there, enforced by a shipped test that
//      cannot yet see `ko`. Asserted below directly, so K6 cannot discover a violation late.
//   2. 269 of the English bodies carry no sentence terminator at all — they are clauses. A
//      sentence-count check would be wrong here, so there isn't one.
//   3. The ko/ja length band is DERIVED FROM THIS CORPUS, not carried over. K4's `ja` compresses
//      much harder, and reusing its `[0.4, 1.6]` band here would reject a fifth of these rows.
//
// Hand-written, no paid translation API. No native speaker has read any of it.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const I18N = require('../classics-notes-i18n.generated.js');
const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');

const HANGUL = /[가-힣ᄀ-ᇿ㄰-ㆎ]/;
const SHIPPED = ['id', 'ru', 'de', 'zh', 'ja', 'es'];
const entries = Object.entries(I18N);
const CAP = 140;

// The two rows whose English is itself a foreign-language phrase quoted verbatim. Measured, not
// assumed: exactly two of the 1,670 `ja` values carry a run of four or more Latin words, and both
// are here. The list is capped below so it cannot grow into a way of retiring the check.
const LATIN_PHRASE_OK = new Set(['eurasian::pork vindaloo eurasian', 'thai::panang curry']);

const servedNotes = () => {
  const out = [];
  for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
    for (const [scope, dishes] of Object.entries(table)) {
      for (const [dish, entry] of Object.entries(dishes || {})) {
        if (entry && entry.note) out.push([`${scope}::${dish}`, entry.note]);
      }
    }
  }
  return out;
};

describe('the Korean column is complete for the classics dish notes', () => {
  it('covers every entry, and the table is the size the arc has been measuring', () => {
    expect(entries.length, '1,670 note rows — the figure this PR closed on').toBe(1670);
    const missing = entries.filter(([, v]) => !v.ko || !String(v.ko).trim()).map(([k]) => k);
    expect(missing, 'these notes have no Korean').toEqual([]);
  });

  it('and every dish the tables actually serve resolves to a Korean note', () => {
    // Stated over the SERVED side, not over this map. The fold in classics-notes.js copies
    // `Object.entries(loc)` rather than a hardcoded locale list, so this also proves `ko` will
    // reach readers the moment K6 flips the lists — no code change was needed for that, and a
    // future "tighten the fold to known locales" refactor would silently strip this PR back out.
    const served = servedNotes();
    const untranslated = served.filter(([, note]) => !note.ko || !String(note.ko).trim()).map(([k]) => k);
    expect(untranslated, 'these are served but have no Korean').toEqual([]);
    // Non-vacuity: a failed import cannot pass this by iterating nothing.
    expect(served.length).toBe(1670);
  });

  it('and the pairing holds in both directions, as counts rather than as "complete"', () => {
    // K4's lesson, stated as numbers here. Two rows were deleted there after checking only that
    // no slug served them, while their English still existed one file further back. Both sides
    // of this pairing are 1,670 with no orphans either way, and saying so in numbers is what
    // makes a future drift visible.
    const served = new Set(servedNotes().map(([k]) => k));
    const overlayOrphans = entries.filter(([k]) => !served.has(k)).map(([k]) => k);
    const noteOrphans = [...served].filter((k) => !I18N[k]);
    expect(overlayOrphans, 'translation rows serving no dish').toEqual([]);
    expect(noteOrphans, 'served notes with no translation row').toEqual([]);
    expect(served.size).toBe(1670);
  });

  it('and the columns that shipped before it are untouched', () => {
    // The `ko` lines were spliced in by script, one per entry. A splice that also rewrote a
    // neighbouring value would be invisible in a 1,670-entry diff, so the columns are counted.
    for (const l of SHIPPED) {
      const gaps = entries.filter(([, v]) => typeof v[l] !== 'string' || !v[l].trim()).map(([k]) => k);
      expect(gaps, `${l} lost values when ko was inserted`).toEqual([]);
    }
    // `en` and `fr` live in classics-notes.js, which this PR does not open. Asserted anyway: if
    // the Korean column had been put in the wrong file, this is where it would show.
    const served = servedNotes();
    expect(served.filter(([, n]) => typeof n.en === 'string' && n.en.trim()).length).toBe(1670);
    expect(served.filter(([, n]) => typeof n.fr === 'string' && n.fr.trim()).length).toBe(1670);
  });
});

describe('the 140-character cap, which K4 did not have to obey', () => {
  it('no Korean note exceeds the cap the curated notes obey', () => {
    // classics-city-plates-i18n.test.js already enforces this over en/fr/id/ru/de/zh/ja/es. It
    // cannot see `ko` until K6, and a content gap found at flip time is exactly what this arc
    // says gets fixed in the content PR rather than papered over in the flip.
    const over = entries
      .filter(([, v]) => typeof v.ko === 'string' && v.ko.length > CAP)
      .map(([k, v]) => `${k} (${v.ko.length})`);
    expect(over, 'these Korean notes are over the 140-character cap').toEqual([]);
    // Headroom asserted, not assumed. Measured after insertion: longest is 85.
    const longest = Math.max(...entries.map(([, v]) => v.ko.length));
    expect(longest).toBeLessThanOrEqual(100);
  });
});

describe('script integrity, including the direction Korean adds', () => {
  it('no Korean note carries Cyrillic, kana, Han, or a replacement character', () => {
    // The class that fires repeatedly here: text left behind from the locale being copied. Han
    // matters as much as kana — a Korean note holding 拌饭 is the zh value pasted across, and it
    // reads as plausible to anyone who does not know the script. Two drafts in this batch did
    // exactly that with 團圓 and 糕, and this is what caught them.
    const bad = [];
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string') continue;
      if (/[Ѐ-ӿ]/.test(v.ko)) bad.push(`${k}: Cyrillic`);
      if (/[぀-ヿ]/.test(v.ko)) bad.push(`${k}: kana`);
      if (/[一-鿿]/.test(v.ko)) bad.push(`${k}: Han`);
      if (/�/.test(v.ko)) bad.push(`${k}: U+FFFD`);
    }
    expect(bad).toEqual([]);
  });

  it('no Korean note is an English sentence left in place', () => {
    // Not "contains Latin" — 92 of the 1,670 `ja` values legitimately keep some, mostly proper
    // nouns and binomials. Four or more consecutive Latin words is the shape of an untranslated
    // clause, and exactly two rows quote a foreign phrase that long on purpose.
    const bad = []; let checked = 0;
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string') continue;
      checked++;
      if (!HANGUL.test(v.ko)) { bad.push(`${k}: no Hangul at all — ${JSON.stringify(v.ko)}`); continue; }
      if (LATIN_PHRASE_OK.has(k)) continue;
      const runs = v.ko.match(/[A-Za-z][A-Za-z'’]*(?:\s+[A-Za-z][A-Za-z'’]*){3,}/g);
      if (runs) bad.push(`${k}: English run ${JSON.stringify(runs[0])}`);
    }
    expect(bad).toEqual([]);
    expect(checked).toBe(1670);
    // The exemption list must stay small enough to read: a list that can grow is a guard that can
    // be retired one entry at a time.
    expect(LATIN_PHRASE_OK.size).toBeLessThanOrEqual(3);
  });

  it('and no Korean note is a fragment or a pasted paragraph', () => {
    // A band, not an equality, and MEASURED ON THIS CORPUS rather than carried from K4. These
    // English bodies run to a 140-character cap while K4's are shorter, and `ja` compresses them
    // far harder there than here: K4's ko/ja runs 0.46–1.44, this runs 0.53–1.87. Reusing K4's
    // [0.4, 1.6] band would have rejected roughly a fifth of these rows as defects.
    const out = [];
    let max = 0, min = Infinity;
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string' || typeof v.ja !== 'string' || !v.ja) continue;
      const ratio = v.ko.length / v.ja.length;
      max = Math.max(max, ratio); min = Math.min(min, ratio);
      if (ratio < 0.45 || ratio > 2.1) out.push(`${k}: ko/ja ${ratio.toFixed(2)} (ko ${v.ko.length}, ja ${v.ja.length})`);
    }
    expect(out).toEqual([]);
    // The band is only as good as its headroom, so the headroom is asserted rather than assumed.
    // Measured across all 1,670: min 0.53, median 1.15, p99 1.58, max 1.87.
    expect(max).toBeLessThanOrEqual(1.9);
    expect(min).toBeGreaterThanOrEqual(0.5);
    // The band's limit, and the reason the next test exists: doubling a SHORT note stays inside
    // it. `new-zealand::green-lipped mussel` repeated verbatim moves its ratio 0.81 -> 1.62 and
    // its length to 42 characters — inside the band, far under the cap, undetected. Length is
    // the wrong instrument for that defect, so it gets its own.
  });

  it('and no Korean note repeats a span of itself', () => {
    // A DIRECT measure of the defect the length band cannot see, rather than a second proxy for
    // it. Measured across all 1,670 rows: the longest substring any note repeats within itself
    // is NINE characters (`new-zealand::venison nz`), and the distribution falls away sharply —
    // 1,023 rows repeat at most 2 characters, only 3 rows exceed 6. A threshold of 16 sits far
    // above anything Korean prose does by accident and below anything a duplicated clause can do.
    const longestRepeat = (s) => {
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        for (let L = Math.min(40, s.length - i); L > best; L--) {
          if (s.indexOf(s.slice(i, i + L), i + 1) >= 0) { best = L; break; }
        }
      }
      return best;
    };
    const bad = []; let observed = 0;
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string') continue;
      const n = longestRepeat(v.ko);
      observed = Math.max(observed, n);
      if (n >= 16) bad.push(`${k}: repeats a ${n}-character span`);
    }
    expect(bad, 'these Korean notes repeat part of themselves').toEqual([]);
    // Headroom asserted, not assumed — if honest prose ever climbs toward the threshold, this
    // fails first and the number gets re-measured rather than the threshold quietly raised.
    expect(observed).toBeLessThanOrEqual(10);
  });
});

describe('K5 changes content only', () => {
  it('ko is still not an app locale, which is what makes staging safe', () => {
    expect(require('../i18n').SUPPORTED).not.toContain('ko');
    expect(require('../user-prefs').SUPPORTED).not.toContain('ko');
  });

  it('and a hand-authored body still wins over the overlay', () => {
    // The fold only fills a language a note does not already carry. If that inverted, the overlay
    // would start overwriting curated prose and every assertion above would still pass.
    const [key, row] = entries.find(([, v]) => v.ko);
    const [scope, dish] = key.split('::');
    const entry = (CLASSIC_NOTES[scope] || CUISINE_NOTES[scope] || {})[dish];
    expect(entry.note.ko).toBe(row.ko);
    expect(entry.note.en).not.toBe(row.ko);
  });
});
