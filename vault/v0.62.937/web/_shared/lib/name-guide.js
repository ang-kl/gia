// web/_shared/lib/name-guide.js — v0.62.856
//
// WHICH SINGLE LINE GOES UNDER A VENUE NAME.
//
// Operator: "only address, restaurant names and transport name can show both languages."
// Both means TWO, so exactly one guide renders. v0.62.855 put that rule in place with a
// curated-first order (nameLocal → nameReading → namePronounce → nameGloss), mirroring the
// hawker card.
//
// Codex, PR #1796 P2, found what that cost: a venue carrying `nameLocal` or `nameReading`
// can NEVER show a pronunciation, and those are set only for foreign-script venues in
// JP/KR/CN/TW/HK/MO/TH — precisely the venues the pronunciation line was built for.
// Operator, on being shown the trade: **pronunciation wins for foreign script**.
//
// So the order depends on whether the READER can already say the name:
//
//   name in CJK / Hangul / Thai   →  say → local → reading → gloss
//     A French reader looking at 銀座 寿司 cannot read it, cannot say it, and cannot type
//     it. "Ginza Sushi" is the line that helps. The native-script name is already on the
//     row above, so nothing is lost by not repeating it in the guide slot.
//
//   name in Latin script          →  local → reading → say → gloss   (unchanged)
//     "Blue Note Tokyo" is already sayable, and its Japanese name IS worth showing —
//     that is the line you hold up to a taxi driver. Same reasoning as the address rule:
//     keep the form something downstream depends on.
//
// The discriminator is the script of `venue.name`, NOT the presence of `nameLocal` — a
// Latin-named venue in Tokyo carries a Japanese `nameLocal` too, and it should keep it.
//
// This lives in a module rather than inline in the card because the precedence has now been
// asserted by five separate source-scanning tests, four of which broke on a refactor while
// the behaviour held. A pure function can be tested by calling it.

// Mirrors RE_CJK_THAI in translate-name.js, which is what the SERVER uses to decide the same
// question about the same string. Written as explicit escapes: this repo has already shipped
// a source file made unreviewable by literal control characters, and a range written with
// raw CJK is unreadable in a diff even when it is correct.
//
// Deliberately NOT the wider HAS_LOCAL_SCRIPT from local-name.js, which starts at 　 and
// so counts the ideographic space — that one tests a name fetched FROM Google in the local
// language, where the leading space is a fair signal; here the input is the venue's own
// display name, and a Latin name containing one full-width space is not a CJK name.
const RE_CJK_THAI = /[ぁ-ゖゝ-ゟァ-ヺー-ヿ一-鿿가-힣฀-๿]/;

/** True when the name carries Japanese, Chinese, Korean or Thai script. */
export function hasForeignScript(name) {
  return typeof name === 'string' && RE_CJK_THAI.test(name);
}

/**
 * Pick the ONE guide line to render beneath `venue.name`, or null for none.
 *
 * `sayNow` is passed in rather than read off the venue because the card resolves it from the
 * live pronunciation projection first and the venue field only as a fallback — the reactive
 * behaviour from v0.62.849, which must not be re-flattened into a static read here.
 *
 * Returns `{ key, text, icon }` where `icon` is the string 'pronounce' or null; the caller
 * maps that to a component, so this module stays free of JSX and testable in Node.
 */
export function pickNameGuide(venue, sayNow) {
  const v = venue || {};
  const local = v.nameLocal ? { key: 'local', text: `(${v.nameLocal})`, icon: null } : null;
  const reading = v.nameReading ? { key: 'reading', text: `🔤 ${v.nameReading}`, icon: null } : null;
  const say = sayNow ? { key: 'say', text: sayNow, icon: 'pronounce' } : null;
  const gloss = v.nameGloss ? { key: 'gloss', text: `(${v.nameGloss})`, icon: null } : null;

  const order = hasForeignScript(v.name)
    ? [say, local, reading, gloss]
    : [local, reading, say, gloss];
  return order.find(Boolean) || null;
}

export default pickNameGuide;
