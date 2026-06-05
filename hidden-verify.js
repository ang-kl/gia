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
// v0.60.210 (DF-111) — shared dish-name guard for the "🍴 Try ·" line.
const { filterDishNames } = require('./dish-name');

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
// v0.61.318 — added places.reviews so we can read each review's publishTime
// and refute false "newly opened" claims (see oldestReviewMonths + the
// newness-refute step in verifyHiddenGemsOutput).
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.reviews';
const REQUEST_TIMEOUT_MS = 6000;

// v0.61.318 — newness-refute thresholds (operator: new = opened 3 months
// or less). A Google review can only be posted AFTER a venue opens, so if
// the OLDEST review Places returns is older than this, the venue is not
// newly opened — Gemini's C1 claim is false. This only *refutes* newness;
// recent-only reviews prove nothing (Places returns ≤5 reviews).
const NEW_CLAIM_MAX_REVIEW_MONTHS = 3;
// A venue with this many reviews can only have survived the "300+ reviews
// UNLESS newly opened" exclusion via the C1 (new) exception. If newness is
// then refuted, it is neither new nor under-reviewed → drop it.
const WELL_KNOWN_REVIEW_FLOOR = 300;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

// Oldest of the (≤5) reviews Places returns, expressed in months-ago.
// Returns null when there are no parseable review timestamps.
function oldestReviewMonths(reviews) {
  if (!Array.isArray(reviews) || !reviews.length) return null;
  let oldestMs = null;
  for (const r of reviews) {
    const t = r && r.publishTime ? Date.parse(r.publishTime) : NaN;
    if (Number.isFinite(t) && (oldestMs === null || t < oldestMs)) oldestMs = t;
  }
  if (oldestMs === null) return null;
  return Math.max(0, (Date.now() - oldestMs) / MS_PER_MONTH);
}

// Remove a refuted "newly opened" claim from a prose line without mangling
// the rest of the sentence. No-ops (returns the line unchanged) when no
// opening claim is present, so it is safe to run on every line.
function stripOpeningClaim(line) {
  if (typeof line !== 'string') return line;
  let out = line
    // "opened in March 2026", "opened March 2026", "opened in 2026",
    // "opened in early 2026", "opened 3 months ago", "opened earlier this year"
    .replace(/,?\s*(?:newly|recently|just)?\s*opened(?:\s+in)?\s+(?:(?:early|mid|late)\s+)?(?:[A-Z][a-z]+\s+\d{4}|\d{4}|\d+\s+(?:weeks?|months?)\s+ago|earlier this (?:month|year))/gi, '')
    // bare "newly/recently/just opened"
    .replace(/,?\s*(?:newly|recently|just)\s+opened\b/gi, '')
    .replace(/,?\s*new opening\b/gi, '');
  // tidy the seams a strip can leave behind
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\(\s*\)/g, '')
    .trim();
  return out;
}

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
// v0.59.39 — name-similarity gate. Per Human Lead 2026-05-07: Gemini
// hallucinated "New Station Snack Bar (Fort Canning)" and "Kelate";
// Places returned unrelated venues (Fort Canning Park, Tiong Bahru
// Bakery for the first; sponsored Seafood-by-the-River ads for the
// second). The pre-v0.59.39 lookupVenue picked the highest-address-
// overlap result without checking the name — hallucinated venues
// passed because address overlap was 0 (no address in block) and
// the function returned null AT line 82, which the post-processor
// then KEPT (line 210 "don't penalise on infra blip").
//
// Two-part fix:
//   1. Add a name-token-overlap requirement — pick the candidate
//      whose displayName shares the most ≥3-char tokens with the
//      claimed name. If best score is 0 or top candidate has < 50%
//      token overlap, return null (no match).
//   2. Distinguish "no match" (returns null) from "API error"
//      (returns { apiError: true }). The post-processor uses this
//      to drop hallucinated venues but keep blocks during infra blips.
function nameTokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[(){}[\]'"`,.&!?]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !/^(the|and|of|with|for|by|at|in|on|to|de|du|la|le|les)$/.test(t));
}

function nameOverlap(claimed, candidate) {
  const a = new Set(nameTokens(claimed));
  const b = new Set(nameTokens(candidate));
  if (!a.size) return 0;
  let hits = 0;
  for (const t of a) if (b.has(t)) hits++;
  return hits / a.size; // fraction of claimed tokens present in candidate
}

