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
const { requireInitData, verifyInitData } = require('./twa-auth');
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
async function ensureLocation(chatId, label, lang = 'en') {
  const { t, tn } = require('./i18n');
  const cached = await getUserLocation(redis, chatId);
  if (!cached || !Number.isFinite(cached.lat) || !Number.isFinite(cached.lng)) {
    try { await setPendingMeal(redis, chatId, label); } catch { /* best effort */ }
    await bot.sendMessage(
      chatId,
      tn('location.shareLabel', lang, { label }),
      LOCATION_REQUEST_KEYBOARD
    );
    return null;
  }
  try {
    const geo = await reverseGeocodeAddress(cached.lat, cached.lng);
    const ageMin = cached.setAt ? Math.floor((Date.now() - cached.setAt) / 60000) : null;
    let ageNote = '';
    if (ageMin != null) {
      if (ageMin < 1) ageNote = t('location.age.justShared', lang);
      else if (ageMin < 60) ageNote = tn('location.age.minAgo', lang, { n: ageMin });
      else ageNote = tn('location.age.hourAgo', lang, { h: Math.floor(ageMin / 60), m: ageMin % 60 });
    }
    if (geo?.formatted) {
      await safeSend(chatId, tn('location.current', lang, { addr: geo.formatted, age: ageNote }));
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

async function deliverPicks(chatId, mealLabel, picks, opts = {}) {
  if (!picks.length) {
    await handleNoResults(chatId, mealLabel);
    return;
  }
  // v0.27.1: track for /share. Fire-and-forget; never blocks delivery.
  try {
    const { addRecent } = require('./recent-picks');
    for (const p of picks) addRecent(redis, chatId, { ...p, kind: 'pick' }).catch(() => {});
  } catch { /* recent-picks optional */ }
  // v0.58.50: T3 numbered list — multi-line compact blocks per pick
  // (name bold / address / hours / stats with distance / Maps URL).
  // Replaces the v0.57.7 single-line numbered header per Human Lead's
  // standardised template request.
  // v0.58.55: opts.lang ('en' | 'fr') threads through formatVenueBlock
  // so static labels (Open now / Closed / crowd / etc.) and the picks
  // header render in the user's locale. Defaults to 'en' when caller
  // doesn't specify — preserves prior behaviour for paths that don't
  // yet know the user's language preference.
  const dpLang = (typeof opts.lang === 'string' && ['en','fr'].includes(opts.lang)) ? opts.lang : 'en';
  const { formatVenueBlock } = require('./venue-templates');
  const { googleMapsUrl } = require('./maps-url');
  const t3Blocks = picks.map((p, i) => formatVenueBlock(p, {
    variant: 'compact',
    number: i + 1,
    googleMapsUrl,
    lang: dpLang
  })).filter(Boolean);
  // Preserve hidden-gems criteria-met annotation (v0.58.22) when present —
  // it's specific to /hidden's deterministic path and shouldn't appear
  // on other flows.
  const t3Body = t3Blocks.map((block, i) => {
    const p = picks[i];
    if (Array.isArray(p.criteriaMet) && p.criteriaMet.length) {
      const why = (p.whyAGem && typeof p.whyAGem === 'string') ? ` — ${p.whyAGem}` : '';
      return `${block}\n🎯 [${p.criteriaMet.join(', ')}]${why}`;
    }
    return block;
  // v0.58.51: two blank lines between picks (single newline between
  // rows within a pick stays \n). Header still uses one blank line.
  // Skipped entirely when picks.length === 1 — the single block is
  // already its own message.
  }).join(picks.length > 1 ? '\n\n\n' : '\n\n');
  const headerLine = dpLang === 'fr'
    ? `Sélections sanctuaire de Gia · ${mealLabel}`
    : `Gia's ${mealLabel} sanctuary picks`;
  await safeSend(chatId, `${headerLine}\n\n${t3Body}`, {
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });

  // v0.48.2 / v0.58.49: multi-marker map button. Only renders when
  // there's more than one pick — a single venue's location is already
  // shown via safeVenue below (Telegram's native location card with
  // pin), so a 1-pick "view all on map" button would just duplicate
  // that. Caption + button copy adjusted per Human Lead's request.
  try {
    if (picks.length > 1) {
      const { buildMapHashUrl } = require('./maps-url');
      const mapUrl = webhookDomain ? buildMapHashUrl(picks, { webhookDomain }) : null;
      if (mapUrl) {
        await bot.sendMessage(chatId, `🗺 Click below to view ${picks.length} picks in one map:`, {
          reply_markup: { inline_keyboard: [[{ text: `🗺 Open ${picks.length} on map`, web_app: { url: mapUrl } }]] }
        });
      } else {
        // Fallback (no webhookDomain or no lat/lng): legacy directions URL.
        await sendGoogleMapsContainer(chatId, picks, {
          travelmode: 'walking',
          caption: '🗺 Open this full set in Google Maps:',
          label: '🗺 View all picks'
        });
      }
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
      // v0.59.4: thread dpLang into vibe summary so the "Sanctuary read"
      // bullets render in French when the user has /language fr. Prior
      // behaviour was hardcoded EN cache key + EN prompt — single-pick
      // T1 cards always rendered EN bullets even on FR pref.
      try { summary = await getOrCacheSummary(redis, pid, dpLang); }
      catch (err) { console.error('[Error] vibe summary fetch failed:', err.message); }
    }
    // v0.58.50: T1 detail-with-sanctuary template. Replaces the v0.27
    // "🌿 Sanctuary read for {name}\n{summary}" body with the standardised
    // venue block (name bold / address / hours / website / phone /
    // sanctuary read / stats / order / Maps URL).
    const sanctuaryText = summary || p.vibe || '';
    const t1Body = formatVenueBlock(p, {
      variant: 'detail-with-sanctuary',
      sanctuaryRead: sanctuaryText,
      googleMapsUrl
    });
    // Google generative summary (region-restricted; null for SG today).
    const googleLine = p.googleSummary?.overview
      ? `\n💡 ${p.googleSummary.overview} <i>(${p.googleSummary.disclosure || 'Summarized with Gemini'})</i>`
      : '';
    // v0.30.3: model-asserted opening date.
    const openingDateLine = p.verifiedOpeningDate
      ? `\n🆕 Opened ${p.verifiedOpeningDate} <i>(model-asserted, web-grounded)</i>`
      : '';
    const body = t1Body ? (t1Body + openingDateLine + googleLine) : null;

    const buttons = [];
    if (pid) {
      // v0.31.0 Buddy Level 2 only — Maps URL already in the T1 body,
      // so we drop the redundant "📍 Google Maps" inline button.
      try {
        const buddy = require('./buddy-match');
        if (await buddy.isOptedIn(redis, chatId)) {
          await buddy.registerIntent(redis, chatId, pid);
          const others = await buddy.findCounterparts(redis, chatId, pid);
          if (others.length) {
            const counterpartId = others[0];
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
    // v0.59.4: nearby-carparks map button on the result card. Conditional
    // on LTA_ACCOUNT_KEY (carpark lookup) + webhookDomain (TMA leaflet map)
    // + venue having lat/lng. Skips silently otherwise so EN-card behaviour
    // is unchanged when prerequisites aren't met.
    const carparkButtons = [];
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng) && process.env.LTA_ACCOUNT_KEY && webhookDomain) {
      try {
        const cps = await carpark.nearest(p.lat, p.lng, 5);
        if (cps.length) {
          const { buildMapHashUrl } = require('./maps-url');
          const slim = cps
            .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
            .map((c) => ({
              name: `${c.development} (${c.availableLots} lots)`,
              placeId: '',
              lat: c.lat,
              lng: c.lng,
              area: '',
              url: `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`
            }));
          const mapUrl = buildMapHashUrl(slim, { webhookDomain });
          if (mapUrl) {
            const { t: tCard } = require('./i18n');
            carparkButtons.push({ text: tCard('card.carparkMapBtn', dpLang), web_app: { url: mapUrl } });
          }
        }
      } catch (err) {
        console.warn('[Picks] carpark button render failed:', err.message);
      }
    }
    const buttonRows = [];
    if (buttons.length) buttonRows.push(buttons);
    if (carparkButtons.length) buttonRows.push(carparkButtons);
    const replyMarkup = buttonRows.length ? { reply_markup: { inline_keyboard: buttonRows } } : {};

    if (body) {
      try {
        await bot.sendMessage(chatId, body, {
          ...replyMarkup,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
      } catch (err) {
        console.error('[Error] sendMessage with markup failed:', err.message);
      }
    } else if (buttons.length) {
      try {
        await bot.sendMessage(chatId, `<b>${require('./venue-templates').escapeHtml(p.name)}</b>`, {
          ...replyMarkup,
          parse_mode: 'HTML'
        });
      } catch (err) {
        console.error('[Error] sendMessage with markup failed:', err.message);
      }
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
// v0.58.10: /cuisine accepts an optional argument string in the
// "copy-syntax" format — `/cuisine thai halal $$ @Raffles_Place
// radius:5 region:JB`. Tokens are parsed into URL-hash params so the
// TMA opens with the same cuisines / filters / prices / location /
// radius / region pre-applied. Bare `/cuisine` still opens the picker
// at its defaults.
// v0.58.26: pre-resolve the user's location server-side and deep-link
// it into the TMA via #lat&lng&place. Fixes the prod bug where the
// TMA fired /api/cuisine/search with center=0.0000,0.0000 because
// userLoc never resolved before the warm-start fallback ran. When no
// fresh cached location exists (≤30 min), also offer a Share-pin
// reply-keyboard so the user can fix the anchor in one tap.
const CUISINE_FRESH_LOC_MS = 30 * 60 * 1000;
bot.onText(/^\/(?:cuisine|c)(?:@\w+)?(?:\s+(.*))?$/, async (msg, match) => {
  // v0.59.17: thread lang into the chat reply so it flips with /language.
  const { resolveLang } = require('./user-prefs');
  const { t } = require('./i18n');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  try {
    if (!useWebhook) {
      await safeSend(msg.chat.id, t('cuisine.chat.webhookOnly', lang));
      return;
    }
    const argsRaw = (match?.[1] || '').trim();
    const argsHash = argsRaw ? (await tokenizeCuisineArgs(argsRaw)) : '';
    const params = new URLSearchParams(argsHash || '');

    // Pre-resolve cached location. Fresh ≤30 min wins; stale is treated
    // as "no anchor" so we don't anchor on a 14-hour-old pin.
    let preResolvedAnchor = null;
    try {
      const cached = await getUserLocation(redis, msg.chat.id);
      const ageMs = cached?.setAt ? Date.now() - cached.setAt : Infinity;
      const validCoord = cached?.lat && cached?.lng
        && Math.abs(cached.lat) > 0.001 && Math.abs(cached.lng) > 0.001;
      if (validCoord && ageMs <= CUISINE_FRESH_LOC_MS) {
        preResolvedAnchor = { lat: cached.lat, lng: cached.lng };
      }
    } catch (err) {
      console.warn('[/cuisine] getUserLocation failed:', err.message);
    }

    // Don't overwrite a tokeniser-supplied @location with the cached
    // anchor — explicit args win.
    if (preResolvedAnchor && !params.has('lat')) {
      params.set('lat', String(preResolvedAnchor.lat));
      params.set('lng', String(preResolvedAnchor.lng));
    }

    let url = `https://${webhookDomain}/app/cuisine`;
    const finalHash = params.toString();
    if (finalHash) url += `#${finalHash}`;

    if (preResolvedAnchor) {
      await bot.sendMessage(msg.chat.id,
        `${t('cuisine.chat.title', lang)}\n${t('cuisine.chat.anchored', lang)}`,
        {
          reply_markup: {
            inline_keyboard: [[{
              text: t('cuisine.chat.openBtn', lang),
              web_app: { url }
            }]]
          }
        }
      );
    } else {
      // No fresh anchor — prompt for a pin AND offer the picker. Two
      // messages because Telegram disallows mixing reply-keyboard with
      // inline-keyboard on a single message.
      await bot.sendMessage(msg.chat.id,
        `${t('cuisine.chat.title', lang)}\n\n${t('cuisine.chat.shareForAccurate', lang)}`,
        {
          reply_markup: {
            keyboard: [[{ text: t('cuisine.chat.shareLocBtn', lang), request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
      await bot.sendMessage(msg.chat.id, t('cuisine.chat.openWithGps', lang), {
        reply_markup: {
          inline_keyboard: [[{
            text: t('cuisine.chat.openBtn', lang),
            web_app: { url }
          }]]
        }
      });
    }
  } catch (err) {
    console.error('[Error] /cuisine handler failed:', err.message);
    await safeSend(msg.chat.id, t('cuisine.chat.openError', lang));
  }
});

// v0.58.10: parse the copy-syntax argument string into a URL-hash
// fragment that the TMA's readFromHash can seed initial state from.
// Recognised tokens (order doesn't matter):
//   <slug>                    → cuisine (validated against cuisines-vault)
//   newlyOpened|openNow|       → filter flag
//     halal|vegetarian|
//     homeBased
//   $ | $$ | $$$              → price tier (server post-filter
//                                treats $$ as "≤$$" — so all
//                                lower tiers are auto-included)
//   @<location>               → SG/JB location anchor; geocoded
//                                via vibe-suggest.geocodeQuery so
//                                the TMA opens centred there
//   radius:<km>               → 1–100 km, converted to metres
//   region:SG | region:JB     → region toggle (defaults SG)
async function tokenizeCuisineArgs(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const cv = require('./cuisines-vault');
  const validSlugs = new Set(cv.getAllCuisines().map((c) => c.slug));
  const FLAGS = new Set(['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased']);
  const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 25);
  const params = new URLSearchParams();
  const cuisines = [];
  for (const t of tokens) {
    if (validSlugs.has(t)) {
      if (cuisines.length < 5) cuisines.push(t);
    } else if (FLAGS.has(t)) {
      params.set(t, '1');
    } else if (/^\$+$/.test(t) && t.length <= 3) {
      // $$ → emit "$,$$" so the server's price-tier filter (which
      // matches priceLevel against the SET) accepts both. Mirrors
      // the TMA's existing multi-select chip behaviour.
      const expanded = [];
      for (let i = 1; i <= t.length; i++) expanded.push('$'.repeat(i));
      params.set('prices', expanded.join(','));
    } else if (/^@/.test(t)) {
      const placeName = t.slice(1).replace(/_/g, ' ').slice(0, 60);
      if (placeName) {
        try {
          const { geocodeQuery } = require('./vibe-suggest');
          const geo = await geocodeQuery(placeName);
          if (geo?.lat != null && geo?.lng != null) {
            params.set('lat', String(geo.lat));
            params.set('lng', String(geo.lng));
            params.set('place', String(geo.name || placeName));
          }
        } catch (err) {
          console.warn('[Cuisine-Tokenize] geocode failed for', placeName, ':', err.message);
        }
      }
    } else if (/^radius:(\d{1,3})$/.test(t)) {
      const km = Number(t.match(/^radius:(\d{1,3})$/)[1]);
      if (km >= 1 && km <= 100) params.set('radius', String(km * 1000));
    } else if (/^region:(SG|JB)$/i.test(t)) {
      params.set('region', t.split(':')[1].toUpperCase());
    }
  }
  if (cuisines.length) params.set('cuisines', cuisines.join(','));
  return params.toString();
}

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
bot.onText(/^\/(?:weather|w)(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await runWeatherCommand(msg.chat.id, lang);
});

bot.onText(/^\/(?:transport|t)(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await sendTransportMenu(msg.chat.id, lang);
});

bot.onText(/^\/(?:carpark|p)(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await runCarparkCommand(msg.chat.id, lang);
});

bot.onText(/^\/(?:hidden|h)(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await runSurpriseCommand(msg.chat.id, lang);
});

// v0.57.21: /privacy — what data the bot collects, how long it's
// retained, and which third parties it queries. OPERATOR_LINKEDIN
// env var (optional) appends an authorship credit line.
bot.onText(/^\/privacy(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await runPrivacyCommand(msg.chat.id, lang);
});

// v0.57.23: /legal — hidden command (not in setMyCommands, same as
// /ver). Surfaces disclaimer + IMDA Model AI Governance alignment +
// builder credit. Discoverable via /help text.
bot.onText(/^\/legal(?:@\w+)?$/, (msg) => runLegalCommand(msg.chat.id));

// v0.57.25: /forgetme — self-service Redis erasure. PDPA Section
// 13(c) / GDPR Article 17 right-to-erasure. Wipes loc:, proc:,
// buddy-optin, buddy-blocks, buddy-day:* and recent-picks rows for
// the chatId. /privacy advertises both this command and the 90-day
// inactivity auto-purge.
bot.onText(/^\/forgetme(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await runForgetMeCommand(msg.chat.id, lang);
});

// v0.59.0: /language [en|fr|auto] — per-user locale preference. Stored
// in Redis (1-year TTL) so it survives across devices and across TMA /
// chat. Takes precedence over Telegram's user.language_code in every
// chat reply path. With no argument, opens an inline keyboard.
//   /language          → inline keyboard with 🇬🇧 / 🇫🇷 buttons
//   /language fr       → set to French + ack
//   /language en       → set to English + ack
//   /language auto     → clear preference; revert to Telegram locale
bot.onText(/^\/(?:language|la)(?:@\w+)?(?:\s+(en|fr|auto))?$/i, async (msg, match) => {
  await runLanguageCommand(msg, match?.[1] ? match[1].toLowerCase() : null);
});

// v0.56.1: /location <free text> — manual override when sharing GPS
// is awkward (e.g. on desktop). Geocodes the text via Google
// Geocoding and stores as the user's cached location.
bot.onText(/^\/(?:location|l)(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
  const rawText = (match?.[1] || '').trim();
  const chatId = msg.chat.id;
  // v0.58.25: special-case `/location current` (and synonyms `now`,
  // `here`, `me`, `my`, `gps`, `device`). Previously these keywords
  // were passed verbatim to Google Geocoding which interpreted them
  // as place names and returned junk. Route them to the no-args
  // path so the user gets cached location + a Share-pin keyboard
  // (Telegram bots cannot read device GPS unsolicited — see PR
  // body for the API trade-off table).
  const CURRENT_KEYWORDS = new Set([
    'current', 'now', 'here', 'me', 'my', 'gps', 'device'
  ]);
  // v0.58.42: distinguish "explicit current request" from "no args".
  //   `/location`         → show cached + keyboard (so users can quickly
  //                         see what's anchoring their searches)
  //   `/location current` → SKIP cached, prompt for a fresh pin only.
  //                         User typed "current" — they want fresh GPS,
  //                         not yesterday's stored value.
  const wantsCurrent = CURRENT_KEYWORDS.has(rawText.toLowerCase());
  const text = wantsCurrent ? '' : rawText;
  if (wantsCurrent) {
    // Bots can't read device GPS unsolicited; the only way to "catch
    // current location" is the user tapping the Share-pin keyboard.
    // Make that path the entire response — no stale-cache distraction.
    await safeSend(chatId,
      "📍 *To set your current location, tap the button below.*\n\n" +
      "Bots can't auto-detect device GPS — Telegram requires you to share it explicitly. " +
      "Once tapped, your location is cached for 30 min and used by /cuisine, /hidden, /carpark, /transport.",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '📍 Share my current location', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );
    return;
  }
  if (!text) {
    // v0.58.20: no-args path now reports the cached location
    // (instead of just printing usage). When nothing is cached, we
    // still surface the usage hint so the user knows how to set one.
    try {
      const cached = await getUserLocation(redis, chatId);
      if (cached?.lat && cached?.lng) {
        const ageM = cached.setAt ? Math.floor((Date.now() - cached.setAt) / 60000) : null;
        const ageStr = ageM == null ? '' : (ageM < 1 ? ' · just now'
          : ageM < 60 ? ` · ${ageM} min ago`
          : ageM < 1440 ? ` · ${Math.floor(ageM / 60)} h ago`
          : ` · ${Math.floor(ageM / 1440)} d ago`);
        const mapsUrl = `https://maps.google.com/?q=${cached.lat},${cached.lng}`;
        // v0.59.2: reverse-geocode the cached coords into a readable
        // street/neighbourhood name so users see "Telok Blangah" not
        // a raw lat/lng.
        // v0.59.3: skip Google Plus-Code results (e.g. "9R29+RW
        // Singapore") — these surface when the coords land on
        // something with no street name. Use result_type to bias the
        // first call toward named features; if the picked result's
        // formatted_address is still a Plus Code, walk the unfiltered
        // results for a non-Plus-Code one. Falls back to coords if
        // nothing usable comes back.
        const PLUS_CODE_RE = /^[2-9CFGHJMPQRVWX]{2,}\+[2-9CFGHJMPQRVWX]+\b/;
        let placeLine = `${cached.lat.toFixed(4)}, ${cached.lng.toFixed(4)}`;
        try {
          const apiKey = process.env.GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const filteredUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${cached.lat},${cached.lng}&result_type=premise|point_of_interest|street_address|intersection|neighborhood|sublocality|locality&key=${apiKey}`;
            let { data } = await axios.get(filteredUrl, { timeout: 5000 });
            let r = (data?.results || [])
              .find((x) => x?.formatted_address && !PLUS_CODE_RE.test(x.formatted_address));
            if (!r) {
              // Filter returned nothing usable; widen the net then
              // skip Plus-Code rows.
              const wideUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${cached.lat},${cached.lng}&key=${apiKey}`;
              const wide = await axios.get(wideUrl, { timeout: 5000 });
              r = (wide.data?.results || [])
                .find((x) => x?.formatted_address && !PLUS_CODE_RE.test(x.formatted_address))
                || wide.data?.results?.[0];
            }
            if (r?.formatted_address) {
              const components = r.address_components || [];
              const findComp = (type) => components.find((c) => c.types?.includes(type))?.long_name;
              const friendly = findComp('premise')
                || findComp('point_of_interest')
                || findComp('neighborhood')
                || findComp('sublocality_level_1')
                || findComp('sublocality')
                || findComp('route')
                || findComp('locality');
              const isPlus = PLUS_CODE_RE.test(r.formatted_address);
              if (isPlus) {
                // Don't pollute the display with the Plus Code — show
                // the friendly component alone if we have one.
                placeLine = friendly || `near ${cached.lat.toFixed(4)}, ${cached.lng.toFixed(4)}`;
              } else if (friendly && !r.formatted_address.startsWith(friendly)) {
                placeLine = `${friendly} — ${r.formatted_address}`;
              } else {
                placeLine = r.formatted_address;
              }
            }
          }
        } catch (err) {
          console.warn('[/location] reverse-geocode failed:', err.message);
        }
        // v0.58.21: stale gate. v0.59.2: when stale, surface a
        // request_location keyboard.
        // v0.58.23: keyboard now ALWAYS shows on /location no-args
        // (not just stale). Bots can't auto-detect device GPS — the
        // user must explicitly share. Surfacing the button at all
        // times makes the share path one tap regardless of cache
        // freshness.
        const isStale = ageM != null && ageM > 30;
        const staleNote = isStale
          ? '\n\n⚠️ This is more than 30 minutes old, so the cuisine picker will *ignore it* and ask for a fresh GPS reading. Tap the button below to share a fresh pin, or run `/location <place>`.'
          : '\n\n_Bots can\'t read your device GPS automatically. Tap the button below to share a fresh pin, or run `/location <place>` to anchor manually._';
        const opts = {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: {
            keyboard: [[{ text: '📍 Share my current location', request_location: true }]],
            one_time_keyboard: true,
            resize_keyboard: true
          }
        };
        await safeSend(chatId,
          `📍 ${placeLine}${ageStr}\n${mapsUrl}${staleNote}\n\n` +
          'To change: `/location <place>` (e.g. `/location Tanjong Pagar MRT`) or tap 📍 below.',
          opts
        );
        return;
      }
    } catch (err) {
      console.warn('[/location] cache lookup failed:', err.message);
    }
    // v0.58.23: no-cache fallthrough also offers the share-location
    // keyboard. Bots can't pull device GPS automatically; the user
    // must initiate the share.
    await safeSend(chatId,
      "No location cached yet.\n\n" +
      "_Bots can't read your device GPS automatically._ Tap the button below to share your current location pin, or set one manually with `/location <place>` (e.g. `/location Tanjong Pagar MRT`).",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '📍 Share my current location', request_location: true }]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
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
bot.onText(/^\/(?:hawker|hk)(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await sendHawkerMenu(msg.chat.id, lang);
});

// v0.35.0: /recognised — nearest 5 award-winning venues (Michelin Star,
// Bib Gourmand, Asia 50 Best, World Culinary Awards, Best Chef Awards,
// UNESCO ICH) within 5 km. Consumes the v0.34 recog:venue:* table —
// returns "no venues yet, run /admin/seed-recognised" if the table is
// empty.
// v0.37.0: optional category filter — /recognised michelin, /recognised bib,
// /recognised michelin-star, etc. Falls through to all-categories when no arg.
bot.onText(/^\/(?:recognised|r)(?:@\w+)?(?:\s+(\S+))?$/, async (msg, match) => {
  const { resolveLang } = require('./user-prefs');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  await runRecognisedCommand(msg.chat.id, lang);
});

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
  const { resolveLang } = require('./user-prefs');
  const { t, tn } = require('./i18n');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  try {
    const buddy = require('./buddy-match');
    const action = (match?.[1] || 'status').toLowerCase();
    const arg = (match?.[2] || '').trim();

    if (action === 'on') {
      await buddy.optIn(redis, msg.chat.id);
      await safeSend(msg.chat.id, t('buddy.on.body', lang));
      return;
    }
    if (action === 'off') {
      await buddy.optOut(redis, msg.chat.id);
      await safeSend(msg.chat.id, t('buddy.off', lang));
      return;
    }
    if (action === 'block') {
      const target = String(arg).trim();
      if (!target) {
        await safeSend(msg.chat.id, t('buddy.block.usage', lang));
        return;
      }
      const ok = await buddy.block(redis, msg.chat.id, target);
      await safeSend(msg.chat.id, ok ? tn('buddy.block.ok', lang, { target }) : t('buddy.block.cap', lang));
      return;
    }
    if (action === 'report') {
      const parts = arg.split(/\s+/);
      const target = parts.shift() || '';
      const reason = parts.join(' ');
      if (!target) {
        await safeSend(msg.chat.id, t('buddy.report.usage', lang));
        return;
      }
      await buddy.report(redis, msg.chat.id, target, reason);
      await buddy.block(redis, msg.chat.id, target).catch(() => {});
      await safeSend(msg.chat.id, tn('buddy.report.ok', lang, { target }));
      return;
    }
    const on = await buddy.isOptedIn(redis, msg.chat.id);
    const cnt = await buddy.dailyCount(redis, msg.chat.id);
    const state = on ? t('buddy.status.on', lang) : t('buddy.status.off', lang);
    await safeSend(msg.chat.id, tn('buddy.status', lang, { state, n: cnt, cap: buddy.DAILY_CAP }));
  } catch (err) {
    console.error('[Error] /buddy handler failed:', err.message);
    await safeSend(msg.chat.id, t('buddy.error', lang));
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
      await safeSend(msg.chat.id, "📋 No picks today yet. Run /cuisine, /hidden, /hawker, or just type 'find me ramen' — they'll all populate /picks.");
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

bot.onText(/^\/(?:share|s)(?:@\w+)?$/, async (msg) => {
  const { resolveLang } = require('./user-prefs');
  const { t, tn } = require('./i18n');
  const lang = await resolveLang(redis, msg.chat.id, msg);
  try {
    const { getRecent } = require('./recent-picks');
    const recent = await getRecent(redis, msg.chat.id);
    if (!recent.length) {
      await safeSend(msg.chat.id, t('share.empty', lang));
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
      await safeSend(msg.chat.id, t('share.mintFailed', lang));
      return;
    }
    await bot.sendMessage(
      msg.chat.id,
      tn('share.prompt', lang, { n: rows.length }),
      { reply_markup: { inline_keyboard: rows } }
    );
  } catch (err) {
    console.error('[Error] /share failed:', err.message);
    await safeSend(msg.chat.id, t('share.error', lang));
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
  // v0.58.28: /hidden re-prompts on a generic anchor (catchment /
  // "Singapore" fallback). The typed text resolves here and routes
  // back through runSurpriseCommand after setUserLocation.
  if (pending === 'hidden') return { kind: 'hidden' };
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

    // v0.59.1: resolve user lang once for all chrome dispatch below.
    const { resolveLang } = require('./user-prefs');
    const { t } = require('./i18n');
    const cbLang = await resolveLang(redis, chatId, q);

    // v0.59.0: language toggle from /language inline keyboard.
    if (data === 'language:set:en' || data === 'language:set:fr') {
      const target = data.endsWith(':fr') ? 'fr' : 'en';
      const { setUserLang } = require('./user-prefs');
      await setUserLang(redis, chatId, target);
      await safeSend(chatId, t(target === 'fr' ? 'bot.lang.set.fr' : 'bot.lang.set.en', target));
      return;
    }

    if (data === 'refresh:transport') {
      await runTransportTrain(chatId, cbLang); // legacy refresh button on bus stop list — point at train view
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
      await sendTransportMenu(chatId, cbLang);
      return;
    }
    if (data === 'transport:refresh-loc') {
      // v0.52.0: clear the cached location so the next sendTransportMenu
      // call falls into the share-location prompt.
      const { hashChatId } = require('./location-cache');
      await redis.del(`loc:${hashChatId(chatId)}`).catch(() => {});
      await bot.sendMessage(chatId, t('location.shareTap', cbLang), LOCATION_REQUEST_KEYBOARD);
      return;
    }
    if (data === 'transport:train') {
      await runTransportTrain(chatId, cbLang);
      return;
    }
    if (data === 'transport:bus') {
      await sendBusMenu(chatId, cbLang);
      return;
    }
    if (data.startsWith('transport:bus:')) {
      const sub = data.slice('transport:bus:'.length);
      await runTransportBus(chatId, sub, cbLang);
      return;
    }
    if (data === 'transport:incidents') {
      await runTransportTrafficIncidents(chatId, cbLang);
      return;
    }
    if (data === 'transport:drive') {
      await runTransportDrive(chatId, cbLang);
      return;
    }
    // v0.59.3: Drive view's 🅿️ Carpark button → carpark list (was transport:menu).
    if (data === 'transport:carpark') {
      await runCarparkCommand(chatId, cbLang);
      return;
    }
    // v0.52.0 hawker sub-menu dispatch (simplified):
    //   hawker:menu               → top-level menu (Cleaning + Browse)
    //   hawker:cleaning           → cleaning-info screen → Hawker Centre Status TMA
    //   hawker:list:menu          → 5-region picker (Browse)
    //   hawker:list:region:<R>    → alphabetical list for that region
    if (data === 'hawker:menu') { await sendHawkerMenu(chatId, cbLang); return; }
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
    const { resolveLang } = require('./user-prefs');
    const { t } = require('./i18n');
    const locLang = await resolveLang(redis, msg.chat.id, msg);
    try {
      await bot.sendMessage(msg.chat.id, t('location.got', locLang), {
        reply_markup: { remove_keyboard: true }
      });
    } catch (err) { /* non-fatal */ }
    pending = await consumePendingMeal(redis, msg.chat.id);
    if (!pending) return; // location stored; nothing to auto-resume
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('coordinates missing or malformed');
    }
    // Auto-resume targets for ensureLocation callers.
    if (pending === '/hidden')     { await runSurpriseCommand(msg.chat.id, locLang); return; }
    if (pending === '/transport')  { await sendTransportMenu(msg.chat.id, locLang);  return; }
    if (pending === '/carpark')    { await runCarparkCommand(msg.chat.id, locLang);  return; }
    // v0.57.27: free-text search resume — user typed text first,
    // then shared location. Pending row is `freetext:<verbatim text>`.
    if (typeof pending === 'string' && pending.startsWith('freetext:')) {
      const text = pending.slice('freetext:'.length);
      // v0.59.0: explicit /language pref outranks Telegram locale.
      const { resolveLang } = require('./user-prefs');
      const userLang = await resolveLang(redis, msg.chat.id, msg);
      await runFreeTextSearch(msg.chat.id, text, { lang: userLang });
      return;
    }
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
  const { resolveLang } = require('./user-prefs');
  const { t } = require('./i18n');
  const startLang = await resolveLang(redis, msg.chat.id, msg);
  const param = rawParam.toLowerCase();
  if (param) {
    const routed = await routeMenuCommand(msg.chat.id, param, null, startLang);
    if (routed) return;
  }
  await safeSend(msg.chat.id, t('start.intro', startLang));
});

// Routes a single-word command name to the appropriate flow. Used by
// (a) /start <cmd> deep links and (b) web_app_data tile taps. Returns
// true if it routed something.
async function routeMenuCommand(chatId, raw, payload = null, lang = 'en') {
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
      // v0.59.17: localised via routeMenuCommand's lang parameter (threaded
       // from /start <param> deep links + web_app_data tile taps).
      const { t: tCuisine } = require('./i18n');
      await bot.sendMessage(chatId, tCuisine('cuisine.chat.title', lang), {
        reply_markup: { inline_keyboard: [[{ text: tCuisine('cuisine.chat.openBtn', lang), web_app: { url } }]] }
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
    case 'weather':   await runWeatherCommand(chatId, lang); return true;
    case 'transport': await sendTransportMenu(chatId, lang); return true;
    case 'hawker':    await sendHawkerMenu(chatId, lang); return true;
    case 'recognised': await runRecognisedCommand(chatId, lang); return true;
    case 'carpark':   await runCarparkCommand(chatId, lang); return true;
    case 'hidden':    await runSurpriseCommand(chatId, lang); return true;
    case 'privacy':   await runPrivacyCommand(chatId, lang); return true;
    case 'legal':     await runLegalCommand(chatId); return true;
    case 'forgetme':  await runForgetMeCommand(chatId, lang); return true;
    case 'ver':       await runVerCommand(chatId); return true;
    default:          return false;
  }
}

async function runWeatherCommand(chatId, lang = 'en') {
  const { t, tn } = require('./i18n');
  try {
    const cached = await getUserLocation(redis, chatId);
    const lat = cached?.lat ?? 1.2839;
    const lng = cached?.lng ?? 103.8517;
    const w = await weather.summary(lat, lng);
    const hasAny = Number.isFinite(w?.tempC) || Number.isFinite(w?.humidityPct) ||
      Number.isFinite(w?.rainMm) || w?.forecast;
    if (!hasAny) { await safeSend(chatId, t('weather.unreachable', lang)); return; }
    const lines = [t('weather.title', lang)];
    if (Number.isFinite(w.tempC)) lines.push(tn('weather.temp', lang, { c: w.tempC.toFixed(1), at: w.tempStationName }));
    if (Number.isFinite(w.humidityPct)) lines.push(tn('weather.humidity', lang, { pct: w.humidityPct.toFixed(0), at: w.humidityStationName }));
    if (Number.isFinite(w.rainMm) && w.rainMm > 0) lines.push(tn('weather.rain', lang, { mm: w.rainMm, at: w.rainStationName }));
    if (Number.isFinite(w.windSpdKt)) {
      const dir = Number.isFinite(w.windDirDeg) ? `, ${Math.round(w.windDirDeg)}°` : '';
      lines.push(tn('weather.wind', lang, { kt: w.windSpdKt, dir }));
    }
    if (w.forecast) {
      const valid = w.forecastValidTo
        ? tn('weather.forecastUntil', lang, { time: new Date(w.forecastValidTo).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' }) })
        : '';
      lines.push(tn('weather.forecastNext2h', lang, { area: w.forecastArea, desc: w.forecast, valid }));
    }
    await safeSend(chatId, lines.join('\n'));
  } catch (err) {
    console.error('[Error] weather command failed:', err.message);
    await safeSend(chatId, t('weather.unreachable', lang));
  }
}

// v0.31.1: /transport is now a 4-button sub-menu (Train, Bus, Taxi/PHD,
// Drive). Bus opens its own sub-sub-menu (nearest stops, arrivals, crowd,
// route). The original "everything-in-one-message" runTransportCommand is
// retained as runTransportFull below for any internal caller that still
// wants the dense view, but the user-facing entry point is sendTransportMenu.

async function sendTransportMenu(chatId, lang = 'en') {
  const { t } = require('./i18n');
  // v0.56.1: use shared ensureLocation helper. Cached-of-any-age
  // returns immediately; only prompts when zero cached location.
  const cached = await ensureLocation(chatId, '/transport', lang);
  if (!cached) return;
  await safeSend(chatId, t('transport.menu.title', lang), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: t('transport.menu.btn.train', lang), callback_data: 'transport:train' },
          { text: t('transport.menu.btn.bus', lang),   callback_data: 'transport:bus' }
        ],
        [
          { text: t('transport.menu.btn.incidents', lang), callback_data: 'transport:incidents' },
          { text: t('transport.menu.btn.drive', lang),     callback_data: 'transport:drive' }
        ],
        [
          { text: t('transport.menu.btn.refreshLoc', lang), callback_data: 'transport:refresh-loc' }
        ]
      ]
    }
  });
}

async function sendBusMenu(chatId, lang = 'en') {
  const { t } = require('./i18n');
  // v0.56.0: removed "Arrivals" + "Crowd / load" per Human Lead.
  // Both depend on per-stop user-side selection that the chat-side
  // flow couldn't make ergonomic.
  await safeSend(chatId, t('transport.bus.menu.title', lang), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t('transport.bus.menu.btn.nearest', lang), callback_data: 'transport:bus:nearest' },
          { text: t('transport.bus.menu.btn.route', lang),   callback_data: 'transport:bus:route' }
        ],
        [
          { text: t('button.back', lang), callback_data: 'transport:menu' }
        ]
      ]
    }
  });
}

async function runTransportTrain(chatId, lang = 'en') {
  const { t, tn } = require('./i18n');
  const { formatDistance } = require('./format');
  let mrtForMap = [];
  try {
    if (!redis.isOpen) await redis.connect();
    const cachedStatus = await redis.get('lta:train_status');
    const status = cachedStatus ? JSON.parse(cachedStatus) : null;
    const cachedLoc = await getUserLocation(redis, chatId);

    const lines = [t('transport.train.heading', lang)];
    if (status) {
      lines.push('', tn('transport.train.status', lang, { status: status.status }));
      if (status.message) lines.push(tn('transport.train.notes', lang, { note: status.message }));
      lines.push(tn('transport.train.refreshed', lang, { at: status.updatedAt }));
    } else {
      lines.push('', t('transport.train.warmup', lang));
    }

    // v0.56.1: nearest 3 stations FIRST, each with crowd + wait estimate.
    // Network summary follows in plain English.
    let crowdMap = null;
    if (process.env.LTA_ACCOUNT_KEY) {
      try { crowdMap = await transport.fetchPlatformCrowdAll(); }
      catch (err) { console.error('[Transport] platform crowd failed:', err.message); }
    }
    if (cachedLoc && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const mrt = await transport.nearestMrtStations(cachedLoc.lat, cachedLoc.lng, 1500, 3);
        if (mrt.length) {
          mrtForMap = mrt;
          const wait = transport.estimateWaitMinutes();
          lines.push('', tn('transport.train.nearestHeader', lang, { min: wait.min, max: wait.max, label: wait.label }));
          for (const s of mrt) {
            const crowd = crowdMap ? transport.lookupCrowdForPlace(crowdMap, s.name) : null;
            const crowdNote = crowd ? ` · ${t(`transport.train.crowd.${crowd}`, lang)}` : '';
            const dist = (Number.isFinite(s.lat) && Number.isFinite(s.lng))
              ? formatDistance(transport.haversineM(cachedLoc.lat, cachedLoc.lng, s.lat, s.lng))
              : '';
            lines.push(tn('transport.train.stationRow', lang, { name: s.name, dist, crowd: crowdNote }));
          }
        }
      } catch (err) {
        console.error('[Transport] nearestMrtStations failed:', err.message);
      }
    } else if (!cachedLoc) {
      lines.push('', t('transport.train.noLocation', lang));
    }
    if (crowdMap) {
      const summary = transport.networkCrowdSummary(crowdMap);
      if (summary) {
        const pct = summary.total > 0 ? Math.round((summary.low / summary.total) * 100) : 0;
        let networkLine;
        if (summary.overall === 'low') {
          networkLine = tn('transport.train.network.low', lang, { pct, total: summary.total });
        } else if (summary.overall === 'medium') {
          networkLine = tn('transport.train.network.medium', lang, { medium: summary.medium, total: summary.total, high: summary.high });
        } else {
          networkLine = tn('transport.train.network.high', lang, { high: summary.high, total: summary.total });
        }
        lines.push('', networkLine);
      }
    }

    // v0.51.0: per-line breakdown + Hitachi-style TMA + engineering closures.
    try {
      const mrtLines = require('./mrt-lines');
      const mrtEng = require('./mrt-engineering');
      const todayISO = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let alerts = null;
      if (process.env.LTA_ACCOUNT_KEY && lta) {
        try { const { data } = await lta.get('/TrainServiceAlerts'); alerts = data?.value || null; }
        catch (err) { console.warn('[Transport] TrainServiceAlerts fetch failed:', err.message); }
      }
      const statusByLine = mrtLines.parseStatusByLine(alerts);
      const affected = Object.entries(statusByLine).filter(([_, s]) => s.status !== 'normal');
      if (affected.length) {
        lines.push('', t('transport.train.affectedLines', lang));
        for (const [code, s] of affected) {
          const meta = mrtLines.LINES_BY_CODE[code];
          lines.push(`${meta?.emoji || '·'} ${code} ${meta?.name || ''} — ${s.status}${s.cause ? ` (${s.cause})` : ''}`);
          if (s.direction) lines.push(`   ${s.direction}`);
        }
      }
      const upcoming = mrtEng.upcoming(todayISO, 7);
      if (upcoming.length) {
        lines.push('', t('transport.train.engineering', lang));
        for (const c of upcoming.slice(0, 5)) {
          lines.push(`· ${c.date} ${c.line} ${c.direction} — ${c.type} ${c.time}`);
        }
      }
    } catch (err) {
      console.warn('[Transport] per-line + engineering enrichment failed:', err.message);
    }

    const tmaButton = webhookDomain
      ? [[{ text: t('transport.train.openMapBtn', lang), web_app: { url: `https://${webhookDomain}/app/transport` } }]]
      : [];
    // v0.59.3: nearby-stations one-map button (only if we have stations + a webhookDomain).
    let stationsMapRow = [];
    let stationsGmapsRow = [];
    if (mrtForMap.length) {
      try {
        const { buildMapHashUrl, googleMapsContainerUrl } = require('./maps-url');
        const slim = mrtForMap
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s) => ({ ...s, name: s.name, placeId: s.placeId || '' }));
        if (webhookDomain) {
          const mapUrl = buildMapHashUrl(slim, { webhookDomain });
          if (mapUrl) {
            stationsMapRow = [[{ text: t('transport.map.stationsBtn', lang), web_app: { url: mapUrl } }]];
          }
        }
        // v0.59.13: Google Maps multi-stop directions URL — opens the
        // user's Maps app on iOS Universal Links, lands on the stations
        // pinned in walking-directions mode.
        if (cachedLoc && Number.isFinite(cachedLoc.lat) && Number.isFinite(cachedLoc.lng)) {
          const gmapsUrl = googleMapsContainerUrl(slim, {
            travelmode: 'walking',
            origin: `${cachedLoc.lat},${cachedLoc.lng}`
          });
          if (gmapsUrl) {
            stationsGmapsRow = [[{ text: t('gmaps.openBtn', lang), url: gmapsUrl }]];
          }
        }
      } catch (err) {
        console.warn('[Transport] stations map build failed:', err.message);
      }
    }
    const buttons = [
      ...tmaButton,
      ...stationsMapRow,
      ...stationsGmapsRow,
      [{ text: t('button.refresh', lang), callback_data: 'transport:train' }],
      [{ text: t('button.back', lang), callback_data: 'transport:menu' }]
    ];
    await safeSend(chatId, lines.join('\n'), {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (err) {
    console.error('[Error] transport train failed:', err.message);
    await safeSend(chatId, t('transport.train.unreachable', lang));
  }
}

async function runTransportBus(chatId, sub, lang = 'en') {
  const { t, tn } = require('./i18n');
  const { formatDistance } = require('./format');
  try {
    if (!redis.isOpen) await redis.connect();
    const cachedLoc = await getUserLocation(redis, chatId);
    const backRow = [{ text: t('button.back', lang), callback_data: 'transport:bus' }];

    if (!cachedLoc) {
      await safeSend(chatId, t('transport.bus.noLocation', lang), {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }
    if (!process.env.LTA_ACCOUNT_KEY) {
      await safeSend(chatId, t('transport.bus.offline', lang), {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }

    if (sub === 'nearest') {
      const stops = await transport.nearestStops(redis, cachedLoc.lat, cachedLoc.lng, 800, 5);
      if (!stops.length) {
        await safeSend(chatId, t('transport.bus.noStopsNearest', lang), {
          reply_markup: { inline_keyboard: [backRow] }
        });
        return;
      }
      const lines = [t('transport.bus.nearestHeader', lang)];
      for (const stop of stops) {
        lines.push('', tn('transport.bus.stopRow', lang, { desc: stop.description, road: stop.roadName, dist: formatDistance(stop.distanceM) }));
        lines.push(tn('transport.bus.stopCode', lang, { code: stop.code }));
      }
      // v0.59.3: one-map button for nearest stops. v0.59.13: + Google Maps.
      let mapRow = [];
      let gmapsRow = [];
      try {
        const { buildMapHashUrl, googleMapsContainerUrl } = require('./maps-url');
        const slim = stops
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s) => ({
            name: `${s.description} (${s.code})`,
            placeId: '',
            lat: s.lat,
            lng: s.lng,
            area: s.roadName || '',
            // Coord URL so the marker popup's "Open in Google Maps" lands
            // on the stop pin, not a text search for the stop description.
            url: `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
          }));
        if (webhookDomain) {
          const mapUrl = buildMapHashUrl(slim, { webhookDomain });
          if (mapUrl) mapRow = [[{ text: t('transport.map.busStopsBtn', lang), web_app: { url: mapUrl } }]];
        }
        const gmapsUrl = googleMapsContainerUrl(slim, {
          travelmode: 'walking',
          origin: `${cachedLoc.lat},${cachedLoc.lng}`
        });
        if (gmapsUrl) gmapsRow = [[{ text: t('gmaps.openBtn', lang), url: gmapsUrl }]];
      } catch (err) { console.warn('[Transport] bus stops map build failed:', err.message); }
      await safeSend(chatId, lines.join('\n'), {
        reply_markup: { inline_keyboard: [...mapRow, ...gmapsRow, backRow] }
      });
      return;
    }

    if (sub === 'arrivals') {
      const stops = await transport.nearestStops(redis, cachedLoc.lat, cachedLoc.lng, 800, 3);
      if (!stops.length) {
        await safeSend(chatId, t('transport.bus.noStopsArrivals', lang), {
          reply_markup: { inline_keyboard: [backRow] }
        });
        return;
      }
      const lines = [t('transport.bus.arrivalsHeader', lang)];
      for (const stop of stops) {
        const arrivals = await transport.busArrivals(stop.code);
        lines.push('', tn('transport.bus.stopRow', lang, { desc: stop.description, road: stop.roadName, dist: formatDistance(stop.distanceM) }));
        if (!arrivals.length) { lines.push(t('transport.bus.noLive', lang)); continue; }
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
      const stops = await transport.nearestStops(redis, cachedLoc.lat, cachedLoc.lng, 800, 3);
      if (!stops.length) {
        await safeSend(chatId, t('transport.bus.noStopsCrowd', lang), {
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
      const lines = [t('transport.bus.loadHeader', lang)];
      lines.push('');
      if (total) {
        lines.push(tn('transport.bus.load.seats', lang, { n: SEA }));
        lines.push(tn('transport.bus.load.standing', lang, { n: SDA }));
        lines.push(tn('transport.bus.load.limited', lang, { n: LSD }));
        lines.push(tn('transport.bus.load.footer', lang, { n: total }));
      } else {
        lines.push(t('transport.bus.noLoad', lang));
      }
      lines.push('', ...detail);
      await safeSend(chatId, lines.join('\n'), {
        reply_markup: { inline_keyboard: [backRow] }
      });
      return;
    }

    if (sub === 'route') {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${cachedLoc.lat},${cachedLoc.lng}&travelmode=transit`;
      await safeSend(chatId, t('transport.bus.routeCaption', lang), {
        reply_markup: {
          inline_keyboard: [
            [{ text: t('transport.bus.routeBtn', lang), url }],
            backRow
          ]
        }
      });
      return;
    }

    await sendBusMenu(chatId, lang);
  } catch (err) {
    console.error('[Error] transport bus failed:', err.message);
    await safeSend(chatId, t('transport.bus.unreachable', lang));
  }
}

async function runTransportTrafficIncidents(chatId, lang = 'en') {
  const { t, tn, translateIncidentType } = require('./i18n');
  const { formatDistance } = require('./format');
  try {
    if (!process.env.LTA_ACCOUNT_KEY) {
      await safeSend(chatId, t('transport.incidents.offline', lang), {
        reply_markup: { inline_keyboard: [[{ text: t('button.back', lang), callback_data: 'transport:menu' }]] }
      });
      return;
    }
    if (!redis.isOpen) await redis.connect();
    const cachedLoc = await getUserLocation(redis, chatId);
    const all = await transport.fetchTrafficIncidents();
    const lines = [t('transport.incidents.heading', lang)];
    let mapPool = []; // incidents to plot on the one-map view
    if (!all.length) {
      lines.push('', t('transport.incidents.none', lang));
    } else if (cachedLoc) {
      const near = transport.nearestIncidents(all, cachedLoc.lat, cachedLoc.lng, 10000, 8);
      if (near.length) {
        lines.push('', tn('transport.incidents.nearHeader', lang, { n: near.length, total: all.length }));
        for (const inc of near) {
          const dist = Number.isFinite(inc.distanceM) ? ` — ${formatDistance(inc.distanceM)}` : '';
          lines.push('', tn('transport.incidents.row', lang, { type: translateIncidentType(inc.type, lang), dist }));
          lines.push(`  ${inc.message}`);
        }
        mapPool = near;
      } else {
        lines.push('', tn('transport.incidents.noNear', lang, { total: all.length }));
      }
    } else {
      lines.push('', tn('transport.incidents.noLoc', lang, { total: all.length }));
      for (const inc of all.slice(0, 5)) {
        lines.push('', tn('transport.incidents.row', lang, { type: translateIncidentType(inc.type, lang), dist: '' }));
        lines.push(`  ${inc.message}`);
      }
      mapPool = all.slice(0, 8);
    }
    // v0.59.3: one-map button.
    let mapRow = [];
    if (mapPool.length && webhookDomain) {
      try {
        const { buildMapHashUrl } = require('./maps-url');
        const slim = mapPool
          .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
          .map((i) => ({
            name: i.type || 'Incident',
            placeId: '',
            lat: i.lat,
            lng: i.lng,
            area: i.message || '',
            // Coord URL — incident "names" (Accident / Roadwork / Vehicle
            // breakdown) are not searchable place names, so the popup's
            // "Open in Google Maps" must land on the actual lat/lng.
            url: `https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}`
          }));
        const mapUrl = buildMapHashUrl(slim, { webhookDomain });
        if (mapUrl) mapRow = [[{ text: t('transport.map.incidentsBtn', lang), web_app: { url: mapUrl } }]];
      } catch (err) { console.warn('[Transport] incidents map build failed:', err.message); }
    }
    await safeSend(chatId, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [...mapRow, [{ text: t('button.back', lang), callback_data: 'transport:menu' }]] }
    });
  } catch (err) {
    console.error('[Error] transport traffic incidents failed:', err.message);
    await safeSend(chatId, t('transport.incidents.unreachable', lang));
  }
}

async function runTransportDrive(chatId, lang = 'en') {
  const { t, tn, translateIncidentType } = require('./i18n');
  const { formatDistance } = require('./format');
  try {
    if (!redis.isOpen) await redis.connect();
    const cachedLoc = await getUserLocation(redis, chatId);
    const lines = [t('transport.drive.title', lang)];
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
          lines.push('', tn('transport.drive.trafficNear', lang, { n: near.length, total: all.length }));
          for (const inc of near) {
            const dist = Number.isFinite(inc.distanceM) ? ` — ${formatDistance(inc.distanceM)}` : '';
            lines.push(tn('transport.incidents.row', lang, { type: translateIncidentType(inc.type, lang), dist }));
            lines.push(`  ${inc.message}`);
          }
        } else if (all.length) {
          lines.push('', tn('transport.drive.trafficNoNear', lang, { total: all.length }));
        } else {
          lines.push('', t('transport.drive.trafficNone', lang));
        }
      } catch (err) {
        console.error('[Transport] traffic incidents failed:', err.message);
      }
    }
    const buttons = [];
    if (cachedLoc) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${cachedLoc.lat},${cachedLoc.lng}&travelmode=driving`;
      buttons.push([{ text: t('transport.drive.openMapsBtn', lang), url }]);
    } else {
      lines.push('', t('transport.drive.noLocation', lang));
    }
    // v0.59.3: Drive→Carpark must actually open the carpark list.
    // Previously both buttons routed back to transport:menu.
    buttons.push([{ text: t('transport.drive.btn.carpark', lang), callback_data: 'transport:carpark' }, { text: t('button.back', lang), callback_data: 'transport:menu' }]);
    await safeSend(chatId, lines.join('\n'), {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (err) {
    console.error('[Error] transport drive failed:', err.message);
    await safeSend(chatId, t('transport.drive.unreachable', lang));
  }
}

// v0.33.0: /hawker sub-menu + handlers.
async function sendHawkerMenu(chatId, lang = 'en') {
  const { t } = require('./i18n');
  // v0.56.0: collapse to a SINGLE button — /hawker goes straight to
  // the TMA per Human Lead. TMA also simplified: only the regional
  // browser remains (Closures/R&R/About tabs removed).
  await safeSend(chatId, t('hawker.title', lang), {
    reply_markup: {
      inline_keyboard: [
        [{ text: t('hawker.openTmaBtn', lang), web_app: { url: `https://${webhookDomain}/app/hawker` } }]
      ]
    }
  });
}


// v0.35.0: /recognised + /heritage-food handlers. Both consume the
async function runRecognisedCommand(chatId, lang = 'en') {
  const { t } = require('./i18n');
  // v0.56.3: 4 curated SG award/listing pages as direct links.
  // v0.59.13: localised heading + button labels.
  const text = [
    t('recognised.heading', lang),
    '',
    t('recognised.tap', lang)
  ].join('\n');
  // v0.59.13: switch to FR Michelin Guide URL when locale is FR. The FR
  // Michelin domain serves the same Singapore selection in French.
  const michelinLocale = lang === 'fr' ? 'fr' : 'en';
  await safeSend(chatId, text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: t('recognised.btn.bib', lang),          url: `https://guide.michelin.com/sg/${michelinLocale}/selection/singapore/restaurants/bib-gourmand` }],
        [{ text: t('recognised.btn.star', lang),         url: `https://guide.michelin.com/sg/${michelinLocale}/singapore-region/singapore/restaurants` }],
        [{ text: t('recognised.btn.asia50', lang),       url: 'https://www.theworlds50best.com/asia/en/list/1-50' }],
        [{ text: t('recognised.btn.localProduce', lang), url: 'https://www.sfa.gov.sg/fromSGtoSG/where-to-dine' }]
      ]
    }
  });
}

async function runCarparkCommand(chatId, lang = 'en') {
  const { t, tn } = require('./i18n');
  const { formatDistance } = require('./format');
  try {
    if (!process.env.LTA_ACCOUNT_KEY) { await safeSend(chatId, t('carpark.offline', lang)); return; }
    // v0.53.0: 5-min staleness gate + reverse-geocoded "Current: <addr>" header.
    const cached = await ensureFreshLocationOrPrompt(chatId, '/carpark', lang);
    if (!cached) return;
    await safeSend(chatId, t('carpark.lookingUp', lang));
    const list = await carpark.nearest(cached.lat, cached.lng, 5);
    if (!list.length) { await safeSend(chatId, t('carpark.none', lang)); return; }
    const lines = [t('carpark.header', lang)];
    list.forEach((c, i) => lines.push(tn('carpark.row', lang, { i: i + 1, name: c.development, lots: c.availableLots, dist: formatDistance(c.distanceM) })));
    await safeSend(chatId, lines.join('\n'));
    // v0.53.0: 5 carparks on one map (TMA leaflet view), same pattern as /surprise.
    // Falls back to legacy directions URL when webhookDomain unavailable.
    // v0.59.13: TMA leaflet button + Google Maps button rendered together
    // when both are available, so the user picks whichever app is more
    // ergonomic for them.
    try {
      const { buildMapHashUrl, googleMapsContainerUrl } = require('./maps-url');
      const carparksWithName = list.map((c) => ({ ...c, name: c.development, placeId: '' }));
      const mapUrl = webhookDomain ? buildMapHashUrl(carparksWithName, { webhookDomain }) : null;
      const gmapsUrl = googleMapsContainerUrl(list, {
        travelmode: 'driving',
        origin: `${cached.lat},${cached.lng}`
      });
      const rows = [];
      if (mapUrl) {
        rows.push([{ text: tn('carpark.mapAllBtn', lang, { n: list.length }), web_app: { url: mapUrl } }]);
      }
      if (gmapsUrl) {
        rows.push([{ text: t('gmaps.openBtn', lang), url: gmapsUrl }]);
      }
      if (rows.length) {
        await bot.sendMessage(chatId, tn('carpark.mapAllCaption', lang, { n: list.length }), {
          reply_markup: { inline_keyboard: rows }
        });
      } else {
        // Last-resort fallback: legacy GoogleMapsContainer (drives directions URL).
        await sendGoogleMapsContainer(chatId, list, {
          travelmode: 'driving',
          caption: t('carpark.containerCaption', lang),
          label: t('carpark.viewAllBtn', lang)
        });
      }
    } catch (err) {
      console.warn('[Carpark] map button render failed:', err.message);
    }
  } catch (err) {
    console.error('[Error] carpark command failed:', err.message);
    await safeSend(chatId, t('carpark.unreachable', lang));
  }
}

// v0.58.28: /hidden refactored to a single Gemini call with Google
// Search grounding per Human Lead's spec. The deterministic v0.58.22
// hidden-gems pipeline (Places discover → annulus → C1/C3/C4 evaluator
// → Claude C2/C5) is replaced by a single grounded prompt that does
// all of {C1 NEW_HIGHRATED, C2 SOCIAL_BUZZ, C3 UNDERREVIEWED, C4
// UNIQUE_OFFERING}, chain blacklist, and 1–3 km walking gate inside
// Gemini. The rationale: Google Search grounding gives Gemini direct
// access to recent SG food blogs / IG / news, so we no longer need
// our own retrieval + ranking. Output is rendered verbatim per the
// spec format (Address / Opening hours / rating / criteria / sources
// with raw URLs).
//
// Anchor verification: cached lat/lng is reverse-geocoded; if the
// result is "Singapore" / a natural feature (catchment, reservoir,
// park), we re-prompt the user to type a place name. This blocks
// Gemini from hallucinating around a useless anchor.
//
// Rollback: PIPELINE_TASKS_ENABLED=false still drops back to the
// single-venue v0.31 surprise flow.
const HIDDEN_NATURAL_NAME_RX = /\b(catchment|reservoir|forest|nature reserve|park|wetland|river|canal)\b/i;

async function runSurpriseCommand(chatId, lang = 'en') {
  const { t, tn } = require('./i18n');
  try {
    if (await isProcessing(redis, chatId)) {
      await safeSend(chatId, t('hidden.busy', lang));
      return;
    }
    const cached = await ensureFreshLocationOrPrompt(chatId, '/hidden', lang);
    if (!cached) return;
    await setProcessing(redis, chatId);

    if (process.env.PIPELINE_TASKS_ENABLED === 'false') {
      await safeSend(chatId, t('hidden.huntingLegacy', lang));
      const { findSurprise } = require('./surprise');
      const venue = await findSurprise({ lat: cached.lat, lng: cached.lng, redis });
      if (!venue) {
        await safeSend(chatId, t('hidden.legacyNotFound', lang));
        return;
      }
      await deliverSurprise(chatId, venue);
      return;
    }

    // Anchor verification. Reverse-geocode the cached coords, reject
    // catchment / "Singapore" fallbacks. On reject, re-prompt the
    // user to type a place name; the resolved-pending path geocodes
    // the typed text and re-invokes runSurpriseCommand.
    let anchorName = '';
    try {
      const r = await reverseGeocodeAddress(cached.lat, cached.lng);
      anchorName = r?.name || '';
    } catch (err) {
      console.warn('[/hidden] reverse-geocode failed:', err.message);
    }
    const looksGeneric = !anchorName
      || /^singapore$/i.test(anchorName)
      || HIDDEN_NATURAL_NAME_RX.test(anchorName);
    if (looksGeneric) {
      const anchorClause = anchorName ? tn('hidden.anchorAmbiguous.got', lang, { name: anchorName }) : '';
      await safeSend(chatId, tn('hidden.anchorAmbiguous', lang, { anchor: anchorClause }));
      try { await setPendingMeal(redis, chatId, 'hidden'); } catch { /* best-effort */ }
      return;
    }
    const anchor = {
      name: anchorName,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(anchorName + ' Singapore')}`
    };

    // v0.58.32: simpler waiting text per Human Lead. The 12-s
    // progress pulses below carry the "what's happening" detail so
    // the initial line stays short.
    await safeSend(chatId, tn('hidden.searching', lang, { anchor: anchorName }));

    // v0.58.30: progress pulses so the user sees life past 20 s.
    // v0.58.41: cap pulses at MAX_PULSES so a hung Gemini call doesn't
    // spam the chat indefinitely. Hard 240 s timeout below catches the
    // actual hang.
    const PROGRESS_LINES = [
      t('hidden.progress.1', lang),
      t('hidden.progress.2', lang),
      t('hidden.progress.3', lang),
      t('hidden.progress.4', lang),
      t('hidden.progress.5', lang)
    ];
    // v0.58.41: 10 pulses × 12 s = 120 s of "still working" coverage.
    // Pairs with the 180 s timeout so the user sees activity for two
    // thirds of the worst-case wait before silence.
    const MAX_PULSES = 10;
    let pulseIdx = 0;
    const pulseTimer = setInterval(() => {
      if (pulseIdx >= MAX_PULSES) { clearInterval(pulseTimer); return; }
      safeSend(chatId, PROGRESS_LINES[pulseIdx % PROGRESS_LINES.length]).catch(() => {});
      pulseIdx++;
    }, 12_000);

    // v0.58.43: bumped 180 s → 240 s. Per-attempt 60 s deadline now
    // lives inside gemini-client (see PER_ATTEMPT_MS), so a hung
    // model gets cut before it can eat the whole budget. 4 attempts
    // × 60 s each = 240 s ceiling. Leaves headroom for a slow but
    // working gemini-2.5-pro fallback (60-90 s grounded calls).
    const HIDDEN_TIMEOUT_MS = 240_000;
    const gc = require('./gemini-client');
    let result;
    try {
      result = await Promise.race([
        gc.generateGroundedHiddenGems({ anchor, todayIsoSGT: gc.todaySGT(), lang }),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error(`Gemini call exceeded ${HIDDEN_TIMEOUT_MS / 1000}s timeout`)),
          HIDDEN_TIMEOUT_MS
        ))
      ]);
    } catch (err) {
      clearInterval(pulseTimer);
      console.error(`[/hidden] Gemini call failed: ${err.message}`);
      const errs = Array.isArray(err.attemptErrors) ? err.attemptErrors : [];
      const requested = err.requestedModel || process.env.GEMINI_MODEL || 'gemini-flash-latest';
      // v0.58.42: detect "every attempt was 503 high-demand".
      const all503 = errs.length >= 2 && errs.every((e) => /\b503\b|high demand|service unavailable/i.test(e));
      // v0.58.41: also detect our own 240 s timeout.
      const isTimeout = /exceeded \d+s timeout/i.test(err.message || '');
      if (isTimeout) {
        await safeSend(chatId, t('hidden.timeout', lang));
        return;
      }
      if (all503) {
        await safeSend(chatId, t('hidden.overload', lang));
        return;
      }
      const detail = errs.length
        ? errs.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        : `  ${err.message}`;
      await safeSend(chatId,
        `🛠 /hidden couldn't reach Gemini.\n\n` +
        `Requested model: ${requested}\n` +
        `Attempts:\n${detail}\n\n` +
        `Common fixes:\n` +
        `• Check GEMINI_API_KEY is set in Railway env vars.\n` +
        `• If the model says "not found" / "404": the SDK (legacy 0.24.1) doesn't know it. Try gemini-2.5-flash, gemini-flash-latest, or unset GEMINI_MODEL.\n` +
        `• If "quota" / "429": Google AI Studio quota is tripped — retry in a few minutes.`
      );
      return;
    }
    // v0.58.34: warn the user when we fell back from their requested
    // model so they can fix the env var (or know why the spec wasn't
    // executed on their preferred model).
    if (result.degraded) {
      await safeSend(chatId,
        `ℹ️ GEMINI_MODEL "${result.requestedModel}" failed; fell back to ${result.model}. ` +
        `Check Railway logs for the exact error from the API.`
      );
    }
    clearInterval(pulseTimer);

    console.log(`[/hidden] Gemini ok model=${result.model} chars=${result.text.length}`);
    // v0.59.5: post-process to replace fabricated rating + review counts
    // with live values from Google Places API. Gemini's grounded search
    // routinely returns stale counts (user reported 56→159, 114→162 on a
    // single run). Falls back to the original block per venue when Places
    // returns nothing — never makes the output worse.
    let verifiedText = result.text;
    let verifiedVenues = [];
    let allDropped = false;
    try {
      const { verifyHiddenGemsOutput } = require('./hidden-verify');
      const verifyResult = await verifyHiddenGemsOutput(result.text);
      verifiedText = verifyResult.text;
      verifiedVenues = verifyResult.venues || [];
      allDropped = !!verifyResult.allDropped;
    } catch (err) {
      console.warn('[/hidden] verify post-process failed, keeping raw output:', err.message);
    }
    // v0.59.7 (Codex review #211): if every parsed block was filtered
    // out as CLOSED_*, the verified text is empty and Telegram rejects
    // empty messages. Substitute a user-facing fallback (localised) so
    // the user gets a clear final response instead of silence.
    if (allDropped) {
      await safeSend(chatId, t('hidden.allClosed', lang));
      return;
    }
    // Telegram message limit is 4096 chars. Chunk on per-result
    // boundaries (lines starting "/^\d+\. /") so a single venue
    // never spans messages.
    const chunks = chunkHiddenGemsOutput(verifiedText, 3800);
    for (const c of chunks) {
      await safeSend(chatId, c, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    }
    // v0.59.6: one-map button for all 5 picks (post-list). Reuses the
    // Places-API lat/lng captured during verification — only renders
    // when at least 2 picks resolved (single venue is already its own
    // map link inside the block) and webhookDomain is set.
    try {
      const plottable = verifiedVenues.filter((v) => v && Number.isFinite(v.lat) && Number.isFinite(v.lng));
      if (plottable.length >= 2 && webhookDomain) {
        const { buildMapHashUrl } = require('./maps-url');
        const slim = plottable.map((v) => ({
          name: v.displayHeading || v.name,
          placeId: v.id || '',
          lat: v.lat,
          lng: v.lng,
          area: v.address || ''
        }));
        const mapUrl = buildMapHashUrl(slim, { webhookDomain });
        if (mapUrl) {
          const caption = lang === 'fr'
            ? `🗺 Voir les ${plottable.length} trouvailles sur une carte :`
            : `🗺 View all ${plottable.length} picks on one map:`;
          const btnText = lang === 'fr'
            ? `🗺 Voir les ${plottable.length} sur la carte`
            : `🗺 Open ${plottable.length} on map`;
          await bot.sendMessage(chatId, caption, {
            reply_markup: { inline_keyboard: [[{ text: btnText, web_app: { url: mapUrl } }]] }
          });
        }
      }
    } catch (err) {
      console.warn('[/hidden] one-map button render failed:', err.message);
    }
  } catch (err) {
    console.error('[/hidden] outer catch:', err.message, err.stack);
    await safeSend(chatId, t('hidden.outerError', lang));
  } finally {
    await clearProcessing(redis, chatId).catch(() => {});
  }
}

// Split Gemini's hidden-gems response into Telegram-sized chunks
// without breaking a single venue across two messages. Splits at
// blank-line-then-numbered-heading boundaries (e.g. "\n\n2. NAME").
// Falls back to length-based split if a single venue exceeds the
// limit. Exported for tests.
//
// v0.58.36: also strips Markdown bold (`**X**`) which Gemini emits
// despite our prompt instruction. The Telegram client doesn't render
// `**` as bold (its Markdown mode uses single `*`), and escaping
// every URL in the Sources block to use Telegram's parse_mode is
// fragile. Plain text wins. Same for `__italic__` and bare `#headings`.
function stripMarkdown(text) {
  if (!text) return text;
  return String(text)
    // Bold: **text** → text   (greedy non-newline, paired)
    .replace(/\*\*([^*\n][^*]*?)\*\*/g, '$1')
    // Underscored emphasis used by some Gemini outputs (__text__)
    .replace(/__([^_\n][^_]*?)__/g, '$1')
    // Single-asterisk emphasis: *text* → text  (avoid bullet lines starting with "* ")
    .replace(/(^|[^\*])\*([^\s*][^*\n]*?)\*([^\*]|$)/g, '$1$2$3')
    // Leading "# " / "## " ATX headings
    .replace(/^#{1,6}\s+/gm, '')
    // Inline backticks `code` → code
    .replace(/`([^`\n]+)`/g, '$1');
}

// v0.58.45: Gemini still leaks the criteria letters ("meets C3 and C4",
// "Meeting C2 and C3") into the "Why a gem" prose despite explicit
// prompt rules. Strip the leak so the user-facing copy stays clean.
// Patterns covered:
//   "meets C3 and C4"
//   "meeting C2 + C3"
//   "this place meets C1, C2 and C4"
//   "Meeting C3 and C4, this …"  (capitalised, leading)
function stripCriteriaLeak(text) {
  if (!text) return text;
  // v0.58.46: broadened. User cited leaks like "(C2+C4)", "without
  // being C1 or C3", "C3 (under 120 reviews) and C4", "a high rating
  // with C2+C4". The v0.58.45 regex only caught "meets/Meeting Cx".
  // NOTE: dropped the v0.58.45 (\.)\s*([a-z]) autocapitalize and the
  // per-line ^\s+|\s+$ trim — both caused damage. The first mangled
  // URLs (www.google.com → www. Google. Com), the second collapsed
  // blank lines between picks ("…Singapore2. THE COFFEE ROASTER").
  return String(text)
    // 1. Verb phrase: "meets/Meeting [criteria] Cx[, Cy and Cz][,]"
    .replace(/\s*\b(?:[Mm]eets|[Mm]eeting)(?:\s+criteria)?\s+C[1-5](?:\s*[,&+]\s*|\s+(?:and|or)\s+)?(?:C[1-5])?(?:\s*[,&+]\s*|\s+(?:and|or)\s+)?(?:C[1-5])?\s*,?\s*/g, ' ')
    // 2. Parenthetical: " (C2+C4)" / " (C3, C4)" / " (C3 and C4)"
    .replace(/\s*\(\s*C[1-5](?:\s*[,&+]\s*|\s+(?:and|or)\s+)?(?:C[1-5])?(?:\s*[,&+]\s*|\s+(?:and|or)\s+)?(?:C[1-5])?\s*\)/g, '')
    // 3. Loose mentions after a connector: " with/being/under/...
    //    Cx and Cy" → single space (preserve word boundaries).
    .replace(/\s+\b(?:with|being|under|satisfies|qualifies|fires|is)\s+C[1-5](?:\s*[,&+]\s*|\s+(?:and|or)\s+)?(?:C[1-5])?(?:\s*[,&+]\s*|\s+(?:and|or)\s+)?(?:C[1-5])?\s*,?\s*/g, ' ')
    // 4. Last-resort sweep: any " Cx and/or/+ Cy" pair mid-sentence
    //    → single space.
    .replace(/\s+\bC[1-5](?:\s*[,&+]\s*|\s+(?:and|or)\s+)C[1-5]\b\s*,?\s*/g, ' ')
    // 5. Tidy: collapse doubled spaces, orphaned commas/periods.
    .replace(/ {2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .trim();
}

// v0.58.46: HTML-escape user-facing content so Telegram parse_mode='HTML'
// doesn't choke on stray < > & in venue names or URL query strings.
function escapeHtmlForTelegram(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// v0.58.46: bold the venue-name slug on every numbered heading line.
// Heading shape from the prompt is "1. NAME - primary type" — we
// wrap NAME in <b>…</b>. Telegram renders <b> when parse_mode='HTML'.
function boldVenueHeadings(text) {
  if (!text) return text;
  return String(text).replace(
    /^(\d+\.\s+)([^-\n]+?)(\s+-\s+[^\n]*)$/gm,
    (_, num, name, rest) => `${num}<b>${name.trim()}</b>${rest}`
  );
}

// v0.58.45: Gemini sometimes returns fabricated Place URLs of the form
// https://www.google.com/maps/place/<name>/@lat,lng,zoom/data=!3m1!4b1!4m6!3m5!1s0x<hex>:0x<hex>
// where the hex Place IDs and coordinates are made up. The `place/` URL
// schema requires a verified Place ID; the `search/` schema accepts any
// query string and lands the user on the right venue via Google's own
// search. Rewrite any place/ URL we see using the venue name from the
// preceding numbered heading line.
function rewriteFabricatedPlaceUrls(text) {
  if (!text) return text;
  const lines = String(text).split('\n');
  const headingRx = /^\s*\d+\.\s+(.+?)(?:\s+-\s+.*)?$/;
  let lastVenueName = '';
  return lines.map((line) => {
    const head = line.match(headingRx);
    if (head) lastVenueName = head[1].trim();
    if (/^Google Map URL:\s*https:\/\/www\.google\.com\/maps\/place\//i.test(line)) {
      const safeName = encodeURIComponent(`${lastVenueName || 'Singapore F&B'} Singapore`);
      return `Google Map URL: https://www.google.com/maps/search/?api=1&query=${safeName}`;
    }
    return line;
  }).join('\n');
}

