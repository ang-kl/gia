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
const weather = require('./weather');
const carpark = require('./carpark');
const transport = require('./transport');

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
    // Google generative summary (region-restricted; null for SG today).
    // Attribution required per Places API policy when displayed.
    const googleLine = p.googleSummary?.overview
      ? `\n💡 ${p.googleSummary.overview} _(${p.googleSummary.disclosure || 'Summarized with Gemini'})_`
      : '';
    const body = summary
      ? `🌿 Sanctuary read for ${p.name}\n${summary}${googleLine}`
      : (p.vibe ? `🌿 ${p.name}\n${p.vibe}${googleLine}` : (googleLine ? `🌿 ${p.name}${googleLine}` : null));

    const buttons = [];
    if (pid) {
      if (useWebhook) {
        buttons.push({
          text: '📍 Open Map',
          web_app: { url: `https://${webhookDomain}/app?placeId=${encodeURIComponent(pid)}` }
        });
      }
      // Prefer Google's authoritative directionsUri (from googleMapsLinks)
      // when available; fall back to constructed Search-action URL.
      const directionsUrl = p.directionsUri
        || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${encodeURIComponent(pid)}`;
      buttons.push({
        text: '🚗 Directions',
        url: directionsUrl
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
        const vaultPicks = await fetchOpenVaultPicks(redis, lat, lng, 500, 3);
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
        const approachLine = hidden.approach ? `\nApproach: ${hidden.approach}` : '';
        await safeSend(
          chatId,
          `I couldn't find a standard ${meal.label} sanctuary, but I've identified a 'Hidden Sanctuary' at ${hidden.name} based on recent reviews mentioning ${hidden.vibe}.${approachLine}`
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

bot.onText(/^\/(?:groceries|grocery)(?:@\w+)?$/, async (msg) => {
  try {
    await startSanctuaryFlow(msg.chat.id, 'groceries', 'groceries');
  } catch (err) {
    console.error('[Error] /groceries handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't reach my grocery list right now.");
  }
});

const PENDING_CUISINE_PREFIX = 'cuisine:';

const CUISINE_KEYBOARD = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🍣 Japanese', callback_data: 'cuisine:Japanese' },
        { text: '🍲 Korean',   callback_data: 'cuisine:Korean' },
        { text: '🥟 Chinese',  callback_data: 'cuisine:Chinese' }
      ],
      [
        { text: '🍝 Italian',   callback_data: 'cuisine:Italian' },
        { text: '🍛 Indian',    callback_data: 'cuisine:Indian' },
        { text: '🍜 Thai',      callback_data: 'cuisine:Thai' }
      ],
      [
        { text: '🥢 Vietnamese', callback_data: 'cuisine:Vietnamese' },
        { text: '🍱 Malay',      callback_data: 'cuisine:Malay' },
        { text: '🍔 Western',    callback_data: 'cuisine:Western' }
      ]
    ]
  }
};

bot.onText(/^\/cuisine(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
  try {
    const arg = (match?.[1] || '').trim();
    if (!arg) {
      await bot.sendMessage(msg.chat.id, "Tell Gia what cuisine — pick one:", CUISINE_KEYBOARD);
      return;
    }
    // Encode the cuisine type into the pending state so the location flow
    // can route to runFlow with category=cuisine + cuisineType=<arg>.
    await setPendingMeal(redis, msg.chat.id, `${PENDING_CUISINE_PREFIX}${arg}`);
    const cached = await getUserLocation(redis, msg.chat.id);
    if (cached) {
      await safeSend(msg.chat.id, ACK_SENSING_VIBE);
      await runCuisineFlow(msg.chat.id, cached.lat, cached.lng, arg);
      return;
    }
    await bot.sendMessage(
      msg.chat.id,
      `Where are you for ${arg}? Please tap to share your location, or type a place name (Gia will search within 200 m).`,
      LOCATION_REQUEST_KEYBOARD
    );
  } catch (err) {
    console.error('[Error] /cuisine handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't think of cuisine picks right now.");
  }
});

async function runCuisineFlow(chatId, lat, lng, cuisineType) {
  if (await isProcessing(redis, chatId)) {
    await safeSend(chatId, '⏳ Gia is still working on your last request — hold on a moment.');
    return;
  }
  await setProcessing(redis, chatId);
  try {
    const { meal, venues } = await pickValidated(lat, lng, 3, [], { category: 'cuisine', cuisineType });
    if (venues.length) {
      await deliverPicks(chatId, meal.label, venues);
      return;
    }
    try {
      const hidden = await findHiddenSanctuary(lat, lng);
      if (hidden) {
        const approachLine = hidden.approach ? `\nApproach: ${hidden.approach}` : '';
        await safeSend(
          chatId,
          `I couldn't find a strictly ${cuisineType} sanctuary, but I've identified a 'Hidden Sanctuary' at ${hidden.name} based on recent reviews mentioning ${hidden.vibe}.${approachLine}`
        );
        await deliverPicks(chatId, `${cuisineType} cuisine`, [hidden]);
        return;
      }
    } catch (err) {
      console.error('[Consultant] findHiddenSanctuary failed:', err.message);
    }
    await deliverPicks(chatId, `${cuisineType} cuisine`, []);
  } finally {
    await clearProcessing(redis, chatId).catch(() => {});
  }
}

// Slash-command handlers delegate to the unified run* functions defined
// below. Prior to v0.20.1 these handlers carried inline copies that drifted
// behind /menu tile routing — /weather emitted the v0.18.0 "Now: X°C at Y"
// line instead of the full humidity / rain / wind block.
bot.onText(/^\/weather(?:@\w+)?$/, (msg) => runWeatherCommand(msg.chat.id));

bot.onText(/^\/transport(?:@\w+)?$/, (msg) => runTransportCommand(msg.chat.id));

bot.onText(/^\/carpark(?:@\w+)?$/, (msg) => runCarparkCommand(msg.chat.id));

// Resolves a pending-state string into a routing decision.
function resolvePending(pending) {
  if (!pending) return null;
  if (pending.startsWith(PENDING_CUISINE_PREFIX)) {
    return { kind: 'cuisine', cuisineType: pending.slice(PENDING_CUISINE_PREFIX.length) };
  }
  if (['food', 'drink', 'groceries'].includes(pending)) {
    return { kind: 'sanctuary', category: pending };
  }
  return { kind: 'sanctuary', category: 'food' };
}

bot.onText(/^⛔ Use Raffles Place default$/, async (msg) => {
  try {
    const pending = await consumePendingMeal(redis, msg.chat.id);
    const resolved = resolvePending(pending) || { kind: 'sanctuary', category: 'food' };
    await safeSend(msg.chat.id, ACK_SENSING_VIBE);
    if (resolved.kind === 'cuisine') {
      await runCuisineFlow(msg.chat.id, 1.2839, 103.8517, resolved.cuisineType);
    } else {
      await runFlow(msg.chat.id, 1.2839, 103.8517, resolved.category);
    }
  } catch (err) {
    console.error('[Error] default fallback failed:', err.message);
    await safeSend(msg.chat.id, MANUAL_FALLBACK_PROMPT);
  }
});

// callback_query — fired when user taps an inline-keyboard button with
// callback_data. Two patterns supported:
//   refresh:transport         → re-run /transport for the same chat
//   cuisine:<TypeName>        → start cuisine flow with that type
bot.on('callback_query', async (q) => {
  try {
    const data = q.data || '';
    const chatId = q.message?.chat?.id ?? q.from?.id;
    if (!chatId) return;
    // Always answer to dismiss the spinner on the user's tap.
    bot.answerCallbackQuery(q.id).catch(() => {});

    if (data === 'refresh:transport') {
      await runTransportCommand(chatId);
      return;
    }
    if (data.startsWith('cuisine:')) {
      const type = data.slice('cuisine:'.length).trim();
      if (!type) return;
      await routeMenuCommand(chatId, 'cuisine', { type });
      return;
    }
  } catch (err) {
    console.error('[Error] callback_query handler failed:', err.message);
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
    await setUserLocation(redis, msg.chat.id, lat, lng);
    const resolved = resolvePending(pending) || { kind: 'sanctuary', category: 'food' };
    if (resolved.kind === 'cuisine') {
      await runCuisineFlow(msg.chat.id, lat, lng, resolved.cuisineType);
    } else {
      await runFlow(msg.chat.id, lat, lng, resolved.category);
    }
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

// /start handler — greets the user, optionally accepts a deep-link param
// (e.g. /start eat from a t.me/<bot>?start=eat link) to immediately route
// to a flow.
bot.onText(/^\/start(?:@\w+)?(?:\s+(\w+))?$/, async (msg, match) => {
  const param = (match?.[1] || '').trim().toLowerCase();
  if (param) {
    const routed = await routeMenuCommand(msg.chat.id, param);
    if (routed) return;
  }
  await safeSend(
    msg.chat.id,
    "I'm Gia, the concierge inside soleat — your CBD sanctuary guide.\n\n" +
    "/eat       — solo-diner food picks for now\n" +
    "/drink     — bars, coffee, tea spots\n" +
    "/grocery   — supermarkets & fresh markets\n" +
    "/cuisine X — by cuisine type (Japanese / Korean / Italian / …)\n" +
    "/weather   — now + 2-hour NEA forecast\n" +
    "/transport — MRT pulse + crowd + traffic + nearest bus stops\n" +
    "/carpark   — nearest 5 with available lots\n" +
    "/ver       — version + upstream API health\n\n" +
    "Or tap the menu button (🌿 soleat Menu) for the tile UI."
  );
});

// Routes a single-word command name to the appropriate flow. Used by
// (a) /start <cmd> deep links and (b) web_app_data tile taps. Returns
// true if it routed something.
async function routeMenuCommand(chatId, raw, payload = null) {
  const cmd = String(raw || '').trim().toLowerCase();
  switch (cmd) {
    case 'eat':       await startSanctuaryFlow(chatId, 'food', mealPeriodSGT().label); return true;
    case 'drink':     await startSanctuaryFlow(chatId, 'drink', 'drinks'); return true;
    case 'grocery':
    case 'groceries': await startSanctuaryFlow(chatId, 'groceries', 'groceries'); return true;
    case 'cuisine': {
      const type = (payload?.type || '').trim();
      if (!type) {
        await safeSend(chatId, "Tell Gia what cuisine — e.g. /cuisine Japanese.");
        return true;
      }
      await setPendingMeal(redis, chatId, `${PENDING_CUISINE_PREFIX}${type}`);
      const cached = await getUserLocation(redis, chatId);
      if (cached) { await safeSend(chatId, ACK_SENSING_VIBE); await runCuisineFlow(chatId, cached.lat, cached.lng, type); }
      else await bot.sendMessage(chatId, `Where are you for ${type}? Please tap to share your location, or type a place name.`, LOCATION_REQUEST_KEYBOARD);
      return true;
    }
    case 'weather':   await runWeatherCommand(chatId); return true;
    case 'transport': await runTransportCommand(chatId); return true;
    case 'carpark':   await runCarparkCommand(chatId); return true;
    case 'ver':       await runVerCommand(chatId); return true;
    default:          return false;
  }
}

async function runWeatherCommand(chatId) {
  try {
    const cached = await getUserLocation(redis, chatId);
    const lat = cached?.lat ?? 1.2839;
    const lng = cached?.lng ?? 103.8517;
    const w = await weather.summary(lat, lng);
    const hasAny = Number.isFinite(w?.tempC) || Number.isFinite(w?.humidityPct) ||
      Number.isFinite(w?.rainMm) || w?.forecast;
    if (!hasAny) { await safeSend(chatId, "Sorry, I can't reach the NEA weather feed right now."); return; }
    const lines = ['☀️ Singapore weather'];
    if (Number.isFinite(w.tempC)) lines.push(`Temp: ${w.tempC.toFixed(1)}°C @ ${w.tempStationName}`);
    if (Number.isFinite(w.humidityPct)) lines.push(`Humidity: ${w.humidityPct.toFixed(0)}% @ ${w.humidityStationName}`);
    if (Number.isFinite(w.rainMm) && w.rainMm > 0) lines.push(`Rain: ${w.rainMm} mm @ ${w.rainStationName}`);
    if (Number.isFinite(w.windSpdKt)) {
      const dir = Number.isFinite(w.windDirDeg) ? `, ${Math.round(w.windDirDeg)}°` : '';
      lines.push(`Wind: ${w.windSpdKt} kt${dir}`);
    }
    if (w.forecast) {
      const valid = w.forecastValidTo ? ` (until ${new Date(w.forecastValidTo).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' })})` : '';
      lines.push(`Next 2h in ${w.forecastArea}: ${w.forecast}${valid}`);
    }
    await safeSend(chatId, lines.join('\n'));
  } catch (err) {
    console.error('[Error] weather command failed:', err.message);
    await safeSend(chatId, "Sorry, I can't reach the NEA weather feed right now.");
  }
}

