import React, { useState, useRef } from 'react';
import ResultCard from './ResultCard.jsx';
import { tg } from '../../api/tg.js';
import { copyAllToChat as copyAllApi } from '../lib/api.js';

export default function FlipPanel({
  venues, loading, focusedPlaceId, onCardTap,
  onNLSubmit, lastPrompt, flipped, setFlipped
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
  async function handleCopyAll() {
    if (!venues?.length || copying) return;
    setCopying(true);
    try {
      const slim = venues.slice(0, 10).map((v) => ({
        name: v.name || '',
        placeId: v.placeId || '',
        lat: v.lat,
        lng: v.lng
      }));
      await copyAllApi(slim);
      const w = tg();
      if (w && typeof w.close === 'function') w.close();
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
                  {copying ? '📋 Sending…' : '📋 Copy all to chat'}
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
