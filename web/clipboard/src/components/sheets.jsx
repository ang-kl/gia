// sheets.jsx — five bottom sheets co-located for compactness.
//
//   CreateCabinetSheet  – new cabinet form
//   AddDrawerSheet      – pick segment + dayTag for a new drawer
//   AmendCardSheet      – rename / note / favourite / place / delete
//   ShareDrawerSheet    – mint + show drawer share link
//   ForkSheet           – shared-view fork into a target cabinet

import React, { useState, useEffect } from 'react';
import { t } from '../lib/i18n.js';
import { SEGMENTS, SEGMENT_BY_KEY, GROUP_CLASS } from '../lib/segments.js';
import { openTelegramLink } from '../lib/tg.js';

// ── FileSheet (v0.62.445) ────────────────────────────────────────────
// Two-column "＋ File" picker (operator spec, v0.62.445): LEFT column lists the
// cabinets, each row showing its drawer names tucked inside the border; tapping
// "pulls out" that cabinet (cobalt highlight). RIGHT column shows the selected
// cabinet's drawers as "{name} · #N" + card-count badge (tap to file), plus the
// time-segment grid to spin up a NEW drawer. Drawer summaries come straight from
// listCabinets' `drawers` field, so no per-cabinet fetch is needed.
const ICON = 'icons/';   // served from web/clipboard/public/icons/
function drawerLabel(d, lang) {
  return t('seg.' + d.segment, lang) + (d.dayTag ? ` · ${d.dayTag}` : '');
}
export function FileSheet({
  card, cabinets = [], lang, onPlaceExisting, onPlaceNewDrawer, onCreateCabinet, onClose,
}) {
  // Default-select the first cabinet so the right column isn't empty on open.
  const [cabId, setCabId] = useState(cabinets[0]?.cabId || null);
  const [newName, setNewName] = useState(cabinets.length === 0 ? t('cabinet.firstName', lang) : '');
  const [busy, setBusy] = useState(false);

  const selected = cabinets.find((c) => c.cabId === cabId) || null;
  const drawers = selected?.drawers || [];

  const createCab = async () => {
    const name = newName.trim(); if (!name || busy) return;
    setBusy(true);
    try { const r = await onCreateCabinet(name); if (r?.cabId) { setNewName(''); setCabId(r.cabId); } }
    finally { setBusy(false); }
  };
  const fileInto = async (idx) => { if (busy || !cabId) return; setBusy(true); try { await onPlaceExisting(cabId, idx); } finally { setBusy(false); } };
  const fileNew = async (segment) => { if (busy || !cabId) return; setBusy(true); try { await onPlaceNewDrawer(cabId, segment); } finally { setBusy(false); } };

  return (
    <Sheet onClose={onClose} title={t('file.title', lang)}>
      <div className="grid grid-cols-[1.05fr_1.35fr] gap-2">
        {/* LEFT — cabinets, with drawer names tucked inside each row's border */}
        <div className="flex flex-col gap-1.5 max-h-[46vh] overflow-y-auto pr-0.5">
          <div className="text-[10px] uppercase tracking-wide text-tg-hint px-0.5">{t('file.pickCabinet', lang)}</div>
          {cabinets.map((c) => {
            const active = c.cabId === cabId;
            const drs = c.drawers || [];
            return (
              <button key={c.cabId} type="button" onClick={() => setCabId(c.cabId)}
                className={`w-full text-left rounded-lg border px-2 py-1.5 transition-colors ${active ? 'border-tg-accent bg-sk-soft' : 'border-tg-border bg-tg-card'}`}>
                <span className="flex items-center gap-1.5">
                  <img src={`${ICON}cabinet.png`} alt="" className="w-4 h-4 object-contain flex-shrink-0" aria-hidden />
                  <span className="flex-1 text-[12px] font-semibold text-tg-text truncate">{c.name}</span>
                  <span className="text-[10px] text-tg-hint">{c.drawerCount ?? drs.length}</span>
                </span>
                {drs.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {drs.slice(0, 3).map((d) => (
                      <span key={d.n} className="text-[9px] leading-none text-tg-hint bg-tg-bg border border-tg-border rounded px-1 py-0.5 truncate max-w-[72px]">{drawerLabel(d, lang)}</span>
                    ))}
                    {drs.length > 3 && <span className="text-[9px] leading-none text-tg-hint px-1 py-0.5">+{drs.length - 3}</span>}
                  </span>
                )}
              </button>
            );
          })}
          {cabinets.length === 0 && <div className="text-[11px] text-tg-hint italic px-1 py-2">{t('cabinet.empty', lang)}</div>}
          <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-tg-border">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('cabinet.field.name', lang)} className={inputCls} />
            <button type="button" onClick={createCab} disabled={!newName.trim() || busy} className="px-2 py-1.5 rounded-lg text-[12px] font-semibold bg-tg-accent text-tg-accent-text disabled:opacity-40">{t('file.newCabinet', lang)}</button>
          </div>
        </div>

        {/* RIGHT — drawers of the selected cabinet + spin a new drawer */}
        <div className="flex flex-col gap-1.5 max-h-[46vh] overflow-y-auto pl-1 border-l border-tg-border">
          {!selected ? (
            <div className="text-[11px] text-tg-hint italic px-1 py-4 text-center">{t('file.pickCabinetFirst', lang)}</div>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-wide text-tg-hint px-0.5 truncate">{selected.name}</div>
              {drawers.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {drawers.map((d) => (
                    <button key={d.n} type="button" onClick={() => fileInto(d.n)}
                      className="flex items-center gap-1.5 w-full text-left bg-tg-card border border-tg-border rounded-lg px-2 py-1.5 text-[12px]">
                      <img src={`${ICON}folder.png`} alt="" className="w-4 h-4 object-contain flex-shrink-0" aria-hidden />
                      <span className="flex-1 truncate text-tg-text">{drawerLabel(d, lang)}</span>
                      <span className="text-[9px] text-tg-hint">#{d.n + 1}</span>
                      <span className="text-[10px] font-semibold text-tg-accent-text bg-tg-accent rounded-full px-1.5 leading-tight">{d.count}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-1 mb-0.5 text-[10px] uppercase tracking-wide text-tg-hint px-0.5">{t('file.newDrawer', lang)}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {SEGMENTS.map((s) => (
                  <button key={s.key} type="button" onClick={() => fileNew(s.key)}
                    className={`flex flex-col items-center justify-center px-1 py-1.5 rounded-lg border text-[9px] leading-tight border-tg-border text-tg-text ${GROUP_CLASS[s.group]}`}>
                    <span className="text-sm" aria-hidden>{s.emoji}</span>
                    <span className="truncate max-w-full">{t('seg.' + s.key, lang)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <button type="button" onClick={onClose} className="w-full mt-3 py-2 rounded-lg border border-tg-border text-sm">{t('chrome.close', lang)}</button>
    </Sheet>
  );
}

function Sheet({ children, onClose, title }) {
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grab" />
        {title && <h3 className="text-base font-semibold mb-2">{title}</h3>}
        {children}
      </div>
    </>
  );
}

function field(label, child) {
  return (
    <div className="mb-2.5">
      <label className="block text-[10px] uppercase tracking-wide text-tg-hint mb-1">{label}</label>
      {child}
    </div>
  );
}

const inputCls = 'w-full px-2.5 py-2 text-sm bg-tg-bg text-tg-text border border-tg-border rounded-lg outline-none focus:border-tg-accent';
const textareaCls = inputCls + ' min-h-[80px] resize-y font-sans';

// ── CreateCabinetSheet ───────────────────────────────────────────────

export function CreateCabinetSheet({ lang, onCancel, onSave, defaultName = '' }) {
  const [name, setName] = useState(defaultName);
  const [emoji, setEmoji] = useState('');
  const [location, setLocation] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  return (
    <Sheet onClose={onCancel} title={t('cabinet.create.title', lang)}>
      {field(t('cabinet.field.name', lang), (
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} maxLength={80} autoFocus />
      ))}
      <div className="grid grid-cols-2 gap-2">
        {field(t('cabinet.field.emoji', lang), (
          <input className={inputCls} value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} maxLength={4} />
        ))}
        {field(t('cabinet.field.location', lang), (
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value.slice(0, 120))} maxLength={120} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {field(t('cabinet.field.dates', lang), (
          <input className={inputCls} value={dateStart} onChange={(e) => setDateStart(e.target.value.slice(0, 16))} placeholder="2026-07-12" />
        ))}
        {field('→', (
          <input className={inputCls} value={dateEnd} onChange={(e) => setDateEnd(e.target.value.slice(0, 16))} placeholder="2026-07-19" />
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-tg-border text-sm">{t('chrome.cancel', lang)}</button>
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), emoji: emoji.trim(), location: location.trim(), dateStart, dateEnd })}
          disabled={!name.trim()}
          className="flex-1 py-2 rounded-lg bg-tg-accent text-tg-accent-text text-sm font-semibold disabled:opacity-40"
        >
          {t('chrome.save', lang)}
        </button>
      </div>
    </Sheet>
  );
}

// ── AddDrawerSheet ───────────────────────────────────────────────────

export function AddDrawerSheet({ lang, onCancel, onSave, cabinetName = '' }) {
  // v0.62.427 — sample parity: ‹ back · "Add a drawer · {cabinet}" title ·
  // "PICK A TIME-SEGMENT" · 2-col grid of circular emoji icons · tap to add · Close ×.
  return (
    <Sheet onClose={onCancel}>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onCancel} className="text-tg-accent text-lg leading-none" aria-label={t('chrome.back', lang)}>‹</button>
        <div className="min-w-0">
          <div className="text-base font-bold text-tg-text">{t('drawer.add.title', lang)}</div>
          {cabinetName && <div className="text-[11px] text-tg-hint truncate">🗄️ {cabinetName}</div>}
        </div>
      </div>
      <div className="mb-2 text-[10px] uppercase tracking-wide text-tg-hint">{t('drawer.pickSegment', lang)}</div>
      <div className="grid grid-cols-2 gap-2">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => onSave({ segment: s.key, dayTag: '' })}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-tg-border text-tg-text text-left active:scale-[0.99] ${GROUP_CLASS[s.group]}`}
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sk-head flex items-center justify-center text-base" aria-hidden>{s.emoji}</span>
            <span className="min-w-0">
              <span className="block text-[12px] font-medium truncate">{t(`seg.${s.key}`, lang)}</span>
              {/* v0.62.431 — operator: show the segment timing under the label. */}
              <span className="block text-[9px] text-tg-hint truncate">{s.timeEN}</span>
            </span>
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="w-full mt-3 py-2 rounded-lg border border-tg-border text-sm">{t('chrome.close', lang)} ✕</button>
    </Sheet>
  );
}

// ── AmendCardSheet ───────────────────────────────────────────────────

export function AmendCardSheet({ card, lang, cabinets, onCancel, onSave, onDelete, onMove }) {
  const [name, setName] = useState(card?.name || '');
  const [note, setNote] = useState(card?.note || '');
  const [favourite, setFavourite] = useState(!!card?.favourite);
  if (!card) return null;
  return (
    <Sheet onClose={onCancel} title={t('card.amend.title', lang)}>
      {field(t('card.field.name', lang), (
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} maxLength={60} />
      ))}
      {field(t('card.field.note', lang), (
        <textarea className={textareaCls} value={note} onChange={(e) => setNote(e.target.value.slice(0, 990))} maxLength={990} />
      ))}
      <div className="text-[10px] text-tg-hint text-right mt-[-6px] mb-2">{note.length} / 990</div>
      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={favourite} onChange={(e) => setFavourite(e.target.checked)} />
        <span>{t('card.field.favourite', lang)}</span>
      </label>

      {cabinets && cabinets.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wide text-tg-hint mb-1">{t('card.moveTo', lang)}</div>
          <div className="space-y-1 mb-3">
            {cabinets.map((c) => (
              <button
                key={c.cabId}
                onClick={() => onMove?.(c.cabId)}
                className="w-full text-left text-sm px-2.5 py-1.5 rounded-lg border border-tg-border"
              >
                {c.emoji || '📁'} {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button onClick={() => onDelete?.()} className="flex-1 py-2 rounded-lg border border-red-400/50 text-red-400 text-sm">
          🗑 {t('chrome.delete', lang)}
        </button>
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-tg-border text-sm">{t('chrome.cancel', lang)}</button>
        <button
          onClick={() => onSave({ name: name.trim(), note, favourite })}
          className="flex-1 py-2 rounded-lg bg-tg-accent text-tg-accent-text text-sm font-semibold"
        >
          {t('chrome.save', lang)}
        </button>
      </div>
    </Sheet>
  );
}

// ── ShareDrawerSheet ─────────────────────────────────────────────────

export function ShareDrawerSheet({ url, lang, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet onClose={onClose} title={t('share.linkReady', lang)}>
      <div className="bg-tg-bg border border-tg-border rounded-lg p-2 mb-3 break-all font-mono text-[11px]">
        {url}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            try {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            } catch { /* noop */ }
          }}
          className="flex-1 py-2 rounded-lg border border-tg-border text-sm"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
        <button
          onClick={() => openTelegramLink(url)}
          className="flex-1 py-2 rounded-lg bg-tg-accent text-tg-accent-text text-sm font-semibold"
        >
          {t('share.shareToTelegram', lang)}
        </button>
      </div>
    </Sheet>
  );
}

// ── ForkSheet ────────────────────────────────────────────────────────

export function ForkSheet({ cabinets, lang, onCancel, onConfirm }) {
  const [pick, setPick] = useState(null);  // null = catch-all
  return (
    <Sheet onClose={onCancel} title={t('fork.title', lang)}>
      <div className="text-[11px] text-tg-hint mb-2">{t('fork.intoCabinet', lang)}</div>
      <div className="space-y-1 mb-3">
        <button
          onClick={() => setPick(null)}
          className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg border ${pick === null ? 'bg-tg-accent/20 border-tg-accent' : 'border-tg-border'}`}
        >
          📥 {t('fork.catchAll', lang)}
        </button>
        {cabinets.map((c) => (
          <button
            key={c.cabId}
            onClick={() => setPick(c.cabId)}
            className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg border ${pick === c.cabId ? 'bg-tg-accent/20 border-tg-accent' : 'border-tg-border'}`}
          >
            {c.emoji || '📁'} {c.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-tg-border text-sm">{t('chrome.cancel', lang)}</button>
        <button
          onClick={() => onConfirm(pick)}
          className="flex-1 py-2 rounded-lg bg-tg-accent text-tg-accent-text text-sm font-semibold"
        >
          {t('fork.confirm', lang)}
        </button>
      </div>
    </Sheet>
  );
}
