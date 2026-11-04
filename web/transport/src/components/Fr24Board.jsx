// Fr24Board.jsx — v0.62.975. Spec: doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md, amendment 3 (C10
// revised, I12, I15, I17).
//
// The Flightradar24 movements board as a glass overlay in the bottom dock, where the station carousel sits (operator,
// 05-11 '26: "another overlay of liquid glass cards strip (w scrollbar) and list (w scrollbar), like the Cuisine.TMA";
// then "Strip + list toggle"). It renders the model from fr24-layer.js's boardModel and nothing else: no terminal,
// gate or check-in field exists in it, and no image or logo is drawn. Tapping a flight still in the air shows where it
// is now on the map; a landed one shows its details here.
import React from 'react';

const thin = { scrollbarWidth: 'thin' };

function Chip({ active, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${active ? 'bg-amber-400 text-gray-900 border-amber-400' : 'border-tg-border text-tg-text'}`}
    >{children}</button>
  );
}

function FlightCard({ r, labels, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(r.id)}
      data-fr24-row={r.id}
      className={`liquid-glass snap-start shrink-0 w-[10.5rem] rounded-xl px-2 py-1.5 text-left ${selected ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-[15px] font-bold">{r.time || '--:--'}</span>
        <span className="font-mono text-[11px] text-tg-hint">{r.flight}</span>
      </div>
      <div className="text-[12px] font-semibold truncate" title={labels.place}>{r.place}</div>
      <div className="flex items-center justify-between gap-1 text-[10px] text-tg-hint">
        <span className="font-mono">{r.type}</span>
        <span className={r.inAir ? 'text-amber-600 font-semibold' : ''}>{r.status}</span>
      </div>
    </button>
  );
}

function FlightRow({ r, labels, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(r.id)}
      data-fr24-row={r.id}
      className={`w-full grid grid-cols-[3rem_1fr_auto] items-center gap-2 px-2 py-1.5 text-left border-b border-tg-border/60 ${selected ? 'bg-amber-400/20' : ''}`}
    >
      <span className="font-mono text-[13px] font-bold">{r.time || '--:--'}</span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold truncate" title={labels.place}>{r.place}</span>
        <span className="block font-mono text-[10px] text-tg-hint">{r.flight} · {r.type}</span>
      </span>
      <span className={`text-[10px] text-right ${r.inAir ? 'text-amber-600 font-semibold' : 'text-tg-hint'}`}>{r.status}</span>
    </button>
  );
}

export default function Fr24Board({ model, onTab, onView, onPlanes, onClose, onSelect, onGetThere }) {
  if (!model) return null;
  const rows = model.rows || [];
  return (
    <div data-fr24-board={model.icao} className="liquid-glass relative pointer-events-auto mx-auto max-w-md rounded-2xl px-3 py-2 text-tg-text shadow-xl">
      {/* ✕ sits in the corner so the header row stays one line on a phone (the first render wrapped it). */}
      <button type="button" onClick={onClose} aria-label={model.closeLabel} title={model.closeLabel}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full border border-tg-border text-[12px] leading-none">✕</button>
      <div className="flex items-center gap-1.5 flex-wrap pr-7">
        <span className="font-bold text-[14px] mr-0.5">✈️ {model.title}</span>
        {model.tabs.map((t) => (
          <Chip key={t.dir} active={t.active} onClick={() => onTab(t.dir)}>{t.label}</Chip>
        ))}
        <span className="flex-1" />
        {model.views.map((v) => (
          <Chip key={v.view} active={v.active} onClick={() => onView(v.view)}>{v.label}</Chip>
        ))}
      </div>
      <div className="mt-0.5 text-[10px] text-tg-hint truncate" title={model.header}>{model.header}</div>
      {model.wx && <div className="text-[11px] font-semibold text-amber-600">{model.wx}</div>}

      {model.state !== 'ok' && <div className="py-3 text-[12px]">{model.message}</div>}
      {model.state === 'ok' && model.view === 'strip' && (
        <div className="mt-1 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1.5" style={thin} data-fr24-view="strip">
          {rows.map((r) => <FlightCard key={r.id} r={r} labels={model.labels} selected={r.id === model.selectedId} onSelect={onSelect} />)}
        </div>
      )}
      {model.state === 'ok' && model.view === 'list' && (
        <div className="mt-1 max-h-[40vh] overflow-y-auto rounded-lg" style={thin} data-fr24-view="list">
          {rows.map((r) => <FlightRow key={r.id} r={r} labels={model.labels} selected={r.id === model.selectedId} onSelect={onSelect} />)}
        </div>
      )}

      {model.detail && model.detail.length > 0 && (
        <div className="mt-1 rounded-lg px-2 py-1 text-[11px] bg-amber-400/15" data-fr24-detail>
          {model.detail.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <button type="button" onClick={onPlanes}
          className="px-2.5 py-1 rounded-full bg-amber-400 text-gray-900 text-[11px] font-semibold">✈ {model.planesLabel}</button>
        {model.getThere && (
          <button type="button" onClick={onGetThere} className="text-[11px] underline text-tg-link">{model.getThere}</button>
        )}
      </div>
      <div className="mt-1 text-[9px] text-tg-hint">{model.footer}</div>
    </div>
  );
}
