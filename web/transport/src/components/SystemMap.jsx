import React, { useEffect, useRef } from 'react';

// Loads the static SVG schematic from /app/transport/mrt-system-map.svg
// (served by the backend), then mutates the DOM to mute non-affected
// lines and flash the focused line. Mirrors Hitachi's network-map panel
// where the affected loop is drawn coloured + the rest is greyed out.
export default function SystemMap({ focusedCode, affectedCodes = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch('mrt-system-map.svg', { cache: 'force-cache' })
      .then((r) => r.text())
      .then((svgText) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svgText;
        applyHighlight(ref.current, focusedCode, affectedCodes);
      })
      .catch((err) => {
        console.warn('[Transport-TMA] SVG fetch failed', err);
        if (ref.current) ref.current.innerHTML = '<div class="text-xs text-tg-hint p-4">Map unavailable</div>';
      });
    return () => { cancelled = true; };
  // First mount only; updates handled in the next effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ref.current) applyHighlight(ref.current, focusedCode, affectedCodes);
  }, [focusedCode, affectedCodes]);

  return (
    <div
      ref={ref}
      className="w-full bg-tg-card rounded-lg border border-tg-border overflow-hidden"
      style={{ minHeight: 280 }}
    />
  );
}

function applyHighlight(container, focusedCode, affectedCodes) {
  const svg = container.querySelector('svg');
  if (!svg) return;
  const lines = svg.querySelectorAll('[id^="line-"]');
  const affected = new Set(affectedCodes || []);
  for (const el of lines) {
    const code = el.id.slice('line-'.length);
    el.classList.remove('line-flash', 'line-muted');
    if (focusedCode && code !== focusedCode && !affected.has(code)) {
      el.classList.add('line-muted');
    }
    if (code === focusedCode) {
      el.classList.add('line-flash');
    }
  }
}
