// LocaleToggle.jsx — transport TMA. v0.62.312.
//
// Compact 5-flag language switch (🇬🇧 🇫🇷 🇮🇩 🇷🇺 🇩🇪). The active flag is
// full-opacity, the rest dimmed. One tap calls setActiveLocale, which writes
// the shared 'gia.locale' key + fires 'gia:locale' so the UI re-renders here
// (and stays in sync across the other TMAs).
import React from 'react';
import { useLocale, setActiveLocale } from '../i18n.js';

const LOCALES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'id', flag: '🇮🇩', label: 'Bahasa Indonesia' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

export default function LocaleToggle({ className = '' }) {
  const lang = useLocale();
  return (
    <div className={`flex items-center gap-0.5 text-sm select-none ${className}`}>
      {LOCALES.map(({ code, flag, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setActiveLocale(code)}
          aria-pressed={lang === code}
          aria-label={label}
          title={label}
          className={`px-0.5 py-0.5 rounded transition-opacity ${lang === code ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
        >{flag}</button>
      ))}
    </div>
  );
}
