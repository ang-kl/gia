import React from 'react';

// "📍 You are here" card. Shows the reverse-geocoded address from
// /api/transport/status + nearest MRT stations from the same payload.
export default function LocationCard({ address, nearest }) {
  if (!address && !nearest?.length) return null;
  return (
    <div className="rounded-lg border border-tg-border bg-tg-card p-3 text-xs flex flex-col gap-1.5">
      {address && (
        <div className="flex items-start gap-1.5">
          <span>📍</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-tg-text">You are here</div>
            <div className="text-tg-hint">{address}</div>
          </div>
        </div>
      )}
      {nearest?.length > 0 && (
        <div className="border-t border-tg-border pt-1.5">
          <div className="font-semibold text-tg-text mb-1">Nearest MRT</div>
          {nearest.slice(0, 3).map((s, i) => (
            <div key={i} className="text-tg-hint">
              · {s.name}{s.distanceM ? ` — ${s.distanceM} m / ${Math.max(1, Math.round(s.distanceM / 80))} min walk` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
