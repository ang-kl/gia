import React, { useState, useEffect, useMemo } from 'react';
import ResultCard from './ResultCard.jsx';
import { tg } from '../../api/tg.js';
import { copyAllToChat as copyAllApi, copyCommandToChat } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.58.4: human-readable label for each warm-start seed id. Surfaces
// as a muted caption above the result list so users know the initial
// 5 venues come from a curated rotation, not from their (currently
// empty) selection.
// v0.58.55: bilingual EN / FR per active locale.
// v0.60.47: stripped the leading "✨ " — the warm-start caption now
// composes as `✨ {n} suggestions · {seedName} · tap 🔍 to refine` so
// users see the explicit count first.
const SEED_LABEL = {
  'open-now-cheap':      { en: 'open now & cheap eats',     fr: 'ouvert · pas cher' },
  'newly-opened-halal':  { en: 'newly opened · halal',      fr: 'nouveaux · halal' },
  'highly-rated-nearby': { en: 'highly rated nearby',       fr: 'très bien notés à proximité' },
  'open-now-popular':    { en: 'popular & open now',        fr: 'populaires & ouverts maintenant' },
  'newly-opened-radius': { en: 'newly opened in your radius', fr: 'nouveaux dans votre zone' }
};

// v0.59.0: ResultPanel replaces FlipPanel. The flip-card animation +
// "Ask Gia" back-face are retired now that TellMePanel lives separately
// as an always-visible input below the map. Result panel = front-face
// only, with the existing Copy-all + Copy-syntax buttons preserved.
// v0.60.22 — pagination kicks in past this threshold. Mirrors the
// 12-venue cap used for /api/cuisine/copy-all so the user never sees
// more than one full page worth of cards on screen at once.
const PAGE_SIZE = 12;

