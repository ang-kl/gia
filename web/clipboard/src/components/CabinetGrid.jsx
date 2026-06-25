// CabinetGrid — list of CabinetCards on the Root view + "+ New cabinet"
// tile when count < cap.

import React from 'react';
import CabinetCard from './CabinetCard.jsx';
import { t } from '../lib/i18n.js';

const CAP = 12;

export default function CabinetGrid({ cabinets, lang, onOpen, onNew }) {
  return (
    <section className="mt-4">
      <div className="flex items-end gap-2 mb-1.5 px-1">
        <h2 className="text-[12px] font-semibold">🍴 {t('root.cabinets', lang)}</h2>
        <span className="text-[10px] text-tg-hint">{cabinets.length} / {CAP}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cabinets.map((c) => (
          <CabinetCard key={c.cabId} cabinet={c} onOpen={() => onOpen?.(c.cabId)} />
        ))}
        {cabinets.length < CAP && (
          <button
            onClick={onNew}
            className="bg-tg-card border border-dashed border-tg-border text-tg-hint rounded-xl p-3 text-sm"
          >
            {t('root.newCabinet', lang)}
          </button>
        )}
        {cabinets.length >= CAP && (
          <div className="bg-tg-card border border-tg-border text-tg-hint rounded-xl p-3 text-[11px]">
            {t('root.capCabinets', lang, { cap: CAP })}
          </div>
        )}
      </div>
    </section>
  );
}
