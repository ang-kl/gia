// CabinetSwitchSheet — pick which cabinet footer tab 2 points at.
//
// Footer tab 2 shows the DEFAULT cabinet and opens it. Until now the only way
// to change which one that is was Cabinets → open a cabinet → tap ★, which is
// three screens away from the button it controls. Long-pressing the tab opens
// this; choosing a cabinet sets it as the default (the same write the ★ toggle
// makes, not a parallel notion of "current") and navigates there.
//
// Bottom sheet rather than a popover: it is a footer control, there can be up
// to 12 cabinets, and the app already has exactly this shape in LocationSheet
// and FilterSheet — same `.sheet` / `.sheet-scrim` classes, same z-50, same
// useDialog contract for Escape and outside-tap.

import React from 'react';
import { useDialog } from '../../../_shared/lib/use-dialog.js';
import { t } from '../lib/i18n.js';

export default function CabinetSwitchSheet({
  cabinets = [], defaultCabinetId = null, lang = 'en', onPick, onManage, onClose
}) {
  const ref = useDialog({ open: true, onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-labelledby="cab-switch-title">
      <div className="sheet-scrim" onClick={onClose} />
      <div ref={ref} className="sheet relative w-full">
        <div className="sheet-grab" aria-hidden />
        <div className="flex items-baseline gap-2 mb-2">
          <h2 id="cab-switch-title" className="text-sm font-semibold flex-1">{t('cabinet.switchTitle', lang)}</h2>
          <button type="button" onClick={onClose} className="gia-hit text-tg-hint text-sm" aria-label={t('chrome.close', lang)}>✕</button>
        </div>
        <p className="text-[11px] text-tg-hint mb-2">{t('cabinet.switchHint', lang)}</p>

        {cabinets.length === 0 ? (
          <p className="text-[12px] text-tg-hint italic py-3 text-center">{t('cabinet.switchEmpty', lang)}</p>
        ) : (
          <ul className="flex flex-col gap-1 mb-2">
            {cabinets.map((c) => {
              const isDefault = c.cabId === defaultCabinetId;
              return (
                <li key={c.cabId}>
                  <button
                    type="button"
                    onClick={() => onPick(c.cabId)}
                    aria-current={isDefault ? 'true' : undefined}
                    className={`w-full flex items-center gap-2.5 text-left rounded-xl border p-2.5 active:scale-[0.99] ${
                      isDefault ? 'border-tg-accent bg-sk-soft' : 'border-tg-border bg-tg-card'}`}
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sk-head grid place-items-center text-base leading-none" aria-hidden>
                      {c.emoji || '🗄'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold truncate">{c.name}</span>
                      {(c.location || c.dateStart) && (
                        <span className="block text-[10.5px] text-tg-hint truncate">
                          {c.location ? `📍 ${c.location}` : ''}
                          {c.location && c.dateStart ? ' · ' : ''}
                          {c.dateStart || ''}
                        </span>
                      )}
                    </span>
                    {/* The same ★ the cabinet header uses, so the two controls
                        are visibly the same setting rather than two ideas. */}
                    <span className={`flex-shrink-0 text-sm ${isDefault ? 'text-yellow-500' : 'text-tg-border'}`}
                          aria-label={isDefault ? t('cabinet.isDefault', lang) : undefined}>
                      {isDefault ? '★' : '☆'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button type="button" onClick={onManage} className="w-full py-2 rounded-lg border border-tg-border text-sm">
          {t('nav.cabinets', lang)} →
        </button>
      </div>
    </div>
  );
}
