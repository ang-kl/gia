// CabinetView — full-detail view of one cabinet. Header (name + meta +
// "+ Add drawer" + ⋯ menu), then the drawer list.

import React, { useState } from 'react';
import DrawerRow from './DrawerRow.jsx';
import { t } from '../lib/i18n.js';

const DRAWER_CAP = 20;

export default function CabinetView({ payload, lang, onBack, onAddDrawer, onTapCard, onDeleteDrawer, onDeleteCabinet, onMoveDrawer }) {
  const [menu, setMenu] = useState(false);
  if (!payload) {
    return <div className="p-4 text-sm text-tg-hint">{t('chrome.loading', lang)}</div>;
  }
  const { cabinet, drawers } = payload;
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="text-tg-hint text-sm">← {t('chrome.back', lang)}</button>
        <div className="flex-1 truncate text-base font-semibold">
          {cabinet.emoji} {cabinet.name}
        </div>
        <button onClick={() => setMenu((v) => !v)} className="text-tg-hint">⋯</button>
      </div>
      {(cabinet.location || cabinet.dateStart) && (
        <div className="text-[11px] text-tg-hint mb-2">
          {cabinet.location && <>📍 {cabinet.location}</>}
          {cabinet.location && cabinet.dateStart && ' · '}
          {cabinet.dateStart && <>{cabinet.dateStart}{cabinet.dateEnd ? ` → ${cabinet.dateEnd}` : ''}</>}
        </div>
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
            onDelete={() => {
              if (window.confirm(t('drawer.deleteConfirm', lang))) onDeleteDrawer?.(i);
            }}
          />
        ))
      )}

      {drawers.length < DRAWER_CAP && (
        <button
          onClick={onAddDrawer}
          className="w-full bg-tg-accent text-tg-accent-text rounded-xl py-2 text-sm font-semibold mt-2"
        >
          {t('cabinet.addDrawer', lang)}
        </button>
      )}

      {menu && (
        <div className="absolute right-3 top-12 bg-tg-card border border-tg-border rounded-lg shadow-xl py-1 z-30">
          <button
            onClick={() => {
              setMenu(false);
              if (window.confirm(t('cabinet.deleteConfirm', lang))) onDeleteCabinet?.();
            }}
            className="block px-3 py-2 text-sm text-red-400 w-full text-left"
          >
            🗑 {t('chrome.delete', lang)}
          </button>
        </div>
      )}
    </div>
  );
}
