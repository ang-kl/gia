// freetext-classify.js — v0.61.118
//
// Lightweight, deterministic guard for the free-text dish-search paths
// (chat free text + the Cuisine TMA "Tell me" box). It answers ONE
// question: does this text look like a *question / instruction* rather
// than a dish / cuisine / place name?
//
// Background: the free-text path just hands the user's text to Google
// Places `searchText`. A query like "does Beach Road curry rice sell
// chiffon cake" isn't a place name — Google ignores most of it and
// returns "restaurants near you, sorted by rating" (a misleading
// fine-dining dump). When this guard fires we decline politely and
// point at the picker instead of running that search.
//
// v0.61.118 — also exports `looksLikeCuisineBrowse(text)`. The chat
// food-relatedness gate at index.js:7738 calls Gemini Flash to bucket
// text as dish/ingredient/tool/venue/ambiguous. Cuisine BROWSE queries
// ("western cuisine nearby", "italian food near me", "japanese
// restaurant") fit none of those buckets and were getting `ambiguous`
// → declined. This helper is the pre-classifier whitelist: when text
// pairs a cuisine word (catalogue cuisine OR umbrella like "western")
// with a food-specific noun (cuisine, food, restaurant, dining, …),
// the gate is bypassed and the search runs.
//
// Conservative by design — it MUST NOT trip on real dish / brand names
// ("fish and chips", "char kway teow", "What The Burger", "Burnt Ends",
// "Wok Hey"). It only fires on:
//   1. text that ends with "?"
//   2. ≥ 4 words AND the first word is an interrogative/auxiliary
//      ("does/do/is/are/can/could/will/would/what/which/who/why/how/
//       should/has/have/may/might") — NOTE "where" is deliberately
//      excluded: "where is <place>" is a legitimate place lookup.
//   3. ≥ 5 words AND it contains a "X sell/serve/have/stock/carry Y"
//      style verb — catches the chiffon-cake case regardless of how it
//      starts.

'use strict';

const LEADING_INTERROGATIVES = new Set([
  'does', 'do', 'did', 'is', 'are', 'am', 'was', 'were',
  'can', 'could', 'will', 'would', 'shall', 'should',
  'has', 'have', 'had', 'may', 'might', 'must',
  'what', "what's", 'whats', 'which', 'who', "who's", 'whose', 'whom',
  'why', 'how', "how's"
]);

const ASKING_VERBS = new Set([
  'sell', 'sells', 'selling', 'sold',
  'serve', 'serves', 'serving', 'served',
  'have', 'has', 'having',
  'stock', 'stocks', 'stocking', 'stocked',
  'carry', 'carries', 'carrying', 'carried',
  'offer', 'offers', 'offering', 'offered',
  'make', 'makes', 'making'
]);

