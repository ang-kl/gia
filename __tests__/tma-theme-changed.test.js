// __tests__/tma-theme-changed.test.js — v0.62.940
//
// The 17-10 '26 TMA review's item 1: every Mini App mapped Telegram's
// themeParams onto CSS variables ONCE, inside applyTelegramTheme(), and the only
// `themeChanged` listener in web/ was the bottom-sheet component. A user who
// flipped Telegram light/dark mid-session kept the stale palette until reload.
//
// This file CALLS the five real applyTelegramTheme() functions under a stubbed
// window/document (the suite is Node-only; see vitest.config.js), registers
// what they subscribe to, fires `themeChanged` with a different palette, and
// asserts two things:
//   1. the CSS variables (and the dark attribute where the app has one) are
//      re-written from the NEW themeParams;
//   2. the init sequence does NOT re-run — ready/expand/requestFullscreen/
//      disableVerticalSwipes are called exactly as many times as before.
// A naive fix (re-calling applyTelegramTheme on the event) would pass 1 and
// fail 2, which is the regression this guards.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const APPS = [
  { name: 'menu',      path: '../web/menu/src/tg.js',        darkAttr: 'data-tg-dark', darkValue: '1' },
  { name: 'hawker',    path: '../web/hawker/src/tg.js',      darkAttr: null },
  { name: 'transport', path: '../web/transport/src/tg.js',   darkAttr: null },
  { name: 'oversight', path: '../web/oversight/src/tg.js',   darkAttr: null },
  { name: 'cuisine',   path: '../web/cuisine/src/api/tg.js', darkAttr: 'data-theme',   darkValue: 'dark' },
];

const LIGHT = { bg_color: '#ffffff', text_color: '#000000', hint_color: '#999999', button_color: '#3390ec', button_text_color: '#ffffff', secondary_bg_color: '#f0f0f0' };
const DARK  = { bg_color: '#17212b', text_color: '#f5f5f5', hint_color: '#708499', button_color: '#5288c1', button_text_color: '#ffffff', secondary_bg_color: '#232e3c' };

function makeWebApp({ withOnEvent = true } = {}) {
  const counts = { ready: 0, expand: 0, requestFullscreen: 0, disableVerticalSwipes: 0 };
  const listeners = [];
  const w = {
    platform: 'ios', version: '8.0', colorScheme: 'light', themeParams: { ...LIGHT },
    isExpanded: false, isFullscreen: false, viewportHeight: 800, viewportStableHeight: 800,
    safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    initData: '', initDataUnsafe: {},
    isVersionAtLeast: () => true,
    ready: () => { counts.ready++; },
    expand: () => { counts.expand++; },
    requestFullscreen: () => { counts.requestFullscreen++; },
    disableVerticalSwipes: () => { counts.disableVerticalSwipes++; },
    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
  };
  if (withOnEvent) {
    w.onEvent = (name, fn) => { listeners.push({ name, fn }); };
    w.offEvent = (name, fn) => { const i = listeners.findIndex((l) => l.name === name && l.fn === fn); if (i >= 0) listeners.splice(i, 1); };
  }
  return { w, counts, listeners };
}

function makeDocument() {
  const vars = {};
  const attrs = {};
  const style = { setProperty: (k, v) => { vars[k] = v; }, getPropertyValue: (k) => vars[k] || '' };
  const documentElement = {
    style,
    setAttribute: (k, v) => { attrs[k] = v; },
    removeAttribute: (k) => { delete attrs[k]; },
    getAttribute: (k) => attrs[k] ?? null,
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  };
  return { document: { documentElement, body: documentElement, addEventListener() {}, removeEventListener() {} }, vars, attrs };
}

// Node 20+ defines `navigator` as a getter-only global, so plain assignment
// throws; (re)define it as a configurable data property and restore the
// original descriptor afterwards.
const defineGlobal = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
let saved;
beforeEach(() => {
  saved = {
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    warn: console.warn,
  };
  console.warn = () => {};
});
afterEach(() => {
  for (const k of ['window', 'document', 'navigator']) {
    if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
    else delete globalThis[k];
  }
  console.warn = saved.warn;
});

function install(w, doc) {
  defineGlobal('window', {
    Telegram: { WebApp: w }, innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
    screen: { width: 390, height: 844 }, location: { href: 'https://soleat.net/app/x', pathname: '/app/x', origin: 'https://soleat.net' },
    history: { length: 1, back() {} }, document: doc.document,
  });
  defineGlobal('document', doc.document);
  defineGlobal('navigator', { maxTouchPoints: 5, userAgent: 'test', language: 'en' });
}

for (const app of APPS) {
  describe(`${app.name} tg.js: themeChanged re-applies the palette and nothing else`, () => {
    it('registers exactly one themeChanged listener and re-writes the CSS variables from the new themeParams', async () => {
      const { w, counts, listeners } = makeWebApp();
      const doc = makeDocument();
      install(w, doc);
      const mod = await import(app.path);
      mod.applyTelegramTheme();

      expect(doc.vars['--tg-bg']).toBe(LIGHT.bg_color);
      expect(doc.vars['--tg-accent']).toBe(LIGHT.button_color);
      const themeListeners = listeners.filter((l) => l.name === 'themeChanged');
      expect(themeListeners, `${app.name}: themeChanged listeners`).toHaveLength(1);
      const before = { ...counts };

      // Telegram flips to dark: it mutates WebApp.themeParams in place and then
      // emits themeChanged. Mirror that, then fire what the app registered.
      w.themeParams = { ...DARK };
      w.colorScheme = 'dark';
      themeListeners[0].fn();

      expect(doc.vars['--tg-bg']).toBe(DARK.bg_color);
      expect(doc.vars['--tg-text']).toBe(DARK.text_color);
      expect(doc.vars['--tg-accent']).toBe(DARK.button_color);
      expect(doc.vars['--tg-accent-text']).toBe(DARK.button_text_color);
      expect(doc.vars['--tg-card']).toBe(DARK.secondary_bg_color);
      if (app.darkAttr) expect(doc.attrs[app.darkAttr]).toBe(app.darkValue);

      // The init sequence did NOT run again.
      expect(counts, `${app.name}: init calls after themeChanged`).toEqual(before);
      expect(listeners.filter((l) => l.name === 'themeChanged')).toHaveLength(1);
    });

    it('flipping back to light restores the light palette (the listener is not one-shot)', async () => {
      const { w, listeners } = makeWebApp();
      const doc = makeDocument();
      install(w, doc);
      const mod = await import(app.path);
      mod.applyTelegramTheme();
      const fire = () => listeners.filter((l) => l.name === 'themeChanged').forEach((l) => l.fn());
      w.themeParams = { ...DARK }; w.colorScheme = 'dark'; fire();
      w.themeParams = { ...LIGHT }; w.colorScheme = 'light'; fire();
      expect(doc.vars['--tg-bg']).toBe(LIGHT.bg_color);
      if (app.darkAttr === 'data-tg-dark') expect(doc.attrs['data-tg-dark']).toBeUndefined();
      if (app.darkAttr === 'data-theme') expect(doc.attrs['data-theme']).toBe('light');
    });

    it('a client without onEvent still gets the initial palette and nothing throws', async () => {
      const { w } = makeWebApp({ withOnEvent: false });
      const doc = makeDocument();
      install(w, doc);
      const mod = await import(app.path);
      expect(() => mod.applyTelegramTheme()).not.toThrow();
      expect(doc.vars['--tg-bg']).toBe(LIGHT.bg_color);
    });
  });
}
