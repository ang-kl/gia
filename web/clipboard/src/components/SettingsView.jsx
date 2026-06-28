// SettingsView.jsx — v0.62.417 (Sketchbook P2 stub)
//
// Placeholder for the Settings tab. The full screen (Location & Region,
// Sketchbook limits, Display toggles, Privacy, About) lands in P5.

import React from 'react';
import { t } from '../lib/i18n.js';

export default function SettingsView({ lang = 'en' }) {
  return (
    <div className="py-10 text-center text-sm text-tg-hint">
      ⚙️ {t('settings.soon', lang)}
    </div>
  );
}
