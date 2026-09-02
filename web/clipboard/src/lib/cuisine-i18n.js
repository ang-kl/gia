// Moved to web/_shared/lib/cuisine-i18n.js at v0.62.896.
//
// This file used to carry its OWN copy of the 69-row NAMES table, at fr/zh/ja/es only
// and with no VENUE_TYPES table — so a Russian, German, Indonesian or Korean reader saw
// English chips here while the same chips in the Cuisine app read their own script.
// The 69 rows were byte-identical to the Cuisine copy on the four locales both carried,
// so re-exporting the shared table is a strict gain and loses nothing.
export { cuisineName, restaurantTypeName } from '../../../_shared/lib/cuisine-i18n.js';
