// web/_shared/lib/auto-search-gate.js — v0.62.899
//
// SHOULD THIS SEARCH RUN, GIVEN THE PAGE WAS JUST RELOADED TO RE-LANGUAGE THE MAP?
//
// Operator, three messages in a row: *"when i change the language in Cuisine TMA - should not
// fire refresh eateries which is currently doing"*, then *"but I still see the search fired after
// I toggled the language"*, then — settling the design question — *"The reload exists ONLY to
// re-label Google's base map tiles due to language change - can you ensure it doesn't fire the
// search"*.
//
// WHY A MODULE FOR ONE BOOLEAN. v0.62.865 answered the FIRST of those messages by adding
// `localeReloadRestored` and gating `runInitialLoad` on it, with a test that pins that one line.
// The test still passes. The search still fired — because App.jsx has TWENTY-ONE `runSearch(`
// call sites and the flag was consulted at ONE. Two others fire automatically on a restored
// mount: the auto-detect country path (which sets `initialLoadFiredRef` itself, so it never
// reaches the boot guard at all) and the device/anchor coherence path (on a 1-second timer, so
// the restored list repaints and is then overwritten a second later — which is exactly what the
// operator was watching).
//
// That is the same shape as the six `lang === 'fr' ? 'fr' : 'en'` ternaries in #1834 and the
// `michelin:enrich` cache key in #1835: ONE DATUM, SEVERAL CALL SITES, AND ONLY ONE OF THEM
// ASKED. Patching the two would leave the next automatic caller free to forget, so the rule
// lives here instead — one decision, callable, with the call sites carrying only a flag saying
// which kind of trigger they are.
//
// And it is a module rather than a line in App.jsx because App.jsx cannot be imported and driven
// in a test: it is a 6,000-line component wired to Telegram, Google Maps and the network. The
// repo has made this carve-out three times for the same reason — bot-keyboard.js (v0.62.891),
// venue-type-label.js and places-language.js (v0.62.896) — and each header says so.
//
// Pure and framework-free on purpose: no React, no window, no imports.

/**
 * True when this search should be suppressed.
 *
 * `auto` is the caller's own declaration of what kind of trigger it is, and the asymmetry is
 * deliberate: an AUTOMATIC caller must opt IN to being suppressible, so a new button added later
 * cannot inherit the suppression by accident and quietly stop working. The cost of that choice is
 * that a new automatic caller which forgets the flag is not suppressed — which is precisely the
 * failure that happened here, so `__tests__/locale-reload-no-research.test.js` now takes a census
 * of every call site rather than pinning one line.
 *
 * @param {object}  o
 * @param {boolean} o.restored  a locale-reload stash was restored on this mount
 * @param {boolean} o.auto      this trigger fires without the user asking for a search
 * @returns {boolean}
 */
export function shouldSuppressAutoSearch(o) {
  // `o || {}` rather than a destructuring default, and the test is what found the difference:
  // a parameter default only applies to `undefined`, so destructuring a NULL argument throws.
  // App.jsx never passes null today — but this runs INSIDE `runSearch`, so a throw here would
  // take out the search itself rather than merely mis-answering, and the next caller of a
  // shared module should not have to know that.
  const { restored, auto } = o || {};
  return Boolean(restored) && Boolean(auto);
}

export default shouldSuppressAutoSearch;
