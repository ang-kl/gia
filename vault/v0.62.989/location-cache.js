const crypto = require('crypto');

const LOC_TTL = 24 * 60 * 60;  // 24 hours
const PENDING_TTL = 5 * 60;    // 5 minutes

function hashChatId(chatId) {
  return crypto.createHash('sha256').update(String(chatId)).digest('hex').slice(0, 16);
}

// v0.61.363 — per-device location keys. One Telegram account (chatId)
// can run the TMA on several devices at once, each in a different place;
// keying location by chatId alone made them clobber each other's cache
// (last writer wins). The TMA now sends a stable per-device token
// (localStorage UUID) so each device gets its own slot. Bot-chat flows
// (no device) keep the chatId-level key, which a per-device read also
// falls back to when that device has no slot yet (seed on first open).
function sanitizeDeviceId(deviceId) {
  if (!deviceId) return null;
  const clean = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return clean || null;
}

function locKey(chatId, deviceId) {
  const base = `loc:${hashChatId(chatId)}`;
  const dev = sanitizeDeviceId(deviceId);
  return dev ? `${base}:dev:${dev}` : base;
}

// v0.62.939 — ISO-2 country for a coordinate, from the curated city table
// (city-centroids.js, 139 cities / 18 countries) and nothing else: the nearest
// city's country, accepted only when the point lies inside that city's own
// density-tuned `radiusM`. Returns null when the point is outside every city's
// radius, when the nearest city is Singapore (SG is never INFERRED — the SG
// gate and the explicit pickers own that answer), or on invalid input. Pure
// and offline; no Places call. Exported so the test calls the rule itself.
function inferCountryFromCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const { nearestCityForAnchor } = require('./place-search-variance');
    const { CITY_CENTROIDS } = require('./city-centroids');
    const best = nearestCityForAnchor(lat, lng);
    if (!best) return null;
    const city = CITY_CENTROIDS[best.city];
    const radiusM = city && Number(city.radiusM);
    const cc = city && typeof city.country === 'string' ? city.country.toUpperCase() : null;
    if (!cc || cc === 'SG' || !Number.isFinite(radiusM) || radiusM <= 0) return null;
    return best.distanceKm * 1000 <= radiusM ? cc : null;
  } catch {
    return null;
  }
}

