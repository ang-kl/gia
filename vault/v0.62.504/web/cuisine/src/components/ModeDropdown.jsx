import React from 'react';

export default function ModeDropdown({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1.5 rounded-md bg-tg-card text-tg-text border border-tg-border"
    >
      <option value="walk">🚶 Walk</option>
      <option value="transit">🚇 Transit</option>
      <option value="drive">🚗 Drive</option>
    </select>
  );
}
