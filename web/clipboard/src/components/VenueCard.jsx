// VenueCard — v0.62.429 (Sketchbook B: render the real Cuisine ResultCard look)
//
// When the clip carries a STRUCTURED venue (copied at/after v0.62.429), the card
// renders with the same shape as web/cuisine ResultCard: rank · name · type ·
// ★rating · open · 📍dist · price (≈conv) · 🌐 · crowd · 🍲 Try · Michelin, and
// an expand for address / review / vibe. Older text-only clips fall back to the
// HTML-stripped body (so nothing regresses).

import React, { useState } from 'react';
import { t } from '../lib/i18n.js';
import { haptic } from '../lib/tg.js';

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
const CROWD = {
  low:    { dot: '🟢', key: 'card.crowdLow' },
  medium: { dot: '🟡', key: 'card.crowdMedium' },
  high:   { dot: '🔴', key: 'card.crowdHigh' },
};
const MICHELIN = {
  'three-star':   '✳️ Michelin · ⭐⭐⭐',
  'two-star':     '✳️ Michelin · ⭐⭐',
  'one-star':     '✳️ Michelin · ⭐',
  'bib-gourmand': '✳️ Bib Gourmand',
};

function plainText(s) {
  return String(s || '')
    .replace(/<br\s*\/?>(?=.)/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function distLabel(m) {
  if (!Number.isFinite(m)) return '';
  return m >= 1000 ? `~${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export default function VenueCard({
  card, onTap, dragProps, dimmed = false, number = null, lang = 'en',
  context = 'clipboard', onFile, onRemove,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!card) return null;

  const v = card.venue && typeof card.venue === 'object' ? card.venue : null;
  const bodyText = plainText(card.body);
  const previewLines = bodyText.split('\n').filter(Boolean);
  const label = (card.name && card.name.trim()) || (v && v.name) || plainText(card.preview).slice(0, 40) || previewLines[0] || 'Untitled';
  const cuisines = Array.isArray(card.cuisines) ? card.cuisines : [];

  const stop = (e) => e.stopPropagation();
  const copy = async (e) => {
    stop(e);
    try { await navigator.clipboard.writeText(bodyText || plainText(card.preview) || label); haptic('light'); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard unavailable */ }
  };
  const fileBtn = (context === 'clipboard' && onFile)
    ? <button type="button" onClick={(e) => { stop(e); onFile(); }} className="flex-shrink-0 text-[11px] font-semibold text-tg-accent-text bg-tg-accent rounded-full px-2.5 py-1">{t('card.file', lang)}</button>
    : null;

  // ── Rich (ResultCard-parity) fields ──
  let metaTop = '', priceRow = '', tryDish = '', typeLine = '', michelin = '';
  if (v) {
    const rating = v.rating ? `★${v.rating.toFixed(1)}` : '';
    const openLabel = v.openNow === true ? (v.openClosingLabel || t('card.open', lang))
      : v.openNow === false ? (v.closedTodayLabel || t('card.closed', lang)) : '';
    const dist = distLabel(v.distanceM);
    const crowd = CROWD[v.crowdLevel];
    tryDish = v.signatureDish || v.cityDish || (Array.isArray(v.dishes) && v.dishes[0]) || '';
    typeLine = v.restaurantType || v.primaryType || '';
    metaTop = [rating, openLabel, dist ? `📍 ${dist}${t('card.distAway', lang)}` : ''].filter(Boolean).join(' · ');
    priceRow = [
      v.priceRangeDisplay || PRICE_LABEL[v.priceLevel] || '',
      (v.websiteUri || v.url) ? '🌐' : '',
      crowd ? `${crowd.dot} ${t(crowd.key, lang)}` : '',
    ].filter(Boolean).join(' · ');
    michelin = v.michelinCategory ? `${MICHELIN[v.michelinCategory] || '✳️ Michelin'} · ${v.michelinYear || 2025}` : '';
  }

  return (
    <div
      onClick={() => setOpen((x) => !x)}
      className={`bg-tg-card border border-tg-border rounded-xl p-2.5 select-none ${dimmed ? 'opacity-30' : ''}`}
      {...(dragProps || {})}
      style={{ touchAction: 'manipulation' }}
    >
      {v ? (
        <>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-tg-text">
                {number != null && <span className="text-tg-hint">{number} · </span>}{v.name}
              </div>
              {typeLine && <div className="text-[11px] text-tg-hint capitalize">{typeLine}</div>}
            </div>
            {fileBtn}
          </div>
          {metaTop && <div className="text-[11px] text-tg-text mt-1">{metaTop}</div>}
          {priceRow && <div className="text-[11px] text-tg-text mt-0.5">{priceRow}</div>}
          {tryDish && <div className="text-[11px] text-tg-text mt-0.5">🍲 {t('card.try', lang)}: {tryDish}</div>}
          {michelin && <div className="text-[11px] font-semibold text-tg-text mt-0.5">{michelin}</div>}
        </>
      ) : (
        <div className="flex items-start gap-2">
          {card.favourite && <span className="text-xs flex-shrink-0" title="Favourite">⭐</span>}
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold truncate">{label}</div>
            {cuisines.length > 0 && <div className="text-[9.5px] text-tg-hint mt-0.5 capitalize truncate">{cuisines.join(' · ')}</div>}
            {!open && (card.note || card.preview) && <div className="text-[10px] text-tg-hint mt-0.5 line-clamp-2">{card.note || plainText(card.preview)}</div>}
          </div>
          {fileBtn}
        </div>
      )}

      {open && (
        <div onClick={stop}>
          {v ? (
            <div className="mt-2 border-t border-tg-border pt-2 space-y-1">
              {v.area && <div className="text-[11px] text-tg-text">📍 {v.area}</div>}
              {v.recentReview && <div className="text-[11px] text-tg-hint italic">💬 “{v.recentReview}”{v.recentReviewAgo ? ` · ${v.recentReviewAgo}` : ''}</div>}
              {v.vibe && <div className="text-[11px] text-tg-hint">{v.vibe}</div>}
            </div>
          ) : (
            <div className="mt-2 border-t border-tg-border pt-2">
              {bodyText && <div className="text-[11px] text-tg-text whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">{bodyText}</div>}
            </div>
          )}
          {card.note && <div className="text-[10.5px] text-tg-hint italic mt-1.5">📝 {card.note}</div>}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
            <button type="button" onClick={copy} className="text-tg-accent font-semibold">{copied ? t('card.copied', lang) : t('card.copy', lang)}</button>
            {onTap && <button type="button" onClick={(e) => { stop(e); onTap(); }} className="text-tg-text">{t('card.edit', lang)}</button>}
            {context === 'drawer' && onRemove && <button type="button" onClick={(e) => { stop(e); onRemove(); }} className="ml-auto text-tg-hint">{t('card.remove', lang)}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
