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

// ── FileSheet (v0.62.420) ────────────────────────────────────────────
// 2-step "＋ File" flow: (1) pick a cabinet (or create one inline), (2) pick an
// existing drawer in it OR spin up a new drawer from the time-segment grid; both
// file the card. Back chevron returns to step 1. Operator spec HANDOFF §5.
export function FileSheet({
  card, cabinets = [], lang, getCabinet, onPlaceExisting, onPlaceNewDrawer, onCreateCabinet, onClose,
}) {
  const [step, setStep] = useState('cabinet');
  const [cabId, setCabId] = useState(null);
  const [drawers, setDrawers] = useState([]);
  const [loading, setLoading] = useState(false);
  // v0.62.424 — prefill the first cabinet's name (operator: default = "My 1st Cabinet").
  const [newName, setNewName] = useState(cabinets.length === 0 ? t('cabinet.firstName', lang) : '');
  const [busy, setBusy] = useState(false);

  const pickCab = async (id) => {
    setCabId(id); setStep('drawer'); setLoading(true);
    try { const r = await getCabinet(id); setDrawers(r?.drawers || []); }
    finally { setLoading(false); }
  };
  const createCab = async () => {
    const name = newName.trim(); if (!name || busy) return;
    setBusy(true);
    try { const r = await onCreateCabinet(name); if (r?.cabId) { setNewName(''); await pickCab(r.cabId); } }
    finally { setBusy(false); }
  };
  const fileInto = async (idx) => { if (busy) return; setBusy(true); try { await onPlaceExisting(cabId, idx); } finally { setBusy(false); } };
  const fileNew = async (segment) => { if (busy) return; setBusy(true); try { await onPlaceNewDrawer(cabId, segment); } finally { setBusy(false); } };

  return (
    <Sheet onClose={onClose} title={t('file.title', lang)}>
      {step === 'cabinet' ? (
        <>
          <div className="mb-2 text-[10px] uppercase tracking-wide text-tg-hint">{t('file.pickCabinet', lang)}</div>
          <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto">
            {cabinets.map((c) => (
              <button key={c.cabId} type="button" onClick={() => pickCab(c.cabId)}
                className="flex items-center gap-2 w-full text-left bg-tg-bg border border-tg-border rounded-lg px-3 py-2 text-sm">
                <span aria-hidden>{c.emoji || '🗄️'}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-tg-hint">›</span>
              </button>
            ))}
            {cabinets.length === 0 && <div className="text-[11px] text-tg-hint italic px-1 py-2">{t('cabinet.empty', lang)}</div>}
          </div>
          <div className="flex gap-2 mt-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('cabinet.field.name', lang)} className={inputCls} />
            <button type="button" onClick={createCab} disabled={!newName.trim() || busy} className="px-3 py-2 rounded-lg text-sm font-semibold bg-tg-accent text-tg-accent-text disabled:opacity-40">{t('file.newCabinet', lang)}</button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setStep('cabinet')} className="text-[12px] text-tg-accent">{t('file.back', lang)}</button>
            <span className="text-[10px] uppercase tracking-wide text-tg-hint">{t('file.pickDrawer', lang)}</span>
          </div>
          {loading ? (
            <div className="text-center text-xs text-tg-hint py-4">{t('chrome.loading', lang)}</div>
          ) : (
            <>
              {drawers.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3 max-h-[28vh] overflow-y-auto">
                  {drawers.map((d, i) => {
                    const seg = SEGMENT_BY_KEY[d.segment] || {};
                    return (
                      <button key={i} type="button" onClick={() => fileInto(i)}
                        className="flex items-center gap-2 w-full text-left bg-tg-bg border border-tg-border rounded-lg px-3 py-2 text-sm">
                        <span aria-hidden>{seg.emoji || '🗂️'}</span>
                        <span className="flex-1 truncate">{t('seg.' + d.segment, lang)}{d.dayTag ? ` · ${d.dayTag}` : ''}</span>
                        <span className="text-tg-hint text-xs">{(d.cards || []).length}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mb-1.5 text-[10px] uppercase tracking-wide text-tg-hint">{t('file.newDrawer', lang)}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {SEGMENTS.map((s) => (
                  <button key={s.key} type="button" onClick={() => fileNew(s.key)}
                    className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg border text-[10px] leading-tight border-tg-border text-tg-text ${GROUP_CLASS[s.group]}`}>
                    <span className="text-base" aria-hidden>{s.emoji}</span>
                    <span>{t('seg.' + s.key, lang)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
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

export function AddDrawerSheet({ lang, onCancel, onSave }) {
  const [segment, setSegment] = useState('lunch');
  const [dayTag, setDayTag] = useState('');
  return (
    <Sheet onClose={onCancel} title={t('drawer.add.title', lang)}>
      <div className="mb-2 text-[10px] uppercase tracking-wide text-tg-hint">{t('drawer.field.segment', lang)}</div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg border text-[10px] leading-tight ${segment === s.key ? 'bg-tg-accent/20 border-tg-accent text-tg-accent' : 'border-tg-border text-tg-text'} ${GROUP_CLASS[s.group]}`}
          >
            <span className="text-base">{s.emoji}</span>
            <span className="mt-0.5">{t(`seg.${s.key}`, lang)}</span>
          </button>
        ))}
      </div>
      {field(t('drawer.field.dayTag', lang), (
        <input className={inputCls} value={dayTag} onChange={(e) => setDayTag(e.target.value.slice(0, 24))} maxLength={24} />
      ))}
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-tg-border text-sm">{t('chrome.cancel', lang)}</button>
        <button
          onClick={() => onSave({ segment, dayTag: dayTag.trim() })}
          className="flex-1 py-2 rounded-lg bg-tg-accent text-tg-accent-text text-sm font-semibold"
        >
          {t('chrome.save', lang)}
        </button>
      </div>
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
