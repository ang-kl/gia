import React from 'react';

export default function TimeDropdown({ value, onChange }) {
  const isLater = value !== 'now';
  const select = (
    <select
      value={isLater ? 'later' : 'now'}
      onChange={(e) => onChange(e.target.value === 'now' ? 'now' : new Date(Date.now() + 30 * 60 * 1000).toISOString())}
      className="text-xs px-2 py-1.5 rounded-md bg-tg-card text-tg-text border border-tg-border"
    >
      <option value="now">⏰ Now</option>
      <option value="later">⏰ Later</option>
    </select>
  );
  if (!isLater) return select;
  // ISO local input — derived back to ISO when changed.
  const localValue = (() => {
    try {
      const d = new Date(value);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return iso;
    } catch { return ''; }
  })();
  return (
    <div className="flex gap-1">
      {select}
      <input
        type="datetime-local"
        value={localValue}
        onChange={(e) => onChange(new Date(e.target.value).toISOString())}
        className="text-xs px-2 py-1.5 rounded-md bg-tg-card text-tg-text border border-tg-border"
      />
    </div>
  );
}
