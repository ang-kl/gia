'use strict';

// michelin-city-manifest.js — v0.62.742
//
// PER-CITY award counts, and the published MICHELIN figures they are measured
// against. Two tables with two different jobs, deliberately kept apart:
//
//   CITY_MANIFEST     what the repo's datasets CURRENTLY hold. Asserted at
//                     load, so a city silently gaining or losing a row is a
//                     hard error rather than a number nobody re-reads.
//
//   PUBLISHED_2026    what MICHELIN actually announced, with the source and
//                     the announcement date. NOT asserted against the data —
//                     because in three places they legitimately DISAGREE, and
//                     an assertion would just refuse to boot.
//
// WHY THIS FILE EXISTS
// --------------------
// COUNTRY_MANIFEST asserts national totals, and a national total hides
// per-city drift completely. Japan 2026 passes its country manifest at
// 21/61/278/228 while Tokyo is one one-star short of the published 122 —
// the shortfall is invisible at the national level because nothing at that
// level knows what Tokyo alone should be. Same shape for China: the country
// total looks healthy while Guangzhou sits on the 2025 edition and Shenzhen,
// which MICHELIN added on 18 Aug 2026, is absent entirely.
//
// The gap between the two tables is therefore the POINT of the file, not a
// defect in it. KNOWN_DELTAS below names each disagreement; the test asserts
// that the computed set of disagreements is EXACTLY that list, so a new one
// cannot appear unnoticed and a fixed one cannot linger as a stale excuse.

