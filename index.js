const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { createClient } = require('redis');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { refreshVibeListings, pickLunch } = require('./vibe');
const { getOrCacheSummary } = require('./vibe-summary');
const { mealPeriodSGT, pickValidated } = require('./vibe-suggest');
const {
  setUserLocation,
  getUserLocation,
  setPendingMeal,
  consumePendingMeal
} = require('./location-cache');
const { requireInitData } = require('./twa-auth');

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

async function safeVenue(chatId, lat, lng, title, address, opts = {}) {
  try {
    await bot.sendVenue(chatId, lat, lng, title, address, opts);
  } catch (err) {
    console.error(`[Error] sendVenue to ${chatId} failed:`, err.message);
  }
}

async function deliverPicks(chatId, mealLabel, picks) {
  if (!picks.length) {
    await safeSend(chatId, "Gia has no sanctuary picks for you right now. Try again in a few minutes.");
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
  await safeSend(chatId, `Gia's ${mealLabel} sanctuary picks\n\n${header}`);

  for (const p of picks) {
    if (p.lat != null && p.lng != null) {
      const placeId = p.placeId ?? p.id;
      const venueOpts = placeId
        ? { google_place_id: placeId, google_place_type: p.primaryType ?? 'restaurant' }
        : {};
      await safeVenue(chatId, p.lat, p.lng, p.name, p.area, venueOpts);
    } else {
      await safeSend(chatId, `${p.name}\n${p.area}\n${p.url}`);
    }

    const pid = p.placeId ?? p.id;
    let summary = null;
    if (pid) {
      try { summary = await getOrCacheSummary(redis, pid); }
      catch (err) { console.error('[Error] vibe summary fetch failed:', err.message); }
    }
    const body = summary
      ? `🌿 Sanctuary read for ${p.name}\n${summary}`
      : (p.vibe ? `🌿 ${p.name}\n${p.vibe}` : null);

    const buttons = [];
    if (pid) {
      if (useWebhook) {
        buttons.push({
          text: '📍 Open Map',
          web_app: { url: `https://${webhookDomain}/app?placeId=${encodeURIComponent(pid)}` }
        });
      }
      buttons.push({
        text: '🚗 Directions',
        url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${encodeURIComponent(pid)}`
      });
    }
    const replyMarkup = buttons.length ? { reply_markup: { inline_keyboard: [buttons] } } : {};

    if (body) {
      try { await bot.sendMessage(chatId, body, replyMarkup); }
      catch (err) { console.error('[Error] sendMessage with markup failed:', err.message); }
    } else if (buttons.length) {
      try { await bot.sendMessage(chatId, `🌿 ${p.name}`, replyMarkup); }
      catch (err) { console.error('[Error] sendMessage with markup failed:', err.message); }
    }
  }
}

async function runEatFlow(chatId, lat, lng) {
  const seedFallback = await pickLunch(redis, 5).catch(() => []);
  const { meal, venues } = await pickValidated(lat, lng, 3, seedFallback);
  await deliverPicks(chatId, meal.label, venues);
}

bot.onText(/^\/eat(?:@\w+)?$/, async (msg) => {
  try {
    const meal = mealPeriodSGT();
    const cached = await getUserLocation(redis, msg.chat.id);
    if (cached) {
      await safeSend(msg.chat.id, `Looking for ${meal.label} near your last shared spot…`);
      await runEatFlow(msg.chat.id, cached.lat, cached.lng);
      return;
    }
    await setPendingMeal(redis, msg.chat.id, meal.id);
    await bot.sendMessage(
      msg.chat.id,
      `Where are you for ${meal.label}? Tap to share once.`,
      {
        reply_markup: {
          keyboard: [
            [{ text: '📍 Share my location', request_location: true }],
            [{ text: '⛔ Use Raffles Place default' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );
  } catch (err) {
    console.error('[Error] /eat handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't think of where to eat right now.");
  }
});

bot.onText(/^⛔ Use Raffles Place default$/, async (msg) => {
  try {
    await consumePendingMeal(redis, msg.chat.id);
    const meal = mealPeriodSGT();
    await safeSend(msg.chat.id, `Looking for ${meal.label} around Raffles Place…`, );
    const seedFallback = await pickLunch(redis, 5).catch(() => []);
    const { venues } = await pickValidated(1.2839, 103.8517, 3, seedFallback);
    await deliverPicks(msg.chat.id, meal.label, venues);
  } catch (err) {
    console.error('[Error] default fallback failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't reach my listings right now.");
  }
});

bot.on('location', async (msg) => {
  if (!msg.location) return;
  const pending = await consumePendingMeal(redis, msg.chat.id);
  if (!pending) return;
  try {
    const { latitude, longitude } = msg.location;
    await setUserLocation(redis, msg.chat.id, latitude, longitude);
    const meal = mealPeriodSGT();
    await safeSend(msg.chat.id, `Got it. Looking for ${meal.label} within 800m…`);
    await runEatFlow(msg.chat.id, latitude, longitude);
  } catch (err) {
    console.error('[Error] location handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I couldn't process that location.");
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
    "I'm Gia — your CBD sanctuary concierge.\n\n" +
    "/status — CBD train pulse\n" +
    "/eat — 3 sanctuary picks tuned to the time of day\n" +
    "Tap the menu button (🌿 Gia Map) for the live map view."
  );
});

// 4. Initialization
async function registerCommandsMenu() {
  try {
    await bot.setMyCommands([
      { command: 'status', description: 'CBD train pulse' },
      { command: 'eat', description: '3 sanctuary picks for now (breakfast/lunch/dinner/supper)' }
    ]);
    if (useWebhook) {
      await bot.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '🌿 Gia Map',
          web_app: { url: `https://${webhookDomain}/app` }
        }
      });
    } else {
      await bot.setChatMenuButton({ menu_button: { type: 'commands' } });
    }
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

    app.use('/static', express.static(path.join(__dirname, 'public')));
    app.get('/app', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

    app.get('/maps-key', requireInitData, (_req, res) => {
      res.json({ key: process.env.GOOGLE_MAPS_API_KEY ?? '' });
    });

    app.get('/api/sanctuary', requireInitData, async (req, res) => {
      try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: 'lat and lng query params required' });
        }
        const seedFallback = await pickLunch(redis, 5).catch(() => []);
        const { meal, venues } = await pickValidated(lat, lng, 3, seedFallback);
        res.json({ meal: meal.id, label: meal.label, venues });
      } catch (err) {
        console.error('[Error] /api/sanctuary failed:', err.message);
        res.status(500).json({ error: 'sanctuary fetch failed' });
      }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`[HTTP] Listening on :${port}`));
  }

  console.log("🚀 Gia4lunch is live and sniffing...");
})();
