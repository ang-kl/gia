// LocaleToggle.jsx — v0.58.55
//
// Discreet flag toggle for the cuisine TMA. Sits top-right in the App
// header per Human Lead. One flag-emoji button per supported locale;
// the active one is bolded, the rest are dimmed. One tap to switch.
//
// v0.62.303 — generalised from a fixed EN/FR binary to a per-locale
// list so Indonesian (🇮🇩) can be added without re-deriving the active
// state from a single boolean. Driven by a LOCALES table; add a row to
// extend (the i18n layer already gates on SUPPORTED_LOCALES).
//
// State lives in localStorage via lib/i18n.useLocale — every component
// using `useLocale()` (or reading the same `lang`) re-renders on
// switch via the 'gia:locale' CustomEvent.

import React from 'react';
import { useLocale, t } from '../lib/i18n.js';

const LOCALES = [
  { code: 'en', flag: '🇬🇧', labelKey: 'locale.switchToEn' },
  { code: 'fr', flag: '🇫🇷', labelKey: 'locale.switchToFr' },
  { code: 'id', flag: '🇮🇩', labelKey: 'locale.switchToId' },
  { code: 'ru', flag: '🇷🇺', labelKey: 'locale.switchToRu' },
  { code: 'de', flag: '🇩🇪', labelKey: 'locale.switchToDe' },
];

export default function LocaleToggle({ className = '' }) {
  const [lang, setLang] = useLocale();
  return (
    <div className={`flex items-center gap-1 text-sm select-none ${className}`}>
      {LOCALES.map(({ code, flag, labelKey }, i) => {
        const active = lang === code;
        return (
          <React.Fragment key={code}>
            {i > 0 && <span className="opacity-30">·</span>}
            <button
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={active}
              aria-label={t(labelKey, lang)}
              className={`px-1.5 py-0.5 rounded transition-opacity ${active ? 'opacity-100 font-semibold' : 'opacity-40 hover:opacity-70'}`}
              title={t(labelKey, lang)}
            >{flag}</button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