async function lookupVenue(name, address = '') {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  // v0.59.40 / Codex review #244 P2: missing API key is a verifier-
  // unavailable state (NOT a hallucination signal). Return the
  // apiError marker so the post-processor KEEPS the block — letting
  // /hidden still return Gemini's results when Maps isn't configured
  // (test/staging deployments without GOOGLE_MAPS_API_KEY).
  if (!apiKey) return { apiError: true };
  if (!name) return null;
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

    // v0.59.39: composite scoring — pick the candidate with the
    // highest combined name + address overlap. Both ≥ 50% required
    // when address is present; ≥ 50% name when no address.
    const NAME_FLOOR = 0.5; // claimed-name tokens that must appear in candidate
    const wantAddrTokens = address
      ? address.toLowerCase().split(/[\s,#/()]+/).filter((t) => t.length >= 3)
      : [];
    let best = null;
    let bestScore = -1;
    for (const p of places) {
      const candName = p.displayName?.text || '';
      const candAddr = (p.formattedAddress || '').toLowerCase();
      const nameFrac = nameOverlap(name, candName);
      let addrHits = 0;
      if (wantAddrTokens.length) {
        addrHits = wantAddrTokens.reduce((acc, t) => acc + (candAddr.includes(t) ? 1 : 0), 0);
      }
      // Composite: name fraction (0..1) + address-hit count (capped 5).
      const score = nameFrac * 10 + Math.min(addrHits, 5);
      if (score > bestScore) {
        bestScore = score;
        best = { p, nameFrac, addrHits };
      }
    }
    if (!best) return null;
    // Hard floor on name match — prevents Gemini's "Kelate"
    // hallucinations (Places top-result "Seafood by the River")
    // from passing because they share 0 name tokens.
    if (best.nameFrac < NAME_FLOOR) {
      console.log(`[hidden-verify] name-mismatch reject: claimed="${name}" got="${best.p.displayName?.text || ''}" frac=${best.nameFrac.toFixed(2)}`);
      return null;
    }
    if (address && best.addrHits === 0) {
      // v0.60.29 — salvage path. Pre-v0.60.29 we hard-rejected on
      // address-mismatch even when the name was a strong match. In
      // production this dropped legitimate venues whose address
      // Gemini fabricated to fit the anchor neighbourhood (e.g. "THE
      // BETTER HALF" claimed at "1 Bukit Merah Lane 1" but resolves
      // to 1 Everton Park; same venue, real, near the anchor).
      // When name match is strong (≥0.7), trust Places' resolved
      // address and let the downstream haversine radius filter
      // decide whether the actual venue is in range. The 0.5 floor
      // path still rejects since name uncertainty + wrong address
      // is too risky.
      const STRONG_NAME = 0.7;
      if (best.nameFrac < STRONG_NAME) {
        console.log(`[hidden-verify] address-mismatch reject: claimed="${name}" addr="${address}" got="${best.p.formattedAddress || ''}" nameFrac=${best.nameFrac.toFixed(2)}`);
        return null;
      }
      console.log(`[hidden-verify] address-mismatch salvage: claimed="${name}" addr="${address}" → using Places addr="${best.p.formattedAddress || ''}" nameFrac=${best.nameFrac.toFixed(2)}`);
    }
    const chosen = best.p;
    return {
      id: chosen.id || '',
      name: chosen.displayName?.text || '',
      address: chosen.formattedAddress || '',
      lat: chosen.location?.latitude ?? null,
      lng: chosen.location?.longitude ?? null,
      rating: typeof chosen.rating === 'number' ? chosen.rating : null,
      userRatingCount: typeof chosen.userRatingCount === 'number' ? chosen.userRatingCount : null,
      // v0.61.318: oldest of the returned reviews in months-ago (null when
      // none parseable). Used to refute false "newly opened" claims.
      oldestReviewMonths: oldestReviewMonths(chosen.reviews),
      // v0.59.7: status field used by verifyHiddenGemsOutput to drop
      // venues that Gemini's grounded search included despite being
      // CLOSED_TEMPORARILY / CLOSED_PERMANENTLY. Treat absence as
      // OPERATIONAL — Places rarely omits this for known places, and
      // dropping on absence would silently filter legitimate hits.
      businessStatus: chosen.businessStatus || 'OPERATIONAL'
    };
  } catch (err) {
    console.warn('[hidden-verify] lookup failed for', name, '→', err.message);
    // v0.59.39: return a marker (not plain null) on API errors so
    // the post-processor can distinguish "no Places match" (drop the
    // hallucinated block) from "axios threw / 5xx" (keep the block,
    // don't penalise infra blip).
    return { apiError: true };
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
        // v0.60.31 — extract the claimed distance from Gemini's prose
        // ("approx 6.3 km east", "approx 200 m away") so the post-
        // processor can drop blocks whose claimed distance exceeds the
        // requested band BEFORE paying for the Places lookup. Pre-
        // v0.60.31 a Coconut-Club-at-Beach-Road block from a Telok
        // Blangah anchor cost a Places call AND a haversine compute
        // even though Gemini openly stated it was 6.3 km away.
        const distMatch = /\bapprox(?:imately)?\s+(\d+(?:[.,]\d+)?)\s*(km|m)\b/i.exec(line);
        if (distMatch) {
          const value = parseFloat(distMatch[1].replace(',', '.'));
          const unit = distMatch[2].toLowerCase();
          current.claimedDistanceM = unit === 'km' ? Math.round(value * 1000) : Math.round(value);
        }
      }
      current.lines.push(line);
    } else {
      prefix.push(line);
    }
  }
  if (current) blocks.push(current);
  return { prefix, blocks };
}

