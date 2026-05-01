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

// Returns {status, ok, body} so the caller can log diagnostics for each
// outcome (HTTP 4xx, 5xx, parse failure, etc.) instead of just throwing.
export async function searchCuisine(payload) {
  const id = initData();
  const res = await fetch('/api/cuisine-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': id
    },
    body: JSON.stringify(payload)
  });
  const status = res.status;
  let body = null;
  try { body = await res.json(); }
  catch { body = await res.text().catch(() => ''); }
  return { status, ok: res.ok, body };
}
