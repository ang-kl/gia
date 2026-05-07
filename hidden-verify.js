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
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus';
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
      address: chosen.formattedAddress || '',
      lat: chosen.location?.latitude ?? null,
      lng: chosen.location?.longitude ?? null,
      rating: typeof chosen.rating === 'number' ? chosen.rating : null,
      userRatingCount: typeof chosen.userRatingCount === 'number' ? chosen.userRatingCount : null,
      // v0.59.7: status field used by verifyHiddenGemsOutput to drop
      // venues that Gemini's grounded search included despite being
      // CLOSED_TEMPORARILY / CLOSED_PERMANENTLY. Treat absence as
      // OPERATIONAL — Places rarely omits this for known places, and
      // dropping on absence would silently filter legitimate hits.
      businessStatus: chosen.businessStatus || 'OPERATIONAL'
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
  return block.lines.map((line) => {
    // v0.59.24: new format "🌟 Google rating · 4.5" (rating only, no
    // count). Match label + middot + numeric → rewrite with verified
    // rating; counts are no longer printed per Human Lead 2026-05-07.
    const newRatingLine = line.replace(
      /(🌟\s*(?:Google rating|Note Google))([\s:·–—-]+)([0-9]+[.,]?[0-9]*)/i,
      (_, label, sep, _r) => `${label}${sep}${ratingText}`
    );
    if (newRatingLine !== line) return newRatingLine;

    // 1) Legacy authoritative rating line (pre-v0.59.24):
    //    "Google rating - 4.5 and 114 reviews." / "Google rating: 4.5 and 114 reviews."
    //    "Note Google : 4,5 et 114 avis." / "Note Google - 4,5 et 114 avis."
    //    Per the v0.59.24 "rating only" rule, the count is stripped.
    const legacyRatingLine = line.replace(
      /(Google rating|Note Google)([\s:–—-]+)([0-9]+[.,]?[0-9]*)([^\d]+?)(\d+)(\s+(?:reviews?|avis)\b\.?)/i,
      (_, label, sep1) => `${label}${sep1}${ratingText}`
    );
    if (legacyRatingLine !== line) return legacyRatingLine;

    // 2) Prose mentions of review counts ("with 114 reviews", "over 114
    // avis"): drop the count entirely per v0.59.24 (counts inaccurate
    // per Human Lead). The rest of the prose stays.
    const proseLine = line.replace(
      /\s*(\b(?:with|over|featuring|across|sur|à partir de|avec|plus de)\s+)?\d+\s+(?:reviews?|avis)\b/gi,
      ''
    );
    return proseLine;
  });
}

// Top-level: takes a Gemini response and returns
// { text, venues } where:
//   - text  = the rewritten output (rating + count corrected per block)
//   - venues = the per-block Places lookup result (or null when the
//              lookup failed / was ambiguous). Caller can use the
//              non-null entries to build a one-map button.
async function verifyHiddenGemsOutput(text, opts = {}) {
  if (!text || typeof text !== 'string') return { text, venues: [] };
  const { prefix, blocks } = parseBlocks(text);
  if (!blocks.length) return { text, venues: [] };
  // v0.59.7: optional test seam. Pass `_lookup: async (name, addr) => ({...})`
  // to bypass the real Places API. Production path uses lookupVenue.
  const lookupFn = typeof opts._lookup === 'function' ? opts._lookup : lookupVenue;
  const lookups = await Promise.all(blocks.map((b) => lookupFn(b.name, b.address)));
  // v0.59.7: drop blocks whose live businessStatus is non-OPERATIONAL.
  // Closes the gap where Gemini's grounded search misses a closed venue
  // but Places already knows it's closed. Renumbers the surviving picks
  // so the user sees "1. … 2. … 3. …" without numbering gaps.
  const survivors = blocks
    .map((b, i) => ({ block: b, lookup: lookups[i] }))
    .filter(({ lookup }) => {
      if (!lookup) return true; // lookup failed → keep (don't penalise on infra blip)
      const status = lookup.businessStatus || 'OPERATIONAL';
      if (status !== 'OPERATIONAL') {
        console.log(`[hidden-verify] dropping non-OPERATIONAL venue: "${lookup.name}" (${status})`);
        return false;
      }
      return true;
    });
  const blockTexts = survivors.map(({ block, lookup }, idx) => {
    const lines = applyVerified(block, lookup);
    // Renumber: replace the leading "N." in the heading with the new index.
    if (lines[0]) {
      lines[0] = lines[0].replace(/^\d+\./, `${idx + 1}.`);
    }
    return lines.join('\n');
  });
  const prefixText = prefix.join('\n').replace(/\s+$/, '');
  const joined = blockTexts.join('\n\n');
  const venues = survivors.map(({ block, lookup }) =>
    lookup ? { ...lookup, displayHeading: block.name } : null
  );
  // v0.59.7 (Codex review #211): flag the all-closed case so the
  // caller can substitute a non-empty user-facing message. Without
  // this, runSurpriseCommand would safeSend an empty string when
  // every parsed block was CLOSED_*, and Telegram rejects empty
  // messages — the user would see no final response after waiting.
  const allDropped = blocks.length > 0 && survivors.length === 0;
  return {
    text: prefixText ? `${prefixText}\n\n${joined}` : joined,
    venues,
    allDropped
  };
}

module.exports = {
  verifyHiddenGemsOutput,
  parseBlocks,
  applyVerified,
  lookupVenue
};
