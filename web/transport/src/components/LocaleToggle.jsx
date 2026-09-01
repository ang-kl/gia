// LocaleToggle.jsx — transport TMA. v0.62.314.
//
// Compact language DROPDOWN (replaces the 5-flag row, which ate header
// space). Collapsed: current flag + ▾. Open: a list of "Native name 🇫🇷"
// rows. Picking one calls setLang (writes the shared 'gia.locale' key +
// fires 'gia:locale' so the UI re-renders and stays in sync across TMAs).
import React, { useState, useEffect, useRef } from 'react';
import { t, useLocale, setActiveLocale } from '../i18n.js';

const LOCALES = [
  { code: 'en', name: 'English',          flag: '🇬🇧' },
  { code: 'fr', name: 'Français',         flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',          flag: '🇩🇪' },
  { code: 'ru', name: 'Русский',          flag: '🇷🇺' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', name: '中文',             flag: '🇨🇳' },
  { code: 'ja', name: '日本語',           flag: '🇯🇵' },
  { code: 'es', name: 'Español',          flag: '🇪🇸' },
  { code: 'ko', name: '한국어',            flag: '🇰🇷' },
];

export default function LocaleToggle({ className = '' }) {
  const lang = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LOCALES.find((l) => l.code === lang) || LOCALES[0];

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  // P1-d — menu-button keyboard model: the popup used role="listbox" with no
  // keyboard support at all (and listbox options must not be buttons). It is
  // now an ARIA menu of menuitemradio buttons: ArrowUp/ArrowDown rove
  // (wrapping), Home/End jump, Escape closes and returns focus to the
  // trigger, and the selected language receives focus when the menu opens.
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const sel = menuRef.current.querySelector('[role="menuitemradio"][aria-checked="true"]')
      || menuRef.current.querySelector('[role="menuitemradio"]');
    sel?.focus();
  }, [open]);
  function onMenuKey(e) {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitemradio"]') || []);
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1 + items.length) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
  }

  return (
    <div ref={ref} className={`relative select-none ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('locale.language', lang)}
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm leading-none active:scale-95"
      >
        <span>{current.flag}</span>
        <span aria-hidden="true" className="text-tg-hint text-[10px]">▾</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('locale.language', lang)}
          onKeyDown={onMenuKey}
          className="absolute right-0 mt-1 z-50 min-w-[11rem] rounded-lg border border-tg-border bg-tg-card shadow-lg overflow-hidden"
        >
          <div className="flex items-center justify-end px-2 py-1 border-b border-tg-border">
            <button type="button" onClick={() => setOpen(false)}
              aria-label={t('mrt.close', lang)}
              className="text-tg-hint text-sm leading-none px-1 flex-shrink-0">✕</button>
          </div>
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === lang}
              onClick={() => { setActiveLocale(l.code); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left ${l.code === lang ? 'font-semibold bg-tg-bg' : 'hover:bg-tg-bg'}`}
            >
              <span>{l.name}</span>
              <span aria-hidden="true">{l.flag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
