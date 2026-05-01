import { initData } from './tg.js';

// v0.26.1: pre-flight ping the TMA fires on mount. Auth-free, returns the
// server capability snapshot (version, pipelineEnabled, env presence).
// Used to confirm "the bridge is up" *before* the user taps Search.
export async function diagPing() {
  const t0 = Date.now();
  try {
    const res = await fetch('/api/diag/cuisine', { method: 'GET' });
    const body = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body, elapsedMs: Date.now() - t0 };
  } catch (err) {
    return { status: 0, ok: false, body: null, elapsedMs: Date.now() - t0, error: err.message };
  }
}

// Returns {status, ok, body, timedOut} so the caller can log diagnostics
// for each outcome (4xx, 5xx, parse, abort) and pivot to sendData.
// timeoutMs default 6000 — long enough for the Reason+Refine Gemini
// round-trip on a slow link, short enough to give the fallback room.
export async function searchCuisine(payload, { timeoutMs = 6000 } = {}) {
  const id = initData();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/cuisine-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': id
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const status = res.status;
    let body = null;
    try { body = await res.json(); }
    catch { body = await res.text().catch(() => ''); }
    return { status, ok: res.ok, body, timedOut: false };
  } catch (err) {
    if (err?.name === 'AbortError') return { status: 0, ok: false, body: null, timedOut: true };
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
