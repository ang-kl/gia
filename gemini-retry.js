// gemini-retry.js — exponential-backoff wrapper for Gemini calls.
//
// 503 ("model experiencing high demand") and 429 ("rate limited") are the
// transient error classes that benefit from a short retry. Other errors
// (auth, bad request, depleted credits) bubble out immediately.
//
// Backoff schedule: 1s, 2s, 4s — three retries max. Total worst-case wait
// added per call ≈ 7s, which fits inside Telegram's 30s server-side timeout
// budget for bot replies.

const RETRYABLE_STATUSES = new Set([429, 503]);
const DEFAULT_DELAYS_MS = [1000, 2000, 4000];

function isRetryable(err) {
  // SDK exposes status on err.status; also surfaces it inside the message.
  if (RETRYABLE_STATUSES.has(err?.status)) return true;
  const msg = String(err?.message || '');
  return /\[(429|503)\s/.test(msg);
}

async function withRetry(fn, { delays = DEFAULT_DELAYS_MS, label = 'gemini' } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === delays.length || !isRetryable(err)) throw err;
      const wait = delays[attempt];
      console.warn(`[${label}] retryable error (attempt ${attempt + 1}/${delays.length + 1}) — waiting ${wait}ms: ${err.message?.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

module.exports = { withRetry, isRetryable };
