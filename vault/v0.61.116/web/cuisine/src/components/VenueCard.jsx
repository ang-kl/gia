import React from 'react';
import { sendData } from '../api/tg.js';

export default function VenueCard({ venue }) {
  // v0.32.0: per-card 📍 Google Maps button removed — replaced by
  // single shared "🗺 View all on map" footer in ResultsGrid that
  // opens /app/map with all venues pinned at once. The whole card
  // body still taps to send the venue back to chat as a Sanctuary read.
  const onSaveToChat = (e) => {
    e.stopPropagation();
    sendData({ cmd: 'save-pick', placeId: venue.placeId, name: venue.name });
  };
  const rating = venue.rating ? `⭐${venue.rating.toFixed(1)}` : '';
  const open   = venue.openNow === true ? 'Open' : venue.openNow === false ? 'Closed' : '';
  const walk   = Number.isFinite(venue.walkMinutes) ? `🚶 ${venue.walkMinutes}m` : '';
  const dist   = Number.isFinite(venue.walkMeters)  ? `${venue.walkMeters} m` : '';
  const queue  = Number.isFinite(venue.queueMinEstimate)
    ? `⏱ ~${venue.queueMinEstimate} min queue (est)` : '';
  return (
    <div className="rounded-md bg-tg-card border border-tg-border p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight truncate">{venue.name}</div>
          <div className="text-[11px] text-tg-hint mt-0.5 truncate">{venue.area}</div>
        </div>
        <button
          onClick={onSaveToChat}
          className="text-[11px] px-2 py-1 rounded bg-tg-card border border-tg-border text-tg-text whitespace-nowrap"
          title="Send this pick to chat as a saved Sanctuary read"
        >📤 Save to chat</button>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-tg-hint">
        {rating && <span>{rating}</span>}
        {open && <span>{open}</span>}
        {walk && <span>{walk}</span>}
        {dist && <span>{dist}</span>}
        {queue && <span>{queue}</span>}
        {venue.bookingRequired && <span>📅 Booking advised</span>}
        {venue.costEstimateSgd && Number.isFinite(venue.costEstimateSgd.low) && Number.isFinite(venue.costEstimateSgd.high) && (
          <span>💵 S${venue.costEstimateSgd.low}–{venue.costEstimateSgd.high}</span>
        )}
      </div>
      {venue.verifiedOpeningDate && (
        <div className="mt-1 text-[11px] text-tg-hint">🆕 opened <span className="font-mono">{venue.verifiedOpeningDate}</span></div>
      )}
      {venue.signatureDish && (
        <div className="mt-1 text-[11px] text-tg-text">🍴 try the <span className="font-medium">{venue.signatureDish}</span></div>
      )}
      {venue.dishes && venue.dishes.length > 1 && (
        <div className="mt-0.5 text-[11px] text-tg-hint">also: {venue.dishes.slice(0, 4).join(' · ')}</div>
      )}
      {venue.travelAdvice && (
        <div className="mt-0.5 text-[11px] text-tg-hint">🧭 {venue.travelAdvice}</div>
      )}
      {venue.shelterNote && (
        <div className="mt-0.5 text-[11px] text-tg-hint">☂️ {venue.shelterNote}</div>
      )}
    </div>
  );
}
