const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { createClient } = require('redis');
const TelegramBot = require('node-telegram-bot-api');
const pkgJson = require('./package.json');
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

// Fetches a single place by ID for the cuisine-pick TMA round-trip.
// Mirrors the venue shape produced by validateWithPlaces so deliverPicks
// renders identically to /eat picks.
async function fetchSinglePlaceForPick(placeId, fallbackName, near) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !placeId) return null;
  try {
    const { data } = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'googleMapsUri',
            'googleMapsLinks',
            'generativeSummary',
            'primaryType',
            'businessStatus',
            'currentOpeningHours.openNow'
          ].join(',')
        },
        timeout: 8000
      }
    );
    if (!data?.location) return null;
    return {
      placeId: data.id,
      name: data.displayName?.text ?? fallbackName ?? 'venue',
      area: data.formattedAddress ?? '',
      lat: data.location.latitude,
      lng: data.location.longitude,
      rating: data.rating ?? null,
      businessStatus: data.businessStatus ?? null,
      openNow: data.currentOpeningHours?.openNow ?? null,
      url: data.googleMapsLinks?.placeUri ?? data.googleMapsUri ?? '',
      directionsUri: data.googleMapsLinks?.directionsUri ?? '',
      reviewsUri: data.googleMapsLinks?.reviewsUri ?? '',
      photosUri: data.googleMapsLinks?.photosUri ?? '',
      primaryType: data.primaryType ?? 'restaurant',
      vibe: '',
      googleSummary: data.generativeSummary
        ? {
            overview: data.generativeSummary.overview?.text ?? null,
            disclosure: data.generativeSummary.overviewFlagContentUri ? 'Summarized with Gemini' : 'Summarized with Gemini'
          }
        : null,
      source: 'cuisine-pick'
    };
  } catch (err) {
    console.error('[Error] fetchSinglePlaceForPick failed:', err.message);
    return null;
  }
}

// Strips a pick down to the fields the buddy's deliver* call needs.
// Keeps Redis payloads small and avoids leaking transient fields.
function trimPickForShare(p) {
  return {
    placeId: p.placeId ?? p.id,
    name: p.name,
    area: p.area,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating ?? null,
    openNow: p.openNow ?? null,
    primaryType: p.primaryType ?? 'restaurant',
    url: p.url ?? '',
    directionsUri: p.directionsUri ?? '',
    vibe: p.vibe ?? '',
    signatureDish: p.signatureDish ?? '',
    googleSummary: p.googleSummary ?? null
  };
}

function trimSurpriseForShare(v) {
  return {
    placeId: v.placeId,
    name: v.name,
    area: v.area,
    lat: v.lat,
    lng: v.lng,
    rating: v.rating ?? null,
    userRatingCount: v.userRatingCount ?? null,
    openNow: v.openNow ?? null,
    distanceM: v.distanceM ?? null,
    url: v.url ?? '',
    directionsUri: v.directionsUri ?? '',
    dishes: v.dishes ?? [],
    whyOrdered: v.whyOrdered ?? '',
    bookingRequired: !!v.bookingRequired
  };
}

