import React from 'react';

const PRESETS = [
  { id: 'transit-efficiency', label: '🚇 Transit',    sub: 'Hidden gems, MRT-near' },
  { id: 'after-hours',        label: '🌙 After-Hours', sub: 'Late-night & supper' },
  { id: 'holiday-special',    label: '🎉 Holiday',     sub: 'PH-open & newly opened' },
  { id: 'cuisine-discovery',  label: '🆕 Discovery',   sub: 'Newest for cuisine' }
];

export default function PresetCombos({ active, onPick }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id)}
          className={
            'text-left text-xs px-2.5 py-1.5 rounded-md transition ' +
            (active === p.id
              ? 'bg-tg-accent text-tg-accent-text'
              : 'bg-tg-card text-tg-text border border-tg-border')
          }
        >
          <div className="font-medium leading-tight">{p.label}</div>
          <div className="opacity-70 text-[10px] leading-tight">{p.sub}</div>
        </button>
      ))}
    </div>
  );
}
