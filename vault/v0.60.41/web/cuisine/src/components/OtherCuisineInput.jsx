import React from 'react';

export default function OtherCuisineInput({ value, onChange }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] text-tg-hint">Another cuisine (free-form)</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. kaiseki, nasi padang, smashburger"
        className="text-xs px-2 py-1.5 rounded-md bg-tg-card text-tg-text border border-tg-border placeholder:text-tg-hint"
      />
    </div>
  );
}
