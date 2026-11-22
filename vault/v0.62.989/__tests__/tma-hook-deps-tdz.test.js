// __tests__/tma-hook-deps-tdz.test.js — v0.62.262
//
// Static guard against the render-time crash class that white-screened the
// Cuisine TMA at v0.62.259 (fixed in v0.62.261, PR #1227):
//
//   useEffect(() => { ... }, [loading, venues.length, classicOpen]);
//   ...
//   const [classicOpen, setClassicOpen] = useState(false);   // declared LATER
//
// A `const`/`let` (incl. a `useState` destructure) sits in the TEMPORAL DEAD
// ZONE until its declaration line runs. A hook's dependency array is the
// SECOND argument to useEffect/useMemo/… and is evaluated DURING render, in
// the component's own scope. So referencing a state const in a dep array
// BEFORE the line that declares it throws, on every render:
//
//   ReferenceError: Cannot access 'classicOpen' before initialization
//
// `vite build` (syntax only) and the Node unit suite (never mounts <App>)
// both stay green, so this class ships silently. This test parses every TMA
// source file and fails if any hook dependency array references a same-scope
// const/let declared later in that function.
//
// Why static (not a jsdom mount): the repo's Vitest is Node-only and excludes
// web/** by design (see vitest.config.js). This guard runs in that existing
// suite with no jsdom, no browser mocks, and no flaky full-app mount — and it
// pinpoints the exact regression that shipped.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import esbuild from 'esbuild';
import * as acorn from 'acorn';

const HOOK_RX = /^(useEffect|useLayoutEffect|useMemo|useCallback|useImperativeHandle)$/;

// Recursively collect every .js/.jsx under web/<tma>/src, skipping node_modules.
function collectSources(root) {
  const out = [];
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name === 'node_modules' || name === 'dist') continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(jsx?|mjs)$/.test(name)) out.push(full);
    }
  })(root);
  return out;
}

// Leftmost identifier of a dependency-array element (so `venues.length` → venues,
// `a?.b` → a). Returns the Identifier node or null for non-identifier deps.
function baseIdentifier(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node;
  if (node.type === 'MemberExpression') return baseIdentifier(node.object);
  if (node.type === 'ChainExpression') return baseIdentifier(node.expression);
  return null;
}

// Record every name a `const [a, setA] = …` / `const {x} = …` binding introduces.
function collectBindingNames(idNode, pos, map) {
  if (!idNode) return;
  switch (idNode.type) {
    case 'Identifier': map.set(idNode.name, pos); break;
    case 'ArrayPattern': idNode.elements.forEach((e) => collectBindingNames(e, pos, map)); break;
    case 'ObjectPattern': idNode.properties.forEach((p) => collectBindingNames(p.value || p.argument, pos, map)); break;
    case 'AssignmentPattern': collectBindingNames(idNode.left, pos, map); break;
    case 'RestElement': collectBindingNames(idNode.argument, pos, map); break;
    default: break;
  }
}

// Pull the dependency ArrayExpression out of a hook CallExpression, if any.
function depsArrayOf(call) {
  if (!call || call.type !== 'CallExpression') return null;
  if (call.callee.type !== 'Identifier' || !HOOK_RX.test(call.callee.name)) return null;
  const last = call.arguments[call.arguments.length - 1];
  return last && last.type === 'ArrayExpression' ? last : null;
}

// For one function: flag any top-level hook dep that references a top-level
// const/let declared later in the same function body (a TDZ-on-render).
function analyseFunction(fn, hookName) {
  if (!fn.body || fn.body.type !== 'BlockStatement') return [];
  const declaredAt = new Map();           // name → declaration start offset
  for (const st of fn.body.body) {
    if (st.type === 'VariableDeclaration' && (st.kind === 'const' || st.kind === 'let')) {
      for (const d of st.declarations) collectBindingNames(d.id, st.start, declaredAt);
    }
  }
  const violations = [];
  const checkDeps = (call) => {
    const deps = depsArrayOf(call);
    if (!deps) return;
    for (const el of deps.elements) {
      const id = baseIdentifier(el);
      if (id && declaredAt.has(id.name) && declaredAt.get(id.name) > id.start) {
        violations.push(`${hookName}: \`${id.name}\` used in a dependency array before its declaration`);
      }
    }
  };
  // Hooks must sit at the component's top level (Rules of Hooks): either a bare
  // `useEffect(...)` statement, or `const x = useMemo(...)`.
  for (const st of fn.body.body) {
    if (st.type === 'ExpressionStatement') checkDeps(st.expression);
    else if (st.type === 'VariableDeclaration') {
      for (const d of st.declarations) checkDeps(d.init);
    }
  }
  return violations;
}

function scanSource(code) {
  // Strip JSX/TS-free syntax so plain acorn can parse it.
  const js = esbuild.transformSync(code, { loader: 'jsx' }).code;
  const ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
  const found = [];
  (function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
      const name = node.id ? node.id.name : '(component)';
      found.push(...analyseFunction(node, name));
    }
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return found;
}

const TMA_ROOTS = ['cuisine', 'menu', 'hawker', 'transport', 'oversight', 'about']
  .map((t) => join(process.cwd(), 'web', t, 'src'));

describe('TMA hook-dependency temporal-dead-zone guard', () => {
  const files = TMA_ROOTS.flatMap(collectSources);

  it('scans a non-trivial set of TMA source files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('the detector flags a known TDZ bug and clears the fixed form', () => {
    const BUG = 'function C(){ const [v]=useState([]); useEffect(()=>{},[v, x]); const [x]=useState(0); return <i/>; }';
    const OK = 'function C(){ const [v]=useState([]); const [x]=useState(0); useEffect(()=>{},[v, x]); return <i/>; }';
    expect(scanSource(BUG)).toHaveLength(1);
    expect(scanSource(OK)).toHaveLength(0);
  });

  it('no hook dependency references a const/let declared later in the same scope', () => {
    const problems = [];
    for (const f of files) {
      let code;
      try { code = readFileSync(f, 'utf8'); } catch { continue; }
      let found;
      try { found = scanSource(code); } catch (err) {
        // A parse/transform failure is a real problem worth surfacing (the build
        // job would also choke), but keep the message file-scoped.
        throw new Error(`Failed to scan ${f}: ${err.message}`);
      }
      for (const v of found) problems.push(`${f.replace(process.cwd() + '/', '')} — ${v}`);
    }
    expect(problems, `Temporal-dead-zone hook dependencies (would ReferenceError on render):\n${problems.join('\n')}`).toEqual([]);
  });
});
