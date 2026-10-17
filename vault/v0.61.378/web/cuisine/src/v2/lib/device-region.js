// device-region.js — v0.61.376
//
// Resolve the phone's HOME region for Option-B currency. The subtlety
// (operator, 07-06 '26): iOS has TWO separate settings —
//   • Language  (Settings → Language & Region → iPhone Language) e.g. English (UK)
//   • Region    (Settings → Language & Region → Region)          e.g. Singapore
// and they can differ. `navigator.language` only carries the LANGUAGE
// (`en-GB`), so the old code resolved the currency to GBP for a phone whose
// Region is Singapore — it should be SGD. iOS exposes the Region as a Unicode
// "regional override" (`-u-…-rg-<cc>zzzz`) inside the RESOLVED locale
// (`Intl.DateTimeFormat().resolvedOptions().locale` → "en-GB-u-rg-sgzzzz").
// Note: `new Intl.Locale("en-GB-u-rg-sgzzzz").region` still returns "GB", so
// the `rg` override must be string-parsed.
//
// Precedence: the Region override (rg) wins; fall back to the language region.

// regionFromUnicodeRg("en-GB-u-rg-sgzzzz") → "SG"  (null when absent)
export function regionFromUnicodeRg(localeString) {
  const m = /-rg-([a-zA-Z]{2})(?:zzzz)?\b/i.exec(String(localeString || ''));
  return m ? m[1].toUpperCase() : null;
}

// regionFromLanguageTag("en-GB" | "en" | "zh") → "GB" | "US" | "CN"
// Uses Intl.Locale().maximize() (so bare "en" → US, "zh" → CN), with a
// substring fallback for engines without maximize().
export function regionFromLanguageTag(lang) {
  const tag = String(lang || '');
  if (!tag) return null;
  try {
    const loc = new Intl.Locale(tag);
    const max = typeof loc.maximize === 'function' ? loc.maximize() : loc;
    if (max && /^[A-Za-z]{2}$/.test(max.region || '')) return max.region.toUpperCase();
  } catch { /* Intl.Locale unsupported */ }
  const m = /[-_]([A-Za-z]{2})\b/.exec(tag);
  return m ? m[1].toUpperCase() : null;
}

// pickDeviceRegion({ resolvedLocales, navigatorLanguage }) → ISO-3166 alpha-2 | null
//   resolvedLocales: e.g. [Intl.DateTimeFormat().resolvedOptions().locale,
//                          Intl.NumberFormat().resolvedOptions().locale]
//   navigatorLanguage: navigator.language
export function pickDeviceRegion({ resolvedLocales = [], navigatorLanguage = '' } = {}) {
  for (const loc of resolvedLocales) {
    const rg = regionFromUnicodeRg(loc);
    if (rg) return rg;                       // iOS Settings → Region wins
  }
  return regionFromLanguageTag(navigatorLanguage); // fall back to the language
}
