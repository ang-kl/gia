// LocaleToggle.jsx — v0.58.55
//
// Discreet EN/FR flag toggle for the cuisine TMA. Sits top-right in
// the App header per Human Lead. Two flag emoji buttons; the active
// one is bolded, the inactive one is dimmed. One tap to switch.
//
// State lives in localStorage via lib/i18n.useLocale — every component
// using `useLocale()` (or reading the same `lang`) re-renders on
// switch via the 'gia:locale' CustomEvent.

import React from 'react';
import { useLocale, t } from '../lib/i18n.js';

export default function LocaleToggle({ className = '' }) {
  const [lang, setLang] = useLocale();
  const isFr = lang === 'fr';
  return (
    <div className={`flex items-center gap-1 text-sm select-none ${className}`}>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={!isFr}
        aria-label={t('locale.switchToEn', lang)}
        className={`px-1.5 py-0.5 rounded transition-opacity ${isFr ? 'opacity-40 hover:opacity-70' : 'opacity-100 font-semibold'}`}
        title={t('locale.switchToEn', lang)}
      >🇬🇧</button>
      <span className="opacity-30">·</span>
      <button
        type="button"
        onClick={() => setLang('fr')}
        aria-pressed={isFr}
        aria-label={t('locale.switchToFr', lang)}
        className={`px-1.5 py-0.5 rounded transition-opacity ${isFr ? 'opacity-100 font-semibold' : 'opacity-40 hover:opacity-70'}`}
        title={t('locale.switchToFr', lang)}
      >🇫🇷</button>
    </div>
  );
}
