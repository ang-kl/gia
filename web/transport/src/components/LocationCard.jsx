import React from 'react';
// v0.62.814 — O-320. Official gov.sg station names in the reader's language.
import { stationName } from '../../../_shared/lib/mrt-stations-i18n.generated.js';

// "📍 You are here" card. Shows the reverse-geocoded address from
// /api/transport/status + nearest MRT stations from the same payload.
//
// v0.62.814 — `lang` is threaded in from App.jsx so the nearest-station names follow
// the reader. NOT translated here: the "You are here" and "Nearest MRT" labels, which
// were hardcoded English before this change and still are. Translating the station
// names while leaving their heading in English is a visible half-measure, so it is
// named rather than left to be noticed — see O-321.
export default function LocationCard({ address, nearest, lang = 'en' }) {
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
              · {stationName(s.name, lang)}{s.distanceM ? ` — ${s.distanceM} m / ${Math.max(1, Math.round(s.distanceM / 80))} min walk` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
