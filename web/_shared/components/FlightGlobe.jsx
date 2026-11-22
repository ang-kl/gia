// v0.62.989 — spec 2026-11-12-fr24-city-airports-all-maps-user-caps (I7). A re-export of the Train app's flight globe card, loaded lazily by the Cuisine and Hawker maps.
//
// As in Fr24Board.jsx beside this file: the classes the globe uses, listed for the Cuisine and Hawker Tailwind builds,
// which scan web/_shared and not web/transport. fr24-all-maps.test.js fails if the globe gains one this list lacks.
// tw: absolute border border-amber-300 fixed flex flex-col font-semibold inset-0 items-center justify-between
// tw: justify-center max-w-[560px] max-w-[min(92vw,72vh,560px)] mb-2 ml-1 mt-2 overflow-hidden p-3 pb-1 pt-1 px-1
// tw: px-2 py-1 right-2 rounded rounded-xl shadow-lg text-[10px] text-[11px] text-[9px] text-sm truncate w-full z-20
// tw: z-50
export { default } from '../../transport/src/components/FlightGlobe.jsx';
