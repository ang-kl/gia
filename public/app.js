(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();

  const RAFFLES_PLACE = { lat: 1.2839, lng: 103.8517 };
  const statusEl = document.getElementById('status');
  let map;
  let venueMarkers = [];
  let userMarker;

  function setStatus(text, hide) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('hidden', !!hide);
  }

  async function authedFetch(url) {
    const initData = tg?.initData || '';
    const res = await fetch(url, {
      headers: { 'X-Telegram-Init-Data': initData }
    });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  }

  function loadMapsScript(key) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) return resolve();
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('maps script load failed'));
      document.head.appendChild(script);
    });
  }

  function initMap(center) {
    map = new google.maps.Map(document.getElementById('map'), {
      center,
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    });
  }

  function clearMarkers() {
    venueMarkers.forEach((m) => m.setMap(null));
    venueMarkers = [];
  }

  function renderVenues(label, venues) {
    clearMarkers();
    if (!venues.length) {
      setStatus(`No ${label} sanctuary nearby — try later.`);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    venues.forEach((v, i) => {
      const pos = { lat: v.lat, lng: v.lng };
      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: v.name,
        label: { text: String(i + 1), color: 'white', fontWeight: 'bold' }
      });
      const info = new google.maps.InfoWindow({
        content: `<div style="max-width:240px"><strong>${v.name}</strong><br>${v.area || ''}<br><em>${v.vibe || ''}</em>${v.url ? `<br><a href="${v.url}" target="_blank">Open in Maps</a>` : ''}</div>`
      });
      marker.addListener('click', () => info.open({ anchor: marker, map }));
      venueMarkers.push(marker);
      bounds.extend(pos);
    });
    if (userMarker) bounds.extend(userMarker.getPosition());
    map.fitBounds(bounds, 60);
    setStatus(`${venues.length} ${label} picks within 800m`, true);
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
    } catch (err) {
      setStatus('Could not authenticate with Gia. Open from inside Telegram.');
      return;
    }
    if (!mapsKey) {
      setStatus('Maps key not configured.');
      return;
    }
    try {
      await loadMapsScript(mapsKey);
    } catch (err) {
      setStatus('Maps failed to load.');
      return;
    }

    const userPos = await getUserPosition();
    const center = userPos || RAFFLES_PLACE;
    initMap(center);
    if (userPos) {
      userMarker = new google.maps.Marker({
        position: userPos,
        map,
        title: 'You',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1e88e5',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });
    }

    setStatus('Asking Gia for sanctuary picks…');
    try {
      const url = `/api/sanctuary?lat=${center.lat}&lng=${center.lng}`;
      const data = await authedFetch(url);
      renderVenues(data.label || 'sanctuary', data.venues || []);
    } catch (err) {
      setStatus('Could not load picks. Try again in a moment.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
