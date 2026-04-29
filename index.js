const crypto = require('crypto');
const axios = require('axios');
const express = require('express');
const { createClient } = require('redis');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { refreshVibeListings, pickLunch } = require('./vibe');

// 0. Fail fast on missing env vars — Agur's Wisdom: refuse to run noisily.
const required = ['TELEGRAM_BOT_TOKEN', 'REDIS_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[Fatal] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const ltaEnabled = Boolean(process.env.LTA_ACCOUNT_KEY);
const webhookDomain = process.env.WEBHOOK_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN;
const useWebhook = Boolean(webhookDomain);
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.randomBytes(16).toString('hex');

// 1. Setup Clients
const bot = new TelegramBot(
  process.env.TELEGRAM_BOT_TOKEN,
  useWebhook ? {} : { polling: true }
);
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
    try {
      await writeStatus({
        status: '🟡 LTA sensor degraded',
        message: `LTA call failed (${err.message}). Telegram & memory layer healthy.`,
        updatedAt: nowSGT()
      });
    } catch (writeErr) {
      console.error('[Error] Fallback status write failed:', writeErr.message);
    }
  }
}

// 3. Telegram Handlers
async function safeSend(chatId, text) {
  try {
    await bot.sendMessage(chatId, text);
  } catch (err) {
    console.error(`[Error] sendMessage to ${chatId} failed:`, err.message);
  }
}

async function safeVenue(chatId, lat, lng, title, address) {
  try {
    await bot.sendVenue(chatId, lat, lng, title, address);
  } catch (err) {
    console.error(`[Error] sendVenue to ${chatId} failed:`, err.message);
  }
}

bot.onText(/^\/lunch(?:@\w+)?$/, async (msg) => {
  try {
    const picks = await pickLunch(redis, 3);
    if (!picks.length) {
      await safeSend(msg.chat.id, "Gia has no listings yet. Try again in a few minutes.");
      return;
    }
    const header = picks
      .map((p, i) => {
        const rating = p.rating ? ` ⭐${p.rating.toFixed(1)}` : '';
        const open = p.openNow === true ? ' · Open now'
          : p.openNow === false ? ' · Closed'
          : '';
        return `${i + 1}. ${p.name}${rating}${open}`;
      })
      .join('\n');
    await safeSend(msg.chat.id, `Gia's Sanctuary Picks\n\n${header}`);

    for (const p of picks) {
      if (p.lat != null && p.lng != null) {
        await safeVenue(msg.chat.id, p.lat, p.lng, p.name, p.area);
      } else {
        await safeSend(msg.chat.id, `${p.name}\n${p.area}\n${p.url}`);
      }
    }
  } catch (err) {
    console.error('[Error] /lunch handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't reach my listings right now.");
  }
});

bot.onText(/^\/status(?:@\w+)?$/, async (msg) => {
  try {
    if (!redis.isOpen) await redis.connect();
    const cached = await redis.get('lta:train_status');
    const data = cached ? JSON.parse(cached) : null;

    const response = data
      ? `Gia CBD Pulse\n\nStatus: ${data.status}\nNotes: ${data.message}\nRefreshed: ${data.updatedAt}`
      : "Gia is still waking up. Try again in 30 seconds.";

    await safeSend(msg.chat.id, response);
  } catch (err) {
    console.error('[Error] /status handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't reach my memory right now.");
  }
});

bot.onText(/^\/start(?:@\w+)?$/, async (msg) => {
  await safeSend(
    msg.chat.id,
    "I'm Gia — your Raffles Place lunch concierge.\n\n" +
    "/status — CBD train pulse\n" +
    "/lunch — 3 sanctuary picks near Raffles Place"
  );
});

// 4. Initialization
async function registerCommandsMenu() {
  try {
    await bot.setMyCommands([
      { command: 'status', description: 'CBD train pulse' },
      { command: 'lunch', description: '3 sanctuary picks near Raffles Place' }
    ]);
    await bot.setChatMenuButton({ menu_button: { type: 'commands' } });
  } catch (err) {
    console.error('[Warn] setMyCommands/setChatMenuButton failed:', err.message);
  }
}

async function configureUpdates() {
  if (useWebhook) {
    const url = `https://${webhookDomain}/webhook`;
    try {
      await bot.setWebHook(url, {
        secret_token: webhookSecret,
        drop_pending_updates: true
      });
      console.log(`[Updates] Webhook registered: ${url}`);
    } catch (err) {
      console.error('[Fatal] setWebHook failed:', err.message);
      process.exit(1);
    }
  } else {
    try {
      await bot.deleteWebHook({ drop_pending_updates: true });
      console.log('[Updates] Polling mode (no WEBHOOK_DOMAIN / RAILWAY_PUBLIC_DOMAIN).');
    } catch (err) {
      console.error('[Warn] deleteWebHook failed:', err.message);
    }
  }
}

(async () => {
  await configureUpdates();
  await registerCommandsMenu();

  await updateTransitStatus();
  setInterval(updateTransitStatus, 300000); // 5 min

  try {
    await refreshVibeListings(redis);
  } catch (err) {
    console.error('[Warn] Initial Vibe refresh failed:', err.message);
  }
  setInterval(() => {
    refreshVibeListings(redis).catch((err) =>
      console.error('[Warn] Vibe refresh failed:', err.message)
    );
  }, 24 * 60 * 60 * 1000); // 24 h

  if (useWebhook) {
    const app = express();
    app.use(express.json());

    app.get('/health', (_req, res) => res.send('ok'));

    app.post('/webhook', (req, res) => {
      if (req.headers['x-telegram-bot-api-secret-token'] !== webhookSecret) {
        return res.sendStatus(401);
      }
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`[HTTP] Listening on :${port}`));
  }

  console.log("🚀 Gia4lunch is live and sniffing...");
})();
