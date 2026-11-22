// name-guide-server.js — v0.62.857
//
// WHICH PAID GUIDES ARE WORTH BUYING FOR THIS VENUE.
//
// Since v0.62.855 the cuisine card shows EXACTLY ONE line under a venue name
// (operator: "only address, restaurant names and transport name can show both languages" —
// both means two). v0.62.856 made the order depend on the name's script. The consequence
// nobody had priced: three of the four guides are computed for every venue on every search,
// and at most one is ever displayed. Two of the three cost a Gemini call.
//
// Operator asked for the gating. This is it: the server skips a venue for a guide that
// CANNOT reach the screen given what is already attached.
//
// ── WHY THIS IS NOT A SECOND COPY OF THE PRECEDENCE RULE ───────────────────────────────
//
// The obvious implementation is to import `web/_shared/lib/name-guide.js` and ask it. That
// is impossible here and the repo has measured it twice: this file is CommonJS, `web/cuisine`
// is `"type": "module"`, and Rollup refuses the mix ("X is not exported by ...", recorded at
// `open-hours.js:375`; the same conclusion again at `index.js:13230`). The established
// answer in this codebase is NOT to keep two implementations — that is the drift O-335 was
// about — so this module deliberately encodes as little as it can:
//
//   • `nameGloss` is LAST in BOTH orders. So "a gloss is reachable" is exactly "no other
//     guide exists". That is one fact, true in both branches, not a copy of the ordering.
//   • `namePronounce` is first for a foreign-script name and third for a Latin one. So it is
//     unreachable in exactly one case: a Latin name that already has a curated guide.
//   • The script test is NOT reimplemented. `translate-name.js` already exports
//     `nameScriptLang`, is already CommonJS, and is already the authority the server uses
//     for this same question about this same string.
//
// And the residual risk — that these two facts drift from the client's chain — is guarded by
// a TEST that imports the ESM module and this one together and cross-checks them over a
// matrix of venue shapes. Vitest can load both even though the bundler cannot. A comment
// asking the next writer to keep them in sync has failed twice in this repo already
// (`doc/.serial-state.yml`'s own header records both), so it is a test.

'use strict';

const { nameScriptLang } = require('./translate-name');

/**
 * True when `which` ('say' | 'gloss') could still be the guide that renders.
 *
 * Fails OPEN: anything unrecognised returns true, so a bug here costs money rather than
 * silently removing a line the reader was meant to see. That direction is deliberate — the
 * operator asked to stop waste, not to risk blanking the feature.
 */
function guideReachable(venue, which) {
  const v = venue || {};
  if (typeof v.name !== 'string' || !v.name) return true;
  const curated = Boolean(v.nameLocal || v.nameReading);

  if (which === 'gloss') {
    // Last in both orders: anything else already wins.
    return !curated && !v.namePronounce;
  }
  if (which === 'say') {
    // First for a foreign-script name, so a curated guide never shadows it there.
    if (nameScriptLang(v.name)) return true;
    return !curated;
  }
  return true;
}

/** Convenience: the subset of `venues` still worth buying `which` for. */
function venuesNeeding(venues, which) {
  return Array.isArray(venues) ? venues.filter((v) => guideReachable(v, which)) : [];
}

module.exports = { guideReachable, venuesNeeding };
