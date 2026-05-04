const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { createClient } = require('redis');
const TelegramBot = require('node-telegram-bot-api');
const pkgJson = require('./package.json');
require('dotenv').config();

// v0.42.0: structured logging + error tracking. Both are no-ops if their
// env vars are unset, so dev/CI environments stay quiet.
const { logger } = require('./logger');
const sentry = require('./sentry');
sentry.init();

process.on('uncaughtException', (err) => {
  logger.fatal({ err: { message: err.message, stack: err.stack } }, 'uncaughtException');
  sentry.captureWithReqId(err, null, { kind: 'uncaughtException' });
});
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error({ err: { message: err.message, stack: err.stack } }, 'unhandledRejection');
  sentry.captureWithReqId(err, null, { kind: 'unhandledRejection' });
});
const { refreshVibeListings } = require('./vibe');
const { getOrCacheSummary } = require('./vibe-summary');
const { mealPeriodSGT, pickValidated, geocodeQuery } = require('./vibe-suggest');
const {
  setUserLocation,
  getUserLocation,
  getLocationAgeMinutes,
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

// v0.42.1 (B3): bot polling/webhook error handlers. Without these, a
// transient Telegram outage (502, polling drop, ECONNRESET) crashes
// node-telegram-bot-api's internal loop silently and the bot goes dark
// until the Node process is restarted. Logging + Sentry capture lets
// us see the storm; the SDK auto-recovers polling on its own.
bot.on('polling_error', (err) => {
  logger.warn({ err: { code: err.code, message: err.message?.slice(0, 200) } }, 'telegram polling_error');
  // beforeSend in sentry.js drops ETELEGRAM 429/502 noise; real errors get through.
  sentry.captureWithReqId(err, null, { kind: 'telegram_polling' });
});
bot.on('webhook_error', (err) => {
  logger.warn({ err: { code: err.code, message: err.message?.slice(0, 200) } }, 'telegram webhook_error');
  sentry.captureWithReqId(err, null, { kind: 'telegram_webhook' });
});
bot.on('error', (err) => {
  logger.error({ err: { code: err.code, message: err.message?.slice(0, 200) } }, 'telegram bot error');
  sentry.captureWithReqId(err, null, { kind: 'telegram_bot' });
});

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
// v0.52.0: shared reverse-geocode helper used by /transport (and any
// future menu that wants to display a human-readable "current location"
// header). Caches 24h in Redis on a coarse 4-decimal-place grid (~10 m).
async function reverseGeocodeAddress(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  const gLat = lat.toFixed(4);
  const gLng = lng.toFixed(4);
  const cacheKey = `revgeo:addr:${gLat}:${gLng}`;
  try {
    if (redis.isOpen) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch { /* cache miss is fine */ }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    if (data.status !== 'OK' || !data.results?.length) return null;
    const r = data.results[0];
    const components = r.address_components || [];
    const findComp = (t) => components.find((c) => c.types?.includes(t))?.long_name;
    const name = findComp('neighborhood')
      || findComp('sublocality_level_1')
      || findComp('sublocality')
      || findComp('locality')
      || r.formatted_address?.split(',')[0]
      || 'Singapore';
    const formatted = r.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const payload = { name, formatted };
    try {
      if (redis.isOpen) await redis.set(cacheKey, JSON.stringify(payload), { EX: 24 * 60 * 60 });
    } catch { /* cache-write fail is non-fatal */ }
    return payload;
  } catch (err) {
    console.warn('[reverseGeocode] failed:', err.message);
    return null;
  }
}

// v0.56.1: location-preload pattern, background-refresh mode.
// Per Human Lead: "why ask user to refresh location, can you refresh
// location in the background". Behaviour:
//   • Cached location of ANY age → return immediately (use cached).
//     The header line annotates age ("3 min ago", "1 h ago") so the
//     user can decide if they want to refresh manually.
//   • No cached location at all → prompt for share (only first time).
//     Sets pending-meal so bot.on('location') auto-resumes.
async function ensureLocation(chatId, label) {
  const cached = await getUserLocation(redis, chatId);
  if (!cached || !Number.isFinite(cached.lat) || !Number.isFinite(cached.lng)) {
    try { await setPendingMeal(redis, chatId, label); } catch { /* best effort */ }
    await bot.sendMessage(
      chatId,
      `📍 Share your location once so ${label} uses your locale (or type \`/location <place name>\` to set it manually).`,
      LOCATION_REQUEST_KEYBOARD
    );
    return null;
  }
  try {
    const geo = await reverseGeocodeAddress(cached.lat, cached.lng);
    const ageMin = cached.setAt ? Math.floor((Date.now() - cached.setAt) / 60000) : null;
    const ageNote = ageMin == null ? ''
      : ageMin < 1 ? ' (just shared)'
      : ageMin < 60 ? ` (${ageMin} min ago)`
      : ` (${Math.floor(ageMin / 60)} h ${ageMin % 60} min ago)`;
    if (geo?.formatted) {
      await safeSend(chatId, `📍 Current: ${geo.formatted}${ageNote}`);
    }
  } catch (err) {
    console.warn(`[${label}] reverse-geocode failed:`, err.message);
  }
  return cached;
}
// Back-compat alias — old callers (sendTransportMenu) still reference
// the v0.53.0 name.
const ensureFreshLocationOrPrompt = ensureLocation;

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

function buildGoogleMapsContainerUrl(items = [], opts = {}) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((x) => {
      if (!x) return null;
      const placeId = x.placeId ?? x.id ?? null;
      if (placeId) return { type: 'place', value: String(placeId) };
      if (Number.isFinite(x.lat) && Number.isFinite(x.lng)) return { type: 'coord', value: `${x.lat},${x.lng}` };
      return null;
    })
    .filter(Boolean);
  if (normalized.length < 2) return null;
  const [destination, ...rest] = normalized;
  const waypoints = rest.slice(0, 4);
  const route = ['https://www.google.com/maps/dir/?api=1', `travelmode=${encodeURIComponent(opts.travelmode || 'walking')}`];
  if (destination.type === 'place') route.push(`destination_place_id=${encodeURIComponent(destination.value)}`);
  else route.push(`destination=${encodeURIComponent(destination.value)}`);
  if (waypoints.length) {
    const key = waypoints[0].type === 'place' ? 'waypoint_place_ids' : 'waypoints';
    route.push(`${key}=${encodeURIComponent(waypoints.map((w) => w.value).join('|'))}`);
  }
  return route.join('&');
}

