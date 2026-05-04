import React, { useState, useRef } from 'react';
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

export default function FlipPanel({
  venues, loading, focusedPlaceId, onCardTap,
  onNLSubmit, onNLReplace, lastPrompt, flipped, setFlipped, warmStartSeed,
  copyState
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copying, setCopying] = useState(false);
  const textRef = useRef(null);

  async function submit() {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onNLSubmit?.(t);
      setText('');
      setFlipped(false);
    } finally { setSubmitting(false); }
  }

  // v0.57.32: POST to /api/cuisine/copy-all — server authenticates
  // via initData and sends the Maps URL into the user's chat. Fixes
  // v0.57.31's tg.sendData approach, which was silently dropped
  // because the cuisine TMA is launched from an inline-keyboard
  // button (sendData only works for keyboard-button / menu-button
  // TMAs).
  // v0.57.33: don't close the TMA after sending — Human Lead wants
  // to stay in the picker to refine. Show a one-line confirmation
  // tick on the button instead.
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
      // Auto-clear the tick after 3 s so the button returns to its
      // normal state for a re-copy.
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('[Copy-All] failed:', err.message);
      const w = tg();
      if (w && typeof w.showAlert === 'function') {
        w.showAlert("Couldn't send to chat — try again.");
      }
    } finally {
      setCopying(false);
    }
  }

  // v0.58.10: copy a re-runnable /cuisine command (cuisines + filters
  // + price + location anchor + radius + region) into the user's chat.
  // Recipient pastes it into any @soleat_bot chat to relaunch this
  // exact search.
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
        radius: copyState.radius,
        region: copyState.region || 'SG',
        location: copyState.location || null
      });
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 3000);
    } catch (err) {
      console.warn('[Copy-Syntax] failed:', err.message);
      const w = tg();
      if (w && typeof w.showAlert === 'function') {
        w.showAlert("Couldn't send the command — pick a cuisine or filter first.");
      }
    } finally {
      setCopyingCmd(false);
    }
  }
  const canCopyCmd = !!(copyState && (
    (copyState.cuisines || []).length ||
    (copyState.filters && Object.values(copyState.filters).some((v) => v === true)) ||
    (copyState.filters?.prices || []).length ||
    copyState.location
  ));

  return (
    <div className="relative" style={{ perspective: 1000 }}>
      <div className="relative transition-transform duration-300"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        {/* FRONT — Results */}
        <div className="rounded-lg border border-tg-border bg-tg-bg p-2" style={{ backfaceVisibility: 'hidden' }}>
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
              <button type="button" onClick={() => setFlipped(true)}
                className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-card whitespace-nowrap">✨ Ask Gia</button>
            </div>
          </div>
          {lastPrompt && (
            <div className="text-[11px] text-tg-hint px-1 pb-1.5">
              From: <span className="italic">"{lastPrompt}"</span>{' '}
              <button onClick={() => setFlipped(true)} className="underline ml-1">Edit</button>
              {onNLReplace && (
                <>
                  {' · '}
                  <button onClick={onNLReplace} className="underline">Replace instead</button>
                </>
              )}
            </div>
          )}
          {warmStartSeed && SEED_LABEL[warmStartSeed] && !lastPrompt && (
            <div className="text-[11px] text-tg-hint px-1 pb-1.5">
              {SEED_LABEL[warmStartSeed]} · <span className="italic">tap 🔍 Search to refine</span>
            </div>
          )}
          {loading ? (
            <div className="text-xs text-tg-hint px-2 py-4">Loading…</div>
          ) : !venues?.length ? (
            <div className="text-xs text-tg-hint px-2 py-4">No matches yet — pick a cuisine or tap ✨ Ask Gia.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {venues.map((v, i) => (
                <ResultCard key={v.placeId || i} venue={v} focused={v.placeId === focusedPlaceId} onTap={onCardTap} />
              ))}
            </div>
          )}
        </div>
        {/* BACK — Tell Gia */}
        <div className="absolute inset-0 rounded-lg border border-tg-border bg-tg-bg p-2"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="flex items-center justify-between px-1 pb-1.5">
            <div className="text-xs font-semibold">Tell Gia</div>
            <button type="button" onClick={() => setFlipped(false)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-card">↩ Results</button>
          </div>
          <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)}
            placeholder='"halal ramen, ≤$$, walking distance"' rows={4} disabled={submitting}
            className="w-full text-sm rounded border border-tg-border bg-tg-card text-tg-text p-2 resize-none" />
          <div className="flex justify-end mt-1.5">
            <button type="button" onClick={submit} disabled={!text.trim() || submitting}
              className="text-xs px-3 py-1 rounded-full bg-tg-accent text-tg-accent-text disabled:opacity-40">
              {submitting ? 'Asking…' : 'Ask Gia ✨'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
