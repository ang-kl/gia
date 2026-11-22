// v0.62.989 — spec 2026-11-12-fr24-city-airports-all-maps-user-caps (I7). A re-export of the Train app's flight board, for the Cuisine and Hawker maps.
//
// The Cuisine and Hawker Tailwind builds scan web/_shared, not web/transport, so the classes the board uses are listed
// here for them to find (Tailwind reads class names anywhere in a scanned file, comments included). Measured before
// this list existed: 21 of them were missing from the Cuisine CSS and 32 from the Hawker CSS. fr24-all-maps.test.js
// fails if the board gains a class this list lacks.
// tw: absolute bg-amber-400 bg-amber-400/15 bg-amber-400/20 block border border-amber-400 border-b border-tg-border
// tw: border-tg-border/60 flex flex-1 flex-wrap font-bold font-mono font-semibold gap-1 gap-1.5 gap-2 grid
// tw: grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] h-6 items-baseline items-center justify-between leading-none
// tw: liquid-glass max-h-[40vh] max-w-md min-w-0 mr-0.5 mt-0.5 mt-1 mt-1.5 mx-auto overflow-x-auto overflow-y-auto
// tw: pb-1.5 pointer-events-auto pr-7 px-2 px-2.5 px-3 py-0.5 py-1 py-1.5 py-2 py-3 relative right-1.5 ring-2
// tw: ring-amber-400 rounded-2xl rounded-full rounded-lg rounded-xl shadow-xl shrink-0 snap-mandatory snap-start
// tw: snap-x text-[10px] text-[11px] text-[12px] text-[13px] text-[14px] text-[15px] text-[9px] text-amber-600
// tw: text-amber-700 text-gray-900 text-left text-right text-tg-hint text-tg-link text-tg-text top-1.5 truncate
// tw: underline w-6 w-[10.5rem] w-full
export { default } from '../../transport/src/components/Fr24Board.jsx';