async function sendGoogleMapsContainer(chatId, items = [], opts = {}) {
  const url = buildGoogleMapsContainerUrl(items, opts);
  if (!url) return false;
  await bot.sendMessage(chatId, opts.caption || '🗺 Open this full set in Google Maps:', {
    reply_markup: { inline_keyboard: [[{ text: opts.label || '🗺 View all picks', url }]] }
  });
  return true;
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

// v0.31.0 Buddy Level 2 callback dispatcher.
//
// Two callback patterns:
//   buddy:init:<placeId>:<counterpartId>     — initiator tapped 👥 Connect
//   buddy:offer:<token>:accept|decline       — counterpart responding
async function handleBuddyCallback(data, chatId, q) {
  try {
    const buddy = require('./buddy-match');
    if (data.startsWith('buddy:init:')) {
      const rest = data.slice('buddy:init:'.length);
      const [placeId, counterpartId] = rest.split(':');
      if (!placeId || !counterpartId) return;

      // Daily-cap gate before any messaging.
      const cnt = await buddy.dailyCount(redis, chatId);
      if (cnt >= buddy.DAILY_CAP) {
        await safeSend(chatId, `👥 You've hit today's connection cap (${buddy.DAILY_CAP}). Try again tomorrow.`);
        return;
      }
      // Resolve both users' first names from Telegram.
      const fromName = q.from?.first_name || 'a fellow soleat user';
      // We don't store first names; only reveal on mutual confirm.
      // Look up venue name from the picks we delivered earlier — fall back to placeholder.
      let venueName = 'the venue';
      try {
        const single = await fetchSinglePlaceForPick(placeId, '', null);
        if (single?.name) venueName = single.name;
      } catch { /* ignore */ }

      const r = await buddy.createOffer(redis, { fromId: chatId, toId: counterpartId, placeId, venueName, fromName });
      if (!r) {
        await safeSend(chatId, "Couldn't create the connect offer. Try again later.");
        return;
      }
      if (r.error === 'daily_cap') {
        await safeSend(chatId, `👥 You've hit today's cap (${r.count}/${buddy.DAILY_CAP}).`);
        return;
      }
      const { token } = r;
      await safeSend(chatId,
        `👥 Sent a connect request to the other diner heading to *${venueName}*.\n` +
        `If they accept within 30 min, both of you will see first names + Telegram handles. ` +
        '⚠ _Pilot — meet in public, treat as a stranger, trust your gut._'
      );
      // Send mutual-confirm offer to the counterpart.
      await bot.sendMessage(counterpartId,
        `👥 *Solo-dining buddy match*\n\n` +
        `Another opted-in soleat user (first name: *${fromName}*) is heading to *${venueName}* in the next 60 minutes and would like to connect.\n\n` +
        `If you accept, both of you will see each other's first name + Telegram handle.\n\n` +
        '⚠ _Pilot — meet in public, treat as a stranger, trust your gut. You can `/buddy block <id>` or `/buddy report <id> <reason>` afterwards._',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Accept', callback_data: `buddy:offer:${token}:accept` },
              { text: '🚫 Decline', callback_data: `buddy:offer:${token}:decline` }
            ]]
          }
        }
      ).catch((err) => {
        console.warn('[Buddy] counterpart sendMessage failed (likely never /start-ed):', err.message);
        safeSend(chatId, "👥 Couldn't reach the other diner — they may have closed the bot. No connection made.").catch(() => {});
      });
      return;
    }

    if (data.startsWith('buddy:offer:')) {
      const rest = data.slice('buddy:offer:'.length);
      const lastColon = rest.lastIndexOf(':');
      const token = rest.slice(0, lastColon);
      const verdict = rest.slice(lastColon + 1);
      if (!token || !['accept', 'decline'].includes(verdict)) return;

      const offer = await buddy.loadOffer(redis, token);
      if (!offer) {
        await safeSend(chatId, '👥 That match offer has expired (30 min window).');
        return;
      }
      // Only the To-side may respond.
      if (String(chatId) !== String(offer.toId)) return;

      if (verdict === 'decline') {
        await buddy.setOfferStatus(redis, token, { status: 'declined' });
        await safeSend(chatId, '👥 Declined. The other diner will be told you passed.');
        await safeSend(offer.fromId, '👥 The other diner declined your connect request. No worries — try again later or with a different venue.');
        return;
      }

      // Accept → mutual reveal. Daily-cap gate on responder side too.
      const responderCnt = await buddy.dailyCount(redis, chatId);
      if (responderCnt >= buddy.DAILY_CAP) {
        await safeSend(chatId, `👥 You've hit today's cap (${buddy.DAILY_CAP}). Connection not made.`);
        await safeSend(offer.fromId, "👥 The other diner is at today's connection cap. Try again tomorrow.");
        return;
      }

      const toName = q.from?.first_name || 'a fellow soleat user';
      const fromHandle = '';
      const toHandle = q.from?.username ? `@${q.from.username}` : '(no Telegram username)';
      // Get fromHandle by best-effort: we don't have a stored mapping,
      // so we'll surface the chat IDs and let the users open chat manually.
      const finalOffer = await buddy.setOfferStatus(redis, token, { status: 'mutual_confirmed', toName });
      await buddy.bumpDailyCount(redis, offer.fromId);
      await buddy.bumpDailyCount(redis, chatId);

      const safetyFooter =
        '\n\n⚠ _Public meeting only. Either party can `/buddy block <id>` or `/buddy report <id> <reason>` afterwards._';

      await safeSend(chatId,
        `✅ *Match confirmed!*\n\n` +
        `*${finalOffer.fromName}* is heading to *${finalOffer.venueName}* in the next hour.\n` +
        `Their chat ID: \`${finalOffer.fromId}\`` +
        safetyFooter
      );
      await safeSend(offer.fromId,
        `✅ *Match confirmed!*\n\n` +
        `*${toName}* (${toHandle}) accepted your invite to *${finalOffer.venueName}*.\n` +
        `Their chat ID: \`${chatId}\`` +
        safetyFooter
      );
      return;
    }
  } catch (err) {
    console.error('[Buddy] callback dispatch failed:', err.message);
  }
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

  try {
    // v0.48.2: render all picks as multi-marker map via TMA /app/map.
    // Was previously a Google Maps directions URL (route mode) — that
    // showed picks as a sequence of stops, not as N markers on one map.
    // /app/map opens the leaflet view with each pick pinned, which is
    // what the user actually wants when they tap "View all on map".
    const { buildMapHashUrl } = require('./maps-url');
    const mapUrl = webhookDomain ? buildMapHashUrl(picks, { webhookDomain }) : null;
    if (mapUrl) {
      await bot.sendMessage(chatId, `🗺 View all ${picks.length} pick${picks.length === 1 ? '' : 's'} on one map:`, {
        reply_markup: { inline_keyboard: [[{ text: `🗺 View all ${picks.length} on map`, web_app: { url: mapUrl } }]] }
      });
    } else {
      // Fallback (no webhookDomain or no lat/lng): legacy directions URL.
      await sendGoogleMapsContainer(chatId, picks, {
        travelmode: 'walking',
        caption: '🗺 Open this full set in Google Maps:',
        label: '🗺 View all picks'
      });
    }
  } catch (err) {
    console.warn('[Picks] map button render failed:', err.message);
  }

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
    // v0.30.3 GEOSPATIAL_CULINARY_ANALYST: surface model-asserted opening
    // date (Places doesn't expose this) when grounded by Google Search.
    const openingLine = p.verifiedOpeningDate
      ? `\n🆕 Opened ${p.verifiedOpeningDate} _(model-asserted, web-grounded)_`
      : '';
    const body = summary
      ? `🌿 Sanctuary read for ${p.name}${openingLine}\n${summary}${googleLine}`
      : (p.vibe ? `🌿 ${p.name}${openingLine}\n${p.vibe}${googleLine}` : (openingLine || googleLine ? `🌿 ${p.name}${openingLine}${googleLine}` : null));

    const buttons = [];
    if (pid) {
      // v0.45.0: single shared googleMapsUrl(place) helper. Prefers
      // place_id-explicit deep-link → opens Google Maps app on iOS
      // (not Apple Maps).
      const { googleMapsUrl } = require('./maps-url');
      const mapsUrl = googleMapsUrl(p);
      if (mapsUrl) {
        buttons.push({ text: '📍 Google Maps', url: mapsUrl });
      }
      // v0.31.0 Buddy Level 2: if user opted in AND another opted-in
      // user has registered intent at this place in the last 60 min,
      // surface a "👥 Connect" button. Both confirmations are required
      // before any name/handle is revealed.
      try {
        const buddy = require('./buddy-match');
        if (await buddy.isOptedIn(redis, chatId)) {
          // Register this user's intent at this venue (60-min window).
          await buddy.registerIntent(redis, chatId, pid);
          const others = await buddy.findCounterparts(redis, chatId, pid);
          if (others.length) {
            const counterpartId = others[0]; // first available
            buttons.push({
              text: `👥 Connect (${others.length} other diner${others.length > 1 ? 's' : ''})`,
              callback_data: `buddy:init:${pid}:${counterpartId}`
            });
          }
        }
      } catch (err) {
        console.warn('[Buddy] match-button decoration failed:', err.message);
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
  // v0.30.2: 15-minute staleness reminder. After picks are delivered,
  // if the user's stored location is older than 15 min, surface a
  // gentle nudge so they can refresh before the next query. Doesn't
  // block delivery; fire-and-forget single message.
  try {
    const ageMin = await getLocationAgeMinutes(redis, chatId);
    if (Number.isFinite(ageMin) && ageMin >= 10) {
      await safeSend(chatId, `📍 Heads up: your location is ${ageMin} min old. Type "my location changed" (any language) or share a new pin to refresh; otherwise this set keeps using the old location.`);
    }
  } catch (err) {
    console.warn('[Stale-Location] reminder failed:', err.message);
  }
  // v0.34.1: buddy state footer. Ambient indicator so the user knows
  // whether 👥 Connect buttons can appear on these picks. Fire-and-forget.
  try {
    await safeSend(chatId, await formatBuddyFooter(chatId));
  } catch (err) {
    console.warn('[Buddy] footer render failed:', err.message);
  }
}

// v0.34.1: render a single-line buddy state footer. Reads opt-in flag
// + today's connection count from buddy-match. Returns a formatted
// Markdown string ready for safeSend.
async function formatBuddyFooter(chatId) {
  const buddy = require('./buddy-match');
  try {
    const on = await buddy.isOptedIn(redis, chatId);
    if (!on) {
      return '👥 Buddy: OFF — `/buddy on` to enable live solo-dining match.';
    }
    const count = await buddy.dailyCount(redis, chatId);
    const cap = buddy.DAILY_CAP;
    const remaining = Math.max(0, cap - count);
    if (remaining === 0) {
      return `👥 Buddy: ON · daily cap reached (${count}/${cap}). Resets in 24 h.`;
    }
    return `👥 Buddy: ON · ${count}/${cap} connections used today (${remaining} left).`;
  } catch (err) {
    return '👥 Buddy: state unknown (Redis blip).';
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

// v0.57.1: /eat /drink /groceries removed per Human Lead. /cuisine
// (map-first, multi-cuisine, "Tell Gia") replaces them.

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

bot.onText(/^\/transport(?:@\w+)?$/, (msg) => sendTransportMenu(msg.chat.id));

bot.onText(/^\/carpark(?:@\w+)?$/, (msg) => runCarparkCommand(msg.chat.id));

bot.onText(/^\/surprise(?:@\w+)?$/, (msg) => runSurpriseCommand(msg.chat.id));

// v0.56.1: /location <free text> — manual override when sharing GPS
// is awkward (e.g. on desktop). Geocodes the text via Google
// Geocoding and stores as the user's cached location.
bot.onText(/^\/location(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
  const text = (match?.[1] || '').trim();
  const chatId = msg.chat.id;
  if (!text) {
    await safeSend(chatId,
      'Usage: `/location <place>`\n' +
      'Example: `/location current Telok Blangah`\n' +
      'Or: `/location Marina Bay Sands`',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    await safeSend(chatId, "Manual location lookup is offline (GOOGLE_MAPS_API_KEY missing).");
    return;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text + ', Singapore')}&components=country:SG&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    if (data.status !== 'OK' || !data.results?.length) {
      await safeSend(chatId, `Could not resolve "${text}" to a Singapore location. Try a more specific name (street, MRT, mall, postal).`);
      return;
    }
    const r = data.results[0];
    const lat = r.geometry?.location?.lat;
    const lng = r.geometry?.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      await safeSend(chatId, "Geocoding result missing coordinates.");
      return;
    }
    await setUserLocation(redis, chatId, lat, lng);
    await safeSend(chatId, `📍 Location saved: ${r.formatted_address}`, {
      reply_markup: { remove_keyboard: true }
    });
  } catch (err) {
    console.error('[Error] /location command failed:', err.message);
    await safeSend(chatId, "Sorry, geocoding hit an error. Try sharing GPS instead.");
  }
});

// v0.33.0: /hawker — sub-menu (Nearest 3 / By zone / Cleaning info / Crowd).
bot.onText(/^\/hawker(?:@\w+)?$/, (msg) => sendHawkerMenu(msg.chat.id));

// v0.35.0: /recognised — nearest 5 award-winning venues (Michelin Star,
// Bib Gourmand, Asia 50 Best, World Culinary Awards, Best Chef Awards,
// UNESCO ICH) within 5 km. Consumes the v0.34 recog:venue:* table —
// returns "no venues yet, run /admin/seed-recognised" if the table is
// empty.
// v0.37.0: optional category filter — /recognised michelin, /recognised bib,
// /recognised michelin-star, etc. Falls through to all-categories when no arg.
bot.onText(/^\/recognised(?:@\w+)?(?:\s+(\S+))?$/, (msg, match) => runRecognisedCommand(msg.chat.id, match?.[1] || null));

// v0.52.0: /heritage_food removed. The data source overlapped /recognised
// (Michelin SG list) and the heritage signal was thin / inconsistent.

// v0.57.0: /p (hidden power-user query relay) removed entirely.
// Per Human Lead — drops the four upstream LLM/Search/Maps probes
// + their associations.

// v0.30.4: /log on|off|status — per-chat verbose-mode toggle. When on,
// every step of the NL pipeline emits a "🔍 step …" message to the
// chat for real-time debugging. Auto-clears after 24 h.
bot.onText(/^\/log(?:@\w+)?(?:\s+(on|off|status))?$/i, async (msg, match) => {
  try {
    const verbose = require('./verbose-log');
    const action = (match?.[1] || 'status').toLowerCase();
    if (action === 'on') {
      await verbose.enable(redis, msg.chat.id);
      await safeSend(msg.chat.id,
        '🔍 *Verbose mode ON.* Every step of the NL pipeline will be ' +
        'mirrored back to this chat for the next 24 h. Send `/log off` ' +
        'to disable, `/log status` to check.'
      );
      return;
    }
    if (action === 'off') {
      await verbose.disable(redis, msg.chat.id);
      await safeSend(msg.chat.id, '🔍 Verbose mode OFF.');
      return;
    }
    const on = await verbose.isEnabled(redis, msg.chat.id);
    await safeSend(msg.chat.id, `🔍 Verbose mode is currently *${on ? 'ON' : 'OFF'}*. Use \`/log on\` or \`/log off\` to toggle.`);
  } catch (err) {
    console.error('[Error] /log handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, /log hit an error.");
  }
});

// v0.27.1: /share — list user's last-5 picks with a 👋 Send to buddy
// inline button per pick. Replaces the per-pick share button removed in
// v0.26.2; surfaces buddy-share as an explicit on-demand action.
// v0.31.0: /buddy on|off|status|block|report — Buddy Level 2 controls.
// Opt-in only. See prompt-templates/buddy-level-2-policy.md.
bot.onText(/^\/buddy(?:@\w+)?(?:\s+(on|off|status|block|report)(?:\s+(.+))?)?$/i, async (msg, match) => {
  try {
    const buddy = require('./buddy-match');
    const action = (match?.[1] || 'status').toLowerCase();
    const arg = (match?.[2] || '').trim();

    if (action === 'on') {
      await buddy.optIn(redis, msg.chat.id);
      await safeSend(msg.chat.id,
        '👥 *Buddy mode ON.*\n\n' +
        'When you receive Sanctuary picks, a 👥 _Connect_ button appears next to venues where another opted-in soleat user is also heading in the next 60 min. ' +
        'Both of you must confirm before first names + Telegram handles are revealed. ' +
        'Daily cap: 5 connections / 24 h. `/buddy block <chat_id>` to block. `/buddy report <chat_id> <reason>` to flag. `/buddy off` to disable.\n\n' +
        '⚠ _Pilot — meet only in public, treat as a stranger, trust your gut._'
      );
      return;
    }
    if (action === 'off') {
      await buddy.optOut(redis, msg.chat.id);
      await safeSend(msg.chat.id, '👥 Buddy mode OFF.');
      return;
    }
    if (action === 'block') {
      const target = String(arg).trim();
      if (!target) {
        await safeSend(msg.chat.id, 'Usage: `/buddy block <chat_id>`. Get the chat ID from a previous match offer.');
        return;
      }
      const ok = await buddy.block(redis, msg.chat.id, target);
      await safeSend(msg.chat.id, ok ? `🚫 Blocked ${target}. They will never be matched with you.` : 'Could not block (max 50 blocks reached).');
      return;
    }
    if (action === 'report') {
      const parts = arg.split(/\s+/);
      const target = parts.shift() || '';
      const reason = parts.join(' ');
      if (!target) {
        await safeSend(msg.chat.id, 'Usage: `/buddy report <chat_id> <reason>`.');
        return;
      }
      await buddy.report(redis, msg.chat.id, target, reason);
      await buddy.block(redis, msg.chat.id, target).catch(() => {});
      await safeSend(msg.chat.id, `📝 Report logged. ${target} is also auto-blocked from your matches. We'll review.`);
      return;
    }
    const on = await buddy.isOptedIn(redis, msg.chat.id);
    const cnt = await buddy.dailyCount(redis, msg.chat.id);
    await safeSend(msg.chat.id,
      `👥 Buddy mode is currently *${on ? 'ON' : 'OFF'}*. ` +
      `Today's connections: ${cnt}/${buddy.DAILY_CAP}. ` +
      'Use `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.'
    );
  } catch (err) {
    console.error('[Error] /buddy handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, /buddy hit an error.");
  }
});

// v0.47.0: /picks — consolidated copy-friendly list of today's picks
// across /cuisine, /surprise, /eat, /drink, /groceries, NL chat. Reads
// recent-picks.js Redis store (24h TTL, capped at 5). Renders ONE
// message with each pick as a labeled block — long-press to copy on
// mobile, or copy individual lines.
//
// Different from /share (v0.27.1): /share offers buddy-forwarding via
// inline buttons; /picks gives plain copyable text for sending into
// other chats / WhatsApp / notes apps.
bot.onText(/^\/picks(?:@\w+)?$/i, async (msg) => {
  try {
    const { getRecent } = require('./recent-picks');
    const { googleMapsUrl } = require('./maps-url');
    const recent = await getRecent(redis, msg.chat.id);
    if (!recent.length) {
      await safeSend(msg.chat.id, "📋 No picks today yet. Run /cuisine, /surprise, /eat, /drink, or just type 'find me ramen' — they'll all populate /picks.");
      return;
    }
    const lines = recent.map((p, i) => {
      const rating = p.rating ? `⭐${p.rating.toFixed(1)}` : '';
      const type = p.primaryType ? ` · ${p.primaryType.replace(/_/g, ' ')}` : '';
      const vibe = p.vibe ? `\n   🌿 ${p.vibe}` : '';
      const dish = p.signatureDish ? `\n   🍴 ${p.signatureDish}` : '';
      const url = googleMapsUrl(p) || '';
      const link = url ? `\n   📍 ${url}` : '';
      const area = p.area ? `\n   ${p.area}` : '';
      return `${i + 1}. ${p.name}${rating ? ` · ${rating}` : ''}${type}${area}${vibe}${dish}${link}`;
    });
    const ageHrs = Math.max(0, Math.round((Date.now() - (recent[0]?.addedAt || Date.now())) / 3600000));
    const footer = `\n\n📋 ${recent.length} pick${recent.length === 1 ? '' : 's'} from the last ${Math.max(1, ageHrs)}h. Long-press any line to copy. Picks expire 24h after each search.`;
    await safeSend(msg.chat.id, `📋 Your picks today\n\n${lines.join('\n\n')}${footer}`);
  } catch (err) {
    console.error('[Error] /picks failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, /picks hit an error.");
  }
});

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
  // v0.30.0: NL-search pending state, encoded as `nl:<json-payload>`.
  if (pending.startsWith('nl:')) {
    try {
      const payload = JSON.parse(pending.slice('nl:'.length));
      return { kind: 'nl', ...payload };
    } catch {
      return { kind: 'sanctuary', category: 'food' };
    }
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
    } else if (resolved.kind === 'nl') {
      await runNLFlow(msg.chat.id, 1.2839, 103.8517, resolved);
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
      await runTransportTrain(chatId); // legacy refresh button on bus stop list — point at train view
      return;
    }
    // v0.31.1 transport sub-menu dispatch:
    //   transport:menu              → top-level menu
    //   transport:train             → MRT status + crowd + nearest stations
    //   transport:bus               → bus sub-sub-menu
    //   transport:bus:nearest       → nearest 3 stops (no arrivals)
    //   transport:bus:arrivals      → arrivals at nearest stops (current /transport bus block)
    //   transport:bus:crowd         → bus load summary across nearest arrivals
    //   transport:bus:route         → Google Maps transit deep link from current location
    //   (removed in v0.57.6)
    //   transport:drive             → traffic incidents + driving directions deep link
    if (data === 'transport:menu') {
      await sendTransportMenu(chatId);
      return;
    }
    if (data === 'transport:refresh-loc') {
      // v0.52.0: clear the cached location so the next sendTransportMenu
      // call falls into the share-location prompt.
      const { hashChatId } = require('./location-cache');
      await redis.del(`loc:${hashChatId(chatId)}`).catch(() => {});
      await bot.sendMessage(chatId, "📍 Tap to share your current location.", LOCATION_REQUEST_KEYBOARD);
      return;
    }
    if (data === 'transport:train') {
      await runTransportTrain(chatId);
      return;
    }
    if (data === 'transport:bus') {
      await sendBusMenu(chatId);
      return;
    }
    if (data.startsWith('transport:bus:')) {
      const sub = data.slice('transport:bus:'.length);
      await runTransportBus(chatId, sub);
      return;
    }
    if (data === 'transport:incidents') {
      await runTransportTrafficIncidents(chatId);
      return;
    }
    if (data === 'transport:drive') {
      await runTransportDrive(chatId);
      return;
    }
    // v0.52.0 hawker sub-menu dispatch (simplified):
    //   hawker:menu               → top-level menu (Cleaning + Browse)
    //   hawker:cleaning           → cleaning-info screen → Hawker Centre Status TMA
    //   hawker:list:menu          → 5-region picker (Browse)
    //   hawker:list:region:<R>    → alphabetical list for that region
    if (data === 'hawker:menu') { await sendHawkerMenu(chatId); return; }
    // v0.54.0: chat-side cleaning/list/region screens removed —
    // both /hawker buttons now open the TMA directly with ?tab= query
    // param. No intermediate dispatch needed.
    // v0.31.0 Buddy Level 2 callback dispatch.
    if (data.startsWith('buddy:')) {
      await handleBuddyCallback(data, chatId, q);
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
        '[' + link + '](' + link + ')\n\n' +
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
  let pending;
  try {
    const lat = msg.location?.latitude;
    const lng = msg.location?.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      try { await setUserLocation(redis, msg.chat.id, lat, lng); }
      catch (err) { console.warn('[location] setUserLocation failed:', err.message); }
    }
    // v0.56.1: dismiss the persistent "Share my location / Use Raffles
    // Place default" reply keyboard once we've received a location.
    // Per Human Lead — the buttons "keep on at iOS" until removed.
    try {
      await bot.sendMessage(msg.chat.id, '📍 Got your location.', {
        reply_markup: { remove_keyboard: true }
      });
    } catch (err) { /* non-fatal */ }
    pending = await consumePendingMeal(redis, msg.chat.id);
    if (!pending) return; // location stored; nothing to auto-resume
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('coordinates missing or malformed');
    }
    // Auto-resume targets for ensureLocation callers.
    if (pending === '/surprise')   { await runSurpriseCommand(msg.chat.id); return; }
    if (pending === '/transport')  { await sendTransportMenu(msg.chat.id);  return; }
    if (pending === '/carpark')    { await runCarparkCommand(msg.chat.id);  return; }
    // Legacy sanctuary / cuisine / nl flow.
    await safeSend(msg.chat.id, ACK_SENSING_VIBE);
    const resolved = resolvePending(pending) || { kind: 'sanctuary', category: 'food' };
    if (resolved.kind === 'cuisine') {
      await runCuisineFlow(msg.chat.id, lat, lng, resolved.cuisineType);
    } else if (resolved.kind === 'nl') {
      await runNLFlow(msg.chat.id, lat, lng, resolved);
    } else {
      await runFlow(msg.chat.id, lat, lng, resolved.category);
    }
  } catch (err) {
    console.error('[Error] location handler failed:', err.message);
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
    // v0.57.1: eat / drink / groceries menu-router cases removed.
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
    case 'cuisine-pick':
    case 'save-pick': {
      // TMA card tap → bot delivers Sanctuary read for the single venue.
      // v0.32.0: 'save-pick' is the new explicit "📤 Save to chat" name;
      // 'cuisine-pick' kept as alias for older bundles.
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
        console.error('[Error] save-pick failed:', err.message);
        await safeSend(chatId, "Sorry, I couldn't load that pick.");
      }
      return true;
    }
    case 'weather':   await runWeatherCommand(chatId); return true;
    case 'transport': await sendTransportMenu(chatId); return true;
    case 'hawker':    await sendHawkerMenu(chatId); return true;
    case 'recognised': await runRecognisedCommand(chatId); return true;
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

// v0.31.1: /transport is now a 4-button sub-menu (Train, Bus, Taxi/PHD,
// Drive). Bus opens its own sub-sub-menu (nearest stops, arrivals, crowd,
// route). The original "everything-in-one-message" runTransportCommand is
// retained as runTransportFull below for any internal caller that still
// wants the dense view, but the user-facing entry point is sendTransportMenu.

async function sendTransportMenu(chatId) {
  // v0.56.1: use shared ensureLocation helper. Cached-of-any-age
  // returns immediately; only prompts when zero cached location.
  const cached = await ensureLocation(chatId, '/transport');
  if (!cached) return;
  await safeSend(chatId, '🚉 *Singapore transport*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🚇 Train',     callback_data: 'transport:train' },
          { text: '🚌 Bus',       callback_data: 'transport:bus' }
        ],
        [
          { text: '🚦 Incidents', callback_data: 'transport:incidents' },
          { text: '🚗 Drive',     callback_data: 'transport:drive' }
        ],
        [
          { text: '📍 Refresh location', callback_data: 'transport:refresh-loc' }
        ]
      ]
    }
  });
}

