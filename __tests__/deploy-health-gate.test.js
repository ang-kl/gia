// deploy-health-gate.test.js - v0.62.994
//
// Spec: doc/Feature/2026-11-25-deploy-health-check.spec.md (Part A-2, invariant I2).
//
// From v0.62.994 Railway's deploy health check asks GET /readyz on a new build and switches
// traffic to it only on a 2xx (the service setting healthcheckPath, production, which lives
// outside this repository). The request carries no Telegram credentials and the hostname
// healthcheck.railway.app. So a rename of the route, or anything in front of it that wants
// credentials, fails every deploy: the old build keeps serving and no release goes live until
// the route or the setting is put right.
//
// WHAT THIS FILE IS: a tripwire on the source text of index.js. index.js exports nothing, so the
// route cannot be called from a test.
// WHAT IT IS NOT: proof that Railway's check passes. That proof is the measured deploy, recorded
// in the Journal entry for v0.62.994.
//
// Cases 1 to 4 read the code with comments masked, so prose cannot answer for code. Case 5 reads
// the comment on purpose.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskComments } from './helpers/mask-comments.js';

const RAW = fs.readFileSync(path.join(process.cwd(), 'index.js'), 'utf8');
const CODE = maskComments(RAW);

const GATE = '/readyz';
const REGISTRATION = `app.get('${GATE}'`;

// Middleware mounted with no path runs for every request, the deploy gate included. Each entry
// here has been read and cannot refuse an unauthenticated GET. To add one: check that it answers
// GET /readyz from the hostname healthcheck.railway.app with no credentials, then list it.
const PATHLESS_ALLOWED = ['express.json()'];

function headBeforeGate() {
  const start = CODE.indexOf('const app = express()');
  const end = CODE.indexOf(REGISTRATION);
  return { start, end, head: start >= 0 && end > start ? CODE.slice(start, end) : '' };
}

describe('deploy gate: GET /readyz is what Railway asks before it switches traffic', () => {
  it('is registered once, with app.get and its handler directly: nothing stands between the path and the handler', () => {
    const count = CODE.split(REGISTRATION).length - 1;
    expect(count, `expected exactly one ${REGISTRATION} in index.js. If the route was renamed, change Railway's healthcheckPath first.`).toBe(1);
    const m = CODE.match(/app\.get\(\s*'\/readyz'\s*,\s*([^\n]*)/);
    expect(m).not.toBeNull();
    expect(m[1], 'the second argument of the route must be the handler itself; a middleware here (for example a credential check) fails every deploy').toMatch(/^async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{/);
  });

  it('has no global gate ahead of it: every app.use before the route is either scoped to another path or on the named list', () => {
    const { start, end, head } = headBeforeGate();
    expect(start, 'could not find "const app = express()"').toBeGreaterThan(-1);
    expect(end, `could not find ${REGISTRATION}`).toBeGreaterThan(start);

    const uses = [...head.matchAll(/app\.use\(\s*([^\n]*)/g)].map((m) => m[1].trim());
    // Not vacuous: the parse must see the middleware that is there today.
    expect(uses.length).toBeGreaterThanOrEqual(1);
    expect(uses.some((u) => u.startsWith('express.json()'))).toBe(true);

    for (const arg of uses) {
      const scoped = arg.match(/^['"`]([^'"`]*)['"`]/);
      if (scoped) {
        const mount = scoped[1];
        const covers = mount === '/' || mount === GATE || GATE.startsWith(mount.endsWith('/') ? mount : `${mount}/`);
        expect(covers, `app.use('${mount}', ...) is mounted over ${GATE}; the deploy gate must not sit behind it`).toBe(false);
        continue;
      }
      const call = arg.replace(/\)\s*;?\s*$/, '');
      expect(PATHLESS_ALLOWED, `app.use(${call}) runs for every request, the deploy gate included. Read the comment at PATHLESS_ALLOWED before listing it.`).toContain(call);
    }

    // A catch-all route registered earlier would answer in the gate's place.
    const catchAll = head.match(/app\.(?:all|get|use)\(\s*['"`](?:\*|\/\*|\/:[^/'"`]*)['"`]/);
    expect(catchAll, 'a catch-all route is registered ahead of the deploy gate').toBeNull();
  });

  it('answers 200 when the app is ready and 503 when it is not, from the shared health body', () => {
    const i = CODE.indexOf(REGISTRATION);
    const next = CODE.indexOf('app.', i + REGISTRATION.length);
    const block = CODE.slice(i, next > i ? next : i + 400);
    expect(block).toMatch(/const\s+body\s*=\s*await\s+healthBody\(\)/);
    expect(block, 'Railway needs a 2xx when the app is ready, and must not get one when it is not').toMatch(/res\.status\(\s*body\.ready\s*\?\s*200\s*:\s*503\s*\)/);
    expect(CODE).toMatch(/ready:\s*redisHealth\.ready\s*===\s*true/);
  });

  it('the server listens on process.env.PORT, the port Railway uses for the check', () => {
    expect(CODE.split('app.listen(').length - 1).toBe(1);
    expect(CODE, 'Railway checks the injected PORT; a fixed port makes every deploy fail its check').toMatch(/const\s+port\s*=\s*process\.env\.PORT\s*\|\|\s*\d+\s*;/);
    expect(CODE).toMatch(/app\.listen\(\s*port\s*,/);
  });

  it('carries a comment at the route that names the service setting, so whoever edits it finds the dependency', () => {
    const lines = RAW.split('\n');
    const at = lines.findIndex((l) => l.includes(REGISTRATION));
    expect(at).toBeGreaterThan(0);
    const above = [];
    for (let k = at - 1; k >= 0 && lines[k].trim().startsWith('//'); k--) above.unshift(lines[k].trim().replace(/^\/\/\s?/, ''));
    const note = above.join(' ').replace(/\s+/g, ' ');
    expect(note, `no comment directly above ${REGISTRATION}`).not.toBe('');
    for (const token of ['healthcheckPath', 'healthcheck.railway.app', GATE, 'deploy-health-gate.test.js']) {
      expect(note, `the comment above the route should mention ${token}`).toContain(token);
    }
    // The setting's name lives in prose only; the masked view must not carry it.
    expect(CODE).not.toContain('healthcheckPath');
  });
});
