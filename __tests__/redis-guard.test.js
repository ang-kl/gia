import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { attachRedisGuard, healthProbe, withTimeout, _startPing } = await import(path.join(ROOT, 'redis-guard.js')).then(m => m.default || m);

// [AMD-220], 09-09 '26. Production was down for seven hours with every
// health check green: a `read ETIMEDOUT` on the Redis socket at 05:49 SGT
// hit a client with NO 'error' listener, so node-redis threw inside its own
// socket handler before it could schedule a reconnect, and every command
// from then on sat in the offline queue forever. These tests prove the
// MECHANISM against the real library, then the guard's logic against a fake.

// A minimal RESP server: parses each inbound command array, answers PING
// with PONG and everything else (node-redis 4.7 sends two CLIENT SETINFO on
// connect and waits for the replies) with OK, and can be told to drop its
// first connection.
function respReplies(buf) {
  const parts = buf.toString('latin1').split('\r\n');
  const out = []; let i = 0;
  while (i < parts.length) {
    const t = parts[i];
    if (t.startsWith('*')) {
      const n = Number(t.slice(1)); const args = [];
      i++;
      for (let k = 0; k < n && i + 1 < parts.length; k++) { args.push(parts[i + 1]); i += 2; }
      out.push(args[0]?.toUpperCase() === 'PING' ? '+PONG\r\n' : '+OK\r\n');
    } else i++;
  }
  return out.join('');
}
// `refuseReconnect` also stops LISTENING when it drops the first connection.
// node-redis reconnects immediately once and only then honours the strategy's
// delay, so a server that keeps accepting cannot produce the production
// shape; one that refuses the reconnect leaves the client isOpen && !isReady
// for as long as the strategy says — which is the 05:49 state.
function fakeRedis({ dropFirst = false, refuseReconnect = false } = {}) {
  const sockets = [];
  const server = net.createServer((sock) => {
    sockets.push(sock);
    if (dropFirst && sockets.length === 1) setTimeout(() => { sock.destroy(); if (refuseReconnect) server.close(); }, 250);
    sock.on('data', (buf) => { const r = respReplies(buf); if (r) sock.write(r); });
    sock.on('error', () => {});
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    server, port: server.address().port,
    connections: () => sockets.length,
    close: () => new Promise((r) => { for (const s of sockets) s.destroy(); server.close(() => r()); if (!server.listening) r(); }),
  })));
}

// The child script: connect, wait for the server to drop us, report whether
// a second connection was ever made. WITH_LISTENER decides the one line
// this whole PR is about.
const CHILD = `
  const { createClient } = require(process.argv[4] || 'redis');
  const port = Number(process.argv[2]); const withListener = process.argv[3] === '1';
  const c = createClient({ url: 'redis://127.0.0.1:' + port, socket: { reconnectStrategy: () => 50 } });
  let reconnecting = 0, ready = 0;
  if (withListener) c.on('error', () => {});
  c.on('reconnecting', () => { reconnecting++; });
  c.on('ready', () => { ready++; });
  c.connect().then(() => new Promise((r) => setTimeout(r, 900))).then(async () => {
    console.log(JSON.stringify({ reconnecting, ready, isOpen: c.isOpen, isReady: c.isReady }));
    try { await c.disconnect(); } catch {}
    process.exit(0);
  });
`;
// ASYNC on purpose: the fake server lives in this worker's event loop, and a
// spawnSync would block that loop — the child would wait forever for the
// handshake reply and the test would read the hang as "the client hung".
// (It did, on the first run.)
function runChild(port, withListener) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redis-guard-'));
  const file = path.join(dir, 'child.cjs');
  fs.writeFileSync(file, CHILD);
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [file, String(port), withListener ? '1' : '0', path.join(ROOT, 'node_modules', 'redis')], { cwd: ROOT });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => { stdout += d; });
    p.stderr.on('data', (d) => { stderr += d; });
    const killer = setTimeout(() => p.kill('SIGKILL'), 8_000);
    p.on('exit', (status) => {
      clearTimeout(killer);
      fs.rmSync(dir, { recursive: true, force: true });
      const line = stdout.trim().split('\n').pop();
      let report = null; try { report = JSON.parse(line); } catch {}
      resolve({ status, stderr, report });
    });
  });
}

