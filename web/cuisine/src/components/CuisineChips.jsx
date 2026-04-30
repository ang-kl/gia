import React from 'react';
import { ALL_CUISINES } from '../state/useCuisineState.js';

const ICON = {
  Japanese: '🍣', Korean: '🍲', Chinese: '🥟',
  Italian: '🍝',  Indian: '🍛',  Thai: '🍜',
  Vietnamese: '🥢', Malay: '🍱', Western: '🍔'
};

export default function CuisineChips({ selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_CUISINES.map((c) => {
        const on = selected.includes(c);
        return (
          <button
            key={c}
            onClick={() => onToggle(c)}
            className={
              'text-xs px-2.5 py-1 rounded-full transition ' +
              (on
                ? 'bg-tg-accent text-tg-accent-text'
                : 'bg-tg-card text-tg-text border border-tg-border')
            }
          >
            {ICON[c]} {c}
          </button>
        );
      })}
    </div>
  );
}
