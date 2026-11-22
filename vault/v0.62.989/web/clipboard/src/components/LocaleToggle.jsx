// LocaleToggle.jsx — clipboard TMA. v0.62.511.
//
// Compact language DROPDOWN. Collapsed: current flag + ▾. Open: a list of
// "Native name 🇫🇷" rows. Mirrors web/menu/src/components/LocaleToggle.jsx
// verbatim; import path adjusted for clipboard's lib/ structure.
import React, { useState, useEffect, useRef } from 'react';
import { useLocale, setActiveLocale } from '../lib/i18n.js';

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
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
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

  // On open, focus the currently-selected item (fall back to the first).
  useEffect(() => {
    if (!open || !popupRef.current) return;
    const checked = popupRef.current.querySelector('[role="menuitemradio"][aria-checked="true"]');
    const first = popupRef.current.querySelector('[role="menuitemradio"]');
    (checked || first)?.focus();
  }, [open]);

  const onMenuKeyDown = (e) => {
    const items = Array.from(popupRef.current?.querySelectorAll('[role="menuitemradio"]') || []);
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={ref} className={`relative select-none ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-sm leading-none active:scale-95"
      >
        <span>{current.flag}</span>
        <span aria-hidden="true" className="text-tg-hint text-[10px]">▾</span>
      </button>
      {open && (
        <div
          ref={popupRef}
          role="menu"
          aria-label="Language"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 mt-1 z-50 min-w-[11rem] rounded-lg border border-tg-border bg-tg-card shadow-lg overflow-hidden"
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === lang}
              onClick={() => { setActiveLocale(l.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 active:bg-tg-bg ${l.code === lang ? 'font-medium' : 'hover:bg-tg-bg'}`}
            >
              <span>{l.flag}</span>
              <span className="truncate">{l.name}</span>
              <span aria-hidden="true" className="ml-auto w-3 shrink-0 text-tg-accent leading-none">{l.code === lang ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
