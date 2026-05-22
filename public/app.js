(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();

  // Global error swallow — keeps unhandled errors out of the iPadOS
  // native "An error occurred" system modal that locks the screen.
  window.addEventListener('error', (e) => {
    e.preventDefault();
    setStatus('Gia hit a snag. Reopen from inside Telegram to retry.', false);
  });
  window.addEventListener('unhandledrejection', (e) => {
    e.preventDefault();
    setStatus('Gia hit a snag. Reopen from inside Telegram to retry.', false);
  });

  const RAFFLES_PLACE = { lat: 1.2839, lng: 103.8517 };
  const GMAPS_INSTALL_URL = 'https://apps.apple.com/app/google-maps/id585027354';
  const APP_PROBE_TIMEOUT_MS = 1500;
  let MAP_ID = 'GIA_SANCTUARY'; // overridden from /maps-key when MAP_ID env is set
  const FOCUS_PLACE_ID = new URLSearchParams(window.location.search).get('placeId');
  const statusEl = document.getElementById('status');
  let map;
  let venueMarkers = [];
  let userMarker;
  let AdvancedMarkerElement;

  function setStatus(text, hide) {
    if (!statusEl) return;
    const msgEl = statusEl.querySelector('.msg') || statusEl;
    msgEl.textContent = text;
    statusEl.classList.toggle('hidden', !!hide);
    statusEl.classList.toggle('done', !!hide);
  }

  async function authedFetch(url) {
    const initData = tg?.initData || '';
    const res = await fetch(url, { headers: { 'X-Telegram-Init-Data': initData } });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  }

  function loadMapsScript(key) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) return resolve();
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('maps script load failed'));
      document.head.appendChild(script);
    });
  }

  function isIOS() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }

  function externalOpen(url) {
    if (tg && typeof tg.openLink === 'function') tg.openLink(url, { try_instant_view: false });
    else window.open(url, '_blank', 'noopener');
  }

  function ask(message, callback) {
    if (tg && typeof tg.showConfirm === 'function') tg.showConfirm(message, callback);
    else callback(window.confirm(message));
  }

  function openMapsForVenue(v) {
    // v0.57.10: dropped the comgooglemaps:// probe + "not installed"
    // dialog. Telegram WebView blocks custom URL schemes, so the probe
    // ALWAYS fired the false-positive dialog even when Google Maps was
    // installed. The https://www.google.com/maps/...?api=1&... form
    // is a Universal Link — iOS auto-routes to the Google Maps app
    // when installed, falls back to the web map otherwise. Android
    // App Links behave the same.
    const name = v.name || '';
    const placeId = v.placeId || '';
    const httpsUrl = placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
      : (v.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`);
    externalOpen(httpsUrl);
  }

  // v0.60.61 — minimal HTML escape for InfoWindow content. Mirrors
  // index.js's escapeHtmlForTelegram so server- and client-side
  // bus-stop popups stay byte-identical for any name/load string.
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // v0.60.184 — emoji-coded glyph priority. Operator: ✳️ Michelin /
  // 🐾 Pet / 🍮 Dessert override the default numeric pin. Bus-stop /
  // car-park overlays use the venue.kind field set server-side
  // (transport map payload).
  const DESSERT_RX = /dessert|patisserie|p[âa]tisserie|bakery|cafe|caf[ée]|ice ?cream|gelato|sweet|confection/i;
  function pinGlyphFor(venue) {
    if (!venue) return null;
    if (venue.michelinCategory) return '✳️';
    if (venue.allowsDogs === true) return '🐾';
    if (typeof venue.restaurantType === 'string' && DESSERT_RX.test(venue.restaurantType)) return '🍮';
    if (venue.kind === 'busStop' || venue.kind === 'bus_stop') return '🚏';
    if (venue.kind === 'carPark' || venue.kind === 'car_park' || venue.kind === 'carpark') return '🅿️';
    return null;
  }

  function makePinContent(num, name, isUser, venue) {
    const div = document.createElement('div');
    div.className = isUser ? 'gia-pin user' : 'gia-pin';
    const n = document.createElement('span');
    n.className = 'num';
    // v0.60.184 — emoji glyph overrides the numeric default when the
    // venue has a category attribute. The plain number still drives
    // the legacy 1/2/3/… display for ordinary picks.
    const glyph = isUser ? null : pinGlyphFor(venue);
    n.textContent = glyph || String(num);
    const t = document.createElement('span');
    t.className = 'name';
    t.textContent = name;
    div.appendChild(n);
    div.appendChild(t);
    return div;
  }

  function initMap(center) {
    map = new google.maps.Map(document.getElementById('map'), {
      center,
      zoom: 16,
      mapId: MAP_ID,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    });
  }

  function clearMarkers() {
    venueMarkers.forEach((m) => { m.map = null; });
    venueMarkers = [];
  }

  function renderVenues(label, venues) {
    clearMarkers();
    let list = venues;
    if (FOCUS_PLACE_ID) {
      const focused = venues.filter((v) => v.placeId === FOCUS_PLACE_ID);
      if (focused.length) list = focused;
    }
    if (!list.length) {
      setStatus(`No ${label} sanctuary nearby — try later.`);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    list.forEach((v, i) => {
      const pos = { lat: v.lat, lng: v.lng };
      const content = makePinContent(i + 1, v.name, false, v);
      const marker = new AdvancedMarkerElement({
        map,
        position: pos,
        title: v.name,
        content
      });
      const linkId = `open-maps-${i}`;
      // v0.60.71 — label aligned with the v0.60.66 Hawker pattern
      // ("Open 📍 in a map ↗"). Behaviour unchanged — still routes
      // through openMapsForVenue(v) which uses v.url.
      const linkHtml = (v.placeId || v.url || v.name)
        ? `<br><a href="#" id="${linkId}">Open 📍 in a map ↗</a>`
        : '';
      // v0.60.76 — when the venue carries `lines` (MRT station
      // payload from /transport train), render the operating-line
      // emojis inside the popup. Mirrors the chat-side pattern.
      // v0.60.83 — square emojis (mirrors mrt-lines.js LINES table).
      const LINE_META = {
        EWL:  { e: '🟩', n: 'EWL'  },
        CGL:  { e: '🟩', n: 'CGL'  },
        NSL:  { e: '🟥', n: 'NSL'  },
        NEL:  { e: '🟪', n: 'NEL'  },
        CCL:  { e: '🟧', n: 'CCL'  },
        DTL:  { e: '🟦', n: 'DTL'  },
        TEL:  { e: '🟫', n: 'TEL'  },
        JRL:  { e: '🟦', n: 'JRL'  },
        CRL:  { e: '🟩', n: 'CRL'  },
        BPL:  { e: '⬜', n: 'BPL'  },
        SLRT: { e: '⬜', n: 'SLRT' },
        PLRT: { e: '⬜', n: 'PLRT' }
      };
      const linesHtml = (Array.isArray(v.lines) && v.lines.length)
        ? '<br>' + v.lines.map((code) => {
            const m = LINE_META[code];
            if (!m) return escapeHtml(code);
            return `${m.e} <strong>${escapeHtml(m.n)}</strong>`;
          }).join(' · ')
        : '';
      // v0.60.61 / v0.60.121 — when the venue carries `arrivals`
      // (bus-stop payload from /transport bus nearest), render them
      // inside the popup grouped by ETA band, the same way the chat
      // reply does ("№ 145, 273, 120 — ≤5 min"). transport.busArrivals
      // already returns them sorted by next-bus minute, so insertion
      // order into each band is "earliest first". Band logic mirrors
      // busArrivalBand() server-side.
      let arrivalsHtml = '';
      if (Array.isArray(v.arrivals) && v.arrivals.length) {
        const bandFor = (m) => {
          if (!Number.isFinite(m)) return '—';
          if (m <= 5) return '≤5 min';
          if (m <= 10) return '≤10 min';
          if (m <= 15) return '≤15 min';
          if (m <= 20) return '≤20 min';
          return '>20 min';
        };
        const byBand = new Map();
        for (const a of v.arrivals) {
          const svc = String(a.service || '').trim();
          if (!svc) continue;
          const key = bandFor(Number.isFinite(a.minutes) ? a.minutes : null);
          if (!byBand.has(key)) byBand.set(key, []);
          byBand.get(key).push(svc);
        }
        const rows = [...byBand.entries()].map(([band, svcs]) => {
          const list = svcs.map((s) => escapeHtml(s)).join(', ');
          const bandStr = band === '—' ? '<em>—</em>' : `<strong>${band}</strong>`;
          return `№ ${list} — ${bandStr}`;
        });
        if (rows.length) arrivalsHtml = '<br>' + rows.join('<br>');
      }
      const info = new google.maps.InfoWindow({
        content: `<div style="max-width:260px;font-size:12px;line-height:1.45"><strong>${escapeHtml(v.name)}</strong><br>${escapeHtml(v.area || '')}${v.vibe ? '<br><em>' + escapeHtml(v.vibe) + '</em>' : ''}${linesHtml}${arrivalsHtml}${linkHtml}</div>`
      });
      marker.addListener('click', () => info.open({ anchor: marker, map }));
      info.addListener('domready', () => {
        const a = document.getElementById(linkId);
        if (a) a.onclick = (ev) => { ev.preventDefault(); openMapsForVenue(v); };
      });
      venueMarkers.push(marker);
      bounds.extend(pos);
    });
    if (userMarker) bounds.extend(userMarker.position);
    if (list.length > 1) map.fitBounds(bounds, 80);
    else { map.setCenter(list[0]); map.setZoom(17); }
    const focusNote = FOCUS_PLACE_ID ? ` (focused)` : '';
    setStatus(`${list.length} ${label} pick${list.length === 1 ? '' : 's'}${focusNote}`, true);
  }

  // ---- v0.61.87 — in-map overlay layers + toggle row ----------------
  // Operator: /app/map carries the same "⋯ / Train Line / Bus Stop /
  // Car Park" control row as the TMA maps. Train Line draws the MRT/LRT
  // polylines; Bus Stop / Car Park drop viewport-clipped pins. Built in
  // plain DOM — /app/map has no React / MapControls.
  const LINE_HEX = {
    NSL: '#d42e12', EWL: '#009645', CGL: '#009645', NEL: '#9900aa',
    CCL: '#fa9e0d', DTL: '#005ec4', TEL: '#9D5B25', BPL: '#999999',
    SLRT: '#999999', PLRT: '#999999', JRL: '#0099aa', CRL: '#97c93d'
  };
  const overlay = {
    train:   { on: false, loaded: false, polylines: [], stations: [], stationMarkers: [] },
    busstop: { on: false, data: null, markers: [] },
    carpark: { on: false, data: null, markers: [] }
  };
  let overlayInfo = null;

  function overlayPin(glyph) {
    const el = document.createElement('div');
    el.textContent = glyph;
    el.style.cssText = 'font-size:18px;line-height:1;cursor:pointer;'
      + 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));';
    return el;
  }

  async function ensureTrainLayer() {
    if (overlay.train.loaded) return;
    overlay.train.loaded = true;
    let paths = null;
    try {
      const r = await fetch('/api/transport/line-paths');
      const d = await r.json();
      paths = d && d.paths;
    } catch { paths = null; }
    if (!paths) return;
    for (const code of Object.keys(paths)) {
      if (code.startsWith('_') || !Array.isArray(paths[code])) continue;
      const colour = LINE_HEX[code] || '#888888';
      for (const seg of paths[code]) {
        if (!Array.isArray(seg) || seg.length < 2) continue;
        overlay.train.polylines.push(new google.maps.Polyline({
          path: seg.map((p) => ({ lat: p.lat, lng: p.lng })),
          strokeColor: colour, strokeOpacity: 0.85, strokeWeight: 4,
          clickable: false, zIndex: 1
        }));
      }
    }
    // v0.61.100 — station data so the Train Line layer shows tappable
    // stations, not just lines (operator).
    try {
      const sr = await fetch('/api/transport/stations');
      const sd = await sr.json();
      overlay.train.stations = Array.isArray(sd.stations) ? sd.stations : [];
    } catch { overlay.train.stations = []; }
  }

  async function ensureLayerData(key, url, field) {
    if (overlay[key].data) return;
    try {
      const r = await fetch(url);
      const d = await r.json();
      overlay[key].data = Array.isArray(d[field]) ? d[field] : [];
    } catch { overlay[key].data = []; }
  }

  function clearLayerMarkers(key) {
    overlay[key].markers.forEach((m) => { m.map = null; });
    overlay[key].markers = [];
  }

  function busInfo(f) {
    const name = f.description || f.road || ('Bus Stop ' + (f.code || ''));
    return { title: name, html: `<div style="font-size:12px;line-height:1.45">`
      + `<strong>🚏 ${escapeHtml(name)}</strong><br>Bus Stop № ${escapeHtml(f.code || '')}</div>` };
  }
  // v0.61.100 — LTA carpark names arrive ALL CAPS; render them in
  // Proper Case (operator: "not all lowercase or uppercase").
  function toTitleCase(s) {
    if (!s) return s;
    return String(s).toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }
  function carparkInfo(f) {
    const name = toTitleCase(f.development || f.name || 'Carpark');
    const lots = Number.isFinite(f.availableLots) ? ` — ${f.availableLots} lots` : '';
    return { title: name, html: `<div style="font-size:12px;line-height:1.45">`
      + `<strong>🅿️ ${escapeHtml(name)}</strong>${escapeHtml(lots)}</div>` };
  }

  // v0.61.102 — operator: the bus-stop overlay marker renders by zoom
  // tier — "🚏 Bus Stop № <code>" (z17+), "🚏 № <code>" (z15-16), the
  // "🚏" glyph (z13-14, smaller z11-12), a light-yellow square + red
  // "b" (z<=10), each tier a touch smaller than the one above.
  function busTier(zoom) {
    if (zoom >= 17) return 'full';
    if (zoom >= 16) return 'short';
    if (zoom >= 15) return 'glyph';
    if (zoom >= 14) return 'glyph-lg';   // v0.61.104 — z14 one size larger
    if (zoom >= 13) return 'glyph';
    if (zoom >= 11) return 'glyph-sm';
    return 'square';
  }
  function busTierPin(tier, code) {
    const el = document.createElement('div');
    if (tier === 'full' || tier === 'short') {
      el.textContent = (tier === 'full' ? '🚏 Bus Stop № ' : '🚏 № ') + (code || '');
      el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:8px;'
        + 'background:#fff;color:#1c1c1f;white-space:nowrap;font-weight:700;'
        + 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);'
        + 'cursor:pointer;line-height:1.5;font-size:' + (tier === 'full' ? 11 : 10) + 'px;';
    } else if (tier === 'glyph' || tier === 'glyph-sm' || tier === 'glyph-lg') {
      el.textContent = '🚏';
      el.style.cssText = 'cursor:pointer;line-height:1;font-size:'
        + (tier === 'glyph-lg' ? 18 : tier === 'glyph' ? 16 : 14) + 'px;';
    } else {
      el.textContent = 'b';
      el.style.cssText = 'width:12px;height:12px;display:flex;align-items:center;'
        + 'justify-content:center;background:#FFF59D;color:#D32F2F;font-weight:800;'
        + 'font-size:9px;line-height:1;cursor:pointer;border:1px solid #fff;'
        + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);';
    }
    return el;
  }

  // Bus stops (~5500) / carparks are viewport-clipped: render only the
  // features inside the current bounds. Re-runs on every map `idle`.
  function renderClippedLayer(key, glyph, infoFn) {
    clearLayerMarkers(key);
    if (!overlay[key].on || !overlay[key].data) return;
    const bounds = map.getBounds && map.getBounds();
    const zoom = map.getZoom() || 0;
    // v0.61.102 — bus stops tier all the way down (z<=10 = square); the
    // carpark layer keeps its z>=14 gate.
    const minZoom = key === 'busstop' ? 10 : 14;
    if (!bounds || zoom < minZoom) return;
    const bt = key === 'busstop' ? busTier(zoom) : null;
    let drawn = 0;
    for (const f of overlay[key].data) {
      if (drawn >= 250) break;
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      const pos = { lat: f.lat, lng: f.lng };
      if (!bounds.contains(pos)) continue;
      const marker = new AdvancedMarkerElement({ map, position: pos,
        content: bt ? busTierPin(bt, f.code) : overlayPin(glyph) });
      marker.addListener('click', () => {
        if (!overlayInfo) overlayInfo = new google.maps.InfoWindow();
        overlayInfo.setContent(infoFn(f).html);
        overlayInfo.open({ anchor: marker, map });
      });
      overlay[key].markers.push(marker);
      drawn++;
    }
  }

  function clearTrainStations() {
    overlay.train.stationMarkers.forEach((m) => { m.map = null; });
    overlay.train.stationMarkers = [];
  }
  function stationInfoHtml(s) {
    const codes = Array.isArray(s.codes) ? s.codes.filter(Boolean).join(' · ') : '';
    const q = encodeURIComponent(`${s.name || ''} MRT Station Singapore`);
    return '<div style="font-size:12px;line-height:1.45">'
      + `<strong>🚉 ${escapeHtml(s.name || '')}</strong>`
      + (codes ? `<br>${escapeHtml(codes)}` : '')
      + `<br><a href="https://www.google.com/maps/search/?api=1&query=${q}" `
      + 'target="_blank" rel="noopener">Open 📍 in a map ↗</a></div>';
  }
  // v0.61.100 — station markers for the Train Line layer; viewport-
  // clipped + zoom-gated (z>=13) like the bus / carpark layers so the
  // ~177-station network never floods the map. Re-runs on map idle.
  function renderTrainStations() {
    clearTrainStations();
    if (!overlay.train.on) return;
    const bounds = map.getBounds && map.getBounds();
    if (!bounds || (map.getZoom() || 0) < 13) return;
    let drawn = 0;
    for (const s of overlay.train.stations) {
      if (drawn >= 200) break;
      if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      if (s.status === 'future') continue;
      const pos = { lat: s.lat, lng: s.lng };
      if (!bounds.contains(pos)) continue;
      const marker = new AdvancedMarkerElement({
        map, position: pos, title: s.name || '', content: overlayPin('🚉')
      });
      marker.addListener('click', () => {
        if (!overlayInfo) overlayInfo = new google.maps.InfoWindow();
        overlayInfo.setContent(stationInfoHtml(s));
        overlayInfo.open({ anchor: marker, map });
      });
      overlay.train.stationMarkers.push(marker);
      drawn++;
    }
  }

  // ---- v0.61.101 — the ⋯ dropdown's extra overlay layers -----------
  // The toggle row carries Train Line / Bus Stop / Car Park; the ⋯
  // dropdown carries the rest, fetched in one shot from
  // /api/geo/overlays. Operator: "the dropdown isn't working".
  // v0.61.104 — operator: match the Hawker TMA's dropdown layer set +
  // order (exits, taxis, attractions, parks, police, clinics, hospitals).
  const MENU_LAYERS = [
    { key: 'exits',       label: 'Station Exits', glyph: '🚪' },
    { key: 'taxis',       label: 'Taxis',         glyph: '🚕' },
    { key: 'attractions', label: 'Attractions',   glyph: '⚝' },
    { key: 'parks',       label: 'Parks',         glyph: '🌳', polygon: true },
    { key: 'police',      label: 'Police',        glyph: '👮' },
    { key: 'clinics',     label: 'Clinics',       glyph: '💊' },
    { key: 'hospitals',   label: 'Hospitals',     glyph: '🏥' }
  ];
  const menuState = {};
  MENU_LAYERS.forEach((L) => { menuState[L.key] = { on: false, items: [] }; });
  let overlaysData = null;

  async function ensureOverlaysData() {
    if (overlaysData) return;
    try {
      const r = await fetch('/api/geo/overlays');
      overlaysData = await r.json();
    } catch { overlaysData = {}; }
  }

  function clearMenuLayer(key) {
    // Polygons expose setMap(); AdvancedMarkerElement uses the .map prop.
    menuState[key].items.forEach((m) => {
      if (typeof m.setMap === 'function') m.setMap(null);
      else m.map = null;
    });
    menuState[key].items = [];
  }

  // Viewport-clipped + zoom-gated (z>=13) like the bus / carpark layers.
  function renderMenuLayer(L) {
    clearMenuLayer(L.key);
    if (!menuState[L.key].on || !overlaysData) return;
    const bounds = map.getBounds && map.getBounds();
    if (!bounds || (map.getZoom() || 0) < 13) return;
    const feats = Array.isArray(overlaysData[L.key]) ? overlaysData[L.key] : [];
    let drawn = 0;
    for (const f of feats) {
      if (drawn >= 200) break;
      if (L.polygon) {
        const rings = (f.rings || []).map((ring) => ring.map(([lng, lat]) => ({ lat, lng })));
        const first = rings[0] && rings[0][0];
        if (!first || !bounds.contains(first)) continue;
        const poly = new google.maps.Polygon({
          paths: rings, strokeColor: '#2E7D32', strokeOpacity: 0.6,
          strokeWeight: 1, fillColor: '#4CAF50', fillOpacity: 0.22, clickable: false
        });
        poly.setMap(map);
        menuState[L.key].items.push(poly);
      } else {
        if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
        const pos = { lat: f.lat, lng: f.lng };
        if (!bounds.contains(pos)) continue;
        const marker = new AdvancedMarkerElement({ map, position: pos, content: overlayPin(L.glyph) });
        marker.addListener('click', () => {
          if (!overlayInfo) overlayInfo = new google.maps.InfoWindow();
          overlayInfo.setContent('<div style="font-size:12px;line-height:1.45">'
            + `<strong>${L.glyph} ${escapeHtml(f.name || L.label)}</strong></div>`);
          overlayInfo.open({ anchor: marker, map });
        });
        menuState[L.key].items.push(marker);
      }
      drawn++;
    }
  }

  function refreshMenuLayers() {
    for (const L of MENU_LAYERS) {
      if (menuState[L.key].on) renderMenuLayer(L);
    }
  }

  async function toggleMenuLayer(L, boxEl) {
    menuState[L.key].on = !menuState[L.key].on;
    if (boxEl) boxEl.textContent = menuState[L.key].on ? '☑' : '☐';
    if (menuState[L.key].on) {
      await ensureOverlaysData();
      renderMenuLayer(L);
    } else {
      clearMenuLayer(L.key);
    }
  }

  function refreshClippedLayers() {
    if (overlay.busstop.on) renderClippedLayer('busstop', '🚏', busInfo);
    if (overlay.carpark.on) renderClippedLayer('carpark', '🅿️', carparkInfo);
    if (overlay.train.on) renderTrainStations();
    refreshMenuLayers();
  }

  function paintToggle(btn, on) {
    btn.style.background = on ? '#1565C0' : '#fff';
    btn.style.color = on ? '#fff' : '#1c1c1f';
  }

  async function toggleLayer(key, btn) {
    overlay[key].on = !overlay[key].on;
    paintToggle(btn, overlay[key].on);
    if (key === 'train') {
      await ensureTrainLayer();
      overlay.train.polylines.forEach((pl) => pl.setMap(overlay.train.on ? map : null));
      if (overlay.train.on) renderTrainStations();
      else clearTrainStations();
    } else if (key === 'busstop') {
      if (overlay.busstop.on) {
        await ensureLayerData('busstop', '/api/geo/bus-stops', 'busstops');
        renderClippedLayer('busstop', '🚏', busInfo);
      } else clearLayerMarkers('busstop');
    } else if (key === 'carpark') {
      if (overlay.carpark.on) {
        await ensureLayerData('carpark', '/api/geo/carpark', 'carparks');
        renderClippedLayer('carpark', '🅿️', carparkInfo);
      } else clearLayerMarkers('carpark');
    }
  }

  function buildToggleRow() {
    const row = document.createElement('div');
    row.style.cssText = 'position:fixed;top:8px;left:12px;z-index:40;'
      + 'display:flex;gap:6px;align-items:center;';
    const mkBtn = (label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'border:1px solid #d0d0d0;border-radius:14px;'
        + 'padding:5px 10px;font-size:11px;font-weight:600;line-height:1;'
        + 'background:#fff;color:#1c1c1f;box-shadow:0 1px 4px rgba(0,0,0,0.22);'
        + 'cursor:pointer;white-space:nowrap;';
      return b;
    };
    // v0.61.101 — the ⋯ overflow dropdown carries the extra overlay
    // layers (parks / attractions / clinics / police / hospitals).
    const menuBtn = mkBtn('⋯');
    menuBtn.style.borderRadius = '8px';
    menuBtn.style.padding = '5px 9px';
    row.appendChild(menuBtn);
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:44px;left:12px;z-index:41;display:none;'
      + 'background:#fff;border:1px solid #d0d0d0;border-radius:10px;'
      + 'box-shadow:0 2px 10px rgba(0,0,0,0.28);padding:4px;min-width:158px;';
    MENU_LAYERS.forEach((L) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.style.cssText = 'display:flex;width:100%;gap:7px;align-items:center;'
        + 'border:0;background:none;padding:7px 9px;font-size:12px;font-weight:600;'
        + 'color:#1c1c1f;cursor:pointer;border-radius:6px;text-align:left;';
      const box = document.createElement('span');
      box.textContent = '☐';
      const lbl = document.createElement('span');
      lbl.textContent = `${L.glyph} ${L.label}`;
      item.appendChild(box);
      item.appendChild(lbl);
      item.addEventListener('click', () => { toggleMenuLayer(L, box).catch(() => {}); });
      panel.appendChild(item);
    });
    document.body.appendChild(panel);
    menuBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', (ev) => {
      if (panel.style.display !== 'none'
        && ev.target !== menuBtn && !panel.contains(ev.target)) {
        panel.style.display = 'none';
      }
    });
    // v0.61.104 — operator: match the Hawker TMA toggle-row order.
    [['train', 'Train Line'], ['carpark', 'Car Park'], ['busstop', 'Bus Stop']]
      .forEach(([key, label]) => {
        const b = mkBtn(label);
        b.addEventListener('click', () => { toggleLayer(key, b).catch(() => {}); });
        row.appendChild(b);
      });
    document.body.appendChild(row);
    map.addListener('idle', refreshClippedLayers);
  }

  // v0.61.100 — bottom-right zoom-level readout doubling as a recenter
  // button (operator: "customised current-location pin with the
  // integer of the zoom level"). A white circle; tapping it pans back
  // to the user's GPS location.
  function buildZoomPin() {
    const btn = document.createElement('button');
    btn.type = 'button';
    // v0.61.102 — operator: a faint "🔭 <zoom>" readout (30% opacity,
    // 2 px smaller) — no longer a solid white circle.
    btn.style.cssText = 'position:fixed;bottom:16px;right:14px;z-index:40;'
      + 'border:0;background:none;color:#1c1c1f;font-size:11px;font-weight:700;'
      + 'opacity:0.9;cursor:pointer;padding:0;line-height:1;';
    const paint = () => { btn.textContent = '🔭 ' + Math.round(map.getZoom() || 0); };
    paint();
    map.addListener('zoom_changed', paint);
    btn.addEventListener('click', () => {
      if (userMarker && userMarker.position) {
        map.panTo(userMarker.position);
        if ((map.getZoom() || 0) < 15) map.setZoom(16);
      }
    });
    document.body.appendChild(btn);
  }

  function getUserPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  async function boot() {
    let mapsKey;
    try {
      const data = await authedFetch('/maps-key');
      mapsKey = data.key;
      if (data.mapId) MAP_ID = data.mapId;
    } catch { setStatus('Could not authenticate with Gia. Open from inside Telegram.'); return; }
    if (!mapsKey) { setStatus('Maps key not configured.'); return; }
    try { await loadMapsScript(mapsKey); }
    catch { setStatus('Maps failed to load.'); return; }

    try {
      const lib = await google.maps.importLibrary('marker');
      AdvancedMarkerElement = lib.AdvancedMarkerElement;
    } catch {
      setStatus('Marker library failed to load.');
      return;
    }

    const userPos = await getUserPosition();
    const center = userPos || RAFFLES_PLACE;
    initMap(center);
    buildToggleRow();   // v0.61.87 — ⋯ / Train Line / Bus Stop / Car Park
    buildZoomPin();     // v0.61.100 — zoom readout + recenter button
    if (userPos) {
      userMarker = new AdvancedMarkerElement({
        map,
        position: userPos,
        title: 'You',
        content: makePinContent('•', 'You', true)
      });
    }

    // v0.32.0: when launched with #venues=<base64> hash from the
    // Cuisine Picker TMA's "🗺 View all on map" button, decode and
    // render those venues directly instead of fetching /api/sanctuary.
    const hashVenues = parseHashVenues();
    if (hashVenues && hashVenues.length) {
      setStatus(`Showing ${hashVenues.length} pick${hashVenues.length === 1 ? '' : 's'} from Cuisine Picker.`);
      renderVenues('cuisine picks', hashVenues);
      // Auto-hide status after 3 s on the multi-marker view.
      setTimeout(() => setStatus('', true), 3000);
      return;
    }

    setStatus('Asking Gia for sanctuary picks…');
    try {
      const url = `/api/sanctuary?lat=${center.lat}&lng=${center.lng}`;
      const data = await authedFetch(url);
      renderVenues(data.label || 'sanctuary', data.venues || []);
    } catch {
      setStatus('Could not load picks. Try again in a moment.');
    }
  }

  function parseHashVenues() {
    try {
      const hash = window.location.hash || '';
      const m = hash.match(/(?:^#|&)venues=([^&]+)/);
      if (!m) return null;
      // base64url → JSON. Each venue must have placeId, name, lat, lng.
      const json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))));
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return null;
      return arr.filter((v) => v && Number.isFinite(v.lat) && Number.isFinite(v.lng));
    } catch (err) {
      console.warn('[Map] parseHashVenues failed:', err.message);
      return null;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
