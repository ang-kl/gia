import React, { useEffect, useState } from 'react';
import { initData, openLink } from './tg.js';

const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
const NEA_HOME = 'https://www.nea.gov.sg/our-services/hawker-management';
const NEA_ANNOUNCEMENTS = 'https://www.nea.gov.sg/our-services/hawker-management/announcements';

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

export default function App() {
  const [tab, setTab] = useState('closures');
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

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-3 pt-3 pb-2 border-b border-tg-border flex items-center gap-2">
        <img src="/app/hawker/soleat-logo.svg" alt="soleat" width="28" height="28" className="flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">Hawker — NEA Closures &amp; R&amp;R</h1>
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

      <div className="px-3 py-2 border-b border-tg-border flex gap-1.5">
        {[
          { id: 'closures', label: '🧹 Closures', n: data?.closures?.data?.length || 0 },
          { id: 'rnr',      label: '🛠 R&R Work', n: data?.rnrWorks?.data?.length || 0 },
          { id: 'about',    label: 'ℹ About', n: null }
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'text-xs px-3 py-1.5 rounded-full ' + (tab === t.id
              ? 'bg-tg-accent text-tg-accent-text'
              : 'bg-tg-card text-tg-text border border-tg-border')}>
            {t.label}{Number.isFinite(t.n) ? ` (${t.n})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 px-2 py-2 overflow-y-auto">
        {busy && <p className="text-xs text-tg-hint p-3">Fetching from NEA…</p>}
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
        {!busy && tab === 'about' && (
          <div className="px-2 text-xs text-tg-text leading-snug space-y-2">
            <p>This view scrapes the NEA Hawker Management announcements page. Data is cached server-side for 6 h to keep traffic low.</p>
            <p>Tables are parsed permissively — if NEA changes their layout, the parser may misclassify rows. When that happens, tap the <span className="font-mono">NEA announcements</span> link above to view the source.</p>
            <p>Diagnostics: closure-tables={data?.diagnostics?.closureTablesFound ?? '?'} · rnr-tables={data?.diagnostics?.rnrTablesFound ?? '?'} · other={data?.diagnostics?.otherTablesFound ?? '?'} · {data?.diagnostics?.htmlBytes ?? '?'} bytes.</p>
            <p className="text-tg-hint">Source-of-truth: <button className="underline text-tg-accent" onClick={() => openLink(NEA_HOME)}>nea.gov.sg/our-services/hawker-management</button></p>
          </div>
        )}
      </div>
    </div>
  );
}
