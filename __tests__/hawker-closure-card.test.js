// The Hawker card answers Open/Closed → Next Closure → Major Works and Size → Profile → Nearby.
//
// WHAT THIS GUARDS. The operator audited the card against two chains and the answer was that most
// of it was a PLUMBING gap, not a data gap — every missing field was already sitting in
// `data/hawker-closures.json` or the CSV behind it, and nothing asked for it:
//
//   · 204 future closure windows reached the client and none rendered (activeClosure only ever
//     speaks while a centre is shut TODAY — 4 of 123)
//   · `marketStalls` measured on 83 of 123 and never forwarded, so market-and-food centres read
//     at roughly half their size
//   · `description_myenv` populated for 123 of 123 and dropped by the builder, so the card's only
//     answer to "what IS this place" was `status`, which reads "Existing" for 108 of them
//   · nearestByDistance / shortDist / nearbyCentreNode all existed and tested in temp-pin.js, and
//     nearbyCentreNode was never called from anywhere
//
// ⚠ BEFORE THIS FILE THERE WERE ZERO TESTS for closure.js, for the card's field set, or for
// hawkerPinNode. The one closure-adjacent assertion in the suite (hawker-vault.test.js:52) only
// checks that a redevelopment ROW survives parsing.
//
// ⚠ AND THE ASSERTIONS RUN AGAINST THE SHIPPED DATA, not fixtures alone. A fixture proves the
// function; only the real 123 records prove the feature reaches users — which is how the 9-centre
// join gap below was found at all.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

import { activeClosure, nextClosure, closureTill, closureFrom, CLOSURE_PIN_COLOR, CLOSURE_TAB_BG }
  from '../web/hawker/src/closure.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CLOSURES = JSON.parse(read('data/hawker-closures.json'));
const CENTRES = Object.values(CLOSURES);
const APP = read('web/hawker/src/App.jsx');
const PANEL = read('web/hawker/src/components/HawkerMapPanel.jsx');

const KINDS = ['cleaning', 'renovation', 'redevelopment'];

