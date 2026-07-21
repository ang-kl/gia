// __tests__/classify-viewport.test.js — v0.62.622
//
// The pure device/orientation classifier behind use-viewport.js. Regression
// anchor for the operator's Telegram-Desktop bug ("Cuisine stuck at expand mode
// … size and card looks weird"): a narrow desktop mini-app window on a
// touchscreen laptop (coarse pointer + large physical monitor) must NOT be
// promoted to the wide 'tablet' layout — while a real iPad whose webview is
// collapsed to partial height (wide width, short height) MUST stay 'tablet'.

import { describe, it, expect } from 'vitest';
import { classifyViewport, TABLET_MIN_EDGE } from '../web/_shared/lib/classify-viewport.js';

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
});