describe('the mechanism, against node-redis itself', () => {
  it('WITHOUT an error listener the client never reconnects — the process dies on the socket error', async () => {
    const srv = await fakeRedis({ dropFirst: true });
    try {
      const r = await runChild(srv.port, false);
      // The unhandled 'error' event is fatal to the child: no report line,
      // non-zero exit, and the library's own error name in stderr. In
      // production the uncaughtException handler swallows exactly this
      // throw, which is how the process stayed "up" and dead.
      expect(r.status).not.toBe(0);
      expect(r.report).toBeNull();
      expect(r.stderr).toMatch(/SocketClosedUnexpectedlyError|Socket closed unexpectedly/);
      expect(srv.connections()).toBe(1);
    } finally { await srv.close(); }
  });

  it('WITH an error listener the client reconnects: a second connection, `reconnecting` and `ready` fire, and it is ready again', async () => {
    const srv = await fakeRedis({ dropFirst: true });
    try {
      const r = await runChild(srv.port, true);
      expect(r.status).toBe(0);
      expect(r.report).not.toBeNull();
      expect(r.report.reconnecting).toBeGreaterThanOrEqual(1);
      expect(r.report.ready).toBeGreaterThanOrEqual(2);
      expect(r.report.isReady).toBe(true);
      expect(srv.connections()).toBeGreaterThanOrEqual(2);
    } finally { await srv.close(); }
  });

  it('attachRedisGuard registers the four listeners on a real client and healthProbe round-trips a PING', async () => {
    const srv = await fakeRedis();
    const { createClient } = await import('redis');
    const c = createClient({ url: `redis://127.0.0.1:${srv.port}` });
    try {
      const guard = attachRedisGuard(c, { pingIntervalMs: 0 });
      expect(c.listenerCount('error')).toBe(1);
      expect(c.listenerCount('reconnecting')).toBe(1);
      expect(c.listenerCount('ready')).toBe(1);
      expect(c.listenerCount('end')).toBe(1);
      const before = await healthProbe(c, { timeoutMs: 1500, connectIfClosed: false });
      expect(before.ready).toBe(false);          // not connected yet, and told not to connect
      const probe = await healthProbe(c, { timeoutMs: 1500 });   // default connects lazily, like index.js
      expect(probe).toMatchObject({ open: true, ready: true, ping: 'PONG', error: null });
      const t = await guard.tick();
      expect(t.consecutiveFailures).toBe(0);
      expect(t.lastOkAt).not.toBeNull();
      guard.stop();
    } finally { try { await c.disconnect(); } catch {} await srv.close(); }
  });
});

// A stand-in for the exact production state: isOpen true, isReady false,
// ping() never settles.
function hungClient() {
  const calls = { disconnect: 0, connect: 0, on: [] };
  const c = {
    isOpen: true, isReady: false,
    ping: () => new Promise(() => {}),
    disconnect: async () => { calls.disconnect++; c.isOpen = false; },
    connect: async () => { calls.connect++; c.isOpen = true; c.isReady = true; c.ping = async () => 'PONG'; },
    on: (ev) => { calls.on.push(ev); return c; },
  };
  return { c, calls };
}

