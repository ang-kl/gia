import React, { useEffect, useState } from 'react';
import { openLink } from './tg.js';
import { t, tn, useLocale } from './i18n.js';

const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
const NEA_HOME = 'https://www.nea.gov.sg/our-services/hawker-management';
const REGION_EMOJI = {
  Central: '🏙️', South: '🛳️', East: '🌅', North: '🌳', West: '🌇'
};

// v0.56.0 — TMA simplified per Human Lead. Only the regional browser
// remains. Closures, R&R, About tabs removed (the LLM scrape was
// unreliable; users now see only the deterministic 122-centre vault).
// TMA renamed: "Hawker Centre Status" → "Hawker Centre".
// v0.59.15 — full FR localisation. Reads locale from the same
// localStorage key the cuisine TMA uses ('gia.locale'); flips
// instantly on the 'gia:locale' CustomEvent so the user's /language
// or cuisine-TMA toggle propagates here without a reload.
export default function App() {
  const lang = useLocale();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);
  const [activeRegion, setActiveRegion] = useState('Central');

  useEffect(() => {
    fetch('/api/hawker/centres-by-region')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((b) => setData(b))
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  }, []);

  const regionList = data?.regions || [];
  const active = regionList.find((r) => r.region === activeRegion);
  const allOnMapUrl = active
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('hawker centres ' + activeRegion + ' Singapore')}`
    : '';

  // Localised region label — the API returns canonical EN names
  // (Central/South/East/North/West); we render the FR equivalent at
  // chip + heading time via `region.<EN>` keys.
  const regionLabel = (en) => t(`region.${en}`, lang);

  return (
    <div
      className="flex flex-col"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      <div className="px-3 pt-3 pb-2 border-b border-tg-border flex items-center gap-2">
        <img src="/app/hawker/soleat-icon.png" alt="soleat" width="28" height="28" className="rounded-full flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">{t('header.title', lang)}</h1>
          <p className="text-[10px] text-tg-hint font-mono leading-tight">
            {data?.totalCount
              ? tn('header.versionCount', lang, { v: BUILD_VERSION, n: data.totalCount })
              : tn('header.versionOnly', lang, { v: BUILD_VERSION })}
          </p>
        </div>
        <button onClick={() => openLink(NEA_HOME)} className="text-xs px-2.5 py-1.5 rounded-full border border-tg-border bg-tg-card">
          NEA ↗
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-2">
        {busy && <p className="text-xs text-tg-hint p-3">{t('status.loading', lang)}</p>}
        {err && <p className="text-xs text-red-500 p-3">⚠ {err}</p>}
        {!busy && !err && (
          <>
            <div className="flex flex-wrap gap-1.5 px-1">
              {regionList.map((r) => {
                const sel = r.region === activeRegion;
                return (
                  <button key={r.region} onClick={() => setActiveRegion(r.region)} aria-pressed={sel}
                    className={`px-2.5 py-1 rounded-full border text-xs whitespace-nowrap ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
                    <span className="mr-1">{REGION_EMOJI[r.region] || '·'}</span>{regionLabel(r.region)} ({r.count})
                  </button>
                );
              })}
            </div>
            {active && (
              <>
                <div className="px-1 text-[11px] text-tg-hint">
                  <strong className="text-tg-text">{regionLabel(active.region)}</strong>
                  {tn('list.headingBody', lang, { n: active.count })}
                </div>
                <a href={allOnMapUrl} target="_blank" rel="noreferrer"
                  className="mx-1 text-xs text-center px-3 py-1.5 rounded-md bg-tg-accent text-tg-accent-text">
                  {tn('btn.openAllOnGoogleMaps', lang, { n: active.count })}
                </a>
                <div className="flex flex-col gap-1.5 mt-1">
                  {active.centres.map((c, i) => (
                    <div key={i} className="rounded-md border border-tg-border bg-tg-card p-2 text-xs">
                      <div className="font-semibold leading-tight">
                        {i + 1}. {c.name}{c.isNew ? ' 🆕' : ''}
                      </div>
                      {c.address && <div className="text-tg-hint mt-0.5">{c.address}</div>}
                      {c.mapsUrl && (
                        <a href={c.mapsUrl} target="_blank" rel="noreferrer"
                          className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">
                          {t('btn.maps', lang)}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
