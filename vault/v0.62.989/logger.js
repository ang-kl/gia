// logger.js — pino structured logger.
//
// v0.42.0: replaces ad-hoc console.log strings across the v0.41.0 hot
// path. Other files still log via console.* and will be swept in v0.43.0.
//
// Production: JSON to stdout (Railway captures it).
// Development: pretty-printed via pino-pretty.
//
// Child loggers via logger.child({ reqId, chatIdHash, kind }) propagate
// correlation IDs through pipeline-task stages. Once the v0.43.0 sweep
// finishes, you can `grep '"reqId":"abc"'` and get every log line for
// that request in time order across all stages.
//
// Redaction: never serialise API keys / Telegram tokens. The redact
// list below covers the obvious paths; if you add a new secret-bearing
// object shape, add it here too.

const pino = require('pino');
const pkg = require('./package.json');

const isProd = process.env.NODE_ENV === 'production';

const baseConfig = {
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: { service: 'soleat', version: pkg.version },
  redact: {
    paths: [
      'apiKey', 'api_key', 'token', 'authorization',
      '*.apiKey', '*.api_key', '*.token', '*.authorization',
      'TELEGRAM_BOT_TOKEN', 'ANTHROPIC_API_KEY', 'GOOGLE_MAPS_API_KEY',
      'env.TELEGRAM_BOT_TOKEN', 'env.ANTHROPIC_API_KEY', 'env.GOOGLE_MAPS_API_KEY'
    ],
    remove: true
  }
};

let transport;
if (!isProd) {
  try {
    transport = { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,version' } };
  } catch {
    // pino-pretty not installed in this environment — fall back to JSON
    transport = undefined;
  }
}

const logger = pino(transport ? { ...baseConfig, transport } : baseConfig);

function forRequest(reqId, extra = {}) {
  return logger.child({ reqId, ...extra });
}

module.exports = { logger, forRequest };
