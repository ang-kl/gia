// VenueCard — compact venue card used both in the catch-all strip and
// inside drawer rows. Read-only here; mutations go through AmendCardSheet.

import React from 'react';

export default function VenueCard({ card, onTap, dragProps, dimmed = false }) {
  if (!card) return null;
  const previewLines = (card.body || '').split('\n').filter(Boolean).slice(0, 2);
  const label = (card.name && card.name.trim()) || (card.preview && card.preview.slice(0, 40)) || previewLines[0] || 'Untitled';
  return (
    <div
      onClick={onTap}
      className={`bg-tg-card border border-tg-border rounded-xl p-2.5 select-none ${dimmed ? 'opacity-30' : ''}`}
      {...(dragProps || {})}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="flex items-start gap-2">
        {card.favourite && <span className="text-xs" title="Favourite">⭐</span>}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold truncate">{label}</div>
          {card.note && (
            <div className="text-[10px] text-tg-hint italic mt-0.5 line-clamp-2">{card.note}</div>
          )}
          {!card.note && card.preview && (
            <div className="text-[10px] text-tg-hint mt-0.5 line-clamp-2">{card.preview}</div>
          )}
          {Array.isArray(card.cuisines) && card.cuisines.length > 0 && (
            <div className="text-[9px] text-tg-hint mt-1">{card.cuisines.join(' · ')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
