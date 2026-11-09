import axios from 'axios';
import { createClient } from 'redis';
import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

// 1. Initialize Clients
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
const redis = createClient({ url: process.env.REDIS_URL });

const lta = axios.create({
  baseURL: 'https://datamall2.mytransport.sg/ltaodataservice',
  headers: { 'AccountKey': process.env.LTA_ACCOUNT_KEY }
});

// 2. The "Sniffer" Logic (Sensing Spoke)
async function updateTransitStatus() {
  try {
    const { data } = await lta.get('/TrainServiceAlerts');
    const isHealthy = data.value.length === 0;
    
    const statusData = {
      status: isHealthy ? '🟢 Healthy' : '🔴 Disruption Detected',
      message: isHealthy ? 'All lines running smoothly.' : data.value[0].Message,
      updatedAt: new Date().toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' })
    };

    await redis.connect();
    await redis.set('lta:train_status', JSON.stringify(statusData));
    await redis.disconnect();
    
    console.log(`[Sniffer] Pulse check complete: ${statusData.status}`);
  } catch (error) {
    console.error('[Sniffer] Error sniffing LTA:', error);
  }
}

// 3. The Telegram Interface (Human Touchpoint)
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  
  await redis.connect();
  const cachedStatus = await redis.get('lta:train_status');
  await redis.disconnect();

  const data = cachedStatus ? JSON.parse(cachedStatus) : null;

  if (data) {
    const response = `*Gia CBD Report*\n\nStatus: ${data.status}\nNotes: ${data.message}\n_Last Refreshed: ${data.updatedAt}_`;
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, "Gia is still sniffing the linkways... try again in a moment.");
  }
});

// 4. Start the Pulse (Runs every 5 minutes)
updateTransitStatus();
setInterval(updateTransitStatus, 300000);

console.log("Gia4lunch is live and sniffing Raffles Place.");