async function sendBusMenu(chatId) {
  // v0.56.0: removed "Arrivals" + "Crowd / load" per Human Lead.
  // Both depend on per-stop user-side selection that the chat-side
  // flow couldn't make ergonomic.
  await safeSend(chatId, '🚌 Bus — pick what you need', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🚏 Nearest stops',   callback_data: 'transport:bus:nearest' },
          { text: '🗺 Plan a route',    callback_data: 'transport:bus:route' }
        ],
        [
          { text: '⬅️ Back',            callback_data: 'transport:menu' }
        ]
      ]
    }
  });
}

async function runTransportTrain(chatId) {
  try {
    if (!redis.isOpen) await redis.connect();
    const cachedStatus = await redis.get('lta:train_status');
    const status = cachedStatus ? JSON.parse(cachedStatus) : null;
    const cachedLoc = await getUserLocation(redis, chatId);

    const lines = ['🚇 Train (MRT)'];
    if (status) {
      lines.push('', `Status: ${status.status}`);
      if (status.message) lines.push(`Notes: ${status.message}`);
      lines.push(`Refreshed: ${status.updatedAt}`);
    } else {
      lines.push('', 'Status: 🟡 warming up; try again in 30 s.');
    }

    // v0.56.1: nearest 3 stations FIRST, each with crowd + wait estimate.
    // Network summary follows in plain English.
    const CROWD_LABEL = { l: '🟢 low', m: '🟡 medium', h: '🔴 high' };
    let crowdMap = null;
    if (process.env.LTA_ACCOUNT_KEY) {
      try { crowdMap = await transport.fetchPlatformCrowdAll(); }
      catch (err) { console.error('[Transport] platform crowd failed:', err.message); }
    }
    if (cachedLoc && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const mrt = await transport.nearestMrtStations(cachedLoc.lat, cachedLoc.lng, 1500, 3);
        if (mrt.length) {
          const wait = transport.estimateWaitMinutes();
          lines.push('', `🚇 Nearest 3 stations · est. wait ${wait.min}–${wait.max} min (${wait.label})`);
          for (const s of mrt) {
            const crowd = crowdMap ? transport.lookupCrowdForPlace(crowdMap, s.name) : null;
            const crowdNote = crowd ? ` · ${CROWD_LABEL[crowd] || crowd}` : '';
            lines.push(`· ${s.name}${crowdNote}`);
          }
        }
      } catch (err) {
        console.error('[Transport] nearestMrtStations failed:', err.message);
      }
    } else if (!cachedLoc) {
      lines.push('', '🚇 Share your location once and Gia will list the nearest MRT stations too.');
    }
    if (crowdMap) {
      const summary = transport.networkCrowdSummary(crowdMap);
      if (summary) {
        // Plain-English: e.g. "🟢 Network is uncrowded — all 162 platforms low density"
        const pct = summary.total > 0 ? Math.round((summary.low / summary.total) * 100) : 0;
        let networkLine;
        if (summary.overall === 'low') {
          networkLine = `🟢 Network is uncrowded — ${pct}% of ${summary.total} platforms at low density.`;
        } else if (summary.overall === 'medium') {
          networkLine = `🟡 Network is moderate — ${summary.medium} of ${summary.total} platforms at medium density, ${summary.high} high.`;
        } else {
          networkLine = `🔴 Network is busy — ${summary.high} of ${summary.total} platforms at high density.`;
        }
        lines.push('', networkLine);
      }
    }

    // v0.51.0: per-line breakdown + Hitachi-style TMA + engineering closures.
    try {
      const mrtLines = require('./mrt-lines');
      const mrtEng = require('./mrt-engineering');
      const todayISO = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
      // Per-line table from the live alerts payload.
      let alerts = null;
      if (process.env.LTA_ACCOUNT_KEY && lta) {
        try { const { data } = await lta.get('/TrainServiceAlerts'); alerts = data?.value || null; }
        catch (err) { console.warn('[Transport] TrainServiceAlerts fetch failed:', err.message); }
      }
      const statusByLine = mrtLines.parseStatusByLine(alerts);
      const affected = Object.entries(statusByLine).filter(([_, s]) => s.status !== 'normal');
      if (affected.length) {
        lines.push('', '⚠️ Affected lines:');
        for (const [code, s] of affected) {
          const meta = mrtLines.LINES_BY_CODE[code];
          lines.push(`${meta?.emoji || '·'} ${code} ${meta?.name || ''} — ${s.status}${s.cause ? ` (${s.cause})` : ''}`);
          if (s.direction) lines.push(`   ${s.direction}`);
        }
      }
      const upcoming = mrtEng.upcoming(todayISO, 7);
      if (upcoming.length) {
        lines.push('', '🔧 Upcoming engineering (next 7 d):');
        for (const c of upcoming.slice(0, 5)) {
          lines.push(`· ${c.date} ${c.line} ${c.direction} — ${c.type} ${c.time}`);
        }
      }
    } catch (err) {
      console.warn('[Transport] per-line + engineering enrichment failed:', err.message);
    }

    const tmaButton = webhookDomain
      ? [[{ text: '🗺 Open MRT map (Hitachi-style)', web_app: { url: `https://${webhookDomain}/app/transport` } }]]
      : [];
    const buttons = [
      ...tmaButton,
      [{ text: '🔄 Refresh', callback_data: 'transport:train' }],
      [{ text: '⬅️ Back', callback_data: 'transport:menu' }]
    ];
    await safeSend(chatId, lines.join('\n'), {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (err) {
    console.error('[Error] transport train failed:', err.message);
    await safeSend(chatId, "Sorry, I can't reach the MRT feed right now.");
  }
}

async function runTransportBus(chatId, sub) {
  try {
    if (!redis.isOpen) await redis.connect();
    const cachedLoc = await getUserLocation(redis, chatId);
    const backRow = [{ text: '⬅️ Back', callback_data: 'transport:bus' }];

    if (!cachedLoc) {
      await safeSend(chatId, '🚌 I need your location first — share it once via the menu (📍) and Gia will remember.', {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }
    if (!process.env.LTA_ACCOUNT_KEY) {
      await safeSend(chatId, '🚌 Bus lookup is offline (LTA key not configured).', {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }

    if (sub === 'nearest') {
      const stops = await transport.nearestStops(redis, cachedLoc.lat, cachedLoc.lng, 800, 5);
      if (!stops.length) {
        await safeSend(chatId, '🚏 No bus stops within 800 m of your saved location.', {
          reply_markup: { inline_keyboard: [backRow] }
        });
        return;
      }
      const lines = ['🚏 Nearest bus stops'];
      for (const stop of stops) {
        lines.push('', `· ${stop.description} (${stop.roadName}) — ${stop.distanceM} m`);
        lines.push(`  Code: ${stop.code}`);
      }
      await safeSend(chatId, lines.join('\n'), {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }

    if (sub === 'arrivals') {
      const stops = await transport.nearestStops(redis, cachedLoc.lat, cachedLoc.lng, 800, 3);
      if (!stops.length) {
        await safeSend(chatId, '⏱ No bus stops within 800 m of your saved location.', {
          reply_markup: { inline_keyboard: [backRow] }
        });
        return;
      }
      const lines = ['⏱ Next arrivals — top 3 nearest stops'];
      for (const stop of stops) {
        const arrivals = await transport.busArrivals(stop.code);
        lines.push('', `· ${stop.description} (${stop.roadName}) — ${stop.distanceM} m`);
        if (!arrivals.length) { lines.push('  no real-time arrivals'); continue; }
        for (const svc of arrivals.slice(0, 4)) {
          const nextStr = svc.next ? `${svc.next.minutes} min · ${svc.next.loadLabel}` : '—';
          const next2Str = svc.next2 ? ` · then ${svc.next2.minutes} min` : '';
          lines.push(`  ${svc.service}: ${nextStr}${next2Str}`);
        }
      }
      await safeSend(chatId, lines.join('\n'), {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }

    if (sub === 'crowd') {
      // Bus load is reported per-arrival via the LTA BusArrivalv2 Load field
      // (SEA / SDA / LSD). Aggregate across the nearest 3 stops as a quick
      // "is the next bus full?" snapshot.
      const stops = await transport.nearestStops(redis, cachedLoc.lat, cachedLoc.lng, 800, 3);
      if (!stops.length) {
        await safeSend(chatId, '👥 No bus stops within 800 m to sample.', {
          reply_markup: { inline_keyboard: [backRow] }
        });
        return;
      }
      let SEA = 0, SDA = 0, LSD = 0, total = 0;
      const detail = [];
      for (const stop of stops) {
        const arrivals = await transport.busArrivals(stop.code);
        for (const svc of arrivals) {
          const load = svc.next?.loadLabel || '';
          if (load) {
            total += 1;
            if (/seats/i.test(load)) SEA += 1;
            else if (/standing/i.test(load)) SDA += 1;
            else if (/limited/i.test(load)) LSD += 1;
          }
        }
        detail.push(`· ${stop.description}: ${arrivals.length} services`);
      }
      const lines = ['👥 Bus load — sampled across nearest 3 stops'];
      lines.push('');
      if (total) {
        lines.push(`Seats Available: ${SEA}`);
        lines.push(`Standing Available: ${SDA}`);
        lines.push(`Limited Standing: ${LSD}`);
        lines.push(`(of ${total} services with live load data)`);
      } else {
        lines.push('No live load data right now — try again in 30 s.');
      }
      lines.push('', ...detail);
      await safeSend(chatId, lines.join('\n'), {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }

    if (sub === 'route') {
      // Open Google Maps in transit mode from the saved location. The user
      // types the destination in the Maps app.
      const url = `https://www.google.com/maps/dir/?api=1&origin=${cachedLoc.lat},${cachedLoc.lng}&travelmode=transit`;
      await safeSend(chatId, '🗺 Tap below to open Google Maps in transit mode from your saved location. Type your destination in Maps.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗺 Open Google Maps (transit)', url }],
            backRow
          ]
        }
      });
      return;
    }

    await sendBusMenu(chatId);
  } catch (err) {
    console.error('[Error] transport bus failed:', err.message);
    await safeSend(chatId, "Sorry, the bus feed is unavailable right now.");
  }
}

async function runTransportTrafficIncidents(chatId) {
  try {
    if (!process.env.LTA_ACCOUNT_KEY) {
      await safeSend(chatId, '🚦 Traffic feed offline (LTA key not configured).', {
        reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'transport:menu' }]] }
      });
      return;
    }
    if (!redis.isOpen) await redis.connect();
    const cachedLoc = await getUserLocation(redis, chatId);
    const all = await transport.fetchTrafficIncidents();
    const lines = ['🚦 *Live traffic incidents*'];
    if (!all.length) {
      lines.push('', 'No live incidents reported.');
    } else if (cachedLoc) {
      const near = transport.nearestIncidents(all, cachedLoc.lat, cachedLoc.lng, 10000, 8);
      if (near.length) {
        lines.push('', `Top ${near.length} within 10 km (of ${all.length} island-wide):`);
        for (const inc of near) {
          const dist = Number.isFinite(inc.distanceM) ? ` — ${inc.distanceM} m` : '';
          lines.push('', `· ${inc.type}${dist}`);
          lines.push(`  ${inc.message}`);
        }
      } else {
        lines.push('', `${all.length} incidents island-wide; none within 10 km of your location.`);
      }
    } else {
      lines.push('', `${all.length} incidents island-wide. Share your location for nearest-first sorting.`);
      for (const inc of all.slice(0, 5)) {
        lines.push('', `· ${inc.type}`);
        lines.push(`  ${inc.message}`);
      }
    }
    await safeSend(chatId, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'transport:menu' }]] }
    });
  } catch (err) {
    console.error('[Error] transport traffic incidents failed:', err.message);
    await safeSend(chatId, "Sorry, the traffic feed failed.");
  }
}

