import React from 'react';
import VenueCard from './VenueCard.jsx';

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
    </div>
  );
}