async function deliverPicks(chatId, mealLabel, picks) {
  if (!picks.length) {
    await handleNoResults(chatId, mealLabel);
    return;
  }
  // v0.27.1: track for /share. Fire-and-forget; never blocks delivery.
  try {
    const { addRecent } = require('./recent-picks');
    for (const p of picks) addRecent(redis, chatId, { ...p, kind: 'pick' }).catch(() => {});
  } catch { /* recent-picks optional */ }
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
      // v0.26.2 per Human Lead: single 📍 Google Maps link per card.
      // Prefer the canonical Place URL (googleMapsLinks.placeUri /
      // googleMapsUri); fall back to a place_id-encoded search URL,
      // then to directionsUri as last resort.
      const mapsUrl = p.url
        || (pid ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(pid)}` : null)
        || p.directionsUri;
      if (mapsUrl) {
        buttons.push({ text: '📍 Google Maps', url: mapsUrl });
      }
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

// /cuisine v0.22.0: deep-link straight to the Cuisine Picker TMA. The
// 9-cuisine inline keyboard (v0.18.0–v0.21.2) was retired because the
// TMA supports multi-select chips, dual radius, transport mode, time
// dropdown, and 4 preset combos — strictly richer.
bot.onText(/^\/cuisine(?:@\w+)?(?:\s+.*)?$/, async (msg) => {
  try {
    if (!useWebhook) {
      await safeSend(
        msg.chat.id,
        "The Cuisine Picker needs the webhook-mode TMA. Use /eat or /drink for chat-based picks."
      );
      return;
    }
    await bot.sendMessage(msg.chat.id, "🍴 Tap to open the Cuisine Picker:", {
      reply_markup: {
        inline_keyboard: [[{
          text: '🍴 Open Cuisine Picker',
          web_app: { url: `https://${webhookDomain}/app/cuisine` }
        }]]
      }
    });
  } catch (err) {
    console.error('[Error] /cuisine handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, I can't open the Cuisine Picker right now.");
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

bot.onText(/^\/surprise(?:@\w+)?$/, (msg) => runSurpriseCommand(msg.chat.id));

// v0.27.1: /share — list user's last-5 picks with a 👋 Send to buddy
// inline button per pick. Replaces the per-pick share button removed in
// v0.26.2; surfaces buddy-share as an explicit on-demand action.
bot.onText(/^\/share(?:@\w+)?$/, async (msg) => {
  try {
    const { getRecent } = require('./recent-picks');
    const recent = await getRecent(redis, msg.chat.id);
    if (!recent.length) {
      await safeSend(msg.chat.id, "No recent picks yet. Run /cuisine, /eat, or /surprise first, then /share to forward to a buddy.");
      return;
    }
    const { saveShare } = require('./share');
    const rows = [];
    for (const p of recent) {
      try {
        const token = await saveShare(redis, {
          kind: p.kind || 'pick',
          ...(p.kind === 'surprise' ? { surprise: p } : { mealLabel: 'shared', pick: p })
        });
        const label = `👋 ${p.name.length > 30 ? p.name.slice(0, 28) + '…' : p.name}`;
        rows.push([{ text: label, callback_data: `share:${token}` }]);
      } catch (err) {
        console.warn('[/share] saveShare failed for', p.placeId, err.message);
      }
    }
    if (!rows.length) {
      await safeSend(msg.chat.id, "Sorry, I couldn't mint share links right now.");
      return;
    }
    await bot.sendMessage(
      msg.chat.id,
      `Pick a venue to forward to your buddy (${rows.length} recent):`,
      { reply_markup: { inline_keyboard: rows } }
    );
  } catch (err) {
    console.error('[Error] /share failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, /share hit an error.");
  }
});

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
// callback_data. The cuisine:<Type> pattern was retired in v0.22.0 with
// the move to the Cuisine Picker TMA; only refresh:transport remains.
bot.on('callback_query', async (q) => {
  try {
    const data = q.data || '';
    const chatId = q.message?.chat?.id ?? q.from?.id;
    if (!chatId) return;
    bot.answerCallbackQuery(q.id).catch(() => {});

    if (data === 'refresh:transport') {
      await runTransportCommand(chatId);
      return;
    }
    if (data.startsWith('share:')) {
      // v0.25.0 Buddy Level 1: surface the deep link to the originating
      // user. They forward it via any messenger; the buddy's tap on the
      // link triggers /start share_<token> on this bot.
      const token = data.slice('share:'.length).trim();
      if (!token) return;
      const link = `https://t.me/${botUsername}?start=share_${token}`;
      await bot.sendMessage(
        chatId,
        '👋 *Send your buddy this link:*\n\n' +
        '`' + link + '`\n\n' +
        '_When they tap it, Gia will send them this exact pick. Link works for 7 days._',
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
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
bot.onText(/^\/start(?:@\w+)?(?:\s+(\S+))?$/, async (msg, match) => {
  const rawParam = (match?.[1] || '').trim();
  // v0.25.0: share_<token> deep link — render the buddy's shared pick.
  if (rawParam.startsWith('share_')) {
    const token = rawParam.slice('share_'.length);
    try {
      const { loadShare } = require('./share');
      const payload = await loadShare(redis, token);
      if (!payload) {
        await safeSend(msg.chat.id, "👋 Sorry, that share link has expired or never existed.");
        return;
      }
      await safeSend(msg.chat.id, "👋 A friend shared a sanctuary pick with you via Gia:");
      if (payload.kind === 'pick' && payload.pick) {
        await deliverPicks(msg.chat.id, payload.mealLabel || 'shared', [payload.pick]);
      } else if (payload.kind === 'surprise' && payload.surprise) {
        await deliverSurprise(msg.chat.id, payload.surprise);
      } else {
        await safeSend(msg.chat.id, "Couldn't decode that share — sorry.");
      }
    } catch (err) {
      console.error('[Error] /start share_<token> failed:', err.message);
      await safeSend(msg.chat.id, "Couldn't load that share — sorry.");
    }
    return;
  }
  const param = rawParam.toLowerCase();
  if (param) {
    const routed = await routeMenuCommand(msg.chat.id, param);
    if (routed) return;
  }
  await safeSend(
    msg.chat.id,
    "I'm Gia, the concierge inside soleat — your CBD sanctuary guide.\n\n" +
    "/cuisine   — full Cuisine Picker (sliders, 70 cuisines, queue)\n" +
    "/surprise  — one hidden gem 1.5–3 km away\n" +
    "/drink     — bars, coffee, tea spots\n" +
    "/grocery   — supermarkets & fresh markets\n" +
    "/weather   — now + 2-hour NEA forecast\n" +
    "/transport — MRT pulse + crowd + traffic + nearest bus stops\n" +
    "/carpark   — nearest 5 with available lots\n" +
    "/ver       — version + upstream API health\n\n" +
    "Or tap the menu button (🍴 Cuisine Picker) to jump straight in."
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
      // v0.22.0: cuisine command opens the TMA picker (multi-select chips,
      // dual radius, transport mode, time, presets). Direct legacy callers
      // that pass payload.type fall through to the same TMA — chip is
      // pre-selected via querystring so the round-trip stays one-tap.
      if (!useWebhook) {
        await safeSend(chatId, "The Cuisine Picker needs the webhook-mode TMA.");
        return true;
      }
      const type = (payload?.type || '').trim();
      const url = type
        ? `https://${webhookDomain}/app/cuisine?cuisine=${encodeURIComponent(type)}`
        : `https://${webhookDomain}/app/cuisine`;
      await bot.sendMessage(chatId, "🍴 Tap to open the Cuisine Picker:", {
        reply_markup: { inline_keyboard: [[{ text: '🍴 Open Cuisine Picker', web_app: { url } }]] }
      });
      return true;
    }
    case 'cuisine-search': {
      // v0.26.3 dual-channel fallback. When the TMA's primary HTTPS path
      // (POST /api/cuisine-search) fails — initData empty, fetch blocked
      // by webview, network blip — the front-end retries via
      // Telegram.WebApp.sendData({cmd:'cuisine-search', ...payload}).
      // That arrives here as web_app_data; we run the SAME searchCuisine
      // pipeline server-side, then deliver the picks to the chat (not
      // the TMA, which has already been closed by sendData).
      console.log(`[Cuisine-Diag] D720 web_app_data fallback received chat=${chatId} preset=${payload?.preset} cuisines=${Array.isArray(payload?.cuisines) ? payload.cuisines.length : 0}`);
      try {
        await safeSend(chatId, '🌿 Sensing the vibe… (chat-delivery fallback)');
        const lat = Number(payload?.lat);
        const lng = Number(payload?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn('[Cuisine-Diag] D721 fallback rejected — lat/lng missing');
          await safeSend(chatId, "I didn't catch your location — open /cuisine and tap 📍 first.");
          return true;
        }
        const { searchCuisine } = require('./cuisine-search');
        const result = await searchCuisine({
          lat, lng,
          cuisines: Array.isArray(payload?.cuisines) ? payload.cuisines.slice(0, 10) : [],
          radius: Number(payload?.radius) || 1000,
          recencyDays: Number(payload?.recencyDays) || 90,
          queueMaxMin: Number(payload?.queueMaxMin) || 15,
          mode: typeof payload?.mode === 'string' ? payload.mode : 'walk',
          when: typeof payload?.when === 'string' ? payload.when : 'now',
          preset: typeof payload?.preset === 'string' ? payload.preset : null,
          redis
        });
        const venues = (result?.venues || []).slice(0, 5);
        if (!venues.length) {
          await safeSend(chatId, "Gia couldn't find sanctuary picks for those filters. Open /cuisine and try a wider radius or different cuisine.");
          return true;
        }
        const label = result?.meal?.label || 'cuisine';
        await deliverPicks(chatId, label, venues);
        console.log(`[Cuisine-Diag] D722 fallback delivered chat=${chatId} venues=${venues.length}`);
      } catch (err) {
        console.error('[Cuisine-Diag] D723 fallback failed:', err.message);
        await safeSend(chatId, "Sorry, the chat-delivery fallback hit an error.");
      }
      return true;
    }
    case 'cuisine-pick': {
      // TMA card tap → bot delivers Sanctuary read for the single venue.
      const placeId = String(payload?.placeId || '').trim();
      const name = String(payload?.name || '').trim();
      if (!placeId) return true;
      try {
        await safeSend(chatId, ACK_SENSING_VIBE);
        const cached = await getUserLocation(redis, chatId);
        const single = await fetchSinglePlaceForPick(placeId, name, cached);
        if (!single) {
          await safeSend(chatId, `Sorry, I couldn't load details for ${name || 'that pick'}.`);
          return true;
        }
        await deliverPicks(chatId, name || single.name || 'cuisine pick', [single]);
      } catch (err) {
        console.error('[Error] cuisine-pick failed:', err.message);
        await safeSend(chatId, "Sorry, I couldn't load that pick.");
      }
      return true;
    }
    case 'weather':   await runWeatherCommand(chatId); return true;
    case 'transport': await runTransportCommand(chatId); return true;
    case 'carpark':   await runCarparkCommand(chatId); return true;
    case 'surprise':  await runSurpriseCommand(chatId); return true;
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

async function runSurpriseCommand(chatId) {
  try {
    if (await isProcessing(redis, chatId)) {
      await safeSend(chatId, '⏳ Gia is still working on your last request — hold on a moment.');
      return;
    }
    const cached = await getUserLocation(redis, chatId);
    if (!cached) {
      await bot.sendMessage(
        chatId,
        "Where are you? Tap to share your location for /surprise.",
        LOCATION_REQUEST_KEYBOARD
      );
      return;
    }
    await setProcessing(redis, chatId);
    await safeSend(chatId, '🎲 Hunting for one hidden gem 1.5–3 km away…');
    const { findSurprise } = require('./surprise');
    const venue = await findSurprise({ lat: cached.lat, lng: cached.lng, redis });
    if (!venue) {
      await safeSend(
        chatId,
        "Gia couldn't find a hidden gem matching the /surprise rules in your annulus right now. Try moving to a different area, or open /cuisine for full-control picks."
      );
      return;
    }
    await deliverSurprise(chatId, venue);
  } catch (err) {
    console.error('[Error] /surprise failed:', err.message);
    await safeSend(chatId, "Sorry, /surprise hit an error. Try again in a moment.");
  } finally {
    await clearProcessing(redis, chatId).catch(() => {});
  }
}

async function deliverSurprise(chatId, v) {
  // v0.27.1: track for /share.
  try {
    const { addRecent } = require('./recent-picks');
    addRecent(redis, chatId, { ...v, kind: 'surprise', signatureDish: v.dishes?.[0] || '' }).catch(() => {});
  } catch { /* optional */ }
  const km = (v.distanceM / 1000).toFixed(2);
  const rating = v.rating ? `⭐${v.rating.toFixed(1)} (${v.userRatingCount} reviews)` : '';
  const open = v.openNow === true ? 'Open now' : v.openNow === false ? 'Opens soon' : '';
  const dishes = v.dishes?.length
    ? '\n\n🍴 *Try the:*\n' + v.dishes.map((d) => `  • ${d}`).join('\n')
    : '';
  const why = v.whyOrdered ? `\n\n_${v.whyOrdered}_` : '';
  const booking = v.bookingRequired
    ? '\n\n📅 Booking is usually advised at peak.'
    : '\n\n🪑 Walk-ins generally fine.';
  // v0.26.0 Refine layer outputs:
  const travel = v.travelAdvice ? `\n\n🧭 ${v.travelAdvice}` : '';
  const shelter = v.shelterNote ? `\n☂️ ${v.shelterNote}` : '';
  const text = [
    `🎲 *${v.name}*`,
    `${v.area}`,
    `${rating}${open ? ' · ' + open : ''} · ${km} km away`,
    dishes + why + booking + travel + shelter
  ].join('\n');

  // v0.26.2 per Human Lead: single 📍 Google Maps link per surprise card.
  const mapsUrl = v.url
    || (v.placeId ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(v.placeId)}` : null)
    || v.directionsUri;
  const row = mapsUrl ? [{ text: '📍 Google Maps', url: mapsUrl }] : [];
  const reply_markup = { inline_keyboard: [row] };
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup });
  } catch (err) {
    await bot.sendMessage(chatId, text, { reply_markup });
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
      // v0.26.3: log every web_app_data inbound so the Railway console
      // shows the full simulation trace per the bridge-audit spec.
      const rawPreview = String(msg.web_app_data.data).slice(0, 240);
      console.log(`[Cuisine-Diag] D730 web_app_data inbound chat=${msg.chat.id} bytes=${msg.web_app_data.data.length} preview=${rawPreview}`);
      try {
        const payload = JSON.parse(msg.web_app_data.data);
        console.log(`[Cuisine-Diag] D731 web_app_data parsed cmd=${payload?.cmd}`);
        const handled = await routeMenuCommand(msg.chat.id, payload?.cmd, payload);
        if (!handled) {
          console.warn(`[Cuisine-Diag] D732 web_app_data unhandled cmd=${payload?.cmd}`);
          await safeSend(msg.chat.id, "Unrecognised menu action.");
        }
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
    // v0.25.1: /eat removed from the slash autocomplete (still wired internally
    // for muscle memory but de-emphasized). /cuisine surfaces first as the
    // primary entry point. Chat menu button now opens /app/cuisine directly
    // so the default landing inside the TMA shell is the Cuisine Picker.
    await bot.setMyCommands([
      { command: 'cuisine',   description: 'Cuisine Picker — sliders, 70 cuisines, queue tolerance' },
      { command: 'surprise',  description: 'One hidden gem 1.5–3 km away' },
      { command: 'share',     description: 'Forward a recent pick to a buddy' },
      { command: 'drink',     description: 'Bars, coffee, tea spots' },
      { command: 'grocery',   description: 'Supermarkets and fresh markets' },
      { command: 'weather',   description: 'Now + 2-hour NEA forecast' },
      { command: 'transport', description: 'MRT + crowd + traffic + nearest bus stops' },
      { command: 'carpark',   description: 'Nearest 5 carparks with available lots' },
      { command: 'ver',       description: 'Version + upstream API health' }
    ]);
    if (useWebhook) {
      await bot.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '🍴 Cuisine Picker',
          web_app: { url: `https://${webhookDomain}/app/cuisine` }
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

// Cached bot username for share-link deep links (v0.25.0). Populated
// at boot via getMe(); falls back to env BOT_USERNAME if API is offline.
let botUsername = process.env.BOT_USERNAME || 'gia_bot';
async function cacheBotUsername() {
  try {
    const me = await bot.getMe();
    if (me?.username) botUsername = me.username;
    console.log(`[Bot] Identity confirmed: @${botUsername}`);
  } catch (err) {
    console.warn('[Bot] getMe failed, using fallback username:', err.message);
  }
}

(async () => {
  await configureUpdates();
  await cacheBotUsername();
  await registerCommandsMenu();

  // Warm SG public-holiday cache so the holiday-special preset can
  // answer instantly. Tolerant of data.gov.sg downtime via inline fallback.
  try {
    const holidays = require('./holidays');
    await holidays.warmCache(redis);
  } catch (err) {
    console.error('[Warn] Holiday warm-cache failed:', err.message);
  }

  // v0.26.0: vault-index aggregator. setRedisRef wires the singleton so
  // vibe-suggest's review fetcher (called inside validateWithPlaces) can
  // persist last-5 reviews under place-reviews:<placeId>. The 5-min refresh
  // re-scans Redis so newly cached reviews / summaries become visible to
  // the next pipeline.reason() call.
  try {
    const vaultIndex = require('./vault-index');
    vaultIndex.setRedisRef(redis);
    await vaultIndex.refreshIndex(redis);
    setInterval(() => {
      vaultIndex.refreshIndex(redis).catch((err) =>
        console.error('[Warn] vault-index refresh failed:', err.message));
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error('[Warn] vault-index init failed:', err.message);
  }

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

    // v0.26.1: permissive CORS on /api/* — auth is enforced via the
    // X-Telegram-Init-Data header, not cookies, so wildcard origin is
    // safe (no credentials traverse the boundary). This unblocks any
    // future TMA hosted on a different origin (e.g. CDN preview).
    app.use('/api', (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
      res.setHeader('Access-Control-Max-Age', '600');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });

    app.get('/health', (_req, res) => res.send('ok'));

    // v0.26.1: backend health probe for the TMA pre-flight ping. Returns
    // a flat capability snapshot the Diagnostics panel renders. Auth-free
    // by design — its purpose is to confirm "the bridge is up" before
    // initData is even available (hence no requireInitData here).
    app.get('/api/diag/cuisine', (_req, res) => {
      const vaultIndex = (() => { try { return require('./vault-index'); } catch { return null; } })();
      res.json({
        ok: true,
        version: pkgJson.version || 'unknown',
        pipelineEnabled: process.env.PIPELINE_ENABLED !== 'false',
        envPresent: {
          TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
          GOOGLE_MAPS_API_KEY: !!process.env.GOOGLE_MAPS_API_KEY,
          GEMINI_API_KEY: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
        },
        vaultIndexLoaded: !!vaultIndex,
        webhookDomain,
        timestamp: new Date().toISOString(),
        diag: 'D710'
      });
    });

    // v0.28.2: /admin/sync-vault — auth-gated one-shot endpoint that runs
    // the curated-vault import in-process using the bot's existing Redis
    // connection + GOOGLE_MAPS_API_KEY. Replaces the need to run
    // `railway run node sync-vault.js` from a workstation. Auth via
    // `?secret=<ADMIN_SYNC_SECRET>` query param compared with timing-
    // safe equality. Re-runnable any time you add new venues to the
    // hardcoded list (or upload Saved Places.json / KMZ to the repo).
    app.get('/admin/sync-vault', async (req, res) => {
      const expected = process.env.ADMIN_SYNC_SECRET;
      const given = String(req.query.secret || '');
      if (!expected) {
        return res.status(503).json({
          error: 'ADMIN_SYNC_SECRET env var not configured',
          hint: 'Set ADMIN_SYNC_SECRET=<long random string> in Railway, then redeploy.'
        });
      }
      // Timing-safe compare so the secret isn't leakable via response time.
      const a = Buffer.from(expected);
      const b = Buffer.from(given.padEnd(expected.length, ' ').slice(0, expected.length));
      const ok = a.length === Buffer.byteLength(given) && crypto.timingSafeEqual(a, b);
      if (!ok) {
        return res.status(401).json({ error: 'invalid secret' });
      }
      console.log('[Admin] /admin/sync-vault triggered by IP=' + (req.ip || '?'));
      try {
        const { runSync } = require('./sync-vault');
        const result = await runSync({
          redis,
          fenceDisabled: req.query.fence === 'off'
        });
        // Refresh the vault-index in-memory snapshot so the next
        // pipeline.reason() call sees the freshly imported venues
        // immediately instead of waiting up to 5 min for the cron tick.
        try {
          const vaultIndex = require('./vault-index');
          await vaultIndex.refreshIndex(redis);
        } catch (err) {
          console.warn('[Admin] vault-index refresh after sync failed:', err.message);
        }
        console.log('[Admin] sync-vault complete:', JSON.stringify(result));
        res.json({ ok: true, ...result });
      } catch (err) {
        console.error('[Admin] sync-vault failed:', err.message);
        res.status(500).json({ error: err.message || 'sync-vault failed' });
      }
    });

    app.post('/webhook', (req, res) => {
      if (req.headers['x-telegram-bot-api-secret-token'] !== webhookSecret) {
        return res.sendStatus(401);
      }
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    app.use('/static', express.static(path.join(__dirname, 'public')));

    // v0.29.0: aggressive no-cache headers on TMA HTML responses so
    // Telegram's in-app webview can't pin a stale bundle. Vite-built
    // assets are content-hashed (e.g. index-Bf6IG4pc.js) so they remain
    // safe to cache; only the unhashed index.html needs no-store. This
    // closes the "I redeployed but the user is still on the old bundle"
    // failure mode.
    function noCacheHtml(res) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }

    // Menu TMA — Vite-built React app since v0.28.0 (replaces the
    // hand-rolled public/menu.html + menu.js).
    app.use('/app/menu', express.static(path.join(__dirname, 'public', 'menu')));
    app.get(['/app', '/app/menu'], (_req, res) => {
      noCacheHtml(res);
      res.sendFile(path.join(__dirname, 'public', 'menu', 'index.html'));
    });
    // Live sanctuary map (the v0.4.0 TMA, still vanilla JS — Google
    // Maps imperative integration doesn't benefit from React).
    app.get('/app/map', (_req, res) => {
      noCacheHtml(res);
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    // Cuisine Picker TMA (v0.22.0). Vite-built React+Tailwind app.
    app.use('/app/cuisine', express.static(path.join(__dirname, 'public', 'cuisine')));
    app.get('/app/cuisine', (_req, res) => {
      noCacheHtml(res);
      res.sendFile(path.join(__dirname, 'public', 'cuisine', 'index.html'));
    });

    app.get('/maps-key', requireInitData, (_req, res) => {
      res.json({
        key: process.env.GOOGLE_MAPS_API_KEY ?? '',
        mapId: process.env.MAP_ID || 'GIA_SANCTUARY'
      });
    });

    app.post('/api/cuisine-search', requireInitData, async (req, res) => {
      const t0 = Date.now();
      // v0.26.1: fire-and-forget chat receipt so the user sees that the
      // Search trigger landed even if the TMA's own "Sensing the vibe…"
      // state never paints (network blip, Telegram in-app browser quirk).
      // Throttled by isProcessing so a fat-fingered user can't spam.
      const tgUserId = req.tg?.user?.id;
      if (tgUserId) {
        (async () => {
          try {
            if (await isProcessing(redis, tgUserId)) return;
            await setProcessing(redis, tgUserId);
            await safeSend(tgUserId, '🌿 Sensing the vibe… (Cuisine Picker)');
          } catch (err) {
            console.error('[Cuisine-Diag] D704 chat receipt failed:', err.message);
          }
        })();
      }
      try {
        const {
          lat, lng, cuisines, radius, recencyDays, queueMaxMin, mode, when, preset
        } = req.body || {};
        console.log(`[Cuisine-Diag] D700 request received user=${tgUserId} lat=${lat} lng=${lng} radius=${radius} preset=${preset} cuisines=${Array.isArray(cuisines) ? cuisines.length : 0}`);
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
          console.warn('[Cuisine-Diag] D701 rejecting — lat/lng invalid');
          return res.status(400).json({ error: 'lat and lng required', diag: 'D701' });
        }
        const params = {
          lat: Number(lat),
          lng: Number(lng),
          // v0.23.0: cap free-form cuisines at 10 (5 chip max + a handful of free-text additions).
          cuisines: Array.isArray(cuisines) ? cuisines.slice(0, 10) : [],
          radius: Number(radius) || 1000,
          recencyDays: Number(recencyDays) || 90,
          queueMaxMin: Number(queueMaxMin) || 15,
          mode: typeof mode === 'string' ? mode : 'walk',
          when: typeof when === 'string' ? when : 'now',
          preset: typeof preset === 'string' ? preset : null
        };

        // v0.27.0: 60 s pick cache. Tap-spam (same chat, ~same location,
        // same controls within a minute) hits Redis instead of running
        // the full Reason+Validate+Refine pipeline. ~80% cost cut on
        // typical "tap Search, see results, tap Search again to confirm".
        const pickCache = require('./pick-cache');
        if (tgUserId) {
          const hit = await pickCache.get(redis, tgUserId, params);
          if (hit) {
            const dt = Date.now() - t0;
            console.log(`[Cuisine-Diag] D705 cache HIT ${dt}ms venues=${hit.venues?.length ?? 0}`);
            return res.json({ ...hit, cached: true });
          }
        }

        const { searchCuisine } = require('./cuisine-search');
        const result = await searchCuisine({
          ...params,
          // v0.26.0: pass redis so pipeline can read vault snapshot + cache reviews.
          redis
        });
        const dt = Date.now() - t0;
        console.log(`[Cuisine-Diag] D702 OK ${dt}ms venues=${result.venues?.length ?? 0}`);
        // Write-through cache for the next 60 s of tap-spam.
        if (tgUserId && result?.venues?.length) {
          pickCache.set(redis, tgUserId, params, result).catch(() => {});
          console.log(`[Cuisine-Diag] D706 cache STORE ttl=${pickCache.TTL_S}s`);
        }
        res.json(result);
      } catch (err) {
        const dt = Date.now() - t0;
        console.error(`[Cuisine-Diag] D703 ${dt}ms error:`, err.message);
        res.status(500).json({ error: err.message || 'cuisine search failed', diag: 'D703' });
      } finally {
        if (tgUserId) clearProcessing(redis, tgUserId).catch(() => {});
      }
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
