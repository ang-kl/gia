import React from 'react';
import { sendData } from '../api/tg.js';

export default function VenueCard({ venue }) {
  const onTap = () => {
    sendData({ cmd: 'cuisine-pick', placeId: venue.placeId, name: venue.name });
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
        <button onClick={onTap} className="text-left flex-1">
          <div className="font-medium text-sm leading-tight truncate">{venue.name}</div>
          <div className="text-[11px] text-tg-hint mt-0.5 truncate">{venue.area}</div>
        </button>
        {venue.directionsUri && (
          <a
            href={venue.directionsUri}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] px-2 py-1 rounded bg-tg-accent text-tg-accent-text whitespace-nowrap"
          >🚗 Go</a>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-tg-hint">
        {rating && <span>{rating}</span>}
        {open && <span>{open}</span>}
        {walk && <span>{walk}</span>}
        {dist && <span>{dist}</span>}
        {queue && <span>{queue}</span>}
        {venue.bookingRequired && <span>📅 Booking advised</span>}
      </div>
      {venue.signatureDish && (
        <div className="mt-1 text-[11px] text-tg-text">🍴 try the <span className="font-medium">{venue.signatureDish}</span></div>
      )}
    </div>
  );
}