async function runTransportCommand(chatId) {
  try {
    if (!redis.isOpen) await redis.connect();
    const cachedStatus = await redis.get('lta:train_status');
    const status = cachedStatus ? JSON.parse(cachedStatus) : null;
    const cachedLoc = await getUserLocation(redis, chatId);

    const lines = ['🚉 Singapore transport'];
    if (status) {
      lines.push('', `MRT: ${status.status}`);
      if (status.message) lines.push(`Notes: ${status.message}`);
      lines.push(`Refreshed: ${status.updatedAt}`);
    } else {
      lines.push('', 'MRT: 🟡 status warming up; try again in 30 s.');
    }

    // Network-wide crowd snapshot from LTA PCDRealTime across all lines.
    if (process.env.LTA_ACCOUNT_KEY) {
      try {
        const crowdMap = await transport.fetchPlatformCrowdAll();
        const summary = transport.networkCrowdSummary(crowdMap);
        if (summary) {
          lines.push(`Network crowd: ${summary.overall} (${summary.low}L / ${summary.medium}M / ${summary.high}H of ${summary.total})`);
        }
      } catch (err) {
        console.error('[Transport] platform crowd failed:', err.message);
      }
    }

    // Nearest MRT stations (Places searchNearby for subway_station).
    if (cachedLoc && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const mrt = await transport.nearestMrtStations(cachedLoc.lat, cachedLoc.lng, 1500, 3);
        if (mrt.length) {
          lines.push('', '🚇 Nearest MRT stations:');
          for (const s of mrt) {
            lines.push(`· ${s.name}`);
          }
        }
      } catch (err) {
        console.error('[Transport] nearestMrtStations failed:', err.message);
      }
    }

    // Live traffic incidents (LTA TrafficIncidents) — global feed, ranked by
    // distance from cached location when available. Surfaces accidents,
    // roadworks, vehicle breakdowns; keeps reply terse with top 3 nearest.
    if (process.env.LTA_ACCOUNT_KEY) {
      try {
        const all = await transport.fetchTrafficIncidents();
        const near = transport.nearestIncidents(
          all,
          cachedLoc?.lat ?? 1.2839,
          cachedLoc?.lng ?? 103.8517,
          5000,
          3
        );
        if (near.length) {
          lines.push('', `🚦 Traffic (top ${near.length} of ${all.length} island-wide):`);
          for (const inc of near) {
            const dist = Number.isFinite(inc.distanceM) ? ` — ${inc.distanceM} m` : '';
            lines.push(`· ${inc.type}${dist}`);
            lines.push(`  ${inc.message}`);
          }
        } else if (all.length) {
          lines.push('', `🚦 Traffic: ${all.length} incidents island-wide; none within 5 km.`);
        } else {
          lines.push('', '🚦 Traffic: no live incidents reported.');
        }
      } catch (err) {
        console.error('[Transport] traffic incidents failed:', err.message);
      }
    }

    // Nearby bus arrivals — only when we have a location and bus-stops cache.
    let firstBusStopCode = null;
    if (cachedLoc && process.env.LTA_ACCOUNT_KEY) {
      try {
        const stops = await transport.nearestStops(redis, cachedLoc.lat, cachedLoc.lng, 800, 3);
        if (!stops.length) {
          lines.push('', 'No bus stops within 800 m of your saved location.');
        } else {
          firstBusStopCode = stops[0]?.code || null;
          lines.push('', '🚌 Nearest bus stops + next arrivals:');
          for (const stop of stops) {
            const arrivals = await transport.busArrivals(stop.code);
            const header = `· ${stop.description} (${stop.roadName}) — ${stop.distanceM} m`;
            lines.push('', header);
            if (!arrivals.length) {
              lines.push('  no real-time arrivals');
              continue;
            }
            for (const svc of arrivals.slice(0, 4)) {
              const nextStr = svc.next ? `${svc.next.minutes} min · ${svc.next.loadLabel}` : '—';
              const next2Str = svc.next2 ? ` · then ${svc.next2.minutes} min` : '';
              lines.push(`  ${svc.service}: ${nextStr}${next2Str}`);
            }
          }
        }
      } catch (err) {
        console.error('[Error] transport bus arrivals failed:', err.message);
        lines.push('', 'Bus arrivals temporarily unavailable.');
      }
    } else if (!cachedLoc) {
      lines.push('', '🚌 Tap /eat or /drink first to share your location, then /transport will list nearby bus arrivals + MRT stations too.');
    }

    // Inline-keyboard refresh button on the first bus stop (#9).
    const replyMarkup = firstBusStopCode
      ? { reply_markup: { inline_keyboard: [[{ text: '🔄 Refresh transport', callback_data: 'refresh:transport' }]] } }
      : {};
    await safeSend(chatId, lines.join('\n'), replyMarkup);
  } catch (err) {
    console.error('[Error] transport command failed:', err.message);
    await safeSend(chatId, "Sorry, I can't reach my transport memory right now.");
  }
}

