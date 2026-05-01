import React, { useEffect, useMemo, useRef, useState } from 'react'; /* useRef already in v0.26.x for logger */
import { useCuisineState } from './state/useCuisineState.js';
import { searchCuisine, diagPing } from './api/search.js';
import { requestLocation, showAlert, tg, initData, sendData, launchContext, closeWebApp } from './api/tg.js';
import { makeLogger, DIAG_CODES as D } from './state/diagnostics.js';
import Header from './components/Header.jsx';
import RangeSlider from './components/RangeSlider.jsx';
import ModeDropdown from './components/ModeDropdown.jsx';
import TimeDropdown from './components/TimeDropdown.jsx';
import CuisineAccordion from './components/CuisineAccordion.jsx';
import OtherCuisineInput from './components/OtherCuisineInput.jsx';
import PresetCombos from './components/PresetCombos.jsx';
import PromptPreview from './components/PromptPreview.jsx';
import ResultsGrid from './components/ResultsGrid.jsx';
import Diagnostics from './components/Diagnostics.jsx';

function fmtMetres(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km` : `${m} m`;
}
function fmtDays(d) {
  if (d <= 14) return `${d} d`;
  if (d <= 90) return `${Math.round(d / 7)} wk`;
  return `${Math.round(d / 30)} mo`;
}

export default function App() {
  const [state, a] = useCuisineState();
  const [locDenied, setLocDenied] = useState(false);
  const [diag, setDiag] = useState([]);
  const [bridge, setBridge] = useState({ checked: false, ok: false, version: null });
  const loggerRef = useRef(makeLogger());
  const log = loggerRef.current;
  const record = (code, label, ok = true, detail = null) => {
    setDiag(log.push(code, label, ok, detail));
  };

  // D100 mount + D110 deep-link + D050 bridge pre-flight ping.
  useEffect(() => {
    record(D.D100_MOUNT, 'TMA mounted');
    // v0.26.1: log the resolved API URL so the dev can verify routing.
    // eslint-disable-next-line no-console
    console.log(`[Cuisine-Diag] API base = ${window.location.origin}/api/cuisine-search`);

    const url = new URL(window.location.href);
    const c = url.searchParams.get('cuisine');
    if (c) {
      a.toggleCuisine(c);
      record(D.D110_DEEP_LINK, 'Pre-selected from ?cuisine=', true, c);
    }

    // v0.26.3: capture launch context so the Diagnostics panel + Railway
    // simulation log show whether the TMA was opened from chat-menu /
    // inline / direct-link, and whether sendData fallback is available.
    const ctx = launchContext();
    record(D.D060_LAUNCH_CONTEXT, 'Launch context', ctx.hasWebApp, ctx);

    record(D.D050_BRIDGE_PING, 'GET /api/diag/cuisine');
    diagPing().then((r) => {
      if (!r.ok) {
        record(D.D052_BRIDGE_FAIL, 'Bridge unreachable', false, { status: r.status, error: r.error });
        setBridge({ checked: true, ok: false, version: null });
        return;
      }
      const pipelineOn = !!r.body?.pipelineEnabled;
      record(D.D051_BRIDGE_OK, 'Bridge OK', true, {
        version: r.body?.version, pipelineOn, elapsedMs: r.elapsedMs
      });
      if (!pipelineOn) record(D.D053_PIPELINE_OFF, 'PIPELINE_ENABLED=false on server', false);
      setBridge({ checked: true, ok: true, version: r.body?.version, pipelineOn });
    });
  }, []);

  // D200 geolocation.
  useEffect(() => {
    let cancelled = false;
    record(D.D200_GEO_REQUEST, 'Requesting browser geolocation');
    if (!navigator.geolocation) {
      record(D.D203_GEO_UNSUPPORTED, 'navigator.geolocation undefined', false);
      setLocDenied(true);
      return;
    }
    requestLocation()
      .then((p) => {
        if (cancelled) return;
        a.setLoc(p);
        record(D.D201_GEO_OK, 'Got location', true, `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`);
      })
      .catch((err) => {
        if (cancelled) return;
        setLocDenied(true);
        record(D.D202_GEO_DENIED, 'Geolocation rejected', false, err?.message || String(err));
      });
    return () => { cancelled = true; };
  }, []);

  // D300 Telegram WebApp / initData health probe (one-shot at mount).
  useEffect(() => {
    const w = tg();
    if (!w) {
      record(D.D302_TG_WEBAPP_MISSING, 'Telegram.WebApp not present (running outside TG)', false);
      return;
    }
    const id = initData();
    if (!id) {
      record(D.D301_INITDATA_MISSING, 'initData empty (auth header will be blank)', false);
    } else {
      record(D.D300_INITDATA_PRESENT, 'initData present', true, `len=${id.length}`);
    }
  }, []);

  // v0.26.4: SGT CBD centre as a hard default when geolocation never
  // resolves (denied / blocked / corporate webview / hostile WebView).
  // Search no longer hard-blocks on missing location — we proceed with a
  // visible "Using CBD default" banner so the user always gets *some*
  // result instead of a silently-disabled button.
  const CBD_DEFAULT = { lat: 1.2839, lng: 103.8517 };

  // [searchTaps, setSearchTaps] gives the user a manifestly visible counter
  // confirming their click was received — addresses the "nothing happens"
  // class of bug where the button ignores the tap.
  const [searchTaps, setSearchTaps] = useState(0);
  const [bannerText, setBannerText] = useState('');

  const buildPayload = () => {
    const loc = state.loc || CBD_DEFAULT;
    const cuisinesPayload = [
      ...state.cuisines,
      ...state.otherCuisine.split(',').map((s) => s.trim()).filter(Boolean)
    ];
    return {
      payload: {
        lat: loc.lat, lng: loc.lng,
        cuisines: cuisinesPayload,
        radius: state.radius,
        recencyDays: state.recencyDays,
        queueMaxMin: state.queueMaxMin,
        mode: state.mode,
        when: state.when,
        preset: state.preset
      },
      cuisinesPayload,
      usedDefault: !state.loc
    };
  };

  // v0.26.4: bypass entirely — push payload as web_app_data and close TMA.
  // Used for hostile-webview environments where fetch is blocked.
  const forceChatDelivery = () => {
    setSearchTaps((n) => n + 1);
    setBannerText('🌿 Sending to chat… Telegram will close this window.');
    if (state.preset === 'cuisine-discovery' && !state.cuisines.length && !state.otherCuisine.trim()) {
      showAlert('Pick at least one cuisine for the Discovery preset.');
      return;
    }
    const { payload, usedDefault } = buildPayload();
    if (usedDefault) record(D.D202_GEO_DENIED, 'Force-chat with CBD default', false);
    record(D.D400_SEARCH_START, 'Force-chat-delivery invoked');
    try {
      const ok = sendData({ cmd: 'cuisine-search', ...payload });
      if (ok) {
        record(D.D061_SENDDATA_OK, 'Force-chat sendData dispatched', true);
        setTimeout(() => closeWebApp(), 800);
        return;
      }
      record(D.D062_SENDDATA_FAIL, 'Force-chat sendData unavailable', false);
      setBannerText('⚠ sendData not available in this Telegram client.');
    } catch (err) {
      record(D.D062_SENDDATA_FAIL, 'Force-chat sendData threw', false, err?.message || String(err));
      setBannerText('⚠ sendData threw — open /cuisine in a different client.');
    }
  };

  const onSearch = async () => {
    // v0.26.4: paint synchronous feedback BEFORE any async / state update,
    // so the user always sees the click landed even when something goes
    // wrong downstream.
    setSearchTaps((n) => n + 1);
    setBannerText('🌿 Sensing the vibe… (this may take 5–10 s)');

    if (state.preset === 'cuisine-discovery' && !state.cuisines.length && !state.otherCuisine.trim()) {
      showAlert('Pick at least one cuisine for the Discovery preset.');
      setBannerText('');
      return;
    }
    a.searchStart();

    const { payload, cuisinesPayload, usedDefault } = buildPayload();
    if (usedDefault) record(D.D202_GEO_DENIED, 'Geolocation unavailable — proceeding with CBD default', false, CBD_DEFAULT);

    record(D.D400_SEARCH_START, 'onSearch invoked');
    record(D.D401_PAYLOAD_BUILT, 'Payload built', true, {
      n_cuisines: cuisinesPayload.length,
      radius: payload.radius,
      preset: payload.preset,
      usedDefault
    });

    let result;
    let fetchFailed = false;
    try {
      record(D.D402_FETCH_START, 'POST /api/cuisine-search (6s timeout)');
      result = await searchCuisine(payload);
      if (result.timedOut) {
        record(D.D406_FETCH_NETWORK_FAIL, 'Fetch timed out (>6s)', false);
        fetchFailed = true;
      }
    } catch (err) {
      record(D.D406_FETCH_NETWORK_FAIL, 'Network/fetch threw', false, err?.message || String(err));
      fetchFailed = true;
    }

    // v0.26.3 dual-channel fallback: when the primary HTTPS path fails
    // (network, 4xx, 5xx, abort/timeout), try Telegram.WebApp.sendData().
    const httpFailed = fetchFailed || (result && !result.ok);
    if (httpFailed) {
      if (result && !result.ok) {
        const code = result.status >= 500 ? D.D405_HTTP_5XX : D.D404_HTTP_4XX;
        record(code, `HTTP ${result.status}`, false, typeof result.body === 'string'
          ? result.body.slice(0, 160)
          : (result.body?.error || JSON.stringify(result.body).slice(0, 160)));
      }
      record(D.D063_FALLBACK_TRIGGER, 'Primary fetch failed, trying sendData fallback', false);
      try {
        const ok = sendData({ cmd: 'cuisine-search', ...payload });
        if (ok) {
          record(D.D061_SENDDATA_OK, 'sendData fallback dispatched', true);
          a.searchErr('Bridge fallback: results will arrive in chat. TMA closing…');
          // Telegram auto-closes after sendData; this hint stays briefly.
          setTimeout(() => closeWebApp(), 800);
          return;
        }
        record(D.D062_SENDDATA_FAIL, 'sendData unavailable in this launch context', false);
        a.searchErr(result
          ? `HTTP ${result.status}: ${result.body?.error || 'see diagnostics'}`
          : 'Network unreachable — see diagnostics');
      } catch (err) {
        record(D.D062_SENDDATA_FAIL, 'sendData threw', false, err?.message || String(err));
        a.searchErr('Both bridges failed — see diagnostics');
      }
      return;
    }
    record(D.D403_HTTP_OK, `HTTP ${result.status}`);

    if (typeof result.body !== 'object' || result.body == null) {
      record(D.D900_UNHANDLED, 'Response was not JSON object', false);
      a.searchErr('Bad response shape — see diagnostics');
      return;
    }

    const venues = result.body.venues || [];
    record(D.D500_PARSE_OK, 'Response parsed');
    if (!venues.length) {
      record(D.D501_VENUES_EMPTY, 'No venues matched filters', false, {
        meal: result.body.meal?.label, queueMaxMin: result.body.queueMaxMin
      });
    } else {
      record(D.D502_VENUES_RECEIVED, `Received ${venues.length} venues`, true);
    }
    if (result.body?.cached) {
      record(D.D705_CACHE_HIT, 'Server cache hit (60s pick cache)', true);
    }
    a.searchOk(result.body);
    setBannerText('');
  };

  const showDiagAlways = useMemo(() => diag.some((e) => !e.ok), [diag]);

  // v0.26.5: Diagnostics is dev-facing copy. Hide it from happy-path
  // users; auto-open on first failure (existing behaviour); also opt-in
  // via 600 ms long-press on the connectivity badge ("press here for
  // diagnostics" easter egg).
  const [diagForcedVisible, setDiagForcedVisible] = useState(false);
  const longPressTimer = useRef(null);
  const startLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setDiagForcedVisible((v) => !v);
      // Haptic feedback if Telegram exposes it.
      try { tg()?.HapticFeedback?.impactOccurred?.('medium'); } catch { /* noop */ }
    }, 600);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const bridgeBadge = !bridge.checked
    ? { color: 'text-tg-hint', label: '… checking' }
    : bridge.ok
      ? { color: 'text-green-400', label: `● online ${bridge.version ? 'v' + bridge.version : ''}${bridge.pipelineOn ? '' : ' (pipeline OFF)'}` }
      : { color: 'text-red-400', label: '● offline' };

  return (
    <div className="min-h-screen flex flex-col">
      <Header loc={state.loc} onLoc={(p) => { a.setLoc(p); setLocDenied(false); record(D.D201_GEO_OK, 'Manual re-detect succeeded', true); }} />
      <div
        className={`px-3 py-1 text-[10px] font-mono select-none cursor-pointer ${bridgeBadge.color}`}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        title="Long-press for Diagnostics"
      >
        {bridgeBadge.label}{diagForcedVisible ? ' · diag ON' : ''}
      </div>

      <div className="flex-1 px-3 pt-2 pb-24 flex flex-col gap-2">
        <RangeSlider
          label="Search radius"
          min={200} max={5000} step={100}
          value={state.radius}
          onChange={a.setRadius}
          format={fmtMetres}
        />
        <RangeSlider
          label='"Newly opened" window'
          min={5} max={180} step={5}
          value={state.recencyDays}
          onChange={a.setRecency}
          format={fmtDays}
        />
        <RangeSlider
          label="Max queue tolerance"
          min={5} max={60} step={5}
          value={state.queueMaxMin}
          onChange={a.setQueueMax}
          format={(v) => `${v} min`}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <ModeDropdown value={state.mode} onChange={a.setMode} />
          <TimeDropdown value={state.when} onChange={a.setWhen} />
        </div>

        <div className="border-t border-tg-border my-1" />

        <CuisineAccordion selected={state.cuisines} onToggle={a.toggleCuisine} />
        <OtherCuisineInput value={state.otherCuisine} onChange={a.setOtherCuisine} />

        <div className="border-t border-tg-border my-1" />

        <PresetCombos active={state.preset} onPick={a.applyPreset} />
        <PromptPreview state={state} />
        {(showDiagAlways || diagForcedVisible) && <Diagnostics entries={diag} />}

        <div className="border-t border-tg-border my-1" />

        {state.error && (
          <div className="text-xs text-red-400 px-2">⚠ {state.error}</div>
        )}
        {state.loading && (
          <div className="text-xs text-tg-hint px-2 py-4 text-center">🌿 Sensing the vibe…</div>
        )}
        {!state.loading && (
          <ResultsGrid results={state.results} expanded={state.expanded} onExpand={a.expand} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-3 py-2 bg-tg-bg border-t border-tg-border">
        {bannerText && (
          <div className="text-[12px] text-tg-text bg-tg-accent/20 border border-tg-accent rounded-md px-2 py-1 mb-1.5 text-center">
            {bannerText}
          </div>
        )}
        {locDenied && !state.loc && !bannerText && (
          <div className="text-[11px] text-tg-hint pb-1.5 text-center">
            📍 unavailable — Search will use CBD default. Tap 📍 above to share your real location.
          </div>
        )}
        <div className="flex gap-1.5">
          <button
            onClick={onSearch}
            disabled={state.loading}
            className="flex-1 text-sm font-medium px-4 py-2.5 rounded-md bg-tg-accent text-tg-accent-text disabled:opacity-50"
          >
            {state.loading ? 'Searching…' : `🔍 Search${searchTaps ? ` · ${searchTaps}` : ''}`}
          </button>
          <button
            onClick={forceChatDelivery}
            disabled={state.loading}
            className="text-xs font-medium px-2.5 py-2.5 rounded-md bg-tg-card text-tg-text border border-tg-border disabled:opacity-50"
            title="Bypass HTTPS, send to chat via Telegram service message"
          >
            💬 Chat
          </button>
        </div>
      </div>
    </div>
  );
}