export default function ResultPanel({
  venues, loading, focusedPlaceId, onCardTap, warmStartSeed, copyState,
  onPageChange,
  // v0.60.43 — music-player-skip pagination continuity. When the user
  // taps ▶ on the last page of the loaded venues, the panel calls
  // onLastPageNext() to ask the parent for the next batch from the
  // server instead of wrapping client-side. exhausted=true (set when
  // the dedup pool has been fully recycled server-side) suppresses the
  // server fetch and falls back to the wrap-to-1 recycle behaviour.
  onLastPageNext, exhausted,
  // v0.60.82 — server's AND/OR combo metadata. When attempted but not
  // matched (multi-cuisine search where no Google result combined the
  // cuisines), render a banner above the result list explaining the
  // fallback. { attempted: bool, matched: bool } or null.
  comboInfo,
  // v0.60.146 — per-session clipboard. `pageStackDepth` ≥ 1 enables
  // the ⇠ Prev FAB; tapping it asks the server to pop the most-recent
  // page off the history list and return the one before it (the result
  // list the user saw before tapping ▶). `sessionFull` is true once
  // 80 unique venues have been served this session — the terminal
  // copy below replaces the per-criteria "↺ Start over" note.
  pageStackDepth = 0, sessionFull = false, onBackOnePage,
  // v0.60.153 — optional context-specific "please wait" copy that
  // replaces the generic "Loading…" while the server runs a slow
  // pipeline (currently: Michelin's review-extract + LLM narrate +
  // enrichment-cache fill, which can take 5–10 s on a cold catalogue).
  loadingHint = null,
  // v0.61.79 — size of the full curated pool this batch is sliced from
  // (the ~130-entry Michelin list). When set, the header reads
  // "Results (12/130)"; null → plain "Results (12)".
  totalCount = null
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
        url: v.url,
        // v0.60.183 — fields needed for the new venue-card lines:
        //   restaurantType        → 🍽️ row under venue name (was being
        //                            dropped from Copy-All, hence the
        //                            cuisine-nationality label missing
        //                            from pasted output despite being
        //                            visible on the TMA card itself).
        //   allowsDogs            → 🐾 segment on the new price-pet line.
        //   priceRangeDisplay     → pre-resolved "S$25–40 (US$18.50–29.60)"
        //                            string from the search response.
        //   michelinCategory / Name → preserved through to the Michelin
        //                            annotation row in formatVenueBlock.
        restaurantType: v.restaurantType,
        allowsDogs: v.allowsDogs,
        priceRangeDisplay: v.priceRangeDisplay,
        michelinCategory: v.michelinCategory,
        michelinName: v.michelinName
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

  // v0.60.22 — pagination state. Reset to page 1 whenever the venues
  // identity changes (a new search) and clamp when the page count
  // shrinks (e.g. filter narrows the list mid-session).
  const totalPages = Math.max(1, Math.ceil((venues?.length || 0) / PAGE_SIZE));
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [venues]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const pagedVenues = useMemo(() => {
    if (!Array.isArray(venues) || venues.length === 0) return [];
    if (totalPages === 1) return venues;
    const start = (page - 1) * PAGE_SIZE;
    return venues.slice(start, start + PAGE_SIZE);
  }, [venues, page, totalPages]);
  // v0.60.28 — notify App.jsx of the visible-page slice so the map
  // can sync its markers to the current page.
  useEffect(() => {
    if (typeof onPageChange === 'function') onPageChange(pagedVenues);
  }, [pagedVenues, onPageChange]);

  return (
    <div className="rounded-2xl border border-tg-border bg-tg-bg p-2">
      <div className="flex items-center justify-between px-1 pb-1.5 gap-1.5">
        {/* v0.61.79 — when totalCount is set (Michelin's ~130-entry
            pool), show "(shown/total)" so the user reads this batch as
            a slice of the whole list; else the plain "(shown)" count.
            v0.61.163 — header now ALWAYS shows the
            `(visible_on_page / total)` ratio per operator's
            "Results (12/19)" pagination indicator. For a 19-venue
            cuisine search split across two PAGE_SIZE=12 pages, the
            header reads "Results (12/19)" on page 1 and
            "Results (19/19)" after tapping ▶. */}
        <div className="text-xs font-semibold flex-shrink-0">{(() => {
          if (!venues) return lang === 'fr' ? 'Résultats' : 'Results';
          const visibleOnPage = Math.min(page * PAGE_SIZE, venues.length);
          const denom = totalCount || venues.length;
          return `${lang === 'fr' ? 'Résultats' : 'Results'} (${visibleOnPage}/${denom})`;
        })()}</div>
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
          {/* v0.60.47 — explicit count first ("✨ 5 suggestions") so
              the warm-start cap (server pickTopN limit) is obvious.
              Followed by the curated seed flavour and the refine CTA. */}
          ✨ {lang === 'fr'
            ? `${venues.length} suggestion${venues.length === 1 ? '' : 's'}`
            : `${venues.length} suggestion${venues.length === 1 ? '' : 's'}`} · {SEED_LABEL[warmStartSeed][lang] || SEED_LABEL[warmStartSeed].en} · <span className="italic">{lang === 'fr' ? 'touchez 🔍 Rechercher pour affiner' : 'tap 🔍 Search to refine'}</span>
        </div>
      )}
      {loading ? (
        <div className="text-xs text-tg-hint px-2 py-4 leading-snug">
          {loadingHint || 'Loading…'}
        </div>
      ) : !venues?.length ? (
        /* v0.61.163 — operator's friendlier zero-state copy. The
           prior "No matches yet — pick a cuisine…" assumed the user
           hadn't yet tried. After a real search returning 0 (which
           the header now states as `Results (0/0)` per the new
           format), the message explicitly suggests two paths
           forward: change the criteria, or clear them. */
        <div className="text-xs text-tg-hint px-2 py-4 leading-snug">
          {lang === 'fr'
            ? 'Aucun résultat. Modifiez vos critères de recherche ou laissez-les vides.'
            : 'No results. Suggest changing the search criteria, or leaving it blank.'}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* v0.60.82 — combo fallback banner. When the user picked 2+
              cuisines and the server's AND-combo phase returned 0
              results, the OR-interleaved fallback ran. Surface that
              honestly so the user knows the results aren't a single
              fusion eatery — they're separate Italian + Cantonese (etc.)
              cards. text-tg-text is theme-respecting (operator's "Black"
              renders black on iOS light, white on dark). */}
          {comboInfo?.attempted && !comboInfo?.matched && (
            <div className="text-[12px] font-medium text-tg-text px-2 pt-1 pb-1 leading-snug">
              {lang === 'fr'
                ? "Aucune combinaison exacte de cuisines trouvée. Affichage d'établissements distincts pour chaque cuisine sélectionnée."
                : 'No exact cuisine combination found. Showing separate eateries for each selected cuisine.'}
            </div>
          )}
          {pagedVenues.map((v, i) => (
            <ResultCard key={v.placeId || i} venue={v} focused={v.placeId === focusedPlaceId} onTap={onCardTap} copyContext={copyState} />
          ))}
          {/* v0.60.22 — pagination strip. Only renders when the result
              set exceeds one PAGE_SIZE chunk. v0.60.28 (Human Lead
              2026-05-08): trimmed to ◀ 📄 N/T ▶ alone — the in-strip
              ↑ Top and 🔍 Search were redundant with the floating FABs,
              which are now small enough (w-8 h-8) to share the visual
              language. */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1.5">
              {/* v0.60.146/.148 — the ⇠ Prev (per-session page history)
                  used to live here but the surrounding strip only renders
                  when totalPages > 1 (the in-response page nav for the
                  current 12-venue chunk), so it was effectively invisible
                  for every standard search. Moved to the floating FAB
                  column in App.jsx, visible whenever pageStackDepth ≥ 1. */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label={lang === 'fr' ? 'Page précédente' : 'Previous page'}
                className="w-8 h-8 rounded-lg bg-tg-card text-tg-text border border-tg-border text-xs font-semibold flex items-center justify-center disabled:opacity-40 active:scale-95"
              >◀</button>
              <button
                type="button"
                onClick={() => setPage((p) => (p >= totalPages ? 1 : p + 1))}
                aria-label={lang === 'fr' ? `Page ${page} sur ${totalPages}` : `Page ${page} of ${totalPages}`}
                className="min-w-[80px] h-8 px-2 rounded-lg bg-tg-card text-tg-text border border-tg-border text-[11px] font-semibold flex items-center justify-center active:scale-95"
              >📄 {Math.min(page * PAGE_SIZE, venues.length)} / {venues.length}</button>
              <button
                type="button"
                onClick={() => {
                  // v0.60.43 — last-page tap fetches the next 40 from
                  // the server (music-player-skip continuity). When
                  // server flags exhausted=true the tap stays a no-op
                  // here so the centered indicator's wrap-to-1 path
                  // (existing recycle UX) handles re-cycling.
                  if (page < totalPages) {
                    setPage((p) => p + 1);
                  } else if (typeof onLastPageNext === 'function' && !exhausted) {
                    onLastPageNext();
                  }
                }}
                disabled={page >= totalPages && (!onLastPageNext || exhausted)}
                aria-label={lang === 'fr' ? 'Page suivante' : 'Next page'}
                className="w-8 h-8 rounded-lg bg-tg-card text-tg-text border border-tg-border text-xs font-semibold flex items-center justify-center disabled:opacity-40 active:scale-95"
              >▶</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