async function runCarparkCommand(chatId) {
  try {
    if (!process.env.LTA_ACCOUNT_KEY) { await safeSend(chatId, "Carpark lookup is offline (LTA key not configured)."); return; }
    const cached = await getUserLocation(redis, chatId);
    const lat = cached?.lat ?? 1.2839;
    const lng = cached?.lng ?? 103.8517;
    if (!cached) await safeSend(chatId, "I don't have your location — using Raffles Place as default. Share your location once and Gia will remember.");
    await safeSend(chatId, "🅿️ Looking up nearest carparks…");
    const list = await carpark.nearest(lat, lng, 5);
    if (!list.length) { await safeSend(chatId, "No carparks with available lots near here."); return; }
    const lines = ['🅿️ Nearest carparks with available lots'];
    list.forEach((c, i) => lines.push(`${i + 1}. ${c.development}  ·  ${c.availableLots} lots  ·  ${c.distanceM} m`));
    await safeSend(chatId, lines.join('\n'));
  } catch (err) {
    console.error('[Error] carpark command failed:', err.message);
    await safeSend(chatId, "Sorry, I can't reach the LTA carpark feed right now.");
  }
}

async function runVerCommand(chatId) {
  try {
    await safeSend(chatId, '🩺 Running health check…');
    const report = await runHealthCheck(bot, redis);
    const escaped = report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await bot.sendMessage(chatId, `<pre>${escaped}</pre>`, { parse_mode: 'HTML' }).catch(async () => { await safeSend(chatId, report); });
  } catch (err) {
    console.error('[Error] ver command failed:', err.message);
    await safeSend(chatId, "Sorry, I couldn't run the health check.");
  }
}

