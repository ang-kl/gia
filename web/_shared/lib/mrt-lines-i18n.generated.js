// web/_shared/lib/mrt-lines-i18n.generated.js — v0.62.828
//
//   source      Government Terms Translated (translatedterms.gov.sg), category MRT/LRT Station
//   fetched     2026-08-30, 195 of 195 rows in that category
//   regenerate  node scripts/fetch-mrt-line-names.mjs
//
// TWO OF TWELVE, AND THE NUMBER IS THE POINT. The register is the only free, official,
// unauthenticated source for Singapore's rail names — it is what made the station table
// possible without a paid translator. For LINE names it carries exactly two: East-West and
// North-South. The other ten (NEL, CCL, DTL, TEL, BPL, SLRT, PLRT, JRL, CRL, CGL) are simply
// absent, and they are listed by code in __tests__/mrt-lines-i18n.test.js so that filling
// one SHRINKS a pinned list rather than passing silently. Nothing here is translated by us.
//
// THE SOURCE FILES BOTH ROWS UNDER "MRT/LRT Station", WHICH THEY ARE NOT, AND MISLABELS ONE.
// The second row's English reads "North-South Line (EWL)" — the name is right, the
// parenthetical code is not; NSL is the North-South Line and EWL is the East-West. So the
// join is made on the NAME with the parenthetical stripped, never on the code inside it.
// The stored English is left exactly as the register writes it, mislabel included: a
// corrected copy of an official register stops being a copy of it. Same ruling as the
// station table, which keeps the same two rows' oddities rather than tidying them.
//
// REACH, MEASURED RATHER THAN ASSUMED. The register speaks zh / ms / ta. The apps offer
// en, fr, de, ru, id, zh, ja, es — so `ta` reaches no reader at all (the carried Tamil gap),
// and `ms` reaches Indonesian readers only through the LANG_COLUMN mapping the station
// table already established. Two lines × two reachable locales is the honest size of this.

export const SG_LINE_NAMES_I18N = [
  { code: 'EWL', src: "East-West Line (EWL)", n: "East-West Line", zh: "东西线", ms: "Laluan Timur-Barat", ta: "கிழக்கு-மேற்கு ரயில் பாதை" },
  { code: 'NSL', src: "North-South Line (EWL)", n: "North-South Line", zh: "南北线", ms: "Laluan Utara-Selatan", ta: "வடக்கு-தெற்கு ரயில் பாதை" },
];

export const SG_LINE_NAMES_BY_CODE = new Map(SG_LINE_NAMES_I18N.map((r) => [r.code, r]));

// `id` reads the `ms` column — the same mapping mrt-stations-i18n.generated.js makes, and
// for the same reason: the register publishes Malay, and Bahasa Indonesia is the closest
// locale the apps offer. Kept identical so the two tables cannot drift apart in behaviour.
const LANG_COLUMN = { id: 'ms' };

/** Official line name in `lang`, or the English `fallback` when the register lacks it. */
export function lineName(code, fallback, lang) {
  if (lang === 'en') return fallback;
  const row = SG_LINE_NAMES_BY_CODE.get(code);
  const v = row && row[LANG_COLUMN[lang] || lang];
  return (typeof v === 'string' && v.trim()) ? v : fallback;
}
