import React, { useState, useEffect, useMemo, useRef } from 'react';
import ResultCard from './ResultCard.jsx';
import { tg } from '../../api/tg.js';
import { copyAllToChat as copyAllApi, copyCommandToChat } from '../lib/api.js';
import { useLocale, t as tr, tn } from '../lib/i18n.js';
import { groupByAwardCity, groupNeedsJumpRow } from '../lib/michelin-city-groups.js';

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
  // (the ~130-entry Michelin list). When set, the header switches
  // to the "Results (130) · Showing 13-24" / "Final 9 shown" copy.
  totalCount = null,
  // v0.61.170 — cumulative range labels for the 24-first / 12-follow-up
  // session model. Server provides start/end (1-based) so the TMA
  // doesn't need to track cumulative position across taps.
  cumulativeStart = null, cumulativeEnd = null, finalBatch = false, firstBatch = false,
  // v0.61.174 — cumulative total seen across all taps for this
  // criteria. Tracked by App.jsx (max of cumulativeEnd seen so
  // far). Used as `{known}` in the title. When null, the title
  // falls back to the "discovering" copy.
  knownTotal = null,
  /* v0.61.240 — tiny combo-criteria line under the title. e.g.
     "Japanese · Halal · $$". Computed in App.jsx so this component
     stays presentational. Empty string = don't render the line. */
  comboLine = '',
  // v0.61.174 — cumulative cap (cuisine-session SEEN_CAP). When the
  // server signals knownTotal >= cap AND finalBatch, title swaps
  // to "Results: {cap}+ · Limit reached".
  cumulativeCap = null,
  // v0.61.255 — forward specialMode so ResultCard can render the
  // "Inquire for seasonal durian pastry" hint.
  specialMode = null,
  // v0.61.350 — Michelin "N more to explore" hint, rendered full-width below
  // the header (under the "· Michelin <country>" line). null hides it.
  michelinHint = null,
  // v0.61.397 — operator: durian / fruits / durian-pastry are blocked
  // outside the SE-Asian durian belt; the server returns { mode, country }.
  // When set the empty-state shows "only available in …" instead of the
  // generic "No results" copy (the empty list is intentional, not a miss).
  specialModeBlocked = null,
  // v0.61.409 — true when the boot load was suppressed because the saved
  // location ≠ the device location; the empty-state shows a "tap 🔍" note.
  bootMismatchHalt = false,
  // v0.62.6 — Michelin city-grouped display (display layer only). When the
  // visible batch carries awardCity fields, the card list renders in city
  // sections: the set-location city's cards first (no row), every other city
  // group preceded by a tappable "{count} Michelin picks in {city}" row.
  // michelinCity = server-resolved set-location city (michelinSummary.city);
  // onCityJump(group) pans/fits the map to that city's visible pins.
  michelinCity = null,
  onCityJump = null
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
        nameLocal: v.nameLocal || '',
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
        openClosingLabel: v.openClosingLabel,
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

  // v0.61.403 — progressive reveal of the FIRST impression (parity with
  // gia-web v0.1.151): paint the curated first batch one card at a time
  // instead of the whole set at once. `revealCount` walks 0→N once the batch
  // is in (first card immediate, each next ~220 ms later). ONLY the first
  // batch streams; paging / subsequent searches render in full. This is
  // presentation-only — the boot load + location gate in App.jsx (the
  // hang-prone area) are untouched.
  const [revealCount, setRevealCount] = useState(0);
  const revealKeyRef = useRef('');
  useEffect(() => {
    if (!firstBatch) return;
    const key = (pagedVenues || []).map((v) => v.placeId || v.name).join('|');
    if (key !== revealKeyRef.current) {
      revealKeyRef.current = key;
      setRevealCount(0);
    }
  }, [pagedVenues, firstBatch]);
  useEffect(() => {
    if (!firstBatch || loading) return;
    if (revealCount >= pagedVenues.length) return;
    const id = setTimeout(
      () => setRevealCount((n) => n + 1),
      revealCount === 0 ? 0 : 220,
    );
    return () => clearTimeout(id);
  }, [firstBatch, loading, revealCount, pagedVenues.length]);
  const cardsToShow = firstBatch ? pagedVenues.slice(0, revealCount) : pagedVenues;
  const streamingMore =
    firstBatch && !loading && pagedVenues.length > 0 && revealCount < pagedVenues.length;

  return (
    <div className="rounded-2xl border border-tg-border bg-tg-bg p-2">
      <div className="flex items-center justify-between px-1 pb-1.5 gap-1.5">
        {/* v0.61.174 — counter copy follows the operator's spec table:
              • known total + multi-page → "Results: {known} · Showing {a}-{b}"
              • known total + all shown on a single page → "Results: {known} · Showing all"
              • SEEN_CAP reached → "Results: {cap}+ · Limit reached"
              • unknown total (very early state) → "Showing {n} results"
              • Michelin curated pool keeps `totalCount` as known.
            `knownTotal` is App.jsx's monotonic max of `cumulativeEnd`
            seen so far for this criteria. `cumulativeCap` is the
            session SEEN_CAP (100 today) — when knownTotal ≥ cap AND
            finalBatch, the "limit reached" copy fires. */}
        {/* v0.61.190 — title rendered on TWO lines so the right-side
            Copy all / Copy syntax buttons stay un-crowded on narrow
            phones. Line 1: "Results: {known}". Line 2: per-state
            "· Showing first N" / "· Showing A-B" / "· Showing all"
            / "· Limit reached". Pre-first-fetch falls back to the
            single-line "Showing N results" string. */}
        <div className="text-xs font-semibold flex-shrink-0 leading-tight">{(() => {
          if (!venues) return lang === 'fr' ? 'Résultats' : 'Results';
          const visibleStart = (page - 1) * PAGE_SIZE + 1;
          const visibleEnd = Math.min(page * PAGE_SIZE, venues.length);
          // Known total: prefer Michelin's curated pool; else App.jsx's
          // running max; else null (unknown — pre-first-fetch state).
          let known = null;
          if (Number.isFinite(totalCount) && totalCount > 0) known = totalCount;
          else if (Number.isFinite(knownTotal) && knownTotal > 0) known = knownTotal;
          const cap = Number.isFinite(cumulativeCap) && cumulativeCap > 0 ? cumulativeCap : null;
          const isExhaustedNow = !!finalBatch || !!exhausted;
          // Single-line fallback when total isn't known yet.
          if (!known) {
            return tr('panel.discovering', lang).replace('{n}', venues.length);
          }
          const line1 = tr('panel.line1', lang).replace('{known}', known);
          // Build line 2 per state.
          // v0.61.338 — Michelin paginates SERVER-side: the TMA only ever
          // holds one 12-venue batch, so the client `page` is always 1 and
          // the "Showing first/range N" sub-line would be a static,
          // misleading "Showing first 12" even on the server's 2nd/3rd
          // batch. The top "📚 N more to explore … Tap 🔍 for the next batch
          // of 12" hint is the real pager, so for Michelin we suppress this
          // sub-line entirely (the hint replaces it). `totalCount` is passed
          // ONLY on Michelin responses (App.jsx michelinSummary.total), so
          // gating on it can't affect ordinary client-paginated searches.
          const isMichelin = Number.isFinite(totalCount) && totalCount > 0;
          let line2;
          if (isMichelin) {
            line2 = '';
          } else if (cap && known >= cap && isExhaustedNow) {
            line2 = tr('panel.line2.limit', lang);
          } else if (venues.length <= PAGE_SIZE && known === venues.length) {
            line2 = tr('panel.line2.all', lang);
          } else if (visibleStart === 1 && visibleEnd <= PAGE_SIZE) {
            // First batch / first page — "Showing first N".
            line2 = tr('panel.line2.first', lang).replace('{first}', visibleEnd);
          } else {
            line2 = tr('panel.line2.range', lang)
              .replace('{start}', visibleStart)
              .replace('{end}', visibleEnd);
          }
          return (
            <>
              <div>{line1}</div>
              {line2 && <div className="text-tg-hint font-normal">{line2}</div>}
              {comboLine && (
                <div className="text-[10px] text-tg-hint italic font-normal leading-tight mt-0.5">
                  · {comboLine}
                </div>
              )}
            </>
          );
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
      {michelinHint && (
        <div className="text-[11px] text-tg-hint italic px-1 pb-1.5 leading-snug">
          {michelinHint}
        </div>
      )}
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
        /* v0.61.409 — operator: "kill the bottom spinning hourglass". The
           single loading indicator is now the SPINNING hourglass WITHIN the
           "Please wait… loading random eateries" overlay message (App.jsx
           z-50). This results-panel branch renders nothing while loading —
           the overlay already covers the body. */
        null
      ) : bootMismatchHalt && !venues?.length ? (
        /* v0.61.409 — boot load was suppressed because the saved location
           differs from where the device is (operator: don't auto-load on a
           mismatch). Don't show the "No results / change criteria" copy — the
           user never searched. Tell them to tap 🔍. Amber (no red/green-only). */
        <div className="rounded-2xl border border-amber-500/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
          {lang === 'fr'
            ? 'Votre lieu enregistré diffère de votre position actuelle. Touchez 🔍 Rechercher pour chercher ici.'
            : 'Your saved area differs from where you are now. Tap 🔍 Search to look here.'}
        </div>
      ) : !venues?.length ? (
        specialModeBlocked ? (
          /* v0.61.397 — durian / fruits / durian-pastry blocked outside the
             SE-Asian durian belt (SG/MY/ID/TH/PH/BN/VN). The empty list is
             intentional, so show WHY ("only available in …") rather than the
             generic "change your criteria" copy — there's nothing to adjust.
             Amber border + icon + text (no red/green-only signalling). */
          <div className="rounded-2xl border border-amber-500/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
            {tr(`special.${specialModeBlocked.mode}.blocked`, lang)}
          </div>
        ) : (
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
        )
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
          {(() => {
            // v0.62.6 — Michelin city-grouped display (display layer only).
            // When the visible batch carries awardCity (Michelin, multi-city
            // countries), render city sections: set-city cards first with NO
            // row (Case A), every other city group preceded by a tappable
            // "{count} Michelin picks in {city}" row — count is the number of
            // visible cards in THIS batch for that city (never a ratio or a
            // country total). Curated order is preserved inside each group;
            // pagination is untouched (grouping runs on the visible page
            // slice only). Tapping the city name pans/fits the map via
            // onCityJump — no reload, no new search, no setLocation change.
            const hasAwardCities = cardsToShow.some((v) => v && typeof v.awardCity === 'string' && v.awardCity);
            if (hasAwardCities) {
              const grouped = groupByAwardCity(cardsToShow, michelinCity);
              return grouped.groups.map((g) => (
                <React.Fragment key={'cityGrp:' + (g.city || '_none')}>
                  {groupNeedsJumpRow(g, grouped.caseA) && (
                    <div className="px-2 pt-2 pb-1 text-[12px] font-medium text-tg-text leading-snug border-t border-tg-hint/20">
                      {tn('michelin.cityJump.before', lang, { count: g.venues.length })}
                      <span
                        role="button"
                        className="text-blue-500 italic underline cursor-pointer"
                        onClick={() => { if (onCityJump) onCityJump(g); }}
                      >{g.city}</span>
                    </div>
                  )}
                  {g.venues.map((v, i) => (
                    <ResultCard key={v.placeId || `${g.city || ''}-${i}`} venue={v} focused={v.placeId === focusedPlaceId} onTap={onCardTap} copyContext={copyState} specialMode={specialMode} />
                  ))}
                </React.Fragment>
              ));
            }
            return cardsToShow.map((v, i) => {
              // v0.62.x — unified-newness band separation. The server (New pill)
              // sorts strict-band (opened ≤3 mo) ahead of fill-band (3–6 mo) and
              // stamps each venue's recencyBand. Render a divider before the
              // first fill-band card so the two groups read as separate
              // "concentric" recency rings. Off the New pill no venue carries a
              // band → no divider, list renders exactly as before. (Mutually
              // exclusive with the Michelin awardCity branch above — the
              // Michelin handler never stamps recencyBand and the cuisine
              // search never stamps awardCity.)
              const showFillDivider = v.recencyBand === 'fill'
                && (i === 0 || cardsToShow[i - 1]?.recencyBand !== 'fill');
              return (
                <React.Fragment key={v.placeId || i}>
                  {showFillDivider && (
                    <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-tg-hint leading-snug border-t border-tg-hint/20">
                      {lang === 'fr' ? 'Ouvert il y a 3 à 6 mois' : 'Opened 3–6 months ago'}
                    </div>
                  )}
                  <ResultCard venue={v} focused={v.placeId === focusedPlaceId} onTap={onCardTap} copyContext={copyState} specialMode={specialMode} />
                </React.Fragment>
              );
            });
          })()}
          {/* v0.61.403 — subtle "more coming" cue while the first batch streams
              in one card at a time (parity with gia-web v0.1.151). */}
          {streamingMore && (
            <div className="px-2 py-1 text-center text-[11px] leading-snug text-tg-hint animate-pulse">
              {lang === 'fr' ? 'chargement…' : 'loading more…'}
            </div>
          )}
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
