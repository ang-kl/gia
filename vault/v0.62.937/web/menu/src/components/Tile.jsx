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
// v0.62.243 — optional `imgClass` overrides the icon-image sizing for a single
// tile (operator: the Hawker glyph reads small in the shared 36 px box — scale
// it up without changing the row height, so the tiles stay aligned).
export default function Tile({ icon, iconImage, label, subtitle = '', onClick, disabled = false, disabledTooltip = '', imgClass = 'max-h-12 max-w-full object-contain', boxClass = 'w-16 h-16' }) {
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
          food illustrations centre within it.
          v0.62.252 — operator (IMG_1086): the square food icons read much smaller
          than the landscape Train logo. Grew the box to w-16 h-12 (64×48) so the
          square food fills ~48×48 and the landscape Train ~64×40 — similar visual
          area, so all three tiles carry a consistent icon size.
          v0.62.263 — operator (IMG_2552): the Cuisine + Hawker line-art drawings
          were still too small to read. Box grown to h-14 (56) so the square food
          icons (iconImgClass max-h-14) fill ~56×56; Train stays width-bound at 64. */}
      <span className={`flex items-center justify-center shrink-0 ${boxClass}`}>
        {showImage
          ? (
            <img
              src={iconImage}
              alt=""
              className={imgClass}
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
