// VenueCard — v0.62.429 (Sketchbook B: render the real Cuisine ResultCard look)
//
// When the clip carries a STRUCTURED venue (copied at/after v0.62.429), the card
// renders with the same shape as web/cuisine ResultCard: rank · name · type ·
// ★rating · open · 📍dist · price (≈conv) · 🌐 · crowd · 🍲 Try · Michelin, and
// an expand for address / review / vibe. Older text-only clips fall back to the
// HTML-stripped body (so nothing regresses).

import React, { useState } from 'react';
import { pickNameGuide } from '../../../_shared/lib/name-guide.js';
import { pickAddressGuide } from '../../../_shared/lib/address-guide.js';
import PronounceIcon from '../../../_shared/components/PronounceIcon.jsx';
import { t } from '../lib/i18n.js';
import { haptic } from '../lib/tg.js';
import { SEGMENT_BY_KEY } from '../lib/segments.js';

// v0.62.432 — drawer-group accent for the filed-card side strip (item 10).
const GROUP_HEX = { morning: '#ff9a45', midday: '#3ecf8e', evening: '#ff6b6b', night: '#9d7bff' };
function fmtDate(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return ''; }
}

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
  // v0.62.766 — kept in step with ResultCard's michelinAnnotation(). A saved
  // card that lost its label the moment the source card gained one would be
  // the drift this duplicated map invites.
  'green-star':   '🌱 Michelin Green Star',
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
  context = 'clipboard', onFile, onRemove, isDuplicate = false,
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
    // v0.62.665 — prefer the compact multi-year `michelinAwardYears` array
    // (e.g. "'26, '25"); older, already-saved clips only ever carried a
    // single `michelinYear` number, so that stays as a read-only fallback.
    const michYears = Array.isArray(v.michelinAwardYears) && v.michelinAwardYears.length
      ? v.michelinAwardYears.join(', ')
      : (v.michelinYear ? String(v.michelinYear) : "'25");
    const michLeaf = v.michelinGreenStar === true && v.michelinCategory !== 'green-star' ? ' · 🌱' : '';
    michelin = v.michelinCategory ? `${MICHELIN[v.michelinCategory] || '✳️ Michelin'}${michLeaf} · ${michYears}` : '';
  }

  // ── Filed placements (item 10) + side-strip colour + date (item 12a) ──
  const placements = Array.isArray(card.placements) ? card.placements : [];
  const filedByCab = {};
  for (const p of placements) {
    (filedByCab[p.cabName] = filedByCab[p.cabName] || []).push(t(`seg.${p.segment}`, lang));
  }
  const filedLabel = Object.entries(filedByCab)
    .map(([cab, segs]) => `${cab} · ${segs.join(', ')}`).join('  ·  ');
  const stripHex = placements[0] ? GROUP_HEX[(SEGMENT_BY_KEY[placements[0].segment] || {}).group] : null;
  const copiedDate = fmtDate(card.ts);

  return (
    <div
      onClick={() => setOpen((x) => !x)}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((x) => !x); } }}
      className={`bg-tg-card border border-tg-border rounded-xl p-2.5 select-none ${dimmed ? 'opacity-30' : ''}`}
      {...(dragProps || {})}
      style={{ touchAction: 'manipulation', ...(stripHex ? { borderLeft: `4px solid ${stripHex}` } : {}) }}
    >
      {v ? (
        <>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-tg-text">
                {number != null && <span className="text-tg-hint">{number} · </span>}{v.name}
              </div>
              {/* v0.62.915 — THE TRANSLATIONS WERE ALREADY ON THE CARD; NOTHING READ THEM.
                  `ResultCard.copy()` has forwarded nameLocal / nameReading / namePronounce /
                  nameGloss into the saved venue since v0.62.840, and this component rendered
                  `{v.name}` and stopped. So a Japanese venue saved from a card that showed
                  "(銀座 寿司)" underneath came back to the Sketchbook with the line gone.
                  Resolved through the SHARED `pickNameGuide`, not a local re-implementation:
                  its own comment records that five source-scanning tests asserted this
                  precedence and four broke on a refactor while the behaviour held. A third
                  copy of the rule would be the defect this release spent its other half
                  removing. `sayNow` is the stored `namePronounce` — the Sketchbook has no live
                  pronunciation projection, so the persisted value IS the answer here. */}
              {(() => {
                const g = pickNameGuide(v, v.namePronounce);
                if (!g) return null;
                return (
                  <div className="text-[10.5px] text-tg-hint leading-tight truncate flex items-center gap-1" data-name-guide={g.key}>
                    {g.icon === 'pronounce' && <PronounceIcon className="shrink-0 opacity-80" />}
                    <span className="truncate">{g.text}</span>
                  </div>
                );
              })()}
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

      {/* v0.62.432 — item 3 (duplicate) + item 10 (filed cabinet · drawer, right). */}
      {(isDuplicate || filedLabel) && (
        <div className="flex items-center gap-2 mt-1 text-[9px]">
          {isDuplicate && <span className="text-sk-pin font-semibold">⧉ {t('card.duplicate', lang)}</span>}
          {filedLabel && <span className="ml-auto text-tg-hint truncate text-right">{filedLabel}</span>}
        </div>
      )}
      {/* v0.62.432 — item 12a: date of copy at the end of the card. */}
      {copiedDate && <div className="text-[9px] text-tg-hint mt-0.5 text-right">{t('card.copiedOn', lang)} {copiedDate}</div>}

      {open && (
        <div onClick={stop}>
          {v ? (
            <div className="mt-2 border-t border-tg-border pt-2 space-y-1">
              {v.area && <div className="text-[11px] text-tg-text">📍 {v.area}</div>}
              {/* v0.62.915 — the address half, same rule. `addressLocal` is the line a reader
                  holds up to a driver; `address-guide.js` records that it has existed since
                  v0.62.824 with nothing anywhere rendering it. The English `area` above is
                  never displaced — it stays the primary and the Maps query. */}
              {(() => {
                const g = pickAddressGuide(v);
                if (!g) return null;
                return (
                  <div className="text-[10.5px] text-tg-hint leading-snug flex items-center gap-1 min-w-0" data-address-guide={g.key}>
                    {g.icon === 'pronounce' && <PronounceIcon className="shrink-0 opacity-80" />}
                    <span className="truncate">{g.text}</span>
                  </div>
                );
              })()}
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
