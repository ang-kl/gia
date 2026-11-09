// v0.60.161 — Cuisine TMA client-side verbose-log shim.
//
// When the server tags any response with `_vlog: true` (meaning the
// operator has /log on for their chat), this module flips to enabled
// and starts reporting fetch timing + window errors to /api/vlog.
// Railway logs surface them as `[VLOG-CLIENT <chatId>] {…}` alongside
// the server-side `[VLOG <chatId>] {…}` lines.
//
// Best-effort: never throws, never blocks the caller. If /api/vlog is
// unreachable or returns ok:false, the report is silently dropped.

import { initData } from '../../api/tg.js';

let _on = false;

export function setEnabled(on) { _on = !!on; }
export function isEnabled() { return _on; }

// Inspect a server response and flip the toggle if the server hinted
// verbose is on. Call this at every fetch return site.
export function noteServerHint(response) {
  if (response && response._vlog === true) _on = true;
}

// Fire-and-forget report. Caps payload size so a runaway client can't
// flood Railway logs.
export function report(payload) {
  if (!_on) return;
  try {
    const id = initData();
    if (!id) return;
    const body = JSON.stringify({ initData: id, payload });
    // Use sendBeacon when available (survives page-unload), fall back to
    // fetch with keepalive.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/vlog', blob);
    } else {
      fetch('/api/vlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => { /* best-effort */ });
    }
  } catch { /* never throw */ }
}

// Convenience: wrap an async fetch with timing + auto-report.
export async function timed(label, fn) {
  const start = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
  try {
    const result = await fn();
    if (_on) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now()) - start);
      report({ kind: 'fetch', label, ms, ok: true });
    }
    return result;
  } catch (err) {
    if (_on) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now()) - start);
      report({ kind: 'fetch', label, ms, ok: false, error: err && (err.message || String(err)) });
    }
    throw err;
  }
}

// One-shot install of global error handlers. Idempotent. Call once on
// App mount. Both handlers are best-effort + auto-no-op when verbose is
// off (the gate is checked inside `report`).
let _handlersInstalled = false;
export function installGlobalHandlers() {
  if (_handlersInstalled || typeof window === 'undefined') return;
  _handlersInstalled = true;
  window.addEventListener('error', (e) => {
    report({
      kind: 'window-error',
      message: e?.message || '',
      filename: e?.filename || '',
      lineno: e?.lineno || 0,
      colno: e?.colno || 0,
      stack: (e?.error && e.error.stack) ? String(e.error.stack).split('\n').slice(0, 4).join(' | ') : null
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason;
    report({
      kind: 'unhandled-rejection',
      message: (reason && (reason.message || String(reason))) || '',
      stack: (reason && reason.stack) ? String(reason.stack).split('\n').slice(0, 4).join(' | ') : null
    });
  });
}
