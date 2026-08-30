// __tests__/locale-hydration-gate.test.js — v0.62.831, O-345 (b).
//
// The operator's screenshot: the Cuisine loading overlay in Indonesian under Japanese
// chrome. One device, two truths, a few hundred milliseconds apart.
//
// NOT two storage keys — all five TMAs share `gia.locale` on one origin, asserted below.
// A first-paint race: useLocale() reads localStorage synchronously, hydrateFromServerOnce()
// runs in a useEffect. The overlay paints immediately; the server's preference lands an
// async hop later.
//
// AND v0.62.825 IS WHY IT BECAME VISIBLE. Before it the server could never hold `ja` — the
// route 400'd — so there was nothing for hydration to correct TO. Fixing the persistence
// made the mismatch real. Recorded here because a test that only describes the fix loses
// the half that explains the timing.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const fs = require('fs');

const I18N = fs.readFileSync('web/cuisine/src/v2/lib/i18n.js', 'utf8');
const APP = fs.readFileSync('web/cuisine/src/v2/App.jsx', 'utf8');
const CODE = APP.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');

describe('the premise: one key, five apps', () => {
  it.each([
    'web/cuisine/src/v2/lib/i18n.js',
    'web/hawker/src/i18n.js',
    'web/menu/src/i18n.js',
    'web/transport/src/i18n.js',
    'web/clipboard/src/lib/i18n.js',
  ])('%s stores the locale under gia.locale', (f) => {
    expect(fs.readFileSync(f, 'utf8')).toContain("LOCALE_KEY = 'gia.locale'");
  });
});

describe('"settled" is not "started"', () => {
  it('the dedupe latch is set before the await, so it cannot answer "has it settled?"', () => {
    // The premise of needing a SECOND flag, asserted rather than described. serverHydrated
    // is assigned immediately after its own guard — i.e. before the fetch — on purpose.
    const i = I18N.indexOf('async function hydrateFromServerOnce()');
    const head = I18N.slice(i, i + 400);
    expect(head).toContain('if (serverHydrated) return;');
    expect(head).toContain('serverHydrated = true;');
    expect(head.indexOf('serverHydrated = true;')).toBeLessThan(head.indexOf('await'));
  });

  it('the settle latch fires in a finally, so a 401 or offline still releases the UI', () => {
    // Gating UI on a promise whose rejection path forgets to release it is UI that never
    // renders. The catch keeps the local fallback; the finally is what unblocks.
    expect(I18N).toContain('finally { markLocaleSettled(); }');
  });

  it('and a ceiling releases it even if the request never resolves at all', () => {
    // catch/finally cover rejection. They do not cover a request that hangs.
    // v0.62.834 — the ceiling now RECORDS that it fired as well as settling, because
    // settling alone left the late response free to overwrite the locale (see below).
    expect(I18N).toContain('hydrateCeilingFired = true; markLocaleSettled();');
    expect(I18N).toMatch(/setTimeout\(\(\) => \{[^}]*\}, HYDRATE_CEILING_MS\)/);
    expect(I18N).toMatch(/HYDRATE_CEILING_MS\s*=\s*1500/);
  });

  it('the latch is module-level, so repeat mounts settle with no blank frame', () => {
    expect(I18N).toContain('useState(() => localeSettled)');
    expect(I18N).toContain('if (localeSettled) { setSettled(true); return undefined; }');
  });

  it('markLocaleSettled is idempotent — ceiling and finally both call it', () => {
    const i = I18N.indexOf('function markLocaleSettled()');
    expect(I18N.slice(i, i + 160)).toContain('if (localeSettled) return;');
  });
});

describe('the overlay withholds words, not itself', () => {
  it('the gate is read from the hook, not from a local guess', () => {
    expect(APP).toContain("import { useLocale, useLocaleHydrated, t, tn } from './lib/i18n.js';");
    expect(CODE).toContain('const localeReady = useLocaleHydrated();');
  });

  it('every sentence in the card is behind the gate', () => {
    // The branch order matters: `!localeReady` must come FIRST, or the rotating/refresh
    // arms render their text before it. Asserted by position, not by reading.
    const gate = CODE.indexOf('{!localeReady ? (');
    const rotating = CODE.indexOf("loadingReason === 'rotating'");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(rotating);
  });

  it('the card still renders — a blank screen would be a worse bug than a wrong word', () => {
    // The shell and the blinking dots stay, so the overlay keeps its height and nothing
    // jumps when the words arrive.
    const i = CODE.indexOf('{!localeReady ? (');
    const arm = CODE.slice(i, i + 420);
    expect(arm).toContain('animate-blink');
    expect(arm).toContain('aria-live="polite"');
  });

  it('and the placeholder reserves TWO lines, because the ready branch can emit two', () => {
    // v0.62.834 — Codex, P2 on #1783, and it was right. The comment above claimed nothing
    // jumps; the placeholder reserved one line while `loadingReason === 'rotating'` renders
    // loading.head AND the rotating line, and the initial arm renders loading.initial AND
    // the ratingReminder. The card is vertically centred, so a one-line placeholder growing
    // to two moves it — the precise thing the gate was added to stop.
    //
    // Stated at the width it actually holds: this removes the one-versus-two-line jump. A
    // locale whose sentence wraps to a THIRD line still moves the card, and no fixed
    // min-height fixes that without clipping. Claiming otherwise would repeat the mistake
    // this test exists to record.
    const i = CODE.indexOf('{!localeReady ? (');
    const arm = CODE.slice(i, i + 420);
    expect(arm).toMatch(/min-h-\[2\.25rem\]/);
    // The two-line arm it is reserving for, asserted rather than assumed still to exist.
    const rot = CODE.indexOf("loadingReason === 'rotating' ? (");
    const rotArm = CODE.slice(rot, rot + 320);
    expect(rotArm).toContain("t('loading.head', lang)");
    expect(rotArm).toContain("t('loading.rotating.'");
  });

  it('the Stop button keeps a meaning in every language while it waits', () => {
    // 🛑 alone: the glyph carries it, and the button stays usable rather than labelling
    // itself in the locale that is about to be replaced.
    expect(CODE).toContain("{localeReady ? t('loading.stop', lang) : '🛑'}");
    expect(CODE).toContain("aria-label={localeReady ? undefined : 'Stop'}");
  });
});