describe('the watchdog, against the hung-client shape', () => {
  it('forces disconnect+connect after N consecutive timed-out pings, and not before', async () => {
    const { c, calls } = hungClient();
    const logs = [];
    const logger = { info: (...a) => logs.push(['info', a]), warn: (...a) => logs.push(['warn', a]), error: (...a) => logs.push(['error', a]) };
    const g = attachRedisGuard(c, { logger, pingIntervalMs: 0, pingTimeoutMs: 20, failuresBeforeReset: 3 });
    expect(calls.on).toEqual(['error', 'reconnecting', 'ready', 'end']);
    let s = await g.tick(); expect(s.consecutiveFailures).toBe(1); expect(calls.disconnect).toBe(0);
    s = await g.tick();     expect(s.consecutiveFailures).toBe(2); expect(calls.connect).toBe(0);
    s = await g.tick();     // third failure → reset
    expect(calls.disconnect).toBe(1);
    expect(calls.connect).toBe(1);
    expect(s.resets).toBe(1);
    expect(s.consecutiveFailures).toBe(0);
    expect(logs.some(([lvl, a]) => lvl === 'error' && /forcing disconnect/.test(a[1]))).toBe(true);
    // healed: the next tick pings fine
    s = await g.tick(); expect(s.consecutiveFailures).toBe(0); expect(s.lastOkAt).not.toBeNull();
  });

  it('a healthy ping resets the failure count, so intermittent blips never accumulate to a reset', async () => {
    const { c, calls } = hungClient();
    const g = attachRedisGuard(c, { pingIntervalMs: 0, pingTimeoutMs: 20, failuresBeforeReset: 3 });
    await g.tick(); await g.tick();                   // 2 failures
    c.ping = async () => 'PONG'; await g.tick();      // ok → reset to 0
    c.ping = () => new Promise(() => {}); await g.tick(); await g.tick();   // 2 more
    expect(calls.disconnect).toBe(0);
    expect(g.state().consecutiveFailures).toBe(2);
  });

  it('does nothing while nothing has connected yet (isOpen false)', async () => {
    const { c, calls } = hungClient(); c.isOpen = false;
    const g = attachRedisGuard(c, { pingIntervalMs: 0, pingTimeoutMs: 20, failuresBeforeReset: 1 });
    const s = await g.tick();
    expect(s.consecutiveFailures).toBe(0); expect(calls.disconnect).toBe(0);
  });

  it('healthProbe reports NOT ready for the hung shape, within the timeout, and says why', async () => {
    const { c } = hungClient();
    const t0 = Date.now();
    const p = await healthProbe(c, { timeoutMs: 30 });
    expect(p.ready).toBe(false);
    expect(p.open).toBe(true);
    expect(p.error).toMatch(/not ready/);
    expect(Date.now() - t0).toBeLessThan(500);
    // and a client that claims ready but whose PING hangs is caught by the timeout
    c.isReady = true;
    const q = await healthProbe(c, { timeoutMs: 30 });
    expect(q.ready).toBe(false);
    expect(q.error).toMatch(/timed out/);
  });

  it('withTimeout rejects on the deadline and clears its timer on success', async () => {
    await expect(withTimeout(new Promise(() => {}), 10, 'x')).rejects.toThrow(/x timed out after 10ms/);
    await expect(withTimeout(Promise.resolve('v'), 10)).resolves.toBe('v');
  });
});

