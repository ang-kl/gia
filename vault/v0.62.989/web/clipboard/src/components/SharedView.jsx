// SharedView — public read-only view for /#/shared/<token>. Loads the
// drawer snapshot from /api/clipboard/shared/:token (unauthenticated)
// and offers a single "Fork to my Clipboard" CTA.

import React, { useEffect, useState } from 'react';
import * as api from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { SEGMENT_BY_KEY } from '../lib/segments.js';
import VenueCard from './VenueCard.jsx';
import { ForkSheet } from './sheets.jsx';

export default function SharedView({ token, lang, cabinets, onForkDone, onBack }) {
  const [payload, setPayload] = useState(null);
  const [expired, setExpired] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    let alive = true;
    api.readSharedDrawer(token)
      .then((r) => { if (alive) setPayload(r); })
      .catch(() => { if (alive) setExpired(true); });
    return () => { alive = false; };
  }, [token]);

  if (expired) {
    return <div className="p-4 text-sm text-tg-hint">{t('shared.expired', lang)}</div>;
  }
  if (!payload) {
    return <div className="p-4 text-sm text-tg-hint">{t('chrome.loading', lang)}</div>;
  }

  const seg = SEGMENT_BY_KEY[payload.drawer.segment] || SEGMENT_BY_KEY.wholeDay;

  return (
    <div className="px-3 py-2 pb-24">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="text-tg-hint text-sm">← {t('chrome.back', lang)}</button>
        <div className="flex-1 text-base font-semibold">🗒 {t('shared.from', lang)}</div>
      </div>
      <div className="bg-tg-card border border-tg-border rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{seg.emoji}</span>
          <span className="text-sm font-semibold">{t(`seg.${seg.key}`, lang)}</span>
          {payload.drawer.dayTag && <span className="text-[10px] text-tg-hint">· {payload.drawer.dayTag}</span>}
        </div>
        {payload.drawer.location?.label && (
          <div className="text-[11px] text-tg-hint">📍 {payload.drawer.location.label}</div>
        )}
      </div>
      <div className="space-y-1.5">
        {payload.cards.map((c, i) => <VenueCard key={i} card={c} />)}
      </div>
      <div className="fixed left-0 right-0 bottom-0 p-3 bg-tg-bg border-t border-tg-border">
        <button
          onClick={() => setSheet(true)}
          className="w-full py-3 rounded-xl bg-tg-accent text-tg-accent-text font-semibold"
        >
          📋 {t('fork.title', lang)}
        </button>
      </div>
      {sheet && (
        <ForkSheet
          cabinets={cabinets}
          lang={lang}
          onCancel={() => setSheet(false)}
          onConfirm={async (pickCabId) => {
            try {
              const r = await api.forkSharedDrawer(token, pickCabId);
              setSheet(false);
              onForkDone?.(r);
            } catch (err) {
              alert(`Fork failed: ${err.message}`);
              setSheet(false);
            }
          }}
        />
      )}
    </div>
  );
}