// ── v0.62.834 — the ceiling has to STOP the race, not just start the clock ────────────
//
// Codex, P2 on #1783: "when /api/cuisine/user-language takes longer than 1.5 seconds but
// eventually succeeds, this timer marks the locale ready and exposes the locally stored
// language while the request is still pending. The response is neither cancelled nor
// ignored, so [it] subsequently replace[s] that language and recreate[s] the exact
// wrong-language flash this gate is intended to prevent."
//
// Correct. The v0.62.831 ceiling did not remove the flash — it MOVED it, from the first
// paint to a second and a half in, where a reader who has started reading gets the words
// swapped under them. A guard whose failure mode is the thing it guards against.
//
// These four run the function instead of reading it. Everything above is a grep, and a grep
// can see `if (!hydrateCeilingFired)` sitting in the file while proving nothing about WHEN
// it is consulted — which is the entire finding. No jsdom in this repo (vitest runs
// `environment: 'node'`), so the handful of browser globals the module touches are stubbed
// by hand and the clock is faked; that is enough, because the module's only DOM contact on
// this path is localStorage + dispatchEvent.
const I18N_PATH = new URL('../web/cuisine/src/v2/lib/i18n.js', import.meta.url).pathname;
const API_PATH = new URL('../web/cuisine/src/v2/lib/api.js', import.meta.url).pathname;

function installFakeDom() {
  const dispatched = [];
  const stored = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => (k in stored ? stored[k] : null),
      setItem: (k, v) => { stored[k] = v; },
    },
    addEventListener() {}, removeEventListener() {},
    dispatchEvent(e) { dispatched.push(e.type); return true; },
  };
  // navigator is a getter-only global on modern node; plain assignment throws.
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'en', languages: ['en'] }, configurable: true,
  });
  globalThis.CustomEvent = class { constructor(type, opts) { this.type = type; Object.assign(this, opts); } };
  return { dispatched, stored };
}

describe('the ceiling ends the race, it does not merely time it', () => {
  // The latches are module-level and one-shot by design, so every scenario needs its own
  // instance of the module. resetModules() before each import is what gives it one.
  beforeEach(() => { vi.useFakeTimers(); vi.resetModules(); });
  afterEach(() => { vi.useRealTimers(); vi.doUnmock(API_PATH); });

  it('a response INSIDE the window is applied — the gate must still do its job', () => {
    // Guarding against the late case is only worth anything if the ordinary case still
    // works. Asserted first so a change that simply stopped dispatching would fail here.
    return (async () => {
      const dom = installFakeDom();
      vi.doMock(API_PATH, () => ({ fetchUserLanguage: async () => 'ja' }));
      const { hydrateFromServerOnce } = await import(I18N_PATH);
      const done = hydrateFromServerOnce();
      await vi.advanceTimersByTimeAsync(10);
      await done;
      expect(dom.dispatched).toContain('gia:locale');
      expect(dom.stored['gia.locale']).toBe('ja');
    })();
  });

  it('a response AFTER the ceiling is not dispatched — no swap under the reader', () => {
    return (async () => {
      const dom = installFakeDom();
      vi.doMock(API_PATH, () => ({
        fetchUserLanguage: () => new Promise((r) => setTimeout(() => r('ja'), 3000)),
      }));
      const { hydrateFromServerOnce, localeIsSettled } = await import(I18N_PATH);
      const done = hydrateFromServerOnce();

      await vi.advanceTimersByTimeAsync(1600);        // past HYDRATE_CEILING_MS
      expect(localeIsSettled()).toBe(true);            // words released…
      expect(dom.dispatched).not.toContain('gia:locale');

      await vi.advanceTimersByTimeAsync(2000);        // …and now the answer lands
      await done;
      expect(dom.dispatched).not.toContain('gia:locale');
    })();
  });

  it('but it IS stored, so the next launch opens in the server’s language', () => {
    // The half that keeps this from being a regression. Dropping the late answer entirely
    // would mean a slow first launch is a slow launch FOREVER: nothing would ever record
    // what the server said. Storing without dispatching pays the cost exactly once.
    return (async () => {
      const dom = installFakeDom();
      vi.doMock(API_PATH, () => ({
        fetchUserLanguage: () => new Promise((r) => setTimeout(() => r('ja'), 3000)),
      }));
      const { hydrateFromServerOnce } = await import(I18N_PATH);
      const done = hydrateFromServerOnce();
      await vi.advanceTimersByTimeAsync(3600);
      await done;
      expect(dom.stored['gia.locale']).toBe('ja');
    })();
  });

  it('the ceiling still releases the UI when the request never resolves at all', () => {
    // The case the ceiling was originally added for, kept: a hang must not mean a card
    // that never shows words.
    return (async () => {
      installFakeDom();
      vi.doMock(API_PATH, () => ({ fetchUserLanguage: () => new Promise(() => {}) }));
      const { hydrateFromServerOnce, localeIsSettled } = await import(I18N_PATH);
      hydrateFromServerOnce();
      expect(localeIsSettled()).toBe(false);
      await vi.advanceTimersByTimeAsync(1600);
      expect(localeIsSettled()).toBe(true);
    })();
  });
});
