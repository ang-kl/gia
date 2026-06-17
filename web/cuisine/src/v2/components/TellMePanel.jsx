import React, { useState } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.59.0: standalone "Tell me" panel — replaces the v0.57.30 FlipPanel
// back-face textarea + flip animation. Always visible below the map
// so the user can type a natural-language query without first flipping
// a card. Internally still calls handleNLSubmit (route /api/cuisine/
// nl-query) — server-side guardrails from v0.58.19 (verifyInitData,
// 60/hr rate limit, 120 km anchor cap) are unchanged.
//
// v0.60.126: controlled input — the parent owns the text (`value` /
// `onChange`) so the Search-criteria 🔍 search can pick it up as a
// `freeText` qualifier instead of silently dropping it. Also: Enter no
// longer fires a search — only the → button here or the 🔍 Search
// buttons / FAB do (operator 2026-05-11).
export default function TellMePanel({ value = '', onChange, onSubmit, onReplace, lastPrompt, loading }) {
  const [lang] = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const text = typeof value === 'string' ? value : '';

  async function submit() {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.(t);
      onChange?.('');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="flex flex-col gap-1 px-0.5">
      {/* v0.62.147 — operator: the "Last asked …" remark sits ABOVE the free-text
          field, not below it.
          v0.62.167 — operator: the last-searched text ITSELF is now the link that
          replaces the search (tap "satay" to replace). The separate "Replace
          instead of merge" link is removed. */}
      {lastPrompt && !submitting && (
        <div className="text-[11px] text-tg-hint px-1.5 italic">
          {lang === 'fr' ? 'Dernière demande' : 'Last asked'}:{' '}
          {onReplace ? (
            <button
              onClick={onReplace}
              className="not-italic underline text-tg-link active:scale-95"
              aria-label={lang === 'fr' ? `Remplacer la recherche par « ${lastPrompt} »` : `Replace the search with "${lastPrompt}"`}
              title={lang === 'fr' ? 'Remplacer au lieu de fusionner' : 'Replace instead of merge'}
            >"{lastPrompt}"</button>
          ) : (
            <span>"{lastPrompt}"</span>
          )}
        </div>
      )}
      {/* v0.60.207 — operator: in Telegram dark mode the default
          `tg-border` (≈#2a2a2e) is near-invisible against `tg-card`
          (≈#1c1c1f), so the free-text box had no perceptible edge.
          Switched to a `tg-hint`-based border at 60% opacity — a
          medium-contrast colour the Telegram theme adapts for both
          light and dark — and bumped to a 2px width so the input
          reads as a distinct, tappable field. */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border-2 border-tg-hint/60 bg-tg-card">
        <span aria-hidden className="text-tg-hint flex-shrink-0">💬</span>
        <input
          type="text"
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={submitting || loading}
          placeholder={tr('tellme.placeholder', lang)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-hint min-w-0"
          aria-label={tr('tellme.aria', lang)}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || submitting || loading}
          aria-label={tr('tellme.submit', lang)}
          // v0.59.21: pulse + ring when the input has text (and we're
          // not loading/submitting) so the user notices the submit
          // arrow is the next-step CTA. Per Human Lead 2026-05-07.
          className={`text-xs px-2.5 py-1 rounded-full bg-tg-accent text-tg-accent-text disabled:opacity-40 flex-shrink-0 transition-all ${
            text.trim() && !submitting && !loading
              ? 'animate-pulse ring-2 ring-offset-1 ring-tg-accent'
              : ''
          }`}
        >{submitting ? '…' : '→'}</button>
      </div>
    </div>
  );
}
