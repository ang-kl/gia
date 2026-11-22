// CabinetView — full-detail view of one cabinet. v0.62.421 (P4b): header gains a
// ★ default toggle + ✎ edit mode (name + 📍 location inputs + pills
// ⧉ Duplicate · 🗑 Delete · Cancel · ✓ Save). Drawers gain Duplicate + card ✕ Remove.

import React, { useMemo, useState } from 'react';
import DrawerRow from './DrawerRow.jsx';
import ItineraryMapSheet from './ItineraryMapSheet.jsx';
import { buildItinerary } from '../lib/itinerary.js';
import { t } from '../lib/i18n.js';

const DRAWER_CAP = 20;

export default function CabinetView({
  payload, lang, onBack, onAddDrawer, onTapCard, onDeleteDrawer, onDeleteCabinet, onMoveDrawer,
  isDefault = false, onSetDefault, onSaveCabinet, onDuplicateCabinet, onDuplicateDrawer, onUnplace, onUpdateDrawer,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  // The badge counts MAPPABLE stops only. Coordinates reach a card solely via
  // the structured `venue` object, and copy-all pushes, blank cards and
  // anything filed before v0.62.429 have none — counting all stops would
  // promise pins that cannot exist.
  // No translator passed: only the COUNT is read here, and drawer names are
  // the one thing that needs one.
  const mapped = useMemo(() => (payload ? buildItinerary(payload).mappedStops : 0), [payload]);
  if (!payload) {
    return <div className="p-4 text-sm text-tg-hint">{t('chrome.loading', lang)}</div>;
  }
  const { cabinet, drawers } = payload;
  const startEdit = () => { setName(cabinet.name || ''); setLocation(cabinet.location || ''); setEditing(true); };
  const save = () => { if (!name.trim()) return; onSaveCabinet?.({ name: name.trim(), location: location.trim() }); setEditing(false); };
  const inputCls = 'w-full px-2.5 py-2 text-sm bg-tg-bg text-tg-text border border-tg-border rounded-lg outline-none focus:border-tg-accent';

  return (
    <div className="px-1 py-1">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="text-tg-hint text-sm">← {t('chrome.back', lang)}</button>
        <div className="flex-1 truncate text-base font-semibold">{cabinet.emoji} {cabinet.name}</div>
        {/* 📍 lives on whichever cabinet is OPEN, and is absent entirely when
            nothing in it can be pinned — a badge reading 0 would be an
            invitation to an empty map. */}
        {mapped > 0 && (
          <button
            onClick={() => setMapOpen((v) => !v)}
            aria-pressed={mapOpen}
            aria-expanded={mapOpen}
            aria-controls="itinerary-map-sheet"
            aria-label={t('itin.open', lang)}
            title={t('itin.open', lang)}
            className="gia-hit relative text-tg-accent text-sm"
          >
            📍
            <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-tg-accent text-tg-accent-text text-[9px] font-bold leading-[15px] text-center">
              {mapped}
            </span>
          </button>
        )}
        <button
          onClick={onSetDefault}
          aria-pressed={isDefault}
          aria-label={t('cabinet.setDefault', lang)}
          title={isDefault ? t('cabinet.isDefault', lang) : t('cabinet.setDefault', lang)}
          className={isDefault ? 'text-yellow-500' : 'text-tg-hint'}
        >{isDefault ? '★' : '☆'}</button>
        {!editing && <button onClick={startEdit} className="text-tg-accent text-sm">{t('chrome.edit', lang)}</button>}
      </div>

      {editing ? (
        <div className="bg-tg-card border border-tg-border rounded-xl p-3 mb-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('cabinet.field.name', lang)} aria-label={t('cabinet.field.name', lang)} className={inputCls + ' mb-2'} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={'📍 ' + t('cabinet.field.location', lang)} aria-label={t('cabinet.field.location', lang)} className={inputCls} />
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <button onClick={() => { onDuplicateCabinet?.(); setEditing(false); }} className="px-2.5 py-1 rounded-full border border-tg-border text-tg-text">{t('chrome.duplicate', lang)}</button>
            <button onClick={() => { setEditing(false); if (window.confirm(t('cabinet.deleteConfirm', lang))) onDeleteCabinet?.(); }} className="px-2.5 py-1 rounded-full border border-red-400/40 text-red-400">🗑 {t('chrome.delete', lang)}</button>
            <button onClick={() => setEditing(false)} className="ml-auto px-2.5 py-1 rounded-full border border-tg-border text-tg-text">{t('chrome.cancel', lang)}</button>
            <button onClick={save} className="px-3 py-1 rounded-full bg-tg-accent text-tg-accent-text font-semibold">✓ {t('chrome.save', lang)}</button>
          </div>
        </div>
      ) : (
        (cabinet.location || cabinet.dateStart) && (
          <div className="text-[11px] text-tg-hint mb-2">
            {cabinet.location && <>📍 {cabinet.location}</>}
            {cabinet.location && cabinet.dateStart && ' · '}
            {cabinet.dateStart && <>{cabinet.dateStart}{cabinet.dateEnd ? ` → ${cabinet.dateEnd}` : ''}</>}
          </div>
        )
      )}

      <div className="text-[11px] text-tg-hint mb-2">
        {t('cabinet.drawers', lang, { n: drawers.length, cap: DRAWER_CAP })}
      </div>

      {drawers.length === 0 ? (
        <div className="text-[11px] text-tg-hint italic bg-tg-card border border-tg-border rounded-xl p-3 text-center mb-2">
          {t('cabinet.empty', lang)}
        </div>
      ) : (
        drawers.map((d, i) => (
          <DrawerRow
            key={i}
            drawer={d}
            n={i}
            totalDrawers={drawers.length}
            cabinetId={cabinet.cabId}
            lang={lang}
            onTapCard={onTapCard}
            onMove={(from, to) => onMoveDrawer?.(from, to)}
            onDuplicate={(n) => onDuplicateDrawer?.(n)}
            onUnplace={(cardId, n) => onUnplace?.(cardId, n)}
            onUpdate={(n, patch) => onUpdateDrawer?.(n, patch)}
            onDelete={() => { if (window.confirm(t('drawer.deleteConfirm', lang))) onDeleteDrawer?.(i); }}
          />
        ))
      )}

      {drawers.length < DRAWER_CAP && (
        <button onClick={onAddDrawer} className="w-full bg-tg-accent text-tg-accent-text rounded-xl py-2 text-sm font-semibold mt-2">
          {t('cabinet.addDrawer', lang)}
        </button>
      )}

      {mapOpen && (
        <div id="itinerary-map-sheet">
          <ItineraryMapSheet payload={payload} lang={lang} onClose={() => setMapOpen(false)} />
        </div>
      )}
    </div>
  );
}
