import React, { useState } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.59.0: standalone "Tell me" panel — replaces the v0.57.30 FlipPanel
// back-face textarea + flip animation. Always visible below the map
// so the user can type a natural-language query without first flipping
// a card. Internally still calls handleNLSubmit (route /api/cuisine/
// nl-query) — server-side guardrails from v0.58.19 (verifyInitData,
// 60/hr rate limit, 120 km anchor cap) are unchanged.
export default function TellMePanel({ onSubmit, onReplace, lastPrompt, loading }) {
  const [lang] = useLocale();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.(t);
      setText('');
    } finally { setSubmitting(false); }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex flex-col gap-1 px-0.5">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-tg-border bg-tg-card">
        <span aria-hidden className="text-tg-hint flex-shrink-0">💬</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
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
          className="text-xs px-2.5 py-1 rounded-full bg-tg-accent text-tg-accent-text disabled:opacity-40 flex-shrink-0"
        >{submitting ? '…' : '→'}</button>
      </div>
      {lastPrompt && !submitting && (
        <div className="text-[11px] text-tg-hint px-1.5 italic">
          {lang === 'fr' ? 'Dernière demande' : 'Last asked'}: "{lastPrompt}"
          {onReplace && (
            <>
              {' · '}
              <button onClick={onReplace} className="underline not-italic">{lang === 'fr' ? 'Remplacer au lieu de fusionner' : 'Replace instead of merge'}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
