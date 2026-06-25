// CabinetCard — grid tile in the Root view. Doubles as a drop target so a
// dragged catch-all card can be dropped onto a cabinet (lands in the
// FIRST drawer; if the cabinet has no drawers yet, the drop is ignored
// — the user has to create a drawer first).

import React from 'react';

export default function CabinetCard({ cabinet, onOpen }) {
  return (
    <button
      onClick={onOpen}
      data-clipboard-drop={`cabinet:${cabinet.cabId}`}
      className="bg-tg-card border border-tg-border rounded-xl p-3 text-left"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{cabinet.emoji || '📁'}</span>
        <span className="text-sm font-semibold truncate">{cabinet.name}</span>
      </div>
      {cabinet.location && (
        <div className="text-[10px] text-tg-hint mt-1 truncate">📍 {cabinet.location}</div>
      )}
      {(cabinet.dateStart || cabinet.dateEnd) && (
        <div className="text-[10px] text-tg-hint">
          {cabinet.dateStart}
          {cabinet.dateEnd ? ` → ${cabinet.dateEnd}` : ''}
        </div>
      )}
    </button>
  );
}
