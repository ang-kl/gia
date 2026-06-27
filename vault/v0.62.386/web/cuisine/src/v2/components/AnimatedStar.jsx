// web/cuisine/src/v2/components/AnimatedStar.jsx — v0.62.82
//
// Operator: on the "Rating reset to Good+ ≥ 3.7⭐" wait card, the trailing star
// should blink — cycling ✨ → 🌟 → ⭐ → 💫 — as a twinkle. The glyph is stripped from
// the i18n title and rendered here so only the star animates.

import React, { useState, useEffect } from 'react';

const STARS = ['✨', '🌟', '⭐', '💫'];

export default function AnimatedStar({ intervalMs = 420 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % STARS.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return <span aria-hidden className="inline-block">{STARS[i]}</span>;
}
