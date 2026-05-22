import React from 'react';
import VenueCard from './VenueCard.jsx';

// v0.32.0: footer button "🗺 View all on map" replaces the per-card
// 📍 Google Maps button. Opens /app/map with venues encoded in the URL
// hash so the existing AdvancedMarkerElement code renders them all
// pinned at once. Pure client-side handoff — no new server endpoint.
function buildMapHashUrl(venues) {
  const slim = venues.map((v) => ({
    placeId: v.placeId,
    name: v.name,
    area: v.area,
    lat: v.lat,
    lng: v.lng,
    vibe: v.vibe || '',
    url: v.url || ''
  }));
  // base64url-encode JSON to keep the URL clean.
  const json = JSON.stringify(slim);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `/app/map#venues=${b64}`;
}

export default function ResultsGrid({ results, expanded, onExpand }) {
  if (!results) return null;
  const venues = results.venues || [];
  if (!venues.length) {
    return (
      <div className="text-xs text-tg-hint px-2 py-4 text-center">
        No matching sanctuaries. Try a wider radius or different cuisine.
      </div>
    );
  }
  const visible = expanded ? venues.slice(0, 15) : venues.slice(0, 5);
  const hidden = venues.length - visible.length;
  const mapHref = buildMapHashUrl(visible);
  return (
    <div className="flex flex-col gap-1.5">
      {results.holidayContext?.isToday && (
        <div className="text-[11px] px-2 py-1 rounded bg-tg-card border border-tg-border text-tg-hint">
          🎉 Today is {results.holidayContext.name} (SG public holiday)
        </div>
      )}
      {visible.map((v) => <VenueCard key={v.placeId} venue={v} />)}
      {hidden > 0 && (
        <button
          onClick={onExpand}
          className="text-xs px-3 py-1.5 rounded-md bg-tg-card border border-tg-border text-tg-text"
        >
          Show next {hidden}
        </button>
      )}
      <a
        href={mapHref}
        className="mt-1 text-xs text-center px-3 py-2 rounded-md bg-tg-accent text-tg-accent-text"
      >View all {visible.length} pick{visible.length === 1 ? '' : 's'} on map</a>
    </div>
  );
}
