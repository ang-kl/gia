// __tests__/tellme-ai-lever.test.js — v0.62.941.
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md, invariants I5 and I6.
//
// The Tell-me bar gains a tiny Quick / AI lever. Quick is the default and resets on
// every open (operator, 25-10 '26). The test RENDERS the real TellMePanel rather than
// grepping it: CI's test job installs with --ignore-scripts, so the Mini App's own
// React is not there, and a test that only runs where React happens to be installed
// would be green in CI for the wrong reason. esbuild (a root dev dependency through
// vitest) bundles the component with a forty-line stand-in for React that records the
// element tree; the tree is then searched for what the user would see.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const REACT_STUB = `
  export const Fragment = Symbol.for('fragment');
  export function jsx(type, props, key) { return { type, props: props || {}, key }; }
  export const jsxs = jsx;
  export function createElement(type, props, ...children) {
    const p = { ...(props || {}) };
    if (children.length) p.children = children.length === 1 ? children[0] : children;
    return { type, props: p };
  }
  export function useState(init) { return [typeof init === 'function' ? init() : init, () => {}]; }
  export function useEffect() {}
  export function useLayoutEffect() {}
  export function useRef(v) { return { current: v }; }
  export function useMemo(fn) { return fn(); }
  export function useCallback(fn) { return fn; }
  export function useContext() { return undefined; }
  export function createContext(v) { return { Provider: 'Provider', _v: v }; }
  export function memo(c) { return c; }
  export function forwardRef(c) { return c; }
  const React = { Fragment, createElement, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useContext, createContext, memo, forwardRef };
  export default React;
