// gemini-retry.js — exponential-backoff wrapper for Gemini calls.
//
// 503 ("model experiencing high demand") and 429 ("rate limited") are the
// transient error classes that benefit from a short retry. Other errors
// (auth, bad request, depleted credits) bubble out immediately.
//
// Backoff schedule: 1s, 2s, 4s — three retries max. Total worst-case wait
// added per call ≈ 7s, which fits inside Telegram's 30s server-side timeout
// budget for bot replies.
//
// v0.30.2: when the configured GEMINI_MODEL has exhausted retries on a
// transient error, withRetry invokes an optional `fallbackFn` (typically
// the same prompt against gemini-2.5-flash). Designed for the Pro-
// overload class of outage where Flash is fine and Pro isn't.

const RETRYABLE_STATUSES = new Set([429, 503]);
const DEFAULT_DELAYS_MS = [1000, 2000, 4000];
const FLASH_MODEL = 'gemini-2.5-flash';

function isRetryable(err) {
  // SDK exposes status on err.status; also surfaces it inside the message.
  if (RETRYABLE_STATUSES.has(err?.status)) return true;
  const msg = String(err?.message || '');
  return /\[(429|503)\s/.test(msg);
}

async function withRetry(fn, { delays = DEFAULT_DELAYS_MS, label = 'gemini', fallbackFn = null } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === delays.length || !isRetryable(err)) {
        // v0.30.2: model fallback. Only on the terminal-retryable case
        // (retries exhausted on 429/503). Skip when the error wasn't
        // transient — auth / bad-request / schema errors won't be fixed
        // by switching to Flash either.
        if (fallbackFn && isRetryable(err)) {
          console.warn(`[${label}] primary model exhausted ${delays.length} retries on transient error; falling back to flash: ${err.message?.slice(0, 120)}`);
          try {
            return await fallbackFn();
          } catch (fallbackErr) {
            console.error(`[${label}] fallback also failed: ${fallbackErr.message?.slice(0, 120)}`);
            throw fallbackErr;
          }
        }
        throw err;
      }
      const wait = delays[attempt];
      console.warn(`[${label}] retryable error (attempt ${attempt + 1}/${delays.length + 1}) — waiting ${wait}ms: ${err.message?.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// v0.30.2: helper to wrap a `model.generateContent(prompt)` call with an
// automatic Flash fallback when the configured model is something else
// (typically Pro). Returns null when the configured model is already
// Flash (no fallback target makes sense) — withRetry then skips the
// fallback path.
function makeFlashFallback(genAI, prompt, generationConfig = {}) {
  const configuredModel = process.env.GEMINI_MODEL || FLASH_MODEL;
  if (configuredModel === FLASH_MODEL || !genAI) return null;
  return async () => {
    const flashModel = genAI.getGenerativeModel({
      model: FLASH_MODEL,
      generationConfig
    });
    return flashModel.generateContent(prompt);
  };
}

module.exports = { withRetry, isRetryable, makeFlashFallback, FLASH_MODEL };
