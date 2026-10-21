import React, { useState } from 'react';
import ResultCard from './ResultCard.jsx';
import { tg } from '../../api/tg.js';
import { copyAllToChat as copyAllApi, copyCommandToChat } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.58.4: human-readable label for each warm-start seed id. Surfaces
// as a muted caption above the result list so users know the initial
// 5 venues come from a curated rotation, not from their (currently
// empty) selection.
// v0.58.55: bilingual EN / FR per active locale.
const SEED_LABEL = {
  'open-now-cheap':      { en: '✨ Open now & cheap eats',   fr: '✨ Ouvert · pas cher' },
  'newly-opened-halal':  { en: '✨ Newly opened · halal',     fr: '✨ Nouveaux · halal' },
  'highly-rated-nearby': { en: '✨ Highly rated nearby',      fr: '✨ Très bien notés à proximité' },
  'open-now-popular':    { en: '✨ Popular & open now',       fr: '✨ Populaires & ouverts maintenant' },
  'newly-opened-radius': { en: '✨ Newly opened in your radius', fr: '✨ Nouveaux dans votre zone' }
};

// v0.59.0: ResultPanel replaces FlipPanel. The flip-card animation +
// "Ask Gia" back-face are retired now that TellMePanel lives separately
// as an always-visible input below the map. Result panel = front-face
// only, with the existing Copy-all + Copy-syntax buttons preserved.
export default function ResultPanel({
  venues, loading, focusedPlaceId, onCardTap, warmStartSeed, copyState
}) {
  const [lang] = useLocale();
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyAll() {
    if (!venues?.length || copying) return;
    setCopying(true);
    setCopied(false);
    try {
      // v0.58.53: pass through every field formatVenueBlock consumes
      // server-side. The previous slim ({name, placeId, lat, lng})
      // collapsed every optional row in the T2 detail block so the
      // pasted message degenerated to "<b>NAME</b>\n📍 URL". The
      // server's /api/cuisine/copy-all still re-validates via its own
      // filter, so widening the payload here doesn't lower trust.
      // v0.59.29: 16 → 12 per Human Lead 2026-05-07. Mirrors the
      // server-side cap revert in cuisine-search.js:258 to keep the
      // copied chat message within Telegram's 4096-char limit.
      const enriched = venues.slice(0, 12).map((v) => ({
        name: v.name || '',
        placeId: v.placeId || '',
        lat: v.lat,
        lng: v.lng,
        area: v.area,
        rating: v.rating,
        userRatingCount: v.userRatingCount,
        priceLevel: v.priceLevel,
        crowdLevel: v.crowdLevel,
        openNow: v.openNow,
        weekdayDescriptions: v.weekdayDescriptions,
        closedTodayLabel: v.closedTodayLabel,
        websiteUri: v.websiteUri,
        phone: v.phone,
        dishes: v.dishes,
        distanceM: v.distanceM,
        transitMinutes: v.transitMinutes,
        driveMinutes: v.driveMinutes,
        url: v.url
      }));
      // v0.58.55: pass active TMA locale so the server's
      // formatVenueBlock can render French static labels.
      await copyAllApi(enriched, lang, {
        cuisines: copyState?.cuisines || [],
        filters: copyState?.filters || {},
        region: copyState?.region || 'SG'
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('[Copy-All] failed:', err.message);
      const w = tg();
      if (w && typeof w.showAlert === 'function') {
        w.showAlert(tr('err.copyFailed', lang));
      }
    } finally { setCopying(false); }
  }

  const [copyingCmd, setCopyingCmd] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  async function handleCopyCommand() {
    if (!copyState || copyingCmd) return;
    setCopyingCmd(true);
    setCopiedCmd(false);
    try {
      await copyCommandToChat({
        cuisines: copyState.cuisines || [],
        filters: copyState.filters || {},
        prices: copyState.filters?.prices || [],
        region: copyState.region || 'SG',
        location: copyState.location || null,
        lang  // v0.58.55: propagate to server so the wrapper line is FR-aware
      });
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 3000);
    } catch (err) {
      console.warn('[Copy-Syntax] failed:', err.message);
      const w = tg();
      if (w && typeof w.showAlert === 'function') {
        // v0.58.41: server now accepts bare /cuisine; this branch only
        // fires on an actual network/auth error.
        w.showAlert(tr('err.commandFailed', lang));
      }
    } finally { setCopyingCmd(false); }
  }
  // v0.58.41: enable copy-syntax even without cuisines/filters/location
  // — server now emits bare `/cuisine` so a warm-start search is
  // shareable. Previously the button was disabled until the user picked
  // at least one filter, which made it impossible to copy the initial
  // result list.
  const canCopyCmd = !!(copyState && Array.isArray(venues) && venues.length);

  return (
    <div className="rounded-2xl border border-tg-border bg-tg-bg p-2">
      <div className="flex items-center justify-between px-1 pb-1.5 gap-1.5">
        <div className="text-xs font-semibold flex-shrink-0">{lang === 'fr' ? 'Résultats' : 'Results'} {venues ? `(${venues.length})` : ''}</div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {venues?.length > 0 && (
            <button type="button" onClick={handleCopyAll} disabled={copying}
              className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-card whitespace-nowrap disabled:opacity-50">
              {copying
                ? (lang === 'fr' ? '📋 Envoi…' : '📋 Sending…')
                : copied
                  ? (lang === 'fr' ? '✓ Envoyé' : '✓ Sent')
                  : tr('btn.copyAll', lang)}
            </button>
          )}
          {canCopyCmd && (
            <button type="button" onClick={handleCopyCommand} disabled={copyingCmd}
              className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-card whitespace-nowrap disabled:opacity-50">
              {copyingCmd
                ? (lang === 'fr' ? '🔗 Envoi…' : '🔗 Sending…')
                : copiedCmd
                  ? (lang === 'fr' ? '✓ Envoyé' : '✓ Sent')
                  : (lang === 'fr' ? '🔗 Copier la syntaxe' : '🔗 Copy syntax')}
            </button>
          )}
        </div>
      </div>
      {warmStartSeed && SEED_LABEL[warmStartSeed] && (
        <div className="text-[11px] text-tg-hint px-1 pb-1.5">
          {SEED_LABEL[warmStartSeed][lang] || SEED_LABEL[warmStartSeed].en} · <span className="italic">{lang === 'fr' ? 'touchez 🔍 Rechercher pour affiner' : 'tap 🔍 Search to refine'}</span>
        </div>
      )}
      {loading ? (
        <div className="text-xs text-tg-hint px-2 py-4">Loading…</div>
      ) : !venues?.length ? (
        <div className="text-xs text-tg-hint px-2 py-4">No matches yet — pick a cuisine or use 💬 Tell me above.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {venues.map((v, i) => (
            <ResultCard key={v.placeId || i} venue={v} focused={v.placeId === focusedPlaceId} onTap={onCardTap} copyContext={copyState} />
          ))}
        </div>
      )}
    </div>
  );
}
