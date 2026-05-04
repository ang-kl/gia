import React, { useEffect, useMemo, useState } from 'react';
import { initData, openLink } from './tg.js';

const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
const NEA_HOME = 'https://www.nea.gov.sg/our-services/hawker-management';
const NEA_ANNOUNCEMENTS = 'https://www.nea.gov.sg/our-services/hawker-management/announcements';
const REGION_EMOJI = {
  Central: '🏙️', South: '🛳️', East: '🌅', North: '🌳', West: '🌇'
};

function fmtAge(fetchedAt) {
  if (!fetchedAt) return 'unknown';
  const ms = Date.now() - fetchedAt;
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ${min % 60} min ago`;
  const d = Math.floor(hr / 24);
  return `${d} d ${hr % 24} h ago`;
}

function Table({ table }) {
  if (!table?.data?.length) {
    return <p className="text-xs text-tg-hint italic px-2 py-3">(no rows in this table)</p>;
  }
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-left">
            {(table.headers || []).map((h, i) => (
              <th key={i} className="px-2 py-1 border-b border-tg-border font-semibold text-tg-text bg-tg-card">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.data.map((row, ri) => (
            <tr key={ri} className={ri % 2 ? 'bg-tg-card/40' : ''}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1.5 align-top border-b border-tg-border/50 whitespace-pre-wrap break-words">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// v0.54.0: Browse-by-region tab. Region selector → scrollable list
// of centres (alphabetical) with a "View all on Google Maps" CTA.
// Lazy-loads /api/hawker/centres-by-region the first time the tab opens.
function RegionsTab() {
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
  // Single Google Maps URL that surfaces all hawker centres in the
  // region as a search result (Google's natural multi-pin map).
  const allOnMapUrl = active
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('hawker centres ' + activeRegion + ' Singapore')}`
    : '';

  if (busy) return <p className="text-xs text-tg-hint p-3">Loading regions…</p>;
  if (err)  return <p className="text-xs text-red-500 p-3">⚠ {err}</p>;
  if (!regionList.length) return <p className="text-xs text-tg-hint p-3">(no region data)</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5 px-1">
        {regionList.map((r) => {
          const sel = r.region === activeRegion;
          return (
            <button key={r.region} onClick={() => setActiveRegion(r.region)} aria-pressed={sel}
              className={`px-2.5 py-1 rounded-full border text-xs whitespace-nowrap ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
              <span className="mr-1">{REGION_EMOJI[r.region] || '·'}</span>{r.region} ({r.count})
            </button>
          );
        })}
      </div>
      {active && (
        <>
          <div className="px-1 text-[11px] text-tg-hint">
            <strong className="text-tg-text">{active.region}</strong> — {active.count} hawker centres (alphabetical)
          </div>
          <a href={allOnMapUrl} target="_blank" rel="noreferrer"
            className="mx-1 text-xs text-center px-3 py-1.5 rounded-md bg-tg-accent text-tg-accent-text">
            🗺 Open all {active.count} on Google Maps
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
                    📍 Maps
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  // v0.54.0: read ?tab= query param so the chat-side button can land
  // the user directly on Closures or Regions.
  const initialTab = useMemo(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const t = params.get('tab');
    return ['closures', 'rnr', 'regions', 'about'].includes(t) ? t : 'closures';
  }, []);
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const id = initData();
      const res = await fetch('/api/hawker/closures', { headers: { 'X-Telegram-Init-Data': id } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setData(body);
      if (body && body.ok === false) setErr(body.error || 'scrape failed');
    } catch (e) {
      setErr(e.message || 'fetch failed');
    } finally {
      setBusy(false);
    }
  };

  // Load closures eagerly; regions tab loads its own data.
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-3 pt-3 pb-2 border-b border-tg-border flex items-center gap-2">
        <img src="/app/hawker/soleat-logo.svg" alt="soleat" width="28" height="28" className="flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">🍚 Hawker Centre Status</h1>
          <p className="text-[10px] text-tg-hint font-mono leading-tight">v{BUILD_VERSION}</p>
        </div>
        <button onClick={load} disabled={busy}
          className="text-xs px-2.5 py-1.5 rounded-full bg-tg-accent text-tg-accent-text disabled:opacity-50">
          {busy ? '…' : '🔄 Refresh'}
        </button>
      </div>

      <div className="px-3 py-2 border-b border-tg-border text-[11px] text-tg-hint flex flex-wrap gap-x-3 gap-y-1 items-center">
        <span>
          {data?.cached ? '📦 cached' : '🌐 fresh'}
          {data?.fetchedAt ? ` · last fetched ${fmtAge(data.fetchedAt)}` : ''}
        </span>
        {data?.ok === false && <span className="text-red-500">⚠ {err}</span>}
        <button onClick={() => openLink(NEA_HOME)} className="underline text-tg-accent">NEA hawker mgmt</button>
        <button onClick={() => openLink(NEA_ANNOUNCEMENTS)} className="underline text-tg-accent">NEA announcements</button>
      </div>

      <div className="px-3 py-2 border-b border-tg-border flex gap-1.5 overflow-x-auto">
        {[
          { id: 'closures', label: '🧹 Closures', n: data?.closures?.data?.length || 0 },
          { id: 'rnr',      label: '🛠 R&R',      n: data?.rnrWorks?.data?.length || 0 },
          { id: 'regions',  label: '🗺 By region', n: null },
          { id: 'about',    label: 'ℹ About',    n: null }
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'text-xs px-3 py-1.5 rounded-full whitespace-nowrap ' + (tab === t.id
              ? 'bg-tg-accent text-tg-accent-text'
              : 'bg-tg-card text-tg-text border border-tg-border')}>
            {t.label}{Number.isFinite(t.n) ? ` (${t.n})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 px-2 py-2 overflow-y-auto">
        {busy && tab !== 'regions' && <p className="text-xs text-tg-hint p-3">Fetching from NEA…</p>}
        {!busy && tab === 'closures' && (
          <>
            <p className="text-[11px] text-tg-hint px-2 mb-2">Hawker Centres &amp; Market Closure — quarterly cleaning + ad-hoc closures.</p>
            <Table table={data?.closures} />
          </>
        )}
        {!busy && tab === 'rnr' && (
          <>
            <p className="text-[11px] text-tg-hint px-2 mb-2">Repairs &amp; Redecoration / Renovation works — multi-week / multi-month closures.</p>
            <Table table={data?.rnrWorks} />
          </>
        )}
        {tab === 'regions' && <RegionsTab />}
        {!busy && tab === 'about' && (
          <div className="px-2 text-xs text-tg-text leading-snug space-y-2">
            <p>Closures + R&amp;R: scraped from NEA via Anthropic web_search (cached 12 h server-side).</p>
            <p>By region: 122 NEA-listed centres from <code>data/list-of-hawker-centres.md</code>, snapshot 25 Jul 2025, classified by 8 region rules. Tap a region to scroll the alphabetical list.</p>
            <p>Diagnostics (closures): closures-count={data?.diagnostics?.closuresCount ?? '?'} · rnr-count={data?.diagnostics?.rnrCount ?? '?'} · llm-text-chars={data?.diagnostics?.llmTextChars ?? '?'}.</p>
            <p className="text-tg-hint">Source-of-truth: <button className="underline text-tg-accent" onClick={() => openLink(NEA_HOME)}>nea.gov.sg/our-services/hawker-management</button></p>
          </div>
        )}
      </div>
    </div>
  );
}
