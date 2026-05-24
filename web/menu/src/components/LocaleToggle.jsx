import React from 'react';
import { useLocale, setActiveLocale } from '../i18n.js';

// v0.60.62 — inline EN · FR toggle that replaces the v0.60.55
// "Language" footer chip (which was a no-op — the chip dispatched
// a `language` cmd that routeMenuCommand had no case for). Tap the
// inactive language to switch; the active one renders bold.
//
// Wires through i18n.setActiveLocale, which (a) writes localStorage,
// (b) fires the gia:locale CustomEvent so every subscribed useLocale
// re-renders, and (c) best-effort POSTs to /api/cuisine/user-language
// so chat-side /language preference syncs across sessions.
export default function LocaleToggle() {
  const lang = useLocale();
  const cls = (active) => `text-[11px] px-1.5 py-0.5 rounded ${
    active
      ? 'font-semibold text-tg-text'
      : 'text-tg-hint cursor-pointer hover:text-tg-text'
  }`;
  return (
    <div className="text-[11px] inline-flex items-center gap-0">
      <button
        type="button"
        className={cls(lang === 'en')}
        onClick={() => setActiveLocale('en')}
        aria-label="English"
        aria-pressed={lang === 'en'}
      >🇬🇧EN</button>
      <span className="text-tg-hint">·</span>
      <button
        type="button"
        className={cls(lang === 'fr')}
        onClick={() => setActiveLocale('fr')}
        aria-label="Français"
        aria-pressed={lang === 'fr'}
      >🇫🇷FR</button>
    </div>
  );
}
