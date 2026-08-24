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
    "Chengdu": { 2026: { "two-star": 2, "one-star": 11, "bib-gourmand": 27 } },
    "Guangzhou": { 2025: { "two-star": 3, "one-star": 17, "bib-gourmand": 44 } },
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
    "Paris": { 2025: { "three-star": 10 }, 2026: { "three-star": 9, "two-star": 17 } },
    "Lyon": { 2025: { "two-star": 3 }, 2026: { "two-star": 3 } },
  },
  HK: {
    "Hong Kong": { 2025: { "three-star": 7, "two-star": 11, "one-star": 1 }, 2026: { "three-star": 7, "two-star": 13, "one-star": 57, "bib-gourmand": 70 } },
  },
  JP: {
    "Kyoto": { 2025: { "three-star": 5, "two-star": 16, "one-star": 4 }, 2026: { "three-star": 6, "two-star": 19, "one-star": 73, "bib-gourmand": 47 } },
    "Osaka": { 2025: { "three-star": 3, "two-star": 11, "one-star": 1 }, 2026: { "three-star": 3, "two-star": 12, "one-star": 66, "bib-gourmand": 59 } },
    "Tokyo": { 2025: { "three-star": 12, "two-star": 26, "one-star": 3 }, 2026: { "three-star": 12, "two-star": 26, "one-star": 121, "bib-gourmand": 111 } },
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
  {
    cc: 'JP', city: 'Tokyo', year: 2026, tier: 'one-star', have: 121, published: 122,
    // CORRECTED v0.62.743. The first version of this note said "one Tokyo one-star venue is
    // missing", which implied a dropped row and was wrong. instruction/Japan.js — the source
    // of record — itself holds 121, and source and table are row-for-row identical (589 = 589,
    // now gated by __tests__/michelin-source-parity.test.js). Nothing was lost in migration.
    // CORRECTED AGAIN, v0.62.747 (O-208 resolved). The previous note called this "a policy
    // question, not a data error" and said closing it meant deciding which roster the volume
    // tracks. That was wrong: the volume ALREADY tracks both, in two layers, and has all along
    // — records (VENUES/awards/manifests/editionVenues) keep status:'closed'; display
    // (visitableVenues, used on every user-facing path in index.js) drops them. The policy was
    // implicit rather than absent, and is now asserted in __tests__/michelin-roster-policy.js.
    // With the policy settled, this IS a data gap after all — in the records layer.
    note: 'A genuine one-row gap in the RECORDS layer. The records layer is the ANNOUNCEMENT '
        + 'roster (it deliberately keeps closed venues — SEZANNE is closed, three-starred, and '
        + 'is exactly why Tokyo three-star reads 12 rather than 11). That roster says 122 '
        + 'one-stars; the data holds 121. The source hand-enters SEZANNE and Pierre Gagnaire as '
        + '"delisted, not in live index" precisely to preserve announced tiers, so the pattern '
        + 'is correct and simply was not applied to a third one-star that left the live index '
        + 'between 25-09-2025 and the 06-06-2026 verification. Fix: one curated row with '
        + "status: 'closed' and a 2026 one-star award. Which venue cannot be determined here — "
        + 'guide.michelin.com is JS-rendered and does not fetch.',
  },
  {
    cc: 'CN', city: 'Guangzhou', year: 2026, tier: '*', have: 0, published: 72,
    note: 'Stale in the SOURCE too, not just the table — instruction/China.js carries Guangzhou '
        + 'at 2025 only and has no Shenzhen at all, so this is curation pending, not migration '
        + 'drift. Guangzhou is STALE at the 2025 edition (3 two-star, 17 one-star, 44 Bib). The '
        + 'Guangzhou & Shenzhen 2026 edition landed 18 Aug 2026 — after this repo\'s last data '
        + 'update on 7 Aug — retaining 20 stars (3 two-star, 17 one-star) with Bib Gourmand '
        + 'rising to 52. Every other Chinese city in the table is already on 2026.',
  },
  {
    cc: 'FR', city: 'Paris', year: 2026, tier: 'two-star', have: 17, published: 20,
    note: 'There is NO instruction/France.js — France is the one country with no source of '
        + 'record at all, which is why the table is a scaffold. FR-michelin.js is a '
        + 'self-declared "scaffold v1: STAR TIERS ONLY" covering Paris and '
        + 'Lyon. Paris three-star is complete and correct at 9; two-star is three short of 20.',
  },
  {
    cc: 'FR', city: 'Paris', year: 2026, tier: 'one-star', have: 0, published: 98,
    note: 'Paris holds NO one-star rows at all against a published 98, and no Bib Gourmand. This '
        + 'is the largest gap in the volume — France 2026 is 31/84/553 = 668 starred nationally, '
        + 'of which the repo carries 29 rows. Closing it is a curation job, not a scrape: '
        + 'guide.michelin.com is JS-rendered and will not fetch, and inventing 98 Paris addresses '
        + 'is precisely what the country tables forbid.',
  },
  {
    cc: 'CN', city: 'Shenzhen', year: 2026, tier: '*', have: 0, published: 28,
    note: 'Absent from instruction/China.js as well as from the table. Shenzhen is ABSENT. It '
        + 'debuted in the MICHELIN Guide on 18 Aug 2026 with 2 two-star, '
        + '5 one-star and 21 Bib Gourmand. It is a new city for the dataset AND for cities.js.',
  },
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
