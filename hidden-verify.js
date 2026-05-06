// hidden-verify.js — v0.59.5
//
// Post-process /hidden Gemini output to replace fabricated rating +
// review-count values with the live figure from the Google Places API.
//
// Why: Gemini's grounded search returns whatever's indexed at training/
// crawl time. Counts in particular drift fast — a venue with 162 reviews
// today might have been 114 when last indexed. The user reported
// MONDAY COFFEE BAR (claimed 114, actual 162) and SEVEN SCOOPS AND BAKES
// (claimed 56, actual 159) on a single /hidden run.
//
// What this module does:
//   1. Parse Gemini's text into venue blocks via the "1. NAME — type"
//      heading pattern.
//   2. For each block, hit places:searchText with the venue name + the
//      Singapore region restriction. Pull rating + userRatingCount.
//   3. Rewrite the "Google rating - X.X and N reviews." line (and any
//      "with N reviews" / "rated 4.5 over N reviews" mentions in the
//      "Why a gem" prose) using the verified values.
//   4. Locale-aware: matches both EN ("reviews") and FR ("avis"), and
//      uses comma decimal separator in FR ("4,5" not "4.5").
//   5. On lookup failure for any venue, leaves that block untouched.
//
// We do NOT re-evaluate the criteria gate (C1-C4) post-correction. A
// venue that was admitted because Gemini believed it had 56 reviews
// (passing C3 < 120) will stay in the list even if the live count is
// 159. The criteria gate was never the user's complaint — the displayed
// numbers were. Re-gating would force a Gemini re-call, which is too
// expensive for the surface area of the bug.

const axios = require('axios');

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount';
const REQUEST_TIMEOUT_MS = 6000;

// Look up a single venue by name + (optional) address. Returns
// { id, name, rating, userRatingCount } or null.
//
// Address disambiguation (Codex review #209): for chains or duplicate
// names (multiple Singapore outlets), searching by name alone and using
// places[0] can verify the wrong branch, replacing Gemini's count with
// another outlet's live count. We:
//   1. Bias the search by including the block's address in textQuery.
//   2. From the response, pick the candidate whose formattedAddress
//      shares the most ≥3-character tokens with the block's address.
//   3. If even the best match scores zero, treat the lookup as
//      ambiguous and return null (no rewrite — leaves the original block
//      untouched).
async function lookupVenue(name, address = '') {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !name) return null;
  const query = address ? `${name} ${address} Singapore` : `${name} Singapore`;
  try {
    const { data } = await axios.post(
      SEARCH_URL,
      { textQuery: query, languageCode: 'en' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK
        },
        timeout: REQUEST_TIMEOUT_MS
      }
    );
    const places = data?.places || [];
    if (!places.length) return null;
    let chosen = places[0];
    if (address) {
      const wantTokens = address
        .toLowerCase()
        .split(/[\s,#/()]+/)
        .filter((t) => t.length >= 3);
      let bestScore = 0;
      for (const p of places) {
        const fa = (p.formattedAddress || '').toLowerCase();
        const score = wantTokens.reduce((acc, t) => acc + (fa.includes(t) ? 1 : 0), 0);
        if (score > bestScore) { bestScore = score; chosen = p; }
      }
      // No token overlap = ambiguous match. Refuse to overwrite.
      if (bestScore === 0) return null;
    }
    return {
      id: chosen.id || '',
      name: chosen.displayName?.text || '',
      rating: typeof chosen.rating === 'number' ? chosen.rating : null,
      userRatingCount: typeof chosen.userRatingCount === 'number' ? chosen.userRatingCount : null
    };
  } catch (err) {
    console.warn('[hidden-verify] lookup failed for', name, '→', err.message);
    return null;
  }
}