async function runTransportDrive(chatId) {
  try {
    if (!redis.isOpen) await redis.connect();
    const cachedLoc = await getUserLocation(redis, chatId);
    const lines = ['🚗 Drive'];
    if (process.env.LTA_ACCOUNT_KEY) {
      try {
        const all = await transport.fetchTrafficIncidents();
        const near = transport.nearestIncidents(
          all,
          cachedLoc?.lat ?? 1.2839,
          cachedLoc?.lng ?? 103.8517,
          5000,
          5
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
    const buttons = [];
    if (cachedLoc) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${cachedLoc.lat},${cachedLoc.lng}&travelmode=driving`;
      buttons.push([{ text: '🗺 Open Google Maps (driving)', url }]);
    } else {
      lines.push('', 'Share your location once and Gia will offer a one-tap driving directions link.');
    }
    buttons.push([{ text: '🅿️ Carpark', callback_data: 'transport:menu' }, { text: '⬅️ Back', callback_data: 'transport:menu' }]);
    await safeSend(chatId, lines.join('\n'), {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (err) {
    console.error('[Error] transport drive failed:', err.message);
    await safeSend(chatId, "Sorry, the drive view failed.");
  }
}

// v0.33.0: /hawker sub-menu + handlers.
async function sendHawkerMenu(chatId) {
  // v0.56.0: collapse to a SINGLE button — /hawker goes straight to
  // the TMA per Human Lead. TMA also simplified: only the regional
  // browser remains (Closures/R&R/About tabs removed).
  const vault = require('./hawker-vault');
  const total = vault.getAllCentres().length;
  await safeSend(chatId, `🍚 Singapore hawker centres (${total} curated, snapshot 25 Jul 2025)`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🍚 Open Hawker Centre', web_app: { url: `https://${webhookDomain}/app/hawker` } }]
      ]
    }
  });
}


// v0.35.0: /recognised + /heritage-food handlers. Both consume the
async function runRecognisedCommand(chatId) {
  // v0.56.3: per Human Lead — stop the LLM web_search query (was off);
  // surface 4 curated Singapore award/listing pages as direct links
  // in the requested order. Static, deterministic, zero LLM cost.
  const text = [
    '🏆 *Singapore — recognised dining*',
    '',
    'Tap a list to open the source page:'
  ].join('\n');
  await safeSend(chatId, text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🍜 MICHELIN Bib Gourmand',          url: 'https://guide.michelin.com/sg/en/selection/singapore/restaurants/bib-gourmand' }],
        [{ text: '⭐ MICHELIN Star',                   url: 'https://guide.michelin.com/sg/en/singapore-region/singapore/restaurants' }],
        [{ text: "🌏 Asia's 50 Best Restaurants",     url: 'https://www.theworlds50best.com/asia/en/list/1-50' }],
        [{ text: '🌱 Restaurants using Local Produce', url: 'https://www.sfa.gov.sg/fromSGtoSG/where-to-dine' }]
      ]
    }
  });
}

async function runCarparkCommand(chatId) {
  try {
    if (!process.env.LTA_ACCOUNT_KEY) { await safeSend(chatId, "Carpark lookup is offline (LTA key not configured)."); return; }
    // v0.53.0: 5-min staleness gate + reverse-geocoded "Current: <addr>" header.
    const cached = await ensureFreshLocationOrPrompt(chatId, '/carpark');
    if (!cached) return;
    await safeSend(chatId, "🅿️ Looking up nearest carparks…");
    const list = await carpark.nearest(cached.lat, cached.lng, 5);
    if (!list.length) { await safeSend(chatId, "No carparks with available lots near here."); return; }
    const lines = ['🅿️ Nearest carparks with available lots'];
    list.forEach((c, i) => lines.push(`${i + 1}. ${c.development}  ·  ${c.availableLots} lots  ·  ${c.distanceM} m`));
    await safeSend(chatId, lines.join('\n'));
    // v0.53.0: 5 carparks on one map (TMA leaflet view), same pattern as /surprise.
    // Falls back to legacy directions URL when webhookDomain unavailable.
    try {
      const { buildMapHashUrl } = require('./maps-url');
      const carparksWithName = list.map((c) => ({ ...c, name: c.development, placeId: '' }));
      const mapUrl = webhookDomain ? buildMapHashUrl(carparksWithName, { webhookDomain }) : null;
      if (mapUrl) {
        await bot.sendMessage(chatId, `🗺 View all ${list.length} carparks on one map:`, {
          reply_markup: { inline_keyboard: [[{ text: `🗺 View all ${list.length} on map`, web_app: { url: mapUrl } }]] }
        });
      } else {
        await sendGoogleMapsContainer(chatId, list, {
          travelmode: 'driving',
          caption: '🗺 Open all 5 carparks in one Google Maps container:',
          label: '🗺 View all carparks'
        });
      }
    } catch (err) {
      console.warn('[Carpark] map button render failed:', err.message);
    }
  } catch (err) {
    console.error('[Error] carpark command failed:', err.message);
    await safeSend(chatId, "Sorry, I can't reach the LTA carpark feed right now.");
  }
}