// v0.60.210 (DF-111) — the "🍴 Try · …" line must carry only genuine
// dish / dessert names. The /hidden Gemini prompt says "top FOOD
// dishes only" but nothing enforced it, so a category word
// ("dishes", "desserts") could slip onto the card. Filter the
// comma-separated list through the shared dish-name guard; when
// nothing survives, drop the whole line (return null → filtered out).
function filterTryLine(line) {
  // v0.60.222a — operator standardised the Try glyph to 🍲; accept the
  // legacy 🍴 too so a cached pre-change Gemini response still filters.
  const m = /^([🍲🍴]\s*(?:Try|Essayez)\s*·\s*)(.+)$/u.exec(line);
  if (!m) return line;
  const kept = filterDishNames(m[2].split(/\s*,\s*/));
  return kept.length ? `${m[1]}${kept.join(', ')}` : null;
}

// Rewrite a block's lines using verified rating + count, then
// dish-validate the Try line. Locale-aware. The Try-line filter runs
// whether or not the rating lookup succeeded.
function applyVerified(block, verified) {
  const ratingOk = verified
    && Number.isFinite(verified.rating)
    && Number.isFinite(verified.userRatingCount);
  let lines = block.lines;
  if (ratingOk) {
  const useFr = block.lines.some((l) => /\bavis\b/i.test(l) || /Note Google/i.test(l));
  const ratingText = useFr
    ? verified.rating.toFixed(1).replace('.', ',')
    : verified.rating.toFixed(1);
  lines = block.lines.map((line) => {
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
  // v0.61.318 — if the venue's oldest review refutes a "newly opened"
  // claim, strip that wording. A venue kept here still qualified via C3 /
  // C2 / C4, but it is not new — so we must not show a false opening claim.
  // stripOpeningClaim no-ops on lines without an opening claim.
  const om = verified && verified.oldestReviewMonths;
  if (Number.isFinite(om) && om > NEW_CLAIM_MAX_REVIEW_MONTHS) {
    lines = lines.map(stripOpeningClaim);
  }
  // DF-111 — dish-validate the "🍴 Try ·" line; drop it if no real
  // dish name survives.
  return lines.map(filterTryLine).filter((l) => l !== null);
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
  // v0.60.31 — pre-filter blocks whose claimed distance ("approx X km
  // east") already exceeds the requested upper band. Gemini sometimes
  // includes a 6 km venue from a 2 km-band anchor; the haversine
  // filter would drop it after a Places lookup, but checking the
  // claimed distance up front saves the API call and the wall-clock
  // time. opts.maxDistanceM is the band ceiling in metres (e.g. 2000
  // for the 100m-2km primary band, 3000 for the 1.5-3km wider band).
  // 20 % tolerance lets borderline claims through (Gemini's "approx 2
  // km" might actually be 2.1 km, which the haversine filter accepts).
  const maxDistM = Number.isFinite(opts.maxDistanceM) ? opts.maxDistanceM * 1.2 : null;
  const distanceSurvivors = maxDistM
    ? blocks.filter((b) => {
        if (!Number.isFinite(b.claimedDistanceM)) return true;        // no distance prose → defer to haversine
        if (b.claimedDistanceM <= maxDistM) return true;
        console.log(`[hidden-verify] pre-filter drop "${b.name}" claims ${b.claimedDistanceM}m vs band ${Math.round(maxDistM)}m`);
        return false;
      })
    : blocks;
  if (!distanceSurvivors.length) {
    return { text, venues: [], allDropped: true };
  }
  // v0.59.7: optional test seam. Pass `_lookup: async (name, addr) => ({...})`
  // to bypass the real Places API. Production path uses lookupVenue.
  const lookupFn = typeof opts._lookup === 'function' ? opts._lookup : lookupVenue;
  const lookups = await Promise.all(distanceSurvivors.map((b) => lookupFn(b.name, b.address)));
  // v0.59.7: drop blocks whose live businessStatus is non-OPERATIONAL.
  // Closes the gap where Gemini's grounded search misses a closed venue
  // but Places already knows it's closed. Renumbers the surviving picks
  // so the user sees "1. … 2. … 3. …" without numbering gaps.
  const survivors = distanceSurvivors
    .map((b, i) => ({ block: b, lookup: lookups[i] }))
    .filter(({ block, lookup }) => {
      // v0.59.39: discriminated lookup returns:
      //   - plain object  → Places matched (good or bad businessStatus)
      //   - null          → Places searched but no name+address match
      //                     (Gemini hallucination → drop the block)
      //   - { apiError }  → axios/5xx infra blip (keep the block)
      if (lookup === null) {
        console.log(`[hidden-verify] dropping unverifiable venue (no Places match): "${block.name}"`);
        return false;
      }
      if (lookup?.apiError) {
        console.warn(`[hidden-verify] keeping "${block.name}" despite probe API error`);
        return true;
      }
      const status = lookup.businessStatus || 'OPERATIONAL';
      if (status !== 'OPERATIONAL') {
        console.log(`[hidden-verify] dropping non-OPERATIONAL venue: "${lookup.name}" (${status})`);
        return false;
      }
      // v0.61.318 — newness-refute drop. A venue with 300+ reviews can only
      // have survived the "300+ reviews UNLESS newly opened" exclusion via
      // the C1 (new) exception. If its OLDEST returned review predates the
      // 3-month window, C1 is false → it is neither new nor under-reviewed,
      // so drop it. Feeds allDropped + the Tier-2/Tier-3 retry ladder, same
      // as the distance/closed filters.
      const om = lookup.oldestReviewMonths;
      if (Number.isFinite(om) && om > NEW_CLAIM_MAX_REVIEW_MONTHS
          && Number.isFinite(lookup.userRatingCount)
          && lookup.userRatingCount >= WELL_KNOWN_REVIEW_FLOOR) {
        console.log(`[hidden-verify] newness-refuted drop: "${lookup.name}" oldestReview=${om.toFixed(1)}mo reviews=${lookup.userRatingCount} (not new, not under-reviewed)`);
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
  // v0.60.32 — rewrite Gemini's "I found N hidden gems" prose to
  // match the actual delivered count after dedup + verifier drops.
  // Pre-v0.60.32 the user saw "I found 4 hidden gems" but only 3
  // cards rendered (the 4th was filtered as CLOSED / unverifiable).
  // Match EN ("I found 4 hidden gems"), FR ("J'ai trouvé 4 trésors").
  const deliveredCount = survivors.length;
  const prefixText = prefix
    .map((line) => line.replace(
      /\b(I found|J'ai trouvé)\s+\d+\s+(hidden gems?|trésors? cachés?)\b/i,
      (_, verb, noun) => `${verb} ${deliveredCount} ${noun}`
    ))
    .join('\n').replace(/\s+$/, '');
  const joined = blockTexts.join('\n\n');
  const venues = survivors.map(({ block, lookup }) =>
    // v0.59.39: skip apiError markers (no real Places data) and nulls.
    (lookup && !lookup.apiError) ? { ...lookup, displayHeading: block.name } : null
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

// v0.60.19 (Human Lead 2026-05-08) — distance-text rewrite. Replaces
// Gemini's prose distance claim ("approx 2.4km north-east") with the
// computed haversine distance (in metres) for each venue. Pairs the
// already-verified text with the venues array (each carrying
// `distanceM` from runSurpriseCommand's haversine filter), parses
// blocks by the same "1. NAME" heading logic, and rewrites each
// block's "approx X km/m" pattern in place.
//
// Patterns rewritten:
//   "approx 2.4km north-east"  → "approx 1.8km north-east" (real)
//   "approx 200 m away"        → "approx 0.3km away"
//   "About 1.5 km from anchor" → "About 1.2km from anchor"
//
// Direction text is preserved verbatim — we only swap the numeric
// distance + unit. If a block has no matching venue (or the venue
// has no distanceM), we leave the prose alone.
function formatHumanDistance(distM) {
  if (!Number.isFinite(distM)) return null;
  if (distM < 950) return `${Math.round(distM)} m`;
  return `${(distM / 1000).toFixed(1)} km`;
}

function rewriteDistanceClaims(text, venues) {
  if (!text || !venues || !venues.length) return text;
  const { prefix, blocks } = parseBlocks(text);
  if (!blocks.length) return text;
  // Pair blocks with venues by index. The verified text + venues
  // array are produced by the same survivors filter so they line up.
  const distRx = /\b(approx(?:imately)?|about|approximately)\.?\s+([0-9]+(?:\.[0-9]+)?)\s*(km|m)\b/gi;
  const parts = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const venue = venues[i];
    const computed = venue && Number.isFinite(venue.distanceM)
      ? formatHumanDistance(venue.distanceM)
      : null;
    const blockText = block.lines.join('\n');
    const rewritten = computed
      ? blockText.replace(distRx, (_m, lead, _num, _unit) => `${lead} ${computed}`)
      : blockText;
    parts.push(rewritten);
  }
  const prefixText = prefix.join('\n').replace(/\s+$/, '');
  const joined = parts.join('\n\n');
  return prefixText ? `${prefixText}\n\n${joined}` : joined;
}

// v0.60.33 — drop entire blocks whose displayHeading matches a name
// in the dropNames set. Used by runSurpriseCommand's verifyAndFilter
// to strip out-of-radius venues from the displayed text. Pre-v0.60.33
// the haversine filter only counted within-radius survivors but did
// not prune the rendered text, so an out-of-band venue (e.g. The
// Coconut Club @ 6.3 km from a 2 km band) still appeared in the
// delivered message. parseBlocks → filter → re-join is the same
// pattern as rewriteDistanceClaims above. Block name matched
// case-insensitively.
function dropBlocksByName(text, dropNames) {
  if (!text || !dropNames || !dropNames.size) return text;
  const lcDrop = new Set([...dropNames].map((n) => String(n || '').toLowerCase()));
  const { prefix, blocks } = parseBlocks(text);
  if (!blocks.length) return text;
  const kept = blocks.filter((b) => !lcDrop.has(String(b.name || '').toLowerCase()));
  if (kept.length === blocks.length) return text;
  // Renumber survivors so the user sees "1. … 2. …" without gaps.
  const renumbered = kept.map((b, idx) => {
    const lines = [...b.lines];
    if (lines[0]) lines[0] = lines[0].replace(/^\d+\./, `${idx + 1}.`);
    return lines.join('\n');
  });
  // Codex review on PR #292 (P2): verifyHiddenGemsOutput already
  // rewrote "I found N hidden gems" to match the post-Places count.
  // Dropping additional blocks here leaves the intro stale ("I found
  // 5…" with only 4 cards). Rewrite the prefix count a second time
  // to match the post-haversine kept count. EN + FR.
  const prefixLines = prefix.map((line) => line.replace(
    /\b(I found|J'ai trouvé)\s+\d+\s+(hidden gems?|trésors? cachés?)\b/i,
    (_, verb, noun) => `${verb} ${kept.length} ${noun}`
  ));
  const prefixText = prefixLines.join('\n').replace(/\s+$/, '');
  const joined = renumbered.join('\n\n');
  return prefixText ? `${prefixText}\n\n${joined}` : joined;
}

module.exports = {
  verifyHiddenGemsOutput,
  parseBlocks,
  applyVerified,
  dropBlocksByName,
  lookupVenue,
  rewriteDistanceClaims,
  formatHumanDistance,
  // v0.61.318 — exported for unit tests of the newness-refute logic.
  oldestReviewMonths,
  stripOpeningClaim
};
