// taste-graph.js — v0.62.901
//
// THE 234 HAND-CURATED CUISINE EDGES, MADE USABLE. Until now they were dead code.
//
// `nation-overlay.js` carries `neighboringCuisines: Array<{slug, reason}>` on all 66 cuisines —
// 234 edges, each with a written justification ("Isaan (NE Thai) cuisine is essentially Lao").
// Nothing consumed them. `index.js` had zero references, and the "& Nearby Flavours" strip that
// sounds like it uses the graph does not: it is a label and an accent colour computed from the
// reader's own picked slugs. This module is the first consumer.
//
// THREE DEFECTS IN THE DATA, HANDLED HERE RATHER THAN DOWNSTREAM. All three are measured, and the
// measurements are pinned in __tests__/taste-graph.test.js so a curation change surfaces.
//
//   1. IT IS ONLY 65% SYMMETRIC. 134 of 206 in-overlay edges are reciprocated. That is an
//      authoring artefact — nobody hand-writes 234 edges twice — not a claim that culinary
//      adjacency runs one way. `japanese → chinese` exists and `chinese → japanese` does not,
//      and no one believes the second is false. So the graph is symmetrised by union at load:
//      234 directed → 139 undirected, mean degree 4.21.
//
//   2. 28 EDGES POINT AT SLUGS WITH NO OVERLAY ENTRY — 19 distinct: laotian, cambodian,
//      mediterranean, afghani, armenian, azerbaijani, bangladeshi, belgian, caribbean, czech,
//      finnish, guatemalan, hungarian, irish, kazakh, mongolian, mozambican, tibetan, uyghur.
//      Walking into one yields `undefined`. They are filtered out, and DANGLING_SLUGS is exported
//      and pinned so that adding a `laotian` overlay entry FAILS the test — which is the reminder
//      to remove it from the list. Do not invent overlay entries for them.
//
//   3. EIGHT SLUGS HAD IN-DEGREE ZERO and could never be reached by any walk: hakka,
//      scandinavian, uzbek, northeastern, northwestern, goan, dessert, fusion. ⚠ SYMMETRISING
//      FIXES ALL EIGHT, measured — after the union there are ZERO isolated slugs across all 66.
//      No hand-authored edges were needed, and none should be added.
//
// AND ONE DEFECT THAT SYMMETRISING CREATES: HUBS. `singaporean` ends at degree 16 against a mean
// of 4.21, `chinese` 14, `cantonese` 11. An undamped walk from anywhere lands on Singaporean,
// which would make the whole feature a Singaporean-dispenser in a country where that is the
// default anyway. Proximity is divided by `sqrt(degree/meanDegree)`, and the test that matters is
// that from seed `teochew`, `hokkien` (a genuine sibling) outranks `singaporean` at one hop.
//
// Pure and synchronous. The graph is built once at require time — 66 nodes is nothing — so
// callers can treat `proximity()` as a lookup.

'use strict';

const { NATION_OVERLAY, getOverlayedSlugs } = require('./nation-overlay');

// Vault CATEGORIES that happen to have overlay entries, not nations. A walk that surfaces
// "Sweets & Fusion" as a cuisine suggestion is answering a different question than the one asked,
// so they are excluded explicitly with the reason attached rather than left to fall out by luck.
const EXCLUDED_FROM_WALK = Object.freeze(['dessert', 'fusion', 'fruits', 'durian', 'durian-pastry']);

const MAX_HOPS = 2;          // 3 hops reaches most of the graph and carries no signal
const HOP_DECAY = 0.6;       // keeps a 1-hop neighbour meaningfully above a 2-hop one

const _overlaySlugs = new Set(getOverlayedSlugs());
const _dangling = new Set();
const ADJ = new Map();
for (const s of _overlaySlugs) ADJ.set(s, new Set());

for (const [slug, entry] of Object.entries(NATION_OVERLAY)) {
  if (!ADJ.has(slug)) continue;
  for (const n of (entry && entry.neighboringCuisines) || []) {
    const t = n && n.slug;
    if (!t) continue;
    if (!_overlaySlugs.has(t)) { _dangling.add(t); continue; }
    // Union, both directions — see defect 1.
    ADJ.get(slug).add(t);
    ADJ.get(t).add(slug);
  }
}

const DANGLING_SLUGS = Object.freeze([..._dangling].sort());

let _edges = 0;
for (const set of ADJ.values()) _edges += set.size;
const UNDIRECTED_EDGES = _edges / 2;
const MEAN_DEGREE = _edges / ADJ.size;

function degreeOf(slug) {
  const set = ADJ.get(slug);
  return set ? set.size : 0;
}

/** Every slug within `hops` of `seed`, as slug → hop count. Excludes the seed itself. */
function neighboursWithin(seed, hops = MAX_HOPS) {
  const out = new Map();
  if (!ADJ.has(seed)) return out;
  let frontier = [seed];
  const seen = new Set([seed]);
  for (let h = 1; h <= Math.max(1, Math.min(hops, MAX_HOPS)); h++) {
    const next = [];
    for (const node of frontier) {
      for (const t of ADJ.get(node) || []) {
        if (seen.has(t)) continue;
        seen.add(t);
        out.set(t, h);
        next.push(t);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return out;
}

/**
 * How close `slug` is to `seed`, in 0..1. `seed` itself is 1.
 *
 * Hub-damped: a slug everything links to is not therefore what you want. Without the divisor,
 * `singaporean` (degree 16 against a mean of 4.21) wins from every seed in the graph.
 */
function proximity(seed, slug) {
  if (!seed || !slug) return 0;
  if (seed === slug) return 1;
  const hops = neighboursWithin(seed, MAX_HOPS).get(slug);
  if (!hops) return 0;
  const raw = Math.pow(HOP_DECAY, hops);
  const damp = Math.sqrt(Math.max(1, degreeOf(slug)) / MEAN_DEGREE);
  return raw / Math.max(1, damp);
}

/** The slugs a suggestion may name: overlay entries, minus the vault categories. */
function walkableSlugs() {
  return [...ADJ.keys()].filter((s) => !EXCLUDED_FROM_WALK.includes(s));
}

module.exports = {
  ADJ,
  DANGLING_SLUGS,
  EXCLUDED_FROM_WALK,
  UNDIRECTED_EDGES,
  MEAN_DEGREE,
  MAX_HOPS,
  HOP_DECAY,
  degreeOf,
  neighboursWithin,
  proximity,
  walkableSlugs,
};
