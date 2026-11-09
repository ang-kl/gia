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
// disconnect()+connect(). healthProbe() is what /readyz reports, so the
// readiness check sees what users see.
//
// v0.62.934 — two Codex findings on #1867 ([AMD-222]):
//   P2. A timed-out PING was only abandoned by its awaiter; node-redis kept
//       the command queued until the watchdog's reset, so every probe during
//       a blackholed connection added one more. Now (a) the PING carries an
//       AbortSignal and is REMOVED from the queue on timeout (node-redis only
//       aborts commands still waiting to be sent — which is exactly the
//       production shape, isOpen && !isReady), and (b) probes COALESCE: one
//       PING in flight per client, shared by every concurrent caller, so the
//       queue can hold at most one of ours whatever the request rate.
//   P1. /healthz stopped returning 503 — that is index.js's side; see there.

const DEFAULTS = Object.freeze({
  pingIntervalMs: 60_000,
  pingTimeoutMs: 5_000,
  failuresBeforeReset: 3,
});

let commandOptions = null;
try { ({ commandOptions } = require('redis')); } catch { /* tests may run without it; fakes ignore the arg */ }

// v0.62.935 — two more Codex findings, on #1868's coalescing ([AMD-224]):
//   P2-a. Sharing one WRAPPER promise meant a joiner inherited the creator's
//         deadline: /readyz (1.5 s) joining the watchdog's PING waited 5 s, and
//         /healthz joining it could outlast webhook-domain's 5 s axios
//         timeout — which reads as an unreachable host, the very failover
//         v0.62.934 existed to prevent. Now the COMMAND is shared and every
//         caller races it against its OWN deadline.
//   P2-b. The in-flight entry was dropped when the wrapper timed out, but an
//         in-flight PING on a ready-but-blackholed socket cannot be aborted, so
//         the next probe started another. Now the entry lives until the RAW
//         command settles — by reply, by abort (queued commands), or by the
//         watchdog's disconnect (in-flight ones) — so there is never more than
//         one outstanding probe PING per client, whatever the request rate.
//   The abort is scheduled at the LATEST deadline among the callers that joined,
//   so a short caller's timeout never cancels a longer caller's wait.

// One raw PING carrying an AbortSignal. No timeout of its own.
function issuePing(redis) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const opts = ctrl && commandOptions ? commandOptions({ signal: ctrl.signal }) : undefined;
  const commandPromise = Promise.resolve().then(() => (opts ? redis.ping(opts) : redis.ping()));
  commandPromise.catch(() => {});                      // observed via the wrappers; never unhandled
  return { commandPromise, abort: () => { if (ctrl) ctrl.abort(); } };
}

// Single-caller bounded PING (tests drive this): times out at `ms` and aborts
// the command at the same moment.
function startPing(redis, ms) {
  const { commandPromise, abort } = issuePing(redis);
  const promise = withTimeout(commandPromise, ms, 'redis ping').catch((err) => { abort(); throw err; });
  return { promise, commandPromise, abort };
}

// Coalesced: at most one probe PING OUTSTANDING per client. Callers share the
// command, keep their own deadlines, and the entry outlives every wrapper.
const inflight = new WeakMap();
function boundedPing(redis, ms) {
  let entry = inflight.get(redis);
  if (!entry) {
    const { commandPromise, abort } = issuePing(redis);
    entry = { commandPromise, abort, abortAt: 0, abortFired: false, timer: null, startedAt: Date.now() };
    inflight.set(redis, entry);
    commandPromise.finally(() => {
      if (entry.timer) clearTimeout(entry.timer);
      if (inflight.get(redis) === entry) inflight.delete(redis);
    }).catch(() => {});
  }
  // Abort at the latest deadline any joiner asked for (P2-a); only a queued
  // command can be removed by it, an in-flight one settles on its own. The
  // abort timer is armed BEFORE this caller's own timer on purpose: Node fires
  // equal-duration timers in arming order, so the command is settled — and the
  // entry released, in the same microtask drain — before the caller resumes.
  // Armed the other way round, a probe arriving between the two would join a
  // command already doomed (measured: the intermittent-blip test reset).
  const abortAt = Date.now() + ms;
  if (abortAt > entry.abortAt) {
    entry.abortAt = abortAt;
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => { entry.abortFired = true; entry.abort(); }, ms);
    if (typeof entry.timer.unref === 'function') entry.timer.unref();
  }
  // This caller's deadline, nobody else's. When our own abort is what settled
  // the command, the caller is told it TIMED OUT — node-redis's `The command
  // was aborted` says what we did, not why.
  return withTimeout(entry.commandPromise, ms, 'redis ping').catch((err) => {
    if (entry.abortFired && /abort/i.test(`${err?.name} ${err?.message}`)) throw new Error(`redis ping timed out after ${ms}ms`);
    throw err;
  });
}
// The watchdog's reset tears the connection down; node-redis rejects every
// command on it (DisconnectsClientError), which settles the entry. Forgetting
// it here as well makes that independent of the library doing so: a probe
// from BEFORE the reset belongs to the dead connection either way.
function forgetPing(redis) {
  const entry = inflight.get(redis);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  inflight.delete(redis);
}

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// What /readyz reports (and /healthz carries as `ready`, without changing its status). `ready` is the answer users get: it is true only
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
      out.ping = await boundedPing(redis, timeoutMs);
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
      const reply = await boundedPing(redis, o.pingTimeoutMs);
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
        forgetPing(redis);
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

module.exports = { attachRedisGuard, healthProbe, withTimeout, DEFAULTS, _startPing: startPing, _boundedPing: boundedPing, _issuePing: issuePing };