function chunkHiddenGemsOutput(text, maxChars = 3800) {
  // v0.58.36 / v0.58.45 / v0.58.46: order matters.
  //   1. stripMarkdown — drop **bold** / __italic__ / ATX headings
  //   2. stripCriteriaLeak — scrub "meets Cx and Cy" / "(C2+C4)"
  //   3. rewriteFabricatedPlaceUrls — fake /maps/place/ → /maps/search/
  //   4. escapeHtmlForTelegram — neutralise < > & for parse_mode='HTML'
  //   5. boldVenueHeadings — wrap "1. NAME" in <b>…</b> AFTER escape
  //      (we ADD the <b>; the escape only neutralises stray angle
  //      brackets in the model output).
  // Final text is HTML-safe and ships with parse_mode='HTML'.
  const cleaned = boldVenueHeadings(escapeHtmlForTelegram(
    rewriteFabricatedPlaceUrls(stripCriteriaLeak(stripMarkdown(text)))
  ));
  if (!cleaned || cleaned.length <= maxChars) return [cleaned || ''];
  const out = [];
  let buf = '';
  // v0.58.36: relaxed split — match a numbered heading even if the
  // first character after the number is non-letter (** stripped above
  // but still defensive: digits, quotes, special chars).
  const parts = cleaned.split(/(?=\n\d+\.\s+\S)/);
  for (const p of parts) {
    if ((buf + p).length > maxChars) {
      if (buf) { out.push(buf); buf = ''; }
      // If a single part still exceeds the limit, hard-split.
      if (p.length > maxChars) {
        for (let i = 0; i < p.length; i += maxChars) out.push(p.slice(i, i + maxChars));
      } else {
        buf = p;
      }
    } else {
      buf += p;
    }
  }
  if (buf) out.push(buf);
  return out;
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

// v0.57.21: /privacy — what the bot collects, how long it's kept,
// and which third parties it queries. OPERATOR_LINKEDIN env var
// (optional) appends an authorship credit line.
async function runPrivacyCommand(chatId, lang = 'en') {
  const { t, tn } = require('./i18n');
  try {
    const operator = process.env.OPERATOR_LINKEDIN
      ? `\n\nOperator: ${process.env.OPERATOR_LINKEDIN}`
      : '';
    const text = tn('privacy.body', lang, { operator });
    await safeSend(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Error] /privacy failed:', err.message);
    await safeSend(chatId, t('privacy.error', lang));
  }
}

// v0.57.23: /legal — disclaimer, jurisdiction notes, builder credit.
// Hidden command: bot.onText handler exists but NOT in setMyCommands
// (same pattern as /ver). Discoverable via /help text.
async function runLegalCommand(chatId) {
  try {
    const text = [
      '🔖 *Legal & disclaimer*',
      '',
      'Results are sourced from public APIs, authorised APIs and may be inaccurate or outdated. They do not constitute professional advice. The builder accepts no liability for decisions made based on these outputs.',
      '',
      'Singapore — governed by Singapore law. Aligns with IMDA Model AI Governance Framework. See /privacy for data handling.',
      '',
      'No automated decisions made about individuals.',
      '',
      'Built by Adrian K. L. Ang · [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      'May 2026'
    ].join('\n');
    await safeSend(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (err) {
    console.error('[Error] /legal failed:', err.message);
    await safeSend(chatId, "Sorry, /legal hit an error. Try again in a moment.");
  }
}

// v0.57.25: /forgetme — self-service Redis erasure.
// v0.59.0: /language handler. Three behaviours:
//   /language          → inline keyboard (🇬🇧 / 🇫🇷)
//   /language fr|en    → set + ack
//   /language auto     → clear (revert to Telegram-locale heuristic)
async function runLanguageCommand(msg, arg) {
  const chatId = msg.chat.id;
  const { setUserLang, getUserLang } = require('./user-prefs');
  const { t, tn } = require('./i18n');
  if (arg === 'auto') {
    if (redis?.isOpen) {
      try { await redis.del(`user:${chatId}:lang`); } catch { /* noop */ }
    }
    const tgLang = String(msg.from?.language_code || '').slice(0, 2).toLowerCase();
    const ackLang = ['en','fr'].includes(tgLang) ? tgLang : 'en';
    await safeSend(chatId, t('language.cleared', ackLang));
    return;
  }
  if (arg === 'fr' || arg === 'en') {
    await setUserLang(redis, chatId, arg);
    await safeSend(chatId, t(arg === 'fr' ? 'bot.lang.set.fr' : 'bot.lang.set.en', arg));
    return;
  }
  // No arg → inline keyboard. Show current pref alongside.
  const current = await getUserLang(redis, chatId);
  const tgLang = String(msg.from?.language_code || '').slice(0, 2).toLowerCase();
  const display = current || (['en','fr'].includes(tgLang) ? tgLang : 'en');
  const fromTg = current ? '' : t('language.fromTg', display);
  const promptText = tn('language.current', display, { fromTg });
  await bot.sendMessage(chatId, promptText, {
    reply_markup: {
      inline_keyboard: [[
        { text: t('language.btn.en', display), callback_data: 'language:set:en' },
        { text: t('language.btn.fr', display), callback_data: 'language:set:fr' }
      ]]
    }
  });
}

async function runForgetMeCommand(chatId, lang = 'en') {
  const { t, tn } = require('./i18n');
  try {
    const { forgetUserData } = require('./user-data');
    const { deleted, keys } = await forgetUserData(redis, chatId);
    if (!deleted) {
      await safeSend(chatId, t('forgetme.nothing', lang));
      return;
    }
    const headerKey = deleted === 1 ? 'forgetme.eraseHeader' : 'forgetme.eraseHeaderMany';
    const lines = [
      tn(headerKey, lang, { n: deleted }),
      '',
      t('forgetme.wiped', lang),
      ...keys.slice(0, 8).map((k) => `• \`${k.replace(/^([^:]+:[a-f0-9]{4}).*$/, '$1…')}\``),
      keys.length > 8 ? tn('forgetme.andMore', lang, { n: keys.length - 8 }) : null,
      '',
      t('forgetme.followup', lang)
    ].filter(Boolean);
    await safeSend(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Error] /forgetme failed:', err.message);
    await safeSend(chatId, t('forgetme.error', lang));
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
      "I heard you, but that doesn't sound like a Singapore dining, transport, parking, or weather question I can help with. Try asking about a cuisine, a venue, a hawker centre, or a meal.");
  } catch (err) {
    console.error('[Voice] handler failed:', err.message);
    await safeSend(msg.chat.id, "Sorry, voice handling hit an error.");
  }
});

bot.on('message', async (msg) => {
  try {
    // v0.57.25: refresh the 90-day TTL on persistent buddy-blocks
    // entry (the only per-chat key that doesn't otherwise expire).
    // No-op for users without a block-list. /privacy advertises this
    // 90-day inactivity auto-purge so the data-retention claim is real.
    try {
      const { touchActivity } = require('./user-data');
      await touchActivity(redis, msg.chat.id);
    } catch { /* best-effort */ }

    // (1) Menu tile tap — TMA called tg.sendData(JSON.stringify({cmd, type})).
    if (msg.web_app_data?.data) {
      // v0.26.3: log every web_app_data inbound so the Railway console
      // shows the full simulation trace per the bridge-audit spec.
      const rawPreview = String(msg.web_app_data.data).slice(0, 240);
      console.log(`[Cuisine-Diag] D730 web_app_data inbound chat=${msg.chat.id} bytes=${msg.web_app_data.data.length} preview=${rawPreview}`);
      try {
        const payload = JSON.parse(msg.web_app_data.data);
        console.log(`[Cuisine-Diag] D731 web_app_data parsed cmd=${payload?.cmd}`);
        const { resolveLang } = require('./user-prefs');
        const wadLang = await resolveLang(redis, msg.chat.id, msg);
        const handled = await routeMenuCommand(msg.chat.id, payload?.cmd, payload, wadLang);
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
      } else if (resolved?.kind === 'hidden') {
        // v0.58.28: re-anchor and re-invoke /hidden. setUserLocation
        // above already cached place.lat/place.lng so the next
        // ensureFreshLocationOrPrompt call will hit it.
        await runSurpriseCommand(msg.chat.id);
      } else {
        await runFlow(msg.chat.id, place.lat, place.lng, resolved?.category || 'food');
      }
      return;
    }

    // v0.58.27: noise guard for free-text router. Per Human Lead:
    // "Every time I type something, the bot shows 5 restaurants and
    // ends with buddy help. This is no good — it doesn't validate
    // what the user typed." The v0.57.27 design ("LLM-free, no
    // gatekeeper") accepted any non-command text as a place query.
    // We add a deterministic, latency-free guard:
    //   • min 3 chars after trim
    //   • reject pure emoji / pure punctuation / pure digits
    //   • reject common chat-noise words ("hi", "ok", "thanks", etc.)
    // Borderline real food terms ("kfc", "thai", "pho") still pass
    // — they're 3+ alpha chars and not on the denylist.
    if (!looksLikePlaceQuery(text)) {
      console.log(`[free-text] noise-guard skipped: "${text.slice(0, 40)}"`);
      return;
    }
    // v0.57.27: free-text search is now LLM-free. Per Human Lead, all
    // chat-text queries route directly to Google Places searchText
    // (via pipeline.discover) with no NL classification, no off-topic
    // gatekeeper, no Claude ranking/narration. The user's verbatim
    // text becomes the searchText query. Saves ~3 LLM calls per
    // free-text message; deterministic results.
    // v0.58.55 / v0.59.0: resolveLang prefers the explicit /language
    // pref in Redis, falls back to Telegram's user.language_code.
    const { resolveLang } = require('./user-prefs');
    const userLang = await resolveLang(redis, msg.chat.id, msg);
    await runFreeTextSearch(msg.chat.id, text, { lang: userLang });
  } catch (err) {
    console.error('[Error] free-text handler failed:', err.message);
  }
});

// v0.58.27: heuristic gate for free-text → place search. Returns
// false on chat noise (greetings, single emojis, pure punctuation,
// obvious typos under 3 chars). Returns true on plausible food/place
// queries. Cheap and synchronous — runs before the Google Places
// call and avoids a costly search + buddy-footer reply for "hi".
const FREE_TEXT_NOISE = new Set([
  'hi', 'hey', 'yo', 'hello', 'hola', 'sup', 'oi',
  'ok', 'okay', 'k', 'kk', 'cool', 'nice', 'good',
  'thanks', 'thx', 'ty', 'cheers', 'lol', 'lmao', 'haha', 'hahaha',
  'yes', 'yeah', 'yep', 'ya', 'no', 'nope', 'nah',
  'wow', 'omg', 'wtf',
  'test', 'testing', 'ping',
  'help', 'menu', 'start',
  'bye', 'goodbye', 'night', 'morning',
  'sorry', 'pls', 'please'
]);
function looksLikePlaceQuery(text) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  // Pure emoji/symbol — no letters or digits.
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return false;
  // Pure digits or pure punctuation.
  if (/^[\d\s\W]+$/.test(trimmed)) return false;
  // Single-word chat noise (case-insensitive).
  const lower = trimmed.toLowerCase();
  if (FREE_TEXT_NOISE.has(lower)) return false;
  // "hi!", "ok.", "thanks!!" — strip trailing punctuation and re-check.
  const stripped = lower.replace(/[\s\W]+$/u, '');
  if (FREE_TEXT_NOISE.has(stripped)) return false;
  return true;
}