describe('index.js wiring', () => {
  const src = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
  // Comment-masked so a sentence describing the guard cannot satisfy this.
  const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  it('attaches the guard to the real client, once, with the logger', () => {
    expect(code.match(/attachRedisGuard\(redis, \{ logger \}\)/g)?.length).toBe(1);
    expect(code).toMatch(/const redis = createClient\(\{ url: process\.env\.REDIS_URL \}\);/);
  });
  // [AMD-222], Codex P1 on #1867: webhook-domain.js decides "is the primary
  // host reachable" from /healthz's status + body.service, and both hosts
  // share one Redis. A 503 here on a Redis blip would fail the webhook over
  // and re-register it with drop_pending_updates:true — twice. So /healthz is
  // liveness + identity and ALWAYS 200; readiness lives at /readyz.
  it('/healthz is always 200 with service:gia — it must never fail the webhook over on a Redis blip', () => {
    const i = code.indexOf("app.get('/healthz'");
    expect(i).toBeGreaterThan(0);
    const block = code.slice(i, code.indexOf("app.get('/readyz'", i));
    expect(block).toMatch(/res\.status\(200\)/);
    expect(block).not.toMatch(/503/);
    expect(block).toMatch(/ok: true/);
  });
  it('/readyz asks the probe and returns 503 when Redis is not ready', () => {
    const i = code.indexOf("app.get('/readyz'");
    expect(i).toBeGreaterThan(0);
    const block = code.slice(i, i + 400);
    expect(block).toMatch(/body\.ready \? 200 : 503/);
    expect(code.slice(code.indexOf('async function healthBody'), i)).toMatch(/redisHealthProbe\(redis/);
  });
  it('webhook-domain reads only status + service, so a not-ready body is still "this is gia"', () => {
    const wd = fs.readFileSync(path.join(ROOT, 'webhook-domain.js'), 'utf8');
    expect(wd).toMatch(/HEALTH_PATH = '\/healthz'/);
    expect(wd).toMatch(/r\.status !== 200/);
    expect(wd).not.toMatch(/\.ready\b/);
  });
});

// [AMD-222], Codex P2 on #1867: a timed-out PING used to stay in node-redis's
// queue until the watchdog reset; every probe during a blackholed
// connection added one more. Two properties close that: probes coalesce,
// and the PING carries an AbortSignal that removes it from the queue.
describe('probe pressure — P2', () => {
  it('fifty concurrent probes against a hung client issue exactly ONE ping', async () => {
    let pings = 0;
    const c = { isOpen: true, isReady: true, ping: () => { pings++; return new Promise(() => {}); }, on() { return c; } };
    const results = await Promise.all(Array.from({ length: 50 }, () => healthProbe(c, { timeoutMs: 40 })));
    expect(pings).toBe(1);
    expect(results.every((r) => r.ready === false && /timed out/.test(r.error))).toBe(true);
    // and after it settles, the next probe issues a fresh one
    await healthProbe(c, { timeoutMs: 20 });
    expect(pings).toBe(2);
  });

  it('the fake receives an AbortSignal that is aborted on timeout', async () => {
    let seen = null;
    const c = { isOpen: true, isReady: true, on() { return c; },
      ping: (opts) => { seen = opts?.signal || null; return new Promise((_, rej) => { seen?.addEventListener('abort', () => rej(new Error('aborted by client'))); }); } };
    const { promise, commandPromise } = _startPing(c, 30);
    await expect(promise).rejects.toThrow(/timed out/);
    expect(seen).not.toBeNull();
    expect(seen.aborted).toBe(true);
    await expect(commandPromise).rejects.toThrow(/aborted by client/);
  });

  it('REAL node-redis, production shape (isOpen, not ready): the timed-out PING is removed from the queue, not left behind', async () => {
    // Build the exact 05:49 state: connected, then dropped, with a reconnect
    // that will not happen for a minute — isOpen true, isReady false, every
    // command going to the offline queue.
    const srv = await fakeRedis({ dropFirst: true, refuseReconnect: true });
    const { createClient } = await import('redis');
    const c = createClient({ url: `redis://127.0.0.1:${srv.port}`, socket: { reconnectStrategy: () => 60_000 } });
    c.on('error', () => {});
    try {
      await c.connect();
      await new Promise((r) => setTimeout(r, 600));       // server drops us at ~250 ms
      expect(c.isOpen).toBe(true);
      expect(c.isReady).toBe(false);
      const { promise, commandPromise } = _startPing(c, 40);
      await expect(promise).rejects.toThrow(/timed out/);
      // node-redis rejects a queued command with AbortError ONLY when the abort
      // listener removed it from waitingToBeSent — this is the queue proof.
      await expect(commandPromise).rejects.toThrow(/The command was aborted/);
    } finally { try { await c.disconnect(); } catch {} await srv.close(); }
  });
});
