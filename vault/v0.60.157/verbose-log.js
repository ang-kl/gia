// verbose-log.js — per-chat verbose-mode toggle (v0.30.4).
//
// Users opt in with `/log on` to receive step-by-step trace messages
// during NL chat searches and /cuisine pipeline runs. `/log off` clears
// the flag. Toggle is per-chat, 24 h Redis TTL (auto-clears so stale
// debug sessions don't keep spamming the user).

const KEY_PREFIX = 'verbose:';
const TTL_S = 24 * 60 * 60;

async function enable(redis, chatId) {
  if (!redis || !chatId) return;
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`${KEY_PREFIX}${chatId}`, TTL_S, '1');
}

async function disable(redis, chatId) {
  if (!redis || !chatId) return;
  if (!redis.isOpen) await redis.connect();
  await redis.del(`${KEY_PREFIX}${chatId}`).catch(() => {});
}

async function isEnabled(redis, chatId) {
  if (!redis || !chatId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    return Boolean(await redis.get(`${KEY_PREFIX}${chatId}`));
  } catch {
    return false;
  }
}

// Helper used throughout the NL + pipeline flow. `bot.sendMessage` is
// passed in via DI so this module stays decoupled from telegram-bot SDK.
// Returns silently when verbose is off so call-sites don't need guards.
async function say(redis, chatId, sendFn, text) {
  if (!redis || !chatId || !sendFn || !text) return;
  try {
    if (!(await isEnabled(redis, chatId))) return;
    await sendFn(chatId, `🔍 ${text}`);
  } catch (err) {
    console.warn('[Verbose-Log] say failed:', err.message);
  }
}

module.exports = { enable, disable, isEnabled, say, TTL_S };