// v0.60.228 — transport-query detector. The free-text chat path is a
// food search; a transport query ("how to get to Changi", "MRT to
// Bugis", "bus 174") otherwise reaches classifySearchIntent and gets
// the food-nudge decline. When this fires the chat handler points the
// user at the /transport tool instead. Conservative: only whole-word
// transport nouns and explicit "how to get to"-style phrases trip it.
const TRANSPORT_WORDS = new Set([
  'mrt', 'lrt', 'train', 'trains', 'subway', 'metro',
  'bus', 'buses', 'taxi', 'cab', 'checkpoint', 'causeway'
]);
const TRANSPORT_PHRASES = [
  'how to get to', 'how do i get to', 'how do i get',
  'how to go to', 'how to reach', 'directions to',
  'route to', 'fastest way to', 'fare to', 'fares to'
];
function looksLikeTransport(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return false;
  for (const p of TRANSPORT_PHRASES) {
    if (raw.includes(p)) return true;
  }
  const words = tokenize(raw);
  for (const w of words) {
    if (TRANSPORT_WORDS.has(w)) return true;
  }
  return false;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// v0.61.118 — cuisine browse whitelist. Umbrella cuisine words that
// cuisine-family.js intentionally maps to no family (so they never
// drive the venuePlausiblyServes demote) but ARE still valid cuisine
// browse signals. `pan asian` is matched separately as a two-token
// adjacency below so we don't have to add every multi-word spelling.
const CUISINE_UMBRELLA_WORDS = new Set([
  'western', 'asian', 'fusion', 'continental', 'international',
  'panasian', 'pan-asian', 'eclectic', 'global'
]);

// Food-specific nouns. Pairing one of these with a cuisine word makes
// the text a cuisine BROWSE query ("italian restaurant", "western
// cuisine nearby"). "near"/"nearby"/"around" are intentionally INCLUDED
// — alone they're geographic, but combined with a cuisine word they
// reliably indicate a food search ("italian near me", "thai nearby").
// Excluded: generic words like "good", "best", "cheap" that don't pin
// the intent to food.
const FOOD_SPECIFIC_NOUNS = new Set([
  'cuisine', 'cuisines',
  'food', 'foods', 'foodie',
  'restaurant', 'restaurants', 'resto', 'restos',
  'eatery', 'eateries',
  'dining', 'diner', 'diners',
  'meal', 'meals', 'dish', 'dishes', 'menu', 'menus',
  'kopitiam', 'hawker', 'foodcourt',
  'snack', 'snacks', 'bite', 'bites',
  'feast', 'cookery', 'gastronomy',
  'nearby', 'near', 'around', 'closeby'
]);

// Returns true when `text` is a cuisine browse query — i.e. it pairs a
// cuisine word (catalogue cuisine via cuisine-family.cuisineFamily OR
// an umbrella like "western") with a food-specific noun. Conservative
// by design: a bare cuisine word ("italian") or a bare food noun
// ("restaurant") does NOT trip this — only the pairing does. Used by
// the chat free-text path to bypass the Gemini food-relatedness gate
// for queries that the classifier otherwise mis-bucketed as ambiguous.
function looksLikeCuisineBrowse(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return false;
  const words = tokenize(raw);
  if (words.length < 2) return false;
  let hasUmbrella = false;
  let hasFoodNoun = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (CUISINE_UMBRELLA_WORDS.has(w)) hasUmbrella = true;
    // Catch "pan asian" as adjacent tokens — tokenize splits the hyphen.
    if (w === 'pan' && words[i + 1] === 'asian') hasUmbrella = true;
    if (FOOD_SPECIFIC_NOUNS.has(w)) hasFoodNoun = true;
  }
  if (!hasFoodNoun) return false;
  if (hasUmbrella) return true;
  // Defer the catalogue-cuisine check to cuisine-family.js so the word
  // list stays in one place. cuisineFamily uses substring matching, so
  // pass the lowercased raw text (handles "italian", "italian-fusion",
  // "Italian Cuisine", multi-word demonyms, etc.).
  try {
    const cf = require('./cuisine-family');
    if (cf.cuisineFamily(raw)) return true;
  } catch { /* best-effort — if the module fails to load, decline */ }
  return false;
}

// Returns true when `text` reads like a question / instruction rather
// than a dish or place name.
function looksLikeQuestion(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  // 1) trailing question mark — strongest signal
  if (/\?\s*$/.test(raw)) return true;
  const words = tokenize(raw);
  if (words.length < 4) return false;
  // 2) leading interrogative/auxiliary + ≥ 4 words
  if (LEADING_INTERROGATIVES.has(words[0])) return true;
  // 3) ≥ 5 words with an "X sell/serve/have/stock Y" verb in the body
  if (words.length >= 5) {
    for (let i = 1; i < words.length - 1; i++) {
      if (ASKING_VERBS.has(words[i])) return true;
    }
  }
  return false;
}

module.exports = { looksLikeQuestion, looksLikeTransport, looksLikeCuisineBrowse, _tokenize: tokenize };