async function setUserLocation(redis, chatId, lat, lng, opts = {}) {
  if (!redis.isOpen) await redis.connect();
  const deviceId = opts && sanitizeDeviceId(opts.deviceId);
  // Always write the chatId-level key (bot-chat default + new-device
  // seed); when a device token is present, ALSO write its per-device key
  // so concurrent devices don't overwrite each other.
  const key = `loc:${hashChatId(chatId)}`;
  // v0.62.31 — SERVER-SIDE label guard (defence-in-depth under the v0.62.30
  // client latch). An AMBIENT write (opts.ambient — sent only by automatic
  // movers like the Cuisine TMA's 20-s follow-device sync, never by a user
  // gesture) must NOT clobber a fresh LABELLED pick (a deliberate Menu /
  // chat /location / TMA choice). Deliberate flows (chat share-pin, 📍
  // use-current, /location, autocomplete picks) pass no flag and keep full
  // overwrite semantics — back-compat safe. Returns { kept: true, label }
  // when the guard holds so callers can log it.
  // v0.62.965 — spec 2026-11-02-saved-place-expires-after-six-hours, C3 / I4: the guard holds only while the labelled
  // place is LOCKED (anchor-age.js: under 6 hours old). Past the lock an automatic write goes through, otherwise the
  // Mini Apps would switch to the phone on screen while the server kept yesterday's place, and the next open would
  // jump back to it.
  if (opts && opts.ambient === true) {
    try {
      const existingRaw = await redis.get(key);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        if (existing && typeof existing.label === 'string' && existing.label.trim()) {
          const { isLocked } = await anchorAge();
          if (isLocked(existing, Date.now())) {
            console.log(`[location-cache] D787 label-guard: kept "${existing.label.slice(0, 40)}" over an ambient label-less write`);
            return { kept: true, label: existing.label };
          }
          console.log(`[location-cache] D787 label-guard: "${existing.label.slice(0, 40)}" is past its 6-hour lock; the ambient write goes through`);
        }
      }
    } catch { /* malformed cache — fall through to the write */ }
    // v0.62.988 — spec 2026-11-21-chat-place-kept-per-phone, L4. The check above reads the ACCOUNT's record, which is
    // whatever was written last by anyone. With two phones that is not the record THIS phone is given: after phone A
    // writes an unnamed position, the account's record is no longer a locked place, and phone B's automatic save
    // sailed through over the chat place (or over B's own locked pick) that B was still showing. So the guard also
    // holds when the record this phone would be given is a locked place. It only ever refuses MORE automatic
    // writes, never fewer; a deliberate write is not touched by either check.
    if (deviceId) {
      try {
        const given = await getUserLocation(redis, chatId, deviceId);
        if (given && typeof given.label === 'string' && given.label.trim()) {
          const { isLocked } = await anchorAge();
          if (isLocked(given, Date.now())) {
            console.log(`[location-cache] D787 label-guard: kept this device's "${given.label.slice(0, 40)}" over an ambient write`);
            return { kept: true, label: given.label };
          }
        }
      } catch { /* malformed cache — fall through to the write */ }
    }
  }
  // v0.30.2: stamp setAt so callers can compute staleness for the
  // 15-min "your location is old, refresh?" reminder.
  // v0.61.122: optional anchor metadata from /location precinct picks.
  // `region` ('SG' | 'JB' | 'OTHER') lets the cuisine TMA + chat
  // pipelines know which side of the Causeway we're on; `radiusCapM`
  // hard-caps Places search radii (JB → 30 km, IOI Putrajaya → 20 km
  // per v0.61.185; was 15 km). Legacy 'MY-PUT' anchors written
  // before v0.61.185 still work — read paths accept both values.
  // `label` / `precinctId` pass through for display + analytics.
  // All four are OPTIONAL — old callers (share-pin handler, manual
  // geocode handler) pass nothing and get exactly the legacy payload.
  const payload = { lat, lng, setAt: Date.now() };
  if (opts && typeof opts === 'object') {
    if (typeof opts.region === 'string' && opts.region) payload.region = opts.region;
    if (Number.isFinite(opts.radiusCapM) && opts.radiusCapM > 0) payload.radiusCapM = opts.radiusCapM;
    if (typeof opts.label === 'string' && opts.label) payload.label = opts.label;
    if (typeof opts.precinctId === 'string' && opts.precinctId) payload.precinctId = opts.precinctId;
    // v0.61.139 — structured address parts from Places addressComponents.
    // Optional — set only when the caller geocoded via geocodeQueryRegion
    // (precinct picks have no addressComponents). Persisted so the Menu
    // TMA's anchor pill can render "<street> + <building> + (<postal>)"
    // after a reload without re-hitting Places.
    if (typeof opts.street === 'string' && opts.street) payload.street = opts.street;
    if (typeof opts.building === 'string' && opts.building) payload.building = opts.building;
    if (typeof opts.postal === 'string' && opts.postal) payload.postal = opts.postal;
    // v0.61.270 — Phase 2 SSOT consolidation. Menu TMA's set-location
    // has been passing `{ country: cc }` since v0.61.192 but
    // setUserLocation silently dropped it. Now persisted so the
    // Cuisine TMA's auto-flip + the cuisine-search OTHER branch can
    // both read the user's selected country code instead of inferring
    // it from coords.
    if (typeof opts.country === 'string' && /^[A-Z]{2}$/i.test(opts.country)) {
      payload.country = opts.country.toUpperCase();
    }
    // v0.62.987 — spec 2026-11-15-chat-place-opens-cuisine-and-bold-tag, D2 / K3. A write made from the CHAT (/l, the
    // picker, a shared pin, a recent place) says so. It carries no device id, so it lands on the account's record
    // only, and until this version a phone that already had a slot of its own never saw it (getUserLocation below
    // reads the slot first): the operator set a hotel in Johor Bahru with /l and the Cuisine app was told the phone's
    // old Singapore record. Passed ONLY by the bot's chat handlers; a Mini App route never passes it, so a pick made
    // on one phone still cannot reach another.
    if (opts.fromChat === true) payload.fromChat = true;
  }
  // v0.61.206 — operator's repeated bug: share-pin from outside SG
  // (e.g. Padang Tengku Pahang, lat 4.21) was cached with no region
  // because bot.on('location') passes no opts. Cuisine TMA then sent
  // region=SG with Pahang coords → 0 results. Stamp region='OTHER'
  // here when no explicit region was passed AND the coarse gate
  // (v0.61.155 rule §2.2, 120 km from SG centroid) trips. Anything
  // INSIDE the gate stays unstamped — distinguishing SG from JB
  // needs a reverse-geocode which would be a paid Places call on
  // every share-pin; existing v0.61.157 drift-prompt covers the
  // SG↔JB ambiguity at chat time.
  if (!payload.region && Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      const { coarseGate } = require('./location-mode');
      if (!coarseGate({ lat, lng })) {
        payload.region = 'OTHER';
        payload.regionInferredFromCoords = true;
        // v0.62.939 — the third path Codex named on #1870 ([AMD-232]): a
        // share-pin abroad was stamped OTHER with NO country, so
        // resolveRegionCode read it as 'SG' and the chat free-text anchor
        // fell back to Singapore. Operator's choice: the free offline lookup
        // (nearest curated city, accepted only inside its own radius), not
        // a paid reverse-geocode. Only THIS coord-inferred branch infers;
        // a caller that passes its own country or region is never touched.
        if (!payload.country) {
          const cc = inferCountryFromCoords(lat, lng);
          if (cc) {
            payload.country = cc;
            payload.countryInferredFromCoords = true;
          }
        }
      }
    } catch (err) {
      // location-mode unavailable (shouldn't happen in prod) —
      // silently skip the stamp.
    }
  }
  const serialized = JSON.stringify(payload);
  await redis.setEx(key, LOC_TTL, serialized);
  if (deviceId) await redis.setEx(`${key}:dev:${deviceId}`, LOC_TTL, serialized);
  // v0.62.988 — L1: a place set in chat is ALSO kept under its own key, which no app write touches. v0.62.987 kept
  // the chat mark only on the account's record above, and every app write replaces that record: phone A's pick
  // erased the mark, and phone B, which had picked nothing, went back to its own older record (review finding on
  // #1929, reproduced). getUserLocation compares a phone's slot with THIS record. /forgetme erases it
  // (user-data.js hashedKeys).
  if (payload.fromChat === true) await redis.setEx(`${key}:chat`, LOC_TTL, serialized);
}