describe('nextClosure — the window still ahead', () => {
  it('⚠ the shipped data actually has something to show', () => {
    // If this ever drops to zero the feature is invisible and every other test here still passes,
    // because they would all be vacuously true of nothing.
    expect(CENTRES.length, 'the closure dataset changed size').toBe(123);
    const withNext = CENTRES.filter((c) => nextClosure(c)).length;
    expect(withNext, 'no centre has an upcoming closure — the 2026 windows have all expired')
      .toBeGreaterThan(50);
  });

  it('returns null while a window is active — that is activeClosure\'s job', () => {
    const c = { cleaning: [{ start: iso(-1), end: iso(+1) }], renovation: [], redevelopment: [] };
    expect(activeClosure(c)).not.toBeNull();
    expect(nextClosure(c), 'today-or-past leaked into the upcoming query').toBeNull();
  });

  it('picks the SOONEST future window regardless of kind', () => {
    const c = {
      cleaning: [{ start: iso(+10), end: iso(+10) }],
      renovation: [{ start: iso(+5), end: iso(+40) }],
      redevelopment: [],
    };
    // A cleaning day next week matters more to a diner than a renovation the month after, so
    // "soonest" beats the redevelopment > renovation > cleaning severity order here.
    expect(nextClosure(c).kind).toBe('renovation');
    expect(nextClosure(c).start).toBe(iso(+5));
  });

  it('breaks a same-day tie by severity', () => {
    const c = {
      cleaning: [{ start: iso(+7), end: iso(+7) }],
      renovation: [{ start: iso(+7), end: iso(+30) }],
      redevelopment: [],
    };
    expect(nextClosure(c).kind).toBe('renovation');
  });

  it('returns null when every window is in the past, and survives junk', () => {
    expect(nextClosure({ cleaning: [{ start: '2020-01-01', end: '2020-01-02' }] })).toBeNull();
    expect(nextClosure(null)).toBeNull();
    expect(nextClosure({})).toBeNull();
    expect(nextClosure({ cleaning: [null, {}, { start: 'nonsense' }] })).toBeNull();
  });

  it('carries `start`, which activeClosure does not, and formats it like an end', () => {
    const c = { cleaning: [{ start: iso(+3), end: iso(+3) }] };
    const n = nextClosure(c);
    expect(n).toHaveProperty('start');
    expect(n).toHaveProperty('end');
    expect(n).toHaveProperty('kind');
    // closureFrom is closureTill under another name, deliberately — two formatters would drift.
    expect(closureFrom).toBe(closureTill);
    expect(closureFrom(n.start)).toBe(closureTill(n.start));
  });

  it('every kind has both a pin colour and a tab background', () => {
    for (const k of KINDS) {
      expect(CLOSURE_PIN_COLOR[k], `${k} has no pin colour`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(CLOSURE_TAB_BG[k], `${k} has no tab background`).toBeTruthy();
    }
  });
});

describe('the data the card needs actually ships', () => {
  it('description is carried through the builder for every centre', () => {
    const withDesc = CENTRES.filter((c) => c.description && c.description.length > 20);
    expect(withDesc.length, 'the builder dropped description_myenv again').toBe(123);
    // NEA's source has double spaces after full stops; the builder squeezes them.
    expect(CENTRES.every((c) => !/\s{2,}/.test(c.description || '')), 'unsqueezed whitespace').toBe(true);

    // ⚠ AND THE BUILDER ITSELF, because the assertions above read the GENERATED file. A mutation
    // deleting `description` from scripts/build-hawker-closures.js SURVIVED them: the committed
    // JSON still had the field, so the suite stayed green and the loss would have appeared only
    // on the next regeneration — silently, and far from the change that caused it. Watching the
    // output without watching the thing that produces it is the same defect this repo has now
    // found six times in one session.
    const builder = read('scripts/build-hawker-closures.js');
    expect(builder, 'the builder no longer reads description_myenv').toContain("col('description_myenv')");
    expect(builder, 'the builder no longer emits description').toMatch(/description:\s*description \|\| null/);
  });

  it('marketStalls survives, and is not simply a copy of foodStalls', () => {
    const withMarket = CENTRES.filter((c) => Number.isFinite(c.marketStalls) && c.marketStalls > 0);
    expect(withMarket.length, 'marketStalls vanished from the build').toBeGreaterThan(60);
    // If a bad join ever aliased the two, every centre would report identical counts.
    const differ = withMarket.filter((c) => c.marketStalls !== c.foodStalls).length;
    expect(differ, 'marketStalls mirrors foodStalls — the columns were crossed').toBeGreaterThan(50);
  });

  it('the API forwards the three fields the card reads', () => {
    const idx = read('index.js');
    for (const f of ['marketStalls:', 'description:', 'closures:']) {
      expect(idx, `the hawker API stopped forwarding ${f}`).toContain(f);
    }
  });

  it('⚠ KNOWN GAP: the vault join misses nine centres, and this pins the number', () => {
    // Nine multi-block centres ("Blks 79/79A Circuit Road") carry a name the NEA CSV writes the
    // other way round ("Circuit Road Blk 79/79A"), and no postal match rescues them — so they get
    // no closures, no description and no market stalls however good the rendering is. This is
    // PRE-EXISTING and not fixed here; it is pinned so that fixing it is a deliberate act and
    // regressing it further is loud. See the journal entry for the full list.
    const vault = require(path.join(ROOT, 'hawker-vault.js'));
    const all = vault.getAllCentres();
    expect(all.length).toBe(123);
    const missing = all.filter((c) => !c.closures).map((c) => c.name).sort();
    expect(missing.length, 'the join hit rate moved — bump this deliberately').toBe(9);
    // Every one of them is a multi-block centre; that IS the pattern, and naming it is the point.
    expect(missing.every((n) => /blks?\s/i.test(n) || /Chong Pang/i.test(n)),
      'the misses are no longer all multi-block — the cause changed').toBe(true);
  });
});

describe('the card and the map render what the audit asked for', () => {
  it('the card shows the upcoming closure, and only when not already closed', () => {
    expect(APP).toContain('const upcoming = closure ? null : nextClosure(c.closures);');
    for (const k of ['hawker.nextCleaning', 'hawker.nextRenovation', 'hawker.nextRedevelopment']) {
      expect(APP, `${k} is not rendered`).toContain(k);
    }
  });

  it('the card shows food AND market stalls, the description, and nearby centres', () => {
    expect(APP).toContain('hawker.stallsBoth');
    expect(APP).toContain('c.description');
    expect(APP).toContain('nearestByDistance');
    expect(APP).toContain('hawker.nearby');
    // Nearby must not be scoped to the active region — the nearest alternative at a boundary is
    // routinely in the next one, which is exactly when a closed centre makes it matter.
    expect(APP).toContain('allCentresFlat');
    expect(APP).toMatch(/regionList\.flatMap/);
  });

  it('⚠ the map popup no longer hides the stall count behind status', () => {
    // Was `if (c.status) … else if (stalls)`, and status is "Existing" on 123 of 123, so the
    // stall count never rendered. The `else` is what made it dead code.
    expect(PANEL).not.toMatch(/\}\s*else if \(Number\.isFinite\(c\.stalls\)/);
    expect(PANEL).toContain('const popActive = activeClosure(c.closures);');
    expect(PANEL).toContain('const popNext = popActive ? null : nextClosure(c.closures);');
  });

  it('⚠ the pin distinguishes closed-now from closing-soon by CHANNEL, not just colour', () => {
    expect(PANEL).toContain('function hawkerPinNode(isNew, number, hasBib, closureKind, upcomingKind)');
    // Upcoming = a ring; closed-now = a fill plus the CLOSE badge. If `soonColor` ever fed the
    // background instead, the two states would be indistinguishable at a glance.
    expect(PANEL).toContain('const soonColor = (!closeColor && upcomingKind)');
    expect(PANEL).toMatch(/box-shadow:0 0 0 2px \$\{soonColor\}/);
    expect(PANEL).not.toMatch(/background:\$\{soonColor/);
    expect(PANEL).toContain('nextClosure(c.closures)?.kind || null');
  });

  it('every new string exists in all nine locales', () => {
    const src = read('web/hawker/src/i18n.js');
    // ⚠ KO_STRINGS quotes its keys with DOUBLE quotes where every other block uses single. A
    // single-quote-only extractor reports the Korean block as empty — measured, twice, today.
    const KEY = /^\s*['"]([^'"]+)['"]\s*:/gm;
    const blocks = [['en/fr', 'const STRINGS = {', 'const ID_STRINGS'], ['id', 'const ID_STRINGS', 'const RU_STRINGS'],
      ['ru', 'const RU_STRINGS', 'const DE_STRINGS'], ['de', 'const DE_STRINGS', 'const ZH_STRINGS'],
      ['zh', 'const ZH_STRINGS', 'const JA_STRINGS'], ['ja', 'const JA_STRINGS', 'const ES_STRINGS'],
      ['es', 'const ES_STRINGS', 'const KO_STRINGS'], ['ko', 'const KO_STRINGS', null]];
    const NEW = ['hawker.nextCleaning', 'hawker.nextRenovation', 'hawker.nextRedevelopment',
      'hawker.nearby', 'hawker.stallsBoth'];
    const gaps = [];
    for (const [name, a, b] of blocks) {
      const seg = src.slice(src.indexOf(a), b ? src.indexOf(b) : src.length);
      const keys = new Set([...seg.matchAll(KEY)].map((m) => m[1]));
      expect(keys.size, `${name} block parsed as empty — check the quoting`).toBeGreaterThan(50);
      for (const k of NEW) if (!keys.has(k)) gaps.push(`${name}.${k}`);
    }
    expect(gaps, 'a new hawker string landed half-translated').toEqual([]);
  });
});

/** ISO date `n` days from today, so the fixtures never expire the way a hardcoded 2026 date would. */
function iso(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
