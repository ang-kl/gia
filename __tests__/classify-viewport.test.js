// __tests__/classify-viewport.test.js — v0.62.622
//
// The pure device/orientation classifier behind use-viewport.js. Regression
// anchor for the operator's Telegram-Desktop bug ("Cuisine stuck at expand mode
// … size and card looks weird"): a narrow desktop mini-app window on a
// touchscreen laptop (coarse pointer + large physical monitor) must NOT be
// promoted to the wide 'tablet' layout — while a real iPad whose webview is
// collapsed to partial height (wide width, short height) MUST stay 'tablet'.

import { describe, it, expect } from 'vitest';
import { classifyViewport, TABLET_MIN_EDGE, COMPACT_MAX_WIDTH, SHORT_MAX_HEIGHT } from '../web/_shared/lib/classify-viewport.js';

describe('classifyViewport', () => {
  it('keeps a narrow Telegram-Desktop window on a touchscreen laptop as mobile', () => {
    // ~500px window, coarse pointer (touchscreen), 1920x1080 monitor.
    const r = classifyViewport({ w: 500, h: 730, coarse: true, screenMin: 1080 });
    expect(r.deviceClass).toBe('mobile');
    expect(r.isWide).toBe(false);
  });

  it('keeps a real iPad collapsed to partial HEIGHT as tablet (width stays wide)', () => {
    // iPad mini webview squeezed short (h=420) but still 744px wide; screen 744.
    const r = classifyViewport({ w: 744, h: 420, coarse: true, screenMin: 744 });
    expect(r.deviceClass).toBe('tablet');
    expect(r.isWide).toBe(true);
    expect(r.orientation).toBe('landscape'); // w >= h
  });

  it('classifies a full-size tablet by its live short edge', () => {
    expect(classifyViewport({ w: 834, h: 1194, coarse: true, screenMin: 834 }).deviceClass).toBe('tablet');
    expect(classifyViewport({ w: 1080, h: 810, coarse: true, screenMin: 834 }).deviceClass).toBe('tablet');
  });

  it('classifies a fine-pointer wide screen as desktop, narrow as mobile', () => {
    expect(classifyViewport({ w: 1280, h: 800, coarse: false, screenMin: 1080 }).deviceClass).toBe('desktop');
    expect(classifyViewport({ w: 900, h: 700, coarse: false, screenMin: 1080 }).deviceClass).toBe('mobile');
  });

  it('classifies phones as mobile', () => {
    expect(classifyViewport({ w: 390, h: 844, coarse: true, screenMin: 390 }).deviceClass).toBe('mobile');
    expect(classifyViewport({ w: 430, h: 932, coarse: true, screenMin: 430 }).deviceClass).toBe('mobile');
  });

  it('reports orientation from width vs height', () => {
    expect(classifyViewport({ w: 800, h: 600, coarse: false }).orientation).toBe('landscape');
    expect(classifyViewport({ w: 600, h: 800, coarse: false }).orientation).toBe('portrait');
  });

  it('degrades safely on empty input', () => {
    const r = classifyViewport();
    expect(r.deviceClass).toBe('mobile');
    expect(r.isWide).toBe(false);
  });

  it('exposes the tablet edge constant', () => {
    expect(TABLET_MIN_EDGE).toBe(700);
  });

  // v0.62.678 — compact-phone tier (operator's iPhone 11 Pro typography audit).
  it('flags a compact phone (iPhone 11 Pro / SE / mini, <=390px short edge) as isCompact', () => {
    expect(classifyViewport({ w: 375, h: 812, coarse: true, screenMin: 375 }).isCompact).toBe(true);
    expect(classifyViewport({ w: 375, h: 667, coarse: true, screenMin: 375 }).isCompact).toBe(true);
    // landscape: short edge is still 375, so still compact.
    expect(classifyViewport({ w: 812, h: 375, coarse: true, screenMin: 375 }).isCompact).toBe(true);
  });

  it('does NOT flag a larger phone (iPhone 15/16 Pro / Pro Max) as isCompact', () => {
    expect(classifyViewport({ w: 393, h: 852, coarse: true, screenMin: 393 }).isCompact).toBe(false);
    expect(classifyViewport({ w: 430, h: 932, coarse: true, screenMin: 430 }).isCompact).toBe(false);
  });

  it('never flags tablet/desktop as isCompact, and a merely-narrow mobile window over 390px stays false too', () => {
    // narrow Telegram-Desktop window on a touchscreen laptop — stays 'mobile' per
    // the existing rule above (500px short edge is well over the 390px compact
    // ceiling, so this is "a narrow window", not "a compact phone").
    const desktopWindow = classifyViewport({ w: 500, h: 730, coarse: true, screenMin: 1080 });
    expect(desktopWindow.deviceClass).toBe('mobile');
    expect(desktopWindow.isCompact).toBe(false);
    expect(classifyViewport({ w: 834, h: 1194, coarse: true, screenMin: 834 }).isCompact).toBe(false); // tablet
    expect(classifyViewport({ w: 1280, h: 800, coarse: false, screenMin: 1080 }).isCompact).toBe(false); // desktop
  });

  it('exposes the compact-phone width constant', () => {
    expect(COMPACT_MAX_WIDTH).toBe(390);
  });

  it('degrades safely on empty input (isCompact false, not true)', () => {
    expect(classifyViewport().isCompact).toBe(false);
  });
});

// v0.62.684 — the `isShort` vertical-room flag behind the carousel card's
// reduced row set. The point of the tier is that it is NOT "landscape": an iPad
// mini in landscape is still 744px tall and must keep the full card.
describe('isShort (vertical room)', () => {
  const phone = (w, h) => classifyViewport({ w, h, coarse: true, screenMin: Math.min(w, h) });
  const tablet = (w, h) => classifyViewport({ w, h, coarse: true, screenMin: 744 });

  it('flags phone LANDSCAPE (short edge becomes the height)', () => {
    expect(phone(812, 375).isShort).toBe(true);   // iPhone 11 Pro
    expect(phone(852, 393).isShort).toBe(true);   // iPhone 15 Pro
  });

  it('does NOT flag phone portrait', () => {
    expect(phone(375, 812).isShort).toBe(false);
    expect(phone(393, 852).isShort).toBe(false);
  });

  it('does NOT flag tablet landscape — the case orientation alone would get wrong', () => {
    expect(tablet(1133, 744).isShort).toBe(false);  // iPad mini landscape
    expect(tablet(1366, 1024).isShort).toBe(false); // iPad Pro 12.9 landscape
  });

  it('does NOT flag desktop', () => {
    expect(classifyViewport({ w: 1440, h: 900, coarse: false, screenMin: 900 }).isShort).toBe(false);
  });

  it('sits between the tallest phone landscape and the shortest tablet landscape', () => {
    expect(SHORT_MAX_HEIGHT).toBeGreaterThan(430);  // iPhone Pro Max short edge
    expect(SHORT_MAX_HEIGHT).toBeLessThan(744);     // iPad mini short edge
  });

  it('is false for a zero/unknown height rather than defaulting to short', () => {
    expect(classifyViewport({ w: 0, h: 0 }).isShort).toBe(false);
  });
});
