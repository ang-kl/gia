import React, { useState } from 'react';
import ResultCard from './ResultCard.jsx';
import { tg } from '../../api/tg.js';
import { copyAllToChat as copyAllApi, copyCommandToChat } from '../lib/api.js';

// v0.58.4: human-readable label for each warm-start seed id. Surfaces
// as a muted caption above the result list so users know the initial
// 5 venues come from a curated rotation, not from their (currently
// empty) selection.
const SEED_LABEL = {
  'open-now-cheap':      '✨ Open now & cheap eats',
  'newly-opened-halal':  '✨ Newly opened · halal',
  'highly-rated-nearby': '✨ Highly rated nearby',
  'open-now-popular':    '✨ Popular & open now',
  'newly-opened-radius': '✨ Newly opened in your radius'
};

// v0.59.0: ResultPanel replaces FlipPanel. The flip-card animation +
// "Ask Gia" back-face are retired now that TellMePanel lives separately
// as an always-visible input below the map. Result panel = front-face
// only, with the existing Copy-all + Copy-syntax buttons preserved.
export default function ResultPanel({
  venues, loading, focusedPlaceId, onCardTap, warmStartSeed, copyState
}) {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyAll() {
    if (!venues?.length || copying) return;
    setCopying(true);
    setCopied(false);
    try {
      const slim = venues.slice(0, 12).map((v) => ({
        name: v.name || '',
        placeId: v.placeId || '',
        lat: v.lat,
        lng: v.lng
      }));
      await copyAllApi(slim);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('[Copy-All] failed:', err.message);
      const w = tg();
      if (w && typeof w.showAlert === 'function') {
        w.showAlert("Couldn't send to chat — try again.");
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
        location: copyState.location || null
      });
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 3000);
    } catch (err) {
      console.warn('[Copy-Syntax] failed:', err.message);
      const w = tg();
      if (w && typeof w.showAlert === 'function') {
        // v0.58.41: server now accepts bare /cuisine; this branch only
        // fires on an actual network/auth error.
        w.showAlert("Couldn't send the command. Try again in a moment.");
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
        <div className="text-xs font-semibold flex-shrink-0">Results {venues ? `(${venues.length})` : ''}</div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {venues?.length > 0 && (
            <button type="button" onClick={handleCopyAll} disabled={copying}
              className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-card whitespace-nowrap disabled:opacity-50">
              {copying ? '📋 Sending…' : copied ? '✓ Sent' : '📋 Copy all to chat'}
            </button>
          )}
          {canCopyCmd && (
            <button type="button" onClick={handleCopyCommand} disabled={copyingCmd}
              className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-card whitespace-nowrap disabled:opacity-50">
              {copyingCmd ? '🔗 Sending…' : copiedCmd ? '✓ Sent' : '🔗 Copy syntax'}
            </button>
          )}
        </div>
      </div>
      {warmStartSeed && SEED_LABEL[warmStartSeed] && (
        <div className="text-[11px] text-tg-hint px-1 pb-1.5">
          {SEED_LABEL[warmStartSeed]} · <span className="italic">tap 🔍 Search to refine</span>
        </div>
      )}
      {loading ? (
        <div className="text-xs text-tg-hint px-2 py-4">Loading…</div>
      ) : !venues?.length ? (
        <div className="text-xs text-tg-hint px-2 py-4">No matches yet — pick a cuisine or use 💬 Tell me above.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {venues.map((v, i) => (
            <ResultCard key={v.placeId || i} venue={v} focused={v.placeId === focusedPlaceId} onTap={onCardTap} />
          ))}
        </div>
      )}
    </div>
  );
}
