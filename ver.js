// ver.js — runtime health-check probes for /ver command.
//
// One lightweight call per upstream. Tight timeouts. Each result is
// {ok, ms, note} and never throws (returns ok:false on failure).

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pkg = require('./package.json');

const TIMEOUT_MS = 5000;

async function probe(label, fn) {
  const start = Date.now();
  try {
    const note = await fn();
    return { ok: true, ms: Date.now() - start, note: note || 'ok' };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, note: (err.response?.status ? `HTTP ${err.response.status}` : err.message).slice(0, 80) };
  }
}

async function checkGooglePlaces() {
  return probe('Google Places', async () => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('no key');
    await axios.post(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        includedTypes: ['restaurant'],
        maxResultCount: 1,
        locationRestriction: { circle: { center: { latitude: 1.2839, longitude: 103.8517 }, radius: 100 } }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id'
        },
        timeout: TIMEOUT_MS
      }
    );
    return 'searchNearby ok';
  });
}

async function checkRoutes() {
  return probe('Routes API', async () => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('no key');
    await axios.post(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      {
        origins: [{ waypoint: { location: { latLng: { latitude: 1.2839, longitude: 103.8517 } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: 1.2840, longitude: 103.8518 } } } }],
        travelMode: 'WALK'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'duration'
        },
        timeout: TIMEOUT_MS
      }
    );
    return 'computeRouteMatrix ok';
  });
}

async function checkGemini() {
  return probe('Gemini', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('no key');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3-flash' });
    const result = await Promise.race([
      model.generateContent('Reply with just OK.'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))
    ]);
    const text = (result?.response?.text?.() || '').trim().slice(0, 20);
    return text || 'reply empty';
  });
}

async function checkTelegram(bot) {
  return probe('Telegram', async () => {
    const me = await Promise.race([
      bot.getMe(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))
    ]);
    return `@${me.username}`;
  });
}

async function checkLta() {
  return probe('LTA DataMall', async () => {
    if (!process.env.LTA_ACCOUNT_KEY) throw new Error('no key');
    await axios.get('https://datamall2.mytransport.sg/ltaodataservice/TrainServiceAlerts', {
      headers: { AccountKey: process.env.LTA_ACCOUNT_KEY },
      timeout: TIMEOUT_MS
    });
    return 'TrainServiceAlerts ok';
  });
}

async function checkRedis(redis) {
  return probe('Redis', async () => {
    if (!redis.isOpen) await redis.connect();
    const pong = await redis.ping();
    return String(pong || 'pong');
  });
}

function fmtRow(label, r) {
  const icon = r.ok ? '🟢' : '🔴';
  return `${icon} ${label.padEnd(14)} ${String(r.ms).padStart(5)}ms  ${r.note}`;
}

async function runHealthCheck(bot, redis) {
  const [places, routes, gemini, telegram, lta, redisRes] = await Promise.all([
    checkGooglePlaces(),
    checkRoutes(),
    checkGemini(),
    checkTelegram(bot),
    checkLta(),
    checkRedis(redis)
  ]);
  const lines = [
    `soleat v${pkg.version}`,
    '',
    fmtRow('Telegram',     telegram),
    fmtRow('Redis',        redisRes),
    fmtRow('Google Places',places),
    fmtRow('Routes API',   routes),
    fmtRow('Gemini',       gemini),
    fmtRow('LTA DataMall', lta)
  ];
  return lines.join('\n');
}

module.exports = { runHealthCheck };
