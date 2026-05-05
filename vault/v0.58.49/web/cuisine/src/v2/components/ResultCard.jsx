import React from 'react';
import { tg } from '../../api/tg.js';

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

export default function ResultCard({ venue, focused, onTap }) {
  if (!venue) return null;
  const rating = venue.rating ? `★${venue.rating.toFixed(1)}` : '';
  const price = PRICE_LABEL[venue.priceLevel] || '';
  const dist = Number.isFinite(venue.distanceM) ? `${venue.distanceM} m` : '';
  const walk = Number.isFinite(venue.walkMinutes) ? `${venue.walkMinutes} min walk` : '';
  const open = venue.openNow === true
    ? 'Open'
    : venue.openNow === false
      ? (venue.closedTodayLabel || 'Closed')
      : '';
  // v0.57.31: crowd chip from LTA-carpark availability around the venue.
  // Honest caveat — weak in CBD where lunch crowds are walk-in.
  const crowd = venue.crowdLevel === 'high' ? '🔴 busy'
    : venue.crowdLevel === 'medium' ? '🟡 moderate'
    : venue.crowdLevel === 'low' ? '🟢 quiet'
    : '';
  const meta = [rating, price, open, crowd, dist || walk].filter(Boolean).join(' · ');

  // v0.57.13: open Google Maps via Telegram.WebApp.openLink. Inside
  // the TMA WebView, plain <a target="_blank"> often does nothing —
  // tg.openLink delegates to the system browser, which auto-routes
  // to the Google Maps app via the Universal Link.
  function openMaps(e) {
    e.preventDefault();
    e.stopPropagation();
    const name = venue.name || '';
    const placeId = venue.placeId || '';
    const url = placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
      : (venue.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`);
    const w = tg();
    if (w && typeof w.openLink === 'function') {
      w.openLink(url, { try_instant_view: false });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  function copy(e) {
    e.stopPropagation();
    const lines = [venue.name, venue.area || '', venue.url || ''].filter(Boolean);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(lines.join('\n'));
  }

  return (
    <button type="button" onClick={() => onTap?.(venue.placeId)}
      className={`w-full text-left rounded-lg border bg-tg-card p-2.5 flex flex-col gap-1 ${focused ? 'border-tg-accent' : 'border-tg-border'}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight truncate">{venue.name}</div>
          <div className="text-[11px] text-tg-hint truncate">{meta}</div>
          {venue.area && <div className="text-[11px] text-tg-hint truncate">{venue.area}</div>}
          {/* v0.57.10: surface 3 reviewer-recommended dishes per Human Lead */}
          {Array.isArray(venue.dishes) && venue.dishes.length > 0 && (
            <div className="text-[12px] text-tg-text mt-1 leading-snug">
              🍴 {venue.dishes.slice(0, 3).join(' · ')}
            </div>
          )}
          {venue.vibe && <div className="text-[12px] text-tg-text mt-1 leading-snug">{venue.vibe}</div>}
          {venue.recentReview && (
            <div className="text-[11px] text-tg-hint mt-1 leading-snug italic">
              💬 "{venue.recentReview}"
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 mt-1">
        <button type="button" onClick={openMaps}
          className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">📍 Maps</button>
        <button type="button" onClick={copy}
          className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">📋 Copy</button>
      </div>
    </button>
  );
}
