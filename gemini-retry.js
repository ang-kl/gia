// gemini-retry.js — exponential-backoff wrapper for LLM calls.
//
// v0.40.0: migrated to Anthropic. The filename stays for minimal repo
// churn; the export contract (`withRetry`, `isRetryable`) is unchanged.
// `makeFlashFallback` is retained as a no-op factory returning null so
// existing call sites compile without edits — Anthropic doesn't have a
// "Pro→Flash" overload-class to fall back from, and the SDK already does
// transient retries internally when configured to.
//
// Backoff schedule: 1s, 2s, 4s — three retries max. Total worst-case
// wait added per call ≈ 7s, which fits inside Telegram's 30s server-side
// timeout budget for bot replies.

const { logger } = require('./logger');

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 422]);
const DEFAULT_DELAYS_MS = [1000, 2000, 4000];

function isRetryable(err) {
  const status = err?.status ?? err?.response?.status;
  const msg = String(err?.message || '');
  if (NON_RETRYABLE_STATUSES.has(status)) return false;
  if (/\b(400|401|403|404|422)\b/.test(msg) && !err?._retryHint) return false;
  if (RETRYABLE_STATUSES.has(status)) return true;
  if (/\b(408|429|500|502|503|504|529)\b/.test(msg)) return true;
  if (err?.name === 'RateLimitError') return true;
  if (err?.name === 'APIConnectionError' || err?.name === 'APIConnectionTimeoutError') return true;
  // Network failures (no status, fetch-level errors) are retryable.
  if (!status && /(ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network|socket hang up)/i.test(msg)) return true;
  return false;
}

async function withRetry(fn, { delays = DEFAULT_DELAYS_MS, label = 'llm', fallbackFn = null } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === delays.length || !isRetryable(err)) {
        if (fallbackFn && isRetryable(err)) {
          logger.warn({ label, attempts: delays.length, err: { message: err.message?.slice(0, 200) } }, 'primary exhausted retries — falling back');
          try {
            return await fallbackFn();
          } catch (fallbackErr) {
            logger.error({ label, err: { message: fallbackErr.message?.slice(0, 200) } }, 'fallback also failed');
            throw fallbackErr;
          }
        }
        throw err;
      }
      const wait = delays[attempt];
      logger.warn({ label, attempt: attempt + 1, total: delays.length + 1, waitMs: wait, err: { message: err.message?.slice(0, 200) } }, 'retryable error — waiting');
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// Anthropic has no Pro→Flash equivalent; this exists only so legacy call
// sites that pass `fallbackFn: makeFlashFallback(...)` keep compiling.
// Returning null tells withRetry to skip the fallback path.
function makeFlashFallback() {
  return null;
}

module.exports = { withRetry, isRetryable, makeFlashFallback };