`;

let mod;
beforeAll(async () => {
  const esbuild = require('esbuild');
  // async build: esbuild refuses plugins on buildSync.
  const out = await esbuild.build({
    stdin: {
      contents: `
        export { default as TellMePanel, submitRoute } from './web/cuisine/src/v2/components/TellMePanel.jsx';
        export { default as Icon, hasIcon } from './web/cuisine/src/v2/components/Icon.jsx';
        export { t, SUPPORTED_LOCALES } from './web/cuisine/src/v2/lib/i18n.js';
      `,
      resolveDir: ROOT, loader: 'js',
    },
    bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
    jsx: 'automatic', loader: { '.js': 'jsx', '.jsx': 'jsx' },
    plugins: [{
      name: 'react-stub',
      setup(b) {
        b.onResolve({ filter: /^react(\/jsx-runtime|\/jsx-dev-runtime)?$/ }, (a) => ({ path: a.path, namespace: 'react-stub' }));
        b.onLoad({ filter: /.*/, namespace: 'react-stub' }, () => ({ contents: REACT_STUB, loader: 'js' }));
        // i18n.js lazy-imports api.js for a network call; never needed here.
        b.onResolve({ filter: /\.\/api\.js$/ }, () => ({ path: 'api', namespace: 'empty' }));
        b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: 'export {}', loader: 'js' }));
      },
    }],
  });
  const m = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
  mod = m.exports;
});

// Expand function components and flatten into a list of host elements.
function render(el, acc = []) {
  if (el == null || el === false || el === true) return acc;
  if (Array.isArray(el)) { el.forEach((c) => render(c, acc)); return acc; }
  if (typeof el !== 'object') return acc;
  if (typeof el.type === 'function') return render(el.type(el.props || {}), acc);
  acc.push(el);
  render(el.props?.children, acc);
  return acc;
}
const panel = (props) => render({ type: mod.TellMePanel, props: { searchIcon: true, ...props } });
const findSwitch = (nodes) => nodes.find((n) => n.props?.role === 'switch');
const findInput = (nodes) => nodes.find((n) => n.type === 'input');
const hasClass = (n, c) => String(n?.props?.className || '').split(/\s+/).includes(c);
const svgPathsUnder = (node) => render(node.props.children).filter((n) => n.type === 'path' || n.type === 'rect');

describe('submitRoute — which way 🔍 goes', () => {
  it('empty text runs the criteria search in either position', () => {
    expect(mod.submitRoute({ text: '  ', aiMode: false })).toBe('criteria');
    expect(mod.submitRoute({ text: '', aiMode: true })).toBe('criteria');
  });
  it('Quick sends typed text to the normal search', () => {
    expect(mod.submitRoute({ text: 'What are the new eateries at Raffles City', aiMode: false })).toBe('quick');
  });
  it('AI sends typed text to the AI route', () => {
    expect(mod.submitRoute({ text: 'What are the new eateries at Raffles City', aiMode: true })).toBe('ai');
  });
  it('anything but an explicit true is Quick — the default never spends an AI call', () => {
    expect(mod.submitRoute({ text: 'laksa' })).toBe('quick');
    expect(mod.submitRoute({ text: 'laksa', aiMode: 'yes' })).toBe('quick');
  });
});

describe('the rendered bar, Quick (default)', () => {
  it('renders a lever that is a real switch, off', () => {
    const nodes = panel({ value: '' });
    const sw = findSwitch(nodes);
    expect(sw, 'no role="switch" element').toBeTruthy();
    expect(sw.props['aria-checked']).toBe(false);
    expect(typeof sw.props['aria-label']).toBe('string');
    expect(sw.props['aria-label'].length).toBeGreaterThan(0);
  });
  it('keeps today\'s placeholder and the magnifier, and no AI border class', () => {
    const nodes = panel({ value: '' });
    expect(findInput(nodes).props.placeholder).toBe(mod.t('tellme.placeholder', 'en'));
    const bar = nodes.find((n) => hasClass(n, 'loc-field-surface'));
    expect(hasClass(bar, 'tellme-ai')).toBe(false);
    expect(nodes.some((n) => n.type === 'circle')).toBe(true); // the search glyph
  });
});

describe('the rendered bar, AI', () => {
  it('switch on, AI placeholder, AI border class, robot icon — all four together', () => {
    const nodes = panel({ value: '', aiMode: true });
    expect(findSwitch(nodes).props['aria-checked']).toBe(true);
    expect(findInput(nodes).props.placeholder).toBe(mod.t('tellme.placeholderAi', 'en'));
    const bar = nodes.find((n) => hasClass(n, 'loc-field-surface'));
    expect(hasClass(bar, 'tellme-ai')).toBe(true);
    const go = nodes.filter((n) => n.type === 'button').pop();
    expect(go.props['aria-label']).toBe(mod.t('tell.askAiCta', 'en'));
    // the robot's antenna path is drawn; the magnifier's circle is not
    const goGlyph = render(go.props.children);
    expect(goGlyph.some((n) => n.type === 'path' && n.props.d === 'M12 8V4H8')).toBe(true);
    expect(goGlyph.some((n) => n.type === 'circle')).toBe(false);
  });
  // v0.62.943 — the lever moved inside the bar (spec doc/Feature/2026-10-26-lever-inside-bar-
  // and-results-origin-flag.spec.md, I1): on the border it sat over the map's bottom-left control
  // button on a real phone and could not be seen. Inside, it has no border to grow from, so the
  // bump became a short base line.
  it('the lever is drawn flat: a bat and a base line, no gradients, no filters', () => {
    const sw = findSwitch(panel({ value: '', aiMode: true }));
    const parts = svgPathsUnder(sw);
    expect(parts.some((n) => hasClass(n, 'tellme-lever-bat'))).toBe(true);
    expect(parts.some((n) => hasClass(n, 'tellme-lever-base'))).toBe(true);
    expect(parts.some((n) => hasClass(n, 'tellme-lever-bump'))).toBe(false);
    const all = render(sw.props.children);
    expect(all.some((n) => ['linearGradient', 'radialGradient', 'filter'].includes(n.type))).toBe(false);
  });
  it('the lever sits inside the bar, between 💬 and the text box (v0.62.943)', () => {
    const nodes = panel({ value: '' });
    const collapseAt = nodes.findIndex((n) => n.type === 'button' && n.props['aria-label'] === mod.t('tell.collapse', 'en'));
    const leverAt = nodes.findIndex((n) => n.props?.role === 'switch');
    const inputAt = nodes.findIndex((n) => n.type === 'input');
    expect(collapseAt).toBeGreaterThanOrEqual(0);
    expect(leverAt).toBeGreaterThan(collapseAt);
    expect(inputAt).toBeGreaterThan(leverAt);
  });
  it('the CSS no longer lifts the lever out of the bar', () => {
    const css = read('web/cuisine/src/styles.css');
    const rule = css.slice(css.indexOf('.tellme-lever {'), css.indexOf('}', css.indexOf('.tellme-lever {')));
    expect(rule).not.toMatch(/position:\s*absolute/);
    expect(rule).not.toMatch(/top:\s*-/);
  });
  it('tapping the lever asks the parent to flip it', () => {
    let flips = 0;
    const sw = findSwitch(panel({ value: '', aiMode: false, onToggleAi: () => { flips += 1; } }));
    sw.props.onClick({ preventDefault() {} });
    expect(flips).toBe(1);
  });
});

describe('Icon.jsx — the robot', () => {
  it('exists and draws the same line-icon shapes as the rest of the set', () => {
    expect(mod.hasIcon('robot')).toBe(true);
    const svg = render({ type: mod.Icon, props: { name: 'robot' } })[0];
    expect(svg.type).toBe('svg');
    expect(svg.props.fill).toBe('none');
    expect(svg.props.strokeWidth).toBe(1.5);
  });
});

describe('strings — present in all nine locales, never falling back to English', () => {
  // v0.62.943 — footer.nonAi, the "Traditional / Non-AI results" footer line (spec doc/Feature/
  // 2026-10-26-lever-inside-bar-and-results-origin-flag.spec.md, I4).
  const KEYS = ['tellme.placeholderAi', 'tell.askAiCta', 'tell.leverAria', 'footer.nonAi'];
  it('nine locales', () => { expect(mod.SUPPORTED_LOCALES).toHaveLength(9); });
  it('footer.nonAi in English is the operator\'s wording', () => {
    expect(mod.t('footer.nonAi', 'en')).toBe('Traditional / Non-AI results');
  });
  for (const key of KEYS) {
    it(`${key}`, () => {
      const en = mod.t(key, 'en');
      expect(en).not.toBe(key);
      for (const lang of mod.SUPPORTED_LOCALES) {
        const s = mod.t(key, lang);
        expect(s, `${key} ${lang}`).not.toBe(key);
        if (lang !== 'en') expect(s, `${key} ${lang} is English`).not.toBe(en);
      }
    });
  }
});

describe('App.jsx wiring', () => {
  const app = read('web/cuisine/src/v2/App.jsx');
  it('the lever state starts false (Quick) and is not persisted', () => {
    expect(app).toMatch(/const \[tellMeAi, setTellMeAi\] = useState\(false\)/);
    expect(app).not.toMatch(/localStorage[^\n]*tellMeAi|tellMeAi[^\n]*localStorage/);
  });
  it('passes the lever and both routes into the bar', () => {
    expect(app).toMatch(/aiMode=\{tellMeAi\}/);
    expect(app).toMatch(/onToggleAi=\{/);
    expect(app).toMatch(/onQuickSearch=\{triggerSearch\}/);
    expect(app).toMatch(/onSubmit=\{handleNLSubmit\}/);
  });
  it('an AI answer that names a place shows the place pill and moves the map', () => {
    const at = app.indexOf('async function handleNLSubmit(');
    const body = app.slice(at, app.indexOf('function handleNLReplace(', at));
    expect(body).toMatch(/setPlaceAnchor\(/);
    expect(body).toMatch(/r\.placeAnchor/);
    expect(body).toMatch(/setSearchCenter\(/);
  });
});