async function runSurpriseCommand(chatId) {
  // v0.32.0: /surprise becomes a 5-venue list driven by the same
  // pipeline-task model as /cuisine. Rating window 4.0-4.3, <50 reviews,
  // launched within 90 days, day-or-night temporal switch. Old
  // single-venue flow is reachable via PIPELINE_TASKS_ENABLED=false rollback.
  try {
    if (await isProcessing(redis, chatId)) {
      await safeSend(chatId, '⏳ Gia is still working on your last request — hold on a moment.');
      return;
    }
    // v0.53.0: 5-min staleness gate + reverse-geocoded "Current: <addr>" header.
    const cached = await ensureFreshLocationOrPrompt(chatId, '/surprise');
    if (!cached) return;
    await setProcessing(redis, chatId);

    if (process.env.PIPELINE_TASKS_ENABLED === 'false') {
      await safeSend(chatId, '🎲 Hunting for one hidden gem 1.5–3 km away…');
      const { findSurprise } = require('./surprise');
      const venue = await findSurprise({ lat: cached.lat, lng: cached.lng, redis });
      if (!venue) {
        await safeSend(chatId, "Gia couldn't find a hidden gem in your annulus. Try moving area or open /cuisine.");
        return;
      }
      await deliverSurprise(chatId, venue);
      return;
    }

    await safeSend(chatId, '🎲 Hunting up to 5 hidden gems 1.5–3 km away — discovering → narrating…');
    const requestStore = require('./request-store');
    const pipelineTask = require('./pipeline-task');
    const reqId = await requestStore.create(redis, {
      kind: 'surprise',
      chatId,
      userId: chatId,
      payload: { lat: cached.lat, lng: cached.lng, radius: 3000, mode: 'walk', lang: 'en' }
    });
    await pipelineTask.runTask(redis, reqId);
    const row = await requestStore.get(redis, reqId);
    const venues = row?.venues || [];
    if (!venues.length) {
      await safeSend(chatId, "Gia couldn't find hidden gems matching the /surprise filters in your annulus (rating ≥4.0, ≤150 reviews / opened ≤100d / recent reviews ≤45d, open now). Try a denser area or /cuisine for unfiltered picks.");
      return;
    }
    await deliverPicks(chatId, `🎲 ${venues.length} surprise hidden gem${venues.length === 1 ? '' : 's'}`, venues);
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
  // v0.30.2: soft-fallback disclosure when no venue passed the strict
  // 4-day fresh-review gate. User still gets a venue, just flagged.
  const fallbackNote = v.isFallback
    ? '\n\n💡 _Best match in your annulus — no fresh review this week, but rating + price profile fits._'
    : '';
  const text = [
    `🎲 *${v.name}*`,
    `${v.area}`,
    `${rating}${open ? ' · ' + open : ''} · ${km} km away`,
    dishes + why + booking + travel + shelter + fallbackNote
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
  // v0.34.1: buddy state footer (same as deliverPicks).
  try {
    await safeSend(chatId, await formatBuddyFooter(chatId));
  } catch (err) {
    console.warn('[Buddy] footer render failed:', err.message);
  }
}

async function runVerCommand(chatId) {
  try {
    await safeSend(chatId, '🩺 Running health check…');
    const report = await runHealthCheck(bot, redis);
    // v0.34.1: append per-chat buddy state below the deploy line so the
    // user can see at a glance whether buddy mode is on, how many
    // connections are left today, and (later) when their opt-in expires.
    let buddyLine = '';
    try {
      const buddy = require('./buddy-match');
      const on = await buddy.isOptedIn(redis, chatId);
      if (on) {
        const cnt = await buddy.dailyCount(redis, chatId);
        buddyLine = `\nBuddy: ON · ${cnt}/${buddy.DAILY_CAP} connections used today`;
      } else {
        buddyLine = '\nBuddy: OFF (use /buddy on to enable)';
      }
    } catch (err) {
      buddyLine = '\nBuddy: state unknown';
    }
    // v0.37.0: footfall A/B telemetry row. Reads the Redis counters that
    // pipeline-task#refineIfPossible bumps when FOOTFALL_PROXY_ENABLED=on.
    // Only surfaces the row when the flag is on; stays quiet otherwise.
    let footfallLine = '';
    if (process.env.FOOTFALL_PROXY_ENABLED === 'on') {
      try {
        const [hi, med, lo, nul, runs] = await Promise.all([
          redis.get('footfall:signal-fired:high'),
          redis.get('footfall:signal-fired:medium'),
          redis.get('footfall:signal-fired:low'),
          redis.get('footfall:signal-fired:null'),
          redis.get('footfall:fetch-context-runs')
        ]);
        const total = (Number(hi)||0) + (Number(med)||0) + (Number(lo)||0) + (Number(nul)||0);
        footfallLine = `\nFootfall (A/B on, ${runs || 0} runs): high=${hi || 0} · med=${med || 0} · low=${lo || 0} · null=${nul || 0} (n=${total})`;
      } catch {
        footfallLine = '\nFootfall (A/B on): counters unavailable';
      }
    }
    const reportWithExtras = report + buddyLine + footfallLine;
    const escaped = reportWithExtras.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await bot.sendMessage(chatId, `<pre>${escaped}</pre>`, { parse_mode: 'HTML' }).catch(async () => { await safeSend(chatId, reportWithExtras); });
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
// v0.30.8: voice-message handler. Telegram delivers OGG/Opus voice
// notes; Gemini 2.5 Flash transcribes + classifies in a single call,
// then we route through the existing NL pipeline (location_override
// geocode + runNLFlow / update-location keyboard / gatekeeper).
bot.on('voice', async (msg) => {
  try {
    if (!msg.voice) return;
    const langCode = msg.from?.language_code || 'en';
    const { classifyVoice, MIN_CONFIDENCE: VOICE_MIN_CONF, isAvailable: voiceAvailable } = require('./voice-input');
    const verbose = require('./verbose-log');

    // v0.42.1 (B1): honest short-circuit when transcription provider isn't
    // wired (Anthropic dropped Gemini audio in v0.40.0; no Whisper plumbed
    // yet). Skip the misleading "🎙 transcribing…" tease.
    if (!voiceAvailable()) {
      console.log(`[Voice] D760-B1 received chat=${msg.chat.id} duration=${msg.voice.duration}s — voice transcription disabled (no audio provider wired)`);
      await verbose.say(redis, msg.chat.id, safeSend, 'D760-B1 voice received but transcription is currently disabled (no audio provider since v0.40.0)');
      await safeSend(msg.chat.id, "🎙 Voice transcription is temporarily unavailable — please type your question instead.");
      return;
    }

    console.log(`[Voice] D760 received chat=${msg.chat.id} duration=${msg.voice.duration}s mime=${msg.voice.mime_type}`);
    await verbose.say(redis, msg.chat.id, safeSend, `D760 voice received (${msg.voice.duration}s). Transcribing + classifying…`);
    await safeSend(msg.chat.id, '🎙 Heard you — transcribing…');

    const cls = await classifyVoice({ bot, voice: msg.voice, redis });
    if (!cls || cls.error || cls.disabled) {
      console.warn(`[Voice] D761 classify error=${cls?.error || cls?.reason || 'null'}`);
      await verbose.say(redis, msg.chat.id, safeSend, `D761 classify error=${cls?.error || cls?.reason || 'unavailable'}`);
      if (cls?.error === 'clip_too_long') {
        await safeSend(msg.chat.id, `⏱ Voice clip too long (${cls.duration}s, max 90s). Send a shorter one or type the question.`);
      } else {
        await safeSend(msg.chat.id, "Sorry, I couldn't transcribe that. Try typing the question instead.");
      }
      return;
    }

    // Mirror transcript so user can sanity-check what we heard.
    if (cls.transcript) {
      await safeSend(msg.chat.id, `📝 _Heard:_ "${cls.transcript}"`);
    }
    await verbose.say(redis, msg.chat.id, safeSend,
      `D762 voice intent=${cls.intent} conf=${cls.confidence.toFixed(2)} cuisines=[${cls.cuisines.join(', ')}] qualifier="${cls.special_request}" loc_override="${cls.location_override}" lang=${cls.lang}`);

    // update-location intent: drop pending state + show share keyboard.
    if (cls.intent === 'update-location' && cls.confidence >= VOICE_MIN_CONF) {
      await consumePendingMeal(redis, msg.chat.id).catch(() => {});
      await bot.sendMessage(
        msg.chat.id,
        cls.ack_text || "📍 Tap to share your new location, or type a place name.",
        LOCATION_REQUEST_KEYBOARD
      );
      return;
    }

    // food / drinks / groceries: dispatch into runNLFlow with same
    // location_override + cuisines + special_request semantics as the
    // text-NL handler.
    if ((cls.intent === 'food' || cls.intent === 'drinks' || cls.intent === 'groceries') && cls.confidence >= VOICE_MIN_CONF) {
      if (cls.ack_text) await safeSend(msg.chat.id, cls.ack_text);
      let searchLat = null, searchLng = null, searchSource = '';
      if (cls.location_override) {
        await verbose.say(redis, msg.chat.id, safeSend, `D708 geocoding location_override="${cls.location_override}"…`);
        try {
          const place = await geocodeQuery(cls.location_override + ' Singapore');
          if (place?.lat && place?.lng) {
            searchLat = place.lat;
            searchLng = place.lng;
            searchSource = `override "${cls.location_override}" → ${place.name} (${searchLat.toFixed(4)}, ${searchLng.toFixed(4)})`;
          }
        } catch (err) {
          console.error('[Voice] geocode failed:', err.message);
        }
      }
      if (searchLat == null) {
        const cached = await getUserLocation(redis, msg.chat.id);
        if (!cached) {
          await setPendingMeal(redis, msg.chat.id, `nl:${JSON.stringify({
            cuisines: cls.cuisines, specialRequest: cls.special_request, intent: cls.intent, lang: cls.lang
          })}`);
          await bot.sendMessage(
            msg.chat.id,
            "Where are you? Tap to share your location, or type a place name.",
            LOCATION_REQUEST_KEYBOARD
          );
          return;
        }
        searchLat = cached.lat;
        searchLng = cached.lng;
        searchSource = `cached GPS (${searchLat.toFixed(4)}, ${searchLng.toFixed(4)})`;
      }
      await verbose.say(redis, msg.chat.id, safeSend, `Search anchored at ${searchSource}`);
      await runNLFlow(msg.chat.id, searchLat, searchLng, {
        cuisines: cls.cuisines, specialRequest: cls.special_request, intent: cls.intent
      });
      return;
    }

    // Off-topic voice — politely decline.
    await safeSend(msg.chat.id,
      "I heard you, but that doesn't sound like a food/drinks/groceries question I can help with. Try asking about a cuisine, a venue, or a meal.");
  } catch (err) {
    console.error('[Voice] handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, voice handling hit an error.");
  }
});

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
      } else if (resolved?.kind === 'nl') {
        await runNLFlow(msg.chat.id, place.lat, place.lng, resolved);
      } else {
        await runFlow(msg.chat.id, place.lat, place.lng, resolved?.category || 'food');
      }
      return;
    }

    // v0.30.0: Natural-language chat search (any language). Before
    // falling through to the topic gatekeeper, ask Gemini Flash to
    // classify intent. If food/drinks/groceries with confidence ≥ 0.6,
    // dispatch the cuisine pipeline with extracted hints. Otherwise
    // fall through to the existing gatekeeper (off-topic steering).
    try {
      const { classifyIntent, MIN_CONFIDENCE } = require('./nl-intent');
      const verbose = require('./verbose-log');
      const langCode = msg.from?.language_code || 'en';
      console.log(`[NL-Intent] D750 received chat=${msg.chat.id} lang=${langCode} bytes=${text.length}`);
      await verbose.say(redis, msg.chat.id, safeSend, `D750 received text (lang=${langCode}, ${text.length} chars). Classifying intent…`);
      const cls = await classifyIntent({ text, langCode, redis });
      await verbose.say(redis, msg.chat.id, safeSend, cls
        ? `D751 intent=${cls.intent} confidence=${cls.confidence.toFixed(2)} cuisines=[${cls.cuisines.join(', ')}] qualifier="${cls.special_request}" lang=${cls.lang}`
        : 'D751 classifyIntent returned null (Gemini unavailable or call failed)');
      // v0.30.2: handle "update-location" intent. NL classifier flagged
      // a location-change request (any language) — drop pending state +
      // surface the share-location keyboard with the localised ack.
      if (cls && cls.intent === 'update-location' && cls.confidence >= MIN_CONFIDENCE) {
        console.log(`[NL-Intent] D754 update-location intent confidence=${cls.confidence}`);
        await consumePendingMeal(redis, msg.chat.id).catch(() => {});
        await bot.sendMessage(
          msg.chat.id,
          cls.ack_text || "📍 Tap to share your new location, or type a place name.",
          LOCATION_REQUEST_KEYBOARD
        );
        return;
      }
      if (cls && (cls.intent === 'food' || cls.intent === 'drinks' || cls.intent === 'groceries') && cls.confidence >= MIN_CONFIDENCE) {
        console.log(`[NL-Intent] D751 dispatching intent=${cls.intent} confidence=${cls.confidence} location_override="${cls.location_override}"`);
        if (cls.ack_text) await safeSend(msg.chat.id, cls.ack_text);

        // v0.30.5: location_override takes precedence over cached GPS.
        // If the user said "near Tanjong Pagar MRT", geocode that and
        // anchor the search there — not on their actual GPS coords.
        let searchLat = null;
        let searchLng = null;
        let searchSource = '';
        if (cls.location_override) {
          await verbose.say(redis, msg.chat.id, safeSend, `D708 geocoding location_override="${cls.location_override}"…`);
          try {
            const place = await geocodeQuery(cls.location_override + ' Singapore');
            if (place?.lat && place?.lng) {
              searchLat = place.lat;
              searchLng = place.lng;
              searchSource = `override "${cls.location_override}" → ${place.name} (${searchLat.toFixed(4)}, ${searchLng.toFixed(4)})`;
              console.log(`[NL-Intent] D709 location_override geocoded: ${searchSource}`);
            } else {
              console.warn(`[NL-Intent] D710 location_override failed to geocode, falling back to user GPS`);
              await verbose.say(redis, msg.chat.id, safeSend, `D710 geocode of "${cls.location_override}" failed; falling back to your stored GPS`);
            }
          } catch (err) {
            console.error('[NL-Intent] D710 geocode threw:', err.message);
          }
        }

        if (searchLat == null) {
          const cached = await getUserLocation(redis, msg.chat.id);
          if (!cached) {
            await setPendingMeal(redis, msg.chat.id, `nl:${JSON.stringify({
              cuisines: cls.cuisines, specialRequest: cls.special_request, intent: cls.intent, lang: cls.lang, locationOverride: cls.location_override
            })}`);
            await bot.sendMessage(
              msg.chat.id,
              "Where are you? Tap to share your location, or type a place name.",
              LOCATION_REQUEST_KEYBOARD
            );
            return;
          }
          searchLat = cached.lat;
          searchLng = cached.lng;
          searchSource = `cached GPS (${searchLat.toFixed(4)}, ${searchLng.toFixed(4)})`;
        }
        await verbose.say(redis, msg.chat.id, safeSend, `Search anchored at ${searchSource}`);
        await runNLFlow(msg.chat.id, searchLat, searchLng, {
          cuisines: cls.cuisines, specialRequest: cls.special_request, intent: cls.intent
        });
        return;
      }
      console.log(`[NL-Intent] D753 falls through intent=${cls?.intent || '?'} confidence=${cls?.confidence ?? '?'}`);
    } catch (err) {
      console.error('[NL-Intent] classify branch failed:', err.message);
    }

    const result = await gatekeep(redis, text);
    if (result?.reply) await safeSend(msg.chat.id, result.reply);
  } catch (err) {
    console.error('[Error] free-text handler failed:', err.message);
  }
});

