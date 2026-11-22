// __tests__/tellme-keyboard-toggle.test.js — v0.62.964.
//
// Spec: doc/Feature/2026-10-31-tellme-keyboard-toggle-and-history.spec.md, C1-C6 and invariants I1-I3 (and I5's
// "only submitted searches"). The real TellMePanel is bundled with esbuild and a stand-in React that records the
// element tree, the same harness tellme-ai-lever.test.js uses, because CI installs without the Mini App's React. The
// keyboard and tap-outside logic is exercised through its exported functions with fake elements, a fake document and
// a fake visual viewport; the keyboard itself is a device fact (A1 confirmed; A2 is the operator's phone check).
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

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
  const out = await esbuild.build({
    stdin: {
      contents: `
        export { default as TellMePanel, keyboardToggle, installOutsideClose, HistoryList, showHistory, shouldRemember } from './web/cuisine/src/v2/components/TellMePanel.jsx';
        export { ft } from './web/cuisine/src/v2/lib/freetext-history.js';
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
const text = (n) => render(n.props.children).map(() => '').join('') || (typeof n.props.children === 'string' ? n.props.children : '');
// An element that records what is done to it.
function fakeInput() {
  const attrs = {}; const ops = [];
  return {
    attrs, ops,
    setAttribute(k, v) { attrs[k] = v; ops.push(`set ${k}=${v}`); },
    removeAttribute(k) { delete attrs[k]; ops.push(`remove ${k}`); },
    blur() { ops.push('blur'); },
    focus() { ops.push('focus'); },
  };
}

// ── I1 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I1 — the 💬 tap opens the box and focuses the input in the same handler', () => {
  const app = code('web/cuisine/src/v2/App.jsx');
  const fnAt = app.indexOf('function openComposer()');
  const fn = app.slice(fnAt, app.indexOf('\n  }\n', fnAt));
  it('openComposer mounts the box synchronously, then focuses its input, inside the tap', () => {
    expect(fn).toMatch(/flushSync\(\(\) => setComposerOpen\(true\)\)/);
    expect(fn).toMatch(/composerInputRef\.current\?\.focus\(\)/);
    expect(fn.indexOf('composerInputRef.current?.focus()')).toBeGreaterThan(fn.indexOf('setComposerOpen(true)'));
  });
  it('the box receives that ref and puts it on its input', () => {
    const tag = (app.match(/<TellMePanel\b[\s\S]*?\/>/) || [''])[0];
    expect(tag).toMatch(/inputRef=\{composerInputRef\}/);
    const inputRef = { current: null };
    const input = panel({ value: '', inputRef }).find((n) => n.type === 'input');
    expect(input.props.ref).toBe(inputRef);
  });
});

// ── I2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I2 — the box closes on a tap outside it and on nothing else', () => {
  function fakeDoc() {
    const l = [];
    return {
      l,
      addEventListener(type, fn, capture) { l.push({ type, fn, capture }); },
      removeEventListener(type, fn, capture) { const i = l.findIndex((x) => x.type === type && x.fn === fn && x.capture === capture); if (i >= 0) l.splice(i, 1); },
    };
  }
  const inside = { id: 'inside' }; const outside = { id: 'map' };
  const root = { contains: (t) => t === inside };
  it('a pointerdown outside closes it; one inside does not', () => {
    const doc = fakeDoc(); let closes = 0;
    const off = mod.installOutsideClose(doc, () => root, () => { closes += 1; });
    expect(doc.l).toHaveLength(1);
    expect(doc.l[0]).toMatchObject({ type: 'pointerdown', capture: true });
    doc.l[0].fn({ target: inside });
    expect(closes).toBe(0);
    doc.l[0].fn({ target: outside });
    expect(closes).toBe(1);
    off();
    expect(doc.l).toHaveLength(0);
  });
  it('losing focus does not close it: the input has no blur handler, and App passes no onBlurClose', () => {
    const input = panel({ value: '' }).find((n) => n.type === 'input');
    expect(input.props.onBlur).toBeUndefined();
    const tag = (code('web/cuisine/src/v2/App.jsx').match(/<TellMePanel\b[\s\S]*?\/>/) || [''])[0];
    expect(tag).not.toMatch(/onBlurClose/);
    expect(tag).toMatch(/onClose=\{\(\) => setComposerOpen\(false\)\}/);
  });
});

// ── I3 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I3 — ⌨️ hides and shows the keyboard and keeps the input focused', () => {
  it('hide: inputmode none, then a blur and re-focus, ending focused', () => {
    const el = fakeInput();
    expect(mod.keyboardToggle(el, false)).toBe(true);
    expect(el.attrs.inputmode).toBe('none');
    expect(el.ops.slice(-2)).toEqual(['blur', 'focus']);
  });
  it('show: inputmode cleared, ending focused', () => {
    const el = fakeInput(); el.attrs.inputmode = 'none';
    expect(mod.keyboardToggle(el, true)).toBe(false);
    expect(el.attrs.inputmode).toBeUndefined();
    expect(el.ops[el.ops.length - 1]).toBe('focus');
  });
  it('A2 fallback: if the viewport did not grow, the keyboard is closed by a blur (the box stays open)', () => {
    const el = fakeInput();
    const vv = { height: 400 };
    mod.keyboardToggle(el, false, { viewport: vv, later: (fn) => fn() });
    expect(el.ops[el.ops.length - 1]).toBe('blur');
    const el2 = fakeInput();
    const vv2 = { height: 400 };
    mod.keyboardToggle(el2, false, { viewport: vv2, later: (fn) => { vv2.height = 760; fn(); } });
    expect(el2.ops[el2.ops.length - 1]).toBe('focus');
  });
  it('no element, no throw', () => {
    expect(mod.keyboardToggle(null, false)).toBe(false);
  });
  it('the left button is ⌨️, labelled "Hide keyboard", keeps focus on press, and toggles the real input', () => {
    const el = fakeInput();
    const nodes = panel({ value: '', inputRef: { current: el } });
    const btn = nodes.find((n) => n.type === 'button' && n.props['aria-label'] === mod.ft('kb.hide', 'en'));
    expect(btn).toBeTruthy();
    expect(JSON.stringify(btn.props.children)).toContain('⌨️');
    let prevented = false;
    btn.props.onMouseDown({ preventDefault() { prevented = true; } });
    expect(prevented).toBe(true);
    btn.props.onClick({ preventDefault() {} });
    expect(el.attrs.inputmode).toBe('none');
    expect(nodes.some((n) => n.type === 'button' && n.props['aria-label'] === 'Collapse')).toBe(false);
  });
});

// ── C6 and I5 ─────────────────────────────────────────────────────────────────────────────────────────────────────
describe('C6 — the remembered list', () => {
  const entries = ['laksa', 'chicken rice', 'satay', 'nasi lemak', 'roti prata', 'char kway teow', 'mee siam'];
  it('shows only while the box is empty and there is something to show', () => {
    expect(mod.showHistory({ text: '', entries })).toBe(true);
    expect(mod.showHistory({ text: '  ', entries })).toBe(true);
    expect(mod.showHistory({ text: 'lak', entries })).toBe(false);
    expect(mod.showHistory({ text: '', entries: [] })).toBe(false);
  });
  it('every entry is a row with ✕; at most 5 show and the rest scroll; the list ends with Clear all', () => {
    const nodes = render({ type: mod.HistoryList, props: { entries, lang: 'en', onPick() {}, onRemove() {}, onClear() {} } });
    const list = nodes.find((n) => n.props?.['data-freetext-history'] !== undefined);
    expect(list).toBeTruthy();
    expect(String(list.props.className)).toMatch(/overflow-y-auto/);
    expect(list.props.style?.maxHeight).toBe('10rem'); // 5 rows of 2rem
    const removes = nodes.filter((n) => n.type === 'button' && n.props['aria-label'] === 'Remove');
    expect(removes).toHaveLength(entries.length);
    const last = nodes.filter((n) => n.type === 'button').pop();
    expect(last.props.children).toBe('Clear all');
  });
  it('a row puts its text back without searching, and keeps focus on press', () => {
    const picked = []; const removed = []; let cleared = 0;
    const nodes = render({ type: mod.HistoryList, props: { entries, lang: 'en', onPick: (t) => picked.push(t), onRemove: (t) => removed.push(t), onClear: () => { cleared += 1; } } });
    const row = nodes.find((n) => n.type === 'button' && n.props['data-entry'] === 'satay');
    let prevented = false;
    row.props.onMouseDown({ preventDefault() { prevented = true; } });
    row.props.onClick();
    expect(prevented).toBe(true);
    expect(picked).toEqual(['satay']);
    nodes.find((n) => n.type === 'button' && n.props['aria-label'] === 'Remove' && n.props['data-entry'] === 'laksa').props.onClick();
    expect(removed).toEqual(['laksa']);
    nodes.filter((n) => n.type === 'button').pop().props.onClick();
    expect(cleared).toBe(1);
  });
  it('labels follow the reader\'s language', () => {
    const nodes = render({ type: mod.HistoryList, props: { entries: ['a'], lang: 'ja', onPick() {}, onRemove() {}, onClear() {} } });
    expect(nodes.filter((n) => n.type === 'button').pop().props.children).toBe(mod.ft('list.clearAll', 'ja'));
  });
});

describe('I5 — only a submitted search with text is remembered', () => {
  const store = () => { const saved = []; return { saved, load: async () => [], save: async (l) => { saved.push(l); } }; };
  it('which routes count', () => {
    expect(mod.shouldRemember('quick')).toBe(true);
    expect(mod.shouldRemember('ai')).toBe(true);
    expect(mod.shouldRemember('criteria')).toBe(false);
  });
  it('🔍 with text (Quick) saves it; typing alone saves nothing; empty 🔍 saves nothing', async () => {
    const s = store();
    let nodes = panel({ value: 'laksa', historyStore: s, onQuickSearch() {}, onChange() {} });
    nodes.find((n) => n.type === 'input').props.onChange({ target: { value: 'laksa!' } });
    expect(s.saved).toHaveLength(0);
    await nodes.filter((n) => n.type === 'button').pop().props.onClick();
    expect(s.saved).toEqual([['laksa']]);
    const s2 = store();
    nodes = panel({ value: '  ', historyStore: s2, onEmptySearch() {} });
    await nodes.filter((n) => n.type === 'button').pop().props.onClick();
    expect(s2.saved).toHaveLength(0);
  });
  it('AI with text saves it too', async () => {
    const s = store();
    const nodes = panel({ value: 'new eateries at Raffles City', aiMode: true, historyStore: s, onSubmit: async () => {}, onChange() {} });
    await nodes.filter((n) => n.type === 'button').pop().props.onClick();
    expect(s.saved).toEqual([['new eateries at Raffles City']]);
  });
});
