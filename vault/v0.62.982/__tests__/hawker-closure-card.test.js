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

import { activeClosure, nextClosure, closureTill, closureFrom, closureKey, CLOSURE_PIN_COLOR, CLOSURE_TAB_BG }
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

  it('⚠ the vault join now reaches all 123 — it reached 114', () => {
    // NINE multi-block centres used to join to nothing and so carried no closures, no description
    // and no market stalls however good the rendering was: "Blks 79/79A Circuit Road",
    // "Blks 13/14 Haig Road", "Blks 91/92 Whampoa Drive" and six more. NEA writes them the other
    // way round ("Circuit Road Blk 79/79A"), which loadClosures' own comment already warned about.
    //
    // ⚠ SORTING THE TOKENS RESOLVED ONLY THREE OF THE NINE — measured before it was written, which
    // is why it was not written. Chong Pang is "Yishun Ring Road Blk 104/105 (Chong Pang Market and
    // Food Centre)" in the CSV: a different street with the real name in parentheses. Containment
    // resolves all nine, each to exactly one record.
    const vault = require(path.join(ROOT, 'hawker-vault.js'));
    const all = vault.getAllCentres();
    expect(all.length).toBe(123);
    const missing = all.filter((c) => !c.closures).map((c) => c.name).sort();
    expect(missing, 'a centre lost its closure join').toEqual([]);
    expect(all.filter((c) => c.description).length, 'a centre lost its description').toBe(123);
    // ⚠ AND NOT VACUOUSLY: the nine must carry the RIGHT record, not merely A record. Each of
    // these descriptions names its own blocks or its own landmark, so the data self-verifies.
    const by = (n) => all.find((c) => c.name === n);
    expect(by('Blks 13/14 Haig Road').description).toMatch(/Haig Road/);
    expect(by('Blks 91/92 Whampoa Drive').description).toMatch(/Whampoa/);
    expect(by('Chong Pang Market & Food Centre').description).toMatch(/Chong Pang/);
    expect(by('Blks 2 & 3 Changi Village Road').description).toMatch(/Changi/);
    // The market-stall counts came with them, which is the other half of the gap.
    expect(by('Chong Pang Market & Food Centre').marketStalls).toBe(123);
    expect(by('Blks 13/14 Haig Road').marketStalls).toBe(79);
  });

  it('⚠ the containment fallback refuses to guess', () => {
    // The reason findByName's edit-distance was deliberately avoided in this file (Jurong West 505
    // → Jurong West Hawker Centre) applies here too: a fuzzy join that picks A candidate rather
    // than THE candidate is worse than no join, because a wrong closure date is worse than none.
    const vault = read('hawker-vault.js');
    expect(vault, 'the ambiguity refusal is gone').toContain('if (hit) return null;');
    expect(vault, 'the two-token floor is gone').toContain('if (want.length < 2) return null;');
    // And it runs LAST — exact, postal and normalised all get first refusal, so it cannot
    // displace a join that already worked. Measured when it landed: 114 unchanged, 9 gained,
    // 0 altered.
    const merge = vault.slice(vault.indexOf('const closures = loadClosures();'));
    expect(merge.indexOf('closures.byPostal[')).toBeLessThan(merge.indexOf('_containMatch(c.name'));
    expect(merge.indexOf('closures.normalised[norm]')).toBeLessThan(merge.indexOf('_containMatch(c.name'));
  });
});

