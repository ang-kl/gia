// locale-reload-no-research.test.js — v0.62.899
//
// ⚠ THIS FILE WAS GREEN WHILE THE BUG IT GUARDS WAS LIVE. Read that before trusting it.
//
// v0.62.865 (below) pinned ONE line: `runInitialLoad`'s early return on `localeReloadRestored`.
// That line is still there and still correct. The operator reported the same bug again anyway —
// *"but I still see the search fired after I toggled the language"* — because **App.jsx has 21
// `runSearch(` call sites and the flag was consulted at one**. Two others fire automatically on
// a restored mount: the auto-detect country path (which sets `initialLoadFiredRef` itself, so it
// never reaches the boot guard) and the device/anchor coherence path (on a 1-second timer, so
// the restored list repaints and is overwritten a second later — what they were watching).
//
// (17 real call sites, measured after masking comments. My first count said 21 — a raw grep that
// counted two comment lines discussing `runSearch(state)` and the declaration itself. Corrected
// here rather than left standing, because a census whose own denominator is wrong is decoration.)
//
// So the census below replaces "the fix I made is still there" with **"no caller has been
// forgotten"**, which is the property that was actually violated. The old assertions are kept:
// they are still true and still worth holding.
//
// v0.62.865 —
// Operator: *"When I toggle the language, remove the code to refresh the search,
// just the refresh the google map."*
//
// That was a bug report. The locale reload stashes the results and restores them on
// mount, but `runInitialLoad()` then fired a full `runSearch` anyway and overwrote
// them — so every language toggle re-ran the search the stash existed to prevent.
//
// App.jsx cannot be imported and driven here (it is a 3,000-line component wired to
// Telegram, Google Maps and the network), so these are source assertions. That is a
// weaker check than executing it, and it is named as such — but the alternative is no
// check on a fix whose whole point is that a code path must NOT run.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'web/cuisine/src/v2/App.jsx'), 'utf8');

// Lifted verbatim from __tests__/bot-ternary-sweep.test.js. The census below counts
// `runSearch(` occurrences, and App.jsx DISCUSSES its own call sites in comments — two of them
// name `runSearch(state)` in prose. Scanning source that talks about the pattern being scanned
// for is the eighth self-referential-comment trap in this arc, so masking is now reflexive.
function maskComments(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}
const CODE = maskComments(SRC);

