(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();

  const RAFFLES_PLACE = { lat: 1.2839, lng: 103.8517 };
  const GMAPS_INSTALL_URL = 'https://apps.apple.com/app/google-maps/id585027354';
  const APP_PROBE_TIMEOUT_MS = 1500;
  const MAP_ID = 'GIA_SANCTUARY';
  const FOCUS_PLACE_ID = new URLSearchParams(window.location.search).get('placeId');
  const statusEl = document.getElementById('status');
  let map;
  let venueMarkers = [];
  let userMarker;
  let AdvancedMarkerElement;

  function setStatus(text, hide) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('hidden', !!hide);
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
    const name = v.name || '';
    const placeId = v.placeId || '';
    const lat = v.lat;
    const lng = v.lng;
    const httpsUrl = placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
      : (v.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`);
    const appUrl = `comgooglemaps://?q=${encodeURIComponent(name)}&center=${lat},${lng}&zoom=17`;

    if (!isIOS()) { externalOpen(httpsUrl); return; }

    let appOpened = false;
    const onHide = () => { if (document.hidden) appOpened = true; };
    document.addEventListener('visibilitychange', onHide);
    const start = Date.now();
    window.location.href = appUrl;
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      if (appOpened || document.hidden) return;
      if (Date.now() - start > APP_PROBE_TIMEOUT_MS + 800) return;
      ask(
        'Google Maps app is not installed. Install it from the App Store for the best experience? (Cancel opens the web map.)',
        (wantsInstall) => externalOpen(wantsInstall ? GMAPS_INSTALL_URL : httpsUrl)
      );
    }, APP_PROBE_TIMEOUT_MS);
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
      const linkHtml = (v.placeId || v.url || v.name)
        ? `<br><a href="#" id="${linkId}">Open in Google Maps</a>`
        : '';
      const info = new google.maps.InfoWindow({
        content: `<div style="max-width:240px"><strong>${v.name}</strong><br>${v.area || ''}<br><em>${v.vibe || ''}</em>${linkHtml}</div>`
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
    try { mapsKey = (await authedFetch('/maps-key')).key; }
    catch { setStatus('Could not authenticate with Gia. Open from inside Telegram.'); return; }
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

    setStatus('Asking Gia for sanctuary picks…');
    try {
      const url = `/api/sanctuary?lat=${center.lat}&lng=${center.lng}`;
      const data = await authedFetch(url);
      renderVenues(data.label || 'sanctuary', data.venues || []);
    } catch {
      setStatus('Could not load picks. Try again in a moment.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
