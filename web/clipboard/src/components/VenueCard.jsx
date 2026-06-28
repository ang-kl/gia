// VenueCard — v0.62.419 (Sketchbook P3)
//
// Collapsible eatery card used in the Clipboard list and inside drawer rows.
// The saved card is a copied-text snapshot (cuisines[] tag + body/preview/note,
// no structured rating/dishes), so the card surfaces what actually exists:
//   collapsed → ⭐ name · cuisines · 1-line preview · ▸
//   expanded  → full copied details (body) + note + actions (Copy · Edit ·
//               File / Remove depending on context).
// Long-press still drags (dragProps on the root); a plain tap toggles expand.

import React, { useState } from 'react';
import { t } from '../lib/i18n.js';
import { haptic } from '../lib/tg.js';

// v0.62.425 — the saved clip `body` is the copied Telegram message (HTML markup).
// Until the structured-venue → ResultCard render lands, strip tags + decode the
// common entities so the card shows clean text instead of raw <b>…</b>.
function plainText(s) {
  return String(s || '')
    .replace(/<br\s*\/?>(?=.)/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function VenueCard({
  card, onTap, dragProps, dimmed = false,
  context = 'clipboard',      // 'clipboard' | 'drawer'
  onFile, onRemove,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!card) return null;

  const bodyText = plainText(card.body);
  const previewLines = bodyText.split('\n').filter(Boolean);
  const label = (card.name && card.name.trim()) || plainText(card.preview).slice(0, 40) || previewLines[0] || 'Untitled';
  const cuisines = Array.isArray(card.cuisines) ? card.cuisines : [];

  const stop = (e) => e.stopPropagation();
  const copy = async (e) => {
    stop(e);
    try {
      await navigator.clipboard.writeText(bodyText || plainText(card.preview) || label);
      haptic('light');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div
      onClick={() => setOpen((v) => !v)}
      className={`bg-tg-card border border-tg-border rounded-xl p-2.5 select-none ${dimmed ? 'opacity-30' : ''}`}
      {...(dragProps || {})}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="flex items-start gap-2">
        {card.favourite && <span className="text-xs flex-shrink-0" title="Favourite">⭐</span>}
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold truncate">{label}</div>
          {cuisines.length > 0 && (
            <div className="text-[9.5px] text-tg-hint mt-0.5 capitalize truncate">{cuisines.join(' · ')}</div>
          )}
          {!open && (card.note || card.preview) && (
            <div className="text-[10px] text-tg-hint mt-0.5 line-clamp-2">{card.note || plainText(card.preview)}</div>
          )}
        </div>
        <span className="flex-shrink-0 text-tg-hint text-[11px] mt-0.5" aria-hidden>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <div className="mt-2 border-t border-tg-border pt-2" onClick={stop}>
          {bodyText && (
            <div className="text-[11px] text-tg-text whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">{bodyText}</div>
          )}
          {card.note && (
            <div className="text-[10.5px] text-tg-hint italic mt-1.5">📝 {card.note}</div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
            <button type="button" onClick={copy} className="text-tg-accent font-semibold">{copied ? t('card.copied') : t('card.copy')}</button>
            {onTap && <button type="button" onClick={(e) => { stop(e); onTap(); }} className="text-tg-text">{t('card.edit')}</button>}
            {context === 'clipboard' && onFile && <button type="button" onClick={(e) => { stop(e); onFile(); }} className="text-tg-accent font-semibold">{t('card.file')}</button>}
            {context === 'drawer' && onRemove && <button type="button" onClick={(e) => { stop(e); onRemove(); }} className="ml-auto text-tg-hint">{t('card.remove')}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