// Free-text + web_app_data handler.
//
// Order:
//   1. Tile-tap: msg.web_app_data → JSON.parse → routeMenuCommand
//   2. If a sanctuary flow is pending, interpret text as place name
//      → geocode → run the flow
//   3. Otherwise fall through to the Topic Gatekeeper
bot.on('message', async (msg) => {
  try {
    // (1) Menu tile tap — TMA called tg.sendData(JSON.stringify({cmd, type})).
    if (msg.web_app_data?.data) {
      try {
        const payload = JSON.parse(msg.web_app_data.data);
        const handled = await routeMenuCommand(msg.chat.id, payload?.cmd, payload);
        if (!handled) await safeSend(msg.chat.id, "Unrecognised menu action.");
      } catch (err) {
        console.error('[Error] web_app_data parse failed:', err.message);
        await safeSend(msg.chat.id, "Sorry, I couldn't read that menu tap.");
      }
      return;
    }

    if (!msg.text) return;
    const text = msg.text.trim();
    if (!text) return;
    if (text.startsWith('/')) return;
    if (KEYBOARD_TEXTS.has(text)) return;
    const hasCommand = (msg.entities ?? []).some((e) => e.type === 'bot_command');
    if (hasCommand) return;

    const pending = await consumePendingMeal(redis, msg.chat.id);
    if (pending) {
      const resolved = resolvePending(pending);
      // §1 Universal ack — same copy across all entry points.
      await safeSend(msg.chat.id, ACK_SENSING_VIBE);
      const place = await geocodeQuery(text);
      if (!place) {
        await safeSend(msg.chat.id, `I couldn't place "${text}". ${MANUAL_FALLBACK_PROMPT}`);
        await setPendingMeal(redis, msg.chat.id, pending); // §4 stay locked in original intent
        return;
      }
      await setUserLocation(redis, msg.chat.id, place.lat, place.lng);
      await safeSend(msg.chat.id, `Centred on ${place.name}.`);
      if (resolved?.kind === 'cuisine') {
        await runCuisineFlow(msg.chat.id, place.lat, place.lng, resolved.cuisineType);
      } else {
        await runFlow(msg.chat.id, place.lat, place.lng, resolved?.category || 'food');
      }
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
      { command: 'eat',       description: 'Solo-diner food picks for now' },
      { command: 'drink',     description: 'Bars, coffee, tea spots' },
      { command: 'grocery',   description: 'Supermarkets and fresh markets' },
      { command: 'cuisine',   description: 'Picks by cuisine type — e.g. /cuisine Japanese' },
      { command: 'weather',   description: 'Now + 2-hour NEA forecast' },
      { command: 'transport', description: 'MRT + crowd + traffic + nearest bus stops' },
      { command: 'carpark',   description: 'Nearest 5 carparks with available lots' },
      { command: 'ver',       description: 'Version + upstream API health' }
    ]);
    if (useWebhook) {
      await bot.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '🌿 soleat Menu',
          web_app: { url: `https://${webhookDomain}/app/menu` }
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

  // LTA bus stops geo cache (~5500 entries). Refresh on boot if stale,
  // then once every 24 h. /transport uses this for nearest-bus-stop
  // GEOSEARCH; without it the bus-arrivals section is silently skipped.
  if (ltaEnabled) {
    transport.refreshStops(redis)
      .then((res) => console.log(`[Transport] Bus stops cache: imported=${res.imported}, skipped=${res.skipped || '-'}`))
      .catch((err) => console.error('[Warn] Bus stops cache refresh failed:', err.message));
    setInterval(() => {
      transport.refreshStops(redis)
        .catch((err) => console.error('[Warn] Bus stops cache refresh failed:', err.message));
    }, 24 * 60 * 60 * 1000); // 24 h
  }

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
    // Menu page (Durger-King-style tile grid). New default for the
    // chat menu button as of v0.18.0.
    app.get(['/app', '/app/menu'], (_req, res) => res.sendFile(path.join(__dirname, 'public', 'menu.html')));
    // Live sanctuary map (the v0.4.0 TMA, now under /app/map).
    app.get('/app/map', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

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
