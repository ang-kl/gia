// currency-format.js — v0.60.183 venue-card price-range formatter.
//
// Operator: don't use the 💲 emoji on venue cards. Use the country
// currency prefix ("S$", "M$", "US$", "¥", "€" …) followed by the
// numeric price range. When the user's region differs from the
// venue's, append a parenthetical conversion to 2 decimal places.
//
// Examples:
//   SG user, SG venue: "S$25–40"
//   US user, SG venue: "S$25–40 (US$18.50–29.60)"
//   SG user, MY venue: "M$50–80 (S$14.50–23.20)"
//   priceRange missing: null  (caller drops the line)
//
// FX rates via Frankfurter (api.frankfurter.app) — free, no API key,
// ECB-sourced, daily-updated. Cached in Redis at fx:<from>:<to> with
// 12 h TTL. Network failure → returns null and the caller silently
// drops the conversion-in-parens.

// ISO 3166-1 alpha-2 country → display prefix.
const COUNTRY_PREFIX = {
  SG: 'S$',  MY: 'M$',  US: 'US$', CA: 'C$',  HK: 'HK$', TW: 'NT$',
  AU: 'A$',  NZ: 'NZ$', JP: '¥',   CN: '¥',   KR: '₩',   TH: '฿',
  VN: '₫',   ID: 'Rp',  PH: '₱',   IN: '₹',   GB: '£',   CH: 'CHF ',
  // EU zone — pre-2025 callers using ISO-3166 will pass DE/FR/IT/…
  DE: '€',   FR: '€',   IT: '€',   ES: '€',   PT: '€',   NL: '€',
  BE: '€',   AT: '€',   IE: '€',   FI: '€',   GR: '€',   LU: '€'
};

// ISO 4217 currency → display prefix. Used as a secondary lookup when
// we have the currencyCode from Places' priceRange but no country.
const CURRENCY_PREFIX = {
  SGD: 'S$',  MYR: 'M$',  USD: 'US$', CAD: 'C$',  HKD: 'HK$', TWD: 'NT$',
  AUD: 'A$',  NZD: 'NZ$', JPY: '¥',   CNY: '¥',   KRW: '₩',   THB: '฿',
  VND: '₫',   IDR: 'Rp',  PHP: '₱',   INR: '₹',   GBP: '£',   CHF: 'CHF ',
  EUR: '€'
};

function prefixForCountry(countryCode) {
  if (!countryCode) return null;
  const cc = String(countryCode).toUpperCase();
  return COUNTRY_PREFIX[cc] || null;
}

function prefixForCurrency(currencyCode) {
  if (!currencyCode) return null;
  const cc = String(currencyCode).toUpperCase();
  return CURRENCY_PREFIX[cc] || `${cc} `;
}

// Map an ISO-3166 country → ISO-4217 currency code (used to look up FX
// rates from the user's country). Falls back to null for unknowns.
const COUNTRY_TO_CURRENCY = {
  SG: 'SGD', MY: 'MYR', US: 'USD', CA: 'CAD', HK: 'HKD', TW: 'TWD',
  AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', KR: 'KRW', TH: 'THB',
  VN: 'VND', ID: 'IDR', PH: 'PHP', IN: 'INR', GB: 'GBP', CH: 'CHF',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR'
};

function currencyForCountry(countryCode) {
  if (!countryCode) return null;
  return COUNTRY_TO_CURRENCY[String(countryCode).toUpperCase()] || null;
}

