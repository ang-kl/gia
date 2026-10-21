import React, { useState } from 'react';

// Live preview of the prompt the bot will send to Gemini, derived from
// current TMA state. Mirrors the server-side buildPrompt in
// cuisine-search.js as closely as possible (kept intentionally simple
// so a UI change here is a one-liner).
export function buildClientPreviewPrompt(state) {
  const cuisines = [...state.cuisines];
  if (state.otherCuisine?.trim()) cuisines.push(...state.otherCuisine.split(',').map((s) => s.trim()).filter(Boolean));
  const cuisineLine = cuisines.length
    ? `Cuisines requested (any of these): ${cuisines.join(', ')}.`
    : 'Any cuisine appropriate to the period.';
  const radiusLine = `Within ${state.radius} m of the user (transport mode: ${state.mode}).`;
  const recencyLine = state.recencyDays
    ? `Bias toward venues opened or refreshed in the last ${state.recencyDays} day(s).`
    : '';
  const queueLine = `Queue tolerance: ≤ ${state.queueMaxMin} min wait. Estimate queue minutes for each pick.`;
  const presetLine = state.preset ? `Preset combo: ${state.preset}.` : '';

  return [
    `You are Gia, a Singapore food concierge. Suggest "Sanctuary" venues for a solo diner.`,
    `Period: ${state.when === 'now' ? 'now (auto-detected meal period)' : `at ${state.when}`}.`,
    cuisineLine,
    radiusLine,
    recencyLine,
    queueLine,
    presetLine,
    '',
    `Return EXACTLY 15 venues as JSON array. Each item: {name, area, vibe, signature_dish, queue_min_estimate, booking_required}.`
  ].filter(Boolean).join('\n');
}

export default function PromptPreview({ state }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-tg-border rounded-md bg-tg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-2.5 py-1.5 text-[11px]"
      >
        <span className="text-tg-hint">Live prompt preview</span>
        <span className="text-tg-hint">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <pre className="text-[10px] leading-snug whitespace-pre-wrap px-2.5 pb-2 text-tg-hint">
{buildClientPreviewPrompt(state)}
        </pre>
      )}
    </div>
  );
}
