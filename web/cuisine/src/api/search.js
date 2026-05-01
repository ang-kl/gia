import { initData } from './tg.js';

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