// fetchFxRate(from, to, redis) → Promise<number|null>.
//   from/to: 3-letter ISO-4217 codes (e.g. "SGD", "USD").
//   redis:   optional ioredis client; when present, cache for 12 h.
// Returns the rate as a number (e.g. fetchFxRate('SGD', 'USD') ≈ 0.74)
// or null on failure (network, non-JSON, unknown code). Same currencies
// short-circuit to 1.0.
async function fetchFxRate(from, to, redis) {
  if (!from || !to) return null;
  const a = String(from).toUpperCase();
  const b = String(to).toUpperCase();
  if (a === b) return 1.0;
  const cacheKey = `fx:${a}:${b}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached != null) {
        const n = Number(cached);
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch { /* cache miss is non-fatal */ }
  }
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(a)}&to=${encodeURIComponent(b)}`, {
      // 8 s timeout — Frankfurter usually responds in < 200 ms; this
      // is a belt-and-braces upper bound to keep venue-render latency
      // bounded if the API is degraded.
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rate = json?.rates?.[b];
    if (!Number.isFinite(rate) || rate <= 0) return null;
    if (redis) {
      try { await redis.setex(cacheKey, 12 * 3600, String(rate)); }
      catch { /* setex failure is non-fatal */ }
    }
    return rate;
  } catch {
    return null;
  }
}

function fmt2(n) {
  if (!Number.isFinite(n)) return '';
  // No decimals when the value is a whole number AND the magnitude
  // suggests an integer-friendly currency (KRW, JPY, IDR, VND have no
  // fractional units; everywhere else, render as integer when both
  // bounds happen to round trivially, otherwise show 2 decimals).
  // Keep this simple: 2 decimals when in parens (conversion), no
  // decimals for the native venue-currency range (matches operator
  // examples "S$25–40" and "(US$18.50–29.60)").
  return n.toFixed(2);
}

function fmtNative(n) {
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// formatPriceRangeForVenue(priceRange, venueCountry, userCountry, redis)
//   → Promise<string|null>
//
// priceRange:    { currencyCode, start, end }  (from pipeline.normalisePriceRange)
// venueCountry:  ISO-3166 alpha-2 (e.g. 'SG'); may be null — falls
//                back to the currencyCode-derived prefix.
// userCountry:   ISO-3166 alpha-2 (e.g. 'US'); when equal to venueCountry
//                (or null) the conversion-in-parens is omitted.
// redis:         optional ioredis client for FX cache.
//
// Returns null when priceRange is unusable.
async function formatPriceRangeForVenue(priceRange, venueCountry, userCountry, redis) {
  if (!priceRange) return null;
  const { currencyCode, start, end } = priceRange;
  // Pick venue prefix: prefer the country (operator-specified
  // "S$" / "M$"), fall back to the currencyCode mapping.
  const vPrefix = prefixForCountry(venueCountry) || prefixForCurrency(currencyCode);
  if (!vPrefix) return null;
  const native = (() => {
    if (start != null && end != null && start !== end) return `${vPrefix}${fmtNative(start)}–${fmtNative(end)}`;
    if (start != null) return `${vPrefix}${fmtNative(start)}`;
    if (end != null)   return `${vPrefix}${fmtNative(end)}`;
    return null;
  })();
  if (!native) return null;
  // Same-country (or unknown user country) → no parens conversion.
  if (!userCountry || !venueCountry || String(userCountry).toUpperCase() === String(venueCountry).toUpperCase()) {
    return native;
  }
  // Cross-border → fetch FX and append parens.
  const userCurrency = currencyForCountry(userCountry);
  if (!userCurrency || !currencyCode) return native;
  const rate = await fetchFxRate(currencyCode, userCurrency, redis);
  if (!Number.isFinite(rate) || rate <= 0) return native;     // FX unreachable → silently drop parens
  const uPrefix = prefixForCountry(userCountry) || prefixForCurrency(userCurrency);
  if (!uPrefix) return native;
  const cs = start != null ? start * rate : null;
  const ce = end   != null ? end   * rate : null;
  const conv = (cs != null && ce != null && cs !== ce) ? `${uPrefix}${fmt2(cs)}–${fmt2(ce)}`
             : (cs != null) ? `${uPrefix}${fmt2(cs)}`
             : (ce != null) ? `${uPrefix}${fmt2(ce)}`
             : null;
  return conv ? `${native} (${conv})` : native;
}

module.exports = {
  COUNTRY_PREFIX,
  CURRENCY_PREFIX,
  COUNTRY_TO_CURRENCY,
  prefixForCountry,
  prefixForCurrency,
  currencyForCountry,
  fetchFxRate,
  formatPriceRangeForVenue
};
