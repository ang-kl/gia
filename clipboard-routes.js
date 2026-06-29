// clipboard-routes.js — v0.62.331
//
// Express router that mounts the 16 /api/clipboard/* HTTP endpoints. The
// storage primitives (cabinets, drawers, placements, cascade rules) live
// in clipboard-store.js — these routes are thin wrappers that:
//   1. Pull chatId from req.tg.user.id (verified by twa-auth.js).
//   2. Call into clipboard-store / clip-store helpers.
//   3. Map structured errors to 4xx codes.
//   4. Emit cb.* analytics events to verbose-log on success (PR #4).
//
// Auth model — single chokepoint with one carve-out:
//   ─ GET  /api/clipboard/shared/:token         PUBLIC (the token IS the auth)
//   ─ everything else under /api/clipboard      requires Telegram initData
//
// Mounted via mountClipboardRoutes(app, redis) from index.js. Order
// matters: the public GET is registered before the auth middleware
// claims the prefix, so Express matches it without auth.

const {
  pushClip,
  getCardById,
  softDeleteCard,
  recomputeCardTtl,
  cardKey,
  locsKey,
  archiveAllClips,
  restoreArchive,
  archivedCount,
} = require('./clip-store');

const {
  listCabinets, getCabinet, createCabinet, updateCabinet, deleteCabinet,
  getDefaultCabinetId, setDefaultCabinet, duplicateCabinet, duplicateDrawer,
  readDrawers, addDrawer, deleteDrawer, getDrawerCards,
  placeCard, unplaceCard,
  MAX_CARDS_PER_DRAWER, MAX_NOTE_CHARS,
  cabHashKey, drMetaKey, drListKey, locsTag, VALID_SEGMENTS
} = require('./clipboard-store');

const { saveShare, loadShare } = require('./share');
const { vlogIf } = require('./verbose-log');

// v0.62.331 (PR #4) — emit a cb.<event> line to verbose-log on success.
// Gated by the per-chat verbose flag (vlogIf is a no-op when off, so we
// pay one Redis GET per request at most when verbose is engaged). Never
// throws — analytics must not affect the user-facing response.
function track(redis, chatId, event, fields = {}) {
  if (!redis || !chatId || !event) return;
  vlogIf(redis, chatId, { ns: 'cb', event, ...fields }).catch(() => { /* never throw */ });
}
const { requireInitDataFromBodyOrHeader } = require('./twa-auth');

// Pull the Telegram user/chat id from the verified initData. In private
// DMs (which is the only mode this bot supports), chatId === user.id.
// Dev bypass (SKIP_INIT_DATA_AUTH=true) leaves req.tg.user null; in
// that path we look at req.query.chatId / req.body.chatId so curl-based
// preview testing still works.
function chatIdFrom(req) {
  if (req.tg && req.tg.user && req.tg.user.id) return String(req.tg.user.id);
  if (req.tg && req.tg.devBypass) {
    return String(req.query.chatId || req.body?.chatId || '');
  }
  return '';
}

// Map a clipboard-store structured error to an HTTP status code.
function mapError(error) {
  switch (error) {
    case 'name-required':           return { status: 400, body: { error } };
    case 'invalid-segment':         return { status: 400, body: { error } };
    case 'missing-args':            return { status: 400, body: { error } };
    case 'cap-cabinets':            return { status: 409, body: { error, cap: 12 } };
    case 'cap-drawers':             return { status: 409, body: { error, cap: 20 } };
    case 'cap-cards-per-drawer':    return { status: 409, body: { error, cap: MAX_CARDS_PER_DRAWER } };
    case 'cabinet-not-found':
    case 'drawer-not-found':
    case 'card-not-found':
    case 'not-found':               return { status: 404, body: { error } };
    case 'redis-failure':           return { status: 503, body: { error } };
    case 'missing-redis':           return { status: 503, body: { error } };
    default:                        return { status: 500, body: { error: error || 'unknown' } };
  }
}

// Wrap an async handler so an unhandled rejection becomes a 500 instead
// of crashing the process. Logs the failure so it stays visible in
// Railway's log stream — per the gia-preflight rule "never catch {}".
function wrap(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (err) {
      console.warn(`[clipboard-routes] unhandled ${req.method} ${req.path}:`, err.message);
      res.status(500).json({ error: 'internal' });
    }
  };
}

// ──────────────────────────────────────────────────────────────────────
// Mount
// ──────────────────────────────────────────────────────────────────────

