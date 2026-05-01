// Diagnostic codes for the Cuisine Picker TMA Search flow (v0.25.1).
// Each step in App.jsx pushes a {code, label, ok, detail?} record.
// On error or when the user expands the Diagnostics panel, the full
// log is rendered. Codes are stable and grep-able both client-side
// (search results console) and server-side ([Cuisine-Diag] log lines).
//
// Range allocation:
//   D1xx  TMA mount + state
//   D2xx  Geolocation
//   D3xx  initData / Telegram WebApp
//   D4xx  Network / fetch lifecycle
//   D5xx  Server response parse + venues
//   D9xx  Catastrophic / unknown

export const DIAG_CODES = {
  D100_MOUNT: 'D100',
  D110_DEEP_LINK: 'D110',
  D200_GEO_REQUEST: 'D200',
  D201_GEO_OK: 'D201',
  D202_GEO_DENIED: 'D202',
  D203_GEO_UNSUPPORTED: 'D203',
  D300_INITDATA_PRESENT: 'D300',
  D301_INITDATA_MISSING: 'D301',
  D302_TG_WEBAPP_MISSING: 'D302',
  D400_SEARCH_START: 'D400',
  D401_PAYLOAD_BUILT: 'D401',
  D402_FETCH_START: 'D402',
  D403_HTTP_OK: 'D403',
  D404_HTTP_4XX: 'D404',
  D405_HTTP_5XX: 'D405',
  D406_FETCH_NETWORK_FAIL: 'D406',
  D500_PARSE_OK: 'D500',
  D501_VENUES_EMPTY: 'D501',
  D502_VENUES_RECEIVED: 'D502',
  D900_UNHANDLED: 'D900',

  // v0.26.1 bridge audit: pre-flight ping codes.
  D050_BRIDGE_PING:    'D050',
  D051_BRIDGE_OK:      'D051',
  D052_BRIDGE_FAIL:    'D052',
  D053_PIPELINE_OFF:   'D053',

  // v0.26.3 launch-context probe + sendData fallback.
  D060_LAUNCH_CONTEXT:  'D060',  // platform, version, initData length
  D061_SENDDATA_OK:     'D061',  // sendData fallback dispatched successfully
  D062_SENDDATA_FAIL:   'D062',  // sendData unavailable in this launch context
  D063_FALLBACK_TRIGGER: 'D063', // primary fetch failed, switching channel

  // v0.27.0 60s pick cache. Server-side; surfaced here for completeness.
  D705_CACHE_HIT:       'D705',
  D706_CACHE_STORE:     'D706'
};

export function makeLogger() {
  const entries = [];
  let counter = 0;
  return {
    push(code, label, ok = true, detail = null) {
      counter += 1;
      const entry = { seq: counter, t: Date.now(), code, label, ok, detail };
      entries.push(entry);
      // Mirror to console with a stable prefix so devtools-on-mobile
      // can grep the same string used in server logs.
      const tag = ok ? '✓' : '✗';
      // eslint-disable-next-line no-console
      console.log(`[Cuisine-Diag] ${tag} ${code} ${label}` + (detail ? ` :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''));
      return entries.slice();
    },
    snapshot() { return entries.slice(); }
  };
}
