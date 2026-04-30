const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { createClient } = require('redis');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { refreshVibeListings } = require('./vibe');
const { getOrCacheSummary } = require('./vibe-summary');
const { mealPeriodSGT, pickValidated, geocodeQuery } = require('./vibe-suggest');
const {
  setUserLocation,
  getUserLocation,
  setPendingMeal,
  consumePendingMeal,
  isProcessing,
  setProcessing,
  clearProcessing
} = require('./location-cache');
const { requireInitData } = require('./twa-auth');
const { gatekeep } = require('./gatekeeper');
const { fetchOpenVaultPicks } = require('./vault');
const { findHiddenSanctuary } = require('./consultant');
const { runHealthCheck } = require('./ver');

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
async function safeSend(chatId, text, opts = {}) {
  try {
    await bot.sendMessage(chatId, text, opts);
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

async function handleNoResults(chatId, mealLabel) {
  await safeSend(
    chatId,
    `Gia couldn't find a ${mealLabel} sanctuary within 200m of you right now. ` +
    `Try sharing a different location or typing a place name.`
  );
}

async function deliverPicks(chatId, mealLabel, picks) {
  if (!picks.length) {
    await handleNoResults(chatId, mealLabel);
    return;
  }
  const header = picks
    .map((p, i) => {
      const rating = p.rating ? ` ⭐${p.rating.toFixed(1)}` : '';
      const open = p.openNow === true ? ' · Open now'
        : p.openNow === false ? ' · Closed'
        : '';
      const walk = Number.isFinite(p.walkMinutes) ? ` · ${p.walkMinutes} min walk` : '';
      return `${i + 1}. ${p.name}${rating}${open}${walk}`;
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

async function runFlow(chatId, lat, lng, category) {
  // v0.10.0: per-chat processing lock prevents duplicate parallel pipelines
  // when the user impatiently re-taps /eat or types again before the
  // previous run completes.
  if (await isProcessing(redis, chatId)) {
    await safeSend(chatId, '⏳ Gia is still working on your last request — hold on a moment.');
    return;
  }
  await setProcessing(redis, chatId);
  try {
    // Vault-first (v0.9.0) for /eat and /drink:
    if (category === 'food' || category === 'drink') {
      try {
        const vaultPicks = await fetchOpenVaultPicks(redis, lat, lng, 300, 3);
        if (vaultPicks.length >= 3) {
          const label = category === 'food' ? mealPeriodSGT().label : category;
          await deliverPicks(chatId, label, vaultPicks);
          return;
        }
      } catch (err) {
        console.error('[Vault] runtime query failed; falling through to pickValidated:', err.message);
      }
    }
    // Fail-fast pickValidated (v0.8.1).
    const { meal, venues } = await pickValidated(lat, lng, 3, [], { category });
    if (venues.length) {
      await deliverPicks(chatId, meal.label, venues);
      return;
    }
    // v0.10.0 Consultant Layer: zero results → ask Gemini to surface
    // a Hidden Sanctuary from broader Places searchNearby + reviews.
    try {
      const hidden = await findHiddenSanctuary(lat, lng);
      if (hidden) {
        await safeSend(
          chatId,
          `I couldn't find a standard ${meal.label} sanctuary, but I've identified a 'Hidden Sanctuary' at ${hidden.name} based on recent reviews mentioning ${hidden.vibe}.`
        );
        await deliverPicks(chatId, meal.label, [hidden]);
        return;
      }
    } catch (err) {
      console.error('[Consultant] findHiddenSanctuary failed:', err.message);
    }
    await deliverPicks(chatId, meal.label, []);
  } finally {
    await clearProcessing(redis, chatId).catch(() => {});
  }
}

const LOCATION_REQUEST_KEYBOARD = {
  reply_markup: {
    keyboard: [
      [{ text: '📍 Share my location', request_location: true }],
      [{ text: '⛔ Use Raffles Place default' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  }
};

const KEYBOARD_TEXTS = new Set([
  '📍 Share my location',
  '⛔ Use Raffles Place default'
]);

const ACK_SENSING_VIBE = '🌿 Sensing the vibe…';
const MANUAL_FALLBACK_PROMPT =
  "I'm having a bit of trouble pinning your exact location. Could you type the name of the building or area you are at?";

async function startSanctuaryFlow(chatId, category, prompt) {
  const cached = await getUserLocation(redis, chatId);
  if (cached) {
    await safeSend(chatId, ACK_SENSING_VIBE);
    await runFlow(chatId, cached.lat, cached.lng, category);
    return;
  }
  await setPendingMeal(redis, chatId, category);
  await bot.sendMessage(
    chatId,
    `Please tap to share your location, or type a place name and Gia will search within 200 m of it.`,
    LOCATION_REQUEST_KEYBOARD
  );
}

bot.onText(/^\/eat(?:@\w+)?$/, async (msg) => {
  try {
    const meal = mealPeriodSGT();
    await startSanctuaryFlow(msg.chat.id, 'food', meal.label);
  } catch (err) {
    console.error('[Error] /eat handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't think of where to eat right now.");
  }
});

bot.onText(/^\/drink(?:@\w+)?$/, async (msg) => {
  try {
    await startSanctuaryFlow(msg.chat.id, 'drink', 'drinks');
  } catch (err) {
    console.error('[Error] /drink handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't think of where to drink right now.");
  }
});

bot.onText(/^\/groceries(?:@\w+)?$/, async (msg) => {
  try {
    await startSanctuaryFlow(msg.chat.id, 'groceries', 'groceries');
  } catch (err) {
    console.error('[Error] /groceries handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't reach my grocery list right now.");
  }
});

bot.onText(/^⛔ Use Raffles Place default$/, async (msg) => {
  try {
    const pending = await consumePendingMeal(redis, msg.chat.id);
    const category = ['food', 'drink', 'groceries'].includes(pending) ? pending : 'food';
    await safeSend(msg.chat.id, ACK_SENSING_VIBE);
    await runFlow(msg.chat.id, 1.2839, 103.8517, category);
  } catch (err) {
    console.error('[Error] default fallback failed:', err.message);
    await safeSend(msg.chat.id, MANUAL_FALLBACK_PROMPT);
  }
});

bot.on('location', async (msg) => {
  // §2 Location Validation Gate: any failure restores pending state
  // and asks the user to type a place name instead of erroring out.
  let pending;
  try {
    pending = await consumePendingMeal(redis, msg.chat.id);
    if (!pending) return; // not part of a sanctuary flow

    // Universal immediate ack — keeps socket warm across all platforms.
    await safeSend(msg.chat.id, ACK_SENSING_VIBE);

    const lat = msg.location?.latitude;
    const lng = msg.location?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('coordinates missing or malformed');
    }
    const category = ['food', 'drink', 'groceries'].includes(pending) ? pending : 'food';
    await setUserLocation(redis, msg.chat.id, lat, lng);
    await runFlow(msg.chat.id, lat, lng, category);
  } catch (err) {
    console.error('[Error] location handler failed:', err.message);
    // Validation gate: restore pending so the next typed message is
    // treated as a manual location query, then prompt for it.
    if (pending) {
      try { await setPendingMeal(redis, msg.chat.id, pending); } catch { /* best-effort */ }
    }
    await safeSend(msg.chat.id, MANUAL_FALLBACK_PROMPT);
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

bot.onText(/^\/ver(?:@\w+)?$/, async (msg) => {
  try {
    await safeSend(msg.chat.id, '🩺 Running health check…');
    const report = await runHealthCheck(bot, redis);
    const escaped = report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await bot.sendMessage(msg.chat.id, `<pre>${escaped}</pre>`, { parse_mode: 'HTML' })
      .catch(async () => { await safeSend(msg.chat.id, report); });
  } catch (err) {
    console.error('[Error] /ver handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I couldn't run the health check.");
  }
});

bot.onText(/^\/start(?:@\w+)?$/, async (msg) => {
  await safeSend(
    msg.chat.id,
    "I'm Gia, the concierge inside soleat — your CBD sanctuary guide.\n\n" +
    "/eat — solo-diner food picks for now\n" +
    "/drink — bars, coffee, tea spots\n" +
    "/groceries — supermarkets & fresh markets\n" +
    "/status — live MRT pulse\n\n" +
    "Tap the menu button (🌿 soleat Map) for the live map view, or just message me what you're craving."
  );
});

// Free-text handler. If a sanctuary flow is pending (user just got the
// "share location or type a place" prompt), interpret the text as a
// place name → geocode → run the flow. Otherwise fall through to the
// Topic Gatekeeper.
bot.on('message', async (msg) => {
  try {
    if (!msg.text) return;
    const text = msg.text.trim();
    if (!text) return;
    if (text.startsWith('/')) return;
    if (KEYBOARD_TEXTS.has(text)) return;
    const hasCommand = (msg.entities ?? []).some((e) => e.type === 'bot_command');
    if (hasCommand) return;

    const pending = await consumePendingMeal(redis, msg.chat.id);
    if (pending) {
      const category = ['food', 'drink', 'groceries'].includes(pending) ? pending : 'food';
      // §1 Universal ack — same copy across all entry points.
      await safeSend(msg.chat.id, ACK_SENSING_VIBE);
      const place = await geocodeQuery(text);
      if (!place) {
        await safeSend(msg.chat.id, `I couldn't place "${text}". ${MANUAL_FALLBACK_PROMPT}`);
        await setPendingMeal(redis, msg.chat.id, category); // §4 stay locked in original intent
        return;
      }
      await setUserLocation(redis, msg.chat.id, place.lat, place.lng);
      await safeSend(msg.chat.id, `Centred on ${place.name}.`);
      await runFlow(msg.chat.id, place.lat, place.lng, category);
      return;
    }

    const result = await gatekeep(redis, text);
    if (result?.reply) await safeSend(msg.chat.id, result.reply);
  } catch (err) {
    console.error('[Error] free-text handler failed:', err.message);
  }
});

// 4. Initialization
async function registerCommandsMenu() {
  try {
    await bot.setMyCommands([
      { command: 'eat', description: 'Solo-diner food picks for now' },
      { command: 'drink', description: 'Bars, coffee, tea spots near you' },
      { command: 'groceries', description: 'Supermarkets and fresh markets near you' },
      { command: 'status', description: 'CBD train pulse' },
      { command: 'ver', description: 'Version + upstream API health' }
    ]);
    if (useWebhook) {
      await bot.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '🌿 soleat Map',
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
      res.json({
        key: process.env.GOOGLE_MAPS_API_KEY ?? '',
        mapId: process.env.MAP_ID || 'GIA_SANCTUARY'
      });
    });

    app.get('/api/sanctuary', requireInitData, async (req, res) => {
      try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const categoryParam = (req.query.category || 'food').toString();
        const category = ['food', 'drink', 'groceries'].includes(categoryParam) ? categoryParam : 'food';
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: 'lat and lng query params required' });
        }
        const { meal, venues } = await pickValidated(lat, lng, 3, [], { category });
        res.json({ category, meal: meal.id, label: meal.label, venues });
      } catch (err) {
        console.error('[Error] /api/sanctuary failed:', err.message);
        res.status(500).json({ error: 'sanctuary fetch failed' });
      }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`[HTTP] Listening on :${port}`));
  }

  console.log("🚀 soleat is live and sniffing...");
})();