// ── what the repo holds (asserted) ───────────────────────────────────
const CITY_MANIFEST = Object.freeze({
  CN: {
    "Beijing": { 2026: { "three-star": 2, "two-star": 6, "one-star": 24, "bib-gourmand": 26 } },
    "Shanghai": { 2026: { "three-star": 1, "two-star": 12, "one-star": 38, "bib-gourmand": 34 } },
    "Shenzhen": { 2026: { "two-star": 2, "one-star": 5, "bib-gourmand": 21 } },
    "Chengdu": { 2026: { "two-star": 2, "one-star": 11, "bib-gourmand": 27 } },
    "Guangzhou": { 2025: { "two-star": 3, "one-star": 17, "bib-gourmand": 44 }, 2026: { "two-star": 3, "one-star": 17, "bib-gourmand": 52 } },
    "Hangzhou": { 2026: { "two-star": 2, "one-star": 11, "bib-gourmand": 34 } },
    "Fuzhou": { 2026: { "one-star": 3, "bib-gourmand": 17 } },
    "Nanjing": { 2026: { "one-star": 4, "bib-gourmand": 21 } },
    "Quanzhou": { 2026: { "one-star": 1, "bib-gourmand": 13 } },
    "Suzhou": { 2026: { "one-star": 3, "bib-gourmand": 18 } },
    "Taizhou": { 2026: { "one-star": 4, "bib-gourmand": 19 } },
    "Xiamen": { 2026: { "one-star": 3, "bib-gourmand": 31 } },
    "Yangzhou": { 2026: { "one-star": 2, "bib-gourmand": 9 } },
    "Changzhou": { 2026: { "bib-gourmand": 9 } },
    "Ningde": { 2026: { "bib-gourmand": 5 } },
    "Wenzhou": { 2026: { "bib-gourmand": 19 } },
  },
  FR: {
    "Paris": { 2025: { "three-star": 10 }, 2026: { "three-star": 9, "two-star": 20, "one-star": 98 } },
    "Lyon": { 2025: { "two-star": 3 }, 2026: { "two-star": 3 } },
  },
  HK: {
    "Hong Kong": { 2025: { "three-star": 7, "two-star": 11, "one-star": 1 }, 2026: { "three-star": 7, "two-star": 13, "one-star": 57, "bib-gourmand": 70 } },
  },
  JP: {
    "Kyoto": { 2025: { "three-star": 5, "two-star": 16, "one-star": 4 }, 2026: { "three-star": 6, "two-star": 19, "one-star": 73, "bib-gourmand": 47 } },
    "Osaka": { 2025: { "three-star": 3, "two-star": 11, "one-star": 1 }, 2026: { "three-star": 3, "two-star": 12, "one-star": 66, "bib-gourmand": 59 } },
    "Tokyo": { 2025: { "three-star": 12, "two-star": 26, "one-star": 3 }, 2026: { "three-star": 12, "two-star": 26, "one-star": 122, "bib-gourmand": 111 } },
    "Nara": { 2025: { "two-star": 4 }, 2026: { "two-star": 4, "one-star": 18, "bib-gourmand": 11 } },
  },
  KR: {
    "Seoul": { 2025: { "three-star": 1, "two-star": 8, "one-star": 1 }, 2026: { "three-star": 1, "two-star": 10, "one-star": 31, "bib-gourmand": 51 } },
    "Busan": { 2026: { "one-star": 4, "bib-gourmand": 20 } },
  },
  MO: {
    "Macau": { 2025: { "three-star": 2, "two-star": 6 }, 2026: { "three-star": 2, "two-star": 6, "one-star": 13, "bib-gourmand": 13 } },
  },
  MY: {
    "Kuala Lumpur": { 2025: { "two-star": 1, "one-star": 4, "bib-gourmand": 24 }, 2026: { "two-star": 1, "one-star": 6, "bib-gourmand": 25 } },
    "George Town": { 2025: { "one-star": 2, "bib-gourmand": 32 }, 2026: { "one-star": 2, "bib-gourmand": 33 } },
  },
  PH: {
    "Makati - Metro Manila": { 2026: { "two-star": 1, "one-star": 5, "bib-gourmand": 9 } },
    "Cavite": { 2026: { "one-star": 1 } },
    "Parañaque - Metro Manila": { 2026: { "one-star": 1, "bib-gourmand": 1 } },
    "Taguig - Metro Manila": { 2026: { "one-star": 1, "bib-gourmand": 5 } },
    "Cebu": { 2026: { "bib-gourmand": 6 } },
    "Manila - Metro Manila": { 2026: { "bib-gourmand": 1 } },
    "Quezon - Metro Manila": { 2026: { "bib-gourmand": 3 } },
  },
  TH: {
    "Bangkok": { 2025: { "three-star": 1, "two-star": 7, "one-star": 24, "bib-gourmand": 29 }, 2026: { "three-star": 2, "two-star": 8, "one-star": 29, "bib-gourmand": 32 } },
    "Nonthaburi": { 2025: { "one-star": 2, "bib-gourmand": 4 }, 2026: { "one-star": 2, "bib-gourmand": 5 } },
    "Phang-Nga": { 2025: { "one-star": 1, "bib-gourmand": 5 }, 2026: { "one-star": 1, "bib-gourmand": 6 } },
    "Phuket": { 2025: { "one-star": 1, "bib-gourmand": 19 }, 2026: { "one-star": 1, "bib-gourmand": 19 } },
    "Chiang Mai": { 2025: { "bib-gourmand": 15 }, 2026: { "bib-gourmand": 18 } },
    "Chon Buri": { 2025: { "bib-gourmand": 5 }, 2026: { "bib-gourmand": 5 } },
    "Khon Kaen": { 2025: { "bib-gourmand": 11 }, 2026: { "bib-gourmand": 11 } },
    "Ko Samui": { 2025: { "bib-gourmand": 2 }, 2026: { "bib-gourmand": 2 } },
    "Nakhon Pathom": { 2025: { "bib-gourmand": 3 }, 2026: { "bib-gourmand": 3 } },
    "Nakhon Ratchasima": { 2025: { "bib-gourmand": 7 }, 2026: { "bib-gourmand": 8 } },
    "Pathum Thani": { 2025: { "bib-gourmand": 3 }, 2026: { "bib-gourmand": 3 } },
    "Phra Nakhon Si Ayutthaya": { 2025: { "bib-gourmand": 7 }, 2026: { "bib-gourmand": 8 } },
    "Samut Sakhon": { 2025: { "bib-gourmand": 1 }, 2026: { "bib-gourmand": 1 } },
    "Surat Thani": { 2025: { "bib-gourmand": 5 }, 2026: { "bib-gourmand": 7 } },
    "Ubon Ratchathani": { 2025: { "bib-gourmand": 3 }, 2026: { "bib-gourmand": 3 } },
    "Udon Thani": { 2025: { "bib-gourmand": 5 }, 2026: { "bib-gourmand": 6 } },
  },
  TW: {
    "Taichung": { 2025: { "three-star": 1, "one-star": 5, "bib-gourmand": 22 }, 2026: { "three-star": 1, "one-star": 5, "bib-gourmand": 23 } },
    "Taipei": { 2025: { "three-star": 2, "two-star": 7, "one-star": 34, "bib-gourmand": 37 }, 2026: { "three-star": 2, "two-star": 9, "one-star": 36, "bib-gourmand": 37 } },
    "Kaohsiung": { 2025: { "one-star": 4, "bib-gourmand": 24 }, 2026: { "one-star": 6, "bib-gourmand": 21 } },
    "Hsinchu City": { 2025: { "bib-gourmand": 7 }, 2026: { "bib-gourmand": 7 } },
    "Hsinchu County": { 2025: { "bib-gourmand": 8 }, 2026: { "one-star": 1, "bib-gourmand": 10 } },
    "New Taipei": { 2025: { "bib-gourmand": 15 }, 2026: { "bib-gourmand": 18 } },
    "Tainan": { 2025: { "bib-gourmand": 30 }, 2026: { "one-star": 1, "bib-gourmand": 30 } },
  },
  VN: {
    "Da Nang": { 2025: { "one-star": 1 }, 2026: { "one-star": 1, "bib-gourmand": 23 } },
    "Hanoi": { 2025: { "one-star": 3 }, 2026: { "one-star": 4, "bib-gourmand": 23 } },
    "Ho Chi Minh City": { 2025: { "one-star": 5 }, 2026: { "one-star": 6, "bib-gourmand": 26 } },
  },
});