// Parse a Gemini /hidden response into blocks. Returns
// { prefix, blocks } where blocks is [{ number, name, address, lines }].
//
// Markdown handling (Codex review #209): Gemini occasionally wraps
// headings in **bold** despite the prompt rule against Markdown. Strip
// leading/trailing `*` and `_` runs from each line BEFORE matching, so
// `**1. NAME - cafe**` parses as a heading. The cleaned form is what
// we store in block.lines so downstream rendering doesn't show literal
// asterisks (chunkHiddenGemsOutput's Markdown sanitizer would have
// stripped them anyway, but this keeps the verified text consistent).
function parseBlocks(text) {
  const rawLines = String(text || '').split(/\r?\n/);
  const prefix = [];
  const blocks = [];
  let current = null;
  for (const rawLine of rawLines) {
    const line = rawLine
      .replace(/^[\s*_]+/, '')
      .replace(/[\s*_]+$/, '');
    const headMatch = /^(\d+)\.\s+(.+?)(?:\s+[-—]\s+|$)/.exec(line);
    if (headMatch) {
      if (current) blocks.push(current);
      current = {
        number: Number(headMatch[1]),
        name: headMatch[2].trim(),
        address: '',
        lines: [line]
      };
    } else if (current) {
      // Capture the address from the line immediately after the heading.
      // Format per the prompt: "Address - approx Xkm <direction>".
      if (current.lines.length === 1 && !current.address) {
        const addrMatch = /^(.+?)\s+[-—]\s+approx\b/i.exec(line);
        current.address = (addrMatch ? addrMatch[1] : line).trim();
      }
      current.lines.push(line);
    } else {
      prefix.push(line);
    }
  }
  if (current) blocks.push(current);
  return { prefix, blocks };
}

// Rewrite a block's lines using verified rating + count. Locale-aware.
function applyVerified(block, verified) {
  if (!verified || !Number.isFinite(verified.rating) || !Number.isFinite(verified.userRatingCount)) {
    return block.lines;
  }
  const useFr = block.lines.some((l) => /\bavis\b/i.test(l) || /Note Google/i.test(l));
  const ratingText = useFr
    ? verified.rating.toFixed(1).replace('.', ',')
    : verified.rating.toFixed(1);
  const reviewWord = useFr ? 'avis' : 'reviews';
  return block.lines.map((line) => {
    // 1) Authoritative rating line:
    //    "Google rating - 4.5 and 114 reviews." / "Google rating: 4.5 and 114 reviews."
    //    "Note Google : 4,5 et 114 avis." / "Note Google - 4,5 et 114 avis."
    const ratingLine = line.replace(
      /(Google rating|Note Google)([\s:–—-]+)([0-9]+[.,]?[0-9]*)([^\d]+?)(\d+)(\s+(?:reviews?|avis)\b)/i,
      (_, label, sep1, _r, sep2, _n, suffix) => `${label}${sep1}${ratingText}${sep2}${verified.userRatingCount}${suffix}`
    );
    if (ratingLine !== line) return ratingLine;

    // 2) Prose mentions: "with 114 reviews" / "over 114 reviews" / "114 avis".
    const proseLine = line.replace(
      /(\b)(\d+)(\s+(?:reviews?|avis)\b)/gi,
      (_, pre, _n, suffix) => `${pre}${verified.userRatingCount}${suffix}`
    );
    return proseLine;
  });
}

// Top-level: takes a Gemini response and returns rewritten text.
async function verifyHiddenGemsOutput(text) {
  if (!text || typeof text !== 'string') return text;
  const { prefix, blocks } = parseBlocks(text);
  if (!blocks.length) return text;
  const lookups = await Promise.all(blocks.map((b) => lookupVenue(b.name, b.address)));
  const blockTexts = blocks.map((b, i) => applyVerified(b, lookups[i]).join('\n'));
  const prefixText = prefix.join('\n').replace(/\s+$/, '');
  const joined = blockTexts.join('\n\n');
  return prefixText ? `${prefixText}\n\n${joined}` : joined;
}

module.exports = { verifyHiddenGemsOutput, parseBlocks, applyVerified, lookupVenue };