// v0.57.27 — direct Google Places searchText for free chat text.
// No LLM. No classifier. No gatekeeper. The user's verbatim text is
// the searchText query. Returns up to 12 venues filtered to SG with
// haversine distance attached.
async function runFreeTextSearch(chatId, text, opts = {}) {
  // v0.58.55: opts.lang ('en' | 'fr') threads through deliverPicks so
  // chat replies render in the user's locale. Caller (msg handler)
  // should pass msg.from?.language_code mapped to a supported locale.
  const ftLang = (typeof opts.lang === 'string' && ['en','fr'].includes(opts.lang)) ? opts.lang : 'en';
  try {
    if (await isProcessing(redis, chatId)) {
      await safeSend(chatId, '⏳ Gia is still working on your last request — hold on a moment.');
      return;
    }
    const { t: trBot, tn: trnBot } = require('./i18n');
    const cached = await getUserLocation(redis, chatId);
    if (!cached) {
      // No location yet — store the verbatim text as a pending free-text
      // search, then prompt for location. When location lands the
      // location-handler resumes via the pending-meal path.
      await setPendingMeal(redis, chatId, `freetext:${text.slice(0, 200)}`);
      await bot.sendMessage(chatId, trBot('bot.location.share', ftLang), LOCATION_REQUEST_KEYBOARD);
      return;
    }
    await setProcessing(redis, chatId);
    try {
      const pipeline = require('./pipeline');
      const { filterFreeTextResults } = require('./free-text-search');
      const candidates = await pipeline.discover({
        lat: cached.lat,
        lng: cached.lng,
        cuisines: [text],
        radius: 50000,
        maxResults: 12,
        regionCode: 'SG',
        lang: ftLang                                       // v0.59.0
      });
      const venues = filterFreeTextResults(candidates, cached);
      if (!venues.length) {
        await safeSend(chatId, trnBot('bot.noresults', ftLang, { q: text }));
        return;
      }
      // v0.58.52: enrich each venue with TRANSIT + DRIVE minutes so
      // deliverPicks's T1/T3 templates can render the 🚊/🚘 row.
      // Best-effort: failures don't block delivery.
      try {
        const { enrichTravelTimes } = require('./travel-times');
        await enrichTravelTimes(cached.lat, cached.lng, venues);
      } catch (err) {
        console.warn('[free-text] travel-times enrichment failed:', err.message);
      }
      // v0.59.0: real per-venue footfall via BestTime (best-effort,
      // dormant when BESTTIME_API_KEY is unset).
      try {
        const { attachFootfallSignals } = require('./footfall-signal');
        await attachFootfallSignals(redis, venues);
      } catch (err) {
        console.warn('[free-text] footfall enrichment failed:', err.message);
      }
      const headerLabel = ftLang === 'fr'
        ? `🔎 Résultats pour "${text}"`
        : `🔎 Results for "${text}"`;
      await deliverPicks(chatId, headerLabel, venues, { lang: ftLang });
    } finally {
      await clearProcessing(redis, chatId).catch(() => {});
    }
  } catch (err) {
    console.error('[Error] free-text search failed:', err.message);
    const { t: trBotErr } = require('./i18n');
    await safeSend(chatId, trBotErr('bot.error.freetext', ftLang));
  }
}

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
      await safeSend(chatId, "Gia couldn't find sanctuary picks matching that. Try /cuisine for the full picker, or /hidden for a hidden gem.");
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
    // v0.59.0: per-locale command lists. Telegram's setMyCommands
    // accepts a `language_code` so French users see French descriptions
    // in the slash-menu hint. Default (no language_code) covers EN.
    const enCommands = [
      { command: 'cuisine',    description: 'Cuisine Picker >70 choices' },
      { command: 'hidden',     description: 'Up to 5 hidden gems 1.5–3 km away' },
      { command: 'weather',    description: 'Now + 2-hour NEA forecast' },
      { command: 'transport',  description: 'Bus, MRT trains, Walk or Drive' },
      { command: 'hawker',     description: '>100 Hawker Centres' },
      { command: 'recognised', description: 'Michelin, Bib Gourmand (under $45), Asia 50/100, local produce' },
      { command: 'carpark',    description: 'Nearest 5 carparks with available lots' },
      { command: 'location',   description: 'Set your locale by typing a place name' },
      { command: 'language',   description: 'Switch chat language (English / Français)' },
      { command: 'buddy',      description: 'Live solo-dining match: /buddy on/off/status/block/report' },
      { command: 'share',      description: 'Forward recent pick' },
      { command: 'privacy',    description: 'Data, retention & sources' },
      { command: 'forgetme',   description: 'Erase your stored data' }
    ];
    const frCommands = [
      { command: 'cuisine',    description: 'Sélecteur de cuisine — plus de 70 choix' },
      { command: 'hidden',     description: 'Jusqu’à 5 trouvailles cachées à 1,5–3 km' },
      { command: 'weather',    description: 'Météo NEA — actuelle + prévision 2 h' },
      { command: 'transport',  description: 'Bus, MRT, marche ou voiture' },
      { command: 'hawker',     description: 'Plus de 100 Hawker Centres' },
      { command: 'recognised', description: 'Michelin, Bib Gourmand (moins de 45 $), Asia 50/100, produits locaux' },
      { command: 'carpark',    description: 'Les 5 parkings les plus proches' },
      { command: 'location',   description: 'Définir votre lieu par son nom' },
      { command: 'language',   description: 'Changer la langue (Français / English)' },
      { command: 'buddy',      description: 'Match solo en direct : /buddy on/off/status/block/report' },
      { command: 'share',      description: 'Partager un choix récent' },
      { command: 'privacy',    description: 'Données, conservation et sources' },
      { command: 'forgetme',   description: 'Effacer vos données enregistrées' }
    ];
    await bot.setMyCommands(enCommands);
    await bot.setMyCommands(frCommands, { language_code: 'fr' });

    // v0.59.6: setMyDescription — the body shown above the command list
    // when a user opens the empty chat with the bot ("What can this bot
    // do?"). 512-char limit per Telegram. EN default + FR via
    // language_code='fr'. Per Human Lead 2026-05-06 — refresh from the
    // pre-v0.58.55 EN-only text and add a FR variant.
    const enDescription =
      "This is a breakfast, lunch & dining concierge service.\n\n" +
      "/cuisine — 70+ cuisines (SG + Johor Bahru)\n" +
      "/hidden — 5 new places to try 1.5–3 km away\n" +
      "/hawker — >100 hawker centres (2025)\n" +
      "/recognised — Michelin, Bib Gourmand, Asia 50/100\n" +
      "/transport — bus, train, drive, traffic\n" +
      "/carpark — nearest 5 carparks\n" +
      "/weather, /buddy, /share, /language, /privacy, /legal\n\n" +
      "Free to use. Quirks welcome. Foodie.";
    const frDescription =
      "Conciergerie petit-déjeuner, déjeuner & dîner.\n\n" +
      "/cuisine — 70+ cuisines (SG + Johor Bahru)\n" +
      "/hidden — 5 trouvailles à 1,5–3 km\n" +
      "/hawker — plus de 100 hawker centres (2025)\n" +
      "/recognised — Michelin, Bib Gourmand, Asia 50/100\n" +
      "/transport — bus, métro, voiture, trafic\n" +
      "/carpark — 5 parkings les plus proches\n" +
      "/weather, /buddy, /share, /language, /privacy, /legal\n\n" +
      "Gratuit. Curiosités bienvenues. Foodie.";
    // v0.59.8 (Codex review #212): node-telegram-bot-api signature is
    // setMyDescription(form = {}) — a single options object, NOT
    // (text, options). The v0.59.6 calls passed the text positionally
    // and were silently failing on the upstream Telegram API, which is
    // why the description never updated despite the deploy. Same bug
    // applied to setMyShortDescription. Both fixed below.
    try {
      await bot.setMyDescription({ description: enDescription });
      await bot.setMyDescription({ description: frDescription, language_code: 'fr' });
    } catch (err) {
      console.warn('[setMyDescription] failed (non-fatal):', err.message);
    }

    // v0.59.8: setMyShortDescription — the "About" blurb shown on the
    // bot's profile page and in share / forward previews. 120-char limit
    // per Telegram. EN default + FR via language_code='fr'.
    const enShortDescription =
      "Singapore breakfast/lunch/dining concierge — cuisines, hawkers, transport, weather. Free to use.";
    const frShortDescription =
      "Conciergerie petit-déj/déjeuner/dîner à Singapour — cuisines, hawkers, transports, météo. Gratuit.";
    try {
      await bot.setMyShortDescription({ short_description: enShortDescription });
      await bot.setMyShortDescription({ short_description: frShortDescription, language_code: 'fr' });
    } catch (err) {
      console.warn('[setMyShortDescription] failed (non-fatal):', err.message);
    }
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
    // v0.57.28: defensive deleteWebHook before setWebHook. Wipes
    // Telegram's prior webhook state (URL + secret_token) so a fresh
    // setWebHook lands clean. Protects against the secret-drift case
    // we hit on the v0.57.27 deploy: Telegram retained a stale
    // secret_token from a previous deploy, the bot's runtime secret
    // had rotated (random per-restart when TELEGRAM_WEBHOOK_SECRET
    // env var was unset), and every delivery 401'd. delete is a
    // no-op when no webhook exists; safe to call unconditionally.
    try {
      await bot.deleteWebHook({ drop_pending_updates: true });
    } catch (err) {
      console.warn('[Updates] deleteWebHook failed (non-fatal):', err.message);
    }
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

    // v0.59.10: hosted privacy policy page. Same content as the
    // chat-side /privacy command — both render from i18n.privacy.body.
    // Single source of truth, locale-aware via ?lang=fr (default 'en').
    // BotFather's "Privacy Policy URL" field accepts this URL.
    app.get('/privacy', (req, res) => {
      try {
        const { tn, pickLang } = require('./i18n');
        const { renderPrivacyPage } = require('./privacy-html');
        const lang = pickLang(req.query?.lang);
        const operator = process.env.OPERATOR_LINKEDIN
          ? `\n\nOperator: ${process.env.OPERATOR_LINKEDIN}`
          : '';
        const body = tn('privacy.body', lang, { operator });
        const html = renderPrivacyPage(body, lang);
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300'); // 5 min — flips with i18n updates on next deploy
        res.send(html);
      } catch (err) {
        console.error('[/privacy http] failed:', err.message);
        res.status(500).send('Privacy page failed to render.');
      }
    });

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

    // v0.57.32: "Copy all to chat" — TMA POSTs the current result list,
    // server authenticates via initData (HMAC-signed by the bot token),
    // builds a single map URL for all pins, and sends it to the user's
    // chat via bot.sendMessage. Replaces the v0.57.31 tg.sendData
    // approach which was silently dropped because the cuisine TMA is
    // launched from an inline keyboard (sendData only works for
    // keyboard-button TMAs).
    //
    // v0.57.33: switched the multi-pin URL from a Google Maps
    // directions URL to soleat's own /app/map (buildMapHashUrl).
    // Google Maps consumer URLs cannot display arbitrary pins without
    // computing a route between them — for 7 walking waypoints that's
    // a multi-second compute that hangs Maps on tap. Our /app/map is a
    // multi-marker TMA that renders all pins instantly, no routing.
    // For the 1-venue case we still use a direct Google Maps place
    // link (instant, native experience).
    app.post('/api/cuisine/copy-all', async (req, res) => {
      try {
        const verified = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        if (!verified?.user?.id) {
          return res.status(401).json({ error: 'invalid initData' });
        }
        const chatId = verified.user.id;
        const incoming = Array.isArray(req.body?.venues) ? req.body.venues : [];
        // v0.58.55 / v0.59.0: prefer the body's lang (TMA toggle is
        // freshest), fall back to the Redis /language pref, then 'en'.
        const { resolveLang } = require('./user-prefs');
        const bodyLang = (typeof req.body?.lang === 'string' && ['en','fr'].includes(req.body.lang)) ? req.body.lang : null;
        const reqLang = bodyLang || await resolveLang(redis, chatId, null);
        const slim = incoming
          .filter((v) => v && (v.placeId || (Number.isFinite(v.lat) && Number.isFinite(v.lng))))
          // v0.59.23 (Codex #228 P2): 12 → 16, matches /cuisine
          // result-list cap (band 8-16). Without this bump,
          // searches returning 13-16 venues silently dropped cards
          // 13-16 from the copied chat message.
          .slice(0, 16);
        if (!slim.length) {
          return res.status(400).json({ error: 'no venues' });
        }
        const { googleMapsUrl, buildMapHashUrl } = require('./maps-url');
        const { formatVenueBlock } = require('./venue-templates');
        const { tn: trn } = require('./i18n');
        const header = slim.length === 1
          ? trn('pick.header.one', reqLang)
          : trn('pick.header.many', reqLang, { n: slim.length });
        // v0.58.50: T2 detail template per venue — name bold / address /
        // hours / website / phone / stats with distance / order / Maps URL.
        // v0.58.55: pass lang so static labels render FR for FR users.
        const blocks = slim.map((v) => formatVenueBlock(v, {
          variant: 'detail',
          googleMapsUrl,
          lang: reqLang
        })).filter(Boolean);
        // v0.58.51: two blank lines between picks for breathing room;
        // collapse to one when only a single venue is in the clip.
        const blockSep = blocks.length > 1 ? '\n\n\n' : '\n\n';
        const body = `${header}\n\n${blocks.join(blockSep)}`;
        if (slim.length === 1) {
          await bot.sendMessage(chatId, body, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
          });
        } else {
          // Multi-pin: keep the inline-keyboard map buttons for the
          // multi-marker TMA view (separate from the inline URLs in body).
          const mapUrl = buildMapHashUrl(slim, { webhookDomain });
          if (!mapUrl) return res.status(500).json({ error: 'could not build map URL' });
          await bot.sendMessage(chatId, body, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🗺️ View all on map', web_app: { url: mapUrl } }],
                [{ text: '🔗 Open in browser', url: mapUrl }]
              ]
            }
          });
        }
        res.json({ ok: true, count: slim.length });
      } catch (err) {
        console.error('[Error] /api/cuisine/copy-all failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.58.50: per-card "📋 Copy" button — TMA POSTs ONE venue, the
    // server builds a T1 detail-with-sanctuary block (full address +
    // hours + website + phone + sanctuary read + stats + order + URL)
    // and bot.sendMessage to the user's chat. Mirrors the rich free-
    // text reply format so the recipient gets the same depth of
    // detail as a chat-text search result.
    app.post('/api/cuisine/copy-one', async (req, res) => {
      try {
        const verified = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        if (!verified?.user?.id) return res.status(401).json({ error: 'invalid initData' });
        const chatId = verified.user.id;
        const venue = req.body?.venue;
        if (!venue || (!venue.placeId && !venue.name)) {
          return res.status(400).json({ error: 'missing venue' });
        }
        // v0.58.55 / v0.59.0: prefer the body's venue.lang (TMA toggle),
        // fall back to the Redis /language pref, then 'en'.
        const { resolveLang } = require('./user-prefs');
        const venueLang = (typeof venue.lang === 'string' && ['en','fr'].includes(venue.lang)) ? venue.lang : null;
        const oneLang = venueLang || await resolveLang(redis, chatId, null);
        const { formatVenueBlock } = require('./venue-templates');
        const { googleMapsUrl } = require('./maps-url');
        // Best-effort sanctuary read fetch (cached in Redis 24h).
        let sanctuaryRead = '';
        if (venue.placeId) {
          try { sanctuaryRead = await getOrCacheSummary(redis, venue.placeId, oneLang) || ''; }
          catch { /* fall through; T1 will render without sanctuary section */ }
        }
        const body = formatVenueBlock(venue, {
          variant: 'detail-with-sanctuary',
          sanctuaryRead,
          googleMapsUrl,
          lang: oneLang
        });
        if (!body) return res.status(500).json({ error: 'could not format venue block' });
        await bot.sendMessage(chatId, body, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        res.json({ ok: true });
      } catch (err) {
        console.error('[Error] /api/cuisine/copy-one failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.58.4: warm-start. On TMA mount the picker calls this endpoint
    // to populate 5 random venues drawn from a pool weighted by one
    // of 5 rotating "criterion seeds". Each seed is a (queries, soft-
    // filter) tuple — the seed advances every 60 s so a fresh open
    // feels different without changing on every tap-spam.
    //
    // This is deliberately lighter than /api/cuisine/search: no Claude
    // rerank, no crowd signals, no dish extraction. The result list
    // is "here's something to look at while you decide" — clicking the
    // main 🔍 Search button runs the full enrichment pipeline.
    app.post('/api/cuisine/warm-start', async (req, res) => {
      try {
        const { lat, lng, region = 'SG', lang: langIn } = req.body || {};
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: 'missing lat/lng' });
        }
        // v0.59.0: thread the active locale into pipeline.discover so
        // Google Places returns FR weekday descriptions / generative
        // summaries when the TMA is in French.
        const verifiedW = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        const wsChatId = verifiedW?.user?.id ? String(verifiedW.user.id) : null;
        const { resolveLang } = require('./user-prefs');
        const wsBodyLang = (typeof langIn === 'string' && ['en','fr'].includes(langIn)) ? langIn : null;
        const wsLang = wsBodyLang || (wsChatId ? await resolveLang(redis, wsChatId, null) : 'en');
        const isJB = region === 'JB';
        const JB_CBD = { lat: 1.4927, lng: 103.7414 };
        const searchCenter = isJB ? JB_CBD : { lat, lng };
        const searchRadius = isJB ? 18000 : 50000;
        const searchRegionCode = isJB ? 'MY' : 'SG';
        // 5 rotating seeds. Halal/openNow/newlyOpened are the highest-
        // signal axes per Human Lead's brief; cheap-eats and popular
        // round out the variety. Queries are passed straight into
        // pipeline.discover's textQuery so we reuse the exact retrieval
        // path /api/cuisine/search uses for filter modifiers.
        const SEEDS = [
          { id: 'open-now-cheap',      queries: ['open now cheap eats restaurant'],   filters: { openNow: true, prices: ['$'] } },
          { id: 'newly-opened-halal',  queries: ['newly opened halal restaurant'],    filters: { halal: true, newlyOpened: true } },
          { id: 'highly-rated-nearby', queries: ['highly rated restaurants near me'], filters: {} },
          { id: 'open-now-popular',    queries: ['popular restaurants open now'],     filters: { openNow: true } },
          { id: 'newly-opened-radius', queries: ['newly opened restaurants'],         filters: { newlyOpened: true } }
        ];
        const seedIdx = Math.floor(Date.now() / 60000) % SEEDS.length;
        const seed = SEEDS[seedIdx];
        // v0.59.0: lang dimension. Different language venues come back
        // with localised weekday descriptions / generative summaries.
        const cacheKey = `cuisine:warmstart:v2:${region}:${lat.toFixed(3)}:${lng.toFixed(3)}:${seed.id}:${wsLang}`;
        try {
          if (redis.isOpen) {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ ...JSON.parse(cached), cached: true });
          }
        } catch (err) { console.warn('[WarmStart] cache read failed:', err.message); }

        const pipeline = require('./pipeline');
        const candidates = await pipeline.discover({
          lat: searchCenter.lat, lng: searchCenter.lng,
          radius: searchRadius,
          cuisines: seed.queries,
          maxResults: 30,
          regionCode: searchRegionCode,
          lang: wsLang                                     // v0.59.0
        });
        let venues = Array.isArray(candidates) ? candidates : (candidates?.venues || []);

        // v0.58.31: shared filter — drops non-food types AND
        // multi-tenant building names (Lau Pa Sat, Maxwell Food Centre,
        // SAFRA, etc.) so warm-start matches /api/cuisine/search and
        // /api/cuisine/warm-start cannot drift apart.
        const venueFilters = require('./venue-filters');
        venues = venues.filter(venueFilters.passesVenueFilter);

        if (seed.filters.openNow) venues = venues.filter((v) => v.openNow !== false);
        if (seed.filters.newlyOpened) {
          venues = venues.filter((v) => v.userRatingCount == null || v.userRatingCount <= 150);
        }
        if (seed.filters.prices?.length) {
          const allowed = new Set(seed.filters.prices.map((p) => p.length));
          venues = venues.filter((v) => v.priceLevel == null || allowed.has(v.priceLevel));
        }

        // Rating-rank, then pick 5 random from the top 15 via a
        // truncated Fisher–Yates shuffle. Top-15 keeps quality high;
        // the random sample inside that pool is what makes successive
        // opens feel fresh.
        function pickTopFive(list) {
          const sorted = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
          const pool = sorted.slice(0, 15);
          const shuf = [...pool];
          for (let i = shuf.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuf[i], shuf[j]] = [shuf[j], shuf[i]];
          }
          return shuf.slice(0, 5);
        }
        let top = pickTopFive(venues);
        let resolvedSeed = seed.id;

        // v0.58.16: fallback. When a narrow seed (e.g. newly-opened-
        // halal) leaves us with < 3 venues post-filter, fetch a
        // generic "highly rated restaurants" pool so the picker
        // never opens with an empty / one-item list.
        if (top.length < 3 && seed.id !== 'highly-rated-nearby') {
          try {
            const fallback = await pipeline.discover({
              lat: searchCenter.lat, lng: searchCenter.lng,
              radius: searchRadius,
              cuisines: ['highly rated restaurants near me'],
              maxResults: 30,
              regionCode: searchRegionCode,
              lang: wsLang                                 // v0.59.0
            });
            const fbVenues = (Array.isArray(fallback) ? fallback : (fallback?.venues || []))
              .filter(venueFilters.passesVenueFilter);
            const fbTop = pickTopFive(fbVenues);
            if (fbTop.length > top.length) {
              top = fbTop;
              // Use the canonical highly-rated-nearby seed id so
              // FlipPanel's SEED_LABEL caption accurately reflects
              // what the user is seeing.
              resolvedSeed = 'highly-rated-nearby';
            }
          } catch (err) {
            console.warn('[WarmStart] fallback discover failed:', err.message);
          }
        }

        // v0.58.52: enrich each venue with TRANSIT + DRIVE minutes so
        // the cuisine TMA's MapPanel InfoWindow + result list can show
        // the 🚊/🚘 row. Best-effort.
        try {
          const { enrichTravelTimes } = require('./travel-times');
          await enrichTravelTimes(searchCenter.lat, searchCenter.lng, top);
        } catch (err) { console.warn('[WarmStart] travel-times failed:', err.message); }
        // v0.59.0: footfall enrichment (BestTime). Dormant without key.
        try {
          const { attachFootfallSignals } = require('./footfall-signal');
          await attachFootfallSignals(redis, top);
        } catch (err) { console.warn('[WarmStart] footfall failed:', err.message); }
        const payload = { venues: top, seed: resolvedSeed };
        try {
          if (redis.isOpen) await redis.setEx(cacheKey, 60, JSON.stringify(payload));
        } catch (err) { console.warn('[WarmStart] cache write failed:', err.message); }
        res.json({ ...payload, cached: false });
      } catch (err) {
        console.error('[Error] /api/cuisine/warm-start failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.58.7: place autocomplete proxy. The TMA's location field
    // calls this on every keystroke (debounced 250 ms). We forward
    // to Google Places API (New) Autocomplete and return a slim
    // suggestion list. The API key never leaves the server.
    //   • locationBias: 50 km circle around the user's lat/lng so
    //     "kall" surfaces "Kallang MRT" before "Kallang River".
    //   • includedRegionCodes: SG-only (or MY when region=JB).
    //   • Redis-cache 5 min per (input prefix, region, gridded
    //     lat/lng) to keep the per-keystroke calls cheap.
    app.post('/api/cuisine/place-autocomplete', async (req, res) => {
      try {
        const { input, lat, lng, region = 'SG' } = req.body || {};
        if (!input || typeof input !== 'string' || input.trim().length < 2) {
          return res.json({ suggestions: [] });
        }
        const cleanInput = input.trim().slice(0, 80).toLowerCase();
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY unset' });
        const gLat = Number.isFinite(lat) ? lat.toFixed(2) : 'x';
        const gLng = Number.isFinite(lng) ? lng.toFixed(2) : 'x';
        const cacheKey = `placeauto:v1:${region}:${gLat}:${gLng}:${cleanInput}`;
        try {
          if (redis.isOpen) {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ ...JSON.parse(cached), cached: true });
          }
        } catch (err) { console.warn('[PlaceAuto] cache read failed:', err.message); }

        const body = {
          input: cleanInput,
          languageCode: 'en',
          regionCode: region === 'JB' ? 'MY' : 'SG',
          includedRegionCodes: region === 'JB' ? ['MY'] : ['SG']
        };
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          body.locationBias = {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 50000
            }
          };
        }
        const axios = require('axios');
        const { data } = await axios.post(
          'https://places.googleapis.com/v1/places:autocomplete',
          body,
          {
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
            timeout: 5000
          }
        );
        const suggestions = (data?.suggestions || [])
          .map((s) => {
            const p = s.placePrediction;
            if (!p?.placeId) return null;
            return {
              placeId: p.placeId,
              primaryText: p.structuredFormat?.mainText?.text || p.text?.text || '',
              secondaryText: p.structuredFormat?.secondaryText?.text || ''
            };
          })
          .filter(Boolean)
          .slice(0, 5);
        const payload = { suggestions };
        try {
          if (redis.isOpen) await redis.setEx(cacheKey, 5 * 60, JSON.stringify(payload));
        } catch (err) { console.warn('[PlaceAuto] cache write failed:', err.message); }
        res.json({ ...payload, cached: false });
      } catch (err) {
        console.error('[Error] /api/cuisine/place-autocomplete failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.58.7: resolve a picked autocomplete suggestion to lat/lng.
    // Calls Google Place Details (New) for the placeId and returns
    // the coords + display name + formatted address. Cached 24 h
    // because place coordinates don't move.
    app.post('/api/cuisine/place-resolve', async (req, res) => {
      try {
        const { placeId } = req.body || {};
        if (!placeId || typeof placeId !== 'string' || placeId.length > 200) {
          return res.status(400).json({ error: 'placeId required' });
        }
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY unset' });
        const cacheKey = `placeresolve:v1:${placeId}`;
        try {
          if (redis.isOpen) {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ ...JSON.parse(cached), cached: true });
          }
        } catch (err) { console.warn('[PlaceResolve] cache read failed:', err.message); }

        const axios = require('axios');
        const { data } = await axios.get(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
          {
            headers: {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'id,displayName,location,formattedAddress'
            },
            timeout: 5000
          }
        );
        if (!data?.location) {
          return res.status(404).json({ error: 'no coords for placeId' });
        }
        const payload = {
          placeId: data.id,
          lat: data.location.latitude,
          lng: data.location.longitude,
          name: data.displayName?.text || '',
          formatted: data.formattedAddress || ''
        };
        try {
          if (redis.isOpen) await redis.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(payload));
        } catch (err) { console.warn('[PlaceResolve] cache write failed:', err.message); }
        res.json({ ...payload, cached: false });
      } catch (err) {
        console.error('[Error] /api/cuisine/place-resolve failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.58.20: fetch the bot's Redis-cached location for the current
    // user (set via /location <place> or a shared location pin). The
    // cuisine TMA falls back to this when navigator.geolocation
    // times out or the user dismissed the permission prompt, so the
    // picker doesn't sit on an empty list waiting for a coordinate
    // that's never coming.
    // v0.58.21: only return cached locations that are ≤ 30 minutes
    // old. The Redis store keeps a 24-hour TTL for other flows, but
    // anchoring cuisine searches to a 14-hour-old pin produces
    // results from the wrong neighbourhood. Stale = 404 → TMA falls
    // through to SG centroid (or fresh re-prompt).
    const CUISINE_LOC_FRESH_MS = 30 * 60 * 1000;
    // v0.59.0: TMA <-> chat language sync. POST sets the per-user
    // preference (mirroring `/language fr|en`); GET reads it. Both
    // gated by initData. The TMA's `useLocale()` hook calls GET on
    // mount and POST when the user taps the EN/FR flag toggle, so
    // toggling in the TMA also flips chat replies and vice versa.
    app.post('/api/cuisine/user-language', async (req, res) => {
      try {
        const verified = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        if (!verified) return res.status(401).json({ error: 'invalid initData' });
        const userId = verified.user?.id;
        if (!userId) return res.status(400).json({ error: 'no user id' });
        const reqLang = String(req.body?.lang || '').slice(0, 2).toLowerCase();
        if (!['en', 'fr'].includes(reqLang)) {
          return res.status(400).json({ error: 'lang must be en or fr' });
        }
        const { setUserLang } = require('./user-prefs');
        const saved = await setUserLang(redis, String(userId), reqLang);
        if (!saved) return res.status(500).json({ error: 'redis write failed' });
        res.json({ lang: saved });
      } catch (err) {
        console.error('[Error] POST /api/cuisine/user-language failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });
    app.get('/api/cuisine/user-language', async (req, res) => {
      try {
        const initStr = req.headers['x-telegram-init-data'] || '';
        const verified = verifyInitData(initStr, process.env.TELEGRAM_BOT_TOKEN);
        if (!verified) return res.status(401).json({ error: 'invalid initData' });
        const userId = verified.user?.id;
        if (!userId) return res.status(400).json({ error: 'no user id' });
        const { getUserLang } = require('./user-prefs');
        const explicit = await getUserLang(redis, String(userId));
        // Return the explicit pref OR null so the TMA can fall back to
        // its localStorage / Telegram-locale heuristic locally.
        res.json({ lang: explicit });
      } catch (err) {
        console.error('[Error] GET /api/cuisine/user-language failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/cuisine/user-location', async (req, res) => {
      try {
        const verified = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        if (!verified) return res.status(401).json({ error: 'invalid initData' });
        const userId = verified.user?.id;
        if (!userId) return res.status(400).json({ error: 'no user id' });
        const cached = await getUserLocation(redis, String(userId));
        if (!cached?.lat || !cached?.lng) {
          return res.status(404).json({ error: 'no cached location' });
        }
        const ageMs = cached.setAt ? Date.now() - cached.setAt : Infinity;
        if (ageMs > CUISINE_LOC_FRESH_MS) {
          return res.status(404).json({
            error: 'cached location stale',
            ageMinutes: Math.floor(ageMs / 60000),
            maxAgeMinutes: Math.floor(CUISINE_LOC_FRESH_MS / 60000)
          });
        }
        res.json({ lat: cached.lat, lng: cached.lng, setAt: cached.setAt || null });
      } catch (err) {
        console.error('[Error] /api/cuisine/user-location failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // v0.58.10: copy-syntax — emit a re-runnable /cuisine command
    // built from the current TMA state. Mirrors /api/cuisine/copy-all
    // (auth via initData → sends to the user's chat). The recipient
    // can paste the command into any chat with @soleat_bot to relaunch
    // the picker with the same cuisines / filters / prices / location
    // / radius pre-applied.
    //
    // Format example:
    //   /cuisine thai japanese halal openNow $$ @Raffles_Place radius:5
    app.post('/api/cuisine/copy-syntax', async (req, res) => {
      try {
        const verified = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        if (!verified) return res.status(401).json({ error: 'invalid initData' });
        const chatId = verified.user?.id;
        if (!chatId) return res.status(400).json({ error: 'no chat id' });
        const { cuisines = [], filters = {}, prices = [], radius, region = 'SG', location, lang: langIn } = req.body || {};
        // v0.58.55 / v0.59.0: prefer the body's lang (TMA toggle),
        // fall back to the Redis /language pref, then 'en'.
        const { resolveLang } = require('./user-prefs');
        const synBodyLang = (typeof langIn === 'string' && ['en','fr'].includes(langIn)) ? langIn : null;
        const synLang = synBodyLang || await resolveLang(redis, chatId, null);

        const cv = require('./cuisines-vault');
        const validSlugs = new Set(cv.getAllCuisines().map((c) => c.slug));
        const tokens = [];
        for (const c of (Array.isArray(cuisines) ? cuisines : []).slice(0, 5)) {
          const slug = String(c).toLowerCase().replace(/[^a-z0-9-]/g, '');
          if (slug && validSlugs.has(slug)) tokens.push(slug);
        }
        // Filter flags — only emit ones that are ON (the LLM reader
        // and the bot tokeniser both treat absence as "off").
        for (const f of ['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased']) {
          if (filters?.[f]) tokens.push(f);
        }
        // Prices — collapse to the highest tier the user picked. The
        // server post-filter treats `$$` as "≤$$", so emitting the
        // max preserves the same semantics with one token.
        const priceList = Array.isArray(prices) ? prices : (Array.isArray(filters?.prices) ? filters.prices : []);
        const cleanPrices = priceList.filter((p) => /^\$+$/.test(p) && p.length >= 1 && p.length <= 3);
        if (cleanPrices.length) {
          cleanPrices.sort((a, b) => b.length - a.length);
          tokens.push(cleanPrices[0]);
        }
        // Location override (the LocationField pick or a Search-this-
        // area centre paired with a friendly label).
        if (location && typeof location.name === 'string' && location.name.trim()) {
          const safe = location.name.replace(/[^A-Za-z0-9 \-]/g, '').replace(/\s+/g, '_').slice(0, 40);
          if (safe) tokens.push(`@${safe}`);
        }
        // Radius: convert metres → km. Skip when missing or at
        // default so the command stays short.
        if (Number.isFinite(radius)) {
          const km = Math.round(radius / 1000);
          if (km >= 1 && km <= 100) tokens.push(`radius:${km}`);
        }
        if (region === 'JB') tokens.push('region:JB');

        // v0.58.41: allow bare `/cuisine` when no tokens. User reported
        // they couldn't copy a warm-start search (no cuisines/filters
        // set) — but the result list IS shareable; the recipient just
        // re-runs /cuisine and gets a fresh warm-start at their own
        // location. Previously we 400'd this case.
        const cmd = tokens.length ? `/cuisine ${tokens.join(' ')}`.trim() : '/cuisine';
        // HTML mode → wrap the command in <code> so Telegram styles it
        // as a tap-to-copy block. Escape only the angle-brackets / amp
        // / quote so accidental HTML in the friendly intro is safe.
        const intro = synLang === 'fr'
          ? '🔗 Commande cuisine réutilisable — touchez pour copier, collez dans n’importe quelle discussion avec @soleat_bot pour relancer cette recherche :'
          : '🔗 Re-runnable cuisine command — tap to copy, paste in any chat with @soleat_bot to relaunch this exact search:';
        const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        await bot.sendMessage(
          chatId,
          `${escape(intro)}\n\n<code>${escape(cmd)}</code>`,
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        res.json({ ok: true, cmd });
      } catch (err) {
        console.error('[Error] /api/cuisine/copy-syntax failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/cuisine/search', async (req, res) => {
      try {
        // v0.57.8: region toggle — "SG" (default) or "JB" (Johor Bahru
        // city only, not the whole state of Johor or Malaysia). For JB
        // the search centres on JB CBD with regionCode 'MY' + a hard
        // formattedAddress filter for "Johor Bahru".
        const { lat, lng, cuisines = [], filters = {}, region = 'SG', radius: clientRadius, lang: langIn } = req.body || {};
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: 'missing lat/lng' });
        }
        // v0.59.0: resolve active lang for this request — TMA body
        // first, then Redis /language pref, then 'en'.
        const verifiedSearch = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        const csChatId = verifiedSearch?.user?.id ? String(verifiedSearch.user.id) : null;
        const { resolveLang: resolveLangSearch } = require('./user-prefs');
        const csBodyLang = (typeof langIn === 'string' && ['en','fr'].includes(langIn)) ? langIn : null;
        const csLang = csBodyLang || (csChatId ? await resolveLangSearch(redis, csChatId, null) : 'en');
        // v0.58.26: reject {lat:0, lng:0} — the TMA had been firing
        // searches with uninitialised coords (Railway log evidence:
        // "center=0.0000,0.0000 radius=50000 → 0 candidates"). Zero
        // coordinates are in the Atlantic Ocean off West Africa, not
        // SG/JB. Treat as missing so the TMA can re-resolve.
        if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) {
          return res.status(400).json({ error: 'invalid lat/lng (zero)' });
        }
        // JB CBD centroid for the JB search; user's lat/lng still used
        // for distance ranking on the result side.
        const JB_CBD = { lat: 1.4927, lng: 103.7414 };
        const isJB = region === 'JB';
        const searchCenter = isJB ? JB_CBD : { lat, lng };
        // v0.58.8: client supplies a `radius` in metres from the
        // vertical slider on the map. Bounded 1000–100000. When
        // missing or out of range, fall back to the legacy region
        // defaults (50 km SG / 18 km JB).
        const DEFAULT_RADIUS = isJB ? 18000 : 50000;
        const searchRadius = (Number.isFinite(clientRadius) && clientRadius >= 1000 && clientRadius <= 100000)
          ? Math.round(clientRadius)
          : DEFAULT_RADIUS;
        const searchRegionCode = isJB ? 'MY' : 'SG';
        const cv = require('./cuisines-vault');
        const cuisineMetas = (cuisines || [])
          .slice(0, 5)
          .map((slug) => cv.findBySlug(slug))
          .filter(Boolean);
        const cuisineNames = cuisineMetas.map((c) => c.name);
        // v0.57.13: only gate non-local categories. Singapore common
        // food (SEA, China-regional, South Asian, Middle Eastern,
        // common-here) often has idiosyncratic restaurant names that
        // don't include the cuisine word — gating those would be too
        // aggressive. African / European / Americas cuisines are where
        // Google Places searchText falls back to arbitrary SG results
        // when the signal is weak.
        const GATED_CATEGORIES = new Set(['african', 'european', 'americas']);
        const gatedNames = cuisineMetas
          .filter((c) => GATED_CATEGORIES.has(c.categoryId))
          .map((c) => c.name);
        const allSelectedAreGated = cuisineMetas.length > 0
          && cuisineMetas.every((c) => GATED_CATEGORIES.has(c.categoryId));
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
        // v0.57.24: when Home-based is on, change the actual SEARCH
        // query, not just the post-filter. Google ranks home-kitchens
        // poorly under generic cuisine names — they self-identify as
        // "private dining" / "home-cooked" / "home-based meals" in
        // their listing names. Per Human Lead's screenshots: searches
        // for "Home based meals dine in" surface Lynnette's Kitchen
        // (Private Dining), Dine Inn, Kampong Bowl, Hock Shun
        // Home-Made — none of which would surface under "Italian"
        // or any cuisine search.
        //
        // Strategy:
        //   no cuisine selected → search ["private dining",
        //                                  "home-cooked meals",
        //                                  "home-based meals"]
        //   cuisine selected     → prefix each query with
        //                          "private dining home-cooked"
        if (filters.homeBased) {
          if (cuisineNames.length) {
            cuisineQueries = cuisineNames.map((n) =>
              `private dining home-cooked ${modifiers.join(' ')} ${n}`.replace(/\s+/g, ' ').trim()
            );
          } else {
            cuisineQueries = [
              'private dining',
              'home-cooked meals',
              'home-based meals'
            ];
          }
        }
        // v0.57.6: response cache keyed by selection state (rounded
        // location to ~110m so neighbours share the cache). 30-min TTL.
        // v0.57.8: region in the key so SG and JB results don't collide.
        // v0.58.8: include searchRadius in the cache key so 80 km and
        // 5 km searches at the same lat/lng don't collide.
        // v0.59.0: lang dimension added to the cache key — `:l${csLang}`.
        const cacheKey = `cuisine:search:v3:${region}:${lat.toFixed(3)}:${lng.toFixed(3)}:r${searchRadius}:` +
          `${cuisineQueries.join('|')}:` +
          `${[filters.newlyOpened ? 'n' : '', filters.openNow ? 'o' : '', filters.halal ? 'h' : '', filters.vegetarian ? 'v' : '', filters.homeBased ? 'b' : ''].join('')}:` +
          `${(filters.prices || []).join(',')}:l${csLang}`;
        // Codex review #224: when Singaporean is in the cuisines list,
        // skip the 30-min Redis cache so each call re-runs discover()
        // and rotates 2 fresh dish picks. Other cuisines keep their
        // cached results — only Singaporean bypasses.
        const skipCacheForSingaporean = require('./pipeline').containsSingaporeanCuisine(cuisineQueries);
        try {
          if (redis.isOpen && !skipCacheForSingaporean) {
            const cached = await redis.get(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              return res.json({ ...parsed, cached: true });
            }
          }
        } catch (err) { console.warn('[Cuisine-Search] cache read failed:', err.message); }
        const pipeline = require('./pipeline');
        // v0.59.3: instrument the search path so post-deploy "0
        // results" reports are diagnosable from the prod console.
        // Logs: incoming slug list, derived cuisineQueries, regionCode,
        // post-discover candidate count, post-NON_FOOD_TYPES count.
        console.log(`[Cuisine-Search] D700 incoming cuisines=${JSON.stringify(cuisines || [])} filters=${JSON.stringify(filters)} region=${region} center=${searchCenter.lat.toFixed(4)},${searchCenter.lng.toFixed(4)} radius=${searchRadius}`);
        console.log(`[Cuisine-Search] D701 cuisineQueries=${JSON.stringify(cuisineQueries)} cuisineMetas.length=${cuisineMetas.length} allSelectedAreGated=${allSelectedAreGated}`);

        // v0.59.26 — per-chatId Singaporean dish memory. When the user
        // picks Singaporean, draw 3 dishes that EXCLUDE the most-recent
        // 30 picks for THIS chatId so subsequent searches don't see
        // the same trio repeating. Falls back to the stateless picker
        // if redis is down or chatId isn't available.
        let cuisinesForDiscover = cuisineQueries;
        let skipExpand = false;
        if (pipeline.containsSingaporeanCuisine(cuisineQueries)) {
          try {
            const memoryPicks = await pipeline.pickSingaporeanDishesForChat({
              redis,
              chatId: verified?.user?.id,
              count: 3
            });
            if (Array.isArray(memoryPicks) && memoryPicks.length) {
              cuisinesForDiscover = [...cuisineQueries, ...memoryPicks];
              skipExpand = true;
              console.log(`[Cuisine-Search] D701b SG-memory picks=${JSON.stringify(memoryPicks)}`);
            }
          } catch (err) {
            console.warn('[Cuisine-Search] SG-memory pick failed; falling back to stateless:', err.message);
          }
        }

        const candidates = await pipeline.discover({
          lat: searchCenter.lat, lng: searchCenter.lng, radius: searchRadius,
          cuisines: cuisinesForDiscover, maxResults: 30, regionCode: searchRegionCode,
          lang: csLang,                                    // v0.59.0
          expandSingaporean: !skipExpand                   // v0.59.26
        });
        let venues = Array.isArray(candidates) ? candidates : (candidates?.venues || []);
        console.log(`[Cuisine-Search] D702 discover returned ${venues.length} candidates`);
        // v0.57.5: defensive deny-list — drop venues whose primaryType
        // says "this is lodging / a complex / a mall / etc." even when
        // Google's strictTypeFiltering on the search call missed them.
        // The screenshot bug had Amara Singapore (lodging) + Dempsey
        // Hill (point_of_interest) sneaking through.
        // v0.58.31: shared `passesVenueFilter` — also rejects multi-
        // tenant building names (Lau Pa Sat, Maxwell Food Centre, SAFRA,
        // etc.) so the user no longer sees the building when they want
        // a specific eatery. Stalls INSIDE these buildings still pass
        // because the regex is start-anchored.
        const venueFilters = require('./venue-filters');
        const beforeNonFood = venues.length;
        venues = venues.filter(venueFilters.passesVenueFilter);
        if (venues.length !== beforeNonFood) {
          console.log(`[Cuisine-Search] D703 venue-filter (type+name) ${beforeNonFood} → ${venues.length}`);
        }
        // v0.57.12: cuisine-name validation. Bug per Human Lead — when
        // a cuisine like "Ethiopian" was selected, Google Places
        // searchText with regionCode 'SG' returned arbitrary SG
        // restaurants ranked by some weak text-relevance signal
        // (Peranakan, Italian, Kampung Chicken, etc. — none Ethiopian).
        // Defense: post-fetch require the venue to match the selected
        // cuisine via primaryType OR name/address text.
        // v0.57.13: only fire the gate when EVERY selected cuisine is
        // in the African/European/Americas categories. SG common food
        // (SEA, China-regional, South Asian) has too many idiosyncratic
        // restaurant names for this gate to be reliable. If the user
        // mixes a gated + non-gated cuisine, we trust the upstream
        // results (any non-gated selection bypasses the gate).
        // v0.57.20: small-pool bypass. The gate exists to filter noise
        // when Places returns 30 unrelated SG results for a weak match
        // (e.g. "Italian" → arbitrary cafés). When Places only returns
        // ≤5 candidates, those ARE the cuisine match — gating them
        // produces empty results for rare cuisines (e.g. "Kenyan" →
        // Kafe Utu is the only venue, and its inline reviews may not
        // contain the cuisine word OR the curated dish keywords).
        const SMALL_POOL = 5;
        if (allSelectedAreGated && gatedNames.length && venues.length > SMALL_POOL) {
          venues = venues.filter((v) => {
            const reviewText = Array.isArray(v.reviews)
              ? v.reviews.map((r) => r?.text || '').join(' ')
              : '';
            const haystack = [
              v.name || '', v.area || '', v.primaryType || '',
              v.googleSummary?.overview || '',
              reviewText
            ].join(' ').toLowerCase();
            for (const name of gatedNames) {
              const lower = name.toLowerCase();
              if (haystack.includes(lower)) return true;
              const slugForType = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
              if (v.primaryType === `${slugForType}_restaurant`) return true;
              const words = lower.split(/\s+/).filter((w) => w.length >= 4);
              if (words.length >= 2 && words.every((w) => haystack.includes(w))) return true;
              const dishKeywords = require('./cuisine-dish-keywords').getDishKeywords(name);
              for (const kw of dishKeywords) {
                if (haystack.includes(kw)) return true;
              }
            }
            return false;
          });
        }
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
        // v0.57.8: 80 km hard gate from user location (covers SG +
        // adjacent JB even if user is in south SG). Plus, when JB is
        // selected, require formattedAddress to mention "Johor Bahru"
        // so we don't bleed into Iskandar / Kulai / KL hits that
        // regionCode 'MY' might rank.
        venues = venues.filter((v) => v.distanceM == null || v.distanceM <= 80000);
        if (isJB) {
          venues = venues.filter((v) => /johor bahru/i.test(`${v.area || ''} ${v.name || ''}`));
        } else {
          // SG only: post-filter by Singapore mention OR proximity
          // (some hawker centres' formattedAddress lacks "Singapore").
          venues = venues.filter((v) => {
            if (/singapore/i.test(`${v.area || ''} ${v.name || ''}`)) return true;
            // Within 30km of SG centroid still counts as SG even if
            // the address text is missing the country word.
            const SG = { lat: 1.3521, lng: 103.8198 };
            const distFromSG = haversine(SG, v);
            return distFromSG <= 30000;
          });
        }
        if (filters.openNow) venues = venues.filter((v) => v.openNow !== false);
        if (filters.prices?.length) {
          const allowed = new Set(filters.prices.map((p) => p.length));
          venues = venues.filter((v) => v.priceLevel == null || allowed.has(v.priceLevel));
        }
        // v0.57.16: "Home-based" filter — heuristic for HDB / condo
        // home-kitchens and takeaway-only operators that show up on
        // Google Maps. Positive signals (any one passes):
        //   - HDB-block address pattern (e.g. "Blk 234", "#03-12")
        //   - primaryType is meal_takeaway / meal_delivery
        // Caveat: catches Google-Maps-listed HBBs only; IG/WhatsApp-
        // only operators (Empress Family Feast, etc.) are not on
        // Google Maps and need a separate curated vault.
        if (filters.homeBased) {
          // v0.57.24: broaden the heuristic. SG home-kitchens
          // self-identify as "private dining" / "home cooked" /
          // "home-based" / "home meal" — match any of these in the
          // venue name OR address, in addition to HDB block patterns
          // and meal_takeaway / meal_delivery primary types. Order
          // matters for human readability but `.test` is OR so
          // ordering doesn't affect match outcome.
          const HBB_PATTERNS = /\bprivate dining\b|\bhome[-\s]?cook(ed|ing)?\b|\bhome[-\s]?based\b|\bhome[-\s]?meal(s)?\b|\bhouse[-\s]?based\b|\bblk\s*\d|#\d{2,3}-\d{2,3}|\bhdb\b/i;
          const HBB_TYPES = new Set(['meal_takeaway', 'meal_delivery']);
          venues = venues.filter((v) => {
            if (HBB_TYPES.has(v.primaryType)) return true;
            const haystack = `${v.name || ''} ${v.area || ''}`;
            if (HBB_PATTERNS.test(haystack)) return true;
            return false;
          });
        }
        // v0.57.6: "newly opened" is a soft filter: prefer venues with
        // ≤150 reviews (proxy for "opened recently in Singapore"). The
        // searchText query already biases toward Google's own
        // recency signal via the "newly opened" modifier.
        if (filters.newlyOpened) {
          venues = venues.filter((v) => v.userRatingCount == null || v.userRatingCount <= 150);
        }
        // Sort by walking distance ASC (closer first) so top venues are most reachable.
        // v0.59.23: 12 → 16. Aligns with cuisine-search.js:258 count: 16
        // (band 8-16 per Human Lead 2026-05-07). Previously the
        // server-side rank stage returned 16 but this slice clipped
        // back to 12 — the user only ever saw 12 cards.
        venues.sort((a, b) => (a.distanceM || 0) - (b.distanceM || 0));
        const top = venues.slice(0, 16);
        // v0.57.31: attach LTA-carpark crowd signal to the top venues (one
        // carpark fetch per 500 m grid cell, not per venue). Surfaces
        // as 🟢/🟡/🔴 chip on each card. Honest caveat: weak in CBD
        // where lunch crowds are walk-in; useful at suburban / HDB.
        try {
          const { attachCrowdSignals } = require('./crowd-signal');
          await attachCrowdSignals(top);
        } catch (err) {
          console.warn('[Cuisine-Search] crowd-signal attach failed:', err.message);
        }
        // v0.57.10: extract reviewer-recommended dishes from each
        // venue's reviews (now included inline by Places via
        // DISCOVER_FIELD_MASK). Up to 3 dishes per card. Uses regex
        // — free, no LLM call. Falls back to the place-reviews:*
        // Redis cache when Places didn't return reviews for that
        // venue (e.g. Atmosphere SKU disabled).
        const FOUR_MONTHS_MS = 120 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        function extractDishes(reviews) {
          const recent = (reviews || [])
            .filter((r) => r?.text)
            .filter((r) => {
              if (!r.publishTime) return true; // keep undated
              const t = new Date(r.publishTime).getTime();
              return Number.isFinite(t) ? (now - t) <= FOUR_MONTHS_MS : true;
            })
            .slice(0, 3);
          if (!recent.length) return { dishes: [], snippet: null };
          const allText = recent.map((r) => r.text || '').join(' . ');
          const patterns = [
            /(?:ordered|tried|had|got|loved?|recommend)\s+(?:the\s+)?([A-Z][\w'-]+(?:\s+[\w'-]+){0,3})/g,
            /(?:their|the)\s+([A-Z][\w'-]+(?:\s+[\w'-]+){0,3})\s+(?:is|was|were)\s+(?:amazing|delicious|great|excellent|fantastic|good|tasty)/gi
          ];
          const dishes = new Set();
          for (const re of patterns) {
            let m;
            while ((m = re.exec(allText)) !== null && dishes.size < 5) {
              const candidate = (m[1] || '').trim();
              if (candidate.length < 3 || candidate.length > 40) continue;
              if (/^(restaurant|place|food|service|staff|ambien|atmosphere|experience|time|price|portion|menu|location|owner|chef|hostess|table|seat|drink|drinks|night|lunch|dinner|breakfast)/i.test(candidate)) continue;
              dishes.add(candidate);
            }
          }
          return { dishes: [...dishes].slice(0, 3), snippet: String(recent[0].text).slice(0, 200).trim() };
        }
        // v0.59.24: drinks filter for "🍴 Try ·" — per Human Lead
        // 2026-05-07. Skip for Dessert/Fusion cuisines (drinks are
        // legitimate headline items there).
        const pipelineMod = require('./pipeline');
        const dropDrinks = pipelineMod.shouldFilterDrinks(cuisineQueries);
        for (const v of top) {
          if (Array.isArray(v.reviews) && v.reviews.length) {
            const { dishes, snippet } = extractDishes(v.reviews);
            const filtered = dropDrinks ? pipelineMod.filterOutDrinks(dishes) : dishes;
            if (filtered.length) v.dishes = filtered;
            if (snippet) v.recentReview = snippet;
          }
        }
        // Fall back to the Redis place-reviews cache for any venue
        // that didn't get reviews inline.
        try {
          if (redis.isOpen) {
            await Promise.all(top.map(async (v) => {
              if (!v.placeId || (Array.isArray(v.dishes) && v.dishes.length)) return;
              try {
                const raw = await redis.get(`place-reviews:${v.placeId}`);
                if (!raw) return;
                const reviews = JSON.parse(raw);
                const { dishes, snippet } = extractDishes(reviews);
                // v0.59.24 (Codex #229 P2): same drinks filter as the
                // inline-review path above. Without this, cached reviews
                // mentioning "kopi"/"teh tarik"/cocktails could still
                // become the 🍴 Try · item despite dropDrinks being true.
                const filtered = dropDrinks ? pipelineMod.filterOutDrinks(dishes) : dishes;
                if (filtered.length) v.dishes = filtered;
                if (snippet && !v.recentReview) v.recentReview = snippet;
              } catch { /* per-venue best-effort */ }
            }));
          }
        } catch (err) {
          console.warn('[Cuisine-Search] cache-fallback failed:', err.message);
        }
        // v0.57.20: attach "Closed today · Opens tomorrow 11:00 AM" label
        // for venues that are currently closed. Uses regularPeriods from
        // the Places field mask. nextOpenString returns null when periods
        // are missing, in which case the card falls back to plain "Closed".
        const { closedTodayString } = require('./open-hours');
        for (const v of top) {
          if (v.openNow === false) {
            v.closedTodayLabel = closedTodayString(v.regularPeriods);
          }
          delete v.regularPeriods;
          delete v.reviews;
        }
        // v0.58.52: enrich top with TRANSIT + DRIVE minutes for the
        // cuisine TMA's InfoWindow + venue templates. Best-effort.
        try {
          const { enrichTravelTimes } = require('./travel-times');
          await enrichTravelTimes(searchCenter.lat, searchCenter.lng, top);
        } catch (err) { console.warn('[Cuisine-Search] travel-times failed:', err.message); }
        // v0.59.0: footfall enrichment (BestTime). Dormant without key.
        try {
          const { attachFootfallSignals } = require('./footfall-signal');
          await attachFootfallSignals(redis, top);
        } catch (err) { console.warn('[Cuisine-Search] footfall failed:', err.message); }
        const payload = { venues: top, debug: { cuisineQueries, modifiers, scope: 'sg-wide-50km' } };
        console.log(`[Cuisine-Search] D704 returning ${top.length} venues to client`);
        // v0.57.6: write to cache for 30 minutes.
        // Codex review #224: skip the write when Singaporean is in
        // the cuisines list — caching the rotated dish-pair would pin
        // it across the TTL and defeat the per-call rotation goal.
        try {
          if (redis.isOpen && !skipCacheForSingaporean) {
            await redis.setEx(cacheKey, 30 * 60, JSON.stringify(payload));
          }
        } catch (err) { console.warn('[Cuisine-Search] cache write failed:', err.message); }
        res.json({ ...payload, cached: false });
      } catch (err) {
        console.error('[Error] /api/cuisine/search failed:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/cuisine/nl-query', async (req, res) => {
      try {
        const { text, lat, lng, filters = {}, lang: nlLangIn } = req.body || {};
        if (!text || !text.trim()) return res.status(400).json({ error: 'missing text' });

        // v0.58.19: harden the LLM endpoint —
        //   1. verifyInitData gate (mirrors /api/cuisine/copy-all). Was
        //      open to the public internet, costing real $ if scraped.
        //   2. Use the verified user.id as chatId so the per-user cache
        //      and the rate-limit counter are scoped per Telegram user.
        //   3. Per-user rate limit: 60 LLM calls / hour, hard 429 wall.
        //      Redis INCR + EXPIRE keyed to the current epoch hour.
        //   4. Anchor distance cap: if location_override geocodes to a
        //      point >120 km from the user's GPS or outside the SG/JB
        //      bounding box, discard and fall back to user GPS.
        const verified = verifyInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
        if (!verified) return res.status(401).json({ error: 'invalid initData' });
        const userId = verified.user?.id;
        if (!userId) return res.status(400).json({ error: 'no user id' });
        const chatId = String(userId);

        // Rate limit — 60 calls per epoch hour. Counter expires after
        // the hour rolls over so users get a fresh budget.
        try {
          if (redis.isOpen) {
            const hour = Math.floor(Date.now() / 3_600_000);
            const rlKey = `tell-gia:rl:${chatId}:${hour}`;
            const count = await redis.incr(rlKey);
            if (count === 1) await redis.expire(rlKey, 3600);
            if (count > 60) {
              return res.status(429).json({
                error: 'rate limited',
                detail: 'Too many Tell Gia calls this hour. Try again next hour.'
              });
            }
          }
        } catch (err) {
          console.warn('[NL-Query] rate-limit check failed:', err.message);
          // On Redis trouble, let the call through rather than 500 — the
          // 60s in-memory cache + 800-token output cap still bound spend.
        }

        const cv = require('./cuisines-vault');
        const tellGia = require('./tell-gia');
        const inferred = await tellGia.inferTellGia({ text, chatId, redis, vault: cv });
        const inferredCuisines = inferred.cuisines || [];
        const inferredFilters = inferred.filters || {};
        const inferredLocation = (inferred.location_override || '').trim();
        const pipeline = require('./pipeline');
        // v0.57.30: location_override — when the LLM extracts a SG
        // location anchor (neighbourhood, road, MRT, mall, expressway),
        // geocode it via Google Places and use those coords for the
        // search instead of the user's GPS. Mirrors the voice-handler
        // pattern at line ~2220 (geocodeQuery + searchLat/searchLng).
        let searchLat = lat;
        let searchLng = lng;
        let locationLabel = '';
        if (inferredLocation) {
          try {
            const place = await geocodeQuery(inferredLocation);
            if (place?.lat && place?.lng) {
              // v0.58.19: anchor distance cap. Reject geocoded anchors
              // that fall outside SG/JB or sit >120 km from the user's
              // GPS. SG bbox: lat 1.16–1.48, lng 103.6–104.05. JB bbox:
              // lat 1.42–1.55, lng 103.6–103.85. Combined: lat
              // 1.16–1.55, lng 103.6–104.05.
              const inSGJB = place.lat >= 1.16 && place.lat <= 1.55
                && place.lng >= 103.6 && place.lng <= 104.05;
              const userR = 6371;
              const toRad = (d) => d * Math.PI / 180;
              let distKm = Infinity;
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                const dLat = toRad(place.lat - lat);
                const dLng = toRad(place.lng - lng);
                const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(place.lat)) * Math.sin(dLng / 2) ** 2;
                distKm = 2 * userR * Math.asin(Math.sqrt(x));
              }
              if (!inSGJB || distKm > 120) {
                console.log(`[NL-Query] D772 location_override="${inferredLocation}" rejected (inSGJB=${inSGJB}, distKm=${distKm.toFixed(1)}); falling back to user GPS`);
              } else {
                searchLat = place.lat;
                searchLng = place.lng;
                locationLabel = place.name || inferredLocation;
                console.log(`[NL-Query] D770 location_override="${inferredLocation}" → ${locationLabel} (${searchLat.toFixed(4)}, ${searchLng.toFixed(4)})`);
              }
            } else {
              console.log(`[NL-Query] D771 location_override="${inferredLocation}" failed to geocode; falling back to user GPS`);
            }
          } catch (err) {
            console.warn(`[NL-Query] D771 geocode threw: ${err.message}`);
          }
        }
        const cuisineMetas = inferredCuisines
          .map((slug) => cv.findBySlug(slug))
          .filter(Boolean);
        const cuisineNames = cuisineMetas.map((c) => c.name);
        // v0.57.13: only gate non-local categories (mirrors /api/cuisine/search).
        const GATED_CATEGORIES_NL = new Set(['african', 'european', 'americas']);
        const gatedNamesNL = cuisineMetas
          .filter((c) => GATED_CATEGORIES_NL.has(c.categoryId))
          .map((c) => c.name);
        const allSelectedAreGatedNL = cuisineMetas.length > 0
          && cuisineMetas.every((c) => GATED_CATEGORIES_NL.has(c.categoryId));
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
        // v0.58.32: brand-name passthrough. Per Human Lead — typing
        // "sushi tei" returned generic Japanese restaurants because
        // tellGia mapped "sushi" → "japanese" and dropped the literal
        // brand. We now PREPEND the verbatim text as the first query
        // when it looks like a specific brand (3–40 chars, ≤4 words,
        // contains letters), then let inferred cuisines follow as
        // backup. Google's searchText returns the brand's locations
        // first so chain searches work; Japanese-cuisine fallback
        // still surfaces neighbours when needed.
        if (typeof text === 'string') {
          const trimmed = text.trim();
          const looksBrand = trimmed.length >= 3 && trimmed.length <= 40
            && /[a-z]/i.test(trimmed)
            && trimmed.split(/\s+/).length <= 4;
          if (looksBrand && !cuisineQueries.some((q) => q && q.toLowerCase().includes(trimmed.toLowerCase()))) {
            cuisineQueries = [trimmed, ...cuisineQueries];
            console.log(`[NL-Query] D772 brand-name prepended — "${trimmed}" + ${JSON.stringify(cuisineNames)}`);
          }
        }
        // v0.59.0: resolve active lang for NL discovery.
        const { resolveLang: resolveLangNL } = require('./user-prefs');
        const nlBodyLang = (typeof nlLangIn === 'string' && ['en','fr'].includes(nlLangIn)) ? nlLangIn : null;
        const nlLang = nlBodyLang || await resolveLangNL(redis, chatId, null);
        const candidates = await pipeline.discover({
          lat: searchLat, lng: searchLng, radius: 50000, cuisines: cuisineQueries, maxResults: 30,
          lang: nlLang                                     // v0.59.0
        });
        let venues = Array.isArray(candidates) ? candidates : (candidates?.venues || []);
        // v0.57.5 / v0.58.31: shared deny-list module — type gate +
        // building-name regex (Lau Pa Sat, Maxwell, SAFRA, etc.).
        const venueFiltersNL = require('./venue-filters');
        venues = venues.filter(venueFiltersNL.passesVenueFilter);
        // v0.57.12: cuisine-name validation gate (mirrors /api/cuisine/search).
        // v0.57.13: only fire when every selected cuisine is in
        // African/European/Americas categories.
        // v0.57.20: small-pool bypass (mirrors /api/cuisine/search).
        const SMALL_POOL_NL = 5;
        if (allSelectedAreGatedNL && gatedNamesNL.length && venues.length > SMALL_POOL_NL) {
          venues = venues.filter((v) => {
            // v0.57.13: widen haystack to include summary + reviews.
            const reviewText = Array.isArray(v.reviews)
              ? v.reviews.map((r) => r?.text || '').join(' ')
              : '';
            const haystack = [
              v.name || '', v.area || '', v.primaryType || '',
              v.googleSummary?.overview || '',
              reviewText
            ].join(' ').toLowerCase();
            for (const name of gatedNamesNL) {
              const lower = name.toLowerCase();
              if (haystack.includes(lower)) return true;
              const slugForType = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
              if (v.primaryType === `${slugForType}_restaurant`) return true;
              const words = lower.split(/\s+/).filter((w) => w.length >= 4);
              if (words.length >= 2 && words.every((w) => haystack.includes(w))) return true;
              // v0.57.14: related-dish keywords (mirrors /api/cuisine/search).
              const dishKeywords = require('./cuisine-dish-keywords').getDishKeywords(name);
              for (const kw of dishKeywords) {
                if (haystack.includes(kw)) return true;
              }
            }
            return false;
          });
        }
        // v0.57.8: hard 60 km gate (SG is ~50 × 25 km).
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          venues = venues.filter((v) => {
            if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return true;
            const R = 6371000, toRad = (d) => d * Math.PI / 180;
            const dLat = toRad(v.lat - lat), dLng = toRad(v.lng - lng);
            const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(v.lat)) * Math.sin(dLng / 2) ** 2;
            return Math.round(2 * R * Math.asin(Math.sqrt(x))) <= 60000;
          });
        }
        if (merged.openNow) venues = venues.filter((v) => v.openNow !== false);
        if (merged.prices?.length) {
          const allowed = new Set(merged.prices.map((p) => p.length));
          venues = venues.filter((v) => v.priceLevel == null || allowed.has(v.priceLevel));
        }
        // v0.57.16: Home-based heuristic (mirrors /api/cuisine/search).
        if (merged.homeBased) {
          // v0.57.24: mirrors /api/cuisine/search — match private
          // dining / home cooked / home-based / home meal / house
          // based phrases in name OR address, plus HDB block patterns
          // and meal_takeaway / meal_delivery types.
          const HBB_PATTERNS_NL = /\bprivate dining\b|\bhome[-\s]?cook(ed|ing)?\b|\bhome[-\s]?based\b|\bhome[-\s]?meal(s)?\b|\bhouse[-\s]?based\b|\bblk\s*\d|#\d{2,3}-\d{2,3}|\bhdb\b/i;
          const HBB_TYPES_NL = new Set(['meal_takeaway', 'meal_delivery']);
          venues = venues.filter((v) => {
            if (HBB_TYPES_NL.has(v.primaryType)) return true;
            const haystack = `${v.name || ''} ${v.area || ''}`;
            if (HBB_PATTERNS_NL.test(haystack)) return true;
            return false;
          });
        }
        // v0.57.20: closed-today label (mirrors /api/cuisine/search).
        const { closedTodayString: closedTodayStringNL } = require('./open-hours');
        const topNL = venues.slice(0, 12);
        for (const v of topNL) {
          if (v.openNow === false) {
            v.closedTodayLabel = closedTodayStringNL(v.regularPeriods);
          }
          delete v.regularPeriods;
        }
        // v0.57.31: crowd signal (mirrors /api/cuisine/search).
        try {
          const { attachCrowdSignals: attachNL } = require('./crowd-signal');
          await attachNL(topNL);
        } catch (err) {
          console.warn('[NL-Query] crowd-signal attach failed:', err.message);
        }
        // v0.58.52: travel-time enrichment (TRANSIT + DRIVE) for the
        // cuisine TMA's MapPanel + venue templates. Best-effort.
        try {
          const { enrichTravelTimes } = require('./travel-times');
          await enrichTravelTimes(searchLat, searchLng, topNL);
        } catch (err) { console.warn('[NL-Query] travel-times failed:', err.message); }
        // v0.59.0: footfall enrichment (BestTime). Dormant without key.
        try {
          const { attachFootfallSignals } = require('./footfall-signal');
          await attachFootfallSignals(redis, topNL);
        } catch (err) { console.warn('[NL-Query] footfall failed:', err.message); }
        res.json({
          venues: topNL,
          inferredCuisines, inferredFilters,
          locationOverride: inferredLocation || '',
          locationLabel,
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
    // v0.57.11: SVG endpoint dropped; mrt-system-map.png is served as
    // a Vite-emitted static asset from web/transport/public/.
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
    // v0.58.27: hardened against the "always Water Catchment" bug.
    //   • Skip natural_feature / park / point_of_interest results when
    //     a more specific neighborhood / sublocality exists.
    //   • Hard short-circuit for SG_CENTROID (1.3521, 103.8198) which
    //     happens to land in the Central Catchment when the TMA's
    //     userLoc resolution falls through.
    //   • Cache TTL dropped 24h → 1h so a wrong cache cell self-heals.
    //   • Cache is *also* invalidated when the picked name still looks
    //     like a natural feature ("Catchment", "Reservoir", etc.) by
    //     skipping the cache write.
    app.get('/api/reverse-geocode', requireInitData, async (req, res) => {
      try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: 'lat and lng required' });
        }
        // SG centroid short-circuit — the TMA's last-resort fallback.
        // Lives inside Central Catchment so Google legitimately
        // returns "Central Catchment" / "Water Catchment" for it.
        if (Math.abs(lat - 1.3521) < 0.0005 && Math.abs(lng - 103.8198) < 0.0005) {
          return res.json({ name: 'Singapore', formatted: 'Singapore (centroid fallback)' });
        }
        // Grid lat/lng to ~50 m so nearby pings hit the same cache key.
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
        // Pick the most-specific result, preferring inhabited-place
        // types over natural features. Walk every result (not just
        // results[0]) so we find a populated locality even when the
        // top match is a reservoir / park / catchment polygon.
        const NATURAL_TYPES = new Set([
          'natural_feature', 'park', 'establishment', 'point_of_interest',
          'tourist_attraction', 'premise'
        ]);
        const NATURAL_NAME_RX = /\b(catchment|reservoir|forest|nature reserve|park|wetland|river|canal)\b/i;
        function pickName(result) {
          const components = result.address_components || [];
          const findComp = (type) => components.find((c) => c.types?.includes(type))?.long_name;
          return findComp('neighborhood')
            || findComp('sublocality_level_1')
            || findComp('sublocality')
            || findComp('locality')
            || null;
        }
        let chosen = null;
        for (const r of data.results) {
          const isNatural = (r.types || []).some((t) => NATURAL_TYPES.has(t));
          const candidateName = pickName(r);
          if (candidateName && !NATURAL_NAME_RX.test(candidateName)) {
            chosen = { name: candidateName, formatted: r.formatted_address || '', natural: isNatural };
            if (!isNatural) break; // ideal: inhabited-place type with a clean neighborhood name
          }
        }
        if (!chosen) {
          // Last resort: split the top result's formatted_address.
          const top = data.results[0];
          const head = top.formatted_address?.split(',')[0] || 'Singapore';
          chosen = {
            name: NATURAL_NAME_RX.test(head) ? 'Singapore' : head,
            formatted: top.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            natural: NATURAL_NAME_RX.test(head)
          };
        }
        const payload = { name: chosen.name, formatted: chosen.formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
        try {
          // Skip the cache write when we fell back to "Singapore" or
          // a natural-feature name — better to retry next time than
          // poison the grid cell for an hour.
          if (!chosen.natural && payload.name !== 'Singapore') {
            await redis.set(cacheKey, JSON.stringify(payload), { EX: 60 * 60 });
          }
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
