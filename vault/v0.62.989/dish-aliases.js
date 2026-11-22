// dish-aliases.js — v0.62.94
//
// Colloquial / dialect dish nicknames → canonical Google-Places search terms.
//
// Why this exists: the NL free-text path ("Tell me…", /api/cuisine/nl-query)
// sends user text largely verbatim to Places. Dialect nicknames collapse to
// the WRONG dish because Places matches the closest *name*, not the meaning.
// Worked example (operator, 15 Jun 2026): "dai lok mee" returns ~39 correct
// KL Hokkien Mee spots, but "dai lok" on its own returns only ~9 — and they
// are lok-lok 淥淥 (steamboat skewers) and Tai Ka Lok 大家乐 (seafood), not the
// 大碌麵 noodle dish. The "mee" token was doing all the disambiguation. This
// table teaches the pipeline the nickname so we can prepend the canonical
// dish term(s) before the query reaches Places.
//
// Add entries sparingly and keep `match` patterns tight (word-boundaried) so a
// nickname never fires on an unrelated substring. `expand` terms are tried in
// order and prepended ahead of the verbatim/inferred queries.
//
// ── Places API vs the consumer Google Maps app (on the record) ────────────────
// This alias layer raises recall for nickname queries, but it cannot close the
// gap with the consumer Google Maps app, because we sit on a *different door* to
// Google's place database:
//   • We query the Places API (searchText), which matches mostly on NAME, TYPE
//     and ADDRESS. If a dish term is not in those indexed fields, the API can't
//     connect the dish to the venue — no query-building trick reaches it.
//   • The consumer Maps app ranks over a much richer corpus we do NOT receive:
//     review text, menu items, popular-dish tags, photo captions, Q&A. A venue
//     whose dish is mentioned only in a review can surface there but not here.
// Worked example: Ying Xian 赢鲜海鲜大排档 (IOI City Mall) is listed as a generic
// seafood/Canton restaurant with no dish text, so it appears under NONE of the
// dai-lok-mee seeds — only its own name. That is a data-surface limit, not a bug.
// Product decision (operator, 15 Jun 2026): do NOT curate one-off niche venues —
// the app's value is enhanced QUALITY of results, not coverage parity with Maps;
// the durable lever is this dish-intelligence layer (helps every query), not a
// per-venue patch (doesn't scale, rots). Any future curation should be a general
// "known-for" dish→venue dataset, and only if such cases accumulate.
'use strict';

const DISH_ALIASES = [
  {
    // Cantonese "big strand of noodle" — the KL Hokkien Mee nickname.
    //
    // The expansion is a deliberate UNION, not a single canonical term. Live
    // probing (operator, 15 Jun 2026) showed Dai Lok Mee is sold in two kinds
    // of place that Places indexes under different text:
    //   • dedicated noodle shops  → reachable via "KL Hokkien mee" / "福建面"
    //   • tai-chow / Cantonese seafood (e.g. Ipoh Tuck Kee) → reachable ONLY
    //     via "dai lok mee" (their listings don't say "Hokkien mee").
    // Keeping both kinds of seed surfaces both. (Some dai-pai-dong such as
    // Ying Xian 赢鲜海鲜大排档 carry no dish text at all and are unreachable via
    // any dish query — see the Places-API note below — those need a curated
    // venue entry, not an alias.)
    match: [/\bdai\s*lok\b/i, /大碌/],
    expand: ['KL Hokkien mee', 'dai lok mee', '福建面', '大碌麵'],
    label: 'dai lok → KL Hokkien mee (+ dai lok mee for tai-chow)',
  },
];

/**
 * Return the canonical expansion for a colloquial dish nickname, or null.
 * @param {string} text raw user free-text
 * @returns {{terms: string[], label: string} | null}
 */
function expandDishAliases(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  for (const a of DISH_ALIASES) {
    if (a.match.some((re) => re.test(text))) {
      return { terms: a.expand.slice(), label: a.label };
    }
  }
  return null;
}

module.exports = { expandDishAliases, DISH_ALIASES };