describe('a locale toggle re-languages the map without re-running the search', () => {
  it('gates runInitialLoad on the restore flag', () => {
    expect(SRC).toMatch(/if \(!userLoc \|\| initialSearchDone\.current \|\| localeReloadRestored\) return;/);
  });

  it('sets the flag when, and only when, a stash was actually restored', () => {
    const i = SRC.indexOf('const restored = takeStash();');
    expect(i, 'the restore effect is gone').toBeGreaterThan(-1);
    const block = SRC.slice(i, i + 400);
    // The early return must come BEFORE the flag, or a normal boot would suppress
    // its own first search and the app would open empty.
    expect(block.indexOf('if (!restored) return;'))
      .toBeLessThan(block.indexOf('localeReloadRestored = true;'));
  });

  // The v0.62.841 white-screen was a `const` read before its declaration. The restore
  // effect sits ABOVE `const initialSearchDone = useRef(false)`, which is exactly why
  // this flag is module-scoped rather than a ref.
  it('declares the flag before every use — no temporal dead zone', () => {
    const decl = SRC.indexOf('let localeReloadRestored = false;');
    expect(decl, 'the flag declaration is gone').toBeGreaterThan(-1);
    const uses = [...SRC.matchAll(/localeReloadRestored/g)].map((m) => m.index);
    expect(uses.length).toBeGreaterThanOrEqual(3);
    for (const u of uses) expect(u, 'a use precedes the declaration').toBeGreaterThanOrEqual(decl);
  });

  it('declares it at module scope, above the component', () => {
    expect(SRC.indexOf('let localeReloadRestored = false;'))
      .toBeLessThan(SRC.indexOf('export default function App()'));
  });

  // ── the census, v0.62.899 ──────────────────────────────────────────────────────────────
  // Every runSearch call site is either EXPLICIT (a user asked for it) or AUTOMATIC (it fires
  // on its own). Automatic ones must pass `auto: true` so `shouldSuppressAutoSearch` can see
  // them. A new automatic caller that forgets the flag is the one remaining failure mode, and
  // this is what catches it.
  //
  // Explicit sites are listed by the text that identifies them rather than by line number,
  // because line numbers in a 6,000-line file are a maintenance tax that buys nothing.
  const EXPLICIT = [
    'runSearch(state, { lat: sc.lat, lng: sc.lng, name: sc.name',  // 🔍 with a city just picked
    'runSearch(state)',                                             // 🔍 plain, and the ▶ next-batch props
    'runSearch(snap, anchor, { resetSeen: true })',                 // zero-result retry, inside runSearch
    'runSearch(state, null, { freeTextOverride: dish',              // ArrivalPlate dish tap
    'runSearch(state, null, { widen: next })',                      // widen toggle
    'runSearch(next)',                                              // filter change
    'runSearch(state, { lat: hit.lat, lng: hit.lng })',             // a search-result pick
    'runSearch(state, null, { resetSeen: true })',                  // ↺ Start over
  ];

  // A third category, and it needs naming rather than hiding in EXPLICIT: the two `boot: true`
  // calls are AUTOMATIC but are gated one level up, by runInitialLoad's own early return — the
  // v0.62.865 fix, which is correct and which this file still pins above. They do not carry
  // `auto: true` because they can never be reached while the flag is set.
  const GATED_BY_RUN_INITIAL_LOAD = ['{ boot: true }'];

  it('every AUTOMATIC runSearch caller passes auto:true', () => {
    // Two call sites fire without the user asking. Both must be suppressible.
    const auto = [
      "runSearch({ ...state, region: 'OTHER', countryPref: cc }, pt, { auto: true })",
      'runSearch(snap, { lat: userLoc.lat, lng: userLoc.lng }, { auto: true })',
    ];
    for (const call of auto) {
      expect(SRC, `this automatic caller does not opt in: ${call}`).toContain(call);
    }
    // …and the ungated forms must be gone, or the flag is decorative.
    expect(SRC, 'the auto-detect caller is ungated again')
      .not.toMatch(/runSearch\(\{ \.\.\.state, region: 'OTHER', countryPref: cc \}, pt\);/);
    expect(SRC, 'the coherence-timer caller is ungated again')
      .not.toMatch(/runSearch\(snap, \{ lat: userLoc\.lat, lng: userLoc\.lng \}\);/);
  });

  it('no runSearch call site is unaccounted for', () => {
    // The census proper. If someone adds a 22nd caller, it lands here and has to be classified
    // as explicit or automatic — which is a decision, made once, rather than an omission.
    const calls = [...CODE.matchAll(/runSearch\([^\n]*/g)]
      .map((m) => m[0])
      .filter((c) => !c.startsWith('runSearch(snap = state'));   // the declaration itself
    const unaccounted = calls.filter((c) =>
      !c.includes('auto: true')
      && !GATED_BY_RUN_INITIAL_LOAD.some((g) => c.includes(g))
      && !EXPLICIT.some((e) => c.includes(e)));
    expect(unaccounted, 'classify these as explicit (add to EXPLICIT) or automatic (pass auto:true)')
      .toEqual([]);
    // ⚠ AN EXACT COUNT, NOT A FLOOR, AND A MUTATION IS WHY. With `>= 17` the comment masking
    // above was decorative: removing it left the census green, because the two comment-borne
    // matches both contain `runSearch(state)` and were silently absorbed as "explicit". A census
    // that cannot tell code from prose is not a census. 17 is measured; adding a call site means
    // bumping it, which is the decision this file exists to force — the same reason
    // i18n-coverage.test.js hardcodes KEYS.length rather than asserting a floor.
    expect(calls.length, 'a runSearch call site was added or removed — classify it, then bump this')
      .toBe(17);
  });

  it('the gate is ONE decision, not a patch at each site', () => {
    // The v0.62.865 fix was correct and incomplete. Repeating it per-site would leave the next
    // caller free to forget, so the predicate lives in a module a test can CALL.
    expect(SRC).toMatch(/shouldSuppressAutoSearch\(\{ restored: localeReloadRestored, auto: opts\?\.auto \}\)/);
    expect(SRC).toContain("from '../../../_shared/lib/auto-search-gate.js'");
  });

  it('still reloads only when the injected map is actually stale', () => {
    // Unchanged, and worth pinning: most locale switches happen before any map
    // exists, and reloading then would be pure cost.
    expect(SRC).toMatch(/if \(!next \|\| !mapsLanguageIsStale\(next\)\) return;/);
  });
});
