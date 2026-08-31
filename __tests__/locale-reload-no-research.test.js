// locale-reload-no-research.test.js — v0.62.865
//
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

  it('still reloads only when the injected map is actually stale', () => {
    // Unchanged, and worth pinning: most locale switches happen before any map
    // exists, and reloading then would be pure cost.
    expect(SRC).toMatch(/if \(!next \|\| !mapsLanguageIsStale\(next\)\) return;/);
  });
});
