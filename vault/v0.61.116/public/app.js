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

  // v0.61.106 — operator: /app/map's Train Line stations mirror the
  // Hawker TMA's train-tier algorithm. The block below is a compact
  // re-implementation of web/cuisine/src/v2/lib/mapOverlays.js (this
  // plain-IIFE page cannot import that ES module).
  const PREFIX_TO_LINE = {
    NS: 'NSL', EW: 'EWL', CG: 'CGL', NE: 'NEL', CC: 'CCL', CE: 'CCL',
    DT: 'DTL', TE: 'TEL', BP: 'BPL', SE: 'SLRT', SW: 'SLRT', STC: 'SLRT',
    PE: 'PLRT', PW: 'PLRT', PTC: 'PLRT', JS: 'JRL', JE: 'JRL', CR: 'CRL'
  };
  const CHIP = { LG: 1, MD: 0.87, SM: 0.74, XS: 0.62 };
  function parseCode(code) {
    const m = String(code == null ? '' : code).match(/^([A-Za-z]+)(\d*)$/);
    return m ? { prefix: m[1].toUpperCase() } : null;
  }
  function codeHex(code) {
    const pc = parseCode(code);
    return (pc && LINE_HEX[PREFIX_TO_LINE[pc.prefix]]) || '#888888';
  }
  // Hawker TMA train-tier bands — trainTier('hawker', zoom).
  function trainTier(zoom) {
    if (zoom < 12) return { station: 'sq-sm', cap: 0, opacity: 0.5 };
    if (zoom < 13) return { station: 'chip', scale: 0.75, cap: 5, opacity: 0.7, other: 'sq-sm', overlapChip: CHIP.XS };
    if (zoom < 14) return { station: 'chip', scale: 0.85, cap: 10, opacity: 0.7, other: 'sq-sm', overlapChip: CHIP.XS };
    if (zoom < 15) return { station: 'chip', scale: 1, cap: 15, opacity: 0.7, other: 'sq-sm', overlapChip: CHIP.SM };
    return { station: 'pill', cap: 0, opacity: 1, overlapChip: CHIP.SM };
  }
  function metresBetween(aLat, aLng, bLat, bLng) {
    const dy = (bLat - aLat) * 110574;
    const dx = (bLng - aLng) * 111320 * Math.cos(aLat * Math.PI / 180);
    return Math.hypot(dx, dy);
  }
  function metresPerPixelAt(zoom, lat) {
    return 156543.03392 * Math.cos((lat || 0) * Math.PI / 180) / Math.pow(2, zoom);
  }
  function markerBoxPx(mode, codeCount, nameLen) {
    const codes = codeCount > 0 ? codeCount : 1;
    if (mode === 'pill') return { w: 22 + codes * 23 + (nameLen + 8) * 6.2, h: 23 };
    if (typeof mode === 'string' && mode.indexOf('chip:') === 0) {
      const s = parseFloat(mode.slice(5)) || 1;
      return { w: (12 + codes * 23) * s, h: 21 * s };
    }
    if (mode === 'sq') return { w: 13, h: 13 };
    return { w: 9, h: 9 };
  }
  // Iterative symmetric overlap demotion (mapOverlays.js v0.61.94).
  function demoteByOverlap(items, zoom, overlapChip) {
    const list = (items || []).filter((it) => it && it.mode);
    if (list.length < 2) return items;
    const boxOf = (it) => markerBoxPx(it.mode,
      Array.isArray(it.codes) ? it.codes.length : 1, (it.name || '').length);
    const demote = (it) => {
      if (it.mode === 'pill') { it.mode = 'chip:' + (overlapChip || CHIP.SM); return true; }
      if (typeof it.mode === 'string' && it.mode.indexOf('chip:') === 0) {
        const s = parseFloat(it.mode.slice(5)) || 1;
        const next = Math.max(+(s * 0.8).toFixed(3), 0.5);
        if (next < s) { it.mode = 'chip:' + next; return true; }
      }
      return false;
    };
    const GAP = 3;
    for (let round = 0; round < 8; round++) {
      const boxes = list.map(boxOf);
      const hit = new Array(list.length).fill(false);
      for (let i = 0; i < list.length; i++) {
        const mpp = metresPerPixelAt(zoom, list[i].lat) || 1;
        for (let j = i + 1; j < list.length; j++) {
          const dx = metresBetween(list[i].lat, list[i].lng, list[i].lat, list[j].lng) / mpp;
          const dy = metresBetween(list[i].lat, list[i].lng, list[j].lat, list[i].lng) / mpp;
          if (dx < (boxes[i].w + boxes[j].w) / 2 + GAP
            && dy < (boxes[i].h + boxes[j].h) / 2 + GAP) { hit[i] = true; hit[j] = true; }
        }
      }
      let changed = false;
      for (let i = 0; i < list.length; i++) {
        if (hit[i] && !list[i].pinned && demote(list[i])) changed = true;
      }
      if (!changed) break;
    }
    return items;
  }
  function stationPillBase(scale) {
    const s = scale || 1;
    const el = document.createElement('div');
    el.style.cssText = 'display:inline-flex;align-items:center;gap:' + (3 * s) + 'px;'
      + 'padding:' + s + 'px ' + (5 * s) + 'px;border-radius:8px;background:#fff;'
      + 'font-size:' + (12 * s) + 'px;font-weight:700;line-height:1.5;white-space:nowrap;'
      + 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:pointer;';
    return el;
  }
  function appendCodeChips(el, codes) {
    for (const code of (Array.isArray(codes) ? codes : [])) {
      if (!code) continue;
      const chip = document.createElement('span');
      chip.textContent = code;
      chip.style.cssText = 'display:inline-block;padding:0 4px;border-radius:5px;'
        + 'background:' + codeHex(code) + ';color:#fff;';
      el.appendChild(chip);
    }
  }
  function stationCodeNode(codes, scale) {
    const el = stationPillBase(scale);
    appendCodeChips(el, codes);
    return el;
  }
  function squareStationNode(hex, small) {
    const el = document.createElement('div');
    const sz = small ? 7 : 11;
    el.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;border-radius:2px;'
      + 'cursor:pointer;background:' + (hex || '#888888') + ';'
      + 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);';
    return el;
  }
  function stationPillNode(codes, name) {
    const el = stationPillBase();
    appendCodeChips(el, codes);
    const nm = document.createElement('span');
    const nice = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
    nm.textContent = (nice + ' station').trim();
    nm.style.cssText = 'color:#1c1c1f;';
    el.appendChild(nm);
    return el;
  }
  function trainStationNode(mode, s, hex) {
    if (mode === 'pill') return stationPillNode(s.codes, s.name || '');
    if (mode === 'sq-sm') return squareStationNode(hex, true);
    if (mode === 'sq') return squareStationNode(hex, false);
    return stationCodeNode(s.codes, parseFloat(mode.slice(5)) || 1);
  }
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

  // v0.61.115 — labeled overlay pin (⚝ Attractions Name / 🅿 Carpark Name)
  // for the high-zoom tier of the Attractions / Carpark layers; mirrors
  // amenityLabelNode in the TMA mapOverlays.js. Operator UI/UX spec
  // wants the icon + name pill at z>=14 (attractions) and z>=15 (carpark).
  function overlayLabel(glyph, name) {
    const el = document.createElement('div');
    el.textContent = ((glyph || '') + ' ' + (name || '')).trim();
    el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:8px;'
      + 'background:#ffffff;color:#1c1c1f;font-size:12px;font-weight:700;'
      + 'line-height:1.5;white-space:nowrap;border:1.5px solid #fff;'
      + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:pointer;';
    return el;
  }

  // v0.61.115 — naive pixel-distance check between two lat/lng at a
  // given zoom (mppAt-based, equator-flattened). Used by the high-zoom
  // overlap demotion for Attractions / Carpark labels in /app/map.
  function pxBetween(aLat, aLng, bLat, bLng, mpp) {
    const dx = Math.abs(aLng - bLng) * 111320 * 0.99973 / mpp;
    const dy = Math.abs(aLat - bLat) * 110574 / mpp;
    return { dx, dy };
  }

  // v0.61.116 — generic cluster pass for the Attractions / Carpark
  // layers in /app/map, mirroring applyClusterAndDrop in the TMA
  // mapOverlays. Buckets `items` into 40 px screen tiles, then per
  // tile decides cluster pill vs individual cascade (label → icon →
  // drop) per operator UI/UX spec slice 2.
  //
  // opts:
  //   zoom            current map zoom (read once by caller)
  //   threshold       cluster trigger (5 carpark, 8 attractions)
  //   forceCluster    cluster every non-empty tile (carpark z<15)
  //   allowLabel      label tier active (z>=15 carpark, z>=14 attr.)
  //   clusterText(n)  text for the cluster pill ("5 🅿 here", "8 ⚝")
  //   labelText(f)    text for the individual label pill
  //   iconForFeature(f) → { node, sz } icon DOM + size px
  //   infoFn(f)         { html } popup content
  //   pool              array to push created markers into
  function runClusterPass(items, opts) {
    const mpp = mppAt(opts.zoom);
    const TILE_M = 40 * mpp;
    const tiles = new Map();
    for (const f of items) {
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      const tx = Math.floor((f.lng * 111320 * 0.99973) / TILE_M);
      const ty = Math.floor((f.lat * 110574) / TILE_M);
      const k = tx + '|' + ty;
      if (!tiles.has(k)) tiles.set(k, []);
      tiles.get(k).push(f);
    }
    const placedLabels = [];
    const placedIcons = [];
    let drawn = 0;
    for (const tileItems of tiles.values()) {
      if (drawn >= 250) break;
      if (opts.forceCluster || tileItems.length >= opts.threshold) {
        let cLat = 0, cLng = 0;
        for (const f of tileItems) { cLat += f.lat; cLng += f.lng; }
        cLat /= tileItems.length; cLng /= tileItems.length;
        const clusterTxt = opts.clusterText(tileItems.length);
        const content = overlayLabel('', clusterTxt);
        const m = new AdvancedMarkerElement({ map, position: { lat: cLat, lng: cLng }, content });
        m.addListener('click', () => {
          const z = map.getZoom() || 0;
          map.setZoom(Math.min(z + 2, 18));
          map.setCenter({ lat: cLat, lng: cLng });
        });
        opts.pool.push(m);
        // v0.61.116 — register the cluster pill's footprint so
        // individual labels in adjacent non-clustering tiles don't
        // render on top of it.
        const clusterW = 34 + clusterTxt.length * 7;
        placedLabels.push({ lat: cLat, lng: cLng, w: clusterW, h: 26 });
        drawn++;
        continue;
      }
      for (const f of tileItems) {
        if (drawn >= 250) break;
        const w = 34 + (f.name || '').length * 7;
        const h = 26;
        const overlapping = (cw, ch) => placedLabels.some((p) => {
          const { dx, dy } = pxBetween(f.lat, f.lng, p.lat, p.lng, mpp);
          return dx < (cw + p.w) / 2 + 4 && dy < (ch + p.h) / 2 + 4;
        }) || placedIcons.some((p) => {
          const { dx, dy } = pxBetween(f.lat, f.lng, p.lat, p.lng, mpp);
          return dx < (cw + p.w) / 2 + 4 && dy < (ch + p.h) / 2 + 4;
        });
        let content = null;
        if (opts.allowLabel && !overlapping(w, h)) {
          content = overlayLabel('', opts.labelText(f));
          placedLabels.push({ lat: f.lat, lng: f.lng, w, h });
        } else {
          const { node, sz } = opts.iconForFeature(f);
          if (!overlapping(sz, sz)) {
            content = node;
            placedIcons.push({ lat: f.lat, lng: f.lng, w: sz, h: sz });
          }
          // else: drop (source-order first-in wins; operator spec answer 2)
        }
        if (content) {
          const marker = new AdvancedMarkerElement({ map, position: { lat: f.lat, lng: f.lng }, content });
          marker.addListener('click', () => {
            if (!overlayInfo) overlayInfo = new google.maps.InfoWindow();
            const info = opts.infoFn(f);
            overlayInfo.setContent(typeof info === 'string' ? info : info.html);
            overlayInfo.open({ anchor: marker, map });
          });
          opts.pool.push(marker);
          drawn++;
        }
      }
    }
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
    // v0.61.116 — Carpark Card per operator UI/UX spec (slice 2):
    // Header (Carpark | Proper-cased name) + Live Data (lots /
    // availability) + Actions (Google Maps ↗). The /app/map popup
    // mirrors the TMA carparkInfo; without the link the Card had
    // no Actions row.
    const name = toTitleCase(f.development || f.name || 'Carpark');
    const lots = Number.isFinite(f.availableLots) ? ` — ${f.availableLots} lots` : '';
    const mapsLink = Number.isFinite(f.lat) && Number.isFinite(f.lng)
      ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}" target="_blank" rel="noopener" style="color:#1a73e8;font-weight:600;text-decoration:underline;">Google Maps ↗</a>`
      : '';
    return { title: name, html: `<div style="font-size:12px;line-height:1.45">`
      + `<strong>🅿️ ${escapeHtml(name)}</strong>${escapeHtml(lots)}${mapsLink}</div>` };
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

  // v0.61.105 — operator: the carpark overlay marker shrinks two sizes
  // (a "size" is 2 px) per zoom level below z17, two more on overlap.
  function carparkSize(zoom) {
    if (zoom >= 17) return 22;
    if (zoom >= 16) return 18;
    if (zoom >= 15) return 14;
    return 10;
  }
  function carparkPin(size) {
    const el = document.createElement('div');
    el.textContent = '🅿️';
    el.style.cssText = 'line-height:1;cursor:pointer;font-size:' + size + 'px;'
      + 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));';
    return el;
  }
  function mppAt(zoom) {
    return 156543.03392 * Math.cos(1.35 * Math.PI / 180) / Math.pow(2, zoom);
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

    // v0.61.116 — Carpark layer now drives through the cluster engine:
    // forceCluster below z15 (every non-empty 40 px tile renders an
    // "N 🅿 here" pill regardless of count, per operator answer 4);
    // at z>=15 cluster when tile count ≥ 5, else individuals through
    // the label → icon → drop cascade (answer 2 source-order drop).
    // The v0.61.105 carpark size-ladder + collision-shrink is replaced
    // by this cascade.
    if (key === 'carpark') {
      const visible = overlay.carpark.data.filter((f) =>
        Number.isFinite(f.lat) && Number.isFinite(f.lng) && bounds.contains({ lat: f.lat, lng: f.lng })
      );
      runClusterPass(visible, {
        zoom,
        threshold: 5,
        forceCluster: zoom < 15,
        allowLabel: zoom >= 15,
        clusterText: (n) => n + ' 🅿 here',
        labelText: (f) => '🅿 ' + (f.name || 'Carpark'),
        iconForFeature: () => ({ node: carparkPin(carparkSize(zoom)), sz: carparkSize(zoom) }),
        infoFn,
        pool: overlay.carpark.markers
      });
      return;
    }

    // Bus-stop path (unchanged).
    const bt = key === 'busstop' ? busTier(zoom) : null;
    let drawn = 0;
    for (const f of overlay[key].data) {
      if (drawn >= 250) break;
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      const pos = { lat: f.lat, lng: f.lng };
      if (!bounds.contains(pos)) continue;
      const content = bt ? busTierPin(bt, f.code) : overlayPin(glyph);
      const marker = new AdvancedMarkerElement({ map, position: pos, content });
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
  // v0.61.106 — Train Line stations render via the Hawker TMA's
  // train-tier algorithm (trainTier): tiny coloured squares below z12,
  // nearest-N line-code chips at z12-14, full named pills at z15+, with
  // overlap demotion. The base polylines' opacity follows the tier.
  // Viewport-clipped (~200 marker cap). Re-runs on every map idle.
  function renderTrainStations() {
    clearTrainStations();
    if (!overlay.train.on) return;
    const bounds = map.getBounds && map.getBounds();
    if (!bounds) return;
    const zoom = map.getZoom() || 0;
    const tier = trainTier(zoom);
    overlay.train.polylines.forEach((pl) => pl.setOptions({ strokeOpacity: tier.opacity }));
    // operational stations inside the current viewport.
    const vis = [];
    for (const s of overlay.train.stations) {
      if (vis.length >= 200) break;
      if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      if (s.status === 'future') continue;
      if (!bounds.contains({ lat: s.lat, lng: s.lng })) continue;
      vis.push(s);
    }
    // nearest-N cap: only the `cap` stations closest to the map centre
    // get a code chip; the rest fall back to a tiny square.
    let nearSet = null;
    if (tier.cap > 0) {
      const c = map.getCenter && map.getCenter();
      if (c) {
        nearSet = new Set(vis
          .map((s) => ({ s, d: metresBetween(c.lat(), c.lng(), s.lat, s.lng) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, tier.cap)
          .map((x) => x.s.name));
      }
    }
    const items = vis.map((s) => {
      let mode;
      if (tier.station === 'pill') mode = 'pill';
      else if (tier.station === 'sq-sm') mode = 'sq-sm';
      else if (tier.cap > 0 && nearSet && !nearSet.has(s.name)) mode = tier.other || 'sq-sm';
      else mode = 'chip:' + (tier.scale || 1);
      return { s: s, name: s.name, lat: s.lat, lng: s.lng, codes: s.codes, mode: mode };
    });
    demoteByOverlap(items, zoom, tier.overlapChip);
    for (const it of items) {
      const hex = codeHex((it.codes && it.codes[0]) || '');
      const marker = new AdvancedMarkerElement({
        map, position: { lat: it.lat, lng: it.lng }, title: it.name || '',
        content: trainStationNode(it.mode, it.s, hex)
      });
      marker.addListener('click', () => {
        if (!overlayInfo) overlayInfo = new google.maps.InfoWindow();
        overlayInfo.setContent(stationInfoHtml(it.s));
        overlayInfo.open({ anchor: marker, map });
      });
      overlay.train.stationMarkers.push(marker);
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

  // v0.61.109 — enriched attraction popup (mirrors attractionInfo in
  // the TMA mapOverlays.js): rating, address, today's hours, contact,
  // wheelchair flag, the nearest two stations, website + Instagram.
  // The rating / phone / hoursWeek / wheelchair / instagram fields come
  // from data/attraction-details.json and are absent until the
  // scripts/fetch-attraction-details.js fetcher is run.
  function attractionInfoHtml(f) {
    let h = `<strong>⚝ ${escapeHtml(f.name || 'Attraction')}</strong>`;
    if (typeof f.rating === 'number') {
      const cnt = typeof f.ratingCount === 'number' ? ` (${f.ratingCount})` : '';
      h += `<div>⭐ ${escapeHtml(f.rating.toFixed(1) + cnt)}</div>`;
    }
    if (f.address) h += `<div>📇 ${escapeHtml(f.address)}</div>`;
    let hoursLine = '';
    if (Array.isArray(f.hoursWeek) && f.hoursWeek.length) {
      const d = new Date().getDay();
      hoursLine = f.hoursWeek[d === 0 ? 6 : d - 1] || f.hoursWeek[0];
    } else if (f.hours) hoursLine = f.hours;
    if (hoursLine) h += `<div>🕰 ${escapeHtml(hoursLine)}</div>`;
    if (f.phone) h += `<div>☎ ${escapeHtml(f.phone)}</div>`;
    if (f.wheelchair === true) h += '<div>♿ Wheelchair accessible</div>';
    for (const st of (Array.isArray(f.stations) ? f.stations : [])) {
      if (!st || !st.name) continue;
      const codes = Array.isArray(st.codes) ? st.codes.join(' / ') : '';
      h += `<div>🚉 ${escapeHtml(st.name + (codes ? ' (' + codes + ')' : ''))}</div>`;
    }
    if (f.website) {
      const href = /^https?:\/\//.test(f.website) ? f.website : 'https://' + f.website;
      h += `<div><a href="${escapeHtml(href)}" target="_blank" rel="noopener">🌐 Website</a></div>`;
    }
    if (f.instagram) {
      const ig = /^https?:\/\//.test(f.instagram) ? f.instagram : 'https://' + f.instagram;
      h += `<div><a href="${escapeHtml(ig)}" target="_blank" rel="noopener">📷 Instagram</a></div>`;
    }
    return '<div style="font-size:12px;line-height:1.45">' + h + '</div>';
  }

  // Viewport-clipped + zoom-gated (z>=13) like the bus / carpark layers.
  function renderMenuLayer(L) {
    clearMenuLayer(L.key);
    if (!menuState[L.key].on || !overlaysData) return;
    const bounds = map.getBounds && map.getBounds();
    const zoom = (map.getZoom && map.getZoom()) || 0;
    if (!bounds || zoom < 13) return;
    const feats = Array.isArray(overlaysData[L.key]) ? overlaysData[L.key] : [];

    // v0.61.116 — Attractions layer drives through the cluster engine
    // (40 px tile, threshold ≥ 8, label band z ≥ 14). At z < 14 the
    // band is icon-only (⚝ glyph), still threshold-clustered. Source-
    // order drop on icon overlap (operator answer 2).
    if (L.key === 'attractions') {
      const visible = feats.filter((f) =>
        Number.isFinite(f.lat) && Number.isFinite(f.lng) && bounds.contains({ lat: f.lat, lng: f.lng })
      );
      runClusterPass(visible, {
        zoom,
        threshold: 8,
        forceCluster: false,
        allowLabel: zoom >= 14,
        clusterText: (n) => n + ' ⚝',
        labelText: (f) => '⚝ ' + (f.name || 'Attraction'),
        iconForFeature: () => ({ node: overlayPin(L.glyph), sz: 18 }),
        infoFn: (f) => ({ html: attractionInfoHtml(f) }),
        pool: menuState[L.key].items
      });
      return;
    }

    // Other amenities (polygons + non-clustered point layers).
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
          overlayInfo.setContent(
            '<div style="font-size:12px;line-height:1.45">'
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
