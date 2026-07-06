// SettingsView.jsx — v0.62.427 (sample parity)
//
// Location & Region · Sketchbook limits · Display (toggles, persisted to
// localStorage) · Privacy (What's stored · Forget me) · About.

import React, { useState } from 'react';
import { t } from '../lib/i18n.js';

function Row({ label, value, onClick, danger }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`flex items-center justify-between gap-2 w-full text-left px-3 py-2.5 border-b border-tg-border last:border-0 ${onClick ? 'active:bg-sk-head' : ''}`}>
      <span className={`text-sm ${danger ? 'text-red-600' : 'text-tg-text'}`}>{label}</span>
      <span className="text-[13px] text-tg-hint text-right flex items-center gap-1">{value}{onClick ? <span className="text-tg-hint">›</span> : null}</span>
    </Tag>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-tg-hint px-1 mb-1">{title}</div>
      <div className="bg-tg-card border border-tg-border rounded-xl overflow-hidden">{children}</div>
    </div>
  );
}

function Toggle({ label, storageKey, defaultOn }) {
  const [on, setOn] = useState(() => {
    try { const v = localStorage.getItem(storageKey); return v == null ? defaultOn : v === '1'; } catch { return defaultOn; }
  });
  const flip = () => { const next = !on; setOn(next); try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* noop */ } };
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-tg-border last:border-0">
      <span className="text-sm text-tg-text">{label}</span>
      <button
        type="button" role="switch" aria-checked={on} onClick={flip}
        className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-tg-accent' : 'bg-tg-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

export default function SettingsView({ lang = 'en', savedLocation = '', onForgetMe }) {
  const [showStored, setShowStored] = useState(false);
  const langName = { en: 'English', fr: 'Français', id: 'Bahasa Indonesia', ru: 'Русский', de: 'Deutsch' }[lang] || lang;
  return (
    <div className="py-1">
      <h1 className="text-lg font-extrabold mb-3 px-1">{t('nav.settings', lang)}</h1>

      <Section title={t('set.region', lang)}>
        <Row label={t('set.about', lang) === 'About' ? 'Region' : 'Region'} value={<>🇸🇬 Singapore</>} />
        <Row label={t('set.language', lang)} value={langName} />
        <Row label={t('set.savedLocation', lang)} value={savedLocation || '—'} />
      </Section>

      <Section title={t('set.sketchbook', lang)}>
        <Row label={t('set.clipLimit', lang)} value={t('set.clipLimitVal', lang)} />
        <Row label={t('set.cabLimit', lang)} value={t('set.cabLimitVal', lang)} />
        <Row label={t('set.drawerLimit', lang)} value={t('set.drawerLimitVal', lang)} />
      </Section>

      <Section title={t('set.display', lang)}>
        <Toggle label={t('set.secondaryCurrency', lang)} storageKey="sk_secondary_currency" defaultOn={true} />
        <Toggle label={t('set.quietSort', lang)} storageKey="sk_quiet_sort" defaultOn={false} />
      </Section>

      <Section title={t('set.privacy', lang)}>
        <Row label={t('set.whatsStored', lang)} value="" onClick={() => setShowStored((v) => !v)} />
        {showStored && <div className="px-3 py-2.5 text-[12px] text-tg-hint leading-relaxed border-b border-tg-border">{t('set.privacyNote', lang)}</div>}
        <Row label={t('set.forgetMe', lang)} value={t('set.forgetMeValue', lang)} danger
          onClick={() => { if (window.confirm(t('set.forgetMeConfirm', lang))) onForgetMe?.(); }} />
      </Section>

      <Section title={t('set.about', lang)}>
        <Row label={t('chrome.brand', lang)} value="@soleat_bot" />
        <Row label="—" value="Adrian K. L. Ang" />
      </Section>
    </div>
  );
}
