import React, { useState } from 'react';

// v0.62.219 — operator ("make it professional", AskUserQuestion: "Vertical list
// (logo room)"): the hub's three key TMAs render as a VERTICAL LIST of full-width
// rows — icon/logo on the left in a fixed box, label beside it, a › chevron on the
// right. This gives the wide Train logo (a landscape PNG) room to render legibly
// instead of being squeezed into a tiny square icon slot, and reads as a premium
// app launcher.
//
// v0.60.62 — optional `iconImage` prop renders a PNG instead of the emoji; on <img>
// error we fall back to the emoji `icon` so the hub still renders during the gap
// between code-merge and asset upload.
//
// v0.61.123 — optional `disabled` + `disabledTooltip`: App.jsx flips SG-only tiles
// (Train, Hawker) to disabled when a Malaysia anchor is set. Visual: opacity 0.4,
// cursor not-allowed; tap surfaces the tooltip via Telegram's showAlert instead of
// running onClick.
export default function Tile({ icon, iconImage, label, subtitle = '', onClick, disabled = false, disabledTooltip = '' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = iconImage && !imgFailed;
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      if (disabledTooltip) {
        try {
          const w = (typeof window !== 'undefined') ? window.Telegram?.WebApp : null;
          if (w && typeof w.showAlert === 'function') w.showAlert(disabledTooltip);
          else if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(disabledTooltip);
        } catch { /* best-effort */ }
      }
      return;
    }
    onClick?.(e);
  };
  return (
    <button
      onClick={handleClick}
      style={disabled ? { cursor: 'not-allowed', opacity: 0.4 } : {}}
      aria-disabled={disabled || undefined}
      title={disabled ? disabledTooltip : undefined}
      /* Full-width row; .skeuo-pill gives the raised frosted look + press-in on tap.
         py-3 + the 36 px icon box → ~60 px tall, a comfortable ≥44 px touch target. */
      className={`w-full flex items-center gap-3 rounded-xl border border-tg-border/70 px-3 py-3 text-left text-tg-text${
        disabled ? '' : ' skeuo-pill'
      }`}
    >
      {/* Fixed icon/logo box so every label starts at the same x. The landscape
          Train logo fills the box width (object-contain, height-capped); square
          emoji/illustration icons centre within it. */}
      <span className="flex items-center justify-center shrink-0 w-16 h-9">
        {showImage
          ? (
            <img
              src={iconImage}
              alt=""
              className="max-h-9 max-w-full object-contain"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          )
          : <span className="text-2xl leading-none">{icon}</span>}
      </span>
      {/* v0.62.226 — title + subtitle stack; subtitle says what you can search. */}
      <span className="flex-1 min-w-0 flex flex-col leading-tight">
        <span className="text-[15px] font-semibold">{label}</span>
        {subtitle && <span className="text-[11px] text-tg-text/60 leading-snug mt-0.5">{subtitle}</span>}
      </span>
      <span aria-hidden className="shrink-0 self-center text-tg-hint text-xl leading-none">›</span>
    </button>
  );
}
