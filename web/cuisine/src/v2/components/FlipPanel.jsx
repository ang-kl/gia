import React, { useState, useRef } from 'react';
import ResultCard from './ResultCard.jsx';

export default function FlipPanel({
  venues, loading, focusedPlaceId, onCardTap,
  onNLSubmit, lastPrompt, flipped, setFlipped
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  return (
    <div className="relative" style={{ perspective: 1000 }}>
      <div className="relative transition-transform duration-300"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        {/* FRONT — Results */}
        <div className="rounded-lg border border-tg-border bg-tg-bg p-2" style={{ backfaceVisibility: 'hidden' }}>
          <div className="flex items-center justify-between px-1 pb-1.5">
            <div className="text-xs font-semibold">Results {venues ? `(${venues.length})` : ''}</div>
            <button type="button" onClick={() => setFlipped(true)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-card">✨ Ask Gia</button>
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