function mountClipboardRoutes(app, redis) {
  if (!app || !redis) {
    throw new Error('[clipboard-routes] mountClipboardRoutes requires (app, redis)');
  }

  // ── 1. PUBLIC: read a shared drawer by token ──────────────────────
  // Registered BEFORE the auth middleware so the prefix-gate skips it.
  app.get('/api/clipboard/shared/:token', wrap(async (req, res) => {
    const payload = await loadShare(redis, String(req.params.token || ''));
    if (!payload || payload.kind !== 'dr_share') {
      return res.status(404).json({ error: 'expired' });
    }
    // Don't echo the owner's chatId on a public read.
    const { drawer, cards, snapshotAt } = payload;
    return res.json({ drawer, cards, snapshotAt });
  }));

  // ── 2. Authed prefix gate ─────────────────────────────────────────
  app.use('/api/clipboard', requireInitDataFromBodyOrHeader);

  // ── 3. STATE — catch-all + cabinet list (light) ───────────────────
  app.get('/api/clipboard/state', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const cabinets = await listCabinets(redis, chatId);
    // v0.62.330 (PR #3) — return the catch-all CARDS in full (up to 50)
    // alongside the count so the TMA's CatchAllStrip renders without a
    // second roundtrip. Backwards-compatible with PR #2 callers that
    // only read `catchAllCount` (the new `catchAllCards` is additive).
    const { listClips } = require('./clip-store');
    const { items, total } = await listClips(redis, chatId, { limit: 50, offset: 0 });
    // v0.62.416 — defaultCabinetId drives the TMA footer tab 2.
    // v0.62.442 — footer tab 2 shows the {default cabinet} name. If the user
    // hasn't explicitly set a default, fall back to their most-recent cabinet so
    // tab 2 always carries a real cabinet name (operator: it "didn't follow spec").
    const defaultCabinetId = (await getDefaultCabinetId(redis, chatId)) || (cabinets[0] && cabinets[0].cabId) || null;
    // v0.62.432 — attach each catch-all card's PLACEMENTS (cabinet + drawer
    // segment) so the card can show "{cabinet} · {drawer}" + a drawer-coloured
    // strip (operator item 10). Bounded: ≤50 cards × placements; drawers cached.
    try {
      const cabById = new Map(cabinets.map((c) => [c.cabId, c]));
      const drCache = new Map();
      const drawersFor = async (cabId) => {
        if (!drCache.has(cabId)) drCache.set(cabId, await readDrawers(redis, chatId, cabId));
        return drCache.get(cabId);
      };
      for (const it of items) {
        const tags = await redis.sMembers(locsKey(chatId, it.cardId)).catch(() => []);
        if (!tags || !tags.length) continue;
        const placements = [];
        for (const tag of tags) {
          const sep = tag.lastIndexOf(':');
          if (sep < 0) continue;
          const cabId = tag.slice(0, sep);
          const n = Number(tag.slice(sep + 1));
          const cab = cabById.get(cabId);
          const drs = await drawersFor(cabId);
          const d = drs && drs[n];
          if (cab && d) placements.push({ cabId, cabName: cab.name, drawerIdx: n, segment: d.segment });
        }
        if (placements.length) it.placements = placements;
      }
    } catch (err) { console.warn('[clipboard-routes] placement enrich failed:', err.message); }
    // v0.62.433 — archivedCount drives the Catch-all "Restore (N)" affordance.
    const archived = await archivedCount(redis, chatId);
    return res.json({ cabinets, catchAllCount: total, catchAllCards: items, defaultCabinetId, archivedCount: archived });
  }));

  // ── 3b. POST archive-all / restore the catch-all (v0.62.433) ──────
  app.post('/api/clipboard/archive-all', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const r = await archiveAllClips(redis, chatId);
    if (!r.ok) { const m = mapError(r.error); return res.status(m.status).json(m.body); }
    track(redis, chatId, 'archive_all', { archived: r.archived });
    return res.json({ ok: true, archived: r.archived });
  }));
  app.post('/api/clipboard/restore-archive', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const r = await restoreArchive(redis, chatId);
    if (!r.ok) { const m = mapError(r.error); return res.status(m.status).json(m.body); }
    track(redis, chatId, 'restore_archive', { restored: r.restored });
    return res.json({ ok: true, restored: r.restored });
  }));

  // ── 4. GET cabinet (full) ─────────────────────────────────────────
  app.get('/api/clipboard/cabinet/:id', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const cabinet = await getCabinet(redis, chatId, req.params.id);
    if (!cabinet) return res.status(404).json({ error: 'not-found' });
    const drawers = await readDrawers(redis, chatId, req.params.id);
    const drawersWithCards = await Promise.all(drawers.map(async (d, n) => ({
      ...d,
      index: n,
      cards: await getDrawerCards(redis, chatId, req.params.id, n)
    })));
    return res.json({ cabinet, drawers: drawersWithCards });
  }));

  // ── 5. POST cabinet (create) ──────────────────────────────────────
  app.post('/api/clipboard/cabinet', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const { name, emoji, location, dateStart, dateEnd } = req.body || {};
    const r = await createCabinet(redis, chatId, { name, emoji, location, dateStart, dateEnd });
    if (!r.ok) {
      const m = mapError(r.error);
      return res.status(m.status).json(m.body);
    }
    track(redis, chatId, 'add_cabinet', { cabId: r.cabinet.cabId, hasLocation: !!location, hasDates: !!(dateStart || dateEnd) });
    return res.status(201).json({ cabinet: r.cabinet });
  }));

  // ── 6. PATCH cabinet (rename / emoji / location / dates / sort) ───
  app.patch('/api/clipboard/cabinet/:id', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const r = await updateCabinet(redis, chatId, req.params.id, req.body || {});
    if (!r.ok) {
      const m = mapError(r.error);
      return res.status(m.status).json(m.body);
    }
    return res.json({ cabinet: r.cabinet });
  }));

  // ── 7. DELETE cabinet (cascade per operator-locked rules) ─────────
  app.delete('/api/clipboard/cabinet/:id', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const r = await deleteCabinet(redis, chatId, req.params.id);
    if (!r.ok) {
      const m = mapError(r.error);
      return res.status(m.status).json(m.body);
    }
    track(redis, chatId, 'delete_cabinet', { cabId: req.params.id, returned: r.returned || 0 });
    // v0.62.416 — echo cards returned to the clipboard + any default reassignment.
    return res.json({ ok: true, returned: r.returned || 0, reassignedDefault: r.reassignedDefault || null });
  }));

  // ── 8. POST drawer (add) — caps at 20 per cabinet ─────────────────
  app.post('/api/clipboard/cabinet/:id/drawer', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const { segment, dayTag, location, description } = req.body || {};
    const r = await addDrawer(redis, chatId, req.params.id, { segment, dayTag, location, description });
    if (!r.ok) {
      const m = mapError(r.error);
      return res.status(m.status).json(m.body);
    }
    track(redis, chatId, 'add_drawer', { cabId: req.params.id, segment, hasLocation: !!location });
    return res.status(201).json({ index: r.index, drawer: r.drawer });
  }));

  // ── 9. DELETE drawer (cascade per operator-locked rules) ──────────
  app.delete('/api/clipboard/cabinet/:id/drawer/:n', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const n = Number(req.params.n);
    const r = await deleteDrawer(redis, chatId, req.params.id, n);
    if (!r.ok) {
      const m = mapError(r.error);
      return res.status(m.status).json(m.body);
    }
    // v0.62.416 — echo cards returned to the clipboard (toast "N back to Clipboard").
    return res.json({ ok: true, returned: r.returned || 0 });
  }));

  // ── 9b. POST set default cabinet (v0.62.416) ──────────────────────
  app.post('/api/clipboard/cabinet/:id/default', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const r = await setDefaultCabinet(redis, chatId, req.params.id);
    if (!r.ok) { const m = mapError(r.error); return res.status(m.status).json(m.body); }
    track(redis, chatId, 'set_default_cabinet', { cabId: req.params.id });
    return res.json({ ok: true, defaultCabinetId: r.defaultCabinetId });
  }));

  // ── 9c. POST duplicate cabinet (v0.62.416) ────────────────────────
  app.post('/api/clipboard/cabinet/:id/duplicate', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const r = await duplicateCabinet(redis, chatId, req.params.id);
    if (!r.ok) { const m = mapError(r.error); return res.status(m.status).json(m.body); }
    track(redis, chatId, 'duplicate_cabinet', { from: req.params.id, to: r.cabinet.cabId });
    return res.json({ ok: true, cabinet: r.cabinet });
  }));

  // ── 9d. POST duplicate drawer (v0.62.416) ─────────────────────────
  app.post('/api/clipboard/cabinet/:id/drawer/:n/duplicate', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const n = Number(req.params.n);
    const r = await duplicateDrawer(redis, chatId, req.params.id, n);
    if (!r.ok) { const m = mapError(r.error); return res.status(m.status).json(m.body); }
    track(redis, chatId, 'duplicate_drawer', { cabId: req.params.id, from: n, to: r.index });
    return res.json({ ok: true, index: r.index });
  }));

  // ── 10. PATCH drawer (update location / dayTag / reorder) ─────────
  // Body: { dayTag?, location?, moveTo? }
  //   moveTo = absolute new index (0-based) to drag a drawer's order.
  //   Reorder is implemented as splice-out + splice-in on the drMeta LIST
  //   then re-key any affected card_locs tags.
  app.patch('/api/clipboard/cabinet/:id/drawer/:n', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const cabId = req.params.id;
    const n = Number(req.params.n);
    if (!Number.isInteger(n) || n < 0) {
      return res.status(400).json({ error: 'missing-args' });
    }
    if (!redis.isOpen) await redis.connect();
    const drawers = await readDrawers(redis, chatId, cabId);
    if (n >= drawers.length) return res.status(404).json({ error: 'drawer-not-found' });
    const cur = drawers[n];
    const patch = req.body || {};
    if (typeof patch.dayTag === 'string')   cur.dayTag = String(patch.dayTag).slice(0, 24);
    // v0.62.435 — item 12b: optional drawer description (free text, 120 chars).
    if (typeof patch.description === 'string') cur.description = String(patch.description).replace(/[\r\n]+/g, ' ').slice(0, 120);
    if (patch.location === null)            cur.location = null;
    if (patch.location && typeof patch.location === 'object') {
      const lat = Number(patch.location.lat), lng = Number(patch.location.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        cur.location = { lat, lng, label: String(patch.location.label || '').slice(0, 120) };
      }
    }
    // Update the metadata entry in place (no reorder).
    await redis.lSet(drMetaKey(chatId, cabId), n, JSON.stringify(cur));

    // Optional manual reorder — moveTo: absolute new index.
    if (Number.isInteger(patch.moveTo) && patch.moveTo >= 0 && patch.moveTo < drawers.length && patch.moveTo !== n) {
      // Splice-out / splice-in on the metadata LIST, then re-key the
      // affected per-drawer cardId LISTs and card_locs tags.
      const meta = await redis.lRange(drMetaKey(chatId, cabId), 0, -1);
      const reordered = [...meta];
      const [moved] = reordered.splice(n, 1);
      reordered.splice(patch.moveTo, 0, moved);
      // Rebuild metadata list.
      await redis.del(drMetaKey(chatId, cabId));
      if (reordered.length > 0) {
        await redis.rPush(drMetaKey(chatId, cabId), reordered);
      }
      // Move the per-drawer LISTs to fresh temp keys, then rename.
      // Simpler: read every drawer's cardIds, then re-place them all.
      const oldCards = [];
      for (let i = 0; i < drawers.length; i++) {
        oldCards.push(await redis.lRange(drListKey(chatId, cabId, i), 0, -1));
        await redis.del(drListKey(chatId, cabId, i)).catch(() => {});
      }
      // Compute new index for each old index.
      const newIdxFor = new Array(drawers.length);
      let walk = 0;
      for (let i = 0; i < drawers.length; i++) {
        if (i === n) continue;
        if (walk === patch.moveTo) walk++;
        newIdxFor[i] = walk;
        walk++;
      }
      newIdxFor[n] = patch.moveTo;
      // Write back the per-drawer LISTs at new indices, re-key card_locs.
      for (let i = 0; i < drawers.length; i++) {
        const newI = newIdxFor[i];
        const cardIds = oldCards[i];
        if (cardIds.length > 0) {
          await redis.rPush(drListKey(chatId, cabId, newI), cardIds);
        }
        for (const cardId of cardIds) {
          await redis.sRem(locsKey(chatId, cardId), locsTag(cabId, i));
          await redis.sAdd(locsKey(chatId, cardId), locsTag(cabId, newI));
          await recomputeCardTtl(redis, chatId, cardId);
        }
      }
    }
    // Touch the cabinet so its modifiedAt advances.
    await redis.hSet(cabHashKey(chatId, cabId), { modifiedAt: String(Date.now()) });
    const fresh = await readDrawers(redis, chatId, cabId);
    return res.json({ drawer: fresh[Number.isInteger(patch.moveTo) ? patch.moveTo : n] });
  }));

  // ── 11. POST card place ───────────────────────────────────────────
  // Body: { cabinetId, drawerIdx }
  app.post('/api/clipboard/card/:id/place', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const { cabinetId, drawerIdx } = req.body || {};
    const r = await placeCard(redis, chatId, req.params.id, cabinetId, Number(drawerIdx));
    if (!r.ok) {
      const m = mapError(r.error);
      return res.status(m.status).json(m.body);
    }
    track(redis, chatId, 'place_card', { cardId: req.params.id, cabId: cabinetId, drawerIdx: Number(drawerIdx), alreadyPresent: r.alreadyPresent === true });
    return res.json({ ok: true, alreadyPresent: r.alreadyPresent === true });
  }));

  // ── 12. POST card unplace ─────────────────────────────────────────
  app.post('/api/clipboard/card/:id/unplace', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const { cabinetId, drawerIdx } = req.body || {};
    const r = await unplaceCard(redis, chatId, req.params.id, cabinetId, Number(drawerIdx));
    if (!r.ok) {
      const m = mapError(r.error);
      return res.status(m.status).json(m.body);
    }
    return res.json({ ok: true });
  }));

  // ── 13. POST card move — place + unplace in one call ──────────────
  // Body: { from: { cabinetId, drawerIdx } | null,
  //         to:   { cabinetId, drawerIdx } | null }
  // null on either side means "catch-all" (no placement on that side).
  app.post('/api/clipboard/card/:id/move', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const { from, to } = req.body || {};
    if (from && from.cabinetId && Number.isInteger(from.drawerIdx)) {
      const r = await unplaceCard(redis, chatId, req.params.id, from.cabinetId, Number(from.drawerIdx));
      if (!r.ok) { const m = mapError(r.error); return res.status(m.status).json(m.body); }
    }
    if (to && to.cabinetId && Number.isInteger(to.drawerIdx)) {
      const r = await placeCard(redis, chatId, req.params.id, to.cabinetId, Number(to.drawerIdx));
      if (!r.ok) { const m = mapError(r.error); return res.status(m.status).json(m.body); }
    }
    track(redis, chatId, 'move_card', { cardId: req.params.id, from: from || null, to: to || null });
    return res.json({ ok: true });
  }));

  // ── 14. PATCH card (name / note / favourite) ──────────────────────
  // Body: { name?, note?, favourite? }
  // Note cap = 990 chars (operator-locked). Favourite toggle triggers
  // recomputeCardTtl which applies the PERSIST rule.
  app.patch('/api/clipboard/card/:id', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const cardId = req.params.id;
    const card = await getCardById(redis, chatId, cardId);
    if (!card) return res.status(404).json({ error: 'card-not-found' });
    const patch = req.body || {};
    const fields = {};
    if (typeof patch.name === 'string') {
      fields.name = patch.name.replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
    }
    if (typeof patch.note === 'string') {
      fields.note = patch.note.slice(0, MAX_NOTE_CHARS);   // 990 chars
    }
    if (typeof patch.favourite === 'boolean') {
      fields.favourite = patch.favourite ? '1' : '0';
    }
    if (Object.keys(fields).length === 0) return res.json({ card });
    if (!redis.isOpen) await redis.connect();
    await redis.hSet(cardKey(chatId, cardId), fields);
    await recomputeCardTtl(redis, chatId, cardId);
    const fresh = await getCardById(redis, chatId, cardId);
    return res.json({ card: fresh });
  }));

  // ── 15. DELETE card (hard) ────────────────────────────────────────
  // Walks every placement in card_locs, LREMs from each drawer's LIST,
  // then softDeleteCard. Also LREMs the catch-all index entry.
  app.delete('/api/clipboard/card/:id', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const cardId = req.params.id;
    if (!redis.isOpen) await redis.connect();
    const card = await getCardById(redis, chatId, cardId);
    if (!card) return res.status(404).json({ error: 'card-not-found' });
    // Walk placements (if any).
    const locs = await redis.sMembers(locsKey(chatId, cardId));
    for (const tag of locs) {
      const [cabId, nStr] = String(tag).split(':');
      const n = Number(nStr);
      if (!cabId || !Number.isFinite(n)) continue;
      await redis.lRem(drListKey(chatId, cabId, n), 0, cardId).catch(() => {});
    }
    // LREM from catch-all index.
    await redis.lRem(`clip:${chatId}`, 0, cardId).catch(() => {});
    // Hard delete HASH + locs SET.
    await softDeleteCard(redis, chatId, cardId);
    return res.json({ ok: true });
  }));

  // ── 16. POST drawer share — mint token ────────────────────────────
  app.post('/api/clipboard/cabinet/:id/drawer/:n/share', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const cabId = req.params.id;
    const n = Number(req.params.n);
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: 'missing-args' });
    const drawers = await readDrawers(redis, chatId, cabId);
    if (n >= drawers.length) return res.status(404).json({ error: 'drawer-not-found' });
    const cards = await getDrawerCards(redis, chatId, cabId, n);
    // Strip cardId from the snapshot (the fork side mints fresh ones).
    const snapshotCards = cards.map(({ cardId, ...rest }) => rest);
    const payload = {
      kind: 'dr_share',
      chatId,
      cabId,
      drawerIdx: n,
      snapshotAt: Date.now(),
      drawer: {
        segment: drawers[n].segment,
        dayTag: drawers[n].dayTag,
        location: drawers[n].location
      },
      cards: snapshotCards
    };
    const token = await saveShare(redis, payload);
    // Persist the token back onto the drawer metadata so the UI can show
    // "already shared" / refresh-link.
    const cur = drawers[n];
    cur.shareToken = token;
    await redis.lSet(drMetaKey(chatId, cabId), n, JSON.stringify(cur));
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'gia4lunch_bot';
    track(redis, chatId, 'share_drawer', { cabId, drawerIdx: n, cardCount: snapshotCards.length });
    return res.json({
      token,
      url: `https://t.me/${botUsername}/clipboard?startapp=dr_${token}`
    });
  }));

  // ── (15. shared GET already mounted above as PUBLIC) ──────────────

  // ── 16b. POST shared fork ─────────────────────────────────────────
  // Body: { cabinetId? }
  //   If cabinetId is omitted → cards land in caller's catch-all only.
  //   If cabinetId is provided → a fresh drawer with the same segment/
  //   dayTag is appended to that cabinet, and the cards are placed there.
  app.post('/api/clipboard/shared/:token/fork', wrap(async (req, res) => {
    const chatId = chatIdFrom(req);
    if (!chatId) return res.status(400).json({ error: 'missing-chatId' });
    const payload = await loadShare(redis, String(req.params.token || ''));
    if (!payload || payload.kind !== 'dr_share') {
      return res.status(404).json({ error: 'expired' });
    }
    const targetCabinetId = req.body?.cabinetId || null;
    let targetDrawerIdx = null;
    let targetCabinet = null;
    if (targetCabinetId) {
      targetCabinet = await getCabinet(redis, chatId, targetCabinetId);
      if (!targetCabinet) return res.status(404).json({ error: 'cabinet-not-found' });
      const drawerResult = await addDrawer(redis, chatId, targetCabinetId, {
        segment: payload.drawer.segment,
        dayTag: payload.drawer.dayTag,
        location: payload.drawer.location
      });
      if (!drawerResult.ok) {
        const m = mapError(drawerResult.error);
        return res.status(m.status).json(m.body);
      }
      targetDrawerIdx = drawerResult.index;
    }
    // Mint fresh cardIds for each snapshot card and (optionally) place them.
    const newCardIds = [];
    for (const card of payload.cards || []) {
      await pushClip(redis, chatId, {
        body: card.body,
        cuisines: card.cuisines || [],
        filters: card.filters || {},
        region: card.region || 'SG',
        venueCount: card.venueCount || 1,
        preview: card.preview || '',
        lang: card.lang || 'en',
        name: card.name || '',
        note: card.note || '',
        type: card.type || 'one'
      });
      // pushClip LPUSHes the new cardId at index 0 of clip:<chatId>.
      const newId = await redis.lIndex(`clip:${chatId}`, 0);
      if (newId) {
        newCardIds.push(newId);
        if (targetCabinetId && Number.isInteger(targetDrawerIdx)) {
          await placeCard(redis, chatId, newId, targetCabinetId, targetDrawerIdx);
        }
      }
    }
    track(redis, chatId, 'fork_drawer', { token: req.params.token, forkedCount: newCardIds.length, intoCabinet: !!targetCabinetId });
    return res.json({
      ok: true,
      forkedCount: newCardIds.length,
      cabinetId: targetCabinetId,
      drawerIdx: targetDrawerIdx
    });
  }));
}

module.exports = { mountClipboardRoutes };
