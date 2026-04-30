import React from 'react';

export default function RadiusToggle({ value, onChange }) {
  const opt = (val, label) => (
    <button
      onClick={() => onChange(val)}
      className={
        'flex-1 text-xs px-2 py-1.5 rounded-md transition ' +
        (value === val
          ? 'bg-tg-accent text-tg-accent-text'
          : 'bg-tg-card text-tg-text border border-tg-border')
      }
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-1">
      {opt(1000, '1 km · Transit')}
      {opt(250,  '250 m · Walking')}
    </div>
  );
}