// v0.30.0 — runs after NL classifier confirms food/drinks/groceries
// intent and a location is present. Dispatches into the same
// searchCuisine pipeline the TMA Search button uses; delivers picks
// to chat via deliverPicks.
async function runNLFlow(chatId, lat, lng, { cuisines = [], specialRequest = '', intent = 'food' }) {
  const verbose = require('./verbose-log');
  try {
    if (await isProcessing(redis, chatId)) {
      await safeSend(chatId, '⏳ Gia is still working on your last request — hold on a moment.');
      return;
    }
    await setProcessing(redis, chatId);
    await verbose.say(redis, chatId, safeSend,
      `runNLFlow start lat=${lat.toFixed(4)} lng=${lng.toFixed(4)} cuisines=[${cuisines.join(', ')}] qualifier="${specialRequest}" intent=${intent}`);
    await verbose.say(redis, chatId, safeSend,
      `Calling searchCuisine pipeline (Reason → Validate → Refine, ~12-15 s typical with Google Search grounding)…`);
    const { searchCuisine } = require('./cuisine-search');
    const t0 = Date.now();
    const result = await searchCuisine({
      lat, lng,
      cuisines: Array.isArray(cuisines) ? cuisines.slice(0, 5) : [],
      radius: 1000, recencyDays: 90, queueMaxMin: 15,
      mode: 'walk', when: 'now', preset: null,
      specialRequest,
      redis
    });
    const dt = Date.now() - t0;
    const venues = (result?.venues || []).slice(0, 5);
    await verbose.say(redis, chatId, safeSend,
      `searchCuisine returned ${venues.length} venues in ${dt} ms ` +
      `(meal=${result?.meal?.label || '?'}, pipelineDiag=${result?.pipelineDiag?.length || 0} events). ` +
      (venues.length === 0
        ? '⚠ No venues to deliver. Likely cause: Reason returned no candidates OR Places-validate filtered all (check GOOGLE_MAPS_API_KEY 403). Inspect Railway logs for [Cuisine-Diag] D610/D611/D502.'
        : 'Delivering now…'));
    if (!venues.length) {
      await safeSend(chatId, "Gia couldn't find sanctuary picks matching that. Try /cuisine for the full picker, or /surprise for a hidden gem.");
      return;
    }
    const label = result?.meal?.label || intent;
    await deliverPicks(chatId, label, venues);
  } catch (err) {
    console.error('[NL-Intent] D752 runNLFlow failed:', err.message);
    await verbose.say(redis, chatId, safeSend, `D752 runNLFlow EXCEPTION: ${err.message}`);
    await safeSend(chatId, "Sorry, NL search hit an error.");
  } finally {
    await clearProcessing(redis, chatId).catch(() => {});
  }
}