// ── what MICHELIN published (reference, not asserted) ────────────────
// Only cities whose official per-city figures were verified are listed. A
// city absent here is NOT a claim that the repo is right — it is a claim that
// nobody checked, which is a different and more honest thing to record.
const PUBLISHED_2026 = Object.freeze({
  JP: {
    Tokyo:  { 'three-star': 12, 'two-star': 26, 'one-star': 122,
              source: 'MICHELIN Guide Tokyo 2026, announced 25 Sep 2025; corroborated by The Japan Times ("160 starred")' },
    Kyoto:  { 'three-star': 6, 'two-star': 19, 'one-star': 73, 'bib-gourmand': 47,
              source: 'MICHELIN Guide Kyoto Osaka 2026' },
    Osaka:  { 'three-star': 3, 'two-star': 12, 'one-star': 66, 'bib-gourmand': 59,
              source: 'MICHELIN Guide Kyoto Osaka 2026' },
    Nara:   { 'bib-gourmand': 11,
              source: 'MICHELIN Guide Nara 2026 (78 restaurants incl. Selected)' },
  },
  FR: {
    Paris: { 'three-star': 9, 'two-star': 20, 'one-star': 98,
             source: 'MICHELIN Guide France & Monaco 2026, revealed 16 Mar 2026 in Monaco — 127 starred in Paris' },
  },
  CN: {
    Guangzhou: { 'two-star': 3, 'one-star': 17,
                 source: 'MICHELIN Guide Guangzhou & Shenzhen 2026, announced 18 Aug 2026 — Guangzhou retained 20 stars' },
    Shenzhen:  { 'two-star': 2, 'one-star': 5, 'bib-gourmand': 21,
                 source: 'MICHELIN Guide Guangzhou & Shenzhen 2026, announced 18 Aug 2026 — Shenzhen debut, 7 stars' },
  },
});

