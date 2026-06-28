// SettingsView.jsx — v0.62.422 (Sketchbook P5)
//
// Settings tab — informational only (limits, region/language, privacy, about).
// No fabricated toggles: the prototype's Display toggles (secondary currency,
// quiet-first sort) don't map to the clipboard's copied-text cards, so they're
// omitted rather than shown inert.

import React from 'react';
import { t } from '../lib/i18n.js';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-tg-border last:border-0">
      <span className="text-sm text-tg-text">{label}</span>
      <span className="text-[13px] text-tg-hint text-right">{value}</span>
    </div>
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

export default function SettingsView({ lang = 'en' }) {
  const langName = { en: 'English', fr: 'Français', id: 'Bahasa Indonesia', ru: 'Русский', de: 'Deutsch' }[lang] || lang;
  return (
    <div className="py-1">
      <h1 className="text-lg font-extrabold mb-3 px-1">⚙️ {t('nav.settings', lang)}</h1>

      <Section title={t('set.sketchbook', lang)}>
        <Row label={t('set.clipLimit', lang)} value={t('set.clipLimitVal', lang)} />
        <Row label={t('set.cabLimit', lang)} value={t('set.cabLimitVal', lang)} />
        <Row label={t('set.drawerLimit', lang)} value={t('set.drawerLimitVal', lang)} />
      </Section>

      <Section title={t('set.region', lang)}>
        <Row label="🇸🇬 Singapore" value="" />
        <Row label={t('set.language', lang)} value={langName} />
      </Section>

      <Section title={t('set.privacy', lang)}>
        <div className="px-3 py-2.5 text-[12px] text-tg-hint leading-relaxed">{t('set.privacyNote', lang)}</div>
      </Section>

      <Section title={t('set.about', lang)}>
        <Row label={t('chrome.brand', lang)} value="@soleat_bot" />
        <Row label="—" value="Adrian K. L. Ang" />
      </Section>
    </div>
  );
}