// 4. Initialization
async function registerCommandsMenu() {
  try {
    // v0.25.1: /eat removed from the slash autocomplete (still wired internally
    // for muscle memory but de-emphasized). /cuisine surfaces first as the
    // primary entry point. Chat menu button now opens /app/cuisine directly
    // so the default landing inside the TMA shell is the Cuisine Picker.
    // v0.31.1: /log, /drink, /grocery, /ver hidden from the slash autocomplete
    // (still wired internally — power users keep muscle memory). /transport now
    // surfaces an inline sub-menu (Train/Bus/Taxi-PHD/Drive) with bus offering
    // a sub-sub-menu for nearest-stops/arrivals/crowd/route.
    // v0.56.0: hidden — /ver (dropped from autocomplete; handler still
    // works for power users). /buddy + /share moved to bottom.
    await bot.setMyCommands([
      { command: 'cuisine',   description: 'Cuisine Picker — map-first, 73 cuisines, multi-select' },
      { command: 'surprise',  description: 'Up to 5 hidden gems 1.5–3 km away' },
      { command: 'weather',   description: 'Now + 2-hour NEA forecast' },
      { command: 'transport', description: 'Train, Bus, Taxi/PHD, Drive — sub-menu' },
      { command: 'hawker',    description: 'Singapore hawker centres — browse by region' },
      { command: 'recognised', description: 'SG culinary awards — Michelin / Bib / Asia 50/100 / WCA' },
      { command: 'carpark',   description: 'Nearest 5 carparks with available lots' },
      { command: 'location',  description: 'Set your locale by typing a place name' },
      { command: 'buddy',     description: 'Live solo-dining match: /buddy on/off/status/block/report' },
      { command: 'share',     description: 'Forward a recent pick to a buddy' }
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

  // v0.30.9: flag missing MAP_ID at boot so the operator notices in
  // Railway logs without needing to inspect /maps-key responses.
  if (!process.env.MAP_ID) {
    console.warn('[Boot] MAP_ID env var unset — Sanctuary Map TMA will render with default Google Maps styling (no vector branding). Register a Map ID at https://console.cloud.google.com/google/maps-apis/studio/maps and set MAP_ID in Railway. Steps in setup-cloud-map-id.md.');
  } else {
    console.log(`[Boot] MAP_ID configured: ${process.env.MAP_ID.slice(0, 16)}…`);
  }

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
          ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY
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

    // v0.29.1: black-box pipeline trace. Bypasses TMA + initData,
    // runs the SAME searchCuisine pipeline server-side with explicit
    // params, returns the full step-by-step result. The fastest way
    // to answer "is the bridge broken or is the pipeline broken?"
    // when /ver shows everything green but the user reports no Search.
    //
    // Usage:
    //   curl "https://<host>/admin/test-pipeline?secret=<ADMIN_SYNC_SECRET>&lat=1.2839&lng=103.8517"
    // Optional params: cuisines=Japanese,Korean | radius=1000 |
    //                  recencyDays=90 | queueMaxMin=15 | preset=transit-efficiency
    app.get('/admin/test-pipeline', async (req, res) => {
      const expected = process.env.ADMIN_SYNC_SECRET;
      const given = String(req.query.secret || '');
      if (!expected) {
        return res.status(503).json({ error: 'ADMIN_SYNC_SECRET not configured' });
      }
      const a = Buffer.from(expected);
      const b = Buffer.from(given.padEnd(expected.length, ' ').slice(0, expected.length));
      const ok = a.length === Buffer.byteLength(given) && crypto.timingSafeEqual(a, b);
      if (!ok) return res.status(401).json({ error: 'invalid secret' });

      const lat = Number(req.query.lat) || 1.2839;
      const lng = Number(req.query.lng) || 103.8517;
      let cuisines = String(req.query.cuisines || '').split(',').map((s) => s.trim()).filter(Boolean);
      const radius = Number(req.query.radius) || 1000;
      const recencyDays = Number(req.query.recencyDays) || 90;
      const queueMaxMin = Number(req.query.queueMaxMin) || 15;
      const preset = String(req.query.preset || '') || null;
      // v0.30.1: free-text NL classification path. If `nl_text` is given,
      // we run the same classifyIntent the chat handler uses, then merge
      // the extracted cuisines + special_request into the pipeline call.
      // `specialRequest` query param can override or stand alone too.
      const nlText = String(req.query.nl_text || '').trim();
      let specialRequest = String(req.query.specialRequest || req.query.special_request || '').trim();
      const langCode = String(req.query.lang || 'en');

      const t0 = Date.now();
      console.log(`[Admin] test-pipeline params lat=${lat} lng=${lng} cuisines=${cuisines.join('|')} radius=${radius} preset=${preset} nl_text="${nlText.slice(0, 80)}" specialRequest="${specialRequest}"`);
      const trace = {
        version: pkgJson.version,
        bot: { username: botUsername },
        env: {
          PIPELINE_ENABLED: process.env.PIPELINE_ENABLED !== 'false',
          ANTHROPIC_API_KEY_present: !!process.env.ANTHROPIC_API_KEY,
          GOOGLE_MAPS_API_KEY_present: !!process.env.GOOGLE_MAPS_API_KEY,
          REDIS_open: !!redis?.isOpen
        },
        params: { lat, lng, cuisines, radius, recencyDays, queueMaxMin, preset, nlText, specialRequest, langCode },
        steps: {}
      };

      try {
        // Phase 0 (optional): NL classify if nl_text was provided.
        if (nlText) {
          const { classifyIntent } = require('./nl-intent');
          const cls = await classifyIntent({ text: nlText, langCode, redis });
          trace.steps.nl = cls
            ? {
                intent: cls.intent,
                confidence: cls.confidence,
                cuisines: cls.cuisines,
                special_request: cls.special_request,
                lang: cls.lang,
                ack_text: cls.ack_text
              }
            : { error: 'classifyIntent returned null (Gemini key missing or call failed)' };
          if (cls) {
            // Merge classifier's extracted hints into pipeline params.
            // Explicit query-string params take precedence over NL.
            if (!cuisines.length && Array.isArray(cls.cuisines)) cuisines = cls.cuisines;
            if (!specialRequest && cls.special_request) specialRequest = cls.special_request;
          }
        }

        // Phase A: vault snapshot — confirms the vault index is alive.
        const vaultIndex = require('./vault-index');
        const snapshot = await vaultIndex.snapshotForLocation(redis, { lat, lng }, radius);
        trace.steps.vault = {
          n_vault: snapshot.vault.length,
          n_summaries: Object.keys(snapshot.summaries).length,
          n_reviews: Object.keys(snapshot.reviews).length,
          firstFew: snapshot.vault.slice(0, 3).map((v) => v.name)
        };

        // Phase B: full pipeline. searchCuisine is the same path the
        // TMA route invokes — only difference is the auth wrapper.
        const { searchCuisine } = require('./cuisine-search');
        const result = await searchCuisine({
          lat, lng, cuisines, radius, recencyDays, queueMaxMin,
          mode: 'walk', when: 'now', preset, specialRequest, redis
        });
        trace.steps.pipeline = {
          venuesCount: result?.venues?.length ?? 0,
          firstFewVenues: (result?.venues ?? []).slice(0, 3).map((v) => ({
            name: v.name,
            placeId: v.placeId,
            queueMinEstimate: v.queueMinEstimate,
            costEstimateSgd: v.costEstimateSgd,
            travelAdvice: v.travelAdvice,
            shelterNote: v.shelterNote,
            signatureDish: v.signatureDish
          })),
          meal: result?.meal,
          recencyDays: result?.recencyDays,
          queueMaxMin: result?.queueMaxMin,
          pipelineDiagEvents: result?.pipelineDiag?.length ?? 0,
          pipelineDiagFirstFew: (result?.pipelineDiag ?? []).slice(0, 8)
        };
      } catch (err) {
        trace.error = { message: err.message, stack: err.stack?.split('\n').slice(0, 5) };
        console.error('[Admin] test-pipeline failed:', err.message);
      }
      trace.totalMs = Date.now() - t0;
      console.log(`[Admin] test-pipeline complete ${trace.totalMs}ms err=${!!trace.error}`);
      res.json(trace);
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

    // v0.53.0: cuisine catalogue + map-first search endpoints for the
    // new v2 TMA. Catalogue is read-once from the in-repo MD file.
    app.get('/api/cuisine/catalogue', (_req, res) => {
      try {
        const cv = require('./cuisines-vault');
        res.json({ categories: cv.getByCategory() });
      } catch (err) {
        console.error('[Error] /api/cuisine/catalogue failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/cuisine/search', async (req, res) => {
      try {
        // v0.57.3: drop hard radius constraint — search Singapore-wide
        // (50 km bias). Compute walkMinutes server-side from haversine
        // (80 m/min). "≤10 min walk" is now "≤20 min walk". Surface a
        // recent-review snippet from the place-reviews:* cache when
        // available so cards can show "common food in last 4 months".
        const { lat, lng, cuisines = [], filters = {} } = req.body || {};
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: 'missing lat/lng' });
        }
        const cv = require('./cuisines-vault');
        const cuisineNames = (cuisines || [])
          .slice(0, 5)
          .map((slug) => cv.findBySlug(slug))
          .filter(Boolean)
          .map((c) => c.name);
        const modifiers = [];
        if (filters.newlyOpened) modifiers.push('newly opened');
        if (filters.halal) modifiers.push('halal');
        if (filters.vegetarian) modifiers.push('vegetarian');
        let cuisineQueries;
        if (modifiers.length && cuisineNames.length) {
          cuisineQueries = cuisineNames.map((n) => `${modifiers.join(' ')} ${n}`);
        } else if (modifiers.length) {
          cuisineQueries = [modifiers.join(' ')];
        } else {
          cuisineQueries = cuisineNames;
        }
        // v0.57.6: response cache keyed by selection state (rounded
        // location to ~110m so neighbours share the cache). 30-min TTL.
        const cacheKey = `cuisine:search:v1:${lat.toFixed(3)}:${lng.toFixed(3)}:` +
          `${cuisineQueries.join('|')}:` +
          `${[filters.newlyOpened ? 'n' : '', filters.openNow ? 'o' : '', filters.walking20 ? 'w' : '', filters.halal ? 'h' : '', filters.vegetarian ? 'v' : ''].join('')}:` +
          `${(filters.prices || []).join(',')}`;
        try {
          if (redis.isOpen) {
            const cached = await redis.get(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              return res.json({ ...parsed, cached: true });
            }
          }
        } catch (err) { console.warn('[Cuisine-Search] cache read failed:', err.message); }
        const pipeline = require('./pipeline');
        const candidates = await pipeline.discover({
          lat, lng, radius: 50000, cuisines: cuisineQueries, maxResults: 30
        });
        let venues = Array.isArray(candidates) ? candidates : (candidates?.venues || []);
        // v0.57.5: defensive deny-list — drop venues whose primaryType
        // says "this is lodging / a complex / a mall / etc." even when
        // Google's strictTypeFiltering on the search call missed them.
        // The screenshot bug had Amara Singapore (lodging) + Dempsey
        // Hill (point_of_interest) sneaking through.
        const NON_FOOD_TYPES = new Set([
          'lodging', 'hotel', 'motel', 'hostel', 'guest_house', 'resort',
          'shopping_mall', 'department_store', 'store', 'supermarket_chain',
          'tourist_attraction', 'point_of_interest', 'establishment',
          'plaza', 'complex', 'building', 'park', 'school',
          'university', 'hospital', 'gym', 'fitness_center'
        ]);
        venues = venues.filter((v) => !NON_FOOD_TYPES.has(v.primaryType));
        // Compute walking distance/time on every venue (haversine).
        function haversine(a, b) {
          const R = 6371000, toRad = (d) => d * Math.PI / 180;
          const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
          const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
          return Math.round(2 * R * Math.asin(Math.sqrt(x)));
        }
        venues = venues.map((v) => {
          if (Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
            const dist = haversine({ lat, lng }, v);
            return { ...v, distanceM: dist, walkMinutes: Math.round(dist / 80) };
          }
          return v;
        });
        if (filters.openNow) venues = venues.filter((v) => v.openNow !== false);
        if (filters.prices?.length) {
          const allowed = new Set(filters.prices.map((p) => p.length));
          venues = venues.filter((v) => v.priceLevel == null || allowed.has(v.priceLevel));
        }
        if (filters.walking20 || filters.walking10) {
          venues = venues.filter((v) => Number.isFinite(v.walkMinutes) ? v.walkMinutes <= 20 : false);
        }
        // v0.57.6: "newly opened" is a soft filter: prefer venues with
        // ≤150 reviews (proxy for "opened recently in Singapore"). The
        // searchText query already biases toward Google's own
        // recency signal via the "newly opened" modifier.
        if (filters.newlyOpened) {
          venues = venues.filter((v) => v.userRatingCount == null || v.userRatingCount <= 150);
        }
        // Sort by walking distance ASC (closer first) so top 12 are most reachable.
        venues.sort((a, b) => (a.distanceM || 0) - (b.distanceM || 0));
        const top = venues.slice(0, 12);
        // Best-effort: attach last cached review snippet (≤120 d) per
        // venue from place-reviews cache. Surfaces "common food
        // mentioned by reviewers" as a one-line hint.
        const FOUR_MONTHS_MS = 120 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        try {
          if (redis.isOpen) {
            await Promise.all(top.map(async (v) => {
              if (!v.placeId) return;
              try {
                const raw = await redis.get(`place-reviews:${v.placeId}`);
                if (!raw) return;
                const reviews = JSON.parse(raw);
                const recent = (reviews || [])
                  .filter((r) => r?.text && r?.publishTime && (now - new Date(r.publishTime).getTime()) <= FOUR_MONTHS_MS)
                  .sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));
                if (recent.length) {
                  v.recentReview = String(recent[0].text).slice(0, 200).trim();
                }
              } catch { /* per-venue best-effort */ }
            }));
          }
        } catch (err) {
          console.warn('[Cuisine-Search] review-attach failed:', err.message);
        }
        const payload = { venues: top, debug: { cuisineQueries, modifiers, scope: 'sg-wide-50km' } };
        // v0.57.6: write to cache for 30 minutes.
        try {
          if (redis.isOpen) await redis.setEx(cacheKey, 30 * 60, JSON.stringify(payload));
        } catch (err) { console.warn('[Cuisine-Search] cache write failed:', err.message); }
        res.json({ ...payload, cached: false });
      } catch (err) {
        console.error('[Error] /api/cuisine/search failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/cuisine/nl-query', async (req, res) => {
      try {
        const { text, lat, lng, filters = {} } = req.body || {};
        if (!text || !text.trim()) return res.status(400).json({ error: 'missing text' });
        // v0.55.0: Gemini-backed NL inference with hardened guardrails
        // (input cap, domain-restricted system prompt, output validation,
        // cache, anti-injection). Falls back to v0.53.0 keyword inference
        // when GEMINI_API_KEY is unset or Gemini errors.
        const cv = require('./cuisines-vault');
        const tellGia = require('./tell-gia');
        const chatId = req.body.chatId || 'anon';
        const inferred = await tellGia.inferTellGia({ text, chatId, redis, vault: cv });
        const inferredCuisines = inferred.cuisines || [];
        const inferredFilters = inferred.filters || {};
        const pipeline = require('./pipeline');
        const cuisineNames = inferredCuisines
          .map((slug) => cv.findBySlug(slug))
          .filter(Boolean)
          .map((c) => c.name);
        const merged = { ...filters, ...inferredFilters };
        if (Array.isArray(inferredFilters.prices) && inferredFilters.prices.length) {
          merged.prices = inferredFilters.prices;
        }
        // v0.57.2: same modifier-prefix pattern as /api/cuisine/search.
        const modifiers = [];
        if (merged.newlyOpened) modifiers.push('newly opened');
        if (merged.halal) modifiers.push('halal');
        if (merged.vegetarian) modifiers.push('vegetarian');
        let cuisineQueries;
        if (modifiers.length && cuisineNames.length) {
          cuisineQueries = cuisineNames.map((n) => `${modifiers.join(' ')} ${n}`);
        } else if (modifiers.length) {
          cuisineQueries = [modifiers.join(' ')];
        } else {
          cuisineQueries = cuisineNames;
        }
        const candidates = await pipeline.discover({
          lat, lng, radius: 50000, cuisines: cuisineQueries, maxResults: 30
        });
        let venues = Array.isArray(candidates) ? candidates : (candidates?.venues || []);
        // v0.57.5: same primaryType deny-list as /api/cuisine/search.
        const NON_FOOD_TYPES_NL = new Set([
          'lodging', 'hotel', 'motel', 'hostel', 'guest_house', 'resort',
          'shopping_mall', 'department_store', 'store', 'supermarket_chain',
          'tourist_attraction', 'point_of_interest', 'establishment',
          'plaza', 'complex', 'building', 'park', 'school',
          'university', 'hospital', 'gym', 'fitness_center'
        ]);
        venues = venues.filter((v) => !NON_FOOD_TYPES_NL.has(v.primaryType));
        if (merged.openNow) venues = venues.filter((v) => v.openNow !== false);
        if (merged.prices?.length) {
          const allowed = new Set(merged.prices.map((p) => p.length));
          venues = venues.filter((v) => v.priceLevel == null || allowed.has(v.priceLevel));
        }
        res.json({
          venues: venues.slice(0, 12),
          inferredCuisines, inferredFilters,
          source: inferred.source || 'unknown'
        });
      } catch (err) {
        console.error('[Error] /api/cuisine/nl-query failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.38.0: Hawker NEA TMA — scraped Closures + R&R works.
    app.use('/app/hawker', express.static(path.join(__dirname, 'public', 'hawker')));
    app.get('/app/hawker', (_req, res) => {
      noCacheHtml(res);
      res.sendFile(path.join(__dirname, 'public', 'hawker', 'index.html'));
    });

    // v0.51.0: Transport TMA — Hitachi-style MRT system map + per-line cards.
    app.use('/app/transport', express.static(path.join(__dirname, 'public', 'transport')));
    app.get('/app/transport', (_req, res) => {
      noCacheHtml(res);
      res.sendFile(path.join(__dirname, 'public', 'transport', 'index.html'));
    });
    // Schematic SVG fetched by the TMA's SystemMap component.
    app.get('/app/transport/mrt-system-map.svg', (_req, res) => {
      res.type('image/svg+xml');
      res.set('Cache-Control', 'public, max-age=3600');
      res.sendFile(path.join(__dirname, 'data', 'mrt-system-map.svg'));
    });
    // Per-line status feed for the Transport TMA.
    app.get('/api/transport/status', async (_req, res) => {
      try {
        const mrtLines = require('./mrt-lines');
        const mrtEng = require('./mrt-engineering');
        if (!redis.isOpen) await redis.connect();
        const cachedStatus = await redis.get('lta:train_status').catch(() => null);
        const rawStatus = cachedStatus ? JSON.parse(cachedStatus) : null;
        // The TrainServiceAlerts feed itself isn't cached — re-fetch.
        let alerts = null;
        if (process.env.LTA_ACCOUNT_KEY) {
          try {
            const { data } = await lta.get('/TrainServiceAlerts');
            alerts = data?.value || null;
          } catch (err) { console.warn('[Transport-TMA] LTA alerts fetch failed:', err.message); }
        }
        const statusByLine = mrtLines.parseStatusByLine(alerts);
        const affectedCodes = Object.entries(statusByLine)
          .filter(([_c, s]) => s.status !== 'normal')
          .map(([c]) => c);
        const todayISO = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const engineering = mrtEng.upcoming(todayISO, 7);
        res.json({
          timestampSGT: new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }),
          summary: rawStatus?.status || null,
          message: rawStatus?.message || null,
          statusByLine,
          affectedCodes,
          engineering,
          // address + nearestMrt are filled in by the chat-side caller
          // when it embeds the user's coords; the TMA-only fetch leaves
          // them null (TMA can offer a "share location" button later).
          address: null,
          nearestMrt: []
        });
      } catch (err) {
        console.error('[Error] /api/transport/status failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.30.9: surface whether MAP_ID is registered or running on the
    // unregistered placeholder. The placeholder ID will cause Google
    // Maps JS to render a default-styled map (no vector mapType) — not
    // a fatal error but worth flagging so users know to register one
    // for branded styling. See setup-cloud-map-id.md for steps.
    // v0.46.1: dropped `requireInitData` gate. The Google Maps API key
    // returned here is already domain-restricted in Google Cloud
    // Console (locked to gia4lunch-production.up.railway.app/*) — it's
    // effectively public on every TMA page load. Auth-gating this
    // endpoint added no real security but DID break the v0.32.0 "View
    // all picks on map" hash-link flow when users opened it via
    // `target="_blank"` (no Telegram WebApp context → empty initData →
    // 401 → "Could not authenticate with Gia"). The hash-venues code
    // path needs no server-side auth (all data is in the URL fragment),
    // only the Google Maps key — which we now serve openly.
    //
    // /api/sanctuary (the personal "live picks" feed) and other
    // user-data endpoints REMAIN auth-gated.
    // v0.57.6: ride-hail /r/<app> redirect endpoint removed (Taxi/PHD
    // dropped from /transport top-level menu in favour of Incidents).

    app.get('/maps-key', (_req, res) => {
      const customMapId = !!process.env.MAP_ID;
      res.json({
        key: process.env.GOOGLE_MAPS_API_KEY ?? '',
        mapId: process.env.MAP_ID || 'GIA_SANCTUARY',
        mapIdSource: customMapId ? 'env:MAP_ID' : 'placeholder',
        warning: customMapId ? null
          : 'MAP_ID env var unset — using placeholder. Map renders but without custom vector styling. See setup-cloud-map-id.md.'
      });
    });

    // v0.34.2: reverse-geocode endpoint. Turns raw lat/lng into a
    // human-readable neighbourhood/place name for the TMA Header so the
    // user sees "📍 Telok Blangah" instead of "📍 1.2722, 103.8112".
    // Cached in Redis 24 h per ~50 m grid cell so repeated TMA opens
    // at the same spot don't re-bill Google Geocoding (~$0.005/call).
    app.get('/api/reverse-geocode', requireInitData, async (req, res) => {
      try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: 'lat and lng required' });
        }
        // Grid lat/lng to ~50 m so nearby pings hit the same cache key.
        // 1 deg lat ≈ 111 km; 50 m → 4 decimal places.
        const gLat = lat.toFixed(4);
        const gLng = lng.toFixed(4);
        const cacheKey = `revgeo:${gLat}:${gLng}`;
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY unset' });
        }
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            return res.json({ ...JSON.parse(cached), cached: true });
          }
        } catch { /* cache miss is fine */ }
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=neighborhood|sublocality|locality&key=${apiKey}`;
        const axios = require('axios');
        const { data } = await axios.get(url, { timeout: 5000 });
        if (data.status !== 'OK' || !Array.isArray(data.results) || !data.results.length) {
          // Fallback: broader query without result_type filter.
          const fallbackUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
          const fallback = await axios.get(fallbackUrl, { timeout: 5000 });
          if (fallback.data.status !== 'OK' || !fallback.data.results.length) {
            return res.json({ name: 'Singapore', formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          }
          data.results = fallback.data.results;
        }
        // Pick the most-specific result with a useful component.
        const result = data.results[0];
        const components = result.address_components || [];
        const findComp = (type) => components.find((c) => c.types?.includes(type))?.long_name;
        const name = findComp('neighborhood')
          || findComp('sublocality_level_1')
          || findComp('sublocality')
          || findComp('locality')
          || result.formatted_address?.split(',')[0]
          || 'Singapore';
        const formatted = result.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const payload = { name, formatted };
        try {
          await redis.set(cacheKey, JSON.stringify(payload), { EX: 24 * 60 * 60 });
        } catch { /* cache write failure is non-fatal */ }
        res.json(payload);
      } catch (err) {
        console.error('[Error] /api/reverse-geocode failed:', err.message);
        res.status(500).json({ error: 'reverse-geocode failed', detail: err.message?.slice(0, 200) });
      }
    });

    // v0.54.0: hawker centres grouped by region for the TMA's
    // "By region" tab. No auth gate — same pattern as /maps-key
    // (catalogue-only payload, no per-user data).
    app.get('/api/hawker/centres-by-region', (_req, res) => {
      try {
        const vault = require('./hawker-vault');
        const by = vault.getByRegion();
        // Reshape into TMA-friendly schema: just the fields the
        // browser needs for list rendering + maps URL.
        const regions = Object.entries(by).map(([region, centres]) => ({
          region,
          count: centres.length,
          centres: centres.map((c) => ({
            name: c.name,
            address: c.address,
            postal: c.postal,
            mapsUrl: c.mapsUrl,
            isNew: !!c.isNew
          }))
        }));
        res.json({ regions, totalCount: vault.getAllCentres().length });
      } catch (err) {
        console.error('[Error] /api/hawker/centres-by-region failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.57.0: /api/hawker/closures + nea-fetch.js + nea-scrape.js
    // removed entirely. Hawker TMA serves the deterministic
    // /api/hawker/centres-by-region endpoint only (122-centre vault
    // from data/list-of-hawker-centres.md).

    // v0.34.0: recognised-venues admin endpoints. ADMIN_SYNC_SECRET
    // gates all three; same timing-safe compare as /admin/sync-vault.
    //
    // Workflow:
    //   1. POST /admin/seed-recognised?secret=<x>&category=<one>|all
    //      → Gemini scouts award winners, writes to recog:staging:*.
    //   2. GET  /admin/list-staging?secret=<x>
    //      → returns pending entries for redis-cli inspection.
    //   3. POST /admin/promote-recognised?secret=<x>&placeId=<id>&decision=accept|reject
    //      → moves staging → live (or rejects).
    function adminAuth(req, res) {
      const expected = process.env.ADMIN_SYNC_SECRET;
      const given = String(req.query.secret || '');
      if (!expected) {
        res.status(503).json({ error: 'ADMIN_SYNC_SECRET env var not configured' });
        return false;
      }
      const a = Buffer.from(expected);
      const b = Buffer.from(given.padEnd(expected.length, ' ').slice(0, expected.length));
      const ok = a.length === Buffer.byteLength(given) && crypto.timingSafeEqual(a, b);
      if (!ok) { res.status(401).json({ error: 'invalid secret' }); return false; }
      return true;
    }

    app.post('/admin/seed-recognised', async (req, res) => {
      if (!adminAuth(req, res)) return;
      try {
        const seeder = require('./recognised-seeder');
        const categoryParam = String(req.query.category || 'all');
        const allCats = Object.keys(seeder.CATEGORIES);
        const cats = categoryParam === 'all'
          ? allCats
          : categoryParam.split(',').map((s) => s.trim()).filter((c) => allCats.includes(c));
        if (!cats.length) {
          return res.status(400).json({
            error: `no valid category. Use ?category=all or one of: ${allCats.join(',')}`
          });
        }
        console.log(`[Admin] /admin/seed-recognised triggered for categories=${cats.join(',')}`);
        const result = await seeder.runSeedAll({ redis, categories: cats });
        const counts = await require('./recognised-store').counts(redis);
        res.json({ ok: true, ...result, counts });
      } catch (err) {
        console.error('[Admin] seed-recognised failed:', err.message);
        res.status(500).json({ error: err.message || 'seed failed' });
      }
    });

    app.get('/admin/list-staging', async (req, res) => {
      if (!adminAuth(req, res)) return;
      try {
        const recogStore = require('./recognised-store');
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const entries = await recogStore.listStaging(redis, limit);
        const counts = await recogStore.counts(redis);
        res.json({ ok: true, counts, entries });
      } catch (err) {
        console.error('[Admin] list-staging failed:', err.message);
        res.status(500).json({ error: err.message || 'list-staging failed' });
      }
    });

    app.post('/admin/promote-recognised', async (req, res) => {
      if (!adminAuth(req, res)) return;
      try {
        const recogStore = require('./recognised-store');
        const placeId = String(req.query.placeId || '').trim();
        const decision = String(req.query.decision || '').trim().toLowerCase();
        const reason = String(req.query.reason || '').slice(0, 200);
        if (!placeId) return res.status(400).json({ error: 'placeId query param required' });
        if (!['accept', 'reject'].includes(decision)) {
          return res.status(400).json({ error: 'decision must be accept|reject' });
        }
        if (decision === 'accept') {
          const promoted = await recogStore.promote(redis, placeId);
          return res.json({ ok: true, decision, promoted });
        }
        await recogStore.reject(redis, placeId, reason);
        return res.json({ ok: true, decision, reason });
      } catch (err) {
        console.error('[Admin] promote-recognised failed:', err.message);
        res.status(500).json({ error: err.message || 'promote failed' });
      }
    });

    // v0.32.0: POST returns 202 + {reqId}. Background task drives the
    // pipeline; TMA polls GET /api/cuisine-search/:reqId. Decouples slow
    // Gemini calls from any HTTP timeout. PIPELINE_TASKS_ENABLED=false
    // env reverts to the v0.31.x synchronous path.
    app.post('/api/cuisine-search', requireInitData, async (req, res) => {
      const t0 = Date.now();
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
          lat, lng, cuisines, radius, recencyDays, queueMaxMin, mode, when, preset, specialRequest, lang
        } = req.body || {};
        console.log(`[Cuisine-Diag] D700 request received user=${tgUserId} lat=${lat} lng=${lng} radius=${radius} preset=${preset} cuisines=${Array.isArray(cuisines) ? cuisines.length : 0}`);
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
          console.warn('[Cuisine-Diag] D701 rejecting — lat/lng invalid');
          return res.status(400).json({ error: 'lat and lng required', diag: 'D701' });
        }
        if (tgUserId) {
          setUserLocation(redis, tgUserId, Number(lat), Number(lng))
            .then(() => console.log(`[Cuisine-Diag] D707 location synced to Redis user=${tgUserId}`))
            .catch((err) => console.warn('[Cuisine-Diag] D707 location sync failed:', err.message));
        }
        const params = {
          lat: Number(lat),
          lng: Number(lng),
          cuisines: Array.isArray(cuisines) ? cuisines.slice(0, 10) : [],
          radius: Number(radius) || 1000,
          recencyDays: Number(recencyDays) || 90,
          queueMaxMin: Number(queueMaxMin) || 15,
          mode: typeof mode === 'string' ? mode : 'walk',
          when: typeof when === 'string' ? when : 'now',
          preset: typeof preset === 'string' ? preset : null,
          specialRequest: typeof specialRequest === 'string' ? specialRequest : null,
          lang: typeof lang === 'string' ? lang : 'en'
        };

        const debugEchoEnabled = process.env.CUISINE_DEBUG_ECHO === 'true' || req.query?.debug === '1';
        const debugEcho = debugEchoEnabled ? {
          lang: params.lang,
          cuisinesCount: params.cuisines.length,
          preset: params.preset
        } : undefined;

        // Rollback path — PIPELINE_TASKS_ENABLED=false reverts to
        // synchronous v0.31.2 behaviour for emergency mitigation.
        if (process.env.PIPELINE_TASKS_ENABLED === 'false') {
          const pickCache = require('./pick-cache');
          if (tgUserId) {
            const hit = await pickCache.get(redis, tgUserId, params);
            if (hit) return res.json({ ...hit, cached: true, ...(debugEcho ? { debugEcho } : {}) });
          }
          const { searchCuisine } = require('./cuisine-search');
          const result = await searchCuisine({ ...params, redis });
          const dt = Date.now() - t0;
          console.log(`[Cuisine-Diag] D702 (sync rollback) OK ${dt}ms venues=${result.venues?.length ?? 0}`);
          if (tgUserId && result?.venues?.length) {
            pickCache.set(redis, tgUserId, params, result).catch(() => {});
          }
          return res.json({ ...result, ...(debugEcho ? { debugEcho } : {}) });
        }

        // v0.42.1 (B4): request idempotency. A double-tap on Search would
        // otherwise fire two pipeline-tasks for the same chatId+payload,
        // burning Anthropic + Places quota. Redis SETNX a hash of the
        // request for 30s; if a prior identical request is still in
        // flight, return its reqId rather than creating a new one.
        const idempotencyKey = `idem:cuisine:${tgUserId || 'anon'}:${crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16)}`;
        const existingReqId = await redis.get(idempotencyKey).catch(() => null);
        if (existingReqId) {
          console.log(`[Cuisine-Diag] D713 idempotent — returning existing reqId=${existingReqId}`);
          return res.status(202).json({ reqId: existingReqId, pollUrl: `/api/cuisine-search/${existingReqId}`, idempotent: true, ...(debugEcho ? { debugEcho } : {}) });
        }

        // v0.32.0 default: submit + 202 + reqId.
        const requestStore = require('./request-store');
        const pipelineTask = require('./pipeline-task');
        const reqId = await requestStore.create(redis, {
          kind: 'cuisine',
          chatId: tgUserId,
          userId: tgUserId,
          payload: params
        });
        // Bind the new reqId to the idempotency key for 30s. Future
        // double-taps within that window get the same reqId.
        redis.set(idempotencyKey, reqId, { EX: 30 }).catch((err) => {
          console.warn(`[Cuisine-Diag] D714 idempotency-key write failed: ${err.message}`);
        });
        // Spawn background task — fire and forget. Errors are written
        // into the row's status/error fields by pipeline-task.
        pipelineTask.runTask(redis, reqId).catch((err) => {
          console.error(`[Cuisine-Diag] D703 reqId=${reqId} background task crashed:`, err.message);
        });
        const dt = Date.now() - t0;
        console.log(`[Cuisine-Diag] D712 submitted reqId=${reqId} ${dt}ms`);
        return res.status(202).json({ reqId, pollUrl: `/api/cuisine-search/${reqId}`, ...(debugEcho ? { debugEcho } : {}) });
      } catch (err) {
        const dt = Date.now() - t0;
        console.error(`[Cuisine-Diag] D703 ${dt}ms error:`, err.message);
        res.status(500).json({ error: err.message || 'cuisine search submit failed', diag: 'D703' });
      } finally {
        if (tgUserId) clearProcessing(redis, tgUserId).catch(() => {});
      }
    });

    // v0.32.0: poll endpoint. TMA polls every 1.5 s for the in-progress
    // status + final venues. Auth identical to POST.
    app.get('/api/cuisine-search/:reqId', requireInitData, async (req, res) => {
      try {
        const reqId = req.params.reqId;
        if (!/^[A-Za-z0-9_-]{8,16}$/.test(reqId)) {
          return res.status(400).json({ error: 'invalid reqId', diag: 'D713' });
        }
        const requestStore = require('./request-store');
        const row = await requestStore.get(redis, reqId);
        if (!row) return res.status(404).json({ error: 'reqId not found or expired', diag: 'D714' });
        // Auth check: only the requesting user can poll their own row.
        const tgUserId = String(req.tg?.user?.id || '');
        if (tgUserId && row.userId && row.userId !== tgUserId) {
          return res.status(403).json({ error: 'reqId belongs to a different user', diag: 'D715' });
        }
        return res.json({
          reqId,
          kind: row.kind,
          status: row.status,
          stage: row.stage,
          venues: row.venues || null,
          error: row.error || null,
          diag: row.diag,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        });
      } catch (err) {
        console.error('[Cuisine-Diag] D716 poll failed:', err.message);
        res.status(500).json({ error: err.message || 'poll failed', diag: 'D716' });
      }
    });

    // v0.32.0: /surprise TMA endpoint — same submit + poll pattern.
    app.post('/api/surprise-search', requireInitData, async (req, res) => {
      const t0 = Date.now();
      const tgUserId = req.tg?.user?.id;
      try {
        const { lat, lng, mode, lang } = req.body || {};
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
          return res.status(400).json({ error: 'lat and lng required', diag: 'D721' });
        }
        if (tgUserId) {
          setUserLocation(redis, tgUserId, Number(lat), Number(lng))
            .catch((err) => console.warn('[Surprise-Diag] D727 location sync failed:', err.message));
        }
        const params = {
          lat: Number(lat),
          lng: Number(lng),
          radius: 3000, // surprise annulus extends to 3 km
          mode: typeof mode === 'string' ? mode : 'walk',
          lang: typeof lang === 'string' ? lang : 'en'
        };
        const requestStore = require('./request-store');
        const pipelineTask = require('./pipeline-task');
        const reqId = await requestStore.create(redis, {
          kind: 'surprise',
          chatId: tgUserId,
          userId: tgUserId,
          payload: params
        });
        pipelineTask.runTask(redis, reqId).catch((err) => {
          console.error(`[Surprise-Diag] D723 reqId=${reqId} background task crashed:`, err.message);
        });
        const dt = Date.now() - t0;
        console.log(`[Surprise-Diag] D722 submitted reqId=${reqId} ${dt}ms`);
        return res.status(202).json({ reqId, pollUrl: `/api/surprise-search/${reqId}` });
      } catch (err) {
        console.error('[Surprise-Diag] D720 submit failed:', err.message);
        res.status(500).json({ error: err.message || 'surprise submit failed', diag: 'D720' });
      }
    });

    app.get('/api/surprise-search/:reqId', requireInitData, async (req, res) => {
      try {
        const reqId = req.params.reqId;
        if (!/^[A-Za-z0-9_-]{8,16}$/.test(reqId)) {
          return res.status(400).json({ error: 'invalid reqId', diag: 'D724' });
        }
        const requestStore = require('./request-store');
        const row = await requestStore.get(redis, reqId);
        if (!row) return res.status(404).json({ error: 'reqId not found or expired', diag: 'D725' });
        if (row.kind !== 'surprise') return res.status(400).json({ error: 'reqId is not a surprise request', diag: 'D726' });
        const tgUserId = String(req.tg?.user?.id || '');
        if (tgUserId && row.userId && row.userId !== tgUserId) {
          return res.status(403).json({ error: 'reqId belongs to a different user', diag: 'D727' });
        }
        return res.json({
          reqId,
          kind: row.kind,
          status: row.status,
          stage: row.stage,
          venues: row.venues || null,
          error: row.error || null,
          diag: row.diag,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        });
      } catch (err) {
        console.error('[Surprise-Diag] D728 poll failed:', err.message);
        res.status(500).json({ error: err.message || 'poll failed', diag: 'D728' });
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
