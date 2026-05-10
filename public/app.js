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

  function makePinContent(num, name, isUser) {
    const div = document.createElement('div');
    div.className = isUser ? 'gia-pin user' : 'gia-pin';
    const n = document.createElement('span');
    n.className = 'num';
    n.textContent = String(num);
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
      const content = makePinContent(i + 1, v.name, false);
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
      const LINE_META = {
        EWL:  { e: '🟢', n: 'EWL'  },
        CGL:  { e: '🟢', n: 'CGL'  },
        NSL:  { e: '🔴', n: 'NSL'  },
        NEL:  { e: '🟣', n: 'NEL'  },
        CCL:  { e: '🟠', n: 'CCL'  },
        DTL:  { e: '🔵', n: 'DTL'  },
        TEL:  { e: '🟤', n: 'TEL'  },
        JRL:  { e: '🔷', n: 'JRL'  },
        CRL:  { e: '🟢', n: 'CRL'  },
        BPL:  { e: '⚪', n: 'BPL'  },
        SLRT: { e: '⚪', n: 'SLRT' },
        PLRT: { e: '⚪', n: 'PLRT' }
      };
      const linesHtml = (Array.isArray(v.lines) && v.lines.length)
        ? '<br>' + v.lines.map((code) => {
            const m = LINE_META[code];
            if (!m) return escapeHtml(code);
            return `${m.e} <strong>${escapeHtml(m.n)}</strong>`;
          }).join(' · ')
        : '';
      // v0.60.61 — when the venue carries `arrivals` (bus-stop
      // payload from /transport bus nearest), render them inside
      // the popup using the same template the chat reply uses:
      //   № 174 — ≤5 min · seats
      // The band logic mirrors busArrivalBand() server-side.
      const arrivalsHtml = (Array.isArray(v.arrivals) && v.arrivals.length)
        ? '<br>' + v.arrivals.map((a) => {
            const m = Number.isFinite(a.minutes) ? a.minutes : null;
            let band = '—';
            if (m != null) {
              if (m <= 5) band = '≤5 min';
              else if (m <= 10) band = '≤10 min';
              else if (m <= 15) band = '≤15 min';
              else if (m <= 20) band = '≤20 min';
              else band = '>20 min';
            }
            const load = a.loadLabel ? ' · ' + escapeHtml(a.loadLabel) : '';
            return `№ ${escapeHtml(String(a.service))} — <strong>${band}</strong>${load}`;
          }).join('<br>')
        : '';
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
