'use strict';
// redis-guard.js — v0.62.933. Three things node-redis 4.x does NOT do for
// you, learned the hard way on 09-09 '26 ([AMD-220]):
//
//   1. It will not reconnect unless SOMEONE listens for 'error'. The socket
//      handler (@redis/client socket.js #onSocketError) sets isReady=false,
//      then `this.emit('error')`, THEN schedules the reconnect. With no
//      listener the emit throws, the throw unwinds the handler, and the
//      reconnect lines never run. The client is left isOpen=true /
//      isReady=false — "connected" to every `if (!redis.isOpen)` guard in
//      this repo, and dead to every command, which sits in the offline
//      queue with no timeout. That is what a `read ETIMEDOUT` at 05:49 SGT
//      did to production for seven hours while /healthz answered 200.
//   2. It has no command timeout. A hung client hangs every caller forever.
//   3. `isOpen` means "connect() was called", not "the socket works".
//
// So: attachRedisGuard() registers the listeners (which makes the library's
// own reconnect path reachable), and runs a watchdog PING with a timeout;
// after `failuresBeforeReset` consecutive failures it forces
// disconnect()+connect(). healthProbe() is what /healthz reports, so the
// health check sees what users see.

const DEFAULTS = Object.freeze({
  pingIntervalMs: 60_000,
  pingTimeoutMs: 5_000,
  failuresBeforeReset: 3,
});

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// What /healthz reports. `ready` is the answer users get: it is true only
// when the client says it is ready AND a real PING came back inside the
// timeout. `connectIfClosed` mirrors the lazy `if (!redis.isOpen)
// await redis.connect()` guard the rest of index.js uses, so a probe before
// the first command does not report a healthy boot as an outage.
async function healthProbe(redis, { timeoutMs = 1500, connectIfClosed = true } = {}) {
  const t0 = Date.now();
  const out = { open: !!redis.isOpen, ready: false, ping: null, ms: 0, error: null };
  try {
    if (!redis.isOpen && connectIfClosed) {
      await withTimeout(redis.connect(), timeoutMs, 'redis connect');
      out.open = !!redis.isOpen;
    }
    if (!redis.isReady) {
      out.error = 'client not ready';
    } else {
      out.ping = await withTimeout(redis.ping(), timeoutMs, 'redis ping');
      out.ready = out.ping === 'PONG';
      if (!out.ready) out.error = `unexpected ping reply: ${String(out.ping).slice(0, 40)}`;
    }
  } catch (err) {
    out.error = String(err?.message || err).slice(0, 200);
  }
  out.ms = Date.now() - t0;
  return out;
}

function attachRedisGuard(redis, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const log = o.logger || { info() {}, warn() {}, error() {} };
  const state = { consecutiveFailures: 0, resets: 0, lastOkAt: null, lastError: null, ticks: 0 };

  // (1) The listeners. 'error' is the one that matters: its presence is what
  // lets node-redis reach its own reconnect code. The others make the
  // reconnect VISIBLE in the deploy log, which today's outage was not.
  redis.on('error', (err) => {
    log.warn({ err: { code: err?.code, message: String(err?.message || err).slice(0, 200) } }, 'redis error');
  });
  redis.on('reconnecting', () => log.warn('redis reconnecting'));
  redis.on('ready', () => { state.consecutiveFailures = 0; log.info('redis ready'); });
  redis.on('end', () => log.warn('redis connection ended'));

  // (2)+(3) The watchdog. One tick = one bounded PING. Exposed as tick() so
  // a test can drive it without waiting a minute.
  async function tick() {
    state.ticks++;
    if (!redis.isOpen) return snapshot();           // nothing has connected yet; nothing to heal
    try {
      const reply = await withTimeout(redis.ping(), o.pingTimeoutMs, 'redis watchdog ping');
      if (reply !== 'PONG') throw new Error(`unexpected ping reply: ${String(reply).slice(0, 40)}`);
      state.consecutiveFailures = 0;
      state.lastOkAt = Date.now();
    } catch (err) {
      state.consecutiveFailures++;
      state.lastError = String(err?.message || err).slice(0, 200);
      log.warn({ failures: state.consecutiveFailures, err: state.lastError }, 'redis watchdog ping failed');
      if (state.consecutiveFailures >= o.failuresBeforeReset) {
        state.resets++;
        state.consecutiveFailures = 0;
        log.error({ resets: state.resets, err: state.lastError }, 'redis watchdog: forcing disconnect + reconnect');
        try { await redis.disconnect(); } catch (e) { log.warn({ err: String(e?.message || e).slice(0, 120) }, 'redis watchdog: disconnect threw'); }
        try { await redis.connect(); } catch (e) { log.error({ err: String(e?.message || e).slice(0, 120) }, 'redis watchdog: reconnect failed'); }
      }
    }
    return snapshot();
  }
  function snapshot() { return { ...state }; }

  let timer = null;
  if (o.pingIntervalMs > 0) {
    timer = setInterval(() => { tick().catch(() => {}); }, o.pingIntervalMs);
    if (typeof timer.unref === 'function') timer.unref();
  }
  return { tick, state: snapshot, stop() { if (timer) clearInterval(timer); timer = null; } };
}

module.exports = { attachRedisGuard, healthProbe, withTimeout, DEFAULTS };
