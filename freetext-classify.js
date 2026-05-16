// freetext-classify.js — v0.60.228
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

module.exports = { looksLikeQuestion, looksLikeTransport, _tokenize: tokenize };
