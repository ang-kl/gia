// discovery-dish.js — v0.62.29
//
// Foodie discovery: curated national/iconic-dish "Try"-line fill for the
// Cuisine TMA recommendation path. Operator: *"as a Chinese, I would be
// interested in European new dishes or African national dishes; also these
// highly-rated restaurants will have their signature."* And, crucially:
// *"how would you know that eatery has the national dish?"* — so the fill is
// EVIDENCE-VERIFIED: a curated dish name is only claimed when the venue's OWN
// text (its Places reviews / editorial summary) mentions it. No mention → no
// claim. Reviews-first: a review-mined dish (cuisine-enrich extractDishes) is
// never overwritten.
//
// Reads the existing curated tables — adds NO data of its own:
//   • NATION_OVERLAY (nation-overlay.js)  — iconicDishes per cuisine slug
//   • COOKING_METHODS (cooking-methods.js) — famous method terms (secondary)
//
// NOT used by /s (operator: "don't change the /s command") — this module is
// consumed only by the /api/cuisine/search post-enrich pass in index.js.

'use strict';

const { getNationOverlay } = require('./nation-overlay');
const { getMethodsForCuisine } = require('./cooking-methods');

// ── helpers ──────────────────────────────────────────────────────────────────

function stripDiacritics(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
// Ligatures don't decompose under NFD (œ ≠ oe) — fold the common Latin ones
// so a review's "bœuf bourguignon" matches the curated "boeuf bourguignon".
function foldLigatures(s) {
  return String(s || '')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l');
}
function norm(s) {
  return stripDiacritics(foldLigatures(String(s || '').toLowerCase())).trim();
}

// Places v1 wraps review text in { text: { text, languageCode } } — same
// accessor as cuisine-enrich.reviewText.
function _reviewText(r) {
  if (r && typeof r.text === 'object' && r.text) {
    return typeof r.text.text === 'string' ? r.text.text : '';
  }
  return typeof r?.text === 'string' ? r.text : '';
}

// The venue's own evidence text: all review bodies + the Google editorial /
// generative summary overview. Lower-cased + diacritic-stripped once.
function venueEvidenceText(venue) {
  const parts = [];
  const reviews = Array.isArray(venue?.reviews) ? venue.reviews : [];
  for (const r of reviews) {
    const t = _reviewText(r);
    if (t) parts.push(t);
  }
  const gs = venue?.googleSummary;
  if (gs) {
    if (typeof gs === 'string') parts.push(gs);
    else if (typeof gs.overview === 'string') parts.push(gs.overview);
  }
  if (typeof venue?.editorialSummary === 'string') parts.push(venue.editorialSummary);
  return norm(parts.join(' \n '));
}

// ── curated lookups ──────────────────────────────────────────────────────────

// Unambiguous national/iconic dishes for a cuisine slug: FOOD-kind entries
// with NO sharedWith claimants (shared/ambiguous dishes stay out of the Try
// line — they belong to the /s disambiguation flow, not a one-line claim).
function iconicDishesFor(slug, { max = 8 } = {}) {
  const overlay = getNationOverlay(slug);
  const list = Array.isArray(overlay?.iconicDishes) ? overlay.iconicDishes : [];
  const out = [];
  for (const d of list) {
    if (!d || typeof d.name !== 'string' || !d.name.trim()) continue;
    if (d.kind !== 'food') continue;
    if (Array.isArray(d.sharedWith) && d.sharedWith.length) continue;
    out.push(d.name.trim());
    if (out.length >= max) break;
  }
  return out;
}

// Famous cooking-method terms for a cuisine slug (secondary evidence source).
function famousMethodsFor(slug, { max = 8 } = {}) {
  const methods = getMethodsForCuisine(slug);
  if (!Array.isArray(methods)) return [];
  const out = [];
  for (const m of methods) {
    const term = typeof m === 'string' ? m : (typeof m?.term === 'string' ? m.term : '');
    if (term && term.trim()) out.push(term.trim());
    if (out.length >= max) break;
  }
  return out;
}

// ── the evidence-verified match ──────────────────────────────────────────────

// findVerifiedDish(venue, slug) → { dish, source } | null
//   source: 'curated-verified' (iconic dish found in the venue's own text)
//         | 'method-verified'  (famous method term found — secondary)
// Word-boundary-ish containment on normalized text; multi-word dish names are
// specific enough that plain containment is safe (e.g. "porkolt", "chilli
// crab"); single short words are skipped to avoid false hits.
function findVerifiedDish(venue, slug) {
  const haystack = venueEvidenceText(venue);
  if (!haystack) return null;
  for (const dish of iconicDishesFor(slug)) {
    const needle = norm(dish);
    if (needle.length < 4) continue;        // too short to trust containment
    if (haystack.includes(needle)) return { dish, source: 'curated-verified' };
  }
  for (const term of famousMethodsFor(slug)) {
    const needle = norm(term);
    if (needle.length < 5) continue;        // methods skew shorter — stricter floor
    if (haystack.includes(needle)) return { dish: term, source: 'method-verified' };
  }
  return null;
}

module.exports = {
  iconicDishesFor,
  famousMethodsFor,
  findVerifiedDish,
  venueEvidenceText,
  _norm: norm,
};
