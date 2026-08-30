// __tests__/review-and-station-locale.test.js — v0.62.852.
//
// Operator, on a Japanese card (v0.62.850):
//   "card's review text isn't taken from japanese version - still show english."
//   "the pin card's mrt station name isn't translated"
//
// ① THE REVIEW. The search path already called `enrichVenuesWithTranslatedReview`, and I
// first read that as "reviews are handled" — a correction worth writing down, because the
// call being present is not the same as the behaviour being present. That helper returns
// immediately unless the search carries a NATIONALITY cuisine slug, and even then it hunts
// for a review written in that nationality's language so it can print "( 🇮🇩 translated)".
// It is a different feature. Every other venue fell through to `reviews[0]` and kept
// whatever language Google returned — in Singapore, almost always English.
//
// ② THE STATION. v0.62.850 wired `stationName()` on the pin card, which was correct and
// insufficient: the government register covers zh and ms only, so a Japanese reader still
// saw "Jalan Besar". There IS no official Japanese station name to show. What helps is
// knowing how to SAY it — the same answer already given for venue names and streets.
//
// The cost note belongs in the test because the operator capped it: a review is the least
// dedupable thing in this arc. Names and streets collapse across venues; a review does
// not. So the no-op path — review already in the reader's language — must provably cost
// nothing, and that is asserted below rather than assumed.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('① the quoted review is localised on the main search path', () => {
  const src = () => read('cuisine-enrich.js');

  it('translates into csLang, keyed off the review’s own languageCode', () => {
    expect(src()).toMatch(/targetLang: ctx\.csLang,/);
    expect(src()).toMatch(/const srcLang = reviewLanguagePrimary\(/);
    expect(src()).toMatch(/if \(srcLang === ctx\.csLang\) return;/);
  });

  it('the ONLY condition is that the languages differ — the operator stated the rule', () => {
    // Operator: "translation only applies if the device language isn't the same."
    //
    // v0.62.852 shipped an extra clause, `ctx.csLang !== 'en'`, as a cost optimisation on
    // the assumption that reviews are English and only non-English readers need anything.
    // That assumption fails in one direction: a JAPANESE review shown to an ENGLISH reader
    // was left in Japanese, because the reader's own locale short-circuited the block
    // before the source language was ever consulted. Reviews are written by visitors, so a
    // foreign-language review on a Singapore venue is ordinary.
    //
    // This assertion previously pinned that extra clause — a test encoding an optimisation
    // as if it were the requirement, which is how the hole survived review.
    expect(src()).toMatch(/if \(ctx\.csLang\) \{/);
    expect(src(), "the reader's own locale must not short-circuit the whole block")
      .not.toMatch(/if \(ctx\.csLang && ctx\.csLang !== 'en'\)/);
  });

  it('and an English reader with a foreign review IS translated', () => {
    // The case the old gate silently dropped. Asserted on the gate's shape because the
    // decision is `srcLang === csLang`, with no locale privileged over any other.
    const s = src();
    const i = s.indexOf('if (ctx.csLang) {');
    const block = s.slice(i, i + 1800);
    expect(block).toMatch(/if \(srcLang === ctx\.csLang\) return;/);
    expect(block, 'a locale is still being special-cased inside the block')
      .not.toMatch(/csLang !== 'en'|csLang === 'en'/);
  });

  it('the common case still costs nothing, via the source language rather than the reader', () => {
    // English review + English reader is caught one line further in, by the review's own
    // Places languageCode — so removing the outer clause did not turn every English search
    // into a model call.
    expect(src()).toMatch(/const srcLang = reviewLanguagePrimary\(/);
    expect(src()).toMatch(/if \(srcLang === ctx\.csLang\) return;/);
  });

  it('does not re-translate what the nationality helper already handled', () => {
    // enrichVenuesWithTranslatedReview sets recentReviewTranslatedFlag and its own text;
    // translating that again would both cost twice and destroy the "( flag ) translated"
    // provenance the card shows.
    expect(src()).toMatch(/if \(!v \|\| !v\.recentReview \|\| v\.recentReviewTranslatedFlag\) return;/);
  });

  it('fails soft per venue — one bad translation must not lose the review', () => {
    const block = src().slice(src().indexOf('review localisation') - 3000, src().indexOf('review localisation') + 200);
    expect(block).toMatch(/catch \{ \/\* per-venue best effort/);
  });

  it('runs AFTER the finalise loop, so it localises the text that is actually shown', () => {
    // recentReview is still being assigned in that loop; translating earlier would
    // localise a value that then gets overwritten.
    const s = src();
    const finalise = s.indexOf('// Review finalise');
    const localise = s.indexOf('THE QUOTED REVIEW IN THE READER');
    expect(finalise).toBeGreaterThan(-1);
    expect(localise, 'localisation runs before the text is final').toBeGreaterThan(finalise);
  });

  it('uses the existing cached translator rather than a new call path', () => {
    // translate-review.js caches on placeId+index+source+target for 30 days. A fresh
    // Gemini call here would bypass that and re-buy every review on every search.
    expect(src()).toMatch(/const \{ translateReview \} = require\('\.\/translate-review'\)/);
  });
});

describe('② the pin card gives stations a "how to say it" guide', () => {
  const src = () => read('web/cuisine/src/v2/components/MapPanel.jsx');

  it('asks only for the stations the register does not cover', () => {
    // zh/ms are official and free for all 193 stations; only the locales the register
    // never covered should reach the network.
    expect(src()).toMatch(/\.filter\(\(n\) => n && stationName\(n, lang\) === n\)/);
    expect(src()).toMatch(/if \(need\.length\) \{/);
  });

  it('renders the guide beside the name, never instead of it', () => {
    expect(src()).toMatch(/const shown = stationName\(s\.name \|\| '', lang\)/);
    expect(src()).toMatch(/\$\{chips\} \$\{escapeHtml\(shown\)\}\$\{guideHtml\}/);
  });

  it('shows the guide only where the register had nothing, and never an echo', () => {
    expect(src()).toMatch(/const guide = \(shown === \(s\.name \|\| ''\) && sayStation\)/);
    expect(src()).toMatch(/\(guide && guide !== s\.name\)/);
  });

  it('re-checks the popup is still open after the await — it can be closed mid-flight', () => {
    // Two guards: one before the fetch, one after. Without the second, a user who taps
    // away mid-request gets the previous venue's card overwritten.
    const s = src();
    const i = s.indexOf('const need = (transit.stations');
    const after = s.slice(i, i + 1200);
    expect(after.match(/openInfoIdRef\.current !== placeId/g) || []).toHaveLength(1);
    expect(s.slice(0, i)).toMatch(/openInfoIdRef\.current !== placeId/);
  });
});

describe('the correction that produced ①, kept where it will be read', () => {
  it('the code says WHY the existing helper was not enough', () => {
    // The first diagnosis was "the search path never translates reviews". That was wrong —
    // cuisine-enrich.js:183 does call the helper. The real reason is its nationality gate.
    // Written into the source so the next reader does not repeat the same wrong turn.
    const s = read('cuisine-enrich.js');
    expect(s).toMatch(/returns\s*\n?\s*\/\/ immediately unless the SEARCH carries a nationality cuisine slug/);
  });

  it('and the nationality helper still runs first, unchanged', () => {
    const s = read('cuisine-enrich.js');
    const helper = s.indexOf('enrichVenuesWithTranslatedReview');
    const localise = s.indexOf('THE QUOTED REVIEW IN THE READER');
    expect(helper).toBeGreaterThan(-1);
    expect(helper, 'the nationality path was replaced rather than kept').toBeLessThan(localise);
  });
});
