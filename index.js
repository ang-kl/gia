const axios = require('axios');
const { createClient } = require('redis');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// 1. Setup Clients
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const redis = createClient({ url: process.env.REDIS_URL });

const lta = axios.create({
  baseURL: 'https://datamall2.mytransport.sg/ltaodataservice',
  headers: { 'AccountKey': process.env.LTA_ACCOUNT_KEY }
});

// 2. The Sniffer Function
async function updateTransitStatus() {
  try {
    const { data } = await lta.get('/TrainServiceAlerts');
    const isHealthy = !data.value || data.value.length === 0;
    
    const statusData = {
      status: isHealthy ? '🟢 Healthy' : '🔴 Disruption',
      message: isHealthy ? 'All CBD lines normal.' : data.value[0].Message,
      updatedAt: new Date().toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' })
    };

    if (!redis.isOpen) await redis.connect();
    await redis.set('lta:train_status', JSON.stringify(statusData));
    console.log(`[Pulse] Status updated at ${statusData.updatedAt}`);
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
