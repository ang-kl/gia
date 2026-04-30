const crypto = require('crypto');

const LOC_TTL = 24 * 60 * 60;  // 24 hours
const PENDING_TTL = 5 * 60;    // 5 minutes

function hashChatId(chatId) {
  return crypto.createHash('sha256').update(String(chatId)).digest('hex').slice(0, 16);
}

async function setUserLocation(redis, chatId, lat, lng) {
  if (!redis.isOpen) await redis.connect();
  const key = `loc:${hashChatId(chatId)}`;
  await redis.setEx(key, LOC_TTL, JSON.stringify({ lat, lng }));
}

async function getUserLocation(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get(`loc:${hashChatId(chatId)}`);
  return cached ? JSON.parse(cached) : null;
}

async function setPendingMeal(redis, chatId, mealId) {
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`loc:pending:${hashChatId(chatId)}`, PENDING_TTL, mealId);
}

async function consumePendingMeal(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  const key = `loc:pending:${hashChatId(chatId)}`;
  const value = await redis.get(key);
  if (value) await redis.del(key);
  return value;
}

const PROCESSING_TTL = 60; // 60 s — covers a full pickValidated + Routes round trip

async function isProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  return Boolean(await redis.get(`proc:${hashChatId(chatId)}`));
}

async function setProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`proc:${hashChatId(chatId)}`, PROCESSING_TTL, '1');
}

async function clearProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  await redis.del(`proc:${hashChatId(chatId)}`).catch(() => {});
}

module.exports = {
  hashChatId,
  setUserLocation,
  getUserLocation,
  setPendingMeal,
  consumePendingMeal,
  isProcessing,
  setProcessing,
  clearProcessing
};
