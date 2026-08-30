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
import { describe, it, expect } from 'vitest';
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
    expect(I18N).toContain('setTimeout(markLocaleSettled, HYDRATE_CEILING_MS);');
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

  it('the Stop button keeps a meaning in every language while it waits', () => {
    // 🛑 alone: the glyph carries it, and the button stays usable rather than labelling
    // itself in the locale that is about to be replaced.
    expect(CODE).toContain("{localeReady ? t('loading.stop', lang) : '🛑'}");
    expect(CODE).toContain("aria-label={localeReady ? undefined : 'Stop'}");
  });
});