// v0.62.987 — D2 / K3: which of the two records a phone is given. Its own slot, unless the account's record was set
// in chat (`fromChat`) AFTER that slot was written. Pure, so the test calls the rule itself. Both times are stamped by
// this server (setAt, in setUserLocation), so no phone's clock enters the comparison.
//   - no slot                                        -> the account's record (a new phone seeds from it; unchanged)
//   - account record set in chat, newer than the slot -> the account's record (the place the reader just set)
//   - anything else                                  -> the slot (another phone's pick, or an automatic write,
//                                                       never displaces it)
function pickSavedRecord(deviceRecord, accountRecord) {
  if (!deviceRecord) return accountRecord || null;
  if (!accountRecord) return deviceRecord;
  const newer = Number.isFinite(accountRecord.setAt) && Number.isFinite(deviceRecord.setAt)
    && accountRecord.setAt > deviceRecord.setAt;
  return (accountRecord.fromChat === true && newer) ? accountRecord : deviceRecord;
}

function parseSavedRecord(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Backwards-compat for pre-v0.30.2 entries without setAt.
    if (parsed && typeof parsed === 'object' && !parsed.setAt) parsed.setAt = null;
    return parsed;
  } catch {
    return null;
  }
}

// getUserLocation(redis, chatId, deviceId?) — when a device token is
// given, read that device's slot first and fall back to the chatId-level
// key (so a fresh device seeds from the last-known, then diverges).
// v0.62.987 — and a place set in chat after the slot was written wins over the slot (pickSavedRecord above).
// v0.62.988 — the place set in chat is read from its OWN key (`loc:<hash>:chat`), not from the account's record,
// which the next app write on any phone replaces. So for a phone:
//   - its slot, unless the chat place is newer                    (L1, L2)
//   - no slot: the chat place when there is one                    (L3)
//   - neither: the account's record, as a new phone always seeded  (v0.61.363)
// With no device (the bot's own reads) nothing changes: the account's last record (L5).
async function getUserLocation(redis, chatId, deviceId) {
  if (!redis.isOpen) await redis.connect();
  const dev = sanitizeDeviceId(deviceId);
  const accountKey = `loc:${hashChatId(chatId)}`;
  if (!dev) return parseSavedRecord(await redis.get(accountKey));
  const deviceRecord = parseSavedRecord(await redis.get(`${accountKey}:dev:${dev}`));
  const chatRecord = parseSavedRecord(await redis.get(`${accountKey}:chat`));
  if (deviceRecord || chatRecord) return pickSavedRecord(deviceRecord, chatRecord);
  return parseSavedRecord(await redis.get(accountKey));
}

// v0.62.965 — spec 2026-11-02-saved-place-expires-after-six-hours. The one rule for the saved place lives in
// web/_shared/lib/anchor-age.js so the two Mini Apps, the bot and the tests call the same code. That file is ESM and
// this one is CommonJS; require() of an ES module needs Node 22.12 and CI runs Node 20, so it is loaded once with a
// dynamic import(), which is why the three helpers below are async.
let _anchorAgeP = null;
function anchorAge() {
  if (!_anchorAgeP) _anchorAgeP = import('./web/_shared/lib/anchor-age.js');
  return _anchorAgeP;
}

// C1 — what /api/cuisine/user-location adds to its payload: how old the saved place is, and whether it is locked
// (labelled and under 6 hours). Both Mini Apps read `locked` instead of deciding from the label alone.
async function describeSavedPlace(cached, now = Date.now()) {
  const { isLocked } = await anchorAge();
  const ageMinutes = (cached && Number.isFinite(cached.setAt)) ? Math.floor((now - cached.setAt) / 60000) : null;
  return { ageMinutes, locked: isLocked(cached, now) };
}

