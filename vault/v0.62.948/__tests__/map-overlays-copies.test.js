// map-overlays-copies.test.js — v0.62.894
//
// THE HEADER WAS A LIE, IN ALL THREE COPIES, AND IT WAS A DANGEROUS ONE. Every
// copy of mapOverlays.js said "this file is byte-identical to …" and listed two
// paths. The files have three different checksums. Two of the copies listed
// THEMSELVES as the file they matched, so following the instruction — "edit all
// copies together", meaning copy one over another — would have deleted live code
// in whichever direction you went.
//
// A sync note that is wrong is worse than no note. It reads with the authority of
// documentation, and this repo treats its comments as documentation; the audit
// that found it had to checksum three files to disprove one sentence.
//
// So this file measures what is actually shared and pins it. The point is not to
// force the copies together — they diverge for good reasons — but to make the
// divergence VISIBLE and to make a false identity claim impossible to reintroduce.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const COPIES = {
  transport: 'web/transport/src/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
};
const SRC = Object.fromEntries(Object.entries(COPIES).map(([k, p]) => [k, readFileSync(join(ROOT, p), 'utf8')]));

/** Top-level bindings (function / const / let), each mapped to its source text. */
function bindings(src) {
  const L = src.split('\n');
  const out = new Map();
  for (let i = 0; i < L.length; i++) {
    const m = /^(?:export )?(?:async function|function|const|let) ([A-Za-z_$][\w$]*)\s*[=(]/.exec(L[i]);
    if (!m) continue;
    let j = i, depth = 0, started = false;
    for (; j < L.length; j++) {
      for (const c of L[j]) { if (c === '{') { depth++; started = true; } else if (c === '}') depth--; }
      if (started && depth <= 0) break;
      if (!started && /;\s*$/.test(L[j])) break;
    }
    out.set(m[1], L.slice(i, j + 1).join('\n'));
  }
  return out;
}

const B = Object.fromEntries(Object.entries(SRC).map(([k, s]) => [k, bindings(s)]));
const names = [...new Set(Object.values(B).flatMap((m) => [...m.keys()]))].sort();
const where = (n) => Object.keys(COPIES).filter((k) => B[k].has(n));

describe('no copy may claim an identity it does not have', () => {
  it.each(Object.entries(COPIES))('%s does not assert byte-identity', (name, path) => {
    const s = SRC[name];
    expect(s, 'the false claim must not come back').not.toMatch(/this file is byte-identical to/);
    expect(s, 'and it must say plainly that they are not').toMatch(/THREE COPIES, AND THEY ARE \*\*NOT\*\* BYTE-IDENTICAL/);
  });

  it('each copy names the OTHER two, never itself', () => {
    // The specific defect: transport's header listed transport, hawker's listed
    // hawker. A file that names itself as its own sync target is an instruction
    // that cannot be followed and looks like one that can.
    for (const [name, path] of Object.entries(COPIES)) {
      const head = SRC[name].slice(0, 3000);
      expect(head, `${name} must not list itself`).not.toContain(`//   ${path}`);
      for (const [other, otherPath] of Object.entries(COPIES)) {
        if (other === name) continue;
        expect(head, `${name} must list ${other}`).toContain(`//   ${otherPath}`);
      }
    }
  });

  it('the checksums really do differ — the claim was false, not merely stale', () => {
    const [t, h, c] = [SRC.transport, SRC.hawker, SRC.cuisine];
    expect(t).not.toBe(h);
    expect(h).not.toBe(c);
    expect(t).not.toBe(c);
  });
});

describe('what IS shared, measured and pinned', () => {
  it('the shape of the overlap is what the header says it is', () => {
    // Pinned so drift shows up as a diff in these numbers rather than as a
    // sentence quietly becoming untrue again. Update them deliberately.
    const inAll = names.filter((n) => where(n).length === 3);
    const identical = inAll.filter((n) => {
      const [a, b, c] = ['transport', 'hawker', 'cuisine'].map((k) => B[k].get(n));
      return a === b && b === c;
    });
    expect(names.length, 'total top-level bindings').toBe(87);
    expect(inAll.length, 'present in all three').toBe(71);
    expect(identical.length, 'byte-identical across all three').toBe(63);
  });

  it('the hawker overlay is in transport + cuisine and NOT in hawker — on purpose', () => {
    // The most counter-intuitive fact about these files, and the one most likely
    // to be "fixed" by someone copying a file over another. Hawker centres are
    // the Hawker app's own content; it does not draw them as a layer over
    // something else, so it does not carry the layer's helpers.
    const overlay = ['fetchHawkerCentres', 'hawkerCardHtml', 'openHawkerInfo', 'buildHawkerMarkers',
      'hawkerTier', 'hawkerCode', 'hawkerAbbrev', 'hawkerFacility', 'hawkerHead', 'hawkerShort'];
    for (const n of overlay) {
      expect(SRC.hawker, `${n} must stay OUT of the hawker copy`).not.toMatch(new RegExp(`\\b${n}\\b`));
      expect(SRC.transport, `${n} missing from transport`).toMatch(new RegExp(`\\b${n}\\b`));
      expect(SRC.cuisine, `${n} missing from cuisine`).toMatch(new RegExp(`\\b${n}\\b`));
    }
  });

  it('and the one region that IS held identical still is', () => {
    // station-card-labels.test.js owns this assertion; repeated here as a
    // cross-reference so a reader of THIS file learns the exception exists.
    const region = (s) => s.slice(s.indexOf('function stationInfoCardHtml(rec, lang)'), s.indexOf('function busArrivalRows('));
    const [t, h, c] = [SRC.transport, SRC.hawker, SRC.cuisine].map(region);
    expect(t.length).toBeGreaterThan(3000);
    expect(h).toBe(t);
    expect(c).toBe(t);
  });
});