// ── where the two disagree, and why ──────────────────────────────────
// Each entry is a DEBT, not an excuse. Filling it needs curated venue rows
// (name, address, cuisine) from the operator's `instruction/` source of
// record — the country tables carry "DO NOT auto-generate or AI-fabricate",
// so these are reported here rather than invented into the datasets.
const KNOWN_DELTAS = Object.freeze([
  // CLOSED v0.62.771 — and this list is now EMPTY. Every curated country
  // reconciles against every published 2026 figure it has one for.
  //
  // THE NOTE THIS REPLACES PRESCRIBED THE WRONG FIX, which matters more than
  // the row itself. It reasoned by analogy from SEZANNE and Pierre Gagnaire —
  // both hand-entered as "delisted, not in live index" — and concluded: "Fix:
  // one curated row with status: 'closed' and a 2026 one-star award."
  //
  // The missing venue is 氣分 (Kibun), Nishiazabu, Minato — and it is OPEN.
  // It has a live MICHELIN Guide page with online booking. It was never a
  // delisting; it was an omission from the curation pass.
  //
  // Had the prescribed fix been applied, the count would have reconciled at
  // 122 and `visitableVenues()` — which drops status:'closed' and backs every
  // user-facing path — would have kept hiding an operating one-star. The gate
  // would have gone green while the product got quietly worse. A note that
  // names a fix is not the same as a note that diagnosed the cause, and this
  // one had only ever seen the symptom.
  //
  // Found the same way Shenzhen and Paris were: search in the local language.
  // A Japanese aggregator enumerates all 122 by ward; its ward subtotals sum
  // to 122 (9+31+49+9+2+7+1+14), and diffing it against the repo's 121 left
  // exactly one name once romanisation variants were matched up — BEIGE Alain
  // Ducasse / Beige Alain Ducasse Tokyo, mærge / marge, TEN-MASA / Tenma, and
  // sixteen others. Kibun matched nothing.
  // CLOSED v0.62.757 — CN/Guangzhou reconciles at 52/52, so it is no longer a
  // delta and is not listed as one. Kept as a comment because the way it closed
  // is the thing a future reader needs, and a cleared entry leaves no trace.
  //
  // The 44 retained rows moved to a 2026 Bib on the operator's instruction
  // ("apply the Guangzhou Bib"). The evidence was, and remains, INFERENCE: 44
  // existing + 8 named-new, zero overlap, 44 + 8 = 52 exactly. A simultaneous
  // drop-and-add of equal size produces the identical total, and retention is
  // nowhere STATED for Bib the way it is for the stars. It is applied because
  // the operator ruled on it, not because the inference hardened.
  //
  // The 8 new rows were then added on the operator's instruction to "lower the
  // provenance standard temporary". They carry the DEBT below.
  //
  // ── CURATION DEBT: 7 address-less rows ──────────────────────────────────
  // Before this change, 0 of 1,977 venues had an empty address. Now 7 do, all
  // of them Guangzhou 2026 Bib Gourmand. Only Mei Lu Xiao Chu's address was
  // findable, and from a search summary rather than a curated source —
  // guide.michelin.com is JS-rendered and does not fetch, restaurant pages
  // included, so the constraint is availability, not the bar. None carries a
  // nameZh either, for the same reason.
  //
  // The invariant is not abandoned, it is NARROWED: it now reads "no venue has
  // an empty address EXCEPT these 7", asserted in michelin-city-manifest.test.js
  // so that an eighth address-less row anywhere in the dataset fails the suite.
  // Fill them and the assertion tightens back on its own.
  // CLOSED v0.62.770 — FR/Paris reconciles at 9 / 20 / 98 = 127, the published
  // total, and both entries (two-star 17 of 20, one-star 0 of 98) are gone.
  //
  // The v1 scaffold deferred these because "guide.michelin.com list pages
  // return HTTP 403 to server-side fetch". That is STILL TRUE; what changed is
  // that the search was run in French. A French outlet (Affiches Parisiennes /
  // mesinfos.fr) carries the enumerated 127, and it holds up:
  //   - it totals 9 + 20 + 98, matching the published figures exactly;
  //   - its 3-star and 2-star sections agree row-for-row with what was already
  //     curated here — the three "missing" two-stars were Le Meurice Alain
  //     Ducasse, Sushi Yoshinaga and Table, and nothing already present was
  //     contradicted;
  //   - its per-arrondissement subtotals sum to 98 independently of its own
  //     running numbering, which is a self-check the source did not intend;
  //   - an INDEPENDENT outlet's list of 2026's eleven new Paris one-stars is
  //     fully contained in it (9 of 11 named there, all present).
  //
  // WHAT THESE ROWS DO NOT HAVE, stated because the count reconciling can hide
  // it: no `address` and no `cuisine`. The source gives neither. The
  // arrondissement it does give is recorded as `postal` (750NN), a derivation
  // rather than a guess. Three obvious source typos were corrected and are
  // named in the journal (Augsute, II Carpaccio, Constrate).
  //
  // FR remains OUTSIDE the source-of-record parity gate, deliberately. There
  // is no instruction/France.js, and manufacturing one from the same input
  // used to build the table would make the gate assert nothing — it exists to
  // catch drift between a hand-curated source and its migration, not to
  // compare a file with its own copy.
  // CLOSED v0.62.768 — CN/Shenzhen reconciles at 28/28 (2 two-star, 5 one-star,
  // 21 Bib) and is no longer a delta. Kept as a comment because how it closed
  // is what a future reader needs.
  //
  // The stars came from the official joint press release. The Bib did NOT: the
  // release names six of the twenty-one individually and aggregates the rest by
  // cuisine style, and guide.michelin.com is JS-rendered and does not fetch.
  // The remaining fifteen come from a SINGLE named outlet's enumerated list
  // (Sing Tao Headline, 深圳米芝蓮2026「平價名單」, 21 entries by district).
  //
  // Why that was accepted, stated so it can be re-judged rather than trusted:
  //   - all SIX officially-named venues appear in it, unchanged;
  //   - its district spread (Futian, Nanshan, Luohu, Longhua, Yantian) and its
  //     cuisine mix match what the official release describes;
  //   - it totals exactly 21, the published figure;
  //   - one entry (卖鱼佬砂锅粥) was independently corroborated in a separate
  //     search result as a 2026 Shenzhen Bib.
  //
  // ONE THING DOES NOT RECONCILE, and is recorded rather than smoothed over:
  // the official release lists **Indonesian** among the Bib cuisine styles, and
  // no venue in the enumerated list reads as Indonesian. Either the release is
  // describing the whole selection rather than the Bib tier, or the list has a
  // misattributed cuisine. It does not change the count — 21 names for 21
  // slots — but it means one cuisine label somewhere is probably wrong.
  //
  // A second discrepancy, smaller: two sources disagree on one Chinese name —
  // 新湖村促肉 (guokr) vs 新湖村腊肉 (Sing Tao). That row's `nameZh` is
  // deliberately LEFT UNSET rather than guessed; its English name and id are
  // from the official release and are unaffected.
]);