describe('⚠ partly open — the card used to say CLOSED while stalls were trading', () => {
  it('the shipped data carries the partial remarks, and only the right ones', () => {
    const partials = [];
    for (const [name, c] of Object.entries(CLOSURES)) {
      for (const k of KINDS) for (const w of (c[k] || [])) if (w.partial) partials.push({ name, k, w });
    }
    // Measured: 7 windows across 3 centres. A floor rather than an exact count would let the
    // parser quietly stop finding them; an exact count makes a data refresh a deliberate bump.
    expect(partials.length, 'the partial-window count moved — bump this deliberately').toBe(7);
    expect(new Set(partials.map((p) => p.name)).size).toBe(3);
    // Every one carries NEA's own prose, not a flag.
    expect(partials.every((p) => typeof p.w.partial === 'string' && p.w.partial.length > 15)).toBe(true);
  });

  it('"Both closed" is NOT partial, in the shipped data', () => {
    // Circuit Road's Q2 remark reads "Both closed from 22 June to 23 June 2026": same centre, same
    // shape, opposite meaning. Marking it partial would tell a reader the place is open when it is
    // shut, which is the worse of the two errors.
    const cr = CLOSURES['Circuit Road Blk 79/79A'];
    expect(cr, 'the Circuit Road key changed').toBeTruthy();
    const both = cr.cleaning.find((w) => w.start === '2026-06-22');
    expect(both, 'the June window vanished').toBeTruthy();
    expect(both.partial, '"Both closed" was misread as partial').toBeFalsy();
    // …while its neighbours in the same array ARE partial.
    expect(cr.cleaning.filter((w) => w.partial).length).toBe(3);
  });

  it('⚠ the PARSER is tested directly, because the data alone cannot hold it', () => {
    // A mutation deleting the "both closed" guard SURVIVED the assertion above, and the reason is
    // worth writing down rather than patching over: NEA's current phrasing names no blocks, so the
    // two-block floor already rejects it and the guard never runs. The guard is defence against a
    // phrasing NEA has NOT used yet — and a test that only reads today's 123 rows cannot see the
    // difference between a rule that works and a rule that is unreachable.
    const { partialFrom } = require(path.join(ROOT, 'scripts/build-hawker-closures.js'));
    // Partial: two separately-dated blocks, or something explicitly staying open.
    expect(partialFrom('Blk 79 closed on 30/3/2026, Blk 79A closed on 31/3/2026.')).toBeTruthy();
    expect(partialFrom('Only Cooked Food Section is closed for Gas Works.  Market is open and business as usual.')).toBeTruthy();
    // NOT partial — and this is the case the guard exists for. Two blocks ARE named, so the floor
    // passes; only the word "both" stops it being read as a split.
    expect(partialFrom('Blk 79 and Blk 79A both closed on 30/3/2026'),
      'the "both closed" guard is gone — a full closure would read as partly open').toBeNull();
    // Not partial, and not through the guard: no blocks, nothing staying open.
    expect(partialFrom('Both closed from 22 June to 23 June 2026')).toBeNull();
    expect(partialFrom('Repairs and Redecoration')).toBeNull();
    expect(partialFrom('nil')).toBeNull();
    expect(partialFrom('')).toBeNull();
    expect(partialFrom(null)).toBeNull();
    // It returns NEA's own words, not a boolean — the card renders them verbatim.
    expect(typeof partialFrom('Blk 1 closed on 1/1/2026, Blk 2 closed on 2/1/2026')).toBe('string');
  });

  it('the gas-works renovation is partial too — the market stays open', () => {
    const b = Object.entries(CLOSURES).find(([n]) => /Bendemeer/.test(n));
    expect(b, 'the Bendemeer row vanished').toBeTruthy();
    const w = (b[1].renovation || []).find((x) => x.partial);
    expect(w, 'the gas-works window lost its partial flag').toBeTruthy();
    expect(w.partial).toMatch(/Market is open/i);
  });

  it('closureKey routes partial ahead of the works kind, and both colours exist', () => {
    expect(closureKey({ kind: 'cleaning', partial: 'Blk 13 closed…' })).toBe('partial');
    expect(closureKey({ kind: 'renovation', partial: 'Only Cooked Food…' })).toBe('partial');
    expect(closureKey({ kind: 'cleaning', partial: null })).toBe('cleaning');
    expect(closureKey(null)).toBeNull();
    expect(CLOSURE_PIN_COLOR.partial).toMatch(/^#[0-9a-f]{6}$/i);
    expect(CLOSURE_TAB_BG.partial).toBeTruthy();
    // …and partial must not collide with any works colour, or the state is invisible.
    for (const k of KINDS) expect(CLOSURE_PIN_COLOR.partial).not.toBe(CLOSURE_PIN_COLOR[k]);
  });

  it('activeClosure and nextClosure both carry `partial` through', () => {
    const win = { start: iso(-1), end: iso(+1), partial: 'Blk 1 closed today' };
    expect(activeClosure({ cleaning: [win] }).partial).toBe('Blk 1 closed today');
    const soon = { start: iso(+4), end: iso(+5), partial: 'Blk 2 closed then' };
    expect(nextClosure({ cleaning: [soon] }).partial).toBe('Blk 2 closed then');
    // absent → null, never undefined, so a caller can test it without optional chaining
    expect(activeClosure({ cleaning: [{ start: iso(-1), end: iso(+1) }] }).partial).toBeNull();
  });

  it('⚠ the pin says PART, not CLOSE — colour never carries the state alone', () => {
    expect(PANEL).toContain("closureKind === 'partial' ? 'PART'");
  });

  it('the card renders NEA\'s remark verbatim rather than paraphrasing it', () => {
    expect(APP).toContain('{closure.partial}');
    expect(APP).toContain("'hawker.partlyOpen'");
    expect(APP).toContain("'hawker.partlyOpenNext'");
  });
});

describe('the profile extras reach the card', () => {
  it('every centre has a photo, and every URL is https', () => {
    const withPhoto = CENTRES.filter((c) => c.photo);
    expect(withPhoto.length, 'photos vanished from the build').toBe(123);
    // ⚠ 88 of the 123 arrive from NEA as http://, and the Mini App is served over HTTPS — a
    // browser blocks those as mixed content, so they would silently never load. The builder
    // upgrades the scheme on the pinned nea.gov.sg host; four were fetched over https and
    // returned 200 before that line was written.
    const insecure = withPhoto.filter((c) => /^http:/i.test(c.photo));
    expect(insecure.map((c) => c.photo), 'an http:// photo would be blocked as mixed content').toEqual([]);
    expect(withPhoto.every((c) => /^https:\/\/www\.nea\.gov\.sg\//i.test(c.photo))).toBe(true);
  });

  it('mgmt is forwarded and is genuinely informative, not a constant', () => {
    const vault = require(path.join(ROOT, 'hawker-vault.js'));
    const all = vault.getAllCentres();
    expect(all.filter((c) => c.mgmt).length).toBe(123);
    // If it were "NEA" for all 123 the line would be noise. Measured: 20 distinct operators, and
    // NEA itself runs only 27 — the rest are town councils and social enterprises.
    const distinct = new Set(all.map((c) => c.mgmt));
    expect(distinct.size, 'mgmt collapsed to a constant — the line stops earning its space')
      .toBeGreaterThan(10);
    const idx = read('index.js');
    expect(idx, 'the API stopped forwarding mgmt').toContain('mgmt: c.mgmt || null,');
    expect(idx, 'the API stopped forwarding photo').toContain('photo: c.photo || null,');
  });

  it('the mgmt line follows the operator\'s spec: own line, bracketed, italic, one size down', () => {
    // Operator, verbatim: "in another line (italian bracket in smaller by one font size, not black
    // font colour unless is white background) as it may confuse the foreigner to read this".
    expect(APP).toContain("tn('hawker.managedBy', lang, { m: c.mgmt })");
    expect(APP).toMatch(/text-\[10px\] text-tg-hint italic/);
    // The surrounding description is 11px, so 10px IS one size down rather than an absolute guess.
    expect(APP).toContain('text-[11px] text-tg-hint leading-snug">{c.description}');
  });

  it('the photo degrades rather than leaving a broken frame', () => {
    expect(APP).toContain('loading="lazy"');
    expect(APP).toMatch(/onError=\{\(e\) => \{ e\.currentTarget\.style\.display = 'none'; \}\}/);
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
    // v0.62.914 — now routed through closureKey(), so a partly-open centre reaches the amber
    // colour without the pin having to know what `partial` means.
    expect(PANEL).toContain('closureKey(nextClosure(c.closures))');
    expect(PANEL).toContain('closureKey(activeClosure(c.closures))');
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