// C5 — what the chat /cuisine command puts in the Mini App's link: the saved place only while it is locked. Before
// this version any place under 24 hours old went in, which is how yesterday's Kyoto opened in Singapore.
async function resolveCuisineLaunchAnchor(cached, now = Date.now()) {
  const { isLocked } = await anchorAge();
  if (!isLocked(cached, now)) return null;
  const validCoord = Number.isFinite(cached.lat) && Number.isFinite(cached.lng)
    && Math.abs(cached.lat) > 0.001 && Math.abs(cached.lng) > 0.001;
  if (!validCoord) return null;
  // v0.62.987 — K4: the name travels too, so the app shows the place the chat line names. A locked place always has
  // a label (isLocked requires one).
  const label = typeof cached.label === 'string' ? cached.label.trim() : '';
  return { lat: cached.lat, lng: cached.lng, region: cached.region || null, ...(label ? { label } : {}) };
}

// v0.62.987 — K4: what the /cuisine command adds to the Mini App's link for a locked saved place: lat, lng, region
// and the name as `place` (the app reads at most 80 characters of it: lib/state.js readOverridesFromHash). An
// explicit @location argument has already put its own lat in the params and wins; nothing is added then. Returns the
// URLSearchParams it was given. Lives here, not in index.js, so the test can call it.
const LAUNCH_PLACE_MAX = 80;
function applyLaunchAnchorToParams(params, anchor) {
  if (!anchor || params.has('lat')) return params;
  params.set('lat', String(anchor.lat));
  params.set('lng', String(anchor.lng));
  if (anchor.region && !params.has('region')) params.set('region', String(anchor.region));
  const name = typeof anchor.label === 'string' ? anchor.label.trim().slice(0, LAUNCH_PLACE_MAX) : '';
  if (name && !params.has('place')) params.set('place', name);
  return params;
}

// The chat line's "today 4:10 PM" / "yesterday 4:10 PM" / "30 Oct 12:00 PM" (Singapore time).
async function describeSavedPlaceAge(setAt, now = Date.now()) {
  const { describeAge } = await anchorAge();
  return describeAge(setAt, now);
}

// v0.30.2: minutes since the user last shared/typed a location, or
// `null` if no location stored / pre-v0.30.2 entry without timestamp.
async function getLocationAgeMinutes(redis, chatId) {
  const loc = await getUserLocation(redis, chatId);
  if (!loc?.setAt) return null;
  return Math.floor((Date.now() - loc.setAt) / 60000);
}

const SEEN_TTL = 30 * 24 * 60 * 60;  // 30 days

// v0.61.84 — per-chat last-activity marker. touchLastSeen returns the
// PRIOR timestamp (ms epoch, or null) and then stamps `now`, so one
// call yields the idle gap and refreshes the marker. Drives the
// wake-from-idle location re-confirmation prompt.
async function touchLastSeen(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  const key = `seen:${hashChatId(chatId)}`;
  const prev = await redis.get(key);
  await redis.setEx(key, SEEN_TTL, String(Date.now()));
  const n = prev != null ? Number(prev) : NaN;
  return Number.isFinite(n) ? n : null;
}

async function setPendingMeal(redis, chatId, mealId) {
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`loc:pending:${hashChatId(chatId)}`, PENDING_TTL, mealId);
}

async function consumePendingMeal(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  const key = `loc:pending:${hashChatId(chatId)}`;
  const value = await redis.get(key);
  if (value) await redis.del(key);
  return value;
}

const PROCESSING_TTL = 60; // 60 s — covers a full pickValidated + Routes round trip

async function isProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  return Boolean(await redis.get(`proc:${hashChatId(chatId)}`));
}

async function setProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  await redis.setEx(`proc:${hashChatId(chatId)}`, PROCESSING_TTL, '1');
}

async function clearProcessing(redis, chatId) {
  if (!redis.isOpen) await redis.connect();
  await redis.del(`proc:${hashChatId(chatId)}`).catch(() => {});
}

module.exports = {
  hashChatId,
  sanitizeDeviceId,
  locKey,
  inferCountryFromCoords,
  setUserLocation,
  getUserLocation,
  pickSavedRecord,             // v0.62.987
  applyLaunchAnchorToParams,   // v0.62.987
  getLocationAgeMinutes,
  describeSavedPlace,          // v0.62.965
  resolveCuisineLaunchAnchor,  // v0.62.965
  describeSavedPlaceAge,       // v0.62.965
  touchLastSeen,
  setPendingMeal,
  consumePendingMeal,
  isProcessing,
  setProcessing,
  clearProcessing
};