// Assert the repo matches CITY_MANIFEST. Same fail-closed contract as
// assertManifest: throw naming the country, city, year and tier.
function assertCityManifest(cc, venues, source = 'unknown', manifestOverride) {
  const manifest = manifestOverride || CITY_MANIFEST[cc];
  if (!manifest || !venues.length) return;
  const seen = {};
  for (const v of venues) {
    for (const a of v.awards) {
      seen[v.city] = seen[v.city] || {};
      seen[v.city][a.year] = seen[v.city][a.year] || {};
      seen[v.city][a.year][a.category] = (seen[v.city][a.year][a.category] || 0) + 1;
    }
  }
  for (const [city, years] of Object.entries(manifest)) {
    for (const [yStr, tiers] of Object.entries(years)) {
      for (const [tier, want] of Object.entries(tiers)) {
        const got = ((seen[city] || {})[yStr] || {})[tier] || 0;
        if (got !== want) {
          throw new Error(
            `[michelin-city-manifest] ${source}: ${cc} ${city} ${yStr} "${tier}" — expected ${want}, got ${got}`
          );
        }
      }
    }
  }
  // A city present in the data but absent from the manifest is drift too:
  // it is how Shenzhen would arrive unnoticed once someone adds it.
  for (const city of Object.keys(seen)) {
    if (!manifest[city]) {
      throw new Error(
        `[michelin-city-manifest] ${source}: ${cc} has venues in "${city}" with no manifest entry — add it`
      );
    }
  }
}

module.exports = { CITY_MANIFEST, PUBLISHED_2026, KNOWN_DELTAS, assertCityManifest };
