const axios = require('axios');
const { createClient } = require('redis');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// 0. Fail fast on missing env vars — Agur's Wisdom: refuse to run noisily.
const required = ['TELEGRAM_BOT_TOKEN', 'REDIS_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[Fatal] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const ltaEnabled = Boolean(process.env.LTA_ACCOUNT_KEY);

// 1. Setup Clients
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const redis = createClient({ url: process.env.REDIS_URL });

const lta = ltaEnabled ? axios.create({
  baseURL: 'https://datamall2.mytransport.sg/ltaodataservice',
  headers: { 'AccountKey': process.env.LTA_ACCOUNT_KEY }
}) : null;

function nowSGT() {
  return new Date().toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' });
}

async function writeStatus(statusData) {
  if (!redis.isOpen) await redis.connect();
  await redis.set('lta:train_status', JSON.stringify(statusData));
}

// 2. The Sniffer Function
async function updateTransitStatus() {
  if (!ltaEnabled) {
    await writeStatus({
      status: '🟡 LTA sensor offline',
      message: 'LTA key not configured — Telegram & memory layer healthy.',
      updatedAt: nowSGT()
    });
    console.log('[Pulse] LTA disabled — wrote stub status.');
    return;
  }
  try {
    const { data } = await lta.get('/TrainServiceAlerts');
    const v = data?.value ?? {};
    const isHealthy = v.Status === 1 || !v.Message?.length;
    const firstMessage = v.Message?.[0]?.Content ?? '';

    await writeStatus({
      status: isHealthy ? '🟢 Healthy' : '🔴 Disruption',
      message: isHealthy ? 'All CBD lines normal.' : firstMessage,
      updatedAt: nowSGT()
    });
    console.log(`[Pulse] Status updated at ${nowSGT()}`);
  } catch (err) {
    console.error('[Error] LTA Sniffer failed:', err.message);
  }
}

// 3. Telegram Handler
bot.onText(/\/status/, async (msg) => {
  try {
    if (!redis.isOpen) await redis.connect();
    const cached = await redis.get('lta:train_status');
    const data = cached ? JSON.parse(cached) : null;

    const response = data 
      ? `*Gia CBD Pulse*\n\nStatus: ${data.status}\nNotes: ${data.message}\n_Refreshed: ${data.updatedAt}_`
      : "Gia is still waking up. Try again in 30 seconds.";

    bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(msg.chat.id, "Sorry, I can't reach my memory right now.");
  }
});

// 4. Initialization
updateTransitStatus();
setInterval(updateTransitStatus, 300000); // Check every 5 minutes

console.log("🚀 Gia4lunch is live and sniffing...");
