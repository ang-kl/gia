// sentry.js — error tracking init.
//
// v0.42.0: minimal Sentry integration. No-op when SENTRY_DSN is unset
// (CI, dev, or operator opt-out — the bot still runs unchanged).
//
// Privacy: chatIds are sha256-hashed (first 12 chars) before being
// attached to scope. No prompt content, no user names, no precise GPS
// coordinates beyond the geoBucket precision (~110m). PII guard via
// sendDefaultPii: false.
//
// What we capture:
//   - process-level uncaughtException + unhandledRejection
//   - Express errors via Sentry.Handlers.errorHandler() middleware
//   - bot.on('polling_error') / bot.on('webhook_error')
//   - pipeline-task catch blocks via captureWithReqId()
//
// What we don't capture (yet):
//   - Performance spans (tracesSampleRate: 0)
//   - Source-map upload (Node side isn't minified; TMA side deferred)
//   - User feedback dialog
//
// Free tier: 5k events/month. The beforeSend hook drops the most common
// noise (ETELEGRAM 429 polling errors). If event volume grows, upgrade
// or tighten beforeSend.

const Sentry = require('@sentry/node');
const crypto = require('crypto');
const pkg = require('./package.json');

let initialised = false;

function init() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  if (initialised) return true;
  Sentry.init({
    dsn,
    release: `soleat@${pkg.version}`,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value || '';
      // Drop polling-error noise that bursts during Telegram outages.
      if (/ETELEGRAM:\s*429\b/.test(msg)) return null;
      if (/ETELEGRAM:\s*502\b/.test(msg)) return null;
      // Drop EFATAL: AggregateError network blips — they recover.
      if (/EFATAL.*AggregateError/.test(msg)) return null;
      return event;
    }
  });
  initialised = true;
  return true;
}

function isInitialised() { return initialised; }

function hashChatId(chatId) {
  if (chatId == null) return null;
  return crypto.createHash('sha256').update(String(chatId)).digest('hex').slice(0, 12);
}

function captureWithReqId(err, reqId, extra = {}) {
  if (!initialised) return;
  Sentry.withScope((scope) => {
    if (reqId) scope.setTag('reqId', reqId);
    if (extra.chatId != null) {
      scope.setTag('chatIdHash', hashChatId(extra.chatId));
      delete extra.chatId;
    }
    Object.entries(extra).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(err);
  });
}

function captureMessage(msg, level = 'info', extra = {}) {
  if (!initialised) return;
  Sentry.withScope((scope) => {
    Object.entries(extra).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureMessage(msg, level);
  });
}

module.exports = { init, isInitialised, captureWithReqId, captureMessage, hashChatId, Sentry };
