// stop-linger.test.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md,
// part B, invariant I4; and the card watcher parts B and D share.
//
// Operator, 22-11 '26: "when user click out of the station card, the bus stops related to the station should still be
// there until 3 minutes later". Asked whether that would overwhelm users, they approved four rules ("2. Yes"):
//   - opening another station replaces the stops;
//   - tapping the same station again clears them at once;
//   - turning on the Bus Stop layer clears them;
//   - otherwise they go 3 minutes after the card closes (the exit labels still go with the card).
// The spec adds one guard of its own: the 3 minutes never remove a stop whose bubble is open; they wait for it to close.
//
// All of it is one module, used by the three overlay copies. A fake clock drives it, so nothing here waits 3 minutes.
import { describe, it, expect, beforeEach } from 'vitest';
import { createStopLinger, LINGER_MS, watchInfoWindow } from '../web/_shared/lib/stop-linger.js';

function fakeClock() {
  let t = 0;
  let id = 0;
  const timers = new Map();
  return {
    schedule: (fn, ms) => { const h = ++id; timers.set(h, { fn, at: t + ms }); return h; },
    cancel: (h) => { timers.delete(h); },
    advance(ms) {
      const end = t + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        t = next[1].at;
        next[1].fn();
      }
      t = end;
    },
    pending: () => timers.size,
  };
}

describe('the linger (I4)', () => {
  let clock, expired, held, linger;
  beforeEach(() => {
    clock = fakeClock();
    expired = 0;
    held = false;
    linger = createStopLinger({ schedule: clock.schedule, cancel: clock.cancel, onExpire: () => { expired++; }, isHeld: () => held });
  });

  it('is 3 minutes', () => {
    expect(LINGER_MS).toBe(180000);
  });

  it('closing the card keeps the stops; they go at 180 s, not before', () => {
    linger.show();
    linger.close();
    expect(linger.armed()).toBe(true);
    clock.advance(179999);
    expect(expired).toBe(0);
    clock.advance(1);
    expect(expired).toBe(1);
    expect(linger.armed()).toBe(false);
  });

  it('opening another station replaces them: the old timer stops and the new card owns the stops', () => {
    linger.show();
    linger.close();
    clock.advance(60000);
    linger.show();
    clock.advance(180000);
    expect(expired, 'no expiry while a station card is open').toBe(0);
    expect(clock.pending()).toBe(0);
  });

  it('tapping the same station again, or turning on the Bus Stop layer, clears them at once', () => {
    linger.show();
    linger.close();
    linger.clear();
    expect(expired).toBe(1);
    expect(clock.pending(), 'and leaves no timer behind').toBe(0);
    clock.advance(180000);
    expect(expired).toBe(1);
  });

  it('a second close does not move the deadline', () => {
    linger.show();
    linger.close();
    clock.advance(100000);
    linger.close();
    clock.advance(80000);
    expect(expired).toBe(1);
  });

  it('a stop whose bubble is open at 180 s stays until the bubble closes', () => {
    linger.show();
    linger.close();
    held = true;
    clock.advance(180000);
    expect(expired).toBe(0);
    expect(linger.armed(), 'still waiting').toBe(true);
    linger.bubbleClosed();
    expect(expired, 'a bubble closing while another is held changes nothing').toBe(0);
    held = false;
    linger.bubbleClosed();
    expect(expired).toBe(1);
  });

  it('a bubble closing before the deadline does not cut it short', () => {
    linger.show();
    linger.close();
    linger.bubbleClosed();
    expect(expired).toBe(0);
    clock.advance(180000);
    expect(expired).toBe(1);
  });

  it('destroy cancels the timer and clears nothing (the map clears its own pins)', () => {
    linger.show();
    linger.close();
    linger.destroy();
    clock.advance(180000);
    expect(expired).toBe(0);
    expect(clock.pending()).toBe(0);
  });
});

describe('the card watcher (B and D)', () => {
  function fakeInfo() {
    const calls = [];
    const listeners = {};
    return {
      calls,
      open(...a) { calls.push(['open', ...a]); return 'opened'; },
      close(...a) { calls.push(['close', ...a]); return 'closed'; },
      addListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
      fire(ev) { for (const fn of listeners[ev] || []) fn(); },
    };
  }

  it('reports open once, keeps the anchor, and still does what open and close did', () => {
    const info = fakeInfo();
    const seen = [];
    let closes = 0;
    const w = watchInfoWindow(info, { onChange: (v) => seen.push(v), onClose: () => { closes++; } });
    const map = {}; const pinA = { id: 'A' }; const pinB = { id: 'B' };
    expect(info.open(map, pinA)).toBe('opened');
    expect(info.calls[0]).toEqual(['open', map, pinA]);
    expect(w.isOpen()).toBe(true);
    expect(w.anchor()).toBe(pinA);
    info.open(map, pinB);
    expect(w.anchor(), 'a second card moves the anchor').toBe(pinB);
    expect(seen, 'but opening while open is not a new open').toEqual([true]);
    expect(info.close()).toBe('closed');
    expect(w.isOpen()).toBe(false);
    expect(w.anchor()).toBe(null);
    expect(seen).toEqual([true, false]);
    expect(closes).toBe(1);
  });

  it('the options form of open names its anchor too', () => {
    const info = fakeInfo();
    const w = watchInfoWindow(info);
    const pin = {};
    info.open({ map: {}, anchor: pin });
    expect(w.anchor()).toBe(pin);
  });

  it('a close Google makes on its own (its close event) is seen as well, once', () => {
    const info = fakeInfo();
    const seen = [];
    watchInfoWindow(info, { onChange: (v) => seen.push(v) });
    info.open({}, {});
    info.fire('close');
    info.fire('close');
    expect(seen).toEqual([true, false]);
  });

  it('closing a card that is not open reports nothing new', () => {
    const info = fakeInfo();
    const seen = [];
    watchInfoWindow(info, { onChange: (v) => seen.push(v) });
    info.close();
    expect(seen).toEqual([]);
  });
});
