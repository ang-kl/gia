// tg-colors.js — v0.62.648
//
// The Telegram theme palette, shared by every TMA's tailwind.config.js.
//
// WHY THIS FILE EXISTS
// --------------------
// Each app used to inline the palette as plain strings:
//
//     'tg-hint': 'var(--tg-hint, #98989f)'
//
// Tailwind can emit `.text-tg-hint` from that, but it CANNOT emit an opacity
// variant — a raw `var()` string has nowhere to put the alpha, so Tailwind
// silently drops the utility. Not a warning, not a fallback: the class simply
// never appears in the stylesheet, and the element renders with NO colour.
//
// That was shipping across all five apps. Every `bg-tg-bg/80` glass bar was in
// fact fully transparent, every `border-tg-accent/50` pill had no border, and
// the bottom sheet's `bg-tg-hint/70` drag handle was an invisible 48x6 box —
// which is why "I still didn't see the drawer handle" survived the v0.62.620
// pass that tried to fix it by making the bar *bigger*. The bar was never the
// problem; the class was being thrown away.
//
// A function-valued colour gives Tailwind the hook it needs: `opacityValue` is
// undefined for the bare utility and the numeric alpha for `/NN`. `color-mix`
// carries the alpha because the underlying value is a CSS variable that this
// file cannot see. It is already a hard dependency of these apps — styles.css
// defines --tg-hint itself with color-mix — so this adds no new baseline
// (Safari/iOS 16.2+, Chrome 111+).

// v0.62.649 — REGRESSION FIX. The v0.62.648 version of this function assumed
// `opacityValue` was either absent or a number. It is neither for the BARE
// utility: Tailwind calls the colour function with the literal string
// `'var(--tw-bg-opacity)'` so that `bg-opacity-*` can still work. `Number()` on
// that is NaN, which produced
//
//     .bg-tg-card{background-color:color-mix(in srgb,var(--tg-card) NaN%,transparent)}
//
// — invalid CSS, so the declaration was DROPPED. Net effect: v0.62.648 fixed
// every `/NN` utility and broke every BARE one, which is far worse. Cards lost
// their fill, borders fell back to currentColor, text lost its colour.
//
// Any non-finite opacity therefore falls back to the plain var(): that is the
// correct rendering, because Tailwind sets --tw-bg-opacity to 1 for the bare
// utility anyway.
/** @param {string} varName @param {string} fallback */
function themeColor(varName, fallback) {
  const base = `var(${varName}, ${fallback})`;
  return ({ opacityValue } = {}) => {
    if (opacityValue === undefined || opacityValue === null || opacityValue === '') return base;
    const alpha = Number(opacityValue);
    if (!Number.isFinite(alpha)) return base;   // 'var(--tw-bg-opacity)' → no numeric alpha
    return `color-mix(in srgb, ${base} ${alpha * 100}%, transparent)`;
  };
}

export const tgColors = {
  'tg-bg': themeColor('--tg-bg', '#0e0e10'),
  'tg-text': themeColor('--tg-text', '#f5f5f7'),
  'tg-hint': themeColor('--tg-hint', '#98989f'),
  'tg-accent': themeColor('--tg-accent', '#2bc26a'),
  'tg-accent-text': themeColor('--tg-accent-text', '#fff'),
  'tg-card': themeColor('--tg-card', '#1c1c1f'),
  'tg-border': themeColor('--tg-border', '#2a2a2e')
};

export { themeColor };
export default tgColors;
