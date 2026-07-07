import React, { useEffect, useState, useCallback } from 'react';
import { tg, closeApp } from './tg.js';

const API = '/api/oversight/stats';

function fmtInt(n) { return Number.isFinite(n) ? Number(n).toLocaleString('en') : '0'; }
function fmtNum(n) { return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : '0'; }

// A compact horizontal-bar list. items: [{ label, sub?, count }].
function BarList({ items, empty = '—' }) {
  if (!items || !items.length) return <div className="text-[12px] text-tg-hint italic px-1 py-1">{empty}</div>;
  const max = Math.max(1, ...items.map((i) => i.count || 0));
  return (
    <div className="flex flex-col gap-1">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <div className="w-36 shrink-0 truncate">
            <span>{it.label}</span>
            {it.sub ? <span className="text-tg-hint"> · {it.sub}</span> : null}
          </div>
          <div className="flex-1 h-3 rounded bg-tg-card overflow-hidden">
            <div className="h-3 bg-tg-accent" style={{ width: `${Math.max(2, Math.round(((it.count || 0) / max) * 100))}%` }} />
          </div>
          <div className="w-10 text-right tabular-nums">{fmtInt(it.count)}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="flex-1 rounded-xl border border-tg-border bg-tg-card px-3 py-2 min-w-[96px]">
      <div className="text-[11px] text-tg-hint leading-tight">{label}</div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      {hint ? <div className="text-[10px] text-tg-hint leading-tight">{hint}</div> : null}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-tg-hint mb-1">{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);          // { status, msg } | null
  const [data, setData] = useState(null);
  const [pickedDate, setPickedDate] = useState('');   // '' = trailing window
  const [days, setDays] = useState(7);
  const [offsetWeeks, setOffsetWeeks] = useState(0);  // 0 = this week, 1 = last week (date = end-of-that-week, days=7)

  const load = useCallback(async (q) => {
    setLoading(true); setErr(null);
    try {
      const w = tg();
      const initData = (w && w.initData) || '';
      const params = new URLSearchParams();
      if (q?.date) params.set('date', q.date);
      if (q?.days) params.set('days', String(q.days));
      const resp = await fetch(`${API}?${params.toString()}`, { headers: { 'X-Telegram-Init-Data': initData } });
      if (!resp.ok) {
        setErr({ status: resp.status, msg: resp.status === 401 || resp.status === 403 ? 'Not authorised — this is the operator dashboard.' : `Couldn't load stats (HTTP ${resp.status}).` });
        setData(null);
        return;
      }
      setData(await resp.json());
    } catch (e) {
      setErr({ status: 0, msg: `Couldn't reach the server (${e?.message || e}).` });
      setData(null);
    } finally { setLoading(false); }
  }, []);

  // initial + on control change
  useEffect(() => {
    if (pickedDate) { load({ date: pickedDate }); return; }
    if (offsetWeeks > 0) {
      // a previous week: ask for the day `offsetWeeks*7 - 1` days ago is awkward;
      // simplest — ask for `days = offsetWeeks*7 + 7` and the dashboard shows
      // the older slice. Keep it simple: just bump `days` so the older days appear.
      load({ days: offsetWeeks * 7 + 7 });
      return;
    }
    load({ days });
  }, [load, pickedDate, days, offsetWeeks]);

  const closeBtn = (
    <button type="button" onClick={closeApp}
      className="mt-4 w-full rounded-lg border border-tg-border bg-tg-card py-2 text-[12px] font-semibold active:scale-95">🔚 close</button>
  );

  if (err && (err.status === 401 || err.status === 403)) {
    return (
      <div className="min-h-full px-4 py-6 max-w-md mx-auto"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="text-lg font-bold">🛡 Soleat — Oversight</div>
        <div className="mt-3 rounded-xl border border-tg-border bg-tg-card px-3 py-3 text-[13px]">{err.msg}</div>
        {closeBtn}
      </div>
    );
  }

  return (
    <div className="min-h-full px-3 py-3 max-w-md mx-auto"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">🛡 Soleat · Oversight</div>
        <button type="button" onClick={() => (pickedDate ? load({ date: pickedDate }) : load({ days: offsetWeeks > 0 ? offsetWeeks * 7 + 7 : days }))}
          className="text-[11px] px-2 py-1 rounded border border-tg-border bg-tg-card active:scale-95">↻ refresh</button>
      </div>

      {loading && <div className="mt-4 text-[13px] text-tg-hint">Loading…</div>}

      {err && err.status !== 401 && err.status !== 403 && (
        <div className="mt-3 rounded-xl border border-tg-border bg-tg-card px-3 py-2 text-[12px]">{err.msg} <button className="underline" onClick={() => load(pickedDate ? { date: pickedDate } : { days })}>retry</button></div>
      )}

      {data && !loading && (
        <>
          {/* big-number cards */}
          <div className="mt-3 flex gap-2">
            <StatCard label="Total users" value={fmtInt(data.totalUsers)} hint="since tracking began" />
            <StatCard label="Today · active" value={fmtInt(data.today?.active)} hint={`searchers ${fmtInt(data.today?.searchers)}`} />
            <StatCard label="Today · frequent (>1)" value={fmtInt(data.today?.frequent)} hint={`≥2 searches · ${data.today?.date || ''}`} />
          </div>

          {/* controls */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <button type="button" onClick={() => { setPickedDate(''); setOffsetWeeks(0); setDays(7); }}
              className={`px-2 py-1 rounded border border-tg-border ${!pickedDate && offsetWeeks === 0 && days === 7 ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card'}`}>This week (7d)</button>
            <button type="button" onClick={() => { setPickedDate(''); setOffsetWeeks(1); }}
              className={`px-2 py-1 rounded border border-tg-border ${!pickedDate && offsetWeeks === 1 ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card'}`}>Last 14d</button>
            <button type="button" onClick={() => { setPickedDate(''); setOffsetWeeks(0); setDays(30); }}
              className={`px-2 py-1 rounded border border-tg-border ${!pickedDate && offsetWeeks === 0 && days === 30 ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card'}`}>30d</button>
            <button type="button" onClick={() => { setPickedDate(data.today?.date || ''); }}
              className={`px-2 py-1 rounded border border-tg-border ${pickedDate && pickedDate === (data.today?.date || '') ? 'bg-tg-accent text-tg-accent-text' : 'bg-tg-card'}`}>Today only</button>
            <input type="date" value={pickedDate} max={data.today?.date || undefined}
              onChange={(e) => { setPickedDate(e.target.value); }}
              className="px-2 py-1 rounded border border-tg-border bg-tg-card text-tg-text" />
            {pickedDate && <button type="button" onClick={() => setPickedDate('')} className="px-1.5 py-1 rounded border border-tg-border bg-tg-card">×</button>}
          </div>

          {data.note && <div className="mt-2 text-[10px] text-tg-hint leading-snug">{data.note}</div>}

          <Section title={pickedDate ? `Day · ${pickedDate}` : `By day (${(data.byDay || []).length}d, oldest → today)`}>
            <BarList
              items={(data.byDay || []).map((d) => ({
                label: d.date, sub: `${d.dow} · ${fmtInt(d.searchers)} srch / ${fmtInt(d.frequent)} freq`, count: d.active
              }))}
              empty="no per-day data"
            />
          </Section>

          {(data.byDayOfWeek || []).length > 1 && (
            <Section title="By day of week (avg active · avg frequent over the window)">
              <BarList items={(data.byDayOfWeek || []).map((d) => ({ label: d.dow, sub: `freq ${fmtNum(d.avgFrequent)}`, count: d.avgActive }))} />
            </Section>
          )}

          <Section title="Top cuisines">
            <BarList items={(data.topCuisines || []).map((c) => ({ label: c.name, count: c.count }))} empty="no cuisine data" />
          </Section>

          <Section title="Top criteria / filters">
            <BarList items={(data.topCriteria || []).map((c) => ({ label: c.key, count: c.count }))} empty="no criteria data" />
          </Section>

          <Section title={`Top free-text words${pickedDate ? '' : ' (window)'}`}>
            <BarList items={(data.topFreeText || []).map((t) => ({ label: t.term, count: t.count }))} empty="no free-text data" />
          </Section>

          <Section title="Recent free-text (latest 50)">
            <div className="flex flex-col gap-1 text-[11px]">
              {(data.recentFreeText || []).length === 0 && <div className="text-tg-hint italic px-1">—</div>}
              {(data.recentFreeText || []).map((e, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-tg-border bg-tg-card px-2 py-1">
                  <div className="flex-1 truncate">{e.q}</div>
                  {e.src ? <span className="text-tg-hint">{e.src}</span> : null}
                  {e.m ? <span className="px-1 rounded bg-tg-bg border border-tg-border">{e.m}</span> : null}
                  {Number.isFinite(e.n) ? <span className="text-tg-hint tabular-nums">{e.n}</span> : null}
                </div>
              ))}
            </div>
          </Section>

          {closeBtn}
        </>
      )}
    </div>
  );
}
