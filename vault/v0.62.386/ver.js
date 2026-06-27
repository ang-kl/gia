// ver.js — runtime health-check probes for /ver command.
//
// One lightweight call per upstream. Tight timeouts. Each result is
// {ok, ms, note} and never throws (returns ok:false on failure).

const axios = require('axios');
const llm = require('./llm-client');
const pkg = require('./package.json');
const { execSync } = require('child_process');

const TIMEOUT_MS = 5000;

async function probe(label, fn) {
  const start = Date.now();
  try {
    const note = await fn();
    return { ok: true, ms: Date.now() - start, note: note || 'ok' };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, note: (err.response?.status ? `HTTP ${err.response.status}` : err.message).slice(0, 250) };
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

async function checkAnthropic() {
  return probe('Anthropic', async () => {
    if (!llm.isReady()) throw new Error('no key');
    const result = await Promise.race([
      llm.generate({ prompt: 'Reply with just OK.', model: llm.HAIKU_MODEL, maxTokens: 16 }),
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

async function checkDataGov() {
  return probe('data.gov.sg', async () => {
    const headers = process.env.DATA_GOV_SG_API_KEY ? { 'x-api-key': process.env.DATA_GOV_SG_API_KEY } : {};
    // Try v2 first; fall back to v1 if v2 is empty/errors. Report which served.
    const auth = process.env.DATA_GOV_SG_API_KEY ? 'auth' : 'no key';
    try {
      const { data } = await axios.get('https://api-open.data.gov.sg/v2/real-time/api/air-temperature', {
        headers, timeout: TIMEOUT_MS
      });
      const stations = data?.data?.stations?.length || 0;
      const readings = data?.data?.readings?.[0]?.data?.length || 0;
      if (stations > 0 && readings > 0) return `NEA v2 ${stations} stations (${auth})`;
      // v2 returned but empty — try v1.
      const v1 = await axios.get('https://api.data.gov.sg/v1/environment/air-temperature', {
        headers, timeout: TIMEOUT_MS
      });
      const v1Readings = v1.data?.items?.[0]?.readings?.length || 0;
      return `NEA v2 empty → v1 ${v1Readings} readings (${auth})`;
    } catch (err) {
      // v2 errored — last-resort v1 probe.
      try {
        const v1 = await axios.get('https://api.data.gov.sg/v1/environment/air-temperature', {
          headers, timeout: TIMEOUT_MS
        });
        const v1Readings = v1.data?.items?.[0]?.readings?.length || 0;
        return `v2 fail → v1 ${v1Readings} readings (${auth})`;
      } catch {
        throw err;
      }
    }
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

// Boot time = when this Node process started = when Railway last redeployed.
// Captured at module load; SGT formatting deferred to render time.
const BOOT_MS = Date.now() - Math.floor(process.uptime() * 1000);

function fmtBoot(ms) {
  const d = new Date(ms);
  // e.g. "30-04-26 14:55 SGT"
  const sgt = d.toLocaleString('en-GB', {
    timeZone: 'Asia/Singapore',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', '');
  return `${sgt} SGT`;
}

function fmtUptime(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function detectBuildRef() {
  const envRef = process.env.RAILWAY_GIT_COMMIT_SHA
    || process.env.SOURCE_VERSION
    || process.env.GITHUB_SHA
    || '';
  if (envRef) return String(envRef).slice(0, 12);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

async function runHealthCheck(bot, redis) {
  const [places, routes, anthropic, telegram, lta, redisRes, dataGov] = await Promise.all([
    checkGooglePlaces(),
    checkRoutes(),
    checkAnthropic(),
    checkTelegram(bot),
    checkLta(),
    checkRedis(redis),
    checkDataGov()
  ]);
  const lines = [
    `soleat v${pkg.version}`,
    `build ${detectBuildRef()}`,
    '',
    fmtRow('Telegram',     telegram),
    fmtRow('Redis',        redisRes),
    fmtRow('Google Places',places),
    fmtRow('Routes API',   routes),
    fmtRow('Anthropic',    anthropic),
    fmtRow('LTA DataMall', lta),
    fmtRow('data.gov.sg',  dataGov),
    '',
    `Deployed: ${fmtBoot(BOOT_MS)} (uptime ${fmtUptime(BOOT_MS)})`
  ];
  return lines.join('\n');
}

module.exports = { runHealthCheck };
