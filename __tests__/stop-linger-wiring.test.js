// stop-linger-wiring.test.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md,
// part B, invariant I5.
//
// The stops vanished on a map tap for TWO reasons, and both had to go. The overlay's own map-click listener ended the
// station view (`exitStationDetail`), which cleared the stop pins; then the panel's tap handler called the controller's
// `closeInfo`, whose second branch cleared them again. Fixing only the first would have changed nothing on a phone.
// These checks read each of the three copies (comments masked) for the wiring; the timing itself is tested by calling the
// module, in stop-linger.test.js.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskComments } from './helpers/mask-comments.js';

const COPIES = {
  transport: 'web/transport/src/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
};
const SRC = Object.fromEntries(Object.entries(COPIES).map(([k, p]) => [k, maskComments(fs.readFileSync(path.join(process.cwd(), p), 'utf8'))]));

// The body of a function nested in the controller, from its line to the brace that closes it.
function inner(src, head) {
  const i = src.indexOf(head);
  if (i < 0) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') { depth++; started = true; } else if (c === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

describe.each(Object.keys(COPIES))('%s copy (I5)', (name) => {
  const src = SRC[name];

  it('imports the one shared linger and card watcher', () => {
    expect(src).toMatch(/import \{[^}]*\bcreateStopLinger\b[^}]*\bwatchInfoWindow\b[^}]*\} from '[./]+\/_shared\/lib\/stop-linger\.js';/);
  });

  it('builds the linger on the station stop pins, held by an open stop bubble', () => {
    expect(src).toMatch(/const stopLinger = createStopLinger\(\{[\s\S]{0,200}?onExpire:\s*\(\)\s*=>\s*clearStationBusStops\(\)/);
    expect(src).toMatch(/isHeld:\s*\(\)\s*=>\s*stationBusPins\.includes\(cardWatch\.anchor\(\)\)/);
    expect(src).toMatch(/const cardWatch = watchInfoWindow\(info,/);
    expect(src).toMatch(/onClose:\s*\(\)\s*=>\s*stopLinger\.bubbleClosed\(\)/);
  });

  it('ending the station view keeps the stops (the timer starts) and still drops the exit labels', () => {
    const body = inner(src, 'function exitStationDetail()');
    expect(body).toBeTruthy();
    expect(body).toMatch(/stopLinger\.close\(\);/);
    expect(body).not.toMatch(/clearStationBusStops\(\)/);
    expect(body).toMatch(/clearStationExitPins\(\);/);
  });

  it('tapping the same station again clears them at once', () => {
    const body = inner(src, 'function handleStationTap(item)');
    expect(body).toMatch(/if \(detailStation && detailStation\.name === s\.name\) \{\s*exitStationDetail\(\);\s*stopLinger\.clear\(\);\s*return;\s*\}/);
  });

  it('a station card drawing its stops takes them over from any lingering ones', () => {
    const body = inner(src, 'function showStationBusStops(rec)');
    expect(body).toMatch(/clearStationBusStops\(\);\s*stopLinger\.show\(\);/);
  });

  it('closeInfo\'s second branch no longer clears lingering stops', () => {
    const body = inner(src, '    closeInfo() {');
    expect(body).toBeTruthy();
    expect(body).toMatch(/if \(!stopLinger\.armed\(\)\) clearStationBusStops\(\);/);
    expect(body.replace(/if \(!stopLinger\.armed\(\)\) clearStationBusStops\(\);/, ''), 'no other clear').not.toMatch(/clearStationBusStops\(\)/);
  });

  it('turning on the Bus Stop layer clears them, through the linger', () => {
    expect(src).toMatch(/if \(name === 'busstop' && visible\) stopLinger\.clear\(\);/);
    expect(src).not.toMatch(/if \(name === 'busstop' && visible\) clearStationBusStops\(\);/);
  });

  it('destroy stops the timer', () => {
    const body = inner(src, '    destroy() {');
    expect(body).toMatch(/stopLinger\.destroy\(\);/);
  });
});
