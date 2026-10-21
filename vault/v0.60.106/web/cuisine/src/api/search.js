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

// v0.32.0: legacy synchronous fetch — only used when the server has
// PIPELINE_TASKS_ENABLED=false (rollback path). Default flow is now
// submitSearch + pollSearch.
export async function searchCuisine(payload, { timeoutMs = 25000 } = {}) {
  const id = initData();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/cuisine-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': id },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const status = res.status;
    let body = null;
    try { body = await res.json(); } catch { body = await res.text().catch(() => ''); }
    return { status, ok: res.ok, body, timedOut: false };
  } catch (err) {
    if (err?.name === 'AbortError') return { status: 0, ok: false, body: null, timedOut: true };
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// v0.32.0: submit a search request. Server returns 202 + {reqId, pollUrl}.
// The caller then calls pollSearch(reqId) until status is done|empty|error.
export async function submitSearch(payload) {
  const id = initData();
  const res = await fetch('/api/cuisine-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': id },
    body: JSON.stringify(payload)
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.status === 202 || res.ok, body };
}

export async function pollSearch(reqId) {
  const id = initData();
  const res = await fetch(`/api/cuisine-search/${encodeURIComponent(reqId)}`, {
    method: 'GET',
    headers: { 'X-Telegram-Init-Data': id }
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body };
}

// pollUntilDone — polls every `intervalMs` until status is terminal or
// `timeoutMs` elapses. onProgress fired for every intermediate state so
// the UI can paint stage transitions.
export async function pollUntilDone(reqId, { intervalMs = 1500, timeoutMs = 90000, onProgress } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const { status: httpStatus, body } = await pollSearch(reqId);
    if (httpStatus !== 200 || !body) {
      return { ok: false, terminal: 'http_error', body, httpStatus };
    }
    if (onProgress) onProgress(body);
    const s = body.status;
    if (s === 'done' || s === 'empty' || s === 'error') {
      return { ok: s === 'done', terminal: s, body };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ok: false, terminal: 'timeout', body: null };
}
